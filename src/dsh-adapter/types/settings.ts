export interface SettingsNamespace {
  ns: string
  schema: unknown
  value: Record<string, unknown>
  base?: Record<string, unknown>
  user?: Record<string, unknown>
  applies: string
  secrets: Array<{ path: string[]; set: boolean }>
  revision: number
}

export interface SettingsSnapshot {
  writable: boolean
  hasDocument: boolean
  namespaces: SettingsNamespace[]
}

export interface CredentialInfo { configured: boolean; source?: string; writable: boolean }
export interface PluginInventorySnapshot { entries: Array<Record<string, unknown>>; agentPresets?: Array<Record<string, unknown>> }
