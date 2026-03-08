/**
 * wsManager.ts
 *
 * In serverless environments (Netlify/Vercel), WebSocket servers cannot be
 * initialised — broadcast() becomes a no-op so the rest of the app still works.
 */

let wss: import('ws').WebSocketServer | null = null

export async function initWebSocket(server: import('http').Server) {
  if (wss) return wss
  try {
    const { WebSocketServer } = await import('ws')
    wss = new WebSocketServer({ server, path: '/ws' })

    wss.on('connection', (ws) => {
      const { WebSocket } = require('ws')
      console.log('[WS] client connected, total:', wss!.clients.size)
      ws.send(JSON.stringify({ type: 'connected' }))
      ws.on('close', () => console.log('[WS] client disconnected'))
      ws.on('error', (e: Error) => console.error('[WS] error', e.message))
    })

    console.log('[WS] WebSocket server ready on /ws')
  } catch {
    console.warn('[WS] ws module not available — running in serverless mode')
  }
  return wss
}

export function broadcast(type: string, data: unknown) {
  if (!wss) return // no-op in serverless
  const msg = JSON.stringify({ type, data })
  let n = 0
  wss.clients.forEach((c) => {
    // dynamic require to avoid top-level import issues
    const { WebSocket } = require('ws')
    if (c.readyState === WebSocket.OPEN) { c.send(msg); n++ }
  })
  if (n > 0) console.log(`[WS] broadcast [${type}] → ${n} clients`)
}
