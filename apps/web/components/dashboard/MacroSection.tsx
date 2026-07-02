"use client";

import { Globe } from 'lucide-react';
import { Tile } from './Tile';

export function MacroSection({ macroIndicators }: { macroIndicators: any }) {
    const cp = macroIndicators.cultural_profile ? (() => { try { return JSON.parse(macroIndicators.cultural_profile); } catch { return null; } })() : null;
    const dims = [
        { key: 'uai', label: 'Uncertainty Avoidance', color: '#f59e0b' },
        { key: 'idv', label: 'Individualism', color: '#6366f1' },
        { key: 'lto', label: 'Long-Term Orientation', color: '#0ecf8a' },
        { key: 'pdi', label: 'Power Distance', color: '#f87171' },
    ];
    const implications: string[] = cp?.implications ?? [];

    return (
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

            {/* V2: Cultural Context Card */}
            {cp && (
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
            )}
        </section>
    );
}
