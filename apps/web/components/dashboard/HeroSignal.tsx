"use client";

import { Hexagon } from 'lucide-react';
import { ExplainTooltip } from '../ExplainTooltip';
import ScoreWeightsPanel from '../ScoreWeightsPanel';
import { ConfidenceGauge } from './shared';
import { getSignal } from './utils';
import type { Horizon, SignalStyle } from './types';

interface HeroSignalProps {
    recommendationScore: any;
    recommendationScores: { h15: any; h30: any; h90: any } | null;
    selectedHorizon: Horizon;
    setSelectedHorizon: (h: Horizon) => void;
    derivedSignal: string | null;
    sig: SignalStyle;
    targetKeyword: string;
    fundamentalData: any;
    predictionAccuracy: number | null;
    predictionCount: number;
    scoreHistory: any[];
    activeRec: any;
    loading: boolean;
    triggerScrape: (kw?: string) => void;
}

export default function HeroSignal({
    recommendationScore, recommendationScores, selectedHorizon, setSelectedHorizon,
    derivedSignal, sig, targetKeyword, fundamentalData, predictionAccuracy,
    predictionCount, scoreHistory, activeRec, loading, triggerScrape,
}: HeroSignalProps) {

    if (!recommendationScore && !loading) {
        return (
            <div className="col-span-12 h-[60vh] flex flex-col items-center justify-center relative overflown-hidden">
                <div className="absolute inset-0 flex items-center justify-center opacity-[0.04] blur-[100px] pointer-events-none">
                    <div className="w-[600px] h-[600px] bg-indigo-500 rounded-full animate-orbit" />
                </div>
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-6 shadow-[0_0_60px_rgba(99,102,241,0.5)]">
                    <Hexagon className="w-10 h-10 text-white" />
                </div>
                <h1 className="font-display text-[42px] font-800 tracking-tight text-white mb-2">Intelligence Awaits.</h1>
                <p className="text-[#9898c0] text-[15px] mb-8 max-w-md text-center">Press <kbd className="px-2 py-1 mx-1 rounded bg-[#12122e] border border-[#1a1a3a] text-xs font-mono">⌘K</kbd> or use the search bar to scan a ticker and generate a precision audit.</p>
                <div className="flex gap-3">
                    {['AAPL', 'NVDA', 'TSLA'].map(t => (
                        <button key={t} onClick={() => triggerScrape(t)} className="px-5 py-2.5 rounded-xl border border-[#1e1e42] bg-[#0d0d24] hover:border-indigo-500/50 hover:bg-slate-800 transition-all font-mono font-600 text-sm hover:shadow-[0_0_20px_rgba(99,102,241,0.2)] text-white">
                            {t}
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    if (!recommendationScore) return null;

    return (
        <>
            <section id="hero" className={`col-span-12 rounded-[20px] overflow-hidden relative min-h-[280px] xl:min-h-[320px] bg-gradient-to-br border border-[#1e1e42] shadow-[0_20px_60px_rgba(0,0,0,0.6)] animate-in transition-all duration-500 ${sig.bgHero}`}
                     style={{backgroundImage: `linear-gradient(to bottom right, var(--tw-gradient-stops))`}}>

                <div className="absolute top-0 left-0 w-full h-full bg-[url('/noise.svg')] opacity-[0.03] pointer-events-none mix-blend-overlay" />

                <div className="grid grid-cols-1 md:grid-cols-2 h-full">
                    {/* Left Col */}
                    <div className="p-8 xl:p-10 flex flex-col justify-center gap-4 relative z-10">
                        <div className="flex items-center gap-3">
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] font-mono text-[13px] font-700 tracking-[0.15em] text-white backdrop-blur-md shadow-lg">
                                <div className="status-live" />
                                {targetKeyword.toUpperCase()}
                            </div>
                            <span className="badge bg-[#12122e] border border-[#1a1a3a] text-[#9898c0]">EQT</span>
                        </div>
                        <div className="text-[15px] text-[#9898c0] font-500 mt-2">Composite Signal Target</div>

                        {recommendationScores && (
                            <div className="flex items-center gap-3 mt-1 flex-wrap">
                                <div className="flex items-center gap-1.5">
                                    {([15, 30, 90] as const).map(h => (
                                        <button key={h} onClick={() => setSelectedHorizon(h)}
                                            className={`px-3 py-1 rounded-lg text-[11px] font-700 tracking-[0.08em] border transition-all ${selectedHorizon === h ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300' : 'bg-transparent border-white/10 text-[#8080aa] hover:border-white/20 hover:text-[#9898c0]'}`}
                                        >{h}D</button>
                                    ))}
                                </div>
                                <div className="flex items-center gap-2 text-[10px] font-mono text-[#8080aa]">
                                    {(['h15', 'h30', 'h90'] as const).map((k, i) => {
                                        const r = recommendationScores[k];
                                        const s = getSignal(r?.signal);
                                        return r ? (
                                            <span key={k} className="flex items-center gap-1">
                                                <span className="text-[#3d3d6a]">{[15,30,90][i]}d</span>
                                                <span style={{ color: s.shadow.replace('0.5)', '1)').replace('0.6)', '1)') }}>{r.composite_score?.toFixed(0)}</span>
                                            </span>
                                        ) : null;
                                    })}
                                </div>
                            </div>
                        )}

                        <div className={`font-display text-[64px] xl:text-[80px] font-800 leading-[0.9] tracking-[-0.04em] bg-gradient-to-r ${sig.from} ${sig.to} bg-clip-text text-transparent animate-hero-enter`}
                             style={{textShadow: `0 0 40px ${sig.shadow}`}}>
                            {sig.word}
                        </div>
                        <div className="text-[12px] font-600 tracking-[0.12em] uppercase text-[#9898c0] mt-1">{selectedHorizon}-Day Outlook</div>

                        <div className="flex items-center gap-4 mt-2">
                            <span className="badge badge-gold">Score: {activeRec?.composite_score?.toFixed(1)}/100 · {selectedHorizon}d</span>
                            {predictionCount > 0 && predictionAccuracy != null && (
                                <span className="font-mono text-[12px] text-[#9898c0]">Model Acc: {(predictionAccuracy * 100).toFixed(1)}%</span>
                            )}
                        </div>
                        {activeRec?.narrative && (
                            <p className="text-[13px] leading-[1.7] text-[#9898c0] mt-2 max-w-[480px] italic border-l-2 border-white/10 pl-3">
                                {activeRec.narrative}
                            </p>
                        )}
                    </div>

                    {/* Right Col */}
                    <div className="p-8 xl:p-10 border-t md:border-t-0 md:border-l border-white/[0.06] flex flex-col gap-6 relative z-10 bg-black/10 backdrop-blur-sm">
                        <div className="grid grid-cols-3 gap-4">
                            <div className="bg-black/40 backdrop-blur-md rounded-xl p-4 border border-white/[0.08] flex flex-col justify-center">
                                <div className="text-[10px] tracking-[0.12em] uppercase text-[#9898c0] mb-1 font-600">Price</div>
                                <div className="text-[15px] font-700 text-white font-mono tracking-tight">${fundamentalData?.current_price?.toFixed(2) || '—'}</div>
                            </div>
                            <div className="bg-black/40 backdrop-blur-md rounded-xl p-4 border border-white/[0.08] flex flex-col justify-center">
                                <div className="text-[10px] tracking-[0.12em] uppercase text-[#9898c0] mb-1 font-600">P/E Ratio</div>
                                <div className="text-[15px] font-700 text-white font-mono tracking-tight">{fundamentalData?.pe_ratio?.toFixed(1) || '—'}</div>
                            </div>
                            <div className="bg-black/40 backdrop-blur-md rounded-xl p-4 border border-white/[0.08] flex flex-col justify-center">
                                <div className="text-[10px] tracking-[0.12em] uppercase text-[#9898c0] mb-1 font-600">Mkt Cap</div>
                                <div className="text-[15px] font-700 text-white font-mono tracking-tight">{fundamentalData?.market_cap ? `${(Number(fundamentalData.market_cap)/1e9).toFixed(1)}B` : '—'}</div>
                            </div>
                        </div>

                        {activeRec?.recommended_price != null && (
                            <div className="bg-black/40 backdrop-blur-md rounded-xl p-4 border border-white/[0.08]">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="text-[10px] tracking-[0.12em] uppercase text-[#9898c0] font-600">
                                        Recommended Price ({selectedHorizon}d)
                                    </div>
                                    {activeRec.price_method && (
                                        <span className="text-[9px] text-[#5d5d8a] font-mono">{activeRec.price_method}</span>
                                    )}
                                </div>
                                <div className="flex items-baseline gap-3">
                                    <span className="text-[22px] font-800 font-mono tracking-tight" style={{
                                        color: activeRec.recommended_price > (fundamentalData?.current_price ?? 0) ? '#0ecf8a' : activeRec.recommended_price < (fundamentalData?.current_price ?? 0) ? '#f5495a' : '#fcd97a'
                                    }}>
                                        ${activeRec.recommended_price.toFixed(2)}
                                    </span>
                                    {fundamentalData?.current_price != null && fundamentalData.current_price > 0 && (
                                        <span className="text-[12px] font-mono" style={{
                                            color: activeRec.recommended_price > fundamentalData.current_price ? '#0ecf8a' : '#f5495a'
                                        }}>
                                            {activeRec.recommended_price > fundamentalData.current_price ? '+' : ''}
                                            {(((activeRec.recommended_price - fundamentalData.current_price) / fundamentalData.current_price) * 100).toFixed(1)}%
                                        </span>
                                    )}
                                </div>
                                {activeRec.price_target_low != null && activeRec.price_target_high != null && (
                                    <div className="mt-2">
                                        <div className="flex items-center justify-between text-[10px] text-[#7878a0] font-mono mb-1">
                                            <span>${activeRec.price_target_low.toFixed(2)}</span>
                                            <span>Range</span>
                                            <span>${activeRec.price_target_high.toFixed(2)}</span>
                                        </div>
                                        <div className="relative h-[6px] rounded-full bg-[#12122e] overflow-hidden">
                                            {(() => {
                                                const lo = activeRec.price_target_low;
                                                const hi = activeRec.price_target_high;
                                                const cur = fundamentalData?.current_price ?? lo;
                                                const range = hi - lo;
                                                if (range <= 0) return null;
                                                const pct = Math.max(0, Math.min(100, ((cur - lo) / range) * 100));
                                                const tgtPct = Math.max(0, Math.min(100, ((activeRec.recommended_price - lo) / range) * 100));
                                                return (<>
                                                    <div className="absolute h-full rounded-full bg-gradient-to-r from-red-500/40 via-amber-500/40 to-emerald-500/40" style={{ left: 0, right: 0 }} />
                                                    <div className="absolute top-[-2px] w-[2px] h-[10px] bg-white/70 rounded-full" style={{ left: `${pct}%` }} title={`Current: $${cur.toFixed(2)}`} />
                                                    <div className="absolute top-[-2px] w-[3px] h-[10px] rounded-full" style={{ left: `${tgtPct}%`, background: '#fcd97a' }} title={`Target: $${activeRec.recommended_price.toFixed(2)}`} />
                                                </>);
                                            })()}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="flex-1 flex items-center justify-center">
                            {activeRec?.confidence != null && (
                                <ConfidenceGauge value={activeRec.confidence * 100} colors={sig.gauge} />
                            )}
                        </div>

                        {scoreHistory?.length > 1 && (() => {
                            const scores = scoreHistory.map((h: any) => h.score).filter(Boolean);
                            const min = Math.min(...scores), max = Math.max(...scores);
                            const range = max - min || 1;
                            const W = 200, H = 32;
                            const pts = scores.map((s: number, i: number) =>
                                `${(i / (scores.length - 1)) * W},${H - ((s - min) / range) * H}`
                            ).join(' ');
                            const last = scores[scores.length - 1];
                            const prev = scores[scores.length - 2];
                            const trend = last > prev ? '#0ecf8a' : last < prev ? '#f5495a' : '#f59e0b';
                            return (
                                <div className="border-t border-white/[0.06] pt-3">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[10px] uppercase tracking-[0.08em] text-[#5d5d8a]">Score History</span>
                                        <ExplainTooltip topic="composite_score" />
                                    </div>
                                    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-8 overflow-visible">
                                        <defs>
                                            <linearGradient id="scoreHistGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor={trend} stopOpacity={0.2} />
                                                <stop offset="100%" stopColor={trend} stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <polyline points={pts} fill="none" stroke={trend} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                            );
                        })()}
                    </div>
                </div>
            </section>

            {(activeRec || recommendationScore) && (
                <ScoreWeightsPanel
                    scores={{
                        sentiment: (activeRec ?? recommendationScore).sentiment_score,
                        technical: (activeRec ?? recommendationScore).technical_score,
                        fundamental: (activeRec ?? recommendationScore).fundamental_score,
                        quant: (activeRec ?? recommendationScore).quant_score,
                        insider: (activeRec ?? recommendationScore).insider_score,
                        macro: (activeRec ?? recommendationScore).macro_score,
                        risk: (activeRec ?? recommendationScore).risk_score,
                    }}
                    baseComposite={(activeRec ?? recommendationScore).composite_score}
                />
            )}
        </>
    );
}
