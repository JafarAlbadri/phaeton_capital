import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const WORKER_URL = process.env.WORKER_URL || process.env.NEXT_PUBLIC_WORKER_URL || 'http://localhost:8080';
const TICKER_RE = /^[A-Z]{1,5}$/;
const VALID_SORT = new Set(['composite15d', 'composite30d', 'composite90d', 'sentiment', 'riskRating']);

export async function GET(req: NextRequest) {
    const url = new URL(req.url);
    const rawTickers = url.searchParams.get('tickers') || '';
    const tickers = rawTickers.split(',').map(t => t.trim().toUpperCase()).filter(Boolean);

    if (tickers.length === 0) return NextResponse.json([]);
    if (tickers.length > 20) return NextResponse.json({ error: 'Max 20 tickers allowed' }, { status: 400 });
    const invalid = tickers.find(t => !TICKER_RE.test(t));
    if (invalid) return NextResponse.json({ error: `Invalid ticker: ${invalid}` }, { status: 400 });

    const rawSort = url.searchParams.get('sortBy') || 'composite15d';
    const sortBy = VALID_SORT.has(rawSort) ? rawSort : 'composite15d';
    const rawOrder = url.searchParams.get('order') || 'desc';
    const order = rawOrder === 'asc' ? 'asc' : 'desc';

    const qs = new URLSearchParams({ tickers: tickers.join(','), sortBy, order });
    try {
        const res  = await fetch(`${WORKER_URL}/screener?${qs}`, { signal: AbortSignal.timeout(10_000) });
        if (!res.ok) return NextResponse.json({ error: 'Worker error' }, { status: res.status });
        const data = await res.json();
        return NextResponse.json(data);
    } catch (e: any) {
        return NextResponse.json({ error: String(e) }, { status: 500 });
    }
}
