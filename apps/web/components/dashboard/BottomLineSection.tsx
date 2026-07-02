"use client";

import { CheckCircle2, Scale, XCircle } from 'lucide-react';
import type { InsiderStats } from './InsiderSection';
import { getSignal, SignalStyle } from './signalStyles';

const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });

interface Driver {
    label: string;
    score: number;
    dev: number;
    detail: string;
}

// The closing synthesis: one place where every model's output is weighed
// together. Everything below is derived from the underlying data at render
// time — drivers are ranked by how far each component deviates from neutral.
export function BottomLineSection({ targetKeyword, sig, recommendationScore, recommendationScores, auditStats, riskProfile, technicalIndicators, fundamentalData, quantMetrics, macroIndicators, insiderStats }: {
    targetKeyword: string;
    sig: SignalStyle;
    recommendationScore: any;
    recommendationScores: any;
    auditStats: any;
    riskProfile: any;
    technicalIndicators: any;
    fundamentalData: any;
    quantMetrics: any;
    macroIndicators: any;
    insiderStats: InsiderStats;
}) {
    const rs = recommendationScore;
    const score: number = rs?.composite_score ?? 50;
    const conf = (rs?.confidence ?? 0) * 100;
    const signalWord = (rs?.signal ?? 'HOLD').replace(/_/g, ' ');
    const ticker = targetKeyword?.toUpperCase();

    // ── Per-component detail strings, derived from the richest metric each ──
    const upside = fundamentalData?.current_price && fundamentalData?.target_price
        ? ((fundamentalData.target_price - fundamentalData.current_price) / fundamentalData.current_price) * 100
        : null;
    const regimeWord = quantMetrics?.hmm_state === 2 ? 'bull regime' : quantMetrics?.hmm_state === 0 ? 'bear regime' : quantMetrics?.hmm_state === 1 ? 'neutral regime' : null;
    const netFlow = insiderStats.buyVolume - insiderStats.sellVolume;

    const components: Driver[] = ([
        { label: 'Sentiment',   score: rs?.sentiment_score,   detail: quantMetrics?.bayes_posterior != null ? `crowd mood ${quantMetrics.bayes_posterior >= 0 ? '+' : ''}${quantMetrics.bayes_posterior.toFixed(2)}` : 'social media flow' },
        { label: 'Technical',   score: rs?.technical_score,   detail: technicalIndicators?.rsi_14 != null ? `RSI ${technicalIndicators.rsi_14.toFixed(0)}${technicalIndicators.macd_histogram != null ? `, MACD ${technicalIndicators.macd_histogram > 0 ? 'positive' : 'negative'}` : ''}` : 'price action' },
        { label: 'Fundamental', score: rs?.fundamental_score, detail: upside != null ? `${upside >= 0 ? '+' : ''}${upside.toFixed(1)}% to analyst target` : 'valuation & analysts' },
        { label: 'Quant',       score: rs?.quant_score,       detail: regimeWord ?? (quantMetrics?.hurst_exponent != null ? `Hurst ${quantMetrics.hurst_exponent.toFixed(2)}` : 'statistical models') },
        { label: 'Insider',     score: rs?.insider_score,     detail: (insiderStats.buyVolume > 0 || insiderStats.sellVolume > 0) ? `net ${netFlow >= 0 ? 'buying' : 'selling'} $${compact.format(Math.abs(netFlow))}` : 'no recent activity' },
        { label: 'Macro',       score: rs?.macro_score,       detail: macroIndicators?.vix != null ? `VIX ${macroIndicators.vix.toFixed(1)}` : 'market environment' },
    ] as { label: string; score: number | null | undefined; detail: string }[])
        .filter((c): c is { label: string; score: number; detail: string } => c.score != null)
        .map(c => ({ ...c, dev: c.score - 50 }));

    const ranked = [...components].sort((a, b) => Math.abs(b.dev) - Math.abs(a.dev));
    const bullish = ranked.filter(d => d.dev > 5);
    const bearish = ranked.filter(d => d.dev < -5);
    const neutral = ranked.filter(d => Math.abs(d.dev) <= 5);

    // ── Horizon consistency ──
    const horizons = ([['15d', recommendationScores?.h15], ['30d', recommendationScores?.h30], ['90d', recommendationScores?.h90]] as const)
        .filter(([, r]) => r?.signal)
        .map(([label, r]) => ({ label, signal: r.signal as string, score: r.composite_score as number | null }));
    const horizonSignals = new Set(horizons.map(h => h.signal));
    const horizonText = horizons.length >= 2
        ? (horizonSignals.size === 1
            ? `The view is consistent across all ${horizons.length} horizons.`
            : `Horizons diverge (${horizons.map(h => `${h.label} ${h.signal.replace(/_/g, ' ')}`).join(', ')}) — conviction weakens with time.`)
        : '';

    // ── Track record + risk framing ──
    const hitRate = auditStats?.hitRate != null ? auditStats.hitRate * 100 : null;
    const trackText = hitRate != null
        ? `The model's resolved predictions have hit ${hitRate.toFixed(0)}% historically${hitRate < 50 ? ' — treat the signal with extra skepticism' : ''}.`
        : 'The model has no resolved track record yet — this signal is unproven.';
    const riskRating = riskProfile?.overall_risk_rating;
    const kelly = quantMetrics?.kelly_fraction;
    const riskText = riskRating != null
        ? `Risk is rated ${riskRating}/5${kelly != null ? `; Kelly sizing suggests ${Math.max(0, kelly * 100).toFixed(1)}% of capital` : ''}.`
        : '';

    const summary = `${ticker} scores ${score.toFixed(0)}/100 — ${signalWord} at ${conf.toFixed(0)}% confidence. `
        + (bullish.length && bearish.length
            ? `The case rests on ${bullish.map(d => d.label.toLowerCase()).join(' and ')}, argued against by ${bearish.map(d => d.label.toLowerCase()).join(' and ')}. `
            : bullish.length
            ? `Support comes from ${bullish.map(d => d.label.toLowerCase()).join(', ')} with nothing material pulling the other way. `
            : bearish.length
            ? `Pressure comes from ${bearish.map(d => d.label.toLowerCase()).join(', ')} with no meaningful offsets. `
            : 'Every dimension sits near neutral — there is no edge in either direction right now. ')
        + horizonText + ' ' + trackText + (riskText ? ' ' + riskText : '');

    const stance = (d: Driver) => d.dev > 5 ? '#7FA886' : d.dev < -5 ? '#D9776B' : '#8F8C80';

    return (
        <section id="bottomline" className="col-span-12 scroll-mt-20" data-animate>
            <div className="flex items-center gap-3 mb-5">
                <div className="w-6 h-6 rounded-lg bg-amber-500/15 flex items-center justify-center border border-amber-500/20">
                    <Scale className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <span className="section-title">The Bottom Line</span>
                <div className="flex-1 h-px bg-gradient-to-r from-[#3A3833] to-transparent" />
                <span className="badge badge-gold">Everything, weighed</span>
            </div>

            <div className="card relative overflow-hidden" data-animate-child>
                <div className={`absolute top-0 left-0 w-1 h-full ${score > 55 ? 'bg-emerald-400' : score < 45 ? 'bg-red-400' : 'bg-amber-400'}`} />

                <div className="p-7 xl:p-9 pl-9 xl:pl-11">
                    {/* Verdict row */}
                    <div className="flex flex-col md:flex-row md:items-end gap-4 md:gap-8 mb-6">
                        <div className={`font-display text-[44px] xl:text-[56px] font-800 leading-none tracking-[-0.03em] bg-gradient-to-r ${sig.from} ${sig.to} bg-clip-text text-transparent`}>
                            {signalWord}
                        </div>
                        <div className="flex items-center gap-4 pb-1 flex-wrap">
                            <span className="font-mono text-[15px] text-[#E5E2D8]">{score.toFixed(1)}<span className="text-[#8F8C80]">/100</span></span>
                            <span className="font-mono text-[13px] text-[#9B9789]">{conf.toFixed(0)}% confidence</span>
                            {horizons.map(h => (
                                <span key={h.label} className="font-mono text-[11px] px-2 py-0.5 rounded border border-[#43413A] text-[#9B9789]">
                                    {h.label} <span style={{ color: getSignal(h.signal).shadow.replace(/0\.\d+\)/, '1)') }}>{h.score?.toFixed(0) ?? '—'}</span>
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Agreement dots */}
                    <div className="flex items-center gap-2 mb-7">
                        {components.map(c => (
                            <div key={c.label} className="flex items-center gap-1.5" title={`${c.label}: ${c.score.toFixed(0)}/100`}>
                                <span className="w-2.5 h-2.5 rounded-full" style={{ background: stance(c) }} />
                                <span className="text-[10px] uppercase tracking-[0.08em] text-[#8F8C80] hidden sm:inline">{c.label}</span>
                            </div>
                        ))}
                        <span className="ml-2 text-[11px] text-[#9B9789]">
                            {bullish.length} bullish · {neutral.length} neutral · {bearish.length} bearish
                        </span>
                    </div>

                    {/* Drivers, ranked by strength */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-7">
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                <span className="text-[11px] font-700 tracking-[0.1em] uppercase text-emerald-400">What supports it</span>
                            </div>
                            {bullish.length > 0 ? bullish.map(d => (
                                <div key={d.label} className="flex items-baseline gap-3 py-1.5 border-b border-white/[0.05] last:border-0">
                                    <span className="font-mono text-[13px] font-700 text-emerald-300 w-8 text-right">{d.score.toFixed(0)}</span>
                                    <span className="text-[13px] font-600 text-[#E5E2D8]">{d.label}</span>
                                    <span className="text-[12px] text-[#9B9789]">{d.detail}</span>
                                </div>
                            )) : <p className="text-[12px] text-[#8F8C80] italic">Nothing pulls meaningfully bullish.</p>}
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <XCircle className="w-3.5 h-3.5 text-red-400" />
                                <span className="text-[11px] font-700 tracking-[0.1em] uppercase text-red-400">What argues against</span>
                            </div>
                            {bearish.length > 0 ? bearish.map(d => (
                                <div key={d.label} className="flex items-baseline gap-3 py-1.5 border-b border-white/[0.05] last:border-0">
                                    <span className="font-mono text-[13px] font-700 text-red-300 w-8 text-right">{d.score.toFixed(0)}</span>
                                    <span className="text-[13px] font-600 text-[#E5E2D8]">{d.label}</span>
                                    <span className="text-[12px] text-[#9B9789]">{d.detail}</span>
                                </div>
                            )) : <p className="text-[12px] text-[#8F8C80] italic">Nothing pulls meaningfully bearish.</p>}
                        </div>
                    </div>

                    {/* The synthesis */}
                    <p className="text-[15px] leading-[1.85] text-[#C7C3B8] max-w-[75ch]">{summary}</p>
                    <p className="text-[11px] text-[#8F8C80] mt-4 italic">Algorithmically generated from all models above — not financial advice.</p>
                </div>
            </div>
        </section>
    );
}
