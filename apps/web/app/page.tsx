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

    // 1b. Gaussian Math Computations
    const organicSentiments = recentData.map(d => d.sentiment);
    const mean = organicSentiments.length > 0
        ? organicSentiments.reduce((acc, val) => acc + val, 0) / organicSentiments.length
        : 0;

    const variance = organicSentiments.length > 1
        ? organicSentiments.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / (organicSentiments.length - 1)
        : 0;
    const stdDev = Math.sqrt(variance) || 0.2; // Fallback to 0.2 if variance is 0 (e.g. 1 item identical)

    function gaussianPDF(x: number, mean: number, stdDev: number) {
        const exponent = Math.exp(-Math.pow(x - mean, 2) / (2 * Math.pow(stdDev, 2)));
        return (1 / (stdDev * Math.sqrt(2 * Math.PI))) * exponent;
    }

    const gaussianData = [];
    for (let x = -1; x <= 1; x += 0.05) {
        const xVal = parseFloat(x.toFixed(2));
        gaussianData.push({
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

    return (
        <DashboardClient
            recentSentiments={chartData}
            manipulationStats={{ totalCount, manipulatedCount, organicCount }}
            targetKeyword={targetKeyword}
            fundamentalData={fundamentalData}
            financialHistory={financialHistory}
            insiderTrades={insiderTrades}
            usdSekRate={usdSekRate}
            gaussianData={{ curve: gaussianData, mean, stdDev }}
        />
    );
}
