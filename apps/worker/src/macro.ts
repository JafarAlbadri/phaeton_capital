import { logWrapper } from './logger';
import prisma from '@phaeton/db';

const SECTOR_ETF_MAP: Record<string, string> = {
  'Technology': 'XLK',
  'Healthcare': 'XLV',
  'Financials': 'XLF',
  'Consumer Cyclical': 'XLY',
  'Consumer Defensive': 'XLP',
  'Energy': 'XLE',
  'Industrials': 'XLI',
  'Basic Materials': 'XLB',
  'Communication Services': 'XLC',
  'Utilities': 'XLU',
  'Real Estate': 'XLRE',
};

export async function fetchAndSaveMacro(ticker: string): Promise<void> {
  try {
    logWrapper.info(`Fetching macro indicators for ${ticker}...`);

    const fundamental = await prisma.fundamentalData.findUnique({ where: { ticker } });
    const sectorEtf = fundamental?.sector ? SECTOR_ETF_MAP[fundamental.sector] || 'SPY' : 'SPY';

    // We call yfinance_fetcher with a special "macro" mode via a separate Python invocation
    const payload = JSON.stringify({ ticker, sector_etf: sectorEtf });

    const pythonWorkerUrl = process.env.PYTHON_WORKER_URL || 'http://localhost:8000';
    const response = await fetch(`${pythonWorkerUrl}/macro`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        signal: AbortSignal.timeout(60000)
    });

    if (!response.ok) {
        logWrapper.error(`[Macro Python Error] ${response.status}: ${await response.text()}`);
        return;
    }

    const textOutput = await response.text();

    let data: any;
    try {
      data = JSON.parse(textOutput);
    } catch {
      logWrapper.error(`Failed to parse macro output: ${textOutput}`);
      return;
    }

    if (data.error) {
      logWrapper.error(`Macro script error: ${data.error}`);
      return;
    }

    await prisma.macroIndicators.upsert({
      where: { ticker },
      update: {
        fed_funds_rate: data.fed_funds_rate,
        ten_year_yield: data.ten_year_yield,
        vix: data.vix,
        cpi_yoy: data.cpi_yoy,
        sector_etf: sectorEtf,
        sector_etf_momentum_1m: data.sector_etf_momentum_1m,
        sector_etf_momentum_3m: data.sector_etf_momentum_3m,
        spy_pe_ratio: data.spy_pe_ratio,
        fear_greed_index: data.fear_greed_index,
        rate_sensitive: data.rate_sensitive,
        pe_premium_pct: data.pe_premium_pct,
      },
      create: {
        ticker,
        fed_funds_rate: data.fed_funds_rate,
        ten_year_yield: data.ten_year_yield,
        vix: data.vix,
        cpi_yoy: data.cpi_yoy,
        sector_etf: sectorEtf,
        sector_etf_momentum_1m: data.sector_etf_momentum_1m,
        sector_etf_momentum_3m: data.sector_etf_momentum_3m,
        spy_pe_ratio: data.spy_pe_ratio,
        fear_greed_index: data.fear_greed_index,
        rate_sensitive: data.rate_sensitive,
        pe_premium_pct: data.pe_premium_pct,
      }
    });

    logWrapper.info(`Saved macro indicators for ${ticker}`);
  } catch (err) {
    logWrapper.error(`Failed to fetch/save macro for ${ticker}:`, err);
  }
}
