"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { TrendingUp, TrendingDown, ArrowLeft, Compass, Target, Activity, Zap, Search } from "lucide-react";

interface DiscoveryRow {
    ticker: string;
    name: string | null;
    sector: string | null;
    signal: string;
    composite_score: number;
    confidence_pct: number;
    price: number | null;
    risk_rating: number | null;
    top_driver: { factor: string; score: number };
    hit_rate_pct: number | null;
}

interface Props {
    horizon: number;
    results: DiscoveryRow[];
    universeSize: number;
}

const SIGNAL_CFG: Record<string, { word: string; color: string; bg: string; border: string }> = {
    STRONG_BUY: { word: "STRONG BUY", color: "#0ecf8a", bg: "rgba(14,207,138,0.10)", border: "rgba(14,207,138,0.30)" },
    BUY:        { word: "BUY",        color: "#0ecf8a", bg: "rgba(14,207,138,0.06)", border: "rgba(14,207,138,0.20)" },
    HOLD:       { word: "HOLD",       color: "#f59e0b", bg: "rgba(245,158,11,0.06)", border: "rgba(245,158,11,0.20)" },
    SELL:       { word: "SELL",       color: "#f5495a", bg: "rgba(245,73,90,0.06)",  border: "rgba(245,73,90,0.20)" },
    STRONG_SELL:{ word: "STRONG SELL",color: "#f5495a", bg: "rgba(245,73,90,0.10)",  border: "rgba(245,73,90,0.30)" },
};
function sig(s?: string | null) { return SIGNAL_CFG[s ?? ""] ?? SIGNAL_CFG.HOLD; }

const DRIVER_LABELS: Record<string, string> = {
    sentiment: "Sentiment", technical: "Technical", fundamental: "Fundamental",
    quant: "Quant", insider: "Insider", macro: "Macro",
};

