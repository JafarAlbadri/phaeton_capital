"use client";

import { useState, useRef, useEffect } from 'react';
import { Bot, Globe, RotateCcw } from 'lucide-react';
import { ResponsiveContainer, ComposedChart, XAxis, YAxis, Tooltip, ReferenceLine, Area, Line } from 'recharts';
import { InlineExplain, ExplainTooltip } from '../ExplainTooltip';
import { Tile, ScoreBar, CustomTooltip } from './shared';
import type { Horizon } from './types';

interface MacroQuantBacktestProps {
    quantMetrics: any;
    macroIndicators: any;
    trendsHistory: { week_start: string; interest: number }[];
    targetKeyword: string;
}

export default function MacroQuantBacktest({ quantMetrics, macroIndicators, trendsHistory, targetKeyword }: MacroQuantBacktestProps) {
    const [btData, setBtData] = useState<any>(null);
    const [btLoading, setBtLoading] = useState(false);
    const [btHorizon, setBtHorizon] = useState<Horizon>(15);
    const [btOpen, setBtOpen] = useState(false);
    const btAbortRef = useRef<AbortController | null>(null);

    useEffect(() => {
        setBtData(null);
        setBtOpen(false);
        if (btAbortRef.current) { btAbortRef.current.abort(); btAbortRef.current = null; }
    }, [targetKeyword]);

    const runBacktest = () => {
        if (btAbortRef.current) btAbortRef.current.abort();
        const ctrl = new AbortController();
        btAbortRef.current = ctrl;
        setBtLoading(true);
        setBtData(null);
        fetch(`/api/backtest/${targetKeyword}?horizon=${btHorizon}&years=2`, { signal: ctrl.signal })
            .then(r => r.json()).then(d => { if (!d.error) setBtData(d); })
            .catch(e => { if (e?.name !== 'AbortError') setBtData(null); })
            .finally(() => setBtLoading(false));
    };

    return (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            {/* QUANT */}
            {quantMetrics && (
                <section id="quant" className="scroll-mt-20" data-animate>
                    <div className="flex items-center gap-3 mb-5">
                        <div className="w-6 h-6 rounded-lg bg-indigo-500/15 flex items-center justify-center border border-indigo-500/20">
                            <Bot className="w-3.5 h-3.5 text-indigo-400" />
                        </div>
                        <InlineExplain topic="quant_score"><span className="section-title">Quantitative Models</span></InlineExplain>
                        <div className="flex-1 h-px bg-gradient-to-r from-[#1a1a3a] to-transparent" />
                    </div>
                    <div className="card p-6 flex flex-col gap-2">
                        <ScoreBar label="Hurst Exponent" value={quantMetrics.hurst_exponent} variant={(quantMetrics.hurst_exponent||0)>0.5 ? 'bull' : 'gold'} thick />
                        <ScoreBar label="Kelly Allocation (%)" value={quantMetrics.kelly_fraction != null ? Math.max(-100, Math.min(100, quantMetrics.kelly_fraction * 100)) : null} variant={quantMetrics.kelly_fraction != null && quantMetrics.kelly_fraction < 0 ? 'bear' : 'gold'} thick />
                        <ScoreBar label="Granger p-value (x100)" value={quantMetrics.granger_p_value ? quantMetrics.granger_p_value*100 : null} variant={quantMetrics.granger_p_value < 0.05 ? 'bull' : 'bear'} thick />
                        <ScoreBar label="Sent ↔ Price ρ (x100)" value={quantMetrics.sentiment_price_corr ? quantMetrics.sentiment_price_corr*100 : null} variant="gold" thick />

                        <div className="mt-4 pt-4 border-t border-[#1a1a3a] grid grid-cols-2 gap-4">
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

                        {quantMetrics.trends_score != null && (
                            <div className="mt-4 pt-4 border-t border-[#1a1a3a]">
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
                                            <polyline points={pts} fill="none" stroke="#6366f1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                            <polyline points={`0,${H} ${pts} ${W},${H}`} fill="url(#trendsGrad)" stroke="none" />
                                            <defs>
                                                <linearGradient id="trendsGrad" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.25} />
                                                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
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
            )}

            {/* BACKTEST */}
            <section id="backtest" className="scroll-mt-20" data-animate>
                <div className="flex items-center gap-3 mb-5">
                    <div className="w-6 h-6 rounded-lg bg-amber-500/15 flex items-center justify-center border border-amber-500/20">
                        <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                    </div>
                    <span className="section-title">Signal Backtest</span>
                    <div className="flex-1 h-px bg-gradient-to-r from-[#1a1a3a] to-transparent" />
                    <button onClick={() => {
                        const opening = !btOpen;
                        setBtOpen(opening);
                        if (opening && !btData) runBacktest();
                    }} className="px-3 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] font-700 hover:bg-amber-500/20 transition-all">
                        {btOpen ? 'Collapse' : 'View Backtest'}
                    </button>
                </div>
                {btOpen && (
                    <div className="card p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="text-[11px] text-[#9090b8]">Horizon:</span>
                            {([15, 30, 90] as const).map(h => (
                                <button key={h} onClick={() => { setBtHorizon(h); setBtData(null); }}
                                    className={`px-2.5 py-1 rounded-lg text-[11px] font-700 transition-all ${
                                        btHorizon === h ? 'bg-amber-500/20 border border-amber-500/30 text-amber-300' : 'bg-[#0c0c24] border border-[#1e1e3a] text-[#5d5d8a] hover:text-[#9898c0]'
                                    }`}>{h}D</button>
                            ))}
                            <button onClick={runBacktest} disabled={btLoading}
                                className="ml-auto px-3 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[11px] font-700 hover:bg-indigo-500/20 transition-all">
                                {btLoading ? 'Loading…' : 'Run'}
                            </button>
                        </div>
                        {btLoading && !btData && (
                            <div className="h-48 flex items-center justify-center">
                                <div className="flex flex-col items-center gap-2">
                                    <div className="w-8 h-8 rounded-full border-2 border-amber-500/30 border-t-amber-400 animate-spin" />
                                    <span className="text-[12px] text-[#5d5d8a]">Running backtest…</span>
                                </div>
                            </div>
                        )}
                        {btData && (
                            <>
                                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-5">
                                    {[
                                        { label: 'Strategy',   value: `${btData.strategy_return_pct != null ? (btData.strategy_return_pct > 0 ? '+' : '') + btData.strategy_return_pct.toFixed(1) + '%' : '—'}`, color: (btData.strategy_return_pct ?? 0) > 0 ? 'text-emerald-400' : 'text-red-400' },
                                        { label: 'Buy & Hold', value: `${btData.benchmark_return_pct != null ? (btData.benchmark_return_pct > 0 ? '+' : '') + btData.benchmark_return_pct.toFixed(1) + '%' : '—'}`, color: (btData.benchmark_return_pct ?? 0) > 0 ? 'text-emerald-400' : 'text-red-400' },
                                        { label: 'Win Rate',   value: `${(btData.hit_rate * 100).toFixed(1)}%`,    color: btData.hit_rate > 0.55 ? 'text-emerald-400' : 'text-amber-400' },
                                        { label: 'Sharpe',     value: btData.sharpe_ratio?.toFixed(2),             color: btData.sharpe_ratio > 1 ? 'text-emerald-400' : 'text-amber-400' },
                                        { label: 'Max DD',     value: `${btData.max_drawdown_pct?.toFixed(1)}%`,   color: 'text-red-400' },
                                        { label: 'Alpha (SPY)', value: `${btData.alpha_vs_spy_pct != null ? (btData.alpha_vs_spy_pct > 0 ? '+' : '') + btData.alpha_vs_spy_pct.toFixed(1) + '%' : '—'}`, color: (btData.alpha_vs_spy_pct ?? 0) > 0 ? 'text-emerald-400' : 'text-red-400' },
                                    ].map(s => (
                                        <div key={s.label} className="bg-[#0c0c24] rounded-xl border border-[#1e1e3a] p-3 text-center">
                                            <div className="text-[10px] uppercase tracking-[0.08em] text-[#5d5d8a] mb-1">{s.label}</div>
                                            <div className={`font-mono text-[15px] font-700 ${s.color}`}>{s.value}</div>
                                        </div>
                                    ))}
                                </div>
                                <div className="h-52">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <ComposedChart data={btData.equity_curve} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="btGrad" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.3} />
                                                    <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <XAxis dataKey="date" hide />
                                            <YAxis domain={['auto', 'auto']} hide />
                                            <Tooltip content={<CustomTooltip />} />
                                            <ReferenceLine y={100} stroke="#2a2a5a" strokeDasharray="4 4" />
                                            <Area type="monotone" dataKey="equity" name="Strategy" stroke="#f59e0b" fill="url(#btGrad)" strokeWidth={1.5} dot={false} />
                                            <Line type="monotone" dataKey="buyhold" name="Buy & Hold" stroke="#0ecf8a" strokeWidth={1} strokeDasharray="3 3" dot={false} />
                                            <Line type="monotone" dataKey="spy" name="SPY" stroke="#6366f1" strokeWidth={1} strokeDasharray="5 3" dot={false} />
                                        </ComposedChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="flex justify-center gap-6 mt-2">
                                    <span className="flex items-center gap-1.5 text-[11px] text-[#9898c0]"><span className="w-3 h-0.5 bg-amber-400 inline-block rounded" /> Strategy</span>
                                    <span className="flex items-center gap-1.5 text-[11px] text-[#9898c0]"><span className="w-3 h-0.5 bg-emerald-400 inline-block rounded" style={{borderTop: '1px dashed #0ecf8a'}} /> Buy &amp; Hold</span>
                                    <span className="flex items-center gap-1.5 text-[11px] text-[#9898c0]"><span className="w-3 h-0.5 bg-indigo-400 inline-block rounded" style={{borderTop: '1px dashed #6366f1'}} /> SPY</span>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </section>

            {/* MACRO */}
            {macroIndicators && (
                <section id="macro" className="scroll-mt-20" data-animate>
                    <div className="flex items-center gap-3 mb-5">
                        <div className="w-6 h-6 rounded-lg bg-indigo-500/15 flex items-center justify-center border border-indigo-500/20">
                            <Globe className="w-3.5 h-3.5 text-indigo-400" />
                        </div>
                        <span className="section-title">Macro Environment</span>
                        <div className="flex-1 h-px bg-gradient-to-r from-[#1a1a3a] to-transparent" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Tile label="VIX Index" value={macroIndicators.vix?.toFixed(2) || '—'} variant={macroIndicators.vix > 30 ? 'bear' : macroIndicators.vix < 15 ? 'bull' : 'gold'} />
                        <Tile label="10Y Yield" value={macroIndicators.ten_year_yield ? `${macroIndicators.ten_year_yield.toFixed(2)}%` : '—'} variant="gold" />
                        <Tile label="Fear & Greed" value={macroIndicators.fear_greed_index?.toFixed(0) || '—'} variant={macroIndicators.fear_greed_index > 60 ? 'bull' : macroIndicators.fear_greed_index < 40 ? 'bear' : 'gold'} />
                        <Tile label="1M ETF Return" value={macroIndicators.sector_etf_momentum_1m ? `${(macroIndicators.sector_etf_momentum_1m*100).toFixed(1)}%` : '—'} variant={macroIndicators.sector_etf_momentum_1m >= 0 ? 'bull' : 'bear'} />
                    </div>

                    {(() => {
                        const cp = macroIndicators.cultural_profile ? (() => { try { return JSON.parse(macroIndicators.cultural_profile); } catch { return null; } })() : null;
                        if (!cp) return null;
                        const dims = [
                            { key: 'uai', label: 'Uncertainty Avoidance', color: '#f59e0b' },
                            { key: 'idv', label: 'Individualism', color: '#6366f1' },
                            { key: 'lto', label: 'Long-Term Orientation', color: '#0ecf8a' },
                            { key: 'pdi', label: 'Power Distance', color: '#f87171' },
                        ];
                        const implications = cp.implications ?? [];
                        return (
                            <div className="mt-4 rounded-xl border border-[#1e1e3a] bg-[#09091f] p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <Globe className="w-3.5 h-3.5 text-indigo-400" />
                                    <span className="text-[11px] font-700 tracking-[0.08em] uppercase text-[#9898c0]">Cultural Market Context · {cp.country}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 mb-3">
                                    {dims.map(d => (
                                        <div key={d.key}>
                                            <div className="flex justify-between text-[10px] text-[#8080aa] mb-1">
                                                <span>{d.label}</span><span className="font-mono">{cp[d.key]}</span>
                                            </div>
                                            <div className="h-1.5 rounded-full bg-[#12122e] overflow-hidden">
                                                <div className="h-full rounded-full transition-all" style={{ width: `${cp[d.key]}%`, background: d.color, opacity: 0.8 }} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                {implications.slice(1, 3).map((imp: string, i: number) => (
                                    <p key={i} className="text-[10px] text-[#8080aa] leading-relaxed mb-1">{imp}</p>
                                ))}
                            </div>
                        );
                    })()}
                </section>
            )}
        </div>
    );
}
