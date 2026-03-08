// server.ts  –  run with: node --require tsx/cjs server.ts
// In production: tsx server.ts  or compile with tsc first
import 'dotenv/config'
import { createServer } from 'http'
import next from 'next'
import { initWebSocket, broadcast } from './lib/wsManager'

const dev = process.env.NODE_ENV !== 'production'
const port = parseInt(process.env.PORT ?? '3000', 10)

const app = next({ dev })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  const server = createServer((req, res) => handle(req, res))

  initWebSocket(server)

  // Auto shift-reset broadcast at 05:00 every day
  scheduleShiftReset()

  server.listen(port, () => {
    console.log(`🚗 Next.js server running on http://localhost:${port}`)
    console.log(`📡 WebSocket on ws://localhost:${port}/ws`)
  })
})

function scheduleShiftReset() {
  const now = new Date()
  const next5am = new Date()
  next5am.setHours(5, 0, 0, 0)
  if (now >= next5am) next5am.setDate(next5am.getDate() + 1)
  const ms = next5am.getTime() - now.getTime()
  console.log(`[Shift] reset in ${Math.round(ms / 60000)} min`)
  setTimeout(() => {
    broadcast('shift_reset', { timestamp: new Date().toISOString() })
    console.log('[Shift] auto-reset broadcast sent')
    scheduleShiftReset()
  }, ms)
}
