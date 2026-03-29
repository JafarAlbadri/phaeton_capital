import { logWrapper } from './logger';
import * as cheerio from 'cheerio';

export interface FundamentalHistoryNode {
    year: number;
    eps: number | null;
    revenue_per_share: number | null;
    roe: number | null;
    net_debt_ebitda: number | null;
    pe_ratio: number | null;
    ps_ratio: number | null;
    pb_ratio: number | null;
    ev_ebit: number | null;
}

export interface FundamentalInsiderTrade {
    insider_name: string;
    position: string;
    transaction: string;
    shares: number;
    value: number;
    date: string;
}

export interface TechnicalIndicatorsData {
    rsi_14: number | null;
    macd: number | null;
    macd_signal: number | null;
    macd_histogram: number | null;
    bb_upper: number | null;
    bb_middle: number | null;
    bb_lower: number | null;
    sma_20: number | null;
    sma_50: number | null;
    sma_200: number | null;
    ema_12: number | null;
    ema_26: number | null;
    volume_sma_20: number | null;
    atr_14: number | null;
    price_vs_bb: number | null;
    technical_signal: string | null;
    golden_cross: boolean | null;
    death_cross: boolean | null;
}

export interface FundamentalAnalysis {
    ticker: string;
    current_price: number | null;
    target_price: number | null;
    target_low_price: number | null;
    target_high_price: number | null;
    recommendation: string | null;
    pe_ratio: number | null;
    high_52_week: number | null;
    low_52_week: number | null;
    market_cap: bigint | null;
    volume: bigint | null;
    analyst_strong_buy: number | null;
    analyst_buy: number | null;
    analyst_hold: number | null;
    analyst_sell: number | null;
    analyst_strong_sell: number | null;
    next_earnings_date: string | null;
    sector: string | null;
    industry: string | null;
    iv_hv_ratio: number | null;
    technical_indicators?: TechnicalIndicatorsData;
    history?: FundamentalHistoryNode[];
    insiders?: FundamentalInsiderTrade[];
}

export async function fetchFundamentals(ticker: string): Promise<FundamentalAnalysis | null> {
    try {
        logWrapper.info(`Fetching fundamental data for ${ticker} via Python yfinance script...`);

        const pythonWorkerUrl = process.env.PYTHON_WORKER_URL || 'http://localhost:8000';
        const response = await fetch(`${pythonWorkerUrl}/fundamentals/${ticker}`, {
            signal: AbortSignal.timeout(60000)
        });

        if (!response.ok) {
            logWrapper.error(`[Python Fundamentals Error] ${response.status}: ${await response.text()}`);
            return null;
        }

        const textOutput = await response.text();

        let data = null;
        try {
            data = JSON.parse(textOutput);
        } catch (e) {
            logWrapper.error(`Failed to parse python output. Output was: ${textOutput}`);
            return null;
        }

        if (data.error) {
            logWrapper.error(`Python script returned logical error: ${data.error}`);
            return null;
        }

        return {
            ticker,
            current_price: data.current_price || null,
            target_price: data.target_price || null,
            target_low_price: data.target_low_price || null,
            target_high_price: data.target_high_price || null,
            recommendation: data.recommendation || null,
            pe_ratio: data.pe_ratio || null,
            high_52_week: data.high_52_week || null,
            low_52_week: data.low_52_week || null,
            market_cap: data.market_cap ? BigInt(data.market_cap) : null,
            volume: data.volume ? BigInt(data.volume) : null,
            analyst_strong_buy: data.analyst_strong_buy || null,
            analyst_buy: data.analyst_buy || null,
            analyst_hold: data.analyst_hold || null,
            analyst_sell: data.analyst_sell || null,
            analyst_strong_sell: data.analyst_strong_sell || null,
            next_earnings_date: data.next_earnings_date || null,
            sector: data.sector || null,
            industry: data.industry || null,
            iv_hv_ratio: data.iv_hv_ratio || null,
            technical_indicators: data.technical_indicators || null,
            history: data.history || [],
            insiders: data.insiders || []
        };
    } catch (error) {
        logWrapper.error(`Error executing python wrapper for ${ticker}:`, error);
        return null;
    }
}
