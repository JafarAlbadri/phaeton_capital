"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    TrendingUp, TrendingDown, Minus, RefreshCw, Star, StarOff,
    ChevronUp, ChevronDown, AlertTriangle, Shield
} from "lucide-react";

// ── Signal badge ───────────────────────────────────────────────────────────────
const SIG_COLORS: Record<string, string> = {
    STRONG_BUY:  "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    BUY:         "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
    HOLD:        "bg-amber-500/10   text-amber-400   border-amber-500/20",
    SELL:        "bg-red-500/10     text-red-400     border-red-500/20",
    STRONG_SELL: "bg-red-500/15     text-red-400     border-red-500/30",
};

function SignalBadge({ signal }: { signal: string | null }) {
    if (!signal) return <span className="text-[#8F8C80]">—</span>;
    const word = signal.replace("_", " ");
    return (
        <span className={`px-2 py-0.5 rounded text-[10px] font-700 tracking-[0.06em] border ${SIG_COLORS[signal] ?? "text-[#A6A296]"}`}>
            {word}
        </span>
    );
}

// ── Regime badge ───────────────────────────────────────────────────────────────
function RegimeBadge({ state }: { state: number | null }) {
    if (state == null) return <span className="text-[#8F8C80]">—</span>;
    if (state === 2) return <span className="text-[10px] font-700 text-emerald-400">🟢 Bull</span>;
    if (state === 1) return <span className="text-[10px] font-700 text-amber-400">🟡 Neutral</span>;
    return <span className="text-[10px] font-700 text-red-400">🔴 Bear</span>;
}

// ── Score bar ──────────────────────────────────────────────────────────────────
function ScorePill({ value }: { value: number | null }) {
    if (value == null) return <span className="text-[#8F8C80] font-mono text-[11px]">—</span>;
    const color = value >= 60 ? "#7FA886" : value >= 40 ? "#D97757" : "#D9776B";
    return (
        <span className="font-mono text-[12px] font-700" style={{ color }}>
            {value.toFixed(1)}
        </span>
    );
}

// ── Risk dots ─────────────────────────────────────────────────────────────────
function RiskDots({ rating }: { rating: number | null }) {
    if (rating == null) return <span className="text-[#8F8C80]">—</span>;
    return (
        <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map(n => (
                <div key={n} className={`w-1.5 h-1.5 rounded-full ${n <= rating ? "bg-red-400" : "bg-[#3A3833]"}`} />
            ))}
        </div>
    );
}

// ── Sort indicator ────────────────────────────────────────────────────────────
type SortOrder = "asc" | "desc";
function SortIcon({ field, current, order }: { field: string; current: string; order: SortOrder }) {
    if (field !== current) return null;
    return order === "desc" ? <ChevronDown className="w-3 h-3 inline ml-0.5" /> : <ChevronUp className="w-3 h-3 inline ml-0.5" />;
}

// ── Main component ────────────────────────────────────────────────────────────
const WATCHLIST_KEY = "phaeton_watchlist";

function getWatchlist(): string[] {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(localStorage.getItem(WATCHLIST_KEY) || "[]"); } catch { return []; }
}

function saveWatchlist(tickers: string[]) {
    if (typeof window === "undefined") return;
    localStorage.setItem(WATCHLIST_KEY, JSON.stringify([...new Set(tickers)]));
}

export interface ScreenerRow {
    ticker: string;
    composite15d: number | null;
    composite30d: number | null;
    composite90d: number | null;
    signal15d: string | null;
    sentimentScore: number | null;
    hmmState: number | null;
    rsi: number | null;
    technicalSignal: string | null;
    lastPrice: number | null;
    riskRating: number | null;
}

interface ScreenerGridProps {
    initialTickers?: string[];
    showAddButton?: boolean;
}

