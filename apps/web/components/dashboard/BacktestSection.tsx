"use client";

import { useEffect, useRef, useState } from "react";
import { RotateCcw } from 'lucide-react';
import {
    Area, ComposedChart, Line, ReferenceLine, ResponsiveContainer,
    Tooltip, XAxis, YAxis,
} from 'recharts';
import { CustomTooltip } from './CustomTooltip';

// State lives inside the section — mount it with key={ticker} so switching
// ticker resets the panel automatically.
export function BacktestSection({ targetKeyword }: { targetKeyword: string }) {
    const [btData, setBtData] = useState<any>(null);
    const [btLoading, setBtLoading] = useState(false);
    const [btHorizon, setBtHorizon] = useState<15 | 30 | 90>(15);
    const [btOpen, setBtOpen] = useState(false);
    const abortRef = useRef<AbortController | null>(null);

    useEffect(() => () => abortRef.current?.abort(), []);

    const runBacktest = () => {
        if (abortRef.current) abortRef.current.abort();
        const ctrl = new AbortController();
        abortRef.current = ctrl;
        setBtLoading(true);
        fetch(`/api/backtest/${targetKeyword}?horizon=${btHorizon}&years=2`, { signal: ctrl.signal })
            .then(r => r.json()).then(d => { if (!d.error) setBtData(d); })
            .catch(e => { if (e?.name !== 'AbortError') setBtData(null); })
            .finally(() => setBtLoading(false));
    };

    return (
        <section id="backtest" className="scroll-mt-20" data-animate>
            <div className="flex items-center gap-3 mb-5">
                <div className="w-6 h-6 rounded-lg bg-amber-500/15 flex items-center justify-center border border-amber-500/20">
                    <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <span className="section-title">Signal Backtest</span>
                <div className="flex-1 h-px bg-gradient-to-r from-[#E5E1D5] to-transparent" />
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
                        <span className="text-[11px] text-[#7C7A6E]">Horizon:</span>
                        {([15, 30, 90] as const).map(h => (
                            <button key={h} onClick={() => { setBtHorizon(h); setBtData(null); }}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-700 transition-all ${
                                    btHorizon === h ? 'bg-amber-500/20 border border-amber-500/30 text-amber-300' : 'bg-[#FAF9F5] border border-[#E5E1D5] text-[#8F8C80] hover:text-[#6E6C60]'
                                }`}>{h}D</button>
                        ))}
                        <button onClick={() => { setBtData(null); runBacktest(); }} disabled={btLoading}
                            className="ml-auto px-3 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[11px] font-700 hover:bg-indigo-500/20 transition-all">
                            {btLoading ? 'Loading…' : 'Run'}
                        </button>
                    </div>
                    {btLoading && !btData && (
                        <div className="h-48 flex items-center justify-center">
                            <div className="flex flex-col items-center gap-2">
                                <div className="w-8 h-8 rounded-full border-2 border-amber-500/30 border-t-amber-400 animate-spin" />
                                <span className="text-[12px] text-[#8F8C80]">Running backtest…</span>
                            </div>
                        </div>
                    )}
                    {btData && (
                        <>
                            <div className="grid grid-cols-4 gap-3 mb-5">
                                {[
                                    { label: 'Win Rate',   value: `${(btData.hit_rate * 100).toFixed(1)}%`,    color: btData.hit_rate > 0.55 ? 'text-emerald-400' : 'text-amber-400' },
                                    { label: 'Avg Return', value: `${btData.avg_return_pct?.toFixed(2)}%`,     color: btData.avg_return_pct > 0 ? 'text-emerald-400' : 'text-red-400' },
                                    { label: 'Sharpe',     value: btData.sharpe_ratio?.toFixed(2),             color: btData.sharpe_ratio > 1 ? 'text-emerald-400' : 'text-amber-400' },
                                    { label: 'Max DD',     value: `${btData.max_drawdown_pct?.toFixed(1)}%`,   color: 'text-red-400' },
                                ].map(s => (
                                    <div key={s.label} className="bg-[#FAF9F5] rounded-xl border border-[#E5E1D5] p-3 text-center">
                                        <div className="text-[10px] uppercase tracking-[0.08em] text-[#8F8C80] mb-1">{s.label}</div>
                                        <div className={`font-mono text-[15px] font-700 ${s.color}`}>{s.value}</div>
                                    </div>
                                ))}
                            </div>
                            <div className="h-52">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={btData.equity_curve} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="btGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#C96442" stopOpacity={0.3} />
                                                <stop offset="100%" stopColor="#C96442" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <XAxis dataKey="date" hide />
                                        <YAxis domain={['auto', 'auto']} hide />
                                        <Tooltip content={<CustomTooltip />} />
                                        <ReferenceLine y={100} stroke="#D5CFBE" strokeDasharray="4 4" />
                                        <Area type="monotone" dataKey="equity" name="Strategy" stroke="#C96442" fill="url(#btGrad)" strokeWidth={1.5} dot={false} />
                                        <Line type="monotone" dataKey="spy" name="SPY" stroke="#5F7BA6" strokeWidth={1} strokeDasharray="5 3" dot={false} />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="flex justify-center gap-6 mt-2">
                                <span className="flex items-center gap-1.5 text-[11px] text-[#6E6C60]"><span className="w-3 h-0.5 bg-amber-400 inline-block rounded" /> Strategy</span>
                                <span className="flex items-center gap-1.5 text-[11px] text-[#6E6C60]"><span className="w-3 h-0.5 bg-indigo-400 inline-block rounded" style={{borderTop: '1px dashed #5F7BA6'}} /> SPY Benchmark</span>
                            </div>
                        </>
                    )}
                </div>
            )}
        </section>
    );
}
