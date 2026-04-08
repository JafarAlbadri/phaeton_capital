import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import prisma from '@sentiment-crowd/db';

const TICKER_RE = /^[A-Z0-9\-.]{1,10}$/;

const DRIVER_LABELS: Record<string, string> = {
    sentiment: 'Sentiment',
    technical: 'Teknisk analys',
    fundamental: 'Fundamental',
    quant: 'Kvantitativ',
    insider: 'Insiderhandel',
    macro: 'Makroekonomi',
};

function describeDriver(key: string, score: number): string {
    const label = DRIVER_LABELS[key] || key;
    if (score >= 70) return `${label} starkt positiv (${score.toFixed(0)})`;
    if (score >= 55) return `${label} positiv (${score.toFixed(0)})`;
    if (score >= 45) return `${label} neutral (${score.toFixed(0)})`;
    if (score >= 30) return `${label} negativ (${score.toFixed(0)})`;
    return `${label} starkt negativ (${score.toFixed(0)})`;
}

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ ticker: string }> }
) {
    const { ticker: rawTicker } = await params;
    const ticker = rawTicker.toUpperCase();
    if (!TICKER_RE.test(ticker)) {
        return NextResponse.json({ error: 'Invalid ticker' }, { status: 400 });
    }

    try {
        // Fetch recommendations for all horizons + risk + prediction history
        const [recs, risk, predictions] = await Promise.all([
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
        ]);

        if (!recs || recs.length === 0) {
            return NextResponse.json({ error: 'No signal data for this ticker' }, { status: 404 });
        }

        // Build signal response per horizon
        const horizons = recs.map((rec: any) => {
            const scores: Record<string, number> = {
                sentiment: rec.sentiment_score ?? 50,
                technical: rec.technical_score ?? 50,
                fundamental: rec.fundamental_score ?? 50,
                quant: rec.quant_score ?? 50,
                insider: rec.insider_score ?? 50,
                macro: rec.macro_score ?? 50,
            };

            // Top 3 drivers: furthest from neutral (50)
            const drivers = Object.entries(scores)
                .map(([key, score]) => ({ key, score, deviation: Math.abs(score - 50) }))
                .sort((a, b) => b.deviation - a.deviation)
                .slice(0, 3)
                .map(d => ({
                    factor: d.key,
                    score: Math.round(d.score * 10) / 10,
                    description: describeDriver(d.key, d.score),
                    impact: d.score > 50 ? 'bullish' : d.score < 50 ? 'bearish' : 'neutral',
                }));

            return {
                horizon_days: rec.horizon,
                signal: rec.signal,
                composite_score: Math.round((rec.composite_score ?? 0) * 10) / 10,
                confidence: Math.round((rec.confidence ?? 0) * 100),
                risk_override: rec.risk_override ?? false,
                drivers,
            };
        });

        // Hit rate from prediction history
        const correctCount = predictions.filter((p: any) => p.outcome === 'CORRECT').length;
        const totalResolved = predictions.length;
        const hitRate = totalResolved > 0 ? Math.round((correctCount / totalResolved) * 1000) / 10 : null;

        // Primary signal = 15d horizon
        const primary = horizons.find((h: any) => h.horizon_days === 15) || horizons[0];

        const response = {
            ticker,
            signal: primary.signal,
            composite_score: primary.composite_score,
            confidence_pct: primary.confidence,
            risk_rating: risk?.overall_risk_rating ?? null,
            track_record: {
                hit_rate_pct: hitRate,
                total_predictions: totalResolved,
                correct: correctCount,
                incorrect: totalResolved - correctCount,
            },
            drivers: primary.drivers,
            horizons,
            updated_at: recs[0]?.updatedAt?.toISOString() ?? null,
        };

        return NextResponse.json(response, {
            headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
        });
    } catch (e: any) {
        return NextResponse.json({ error: String(e) }, { status: 500 });
    }
}
