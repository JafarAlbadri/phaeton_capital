"use client";

import { AlertTriangle, Globe } from 'lucide-react';
import {
    Area, AreaChart, CartesianGrid, ComposedChart, Line, ReferenceArea,
    ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { CustomTooltip } from './CustomTooltip';

export function SentimentCharts({ recentSentiments, gaussianData, quantMetrics, regionalSentiment }: {
    recentSentiments: any[];
    gaussianData: any;
    quantMetrics: any;
    regionalSentiment: any[];
}) {
    return (
        <section id="sentiment" className="col-span-12 scroll-mt-20" data-animate>

            {/* V2: Regional Sentiment Divergence */}
            {regionalSentiment && regionalSentiment.length >= 2 && (() => {
                const regionMap: Record<string, string> = { US: '🇺🇸 US', AU: '🇦🇺 AU', UK: '🇬🇧 UK', EU: '🇪🇺 EU' };
                const means = regionalSentiment.map((r: any) => r.mean_sentiment);
                const divergence = Math.max(...means) - Math.min(...means);
                return (
                    <div className={`mb-6 rounded-xl border p-4 ${divergence > 0.3 ? 'border-amber-500/20 bg-amber-500/[0.04]' : 'border-[#E5E1D5] bg-[#FAF9F5]'}`}>
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <Globe className="w-3.5 h-3.5 text-indigo-400" />
                                <span className="text-[11px] font-700 tracking-[0.08em] uppercase text-[#6E6C60]">Regional Sentiment Divergence</span>
                            </div>
                            {divergence > 0.3 && (
                                <div className="flex items-center gap-1.5 text-amber-400 text-[10px] font-700">
                                    <AlertTriangle className="w-3 h-3" /> Divergence detected · {divergence.toFixed(2)}
                                </div>
                            )}
                        </div>
                        <div className="flex items-end gap-4">
                            {regionalSentiment.map((r: any) => (
                                <div key={r.region} className="flex flex-col items-center gap-1.5 flex-1">
                                    <div className="w-full rounded-md overflow-hidden bg-[#EFECE1]" style={{ height: 48 }}>
                                        <div className="rounded-md transition-all"
                                             style={{ height: `${Math.max(4, Math.abs(r.mean_sentiment) * 48)}px`, marginTop: r.mean_sentiment > 0 ? 0 : 'auto', background: r.mean_sentiment > 0.1 ? '#4E7D53' : r.mean_sentiment < -0.1 ? '#C24E42' : '#C96442', opacity: 0.75 }} />
                                    </div>
                                    <span className="text-[10px] text-[#7C7A6E]">{regionMap[r.region] ?? r.region}</span>
                                    <span className={`text-[10px] font-700 font-mono ${r.mean_sentiment > 0.1 ? 'text-emerald-400' : r.mean_sentiment < -0.1 ? 'text-red-400' : 'text-amber-400'}`}>{r.mean_sentiment.toFixed(2)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })()}

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* Sentiment timeline */}
                <div className="card card-accent relative overflow-hidden p-0 w-full" data-animate-child>
                    <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E1D5]">
                        <div>
                            <h3 className="text-[13px] font-600 text-[#2A2925] tracking-[0.02em] uppercase">Sentiment Timeline</h3>
                            <p className="text-[11px] text-[#7C7A6E] mt-0.5">Real-time aggregate scoring</p>
                        </div>
                        <div className="badge badge-gold"><div className="status-live mr-1" /> LIVE</div>
                    </div>
                    <div className="px-4 pb-4 pt-6 h-[260px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={recentSentiments} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="sentGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%"   stopColor="#C96442" stopOpacity={0.35} />
                                        <stop offset="40%"  stopColor="#C96442" stopOpacity={0.12} />
                                        <stop offset="100%" stopColor="#C96442" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="1 8" stroke="#DFDACB" vertical={false} />
                                <XAxis dataKey="timeLabel" axisLine={false} tickLine={false} tick={{ fill: '#8F8C80', fontSize: 11 }} tickMargin={8} />
                                <YAxis yAxisId="left" dataKey="sentiment" axisLine={false} tickLine={false} tick={{ fill: '#8F8C80', fontSize: 11 }} width={35} domain={[-1,1]} />
                                <YAxis yAxisId="right" dataKey="price" orientation="right" axisLine={false} tickLine={false} tick={{ fill: '#5F7BA6', fontSize: 11 }} domain={['auto', 'auto']} tickFormatter={(v) => `$${v.toFixed(0)}`} />
                                <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#C96442', strokeWidth: 1, strokeOpacity: 0.3 }} />
                                <ReferenceArea yAxisId="left" y1={0.6} y2={1.0} fill="#4E7D53" fillOpacity={0.04} />
                                <ReferenceArea yAxisId="left" y1={-1.0} y2={-0.6} fill="#C24E42" fillOpacity={0.04} />
                                <ReferenceLine yAxisId="left" y={0.6} stroke="#4E7D53" strokeOpacity={0.5} strokeDasharray="4 4" label={{ value: 'BULLISH', position: 'insideTopLeft', style: { fill: '#4E7D53', fontSize: 10, letterSpacing: '0.08em' } }} />
                                <ReferenceLine yAxisId="left" y={-0.6} stroke="#C24E42" strokeOpacity={0.5} strokeDasharray="4 4" label={{ value: 'BEARISH', position: 'insideBottomLeft', style: { fill: '#C24E42', fontSize: 10, letterSpacing: '0.08em' } }} />
                                <Area yAxisId="left" type="monotone" dataKey="sentiment" stroke="#C96442" strokeWidth={2.5} fill="url(#sentGrad)" dot={false} activeDot={{ r: 5, fill: '#C96442', stroke: '#F0EEE6', strokeWidth: 2 }} isAnimationActive={true} />
                                <Line yAxisId="right" type="monotone" dataKey="price" stroke="#5F7BA6" strokeWidth={2} dot={false} activeDot={{ r: 5, fill: '#5F7BA6', stroke: '#F0EEE6', strokeWidth: 2 }} isAnimationActive={true} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Distribution chart */}
                {gaussianData && (
                    <div className="card card-accent relative overflow-hidden p-0 w-full" data-animate-child>
                        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E1D5]">
                            <div>
                                <h3 className="text-[13px] font-600 text-[#2A2925] tracking-[0.02em] uppercase">Opinion Distribution</h3>
                                <p className="text-[11px] text-[#7C7A6E] mt-0.5">Gaussian vs KDE</p>
                            </div>
                            <div className={`badge ${gaussianData.mean > 0 ? 'badge-bull' : 'badge-bear'}`}>
                                μ {gaussianData.mean.toFixed(2)}
                            </div>
                        </div>
                        <div className="px-4 pb-4 pt-6 h-[260px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={gaussianData.curve} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="distrGrad" x1="0" y1="0" x2="1" y2="0">
                                            <stop offset="0%" stopColor="#C24E42" />
                                            <stop offset="50%" stopColor="#C96442" />
                                            <stop offset="100%" stopColor="#4E7D53" />
                                        </linearGradient>
                                        <linearGradient id="distrVGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#C96442" stopOpacity={0.3} />
                                            <stop offset="100%" stopColor="#C96442" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="1 8" stroke="#DFDACB" vertical={false} />
                                    <XAxis dataKey="sentiment" axisLine={false} tickLine={false} tick={{ fill: '#8F8C80', fontSize: 11 }} tickMargin={8} domain={[-1,1]} type="number" />
                                    <YAxis hide />
                                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)' }} />
                                    <ReferenceLine x={gaussianData.mean} stroke={gaussianData.mean > 0 ? '#4E7D53' : '#C24E42'} strokeWidth={2} label={{ value: 'μ', position: 'top', style: { fill: gaussianData.mean > 0 ? '#4E7D53' : '#C24E42', fontSize: 12, fontWeight: 'bold' } }} />
                                    {/* Standard Deviation Area */}
                                    <ReferenceArea x1={gaussianData.mean - gaussianData.stdDev} x2={gaussianData.mean + gaussianData.stdDev} fill="#C96442" fillOpacity={0.06} />
                                    {/* 95% Confidence Interval Area (Bootstrap or Bayesian) */}
                                    {gaussianData.lowerBound != null && gaussianData.upperBound != null && (
                                        <ReferenceArea x1={gaussianData.lowerBound} x2={gaussianData.upperBound} fill="#8CA3C7" fillOpacity={0.15} />
                                    )}
                                    <Area type="monotone" dataKey="density" stroke="url(#distrGrad)" strokeWidth={2.5} fill="url(#distrVGrad)" dot={false} isAnimationActive={true} />
                                    {/* KDE if available */}
                                    {quantMetrics?.kde_data && (
                                      <Area type="monotone" data={quantMetrics.kde_data} dataKey="density" stroke="#5F7BA6" strokeWidth={1} fill="none" dot={false} strokeDasharray="4 4" />
                                    )}
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
}
