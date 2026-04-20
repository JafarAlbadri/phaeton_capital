import prisma from '@sentiment-crowd/db';

interface PipelineData {
    compositeScore?: number | null;
    signal?: string | null;
    hmmState?: number | null;       // 1 = bull, 0 = bear, -1 = neutral (from Python HMM)
    prevHmmState?: number | null;
    sentimentDelta?: number | null; // recent velocity (6h)
}

/**
 * Evaluate all active alerts for a ticker and fire any that trigger.
 * Writes fired events to AlertFired table.
 */
export async function evaluateAlerts(ticker: string, data: PipelineData): Promise<void> {
    try {
        const alerts = await prisma.alert.findMany({
            where: { ticker, active: true },
        });

        if (!alerts || alerts.length === 0) return;

        const now = new Date();

        for (const alert of alerts) {
            // Cooldown check
            if (alert.lastFired) {
                const minutesSinceFired = (now.getTime() - new Date(alert.lastFired).getTime()) / 60_000;
                if (minutesSinceFired < alert.cooldownMin) continue;
            }

            let fired = false;
            let reason = '';

            switch (alert.type) {
                case 'SCORE_THRESHOLD': {
                    if (data.compositeScore == null || alert.threshold == null) break;
                    const above = alert.direction === 'ABOVE';
                    if (above && data.compositeScore >= alert.threshold) {
                        fired = true;
                        reason = `Score ${data.compositeScore.toFixed(1)} crossed ABOVE ${alert.threshold}`;
                    } else if (!above && data.compositeScore <= alert.threshold) {
                        fired = true;
                        reason = `Score ${data.compositeScore.toFixed(1)} crossed BELOW ${alert.threshold}`;
                    }
                    break;
                }
                case 'SCORE_CROSS': {
                    if (data.compositeScore == null) break;
                    const prevScore = alert.lastScore ?? null;
                    // Only fire if we have a previous score to compare against
                    if (prevScore != null) {
                        if (data.compositeScore > 50 && prevScore <= 50) {
                            fired = true;
                            reason = `Score crossed 50 boundary upward: ${prevScore.toFixed(1)} → ${data.compositeScore.toFixed(1)}`;
                        } else if (data.compositeScore < 50 && prevScore >= 50) {
                            fired = true;
                            reason = `Score crossed 50 boundary downward: ${prevScore.toFixed(1)} → ${data.compositeScore.toFixed(1)}`;
                        }
                    }
                    // Always update lastScore so the next cycle has a reference point
                    await prisma.alert.update({
                        where: { id: alert.id },
                        data: { lastScore: data.compositeScore },
                    });
                    break;
                }
                case 'REGIME_CHANGE': {
                    if (data.hmmState == null || data.prevHmmState == null) break;
                    if (data.hmmState !== data.prevHmmState) {
                        const labels: Record<number, string> = { 0: 'Bear', 1: 'Bull', [-1]: 'Neutral' };
                        fired = true;
                        reason = `HMM regime changed: ${labels[data.prevHmmState] ?? data.prevHmmState} → ${labels[data.hmmState] ?? data.hmmState}`;
                    }
                    break;
                }
                case 'SENTIMENT_SPIKE': {
                    if (data.sentimentDelta == null) break;
                    if (Math.abs(data.sentimentDelta) > 0.3) {
                        fired = true;
                        reason = `Sentiment spike detected: Δ${data.sentimentDelta.toFixed(3)} in 6h`;
                    }
                    break;
                }
                case 'VELOCITY_SPIKE': {
                    if (data.sentimentDelta == null || alert.threshold == null) break;
                    if (Math.abs(data.sentimentDelta) >= alert.threshold) {
                        fired = true;
                        reason = `Velocity spike: |Δ${data.sentimentDelta.toFixed(3)}| >= threshold ${alert.threshold}`;
                    }
                    break;
                }
                case 'EARNINGS_APPROACHING': {
                    // Requires next_earnings_date on FundamentalData
                    const fund = await prisma.fundamentalData.findUnique({
                        where: { ticker },
                        select: { next_earnings_date: true },
                    });
                    if (!fund?.next_earnings_date) break;
                    const daysUntil = Math.ceil(
                        (new Date(fund.next_earnings_date).getTime() - now.getTime()) / 86_400_000
                    );
                    const threshold = alert.threshold ?? 7; // default: fire within 7 days
                    if (daysUntil >= 0 && daysUntil <= threshold) {
                        fired = true;
                        reason = `Earnings in ${daysUntil} day${daysUntil !== 1 ? 's' : ''} (${new Date(fund.next_earnings_date).toLocaleDateString()})`;
                    }
                    break;
                }
            }

            if (fired) {
                const payload = {
                    ticker, signal: data.signal, compositeScore: data.compositeScore,
                    reason, firedAt: now.toISOString(),
                };

                await prisma.alertFired.create({
                    data: { alertId: alert.id, payload },
                });

                await prisma.alert.update({
                    where: { id: alert.id },
                    data: { lastFired: now },
                });

                console.log(`[alert] FIRED [${alert.type}] for ${ticker}: ${reason}`);

                // Webhook dispatch (fire-and-forget)
                if ((alert as any).webhook_url) {
                    fetch((alert as any).webhook_url, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload),
                        signal: AbortSignal.timeout(5_000),
                    }).catch(e => console.warn(`[alert] webhook failed for ${alert.id}:`, e));
                }
            }
        }
    } catch (err) {
        console.error('[alerts] evaluator error:', err);
    }
}
