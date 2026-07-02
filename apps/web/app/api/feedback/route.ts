import { NextResponse } from 'next/server';

// Server-side proxy for the worker's /feedback endpoint. The browser can't
// carry WORKER_SECRET (anything NEXT_PUBLIC_ ships to the client), so the
// secret is attached here instead.
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const workerUrl = process.env.WORKER_URL || 'http://localhost:8080';
        const secret = process.env.WORKER_SECRET;

        const res = await fetch(`${workerUrl}/feedback`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
            },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(10_000),
        });

        if (!res.ok) {
            return NextResponse.json({ success: false }, { status: res.status });
        }
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to forward feedback:', error);
        return NextResponse.json({ success: false, message: 'Could not reach worker' }, { status: 502 });
    }
}
