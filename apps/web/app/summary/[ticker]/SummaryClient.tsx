"use client";

import React, { useEffect, useState } from "react";
import {
    AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip,
} from "recharts";
import {
    TrendingUp, TrendingDown, Minus, Target, Shield, Activity, ArrowLeft,
} from "lucide-react";
import Link from "next/link";

// ─── Types ───────────────────────────────────────────────────────────────────
interface Driver {
    factor: string;
    score: number;
    impact: "bullish" | "bearish" | "neutral";
}

interface Horizon {
    horizon_days: number;
    signal: string;
    composite_score: number;
    confidence: number;
    recommended_price?: number | null;
    price_target_low?: number | null;
    price_target_high?: number | null;
    price_method?: string | null;
    drivers: Driver[];
}

interface TrackRecord {
    hitRate: number | null;
    total: number;
    correct: number;
    incorrect: number;
}

interface ScorePoint {
    date: string;
    score: number;
    signal: string;
}

interface Props {
    ticker: string;
    sector: string | null;
    price: number | null;
    marketCap: number | null;
    horizons: Horizon[];
    trackRecord: TrackRecord;
    riskRating: number | null;
    scoreHistory: ScorePoint[];
}

// ─── Signal config ───────────────────────────────────────────────────────────
const SIGNAL_CFG: Record<string, { word: string; color: string; bg: string; border: string; glow: string; icon: typeof TrendingUp }> = {
    STRONG_BUY:  { word: "STRONG BUY",  color: "#0ecf8a", bg: "rgba(14,207,138,0.08)", border: "rgba(14,207,138,0.30)", glow: "0 0 60px rgba(14,207,138,0.15)", icon: TrendingUp },
    BUY:         { word: "BUY",         color: "#0ecf8a", bg: "rgba(14,207,138,0.06)", border: "rgba(14,207,138,0.20)", glow: "0 0 40px rgba(14,207,138,0.10)", icon: TrendingUp },
    HOLD:        { word: "HOLD",        color: "#f59e0b", bg: "rgba(245,158,11,0.06)", border: "rgba(245,158,11,0.20)", glow: "0 0 40px rgba(245,158,11,0.10)", icon: Minus },
    SELL:        { word: "SELL",        color: "#f5495a", bg: "rgba(245,73,90,0.06)",  border: "rgba(245,73,90,0.20)",  glow: "0 0 40px rgba(245,73,90,0.10)",  icon: TrendingDown },
    STRONG_SELL: { word: "STRONG SELL", color: "#f5495a", bg: "rgba(245,73,90,0.08)",  border: "rgba(245,73,90,0.30)",  glow: "0 0 60px rgba(245,73,90,0.15)",  icon: TrendingDown },
};
function sig(s?: string | null) { return SIGNAL_CFG[s ?? ""] ?? SIGNAL_CFG["HOLD"]; }

const DRIVER_LABELS: Record<string, string> = {
    sentiment: "Sentiment", technical: "Technical", fundamental: "Fundamental",
    quant: "Quantitative", insider: "Insider", macro: "Macro",
};

function fmtMktCap(v: number | null): string {
    if (v == null) return "–";
    if (v >= 1e12) return `$${(v / 1e12).toFixed(1)}T`;
    if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
    if (v >= 1e6) return `$${(v / 1e6).toFixed(0)}M`;
    return `$${v.toLocaleString()}`;
}

