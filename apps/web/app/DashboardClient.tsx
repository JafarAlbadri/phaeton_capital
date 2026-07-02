"use client";

import { useTransition, useState, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Star } from 'lucide-react';
import ScreenerGrid from '../components/ScreenerGrid';
import PeerComparison from '../components/PeerComparison';
import ScoreWeightsPanel from '../components/ScoreWeightsPanel';
import { useScrollAnimation } from '../components/dashboard/useScrollAnimation';
import { getSignal } from '../components/dashboard/signalStyles';
import { LoadingOverlay } from '../components/dashboard/LoadingOverlay';
import { CommandPalette, TickerSearchResult } from '../components/dashboard/CommandPalette';
import { TopBar } from '../components/dashboard/TopBar';
import { SideNav } from '../components/dashboard/SideNav';
import { EmptyState, HeroSection } from '../components/dashboard/HeroSection';
import { FundamentalsSection } from '../components/dashboard/FundamentalsSection';
import { EarningsSetupSection } from '../components/dashboard/EarningsSetupSection';
import { SqueezeSection } from '../components/dashboard/SqueezeSection';
import { TechnicalSection } from '../components/dashboard/TechnicalSection';
import { QuantSection } from '../components/dashboard/QuantSection';
import { BacktestSection } from '../components/dashboard/BacktestSection';
import { MacroSection } from '../components/dashboard/MacroSection';
import { SentimentCharts } from '../components/dashboard/SentimentCharts';
import { InsiderSection } from '../components/dashboard/InsiderSection';
import { AnalysisSection } from '../components/dashboard/AnalysisSection';
import { PredictionAuditSection } from '../components/dashboard/PredictionAuditSection';
import { AlphaAttributionSection } from '../components/dashboard/AlphaAttributionSection';

