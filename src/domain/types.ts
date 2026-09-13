export type ConnectionPhase = 'connecting' | 'connected' | 'unauthorized' | 'version-mismatch' | 'disconnected'

export interface Workspace {
  workspaceId: string
  path: string
  title: string
  sessionIds: string[]
  createdAt: string
  updatedAt: string
}

export interface ProjectionBlock {
  asOfSeq: number
  values: Record<string, unknown>
}

export interface Session {
  sessionId: string
  updatedAt: number
  running: boolean
  blank: boolean
  parentSessionId?: string
  origin?: 'subagent'
  cwd?: string
  agentPreset?: string
  projections?: ProjectionBlock
}

export interface ModelSelection {
  provider: string
  model: string
  reasoningEffort?: string
}

export interface ModelCatalog {
  default?: ModelSelection
  current?: ModelSelection
  routable?: boolean
  routableProviders?: string[]
  groups: Array<{
    id: string
    name: string
    models: Array<{
      id: string
      name: string
      description?: string
      reasoning?: { efforts: Array<{ id: string; name: string; description?: string }>; defaultEffort?: string }
    }>
  }>
  failures: Array<{ id: string; name: string; message: string }>
}

export type ConversationBlock =
  | { kind: 'text'; text: string }
  | { kind: 'reasoning'; text: string }
  | { kind: 'image'; url?: string; attachment?: unknown }
  | { kind: 'unknown'; value: unknown }

export type ConversationNode =
  | { id: string; seq: number; time: number; kind: 'user'; blocks: ConversationBlock[] }
  | { id: string; seq: number; time: number; kind: 'assistant'; blocks: ConversationBlock[]; streaming?: boolean }
  | { id: string; seq: number; time: number; kind: 'tool'; callId: string; name: string; args: unknown; result?: unknown; meta?: unknown; failed?: boolean; status: 'running' | 'success' | 'failed' }
  | { id: string; seq: number; time: number; kind: 'status'; tone: 'neutral' | 'warning' | 'error'; label: string; detail?: unknown }
  | { id: string; seq: number; time: number; kind: 'unknown'; eventType: string; payload: unknown }
