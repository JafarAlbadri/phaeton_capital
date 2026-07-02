"use client";

import { Bot } from 'lucide-react';
import { ExplainTooltip, InlineExplain } from '../ExplainTooltip';
import { ScoreBar } from './ScoreBar';

export function QuantSection({ quantMetrics, trendsHistory }: { quantMetrics: any; trendsHistory: any[] }) {
    return (
        <section id="quant" className="scroll-mt-20" data-animate>
            <div className="flex items-center gap-3 mb-5">
                <div className="w-6 h-6 rounded-lg bg-indigo-500/15 flex items-center justify-center border border-indigo-500/20">
                    <Bot className="w-3.5 h-3.5 text-indigo-400" />
                </div>
                <InlineExplain topic="quant_score"><span className="section-title">Quantitative Models</span></InlineExplain>
                <div className="flex-1 h-px bg-gradient-to-r from-[#E5E1D5] to-transparent" />
            </div>
            <div className="card p-6 flex flex-col gap-2">
                <ScoreBar label="Hurst Exponent" value={quantMetrics.hurst_exponent} variant={(quantMetrics.hurst_exponent||0)>0.5 ? 'bull' : 'gold'} thick />
                <ScoreBar label="Kelly Allocation (%)" value={quantMetrics.kelly_fraction != null ? Math.max(-100, Math.min(100, quantMetrics.kelly_fraction * 100)) : null} variant={quantMetrics.kelly_fraction != null && quantMetrics.kelly_fraction < 0 ? 'bear' : 'gold'} thick />
                <ScoreBar label="Granger p-value (x100)" value={quantMetrics.granger_p_value ? quantMetrics.granger_p_value*100 : null} variant={quantMetrics.granger_p_value < 0.05 ? 'bull' : 'bear'} thick />
                <ScoreBar label="Sent ↔ Price ρ (x100)" value={quantMetrics.sentiment_price_corr ? quantMetrics.sentiment_price_corr*100 : null} variant="gold" thick />

                <div className="mt-4 pt-4 border-t border-[#E5E1D5] grid grid-cols-2 gap-4">
                    <div>
                        <div className="section-title mb-1 flex items-center gap-1">HMM Regime <ExplainTooltip topic="hmm" /></div>
                        <div className={`font-mono text-xl font-700 ${quantMetrics.hmm_state === 2 ? 'text-emerald-400' : quantMetrics.hmm_state === 0 ? 'text-red-400' : 'text-amber-400'}`}>
                            {quantMetrics.hmm_state === 2 ? 'Bull' : quantMetrics.hmm_state === 0 ? 'Bear' : quantMetrics.hmm_state === 1 ? 'Neutral' : '—'}
                        </div>
                    </div>
                    <div>
                        <div className="section-title mb-1">Stationarity</div>
                        <div className={`font-mono text-xl font-700 ${quantMetrics.adf_stationary ? 'text-emerald-400' : 'text-red-400'}`}>{quantMetrics.adf_stationary ? 'Stationary' : 'Non-Stationary'}</div>
                    </div>
                </div>

                {/* V2: Google Trends sparkline */}
                {quantMetrics.trends_score != null && (
                    <div className="mt-4 pt-4 border-t border-[#E5E1D5]">
                        <div className="flex items-center justify-between mb-2">
                            <div className="section-title">Google Trends Signal</div>
                            <span className={`text-[12px] font-mono font-700 ${quantMetrics.trends_score > 60 ? 'text-emerald-400' : quantMetrics.trends_score < 40 ? 'text-red-400' : 'text-amber-400'}`}>
                                {quantMetrics.trends_score.toFixed(0)} / 100
                            </span>
                        </div>
                        {trendsHistory && trendsHistory.length > 1 && (() => {
                            const sorted = [...trendsHistory].sort((a: any, b: any) => new Date(a.week_start).getTime() - new Date(b.week_start).getTime());
                            const values = sorted.map((w: any) => w.interest);
                            const min = Math.min(...values), max = Math.max(...values);
                            const range = max - min || 1;
                            const W = 240, H = 40;
                            const pts = values.map((v: number, i: number) =>
                                `${(i / (values.length - 1)) * W},${H - ((v - min) / range) * H}`
                            ).join(' ');
                            return (
                                <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-10 overflow-visible">
                                    <polyline points={pts} fill="none" stroke="#5F7BA6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                    <polyline points={`0,${H} ${pts} ${W},${H}`} fill="url(#trendsGrad)" stroke="none" />
                                    <defs>
                                        <linearGradient id="trendsGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#5F7BA6" stopOpacity={0.25} />
                                            <stop offset="100%" stopColor="#5F7BA6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                </svg>
                            );
                        })()}
                    </div>
                )}
                <div className="mt-4 flex gap-2">
                    {quantMetrics.contrarian_signal?.isContrarian && (
                        <span className="badge badge-gold">
                            Contrarian: {quantMetrics.contrarian_signal.type ?? 'SIGNAL'}
                            {quantMetrics.contrarian_signal.confidence != null && ` (${(quantMetrics.contrarian_signal.confidence * 100).toFixed(0)}%)`}
                        </span>
                    )}
                </div>
            </div>
        </section>
    );
}
