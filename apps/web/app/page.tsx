import prisma from '@phaeton/db';
import DashboardClient from './DashboardClient';

// ── Quant helpers ────────────────────────────────────────────────────────────
function pearsonCorrelation(xs: number[], ys: number[]): number {
    const n = xs.length;
    if (n < 2) return 0;
    const mx = xs.reduce((a, b) => a + b, 0) / n;
    const my = ys.reduce((a, b) => a + b, 0) / n;
    const num = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0);
    const den = Math.sqrt(
        xs.reduce((s, x) => s + (x - mx) ** 2, 0) *
        ys.reduce((s, y) => s + (y - my) ** 2, 0)
    );
    return den === 0 ? 0 : num / den;
}

/** Midranks (ties share the average rank) for Spearman. */
function ranks(xs: number[]): number[] {
    const idx = xs.map((v, i) => [v, i] as const).sort((a, b) => a[0] - b[0]);
    const out = new Array<number>(xs.length);
    let i = 0;
    while (i < idx.length) {
        let j = i;
        while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++;
        const avgRank = (i + j) / 2 + 1;
        for (let k = i; k <= j; k++) out[idx[k][1]] = avgRank;
        i = j + 1;
    }
    return out;
}

/** Spearman rank correlation — the IC in its institutional definition. */
function spearmanCorrelation(xs: number[], ys: number[]): number {
    return pearsonCorrelation(ranks(xs), ranks(ys));
}

function icTStat(ic: number, n: number): number {
    if (n < 3 || Math.abs(ic) >= 1) return 0;
    return ic * Math.sqrt(n - 2) / Math.sqrt(1 - ic ** 2);
}

