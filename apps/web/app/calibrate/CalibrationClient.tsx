"use client";

import React, { useState } from "react";
import { CheckCircle, XCircle, Minus, ChevronDown, ChevronUp } from "lucide-react";

interface Post {
    id: string;
    ticker: string;
    content: string;
    sentiment: number;
    confidence: number;
    admin_sentiment: number | null;
    admin_manipulation: boolean | null;
    source: string | null;
    author: string;
    author_karma: number;
    post_timestamp: string;
    ai_model: string | null;
}

function SentimentBar({ value, label }: { value: number; label: string }) {
    const pct = ((value + 1) / 2) * 100;
    const color = value > 0.1 ? "#7FA886" : value < -0.1 ? "#D9776B" : "#D97757";
    return (
        <div className="flex items-center gap-2">
            <span className="text-[10px] text-[#8F8C80] w-10 shrink-0">{label}</span>
            <div className="flex-1 h-1.5 rounded-full bg-[#33312C] relative">
                <div className="absolute top-0 left-1/2 bottom-0 w-px bg-[#52504A]" />
                <div className="absolute top-0 bottom-0 rounded-full transition-all"
                     style={{ left: `${Math.min(pct, 50)}%`, right: `${Math.max(0, 100 - Math.max(pct, 50))}%`, background: color }} />
            </div>
            <span className="font-mono text-[11px] w-12 text-right shrink-0" style={{ color }}>
                {value >= 0 ? "+" : ""}{value.toFixed(3)}
            </span>
        </div>
    );
}

