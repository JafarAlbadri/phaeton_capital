/**
 * Universe scanner — sweeps the TrackedTicker table and enqueues each
 * active ticker for processing. Spaces enqueues out so the worker doesn't
 * get hammered all at once. Updates `lastScanned` after each enqueue.
 */
import { Queue } from 'bullmq';
import prisma from '@sentiment-crowd/db';
import { logWrapper } from './logger';

interface SweepOptions {
    /** Only scan tickers not scanned in the last N hours. 0 = scan all. */
    minAgeHours?: number;
    /** Hard cap on tickers enqueued in one sweep (protects rate limits). */
    maxBatch?: number;
    /** Spacing between enqueues, in ms. */
    enqueueSpacingMs?: number;
}

export async function sweepUniverse(
    queue: Queue,
    opts: SweepOptions = {}
): Promise<{ scanned: number; total: number; skipped: number }> {
    const minAgeHours = opts.minAgeHours ?? 6;
    const maxBatch = opts.maxBatch ?? 50;
    const spacing = opts.enqueueSpacingMs ?? 500;

    const cutoff = minAgeHours > 0
        ? new Date(Date.now() - minAgeHours * 3600_000)
        : null;

    // Stale-first ordering: tickers that haven't been scanned in a while bubble
    // up first. priority desc as a secondary tiebreaker so mega-caps get re-scanned
    // sooner among the stale set.
    const all = await (prisma as any).trackedTicker.findMany({
        where: {
            active: true,
            ...(cutoff ? { OR: [{ lastScanned: null }, { lastScanned: { lt: cutoff } }] } : {}),
        },
        orderBy: [
            { lastScanned: { sort: 'asc', nulls: 'first' } },
            { priority: 'desc' },
        ],
        take: maxBatch,
    });

    if (all.length === 0) {
        logWrapper.info('[scanner] No tickers due for scanning.');
        return { scanned: 0, total: 0, skipped: 0 };
    }

    logWrapper.info(`[scanner] Sweeping ${all.length} tickers (minAge=${minAgeHours}h, maxBatch=${maxBatch})`);

    let enqueued = 0;
    let skipped = 0;
    for (const t of all) {
        // Dedup window: 10 min, same as manual /trigger.
        const jobId = `scan_${t.ticker}_${Math.floor(Date.now() / 600000)}`;
        try {
            const existing = await queue.getJob(jobId);
            if (existing) {
                skipped++;
                continue;
            }
            await queue.add(
                'process',
                { keyword: t.ticker },
                {
                    jobId,
                    attempts: 3,
                    backoff: { type: 'exponential', delay: 5000 },
                    removeOnComplete: true,
                    removeOnFail: 1000,
                }
            );
            await (prisma as any).trackedTicker.update({
                where: { ticker: t.ticker },
                data: { lastScanned: new Date() },
            });
            enqueued++;
            // Stagger enqueues so the queue drains gradually
            if (spacing > 0) await new Promise(r => setTimeout(r, spacing));
        } catch (e) {
            logWrapper.error(`[scanner] Failed to enqueue ${t.ticker}:`, e);
        }
    }

    logWrapper.info(`[scanner] Sweep complete: ${enqueued} enqueued, ${skipped} skipped (already queued)`);
    return { scanned: enqueued, total: all.length, skipped };
}
