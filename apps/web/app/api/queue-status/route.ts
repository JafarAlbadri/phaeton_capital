import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const WORKER_URL = process.env.WORKER_URL || process.env.NEXT_PUBLIC_WORKER_URL || 'http://localhost:8080';

export async function GET(_req: NextRequest) {
    try {
        const res = await fetch(`${WORKER_URL}/queue-status`, { signal: AbortSignal.timeout(5_000) });
        if (!res.ok) return NextResponse.json({ error: 'Worker error' }, { status: res.status });
        return NextResponse.json(await res.json());
    } catch (e: any) {
        return NextResponse.json({ error: String(e) }, { status: 500 });
    }
}
