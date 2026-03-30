import { logWrapper } from './logger';
import { generateNarrative } from './ai';
import prisma from '@sentiment-crowd/db';

type Weights = {
    sentiment: number; technical: number; fundamental: number;
    quant: number; insider: number; macro: number;
};

const WEIGHTS_NEUTRAL: Weights = { sentiment:0.25, technical:0.20, fundamental:0.20, quant:0.20, insider:0.10, macro:0.05 };
const WEIGHTS_BULL: Weights    = { sentiment:0.25, technical:0.25, fundamental:0.15, quant:0.20, insider:0.10, macro:0.05 };
const WEIGHTS_BEAR: Weights    = { sentiment:0.20, technical:0.15, fundamental:0.25, quant:0.20, insider:0.10, macro:0.10 };
const WEIGHTS_CRISIS: Weights  = { sentiment:0.15, technical:0.15, fundamental:0.20, quant:0.15, insider:0.10, macro:0.25 };

const weightCache = new Map<string, { weights: Weights; ts: number }>();

function clamp(v: number, min = 0, max = 100): number {
    return Math.max(min, Math.min(max, v));
}

function signalFromScore(score: number): string {
    if (score > 65) return 'STRONG_BUY';
    if (score > 55) return 'BUY';
    if (score > 45) return 'HOLD';
    if (score > 35) return 'SELL';
    return 'STRONG_SELL';
}

function selectRegimeWeights(hmmState: number | null | undefined, vix: number | null | undefined): Weights {
    if (vix != null && vix > 30) return WEIGHTS_CRISIS;
    if (hmmState === 2) return WEIGHTS_BULL;
    if (hmmState === 0) return WEIGHTS_BEAR;
    return WEIGHTS_NEUTRAL;
}

async function computeOptimizedWeights(ticker: string, base: Weights): Promise<Weights> {
    const cached = weightCache.get(ticker);
    if (cached && Date.now() - cached.ts < 15 * 60 * 1000) return cached.weights;

    try {
        const resolved = await prisma.predictionRecord.findMany({
            where: { ticker, outcome: { in: ['CORRECT', 'INCORRECT'] } },
            orderBy: { createdAt: 'desc' },
            take: 100,
            select: { outcome: true, composite_score: true },
        });

        if (resolved.length < 10) {
            weightCache.set(ticker, { weights: base, ts: Date.now() });
            return base;
        }

        const correctRate = resolved.filter(r => r.outcome === 'CORRECT').length / resolved.length;
        const adjusted = { ...base };
        const MAX_NUDGE = 0.05;

        if (correctRate > 0.60) {
            const boost = Math.min((correctRate - 0.5) * 0.1, MAX_NUDGE);
            adjusted.quant = Math.min(0.35, adjusted.quant + boost);
            adjusted.macro  = Math.max(0.02, adjusted.macro  - boost);
        } else if (correctRate < 0.40) {
            const boost = Math.min((0.5 - correctRate) * 0.1, MAX_NUDGE);
            adjusted.fundamental = Math.min(0.35, adjusted.fundamental + boost);
            adjusted.sentiment   = Math.max(0.10, adjusted.sentiment   - boost);
        }

        const total = Object.values(adjusted).reduce((a, b) => a + b, 0);
        (Object.keys(adjusted) as (keyof Weights)[]).forEach(k => { adjusted[k] /= total; });

        logWrapper.info(`Weight optimisation for ${ticker}: accuracy=${(correctRate*100).toFixed(0)}%`);
        weightCache.set(ticker, { weights: adjusted, ts: Date.now() });
        return adjusted;
    } catch {
        return base;
    }
}

