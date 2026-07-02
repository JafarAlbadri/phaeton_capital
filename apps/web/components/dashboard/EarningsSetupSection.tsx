"use client";

import { Calendar } from 'lucide-react';
import { ExplainTooltip, InlineExplain } from '../ExplainTooltip';

export function EarningsSetupSection({ earningsSetup }: { earningsSetup: any }) {
    return (
        <section className="scroll-mt-20" data-animate>
            <div className="flex items-center gap-3 mb-5">
                <div className="w-6 h-6 rounded-lg bg-amber-500/15 flex items-center justify-center border border-amber-500/20">
                    <Calendar className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <InlineExplain topic="pre_earnings"><span className="section-title">Pre-Earnings Setup</span></InlineExplain>
                <div className="flex-1 h-px bg-gradient-to-r from-[#3A3833] to-transparent" />
                <span className={`px-3 py-1 rounded-lg text-[11px] font-700 border ${earningsSetup.daysToEarnings <= 7 ? 'bg-red-500/15 border-red-500/30 text-red-400' : 'bg-amber-500/15 border-amber-500/30 text-amber-400'}`}>
                    {earningsSetup.daysToEarnings === 0 ? 'TODAY' : `${earningsSetup.daysToEarnings}d away`}
                </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="card p-4 text-center">
                    <div className="section-title mb-2">Earnings Date</div>
                    <div className="font-mono text-[14px] font-700 text-amber-400">{earningsSetup.nextEarningsDate}</div>
                </div>
                <div className="card p-4 text-center">
                    <div className="section-title mb-2 flex items-center justify-center gap-1">
                        IV Percentile <ExplainTooltip topic="pre_earnings" />
                    </div>
                    <div className={`font-mono text-[14px] font-700 ${earningsSetup.ivPercentile != null ? (earningsSetup.ivPercentile > 70 ? 'text-red-400' : earningsSetup.ivPercentile > 40 ? 'text-amber-400' : 'text-emerald-400') : 'text-[#8F8C80]'}`}>
                        {earningsSetup.ivPercentile != null ? `${earningsSetup.ivPercentile.toFixed(1)}%` : '—'}
                    </div>
                    <div className="text-[10px] text-[#8F8C80] mt-1">
                        {earningsSetup.ivPercentile != null ? (earningsSetup.ivPercentile > 70 ? 'Options expensive' : earningsSetup.ivPercentile < 30 ? 'Options cheap' : 'Normal IV') : ''}
                    </div>
                </div>
                <div className="card p-4 text-center">
                    <div className="section-title mb-2">Put/Call Ratio</div>
                    <div className={`font-mono text-[14px] font-700 ${earningsSetup.putCallRatio != null ? (earningsSetup.putCallRatio > 1.2 ? 'text-red-400' : earningsSetup.putCallRatio < 0.8 ? 'text-emerald-400' : 'text-amber-400') : 'text-[#8F8C80]'}`}>
                        {earningsSetup.putCallRatio != null ? earningsSetup.putCallRatio.toFixed(2) : '—'}
                    </div>
                    <div className="text-[10px] text-[#8F8C80] mt-1">
                        {earningsSetup.putCallRatio != null ? (earningsSetup.putCallRatio > 1.2 ? 'Bearish skew' : earningsSetup.putCallRatio < 0.8 ? 'Bullish skew' : 'Neutral') : ''}
                    </div>
                </div>
                <div className="card p-4 text-center">
                    <div className="section-title mb-2">Max Pain</div>
                    <div className="font-mono text-[14px] font-700 text-[#A6A296]">
                        {earningsSetup.maxPainPrice != null ? `$${earningsSetup.maxPainPrice.toFixed(2)}` : '—'}
                    </div>
                    <div className="text-[10px] text-[#8F8C80] mt-1">Options max pain price</div>
                </div>
            </div>
        </section>
    );
}
