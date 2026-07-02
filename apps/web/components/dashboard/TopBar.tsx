"use client";

import { ArrowUpRight, Command, RefreshCw, Search, Target } from 'lucide-react';
import QueueStatus from '../QueueStatus';

export function TopBar({ targetKeyword, sseConnected, lastUpdated, recommendationScore, loading, onOpenCommand, onScan }: {
    targetKeyword: string;
    sseConnected: boolean;
    lastUpdated: Date | null;
    recommendationScore: any;
    loading: boolean;
    onOpenCommand: () => void;
    onScan: () => void;
}) {
    return (
        <div className="fixed top-0 left-0 right-0 z-50 h-14 bg-[#FAF9F5]/80 backdrop-blur-xl border-b border-[#E5E1D5] flex items-center justify-between px-4 xl:px-6">
            <div className="flex items-center gap-4">
                <div className="flex flex-col">
                    <span className="font-display font-800 tracking-[0.15em] text-gradient-gold text-lg leading-none">PHAETON</span>
                    <span className="text-[10px] tracking-[0.3em] text-[#7C7A6E] font-600">CAPITAL</span>
                </div>
            </div>

            <div className="flex-1 max-w-lg mx-8 hidden md:block">
                <button onClick={onOpenCommand} className="w-full flex items-center gap-3 px-4 h-9 rounded-xl bg-black/[0.03] border border-[#DFDACB] hover:bg-black/[0.05] transition-colors group">
                    <Search className="w-4 h-4 text-[#7C7A6E] group-hover:text-[#6E6C60]" />
                    <span className="text-sm text-[#7C7A6E] flex-1 text-left uppercase tracking-widest font-mono">
                        {targetKeyword || 'Search...'}
                    </span>
                    <div className="flex items-center gap-1">
                        <Command className="w-3 h-3 text-[#7C7A6E]" />
                        <span className="text-[10px] font-mono text-[#7C7A6E]">K</span>
                    </div>
                </button>
            </div>

            <div className="flex items-center gap-3">
                {/* SSE connectivity + last updated */}
                <div className="hidden sm:flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${sseConnected ? 'bg-emerald-400' : 'bg-[#8F8C80] animate-pulse'}`} title={sseConnected ? 'Live' : 'Reconnecting…'} />
                    {lastUpdated && (
                        <span className="text-[10px] text-[#8F8C80] font-mono">
                            {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    )}
                </div>

                {/* Queue status */}
                <div className="hidden md:block"><QueueStatus /></div>

                {/* Discover — auto-surfaced opportunities */}
                <a href="/discover"
                   className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[rgba(201,100,66,0.06)] border border-[rgba(201,100,66,0.20)] hover:border-[rgba(201,100,66,0.40)] text-[11px] text-[#A8552F] hover:shadow-[0_0_20px_rgba(201,100,66,0.15)] transition-all font-semibold uppercase tracking-wider">
                    <Target className="w-3 h-3" /> Discover
                </a>

                {/* Share signal card */}
                {recommendationScore && (
                    <a href={`/api/og?ticker=${targetKeyword}&signal=${recommendationScore.signal}&score=${recommendationScore.composite_score?.toFixed(1)}&horizon=15`}
                       target="_blank" rel="noopener noreferrer"
                       className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FAF9F5] border border-[#E5E1D5] hover:border-[#D5CFBE] text-[11px] text-[#6E6C60] hover:text-[#1F1E1D] transition-all">
                        <ArrowUpRight className="w-3 h-3" /> Share
                    </a>
                )}

                <button onClick={onScan} disabled={loading}
                    className="flex items-center gap-2 px-4 h-9 bg-[#C96442] hover:bg-[#B4552D] rounded-xl text-sm font-600 text-white transition-all disabled:opacity-50">
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    {loading ? 'SCANNING' : 'SCAN'}
                </button>
            </div>
        </div>
    );
}
