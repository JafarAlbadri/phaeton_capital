"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Globe, RefreshCw, AlertTriangle } from "lucide-react";
import type { ScreenerRow } from "./ScreenerGrid";

// ── Inline sub-components (mirror ScreenerGrid patterns) ─────────────────────

const SIG_STYLES: Record<string, { bg: string; text: string; border: string }> = {
    STRONG_BUY:  { bg: 'rgba(78,125,83,0.12)',  text: '#34d399', border: 'rgba(78,125,83,0.30)'  },
    BUY:         { bg: 'rgba(78,125,83,0.07)',  text: '#6ee7b7', border: 'rgba(78,125,83,0.18)'  },
    HOLD:        { bg: 'rgba(201,100,66,0.10)',  text: '#fbbf24', border: 'rgba(201,100,66,0.25)'  },
    SELL:        { bg: 'rgba(194,78,66,0.10)',   text: '#D9776B', border: 'rgba(194,78,66,0.22)'   },
    STRONG_SELL: { bg: 'rgba(194,78,66,0.15)',   text: '#D9776B', border: 'rgba(194,78,66,0.32)'   },
};

function SignalBadge({ signal }: { signal: string | null }) {
    if (!signal) return <span style={{ color: '#8F8C80' }}>—</span>;
    const s = SIG_STYLES[signal];
    if (!s) return <span style={{ color: '#A6A296', fontSize: 11 }}>{signal}</span>;
    return (
        <span
            style={{
                padding: '2px 8px',
                borderRadius: 5,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.07em',
                background: s.bg,
                color: s.text,
                border: `1px solid ${s.border}`,
                textTransform: 'uppercase',
                whiteSpace: 'nowrap',
            }}
        >
            {signal.replace('_', ' ')}
        </span>
    );
}

function ScorePill({ value }: { value: number | null }) {
    if (value == null) return <span style={{ color: '#8F8C80', fontFamily: 'monospace', fontSize: 11 }}>—</span>;
    const color = value >= 60 ? '#7FA886' : value >= 40 ? '#D97757' : '#D9776B';
    return (
        <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color }}>
            {value.toFixed(1)}
        </span>
    );
}

function RegimeBadge({ state }: { state: number | null }) {
    if (state == null) return <span style={{ color: '#8F8C80', fontSize: 10 }}>—</span>;
    if (state === 2) return <span style={{ fontSize: 10, fontWeight: 700, color: '#7FA886' }}>Bull</span>;
    if (state === 1) return <span style={{ fontSize: 10, fontWeight: 700, color: '#D97757' }}>Neutral</span>;
    return <span style={{ fontSize: 10, fontWeight: 700, color: '#D9776B' }}>Bear</span>;
}

// ── Skeleton row ─────────────────────────────────────────────────────────────

function SkeletonRow() {
    return (
        <tr>
            {[70, 55, 60, 90, 55].map((w, i) => (
                <td key={i} className="px-3 py-2.5">
                    <div
                        className="animate-pulse rounded"
                        style={{
                            height: 12,
                            width: w,
                            background: '#33312C',
                        }}
                    />
                </td>
            ))}
        </tr>
    );
}

// ── Props ─────────────────────────────────────────────────────────────────────

export interface PeerComparisonProps {
    currentTicker: string;
    sector: string | null;
    peerTickers: string[];
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function PeerComparison({ currentTicker, sector, peerTickers }: PeerComparisonProps) {
    const router = useRouter();
    const [rows, setRows]       = useState<ScreenerRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError]     = useState<string | null>(null);

