import prisma from '@sentiment-crowd/db';
import DashboardClient from './DashboardClient';

// Ensure the page is never cached, completely dynamic
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function Page() {

    // Get target keyword
    const targetKeyword = process.env.TARGET_KEYWORD || 'wallstreetbets';

    // 1. Fetch recent sentiment entries for the SPECIFIC target keyword
    const recentData = await prisma.sentiment.findMany({
        where: {
            is_manipulation: false,
            ticker: { equals: targetKeyword, mode: 'insensitive' }
        },
        orderBy: { post_timestamp: 'desc' },
        take: 50
    });

    // Prepare data for line chart (reverse for chronological order)
    const chartData = recentData.reverse().map((item: any) => ({
        timeLabel: new Date(item.post_timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sentiment: item.sentiment,
        ticker: item.ticker,
    }));

    // 2. Stats for Slop/Bots (filtered for this keyword)
    const baseWhere = { ticker: { equals: targetKeyword, mode: 'insensitive' as const } };
    const totalCount = await prisma.sentiment.count({ where: baseWhere });
    const manipulatedCount = await prisma.sentiment.count({ where: { ...baseWhere, is_manipulation: true } });
    const organicCount = totalCount - manipulatedCount;

    // 4. Fundamental Data for the Target Keyword
    const fundamentalData = await prisma.fundamentalData.findUnique({
        where: { ticker: targetKeyword }
    });

    return (
        <DashboardClient
            recentSentiments={chartData}
            manipulationStats={{ totalCount, manipulatedCount, organicCount }}
            targetKeyword={targetKeyword}
            fundamentalData={fundamentalData}
        />
    );
}
