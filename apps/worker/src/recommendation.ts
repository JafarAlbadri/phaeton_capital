import { logWrapper } from './logger';
import prisma from '@sentiment-crowd/db';

const WEIGHTS = {
  sentiment: 0.25,
  technical: 0.20,
  fundamental: 0.20,
  quant: 0.20,
  insider: 0.10,
  macro: 0.05,
};

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

export async function computeRecommendation(ticker: string): Promise<void> {
  try {
    const [quant, fundamental, tech, macro, insiders] = await Promise.all([
      prisma.quantMetrics.findUnique({ where: { ticker } }),
      prisma.fundamentalData.findUnique({ where: { ticker } }),
      prisma.technicalIndicators.findUnique({ where: { ticker } }),
      prisma.macroIndicators.findUnique({ where: { ticker } }),
      prisma.insiderTrade.findMany({ where: { ticker }, orderBy: { date: 'desc' }, take: 50 }),
    ]);

    // --- Sentiment Score (0-100) ---
    let sentimentScore = 50;
    if (quant?.bayes_posterior != null) {
      // bayes_posterior is in [-1, 1]; map to [0, 100]
      sentimentScore = clamp((quant.bayes_posterior + 1) * 50);
    }

    // --- Technical Score (0-100) ---
    let technicalScore = 50;
    if (tech) {
      let tScore = 50;
      // RSI component (30%)
      if (tech.rsi_14 != null) {
        if (tech.rsi_14 < 30) tScore += 15; // oversold = bullish
        else if (tech.rsi_14 > 70) tScore -= 15; // overbought = bearish
        else tScore += (50 - tech.rsi_14) * 0.3; // mild signal
      }
      // MACD component (30%)
      if (tech.macd_histogram != null) {
        tScore += tech.macd_histogram > 0 ? 15 : -15;
      }
      // Bollinger position (20%)
      if (tech.price_vs_bb != null) {
        tScore -= tech.price_vs_bb * 10; // at upper band = bearish, lower = bullish
      }
      // Moving average stack (20%)
      if (tech.golden_cross === true) tScore += 10;
      if (tech.death_cross === true) tScore -= 10;
      technicalScore = clamp(tScore);
    }

    // --- Fundamental Score (0-100) ---
    let fundamentalScore = 50;
    if (fundamental) {
      let fScore = 50;
      // Target price upside
      if (fundamental.current_price && fundamental.target_price) {
        const upside = (fundamental.target_price - fundamental.current_price) / fundamental.current_price;
        fScore += clamp(upside * 100, -30, 30);
      }
      // Analyst consensus
      const strongBuy = fundamental.analyst_strong_buy || 0;
      const buy = fundamental.analyst_buy || 0;
      const hold = fundamental.analyst_hold || 0;
      const sell = fundamental.analyst_sell || 0;
      const strongSell = fundamental.analyst_strong_sell || 0;
      const totalAnalysts = strongBuy + buy + hold + sell + strongSell;
      if (totalAnalysts > 0) {
        const analystScore = ((strongBuy * 2 + buy * 1 + hold * 0 + sell * -1 + strongSell * -2) / totalAnalysts);
        fScore += analystScore * 10;
      }
      // P/E ratio relative to macro
      if (macro?.spy_pe_ratio && fundamental.pe_ratio) {
        const pePremium = fundamental.pe_ratio / macro.spy_pe_ratio;
        if (pePremium < 0.8) fScore += 10; // undervalued vs market
        else if (pePremium > 1.5) fScore -= 10; // expensive
      }
      fundamentalScore = clamp(fScore);
    }

    // --- Quant Score (0-100) ---
    let quantScore = 50;
    if (quant) {
      let qScore = 50;
      if (quant.hmm_state === 1) qScore += 15; // Bull regime
      else if (quant.hmm_state === 0) qScore -= 15; // Bear regime
      if (quant.kelly_fraction != null) {
        qScore += Math.min(quant.kelly_fraction * 25, 15);
      }
      if (quant.monte_carlo_mean != null && fundamental?.current_price) {
        const mcUpside = (quant.monte_carlo_mean - fundamental.current_price) / fundamental.current_price;
        qScore += clamp(mcUpside * 50, -15, 15);
      }
      if (quant.hurst_exponent != null) {
        // H > 0.6 = strong trend (good signal), H < 0.4 = mean reverting
        if (quant.hurst_exponent > 0.6) qScore += 5;
        else if (quant.hurst_exponent < 0.4) qScore -= 5;
      }
      quantScore = clamp(qScore);
    }

    // --- Insider Score (0-100) ---
    let insiderScore = 50;
    if (insiders && insiders.length > 0) {
      // 90-day window
      const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const recent = insiders.filter(i => i.date >= cutoff);
      if (recent.length > 0) {
        let buyVol = 0;
        let sellVol = 0;
        for (const t of recent) {
          const isBuy = t.transaction?.toLowerCase().includes('buy') || t.transaction?.toLowerCase().includes('purchase');
          const isSell = t.transaction?.toLowerCase().includes('sell') || t.transaction?.toLowerCase().includes('sale');
          if (isBuy) buyVol += t.value;
          if (isSell) sellVol += t.value;
        }
        const total = buyVol + sellVol;
        if (total > 0) {
          const ratio = buyVol / total; // 0 = all sell, 1 = all buy
          insiderScore = clamp(ratio * 100);
        }
      }
    }

    // --- Macro Score (0-100) ---
    let macroScore = 50;
    if (macro) {
      let mScore = 50;
      // VIX: high VIX = bearish macro
      if (macro.vix != null) {
        if (macro.vix > 30) mScore -= 15;
        else if (macro.vix < 15) mScore += 10;
      }
      // Sector momentum
      if (macro.sector_etf_momentum_1m != null) {
        mScore += clamp(macro.sector_etf_momentum_1m * 100, -15, 15);
      }
      // Fear & greed proxy
      if (macro.fear_greed_index != null) {
        mScore += (macro.fear_greed_index - 50) * 0.2;
      }
      macroScore = clamp(mScore);
    }

    // --- Composite Score ---
    const composite = clamp(
      sentimentScore * WEIGHTS.sentiment +
      technicalScore * WEIGHTS.technical +
      fundamentalScore * WEIGHTS.fundamental +
      quantScore * WEIGHTS.quant +
      insiderScore * WEIGHTS.insider +
      macroScore * WEIGHTS.macro
    );

    const signal = signalFromScore(composite);

    // Risk override: if risk is extreme (rating 5), downgrade any BUY to HOLD
    const riskProfile = await prisma.riskProfile.findUnique({ where: { ticker } });
    const riskOverride = riskProfile?.overall_risk_rating === 5 && (signal === 'BUY' || signal === 'STRONG_BUY');
    const finalSignal = riskOverride ? 'HOLD' : signal;

    // Confidence: based on data availability
    let dataSources = 0;
    if (quant) dataSources++;
    if (fundamental) dataSources++;
    if (tech) dataSources++;
    if (macro) dataSources++;
    if (insiders.length > 0) dataSources++;
    const confidence = dataSources / 5;

    await prisma.recommendationScore.upsert({
      where: { ticker },
      update: {
        composite_score: composite,
        signal: finalSignal,
        sentiment_score: sentimentScore,
        technical_score: technicalScore,
        fundamental_score: fundamentalScore,
        quant_score: quantScore,
        insider_score: insiderScore,
        macro_score: macroScore,
        confidence,
        risk_override: riskOverride,
      },
      create: {
        ticker,
        composite_score: composite,
        signal: finalSignal,
        sentiment_score: sentimentScore,
        technical_score: technicalScore,
        fundamental_score: fundamentalScore,
        quant_score: quantScore,
        insider_score: insiderScore,
        macro_score: macroScore,
        confidence,
        risk_override: riskOverride,
      }
    });

    // Record prediction for accuracy tracking
    if (fundamental?.current_price) {
      await prisma.predictionRecord.create({
        data: {
          ticker,
          signal: finalSignal,
          price_at_signal: fundamental.current_price,
          composite_score: composite,
          outcome: 'PENDING',
        }
      });
    }

    // Update pending predictions older than 15 days
    const fifteenDaysAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);
    const pendingPredictions = await prisma.predictionRecord.findMany({
      where: { ticker, outcome: 'PENDING', createdAt: { lte: fifteenDaysAgo } }
    });

    if (pendingPredictions.length > 0 && fundamental?.current_price) {
      for (const pred of pendingPredictions) {
        const currentPrice = fundamental.current_price;
        const priceDelta = (currentPrice - pred.price_at_signal) / pred.price_at_signal;
        let outcome = 'INCORRECT';
        if (
          (pred.signal === 'STRONG_BUY' || pred.signal === 'BUY') && priceDelta > 0.02
          || (pred.signal === 'STRONG_SELL' || pred.signal === 'SELL') && priceDelta < -0.02
          || pred.signal === 'HOLD' && Math.abs(priceDelta) <= 0.05
        ) {
          outcome = 'CORRECT';
        }
        await prisma.predictionRecord.update({
          where: { id: pred.id },
          data: { price_15d_later: currentPrice, outcome }
        });
      }
    }

    logWrapper.info(`Recommendation for ${ticker}: ${finalSignal} (score=${composite.toFixed(1)}, confidence=${(confidence*100).toFixed(0)}%)`);
  } catch (err) {
    logWrapper.error(`Failed to compute recommendation for ${ticker}:`, err);
  }
}
