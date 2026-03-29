import prisma from '@sentiment-crowd/db';
import DashboardClient from './DashboardClient';

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
    const targetKeyword = (typeof queryParam === 'string' ? queryParam : null) || process.env.TARGET_KEYWORD || 'wallstreetbets';

    // 1. Fetch recent sentiment entries for the SPECIFIC target keyword
    const recentData = await prisma.sentiment.findMany({
        where: {
            is_manipulation: false,
            ticker: { equals: targetKeyword, mode: 'insensitive' }
        },
        orderBy: { post_timestamp: 'desc' },
        take: 250
    });

    const fundamentalData = await prisma.fundamentalData.findUnique({
        where: { ticker: targetKeyword }
    });

    const basePrice = fundamentalData?.current_price || 100;
    let currentSimPrice = basePrice * 0.95; // Start slightly lower

    // Prepare data for line chart (reverse for chronological order)
    const chartData = recentData.reverse().map((item: any) => {
        // Simple random walk correlated with sentiment
        currentSimPrice += (item.sentiment * basePrice * 0.001) + ((Math.random() - 0.5) * basePrice * 0.002);
        return {
            timeLabel: new Date(item.post_timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            sentiment: item.sentiment,
            ticker: item.ticker,
            price: currentSimPrice
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
    const baseWhere = { ticker: { equals: targetKeyword, mode: 'insensitive' as const } };
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
        (prisma.recommendationScore as any).findUnique({ where: { ticker_horizon: { ticker: targetKeyword, horizon: 15 } } }),
        (prisma.recommendationScore as any).findUnique({ where: { ticker_horizon: { ticker: targetKeyword, horizon: 30 } } }),
        (prisma.recommendationScore as any).findUnique({ where: { ticker_horizon: { ticker: targetKeyword, horizon: 90 } } }),
    ]);
    const recommendationScore = h15 ?? null; // default to 15d for backward compat
    const recommendationScores = { h15, h30, h90 };

    // V2: Trends history (last 13 weeks)
    const trendsHistory = await (prisma as any).trendsHistory?.findMany({
        where: { ticker: targetKeyword }, orderBy: { week_start: 'desc' }, take: 13
    }).catch(() => []) ?? [];

    // V2: Cross-listing ADR gap
    const crossListingData = await (prisma as any).crossListingData?.findUnique({
        where: { ticker: targetKeyword }
    }).catch(() => null) ?? null;

    // V2: Regional sentiment
    const regionalSentiment = await (prisma as any).regionalSentiment?.findMany({
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

    // Prediction audit trail (last 25 resolved predictions with returns)
    const predictionHistory = await prisma.predictionRecord.findMany({
        where: { ticker: targetKeyword, outcome: { in: ['CORRECT', 'INCORRECT'] } },
        orderBy: { createdAt: 'desc' },
        take: 25,
        select: {
            id: true, signal: true, price_at_signal: true, price_15d_later: true,
            outcome: true, composite_score: true, createdAt: true,
        },
    });

    // Compute audit stats
    let auditHitRate: number | null = null;
    let auditAvgReturn: number | null = null;
    let auditMaxDrawdown: number | null = null;
    let auditSharpe: number | null = null;
    if (predictionHistory.length > 0) {
        const returns = predictionHistory
            .filter(p => p.price_at_signal && p.price_15d_later)
            .map(p => (p.price_15d_later! - p.price_at_signal) / p.price_at_signal);
        const correct = predictionHistory.filter(p => p.outcome === 'CORRECT').length;
        auditHitRate = correct / predictionHistory.length;
        if (returns.length > 0) {
            auditAvgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
            auditMaxDrawdown = Math.min(...returns);
            const mean_ = auditAvgReturn;
            const variance_ = returns.reduce((a, r) => a + Math.pow(r - mean_, 2), 0) / returns.length;
            const std_ = Math.sqrt(variance_);
            auditSharpe = std_ > 0 ? mean_ / std_ : null;
        }
    }

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
        />
    );
}
