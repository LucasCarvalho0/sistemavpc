import { createSSEStream } from '@/lib/wsManager'

// Garante que essa rota nunca é cacheada e roda no Node.js runtime
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/events
 *
 * Endpoint Server-Sent Events (SSE) para atualizações em tempo real.
 * O cliente se conecta aqui e recebe eventos pushed pelo servidor.
 */
export async function GET(req: Request) {
    const stream = createSSEStream(req.signal)

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            Connection: 'keep-alive',
            'X-Accel-Buffering': 'no', // Desativa buffering no nginx/Netlify
        },
    })
}
