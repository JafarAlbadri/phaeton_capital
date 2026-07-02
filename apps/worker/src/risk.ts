import { logWrapper } from './logger';
import prisma from '@phaeton/db';

function getRiskRating(maxDrawdown: number | null, var95: number | null, liquidity: number | null, eventRisk: boolean): number {
  let score = 0;
  // Drawdown thresholds calibrated for equities (2y window):
  // <-50% = extreme, <-35% = high — normal stocks draw down 20-30%
  if (maxDrawdown != null) {
    if (maxDrawdown < -0.50) score += 2;
    else if (maxDrawdown < -0.35) score += 1;
  }
  // VaR 95 (15-day): <-15% extreme, <-10% elevated
  if (var95 != null) {
    if (var95 < -0.15) score += 2;
    else if (var95 < -0.10) score += 1;
  }
  if (liquidity != null && liquidity < 0.001) score += 1;
  if (eventRisk) score += 1;
  return Math.min(5, score + 1); // 1-5 scale
}

export async function computeRiskProfile(ticker: string): Promise<void> {
  try {
    const [quant, fundamental] = await Promise.all([
      prisma.quantMetrics.findUnique({ where: { ticker } }),
      prisma.fundamentalData.findUnique({ where: { ticker } }),
    ]);

    const maxDrawdown = quant?.max_drawdown ?? null;
    const var95 = quant?.var_95 ?? null;
    const var99 = quant?.var_99 ?? null;
    const cvar95 = quant?.cvar_95 ?? null;

    // Liquidity score: (daily volume / market cap). Higher = more liquid
    let liquidityScore: number | null = null;
    if (fundamental?.volume && fundamental?.market_cap) {
      const vol = Number(fundamental.volume);
      const cap = Number(fundamental.market_cap);
      if (cap > 0) liquidityScore = vol / cap;
    }

    // Event risk: earnings within 7 days
    let eventRisk = false;
    if (fundamental?.next_earnings_date) {
      const daysUntilEarnings = (new Date(fundamental.next_earnings_date).getTime() - Date.now()) / (24 * 60 * 60 * 1000);
      if (daysUntilEarnings >= 0 && daysUntilEarnings <= 7) {
        eventRisk = true;
      }
    }

    const overallRiskRating = getRiskRating(maxDrawdown, var95, liquidityScore, eventRisk);

    await prisma.riskProfile.upsert({
      where: { ticker },
      update: {
        max_drawdown: maxDrawdown,
        liquidity_score: liquidityScore,
        event_risk_flag: eventRisk,
        overall_risk_rating: overallRiskRating,
        var_95: var95,
        var_99: var99,
        cvar_95: cvar95,
        stress_test_p5: quant?.monte_carlo_p5 ?? null,
      },
      create: {
        ticker,
        max_drawdown: maxDrawdown,
        liquidity_score: liquidityScore,
        event_risk_flag: eventRisk,
        overall_risk_rating: overallRiskRating,
        var_95: var95,
        var_99: var99,
        cvar_95: cvar95,
        stress_test_p5: quant?.monte_carlo_p5 ?? null,
      }
    });

    logWrapper.info(`Risk profile for ${ticker}: Rating=${overallRiskRating}/5, EventRisk=${eventRisk}`);
  } catch (err) {
    logWrapper.error(`Failed to compute risk profile for ${ticker}:`, err);
  }
}
