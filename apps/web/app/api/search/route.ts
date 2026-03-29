import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface YahooResult {
    symbol: string;
    shortname?: string;
    longname?: string;
    exchange?: string;
    quoteType?: string;
}

const cache = new Map<string, { data: YahooResult[]; ts: number }>();

export async function GET(req: NextRequest) {
    const q = req.nextUrl.searchParams.get('q')?.trim();
    if (!q || q.length < 1) return NextResponse.json([]);

    const key = q.toLowerCase();
    const cached = cache.get(key);
    if (cached && Date.now() - cached.ts < 60_000) {
        return NextResponse.json(cached.data);
    }

    try {
        const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=8&newsCount=0&listsCount=0&enableFuzzyQuery=true`;
        const resp = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            signal: AbortSignal.timeout(5000),
        });

        if (!resp.ok) throw new Error(`Yahoo returned ${resp.status}`);
        const json = await resp.json();

        const results: YahooResult[] = (json?.finance?.result?.[0]?.quotes ?? [])
            .filter((r: YahooResult) => r.quoteType === 'EQUITY')
            .slice(0, 6)
            .map((r: YahooResult) => ({
                symbol: r.symbol,
                shortname: r.shortname || r.longname || r.symbol,
                exchange: r.exchange,
            }));

        cache.set(key, { data: results, ts: Date.now() });
        return NextResponse.json(results);
    } catch {
        // Fallback: try Financial Modeling Prep if key is set
        const fmpKey = process.env.FMP_API_KEY;
        if (fmpKey) {
            try {
                const fmpResp = await fetch(
                    `https://financialmodelingprep.com/api/v3/search?query=${encodeURIComponent(q)}&limit=6&apikey=${fmpKey}`,
                    { signal: AbortSignal.timeout(5000) }
                );
                if (fmpResp.ok) {
                    const fmpData = await fmpResp.json();
                    const results = (fmpData ?? []).slice(0, 6).map((r: any) => ({
                        symbol: r.symbol,
                        shortname: r.name,
                        exchange: r.exchangeShortName,
                    }));
                    cache.set(key, { data: results, ts: Date.now() });
                    return NextResponse.json(results);
                }
            } catch {}
        }
        return NextResponse.json([]);
    }
}
