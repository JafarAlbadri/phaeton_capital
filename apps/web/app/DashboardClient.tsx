"use client";

import { useTransition, useState } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Activity, AlertTriangle, RefreshCw, BarChart2, TrendingUp, TrendingDown, Bot } from 'lucide-react';

export default function DashboardClient({
    recentSentiments,
    topMentions,
    manipulationStats
}: any) {
    const [isPending, startTransition] = useTransition();
    const [loading, setLoading] = useState(false);

    const triggerScrape = () => {
        setLoading(true);
        fetch('/api/scrape', { method: 'POST' })
            .then(res => res.json())
            .then(data => {
                alert(data.message);
            })
            .finally(() => {
                setLoading(false);
            });
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent flex items-center gap-3">
                        <Activity className="text-emerald-400" size={36} /> SentimentCrowd
                    </h1>
                    <p className="text-zinc-400 mt-2 text-lg">100% Bun-Native Trading Intelligence Pipeline</p>
                </div>
                <button
                    onClick={triggerScrape}
                    disabled={loading}
                    className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white px-6 py-3 rounded-lg font-medium transition-colors border border-zinc-700 focus:ring-2 focus:ring-emerald-500/50 disabled:opacity-50"
                >
                    <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
                    {loading ? 'Scanning...' : 'Manual Scan'}
                </button>
            </div>

            {/* Top Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <BarChart2 size={64} />
                    </div>
                    <h3 className="text-zinc-400 text-sm font-medium uppercase tracking-wider mb-2">Analyzed Posts</h3>
                    <p className="text-4xl font-bold text-white">{manipulationStats.totalCount}</p>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-lg relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 text-emerald-400 group-hover:opacity-20 transition-opacity">
                        <TrendingUp size={64} />
                    </div>
                    <h3 className="text-zinc-400 text-sm font-medium uppercase tracking-wider mb-2">Organic Signals</h3>
                    <p className="text-4xl font-bold text-white">{manipulationStats.organicCount}</p>
                </div>

                <div className="bg-zinc-900 border border-red-900/30 rounded-xl p-6 shadow-lg relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 text-red-500 group-hover:opacity-20 transition-opacity">
                        <Bot size={64} />
                    </div>
                    <h3 className="text-red-400/80 text-sm font-medium uppercase tracking-wider mb-2 flex items-center gap-2">
                        <AlertTriangle size={16} /> Slop/Bots Blocked
                    </h3>
                    <p className="text-4xl font-bold text-red-500">{manipulationStats.manipulatedCount}</p>
                    <p className="text-xs text-zinc-500 mt-2">Zero-weight applied to Sentiment</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Timeline Chart */}
                <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-lg">
                    <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                        <TrendingUp className="text-emerald-400" /> Sentiment Timeline
                    </h2>
                    <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={recentSentiments} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorSentiment" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#34d399" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                                <XAxis dataKey="timeLabel" stroke="#71717a" tick={{ fill: '#71717a' }} axisLine={false} tickLine={false} />
                                <YAxis stroke="#71717a" tick={{ fill: '#71717a' }} axisLine={false} tickLine={false} domain={[-1, 1]} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }}
                                    itemStyle={{ color: '#e4e4e7' }}
                                />
                                <Area type="monotone" dataKey="sentiment" stroke="#34d399" strokeWidth={3} fillOpacity={1} fill="url(#colorSentiment)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Top Tickers Bar Chart */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-lg">
                    <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                        <BarChart2 className="text-blue-400" /> Top Mentioned Tickers
                    </h2>
                    <p className="text-xs text-zinc-500 mb-4">* Excludes manipulated (pump & dump) posts</p>
                    <div className="h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={topMentions} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={true} vertical={false} />
                                <XAxis type="number" stroke="#71717a" hide />
                                <YAxis dataKey="ticker" type="category" stroke="#e4e4e7" axisLine={false} tickLine={false} width={60} />
                                <Tooltip
                                    cursor={{ fill: '#27272a' }}
                                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }}
                                />
                                <Bar dataKey="mentions" fill="#60a5fa" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

        </div>
    );
}
