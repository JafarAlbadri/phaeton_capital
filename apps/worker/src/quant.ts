import prisma from '@sentiment-crowd/db';

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
        console.log(`Executing advanced quantitative mathematical models for ${ticker}...`);

        // Fetch recent sentiment data from database
        const recentData = await prisma.sentiment.findMany({
            where: {
                is_manipulation: false,
                ticker: { equals: ticker, mode: 'insensitive' }
            },
            orderBy: { post_timestamp: 'desc' },
            take: 500
        });

        // Pass payload over string standard input
        const payload = JSON.stringify({
            ticker: ticker,
            sentiments: recentData.map(d => ({
                post_timestamp: d.post_timestamp.toISOString(),
                sentiment: d.sentiment,
                confidence: d.confidence
            }))
        });

        const proc = Bun.spawn(["python3", "/app/apps/worker/src/advanced_math.py"], {
            stdin: "pipe",
            stdout: "pipe",
            stderr: "pipe"
        });

        proc.stdin.write(payload);
        proc.stdin.flush();
        proc.stdin.end();

        // Add timeout
        const timeoutId = setTimeout(() => {
            try { proc.kill(); } catch {}
        }, 30000);

        const textOutput = await new Response(proc.stdout).text();
        const errorOutput = await new Response(proc.stderr).text();
        clearTimeout(timeoutId);

        if (errorOutput && errorOutput.trim().length > 0) {
            console.error(`[Python Quant stderr] ${errorOutput}`);
        }

        if (!textOutput) {
            console.error(`No output received from Python math script for ${ticker}`);
            return null;
        }

        let data = null;
        try {
            data = JSON.parse(textOutput);
        } catch (e) {
            console.error(`Failed to parse python math output. Output was: ${textOutput}`);
            return null;
        }

        if (data.error) {
            console.error(`Python math script logical error: ${data.error}`);
            console.error(data.traceback);
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

        console.log(`Successfully saved QuantMetrics for ${ticker}`);
        return data as QuantMetricsData;

    } catch (error) {
        console.error(`Error executing advanced python models for ${ticker}:`, error);
        return null;
    }
}
