import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
    const workerUrl = process.env.WORKER_URL || 'http://worker:8080';

    let upstream: Response;
    try {
        upstream = await fetch(`${workerUrl}/events`, {
            headers: { 'Accept': 'text/event-stream', 'Cache-Control': 'no-cache' },
        });
    } catch {
        return new Response('SSE connection failed', { status: 502 });
    }

    if (!upstream.ok || !upstream.body) {
        return new Response('SSE upstream unavailable', { status: 502 });
    }

    // Wrap the upstream body in our own ReadableStream so we can swallow
    // upstream errors (ECONNRESET on disconnect, etc.) gracefully instead of
    // letting them bubble into Next.js's pipeToNodeResponse as fatal logs.
    const reader = upstream.body.getReader();
    const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
            const onAbort = () => {
                reader.cancel().catch(() => { });
                try { controller.close(); } catch { }
            };
            req.signal.addEventListener('abort', onAbort);
            try {
                while (true) {
                    const { value, done } = await reader.read();
                    if (done) break;
                    if (value) controller.enqueue(value);
                }
            } catch {
                // upstream closed unexpectedly — close cleanly, don't throw
            } finally {
                req.signal.removeEventListener('abort', onAbort);
                try { controller.close(); } catch { }
            }
        },
        cancel() {
            reader.cancel().catch(() => { });
        },
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no',
            'Access-Control-Allow-Origin': '*',
        },
    });
}
