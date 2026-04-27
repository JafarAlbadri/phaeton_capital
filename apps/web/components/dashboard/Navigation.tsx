"use client";

import {
    Activity, RefreshCw, BarChart2, TrendingUp, Bot, DollarSign, Target, Briefcase,
    Search, Shield, Globe, Award, Zap, Calendar, ArrowUpRight, Command, LayoutGrid, Radio,
    Star
} from 'lucide-react';
import QueueStatus from '../QueueStatus';

interface NavigationProps {
    targetKeyword: string;
    loading: boolean;
    sseConnected: boolean;
    lastUpdated: Date | null;
    recommendationScore: any;
    onOpenCommand: () => void;
    onScan: () => void;
}

const sidebarItems = [
    { icon: Radio, label: 'Signals', id: '#hero' },
    { icon: DollarSign, label: 'Fundamentals', id: '#fundamentals' },
    { icon: BarChart2, label: 'Technicals', id: '#technical' },
    { icon: Globe, label: 'Macro Environment', id: '#macro' },
    { icon: LayoutGrid, label: 'Quant Models', id: '#quant' },
    { icon: Shield, label: 'Risk Analysis', id: '#risk' },
    { icon: TrendingUp, label: 'Sentiment Flow', id: '#sentiment' },
    { icon: Briefcase, label: 'Insider Flow', id: '#insider' },
    { icon: Award, label: 'Full Analysis', id: '#helhetsanalys' },
    { icon: Calendar, label: 'Predictions', id: '#predictions' },
    { icon: Activity, label: 'Alpha Attribution', id: '#alpha' },
    { icon: Zap, label: 'Squeeze', id: '#squeeze' },
];

const mobileItems = [
    { icon: Radio, label: 'Signals', id: '#hero' },
    { icon: DollarSign, label: 'Fundamentals', id: '#fundamentals' },
    { icon: BarChart2, label: 'Technicals', id: '#technical' },
    { icon: Bot, label: 'Quant', id: '#quant' },
    { icon: TrendingUp, label: 'Sentiment', id: '#sentiment' },
];

export default function Navigation({ targetKeyword, loading, sseConnected, lastUpdated, recommendationScore, onOpenCommand, onScan }: NavigationProps) {
    return (
        <>
            {/* TOP BAR */}
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
                    <div className="hidden sm:flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${sseConnected ? 'bg-emerald-400' : 'bg-[#5d5d8a] animate-pulse'}`} title={sseConnected ? 'Live' : 'Reconnecting…'} />
                        {lastUpdated && (
                            <span className="text-[10px] text-[#5d5d8a] font-mono">
                                {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        )}
                    </div>
                    <div className="hidden md:block"><QueueStatus /></div>
                    <a href="/discover"
                       className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[rgba(212,160,23,0.06)] border border-[rgba(212,160,23,0.20)] hover:border-[rgba(212,160,23,0.40)] text-[11px] text-[#fcd97a] hover:shadow-[0_0_20px_rgba(212,160,23,0.15)] transition-all font-semibold uppercase tracking-wider">
                        <Target className="w-3 h-3" /> Discover
                    </a>
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

            {/* SIDEBAR */}
            <div className="fixed left-0 top-14 bottom-0 w-16 xl:w-64 border-r border-[#1a1a3a] bg-[#05050f]/50 backdrop-blur-md z-40 flex flex-col py-6 overflow-hidden hover:w-64 transition-all duration-300 group">
                <nav className="flex flex-col gap-2 px-3">
                    {sidebarItems.map((item, i) => (
                        <a key={i} href={item.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[#9898c0] hover:text-[#f0efff] hover:bg-[#12122e] transition-colors whitespace-nowrap relative">
                            <item.icon className="w-4 h-4 shrink-0" />
                            <span className="text-[13px] font-500 opacity-0 xl:opacity-100 group-hover:opacity-100 transition-opacity">{item.label}</span>
                        </a>
                    ))}
                </nav>
            </div>

            {/* MOBILE BOTTOM NAV */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#080818]/90 backdrop-blur-xl border-t border-[#1a1a3a] flex items-center justify-around px-2 py-2">
                {mobileItems.map((item, i) => (
                    <a key={i} href={item.id} className="flex flex-col items-center gap-1 px-3 py-1 rounded-xl text-[#9898c0] hover:text-[#f0efff] hover:bg-[#12122e] transition-colors">
                        <item.icon className="w-4 h-4" />
                        <span className="text-[9px] font-500 tracking-wide">{item.label}</span>
                    </a>
                ))}
            </nav>
        </>
    );
}
