import prisma from '@sentiment-crowd/db';
import CalibrationClient from './CalibrationClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function CalibratePage() {
    const posts = await prisma.sentiment.findMany({
        where: { is_manipulation: false },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: {
            id: true,
            ticker: true,
            content: true,
            sentiment: true,
            confidence: true,
            admin_sentiment: true,
            admin_manipulation: true,
            source: true,
            author: true,
            author_karma: true,
            post_timestamp: true,
            ai_model: true,
        },
    });

    const stats = await prisma.sentiment.aggregate({
        _count: { id: true },
        where: { admin_sentiment: { not: null } },
    });

    const totalLabeled = stats._count.id;
    const total = await prisma.sentiment.count();

    return <CalibrationClient posts={posts as any} totalLabeled={totalLabeled} total={total} />;
}
