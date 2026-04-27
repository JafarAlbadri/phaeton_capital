"use client";

import { useTransition, useState, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Star } from 'lucide-react';
import ScreenerGrid from '../components/ScreenerGrid';
import PeerComparison from '../components/PeerComparison';

import { useScrollAnimation } from '../components/dashboard/shared';
import { getSignal, signalFromPct } from '../components/dashboard/utils';
import type { DashboardProps, Horizon } from '../components/dashboard/types';

import Navigation from '../components/dashboard/Navigation';
import CommandPalette from '../components/dashboard/CommandPalette';
import HeroSignal from '../components/dashboard/HeroSignal';
import FundamentalsSection from '../components/dashboard/FundamentalsSection';
import EarningsAndSqueeze from '../components/dashboard/EarningsAndSqueeze';
import TechnicalSection from '../components/dashboard/TechnicalSection';
import MacroQuantBacktest from '../components/dashboard/MacroQuantBacktest';
import SentimentCharts from '../components/dashboard/SentimentCharts';
import InsiderSection from '../components/dashboard/InsiderSection';
import ComprehensiveAnalysis from '../components/dashboard/ComprehensiveAnalysis';
import PredictionHistory from '../components/dashboard/PredictionHistory';
import AlphaAttribution from '../components/dashboard/AlphaAttribution';

