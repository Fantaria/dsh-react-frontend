import { useMemo, useState } from 'react'
import type { ConversationNode } from '../../domain/types'
import { Icon } from '../shell/Icon'

type ToolNode = Extract<ConversationNode, { kind: 'tool' }>

function object(value: unknown): Record<string, unknown> | undefined {
  if (typeof value === 'string') try { return JSON.parse(value) as Record<string, unknown> } catch { return undefined }
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined
}

function pretty(value: unknown): string {
  if (typeof value === 'string') return value
  try { return JSON.stringify(value, null, 2) } catch { return String(value ?? '') }
}

export function ToolRow({ node }: { node: ToolNode }) {
  const [open, setOpen] = useState(false)
  const label = useMemo(() => {
    const args = object(node.args)
    return String(args?.path ?? args?.file_path ?? args?.command ?? args?.query ?? args?.description ?? '')
  }, [node.args])
  return <div className="tool-row" data-error={node.failed || undefined} data-status={node.status}>
    <button onClick={() => setOpen(value => !value)}>
      <Icon name="tool" /><strong>{node.name}</strong><span>·</span><span className="tool-label">{label}</span>
      {node.status === 'running' && <span className="tool-running">运行中</span>}<Icon name="chevron" />
    </button>
    {open && <pre>{pretty(node.result ?? node.args)}</pre>}
  </div>
}

