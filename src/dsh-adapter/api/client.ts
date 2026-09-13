import type { ModelSelection, Workspace } from '../../domain/types'
import { EventChannel } from '../transport/events'
import { remoteCall } from '../transport/http'
import type { DshApiShape, HistoryPage, HostFrame, MuxFrame } from '../types/wire'

export class DshClient {
  private readonly mux = new EventChannel<MuxFrame>('/api/events.mux')
  private readonly host = new EventChannel<HostFrame>('/api/events.host')

  describe(): Promise<DshApiShape['describe']> { return remoteCall('host.describe', {}) }
  listSessions(): Promise<DshApiShape['sessions']> { return remoteCall('session.list', {}) }
  listWorkspaces(): Promise<DshApiShape['workspaces']> { return remoteCall('workspace.list', {}) }
  models(sessionId: string): Promise<DshApiShape['models']> { return remoteCall('session.models', { sessionId }) }
  history(sessionId: string, beforeSeq?: number): Promise<HistoryPage> {
    return remoteCall('session.history', { sessionId, ...(beforeSeq === undefined ? {} : { beforeSeq }), maxMessages: 80 })
  }
  createSession(workspaceId?: string): Promise<{ sessionId: string; agentPreset?: string }> { return remoteCall('session.create', workspaceId ? { workspaceId } : {}) }
  prompt(sessionId: string, text: string): Promise<{ accepted: true }> {
    return remoteCall('session.prompt', { sessionId, mode: 'queue', content: [{ type: 'text', text }], clientTimeZone: Intl.DateTimeFormat().resolvedOptions().timeZone })
  }
  cancel(sessionId: string): Promise<{ accepted: true }> { return remoteCall('session.cancel', { sessionId }) }
  selectModel(sessionId: string, selection: ModelSelection): Promise<{ selected: ModelSelection }> { return remoteCall('session.selectModel', { sessionId, ...selection }) }
  renameSession(sessionId: string, title: string): Promise<{ title: string; seq: number }> { return remoteCall('session.rename', { sessionId, title }) }
  async pickDirectory(): Promise<string | null> { return (await remoteCall<{ path: string | null }>('host.pickDirectory', {})).path }
  createWorkspace(path: string): Promise<{ workspace: Workspace; created: boolean }> { return remoteCall('workspace.create', { path }) }
  openMux(callbacks: Parameters<EventChannel<MuxFrame>['open']>[0]): () => void { return this.mux.open(callbacks) }
  openHost(callbacks: Parameters<EventChannel<HostFrame>['open']>[0]): () => void { return this.host.open(callbacks) }
  close(): void { this.mux.close(); this.host.close() }
}

