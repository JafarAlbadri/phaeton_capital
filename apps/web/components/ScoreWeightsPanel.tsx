"use client";

import { useState, useMemo } from "react";
import { SlidersHorizontal, RotateCcw, ChevronDown, ChevronUp } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ScoreWeightsPanelProps {
    scores: {
        sentiment:   number | null;
        technical:   number | null;
        fundamental: number | null;
        quant:       number | null;
        insider:     number | null;
        macro:       number | null;
        risk:        number | null;
    };
    baseComposite: number | null;
}

type WeightKey = 'sentiment' | 'technical' | 'fundamental' | 'quant' | 'insider' | 'macro' | 'risk';

interface Weights {
    sentiment:   number;
    technical:   number;
    fundamental: number;
    quant:       number;
    insider:     number;
    macro:       number;
    risk:        number;
}

const DEFAULT_WEIGHTS: Weights = {
    sentiment:   20,
    technical:   20,
    fundamental: 20,
    quant:       20,
    insider:     10,
    macro:        5,
    risk:         5,
};

const LABELS: Record<WeightKey, string> = {
    sentiment:   'Sentiment',
    technical:   'Technical',
    fundamental: 'Fundamental',
    quant:       'Quant',
    insider:     'Insider',
    macro:       'Macro',
    risk:        'Risk',
};

const SCORE_KEYS: WeightKey[] = [
    'sentiment', 'technical', 'fundamental', 'quant', 'insider', 'macro', 'risk',
];

// ── Recompute helper ──────────────────────────────────────────────────────────

function computeCustomScore(
    scores: ScoreWeightsPanelProps['scores'],
    weights: Weights
): number | null {
    let weightedSum = 0;
    let totalWeight = 0;

    for (const key of SCORE_KEYS) {
        const score = scores[key];
        if (score == null) continue;
        const w = weights[key];
        weightedSum += score * w;
        totalWeight += w;
    }

    if (totalWeight === 0) return null;
    return weightedSum / totalWeight;
}

// ── Score colour ──────────────────────────────────────────────────────────────

function scoreColor(v: number | null): string {
    if (v == null) return '#9898c0';
    if (v >= 60)  return '#0ecf8a';
    if (v >= 40)  return '#f59e0b';
    return '#f5495a';
}

// ── Slider row ────────────────────────────────────────────────────────────────

interface SliderRowProps {
    label:    string;
    weight:   number;
    score:    number | null;
    onChange: (v: number) => void;
}

