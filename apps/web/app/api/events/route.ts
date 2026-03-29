import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
    const workerUrl = process.env.WORKER_URL || 'http://worker:8080';

    try {
        const upstream = await fetch(`${workerUrl}/events`, {
            headers: { 'Accept': 'text/event-stream', 'Cache-Control': 'no-cache' },
            signal: req.signal,
        });

        if (!upstream.ok || !upstream.body) {
            return new Response('SSE upstream unavailable', { status: 502 });
        }

        return new Response(upstream.body, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'X-Accel-Buffering': 'no',
                'Access-Control-Allow-Origin': '*',
            },
        });
    } catch {
        return new Response('SSE connection failed', { status: 502 });
    }
}