// Ensure the page is never cached, completely dynamic
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function Page(
    props: {
        searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
    }
) {
    const searchParams = await props.searchParams;
    // Get target keyword from URL query param `?q=` or fallback to env/default
    const queryParam = searchParams?.q;
    const rawKeyword = (typeof queryParam === 'string' ? queryParam : null) || process.env.TARGET_KEYWORD || 'wallstreetbets';
    // Same normalization as the write side (worker uppercases short symbols),
    // so exact-match queries hit the ticker indexes.
    const targetKeyword = rawKeyword.trim().length <= 5 ? rawKeyword.trim().toUpperCase() : rawKeyword.trim();

    // 1. Fetch recent sentiment entries for the SPECIFIC target keyword
    const recentData = await prisma.sentiment.findMany({
        where: {
            is_manipulation: false,
            ticker: targetKeyword
        },
        orderBy: { post_timestamp: 'desc' },
        take: 250
    });

    const fundamentalData = await prisma.fundamentalData.findUnique({
        where: { ticker: targetKeyword }
    });

    // Prepare data for line chart (reverse for chronological order).
    // NOTE: this chart plots sentiment only — an earlier version overlaid a
    // "price" line that was a random-walk simulation, not real prices.
    recentData.reverse(); // mutates to ascending chronological order
    const firstTs = recentData[0]?.post_timestamp;
    const lastTs = recentData[recentData.length - 1]?.post_timestamp;
    const spansMultipleDays = firstTs && lastTs && firstTs.toDateString() !== lastTs.toDateString();

    // Hoist formatters outside map to avoid per-iteration Intl object allocation
    const dateFmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
    const timeFmt = new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

    const chartData = recentData.map((item: any) => {
        const dateStr = dateFmt.format(item.post_timestamp);
        const timeLabel = spansMultipleDays ? dateStr : `${dateStr} ${timeFmt.format(item.post_timestamp)}`;
        return {
            timeLabel,
            sentiment: item.sentiment,
            ticker: item.ticker,
        };
    });

    // 1b. Advanced Math Computations (Phase 3 & 5)
    const now = Date.now();
    const halfLifeMs = 48 * 60 * 60 * 1000;

    let weightedSum = 0;
    let weightTotal = 0;
    const validSentiments: number[] = [];

    for (const d of recentData) {
        // Phase 5: NaN filter
        if (isNaN(d.sentiment) || isNaN(d.confidence)) continue;

        // Phase 3: Exponential decay (48h half-life)
        const ageMs = now - new Date(d.post_timestamp).getTime();
        const timeWeight = Math.pow(0.5, ageMs / halfLifeMs);

        // Phase 3: Confidence-weighted
        const confWeight = d.confidence || 0.1;
        
        const totalWeight = timeWeight * confWeight;
        weightedSum += d.sentiment * totalWeight;
        weightTotal += totalWeight;
        
        validSentiments.push(d.sentiment);
    }

    const n = validSentiments.length;
    const mean = weightTotal > 0 ? weightedSum / weightTotal : 0;

    // Bootstrap 95% CI
    let lowerBound = 0;
    let upperBound = 0;
    if (n > 1) {
        const numBootstraps = 1000;
        const bootstrapMeans = [];
        for (let i = 0; i < numBootstraps; i++) {
            let bSum = 0;
            for (let j = 0; j < n; j++) {
                const randIdx = Math.floor(Math.random() * n);
                bSum += validSentiments[randIdx];
            }
            bootstrapMeans.push(bSum / n);
        }
        bootstrapMeans.sort((a, b) => a - b);
        lowerBound = bootstrapMeans[Math.floor(numBootstraps * 0.025)];
        upperBound = bootstrapMeans[Math.floor(numBootstraps * 0.975)];
    }


    // T-test (One-sample) against 0 (neutral) approximation
    let pValue = 1;
    let isSignificant = false;
    let stdDev = 0.2; // default
    if (n > 1) {
        const unweightedMean = validSentiments.reduce((acc, v) => acc + v, 0) / n;
        const variance = validSentiments.reduce((acc, v) => acc + Math.pow(v - unweightedMean, 2), 0) / (n - 1);
        stdDev = Math.sqrt(variance) || 0.2;
        
        const standardError = stdDev / Math.sqrt(n);
        const tStat = standardError > 0 ? unweightedMean / standardError : 0;
        const absZ = Math.abs(tStat);
        pValue = Math.exp(-0.717 * absZ - 0.416 * Math.pow(absZ, 2));
        isSignificant = pValue < 0.05;
    }

    function gaussianPDF(x: number, mean: number, stdDev: number) {
        const exponent = Math.exp(-Math.pow(x - mean, 2) / (2 * Math.pow(stdDev, 2)));
        return (1 / (stdDev * Math.sqrt(2 * Math.PI))) * exponent;
    }

    const gaussianDataList = [];
    for (let x = -1; x <= 1; x += 0.05) {
        const xVal = parseFloat(x.toFixed(2));
        gaussianDataList.push({
            sentiment: xVal,
            density: gaussianPDF(xVal, mean, stdDev)
        });
    }

    // 2. Stats for Slop/Bots (filtered for this keyword)
    const baseWhere = { ticker: targetKeyword };
    const totalCount = await prisma.sentiment.count({ where: baseWhere });
    const manipulatedCount = await prisma.sentiment.count({ where: { ...baseWhere, is_manipulation: true } });
    const organicCount = totalCount - manipulatedCount;

    // 4. Fundamental Data for the Target Keyword (Already fetched above)

    const financialHistory = await prisma.financialHistory.findMany({
        where: { ticker: targetKeyword },
        orderBy: { year: 'asc' }
    });

    const insiderTrades = await prisma.insiderTrade.findMany({
        where: { ticker: targetKeyword },
        orderBy: { date: 'desc' },
        take: 20
    });

    const quantMetrics = await prisma.quantMetrics.findUnique({
        where: { ticker: targetKeyword }
    });

    const technicalIndicators = await prisma.technicalIndicators.findUnique({
        where: { ticker: targetKeyword }
    });

    const macroIndicators = await prisma.macroIndicators.findUnique({
        where: { ticker: targetKeyword }
    });

    const riskProfile = await prisma.riskProfile.findUnique({
        where: { ticker: targetKeyword }
    });

    const [h15, h30, h90] = await Promise.all([
        prisma.recommendationScore.findUnique({ where: { ticker_horizon: { ticker: targetKeyword, horizon: 15 } } }),
        prisma.recommendationScore.findUnique({ where: { ticker_horizon: { ticker: targetKeyword, horizon: 30 } } }),
        prisma.recommendationScore.findUnique({ where: { ticker_horizon: { ticker: targetKeyword, horizon: 90 } } }),
    ]);
    const recommendationScore = h15 ?? null; // default to 15d for backward compat
    const recommendationScores = { h15, h30, h90 };

    // ── Score history for sparkline (last 30 prediction records at 15d horizon)
    const scoreHistoryRaw = await prisma.predictionRecord.findMany({
        where: { ticker: targetKeyword, horizon: 15 },
        orderBy: { createdAt: 'asc' },
        take: 30,
        select: { createdAt: true, composite_score: true, signal: true },
    });
    const scoreHistory = scoreHistoryRaw.map(p => ({
        date: p.createdAt.toISOString().slice(0, 10),
        score: p.composite_score,
        signal: p.signal,
    }));

    // ── Sector peers for comparison
    const peerRows = fundamentalData?.sector
        ? await prisma.fundamentalData.findMany({
            where: { sector: fundamentalData.sector, ticker: { not: targetKeyword } },
            select: { ticker: true },
            take: 7,
          })
        : [];
    const peerTickers = peerRows.map((p: any) => p.ticker);

    // ── Options flow for earnings setup
    const optionsFlow = await prisma.optionsFlow.findUnique({
        where: { ticker: targetKeyword },
    }).catch(() => null) ?? null;

    const daysToEarnings = fundamentalData?.next_earnings_date
        ? Math.ceil((new Date(fundamentalData.next_earnings_date).getTime() - Date.now()) / 86_400_000)
        : null;
    const earningsSetup = {
        daysToEarnings,
        nextEarningsDate: fundamentalData?.next_earnings_date?.toISOString().slice(0, 10) ?? null,
        ivPercentile: optionsFlow?.iv_percentile ?? null,
        putCallRatio: optionsFlow?.put_call_ratio ?? null,
        maxPainPrice: optionsFlow?.max_pain_price ?? null,
    };

    // V2: Trends history (last 13 weeks)
    const trendsHistory = await prisma.trendsHistory.findMany({
        where: { ticker: targetKeyword }, orderBy: { week_start: 'desc' }, take: 13
    }).catch(() => []) ?? [];

    // V2: Cross-listing ADR gap
    const crossListingData = await prisma.crossListingData.findUnique({
        where: { ticker: targetKeyword }
    }).catch(() => null) ?? null;

    // V2: Regional sentiment
    const regionalSentiment = await prisma.regionalSentiment.findMany({
        where: { ticker: targetKeyword }
    }).catch(() => []) ?? [];

    // Prediction accuracy
    const predictionRecords = await prisma.predictionRecord.findMany({
        where: { ticker: targetKeyword, outcome: { not: 'PENDING' } },
        orderBy: { createdAt: 'desc' },
        take: 20
    });
    const totalPredictions = predictionRecords.length;
    const correctPredictions = predictionRecords.filter(p => p.outcome === 'CORRECT').length;
    const predictionAccuracy = totalPredictions > 0 ? correctPredictions / totalPredictions : null;

    // Prediction audit trail (last 25 records — resolved + pending)
    const predictionHistory = await prisma.predictionRecord.findMany({
        where: { ticker: targetKeyword },
        orderBy: { createdAt: 'desc' },
        take: 25,
        select: {
            id: true, signal: true, price_at_signal: true, price_at_resolution: true,
            outcome: true, composite_score: true, createdAt: true, horizon: true,
        },
    });

    // Compute audit stats — P&L-style, direction-adjusted: a SELL that fell
    // 5% is a +5% trade, not a −5% one. HOLD has no position and is excluded
    // from return stats (it still counts toward hit rate).
    let auditHitRate: number | null = null;
    let auditAvgReturn: number | null = null;
    let auditMaxDrawdown: number | null = null;
    let auditSharpe: number | null = null;
    const resolvedPredictions = predictionHistory.filter(p => p.outcome === 'CORRECT' || p.outcome === 'INCORRECT');
    if (resolvedPredictions.length > 0) {
        const directionalReturns = resolvedPredictions
            .filter(p => p.price_at_signal && p.price_at_resolution && p.signal !== 'HOLD')
            .map(p => {
                const raw = (p.price_at_resolution! - p.price_at_signal) / p.price_at_signal;
                const isShort = p.signal === 'SELL' || p.signal === 'STRONG_SELL';
                return isShort ? -raw : raw;
            });
        const correct = resolvedPredictions.filter(p => p.outcome === 'CORRECT').length;
        auditHitRate = correct / resolvedPredictions.length;
        if (directionalReturns.length > 0) {
            auditAvgReturn = directionalReturns.reduce((a, b) => a + b, 0) / directionalReturns.length;
            auditMaxDrawdown = Math.min(...directionalReturns);
            const mean_ = auditAvgReturn;
            const variance_ = directionalReturns.reduce((a, r) => a + Math.pow(r - mean_, 2), 0) / directionalReturns.length;
            const std_ = Math.sqrt(variance_);
            auditSharpe = std_ > 0 ? mean_ / std_ : null;
        }
    }

    // ── Signal Attribution (IC / IR / T-Stat) ──────────────────────────────
    // Computed on 15d-horizon records only: mixing horizons correlates the
    // score against returns measured over different periods. Chronological
    // order and a wider window than the 25-row audit table.
    const resolvedForStats = await prisma.predictionRecord.findMany({
        where: { ticker: targetKeyword, horizon: 15, outcome: { in: ['CORRECT', 'INCORRECT'] } },
        orderBy: { createdAt: 'asc' },
        take: 200,
        select: { composite_score: true, price_at_signal: true, price_at_resolution: true },
    });
    const icPairs = resolvedForStats
        .filter(p => p.price_at_signal && p.price_at_resolution && p.composite_score != null)
        .map(p => ({
            score: p.composite_score as number,
            ret: (p.price_at_resolution! - p.price_at_signal) / p.price_at_signal,
        }));

    // IC = Spearman rank correlation, matching the "rank-corr" the UI claims
    const ic = icPairs.length >= 5
        ? spearmanCorrelation(icPairs.map(p => p.score), icPairs.map(p => p.ret))
        : null;

    // IR from NON-overlapping IC batches — overlapping windows autocorrelate
    // the IC series and understate its dispersion, inflating IR.
    let ir: number | null = null;
    const IC_BATCH = 5;
    if (icPairs.length >= IC_BATCH * 3) {
        const icSeries: number[] = [];
        for (let i = 0; i + IC_BATCH <= icPairs.length; i += IC_BATCH) {
            const batch = icPairs.slice(i, i + IC_BATCH);
            icSeries.push(spearmanCorrelation(batch.map(p => p.score), batch.map(p => p.ret)));
        }
        const icMean = icSeries.reduce((a, b) => a + b, 0) / icSeries.length;
        const icStd = Math.sqrt(icSeries.reduce((s, v) => s + (v - icMean) ** 2, 0) / icSeries.length);
        ir = icStd > 0 ? icMean / icStd : null;
    }

    const tStat = ic !== null ? icTStat(ic, icPairs.length) : null;
    const icPValue = tStat !== null ? Math.exp(-0.717 * Math.abs(tStat) - 0.416 * tStat ** 2) : null;
    // The p-value uses a normal approximation, which overclaims at small n —
    // don't badge significance on thin samples.
    const icIsSignificant = icPValue !== null && icPValue < 0.05 && icPairs.length >= 10;

    // Win rate by signal type
    const signalGroups: Record<string, { calls: number; correct: number; returns: number[] }> = {};
    for (const p of resolvedPredictions) {
        if (!signalGroups[p.signal]) signalGroups[p.signal] = { calls: 0, correct: 0, returns: [] };
        signalGroups[p.signal].calls++;
        if (p.outcome === 'CORRECT') signalGroups[p.signal].correct++;
        if (p.price_at_signal && p.price_at_resolution) {
            signalGroups[p.signal].returns.push((p.price_at_resolution! - p.price_at_signal) / p.price_at_signal);
        }
    }
    const bySignalType = Object.entries(signalGroups).map(([signal, g]) => ({
        signal,
        calls: g.calls,
        hitRate: g.calls > 0 ? g.correct / g.calls : null,
        avgReturn: g.returns.length > 0 ? g.returns.reduce((a, b) => a + b, 0) / g.returns.length : null,
    }));

    const signalAttribution = {
        ic,
        ir,
        tStat,
        pValue: icPValue,
        isSignificant: icIsSignificant,
        n: icPairs.length,
        bySignalType,
        transferEntropy: (quantMetrics as any)?.transfer_entropy ?? null,
        grangerP: (quantMetrics as any)?.granger_p_value ?? null,
        sentimentPriceCorr: (quantMetrics as any)?.sentiment_price_corr ?? null,
    };

    // 5. Fetch USD to SEK Exchange Rate
    let usdSekRate = null;
    try {
        const res = await fetch('https://open.er-api.com/v6/latest/USD', { next: { revalidate: 3600 } });
        const data = await res.json();
        if (data && data.rates && data.rates.SEK) {
            usdSekRate = data.rates.SEK;
        }
    } catch (e) {
        console.error("Failed to fetch USDSEK rate from open API:", e);
    }

    // Use Bayesian CI if available, otherwise fall back to bootstrap
    const bayesPosterior = (quantMetrics as any)?.bayes_posterior;
    const bayesStd = (quantMetrics as any)?.bayes_std;
    if (bayesPosterior != null && bayesStd != null) {
        // Use Bayesian credible interval (95% = ±1.96 * std)
        lowerBound = bayesPosterior - 1.96 * bayesStd;
        upperBound = bayesPosterior + 1.96 * bayesStd;
    }

    return (
        <DashboardClient
            recentSentiments={chartData}
            manipulationStats={{ totalCount, manipulatedCount, organicCount }}
            targetKeyword={targetKeyword}
            fundamentalData={fundamentalData}
            financialHistory={financialHistory}
            insiderTrades={insiderTrades}
            usdSekRate={usdSekRate}
            gaussianData={{ curve: gaussianDataList, mean, stdDev, n, lowerBound, upperBound, pValue, isSignificant }}
            quantMetrics={quantMetrics}
            technicalIndicators={technicalIndicators}
            macroIndicators={macroIndicators}
            riskProfile={riskProfile}
            recommendationScore={recommendationScore}
            recommendationScores={recommendationScores}
            predictionAccuracy={predictionAccuracy}
            predictionCount={totalPredictions}
            predictionHistory={predictionHistory}
            auditStats={{ hitRate: auditHitRate, avgReturn: auditAvgReturn, maxDrawdown: auditMaxDrawdown, sharpe: auditSharpe }}
            trendsHistory={trendsHistory}
            crossListingData={crossListingData}
            regionalSentiment={regionalSentiment}
            signalAttribution={signalAttribution}
            scoreHistory={scoreHistory}
            peerTickers={peerTickers}
            earningsSetup={earningsSetup}
        />
    );
}
