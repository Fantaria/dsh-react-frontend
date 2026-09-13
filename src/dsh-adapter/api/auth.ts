import { DshTransportError } from '../errors/remote-error'

/** Exchange a launch token for DSH's HttpOnly session cookie. The token is never stored. */
export async function authenticateDsh(token: string): Promise<void> {
  const response = await fetch(`/dsh-auth?token=${encodeURIComponent(token)}`, { credentials: 'same-origin' })
  if (!response.ok) throw new DshTransportError(`鉴权失败：HTTP ${response.status}`, response.status, 'auth')
}
