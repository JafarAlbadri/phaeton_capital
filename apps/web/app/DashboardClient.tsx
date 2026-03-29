"use client";

import { useTransition, useState, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
    AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, ReferenceLine, Cell, ReferenceArea,
    ComposedChart, Line
} from 'recharts';
import {
    Activity, AlertTriangle, RefreshCw, BarChart2, TrendingUp, TrendingDown,
    Bot, DollarSign, Target, Briefcase, Info, Search, ListPlus,
    Shield, Globe, Award, Zap, ChevronUp, ChevronDown, Minus,
    Calendar, ArrowUpRight, ArrowDownRight, Command, LayoutGrid, Radio, Hexagon
} from 'lucide-react';

// ─── Animations Hook ──────────────────────────────────────────────────────────
function useScrollAnimation() {
    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-in');
                    // Find children and animate
                    const children = entry.target.querySelectorAll('[data-animate-child]');
                    children.forEach(c => c.classList.add('animate-in'));
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

        document.querySelectorAll('[data-animate]').forEach(el => observer.observe(el));
        return () => observer.disconnect();
    }, []);
}

// ─── Number Counter Hook ──────────────────────────────────────────────────────
function AnimatedNumber({ value, formatter, className }: { value: number, formatter?: (v: number) => string, className?: string }) {
    const [displayVal, setDisplayVal] = useState(0);
    useEffect(() => {
        let startTime: number;
        const duration = 1000;
        const animate = (time: number) => {
            if (!startTime) startTime = time;
            const progress = (time - startTime) / duration;
            if (progress < 1) {
                // easeOutExpo
                const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
                setDisplayVal(value * ease);
                requestAnimationFrame(animate);
            } else {
                setDisplayVal(value);
            }
        };
        requestAnimationFrame(animate);
    }, [value]);
    return <span className={className}>{formatter ? formatter(displayVal) : displayVal.toFixed(0)}</span>;
}

// ─── Signal helpers ───────────────────────────────────────────────────────────
const SIGNAL_STYLES: Record<string, any> = {
    STRONG_BUY:  { word: 'STRONG BUY',  from: 'from-emerald-300', to: 'to-emerald-500', shadow: 'rgba(14,207,138,0.5)', bgHero: 'from-emerald-950 via-[#050508] to-[#050508]', gauge: ['#064d33', '#0ecf8a'] },
    BUY:         { word: 'BUY',         from: 'from-emerald-300', to: 'to-emerald-500', shadow: 'rgba(14,207,138,0.5)', bgHero: 'from-emerald-950/60 via-[#050508] to-[#050508]', gauge: ['#064d33', '#0ecf8a'] },
    HOLD:        { word: 'HOLD',        from: 'from-amber-300',   to: 'to-amber-500',   shadow: 'rgba(245,158,11,0.5)', bgHero: 'from-amber-950/60 via-[#050508] to-[#050508]', gauge: ['#92620a', '#fcd97a'] },
    SELL:        { word: 'SELL',        from: 'from-orange-300',  to: 'to-orange-500',  shadow: 'rgba(249,115,22,0.5)', bgHero: 'from-orange-950/60 via-[#050508] to-[#050508]', gauge: ['#4d0a10', '#f5495a'] },
    STRONG_SELL: { word: 'STRONG SELL', from: 'from-red-300',     to: 'to-rose-500',    shadow: 'rgba(239,68,68,0.6)', bgHero: 'from-red-950 via-[#050508] to-[#050508]', gauge: ['#4d0a10', '#f5495a'] },
};
function getSignal(s?: string | null) {
    return SIGNAL_STYLES[s ?? ''] ?? SIGNAL_STYLES['HOLD'];
}

// ─── Stat Tile ────────────────────────────────────────────────────────────────
function Tile({ label, value, sub, variant = 'gold', icon: Icon }: any) {
    const vClass = variant === 'bull' ? 'text-emerald-400 border-emerald-500/15 bg-emerald-500/10' :
                   variant === 'bear' ? 'text-red-400 border-red-500/15 bg-red-500/10' :
                   'text-gold-base border-[#d4a017]/15 bg-[rgba(212,160,23,0.08)]';
                   
    const valClass = variant === 'bull' ? 'text-emerald-400' : variant === 'bear' ? 'text-red-400' : 'text-[#fcd97a]';

    return (
        <div className="card rounded-[14px] p-5 relative overflow-hidden group" data-animate-child>
            <div className={`absolute bottom-[-20px] right-[-20px] w-20 h-20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl ${variant === 'bull' ? 'bg-emerald-500/20' : variant === 'bear' ? 'bg-red-500/20' : 'bg-gold-base/20'}`} />
            <div className="flex items-start gap-4 z-10 relative">
                <div className={`w-9 h-9 rounded-[10px] border flex items-center justify-center shrink-0 transition-colors ${vClass}`}>
                    {Icon && <Icon size={18} strokeWidth={1.5} />}
                </div>
                <div className="flex-1">
                    <div className="section-title mb-1.5">{label}</div>
                    <div className={`font-mono text-[32px] xl:text-[36px] font-700 leading-none tracking-[-0.02em] transition-transform duration-200 group-hover:scale-[1.02] origin-left ${valClass}`}>
                        {value}
                    </div>
                    {sub && <div className="text-[11px] text-[#5d5d8a] mt-1.5">{sub}</div>}
                </div>
            </div>
        </div>
    );
}

