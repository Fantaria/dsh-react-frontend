import { useState } from 'react'
import { createSession, currentSession, sessionTitle, useDshState } from '../../stores/dsh-store'
import { ChatView } from '../chat/ChatView'
import { FishLogo } from './Brand'
import { Composer } from './Composer'

export function Conversation() {
  const state = useDshState()
  const [tab, setTab] = useState<'chat' | 'trace'>('chat')
  const session = currentSession(state)
  const title = session ? sessionTitle(session) : '选择一个会话'
  return <main className="conversation">
    <header className="conversation-head"><div className="title-block"><strong>{title}</strong>{session?.agentPreset && <span>{session.agentPreset}</span>}</div><button className="session-log">Session log ↓</button></header>
    <nav className="tabs"><button className={tab === 'chat' ? 'active' : ''} onClick={() => setTab('chat')}>对话</button><button className={tab === 'trace' ? 'active' : ''} onClick={() => setTab('trace')}>轨迹</button></nav>
    {state.currentSessionId ? <div className="conversation-body">{tab === 'chat' ? <ChatView /> : <div className="trace-view">{state.events.map(event => <details key={event.seq}><summary>{event.seq} · {event.type}</summary><pre>{JSON.stringify(event.data, null, 2)}</pre></details>)}</div>}<Composer /></div> : <div className="empty-hero"><FishLogo className="hero-logo" /><h1>开始一个新会话</h1><p>从左侧选择工作区，然后创建会话。</p><button disabled={!state.currentWorkspaceId} onClick={() => void createSession()}>＋ 新会话</button></div>}
  </main>
}

