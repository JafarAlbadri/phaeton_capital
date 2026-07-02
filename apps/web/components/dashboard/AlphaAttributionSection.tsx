"use client";

import { Activity, ArrowUpRight, Zap } from 'lucide-react';
import { InlineExplain } from '../ExplainTooltip';
import { ScoreBar } from './ScoreBar';

export function AlphaAttributionSection({ signalAttribution, recommendationScore, targetKeyword }: {
    signalAttribution: any;
    recommendationScore: any;
    targetKeyword: string;
}) {
    return (
        <section id="alpha" className="col-span-12 scroll-mt-20" data-animate>
            <div className="flex items-center gap-3 mb-5">
                <div className="w-6 h-6 rounded-lg bg-indigo-500/15 flex items-center justify-center border border-indigo-500/20">
                    <Activity className="w-3.5 h-3.5 text-indigo-400" />
                </div>
                <InlineExplain topic="ic"><span className="section-title">Alpha Attribution</span></InlineExplain>
                <div className="flex-1 h-px bg-gradient-to-r from-[#3A3833] to-transparent" />
                <span className="badge badge-gold">Institutional Signal Quality</span>
            </div>

            {/* Block A: IC / IR / T-Stat / Causal Lead KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
                {/* IC */}
                <div className="card p-5 flex flex-col gap-1 relative overflow-hidden" data-animate-child>
                    <div className="section-title mb-0.5">Information Coefficient</div>
                    <div className={`font-mono text-[28px] font-700 leading-none ${signalAttribution.ic === null ? 'text-[#A6A296]' : signalAttribution.ic > 0.1 ? 'text-emerald-400' : signalAttribution.ic < 0 ? 'text-red-400' : 'text-amber-400'}`}>
                        {signalAttribution.ic !== null ? signalAttribution.ic.toFixed(3) : '—'}
                    </div>
                    <div className="text-[11px] text-[#9B9789] mt-1">rank-corr(score, return)</div>
                    {signalAttribution.ic !== null && (
                        <div className={`text-[10px] font-700 mt-1 ${signalAttribution.ic > 0.1 ? 'text-emerald-400' : signalAttribution.ic > 0 ? 'text-amber-400' : 'text-red-400'}`}>
                            {signalAttribution.ic > 0.1 ? '✓ Strong predictive power' : signalAttribution.ic > 0 ? '~ Weak signal' : '✗ Negative signal'}
                        </div>
                    )}
                </div>

                {/* IR */}
                <div className="card p-5 flex flex-col gap-1 relative overflow-hidden" data-animate-child>
                    <div className="section-title mb-0.5">Information Ratio</div>
                    <div className={`font-mono text-[28px] font-700 leading-none ${signalAttribution.ir === null ? 'text-[#A6A296]' : signalAttribution.ir > 1.5 ? 'text-emerald-400' : signalAttribution.ir > 0.5 ? 'text-amber-400' : 'text-red-400'}`}>
                        {signalAttribution.ir !== null ? signalAttribution.ir.toFixed(2) : '—'}
                    </div>
                    <div className="text-[11px] text-[#9B9789] mt-1">IC / σ(IC) · 5-trade batches</div>
                    {signalAttribution.ir !== null && (
                        <div className={`text-[10px] font-700 mt-1 ${signalAttribution.ir > 1.5 ? 'text-emerald-400' : signalAttribution.ir > 0.5 ? 'text-amber-400' : 'text-red-400'}`}>
                            {signalAttribution.ir > 1.5 ? '✓ Institutional grade' : signalAttribution.ir > 0.5 ? '~ Developing edge' : '✗ Inconsistent'}
                        </div>
                    )}
                </div>

                {/* T-Stat */}
                <div className="card p-5 flex flex-col gap-1 relative overflow-hidden" data-animate-child>
                    <div className="section-title mb-0.5">T-Statistic</div>
                    <div className={`font-mono text-[28px] font-700 leading-none flex items-baseline gap-1.5 ${signalAttribution.tStat === null ? 'text-[#A6A296]' : Math.abs(signalAttribution.tStat) > 1.96 ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {signalAttribution.tStat !== null ? Math.abs(signalAttribution.tStat).toFixed(2) : '—'}
                        {signalAttribution.isSignificant && <span className="text-[16px] text-emerald-400">★</span>}
                    </div>
                    <div className="text-[11px] text-[#9B9789] mt-1">
                        {signalAttribution.pValue !== null ? `p = ${signalAttribution.pValue.toFixed(3)}` : 'insufficient data'}
                    </div>
                    <div className={`text-[10px] font-700 mt-1 ${signalAttribution.isSignificant ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {signalAttribution.isSignificant ? '✓ Statistically significant' : '~ Not yet significant'}
                    </div>
                </div>

                {/* Causal Lead / Granger */}
                <div className="card p-5 flex flex-col gap-1 relative overflow-hidden" data-animate-child>
                    <div className="section-title mb-0.5">Causal Signal</div>
                    <div className={`font-mono text-[28px] font-700 leading-none ${signalAttribution.grangerP === null ? 'text-[#A6A296]' : signalAttribution.grangerP < 0.05 ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {signalAttribution.grangerP !== null ? (signalAttribution.grangerP < 0.001 ? '<0.001' : signalAttribution.grangerP.toFixed(3)) : '—'}
                    </div>
                    <div className="text-[11px] text-[#9B9789] mt-1">Granger p-value</div>
                    <div className={`text-[10px] font-700 mt-1 ${signalAttribution.grangerP !== null && signalAttribution.grangerP < 0.05 ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {signalAttribution.grangerP !== null
                            ? signalAttribution.grangerP < 0.05 ? '✓ Sentiment Granger-causes price' : '~ Correlation, not causation'
                            : 'Run quant scan for data'}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mb-5">
                {/* Block B: Component Score Breakdown */}
                {recommendationScore && (
                    <div className="card p-6" data-animate-child>
                        <div className="flex items-center justify-between mb-4">
                            <div className="section-title">Component Signal Breakdown</div>
                            <span className="text-[10px] font-mono text-[#9B9789]">{targetKeyword?.toUpperCase()} · Current Tick</span>
                        </div>
                        <div className="flex flex-col gap-0.5">
                            {[
                                { label: 'Sentiment', key: 'sentiment_score' },
                                { label: 'Technical', key: 'technical_score' },
                                { label: 'Fundamental', key: 'fundamental_score' },
                                { label: 'Quant Models', key: 'quant_score' },
                                { label: 'Insider Flow', key: 'insider_score' },
                                { label: 'Macro Env', key: 'macro_score' },
                            ].map(({ label, key }) => {
                                const val = recommendationScore[key];
                                const variant = val > 60 ? 'bull' : val < 40 ? 'bear' : 'gold';
                                return <ScoreBar key={key} label={label} value={val ?? null} variant={variant} thick />;
                            })}
                        </div>
                        {signalAttribution.sentimentPriceCorr !== null && (
                            <div className="mt-4 pt-4 border-t border-[#3A3833] flex items-center gap-3">
                                <div className="text-[11px] text-[#9B9789]">Sentiment ↔ Price Correlation</div>
                                <div className={`font-mono text-[13px] font-700 ml-auto ${Math.abs(signalAttribution.sentimentPriceCorr) > 0.3 ? 'text-emerald-400' : 'text-amber-400'}`}>
                                    {signalAttribution.sentimentPriceCorr.toFixed(3)}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Block C: Win Rate by Signal Type */}
                {signalAttribution.bySignalType?.length > 0 && (
                    <div className="card p-6" data-animate-child>
                        <div className="flex items-center justify-between mb-4">
                            <div className="section-title">Win Rate by Signal Type</div>
                            <span className="text-[10px] font-mono text-[#9B9789]">{signalAttribution.n} resolved predictions</span>
                        </div>
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-[#3A3833]">
                                    <th className="pb-2 text-[11px] font-700 tracking-[0.08em] uppercase text-[#A6A296]">Signal</th>
                                    <th className="pb-2 text-[11px] font-700 tracking-[0.08em] uppercase text-[#A6A296] text-center">Calls</th>
                                    <th className="pb-2 text-[11px] font-700 tracking-[0.08em] uppercase text-[#A6A296] text-right">Hit Rate</th>
                                    <th className="pb-2 text-[11px] font-700 tracking-[0.08em] uppercase text-[#A6A296] text-right">Avg Return</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/[0.06]">
                                {(['STRONG_BUY','BUY','HOLD','SELL','STRONG_SELL'] as const).map(sig => {
                                    const row = signalAttribution.bySignalType.find((r: any) => r.signal === sig);
                                    if (!row) return null;
                                    const isBull = sig === 'STRONG_BUY' || sig === 'BUY';
                                    const isBear = sig === 'SELL' || sig === 'STRONG_SELL';
                                    const hrColor = row.hitRate > 0.6 ? 'text-emerald-400' : row.hitRate < 0.4 ? 'text-red-400' : 'text-amber-400';
                                    const retColor = row.avgReturn >= 0 ? 'text-emerald-400' : 'text-red-400';
                                    return (
                                        <tr key={sig} className="py-2">
                                            <td className="py-2.5">
                                                <span className={`badge ${isBull ? 'badge-bull' : isBear ? 'badge-bear' : 'badge-hold'}`}>
                                                    {sig.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="py-2.5 text-center font-mono text-[13px] text-[#A6A296]">{row.calls}</td>
                                            <td className={`py-2.5 text-right font-mono text-[13px] font-700 ${hrColor}`}>
                                                {row.hitRate !== null ? `${(row.hitRate * 100).toFixed(0)}%` : '—'}
                                            </td>
                                            <td className={`py-2.5 text-right font-mono text-[13px] font-700 ${retColor}`}>
                                                {row.avgReturn !== null ? `${row.avgReturn >= 0 ? '+' : ''}${(row.avgReturn * 100).toFixed(2)}%` : '—'}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Block D: Transfer Entropy + Granger causality explainer */}
            {(signalAttribution.transferEntropy !== null || signalAttribution.grangerP !== null) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5" data-animate-child>
                    {signalAttribution.transferEntropy !== null && (
                        <div className="card p-5 flex flex-col gap-2">
                            <div className="flex items-center gap-2 mb-1">
                                <Zap className="w-3.5 h-3.5 text-amber-400" />
                                <div className="section-title">Transfer Entropy</div>
                                <span className={`ml-auto font-mono text-[18px] font-700 ${signalAttribution.transferEntropy > 0.02 ? 'text-emerald-400' : signalAttribution.transferEntropy > 0.01 ? 'text-amber-400' : 'text-[#A6A296]'}`}>
                                    {signalAttribution.transferEntropy.toFixed(4)} bits
                                </span>
                            </div>
                            <p className="text-[12px] text-[#9B9789] leading-relaxed">
                                {signalAttribution.transferEntropy > 0.02
                                    ? 'Sentiment flow carries meaningful directional information about future price movement — signal has causal information content above noise threshold.'
                                    : signalAttribution.transferEntropy > 0.01
                                    ? 'Moderate information transfer detected. Sentiment provides some predictive content, but signal-to-noise ratio is below institutional threshold.'
                                    : 'Low information transfer. Sentiment and price are largely independent — treat with caution.'}
                            </p>
                            <div className="mt-1 h-1.5 rounded-full bg-[#33312C] overflow-hidden">
                                <div className="h-full rounded-full score-bar-fill score-bar-gold" style={{ width: `${Math.min(100, signalAttribution.transferEntropy * 2500)}%` }} />
                            </div>
                        </div>
                    )}
                    {signalAttribution.grangerP !== null && (
                        <div className="card p-5 flex flex-col gap-2">
                            <div className="flex items-center gap-2 mb-1">
                                <ArrowUpRight className="w-3.5 h-3.5 text-indigo-400" />
                                <div className="section-title">Granger Causality</div>
                                <span className={`ml-auto font-mono text-[18px] font-700 ${signalAttribution.grangerP < 0.05 ? 'text-emerald-400' : signalAttribution.grangerP < 0.1 ? 'text-amber-400' : 'text-red-400'}`}>
                                    p = {signalAttribution.grangerP < 0.001 ? '<0.001' : signalAttribution.grangerP.toFixed(3)}
                                </span>
                            </div>
                            <p className="text-[12px] text-[#9B9789] leading-relaxed">
                                {signalAttribution.grangerP < 0.05
                                    ? 'Sentiment Granger-causes price with statistical confidence (p < 0.05). Past sentiment scores contain information that predicts future price — beyond what price history alone explains.'
                                    : signalAttribution.grangerP < 0.1
                                    ? 'Marginal causality evidence (p < 0.10). Sentiment may lead price but evidence is not yet at the 95% confidence threshold required for institutional claims.'
                                    : 'Sentiment does not Granger-cause price at current data levels. The relationship is correlational, not causal — price and sentiment move together but neither leads the other.'}
                            </p>
                            <div className={`mt-1 inline-flex items-center gap-1.5 text-[11px] font-700 ${signalAttribution.grangerP < 0.05 ? 'text-emerald-400' : 'text-amber-400'}`}>
                                <div className={`w-1.5 h-1.5 rounded-full ${signalAttribution.grangerP < 0.05 ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                                {signalAttribution.grangerP < 0.05 ? 'Causal — sentiment leads price' : 'Correlation only'}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </section>
    );
}
