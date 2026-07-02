"use client";

import {
    Activity, Award, BarChart2, Bot, Briefcase, DollarSign, Globe, Shield, Zap,
} from 'lucide-react';
import type { InsiderStats } from './InsiderSection';
import type { SignalStyle } from './signalStyles';

const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

// Comprehensive Analysis ("Helhetsanalys") — every sentence is derived from
// the underlying data at render time; nothing here is stored or hardcoded.
export function AnalysisSection({ recommendationScore, fundamentalData, technicalIndicators, quantMetrics, macroIndicators, gaussianData, manipulationStats, insiderStats, insiderTrades, riskProfile, targetKeyword, sig }: {
    recommendationScore: any;
    fundamentalData: any;
    technicalIndicators: any;
    quantMetrics: any;
    macroIndicators: any;
    gaussianData: any;
    manipulationStats: any;
    insiderStats: InsiderStats;
    insiderTrades: any[];
    riskProfile: any;
    targetKeyword: string;
    sig: SignalStyle;
}) {
    const signal = recommendationScore?.signal ?? 'HOLD';
    const score  = recommendationScore?.composite_score ?? 50;
    const conf   = (recommendationScore?.confidence ?? 0.5) * 100;
    const ticker = (targetKeyword || 'aktien').toUpperCase();

    // ── Fundamental analysis text ──────────────────────────
    let fundamentalText = '';
    if (fundamentalData) {
        const pe    = fundamentalData.pe_ratio;
        const cap   = fundamentalData.market_cap;
        const cons  = fundamentalData.analyst_consensus;
        const low   = fundamentalData.target_price_low;
        const high  = fundamentalData.target_price_high;
        const mean  = fundamentalData.target_price_mean;

        const peText = pe
            ? pe > 35  ? `P/E of ${pe.toFixed(1)}x indicates a high valuation vs. historical averages, requiring sustained earnings growth to justify the price.`
            : pe < 12  ? `P/E of ${pe.toFixed(1)}x is low and may signal undervaluation or uncertainty around future earnings.`
            : `P/E of ${pe.toFixed(1)}x falls within a reasonable range relative to the sector.`
            : '';
        const capText = cap
            ? `Market cap is $${(Number(cap)/1e9).toFixed(1)}B, placing the company in the ${Number(cap)>200e9 ? 'megacap' : Number(cap)>10e9 ? 'large-cap' : 'mid-cap'} category.`
            : '';
        const analystText = cons
            ? `Analyst consensus points to ${cons}${mean ? ` with a mean price target of $${Number(mean).toFixed(2)}` : ''}${low && high ? ` (range $${Number(low).toFixed(0)}–$${Number(high).toFixed(0)})` : ''}.`
            : '';
        fundamentalText = [peText, capText, analystText].filter(Boolean).join(' ');
    }
    if (!fundamentalText) fundamentalText = 'No fundamental data available for this analysis cycle.';

    // ── Technical analysis text ────────────────────────────
    let technicalText = '';
    if (technicalIndicators) {
        const rsi  = technicalIndicators.rsi_14;
        const macdHist = technicalIndicators.macd_histogram;
        const tech = technicalIndicators.technical_signal;

        const rsiText = rsi != null
            ? rsi > 70 ? `RSI of ${rsi.toFixed(0)} is in overbought territory, increasing short-term reversal risk.`
            : rsi < 30 ? `RSI of ${rsi.toFixed(0)} signals an oversold market and a potential buying opportunity.`
            : `RSI of ${rsi.toFixed(0)} is neutral and provides no clear directional signal.`
            : '';
        const macdText = macdHist != null
            ? macdHist > 0 ? 'MACD histogram is positive, confirming upward momentum.' : 'MACD histogram is negative, suggesting fading momentum.'
            : '';
        const techText = tech
            ? `Overall technical signal: ${tech === 'BULLISH' ? 'BULLISH – price action supports a positive view' : tech === 'BEARISH' ? 'BEARISH – technical patterns argue for caution' : 'NEUTRAL – no clear direction emerges'}.`
            : '';
        technicalText = [rsiText, macdText, techText].filter(Boolean).join(' ');
    }
    if (!technicalText) technicalText = 'Technical indicators are not available for this period.';

    // ── Quant analysis text ────────────────────────────────
    let quantText = '';
    if (quantMetrics) {
        const hurst   = quantMetrics.hurst_exponent;
        const kelly   = quantMetrics.kelly_fraction;
        const hmm     = quantMetrics.hmm_state;
        const corr    = quantMetrics.sentiment_price_corr;
        const granger = quantMetrics.granger_p_value;
        const adf     = quantMetrics.adf_stationary;

        const hurstText = hurst != null
            ? hurst > 0.6 ? `Hurst exponent (${hurst.toFixed(2)}) indicates strong trending price dynamics — impulses tend to persist.`
            : hurst < 0.45 ? `Hurst exponent (${hurst.toFixed(2)}) suggests mean-reverting behavior — price tends to return to the mean.`
            : `Hurst exponent (${hurst.toFixed(2)}) is near 0.5, suggesting a random walk with no clear trend.`
            : '';
        const kellyText = kelly != null
            ? `Kelly criterion suggests an allocation of ${(kelly*100).toFixed(1)}% of capital given the current risk/reward ratio.`
            : '';
        const hmmText  = hmm != null
            ? `HMM regime detection classifies the current market as a ${hmm === 2 ? 'bull regime' : hmm === 0 ? 'bear regime' : 'neutral regime'}.`
            : '';
        const corrText = corr != null && granger != null
            ? `Sentiment-price correlation is ${corr.toFixed(2)} and the Granger causality test ${granger < 0.05 ? 'confirms statistical significance (p=' + granger.toFixed(3) + ')' : 'shows no significant causality (p=' + granger.toFixed(3) + ')'}.`
            : '';
        const adfText  = adf != null
            ? adf ? 'Price series is stationary, supporting statistical models.' : 'Price series is non-stationary — models should use differenced values.'
            : '';
        quantText = [hurstText, kellyText, hmmText, corrText, adfText].filter(Boolean).join(' ');
    }
    if (!quantText) quantText = 'Quantitative model data is not available.';

    // ── Macro analysis text ────────────────────────────────
    let macroText = '';
    if (macroIndicators) {
        const vix    = macroIndicators.vix;
        const fg     = macroIndicators.fear_greed_index;
        const yield_ = macroIndicators.ten_year_yield;
        const etf    = macroIndicators.sector_etf_momentum_1m;

        const vixText = vix != null
            ? vix > 30 ? `VIX of ${vix.toFixed(1)} signals elevated market fear and high volatility — risk premiums are elevated.`
            : vix < 15 ? `VIX of ${vix.toFixed(1)} indicates calm market conditions with low implied volatility.`
            : `VIX of ${vix.toFixed(1)} is within normal levels.`
            : '';
        const fgText  = fg != null
            ? fg > 70 ? `Fear & Greed Index at ${fg.toFixed(0)} indicates extreme greed in the market, which historically correlates with elevated correction risk.`
            : fg < 30 ? `Fear & Greed Index at ${fg.toFixed(0)} shows extreme fear — contrarian analysis suggests potential buying opportunities.`
            : `Fear & Greed Index at ${fg.toFixed(0)} is neutral.`
            : '';
        const yieldText = yield_ != null
            ? `The 10-year Treasury yield at ${yield_.toFixed(2)}% sets the bar for discount rates and ${yield_ > 4.5 ? 'pressures valuation models negatively' : 'offers relative support for equity valuations'}.`
            : '';
        const etfText   = etf != null
            ? `Sector ETF momentum over the past month is ${(etf*100).toFixed(1)}%, which ${etf >= 0 ? 'supports a positive sector view' : 'suggests sector rotation away from this segment'}.`
            : '';
        macroText = [vixText, fgText, yieldText, etfText].filter(Boolean).join(' ');
    }
    if (!macroText) macroText = 'Macroeconomic indicators are not available for this analysis cycle.';

    // ── Sentiment analysis text ────────────────────────────
    let sentimentText = '';
    if (gaussianData || manipulationStats) {
        const mean    = gaussianData?.mean;
        const std     = gaussianData?.stdDev;
        const organic = manipulationStats?.organicCount;
        const blocked = manipulationStats?.manipulatedCount;
        const total   = manipulationStats?.totalCount;

        const meanText = mean != null
            ? mean > 0.5  ? `Sentiment distribution is clearly positive (μ=${mean.toFixed(2)}) with broad consensus among analyzed posts.`
            : mean < -0.5 ? `Sentiment distribution is negatively skewed (μ=${mean.toFixed(2)}), reflecting widespread pessimism on social media.`
            : `Sentiment distribution is centered near neutral (μ=${mean.toFixed(2)}) with divided opinions.`
            : '';
        const stdText  = std != null
            ? std > 0.4 ? `Dispersion is high (σ=${std.toFixed(2)}), indicating diverging opinions — the market is undecided.`
            : `Dispersion is low (σ=${std.toFixed(2)}), suggesting a consensus view.`
            : '';
        const qualText = total != null && organic != null
            ? `A total of ${total.toLocaleString()} posts were analyzed, of which ${((organic/total)*100).toFixed(0)}% were classified as organic signals${blocked ? ` and ${blocked} manipulative posts were filtered out` : ''}.`
            : '';
        sentimentText = [meanText, stdText, qualText].filter(Boolean).join(' ');
    }
    if (!sentimentText) sentimentText = 'Sentiment data is not available for this analysis cycle.';

    // ── Insider analysis text ──────────────────────────────
    let insiderText = '';
    if (insiderStats.buyVolume > 0 || insiderStats.sellVolume > 0) {
        const net    = insiderStats.netVolume;
        const buy    = insiderStats.buyVolume;
        const sell   = insiderStats.sellVolume;
        const total  = buy + sell;
        const ratio  = total > 0 ? (buy / total * 100) : 50;
        const count  = insiderTrades?.length ?? 0;

        insiderText = `${count} insider transactions recorded. Buy volume is ${fmt.format(buy)} and sell volume is ${fmt.format(sell)}, giving a net flow of ${net >= 0 ? '+' : ''}${fmt.format(net)}. `
            + (ratio > 65 ? `Insiders are net buyers (${ratio.toFixed(0)}% of transaction volume), which is traditionally interpreted as a positive insider signal.`
            : ratio < 35 ? `Insiders are dominated by sellers (${(100-ratio).toFixed(0)}% of transaction volume). Insider selling can have many reasons but should be noted.`
            : `Buy and sell volumes are relatively balanced, providing no clear direction from insider trading.`);
    }
    if (!insiderText) insiderText = 'No insider transactions have been recorded for this period.';

    // ── Risk analysis text ─────────────────────────────────
    let riskText = '';
    if (riskProfile) {
        const sharpe  = riskProfile.sharpe_ratio;
        const var_    = riskProfile.value_at_risk;
        const dd      = riskProfile.max_drawdown;
        const liq     = riskProfile.liquidity_score;

        const sharpeText = sharpe != null
            ? sharpe > 1.5 ? `Sharpe ratio of ${sharpe.toFixed(2)} is excellent, indicating high risk-adjusted returns.`
            : sharpe > 0.5 ? `Sharpe ratio of ${sharpe.toFixed(2)} is acceptable.`
            : `Sharpe ratio of ${sharpe.toFixed(2)} is low — returns do not justify the volatility.`
            : '';
        const varText   = var_ != null
            ? `Value-at-Risk (95%) is ${(var_*100).toFixed(1)}% daily loss level.`
            : '';
        const ddText    = dd != null
            ? `Maximum drawdown is ${(Math.abs(dd)*100).toFixed(1)}%, which ${Math.abs(dd) > 0.3 ? 'is significant and should be considered in position sizing' : 'is within acceptable levels'}.`
            : '';
        const liqText   = liq != null
            ? `Liquidity score is ${liq.toFixed(2)} — ${liq > 0.7 ? 'high liquidity facilitates easy entry and exit' : liq > 0.4 ? 'liquidity is sufficient' : 'low liquidity may result in slippage on larger positions'}.`
            : '';
        riskText = [sharpeText, varText, ddText, liqText].filter(Boolean).join(' ');
    }
    if (!riskText) riskText = 'Risk profile is not available for this analysis cycle.';

    // ── Executive summary ──────────────────────────────────
    const isBull = signal === 'STRONG_BUY' || signal === 'BUY';
    const isBear = signal === 'STRONG_SELL' || signal === 'SELL';
    const signalWord = signal === 'STRONG_BUY' ? 'STRONG BUY' : signal === 'BUY' ? 'BUY' : signal === 'HOLD' ? 'HOLD' : signal === 'SELL' ? 'SELL' : 'STRONG SELL';

    const execSummary = (recommendationScore
        ? `The composite model for ${ticker} generates a ${signalWord} signal with a composite score of ${score.toFixed(1)}/100 and a confidence of ${conf.toFixed(0)}%. `
        : `Composite score is not yet available for ${ticker} — scanning is still in progress. Below is a preliminary analysis based on available data. `)
        + (isBull
            ? `The analysis shows a predominantly positive backdrop where multiple dimensions converge in a bullish direction. The combination of ${technicalIndicators?.technical_signal === 'BULLISH' ? 'positive technical patterns, ' : ''}${gaussianData?.mean > 0.3 ? 'optimistic sentiment, ' : ''}${insiderStats.netVolume > 0 ? 'net insider buying, ' : ''}and quantitative models collectively points to a favorable risk/reward profile.`
            : isBear
            ? `The analysis identifies a predominantly negative pattern. ${technicalIndicators?.technical_signal === 'BEARISH' ? 'Technical indicators show downward pressure. ' : ''}${gaussianData?.mean < -0.3 ? 'Sentiment is negatively skewed. ' : ''}Overall, the majority of dimensions argue for caution.`
            : `The analysis shows mixed signals without a clear consensus. Positive and negative factors are balanced, and a HOLD position is justified until clearer directional signals emerge.`);

    // ── Dimension cards config ─────────────────────────────
    const dimensions = [
        { icon: DollarSign,  label: 'Fundamental Analysis',  text: fundamentalText, color: 'text-gold-bright',   bg: 'bg-[rgba(212,160,23,0.06)]',  border: 'border-[rgba(212,160,23,0.12)]' },
        { icon: BarChart2,   label: 'Technical Analysis',     text: technicalText,   color: 'text-indigo-400',     bg: 'bg-indigo-500/5',              border: 'border-indigo-500/15' },
        { icon: Bot,         label: 'Quantitative Models',    text: quantText,       color: 'text-purple-400',     bg: 'bg-purple-500/5',              border: 'border-purple-500/15' },
        { icon: Globe,       label: 'Macro Environment',      text: macroText,       color: 'text-cyan-400',       bg: 'bg-cyan-500/5',                border: 'border-cyan-500/15' },
        { icon: Activity,    label: 'Sentiment Analysis',     text: sentimentText,   color: isBull ? 'text-emerald-400' : isBear ? 'text-red-400' : 'text-amber-400', bg: isBull ? 'bg-emerald-500/5' : isBear ? 'bg-red-500/5' : 'bg-amber-500/5', border: isBull ? 'border-emerald-500/15' : isBear ? 'border-red-500/15' : 'border-amber-500/15' },
        { icon: Briefcase,   label: 'Insider Flow',           text: insiderText,     color: 'text-blue-400',       bg: 'bg-blue-500/5',                border: 'border-blue-500/15' },
        { icon: Shield,      label: 'Risk Profile',           text: riskText,        color: 'text-orange-400',     bg: 'bg-orange-500/5',              border: 'border-orange-500/15' },
    ];

    return (
        <section id="helhetsanalys" className="col-span-12 scroll-mt-20" data-animate>
            <div className="flex items-center gap-3 mb-5">
                <div className="w-6 h-6 rounded-lg bg-amber-500/15 flex items-center justify-center border border-amber-500/20">
                    <Award className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <span className="section-title">Comprehensive Analysis</span>
                <div className="flex-1 h-px bg-gradient-to-r from-[#1a1a3a] to-transparent" />
                <span className="badge badge-gold">Composite Assessment</span>
            </div>

            <div className="space-y-6" data-animate-child>
                {/* Executive Summary */}
                <div className={`relative rounded-2xl border p-7 overflow-hidden ${isBull ? 'border-emerald-500/20 bg-emerald-500/[0.03]' : isBear ? 'border-red-500/20 bg-red-500/[0.03]' : 'border-[#1e1e42] bg-[#0d0d24]'}`}>
                    <div className={`absolute top-0 left-0 w-1 h-full rounded-l-2xl ${isBull ? 'bg-emerald-500' : isBear ? 'bg-red-500' : 'bg-amber-500'}`} />
                    <div className="flex items-start gap-5 pl-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${isBull ? 'bg-emerald-500/15 border border-emerald-500/25' : isBear ? 'bg-red-500/15 border border-red-500/25' : 'bg-amber-500/15 border border-amber-500/25'}`}>
                            <Zap className={`w-5 h-5 ${isBull ? 'text-emerald-400' : isBear ? 'text-red-400' : 'text-amber-400'}`} />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                                <span className="text-[11px] font-700 tracking-[0.12em] uppercase text-[#9898c0]">Overall Assessment</span>
                                <span className={`badge ${isBull ? 'badge-bull' : isBear ? 'badge-bear' : 'badge-hold'}`}><div className="badge-dot" />{signalWord}</span>
                                <span className="font-mono text-[12px] text-[#9898c0]">{score.toFixed(1)}/100 · {conf.toFixed(0)}% conf.</span>
                            </div>
                            <p className="text-[15px] leading-[1.8] text-[#c8c8e0] font-400">{execSummary}</p>
                        </div>
                    </div>
                </div>

                {/* Dimension grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {dimensions.map(({ icon: Icon, label, text, color, bg, border }) => (
                        <div key={label} className={`rounded-xl border p-5 ${bg} ${border} flex flex-col gap-3`} data-animate-child>
                            <div className="flex items-center gap-2.5">
                                <Icon className={`w-4 h-4 shrink-0 ${color}`} />
                                <span className={`text-[11px] font-700 tracking-[0.1em] uppercase ${color}`}>{label}</span>
                            </div>
                            <p className="text-[13px] leading-[1.75] text-[#9898c0]">{text}</p>
                        </div>
                    ))}
                </div>

                {/* Final verdict */}
                <div className="card p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5">
                    <div className={`text-[42px] font-display font-800 leading-none tracking-[-0.04em] bg-gradient-to-r ${sig.from} ${sig.to} bg-clip-text text-transparent shrink-0`}>
                        {signalWord}
                    </div>
                    <div className="w-px h-10 bg-[#1a1a3a] hidden sm:block shrink-0" />
                    <div className="text-[13px] leading-[1.75] text-[#9898c0]">
                        Based on a composite weighting of fundamental valuation, technical patterns, quantitative models, macro factors, sentiment analysis, insider flow, and risk profile — Phaeton Capital rates <span className={`font-700 ${isBull ? 'text-emerald-400' : isBear ? 'text-red-400' : 'text-amber-400'}`}>{signalWord}</span> for {ticker}. This analysis is algorithmically generated and does not constitute financial advice.
                    </div>
                </div>
            </div>
        </section>
    );
}
