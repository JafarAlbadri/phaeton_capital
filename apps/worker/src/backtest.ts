import { logWrapper } from './logger';

export interface BacktestResult {
    ticker: string;
    years_tested: number;
    total_trades: number;
    hit_rate: number;
    avg_return_pct: number;
    sharpe_ratio: number;
    max_drawdown_pct: number;
    final_equity: number;
    benchmark_return_pct: number;
    equity_curve: Array<{ date: string; equity: number; bh: number }>;
    recent_trades: Array<{
        date: string; direction: string; score: number;
        entry: number; exit: number; return_pct: number; outcome: string;
    }>;
}

export async function runBacktest(ticker: string, years = 2): Promise<BacktestResult | null> {
    try {
        const pythonUrl = process.env.PYTHON_WORKER_URL || 'http://python_worker:8000';
        const resp = await fetch(`${pythonUrl}/backtest/${encodeURIComponent(ticker)}?years=${years}`, {
            method: 'POST',
            signal: AbortSignal.timeout(60000),
        });
        if (!resp.ok) return null;
        const data = await resp.json();
        if (data.error) { logWrapper.warn(`Backtest error for ${ticker}: ${data.error}`); return null; }
        return data as BacktestResult;
    } catch (e) {
        logWrapper.warn(`Backtest fetch failed for ${ticker}:`, e);
        return null;
    }
}
