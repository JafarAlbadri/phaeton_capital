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

        const textOutput = await new Response(proc.stdout).text();
        const errorOutput = await new Response(proc.stderr).text();

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
        await prisma.quantMetrics.upsert({
            where: { ticker: ticker },
            update: {
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
                z_score: data.z_score
            },
            create: {
                ticker: ticker,
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
                z_score: data.z_score
            }
        });

        console.log(`Successfully saved QuantMetrics for ${ticker}`);
        return data as QuantMetricsData;

    } catch (error) {
        console.error(`Error executing advanced python models for ${ticker}:`, error);
        return null;
    }
}
