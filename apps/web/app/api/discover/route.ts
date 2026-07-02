import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import prisma from '@phaeton/db';

const SIGNAL_RANK: Record<string, number> = {
    STRONG_BUY: 5, BUY: 4, HOLD: 3, SELL: 2, STRONG_SELL: 1,
};

export async function GET(req: NextRequest) {
    const url = new URL(req.url);
    const horizon = parseInt(url.searchParams.get('horizon') || '15', 10);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20', 10), 100);
    const minScore = parseFloat(url.searchParams.get('minScore') || '60');
    const sectorFilter = url.searchParams.get('sector');
    const signalFilter = url.searchParams.get('signal'); // STRONG_BUY, BUY, HOLD, etc.

    try {
        // Pull top recommendations sorted by composite score. We pull a wider net
        // than `limit` so we can join sector data and still hit the requested count
        // after sector filtering.
        const overfetch = sectorFilter ? limit * 5 : limit;

        const where: any = {
            horizon,
            composite_score: { gte: minScore },
        };
        if (signalFilter) {
            where.signal = signalFilter;
        } else {
            // Default: BUY-side only — this is a *discovery* endpoint, not a screener.
            where.signal = { in: ['STRONG_BUY', 'BUY'] };
        }

        const recs = await prisma.recommendationScore.findMany({
            where,
            orderBy: { composite_score: 'desc' },
            take: overfetch,
        });

        if (recs.length === 0) {
            return NextResponse.json({ horizon, count: 0, results: [] });
        }

        const tickers = recs.map((r: any) => r.ticker);

        // Join supporting data in parallel
        const [funds, risks, tracked, predictions] = await Promise.all([
            prisma.fundamentalData.findMany({
                where: { ticker: { in: tickers } },
                select: { ticker: true, sector: true, current_price: true },
            }),
            prisma.riskProfile.findMany({
                where: { ticker: { in: tickers } },
                select: { ticker: true, overall_risk_rating: true },
            }),
            prisma.trackedTicker.findMany({
                where: { ticker: { in: tickers } },
                select: { ticker: true, name: true, sector: true, lastScanned: true },
            }),
            prisma.predictionRecord.findMany({
                where: { ticker: { in: tickers }, outcome: { in: ['CORRECT', 'INCORRECT'] } },
                select: { ticker: true, outcome: true },
            }),
        ]);

        const fundMap = Object.fromEntries(funds.map(f => [f.ticker, f]));
        const riskMap = Object.fromEntries(risks.map(r => [r.ticker, r]));
        const trackMap = Object.fromEntries(tracked.map((t: any) => [t.ticker, t]));

        // Hit-rate accumulator per ticker
        const hitMap: Record<string, { correct: number; total: number }> = {};
        for (const p of predictions) {
            if (!hitMap[p.ticker]) hitMap[p.ticker] = { correct: 0, total: 0 };
            hitMap[p.ticker].total++;
            if (p.outcome === 'CORRECT') hitMap[p.ticker].correct++;
        }

        const results = recs.map((rec: any) => {
            const tracked = trackMap[rec.ticker];
            const sector = fundMap[rec.ticker]?.sector ?? tracked?.sector ?? null;

            // Identify the top driver — the component score furthest from 50
            const components: Record<string, number> = {
                sentiment: rec.sentiment_score ?? 50,
                technical: rec.technical_score ?? 50,
                fundamental: rec.fundamental_score ?? 50,
                quant: rec.quant_score ?? 50,
                insider: rec.insider_score ?? 50,
                macro: rec.macro_score ?? 50,
            };
            const topDriver = Object.entries(components)
                .map(([k, v]) => ({ key: k, score: v, dev: Math.abs(v - 50) }))
                .sort((a, b) => b.dev - a.dev)[0];

            const hits = hitMap[rec.ticker];
            const hitRate = hits && hits.total > 0
                ? Math.round((hits.correct / hits.total) * 1000) / 10
                : null;

            return {
                ticker: rec.ticker,
                name: tracked?.name ?? null,
                sector,
                signal: rec.signal,
                composite_score: Math.round((rec.composite_score ?? 0) * 10) / 10,
                confidence_pct: Math.round((rec.confidence ?? 0) * 100),
                price: fundMap[rec.ticker]?.current_price ?? null,
                risk_rating: riskMap[rec.ticker]?.overall_risk_rating ?? null,
                top_driver: { factor: topDriver.key, score: Math.round(topDriver.score * 10) / 10 },
                hit_rate_pct: hitRate,
                last_scanned: tracked?.lastScanned?.toISOString() ?? null,
                updated_at: rec.updatedAt?.toISOString() ?? null,
            };
        });

        // Apply sector filter post-join (sector lives in FundamentalData/TrackedTicker, not RecommendationScore)
        const filtered = sectorFilter
            ? results.filter((r: any) => r.sector?.toLowerCase().includes(sectorFilter.toLowerCase()))
            : results;

        // Final ranking: composite desc, then signal strength desc as tiebreaker
        filtered.sort((a: any, b: any) => {
            if (b.composite_score !== a.composite_score) return b.composite_score - a.composite_score;
            return (SIGNAL_RANK[b.signal] ?? 0) - (SIGNAL_RANK[a.signal] ?? 0);
        });

        return NextResponse.json(
            {
                horizon,
                count: Math.min(filtered.length, limit),
                generated_at: new Date().toISOString(),
                results: filtered.slice(0, limit),
            },
            { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } }
        );
    } catch (e: any) {
        return NextResponse.json({ error: String(e) }, { status: 500 });
    }
}
