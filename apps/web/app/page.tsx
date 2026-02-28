import prisma from '@sentiment-crowd/db';
import DashboardClient from './DashboardClient';

// Ensure the page is never cached, completely dynamic
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function Page() {

    // 1. Fetch recent sentiment entries (organic only for graph)
    const recentData = await prisma.sentiment.findMany({
        where: { is_manipulation: false },
        orderBy: { post_timestamp: 'desc' },
        take: 50
    });

    // Prepare data for line chart (reverse for chronological order)
    const chartData = recentData.reverse().map(item => ({
        timeLabel: new Date(item.post_timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sentiment: item.sentiment,
        ticker: item.ticker,
    }));

    // 2. Aggregate Top Tickers (organic only)
    const allOrganic = await prisma.sentiment.findMany({
        where: { is_manipulation: false, ticker: { not: 'UNKNOWN' } },
    });

    const tickerMap: Record<string, number> = {};
    allOrganic.forEach(s => {
        tickerMap[s.ticker] = (tickerMap[s.ticker] || 0) + 1;
    });

    const topMentions = Object.entries(tickerMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([ticker, mentions]) => ({ ticker, mentions }));

    // 3. Stats for Slop/Bots
    const totalCount = await prisma.sentiment.count();
    const manipulatedCount = await prisma.sentiment.count({ where: { is_manipulation: true } });
    const organicCount = totalCount - manipulatedCount;

    return (
        <DashboardClient
            recentSentiments={chartData}
            topMentions={topMentions}
            manipulationStats={{ totalCount, manipulatedCount, organicCount }}
        />
    );
}
