export interface DashboardProps {
    recentSentiments: any[];
    manipulationStats: { organicCount: number; manipulatedCount: number; totalCount: number } | null;
    targetKeyword: string;
    fundamentalData: any;
    financialHistory: any[];
    usdSekRate: number | null;
    gaussianData: { mean: number; stdDev: number; curve: any[]; lowerBound?: number; upperBound?: number } | null;
    insiderTrades: any[];
    quantMetrics: any;
    technicalIndicators: any;
    macroIndicators: any;
    riskProfile: any;
    recommendationScore: any;
    recommendationScores: { h15: any; h30: any; h90: any } | null;
    predictionAccuracy: number | null;
    predictionCount: number;
    predictionHistory: any[];
    auditStats: any;
    trendsHistory: { week_start: string; interest: number }[];
    crossListingData: any;
    regionalSentiment: any[];
    signalAttribution: any;
    scoreHistory: any[];
    peerTickers: string[];
    earningsSetup: any;
}

export type SignalStyle = {
    word: string;
    from: string;
    to: string;
    shadow: string;
    bgHero: string;
    gauge: string[];
};

export type Horizon = 15 | 30 | 90;
