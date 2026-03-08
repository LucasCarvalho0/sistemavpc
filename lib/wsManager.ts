/**
 * sseManager.ts  (anteriormente wsManager.ts)
 *
 * Gerenciador de Server-Sent Events (SSE).
 * Substitui WebSocket — funciona em Next.js dev, produção e ambientes serverless.
 *
 * API pública mantida idêntica para não quebrar as rotas existentes:
 *   broadcast(type, data)  — envia evento para todos os clientes conectados
 */

type SSEClient = {
  id: string
  controller: ReadableStreamDefaultController
}

// Map global de clientes SSE conectados
// Em produção serverless cada instância de função tem seu próprio Map —
// mas para este projeto (single-server local + Netlify single-instance) funciona perfeitamente.
const clients = new Map<string, SSEClient>()

let clientCounter = 0

/**
 * Registra um novo cliente SSE e retorna o ReadableStream para a rota /api/events.
 * O cleanup automático acontece quando o cliente desconecta.
 */
export function createSSEStream(signal: AbortSignal): ReadableStream {
  const id = `sse-${++clientCounter}-${Date.now()}`

  const stream = new ReadableStream({
    start(controller) {
      // Registra o cliente
      clients.set(id, { id, controller })
      console.log(`[SSE] client connected: ${id}, total: ${clients.size}`)

      // Envia evento de boas-vindas
      const welcome = `data: ${JSON.stringify({ type: 'connected' })}\n\n`
      controller.enqueue(new TextEncoder().encode(welcome))

      // Remove o cliente quando a conexão for encerrada
      signal.addEventListener('abort', () => {
        clients.delete(id)
        try { controller.close() } catch { /* já fechado */ }
        console.log(`[SSE] client disconnected: ${id}, total: ${clients.size}`)
      })
    },
  })

  return stream
}

/**
 * Envia um evento SSE para todos os clientes conectados.
 * Mantém a mesma assinatura do broadcast() anterior do WebSocket.
 */
export function broadcast(type: string, data: unknown) {
  if (clients.size === 0) return

  const msg = new TextEncoder().encode(`data: ${JSON.stringify({ type, data })}\n\n`)
  let sent = 0

  clients.forEach((client, id) => {
    try {
      client.controller.enqueue(msg)
      sent++
    } catch {
      // Stream fechada inesperadamente — limpa o cliente
      clients.delete(id)
    }
  })

  if (sent > 0) console.log(`[SSE] broadcast [${type}] → ${sent} clients`)
}
