import type { Metadata } from 'next';
import prisma from '@sentiment-crowd/db';
import SummaryClient from './SummaryClient';

const TICKER_RE = /^[A-Z0-9\-.]{1,10}$/;

export async function generateMetadata(
    { params }: { params: Promise<{ ticker: string }> }
): Promise<Metadata> {
    const { ticker } = await params;
    return { title: `${ticker.toUpperCase()} | Phaeton Capital Summary` };
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function SummaryPage(
    { params }: { params: Promise<{ ticker: string }> }
) {
    const { ticker: rawTicker } = await params;
    const ticker = rawTicker.toUpperCase();

    if (!TICKER_RE.test(ticker)) {
        return (
            <main className="min-h-screen flex items-center justify-center">
                <p className="text-[#9898c0]">Invalid ticker.</p>
            </main>
        );
    }

    const [recs, risk, predictions, scoreHistoryRaw, fundamentalData] = await Promise.all([
        (prisma.recommendationScore as any).findMany({
            where: { ticker },
            orderBy: { horizon: 'asc' },
        }),
        prisma.riskProfile.findUnique({ where: { ticker } }),
        prisma.predictionRecord.findMany({
            where: { ticker, outcome: { in: ['CORRECT', 'INCORRECT'] } },
            orderBy: { createdAt: 'desc' },
            take: 100,
            select: { outcome: true, signal: true, composite_score: true, createdAt: true, horizon: true },
        }),
        prisma.predictionRecord.findMany({
            where: { ticker, horizon: 15 },
            orderBy: { createdAt: 'asc' },
            take: 30,
            select: { createdAt: true, composite_score: true, signal: true },
        }),
        prisma.fundamentalData.findUnique({
            where: { ticker },
            select: { sector: true, current_price: true, market_cap: true },
        }),
    ]);

    if (!recs || recs.length === 0) {
        return (
            <main className="min-h-screen flex items-center justify-center">
                <p className="text-[#9898c0]">No signal data for <span className="text-[#fcd97a] font-mono">{ticker}</span>.</p>
            </main>
        );
    }

    // Build per-horizon data
    const horizons = recs.map((rec: any) => {
        const scores: Record<string, number> = {
            sentiment: rec.sentiment_score ?? 50,
            technical: rec.technical_score ?? 50,
            fundamental: rec.fundamental_score ?? 50,
            quant: rec.quant_score ?? 50,
            insider: rec.insider_score ?? 50,
            macro: rec.macro_score ?? 50,
        };

        const drivers = Object.entries(scores)
            .map(([key, score]) => ({ key, score, deviation: Math.abs(score - 50) }))
            .sort((a, b) => b.deviation - a.deviation)
            .slice(0, 3)
            .map(d => ({
                factor: d.key,
                score: Math.round(d.score * 10) / 10,
                impact: d.score > 50 ? ('bullish' as const) : d.score < 50 ? ('bearish' as const) : ('neutral' as const),
            }));

        return {
            horizon_days: rec.horizon as number,
            signal: rec.signal as string,
            composite_score: Math.round((rec.composite_score ?? 0) * 10) / 10,
            confidence: Math.round((rec.confidence ?? 0) * 100),
            recommended_price: rec.recommended_price ?? null,
            price_target_low: rec.price_target_low ?? null,
            price_target_high: rec.price_target_high ?? null,
            price_method: rec.price_method ?? null,
            drivers,
        };
    });

    // Hit rate
    const correctCount = predictions.filter((p: any) => p.outcome === 'CORRECT').length;
    const totalResolved = predictions.length;
    const hitRate = totalResolved > 0 ? Math.round((correctCount / totalResolved) * 1000) / 10 : null;

    // Score sparkline
    const scoreHistory = scoreHistoryRaw.map(p => ({
        date: p.createdAt.toISOString().slice(0, 10),
        score: p.composite_score,
        signal: p.signal,
    }));

    return (
        <SummaryClient
            ticker={ticker}
            sector={fundamentalData?.sector ?? null}
            price={fundamentalData?.current_price ?? null}
            marketCap={fundamentalData?.market_cap != null ? Number(fundamentalData.market_cap) : null}
            horizons={horizons}
            trackRecord={{ hitRate, total: totalResolved, correct: correctCount, incorrect: totalResolved - correctCount }}
            riskRating={risk?.overall_risk_rating != null ? risk.overall_risk_rating : null}
            scoreHistory={scoreHistory}
        />
    );
}
