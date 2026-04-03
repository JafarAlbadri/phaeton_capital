import prisma from '@sentiment-crowd/db';

export interface ScreenerRow {
    ticker: string;
    composite15d: number | null;
    composite30d: number | null;
    composite90d: number | null;
    signal15d: string | null;
    sentimentScore: number | null;
    hmmState: number | null;
    rsi: number | null;
    technicalSignal: string | null;
    lastPrice: number | null;
    riskRating: number | null;
    updatedAt: Date | null;
}

const SORT_FIELDS: Record<string, string> = {
    composite15d: 'composite15d',
    composite30d: 'composite30d',
    composite90d: 'composite90d',
    sentiment:    'sentimentScore',
    risk:         'riskRating',
    riskRating:   'riskRating',
};

export async function screenerQuery(
    tickers: string[],
    sortBy: string = 'composite15d',
    order: 'asc' | 'desc' = 'desc'
): Promise<ScreenerRow[]> {
    const [recs15, recs30, recs90, quants, techs, funds, risks] = await Promise.all([
        (prisma.recommendationScore as any).findMany({
            where: { ticker: { in: tickers }, horizon: 15 },
            select: { ticker: true, composite_score: true, signal: true, sentiment_score: true },
        }),
        (prisma.recommendationScore as any).findMany({
            where: { ticker: { in: tickers }, horizon: 30 },
            select: { ticker: true, composite_score: true },
        }),
        (prisma.recommendationScore as any).findMany({
            where: { ticker: { in: tickers }, horizon: 90 },
            select: { ticker: true, composite_score: true },
        }),
        prisma.quantMetrics.findMany({
            where: { ticker: { in: tickers } },
            select: { ticker: true, hmm_state: true },
        }),
        prisma.technicalIndicators.findMany({
            where: { ticker: { in: tickers } },
            select: { ticker: true, rsi_14: true, technical_signal: true },
        }),
        prisma.fundamentalData.findMany({
            where: { ticker: { in: tickers } },
            select: { ticker: true, current_price: true },
        }),
        prisma.riskProfile.findMany({
            where: { ticker: { in: tickers } },
            select: { ticker: true, overall_risk_rating: true },
        }),
    ]);

    const map15 = Object.fromEntries(recs15.map((r: any) => [r.ticker, r]));
    const map30 = Object.fromEntries(recs30.map((r: any) => [r.ticker, r]));
    const map90 = Object.fromEntries(recs90.map((r: any) => [r.ticker, r]));
    const mapQ  = Object.fromEntries(quants.map(r => [r.ticker, r]));
    const mapT  = Object.fromEntries(techs.map(r => [r.ticker, r]));
    const mapF  = Object.fromEntries(funds.map(r => [r.ticker, r]));
    const mapRk = Object.fromEntries(risks.map(r => [r.ticker, r]));

    const rows: ScreenerRow[] = tickers.map(ticker => ({
        ticker,
        composite15d:    map15[ticker]?.composite_score ?? null,
        composite30d:    map30[ticker]?.composite_score ?? null,
        composite90d:    map90[ticker]?.composite_score ?? null,
        signal15d:       map15[ticker]?.signal ?? null,
        sentimentScore:  map15[ticker]?.sentiment_score ?? null,
        hmmState:        mapQ[ticker]?.hmm_state ?? null,
        rsi:             mapT[ticker]?.rsi_14 ?? null,
        technicalSignal: mapT[ticker]?.technical_signal ?? null,
        lastPrice:       mapF[ticker]?.current_price ?? null,
        riskRating:      mapRk[ticker]?.overall_risk_rating ?? null,
        updatedAt:       null,
    }));

    const sortKey = SORT_FIELDS[sortBy] ?? 'composite15d';
    rows.sort((a, b) => {
        const av = (a as any)[sortKey] ?? -Infinity;
        const bv = (b as any)[sortKey] ?? -Infinity;
        return order === 'desc' ? bv - av : av - bv;
    });

    return rows;
}
