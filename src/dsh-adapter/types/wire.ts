import type { ModelCatalog, ModelSelection, ProjectionBlock, Session, Workspace } from '../../domain/types'

export interface RemoteFailure { code: string; message: string; details: Record<string, unknown> }

export interface SessionWireEvent {
  type: string
  seq: number
  time: number
  data: unknown
  ignorable?: true
  sourceEventSeqs?: number[]
  surfaceOp?: 'append' | { op: 'replace'; start: number; end: number }
}

export interface HistoryPage {
  events: Array<{ event: SessionWireEvent }>
  hasMore: boolean
  projections?: ProjectionBlock
}

export interface MuxFrame {
  type: string; sessionId?: string; event?: SessionWireEvent; jobs?: unknown[]
  key?: string; value?: unknown; seq?: number; [key: string]: unknown
}

export interface HostFrame {
  type: string; sessionId?: string; blank?: boolean; running?: boolean; cwd?: string; agentPreset?: string
  workspace?: Workspace; workspaceId?: string; workspaceIds?: string[]; archivedSessionIds?: string[]
  [key: string]: unknown
}

export interface DshApiShape {
  describe: { version: string }
  sessions: { items: Session[] }
  workspaces: { items: Workspace[]; archivedSessionIds: string[] }
  models: ModelCatalog & { current: ModelSelection; routable: boolean }
}

