import { logWrapper } from './logger';
import prisma from '@phaeton/db';

export interface QuantMetricsData {
    ticker: string;
    beta_alpha: number | null;
    beta_beta: number | null;
    kde_data: any | null;
    granger_p_value: number | null;
    hmm_state: number | null;
    kelly_fraction: number | null;
    hurst_exponent: number | null;
    monte_carlo_paths: any | null;
    monte_carlo_mean: number | null;
    monte_carlo_var: number | null;
    z_score: number | null;
    // New Phase 2
    garch_volatility: number | null;
    sharpe_ratio: number | null;
    sortino_ratio: number | null;
    calmar_ratio: number | null;
    rolling_beta: number | null;
    iv_hv_ratio: number | null;
    var_95: number | null;
    var_99: number | null;
    cvar_95: number | null;
    max_drawdown: number | null;
    monte_carlo_p5: number | null;
    monte_carlo_p25: number | null;
    monte_carlo_p75: number | null;
    monte_carlo_p95: number | null;
    // New Phase 3
    bayes_posterior: number | null;
    bayes_std: number | null;
    sentiment_price_corr: number | null;
    adf_stationary: boolean | null;
    transfer_entropy: number | null;
    ou_theta: number | null;
    ou_mu: number | null;
    ou_sigma: number | null;
    dominant_cycle_days: number | null;
}

export async function executeQuantModels(ticker: string): Promise<QuantMetricsData | null> {
    try {
        logWrapper.info(`Executing advanced quantitative mathematical models for ${ticker}...`);

        // Fetch recent sentiment data from database
        const recentData = await prisma.sentiment.findMany({
            where: {
                is_manipulation: false,
                ticker: ticker
            },
            orderBy: { post_timestamp: 'desc' },
            take: 500
        });

        // Pass payload with time-decay weights so Python models can prioritise fresh data
        const now = Date.now();
        const halfLifeMs = 24 * 3600_000; // 24h half-life
        const lambda = Math.LN2 / halfLifeMs;
        const payload = JSON.stringify({
            ticker: ticker,
            sentiments: recentData.map(d => {
                const ageMs = now - d.post_timestamp.getTime();
                return {
                    post_timestamp: d.post_timestamp.toISOString(),
                    sentiment: d.sentiment,
                    confidence: d.confidence,
                    decay_weight: Math.exp(-lambda * ageMs),
                };
            })
        });

        const pythonWorkerUrl = process.env.PYTHON_WORKER_URL || 'http://localhost:8000';
        const response = await fetch(`${pythonWorkerUrl}/quant`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: payload,
            signal: AbortSignal.timeout(60000)
        });

        if (!response.ok) {
            logWrapper.error(`[Python Quant Error] ${response.status}: ${await response.text()}`);
            return null;
        }

        const textOutput = await response.text();

        let data = null;
        try {
            data = JSON.parse(textOutput);
        } catch (e) {
            logWrapper.error(`Failed to parse python math output. Output was: ${textOutput}`);
            return null;
        }

        if (data.error) {
            logWrapper.error(`Python math script logical error: ${data.error}`);
            logWrapper.error(data.traceback);
            return null;
        }

        // Upsert the results to Prisma
        const quantData = {
            beta_alpha: data.beta_alpha,
            beta_beta: data.beta_beta,
            kde_data: data.kde_data || [],
            granger_p_value: data.granger_p_value,
            hmm_state: data.hmm_state,
            kelly_fraction: data.kelly_fraction,
            hurst_exponent: data.hurst_exponent,
            monte_carlo_paths: data.monte_carlo_paths || [],
            monte_carlo_mean: data.monte_carlo_mean,
            monte_carlo_var: data.monte_carlo_var,
            z_score: data.z_score,
            garch_volatility: data.garch_volatility,
            sharpe_ratio: data.sharpe_ratio,
            sortino_ratio: data.sortino_ratio,
            calmar_ratio: data.calmar_ratio,
            rolling_beta: data.rolling_beta,
            iv_hv_ratio: data.iv_hv_ratio,
            var_95: data.var_95,
            var_99: data.var_99,
            cvar_95: data.cvar_95,
            max_drawdown: data.max_drawdown,
            monte_carlo_p5: data.monte_carlo_p5,
            monte_carlo_p25: data.monte_carlo_p25,
            monte_carlo_p75: data.monte_carlo_p75,
            monte_carlo_p95: data.monte_carlo_p95,
            bayes_posterior: data.bayes_posterior,
            bayes_std: data.bayes_std,
            sentiment_price_corr: data.sentiment_price_corr,
            adf_stationary: data.adf_stationary,
            transfer_entropy: data.transfer_entropy,
            ou_theta: data.ou_theta,
            ou_mu: data.ou_mu,
            ou_sigma: data.ou_sigma,
            dominant_cycle_days: data.dominant_cycle_days,
        };

        await prisma.quantMetrics.upsert({
            where: { ticker },
            update: quantData,
            create: { ticker, ...quantData }
        });

        logWrapper.info(`Successfully saved QuantMetrics for ${ticker}`);
        return data as QuantMetricsData;

    } catch (error) {
        logWrapper.error(`Error executing advanced python models for ${ticker}:`, error);
        return null;
    }
}
