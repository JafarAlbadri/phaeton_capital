"use client";

import { useTransition, useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, ReferenceLine, Cell
} from 'recharts';
import {
    Activity, AlertTriangle, RefreshCw, BarChart2, TrendingUp, TrendingDown,
    Bot, DollarSign, Target, Briefcase, Info, Search, ListPlus,
    Shield, Globe, Award, Zap, ChevronUp, ChevronDown, Minus,
    Calendar, TrendingUp as TUp, ArrowUpRight, ArrowDownRight
} from 'lucide-react';

// ─── Sparkline Bar Chart ─────────────────────────────────────────────────────

const SparkBarChart = ({ data, dataKey }: { data: any[]; dataKey: string }) => {
    if (!data || data.length === 0 || data.every(d => d[dataKey] == null)) {
        return (
            <div className="h-14 w-full mt-2 flex items-center justify-center text-xs text-zinc-700">
                No data
            </div>
        );
    }
    return (
        <div className="h-14 w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                    <Tooltip
                        contentStyle={{ background: '#0e0e24', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '11px' }}
                        itemStyle={{ color: '#f59e0b' }}
                        labelFormatter={(l) => `Year: ${l}`}
                        cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                        formatter={(v: number) => [v.toFixed(2), dataKey]}
                    />
                    <XAxis dataKey="year" hide />
                    <Bar dataKey={dataKey} radius={[2, 2, 0, 0]} isAnimationActive={false}>
                        {data.map((entry, i) => (
                            <Cell key={i} fill={entry[dataKey] != null && entry[dataKey] < 0 ? '#ef4444' : '#f59e0b'} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

// ─── Signal helpers ───────────────────────────────────────────────────────────

const SIGNAL_STYLES: Record<string, { text: string; bg: string; border: string; glow: string; label: string }> = {
    STRONG_BUY:  { text: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/40', glow: 'glow-bull', label: 'Strong Buy' },
    BUY:         { text: 'text-green-400',   bg: 'bg-green-400/10',   border: 'border-green-400/40',   glow: 'glow-bull', label: 'Buy' },
    HOLD:        { text: 'text-amber-400',   bg: 'bg-amber-400/10',   border: 'border-amber-400/40',   glow: '',          label: 'Hold' },
    SELL:        { text: 'text-orange-400',  bg: 'bg-orange-400/10',  border: 'border-orange-400/40',  glow: 'glow-bear', label: 'Sell' },
    STRONG_SELL: { text: 'text-red-400',     bg: 'bg-red-400/10',     border: 'border-red-400/40',     glow: 'glow-bear', label: 'Strong Sell' },
};

function getSignal(s?: string | null) {
    return SIGNAL_STYLES[s ?? ''] ?? { text: 'text-zinc-500', bg: 'bg-zinc-800/50', border: 'border-zinc-700', glow: '', label: '—' };
}

function riskLabel(r?: number | null) {
    if (r == null) return { label: 'Unknown', color: 'text-zinc-500' };
    if (r >= 5) return { label: 'Extreme', color: 'text-red-400' };
    if (r >= 4) return { label: 'Very High', color: 'text-orange-400' };
    if (r >= 3) return { label: 'High', color: 'text-amber-400' };
    if (r >= 2) return { label: 'Moderate', color: 'text-green-400' };
    return { label: 'Low', color: 'text-emerald-400' };
}

// ─── Stat Tile ────────────────────────────────────────────────────────────────

function Tile({ label, value, sub, color = 'text-foreground', icon }: {
    label: string; value: React.ReactNode; sub?: string; color?: string; icon?: React.ReactNode;
}) {
    return (
        <div className="stat-tile group">
            <div className="flex items-center gap-1.5 mb-2">
                {icon && <span className="text-zinc-600 group-hover:text-gold transition-colors">{icon}</span>}
                <span className="section-title">{label}</span>
            </div>
            <div className={`num text-xl font-semibold ${color}`}>{value}</div>
            {sub && <div className="text-xs text-zinc-600 mt-1">{sub}</div>}
        </div>
    );
}

// ─── Score Bar ────────────────────────────────────────────────────────────────

function ScoreBar({ label, value, color = '#f59e0b' }: { label: string; value: number | null; color?: string }) {
    const pct = value ?? 0;
    return (
        <div className="flex flex-col gap-0.5">
            <div className="flex items-center justify-between">
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider">{label}</span>
                <span className="num text-xs font-semibold" style={{ color }}>{value != null ? value.toFixed(0) : '–'}</span>
            </div>
            <div className="score-bar-track">
                <div className="score-bar-fill" style={{ width: `${pct}%`, background: color }} />
            </div>
        </div>
    );
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({ icon, title, badge }: { icon: React.ReactNode; title: string; badge?: React.ReactNode }) {
    return (
        <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-white/[0.06]">
            <span className="text-gold">{icon}</span>
            <h2 className="section-title text-zinc-300">{title}</h2>
            {badge}
        </div>
    );
}

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
    const router = useRouter();

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

    const sig = getSignal(recommendationScore?.signal);
    const risk = riskLabel(riskProfile?.overall_risk_rating);

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

    const mergedDistributionData = useMemo(() => {
        if (!gaussianData?.curve) return [];
        const base = [...gaussianData.curve];
        if (quantMetrics?.kde_data && Array.isArray(quantMetrics.kde_data)) {
            base.forEach(b => {
                const nearestKde = quantMetrics.kde_data.reduce((prev: any, curr: any) =>
                    Math.abs(curr.x - b.sentiment) < Math.abs(prev.x - b.sentiment) ? curr : prev
                );
                b.kde_density = nearestKde?.density ?? 0;
            });
        }
        return base;
    }, [gaussianData, quantMetrics]);

    const triggerScrape = () => {
        if (!searchQuery.trim()) return;
        setLoading(true);
        const kw = searchQuery.trim();
        fetch('/api/scrape', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ keyword: kw }),
        })
            .then(() => {
                startTransition(() => { router.push(`/?q=${encodeURIComponent(kw)}`); router.refresh(); });
                setLoading(false);
            })
            .catch(() => setLoading(false));
    };

    const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
    const pct = (v: number) => `${v > 0 ? '+' : ''}${(v * 100).toFixed(1)}%`;

    return (
        <div className="min-h-screen p-4 md:p-6 max-w-[1400px] mx-auto space-y-4">

            {/* ── HEADER ──────────────────────────────────────────────────── */}
            <header className="card p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-gold-dim flex items-center justify-center">
                        <Activity size={18} className="text-gold" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-white tracking-tight">Phaeton Capital</h1>
                        <p className="text-xs text-zinc-600 mt-0.5">AI-Powered Trading Intelligence</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {usdSekRate && (
                        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-surface-2 rounded-lg border border-white/[0.06]">
                            <span className="text-[10px] text-zinc-600 uppercase tracking-wider font-medium">USD/SEK</span>
                            <span className="num text-sm font-bold text-gold">{usdSekRate.toFixed(4)}</span>
                        </div>
                    )}

                    <form onSubmit={(e) => { e.preventDefault(); triggerScrape(); }} className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search ticker…"
                            className="w-44 md:w-56 pl-9 pr-4 py-2 bg-surface-2 border border-white/[0.08] rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold/40 transition-all uppercase tracking-widest font-mono font-bold"
                        />
                        {isPending && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 border-2 border-gold border-t-transparent rounded-full animate-spin" />
                        )}
                    </form>

                    <button
                        onClick={triggerScrape}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-gold text-black text-sm font-bold rounded-lg hover:bg-amber-400 disabled:opacity-50 transition-colors"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                        {loading ? 'Scanning…' : 'Scan'}
                    </button>
                </div>
            </header>

            {/* ── RECOMMENDATION HERO ─────────────────────────────────────── */}
            {recommendationScore && (
                <div className={`card p-5 border-2 ${sig.border} ${sig.glow}`}>
                    <div className="flex flex-col lg:flex-row gap-6">
                        {/* Signal block */}
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                                <Award size={14} className="text-zinc-500" />
                                <span className="section-title">AI Composite Recommendation</span>
                                {recommendationScore.risk_override && (
                                    <span className="badge bg-red-400/10 text-red-400 border border-red-400/30">Risk Override</span>
                                )}
                            </div>
                            <div className={`text-5xl font-extrabold tracking-tight mb-3 ${sig.text}`}>
                                {sig.label}
                            </div>
                            <div className="flex flex-wrap items-center gap-4 text-sm">
                                <div>
                                    <span className="text-zinc-600">Score </span>
                                    <span className="num font-bold text-white">{recommendationScore.composite_score?.toFixed(1)}</span>
                                    <span className="text-zinc-600">/100</span>
                                </div>
                                <div>
                                    <span className="text-zinc-600">Confidence </span>
                                    <span className="num font-bold text-white">{recommendationScore.confidence != null ? `${(recommendationScore.confidence * 100).toFixed(0)}%` : '—'}</span>
                                </div>
                                {predictionCount > 0 && predictionAccuracy != null && (
                                    <div>
                                        <span className="text-zinc-600">Accuracy </span>
                                        <span className="num font-bold text-emerald-400">{(predictionAccuracy * 100).toFixed(0)}%</span>
                                        <span className="text-zinc-600"> ({predictionCount} calls)</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Score breakdown */}
                        <div className="lg:w-72 space-y-2.5">
                            {[
                                { label: 'Sentiment',   val: recommendationScore.sentiment_score,    color: '#6366f1' },
                                { label: 'Technical',   val: recommendationScore.technical_score,    color: '#06b6d4' },
                                { label: 'Fundamental', val: recommendationScore.fundamental_score,  color: '#f59e0b' },
                                { label: 'Quant',       val: recommendationScore.quant_score,        color: '#8b5cf6' },
                                { label: 'Insider',     val: recommendationScore.insider_score,      color: '#10b981' },
                                { label: 'Macro',       val: recommendationScore.macro_score,        color: '#f97316' },
                            ].map((s) => (
                                <ScoreBar key={s.label} label={s.label} value={s.val} color={s.color} />
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ── FUNDAMENTALS ────────────────────────────────────────────── */}
            <div className="card p-5">
                <SectionHeader
                    icon={<DollarSign size={15} />}
                    title="Fundamentals"
                    badge={
                        <span className="badge bg-gold/10 text-gold border border-gold/20">
                            {targetKeyword.toUpperCase()}
                        </span>
                    }
                />

                {fundamentalData ? (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                            {[
                                { label: 'Last Price',    val: fundamentalData.current_price    != null ? `$${fundamentalData.current_price.toFixed(2)}`    : '—', icon: <DollarSign size={12} /> },
                                { label: 'Price Target',  val: fundamentalData.target_price     != null ? `$${fundamentalData.target_price.toFixed(2)}`     : '—', icon: <Target size={12} /> },
                                { label: 'P/E Ratio',     val: fundamentalData.pe_ratio         != null ? fundamentalData.pe_ratio.toFixed(1)                : '—', icon: <Activity size={12} /> },
                                { label: '52-Week High',  val: fundamentalData.high_52_week     != null ? `$${fundamentalData.high_52_week.toFixed(2)}`     : '—', icon: <TrendingUp size={12} /> },
                                { label: '52-Week Low',   val: fundamentalData.low_52_week      != null ? `$${fundamentalData.low_52_week.toFixed(2)}`      : '—', icon: <TrendingDown size={12} /> },
                                { label: 'Market Cap',    val: fundamentalData.market_cap       != null ? `$${(Number(fundamentalData.market_cap)/1e9).toFixed(1)}B` : '—', icon: <Briefcase size={12} /> },
                                { label: 'Analyst View',  val: fundamentalData.recommendation   ?? '—',  icon: <Award size={12} />, color: 'text-emerald-400 capitalize' },
                            ].map((s, i) => (
                                <Tile key={i} label={s.label} value={s.val} color={s.color || 'text-gold'} icon={s.icon} />
                            ))}

                            {/* Risk/Reward */}
                            {fundamentalData.current_price && fundamentalData.target_price && fundamentalData.low_52_week && (() => {
                                const up   = fundamentalData.target_price - fundamentalData.current_price;
                                const down = fundamentalData.current_price - fundamentalData.low_52_week;
                                const rr   = down > 0 ? up / down : null;
                                return (
                                    <Tile
                                        label="Risk / Reward"
                                        value={rr != null ? `${rr.toFixed(2)}×` : '—'}
                                        color={rr != null && rr > 1 ? 'text-emerald-400' : 'text-red-400'}
                                        icon={<Zap size={12} />}
                                    />
                                );
                            })()}
                        </div>

                        {/* Target range + earnings */}
                        {(fundamentalData.target_low_price || fundamentalData.next_earnings_date) && (
                            <div className="flex flex-wrap gap-3">
                                {fundamentalData.target_low_price && fundamentalData.target_high_price && (
                                    <div className="stat-tile flex items-center gap-3">
                                        <div>
                                            <div className="section-title mb-1">Analyst Target Range</div>
                                            <div className="num text-sm font-semibold text-white">
                                                ${fundamentalData.target_low_price.toFixed(2)}
                                                <span className="text-zinc-600 mx-2">—</span>
                                                ${fundamentalData.target_high_price.toFixed(2)}
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {fundamentalData.next_earnings_date && (
                                    <div className="stat-tile flex items-center gap-3">
                                        <Calendar size={14} className="text-zinc-600" />
                                        <div>
                                            <div className="section-title mb-1">Next Earnings</div>
                                            <div className="num text-sm font-semibold text-white">
                                                {new Date(fundamentalData.next_earnings_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {fundamentalData.sector && (
                                    <div className="stat-tile">
                                        <div className="section-title mb-1">Sector</div>
                                        <div className="text-sm font-semibold text-white">{fundamentalData.sector}</div>
                                        {fundamentalData.industry && <div className="text-xs text-zinc-600 mt-0.5">{fundamentalData.industry}</div>}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Analyst consensus bar */}
                        {(fundamentalData.analyst_strong_buy || fundamentalData.analyst_buy) && (() => {
                            const counts = [
                                { label: 'Strong Buy', val: fundamentalData.analyst_strong_buy || 0, color: '#10b981' },
                                { label: 'Buy',        val: fundamentalData.analyst_buy        || 0, color: '#34d399' },
                                { label: 'Hold',       val: fundamentalData.analyst_hold       || 0, color: '#f59e0b' },
                                { label: 'Sell',       val: fundamentalData.analyst_sell       || 0, color: '#f97316' },
                                { label: 'Strong Sell',val: fundamentalData.analyst_strong_sell|| 0, color: '#ef4444' },
                            ];
                            const total = counts.reduce((s, c) => s + c.val, 0);
                            return (
                                <div className="stat-tile">
                                    <div className="section-title mb-3">Analyst Consensus</div>
                                    <div className="flex h-6 rounded-md overflow-hidden gap-px">
                                        {counts.map((c) => (
                                            total > 0 && c.val > 0 ? (
                                                <div
                                                    key={c.label}
                                                    style={{ width: `${(c.val / total) * 100}%`, background: c.color }}
                                                    className="relative group/bar"
                                                    title={`${c.label}: ${c.val}`}
                                                />
                                            ) : null
                                        ))}
                                    </div>
                                    <div className="flex flex-wrap gap-3 mt-2">
                                        {counts.map((c) => (
                                            <div key={c.label} className="flex items-center gap-1.5">
                                                <div className="w-2 h-2 rounded-sm" style={{ background: c.color }} />
                                                <span className="text-xs text-zinc-500">{c.label}</span>
                                                <span className="num text-xs font-semibold text-white">{c.val}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <AlertTriangle size={32} className="text-red-400/50 mb-3" />
                        <p className="text-sm font-medium text-red-400">No data found for "{targetKeyword}"</p>
                        <p className="text-xs text-zinc-600 mt-1">Make sure this is a valid ticker symbol, then click Scan.</p>
                    </div>
                )}
            </div>

            {/* ── TECHNICAL ANALYSIS ──────────────────────────────────────── */}
            {technicalIndicators && (
                <div className="card p-5">
                    <SectionHeader
                        icon={<BarChart2 size={15} />}
                        title="Technical Analysis"
                        badge={technicalIndicators.technical_signal && (
                            <span className={`badge border ${
                                technicalIndicators.technical_signal === 'BULLISH'
                                    ? 'bg-emerald-400/10 text-emerald-400 border-emerald-400/30'
                                    : technicalIndicators.technical_signal === 'BEARISH'
                                    ? 'bg-red-400/10 text-red-400 border-red-400/30'
                                    : 'bg-amber-400/10 text-amber-400 border-amber-400/30'
                            }`}>{technicalIndicators.technical_signal}</span>
                        )}
                    />
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 mb-4">
                        {[
                            { label: 'RSI (14)',         val: technicalIndicators.rsi_14?.toFixed(1),       color: technicalIndicators.rsi_14 < 30 ? 'text-emerald-400' : technicalIndicators.rsi_14 > 70 ? 'text-red-400' : 'text-gold' },
                            { label: 'MACD',             val: technicalIndicators.macd?.toFixed(3),         color: (technicalIndicators.macd ?? 0) > 0 ? 'text-emerald-400' : 'text-red-400' },
                            { label: 'MACD Histogram',   val: technicalIndicators.macd_histogram?.toFixed(3),color: (technicalIndicators.macd_histogram ?? 0) > 0 ? 'text-emerald-400' : 'text-red-400' },
                            { label: 'Bollinger Pos.',   val: technicalIndicators.price_vs_bb?.toFixed(2),  color: (technicalIndicators.price_vs_bb ?? 0) < -0.5 ? 'text-emerald-400' : (technicalIndicators.price_vs_bb ?? 0) > 0.5 ? 'text-red-400' : 'text-gold' },
                            { label: 'SMA 50',           val: technicalIndicators.sma_50       != null ? `$${technicalIndicators.sma_50.toFixed(2)}`   : null, color: 'text-zinc-300' },
                            { label: 'SMA 200',          val: technicalIndicators.sma_200      != null ? `$${technicalIndicators.sma_200.toFixed(2)}`  : null, color: 'text-zinc-300' },
                            { label: 'ATR (14)',         val: technicalIndicators.atr_14       != null ? `$${technicalIndicators.atr_14.toFixed(2)}`   : null, color: 'text-zinc-400' },
                            { label: 'EMA 12',           val: technicalIndicators.ema_12       != null ? `$${technicalIndicators.ema_12.toFixed(2)}`   : null, color: 'text-zinc-300' },
                        ].map((s, i) => (
                            <div key={i} className="stat-tile">
                                <div className="section-title mb-2">{s.label}</div>
                                <div className={`num text-lg font-semibold ${s.color}`}>{s.val ?? '—'}</div>
                            </div>
                        ))}
                    </div>

                    {/* Pattern badges */}
                    <div className="flex flex-wrap gap-2">
                        {technicalIndicators.golden_cross && (
                            <span className="badge bg-emerald-400/10 text-emerald-400 border border-emerald-400/30">
                                Golden Cross
                            </span>
                        )}
                        {technicalIndicators.death_cross && (
                            <span className="badge bg-red-400/10 text-red-400 border border-red-400/30">
                                Death Cross
                            </span>
                        )}
                        {technicalIndicators.rsi_14 != null && technicalIndicators.rsi_14 < 30 && (
                            <span className="badge bg-emerald-400/10 text-emerald-400 border border-emerald-400/30">
                                RSI Oversold
                            </span>
                        )}
                        {technicalIndicators.rsi_14 != null && technicalIndicators.rsi_14 > 70 && (
                            <span className="badge bg-red-400/10 text-red-400 border border-red-400/30">
                                RSI Overbought
                            </span>
                        )}
                        {(technicalIndicators.macd_histogram ?? 0) > 0 && (
                            <span className="badge bg-emerald-400/10 text-emerald-400 border border-emerald-400/30">
                                MACD Bullish
                            </span>
                        )}
                        {(technicalIndicators.macd_histogram ?? 0) < 0 && (
                            <span className="badge bg-red-400/10 text-red-400 border border-red-400/30">
                                MACD Bearish
                            </span>
                        )}
                    </div>
                </div>
            )}

            {/* ── MACRO CONTEXT ───────────────────────────────────────────── */}
            {macroIndicators && (
                <div className="card p-5">
                    <SectionHeader icon={<Globe size={15} />} title="Macro Environment" />
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-3">
                        {[
                            { label: 'VIX',             val: macroIndicators.vix?.toFixed(2),   color: macroIndicators.vix > 30 ? 'text-red-400' : macroIndicators.vix < 15 ? 'text-emerald-400' : 'text-gold' },
                            { label: '10-Year Yield',   val: macroIndicators.ten_year_yield != null ? `${macroIndicators.ten_year_yield.toFixed(2)}%` : null, color: 'text-zinc-300' },
                            { label: 'Fed Rate Proxy',  val: macroIndicators.fed_funds_rate != null ? `${macroIndicators.fed_funds_rate.toFixed(2)}%` : null, color: 'text-zinc-300' },
                            { label: 'Fear & Greed',    val: macroIndicators.fear_greed_index?.toFixed(0), color: macroIndicators.fear_greed_index > 60 ? 'text-emerald-400' : macroIndicators.fear_greed_index < 40 ? 'text-red-400' : 'text-gold' },
                            { label: 'Sector ETF',      val: macroIndicators.sector_etf,       color: 'text-zinc-400' },
                            { label: '1-Month Return',  val: macroIndicators.sector_etf_momentum_1m != null ? pct(macroIndicators.sector_etf_momentum_1m) : null, color: (macroIndicators.sector_etf_momentum_1m ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400' },
                            { label: '3-Month Return',  val: macroIndicators.sector_etf_momentum_3m != null ? pct(macroIndicators.sector_etf_momentum_3m) : null, color: (macroIndicators.sector_etf_momentum_3m ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400' },
                            { label: 'P/E vs Market',   val: macroIndicators.pe_premium_pct != null ? `${macroIndicators.pe_premium_pct > 0 ? '+' : ''}${macroIndicators.pe_premium_pct.toFixed(1)}%` : null, color: (macroIndicators.pe_premium_pct ?? 0) < 0 ? 'text-emerald-400' : 'text-red-400' },
                        ].map((s, i) => (
                            <div key={i} className="stat-tile">
                                <div className="section-title mb-2">{s.label}</div>
                                <div className={`num text-lg font-semibold ${s.color}`}>{s.val ?? '—'}</div>
                            </div>
                        ))}
                    </div>
                    {macroIndicators.rate_sensitive && (
                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-orange-400/10 border border-orange-400/20 text-sm text-orange-400">
                            <AlertTriangle size={14} />
                            <span>Rate-sensitive stock — high P/E makes it vulnerable to rising interest rates.</span>
                        </div>
                    )}
                </div>
            )}

            {/* ── SCAN OVERVIEW ───────────────────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                    { label: 'Total Scanned',        val: manipulationStats.totalCount,        color: 'text-gold',         sub: 'Posts & articles' },
                    { label: 'Organic Signals',      val: gaussianData.n || manipulationStats.organicCount, color: 'text-emerald-400', sub: 'Passed trust filter' },
                    { label: 'Blocked (Manipulation)', val: manipulationStats.manipulatedCount, color: 'text-red-400',      sub: 'Flagged by AI' },
                ].map((s, i) => (
                    <div key={i} className="card p-4">
                        <div className="section-title mb-2">{s.label}</div>
                        <div className={`num text-4xl font-bold ${s.color}`}>{s.val}</div>
                        <div className="text-xs text-zinc-600 mt-1">{s.sub}</div>
                    </div>
                ))}
            </div>

            {/* ── ADVANCED QUANT MODELS ───────────────────────────────────── */}
            {quantMetrics && (
                <div className="card p-5">
                    <SectionHeader icon={<Bot size={15} />} title="Advanced Quantitative Models" />
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-10 gap-3">
                        {[
                            { label: 'HMM Regime',         val: quantMetrics.hmm_state === 1 ? 'Bull' : quantMetrics.hmm_state === 0 ? 'Bear' : '—', color: quantMetrics.hmm_state === 1 ? 'text-emerald-400' : quantMetrics.hmm_state === 0 ? 'text-red-400' : 'text-zinc-500' },
                            { label: 'Kelly Allocation',   val: quantMetrics.kelly_fraction != null ? `${(quantMetrics.kelly_fraction * 100).toFixed(1)}%` : '—', color: 'text-gold' },
                            { label: 'Hurst Exponent',     val: quantMetrics.hurst_exponent?.toFixed(3) ?? '—', color: 'text-gold', sub: (quantMetrics.hurst_exponent ?? 0) > 0.5 ? 'Trending' : 'Mean-rev.' },
                            { label: 'Granger p-value',    val: quantMetrics.granger_p_value?.toFixed(3) ?? '—', color: quantMetrics.granger_p_value < 0.05 ? 'text-emerald-400' : 'text-zinc-500', sub: quantMetrics.granger_p_value < 0.05 ? 'Significant' : '' },
                            { label: 'MC 15d Expected',    val: quantMetrics.monte_carlo_mean != null ? `$${new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(quantMetrics.monte_carlo_mean)}` : '—', color: 'text-gold' },
                            { label: 'Bayes Posterior',    val: quantMetrics.bayes_posterior != null ? `${(quantMetrics.bayes_posterior * 100).toFixed(1)}%` : '—', color: (quantMetrics.bayes_posterior ?? 0) > 0 ? 'text-emerald-400' : 'text-red-400' },
                            { label: 'Sent ↔ Price ρ',    val: quantMetrics.sentiment_price_corr?.toFixed(3) ?? '—', color: Math.abs(quantMetrics.sentiment_price_corr ?? 0) > 0.3 ? 'text-emerald-400' : 'text-zinc-500' },
                            { label: 'Dominant Cycle',     val: quantMetrics.dominant_cycle_days != null ? `${quantMetrics.dominant_cycle_days.toFixed(1)}d` : '—', color: 'text-info' },
                            { label: 'OU Mean Reversion',  val: quantMetrics.ou_theta?.toFixed(3) ?? '—', color: 'text-zinc-300' },
                            { label: 'Stationarity',       val: quantMetrics.adf_stationary === true ? 'Stationary' : quantMetrics.adf_stationary === false ? 'Non-stat.' : '—', color: quantMetrics.adf_stationary === true ? 'text-emerald-400' : 'text-red-400' },
                        ].map((s, i) => (
                            <div key={i} className="stat-tile">
                                <div className="section-title mb-2">{s.label}</div>
                                <div className={`num text-base font-semibold ${s.color}`}>{s.val}</div>
                                {(s as any).sub && <div className="text-[10px] text-zinc-600 mt-0.5">{(s as any).sub}</div>}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── RISK ASSESSMENT ─────────────────────────────────────────── */}
            {(riskProfile || quantMetrics) && (
                <div className="card p-5">
                    <SectionHeader
                        icon={<Shield size={15} />}
                        title="Risk Assessment"
                        badge={riskProfile?.overall_risk_rating && (
                            <span className={`badge border ${
                                riskProfile.overall_risk_rating >= 5 ? 'bg-red-400/10 text-red-400 border-red-400/30' :
                                riskProfile.overall_risk_rating >= 4 ? 'bg-orange-400/10 text-orange-400 border-orange-400/30' :
                                riskProfile.overall_risk_rating >= 3 ? 'bg-amber-400/10 text-amber-400 border-amber-400/30' :
                                'bg-emerald-400/10 text-emerald-400 border-emerald-400/30'
                            }`}>
                                Risk Level: {risk.label}
                            </span>
                        )}
                    />
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-4">
                        {[
                            { label: 'Max Drawdown',    val: riskProfile?.max_drawdown != null ? `${(riskProfile.max_drawdown * 100).toFixed(1)}%` : '—', color: (riskProfile?.max_drawdown ?? 0) < -0.2 ? 'text-red-400' : 'text-gold' },
                            { label: 'VaR (95%)',       val: quantMetrics?.var_95 != null ? `${(quantMetrics.var_95 * 100).toFixed(1)}%` : '—', color: 'text-red-400' },
                            { label: 'CVaR (95%)',      val: quantMetrics?.cvar_95 != null ? `${(quantMetrics.cvar_95 * 100).toFixed(1)}%` : '—', color: 'text-red-400' },
                            { label: 'Sharpe Ratio',    val: quantMetrics?.sharpe_ratio?.toFixed(2) ?? '—', color: (quantMetrics?.sharpe_ratio ?? 0) > 1 ? 'text-emerald-400' : 'text-gold' },
                            { label: 'Sortino Ratio',   val: quantMetrics?.sortino_ratio?.toFixed(2) ?? '—', color: (quantMetrics?.sortino_ratio ?? 0) > 1 ? 'text-emerald-400' : 'text-gold' },
                            { label: 'GARCH Volatility',val: quantMetrics?.garch_volatility != null ? `${(quantMetrics.garch_volatility * 100).toFixed(1)}%` : '—', color: 'text-zinc-300' },
                            { label: 'Rolling Beta',    val: quantMetrics?.rolling_beta?.toFixed(2) ?? '—', color: 'text-zinc-300' },
                            { label: 'Liquidity Score', val: riskProfile?.liquidity_score?.toFixed(5) ?? '—', color: 'text-zinc-300' },
                        ].map((s, i) => (
                            <div key={i} className="stat-tile">
                                <div className="section-title mb-2">{s.label}</div>
                                <div className={`num text-lg font-semibold ${s.color}`}>{s.val}</div>
                            </div>
                        ))}
                    </div>
                    {riskProfile?.event_risk_flag && (
                        <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-red-400/10 border border-red-400/20 text-sm text-red-400">
                            <AlertTriangle size={14} />
                            <span className="font-medium">Earnings within 7 days</span>
                            <span className="text-red-400/70">— expect elevated volatility and wider spreads.</span>
                        </div>
                    )}
                    {riskProfile?.stress_test_p5 != null && fundamentalData?.current_price && (
                        <div className="mt-2 text-xs text-zinc-600">
                            Stress test (worst 5%): <span className="num text-zinc-400 font-medium">${riskProfile.stress_test_p5.toFixed(2)}</span>
                            <span className="ml-2">(
                                {(((riskProfile.stress_test_p5 - fundamentalData.current_price) / fundamentalData.current_price) * 100).toFixed(1)}% from current
                            )</span>
                        </div>
                    )}
                </div>
            )}

            {/* ── HISTORICAL FINANCIAL RATIOS ─────────────────────────────── */}
            {financialHistory?.length > 0 && (
                <div className="card p-5">
                    <SectionHeader icon={<ListPlus size={15} />} title="Historical Financials" />
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                        {[
                            { key: 'eps',              label: 'Earnings Per Share', format: (v: number) => v.toFixed(2) },
                            { key: 'revenue_per_share',label: 'Revenue / Share',    format: (v: number) => v.toFixed(2) },
                            { key: 'roe',              label: 'Return on Equity',   format: (v: number) => `${(v * 100).toFixed(1)}%` },
                            { key: 'net_debt_ebitda',  label: 'Net Debt / EBITDA',  format: (v: number) => v.toFixed(2) },
                            { key: 'pe_ratio',         label: 'P/E Ratio',          format: (v: number) => v.toFixed(1) },
                            { key: 'ps_ratio',         label: 'P/S Ratio',          format: (v: number) => v.toFixed(2) },
                            { key: 'pb_ratio',         label: 'P/B Ratio',          format: (v: number) => v.toFixed(2) },
                            { key: 'ev_ebit',          label: 'EV / EBIT',          format: (v: number) => v.toFixed(1) },
                        ].map((metric, i) => {
                            const latest = [...financialHistory].reverse().find((h: any) => h[metric.key] != null)?.[metric.key] as number | undefined;
                            return (
                                <div key={i} className="stat-tile">
                                    <div className="section-title mb-1">{metric.label}</div>
                                    <div className="num text-xl font-bold text-gold">
                                        {latest != null ? metric.format(latest) : '—'}
                                    </div>
                                    <SparkBarChart data={financialHistory} dataKey={metric.key} />
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ── CHARTS ──────────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

                {/* Sentiment timeline */}
                <div className="card p-5">
                    <SectionHeader icon={<TrendingUp size={15} />} title="Sentiment Timeline" />
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={recentSentiments} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="sentFill" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.2} />
                                        <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis dataKey="timeLabel" stroke="transparent" tick={{ fill: '#4b5563', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }} axisLine={false} tickLine={false} dy={8} />
                                <YAxis stroke="transparent" tick={{ fill: '#4b5563', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }} axisLine={false} tickLine={false} domain={[-1, 1]} dx={-4} />
                                <Tooltip
                                    contentStyle={{ background: '#0e0e24', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px' }}
                                    itemStyle={{ color: '#f59e0b', fontWeight: 600 }}
                                    labelStyle={{ color: '#6b7280', marginBottom: '4px' }}
                                />
                                <ReferenceLine y={0} stroke="rgba(255,255,255,0.08)" strokeDasharray="4 4" />
                                <Area type="monotone" dataKey="sentiment" stroke="#f59e0b" strokeWidth={1.5} fill="url(#sentFill)" isAnimationActive={false} dot={false} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Opinion distribution */}
                {gaussianData && (
                    <div className="card p-5">
                        <div className="flex items-start justify-between mb-5 pb-3 border-b border-white/[0.06]">
                            <div className="flex items-center gap-2.5">
                                <Activity size={15} className="text-gold" />
                                <h2 className="section-title text-zinc-300">Market Opinion Distribution</h2>
                            </div>
                            <div className="text-right">
                                <div className="text-xs text-zinc-600 mb-1">Consensus (n={gaussianData.n})</div>
                                <div className={`num text-2xl font-bold ${gaussianData.mean > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {(gaussianData.mean * 100).toFixed(0)}%
                                    <span className="text-sm ml-2 font-medium">
                                        {gaussianData.isSignificant ? (gaussianData.mean > 0 ? 'Bullish' : 'Bearish') : 'Neutral'}
                                    </span>
                                </div>
                                <div className="text-xs text-zinc-600 mt-1 num">
                                    95% CI: [{Math.round(gaussianData.lowerBound * 100)}%, {Math.round(gaussianData.upperBound * 100)}%] · p = {gaussianData.pValue?.toFixed(3)}
                                </div>
                            </div>
                        </div>
                        <div className="h-56">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={mergedDistributionData} margin={{ top: 8, right: 8, left: -20, bottom: 20 }}>
                                    <defs>
                                        <linearGradient id="gaussFill" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.25} />
                                            <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="kdeFill" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#6366f1" stopOpacity={0.2} />
                                            <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                    <XAxis dataKey="sentiment" stroke="transparent" tick={{ fill: '#4b5563', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }} axisLine={false} tickLine={false} domain={[-1, 1]} type="number" dy={8}
                                        label={{ value: '← Bearish  ·  Bullish →', position: 'bottom', fill: '#374151', fontSize: 10, dy: 14 }} />
                                    <YAxis hide />
                                    <Tooltip
                                        cursor={{ stroke: 'rgba(255,255,255,0.08)', strokeWidth: 1 }}
                                        contentStyle={{ background: '#0e0e24', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px' }}
                                        labelFormatter={(v) => `Score: ${v}`}
                                        itemStyle={{ color: '#f59e0b', fontWeight: 600 }}
                                        labelStyle={{ color: '#6b7280', marginBottom: '4px' }}
                                    />
                                    <ReferenceLine x={gaussianData.mean} stroke="#10b981" strokeWidth={1} strokeDasharray="4 4"
                                        label={{ position: 'top', value: 'Mean', fill: '#10b981', fontSize: 10 }} />
                                    <Area type="monotone" dataKey="density" stroke="#f59e0b" strokeWidth={1.5} fill="url(#gaussFill)" isAnimationActive={false} />
                                    <Area type="monotone" dataKey="kde_density" stroke="#6366f1" strokeWidth={1.5} fill="url(#kdeFill)" isAnimationActive={false} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}
            </div>

            {/* ── INSIDER TRANSACTIONS ────────────────────────────────────── */}
            <div className="card p-5">
                <SectionHeader icon={<Briefcase size={15} />} title="Insider Transactions" />

                {insiderTrades?.length > 0 ? (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
                            <div className="stat-tile">
                                <div className="section-title mb-2 text-emerald-400/70">Insider Buys</div>
                                <div className="num text-xl font-bold text-emerald-400">{fmt.format(insiderStats.buyVolume)}</div>
                            </div>
                            <div className="stat-tile">
                                <div className="section-title mb-2 text-red-400/70">Insider Sells</div>
                                <div className="num text-xl font-bold text-red-400">{fmt.format(insiderStats.sellVolume)}</div>
                            </div>
                            <div className="stat-tile">
                                <div className={`section-title mb-2 ${insiderStats.netVolume >= 0 ? 'text-emerald-400/70' : 'text-red-400/70'}`}>Net Flow</div>
                                <div className={`num text-xl font-bold ${insiderStats.netVolume >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {insiderStats.netVolume > 0 ? '+' : ''}{fmt.format(insiderStats.netVolume)}
                                </div>
                            </div>
                        </div>

                        {insiderStats.chartData.length > 0 && (
                            <div className="h-44 mb-5">
                                <p className="section-title mb-2">Monthly Volume Trend</p>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={insiderStats.chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                        <XAxis dataKey="month" stroke="transparent" tick={{ fill: '#4b5563', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }} axisLine={false} tickLine={false} dy={8} />
                                        <YAxis stroke="transparent" tick={{ fill: '#4b5563', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1e6).toFixed(1)}M`} dx={-4} />
                                        <Tooltip
                                            cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                                            contentStyle={{ background: '#0e0e24', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                                            formatter={(v: number, name: string) => [fmt.format(v), name === 'buy' ? 'Buys' : 'Sells']}
                                            labelStyle={{ color: '#6b7280', fontSize: '11px', marginBottom: '4px' }}
                                            itemStyle={{ fontSize: '11px', fontWeight: 600 }}
                                        />
                                        <Bar dataKey="buy"  name="buy"  fill="#10b981" radius={[3, 3, 0, 0]} isAnimationActive={false} />
                                        <Bar dataKey="sell" name="sell" fill="#ef4444" radius={[3, 3, 0, 0]} isAnimationActive={false} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}

                        <div className="flex gap-2 mb-4">
                            {(['all', 'buy', 'sell'] as const).map((f) => (
                                <button
                                    key={f}
                                    onClick={() => setTradeFilter(f)}
                                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all capitalize ${
                                        tradeFilter === f
                                            ? 'bg-gold text-black'
                                            : 'bg-surface-2 text-zinc-400 hover:text-white border border-white/[0.08]'
                                    }`}
                                >
                                    {f === 'all' ? 'All' : f === 'buy' ? 'Buys' : 'Sells'}
                                </button>
                            ))}
                        </div>

                        <div className="overflow-x-auto rounded-lg border border-white/[0.06]">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-white/[0.06] bg-surface-2">
                                        {['Insider', 'Position', 'Type', 'Shares', 'Value', 'Date'].map((h) => (
                                            <th key={h} className="px-4 py-2.5 text-left section-title font-medium">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {insiderStats.filteredTrades.map((trade: any) => {
                                        const isBuy  = trade.transaction?.toLowerCase().includes('buy') || trade.transaction?.toLowerCase().includes('purchase');
                                        const isSell = trade.transaction?.toLowerCase().includes('sell') || trade.transaction?.toLowerCase().includes('sale');
                                        return (
                                            <tr key={trade.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                                                <td className="px-4 py-2.5 font-medium text-white truncate max-w-[180px]">{trade.insider_name}</td>
                                                <td className="px-4 py-2.5 text-zinc-500 truncate max-w-[140px]">{trade.position || '—'}</td>
                                                <td className="px-4 py-2.5">
                                                    <span className={`badge border ${
                                                        isBuy  ? 'bg-emerald-400/10 text-emerald-400 border-emerald-400/30' :
                                                        isSell ? 'bg-red-400/10 text-red-400 border-red-400/30' :
                                                                 'bg-zinc-700/30 text-zinc-400 border-zinc-700'
                                                    }`}>{trade.transaction}</span>
                                                </td>
                                                <td className="px-4 py-2.5 num text-zinc-300 text-right">{trade.shares?.toLocaleString() ?? '—'}</td>
                                                <td className="px-4 py-2.5 num text-right font-medium text-white">{trade.value ? fmt.format(trade.value) : '—'}</td>
                                                <td className="px-4 py-2.5 num text-zinc-500 text-right">
                                                    {new Date(trade.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </>
                ) : (
                    <p className="text-sm text-zinc-600 py-6 text-center">No insider trades on record.</p>
                )}
            </div>

            {/* Footer */}
            <div className="text-center text-xs text-zinc-700 pb-6">
                Phaeton Capital Intelligence Platform · Data refreshes every 15 minutes · Not financial advice
            </div>
        </div>
    );
}
