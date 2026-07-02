"use client";

import { Briefcase } from 'lucide-react';

const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

export interface InsiderStats {
    buyVolume: number;
    sellVolume: number;
    netVolume: number;
    chartData: { month: string; buy: number; sell: number }[];
    filteredTrades: any[];
}

export function InsiderSection({ insiderStats, tradeFilter, setTradeFilter }: {
    insiderStats: InsiderStats;
    tradeFilter: 'all' | 'buy' | 'sell';
    setTradeFilter: (f: 'all' | 'buy' | 'sell') => void;
}) {
    return (
        <section id="insider" className="col-span-12 scroll-mt-20" data-animate>
            <div className="flex items-center gap-3 mb-5">
                <div className="w-6 h-6 rounded-lg bg-indigo-500/15 flex items-center justify-center border border-indigo-500/20">
                    <Briefcase className="w-3.5 h-3.5 text-indigo-400" />
                </div>
                <span className="section-title">Insider Flow</span>
                <div className="flex-1 h-px bg-gradient-to-r from-[#1a1a3a] to-transparent" />
            </div>

            <div className="bg-[#0d0d24] rounded-2xl border border-[#1e1e42] overflow-hidden shadow-card" data-animate-child>
                <div className="px-6 py-4 flex items-center justify-between border-b border-[#1a1a3a] bg-[#08081a]">
                    <h3 className="section-title">Recent Transactions</h3>
                    <div className="flex gap-2">
                        {(['all', 'buy', 'sell'] as const).map((f) => (
                            <button key={f} onClick={() => setTradeFilter(f)}
                                className={`px-4 py-1.5 text-[11px] font-600 rounded-lg uppercase tracking-wider transition-all ${tradeFilter === f ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30' : 'text-[#8080aa] hover:text-[#9898c0] border border-transparent'}`}>
                                {f}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left data-table">
                        <thead className="bg-[#0a0b12] border-b border-[#1a1a3a]">
                            <tr>
                                <th className="px-6 py-3 text-[11px] font-700 tracking-[0.08em] uppercase text-[#9898c0]">Insider</th>
                                <th className="px-6 py-3 text-[11px] font-700 tracking-[0.08em] uppercase text-[#9898c0]">Type</th>
                                <th className="px-6 py-3 text-[11px] font-700 tracking-[0.08em] uppercase text-[#9898c0] text-right">Shares</th>
                                <th className="px-6 py-3 text-[11px] font-700 tracking-[0.08em] uppercase text-[#9898c0] text-right">Value</th>
                                <th className="px-6 py-3 text-[11px] font-700 tracking-[0.08em] uppercase text-[#9898c0]">Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.04]">
                            {insiderStats.filteredTrades.slice(0, 10).map((trade: any, idx: number) => {
                                const isBuy = trade.transaction?.toLowerCase().includes('buy') || trade.transaction?.toLowerCase().includes('purchase');
                                return (
                                    <tr key={trade.id} className={idx % 2 === 0 ? 'bg-[#0d0d24]' : 'bg-[#0a0b10]'}>
                                        <td className="px-6 py-4">
                                            <div className="text-[#e2e8f0] font-500 text-[13px]">{trade.insider_name}</div>
                                            <div className="text-[11px] text-[#9090b8] truncate max-w-[200px] mt-0.5">{trade.position || '—'}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`badge ${isBuy ? 'badge-bull' : 'badge-bear'}`}>{trade.transaction}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right font-mono text-[13px] font-600 text-[#9898c0]">
                                            {trade.shares?.toLocaleString() || '—'}
                                        </td>
                                        <td className="px-6 py-4 text-right font-mono text-[13px] font-600 text-[#fcd97a]">
                                            {trade.value ? fmt.format(trade.value) : '—'}
                                        </td>
                                        <td className="px-6 py-4 font-mono text-[12px] text-[#9898c0]">
                                            {new Date(trade.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
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
