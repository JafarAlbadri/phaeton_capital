import prisma from '@sentiment-crowd/db';
import DiscoverClient from './DiscoverClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const SIGNAL_RANK: Record<string, number> = {
    STRONG_BUY: 5, BUY: 4, HOLD: 3, SELL: 2, STRONG_SELL: 1,
};

async function fetchDiscoveries(horizon: number, limit: number) {
    const recs = await (prisma.recommendationScore as any).findMany({
        where: {
            horizon,
            signal: { in: ['STRONG_BUY', 'BUY'] },
            composite_score: { gte: 60 },
        },
        orderBy: { composite_score: 'desc' },
        take: limit * 2,
    });

    if (recs.length === 0) return { results: [], universeSize: 0 };

    const tickers = recs.map((r: any) => r.ticker);
    const [funds, risks, tracked, predictions, universeCount] = await Promise.all([
        prisma.fundamentalData.findMany({
            where: { ticker: { in: tickers } },
            select: { ticker: true, sector: true, current_price: true },
        }),
        prisma.riskProfile.findMany({
            where: { ticker: { in: tickers } },
            select: { ticker: true, overall_risk_rating: true },
        }),
        (prisma as any).trackedTicker.findMany({
            where: { ticker: { in: tickers } },
            select: { ticker: true, name: true, sector: true, lastScanned: true },
        }),
        prisma.predictionRecord.findMany({
            where: { ticker: { in: tickers }, outcome: { in: ['CORRECT', 'INCORRECT'] } },
            select: { ticker: true, outcome: true },
        }),
        (prisma as any).trackedTicker.count({ where: { active: true } }).catch(() => 0),
    ]);

    const fundMap = Object.fromEntries(funds.map(f => [f.ticker, f]));
    const riskMap = Object.fromEntries(risks.map(r => [r.ticker, r]));
    const trackMap = Object.fromEntries(tracked.map((t: any) => [t.ticker, t]));

    const hitMap: Record<string, { c: number; t: number }> = {};
    for (const p of predictions) {
        if (!hitMap[p.ticker]) hitMap[p.ticker] = { c: 0, t: 0 };
        hitMap[p.ticker].t++;
        if (p.outcome === 'CORRECT') hitMap[p.ticker].c++;
    }

    const results = recs.map((rec: any) => {
        const t = trackMap[rec.ticker];
        const sector = fundMap[rec.ticker]?.sector ?? t?.sector ?? null;

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
        const hitRate = hits && hits.t > 0 ? Math.round((hits.c / hits.t) * 1000) / 10 : null;

        return {
            ticker: rec.ticker as string,
            name: (t?.name as string | null) ?? null,
            sector: sector as string | null,
            signal: rec.signal as string,
            composite_score: Math.round((rec.composite_score ?? 0) * 10) / 10,
            confidence_pct: Math.round((rec.confidence ?? 0) * 100),
            price: fundMap[rec.ticker]?.current_price ?? null,
            risk_rating: riskMap[rec.ticker]?.overall_risk_rating ?? null,
            top_driver: { factor: topDriver.key, score: Math.round(topDriver.score * 10) / 10 },
            hit_rate_pct: hitRate,
        };
    });

    results.sort((a: any, b: any) => {
        if (b.composite_score !== a.composite_score) return b.composite_score - a.composite_score;
        return (SIGNAL_RANK[b.signal] ?? 0) - (SIGNAL_RANK[a.signal] ?? 0);
    });

    return { results: results.slice(0, limit), universeSize: universeCount };
}

export default async function DiscoverPage(
    props: { searchParams?: Promise<{ [key: string]: string | string[] | undefined }> }
) {
    const sp = (await props.searchParams) ?? {};
    const horizonParam = typeof sp.horizon === 'string' ? parseInt(sp.horizon, 10) : 15;
    const horizon = [15, 30, 90].includes(horizonParam) ? horizonParam : 15;

    const { results, universeSize } = await fetchDiscoveries(horizon, 25);

    return (
        <DiscoverClient
            horizon={horizon}
            results={results}
            universeSize={universeSize}
        />
    );
}
