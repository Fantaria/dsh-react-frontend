import type { ConversationBlock, ConversationNode } from '../../domain/types'
import type { SessionWireEvent } from '../types/wire'

function record(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined
}

function blocks(value: unknown): ConversationBlock[] {
  if (typeof value === 'string') return [{ kind: 'text', text: value }]
  if (!Array.isArray(value)) return value === undefined ? [] : [{ kind: 'unknown', value }]
  return value.flatMap<ConversationBlock>(part => {
    if (typeof part === 'string') return [{ kind: 'text', text: part } satisfies ConversationBlock]
    const item = record(part)
    if (!item) return [{ kind: 'unknown', value: part } satisfies ConversationBlock]
    if (item.type === 'text') return [{ kind: 'text', text: String(item.text ?? '') } satisfies ConversationBlock]
    if (item.type === 'reasoning') return [{ kind: 'reasoning', text: String(item.text ?? '') } satisfies ConversationBlock]
    if (item.type === 'image' || item.type === 'image_url') {
      const imageUrl = record(item.image_url)?.url ?? item.url
      return [{ kind: 'image', url: typeof imageUrl === 'string' ? imageUrl : undefined, attachment: item } satisfies ConversationBlock]
    }
    // Tool calls are represented by their canonical tool/call event. Rendering
    // this embedded assistant block as JSON duplicates the official tool row.
    if (item.type === 'tool-call') return []
    return [{ kind: 'unknown', value: item } satisfies ConversationBlock]
  })
}

function delta(event: SessionWireEvent): { kind: 'text' | 'reasoning'; text: string } | undefined {
  const data = record(event.data)
  if (!data) return undefined
  if (event.type === 'assistant/chunk') {
    const chunk = record(data.chunk)
    if (chunk?.type === 'text-delta') return { kind: 'text', text: String(chunk.text ?? chunk.delta ?? '') }
    if (chunk?.type === 'reasoning-delta') return { kind: 'reasoning', text: String(chunk.text ?? chunk.delta ?? '') }
  }
  if (event.type === 'chunkrow/text-chunks' || event.type === 'chunkrow/reasoning-chunks') {
    const values = Array.isArray(data.texts) ? data.texts.map(String).join('') : ''
    return { kind: event.type.includes('reasoning') ? 'reasoning' : 'text', text: values }
  }
  return undefined
}

export function projectConversation(input: readonly SessionWireEvent[]): ConversationNode[] {
  const events = [...input].sort((a, b) => a.seq - b.seq)
  const settled = new Set<number>()
  for (const event of events) {
    if (event.type === 'assistant/message') for (const seq of event.sourceEventSeqs ?? []) settled.add(seq)
  }

  const output: ConversationNode[] = []
  const tools = new Map<string, Extract<ConversationNode, { kind: 'tool' }>>()
  let live: Extract<ConversationNode, { kind: 'assistant' }> | undefined

  for (const event of events) {
    const data = record(event.data) ?? {}
    if (event.type === 'user/message') {
      const source = record(data.source)
      if (source?.kind && source.kind !== 'user') continue
      const content = blocks(data.content)
      if (content.length) output.push({ id: `user-${event.seq}`, seq: event.seq, time: event.time, kind: 'user', blocks: content })
      continue
    }
    if (event.type === 'assistant/message') {
      const message = record(data.message)
      const content = blocks(message?.content)
      if (content.length) output.push({ id: `assistant-${event.seq}`, seq: event.seq, time: event.time, kind: 'assistant', blocks: content })
      continue
    }
    if (event.type === 'tool/call') {
      const callId = String(data.callId ?? event.seq)
      const node: Extract<ConversationNode, { kind: 'tool' }> = {
        id: `tool-${callId}`, seq: event.seq, time: event.time, kind: 'tool', callId,
        name: String(data.name ?? 'Tool'), args: data.arguments ?? {}, status: 'running',
      }
      tools.set(callId, node); output.push(node); continue
    }
    if (event.type === 'tool/result') {
      const message = record(data.message)
      const resultBlock = Array.isArray(message?.content)
        ? message.content.map(record).find(item => item?.type === 'tool-result')
        : undefined
      const source = record(message?.source)
      const callId = String(resultBlock?.toolCallId ?? source?.callId ?? data.callId ?? '')
      const node = tools.get(callId)
      if (node) {
        node.result = resultBlock?.content ?? message?.content ?? data.result
        node.meta = data.meta
        node.failed = Boolean(data.error ?? resultBlock?.isError ?? message?.isError)
        node.status = node.failed ? 'failed' : 'success'
      } else {
        output.push({ id: `unknown-tool-result-${event.seq}`, seq: event.seq, time: event.time, kind: 'unknown', eventType: event.type, payload: event.data })
      }
      continue
    }
    if (event.type === 'turn/end') {
      const reason = record(data.reason)
      if (reason?.kind === 'error') {
        output.push({ id: `error-${event.seq}`, seq: event.seq, time: event.time, kind: 'status', tone: 'error', label: String(record(reason.error)?.message ?? '请求失败'), detail: reason.error })
      } else if (reason?.kind === 'max-tokens') {
        output.push({ id: `max-${event.seq}`, seq: event.seq, time: event.time, kind: 'status', tone: 'warning', label: '已达到输出 token 上限' })
      }
      live = undefined; continue
    }
    if (!settled.has(event.seq)) {
      const chunk = delta(event)
      if (chunk?.text) {
        if (!live) {
          live = { id: `stream-${event.seq}`, seq: event.seq, time: event.time, kind: 'assistant', blocks: [], streaming: true }
          output.push(live)
        }
        const previous = live.blocks.at(-1)
        if (previous?.kind === chunk.kind) previous.text += chunk.text
        else live.blocks.push({ kind: chunk.kind, text: chunk.text })
        continue
      }
    }
    if (!event.ignorable && ['compaction/', 'retry/', 'command/'].some(prefix => event.type.startsWith(prefix))) {
      output.push({ id: `status-${event.seq}`, seq: event.seq, time: event.time, kind: 'status', tone: 'neutral', label: event.type, detail: event.data })
    }
  }
  return output
}
