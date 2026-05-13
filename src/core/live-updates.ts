import type { LiveUpdatesOptions, FlagValue } from './types'

export function setupLiveUpdates(
  opts: LiveUpdatesOptions,
  applyUpdate: (partial: Record<string, FlagValue>) => void,
): void {
  if (typeof window === 'undefined') return

  const delay = opts.reconnectDelay ?? 3000

  if (opts.type === 'sse') {
    let es: EventSource
    const connect = () => {
      es = new EventSource(opts.url)
      es.onmessage = (e) => {
        try { applyUpdate(JSON.parse(e.data)) } catch {}
      }
      es.onerror = () => { es.close(); setTimeout(connect, delay) }
    }
    connect()
    return
  }

  if (opts.type === 'websocket') {
    let ws: WebSocket
    const connect = () => {
      ws = new WebSocket(opts.url)
      ws.onmessage = (e) => {
        try { applyUpdate(JSON.parse(e.data)) } catch {}
      }
      ws.onclose = () => { setTimeout(connect, delay) }
    }
    connect()
  }
}
