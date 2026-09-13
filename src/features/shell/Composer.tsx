import { useMemo, useState, type KeyboardEvent } from 'react'
import { cancelTurn, changeModel, changePermission, currentPermissions, sendPrompt, useDshState } from '../../stores/dsh-store'
import { Icon } from './Icon'

export function Composer() {
  const state = useDshState()
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const permissions = currentPermissions(state)
  const modelValue = state.selection ? `${state.selection.provider}\u0000${state.selection.model}` : ''
  const permissionOptions = useMemo(() => (permissions?.options ?? []).filter(option => option.value !== 'custom' && option.value !== 'danger-full-access'), [permissions])
  async function submit() {
    const value = draft.trim(); if (!value || sending || !state.currentSessionId) return
    setDraft(''); setSending(true)
    try { await sendPrompt(value) } finally { setSending(false) }
  }
  function keyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void submit() }
  }
  return <div className="composer-wrap"><div className="composer-card">
    <textarea rows={1} value={draft} onChange={event => setDraft(event.target.value)} onKeyDown={keyDown} placeholder="给智能体发消息" disabled={!state.currentSessionId} />
    <div className="composer-controls"><button className="add-button" aria-label="添加内容"><Icon name="plus" size={18} /></button>
      <select value={permissions?.currentValue ?? ''} aria-label="权限模式" onChange={event => void changePermission(event.target.value)}>{permissionOptions.map(option => <option key={option.value} value={option.value}>{option.name}</option>)}</select>
      <span className="composer-spacer" />
      <select value={modelValue} aria-label="模型" onChange={event => void changeModel(event.target.value)}>{state.catalog?.groups.map(group => <optgroup key={group.id} label={group.name}>{group.models.map(model => <option key={model.id} value={`${group.id}\u0000${model.id}`}>{model.name}</option>)}</optgroup>)}</select>
      {state.running ? <button className="send-button" aria-label="停止" onClick={() => void cancelTurn()}><Icon name="stop" /></button> : <button className="send-button" aria-label="发送" disabled={!draft.trim() || !state.currentSessionId} onClick={() => void submit()}><Icon name="send" /></button>}
    </div>
  </div><div className="stats-line">{state.currentSessionId ? `${state.events.length} 条事件 · ${state.backendVersion || 'DSH'}` : '选择工作区并创建会话'}</div></div>
}

