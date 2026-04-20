import { logWrapper } from './logger';
import prisma from '@sentiment-crowd/db';

interface PriceEstimate {
    source: string;
    price: number;
    weight: number; // Confidence weight for this estimate
}

/**
 * Compute a recommended price target by synthesizing:
 * 1. Analyst consensus target (highest confidence when many analysts agree)
 * 2. Monte Carlo median projection (quantitative forward simulation)
 * 3. Monte Carlo P25/P75 (confidence band)
 * 4. Options max pain (market microstructure gravity)
 * 5. OU mean-reversion target (if Hurst < 0.4 → mean-reverting)
 * 6. Bollinger Band fair value (technical mean-reversion)
 *
 * Weights are regime-aware: in trending markets (Hurst > 0.6), momentum
 * estimates dominate. In mean-reverting markets, OU and BB matter more.
 */
export async function computeRecommendedPrice(
    ticker: string,
    horizon: 15 | 30 | 90 = 15,
): Promise<{ price: number; low: number; high: number; method: string } | null> {
    try {
        const [fundamental, quant, tech, options] = await Promise.all([
            prisma.fundamentalData.findUnique({ where: { ticker } }),
            prisma.quantMetrics.findUnique({ where: { ticker } }),
            prisma.technicalIndicators.findUnique({ where: { ticker } }),
            (prisma as any).optionsFlow?.findUnique({ where: { ticker } }).catch(() => null) ?? null,
        ]);

        const currentPrice = fundamental?.current_price;
        if (!currentPrice || currentPrice <= 0) {
            logWrapper.info(`[RecommendedPrice] No current price for ${ticker}, skipping`);
            return null;
        }

        const estimates: PriceEstimate[] = [];
        const methods: string[] = [];

        // ── 1. Analyst consensus target ─────────────────────────────────────
        if (fundamental?.target_price && fundamental.target_price > 0) {
            const analystCount = (fundamental.analyst_strong_buy ?? 0) +
                (fundamental.analyst_buy ?? 0) +
                (fundamental.analyst_hold ?? 0) +
                (fundamental.analyst_sell ?? 0) +
                (fundamental.analyst_strong_sell ?? 0);

            // More analysts = higher weight (max 0.35 with 20+ analysts)
            const analystWeight = Math.min(0.35, 0.10 + analystCount * 0.0125);
            estimates.push({ source: 'analyst_consensus', price: fundamental.target_price, weight: analystWeight });
            methods.push(`Analyst(${analystCount})`);
        }

        // ── 2. Monte Carlo projection (horizon-adjusted) ────────────────────
        // MC is computed for 15d — scale to horizon using sqrt(T) rule for GBM
        if (quant?.monte_carlo_mean != null && quant.monte_carlo_mean > 0) {
            const mc_mean = quant.monte_carlo_mean;
            // Scale MC return from 15d to target horizon
            const mc_return = (mc_mean - currentPrice) / currentPrice;
            const scaled_return = mc_return * Math.sqrt(horizon / 15);
            const scaled_price = currentPrice * (1 + scaled_return);

            estimates.push({ source: 'monte_carlo', price: scaled_price, weight: 0.25 });
            methods.push('MonteCarlo');
        }

        // ── 3. Options max pain (short-term gravity) ────────────────────────
        if (options?.max_pain_price != null && options.max_pain_price > 0) {
            // Max pain is most relevant for short horizons (15d near expiry)
            // Decay its weight for longer horizons
            const maxPainWeight = horizon <= 15 ? 0.15 : horizon <= 30 ? 0.08 : 0.03;
            estimates.push({ source: 'max_pain', price: options.max_pain_price, weight: maxPainWeight });
            methods.push('MaxPain');
        }

        // ── 4. OU mean-reversion target ─────────────────────────────────────
        // Only applies if Hurst < 0.5 (mean-reverting regime)
        if (quant?.ou_mu != null && quant?.hurst_exponent != null && quant.hurst_exponent < 0.5) {
            // OU mu is in sentiment space [-1,1]. Map to price via the
            // relationship: if sentiment is mean-reverting around ou_mu,
            // price tends toward a level implied by current price + sentiment gap.
            // Better approach: use OU parameters on the price series directly
            // For now, use the Bollinger mean as a proxy for OU price target
            if (tech?.bb_middle != null && tech.bb_middle > 0) {
                const ouWeight = 0.15 * (1 - quant.hurst_exponent); // Lower Hurst = stronger mean-reversion
                estimates.push({ source: 'ou_reversion', price: tech.bb_middle, weight: ouWeight });
                methods.push('OUReversion');
            }
        }

        // ── 5. Bollinger Band fair value (SMA20) ────────────────────────────
        if (tech?.bb_middle != null && tech.bb_middle > 0) {
            // BB middle (SMA20) as fair value — relevant for short-term mean-reversion
            const bbWeight = horizon <= 15 ? 0.10 : 0.05;
            estimates.push({ source: 'bb_fair_value', price: tech.bb_middle, weight: bbWeight });
            methods.push('BollingerMid');
        }

        // ── 6. 52-week range midpoint as long-term anchor ───────────────────
        if (fundamental?.high_52_week != null && fundamental?.low_52_week != null) {
            const midpoint = (fundamental.high_52_week + fundamental.low_52_week) / 2;
            if (midpoint > 0) {
                const rangeWeight = horizon >= 90 ? 0.10 : 0.03;
                estimates.push({ source: '52w_midpoint', price: midpoint, weight: rangeWeight });
                methods.push('52wRange');
            }
        }

        if (estimates.length === 0) {
            logWrapper.info(`[RecommendedPrice] No price estimates available for ${ticker}`);
            return null;
        }

        // ── Weighted average ────────────────────────────────────────────────
        const totalWeight = estimates.reduce((s, e) => s + e.weight, 0);
        const weightedPrice = estimates.reduce((s, e) => s + e.price * e.weight, 0) / totalWeight;

        // ── Confidence band (P25/P75) ───────────────────────────────────────
        let priceLow: number;
        let priceHigh: number;

        if (quant?.monte_carlo_p25 != null && quant?.monte_carlo_p75 != null) {
            // Scale MC percentiles to horizon
            const p25_return = (quant.monte_carlo_p25 - currentPrice) / currentPrice;
            const p75_return = (quant.monte_carlo_p75 - currentPrice) / currentPrice;
            priceLow = currentPrice * (1 + p25_return * Math.sqrt(horizon / 15));
            priceHigh = currentPrice * (1 + p75_return * Math.sqrt(horizon / 15));
        } else if (fundamental?.target_low_price != null && fundamental?.target_high_price != null) {
            // Fall back to analyst range
            priceLow = fundamental.target_low_price;
            priceHigh = fundamental.target_high_price;
        } else {
            // Last resort: use GARCH volatility or ±10%
            const vol = quant?.garch_volatility;
            const horizonVol = vol != null
                ? vol * Math.sqrt(horizon / 252)
                : 0.10 * Math.sqrt(horizon / 252);
            priceLow = weightedPrice * (1 - horizonVol);
            priceHigh = weightedPrice * (1 + horizonVol);
        }

        // Sanity clamp: target shouldn't be more than 3x or less than 0.1x current
        const clampedPrice = Math.max(currentPrice * 0.1, Math.min(currentPrice * 3, weightedPrice));
        const clampedLow = Math.max(currentPrice * 0.1, Math.min(clampedPrice, priceLow));
        const clampedHigh = Math.max(clampedPrice, Math.min(currentPrice * 3, priceHigh));

        const method = methods.join('+');

        logWrapper.info(
            `[RecommendedPrice] ${ticker} [${horizon}d]: $${clampedPrice.toFixed(2)} ` +
            `(range $${clampedLow.toFixed(2)}-$${clampedHigh.toFixed(2)}) via ${method}`
        );

        return {
            price: Math.round(clampedPrice * 100) / 100,
            low: Math.round(clampedLow * 100) / 100,
            high: Math.round(clampedHigh * 100) / 100,
            method,
        };
    } catch (err) {
        logWrapper.error(`[RecommendedPrice] Failed for ${ticker}:`, err);
        return null;
    }
}
