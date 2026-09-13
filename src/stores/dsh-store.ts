import { useSyncExternalStore } from 'react'
import type { ConnectionPhase, ModelCatalog, ModelSelection, Session, Workspace } from '../domain/types'
import { DshClient, DshTransportError, authenticateDsh, errorText, projectConversation } from '../dsh-adapter'
import type { HostFrame, MuxFrame, SessionWireEvent } from '../dsh-adapter'

export interface DshState {
  phase: ConnectionPhase
  error: string
  backendVersion: string
  workspaces: Workspace[]
  archivedSessionIds: string[]
  sessions: Session[]
  currentWorkspaceId?: string
  currentSessionId?: string
  catalog?: ModelCatalog
  selection?: ModelSelection
  events: SessionWireEvent[]
  hasMore: boolean
  running: boolean
  loading: boolean
}

const client = new DshClient()
let state: DshState = {
  phase: 'connecting', error: '', backendVersion: '', workspaces: [], archivedSessionIds: [],
  sessions: [], events: [], hasMore: false, running: false, loading: false,
}
const listeners = new Set<() => void>()
let stopMux: (() => void) | undefined
let stopHost: (() => void) | undefined
let generation = 0

function emit(patch: Partial<DshState> | ((current: DshState) => DshState)): void {
  state = typeof patch === 'function' ? patch(state) : { ...state, ...patch }
  listeners.forEach(listener => listener())
}

function classify(error: unknown): void {
  const next: ConnectionPhase = error instanceof DshTransportError && error.status === 401
    ? 'unauthorized'
    : error instanceof DshTransportError && error.status === 404 ? 'version-mismatch' : 'disconnected'
  emit({ error: errorText(error), phase: next })
}

function upsertWorkspace(items: Workspace[], workspace: Workspace): Workspace[] {
  const index = items.findIndex(item => item.workspaceId === workspace.workspaceId)
  if (index < 0) return [...items, workspace]
  return items.map((item, position) => position === index ? workspace : item)
}

function applyMux(frame: MuxFrame): void {
  if (frame.type === 'session/event' && frame.sessionId === state.currentSessionId && frame.event) {
    if (!state.events.some(event => event.seq === frame.event?.seq)) emit({ events: [...state.events, frame.event] })
  } else if (frame.type === 'session/jobs' && frame.sessionId) {
    const running = frame.jobs?.some(job => (job as { status?: string }).status === 'running') ?? false
    emit(current => ({
      ...current,
      sessions: current.sessions.map(item => item.sessionId === frame.sessionId ? { ...item, running } : item),
      running: frame.sessionId === current.currentSessionId ? running : current.running,
    }))
  } else if (frame.type === 'session/projection' && frame.sessionId && frame.key) {
    emit(current => ({
      ...current,
      sessions: current.sessions.map(item => item.sessionId !== frame.sessionId ? item : {
        ...item,
        projections: {
          asOfSeq: frame.seq ?? item.projections?.asOfSeq ?? -1,
          values: { ...(item.projections?.values ?? {}), [frame.key as string]: frame.value },
        },
      }),
    }))
  }
}

function applyHost(frame: HostFrame): void {
  if (frame.type === 'host/session-added' && frame.sessionId && !state.sessions.some(item => item.sessionId === frame.sessionId)) {
    emit({ sessions: [{ sessionId: frame.sessionId, updatedAt: Date.now(), running: false, blank: frame.blank ?? true, cwd: frame.cwd, agentPreset: frame.agentPreset }, ...state.sessions] })
  } else if (frame.type === 'host/session-removed' && frame.sessionId) emit({ sessions: state.sessions.filter(item => item.sessionId !== frame.sessionId) })
  else if (frame.type === 'host/session-status' && frame.sessionId) {
    emit(current => ({ ...current, sessions: current.sessions.map(item => item.sessionId === frame.sessionId ? { ...item, running: frame.running ?? false } : item), running: frame.sessionId === current.currentSessionId ? frame.running ?? false : current.running }))
  } else if (frame.type === 'host/workspace-changed' && frame.workspace) emit({ workspaces: upsertWorkspace(state.workspaces, frame.workspace) })
  else if (frame.type === 'host/workspace-removed' && frame.workspaceId) emit({ workspaces: state.workspaces.filter(item => item.workspaceId !== frame.workspaceId) })
  else if (frame.type === 'host/workspace-order-changed' && frame.workspaceIds) {
    const order = new Map(frame.workspaceIds.map((id, index) => [id, index]))
    emit({ workspaces: [...state.workspaces].sort((a, b) => (order.get(a.workspaceId) ?? 9999) - (order.get(b.workspaceId) ?? 9999)) })
  } else if (frame.type === 'host/archived-sessions-changed') emit({ archivedSessionIds: frame.archivedSessionIds ?? [] })
}

function startStreams(run: number): void {
  const streamFailure = (error: Error) => { if (run === generation && state.phase !== 'connected') classify(error) }
  stopMux = client.openMux({ item: applyMux, failed: streamFailure })
  stopHost = client.openHost({ item: applyHost, failed: streamFailure })
}

