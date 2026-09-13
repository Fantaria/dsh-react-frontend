import { Fragment, useEffect, useMemo, useRef } from 'react'
import type { ConversationBlock } from '../../domain/types'
import { conversationNodes, loadOlder, useDshState } from '../../stores/dsh-store'
import { Icon } from '../shell/Icon'
import { Markdown } from './Markdown'
import { ToolRow } from './ToolRow'

function blockText(blocks: ConversationBlock[]): string {
  return blocks.flatMap(block => block.kind === 'text' || block.kind === 'reasoning' ? [block.text] : []).join('')
}

function AssistantBlocks({ blocks, streaming }: { blocks: ConversationBlock[]; streaming?: boolean }) {
  return <>{blocks.map((block, index) => {
    if (block.kind === 'text') return <Markdown key={index} text={block.text} streaming={streaming} />
    if (block.kind === 'reasoning') return <details key={index} className="reasoning-row" open={streaming}><summary>思考过程</summary><Markdown text={block.text} streaming={streaming} /></details>
    if (block.kind === 'image') return block.url ? <img key={index} className="message-image" src={block.url} alt="Assistant attachment" /> : <pre key={index}>{JSON.stringify(block.attachment, null, 2)}</pre>
    return <pre key={index} className="unknown-block">{JSON.stringify(block.value, null, 2)}</pre>
  })}</>
}

export function ChatView() {
  const state = useDshState()
  const nodes = useMemo(() => conversationNodes(state), [state])
  const scroller = useRef<HTMLDivElement>(null)
  useEffect(() => { const element = scroller.current; if (element) element.scrollTop = element.scrollHeight }, [nodes.length, state.running])
  return <div ref={scroller} className="chat-scroll"><div className="chat-column">
    {state.hasMore && <div className="older"><button onClick={() => void loadOlder()}>加载更早消息</button></div>}
    {nodes.map(node => {
      if (node.kind === 'user') {
        const text = blockText(node.blocks)
        return <div key={node.id} className="message user-message"><div className="user-bubble">{text}</div><div className="message-actions"><time>{new Date(node.time).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</time><button onClick={() => navigator.clipboard.writeText(text)}><Icon name="copy" /></button></div></div>
      }
      if (node.kind === 'assistant') {
        const text = blockText(node.blocks)
        return <div key={node.id} className="message assistant-message"><AssistantBlocks blocks={node.blocks} streaming={node.streaming} /><div className="message-actions"><button onClick={() => navigator.clipboard.writeText(text)}><Icon name="copy" /></button><button><Icon name="up" /></button><button><Icon name="down" /></button><button><Icon name="branch" /></button><time>{new Date(node.time).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</time></div></div>
      }
      if (node.kind === 'tool') return <ToolRow key={node.id} node={node} />
      if (node.kind === 'status') return <div key={node.id} className={`status-row ${node.tone}`}>{node.label}</div>
      return <details key={node.id} className="unknown-event"><summary>{node.eventType}</summary><pre>{JSON.stringify(node.payload, null, 2)}</pre></details>
    })}
    {state.running && <div className="turn-status">正在处理</div>}
  </div></div>
}