// ─── Score Bar ────────────────────────────────────────────────────────────────
function ScoreBar({ label, value, variant = 'gold', thick = false }: { label: string; value: number | null; variant?: 'bull'|'bear'|'gold'; thick?: boolean }) {
    const pct = value ?? 0;
    const barClass = `score-bar-${variant} ${thick ? 'score-bar-thick' : ''}`;
    const txtClass = variant === 'bull' ? '#0ecf8a' : variant === 'bear' ? '#f5495a' : '#f0b429';
    return (
        <div className="flex items-center gap-3 py-2 border-b border-[#1a1a3a] last:border-0" data-animate-child>
            <div className="w-1.5 h-1.5 rounded-full bg-[#5d5d8a] flex-shrink-0" />
            <span className="text-[12px] font-500 text-[#9898c0] whitespace-nowrap">{label}</span>
            <div className="flex-1 h-px" style={{background: 'repeating-linear-gradient(90deg,#1e1e42 0px,#1e1e42 2px,transparent 2px,transparent 8px)'}} />
            <span className="font-mono text-[13px] font-600 min-w-[32px] text-right" style={{color: txtClass}}>{value != null ? value.toFixed(1) : '–'}</span>
            <div className={`w-28 score-bar-track ${thick ? 'h-[10px]' : ''}`}>
                <div className={`score-bar-fill ${barClass}`} style={{ width: `${pct}%` }} />
            </div>
        </div>
    );
}

