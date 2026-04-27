"use client";

import { Calendar } from 'lucide-react';

interface PredictionHistoryProps {
    predictionHistory: any[];
    auditStats: any;
}

export default function PredictionHistory({ predictionHistory, auditStats }: PredictionHistoryProps) {
    if (!predictionHistory?.length) return null;
    return (
        <section id="predictions" className="col-span-12 scroll-mt-20" data-animate>
            <div className="flex items-center gap-3 mb-5">
                <div className="w-6 h-6 rounded-lg bg-indigo-500/15 flex items-center justify-center border border-indigo-500/20">
                    <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                </div>
                <span className="section-title">Prediction Audit Trail</span>
                <div className="flex-1 h-px bg-gradient-to-r from-[#1a1a3a] to-transparent" />
                <span className="badge badge-gold">25 Most Recent</span>
            </div>

            {auditStats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
                    <div className="card p-4 flex flex-col gap-1" data-animate-child>
                        <div className="section-title">Hit Rate</div>
                        <div className={`font-mono text-[28px] font-700 ${(auditStats.hitRate ?? 0) > 0.6 ? 'text-emerald-400' : (auditStats.hitRate ?? 0) < 0.4 ? 'text-red-400' : 'text-amber-400'}`}>
                            {auditStats.hitRate != null ? `${(auditStats.hitRate * 100).toFixed(0)}%` : '—'}
                        </div>
                        <div className="text-[11px] text-[#9090b8]">correct predictions</div>
                    </div>
                    <div className="card p-4 flex flex-col gap-1" data-animate-child>
                        <div className="section-title">Avg Return</div>
                        <div className={`font-mono text-[28px] font-700 ${(auditStats.avgReturn ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {auditStats.avgReturn != null ? `${(auditStats.avgReturn * 100).toFixed(2)}%` : '—'}
                        </div>
                        <div className="text-[11px] text-[#9090b8]">per 15-day trade</div>
                    </div>
                    <div className="card p-4 flex flex-col gap-1" data-animate-child>
                        <div className="section-title">Max Drawdown</div>
                        <div className="font-mono text-[28px] font-700 text-red-400">
                            {auditStats.maxDrawdown != null ? `${(auditStats.maxDrawdown * 100).toFixed(2)}%` : '—'}
                        </div>
                        <div className="text-[11px] text-[#9090b8]">worst single outcome</div>
                    </div>
                    <div className="card p-4 flex flex-col gap-1" data-animate-child>
                        <div className="section-title">Signal Sharpe</div>
                        <div className={`font-mono text-[28px] font-700 ${(auditStats.sharpe ?? 0) > 1 ? 'text-emerald-400' : (auditStats.sharpe ?? 0) < 0 ? 'text-red-400' : 'text-amber-400'}`}>
                            {auditStats.sharpe != null ? auditStats.sharpe.toFixed(2) : '—'}
                        </div>
                        <div className="text-[11px] text-[#9090b8]">return / volatility</div>
                    </div>
                </div>
            )}

            <div className="bg-[#0d0d24] rounded-2xl border border-[#1e1e42] overflow-hidden shadow-card" data-animate-child>
                <div className="overflow-x-auto">
                    <table className="w-full text-left data-table">
                        <thead className="bg-[#0a0b12] border-b border-[#1a1a3a]">
                            <tr>
                                <th className="px-6 py-3 text-[11px] font-700 tracking-[0.08em] uppercase text-[#9898c0]">Date</th>
                                <th className="px-6 py-3 text-[11px] font-700 tracking-[0.08em] uppercase text-[#9898c0]">Signal</th>
                                <th className="px-6 py-3 text-[11px] font-700 tracking-[0.08em] uppercase text-[#9898c0]">Horizon</th>
                                <th className="px-6 py-3 text-[11px] font-700 tracking-[0.08em] uppercase text-[#9898c0] text-right">Score</th>
                                <th className="px-6 py-3 text-[11px] font-700 tracking-[0.08em] uppercase text-[#9898c0] text-right">Entry</th>
                                <th className="px-6 py-3 text-[11px] font-700 tracking-[0.08em] uppercase text-[#9898c0] text-right">Exit</th>
                                <th className="px-6 py-3 text-[11px] font-700 tracking-[0.08em] uppercase text-[#9898c0] text-right">Return</th>
                                <th className="px-6 py-3 text-[11px] font-700 tracking-[0.08em] uppercase text-[#9898c0]">Outcome</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.04]">
                            {predictionHistory.map((pred: any, idx: number) => {
                                const ret = pred.price_at_signal && pred.price_15d_later
                                    ? (pred.price_15d_later - pred.price_at_signal) / pred.price_at_signal
                                    : null;
                                const isBull = pred.signal === 'STRONG_BUY' || pred.signal === 'BUY';
                                const isBear = pred.signal === 'STRONG_SELL' || pred.signal === 'SELL';
                                return (
                                    <tr key={pred.id} className={idx % 2 === 0 ? 'bg-[#0d0d24]' : 'bg-[#0a0b10]'}>
                                        <td className="px-6 py-4 font-mono text-[12px] text-[#9898c0]">
                                            {new Date(pred.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`badge ${isBull ? 'badge-bull' : isBear ? 'badge-bear' : 'badge-hold'}`}>{pred.signal.replace('_', ' ')}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="font-mono text-[11px] text-[#9090b8] border border-[#1a1a3a] px-2 py-0.5 rounded">{pred.horizon ?? 15}d</span>
                                        </td>
                                        <td className="px-6 py-4 text-right font-mono text-[13px] font-600 text-[#9898c0]">
                                            {pred.composite_score?.toFixed(1) ?? '—'}
                                        </td>
                                        <td className="px-6 py-4 text-right font-mono text-[13px] font-600 text-[#e2e8f0]">
                                            {pred.price_at_signal ? `$${pred.price_at_signal.toFixed(2)}` : '—'}
                                        </td>
                                        <td className="px-6 py-4 text-right font-mono text-[13px] font-600 text-[#e2e8f0]">
                                            {pred.price_15d_later ? `$${pred.price_15d_later.toFixed(2)}` : '—'}
                                        </td>
                                        <td className="px-6 py-4 text-right font-mono text-[13px] font-700">
                                            {ret != null ? (
                                                <span className={ret >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                                                    {ret >= 0 ? '+' : ''}{(ret * 100).toFixed(2)}%
                                                </span>
                                            ) : '—'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`badge ${pred.outcome === 'CORRECT' ? 'badge-bull' : pred.outcome === 'INCORRECT' ? 'badge-bear' : 'badge-hold'}`}>
                                                {pred.outcome ?? 'PENDING'}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </section>
    );
}
