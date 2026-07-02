"use client";

import { Zap } from 'lucide-react';
import { InlineExplain } from '../ExplainTooltip';

export function SqueezeSection({ squeezeData }: { squeezeData: any }) {
    return (
        <section id="squeeze" className="scroll-mt-20" data-animate>
            <div className="flex items-center gap-3 mb-5">
                <div className="w-6 h-6 rounded-lg bg-red-500/15 flex items-center justify-center border border-red-500/20">
                    <Zap className="w-3.5 h-3.5 text-red-400" />
                </div>
                <InlineExplain topic="squeeze"><span className="section-title">Short Squeeze Pressure</span></InlineExplain>
                <div className="flex-1 h-px bg-gradient-to-r from-[#3A3833] to-transparent" />
                <span className={`px-3 py-1 rounded-lg text-[11px] font-700 border ${
                    squeezeData.level === 'EXTREME' ? 'bg-red-500/20 border-red-500/40 text-red-300' :
                    squeezeData.level === 'HIGH'    ? 'bg-orange-500/20 border-orange-500/40 text-orange-300' :
                    squeezeData.level === 'MODERATE'? 'bg-amber-500/20 border-amber-500/40 text-amber-300' :
                    'bg-[#262624] border-[#3A3833] text-[#8F8C80]'
                }`}>{squeezeData.level}</span>
            </div>
            <div className="card p-5">
                <div className="flex items-center gap-6 mb-4">
                    <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-[11px] text-[#8F8C80]">Pressure</span>
                            <span className="font-mono text-[13px] font-700 text-red-400">{squeezeData.pressure_score?.toFixed(1)}/100</span>
                        </div>
                        <div className="h-2 rounded-full bg-[#33312C] border border-[#3A3833]">
                            <div className="h-full rounded-full transition-all" style={{
                                width: `${squeezeData.pressure_score}%`,
                                background: squeezeData.pressure_score >= 70 ? '#D9776B' : squeezeData.pressure_score >= 50 ? '#DB8A5C' : squeezeData.pressure_score >= 30 ? '#D97757' : '#8F8C80'
                            }} />
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                    <div className="bg-[#262624] rounded-xl border border-[#3A3833] p-3 text-center">
                        <div className="text-[10px] uppercase tracking-[0.08em] text-[#8F8C80] mb-1">Short Float</div>
                        <div className="font-mono text-[14px] font-700 text-red-400">{squeezeData.short_float_pct?.toFixed(1)}%</div>
                    </div>
                    <div className="bg-[#262624] rounded-xl border border-[#3A3833] p-3 text-center">
                        <div className="text-[10px] uppercase tracking-[0.08em] text-[#8F8C80] mb-1">Days to Cover</div>
                        <div className="font-mono text-[14px] font-700 text-amber-400">{squeezeData.days_to_cover?.toFixed(1) ?? '—'}</div>
                    </div>
                    <div className="bg-[#262624] rounded-xl border border-[#3A3833] p-3 text-center">
                        <div className="text-[10px] uppercase tracking-[0.08em] text-[#8F8C80] mb-1">Shares Short</div>
                        <div className="font-mono text-[14px] font-700 text-[#A6A296]">{squeezeData.shares_short ? `${(squeezeData.shares_short / 1e6).toFixed(1)}M` : '—'}</div>
                    </div>
                </div>
            </div>
        </section>
    );
}
