import { remoteCall } from '../transport/http'
import type { CredentialInfo, PluginInventorySnapshot, SettingsNamespace, SettingsSnapshot } from '../types/settings'

export const settingsApi = {
  describe: (): Promise<SettingsSnapshot> => remoteCall('settings.describe', {}),
  replace: (ns: string, section: Record<string, unknown>, expectedRevision?: number): Promise<SettingsNamespace> =>
    remoteCall('settings.replace', { ns, section, expectedRevision }),
  update: (ns: string, patch: Record<string, unknown>, expectedRevision?: number): Promise<SettingsNamespace> =>
    remoteCall('settings.update', { ns, patch, expectedRevision }),
  openDocument: (): Promise<{ opened: boolean }> => remoteCall('settings.openSettingsDocument', {}),
  credentials: (refs: string[]): Promise<Record<string, CredentialInfo>> =>
    remoteCall<{ credentials: Record<string, CredentialInfo> }>('credentials.describe', { refs }).then(value => value.credentials),
  setCredential: (ref: string, value: string): Promise<void> => remoteCall('credentials.set', { ref, value }),
  unsetCredential: (ref: string): Promise<void> => remoteCall('credentials.unset', { ref }),
  plugins: (): Promise<PluginInventorySnapshot> => remoteCall('pluginInventory.list', {}),
}

export function credentialRefs(snapshot: SettingsSnapshot): string[] {
  const refs = new Set<string>()
  const visit = (value: unknown): void => {
    if (!value || typeof value !== 'object') return
    if (Array.isArray(value)) { value.forEach(visit); return }
    const item = value as Record<string, unknown>
    const meta = item.meta && typeof item.meta === 'object' ? item.meta as Record<string, unknown> : undefined
    if (meta?.role === 'credential-ref' && typeof meta.default === 'string') refs.add(meta.default)
    Object.values(item).forEach(visit)
  }
  snapshot.namespaces.forEach(namespace => visit(namespace.schema))
  return [...refs].sort()
}
