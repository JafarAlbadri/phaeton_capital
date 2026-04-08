import prisma from '@sentiment-crowd/db';

export interface VelocityResult {
    velocity1h: number;
    velocity6h: number;
    velocity24h: number;
    accel6h: number;
    accel24h: number;
}

/**
 * Compute sentiment velocity (1h / 6h / 24h) and acceleration (6h / 24h)
 * from the Sentiment table, then upsert into SentimentVelocity.
 * Returns the computed values so callers can use them (e.g. for alert evaluation).
 */
export async function computeVelocity(ticker: string): Promise<VelocityResult | null> {
    try {
        const now = new Date();
        const ago = (h: number) => new Date(now.getTime() - h * 3600_000);

        const avgSentiment = async (from: Date, to: Date): Promise<number | null> => {
            const rows = await prisma.sentiment.findMany({
                where: { ticker, post_timestamp: { gte: from, lt: to } },
                select: { sentiment: true, confidence: true, post_timestamp: true },
            });
            if (rows.length === 0) return null;
            // Time-decayed weighted mean (half-life 6h for velocity windows)
            const halfLifeMs = 6 * 3600_000;
            const lambda = Math.LN2 / halfLifeMs;
            const toMs = to.getTime();
            let wSum = 0, wTotal = 0;
            for (const r of rows) {
                const ageMs = toMs - r.post_timestamp.getTime();
                const w = (r.confidence || 0.1) * Math.exp(-lambda * ageMs);
                wSum += r.sentiment * w;
                wTotal += w;
            }
            return wTotal > 0 ? wSum / wTotal : null;
        };

        const [s0_1, s1_2, s0_6, s6_12, s0_24, s24_48] = await Promise.all([
            avgSentiment(ago(1),  now),
            avgSentiment(ago(2),  ago(1)),
            avgSentiment(ago(6),  now),
            avgSentiment(ago(12), ago(6)),
            avgSentiment(ago(24), now),
            avgSentiment(ago(48), ago(24)),
        ]);

        if (s0_1 == null && s0_6 == null && s0_24 == null) return null;

        const velocity1h  = s0_1  != null && s1_2  != null ? s0_1  - s1_2  : 0;
        const velocity6h  = s0_6  != null && s6_12 != null ? s0_6  - s6_12 : 0;
        const velocity24h = s0_24 != null && s24_48 != null ? s0_24 - s24_48 : 0;

        // Acceleration: change in velocity vs previous recorded window
        const prev = await prisma.sentimentVelocity.findFirst({
            where: { ticker },
            orderBy: { computedAt: 'desc' },
            select: { velocity6h: true, velocity24h: true },
        });
        const accel6h  = prev ? velocity6h  - (prev.velocity6h  ?? 0) : 0;
        const accel24h = prev ? velocity24h - (prev.velocity24h ?? 0) : 0;

        await prisma.sentimentVelocity.create({
            data: { ticker, velocity1h, velocity6h, velocity24h, accel6h, accel24h },
        });

        // Keep only last 48 records per ticker to limit table growth
        const old = await prisma.sentimentVelocity.findMany({
            where: { ticker }, orderBy: { computedAt: 'desc' }, select: { id: true }, skip: 48,
        });
        if (old.length > 0) {
            await prisma.sentimentVelocity.deleteMany({
                where: { id: { in: old.map(r => r.id) } },
            });
        }

        console.log(`[velocity] ${ticker} vel1h=${velocity1h.toFixed(3)} vel6h=${velocity6h.toFixed(3)} accel6h=${accel6h.toFixed(3)}`);
        return { velocity1h, velocity6h, velocity24h, accel6h, accel24h };
    } catch (err) {
        console.error('[velocity] error:', err);
        return null;
    }
}