export async function computeRecommendation(ticker: string, horizon: 15 | 30 | 90 = 15): Promise<void> {
    try {
        // Horizon-specific sentiment lookback: 15d=7days, 30d=30days, 90d=90days
        const sentimentLookbackDays = horizon === 15 ? 7 : horizon === 30 ? 30 : 90;
        const sentimentCutoff = new Date(Date.now() - sentimentLookbackDays * 24 * 60 * 60 * 1000);

        const [quant, fundamental, tech, macro, insiders, riskProfile, recentSentiments] = await Promise.all([
            prisma.quantMetrics.findUnique({ where: { ticker } }),
            prisma.fundamentalData.findUnique({ where: { ticker } }),
            prisma.technicalIndicators.findUnique({ where: { ticker } }),
            prisma.macroIndicators.findUnique({ where: { ticker } }),
            prisma.insiderTrade.findMany({ where: { ticker }, orderBy: { date: 'desc' }, take: 50 }),
            prisma.riskProfile.findUnique({ where: { ticker } }),
            prisma.sentiment.findMany({
                where: { ticker, is_manipulation: false, post_timestamp: { gte: sentimentCutoff } },
                select: { sentiment: true, confidence: true },
                take: 500,
            }),
        ]);

        // Options flow (optional — may not exist yet)
        let optionsFlow: { put_call_ratio: number | null } | null = null;
        try {
            optionsFlow = await (prisma as any).optionsFlow.findUnique({ where: { ticker } });
        } catch { /* model not yet migrated */ }

        const baseWeights = selectRegimeWeights(quant?.hmm_state, macro?.vix);
        const WEIGHTS = await computeOptimizedWeights(ticker, baseWeights);

        // --- Sentiment Score — window-weighted by horizon ---
        let sentimentScore = 50;
        if (recentSentiments.length > 0) {
            // Weighted mean of recent sentiment (confidence-weighted)
            let wSum = 0, wTotal = 0;
            for (const s of recentSentiments) {
                const w = s.confidence || 0.1;
                wSum += s.sentiment * w;
                wTotal += w;
            }
            if (wTotal > 0) sentimentScore = clamp(((wSum / wTotal) + 1) * 50);
        } else if (quant?.bayes_posterior != null) {
            // Fall back to Bayesian posterior if no raw sentiment in window
            sentimentScore = clamp((quant.bayes_posterior + 1) * 50);
        }

        // Options flow nudge on sentiment
        if (optionsFlow?.put_call_ratio != null) {
            const pcr = optionsFlow.put_call_ratio;
            if (pcr < 0.7) sentimentScore = clamp(sentimentScore + 5);
            else if (pcr > 1.3) sentimentScore = clamp(sentimentScore - 5);
        }

        // Google Trends nudge on sentiment
        const trendsScore = (quant as any)?.trends_score as number | null | undefined;
        if (trendsScore != null) {
            if (trendsScore > 70) sentimentScore = clamp(sentimentScore + 5);
            else if (trendsScore < 30) sentimentScore = clamp(sentimentScore - 5);
        }

        // --- Technical Score ---
        let technicalScore = 50;
        if (tech) {
            let tScore = 50;
            if (tech.rsi_14 != null) {
                if (tech.rsi_14 < 30) tScore += 15;
                else if (tech.rsi_14 > 70) tScore -= 15;
                else tScore += (50 - tech.rsi_14) * 0.3;
            }
            if (tech.macd_histogram != null) tScore += tech.macd_histogram > 0 ? 15 : -15;
            if (tech.price_vs_bb != null) tScore -= tech.price_vs_bb * 10;
            if (tech.golden_cross === true) tScore += 10;
            if (tech.death_cross === true) tScore -= 10;
            technicalScore = clamp(tScore);
        }

        // --- Fundamental Score ---
        let fundamentalScore = 50;
        if (fundamental) {
            let fScore = 50;
            if (fundamental.current_price && fundamental.target_price) {
                const upside = (fundamental.target_price - fundamental.current_price) / fundamental.current_price;
                fScore += clamp(upside * 100, -30, 30);
            }
            const sb = fundamental.analyst_strong_buy || 0;
            const b  = fundamental.analyst_buy || 0;
            const h  = fundamental.analyst_hold || 0;
            const sl = fundamental.analyst_sell || 0;
            const ss = fundamental.analyst_strong_sell || 0;
            const tot = sb + b + h + sl + ss;
            if (tot > 0) fScore += ((sb*2 + b - sl - ss*2) / tot) * 10;
            if (macro?.spy_pe_ratio && fundamental.pe_ratio) {
                const pePrem = fundamental.pe_ratio / macro.spy_pe_ratio;
                if (pePrem < 0.8) fScore += 10;
                else if (pePrem > 1.5) fScore -= 10;
            }
            fundamentalScore = clamp(fScore);
        }

        // --- Quant Score ---
        let quantScore = 50;
        if (quant) {
            let qScore = 50;
            if (quant.hmm_state === 2) qScore += 15;
            else if (quant.hmm_state === 0) qScore -= 15;
            if (quant.kelly_fraction != null) qScore += Math.min(quant.kelly_fraction * 25, 15);
            if (quant.monte_carlo_mean != null && fundamental?.current_price) {
                const mcUp = (quant.monte_carlo_mean - fundamental.current_price) / fundamental.current_price;
                qScore += clamp(mcUp * 50, -15, 15);
            }
            if (quant.hurst_exponent != null) {
                if (quant.hurst_exponent > 0.6) qScore += 5;
                else if (quant.hurst_exponent < 0.4) qScore -= 5;
            }
            quantScore = clamp(qScore);
        }

        // --- Insider Score ---
        let insiderScore = 50;
        let insiderNetBuy: boolean | null = null;
        if (insiders && insiders.length > 0) {
            const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
            const recent = insiders.filter(i => i.date >= cutoff);
            if (recent.length > 0) {
                let buyVol = 0, sellVol = 0;
                for (const t of recent) {
                    const isBuy = t.transaction?.toLowerCase().includes('buy') || t.transaction?.toLowerCase().includes('purchase');
                    const isSell = t.transaction?.toLowerCase().includes('sell') || t.transaction?.toLowerCase().includes('sale');
                    if (isBuy) buyVol += t.value;
                    if (isSell) sellVol += t.value;
                }
                const total = buyVol + sellVol;
                if (total > 0) {
                    insiderScore = clamp((buyVol / total) * 100);
                    insiderNetBuy = buyVol > sellVol;
                }
            }
        }

        // --- Macro Score ---
        let macroScore = 50;
        if (macro) {
            let mScore = 50;
            if (macro.vix != null) {
                if (macro.vix > 30) mScore -= 15;
                else if (macro.vix < 15) mScore += 10;
            }
            if (macro.sector_etf_momentum_1m != null) mScore += clamp(macro.sector_etf_momentum_1m * 100, -15, 15);
            if (macro.fear_greed_index != null) mScore += (macro.fear_greed_index - 50) * 0.2;
            macroScore = clamp(mScore);
        }

        // --- Composite ---
        const composite = clamp(
            sentimentScore   * WEIGHTS.sentiment   +
            technicalScore   * WEIGHTS.technical   +
            fundamentalScore * WEIGHTS.fundamental +
            quantScore       * WEIGHTS.quant       +
            insiderScore     * WEIGHTS.insider     +
            macroScore       * WEIGHTS.macro
        );

        const signal = signalFromScore(composite);
        const riskOverride = riskProfile?.overall_risk_rating === 5 && (signal === 'BUY' || signal === 'STRONG_BUY');
        const finalSignal = riskOverride ? 'HOLD' : signal;

        // Confidence: data coverage × sentiment freshness
        let dataSources = 0;
        if (quant) dataSources++;
        if (fundamental) dataSources++;
        if (tech) dataSources++;
        if (macro) dataSources++;
        if (insiders.length > 0) dataSources++;
        const dataSourceScore = dataSources / 5;
        // Penalise if no sentiment data in the horizon window
        const sentimentFreshness = recentSentiments.length > 10 ? 1.0
            : recentSentiments.length > 0 ? 0.5 + (recentSentiments.length / 20) : 0.3;
        const confidence = dataSourceScore * sentimentFreshness;

        // Adjust Kelly lookback and prediction resolution based on horizon
        const resolutionDays = horizon;

        await (prisma.recommendationScore as any).upsert({
            where: { ticker_horizon: { ticker, horizon } },
            update: {
                composite_score: composite, signal: finalSignal,
                sentiment_score: sentimentScore, technical_score: technicalScore,
                fundamental_score: fundamentalScore, quant_score: quantScore,
                insider_score: insiderScore, macro_score: macroScore,
                confidence, risk_override: riskOverride,
            },
            create: {
                ticker, horizon, composite_score: composite, signal: finalSignal,
                sentiment_score: sentimentScore, technical_score: technicalScore,
                fundamental_score: fundamentalScore, quant_score: quantScore,
                insider_score: insiderScore, macro_score: macroScore,
                confidence, risk_override: riskOverride,
            }
        });

        if (fundamental?.current_price && horizon === 15) {
            await prisma.predictionRecord.create({
                data: { ticker, signal: finalSignal, price_at_signal: fundamental.current_price, composite_score: composite, outcome: 'PENDING', horizon }
            });
        }

        // Resolve pending predictions older than 15 days
        const resolutionMs = resolutionDays * 24 * 60 * 60 * 1000;
        const resolutionCutoff = new Date(Date.now() - resolutionMs);
        const pending = await prisma.predictionRecord.findMany({
            where: { ticker, outcome: 'PENDING', horizon, createdAt: { lte: resolutionCutoff } }
        });
        if (pending.length > 0 && fundamental?.current_price) {
            await prisma.$transaction(pending.map(pred => {
                const delta = (fundamental.current_price! - pred.price_at_signal) / pred.price_at_signal;
                const correct =
                    ((pred.signal === 'STRONG_BUY' || pred.signal === 'BUY') && delta > 0.02) ||
                    ((pred.signal === 'STRONG_SELL' || pred.signal === 'SELL') && delta < -0.02) ||
                    (pred.signal === 'HOLD' && Math.abs(delta) <= 0.05);
                return prisma.predictionRecord.update({
                    where: { id: pred.id },
                    data: { price_15d_later: fundamental.current_price, outcome: correct ? 'CORRECT' : 'INCORRECT' }
                });
            }));
        }

        logWrapper.info(`Recommendation for ${ticker} [${horizon}d]: ${finalSignal} (score=${composite.toFixed(1)}, confidence=${(confidence*100).toFixed(0)}%, regime=${macro?.vix != null && macro.vix > 30 ? 'CRISIS' : quant?.hmm_state === 2 ? 'BULL' : quant?.hmm_state === 0 ? 'BEAR' : 'NEUTRAL'})`);

        // Generate narrative async — non-blocking (only for 15d horizon)
        if (horizon === 15) {
            generateNarrative({
                ticker, signal: finalSignal, composite_score: composite, confidence,
                sentiment_score: sentimentScore, technical_score: technicalScore,
                fundamental_score: fundamentalScore, quant_score: quantScore,
                macro_score: macroScore, insider_score: insiderScore,
                rsi: tech?.rsi_14, macd_histogram: tech?.macd_histogram,
                bayes_posterior: quant?.bayes_posterior, vix: macro?.vix,
                hurst: quant?.hurst_exponent, pe_ratio: fundamental?.pe_ratio,
                target_price: fundamental?.target_price, current_price: fundamental?.current_price,
                hmm_state: quant?.hmm_state, insider_net_buy: insiderNetBuy,
                risk_rating: riskProfile?.overall_risk_rating,
                put_call_ratio: optionsFlow?.put_call_ratio ?? null,
            }).then(narrative => {
                if (narrative) {
                    (prisma as any).recommendationScore.update({
                        where: { ticker_horizon: { ticker, horizon } },
                        data: { narrative },
                    }).catch(() => {});
                }
            }).catch(() => {});
        }

        // Compute regional sentiment divergence
        try {
            const regions = ['US', 'AU', 'UK', 'EU'];
            const regionData = await Promise.all(
                regions.map(region =>
                    (prisma.sentiment.aggregate as any)({
                        where: { ticker, region },
                        _avg: { sentiment: true },
                        _count: { id: true },
                    }).then((r: any) => ({ region, mean: r._avg?.sentiment ?? 0, count: r._count?.id ?? 0 }))
                )
            );
            const validRegions = regionData.filter(r => r.count > 0);
            if (validRegions.length >= 2) {
                const means = validRegions.map(r => r.mean);
                const divergence = Math.max(...means) - Math.min(...means);
                await prisma.$transaction(
                    validRegions.map(r =>
                        (prisma as any).regionalSentiment.upsert({
                            where: { ticker_region: { ticker, region: r.region } },
                            update: { mean_sentiment: r.mean, count: r.count },
                            create: { ticker, region: r.region, mean_sentiment: r.mean, count: r.count },
                        })
                    )
                );
                if (divergence > 0.3) {
                    logWrapper.info(`Regional divergence for ${ticker}: ${divergence.toFixed(2)} (${validRegions.map(r => `${r.region}=${r.mean.toFixed(2)}`).join(', ')})`);
                }
            }
        } catch (_e) { /* sparse data — silently skip */ }

    } catch (err) {
        logWrapper.error(`Failed to compute recommendation for ${ticker}:`, err);
    }
}