export default function ScreenerGrid({ initialTickers, showAddButton = true }: ScreenerGridProps) {
    const router = useRouter();
    const [rows, setRows] = useState<ScreenerRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sortBy, setSortBy] = useState<string>("composite15d");
    const [order, setOrder] = useState<SortOrder>("desc");
    const [watchlist, setWatchlist] = useState<string[]>([]);
    const [addInput, setAddInput] = useState("");

    const MAX_TICKERS = 20;

    const tickers = initialTickers ?? watchlist;

    useEffect(() => {
        setWatchlist(getWatchlist());
    }, []);

    const fetchData = useCallback(async () => {
        if (tickers.length === 0) { setRows([]); return; }
        setLoading(true);
        setError(null);
        try {
            const qs = new URLSearchParams({ tickers: tickers.join(","), sortBy, order });
            const res = await fetch(`/api/screener?${qs}`);
            if (!res.ok) throw new Error(`Server error ${res.status}`);
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            if (Array.isArray(data)) setRows(data);
        } catch (e: any) {
            setError(e?.message ?? "Failed to load screener data");
        } finally {
            setLoading(false);
        }
    }, [tickers.join(","), sortBy, order]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleSort = (field: string) => {
        if (field === sortBy) setOrder(o => o === "desc" ? "asc" : "desc");
        else { setSortBy(field); setOrder("desc"); }
    };

    const toggleWatch = (ticker: string) => {
        const next = watchlist.includes(ticker) ? watchlist.filter(t => t !== ticker) : [...watchlist, ticker];
        saveWatchlist(next);
        setWatchlist(next);
    };

    const addTicker = () => {
        const t = addInput.trim().toUpperCase();
        if (!t || watchlist.includes(t)) return;
        if (watchlist.length >= MAX_TICKERS) {
            setError(`Watchlist limit is ${MAX_TICKERS} tickers`);
            return;
        }
        const next = [...watchlist, t];
        saveWatchlist(next);
        setWatchlist(next);
        setAddInput("");
    };

    const cols = [
        { key: "ticker",       label: "Ticker",    sortable: false },
        { key: "lastPrice",    label: "Price",     sortable: false },
        { key: "composite15d", label: "15D Score", sortable: true  },
        { key: "composite30d", label: "30D Score", sortable: true  },
        { key: "composite90d", label: "90D Score", sortable: true  },
        { key: "signal15d",    label: "Signal",    sortable: false },
        { key: "sentiment",    label: "Sentiment", sortable: true  },
        { key: "hmmState",     label: "Regime",    sortable: false },
        { key: "riskRating",   label: "Risk",      sortable: true  },
    ];

    if (tickers.length === 0) {
        return (
            <div className="rounded-xl border border-[#3A3833] bg-[#262624] p-8 text-center">
                <Star className="w-8 h-8 text-[#52504A] mx-auto mb-3" />
                <p className="text-[13px] text-[#8F8C80] mb-4">
                    Your watchlist is empty. Add tickers to track them across all horizons.
                </p>
                {showAddButton && (
                    <div className="flex gap-2 justify-center max-w-[280px] mx-auto">
                        <input
                            value={addInput}
                            onChange={e => setAddInput(e.target.value.toUpperCase())}
                            onKeyDown={e => e.key === "Enter" && addTicker()}
                            placeholder="AAPL, TSLA…"
                            className="flex-1 bg-[#262624] border border-[#3A3833] rounded-lg px-3 py-2 text-[13px] text-[#F0EEE6] focus:outline-none focus:border-indigo-500/50"
                        />
                        <button onClick={addTicker} className="px-4 py-2 bg-indigo-500/20 border border-indigo-500/30 rounded-lg text-indigo-300 text-[12px] font-700 hover:bg-indigo-500/30 transition-all">
                            Add
                        </button>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="rounded-xl border border-[#3A3833] bg-[#262624] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-[#3A3833]">
                <span className="text-[12px] font-700 tracking-[0.08em] uppercase text-[#A6A296]">
                    Watchlist · {tickers.length} ticker{tickers.length !== 1 ? "s" : ""}
                </span>
                <div className="flex items-center gap-2">
                    {showAddButton && (
                        <div className="flex gap-1.5">
                            <input
                                value={addInput}
                                onChange={e => setAddInput(e.target.value.toUpperCase())}
                                onKeyDown={e => e.key === "Enter" && addTicker()}
                                placeholder="Add ticker…"
                                className="bg-[#262624] border border-[#3A3833] rounded-lg px-2.5 py-1 text-[12px] text-[#F0EEE6] w-32 focus:outline-none focus:border-indigo-500/50"
                            />
                            <button onClick={addTicker} className="px-2.5 py-1 bg-indigo-500/20 border border-indigo-500/30 rounded-lg text-indigo-300 text-[11px] font-700 hover:bg-indigo-500/30 transition-all">Add</button>
                        </div>
                    )}
                    <button onClick={fetchData} disabled={loading} className="p-1.5 rounded-lg hover:bg-white/5 text-[#8F8C80] hover:text-[#A6A296] transition-all">
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                    </button>
                </div>
            </div>

            {/* Error banner */}
            {error && (
                <div className="flex items-center gap-2 px-5 py-2 bg-red-500/10 border-b border-red-500/20 text-red-400 text-[12px]">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>{error}</span>
                    <button onClick={() => setError(null)} className="ml-auto text-[#8F8C80] hover:text-[#A6A296]">✕</button>
                </div>
            )}

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-[#3A3833]">
                            <th className="w-8 px-3 py-2" />
                            {cols.map(c => (
                                <th key={c.key}
                                    onClick={() => c.sortable && handleSort(c.key)}
                                    className={`px-3 py-2 text-left text-[10px] font-700 tracking-[0.08em] uppercase text-[#8F8C80] whitespace-nowrap ${c.sortable ? "cursor-pointer hover:text-[#A6A296]" : ""}`}>
                                    {c.label}
                                    <SortIcon field={c.key} current={sortBy} order={order} />
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {loading && rows.length === 0 ? (
                            Array.from({ length: tickers.length }).map((_, i) => (
                                <tr key={i} className="border-b border-[#3A3833]/50">
                                    <td colSpan={cols.length + 1} className="px-3 py-3">
                                        <div className="h-4 bg-[#33312C] rounded animate-pulse w-full" />
                                    </td>
                                </tr>
                            ))
                        ) : rows.length === 0 ? (
                            <tr>
                                <td colSpan={cols.length + 1} className="px-4 py-6 text-center text-[12px] text-[#8F8C80]">
                                    No data yet — trigger a scrape to populate scores.
                                </td>
                            </tr>
                        ) : rows.map(row => (
                            <tr key={row.ticker}
                                onClick={() => router.push(`/?ticker=${row.ticker}`)}
                                className="border-b border-[#3A3833]/50 cursor-pointer hover:bg-white/[0.02] transition-colors group">
                                {/* Star */}
                                <td className="px-3 py-3" onClick={e => { e.stopPropagation(); toggleWatch(row.ticker); }}>
                                    {watchlist.includes(row.ticker)
                                        ? <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                                        : <StarOff className="w-3.5 h-3.5 text-[#52504A] group-hover:text-[#8F8C80]" />
                                    }
                                </td>
                                {/* Ticker */}
                                <td className="px-3 py-3 font-mono text-[13px] font-700 text-[#F0EEE6]">{row.ticker}</td>
                                {/* Price */}
                                <td className="px-3 py-3 font-mono text-[12px] text-[#A6A296]">
                                    {row.lastPrice != null ? `$${row.lastPrice.toFixed(2)}` : "—"}
                                </td>
                                {/* Scores */}
                                <td className="px-3 py-3"><ScorePill value={row.composite15d} /></td>
                                <td className="px-3 py-3"><ScorePill value={row.composite30d} /></td>
                                <td className="px-3 py-3"><ScorePill value={row.composite90d} /></td>
                                {/* Signal */}
                                <td className="px-3 py-3"><SignalBadge signal={row.signal15d} /></td>
                                {/* Sentiment */}
                                <td className="px-3 py-3">
                                    {row.sentimentScore != null ? (
                                        <span className={`font-mono text-[12px] font-600 ${(row.sentimentScore ?? 0) > 0.1 ? "text-emerald-400" : (row.sentimentScore ?? 0) < -0.1 ? "text-red-400" : "text-amber-400"}`}>
                                            {row.sentimentScore.toFixed(2)}
                                        </span>
                                    ) : <span className="text-[#8F8C80]">—</span>}
                                </td>
                                {/* Regime */}
                                <td className="px-3 py-3"><RegimeBadge state={row.hmmState} /></td>
                                {/* Risk */}
                                <td className="px-3 py-3"><RiskDots rating={row.riskRating} /></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