export default function DiscoverClient({ horizon, results, universeSize }: Props) {
    useEffect(() => {
        const observer = new IntersectionObserver(entries => {
            entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("animate-in"); observer.unobserve(e.target); } });
        }, { threshold: 0.05 });
        document.querySelectorAll("[data-animate]").forEach(el => observer.observe(el));
        return () => observer.disconnect();
    }, [results]);

    const strongBuyCount = results.filter(r => r.signal === "STRONG_BUY").length;
    const buyCount = results.filter(r => r.signal === "BUY").length;
    const avgScore = results.length > 0
        ? results.reduce((s, r) => s + r.composite_score, 0) / results.length
        : 0;

    return (
        <main className="relative z-10 min-h-screen px-4 sm:px-6 py-8 max-w-6xl mx-auto">
            {/* Back link */}
            <Link href="/" className="inline-flex items-center gap-1.5 text-[12px] text-[#7878a0] hover:text-[#b0b0d0] transition-colors mb-6">
                <ArrowLeft size={14} /> Back to Terminal
            </Link>

            {/* ── Header ──────────────────────────────────────────── */}
            <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                            style={{ background: "rgba(212,160,23,0.08)", border: "1px solid rgba(212,160,23,0.25)" }}>
                            <Compass size={20} style={{ color: "#fcd97a" }} />
                        </div>
                        <h1 className="font-[var(--font-syne)] text-3xl font-extrabold tracking-tight">
                            <span className="text-gradient-gold">Discover</span>
                        </h1>
                    </div>
                    <p className="text-[13px] text-[#7878a0] max-w-xl">
                        Top opportunities surfaced from the tracked universe of <span className="text-[#b0b0d0] font-semibold">{universeSize}</span> stocks.
                        Ranked by composite score across all factors. Re-scanned every 6 hours.
                    </p>
                </div>

                {/* Horizon switcher */}
                <div className="flex gap-1 bg-[#0a0a1c] border border-[#1e1e42] rounded-lg p-1">
                    {[15, 30, 90].map(h => (
                        <Link
                            key={h}
                            href={`/discover?horizon=${h}`}
                            className={`px-3 py-1.5 rounded-md text-[12px] font-semibold transition-all ${
                                h === horizon
                                    ? "bg-[rgba(212,160,23,0.15)] text-[#fcd97a] border border-[rgba(212,160,23,0.30)]"
                                    : "text-[#7878a0] hover:text-[#b0b0d0]"
                            }`}
                        >
                            {h}d
                        </Link>
                    ))}
                </div>
            </div>

            {/* ── Stats strip ─────────────────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6" data-animate>
                <StatTile icon={Target} label="Opportunities" value={String(results.length)} variant="gold" />
                <StatTile icon={Zap} label="Strong Buys" value={String(strongBuyCount)} variant="bull" />
                <StatTile icon={TrendingUp} label="Buys" value={String(buyCount)} variant="bull" />
                <StatTile icon={Activity} label="Avg Score" value={results.length > 0 ? avgScore.toFixed(1) : "–"} variant="gold" />
            </div>

            {/* ── Results table ───────────────────────────────────── */}
            {results.length === 0 ? (
                <div className="card p-12 text-center" data-animate>
                    <Search size={32} className="mx-auto text-[#5d5d8a] mb-3" />
                    <p className="text-[#9898c0] font-medium mb-1">No opportunities surfaced yet.</p>
                    <p className="text-[12px] text-[#5d5d8a] max-w-md mx-auto">
                        The scanner needs to process tickers from the universe before recommendations appear here.
                        Wait for the next sweep, or trigger one manually from the worker.
                    </p>
                </div>
            ) : (
                <div className="card overflow-hidden" data-animate>
                    {/* Header row */}
                    <div className="hidden sm:grid grid-cols-[80px_1fr_120px_90px_100px_80px_80px] gap-3 px-5 py-3 border-b border-[#1e1e42] section-title">
                        <div>Ticker</div>
                        <div>Name / Sector</div>
                        <div>Signal</div>
                        <div className="text-right">Score</div>
                        <div>Top Driver</div>
                        <div className="text-right">Hit Rate</div>
                        <div className="text-right">Conf</div>
                    </div>

                    {/* Rows */}
                    <div className="divide-y divide-[#1a1a3a]">
                        {results.map((r, i) => {
                            const s = sig(r.signal);
                            const dscore = r.top_driver.score;
                            const driverColor = dscore > 60 ? "#0ecf8a" : dscore < 40 ? "#f5495a" : "#f59e0b";

                            return (
                                <Link
                                    key={r.ticker}
                                    href={`/summary/${r.ticker}`}
                                    className="grid grid-cols-2 sm:grid-cols-[80px_1fr_120px_90px_100px_80px_80px] gap-3 px-5 py-4 hover:bg-[rgba(255,255,255,0.025)] transition-colors items-center group"
                                >
                                    {/* Rank + Ticker */}
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono text-[11px] text-[#5d5d8a] w-4">{i + 1}</span>
                                        <span className="font-mono font-bold text-[15px] text-[#f0efff] group-hover:text-[#fcd97a] transition-colors">{r.ticker}</span>
                                    </div>

                                    {/* Name / sector */}
                                    <div className="hidden sm:block min-w-0">
                                        {r.name && <div className="text-[13px] text-[#b0b0d0] truncate">{r.name}</div>}
                                        {r.sector && <div className="text-[11px] text-[#5d5d8a] truncate">{r.sector}</div>}
                                    </div>

                                    {/* Signal */}
                                    <div className="hidden sm:block">
                                        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold tracking-wider"
                                            style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.color }}>
                                            {r.signal === "STRONG_BUY" || r.signal === "BUY" ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                                            {s.word}
                                        </span>
                                    </div>

                                    {/* Score */}
                                    <div className="text-right hidden sm:block">
                                        <div className="font-mono font-bold text-[15px]" style={{ color: s.color }}>{r.composite_score.toFixed(1)}</div>
                                        {r.price != null && <div className="text-[10px] text-[#5d5d8a]">${r.price.toFixed(2)}</div>}
                                    </div>

                                    {/* Top driver */}
                                    <div className="hidden sm:block">
                                        <div className="text-[11px] text-[#9898c0]">{DRIVER_LABELS[r.top_driver.factor] ?? r.top_driver.factor}</div>
                                        <div className="font-mono text-[11px] font-bold" style={{ color: driverColor }}>{r.top_driver.score.toFixed(0)}</div>
                                    </div>

                                    {/* Hit rate */}
                                    <div className="text-right hidden sm:block">
                                        {r.hit_rate_pct != null
                                            ? <span className="font-mono text-[12px]" style={{ color: r.hit_rate_pct >= 55 ? "#0ecf8a" : "#9898c0" }}>{r.hit_rate_pct}%</span>
                                            : <span className="text-[11px] text-[#5d5d8a]">–</span>}
                                    </div>

                                    {/* Confidence */}
                                    <div className="text-right hidden sm:block">
                                        <span className="font-mono text-[12px] text-[#9898c0]">{r.confidence_pct}%</span>
                                    </div>

                                    {/* Mobile-only secondary line */}
                                    <div className="sm:hidden text-right">
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold"
                                            style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>{s.word}</span>
                                        <div className="font-mono font-bold text-[14px] mt-1" style={{ color: s.color }}>{r.composite_score.toFixed(1)}</div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Footer note */}
            <p className="text-center text-[11px] text-[#5d5d8a] mt-8">
                Phaeton Capital · Universe scanner · {horizon}-day horizon · Click any row for full analysis
            </p>
        </main>
    );
}

function StatTile({ icon: Icon, label, value, variant }: { icon: typeof Target; label: string; value: string; variant: "bull" | "gold" }) {
    const color = variant === "bull" ? "#0ecf8a" : "#fcd97a";
    const bg = variant === "bull" ? "rgba(14,207,138,0.06)" : "rgba(212,160,23,0.06)";
    const border = variant === "bull" ? "rgba(14,207,138,0.15)" : "rgba(212,160,23,0.15)";
    return (
        <div className="card rounded-xl p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: bg, border: `1px solid ${border}` }}>
                <Icon size={16} style={{ color }} />
            </div>
            <div>
                <div className="text-[10px] uppercase tracking-wider text-[#7878a0] font-semibold">{label}</div>
                <div className="font-mono text-lg font-bold" style={{ color }}>{value}</div>
            </div>
        </div>
    );
}
