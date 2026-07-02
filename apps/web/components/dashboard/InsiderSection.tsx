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
                <div className="flex-1 h-px bg-gradient-to-r from-[#3A3833] to-transparent" />
            </div>

            <div className="bg-[#2A2927] rounded-2xl border border-[#43413A] overflow-hidden shadow-card" data-animate-child>
                <div className="px-6 py-4 flex items-center justify-between border-b border-[#3A3833] bg-[#262624]">
                    <h3 className="section-title">Recent Transactions</h3>
                    <div className="flex gap-2">
                        {(['all', 'buy', 'sell'] as const).map((f) => (
                            <button key={f} onClick={() => setTradeFilter(f)}
                                className={`px-4 py-1.5 text-[11px] font-600 rounded-lg uppercase tracking-wider transition-all ${tradeFilter === f ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30' : 'text-[#9B9789] hover:text-[#A6A296] border border-transparent'}`}>
                                {f}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left data-table">
                        <thead className="bg-[#242320] border-b border-[#3A3833]">
                            <tr>
                                <th className="px-6 py-3 text-[11px] font-700 tracking-[0.08em] uppercase text-[#A6A296]">Insider</th>
                                <th className="px-6 py-3 text-[11px] font-700 tracking-[0.08em] uppercase text-[#A6A296]">Type</th>
                                <th className="px-6 py-3 text-[11px] font-700 tracking-[0.08em] uppercase text-[#A6A296] text-right">Shares</th>
                                <th className="px-6 py-3 text-[11px] font-700 tracking-[0.08em] uppercase text-[#A6A296] text-right">Value</th>
                                <th className="px-6 py-3 text-[11px] font-700 tracking-[0.08em] uppercase text-[#A6A296]">Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.06]">
                            {insiderStats.filteredTrades.slice(0, 10).map((trade: any, idx: number) => {
                                const isBuy = trade.transaction?.toLowerCase().includes('buy') || trade.transaction?.toLowerCase().includes('purchase');
                                return (
                                    <tr key={trade.id} className={idx % 2 === 0 ? 'bg-[#2A2927]' : 'bg-[#262523]'}>
                                        <td className="px-6 py-4">
                                            <div className="text-[#E5E2D8] font-500 text-[13px]">{trade.insider_name}</div>
                                            <div className="text-[11px] text-[#9B9789] truncate max-w-[200px] mt-0.5">{trade.position || '—'}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`badge ${isBuy ? 'badge-bull' : 'badge-bear'}`}>{trade.transaction}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right font-mono text-[13px] font-600 text-[#A6A296]">
                                            {trade.shares?.toLocaleString() || '—'}
                                        </td>
                                        <td className="px-6 py-4 text-right font-mono text-[13px] font-600 text-[#E0906F]">
                                            {trade.value ? fmt.format(trade.value) : '—'}
                                        </td>
                                        <td className="px-6 py-4 font-mono text-[12px] text-[#A6A296]">
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
