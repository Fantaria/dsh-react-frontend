import { useEffect, useMemo, useState } from 'react'
import { credentialRefs, errorText, settingsApi, type CredentialInfo, type PluginInventorySnapshot, type SettingsNamespace, type SettingsSnapshot } from '../../dsh-adapter'

type Tab = 'general' | 'models' | 'plugins' | 'credentials'

function label(ns: string): string {
  return ({ 'ui-theme': '外观', locale: '语言', 'ui-conversation': '对话', 'agent-default-model': '默认模型', 'llm-deepseek': 'DeepSeek 模型', 'llm-pi-ai': '兼容模型', 'agent-presets': '智能体预设', permission: '权限', shell: 'Shell', 'agent-loop': 'Agent Loop', 'web-search-deepseek': '联网搜索', 'ui-onboarding': '引导' } as Record<string, string>)[ns] ?? ns
}

function sectionFor(ns: string): Tab {
  if (ns.startsWith('llm-') || ns === 'agent-default-model') return 'models'
  if (ns.includes('plugin') || ns === 'agent-presets' || ns === 'web-search-deepseek') return 'plugins'
  return 'general'
}

function NamespaceEditor({ row, writable, onSaved }: { row: SettingsNamespace; writable: boolean; onSaved(value: SettingsNamespace): void }) {
  const [text, setText] = useState(() => JSON.stringify(row.user ?? {}, null, 2))
  const [state, setState] = useState('')
  useEffect(() => setText(JSON.stringify(row.user ?? {}, null, 2)), [row])
  async function save() {
    setState('保存中…')
    try {
      const value = JSON.parse(text) as Record<string, unknown>
      const saved = await settingsApi.replace(row.ns, value, row.revision)
      onSaved(saved); setState('已保存')
    } catch (error) { setState(errorText(error)) }
  }
  return <article className="settings-card">
    <div className="settings-card-head"><div><h4>{label(row.ns)}</h4><code>{row.ns}</code></div><span>{row.applies === 'live' ? '即时生效' : row.applies}</span></div>
    <p>编辑用户覆盖层；空对象会回退到 DSH 默认配置，敏感值不会从后端返回。</p>
    <textarea value={text} onChange={event => setText(event.target.value)} spellCheck={false} aria-label={`${row.ns} JSON`} />
    <div className="settings-actions"><small>{state}</small><button disabled={!writable} onClick={() => void save()}>保存</button></div>
  </article>
}

function Credentials({ refs, values, reload }: { refs: string[]; values: Record<string, CredentialInfo>; reload(): Promise<void> }) {
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [message, setMessage] = useState('')
  async function set(ref: string) {
    const value = drafts[ref]?.trim(); if (!value) return
    try { await settingsApi.setCredential(ref, value); setDrafts(current => ({ ...current, [ref]: '' })); await reload(); setMessage(`${ref} 已更新`) } catch (error) { setMessage(errorText(error)) }
  }
  async function unset(ref: string) {
    try { await settingsApi.unsetCredential(ref); await reload(); setMessage(`${ref} 已移除`) } catch (error) { setMessage(errorText(error)) }
  }
  return <div className="credential-list">
    <div className="settings-intro"><h3>凭据管理</h3><p>密钥只会写入 DSH 凭据服务；接口永远不会读回密钥明文。</p></div>
    {refs.map(ref => <article className="credential-card" key={ref}><div><strong>{ref}</strong><span data-configured={values[ref]?.configured || undefined}>{values[ref]?.configured ? `已配置 · ${values[ref]?.source ?? 'DSH'}` : '未配置'}</span></div><input type="password" value={drafts[ref] ?? ''} onChange={event => setDrafts(current => ({ ...current, [ref]: event.target.value }))} placeholder="输入新值（不会回显）" /><button onClick={() => void set(ref)} disabled={!drafts[ref]?.trim() || values[ref]?.writable === false}>保存</button><button className="danger" onClick={() => void unset(ref)} disabled={!values[ref]?.configured || values[ref]?.writable === false}>移除</button></article>)}
    {!refs.length && <p className="settings-empty">当前 DSH 配置未声明凭据引用。</p>}<small className="settings-message">{message}</small>
  </div>
}

function Plugins({ snapshot }: { snapshot?: PluginInventorySnapshot }) {
  const entries = snapshot?.entries ?? []
  return <div><div className="settings-intro"><h3>插件</h3><p>只读显示 DSH 当前装载的插件和运行状态；插件组成仍由 DSH 管理。</p></div><div className="plugin-grid">{entries.map((entry, index) => <article className="plugin-card" key={String(entry.entryId ?? index)}><strong>{String(entry.moduleName ?? entry.entryId ?? 'plugin')}</strong><span data-phase={String(entry.fiberPhase ?? '')}>{entry.enabled === false ? '未启用' : String(entry.fiberPhase ?? '已启用')}</span>{Boolean(entry.entryId) && <code>{String(entry.entryId)}</code>}</article>)}</div>{!entries.length && <p className="settings-empty">没有可显示的插件。</p>}</div>
}

export function SettingsDialog({ onClose }: { onClose(): void }) {
  const [tab, setTab] = useState<Tab>('general')
  const [snapshot, setSnapshot] = useState<SettingsSnapshot>()
  const [credentials, setCredentials] = useState<Record<string, CredentialInfo>>({})
  const [plugins, setPlugins] = useState<PluginInventorySnapshot>()
  const [error, setError] = useState('')
  const refs = useMemo(() => snapshot ? credentialRefs(snapshot) : [], [snapshot])
  async function load() {
    setError('')
    try {
      const next = await settingsApi.describe(); setSnapshot(next)
      const discovered = credentialRefs(next)
      const credentialValues = await settingsApi.credentials(discovered)
      setCredentials(credentialValues)
      setPlugins(await settingsApi.plugins().catch(() => ({ entries: [] })))
    } catch (reason) { setError(errorText(reason)) }
  }
  async function reloadCredentials() { if (refs.length) setCredentials(await settingsApi.credentials(refs)) }
  useEffect(() => { void load() }, [])
  function saved(value: SettingsNamespace) { setSnapshot(current => current && ({ ...current, namespaces: current.namespaces.map(row => row.ns === value.ns ? value : row) })) }
  const rows = snapshot?.namespaces.filter(row => sectionFor(row.ns) === tab) ?? []
  return <div className="settings-overlay" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
    <section className="settings-dialog" role="dialog" aria-modal="true" aria-label="设置">
      <header><h2>设置</h2><button onClick={onClose} aria-label="关闭">×</button></header>
      <aside>{([['general','通用'],['models','模型'],['plugins','插件'],['credentials','凭据']] as const).map(([id,name]) => <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>{name}</button>)}</aside>
      <main>{error ? <div className="settings-failure"><p>{error}</p><button onClick={() => void load()}>重试</button></div> : !snapshot ? <p className="settings-empty">正在读取 DSH 设置…</p> : tab === 'credentials' ? <Credentials refs={refs} values={credentials} reload={reloadCredentials} /> : tab === 'plugins' ? <><Plugins snapshot={plugins} />{rows.map(row => <NamespaceEditor key={row.ns} row={row} writable={snapshot.writable} onSaved={saved} />)}</> : <><div className="settings-intro"><h3>{tab === 'models' ? '模型' : '通用设置'}</h3><p>这些项目直接读取并写入 DSH 的设置服务。</p></div>{rows.map(row => <NamespaceEditor key={row.ns} row={row} writable={snapshot.writable} onSaved={saved} />)}</>}</main>
    </section>
  </div>
}
