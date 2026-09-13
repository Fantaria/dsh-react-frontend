type Callbacks<T> = { item(value: T): void; failed(error: Error): void; opened?(): void; reconnecting?(attempt: number): void }

function websocketUrl(path: string): string {
  const url = new URL(path, location.origin)
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
  return url.href
}

export class EventChannel<T> {
  private socket?: WebSocket
  private intentionalClose = false
  private retry?: number
  private attempt = 0

  constructor(private readonly path: '/api/events.mux' | '/api/events.host') {}

  open(callbacks: Callbacks<T>): () => void {
    this.close(); this.intentionalClose = false; this.connect(callbacks)
    return () => this.close()
  }

  private connect(callbacks: Callbacks<T>): void {
    if (this.intentionalClose) return
    const socket = new WebSocket(websocketUrl(this.path)); this.socket = socket
    socket.addEventListener('open', () => { this.attempt = 0; callbacks.opened?.() }, { once: true })
    socket.addEventListener('message', event => {
      if (typeof event.data !== 'string') return
      try {
        const envelope = JSON.parse(event.data) as { type?: string; payload?: T }
        if (envelope.type === 'server-request' && envelope.payload) callbacks.item(envelope.payload)
      } catch { /* Official behavior: ignore malformed downstream frames. */ }
    })
    socket.addEventListener('close', () => {
      if (this.socket === socket) this.socket = undefined
      if (!this.intentionalClose) this.scheduleReconnect(callbacks)
    }, { once: true })
    socket.addEventListener('error', () => {
      if (!this.intentionalClose) callbacks.failed(new Error(`DSH event channel ${this.path} failed`))
    })
  }

  private scheduleReconnect(callbacks: Callbacks<T>): void {
    this.attempt += 1; callbacks.reconnecting?.(this.attempt)
    const delay = Math.min(10_000, 400 * 2 ** Math.min(this.attempt - 1, 5))
    window.clearTimeout(this.retry); this.retry = window.setTimeout(() => this.connect(callbacks), delay)
  }

  close(): void {
    this.intentionalClose = true; window.clearTimeout(this.retry); this.retry = undefined
    const socket = this.socket; this.socket = undefined
    if (socket && socket.readyState < WebSocket.CLOSING) socket.close(1000, 'client reset')
  }
}

