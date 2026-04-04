import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const PYTHON_URL = process.env.PYTHON_WORKER_URL || 'http://localhost:8000';
const TICKER_RE = /^[A-Z]{1,5}$/;

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ ticker: string }> }
) {
    const { ticker: rawTicker } = await params;
    const ticker = rawTicker.toUpperCase();
    if (!TICKER_RE.test(ticker)) return NextResponse.json({ error: 'Invalid ticker' }, { status: 400 });
    try {
        const res = await fetch(`${PYTHON_URL}/squeeze/${ticker}`, { signal: AbortSignal.timeout(15_000) });
        if (!res.ok) return NextResponse.json({ error: 'Python worker error' }, { status: res.status });
        return NextResponse.json(await res.json());
    } catch (e: any) {
        return NextResponse.json({ error: String(e) }, { status: 500 });
    }
}
