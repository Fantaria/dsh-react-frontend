import { describe, expect, it } from 'vitest'
import { projectConversation } from './conversation'
import type { SessionWireEvent } from '../types/wire'

describe('projectConversation', () => {
  it('pairs DSH tool results through the tool-result content block', () => {
    const events: SessionWireEvent[] = [
      { type: 'tool/call', seq: 1, time: 1, data: { callId: 'call-1', name: 'Read', arguments: { path: 'a.ts' } } },
      { type: 'tool/result', seq: 2, time: 2, data: {
        message: { source: { kind: 'tool', callId: 'call-1' }, content: [{ type: 'tool-result', toolCallId: 'call-1', content: 'ok', isError: false }] },
        meta: { path: 'a.ts' },
      } },
    ]
    expect(projectConversation(events)).toEqual([{ id: 'tool-call-1', seq: 1, time: 1, kind: 'tool', callId: 'call-1', name: 'Read', args: { path: 'a.ts' }, result: 'ok', meta: { path: 'a.ts' }, failed: false, status: 'success' }])
  })

  it('does not duplicate embedded assistant tool-call blocks', () => {
    const events: SessionWireEvent[] = [{
      type: 'assistant/message', seq: 1, time: 1,
      data: { message: { content: [{ type: 'text', text: 'before' }, { type: 'tool-call', toolCallId: 'call-1', toolName: 'Read', input: '{}' }] } },
    }]
    expect(projectConversation(events)).toEqual([{ id: 'assistant-1', seq: 1, time: 1, kind: 'assistant', blocks: [{ kind: 'text', text: 'before' }] }])
  })
})