export default function DashboardClient({
    recentSentiments, manipulationStats, targetKeyword,
    fundamentalData, financialHistory, usdSekRate, gaussianData,
    insiderTrades, quantMetrics, technicalIndicators, macroIndicators,
    riskProfile, recommendationScore, recommendationScores,
    predictionAccuracy, predictionCount, predictionHistory, auditStats,
    trendsHistory, crossListingData, regionalSentiment, signalAttribution,
    scoreHistory, peerTickers, earningsSetup,
}: DashboardProps) {
    const [isPending, startTransition] = useTransition();
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState(targetKeyword || '');
    const [searchResults, setSearchResults] = useState<{symbol: string; shortname: string; exchange: string}[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [tradeFilter, setTradeFilter] = useState<'all' | 'buy' | 'sell'>('all');
    const [isCommandOpen, setIsCommandOpen] = useState(false);
    const [selectedHorizon, setSelectedHorizon] = useState<Horizon>(15);
    const [sseConnected, setSseConnected] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [squeezeData, setSqueezeData] = useState<any>(null);
    const router = useRouter();
    const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

    useScrollAnimation();

    // Fetch short squeeze data when ticker changes
    useEffect(() => {
        setSqueezeData(null);
        fetch(`/api/squeeze/${targetKeyword}`).then(r => r.json()).then(d => {
            if (!d.error) setSqueezeData(d);
        }).catch(() => {});
    }, [targetKeyword]);

    // SSE for live updates
    useEffect(() => {
        let es: EventSource | null = null;
        let retryDelay = 1000;
        let retryTimer: ReturnType<typeof setTimeout> | null = null;
        let destroyed = false;

        const connect = () => {
            if (destroyed) return;
            es = new EventSource('/api/events');
            es.addEventListener('open', () => { retryDelay = 1000; setSseConnected(true); });
            es.addEventListener('recommendation', (e) => {
                try {
                    const data = JSON.parse(e.data);
                    if (data?.ticker?.toUpperCase() === targetKeyword?.toUpperCase()) {
                        setLastUpdated(new Date());
                        startTransition(() => router.refresh());
                    }
                } catch {}
            });
            es.addEventListener('sentiment_update', (e) => {
                try {
                    const data = JSON.parse(e.data);
                    if (data?.ticker?.toUpperCase() === targetKeyword?.toUpperCase()) {
                        setLastUpdated(new Date());
                        startTransition(() => router.refresh());
                    }
                } catch {}
            });
            es.onerror = () => {
                es?.close();
                setSseConnected(false);
                if (!destroyed) {
                    retryTimer = setTimeout(() => { retryDelay = Math.min(retryDelay * 2, 30_000); connect(); }, retryDelay);
                }
            };
        };

        connect();
        return () => { destroyed = true; if (retryTimer) clearTimeout(retryTimer); es?.close(); };
    }, [targetKeyword]);

    // Command palette keyboard shortcut
    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); setIsCommandOpen(o => !o); setSearchResults([]); }
            if (e.key === 'Escape') { setIsCommandOpen(false); setSearchResults([]); }
        };
        document.addEventListener('keydown', down);
        return () => document.removeEventListener('keydown', down);
    }, []);

    // Debounced ticker search
    useEffect(() => {
        if (!isCommandOpen) return;
        if (searchDebounce.current) clearTimeout(searchDebounce.current);
        const q = searchQuery.trim();
        if (q.length < 1) { setSearchResults([]); return; }
        searchDebounce.current = setTimeout(async () => {
            setSearchLoading(true);
            try {
                const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
                const data = await res.json();
                setSearchResults(data || []);
            } catch { setSearchResults([]); }
            finally { setSearchLoading(false); }
        }, 300);
        return () => { if (searchDebounce.current) clearTimeout(searchDebounce.current); };
    }, [searchQuery, isCommandOpen]);

    // Active recommendation for selected horizon
    const activeRec = recommendationScores
        ? (selectedHorizon === 15 ? recommendationScores.h15 : selectedHorizon === 30 ? recommendationScores.h30 : recommendationScores.h90) ?? recommendationScore
        : recommendationScore;

    // Derive signal from recommended price vs current price
    const derivedSignal = (() => {
        const recPrice = activeRec?.recommended_price;
        const curPrice = fundamentalData?.current_price;
        if (recPrice != null && curPrice != null && curPrice > 0) {
            const pct = ((recPrice - curPrice) / curPrice) * 100;
            return signalFromPct(pct);
        }
        return activeRec?.signal ?? null;
    })();
    const sig = getSignal(derivedSignal);

    // Insider stats
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
            {/* Loading Overlay */}
            {(loading || isPending) && (
                <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-[#05050f]/90 backdrop-blur-md">
                    <div className="flex flex-col items-center gap-6">
                        <div className="relative w-20 h-20">
                            <div className="absolute inset-0 rounded-full border-2 border-[#1e1e42]" />
                            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-indigo-400 animate-spin" />
                            <div className="absolute inset-2 rounded-full border-2 border-transparent border-t-[#f0b429] animate-spin" style={{ animationDuration: '1.4s', animationDirection: 'reverse' }} />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-pulse" />
                            </div>
                        </div>
                        <div className="flex flex-col items-center gap-1.5">
                            <span className="font-mono text-[13px] font-700 tracking-[0.2em] uppercase text-[#f0efff]">
                                {loading ? `Scanning ${searchQuery.toUpperCase()}` : 'Loading Data'}
                            </span>
                            <span className="text-[11px] text-[#9090b8] tracking-wider">Fetching market intelligence...</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            {[0, 1, 2, 3, 4].map(i => (
                                <div key={i} className="w-1.5 h-1.5 rounded-full bg-indigo-400/40 animate-pulse"
                                     style={{ animationDelay: `${i * 150}ms` }} />
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <CommandPalette
                isOpen={isCommandOpen}
                searchQuery={searchQuery}
                searchResults={searchResults}
                searchLoading={searchLoading}
                onClose={() => setIsCommandOpen(false)}
                onSearchChange={setSearchQuery}
                onSelect={triggerScrape}
            />

            <Navigation
                targetKeyword={targetKeyword}
                loading={loading}
                sseConnected={sseConnected}
                lastUpdated={lastUpdated}
                recommendationScore={recommendationScore}
                onOpenCommand={() => setIsCommandOpen(true)}
                onScan={() => triggerScrape()}
            />

            <main className="ml-16 xl:ml-64 pt-14 max-w-[1600px] mx-auto p-4 xl:p-8 space-y-8">
                <HeroSignal
                    recommendationScore={recommendationScore}
                    recommendationScores={recommendationScores}
                    selectedHorizon={selectedHorizon}
                    setSelectedHorizon={setSelectedHorizon}
                    derivedSignal={derivedSignal}
                    sig={sig}
                    targetKeyword={targetKeyword}
                    fundamentalData={fundamentalData}
                    predictionAccuracy={predictionAccuracy}
                    predictionCount={predictionCount}
                    scoreHistory={scoreHistory}
                    activeRec={activeRec}
                    loading={loading}
                    triggerScrape={triggerScrape}
                />

                <FundamentalsSection fundamentalData={fundamentalData} crossListingData={crossListingData} />

                {peerTickers?.length > 0 && recommendationScore && (
                    <PeerComparison currentTicker={targetKeyword} sector={fundamentalData?.sector ?? null} peerTickers={peerTickers} />
                )}

                <EarningsAndSqueeze earningsSetup={earningsSetup} squeezeData={squeezeData} />

                <TechnicalSection technicalIndicators={technicalIndicators} />

                <MacroQuantBacktest
                    quantMetrics={quantMetrics}
                    macroIndicators={macroIndicators}
                    trendsHistory={trendsHistory}
                    targetKeyword={targetKeyword}
                />

                <SentimentCharts
                    recentSentiments={recentSentiments}
                    gaussianData={gaussianData}
                    quantMetrics={quantMetrics}
                    regionalSentiment={regionalSentiment}
                />

                <InsiderSection
                    insiderTrades={insiderTrades}
                    insiderStats={insiderStats}
                    tradeFilter={tradeFilter}
                    setTradeFilter={setTradeFilter}
                    fmt={fmt}
                />

                <ComprehensiveAnalysis
                    recommendationScore={recommendationScore}
                    fundamentalData={fundamentalData}
                    technicalIndicators={technicalIndicators}
                    quantMetrics={quantMetrics}
                    macroIndicators={macroIndicators}
                    gaussianData={gaussianData}
                    manipulationStats={manipulationStats}
                    insiderStats={insiderStats}
                    insiderTrades={insiderTrades}
                    riskProfile={riskProfile}
                    derivedSignal={derivedSignal}
                    sig={sig}
                    activeRec={activeRec}
                    targetKeyword={targetKeyword}
                    fmt={fmt}
                />

                {/* Watchlist Screener */}
                <section id="watchlist" className="col-span-12 scroll-mt-20" data-animate>
                    <div className="flex items-center gap-3 mb-5">
                        <div className="w-6 h-6 rounded-lg bg-amber-500/15 flex items-center justify-center border border-amber-500/20">
                            <Star className="w-3.5 h-3.5 text-amber-400" />
                        </div>
                        <span className="section-title">Watchlist Screener</span>
                        <div className="flex-1 h-px bg-gradient-to-r from-[#1a1a3a] to-transparent" />
                        <span className="badge badge-gold">Multi-Horizon</span>
                    </div>
                    <ScreenerGrid showAddButton />
                </section>

                <PredictionHistory predictionHistory={predictionHistory} auditStats={auditStats} />

                <AlphaAttribution
                    signalAttribution={signalAttribution}
                    recommendationScore={recommendationScore}
                    targetKeyword={targetKeyword}
                />
            </main>
        </div>
    );
}