export default function DashboardClient({
    recentSentiments, manipulationStats, targetKeyword,
    fundamentalData, financialHistory, usdSekRate, gaussianData,
    insiderTrades, quantMetrics, technicalIndicators, macroIndicators,
    riskProfile, recommendationScore, recommendationScores,
    predictionAccuracy, predictionCount, predictionHistory, auditStats,
    trendsHistory, crossListingData, regionalSentiment, signalAttribution,
    scoreHistory, peerTickers, earningsSetup,
}: any) {
    const [isPending, startTransition] = useTransition();
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState(targetKeyword || '');
    const [searchResults, setSearchResults] = useState<TickerSearchResult[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [tradeFilter, setTradeFilter] = useState<'all' | 'buy' | 'sell'>('all');
    const [isCommandOpen, setIsCommandOpen] = useState(false);
    const [selectedHorizon, setSelectedHorizon] = useState<15 | 30 | 90>(15);
    const [sseConnected, setSseConnected] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [squeezeData, setSqueezeData] = useState<any>(null);
    const router = useRouter();
    const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

    useScrollAnimation();

    // Refetch squeeze data when the viewed ticker changes
    useEffect(() => {
        setSqueezeData(null);
        fetch(`/api/squeeze/${targetKeyword}`).then(r => r.json()).then(d => {
            if (!d.error) setSqueezeData(d);
        }).catch(() => {});
    }, [targetKeyword]);

    // SSE live updates with exponential-backoff reconnect
    useEffect(() => {
        let es: EventSource | null = null;
        let retryDelay = 1000;
        let retryTimer: ReturnType<typeof setTimeout> | null = null;
        let destroyed = false;

        const connect = () => {
            if (destroyed) return;
            es = new EventSource('/api/events');

            es.addEventListener('open', () => {
                retryDelay = 1000;
                setSseConnected(true);
            });
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
                    retryTimer = setTimeout(() => {
                        retryDelay = Math.min(retryDelay * 2, 30_000);
                        connect();
                    }, retryDelay);
                }
            };
        };

        connect();
        return () => {
            destroyed = true;
            if (retryTimer) clearTimeout(retryTimer);
            es?.close();
        };
    }, [targetKeyword]);

    // Command palette listener
    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setIsCommandOpen((open) => !open);
                setSearchResults([]);
            }
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

    const activeRec = recommendationScores
        ? (selectedHorizon === 15 ? recommendationScores.h15 : selectedHorizon === 30 ? recommendationScores.h30 : recommendationScores.h90) ?? recommendationScore
        : recommendationScore;
    const sig = getSignal(activeRec?.signal);

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

    return (
        <div className="min-h-screen relative text-[#f0efff]">

            {(loading || isPending) && <LoadingOverlay scanning={loading} label={searchQuery} />}

            {isCommandOpen && (
                <CommandPalette
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    searchResults={searchResults}
                    searchLoading={searchLoading}
                    onClose={() => setIsCommandOpen(false)}
                    onTrigger={triggerScrape}
                />
            )}

            <TopBar
                targetKeyword={targetKeyword}
                sseConnected={sseConnected}
                lastUpdated={lastUpdated}
                recommendationScore={recommendationScore}
                loading={loading}
                onOpenCommand={() => setIsCommandOpen(true)}
                onScan={() => triggerScrape()}
            />

            <SideNav />

            <main className="ml-16 xl:ml-64 pt-14 max-w-[1600px] mx-auto p-4 xl:p-8 space-y-8">

                {!recommendationScore && !loading && <EmptyState onTrigger={triggerScrape} />}

                {recommendationScore && (<>
                    <HeroSection
                        targetKeyword={targetKeyword}
                        sig={sig}
                        activeRec={activeRec}
                        selectedHorizon={selectedHorizon}
                        setSelectedHorizon={setSelectedHorizon}
                        recommendationScores={recommendationScores}
                        fundamentalData={fundamentalData}
                        predictionCount={predictionCount}
                        predictionAccuracy={predictionAccuracy}
                        scoreHistory={scoreHistory}
                    />

                    <ScoreWeightsPanel
                        scores={{
                            sentiment: recommendationScore.sentiment_score,
                            technical: recommendationScore.technical_score,
                            fundamental: recommendationScore.fundamental_score,
                            quant: recommendationScore.quant_score,
                            insider: recommendationScore.insider_score,
                            macro: recommendationScore.macro_score,
                            risk: recommendationScore.risk_score,
                        }}
                        baseComposite={recommendationScore.composite_score}
                    />
                </>)}

                {fundamentalData && (
                    <FundamentalsSection fundamentalData={fundamentalData} crossListingData={crossListingData} />
                )}

                {peerTickers?.length > 0 && recommendationScore && (
                    <PeerComparison
                        currentTicker={targetKeyword}
                        sector={fundamentalData?.sector ?? null}
                        peerTickers={peerTickers}
                    />
                )}

                {earningsSetup?.daysToEarnings != null && earningsSetup.daysToEarnings >= 0 && earningsSetup.daysToEarnings <= 30 && (
                    <EarningsSetupSection earningsSetup={earningsSetup} />
                )}

                {squeezeData && <SqueezeSection squeezeData={squeezeData} />}

                {technicalIndicators && <TechnicalSection technicalIndicators={technicalIndicators} />}

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                    {quantMetrics && <QuantSection quantMetrics={quantMetrics} trendsHistory={trendsHistory} />}

                    {/* key={ticker} resets the panel state when the viewed ticker changes */}
                    <BacktestSection key={targetKeyword} targetKeyword={targetKeyword} />

                    {macroIndicators && <MacroSection macroIndicators={macroIndicators} />}
                </div>

                <SentimentCharts
                    recentSentiments={recentSentiments}
                    gaussianData={gaussianData}
                    quantMetrics={quantMetrics}
                    regionalSentiment={regionalSentiment}
                />

                {insiderTrades?.length > 0 && (
                    <InsiderSection insiderStats={insiderStats} tradeFilter={tradeFilter} setTradeFilter={setTradeFilter} />
                )}

                {(recommendationScore || fundamentalData || technicalIndicators) && (
                    <AnalysisSection
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
                        targetKeyword={targetKeyword}
                        sig={sig}
                    />
                )}

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

                {predictionHistory?.length > 0 && (
                    <PredictionAuditSection predictionHistory={predictionHistory} auditStats={auditStats} />
                )}

                {signalAttribution && (
                    <AlphaAttributionSection
                        signalAttribution={signalAttribution}
                        recommendationScore={recommendationScore}
                        targetKeyword={targetKeyword}
                    />
                )}

            </main>
        </div>
    );
}
