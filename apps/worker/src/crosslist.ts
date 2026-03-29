import prisma from '@sentiment-crowd/db';
import { logWrapper } from './logger';

const PYTHON_URL = process.env.PYTHON_WORKER_URL ?? 'http://localhost:8000';

export async function fetchAndSaveCrossListing(ticker: string): Promise<void> {
    try {
        const res = await fetch(`${PYTHON_URL}/crosslist/${ticker}`, {
            signal: AbortSignal.timeout(15_000),
        });
        if (!res.ok) return;
        const data = await res.json() as {
            ticker?: string;
            home_ticker?: string;
            home_exchange?: string;
            home_price?: number;
            adr_price?: number;
            fx_rate?: number;
            gap_pct?: number;
            error?: string;
        };

        if (data.error) {
            // Not an ADR or lookup failed — silently skip
            return;
        }

        await (prisma as any).crossListingData.upsert({
            where: { ticker },
            update: {
                home_ticker: data.home_ticker,
                home_exchange: data.home_exchange,
                home_price: data.home_price ?? null,
                adr_price: data.adr_price ?? null,
                fx_rate: data.fx_rate ?? null,
                gap_pct: data.gap_pct ?? null,
            },
            create: {
                ticker,
                home_ticker: data.home_ticker ?? '',
                home_exchange: data.home_exchange ?? '',
                home_price: data.home_price ?? null,
                adr_price: data.adr_price ?? null,
                fx_rate: data.fx_rate ?? null,
                gap_pct: data.gap_pct ?? null,
            },
        });

        logWrapper.info(`CrossListing for ${ticker}: gap_pct=${data.gap_pct?.toFixed(2)}% (${data.home_exchange})`);
    } catch (err) {
        logWrapper.warn(`CrossListing fetch failed for ${ticker}:`, err);
    }
}
