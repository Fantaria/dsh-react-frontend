import { useEffect, useState, type FormEvent } from 'react'
import { authenticate, connect, stopAll, useDshState } from './stores/dsh-store'
import { Conversation } from './features/shell/Conversation'
import { Icon } from './features/shell/Icon'
import { Sidebar } from './features/shell/Sidebar'
import { SettingsDialog } from './features/settings/SettingsDialog'

export default function App() {
  const state = useDshState()
  const [collapsed, setCollapsed] = useState(false)
  const [settings, setSettings] = useState(false)
  const [token, setToken] = useState('')
  const [authError, setAuthError] = useState('')
  useEffect(() => { void connect(); return stopAll }, [])
  async function submitAuth(event: FormEvent) {
    event.preventDefault(); const value = token; setToken(''); setAuthError('')
    try { await authenticate(value) } catch (error) { setAuthError(error instanceof Error ? error.message : String(error)) }
  }
  return <div className="app-frame" data-sidebar-collapsed={collapsed || undefined}>
    <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(value => !value)} onSettings={() => setSettings(true)} />
    <Conversation />
    {settings && <SettingsDialog onClose={() => setSettings(false)} />}
    {state.phase !== 'connected' && state.phase !== 'connecting' && <div className="connection-overlay">
      {state.phase === 'unauthorized' ? <form className="dsh-dialog" onSubmit={submitAuth}><h2>连接 DeepSeek Harness</h2><p>输入 DSH 启动时提供的访问令牌。令牌仅用于换取后端的 HttpOnly 会话 Cookie。</p><input value={token} onChange={event => setToken(event.target.value)} type="password" autoComplete="off" autoFocus placeholder="DSH access token" />{authError && <p className="error-row">{authError}</p>}<div><button type="button" className="secondary" onClick={() => void connect()}>重试</button><button type="submit" className="primary">连接</button></div></form> : <div className="dsh-dialog"><h2>{state.phase === 'version-mismatch' ? 'DSH 版本不匹配' : '无法连接 DSH'}</h2><p>{state.error}</p>{state.phase === 'version-mismatch' && <p className="diagnostic">请确认 3080 运行的是与当前适配器兼容的 DeepSeek Harness。</p>}<div><button className="primary" onClick={() => void connect()}>重新连接</button></div></div>}
    </div>}
    {state.phase === 'connecting' && <div className="connecting"><Icon name="dot" /> 正在连接</div>}
  </div>
}

