import prisma from '@sentiment-crowd/db';

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
    console.log(`Fetching macro indicators for ${ticker}...`);

    const fundamental = await prisma.fundamentalData.findUnique({ where: { ticker } });
    const sectorEtf = fundamental?.sector ? SECTOR_ETF_MAP[fundamental.sector] || 'SPY' : 'SPY';

    // We call yfinance_fetcher with a special "macro" mode via a separate Python invocation
    const payload = JSON.stringify({ ticker, sector_etf: sectorEtf });

    const proc = Bun.spawn(["python3", "/app/apps/worker/src/macro_fetcher.py"], {
      stdin: "pipe",
      stdout: "pipe",
      stderr: "pipe"
    });

    proc.stdin.write(payload);
    proc.stdin.flush();
    proc.stdin.end();

    const [textOutput, errorOutput] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
    ]);

    if (errorOutput?.trim()) {
      console.error(`[Macro Python stderr] ${errorOutput}`);
    }

    if (!textOutput) {
      console.error(`No macro output for ${ticker}`);
      return;
    }

    let data: any;
    try {
      data = JSON.parse(textOutput);
    } catch {
      console.error(`Failed to parse macro output: ${textOutput}`);
      return;
    }

    if (data.error) {
      console.error(`Macro script error: ${data.error}`);
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

    console.log(`Saved macro indicators for ${ticker}`);
  } catch (err) {
    console.error(`Failed to fetch/save macro for ${ticker}:`, err);
  }
}