export async function connect(): Promise<void> {
  stopAll(); const run = ++generation
  emit({ phase: 'connecting', error: '', loading: true }); startStreams(run)
  try {
    const [description, sessionResult, workspaceResult] = await Promise.all([client.describe(), client.listSessions(), client.listWorkspaces()])
    if (run !== generation) return
    const currentWorkspaceId = workspaceResult.items.find(item => item.workspaceId === state.currentWorkspaceId)?.workspaceId ?? workspaceResult.items[0]?.workspaceId
    emit({ backendVersion: description.version, sessions: sessionResult.items, workspaces: workspaceResult.items, archivedSessionIds: workspaceResult.archivedSessionIds, currentWorkspaceId, phase: 'connected' })
    const first = sessionResult.items.find(item => !workspaceResult.archivedSessionIds.includes(item.sessionId))
    if (first) await selectSession(first.sessionId)
  } catch (error) { if (run === generation) classify(error) }
  finally { if (run === generation) emit({ loading: false }) }
}

export function stopAll(): void { generation++; stopMux?.(); stopHost?.(); stopMux = stopHost = undefined; client.close() }

export async function authenticate(token: string): Promise<void> {
  if (!token.trim()) return
  await authenticateDsh(token.trim())
  await connect()
}

export async function selectSession(sessionId: string): Promise<void> {
  emit({ currentSessionId: sessionId, events: [], hasMore: false, running: Boolean(state.sessions.find(item => item.sessionId === sessionId)?.running) })
  try {
    const [history, models] = await Promise.all([client.history(sessionId), client.models(sessionId)])
    if (state.currentSessionId !== sessionId) return
    emit({ events: history.events.map(item => item.event), hasMore: history.hasMore, catalog: models, selection: models.current })
    if (history.projections) emit({ sessions: state.sessions.map(item => item.sessionId === sessionId ? { ...item, projections: history.projections } : item) })
  } catch (error) { classify(error) }
}

export async function createSession(): Promise<void> {
  if (!state.currentWorkspaceId) return
  try {
    const result = await client.createSession(state.currentWorkspaceId)
    if (!state.sessions.some(item => item.sessionId === result.sessionId)) emit({ sessions: [{ sessionId: result.sessionId, updatedAt: Date.now(), running: false, blank: true }, ...state.sessions] })
    await selectSession(result.sessionId)
  } catch (error) { classify(error) }
}

export async function addWorkspace(): Promise<void> {
  try {
    const path = await client.pickDirectory(); if (!path) return
    const result = await client.createWorkspace(path)
    emit({ currentWorkspaceId: result.workspace.workspaceId, workspaces: upsertWorkspace(state.workspaces, result.workspace) })
  } catch (error) { classify(error) }
}

export async function sendPrompt(text: string): Promise<void> { if (state.currentSessionId && text.trim()) try { await client.prompt(state.currentSessionId, text.trim()) } catch (error) { classify(error) } }
export async function cancelTurn(): Promise<void> { if (state.currentSessionId) try { await client.cancel(state.currentSessionId) } catch (error) { classify(error) } }
export async function changeModel(value: string): Promise<void> {
  if (!state.currentSessionId) return
  const [provider, model] = value.split('\u0000'); if (!provider || !model) return
  try { emit({ selection: (await client.selectModel(state.currentSessionId, { provider, model })).selected }) } catch (error) { classify(error) }
}
export async function changePermission(value: string): Promise<void> { if (state.currentSessionId && value && value !== 'danger-full-access') await sendPrompt(`/permission ${value}`) }
export async function loadOlder(): Promise<void> {
  if (!state.currentSessionId || !state.hasMore || !state.events.length) return
  try {
    const beforeSeq = Math.min(...state.events.map(event => event.seq)); const page = await client.history(state.currentSessionId, beforeSeq)
    emit({ events: [...page.events.map(item => item.event), ...state.events], hasMore: page.hasMore })
  } catch (error) { classify(error) }
}

export function setWorkspace(workspaceId: string): void { emit({ currentWorkspaceId: workspaceId }) }
export function getState(): DshState { return state }
export function subscribe(listener: () => void): () => void { listeners.add(listener); return () => listeners.delete(listener) }
export function useDshState(): DshState { return useSyncExternalStore(subscribe, getState, getState) }
export function currentSession(current = state): Session | undefined { return current.sessions.find(item => item.sessionId === current.currentSessionId) }
export function currentPermissions(current = state): { currentValue?: string; options?: Array<{ value: string; name: string }> } | undefined { return currentSession(current)?.projections?.values.permissions as ReturnType<typeof currentPermissions> }
export function sessionTitle(session: Session): string {
  if (session.blank) return '新会话'
  const title = session.projections?.values.title
  if (typeof title === 'string' && title) return title
  if (session.cwd) return session.cwd.replace(/[\\/]+$/, '').split(/[\\/]/).pop() || session.sessionId
  return session.sessionId
}
export function workspaceSessions(workspace: Workspace, current = state): Session[] {
  const byId = new Map(current.sessions.map(item => [item.sessionId, item]))
  return workspace.sessionIds.map(id => byId.get(id)).filter((item): item is Session => Boolean(item))
}
export function conversationNodes(current = state) { return projectConversation(current.events) }