// ─── Confidence arc ──────────────────────────────────────────────────────────
function ConfidenceArc({ value, color }: { value: number; color: string }) {
    const pct = Math.max(0, Math.min(100, value));
    const r = 80;
    const circumHalf = Math.PI * r; // half circle
    const dashLen = (pct / 100) * circumHalf;

    return (
        <div className="flex flex-col items-center">
            <svg viewBox="0 0 200 110" className="w-[160px]">
                <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#12122e" strokeWidth="10" strokeLinecap="round" />
                <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
                    strokeDasharray={`${dashLen} ${circumHalf}`}
                    style={{ filter: `drop-shadow(0 0 6px ${color})` }} />
            </svg>
            <span className="font-mono text-2xl font-bold -mt-8" style={{ color }}>{pct}%</span>
            <span className="text-[11px] text-[#7878a0] mt-1">Confidence</span>
        </div>
    );
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function SummaryClient({
    ticker, sector, price, marketCap,
    horizons, trackRecord, riskRating, scoreHistory,
}: Props) {
    const primary = horizons.find(h => h.horizon_days === 15) ?? horizons[0];
    const s = sig(primary?.signal);
    const Icon = s.icon;

    // Scroll animation
    useEffect(() => {
        const observer = new IntersectionObserver(entries => {
            entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("animate-in"); observer.unobserve(e.target); } });
        }, { threshold: 0.1 });
        document.querySelectorAll("[data-animate]").forEach(el => observer.observe(el));
        return () => observer.disconnect();
    }, []);

    return (
        <main className="relative z-10 min-h-screen px-4 py-8 max-w-3xl mx-auto">
            {/* Back link */}
            <Link href={`/?q=${ticker}`} className="inline-flex items-center gap-1.5 text-[12px] text-[#7878a0] hover:text-[#b0b0d0] transition-colors mb-6">
                <ArrowLeft size={14} /> Back to Terminal
            </Link>

            {/* ── Hero ────────────────────────────────────────────────────── */}
            <div className="card card-gold card-accent relative p-8 mb-6" data-animate
                style={{ boxShadow: s.glow }}>
                <div className="flex flex-col sm:flex-row sm:items-start gap-6">
                    {/* Left: ticker + signal */}
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                            <h1 className="font-[var(--font-syne)] text-3xl font-extrabold tracking-tight text-[#f0efff]">{ticker}</h1>
                            {price != null && (
                                <span className="font-mono text-lg text-[#9898c0]">${price.toFixed(2)}</span>
                            )}
                        </div>
                        {(sector || marketCap) && <p className="text-[13px] text-[#7878a0] mb-4">{sector ?? ""}{sector && marketCap ? " \u00b7 " : ""}{marketCap ? fmtMktCap(marketCap) : ""}</p>}

                        {/* Big signal badge */}
                        <div className="flex items-center gap-3 mt-2">
                            <div className="rounded-xl px-5 py-3 flex items-center gap-3"
                                style={{ background: s.bg, border: `1px solid ${s.border}` }}>
                                <Icon size={22} style={{ color: s.color }} />
                                <span className="font-mono text-xl font-bold tracking-wide" style={{ color: s.color }}>{s.word}</span>
                            </div>
                        </div>

                        {/* Composite score */}
                        <div className="mt-4 flex items-baseline gap-2">
                            <span className="font-mono text-4xl font-bold" style={{ color: s.color }}>{primary?.composite_score?.toFixed(1) ?? "–"}</span>
                            <span className="text-[12px] text-[#7878a0]">/ 100 composite</span>
                        </div>
                    </div>

                    {/* Right: confidence arc */}
                    <div className="flex-shrink-0">
                        <ConfidenceArc value={primary?.confidence ?? 0} color={s.color} />
                    </div>
                </div>
            </div>

            {/* ── Top 3 Drivers ────────────────────────────────────────── */}
            <div className="card p-6 mb-6" data-animate>
                <h2 className="section-title mb-4">Top Drivers</h2>
                <div className="space-y-3">
                    {primary?.drivers.map((d, i) => {
                        const pct = Math.max(0, Math.min(100, d.score));
                        const barColor = d.impact === "bullish" ? "#0ecf8a" : d.impact === "bearish" ? "#f5495a" : "#f59e0b";
                        return (
                            <div key={d.factor} className="flex items-center gap-3">
                                <span className="text-[13px] font-medium text-[#b0b0d0] w-28 shrink-0">{DRIVER_LABELS[d.factor] ?? d.factor}</span>
                                <div className="flex-1 h-[8px] rounded-full bg-[#12122e] overflow-hidden">
                                    <div className="h-full rounded-full transition-all duration-700"
                                        style={{ width: `${pct}%`, background: barColor, boxShadow: `4px 0 12px ${barColor}40` }} />
                                </div>
                                <span className="font-mono text-[13px] font-bold w-10 text-right" style={{ color: barColor }}>{d.score.toFixed(0)}</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ── Track Record + Risk ─────────────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6" data-animate>
                <StatCard label="Hit Rate" value={trackRecord.hitRate != null ? `${trackRecord.hitRate}%` : "–"}
                    icon={Target} variant={trackRecord.hitRate != null && trackRecord.hitRate >= 55 ? "bull" : "gold"} />
                <StatCard label="Correct" value={String(trackRecord.correct)} icon={TrendingUp} variant="bull" />
                <StatCard label="Incorrect" value={String(trackRecord.incorrect)} icon={TrendingDown} variant="bear" />
                <StatCard label="Risk" value={riskRating != null ? `${riskRating}/5` : "–"} icon={Shield}
                    variant={riskRating != null && riskRating <= 2 ? "bull" : riskRating != null && riskRating >= 4 ? "bear" : "gold"} />
            </div>

            {/* ── Score Sparkline ──────────────────────────────────────── */}
            {scoreHistory.length > 1 && (
                <div className="card p-6 mb-6" data-animate>
                    <h2 className="section-title mb-4">Composite Score History</h2>
                    <ResponsiveContainer width="100%" height={180}>
                        <AreaChart data={scoreHistory} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                            <defs>
                                <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={s.color} stopOpacity={0.25} />
                                    <stop offset="100%" stopColor={s.color} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#5d5d8a" }} tickLine={false} axisLine={false} />
                            <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#5d5d8a" }} tickLine={false} axisLine={false} width={30} />
                            <Tooltip contentStyle={{ background: "#0e0e24", border: "1px solid #1e1e42", borderRadius: 8, fontSize: 12 }}
                                formatter={(v: number) => [v.toFixed(1), "Score"]} />
                            <Area type="monotone" dataKey="score" stroke={s.color} strokeWidth={2}
                                fill="url(#sparkFill)" dot={false} activeDot={{ r: 4, fill: s.color }} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* ── Multi-Horizon Grid ──────────────────────────────────── */}
            {horizons.length > 1 && (
                <div className="card p-6 mb-6" data-animate>
                    <h2 className="section-title mb-4">Multi-Horizon Outlook</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {horizons.map(h => {
                            const hs = sig(h.signal);
                            const HIcon = hs.icon;
                            return (
                                <div key={h.horizon_days} className="rounded-xl p-4"
                                    style={{ background: hs.bg, border: `1px solid ${hs.border}` }}>
                                    <div className="text-[11px] text-[#7878a0] font-semibold uppercase tracking-wider mb-2">{h.horizon_days}d</div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <HIcon size={16} style={{ color: hs.color }} />
                                        <span className="font-mono text-sm font-bold" style={{ color: hs.color }}>{hs.word}</span>
                                    </div>
                                    <div className="font-mono text-lg font-bold" style={{ color: hs.color }}>{h.composite_score.toFixed(1)}</div>
                                    <div className="text-[11px] text-[#7878a0]">{h.confidence}% conf</div>
                                    {h.recommended_price != null && (
                                        <div className="mt-2 pt-2 border-t border-white/5">
                                            <div className="text-[10px] text-[#7878a0] uppercase tracking-wider">Target</div>
                                            <div className="font-mono text-sm font-bold" style={{
                                                color: price != null && h.recommended_price > price ? '#0ecf8a' : price != null && h.recommended_price < price ? '#f5495a' : hs.color
                                            }}>
                                                ${h.recommended_price.toFixed(2)}
                                                {price != null && price > 0 && (
                                                    <span className="text-[10px] ml-1 opacity-70">
                                                        ({h.recommended_price > price ? '+' : ''}{(((h.recommended_price - price) / price) * 100).toFixed(1)}%)
                                                    </span>
                                                )}
                                            </div>
                                            {h.price_target_low != null && h.price_target_high != null && (
                                                <div className="text-[10px] text-[#5d5d8a] font-mono mt-0.5">
                                                    ${h.price_target_low.toFixed(2)} – ${h.price_target_high.toFixed(2)}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Footer */}
            <p className="text-center text-[11px] text-[#5d5d8a] mt-8 mb-4">
                Phaeton Capital &middot; Generated {new Date().toISOString().slice(0, 10)} &middot; Not financial advice
            </p>
        </main>
    );
}

// ─── Stat Card ───────────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, variant }: { label: string; value: string; icon: typeof Target; variant: "bull" | "bear" | "gold" }) {
    const color = variant === "bull" ? "#0ecf8a" : variant === "bear" ? "#f5495a" : "#fcd97a";
    const bgColor = variant === "bull" ? "rgba(14,207,138,0.06)" : variant === "bear" ? "rgba(245,73,90,0.06)" : "rgba(212,160,23,0.06)";
    const borderColor = variant === "bull" ? "rgba(14,207,138,0.15)" : variant === "bear" ? "rgba(245,73,90,0.15)" : "rgba(212,160,23,0.15)";

    return (
        <div className="card rounded-xl p-4 text-center">
            <div className="w-8 h-8 rounded-lg mx-auto mb-2 flex items-center justify-center" style={{ background: bgColor, border: `1px solid ${borderColor}` }}>
                <Icon size={16} style={{ color }} />
            </div>
            <div className="font-mono text-lg font-bold" style={{ color }}>{value}</div>
            <div className="text-[11px] text-[#7878a0] mt-0.5">{label}</div>
        </div>
    );
}
