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

    // Prepare data for line chart (reverse for chronological order)
    const chartData = recentData.reverse().map((item: any) => ({
        timeLabel: new Date(item.post_timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sentiment: item.sentiment,
        ticker: item.ticker,
    }));

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

    // 4. Fundamental Data for the Target Keyword
    const fundamentalData = await prisma.fundamentalData.findUnique({
        where: { ticker: targetKeyword }
    });

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

    const recommendationScore = await prisma.recommendationScore.findUnique({
        where: { ticker: targetKeyword }
    });

    // Prediction accuracy
    const predictionRecords = await prisma.predictionRecord.findMany({
        where: { ticker: targetKeyword, outcome: { not: 'PENDING' } },
        orderBy: { createdAt: 'desc' },
        take: 20
    });
    const totalPredictions = predictionRecords.length;
    const correctPredictions = predictionRecords.filter(p => p.outcome === 'CORRECT').length;
    const predictionAccuracy = totalPredictions > 0 ? correctPredictions / totalPredictions : null;

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
            predictionAccuracy={predictionAccuracy}
            predictionCount={totalPredictions}
        />
    );
}
