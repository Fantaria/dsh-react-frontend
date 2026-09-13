import type { RemoteFailure } from '../types/wire'

export class DshTransportError extends Error {
  constructor(message: string, readonly status?: number, readonly endpoint?: string) {
    super(message)
    this.name = 'DshTransportError'
  }
}

export class DshRemoteError extends Error {
  constructor(readonly failure: RemoteFailure) {
    super(failure.message)
    this.name = 'DshRemoteError'
  }
}

export class DshProtocolError extends Error {
  constructor(message: string, readonly endpoint: string, readonly payload?: unknown) {
    super(message)
    this.name = 'DshProtocolError'
  }
}

export function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

