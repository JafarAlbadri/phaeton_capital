"use client";

import { useTransition, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';
import { Activity, AlertTriangle, RefreshCw, BarChart2, TrendingUp, TrendingDown, Bot, DollarSign, Target, Briefcase, Info, Search, ListPlus } from 'lucide-react';

const SparkBarChart = ({ data, dataKey }: { data: any[], dataKey: string }) => {
    if (!data || data.length === 0 || data.every(d => d[dataKey] == null)) {
        return <div className="h-16 w-full mt-2 flex items-center justify-center text-[10px] text-zinc-600 font-mono uppercase">ERR_NO_DATA</div>;
    }
    return (
        <div className="h-16 w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data}>
                    <Tooltip
                        contentStyle={{ backgroundColor: '#000', borderColor: '#333', fontSize: '10px', borderRadius: '0' }}
                        itemStyle={{ color: '#ffb700' }}
                        labelFormatter={(label) => `YR: ${label}`}
                        cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                        formatter={(val: number) => [val.toFixed(2), dataKey.toUpperCase()]}
                    />
                    <XAxis dataKey="year" hide />
                    <Bar dataKey={dataKey} radius={[0, 0, 0, 0]} isAnimationActive={false}>
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry[dataKey] != null && entry[dataKey] < 0 ? '#ff0000' : '#ffb700'} />
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
    insiderTrades,
    quantMetrics
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

    const mergedDistributionData = useMemo(() => {
        if (!gaussianData || !gaussianData.curve) return [];
        const base = [...gaussianData.curve];
        if (quantMetrics && quantMetrics.kde_data && Array.isArray(quantMetrics.kde_data)) {
            base.forEach(b => {
                const nearestKde = quantMetrics.kde_data.reduce((prev: any, curr: any) => 
                    Math.abs(curr.x - b.sentiment) < Math.abs(prev.x - b.sentiment) ? curr : prev
                );
                b.kde_density = nearestKde ? nearestKde.density : 0;
            });
        }
        return base;
    }, [gaussianData, quantMetrics]);

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        triggerScrape();
    };

    const triggerScrape = () => {
        if (!searchQuery.trim()) return;
        setLoading(true);
        const keywordToScrape = searchQuery.trim() || targetKeyword;
        fetch('/api/scrape', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ keyword: keywordToScrape })
        })
            .then(res => res.json())
            .then(data => {
                startTransition(() => {
                    router.push(`/?q=${encodeURIComponent(keywordToScrape)}`);
                    router.refresh();
                });
                setLoading(false);
            })
            .catch(() => {
                setLoading(false);
            });
    };

    return (
        <div className="p-4 max-w-7xl mx-auto space-y-4 relative z-10 font-sans">
            {/* Header */}
            <header className="flex flex-col md:flex-row items-start md:items-center justify-between border border-border bg-background p-4 rounded-none">
                <div>
                    <h1 className="text-2xl font-bold text-terminal-amber flex items-center gap-2 uppercase tracking-tight">
                        <Activity className="text-terminal-amber" size={24} />
                        SentimentCrowd
                    </h1>
                    <p className="text-zinc-500 mt-1 text-xs font-mono tracking-widest uppercase">100% Bun-Native Trading Intelligence Pipeline</p>
                </div>

                <div className="flex items-center gap-4 mt-4 md:mt-0">
                    {/* USD to SEK Ticker Pill */}
                    {usdSekRate && (
                        <div className="border border-border bg-black px-3 py-1 flex items-center justify-center gap-2">
                            <span className="font-bold tracking-wider text-zinc-500 text-xs">USD/SEK</span>
                            <span className="text-sm font-bold text-terminal-amber tracking-widest">{usdSekRate.toFixed(4)}</span>
                        </div>
                    )}

                    <form onSubmit={handleSearchSubmit} className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search size={14} className="text-zinc-600" />
                        </div>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="TICKER..."
                            className="w-48 md:w-64 pl-9 pr-4 py-1.5 bg-black border border-border rounded-none text-terminal-amber placeholder-zinc-700 focus:outline-none focus:ring-1 focus:ring-terminal-amber transition-none font-bold uppercase tracking-wider text-sm"
                        />
                        {isPending && (
                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                                <div className="w-3 h-3 border border-terminal-amber border-t-transparent animate-spin"></div>
                            </div>
                        )}
                    </form>

                    <button
                        onClick={triggerScrape}
                        disabled={loading}
                        className="flex items-center gap-2 bg-terminal-amber text-black border border-terminal-amber px-4 py-1.5 font-bold uppercase text-sm hover:bg-yellow-500 disabled:opacity-50 transition-none"
                    >
                        <RefreshCw size={14} className={`${loading ? "animate-spin" : ""}`} />
                        <span>{loading ? 'SCANNING' : 'SCAN'}</span>
                    </button>
                </div>
            </header>

            {/* Fundamental Analysis Card */}
            <div className="border border-border bg-background p-4 mb-4">
                <div className="relative z-10">
                    <h2 className="text-sm font-bold uppercase mb-4 flex items-center gap-2 text-zinc-400 border-b border-border pb-2">
                        <Info size={14} className="text-terminal-amber" /> FUNDAMENTAL P/L
                        <span className="text-terminal-amber bg-zinc-900 border border-zinc-800 px-2 py-0.5 text-xs ml-2">
                            {targetKeyword.toUpperCase()}
                        </span>
                    </h2>

                    {fundamentalData ? (
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            {[
                                { label: 'PX_LAST', val: fundamentalData.current_price?.toFixed(2) || 'N/A', icon: DollarSign },
                                { label: 'PX_TARGET', val: fundamentalData.target_price?.toFixed(2) || 'N/A', icon: Target },
                                { label: 'PE_RATIO', val: fundamentalData.pe_ratio?.toFixed(2) || 'N/A', icon: Activity },
                                { label: 'EQY_REC_CONS', val: fundamentalData.recommendation || 'N/A', icon: AlertTriangle, color: 'text-terminal-green capitalize' },
                                { label: '52W_HIGH', val: fundamentalData.high_52_week?.toFixed(2) || 'N/A', icon: TrendingUp },
                                { label: '52W_LOW', val: fundamentalData.low_52_week?.toFixed(2) || 'N/A', icon: TrendingDown },
                                { label: 'CUR_MKT_CAP', val: fundamentalData.market_cap ? (Number(fundamentalData.market_cap) / 1e9).toFixed(2) + 'B' : 'N/A', icon: Briefcase }
                            ].map((stat, idx) => (
                                <div key={idx} className="border border-border bg-black p-3 group/stat">
                                    <p className="text-zinc-600 text-xs font-bold mb-1 flex items-center gap-2 uppercase tracking-wide">
                                        <stat.icon size={12} className="text-zinc-700 group-hover/stat:text-terminal-amber transition-colors" /> {stat.label}
                                    </p>
                                    <p className={`text-xl font-bold font-mono ${stat.color || 'text-terminal-amber'}`}>{stat.val}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="border border-terminal-red bg-black p-4 text-center">
                            <AlertTriangle className="mx-auto text-terminal-red mb-2" size={24} />
                            <h3 className="text-sm font-bold text-terminal-red mb-1 uppercase">ERR_SYS_NO_DATA</h3>
                            <p className="text-zinc-500 text-xs uppercase">
                                KEYWORD "{targetKeyword}" INVALID TICKER SYMBOL
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Top Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="border border-border bg-background p-4 flex flex-col justify-between">
                    <h3 className="text-zinc-500 text-xs font-bold uppercase mb-1 flex items-center gap-2"><Activity size={12} /> VOL_TOT_SCANNED</h3>
                    <p className="text-3xl font-bold text-terminal-amber font-mono">{manipulationStats.totalCount}</p>
                </div>

                <div className="border border-border bg-background p-4 flex flex-col justify-between">
                    <h3 className="text-terminal-green text-xs font-bold uppercase mb-1 flex items-center gap-2"><Target size={12} /> VOL_ORG_ANALYZED(n)</h3>
                    <p className="text-3xl font-bold text-terminal-green font-mono">{gaussianData.n || manipulationStats.organicCount}</p>
                </div>

                <div className="border border-border bg-background p-4 flex flex-col justify-between">
                    <h3 className="text-terminal-red text-xs font-bold uppercase mb-1 flex items-center gap-2">
                        <AlertTriangle size={12} /> ERR_SLOP_BLOCKED
                    </h3>
                    <p className="text-3xl font-bold text-terminal-red font-mono">{manipulationStats.manipulatedCount}</p>
                    <div className="text-[10px] text-terminal-red mt-1 uppercase">WT_NEUTRALIZED = 0</div>
                </div>
            </div>

            {/* Advanced Quant Section */}
            {quantMetrics && (
                <div className="border border-border bg-background p-4 mb-4">
                    <div className="flex justify-between items-center mb-4 border-b border-border pb-2">
                        <h2 className="text-sm font-bold flex items-center gap-2 text-zinc-400 uppercase">
                            <Bot size={14} className="text-terminal-amber" /> ADVANCED QUANTITATIVE MODELS
                        </h2>
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                        <div className="border border-zinc-800 bg-zinc-950 p-3">
                            <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">HMM REGIME</div>
                            <div className={`text-xl font-bold font-mono ${quantMetrics.hmm_state === 1 ? 'text-terminal-green' : (quantMetrics.hmm_state === 0 ? 'text-terminal-red' : 'text-terminal-amber')}`}>
                                {quantMetrics.hmm_state === 1 ? 'BULL' : (quantMetrics.hmm_state === 0 ? 'BEAR' : 'CALC...')}
                            </div>
                        </div>
                        <div className="border border-zinc-800 bg-zinc-950 p-3">
                            <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">KELLY ALLOC.</div>
                            <div className="text-xl font-bold font-mono text-terminal-amber">
                                {quantMetrics.kelly_fraction != null ? `${(quantMetrics.kelly_fraction * 100).toFixed(1)}%` : 'N/A'}
                            </div>
                        </div>
                        <div className="border border-zinc-800 bg-zinc-950 p-3">
                            <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">HURST EXP.</div>
                            <div className="text-xl font-bold font-mono text-terminal-amber">
                                {quantMetrics.hurst_exponent != null ? quantMetrics.hurst_exponent.toFixed(2) : 'N/A'}
                            </div>
                        </div>
                        <div className="border border-zinc-800 bg-zinc-950 p-3">
                            <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">GRANGER CAUSALITY (p)</div>
                            <div className={`text-xl font-bold font-mono ${quantMetrics.granger_p_value != null && quantMetrics.granger_p_value < 0.05 ? 'text-terminal-green' : 'text-zinc-500'}`}>
                                {quantMetrics.granger_p_value != null ? quantMetrics.granger_p_value.toFixed(3) : 'N/A'}
                            </div>
                        </div>
                        <div className="border border-zinc-800 bg-zinc-950 p-3">
                            <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">MC(15d) E[x]</div>
                            <div className="text-xl font-bold font-mono text-terminal-amber">
                                {quantMetrics.monte_carlo_mean != null ? new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(quantMetrics.monte_carlo_mean) : 'N/A'}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Nyckeltal (Avanza-style Key Ratios) Section */}
            {financialHistory && financialHistory.length > 0 && (
                <div className="border border-border bg-background p-4 mb-4">
                    <div className="flex justify-between items-center mb-4 border-b border-border pb-2">
                        <div>
                            <h2 className="text-sm font-bold flex items-center gap-2 text-zinc-400 uppercase">
                                <ListPlus size={14} className="text-terminal-amber" /> FA_HIST_RATIOS
                            </h2>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-y-6 gap-x-4">
                        {[
                            { key: 'eps', label: 'EPS', format: (val: number) => val.toFixed(2) },
                            { key: 'revenue_per_share', label: 'REV/SH', format: (val: number) => val.toFixed(2) },
                            { key: 'roe', label: 'ROE', format: (val: number) => `${(val * 100).toFixed(2)}%` },
                            { key: 'net_debt_ebitda', label: 'ND/EBITDA', format: (val: number) => val.toFixed(2) },
                            { key: 'pe_ratio', label: 'P/E', format: (val: number) => val.toFixed(2) },
                            { key: 'ps_ratio', label: 'P/S', format: (val: number) => val.toFixed(2) },
                            { key: 'pb_ratio', label: 'P/B', format: (val: number) => val.toFixed(2) },
                            { key: 'ev_ebit', label: 'EV/EBIT', format: (val: number) => val.toFixed(2) },
                        ].map((metric, idx) => {
                            const latestValue = [...financialHistory].reverse().find(h => h[metric.key] != null)?.[metric.key] as number | undefined;

                            return (
                                <div key={idx} className="flex flex-col border border-zinc-800 bg-zinc-950 p-2">
                                    <div className="text-[10px] text-zinc-500 mb-1 uppercase tracking-wider">{metric.label}</div>
                                    <div className="text-md font-bold text-terminal-amber mb-1 font-mono">
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
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {/* Timeline Chart */}
                <div className="border border-border bg-background p-4 mb-4">
                    <h2 className="text-sm font-bold uppercase mb-4 flex items-center gap-2 text-zinc-400 border-b border-border pb-2">
                        <TrendingUp size={14} className="text-terminal-amber" /> SENTIMENT TIMELINE
                    </h2>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={recentSentiments} margin={{ top: 10, right: 30, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="1 3" stroke="#333333" vertical={false} />
                                <XAxis dataKey="timeLabel" stroke="#52525b" tick={{ fill: '#ffb700', fontSize: 10, fontFamily: 'monospace' }} axisLine={false} tickLine={false} dy={10} />
                                <YAxis stroke="#52525b" tick={{ fill: '#ffb700', fontSize: 10, fontFamily: 'monospace' }} axisLine={false} tickLine={false} domain={[-1, 1]} dx={-10} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#000', border: '1px solid #333', padding: '8px', fontSize: '10px', textTransform: 'uppercase' }}
                                    itemStyle={{ color: '#ffb700', fontWeight: 'bold' }}
                                    labelStyle={{ color: '#aaa', marginBottom: '2px' }}
                                />
                                <Area type="step" dataKey="sentiment" stroke="#ffb700" strokeWidth={1} fillOpacity={0.1} fill="#ffb700" isAnimationActive={false} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Gaussian Distribution Chart */}
                {gaussianData && (
                    <div className="border border-border bg-background p-4 mb-4">
                        <div className="flex justify-between items-start mb-4 border-b border-border pb-2">
                            <h2 className="text-sm font-bold flex items-center gap-2 text-zinc-400 uppercase">
                                <Activity size={14} className="text-terminal-amber" /> GEN_OPINION_CURVE
                            </h2>
                            <div className="text-right">
                                <div className="text-[10px] text-zinc-500 uppercase font-bold mb-1">MKT_CONSENSUS(N={gaussianData.n})</div>
                                <div className={`font-bold text-xl font-mono ${gaussianData.mean > 0 ? 'text-terminal-green' : 'text-terminal-red'}`}>
                                    {(gaussianData.mean * 100).toFixed(0)}% <span className="text-xs ml-1">
                                        {gaussianData.isSignificant ? (gaussianData.mean > 0 ? 'BULL' : 'BEAR') : 'NEUTRAL'}
                                    </span>
                                </div>
                                <div className="text-[10px] text-zinc-500 mt-1 font-mono uppercase">
                                    95% CI: [{Math.round(gaussianData.lowerBound * 100)}%, {Math.round(gaussianData.upperBound * 100)}%] | P={gaussianData.pValue?.toFixed(3)}
                                </div>
                            </div>
                        </div>

                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={mergedDistributionData} margin={{ top: 10, right: 30, left: -20, bottom: 20 }}>
                                    <CartesianGrid strokeDasharray="1 3" stroke="#333333" vertical={false} />
                                    <XAxis
                                        dataKey="sentiment"
                                        stroke="#52525b"
                                        tick={{ fill: '#ffb700', fontSize: 10, fontFamily: 'monospace' }}
                                        axisLine={false}
                                        tickLine={false}
                                        domain={[-1, 1]}
                                        type="number"
                                        dy={10}
                                        label={{ value: "← BEAR | SPREAD | BULL →", position: "bottom", fill: "#52525b", fontSize: 10, fontFamily: "monospace", dy: 15 }}
                                    />
                                    <YAxis hide={true} />
                                    <Tooltip
                                        cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1, strokeDasharray: '2 2' }}
                                        contentStyle={{ backgroundColor: '#000', border: '1px solid #333', padding: '8px', fontSize: '10px', textTransform: 'uppercase' }}
                                        itemStyle={{ color: '#ffb700', fontWeight: 'bold' }}
                                        labelFormatter={(val) => `SCORE: ${val}`}
                                        labelStyle={{ color: '#aaa', marginBottom: '2px' }}
                                    />
                                    <ReferenceLine
                                        x={gaussianData.mean}
                                        stroke="#00ff00"
                                        strokeWidth={1}
                                        strokeDasharray="2 2"
                                        label={{ position: 'top', value: 'MEAN', fill: '#00ff00', fontSize: 10 }}
                                    />
                                    <Area type="monotone" dataKey="density" stroke="#ffb700" strokeWidth={1} fillOpacity={0.1} fill="#ffb700" isAnimationActive={false} />
                                    <Area type="monotone" dataKey="kde_density" stroke="#3b82f6" strokeWidth={1} fillOpacity={0.15} fill="#3b82f6" isAnimationActive={false} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}
                {/* Insider Trades Module */}
                <div className="border border-border bg-background p-4 mb-4 col-span-1 xl:col-span-2">
                    <div className="flex items-center justify-between mb-4 border-b border-border pb-2">
                        <div className="flex items-center gap-2">
                            <Briefcase size={14} className="text-terminal-amber" />
                            <h2 className="text-sm font-bold uppercase text-zinc-400">INSYN_TRANSACTIONS</h2>
                        </div>
                    </div>

                    {insiderTrades && insiderTrades.length > 0 && (
                        <>
                            {/* Summary Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                <div className="border border-zinc-800 bg-zinc-950 p-3 flex flex-col justify-between">
                                    <div className="text-terminal-green text-[10px] font-bold uppercase tracking-widest mb-1">
                                        VOL_BUY
                                    </div>
                                    <div className="text-2xl font-bold font-mono text-terminal-green">
                                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(insiderStats.buyVolume)}
                                    </div>
                                </div>
                                <div className="border border-zinc-800 bg-zinc-950 p-3 flex flex-col justify-between">
                                    <div className="text-terminal-red text-[10px] font-bold uppercase tracking-widest mb-1">
                                        VOL_SELL
                                    </div>
                                    <div className="text-2xl font-bold font-mono text-terminal-red">
                                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(insiderStats.sellVolume)}
                                    </div>
                                </div>
                                <div className="border border-zinc-800 bg-zinc-950 p-3 flex flex-col justify-between">
                                    <div className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${insiderStats.netVolume >= 0 ? 'text-terminal-green' : 'text-terminal-red'}`}>
                                        NET_VOL
                                    </div>
                                    <div className={`text-2xl font-bold font-mono ${insiderStats.netVolume >= 0 ? 'text-terminal-green' : 'text-terminal-red'}`}>
                                        {insiderStats.netVolume > 0 ? '+' : ''}{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(insiderStats.netVolume)}
                                    </div>
                                </div>
                            </div>

                            {/* Aggregation Chart */}
                            {insiderStats.chartData.length > 0 && (
                                <div className="h-48 mb-4">
                                    <h3 className="text-zinc-600 text-[10px] font-bold mb-2 tracking-wider uppercase">VOL_TREND_HIST</h3>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={insiderStats.chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="1 3" stroke="#333333" vertical={false} />
                                            <XAxis dataKey="month" stroke="#52525b" tick={{ fill: '#ffb700', fontSize: 10, fontFamily: 'monospace' }} axisLine={false} tickLine={false} dy={10} />
                                            <YAxis stroke="#52525b" tick={{ fill: '#ffb700', fontSize: 10, fontFamily: 'monospace' }} axisLine={false} tickLine={false} tickFormatter={(value) => `$${(value / 1e6).toFixed(1)}M`} dx={-10} />
                                            <Tooltip
                                                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                                contentStyle={{ backgroundColor: '#000', border: '1px solid #333', borderRadius: '0' }}
                                                formatter={(value: number, name: string) => [new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value), name.toUpperCase()]}
                                                labelStyle={{ color: '#aaa', marginBottom: '2px', fontSize: '10px' }}
                                                itemStyle={{ fontSize: '10px', fontWeight: 'bold' }}
                                            />
                                            <Bar dataKey="buy" name="Buy Volume" fill="#00ff00" radius={[0, 0, 0, 0]} isAnimationActive={false} />
                                            <Bar dataKey="sell" name="Sell Volume" fill="#ff0000" radius={[0, 0, 0, 0]} isAnimationActive={false} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            )}

                            {/* Filters */}
                            <div className="flex items-center gap-2 mb-4">
                                <button onClick={() => setTradeFilter('all')} className={`px-2 py-1 text-[10px] font-bold border ${tradeFilter === 'all' ? 'bg-terminal-amber text-black border-terminal-amber' : 'bg-black text-terminal-amber border-border hover:bg-zinc-900'}`}>ALL</button>
                                <button onClick={() => setTradeFilter('buy')} className={`px-2 py-1 text-[10px] font-bold border ${tradeFilter === 'buy' ? 'bg-terminal-green text-black border-terminal-green' : 'bg-black text-terminal-amber border-border hover:bg-zinc-900'}`}>BUYS</button>
                                <button onClick={() => setTradeFilter('sell')} className={`px-2 py-1 text-[10px] font-bold border ${tradeFilter === 'sell' ? 'bg-terminal-red text-black border-terminal-red' : 'bg-black text-terminal-amber border-border hover:bg-zinc-900'}`}>SELLS</button>
                            </div>
                        </>
                    )}

                    <div className="overflow-x-auto">
                        <table className="w-full text-left font-mono text-[10px] md:text-xs">
                            <thead>
                                <tr className="border-b border-zinc-800 text-zinc-500 uppercase tracking-wider">
                                    <th className="py-2 font-normal">INSIDER</th>
                                    <th className="py-2 font-normal">POS</th>
                                    <th className="py-2 font-normal text-center">TYPE</th>
                                    <th className="py-2 font-normal text-right">QTY</th>
                                    <th className="py-2 font-normal text-right">VAL_USD</th>
                                    <th className="py-2 font-normal text-right">DATE</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-900">
                                {insiderStats.filteredTrades && insiderStats.filteredTrades.length > 0 ? insiderStats.filteredTrades.map((trade: any) => (
                                    <tr key={trade.id} className="hover:bg-zinc-950 transition-colors">
                                        <td className="py-2 text-terminal-amber truncate max-w-[150px]">{trade.insider_name}</td>
                                        <td className="py-2 text-zinc-400 max-w-[100px] truncate">{trade.position || '-'}</td>
                                        <td className="py-2 text-center">
                                            <span className={`px-1 py-0.5 border ${trade.transaction?.toLowerCase().includes('buy') || trade.transaction?.toLowerCase().includes('purchase')
                                                ? 'bg-black text-terminal-green border-terminal-green'
                                                : trade.transaction?.toLowerCase().includes('sell') || trade.transaction?.toLowerCase().includes('sale')
                                                    ? 'bg-black text-terminal-red border-terminal-red'
                                                    : 'bg-black text-zinc-400 border-zinc-600'
                                                }`}>
                                                {trade.transaction}
                                            </span>
                                        </td>
                                        <td className="py-2 text-right text-terminal-amber">{trade.shares?.toLocaleString()}</td>
                                        <td className="py-2 text-right text-terminal-amber">
                                            {trade.value ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(trade.value) : '-'}
                                        </td>
                                        <td className="py-2 text-right text-zinc-500">
                                            {new Date(trade.date).toLocaleDateString('sv-SE')}
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={6} className="py-4 text-center text-zinc-600 uppercase">
                                            NO_DATA_FOUND
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
