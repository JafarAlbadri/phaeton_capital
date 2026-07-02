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
        <div className="fixed top-0 left-0 right-0 z-50 h-14 bg-[#080818]/80 backdrop-blur-xl border-b border-[#1a1a3a] flex items-center justify-between px-4 xl:px-6">
            <div className="flex items-center gap-4">
                <div className="flex flex-col">
                    <span className="font-display font-800 tracking-[0.15em] text-gradient-gold text-lg leading-none">PHAETON</span>
                    <span className="text-[10px] tracking-[0.3em] text-[#8080aa] font-600">CAPITAL</span>
                </div>
            </div>

            <div className="flex-1 max-w-lg mx-8 hidden md:block">
                <button onClick={onOpenCommand} className="w-full flex items-center gap-3 px-4 h-9 rounded-xl bg-white/[0.03] border border-[#1e1e42] hover:bg-white/[0.05] transition-colors group">
                    <Search className="w-4 h-4 text-[#8080aa] group-hover:text-[#9898c0]" />
                    <span className="text-sm text-[#8080aa] flex-1 text-left uppercase tracking-widest font-mono">
                        {targetKeyword || 'Search...'}
                    </span>
                    <div className="flex items-center gap-1">
                        <Command className="w-3 h-3 text-[#8080aa]" />
                        <span className="text-[10px] font-mono text-[#8080aa]">K</span>
                    </div>
                </button>
            </div>

            <div className="flex items-center gap-3">
                {/* SSE connectivity + last updated */}
                <div className="hidden sm:flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${sseConnected ? 'bg-emerald-400' : 'bg-[#5d5d8a] animate-pulse'}`} title={sseConnected ? 'Live' : 'Reconnecting…'} />
                    {lastUpdated && (
                        <span className="text-[10px] text-[#5d5d8a] font-mono">
                            {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    )}
                </div>

                {/* Queue status */}
                <div className="hidden md:block"><QueueStatus /></div>

                {/* Discover — auto-surfaced opportunities */}
                <a href="/discover"
                   className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[rgba(212,160,23,0.06)] border border-[rgba(212,160,23,0.20)] hover:border-[rgba(212,160,23,0.40)] text-[11px] text-[#fcd97a] hover:shadow-[0_0_20px_rgba(212,160,23,0.15)] transition-all font-semibold uppercase tracking-wider">
                    <Target className="w-3 h-3" /> Discover
                </a>

                {/* Share signal card */}
                {recommendationScore && (
                    <a href={`/api/og?ticker=${targetKeyword}&signal=${recommendationScore.signal}&score=${recommendationScore.composite_score?.toFixed(1)}&horizon=15`}
                       target="_blank" rel="noopener noreferrer"
                       className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0c0c24] border border-[#1e1e3a] hover:border-[#2a2a5a] text-[11px] text-[#9898c0] hover:text-[#f0efff] transition-all">
                        <ArrowUpRight className="w-3 h-3" /> Share
                    </a>
                )}

                <button onClick={onScan} disabled={loading}
                    className="flex items-center gap-2 px-4 h-9 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-sm font-600 text-white hover:shadow-[0_0_20px_rgba(99,102,241,0.4)] transition-all disabled:opacity-50">
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    {loading ? 'SCANNING' : 'SCAN'}
                </button>
            </div>
        </div>
    );
}
