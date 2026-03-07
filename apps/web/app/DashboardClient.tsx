"use client";

import { useTransition, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';
import { Activity, AlertTriangle, RefreshCw, BarChart2, TrendingUp, TrendingDown, Bot, DollarSign, Target, Briefcase, Info, Search, ListPlus } from 'lucide-react';

const SparkBarChart = ({ data, dataKey }: { data: any[], dataKey: string }) => {
    if (!data || data.length === 0 || data.every(d => d[dataKey] == null)) {
        return <div className="h-16 w-full mt-2 flex items-center justify-center text-xs text-zinc-600">No data</div>;
    }
    return (
        <div className="h-16 w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data}>
                    <Tooltip
                        contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', fontSize: '12px', borderRadius: '8px' }}
                        itemStyle={{ color: '#60a5fa' }}
                        labelFormatter={(label) => `Year: ${label}`}
                        cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                        formatter={(val: number) => [val.toFixed(2), dataKey.toUpperCase().replace(/_/g, ' ')]}
                    />
                    <XAxis dataKey="year" hide />
                    <Bar dataKey={dataKey} radius={[2, 2, 0, 0]}>
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry[dataKey] != null && entry[dataKey] < 0 ? '#ef4444' : '#2563eb'} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

export default function DashboardClient({
    recentSentiments,
    manipulationStats,
    targetKeyword,
    fundamentalData,
    financialHistory,
    usdSekRate,
    gaussianData,
    insiderTrades
}: any) {
    const [isPending, startTransition] = useTransition();
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState(targetKeyword || '');
    const [tradeFilter, setTradeFilter] = useState<'all' | 'buy' | 'sell'>('all');
    const router = useRouter();

    const insiderStats = useMemo(() => {
        if (!insiderTrades || insiderTrades.length === 0) return { buyVolume: 0, sellVolume: 0, netVolume: 0, chartData: [], filteredTrades: [] };

        let buyVolume = 0;
        let sellVolume = 0;

        // Use a map to aggregate by month
        const monthlyData = new Map<string, { month: string, buy: number, sell: number }>();

        const filteredTrades = insiderTrades.filter((trade: any) => {
            const isBuy = trade.transaction?.toLowerCase().includes('buy') || trade.transaction?.toLowerCase().includes('purchase');
            const isSell = trade.transaction?.toLowerCase().includes('sell') || trade.transaction?.toLowerCase().includes('sale');

            const value = trade.value || 0;
            if (isBuy) buyVolume += value;
            if (isSell) sellVolume += value;

            // Chart aggregation
            const date = new Date(trade.date);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

            if (!monthlyData.has(monthKey)) {
                monthlyData.set(monthKey, { month: monthKey, buy: 0, sell: 0 });
            }
            const monthRec = monthlyData.get(monthKey)!;
            if (isBuy) monthRec.buy += value;
            if (isSell) monthRec.sell += value;

            if (tradeFilter === 'buy') return isBuy;
            if (tradeFilter === 'sell') return isSell;
            return true;
        });

        const chartData = Array.from(monthlyData.values()).sort((a, b) => a.month.localeCompare(b.month));

        return {
            buyVolume,
            sellVolume,
            netVolume: buyVolume - sellVolume,
            chartData,
            filteredTrades
        };
    }, [insiderTrades, tradeFilter]);

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;
        startTransition(() => {
            router.push(`/?q=${encodeURIComponent(searchQuery.trim())}`);
        });
    };

    const triggerScrape = () => {
        setLoading(true);
        fetch('/api/scrape', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ keyword: searchQuery.trim() || targetKeyword })
        })
            .then(res => res.json())
            .then(data => {
                alert(data.message);
            })
            .finally(() => {
                setLoading(false);
            });
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-10 relative z-10 font-sans">
            {/* Header */}
            <header className="flex flex-col md:flex-row items-start md:items-center justify-between glass-panel p-6 rounded-2xl animate-float">
                <div>
                    <h1 className="text-5xl font-extrabold tracking-tight font-display bg-gradient-to-br from-emerald-300 via-emerald-400 to-indigo-400 bg-clip-text text-transparent flex items-center gap-4 drop-shadow-md">
                        <Activity className="text-emerald-400 animate-pulse-slow" size={40} />
                        SentimentCrowd
                    </h1>
                    <p className="text-zinc-400 mt-2 text-lg font-light tracking-wide">100% Bun-Native Trading Intelligence Pipeline</p>
                </div>

                <div className="flex items-center gap-6 mt-6 md:mt-0">
                    {/* USD to SEK Ticker Pill */}
                    {usdSekRate && (
                        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-full px-5 py-2 flex items-center justify-center gap-3 shadow-[0_0_15px_rgba(16,185,129,0.1)] transition-all hover:bg-white/10">
                            <DollarSign className="text-emerald-400 drop-shadow-[0_0_5px_rgba(16,185,129,0.5)]" size={18} />
                            <span className="font-medium tracking-wide text-zinc-300 text-sm">USD/SEK</span>
                            <span className="text-lg font-bold text-white tracking-widest">{usdSekRate.toFixed(4)}</span>
                        </div>
                    )}

                    <form onSubmit={handleSearchSubmit} className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Search size={18} className="text-zinc-400 group-focus-within:text-emerald-400 transition-colors" />
                        </div>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Enter ticker..."
                            className="w-48 md:w-64 pl-11 pr-4 py-3 bg-black/40 border border-white/10 rounded-full text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all font-medium tracking-wider"
                        />
                        {isPending && (
                            <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                                <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                        )}
                    </form>

                    <button
                        onClick={triggerScrape}
                        disabled={loading}
                        className="group relative flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 px-8 py-3 rounded-full font-bold transition-all duration-300 hover:scale-[1.02] shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] disabled:opacity-50 disabled:hover:scale-100 overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
                        <RefreshCw size={20} className={`relative z-10 ${loading ? "animate-spin" : "group-hover:rotate-180 transition-transform duration-500"}`} />
                        <span className="relative z-10">{loading ? 'Scanning...' : 'Manual Scan'}</span>
                    </button>
                </div>
            </header>

            {/* Fundamental Analysis Card */}
            <div className="glass-panel rounded-3xl p-8 mb-8 relative overflow-hidden group hover:border-emerald-500/30 transition-colors duration-500">
                <div className="absolute -top-10 -right-10 p-4 opacity-5 text-emerald-400 rotate-12 group-hover:rotate-0 transition-transform duration-700 group-hover:scale-110">
                    <Briefcase size={200} />
                </div>
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>

                <div className="relative z-10">
                    <h2 className="text-2xl font-bold font-display mb-8 flex items-center gap-3 text-zinc-100">
                        <Info className="text-emerald-400" /> Fundamental Analysis Snapshot
                        <span className="text-emerald-950 bg-emerald-400 px-4 py-1 rounded-full text-base tracking-widest ml-2 shadow-[0_0_10px_rgba(16,185,129,0.4)]">
                            {targetKeyword.toUpperCase()}
                        </span>
                    </h2>

                    {fundamentalData ? (
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                            {[
                                { label: 'Current Price', val: `$${fundamentalData.current_price?.toFixed(2) || 'N/A'}`, icon: DollarSign },
                                { label: 'Target Price', val: `$${fundamentalData.target_price?.toFixed(2) || 'N/A'}`, icon: Target },
                                { label: 'P/E Ratio', val: fundamentalData.pe_ratio?.toFixed(2) || 'N/A', icon: Activity },
                                { label: 'Recommends', val: fundamentalData.recommendation || 'N/A', icon: AlertTriangle, color: 'text-emerald-400 capitalize drop-shadow-md' },
                                { label: '52-wk High', val: `$${fundamentalData.high_52_week?.toFixed(2) || 'N/A'}`, icon: TrendingUp },
                                { label: '52-wk Low', val: `$${fundamentalData.low_52_week?.toFixed(2) || 'N/A'}`, icon: TrendingDown },
                                { label: 'Market Cap', val: fundamentalData.market_cap ? (Number(fundamentalData.market_cap) / 1e9).toFixed(2) + 'B' : 'N/A', icon: Briefcase }
                            ].map((stat, idx) => (
                                <div key={idx} className="bg-black/20 hover:bg-black/40 border border-white/5 rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-white/10 group/stat">
                                    <p className="text-zinc-500 text-sm font-medium mb-2 flex items-center gap-2 uppercase tracking-wider">
                                        <stat.icon size={14} className="text-zinc-400 group-hover/stat:text-emerald-400 transition-colors" /> {stat.label}
                                    </p>
                                    <p className={`text-3xl font-display font-bold ${stat.color || 'text-white'}`}>{stat.val}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-amber-950/20 border border-amber-500/20 rounded-2xl p-8 text-center backdrop-blur-sm">
                            <AlertTriangle className="mx-auto text-amber-500 mb-4 drop-shadow-[0_0_10px_rgba(245,158,11,0.4)] animate-pulse" size={40} />
                            <h3 className="text-xl font-bold font-display text-amber-400 mb-2">No Fundamental Data</h3>
                            <p className="text-zinc-400 max-w-md mx-auto">
                                Check the <strong className="text-white">TARGET_KEYWORD</strong> in the  <code>.env</code> file. "{targetKeyword}" might not be a valid Yahoo Finance ticker.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Top Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="glass-panel p-8 rounded-3xl relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300">
                    <div className="absolute -right-4 -bottom-4 p-4 opacity-[0.03] group-hover:opacity-10 transition-opacity">
                        <BarChart2 size={120} />
                    </div>
                    <h3 className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2"><Activity size={14} /> Total Posts Scanned</h3>
                    <p className="text-5xl font-display font-black bg-gradient-to-br from-white to-zinc-500 bg-clip-text text-transparent">{manipulationStats.totalCount}</p>
                </div>

                <div className="glass-panel p-8 rounded-3xl relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300 border-t-emerald-500/30">
                    <div className="absolute -top-4 -right-4 p-4 opacity-5 text-emerald-400 group-hover:opacity-20 transition-opacity group-hover:rotate-12 duration-500">
                        <TrendingUp size={120} />
                    </div>
                    <h3 className="text-emerald-500/80 text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2"><Target size={14} /> Pure Organic Signals</h3>
                    <p className="text-5xl font-display font-black drop-shadow-[0_0_15px_rgba(16,185,129,0.3)] text-white">{manipulationStats.organicCount}</p>
                </div>

                <div className="glass-panel p-8 rounded-3xl relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300 border-b-rose-500/20">
                    <div className="absolute top-1/2 -translate-y-1/2 -right-4 p-4 opacity-5 text-rose-500 group-hover:opacity-20 transition-opacity group-hover:-rotate-12 duration-500">
                        <Bot size={120} />
                    </div>
                    <h3 className="text-rose-500/80 text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
                        <AlertTriangle size={14} /> Slop/Bots Blocked
                    </h3>
                    <p className="text-5xl font-display font-black text-rose-400 drop-shadow-[0_0_15px_rgba(244,63,94,0.3)]">{manipulationStats.manipulatedCount}</p>
                    <div className="text-xs text-rose-500/50 mt-3 font-medium uppercase tracking-widest">Weight neutralized to 0</div>
                </div>
            </div>

            {/* Nyckeltal (Avanza-style Key Ratios) Section */}
            {financialHistory && financialHistory.length > 0 && (
                <div className="glass-panel p-8 rounded-3xl mt-2 mb-2 group">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h2 className="text-2xl font-bold font-display flex items-center gap-3 text-zinc-100 mb-2">
                                <ListPlus className="text-blue-500" /> Nyckeltal
                            </h2>
                            <p className="text-sm text-zinc-500">Här visar vi utvecklingen för varje nyckeltal de senaste åren.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-y-10 gap-x-8">
                        {[
                            { key: 'eps', label: 'Vinst/aktie', format: (val: number) => `${val.toFixed(2)} USD` },
                            { key: 'revenue_per_share', label: 'Omsättning/aktie', format: (val: number) => `${val.toFixed(2)} USD` },
                            { key: 'roe', label: 'ROE', format: (val: number) => `${(val * 100).toFixed(2)}%` },
                            { key: 'net_debt_ebitda', label: 'Nettoskuld/EBITDA', format: (val: number) => val.toFixed(2) },
                            { key: 'pe_ratio', label: 'P/E-tal', format: (val: number) => val.toFixed(2) },
                            { key: 'ps_ratio', label: 'P/S-tal', format: (val: number) => val.toFixed(2) },
                            { key: 'pb_ratio', label: 'P/B-tal', format: (val: number) => val.toFixed(2) },
                            { key: 'ev_ebit', label: 'EV/EBIT', format: (val: number) => val.toFixed(2) },
                        ].map((metric, idx) => {
                            // Find the most recent non-null value for the header display
                            const latestValue = [...financialHistory].reverse().find(h => h[metric.key] != null)?.[metric.key] as number | undefined;

                            return (
                                <div key={idx} className="flex flex-col">
                                    <div className="text-xs text-zinc-400 mb-1">{metric.label}</div>
                                    <div className="text-lg font-bold text-zinc-100 mb-2">
                                        {latestValue != null ? metric.format(latestValue) : '-'}
                                    </div>
                                    <SparkBarChart data={financialHistory} dataKey={metric.key} />
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}


            {/* Charts Section */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                {/* Timeline Chart */}
                <div className="glass-panel rounded-3xl p-8 group">
                    <h2 className="text-2xl font-bold font-display mb-8 flex items-center gap-3 text-zinc-100">
                        <TrendingUp className="text-emerald-400 animate-pulse-slow" /> Sentiment Timeline
                    </h2>
                    <div className="h-96 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={recentSentiments} margin={{ top: 10, right: 30, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorSentimentPremium" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.6} />
                                        <stop offset="50%" stopColor="#34d399" stopOpacity={0.2} />
                                        <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0a" vertical={false} />
                                <XAxis dataKey="timeLabel" stroke="#52525b" tick={{ fill: '#a1a1aa', fontSize: 12, fontFamily: 'var(--font-inter)' }} axisLine={false} tickLine={false} dy={10} />
                                <YAxis stroke="#52525b" tick={{ fill: '#a1a1aa', fontSize: 12, fontFamily: 'var(--font-inter)' }} axisLine={false} tickLine={false} domain={[-1, 1]} dx={-10} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'rgba(9, 9, 11, 0.8)', backdropFilter: 'blur(12px)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '16px', padding: '12px 16px', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}
                                    itemStyle={{ color: '#10b981', fontWeight: 'bold' }}
                                    labelStyle={{ color: '#a1a1aa', marginBottom: '4px', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}
                                />
                                <Area type="monotone" dataKey="sentiment" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorSentimentPremium)" animationDuration={1500} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Gaussian Distribution Chart */}
                {gaussianData && (
                    <div className="glass-panel rounded-3xl p-8 group">
                        <div className="flex justify-between items-start mb-8">
                            <h2 className="text-2xl font-bold font-display flex items-center gap-3 text-zinc-100">
                                <Activity className="text-indigo-400 animate-pulse-slow" /> General Opinion Curve
                            </h2>
                            <div className="text-right bg-black/20 px-4 py-2 rounded-xl border border-white/5">
                                <div className="text-xs text-zinc-500 uppercase tracking-widest font-bold mb-1">Market Consensus</div>
                                <div className={`font-display font-black text-2xl ${gaussianData.mean > 0.2 ? 'text-emerald-400 drop-shadow-[0_0_10px_rgba(16,185,129,0.4)]' : gaussianData.mean < -0.2 ? 'text-rose-400 drop-shadow-[0_0_10px_rgba(244,63,94,0.4)]' : 'text-zinc-300'}`}>
                                    {(gaussianData.mean * 100).toFixed(0)}% <span className="text-sm font-medium tracking-normal opacity-60 ml-1">{gaussianData.mean > 0.2 ? 'Bullish' : gaussianData.mean < -0.2 ? 'Bearish' : 'Neutral'}</span>
                                </div>
                            </div>
                        </div>

                        <div className="h-96 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={gaussianData.curve} margin={{ top: 10, right: 30, left: -20, bottom: 20 }}>
                                    <defs>
                                        <linearGradient id="colorGaussianPremium" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#818cf8" stopOpacity={0.6} />
                                            <stop offset="50%" stopColor="#6366f1" stopOpacity={0.2} />
                                            <stop offset="100%" stopColor="#4f46e5" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0a" vertical={false} />
                                    <XAxis
                                        dataKey="sentiment"
                                        stroke="#52525b"
                                        tick={{ fill: '#a1a1aa', fontSize: 12, fontFamily: 'var(--font-inter)' }}
                                        axisLine={false}
                                        tickLine={false}
                                        domain={[-1, 1]}
                                        type="number"
                                        dy={10}
                                        label={{ value: "← Bearish | Organic Spread | Bullish →", position: "bottom", fill: "#52525b", fontSize: 11, fontWeight: "bold", textAnchor: "middle", dy: 15 }}
                                    />
                                    <YAxis hide={true} />
                                    <Tooltip
                                        cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 2, strokeDasharray: '5 5' }}
                                        contentStyle={{ backgroundColor: 'rgba(9, 9, 11, 0.8)', backdropFilter: 'blur(12px)', borderColor: 'rgba(99,102,241,0.3)', borderRadius: '16px', padding: '12px 16px', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}
                                        itemStyle={{ color: '#818cf8', fontWeight: 'bold' }}
                                        labelFormatter={(val) => `Sentiment Score: ${val}`}
                                        labelStyle={{ color: '#a1a1aa', marginBottom: '4px', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}
                                    />
                                    <ReferenceLine
                                        x={gaussianData.mean}
                                        stroke="#f43f5e"
                                        strokeWidth={2}
                                        strokeDasharray="4 4"
                                        label={{ position: 'top', value: 'MEAN', fill: '#f43f5e', fontSize: 10, fontWeight: 'bold' }}
                                    />
                                    <Area type="monotone" dataKey="density" stroke="#818cf8" strokeWidth={4} fillOpacity={1} fill="url(#colorGaussianPremium)" animationDuration={1500} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}
                {/* Insider Trades Module */}
                <div className="bg-zinc-900/40 backdrop-blur-xl border border-white/5 rounded-3xl p-8 mb-8 shadow-2xl relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

                    <div className="flex items-center justify-between mb-8 relative z-10">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-indigo-500/10 rounded-2xl ring-1 ring-indigo-500/20">
                                <Briefcase className="w-6 h-6 text-indigo-400" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">Insynshandel</h2>
                                <p className="text-sm text-zinc-500 font-medium tracking-wide mt-1">LATEST CORPORATE INSIDER TRANSACTIONS</p>
                            </div>
                        </div>
                    </div>

                    {insiderTrades && insiderTrades.length > 0 && (
                        <>
                            {/* Summary Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 relative z-10">
                                <div className="bg-black/20 border border-emerald-500/20 rounded-2xl p-5 hover:bg-black/40 transition-colors group/stat">
                                    <div className="text-emerald-500 text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
                                        Total Buy Volume
                                    </div>
                                    <div className="text-3xl font-display font-black text-emerald-400">
                                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(insiderStats.buyVolume)}
                                    </div>
                                </div>
                                <div className="bg-black/20 border border-rose-500/20 rounded-2xl p-5 hover:bg-black/40 transition-colors group/stat">
                                    <div className="text-rose-500 text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
                                        Total Sell Volume
                                    </div>
                                    <div className="text-3xl font-display font-black text-rose-400">
                                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(insiderStats.sellVolume)}
                                    </div>
                                </div>
                                <div className={`bg-black/20 border rounded-2xl p-5 hover:bg-black/40 transition-colors group/stat ${insiderStats.netVolume >= 0 ? 'border-emerald-500/20' : 'border-rose-500/20'}`}>
                                    <div className={`text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-2 ${insiderStats.netVolume >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                        Net Volume
                                    </div>
                                    <div className={`text-3xl font-display font-black ${insiderStats.netVolume >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        {insiderStats.netVolume > 0 ? '+' : ''}{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(insiderStats.netVolume)}
                                    </div>
                                </div>
                            </div>

                            {/* Aggregation Chart */}
                            {insiderStats.chartData.length > 0 && (
                                <div className="h-64 mb-8 relative z-10">
                                    <h3 className="text-zinc-400 text-sm font-semibold mb-4 tracking-wider uppercase">Volume Trend</h3>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={insiderStats.chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0a" vertical={false} />
                                            <XAxis dataKey="month" stroke="#52525b" tick={{ fill: '#a1a1aa', fontSize: 12 }} axisLine={false} tickLine={false} dy={10} />
                                            <YAxis stroke="#52525b" tick={{ fill: '#a1a1aa', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(value) => `$${(value / 1e6).toFixed(1)}M`} dx={-10} />
                                            <Tooltip
                                                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                                contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px' }}
                                                formatter={(value: number, name: string) => [new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value), name.toUpperCase()]}
                                                labelStyle={{ color: '#a1a1aa', marginBottom: '4px' }}
                                            />
                                            <Bar dataKey="buy" name="Buy Volume" fill="#10b981" radius={[4, 4, 0, 0]} />
                                            <Bar dataKey="sell" name="Sell Volume" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            )}

                            {/* Filters */}
                            <div className="flex items-center gap-2 mb-6 relative z-10">
                                <button onClick={() => setTradeFilter('all')} className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all ${tradeFilter === 'all' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30' : 'bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white'}`}>All Trades</button>
                                <button onClick={() => setTradeFilter('buy')} className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all ${tradeFilter === 'buy' ? 'bg-emerald-500 text-emerald-950 shadow-lg shadow-emerald-500/30' : 'bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white'}`}>Buys Only</button>
                                <button onClick={() => setTradeFilter('sell')} className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all ${tradeFilter === 'sell' ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30' : 'bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white'}`}>Sells Only</button>
                            </div>
                        </>
                    )}

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[800px]">
                            <thead>
                                <tr className="border-b border-white/5 text-zinc-500 text-xs uppercase tracking-wider">
                                    <th className="pb-4 font-semibold">Insider</th>
                                    <th className="pb-4 font-semibold">Position</th>
                                    <th className="pb-4 font-semibold text-center">Transaktion</th>
                                    <th className="pb-4 font-semibold text-right">Antal</th>
                                    <th className="pb-4 font-semibold text-right">Värde (USD)</th>
                                    <th className="pb-4 font-semibold text-right">Datum</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {insiderStats.filteredTrades && insiderStats.filteredTrades.length > 0 ? insiderStats.filteredTrades.map((trade: any) => (
                                    <tr key={trade.id} className="hover:bg-white/[0.02] transition-colors">
                                        <td className="py-4 font-medium text-zinc-200">{trade.insider_name}</td>
                                        <td className="py-4 text-zinc-400 text-sm max-w-[200px] truncate" title={trade.position}>{trade.position || '-'}</td>
                                        <td className="py-4 text-center">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${trade.transaction?.toLowerCase().includes('buy') || trade.transaction?.toLowerCase().includes('purchase')
                                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                                : trade.transaction?.toLowerCase().includes('sell') || trade.transaction?.toLowerCase().includes('sale')
                                                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                                    : 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20'
                                                }`}>
                                                {trade.transaction}
                                            </span>
                                        </td>
                                        <td className="py-4 text-right text-zinc-300 font-medium">{trade.shares?.toLocaleString()}</td>
                                        <td className="py-4 text-right text-zinc-300 font-medium">
                                            {trade.value ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(trade.value) : '-'}
                                        </td>
                                        <td className="py-4 text-right text-zinc-500 text-sm">
                                            {new Date(trade.date).toLocaleDateString('sv-SE')}
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={6} className="py-8 text-center text-zinc-500 text-sm">
                                            Inga insynstransaktioner hittades.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    );

}
