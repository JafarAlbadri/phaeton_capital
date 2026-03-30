import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface SearchResult {
    symbol: string;
    shortname: string;
    exchange: string;
}

const cache = new Map<string, { data: SearchResult[]; ts: number }>();

export async function GET(req: NextRequest) {
    const q = req.nextUrl.searchParams.get('q')?.trim();
    if (!q || q.length < 1) return NextResponse.json([]);

    const key = q.toLowerCase();
    const cached = cache.get(key);
    if (cached && Date.now() - cached.ts < 60_000) {
        return NextResponse.json(cached.data);
    }

    // Primary: Python worker proxies through yfinance (handles Yahoo auth/cookies)
    const pythonUrl = process.env.PYTHON_WORKER_URL || 'http://python_worker:8000';
    try {
        const resp = await fetch(`${pythonUrl}/search?q=${encodeURIComponent(q)}`, {
            signal: AbortSignal.timeout(8000),
        });
        if (resp.ok) {
            const data = await resp.json();
            if (Array.isArray(data) && data.length > 0) {
                cache.set(key, { data, ts: Date.now() });
                return NextResponse.json(data);
            }
        }
    } catch { /* fall through to FMP */ }

    // Fallback: Financial Modeling Prep (requires FMP_API_KEY in env)
    const fmpKey = process.env.FMP_API_KEY;
    if (fmpKey) {
        try {
            const fmpResp = await fetch(
                `https://financialmodelingprep.com/api/v3/search?query=${encodeURIComponent(q)}&limit=6&apikey=${fmpKey}`,
                { signal: AbortSignal.timeout(5000) }
            );
            if (fmpResp.ok) {
                const fmpData = await fmpResp.json();
                const results: SearchResult[] = (fmpData ?? []).slice(0, 6).map((r: any) => ({
                    symbol: r.symbol,
                    shortname: r.name,
                    exchange: r.exchangeShortName,
                }));
                cache.set(key, { data: results, ts: Date.now() });
                return NextResponse.json(results);
            }
        } catch { /* fall through */ }
    }

    return NextResponse.json([]);
}
