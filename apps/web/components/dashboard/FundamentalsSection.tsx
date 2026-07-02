"use client";

import { AlertTriangle, Award, ChevronDown, ChevronUp, DollarSign, Target } from 'lucide-react';
import { InlineExplain } from '../ExplainTooltip';
import { Tile } from './Tile';

export function FundamentalsSection({ fundamentalData, crossListingData }: { fundamentalData: any; crossListingData: any }) {
    return (
        <section id="fundamentals" className="col-span-12 scroll-mt-20" data-animate>
            <div className="flex items-center gap-3 mb-5">
                <div className="w-6 h-6 rounded-lg bg-indigo-500/15 flex items-center justify-center border border-indigo-500/20">
                    <DollarSign className="w-3.5 h-3.5 text-indigo-400" />
                </div>
                <InlineExplain topic="fundamental_score"><span className="section-title">Fundamental Data</span></InlineExplain>
                <div className="flex-1 h-px bg-gradient-to-r from-[#E5E1D5] to-transparent" />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-4 xl:gap-5 mb-5">
                <Tile label="Price Target" value={fundamentalData.target_price ? `$${fundamentalData.target_price.toFixed(2)}` : '—'} variant="gold" icon={Target} />
                <Tile label="52W High" value={fundamentalData.high_52_week ? `$${fundamentalData.high_52_week.toFixed(2)}` : '—'} variant="bull" icon={ChevronUp} />
                <Tile label="52W Low" value={fundamentalData.low_52_week ? `$${fundamentalData.low_52_week.toFixed(2)}` : '—'} variant="bear" icon={ChevronDown} />
                <Tile label="Analyst View" value={fundamentalData.recommendation || '—'} variant={fundamentalData.recommendation?.includes('buy') ? 'bull' : 'gold'} icon={Award} />

                {fundamentalData.target_low_price && fundamentalData.target_high_price && (
                    <div className="col-span-2 card p-5 flex flex-col justify-center relative overflow-hidden group" data-animate-child>
                        <div className="section-title mb-4">Analyst Target Range</div>
                        <div className="flex items-center gap-4">
                            <span className="font-mono text-[13px] text-[#6E6C60]">${fundamentalData.target_low_price.toFixed(2)}</span>
                            <div className="flex-1 h-2 rounded-full bg-[#EFECE1] relative border border-[#E5E1D5]">
                                <div className="absolute top-0 bottom-0 left-1/4 right-1/4 bg-indigo-500/20 rounded-full" />
                                {fundamentalData.target_price && fundamentalData.current_price && (
                                    <>
                                        {/* Mean line */}
                                        <div className="absolute top-[-4px] bottom-[-4px] w-0.5 bg-indigo-400 shadow-[0_0_10px_rgba(95,123,166,0.5)] z-10"
                                             style={{left: `${(fundamentalData.target_price - fundamentalData.target_low_price) / (fundamentalData.target_high_price - fundamentalData.target_low_price) * 100}%`}} />
                                        {/* Current Price Dot */}
                                        <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-[0_0_0_4px_rgba(255,255,255,0.15)] z-20"
                                             style={{left: `${Math.max(0, Math.min(100, (fundamentalData.current_price - fundamentalData.target_low_price) / (fundamentalData.target_high_price - fundamentalData.target_low_price) * 100))}%`}} />
                                    </>
                                )}
                            </div>
                            <span className="font-mono text-[13px] text-[#A8552F]">${fundamentalData.target_high_price.toFixed(2)}</span>
                        </div>
                    </div>
                )}
            </div>

            {/* V2: ADR Cross-Listing Gap Alert */}
            {crossListingData && Math.abs(crossListingData.gap_pct ?? 0) > 0.5 && (
                <div className={`mt-4 flex items-start gap-3 p-4 rounded-xl border ${crossListingData.gap_pct > 0 ? 'bg-amber-500/[0.05] border-amber-500/20' : 'bg-blue-500/[0.05] border-blue-500/20'}`}>
                    <AlertTriangle className={`w-4 h-4 mt-0.5 shrink-0 ${crossListingData.gap_pct > 0 ? 'text-amber-400' : 'text-blue-400'}`} />
                    <div>
                        <div className="text-[12px] font-700 text-[#2A2925] mb-0.5">
                            ADR / Cross-Listing Gap · {crossListingData.gap_pct > 0 ? '▲' : '▼'} {Math.abs(crossListingData.gap_pct).toFixed(2)}%
                        </div>
                        <div className="text-[11px] text-[#6E6C60]">
                            US price <span className="font-mono text-[#1F1E1D]">${crossListingData.adr_price?.toFixed(2)}</span> vs home market ({crossListingData.home_exchange}) <span className="font-mono text-[#1F1E1D]">${crossListingData.home_price_usd?.toFixed(2)}</span>.
                            {crossListingData.gap_pct > 0 ? ' US ADR trading at a premium — possible arbitrage or delayed sentiment.' : ' Home listing at premium — capital may rotate toward US ADR.'}
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}
