import prisma from '@phaeton/db';
import { logWrapper } from './logger';

export async function resolutionSweep(reResolveAll = false) {
    logWrapper.info(`Starting resolution sweep... (reResolveAll: ${reResolveAll})`);
    try {
        const outcomesToSweep = reResolveAll 
            ? ['PENDING', 'CORRECT', 'INCORRECT'] 
            : ['PENDING'];

        const pending = await prisma.predictionRecord.findMany({
            where: { outcome: { in: outcomesToSweep } }
        });

        const pythonUrl = process.env.PYTHON_WORKER_URL || 'http://localhost:8000';
        let resolvedCount = 0;
        let flippedCount = 0;

        for (const pred of pending) {
            // A prediction resolves after `horizon` days
            const resolutionMs = pred.horizon * 24 * 60 * 60 * 1000;
            const resolutionTime = pred.createdAt.getTime() + resolutionMs;
            
            if (Date.now() < resolutionTime) {
                continue; // Not yet mature
            }

            const targetDate = new Date(resolutionTime);
            targetDate.setUTCHours(0, 0, 0, 0);

            // 1. Try to find local PriceSnapshot for this ticker/date (or the closest available date AFTER targetDate up to +3 days, for weekends/holidays)
            let snapshot = await prisma.priceSnapshot.findFirst({
                where: {
                    ticker: pred.ticker,
                    date: {
                        gte: targetDate,
                        lte: new Date(targetDate.getTime() + 3 * 24 * 60 * 60 * 1000)
                    }
                },
                orderBy: { date: 'asc' }
            });

            // 2. If not found locally, fetch history from Python worker and backfill
            if (!snapshot) {
                try {
                    // Calculate days needed to reach createdAt + horizon + 10 days margin
                    const ageDays = Math.ceil((Date.now() - pred.createdAt.getTime()) / 86400000);
                    const daysNeeded = Math.min(ageDays + pred.horizon + 10, 730);

                    const res = await fetch(`${pythonUrl}/price-history/${pred.ticker}?days=${daysNeeded}`, { signal: AbortSignal.timeout(15_000) });
                    if (res.ok) {
                        const history = await res.json() as {date: string, close: number}[];
                        // Bulk upsert the fetched history to build up the database
                        if (history && Array.isArray(history)) {
                            const today = new Date();
                            today.setUTCHours(0, 0, 0, 0);
                            
                            // Note: We use a loop of upserts instead of createMany to avoid conflicts on overlapping history
                            for (const point of history) {
                                const pDate = new Date(point.date);
                                pDate.setUTCHours(0, 0, 0, 0);
                                if (pDate <= today) {
                                    await prisma.priceSnapshot.upsert({
                                        where: { ticker_date: { ticker: pred.ticker, date: pDate } },
                                        update: { close: point.close },
                                        create: { ticker: pred.ticker, date: pDate, close: point.close }
                                    });
                                }
                            }
                        }
                        
                        // Try querying again after backfill
                        snapshot = await prisma.priceSnapshot.findFirst({
                            where: {
                                ticker: pred.ticker,
                                date: {
                                    gte: targetDate,
                                    lte: new Date(targetDate.getTime() + 3 * 24 * 60 * 60 * 1000)
                                }
                            },
                            orderBy: { date: 'asc' }
                        });
                    }
                } catch (e) {
                    logWrapper.warn(`Failed to backfill history for ${pred.ticker}:`, e);
                }
            }

            // 3. Resolve if we have a valid resolution price
            if (snapshot) {
                const resolutionPrice = snapshot.close;
                const delta = (resolutionPrice - pred.price_at_signal) / pred.price_at_signal;
                
                const moveThreshold = 0.02 * Math.sqrt(pred.horizon / 15);
                const correct =
                    ((pred.signal === 'STRONG_BUY' || pred.signal === 'BUY') && delta > moveThreshold) ||
                    ((pred.signal === 'STRONG_SELL' || pred.signal === 'SELL') && delta < -moveThreshold) ||
                    (pred.signal === 'HOLD' && Math.abs(delta) <= moveThreshold);
                
                const newOutcome = correct ? 'CORRECT' : 'INCORRECT';

                if (pred.outcome !== newOutcome) {
                    flippedCount++;
                }

                await prisma.predictionRecord.update({
                    where: { id: pred.id },
                    data: {
                        price_at_resolution: resolutionPrice,
                        outcome: newOutcome
                    }
                });
                resolvedCount++;
            } else {
                // Better to have no label than a wrong one if snapshot still missing
                if (pred.outcome !== 'PENDING') {
                    await prisma.predictionRecord.update({
                        where: { id: pred.id },
                        data: { outcome: 'PENDING', price_at_resolution: null }
                    });
                    flippedCount++;
                }
            }
        }
        logWrapper.info(`Resolution sweep completed: resolved ${resolvedCount} predictions. Flipped ${flippedCount} labels.`);
    } catch (e) {
        logWrapper.error('Resolution sweep failed:', e);
    }
}