export default function CalibrationClient({ posts, totalLabeled, total }: { posts: Post[], totalLabeled: number, total: number }) {
    const [items, setItems] = useState<Post[]>(posts);
    const [saving, setSaving] = useState<string | null>(null);
    const [expanded, setExpanded] = useState<string | null>(null);
    const [filter, setFilter] = useState<"all" | "labeled" | "unlabeled">("unlabeled");

    const save = async (id: string, admin_sentiment: number, admin_manipulation: boolean) => {
        setSaving(id);
        try {
            await fetch(`/api/feedback`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, admin_sentiment, admin_manipulation }),
            });
            setItems(prev => prev.map(p => p.id === id ? { ...p, admin_sentiment, admin_manipulation } : p));
        } finally {
            setSaving(null);
        }
    };

    const labeledCount = items.filter(p => p.admin_sentiment !== null).length;
    const filtered = items.filter(p => {
        if (filter === "labeled") return p.admin_sentiment !== null;
        if (filter === "unlabeled") return p.admin_sentiment === null;
        return true;
    });

    return (
        <div className="min-h-screen bg-[#1F1E1D] text-[#F0EEE6] p-6 max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <span className="font-display font-800 tracking-[0.15em] text-[#E0906F] text-xl">PHAETON</span>
                    <span className="text-[10px] tracking-[0.3em] text-[#9B9789]">/ AI CALIBRATION</span>
                </div>
                <p className="text-[13px] text-[#8F8C80] max-w-lg">
                    Review AI-labeled posts and apply human corrections. These labels train the model to be more accurate over time.
                </p>
                <div className="flex items-center gap-4 mt-4">
                    <div className="flex items-center gap-2 text-[12px]">
                        <div className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span className="text-[#A6A296]">{totalLabeled + labeledCount - items.filter(p => p.admin_sentiment !== null && posts.find(q => q.id === p.id)?.admin_sentiment !== null).length} labeled total</span>
                    </div>
                    <div className="text-[12px] text-[#8F8C80]">{total} posts in DB</div>
                    <div className="text-[12px] text-amber-400 font-mono">{items.filter(p => p.admin_sentiment === null).length} unlabeled in this batch</div>
                </div>
            </div>

            {/* Filter tabs */}
            <div className="flex gap-2 mb-5">
                {(["unlabeled", "labeled", "all"] as const).map(f => (
                    <button key={f} onClick={() => setFilter(f)}
                        className={`px-3 py-1.5 rounded-lg text-[11px] font-700 border transition-all ${filter === f ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-300" : "bg-[#262624] border-[#3A3833] text-[#8F8C80] hover:text-[#A6A296]"}`}>
                        {f.charAt(0).toUpperCase() + f.slice(1)} ({f === "all" ? items.length : f === "labeled" ? items.filter(p => p.admin_sentiment !== null).length : items.filter(p => p.admin_sentiment === null).length})
                    </button>
                ))}
            </div>

            {/* Post list */}
            <div className="space-y-3">
                {filtered.map(post => {
                    const isExpanded = expanded === post.id;
                    const isLabeled = post.admin_sentiment !== null;
                    return (
                        <div key={post.id} className={`rounded-xl border transition-all ${isLabeled ? "border-emerald-500/20 bg-emerald-500/[0.03]" : "border-[#3A3833] bg-[#262624]"}`}>
                            {/* Top row */}
                            <div className="flex items-start gap-3 p-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                                        <span className="font-mono text-[11px] font-700 text-amber-400">{post.ticker}</span>
                                        <span className="text-[10px] text-[#8F8C80]">{post.source}</span>
                                        <span className="text-[10px] text-[#8F8C80]">u/{post.author} · {post.author_karma.toLocaleString()} karma</span>
                                        <span className="text-[10px] text-[#7C7970]">{new Date(post.post_timestamp).toLocaleDateString()}</span>
                                        {isLabeled && <span className="text-[10px] text-emerald-400 font-700">✓ Labeled</span>}
                                    </div>

                                    {/* AI score bars */}
                                    <div className="space-y-1 mb-3">
                                        <SentimentBar value={post.sentiment} label="AI" />
                                        {isLabeled && <SentimentBar value={post.admin_sentiment!} label="Human" />}
                                    </div>

                                    {/* Content preview */}
                                    <p className={`text-[12px] text-[#7878a0] leading-[1.6] ${isExpanded ? "" : "line-clamp-2"}`}>
                                        {post.content}
                                    </p>
                                    {post.content.length > 120 && (
                                        <button onClick={() => setExpanded(isExpanded ? null : post.id)}
                                            className="text-[11px] text-[#8F8C80] hover:text-[#A6A296] mt-1 flex items-center gap-1">
                                            {isExpanded ? <><ChevronUp className="w-3 h-3" /> Less</> : <><ChevronDown className="w-3 h-3" /> More</>}
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Label buttons */}
                            <div className="px-4 pb-4 flex items-center gap-2">
                                <span className="text-[10px] text-[#8F8C80] mr-1">Label:</span>
                                {[
                                    { label: "Strong Bull", v: 0.9, color: "emerald" },
                                    { label: "Bullish", v: 0.4, color: "emerald" },
                                    { label: "Neutral", v: 0.0, color: "amber" },
                                    { label: "Bearish", v: -0.4, color: "red" },
                                    { label: "Strong Bear", v: -0.9, color: "red" },
                                ].map(({ label, v, color }) => (
                                    <button key={label} onClick={() => save(post.id, v, false)} disabled={saving === post.id}
                                        className={`px-2 py-1 rounded text-[10px] font-700 border transition-all disabled:opacity-50 ${
                                            post.admin_sentiment !== null && Math.abs(post.admin_sentiment - v) < 0.1
                                                ? color === "emerald" ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                                                    : color === "amber" ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                                                    : "bg-red-500/20 border-red-500/40 text-red-300"
                                                : "bg-[#262624] border-[#3A3833] text-[#8F8C80] hover:text-[#A6A296] hover:border-[#52504A]"
                                        }`}>
                                        {label}
                                    </button>
                                ))}
                                <button onClick={() => save(post.id, post.sentiment, true)} disabled={saving === post.id}
                                    className="ml-auto px-2 py-1 rounded text-[10px] font-700 border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all disabled:opacity-50">
                                    🚩 Manipulation
                                </button>
                            </div>
                        </div>
                    );
                })}
                {filtered.length === 0 && (
                    <div className="text-center py-12 text-[#8F8C80] text-[13px]">
                        {filter === "unlabeled" ? "All posts in this batch have been labeled. " : "No posts found."}
                    </div>
                )}
            </div>
        </div>
    );
}
