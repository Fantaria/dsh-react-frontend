import { useState } from 'react'
import { addWorkspace, createSession, selectSession, sessionTitle, setWorkspace, useDshState, workspaceSessions } from '../../stores/dsh-store'
import { Brand } from './Brand'
import { Icon } from './Icon'

export function Sidebar({ collapsed, onToggle, onSettings }: { collapsed: boolean; onToggle(): void; onSettings(): void }) {
  const state = useDshState()
  const [searchVisible, setSearchVisible] = useState(false)
  const [search, setSearch] = useState('')
  return <aside className="sidebar" data-collapsed={collapsed || undefined}>
    <div className="brand-row">{!collapsed && <Brand />}<button className="icon-button panel-toggle" aria-label="收起侧栏" onClick={onToggle}><Icon name="panel" /></button></div>
    <button className="new-session" disabled={!state.currentWorkspaceId} onClick={() => void createSession()}><Icon name="plus" />{!collapsed && <span>新会话</span>}</button>
    {!collapsed && <>
      <div className="workspace-head"><span>工作区</span><div className="head-actions">
        <button className="icon-button" aria-label="搜索" onClick={() => setSearchVisible(value => !value)}><Icon name="search" /></button>
        <button className="icon-button" aria-label="视图选项"><Icon name="sliders" /></button>
        <button className="icon-button" aria-label="添加工作区" onClick={() => void addWorkspace()}><Icon name="plus" /></button>
      </div></div>
      {searchVisible && <input autoFocus className="workspace-search" value={search} onChange={event => setSearch(event.target.value)} placeholder="搜索会话" />}
      <div className="workspace-list">
        {!state.workspaces.length && <div className="workspace-empty"><span>还没有工作区</span><button onClick={() => void addWorkspace()}>添加本机目录</button></div>}
        {state.workspaces.map(workspace => <section key={workspace.workspaceId} className="workspace-group">
          <button className="workspace-row" title={workspace.path} onClick={() => setWorkspace(workspace.workspaceId)}><Icon name="folder" /><span>{workspace.title}</span></button>
          {workspaceSessions(workspace, state).filter(session => !search.trim() || sessionTitle(session).toLowerCase().includes(search.trim().toLowerCase())).map(session => <button key={session.sessionId} className={`session-row${state.currentSessionId === session.sessionId ? ' selected' : ''}`} onClick={() => void selectSession(session.sessionId)}>
            <span className="status-slot">{session.running && <span className="running-dot" />}</span><span className="session-name">{sessionTitle(session)}</span>
            <time>{session.blank ? '' : new Intl.RelativeTimeFormat('zh-CN', { numeric: 'auto' }).format(Math.round((session.updatedAt - Date.now()) / 86_400_000), 'day')}</time>
          </button>)}
        </section>)}
      </div>
      <button className="settings-row" onClick={onSettings}><Icon name="settings" /><span>设置</span></button>
    </>}
  </aside>
}

