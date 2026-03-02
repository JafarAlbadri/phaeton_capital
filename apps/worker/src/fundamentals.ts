import * as cheerio from 'cheerio';

export interface FundamentalAnalysis {
    ticker: string;
    current_price: number | null;
    target_price: number | null;
    recommendation: string | null;
    pe_ratio: number | null;
    high_52_week: number | null;
    low_52_week: number | null;
    market_cap: bigint | null;
    volume: bigint | null;
}

export async function fetchFundamentals(ticker: string): Promise<FundamentalAnalysis | null> {
    try {
        console.log(`Fetching fundamental data for ${ticker} via Python yfinance script...`);

        // Use bun to spawn the python crawler subprocess
        const proc = Bun.spawn(["python3", "/app/apps/worker/src/yfinance_fetcher.py", ticker], {
            stdout: "pipe",
            stderr: "pipe"
        });

        const textOutput = await new Response(proc.stdout).text();
        const errorOutput = await new Response(proc.stderr).text();

        // Check if there was a python crash
        if (errorOutput && errorOutput.trim().length > 0) {
            console.error(`[Python stderr] ${errorOutput}`);
        }

        if (!textOutput) {
            console.error(`No output received from Python script for ${ticker}`);
            return null;
        }

        let data = null;
        try {
            data = JSON.parse(textOutput);
        } catch (e) {
            console.error(`Failed to parse python output. Output was: ${textOutput}`);
            return null;
        }

        if (data.error) {
            console.error(`Python script returned logical error: ${data.error}`);
            return null;
        }

        return {
            ticker,
            current_price: data.current_price || null,
            target_price: data.target_price || null,
            recommendation: data.recommendation || null,
            pe_ratio: data.pe_ratio || null,
            high_52_week: data.high_52_week || null,
            low_52_week: data.low_52_week || null,
            market_cap: data.market_cap ? BigInt(data.market_cap) : null,
            volume: data.volume ? BigInt(data.volume) : null
        };
    } catch (error) {
        console.error(`Error executing python wrapper for ${ticker}:`, error);
        return null;
    }
}
