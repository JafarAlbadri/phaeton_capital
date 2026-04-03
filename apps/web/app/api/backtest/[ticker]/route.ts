import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const WORKER_URL = process.env.NEXT_PUBLIC_WORKER_URL || 'http://localhost:8080';
const TICKER_RE = /^[A-Z]{1,5}$/;
const VALID_HORIZONS = new Set(['15', '30', '90']);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(
    _req: NextRequest,
    { params }: { params: { ticker: string } }
) {
    const ticker = params.ticker.toUpperCase();
    if (!TICKER_RE.test(ticker)) {
        return NextResponse.json({ error: 'Invalid ticker' }, { status: 400 });
    }

    const url = new URL(_req.url);
    const rawHorizon = url.searchParams.get('horizon') || '15';
    const horizon = VALID_HORIZONS.has(rawHorizon) ? rawHorizon : '15';

    const rawYears = url.searchParams.get('years') || '2';
    const years = Math.min(Math.max(parseInt(rawYears, 10) || 2, 1), 10).toString();

    const start = url.searchParams.get('start') || '';
    const end   = url.searchParams.get('end')   || '';
    if (start && !DATE_RE.test(start)) return NextResponse.json({ error: 'Invalid start date' }, { status: 400 });
    if (end   && !DATE_RE.test(end))   return NextResponse.json({ error: 'Invalid end date' },   { status: 400 });

    const qs = new URLSearchParams({ horizon, years, ...(start ? { start } : {}), ...(end ? { end } : {}) });

    try {
        const res = await fetch(`${WORKER_URL}/backtest/${ticker}?${qs}`, {
            signal: AbortSignal.timeout(35_000),
        });
        if (!res.ok) return NextResponse.json({ error: 'Worker error' }, { status: res.status });
        const data = await res.json();
        return NextResponse.json(data);
    } catch (e: any) {
        return NextResponse.json({ error: String(e) }, { status: 500 });
    }
}
