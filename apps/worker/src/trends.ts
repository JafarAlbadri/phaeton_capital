import prisma from '@sentiment-crowd/db';
import { logWrapper } from './logger';

const PYTHON_URL = process.env.PYTHON_WORKER_URL ?? 'http://localhost:8000';

export async function fetchAndSaveTrends(ticker: string): Promise<void> {
    try {
        const res = await fetch(`${PYTHON_URL}/trends/${ticker}`, {
            signal: AbortSignal.timeout(60_000), // 60s — includes the 10s sleep inside python
        });
        if (!res.ok) return;
        const data = await res.json() as {
            trends_score: number;
            weekly_data: { week: string; interest: number }[];
            direction: 'up' | 'down' | 'flat';
            error?: string;
        };

        if (data.error) {
            logWrapper.warn(`Google Trends for ${ticker}: ${data.error}`);
        }

        // Upsert trends_score into QuantMetrics
        await prisma.quantMetrics.update({
            where: { ticker },
            data: { trends_score: data.trends_score },
        }).catch(() => {/* QuantMetrics may not exist yet — ignore */});

        // Batch-insert weekly TrendsHistory rows (skip duplicates)
        if (data.weekly_data?.length) {
            const rows = data.weekly_data.map(w => ({
                ticker,
                week_start: new Date(w.week),
                interest: w.interest,
            }));
            await prisma.$transaction(
                rows.map(r =>
                    prisma.trendsHistory.upsert({
                        where: { ticker_week_start: { ticker: r.ticker, week_start: r.week_start } },
                        update: { interest: r.interest },
                        create: r,
                    })
                )
            );
        }

        logWrapper.info(`Google Trends for ${ticker}: score=${data.trends_score} direction=${data.direction}`);
    } catch (err) {
        logWrapper.warn(`Google Trends fetch failed for ${ticker}:`, err);
    }
}