function SliderRow({ label, weight, score, onChange }: SliderRowProps) {
    const sc = scoreColor(score);
    return (
        <div className="grid grid-cols-[120px_1fr_44px_52px] items-center gap-3 py-1.5">
            {/* Label + score */}
            <div className="flex items-center gap-2">
                <span className="text-[12px] text-[#9898c0] font-500 truncate">{label}</span>
                {score != null && (
                    <span
                        className="text-[10px] font-mono font-700"
                        style={{ color: sc }}
                    >
                        {score.toFixed(0)}
                    </span>
                )}
                {score == null && (
                    <span className="text-[10px] text-[#5d5d8a]">n/a</span>
                )}
            </div>

            {/* Slider */}
            <div className="relative flex items-center">
                <input
                    type="range"
                    min={0}
                    max={40}
                    step={1}
                    value={weight}
                    onChange={e => onChange(Number(e.target.value))}
                    disabled={score == null}
                    className="w-full h-1.5 appearance-none rounded-full cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                    style={{
                        background: score != null
                            ? `linear-gradient(to right, #d4a017 ${(weight / 40) * 100}%, #1e1e3a ${(weight / 40) * 100}%)`
                            : '#1e1e3a',
                    }}
                />
            </div>

            {/* Weight value */}
            <span className="text-right text-[12px] font-mono font-600 text-[#fcd97a]">
                {weight}
            </span>

            {/* Weight % label */}
            <span className="text-right text-[10px] text-[#5d5d8a]">
                / 100
            </span>
        </div>
    );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ScoreWeightsPanel({ scores, baseComposite }: ScoreWeightsPanelProps) {
    const [open,    setOpen]    = useState(false);
    const [weights, setWeights] = useState<Weights>({ ...DEFAULT_WEIGHTS });

    const customScore = useMemo(() => computeCustomScore(scores, weights), [scores, weights]);

    const totalWeight = useMemo(
        () => SCORE_KEYS.reduce((s, k) => s + weights[k], 0),
        [weights]
    );

    const delta = useMemo(() => {
        if (customScore == null || baseComposite == null) return null;
        return customScore - baseComposite;
    }, [customScore, baseComposite]);

    const setWeight = (key: WeightKey) => (value: number) => {
        setWeights(prev => ({ ...prev, [key]: value }));
    };

    const reset = () => setWeights({ ...DEFAULT_WEIGHTS });

    const deltaColor  = delta == null ? '#9898c0' : delta > 0 ? '#0ecf8a' : delta < 0 ? '#f5495a' : '#9898c0';
    const deltaPrefix = delta == null ? '' : delta > 0 ? '+' : '';

    return (
        <div className="rounded-xl border border-[#1e1e3a] bg-[#09091f] overflow-hidden">

            {/* ── Toggle button ──────────────────────────────────────────── */}
            <button
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.025] transition-colors group"
            >
                <div className="flex items-center gap-2">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-[#fcd97a]" />
                    <span className="text-[11px] font-700 tracking-[0.08em] uppercase text-[#9898c0] group-hover:text-[#f0efff] transition-colors">
                        Tune Weights
                    </span>
                </div>

                <div className="flex items-center gap-3">
                    {/* Teaser: custom score when collapsed */}
                    {!open && customScore != null && (
                        <span
                            className="text-[13px] font-mono font-700"
                            style={{ color: scoreColor(customScore) }}
                        >
                            {customScore.toFixed(1)}
                        </span>
                    )}
                    {open
                        ? <ChevronUp   className="w-3.5 h-3.5 text-[#5d5d8a]" />
                        : <ChevronDown className="w-3.5 h-3.5 text-[#5d5d8a]" />
                    }
                </div>
            </button>

            {/* ── Expanded panel ─────────────────────────────────────────── */}
            {open && (
                <>
                    <div className="border-t border-[#1e1e3a] px-4 pt-3 pb-4">

                        {/* Weights-sum warning */}
                        {totalWeight > 100 && (
                            <div className="flex items-center gap-2 mb-3 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                                <span className="text-[11px] text-amber-400">
                                    Weights sum to {totalWeight} — they will be normalised automatically.
                                </span>
                            </div>
                        )}

                        {/* Sliders */}
                        <div className="space-y-0.5">
                            {SCORE_KEYS.map(key => (
                                <SliderRow
                                    key={key}
                                    label={LABELS[key]}
                                    weight={weights[key]}
                                    score={scores[key]}
                                    onChange={setWeight(key)}
                                />
                            ))}
                        </div>

                        {/* Divider */}
                        <div className="my-3 h-px bg-[#1e1e3a]" />

                        {/* Score readout */}
                        <div className="flex items-center justify-between">
                            <div className="flex flex-col gap-0.5">
                                <span className="text-[10px] tracking-[0.10em] uppercase text-[#5d5d8a]">
                                    Custom Score
                                </span>

                                <div className="flex items-baseline gap-2">
                                    {/* Custom score */}
                                    <span
                                        className="text-[28px] font-mono font-800 leading-none"
                                        style={{ color: scoreColor(customScore) }}
                                    >
                                        {customScore != null ? customScore.toFixed(1) : '—'}
                                    </span>

                                    {/* Delta vs base */}
                                    {delta != null && (
                                        <span
                                            className="text-[13px] font-mono font-600"
                                            style={{ color: deltaColor }}
                                        >
                                            {deltaPrefix}{delta.toFixed(1)}
                                        </span>
                                    )}
                                </div>

                                {/* Base composite reference */}
                                {baseComposite != null && (
                                    <span className="text-[10px] text-[#5d5d8a]">
                                        Base composite: {baseComposite.toFixed(1)}
                                    </span>
                                )}
                            </div>

                            {/* Reset button */}
                            <button
                                onClick={reset}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#1e1e3a] text-[11px] text-[#9898c0] hover:border-[#2e2e5a] hover:text-[#f0efff] hover:bg-white/[0.025] transition-all"
                            >
                                <RotateCcw className="w-3 h-3" />
                                Reset to Default
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