    useEffect(() => {
        if (peerTickers.length === 0) { setRows([]); return; }

        let cancelled = false;
        setLoading(true);
        setError(null);

        const allTickers = Array.from(
            new Set([currentTicker, ...peerTickers])
        ).slice(0, 20);

        const qs = new URLSearchParams({ tickers: allTickers.join(',') });
        fetch(`/api/screener?${qs}`)
            .then(r => {
                if (!r.ok) throw new Error(`Server error ${r.status}`);
                return r.json();
            })
            .then((data: ScreenerRow[] | { error: string }) => {
                if (cancelled) return;
                if ('error' in data) throw new Error(data.error);
                setRows(data as ScreenerRow[]);
            })
            .catch((e: Error) => {
                if (!cancelled) setError(e.message ?? 'Failed to load peer data');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => { cancelled = true; };
    }, [currentTicker, peerTickers.join(',')]);

    const navigate = (ticker: string) => {
        router.push(`/?q=${ticker}`);
        router.refresh();
    };

    // ── Empty state ───────────────────────────────────────────────────────────
    if (peerTickers.length === 0) {
        return (
            <div
                className="rounded-xl border border-[#3A3833] bg-[#262624] p-6 text-center"
            >
                <Globe className="w-6 h-6 text-[#52504A] mx-auto mb-2" />
                <p className="text-[12px] text-[#8F8C80]">No peer data available</p>
            </div>
        );
    }

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="rounded-xl border border-[#3A3833] bg-[#262624] overflow-hidden">

            {/* Panel header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#3A3833]">
                <div className="flex items-center gap-2">
                    <Globe className="w-3.5 h-3.5 text-[#E0906F]" />
                    <span className="text-[11px] font-700 tracking-[0.08em] uppercase text-[#A6A296]">
                        Sector Peers
                        {sector ? (
                            <span className="text-[#8F8C80]"> · {sector}</span>
                        ) : null}
                    </span>
                </div>

                <button
                    onClick={() => navigate(currentTicker)}
                    disabled={loading}
                    className="p-1.5 rounded-lg hover:bg-white/5 text-[#8F8C80] hover:text-[#A6A296] transition-all"
                    title="Refresh"
                >
                    <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Error banner */}
            {error && (
                <div className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border-b border-red-500/20 text-red-400 text-[11px]">
                    <AlertTriangle className="w-3 h-3 shrink-0" />
                    <span>{error}</span>
                    <button
                        onClick={() => setError(null)}
                        className="ml-auto text-[#8F8C80] hover:text-[#A6A296] leading-none"
                    >
                        ✕
                    </button>
                </div>
            )}

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-[#3A3833]">
                            {['Ticker', 'Price', '15D Score', 'Signal', 'Regime'].map(h => (
                                <th
                                    key={h}
                                    className="px-3 py-2 text-left text-[10px] font-700 tracking-[0.08em] uppercase text-[#8F8C80] whitespace-nowrap"
                                >
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {loading && rows.length === 0 ? (
                            [currentTicker, ...peerTickers].slice(0, 8).map((_, i) => (
                                <SkeletonRow key={i} />
                            ))
                        ) : rows.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={5}
                                    className="px-4 py-5 text-center text-[11px] text-[#8F8C80]"
                                >
                                    No peer data yet — trigger a scrape to populate scores.
                                </td>
                            </tr>
                        ) : (
                            rows.map(row => {
                                const isCurrent = row.ticker === currentTicker;
                                return (
                                    <tr
                                        key={row.ticker}
                                        onClick={() => navigate(row.ticker)}
                                        className="border-b border-[#3A3833]/50 cursor-pointer hover:bg-white/[0.025] transition-colors"
                                        style={
                                            isCurrent
                                                ? {
                                                    outline: '1px solid rgba(201,100,66,0.35)',
                                                    outlineOffset: '-1px',
                                                    background: 'rgba(201,100,66,0.04)',
                                                }
                                                : {}
                                        }
                                    >
                                        {/* Ticker */}
                                        <td className="px-3 py-2.5">
                                            <span
                                                className="font-mono text-[12px] font-700"
                                                style={{ color: isCurrent ? '#E0906F' : '#F0EEE6' }}
                                            >
                                                {row.ticker}
                                                {isCurrent && (
                                                    <span
                                                        className="ml-1.5 text-[9px] font-700 tracking-[0.06em] uppercase"
                                                        style={{ color: '#D97757' }}
                                                    >
                                                        ▶ current
                                                    </span>
                                                )}
                                            </span>
                                        </td>

                                        {/* Price */}
                                        <td className="px-3 py-2.5 font-mono text-[11px] text-[#A6A296]">
                                            {row.lastPrice != null ? `$${row.lastPrice.toFixed(2)}` : '—'}
                                        </td>

                                        {/* 15D Score */}
                                        <td className="px-3 py-2.5">
                                            <ScorePill value={row.composite15d} />
                                        </td>

                                        {/* Signal */}
                                        <td className="px-3 py-2.5">
                                            <SignalBadge signal={row.signal15d} />
                                        </td>

                                        {/* Regime */}
                                        <td className="px-3 py-2.5">
                                            <RegimeBadge state={row.hmmState} />
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
