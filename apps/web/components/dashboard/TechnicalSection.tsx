"use client";

import { Activity, BarChart2, TrendingUp, ArrowUpRight } from 'lucide-react';
import { InlineExplain } from '../ExplainTooltip';
import { Tile } from './shared';

interface TechnicalSectionProps {
    technicalIndicators: any;
}

export default function TechnicalSection({ technicalIndicators }: TechnicalSectionProps) {
    if (!technicalIndicators) return null;
    return (
        <section id="technical" className="col-span-12 scroll-mt-20" data-animate>
            <div className="flex items-center gap-3 mb-5">
                <div className="w-6 h-6 rounded-lg bg-indigo-500/15 flex items-center justify-center border border-indigo-500/20">
                    <BarChart2 className="w-3.5 h-3.5 text-indigo-400" />
                </div>
                <InlineExplain topic="technical_score"><span className="section-title">Technical Analysis</span></InlineExplain>
                <div className="flex-1 h-px bg-gradient-to-r from-[#1a1a3a] to-transparent" />
                {technicalIndicators.technical_signal && (
                    <span className={`badge ${technicalIndicators.technical_signal==='BULLISH' ? 'badge-bull' : 'badge-bear'}`}>
                        {technicalIndicators.technical_signal}
                    </span>
                )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-4 xl:gap-5 mb-5">
                <Tile label="RSI (14)" value={technicalIndicators.rsi_14?.toFixed(1) || '—'} variant={technicalIndicators.rsi_14 < 30 ? 'bull' : technicalIndicators.rsi_14 > 70 ? 'bear' : 'gold'} icon={Activity} />
                <Tile label="MACD" value={technicalIndicators.macd?.toFixed(3) || '—'} variant={(technicalIndicators.macd || 0) > 0 ? 'bull' : 'bear'} icon={TrendingUp} />
                <Tile label="SMA 50" value={technicalIndicators.sma_50 ? `$${technicalIndicators.sma_50.toFixed(2)}` : '—'} variant="gold" icon={ArrowUpRight} />
                <Tile label="SMA 200" value={technicalIndicators.sma_200 ? `$${technicalIndicators.sma_200.toFixed(2)}` : '—'} variant="gold" icon={ArrowUpRight} />
                <Tile label="EMA 12" value={technicalIndicators.ema_12 ? `$${technicalIndicators.ema_12.toFixed(2)}` : '—'} variant="gold" />
                <Tile label="ATR (14)" value={technicalIndicators.atr_14 ? `$${technicalIndicators.atr_14.toFixed(2)}` : '—'} variant="gold" />
            </div>
        </section>
    );
}