// ─── Confidence Arc Gauge ─────────────────────────────────────────────────────
function ConfidenceGauge({ value, colors }: { value: number; colors: string[] }) {
    const pct = Math.max(0, Math.min(100, value));
    const dashoffset = 283 - (283 * pct) / 100; // 180 deg arc is ~283 length
    const rotate = -90 + (180 * pct) / 100;
    
    return (
        <div className="relative w-full max-w-[200px] flex flex-col items-center">
            <svg viewBox="0 0 200 110" className="w-full overflow-visible">
                <defs>
                    <linearGradient id="gaugeGrad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor={colors[0]} />
                        <stop offset="100%" stopColor={colors[1]} />
                    </linearGradient>
                </defs>
                {/* Background arc */}
                <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#1a1a3a" strokeWidth="10" strokeLinecap="round" />
                {/* Value arc */}
                <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="url(#gaugeGrad)" strokeWidth="10" strokeLinecap="round" 
                      strokeDasharray="283" strokeDashoffset={283} 
                      className="animate-[barFillIn_1.2s_cubic-bezier(0.34,1.56,0.64,1)_forwards]"
                      style={{ animationName: 'dash', '--dash-to': dashoffset } as any} />
                {/* Needle */}
                <line x1="100" y1="100" x2="100" y2="30" stroke="#f0efff" strokeWidth="2" strokeLinecap="round"
                      className="origin-[100px_100px] transition-transform duration-1000 ease-out"
                      style={{ transform: `rotate(${rotate}deg)` }} />
                <circle cx="100" cy="100" r="4" fill="#f0efff" />
                
                <text x="100" y="85" textAnchor="middle" className="font-mono font-700 text-[28px]" fill="#fcd97a">{pct.toFixed(0)}%</text>
                <text x="100" y="105" textAnchor="middle" className="font-sans font-600 text-[9px] tracking-[0.15em] uppercase" fill="#5d5d8a">CONFIDENCE</text>
            </svg>
            <style jsx>{`
                @keyframes dash {
                    to { stroke-dashoffset: var(--dash-to); }
                }
            `}</style>
        </div>
    );
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="rounded-[10px] p-3 min-w-[160px] bg-[#08081a]/85 backdrop-blur-md border border-[#f59e0b]/35 shadow-[0_8px_32px_rgba(0,0,0,0.6)] z-50">
            <p className="text-[11px] text-[#94a3b8] mb-2 pb-2 border-b border-white/[0.06] uppercase tracking-wider">{label}</p>
            {payload.map((item: any) => (
                <div key={item.dataKey} className="flex items-center gap-2 justify-between mb-1 last:mb-0">
                    <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: item.color }} />
                        <span className="text-[12px] text-[#94a3b8]">{item.name || item.dataKey}</span>
                    </div>
                    <span className="font-mono text-[13px] font-600 text-[#f1f5f9] tabular-nums ml-4">
                        {typeof item.value === 'number' ? item.value.toFixed(2) : item.value}
                    </span>
                </div>
            ))}
        </div>
    );
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function DashboardClient({
    recentSentiments, manipulationStats, targetKeyword,
    fundamentalData, financialHistory, usdSekRate, gaussianData,
    insiderTrades, quantMetrics, technicalIndicators, macroIndicators,
    riskProfile, recommendationScore, predictionAccuracy, predictionCount,
}: any) {
    const [isPending, startTransition] = useTransition();
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState(targetKeyword || '');
    const [tradeFilter, setTradeFilter] = useState<'all' | 'buy' | 'sell'>('all');
    const [isCommandOpen, setIsCommandOpen] = useState(false);
    const router = useRouter();
    
    useScrollAnimation();

    useEffect(() => {
        const interval = setInterval(async () => {
            try {
                const res = await fetch(`/api/status?q=${encodeURIComponent(targetKeyword)}`);
                const data = await res.json();
                if (data?.recommendation?.signal && data.recommendation.signal !== recommendationScore?.signal) {
                    startTransition(() => router.refresh());
                }
            } catch {}
        }, 30000);
        return () => clearInterval(interval);
    }, [targetKeyword, recommendationScore?.signal]);

    // Command palette listener
    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setIsCommandOpen((open) => !open);
            }
            if (e.key === 'Escape') setIsCommandOpen(false);
        };
        document.addEventListener('keydown', down);
        return () => document.removeEventListener('keydown', down);
    }, []);

    const sig = getSignal(recommendationScore?.signal);

    const insiderStats = useMemo(() => {
        if (!insiderTrades?.length) return { buyVolume: 0, sellVolume: 0, netVolume: 0, chartData: [], filteredTrades: [] };
        let buyVolume = 0, sellVolume = 0;
        const monthlyData = new Map<string, { month: string; buy: number; sell: number }>();

        const filteredTrades = insiderTrades.filter((trade: any) => {
            const isBuy  = trade.transaction?.toLowerCase().includes('buy')  || trade.transaction?.toLowerCase().includes('purchase');
            const isSell = trade.transaction?.toLowerCase().includes('sell') || trade.transaction?.toLowerCase().includes('sale');
            const value  = trade.value || 0;
            if (isBuy)  buyVolume  += value;
            if (isSell) sellVolume += value;

            const date     = new Date(trade.date);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            if (!monthlyData.has(monthKey)) monthlyData.set(monthKey, { month: monthKey, buy: 0, sell: 0 });
            const rec = monthlyData.get(monthKey)!;
            if (isBuy)  rec.buy  += value;
            if (isSell) rec.sell += value;

            if (tradeFilter === 'buy')  return isBuy;
            if (tradeFilter === 'sell') return isSell;
            return true;
        });

        return {
            buyVolume, sellVolume, netVolume: buyVolume - sellVolume,
            chartData: Array.from(monthlyData.values()).sort((a, b) => a.month.localeCompare(b.month)),
            filteredTrades,
        };
    }, [insiderTrades, tradeFilter]);

    const triggerScrape = (kwOverride?: string) => {
        const kw = (kwOverride || searchQuery).trim();
        if (!kw) return;
        setIsCommandOpen(false);
        setLoading(true);
        fetch('/api/scrape', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ keyword: kw }),
        })
            .then(() => {
                setSearchQuery(kw);
                startTransition(() => { router.push(`/?q=${encodeURIComponent(kw)}`); router.refresh(); });
                setLoading(false);
            })
            .catch(() => setLoading(false));
    };

    const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

    return (
        <div className="min-h-screen relative text-[#f0efff]">
            {/* ── COMMAND PALETTE ─────────────────────────────────────────── */}
            {isCommandOpen && (
                <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-start justify-center pt-20" onClick={() => setIsCommandOpen(false)}>
                    <div className="w-full max-w-2xl bg-[#0d0d24] rounded-2xl border border-[#2d3050] shadow-[0_25px_80px_rgba(0,0,0,0.6)] overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center px-4 border-b border-[#1a1a3a]">
                            <Search className="w-5 h-5 text-[#5d5d8a]" />
                            <input autoFocus value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') triggerScrape(); }}
                                placeholder="Search ticker or company name..."
                                className="w-full h-14 bg-transparent border-none outline-none px-4 text-lg text-[#f0efff] placeholder:text-[#5d5d8a] uppercase" />
                            <div className="flex items-center gap-1">
                                <kbd className="px-2 py-1 bg-[#12122e] rounded text-[10px] text-[#5d5d8a] font-mono border border-[#1a1a3a]">ESC</kbd>
                            </div>
                        </div>
                        <div className="p-4">
                            <div className="section-title mb-3">Popular Tickers</div>
                            <div className="flex flex-wrap gap-2">
                                {['AAPL', 'NVDA', 'TSLA', 'MSFT', 'AMZN', 'GME'].map(t => (
                                    <button key={t} onClick={() => triggerScrape(t)}
                                        className="px-3 py-1.5 rounded-lg bg-[#12122e] border border-[#1a1a3a] hover:border-indigo-500/50 hover:bg-indigo-500/10 text-sm font-mono tracking-wider transition-colors">
                                        {t}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── TOP BAR ─────────────────────────────────────────────────── */}
            <div className="fixed top-0 left-0 right-0 z-50 h-14 bg-[#080818]/80 backdrop-blur-xl border-b border-[#1a1a3a] flex items-center justify-between px-4 xl:px-6">
                <div className="flex items-center gap-4">
                    <div className="flex flex-col">
                        <span className="font-display font-800 tracking-[0.15em] text-gradient-gold text-lg leading-none">PHAETON</span>
                        <span className="text-[10px] tracking-[0.3em] text-[#5d5d8a] font-600">CAPITAL</span>
                    </div>
                </div>
                
                <div className="flex-1 max-w-lg mx-8 hidden md:block">
                    <button onClick={() => setIsCommandOpen(true)} className="w-full flex items-center gap-3 px-4 h-9 rounded-xl bg-white/[0.03] border border-[#1e1e42] hover:bg-white/[0.05] transition-colors group">
                        <Search className="w-4 h-4 text-[#5d5d8a] group-hover:text-[#9898c0]" />
                        <span className="text-sm text-[#5d5d8a] flex-1 text-left uppercase tracking-widest font-mono">
                            {targetKeyword || 'Search...'}
                        </span>
                        <div className="flex items-center gap-1">
                            <Command className="w-3 h-3 text-[#5d5d8a]" />
                            <span className="text-[10px] font-mono text-[#5d5d8a]">K</span>
                        </div>
                    </button>
                </div>

                <div className="flex items-center gap-4">
                    <div className="hidden lg:flex overflow-hidden w-64 border-x border-[#1a1a3a] px-2 h-full items-center">
                        <div className="flex gap-6 animate-ticker whitespace-nowrap text-[11px] font-mono whitespace-nowrap">
                            <span className="text-[#0ecf8a]">NVDA +2.4%</span>
                            <span className="text-[#f5495a]">TSLA -1.2%</span>
                            <span className="text-[#0ecf8a]">BTC +5.1%</span>
                            <span className="text-[#0ecf8a]">AAPL +0.8%</span>
                            <span className="text-[#8b9cb5]">SPY +0.0%</span>
                        </div>
                    </div>
                    
                    <button onClick={() => triggerScrape()} disabled={loading}
                        className="flex items-center gap-2 px-4 h-9 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-sm font-600 text-white hover:shadow-[0_0_20px_rgba(99,102,241,0.4)] transition-all disabled:opacity-50">
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                        {loading ? 'SCANNING' : 'SCAN'}
                    </button>
                </div>
            </div>

            {/* ── SIDEBAR ─────────────────────────────────────────────────── */}
            <div className="fixed left-0 top-14 bottom-0 w-16 xl:w-64 border-r border-[#1a1a3a] bg-[#05050f]/50 backdrop-blur-md z-40 flex flex-col py-6 overflow-hidden hover:w-64 transition-all duration-300 group">
                <nav className="flex flex-col gap-2 px-3">
                    {[
                        { icon: Radio, label: 'Signals', id: '#hero' },
                        { icon: DollarSign, label: 'Fundamentals', id: '#fundamentals' },
                        { icon: BarChart2, label: 'Technicals', id: '#technical' },
                        { icon: Globe, label: 'Macro Environment', id: '#macro' },
                        { icon: LayoutGrid, label: 'Quant Models', id: '#quant' },
                        { icon: Shield, label: 'Risk Analysis', id: '#risk' },
                        { icon: TrendingUp, label: 'Sentiment Flow', id: '#sentiment' },
                        { icon: Briefcase, label: 'Insider Flow', id: '#insider' },
                    ].map((item, i) => (
                        <a key={i} href={item.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[#9898c0] hover:text-[#f0efff] hover:bg-[#12122e] transition-colors whitespace-nowrap relative">
                            <item.icon className="w-4 h-4 shrink-0" />
                            <span className="text-[13px] font-500 opacity-0 xl:opacity-100 group-hover:opacity-100 transition-opacity">{item.label}</span>
                        </a>
                    ))}
                </nav>
            </div>

            {/* ── MAIN CONTENT ────────────────────────────────────────────── */}
            <main className="ml-16 xl:ml-64 pt-14 max-w-[1600px] mx-auto p-4 xl:p-8 space-y-8">
                
                {/* ── HERO SECTION ────────────────────────────────────────────── */}
                {!recommendationScore && !loading && (
                    <div className="col-span-12 h-[60vh] flex flex-col items-center justify-center relative overflown-hidden">
                        <div className="absolute inset-0 flex items-center justify-center opacity-[0.04] blur-[100px] pointer-events-none">
                            <div className="w-[600px] h-[600px] bg-indigo-500 rounded-full animate-orbit" />
                        </div>
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-6 shadow-[0_0_60px_rgba(99,102,241,0.5)]">
                            <Hexagon className="w-10 h-10 text-white" />
                        </div>
                        <h1 className="font-display text-[42px] font-800 tracking-tight text-white mb-2">Intelligence Awaits.</h1>
                        <p className="text-[#9898c0] text-[15px] mb-8 max-w-md text-center">Press <kbd className="px-2 py-1 mx-1 rounded bg-[#12122e] border border-[#1a1a3a] text-xs font-mono">⌘K</kbd> or use the search bar to scan a ticker and generate a precision audit.</p>
                        <div className="flex gap-3">
                            {['AAPL', 'NVDA', 'TSLA'].map(t => (
                                <button key={t} onClick={() => triggerScrape(t)} className="px-5 py-2.5 rounded-xl border border-[#1e1e42] bg-[#0d0d24] hover:border-indigo-500/50 hover:bg-slate-800 transition-all font-mono font-600 text-sm hover:shadow-[0_0_20px_rgba(99,102,241,0.2)] text-white">
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {recommendationScore && (
                    <section id="hero" className={`col-span-12 rounded-[20px] overflow-hidden relative min-h-[280px] xl:min-h-[320px] bg-gradient-to-br border border-[#1e1e42] shadow-[0_20px_60px_rgba(0,0,0,0.6)] animate-in ${sig.bgHero}`} 
                             style={{backgroundImage: `linear-gradient(to bottom right, var(--tw-gradient-stops))`}}>
                        
                        <div className="absolute top-0 left-0 w-full h-full bg-[url('/noise.svg')] opacity-[0.03] pointer-events-none mix-blend-overlay" />
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 h-full">
                            {/* Left Col */}
                            <div className="p-8 xl:p-10 flex flex-col justify-center gap-4 relative z-10">
                                <div className="flex items-center gap-3">
                                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] font-mono text-[13px] font-700 tracking-[0.15em] text-white backdrop-blur-md shadow-lg">
                                        <div className="status-live" />
                                        {targetKeyword.toUpperCase()}
                                    </div>
                                    <span className="badge bg-[#12122e] border border-[#1a1a3a] text-[#9898c0]">EQT</span>
                                </div>
                                <div className="text-[15px] text-[#9898c0] font-500 mt-2">Composite Signal Target</div>
                                
                                <div className={`font-display text-[64px] xl:text-[80px] font-800 leading-[0.9] tracking-[-0.04em] bg-gradient-to-r ${sig.from} ${sig.to} bg-clip-text text-transparent animate-hero-enter`} 
                                     style={{textShadow: `0 0 40px ${sig.shadow}`}}>
                                    {sig.word}
                                </div>
                                
                                <div className="flex items-center gap-4 mt-2">
                                    <span className="badge badge-gold">Score: {recommendationScore.composite_score?.toFixed(1)}/100</span>
                                    {predictionCount > 0 && predictionAccuracy != null && (
                                        <span className="font-mono text-[12px] text-[#9898c0]">Model Acc: {(predictionAccuracy * 100).toFixed(1)}%</span>
                                    )}
                                </div>
                            </div>
                            
                            {/* Right Col */}
                            <div className="p-8 xl:p-10 border-t md:border-t-0 md:border-l border-white/[0.06] flex flex-col gap-6 relative z-10 bg-black/10 backdrop-blur-sm">
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="bg-black/40 backdrop-blur-md rounded-xl p-4 border border-white/[0.08] flex flex-col justify-center">
                                        <div className="text-[10px] tracking-[0.12em] uppercase text-[#5d5d8a] mb-1 font-600">Price</div>
                                        <div className="text-[24px] font-700 text-slate-100 font-mono tracking-tight">${fundamentalData?.current_price?.toFixed(2) || '—'}</div>
                                    </div>
                                    <div className="bg-black/40 backdrop-blur-md rounded-xl p-4 border border-white/[0.08] flex flex-col justify-center">
                                        <div className="text-[10px] tracking-[0.12em] uppercase text-[#5d5d8a] mb-1 font-600">P/E Ratio</div>
                                        <div className="text-[24px] font-700 text-slate-100 font-mono tracking-tight">{fundamentalData?.pe_ratio?.toFixed(1) || '—'}</div>
                                    </div>
                                    <div className="bg-black/40 backdrop-blur-md rounded-xl p-4 border border-white/[0.08] flex flex-col justify-center">
                                        <div className="text-[10px] tracking-[0.12em] uppercase text-[#5d5d8a] mb-1 font-600">Mkt Cap</div>
                                        <div className="text-[24px] font-700 text-slate-100 font-mono tracking-tight">{fundamentalData?.market_cap ? `${(Number(fundamentalData.market_cap)/1e9).toFixed(1)}B` : '—'}</div>
                                    </div>
                                </div>
                                
                                <div className="flex-1 flex items-center justify-center">
                                    {recommendationScore.confidence != null && (
                                        <ConfidenceGauge value={recommendationScore.confidence * 100} colors={sig.gauge} />
                                    )}
                                </div>
                            </div>
                        </div>
                    </section>
                )}

                {/* ── FUNDAMENTALS ────────────────────────────────────────────── */}
                {fundamentalData && (
                    <section id="fundamentals" className="col-span-12 scroll-mt-20" data-animate>
                        <div className="flex items-center gap-3 mb-5">
                            <div className="w-6 h-6 rounded-lg bg-indigo-500/15 flex items-center justify-center border border-indigo-500/20">
                                <DollarSign className="w-3.5 h-3.5 text-indigo-400" />
                            </div>
                            <span className="section-title">Fundamental Data</span>
                            <div className="flex-1 h-px bg-gradient-to-r from-[#1a1a3a] to-transparent" />
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
                                        <span className="font-mono text-[13px] text-[#9898c0]">${fundamentalData.target_low_price.toFixed(2)}</span>
                                        <div className="flex-1 h-2 rounded-full bg-[#12122e] relative border border-[#1a1a3a]">
                                            <div className="absolute top-0 bottom-0 left-1/4 right-1/4 bg-indigo-500/20 rounded-full" />
                                            {fundamentalData.target_price && fundamentalData.current_price && (
                                                <>
                                                    {/* Mean line */}
                                                    <div className="absolute top-[-4px] bottom-[-4px] w-0.5 bg-indigo-400 shadow-[0_0_10px_rgba(99,102,241,0.5)] z-10" 
                                                         style={{left: `${(fundamentalData.target_price - fundamentalData.target_low_price) / (fundamentalData.target_high_price - fundamentalData.target_low_price) * 100}%`}} />
                                                    {/* Current Price Dot */}
                                                    <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-[0_0_0_4px_rgba(255,255,255,0.15)] z-20"
                                                         style={{left: `${Math.max(0, Math.min(100, (fundamentalData.current_price - fundamentalData.target_low_price) / (fundamentalData.target_high_price - fundamentalData.target_low_price) * 100))}%`}} />
                                                </>
                                            )}
                                        </div>
                                        <span className="font-mono text-[13px] text-[#fcd97a]">${fundamentalData.target_high_price.toFixed(2)}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>
                )}

                {/* ── TECHNICAL ANALYSIS ──────────────────────────────────────── */}
                {technicalIndicators && (
                    <section id="technical" className="col-span-12 scroll-mt-20" data-animate>
                        <div className="flex items-center gap-3 mb-5">
                            <div className="w-6 h-6 rounded-lg bg-indigo-500/15 flex items-center justify-center border border-indigo-500/20">
                                <BarChart2 className="w-3.5 h-3.5 text-indigo-400" />
                            </div>
                            <span className="section-title">Technical Analysis</span>
                            <div className="flex-1 h-px bg-gradient-to-r from-[#1a1a3a] to-transparent" />
                            {technicalIndicators.technical_signal && (
                                <span className={`badge ${technicalIndicators.technical_signal==='BULLISH' ? 'badge-bull' : 'badge-bear'}`}>
                                    {technicalIndicators.technical_signal}
                                </span>
                            )}
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-4 xl:gap-5 mb-5">
                            <Tile label="RSI (14)" value={technicalIndicators.rsi_14?.toFixed(1) || '—'} variant={technicalIndicators.rsi_14 < 30 ? 'bull' : technicalIndicators.rsi_14 > 70 ? 'bear' : 'gold'} icon={Activity} />
                            <Tile label="MACD" value={technicalIndicators.macd?.toFixed(3) || '—'} variant={(technicalIndicators.macd || 0) > 0 ? 'bull' : 'bear'} icon={TrendingUp} />
                            <Tile label="SMA 50" value={technicalIndicators.sma_50 ? `$${technicalIndicators.sma_50.toFixed(2)}` : '—'} variant="gold" icon={ArrowUpRight} />
                            <Tile label="SMA 200" value={technicalIndicators.sma_200 ? `$${technicalIndicators.sma_200.toFixed(2)}` : '—'} variant="gold" icon={ArrowUpRight} />
                            <Tile label="EMA 12" value={technicalIndicators.ema_12 ? `$${technicalIndicators.ema_12.toFixed(2)}` : '—'} variant="gold" />
                            <Tile label="ATR (14)" value={technicalIndicators.atr_14 ? `$${technicalIndicators.atr_14.toFixed(2)}` : '—'} variant="gold" />
                        </div>
                    </section>
                )}

                {/* ── MACRO & QUANTITATIVE ────────────────────────────────────── */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                    {/* QUANT */}
                    {quantMetrics && (
                        <section id="quant" className="scroll-mt-20" data-animate>
                            <div className="flex items-center gap-3 mb-5">
                                <div className="w-6 h-6 rounded-lg bg-indigo-500/15 flex items-center justify-center border border-indigo-500/20">
                                    <Bot className="w-3.5 h-3.5 text-indigo-400" />
                                </div>
                                <span className="section-title">Quantitative Models</span>
                                <div className="flex-1 h-px bg-gradient-to-r from-[#1a1a3a] to-transparent" />
                            </div>
                            <div className="card p-6 flex flex-col gap-2">
                                <ScoreBar label="Hurst Exponent" value={quantMetrics.hurst_exponent} variant={(quantMetrics.hurst_exponent||0)>0.5 ? 'bull' : 'gold'} thick />
                                <ScoreBar label="Kelly Allocation (%)" value={quantMetrics.kelly_fraction ? quantMetrics.kelly_fraction*100 : null} variant="gold" thick />
                                <ScoreBar label="Granger p-value (x100)" value={quantMetrics.granger_p_value ? quantMetrics.granger_p_value*100 : null} variant={quantMetrics.granger_p_value < 0.05 ? 'bull' : 'bear'} thick />
                                <ScoreBar label="Sent ↔ Price ρ (x100)" value={quantMetrics.sentiment_price_corr ? quantMetrics.sentiment_price_corr*100 : null} variant="gold" thick />
                                
                                <div className="mt-4 pt-4 border-t border-[#1a1a3a] grid grid-cols-2 gap-4">
                                    <div>
                                        <div className="section-title mb-1">HMM Regime</div>
                                        <div className={`font-mono text-xl font-700 ${quantMetrics.hmm_state === 1 ? 'text-emerald-400' : 'text-red-400'}`}>{quantMetrics.hmm_state === 1 ? 'Bull Market' : 'Bear Market'}</div>
                                    </div>
                                    <div>
                                        <div className="section-title mb-1">Stationarity</div>
                                        <div className={`font-mono text-xl font-700 ${quantMetrics.adf_stationary ? 'text-emerald-400' : 'text-red-400'}`}>{quantMetrics.adf_stationary ? 'Stationary' : 'Non-Stationary'}</div>
                                    </div>
                                </div>
                            </div>
                        </section>
                    )}

                    {/* MACRO */}
                    {macroIndicators && (
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
                        </section>
                    )}
                </div>

                {/* ── CHARTS ──────────────────────────────────────────────────── */}
                <section id="sentiment" className="col-span-12 scroll-mt-20" data-animate>
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                        {/* Sentiment timeline */}
                        <div className="card card-accent relative overflow-hidden p-0 w-full" data-animate-child>
                            <div className="flex items-center justify-between px-6 py-4 border-b border-[#1a1a3a]">
                                <div>
                                    <h3 className="text-[13px] font-600 text-[#e2e8f0] tracking-[0.02em] uppercase">Sentiment Timeline</h3>
                                    <p className="text-[11px] text-[#5d5d8a] mt-0.5">Real-time aggregate scoring</p>
                                </div>
                                <div className="badge badge-gold"><div className="status-live mr-1" /> LIVE</div>
                            </div>
                            <div className="px-4 pb-4 pt-6 h-[260px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={recentSentiments} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="sentGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%"   stopColor="#f59e0b" stopOpacity={0.35} />
                                                <stop offset="40%"  stopColor="#f59e0b" stopOpacity={0.12} />
                                                <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="1 8" stroke="#1e1e42" vertical={false} />
                                        <XAxis dataKey="timeLabel" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 11 }} tickMargin={8} />
                                        <YAxis dataKey="sentiment" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 11 }} orientation="right" width={35} domain={[-1,1]} />
                                        <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#f59e0b', strokeWidth: 1, strokeOpacity: 0.3 }} />
                                        <ReferenceArea y1={0.6} y2={1.0} fill="#0ecf8a" fillOpacity={0.04} />
                                        <ReferenceArea y1={-1.0} y2={-0.6} fill="#f5495a" fillOpacity={0.04} />
                                        <ReferenceLine y={0.6} stroke="#0ecf8a" strokeOpacity={0.5} strokeDasharray="4 4" label={{ value: 'BULLISH', position: 'insideTopRight', style: { fill: '#0ecf8a', fontSize: 10, letterSpacing: '0.08em' } }} />
                                        <ReferenceLine y={-0.6} stroke="#f5495a" strokeOpacity={0.5} strokeDasharray="4 4" label={{ value: 'BEARISH', position: 'insideBottomRight', style: { fill: '#f5495a', fontSize: 10, letterSpacing: '0.08em' } }} />
                                        <Area type="monotone" dataKey="sentiment" stroke="#f59e0b" strokeWidth={2.5} fill="url(#sentGrad)" dot={false} activeDot={{ r: 5, fill: '#f59e0b', stroke: '#05050f', strokeWidth: 2 }} isAnimationActive={true} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Distribution chart */}
                        {gaussianData && (
                            <div className="card card-accent relative overflow-hidden p-0 w-full" data-animate-child>
                                <div className="flex items-center justify-between px-6 py-4 border-b border-[#1a1a3a]">
                                    <div>
                                        <h3 className="text-[13px] font-600 text-[#e2e8f0] tracking-[0.02em] uppercase">Opinion Distribution</h3>
                                        <p className="text-[11px] text-[#5d5d8a] mt-0.5">Gaussian vs KDE</p>
                                    </div>
                                    <div className={`badge ${gaussianData.mean > 0 ? 'badge-bull' : 'badge-bear'}`}>
                                        μ {gaussianData.mean.toFixed(2)}
                                    </div>
                                </div>
                                <div className="px-4 pb-4 pt-6 h-[260px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={gaussianData.curve} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="distrGrad" x1="0" y1="0" x2="1" y2="0">
                                                    <stop offset="0%" stopColor="#f5495a" />
                                                    <stop offset="50%" stopColor="#f59e0b" />
                                                    <stop offset="100%" stopColor="#0ecf8a" />
                                                </linearGradient>
                                                <linearGradient id="distrVGrad" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.3} />
                                                    <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="1 8" stroke="#1e1e42" vertical={false} />
                                            <XAxis dataKey="sentiment" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 11 }} tickMargin={8} domain={[-1,1]} type="number" />
                                            <YAxis hide />
                                            <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)' }} />
                                            <ReferenceLine x={gaussianData.mean} stroke={gaussianData.mean > 0 ? '#0ecf8a' : '#f5495a'} strokeWidth={2} label={{ value: 'μ', position: 'top', style: { fill: gaussianData.mean > 0 ? '#0ecf8a' : '#f5495a', fontSize: 12, fontWeight: 'bold' } }} />
                                            <ReferenceArea x1={gaussianData.mean - gaussianData.stdDev} x2={gaussianData.mean + gaussianData.stdDev} fill="#f59e0b" fillOpacity={0.06} />
                                            <Area type="monotone" dataKey="density" stroke="url(#distrGrad)" strokeWidth={2.5} fill="url(#distrVGrad)" dot={false} isAnimationActive={true} />
                                            {/* KDE if available */}
                                            {quantMetrics?.kde_data && (
                                              <Area type="monotone" data={quantMetrics.kde_data} dataKey="density" stroke="#6366f1" strokeWidth={1} fill="none" dot={false} strokeDasharray="4 4" />
                                            )}
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}
                    </div>
                </section>

                {/* ── INSIDER TABLE ───────────────────────────────────────────── */}
                {insiderTrades?.length > 0 && (
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
                                            className={`px-4 py-1.5 text-[11px] font-600 rounded-lg uppercase tracking-wider transition-all ${tradeFilter === f ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30' : 'text-[#5d5d8a] hover:text-[#9898c0] border border-transparent'}`}>
                                            {f}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left data-table">
                                    <thead className="bg-[#0a0b12] border-b border-[#1a1a3a]">
                                        <tr>
                                            <th className="px-6 py-3 text-[11px] font-700 tracking-[0.08em] uppercase text-[#5d5d8a]">Insider</th>
                                            <th className="px-6 py-3 text-[11px] font-700 tracking-[0.08em] uppercase text-[#5d5d8a]">Type</th>
                                            <th className="px-6 py-3 text-[11px] font-700 tracking-[0.08em] uppercase text-[#5d5d8a] text-right">Shares</th>
                                            <th className="px-6 py-3 text-[11px] font-700 tracking-[0.08em] uppercase text-[#5d5d8a] text-right">Value</th>
                                            <th className="px-6 py-3 text-[11px] font-700 tracking-[0.08em] uppercase text-[#5d5d8a]">Date</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/[0.04]">
                                        {insiderStats.filteredTrades.slice(0, 10).map((trade: any, idx: number) => {
                                            const isBuy = trade.transaction?.toLowerCase().includes('buy') || trade.transaction?.toLowerCase().includes('purchase');
                                            return (
                                                <tr key={trade.id} className={idx % 2 === 0 ? 'bg-[#0d0d24]' : 'bg-[#0a0b10]'}>
                                                    <td className="px-6 py-4">
                                                        <div className="text-[#e2e8f0] font-500 text-[13px]">{trade.insider_name}</div>
                                                        <div className="text-[11px] text-[#5d5d8a] truncate max-w-[200px] mt-0.5">{trade.position || '—'}</div>
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
                                                    <td className="px-6 py-4 font-mono text-[12px] text-[#5d5d8a]">
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
                )}
                
            </main>
        </div>
    );
}
