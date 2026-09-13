import { DshProtocolError, DshRemoteError, DshTransportError } from '../errors/remote-error'
import type { RemoteFailure } from '../types/wire'

interface ServerEnvelope<T> {
  type: 'server-response'
  rpcId: string
  result: { ok: true; value: T } | { ok: false; error: RemoteFailure }
}

export async function remoteCall<T>(endpoint: string, args: Record<string, unknown>, signal?: AbortSignal): Promise<T> {
  const rpcId = crypto.randomUUID()
  const response = await fetch(`/api/${endpoint}`, {
    method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ type: 'client-request', rpcId, method: endpoint, payload: args }), signal,
  })
  if (!response.ok) {
    const body = await response.text().catch(() => '')
    const message = response.status === 404
      ? `DSH 接口 ${endpoint} 不存在。请确认 3080 后端版本与当前前端兼容。`
      : body || `DSH transport failure: HTTP ${response.status}`
    throw new DshTransportError(message, response.status, endpoint)
  }
  const envelope = await response.json() as Partial<ServerEnvelope<T>>
  if (envelope.type !== 'server-response' || envelope.rpcId !== rpcId || !envelope.result) {
    throw new DshProtocolError(`DSH 接口 ${endpoint} 返回了无效 envelope`, endpoint, envelope)
  }
  if (!envelope.result.ok) throw new DshRemoteError(envelope.result.error)
  return envelope.result.value
}

