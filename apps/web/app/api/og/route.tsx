import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);

    const ticker  = (searchParams.get('ticker')  ?? 'N/A').toUpperCase().slice(0, 10);
    const signal  = (searchParams.get('signal')  ?? 'HOLD').toUpperCase();
    const scoreRaw = parseFloat(searchParams.get('score') ?? '');
    const score   = isNaN(scoreRaw) ? null : Math.max(0, Math.min(100, scoreRaw));
    const horizon = searchParams.get('horizon') ?? '15';

    // Signal colour logic
    const isBull     = signal === 'STRONG_BUY' || signal === 'BUY';
    const isBear     = signal === 'SELL'        || signal === 'STRONG_SELL';
    const signalColor  = isBull ? '#0ecf8a' : isBear ? '#f5495a' : '#f59e0b';
    const signalBg     = isBull ? 'rgba(14,207,138,0.12)' : isBear ? 'rgba(245,73,90,0.12)' : 'rgba(245,158,11,0.12)';
    const signalBorder = isBull ? 'rgba(14,207,138,0.35)' : isBear ? 'rgba(245,73,90,0.35)' : 'rgba(245,158,11,0.35)';
    const signalLabel  = signal.replace(/_/g, ' ');

    // Score pill colour
    const scoreColor =
        score == null    ? '#9898c0'
        : score >= 60   ? '#0ecf8a'
        : score >= 40   ? '#f59e0b'
        :                  '#f5495a';
    const scoreBg =
        score == null    ? 'rgba(152,152,192,0.10)'
        : score >= 60   ? 'rgba(14,207,138,0.12)'
        : score >= 40   ? 'rgba(245,158,11,0.12)'
        :                  'rgba(245,73,90,0.12)';

    // Current date
    const date = new Date().toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
    });

    return new ImageResponse(
        (
            <div
                style={{
                    width: 1200,
                    height: 630,
                    display: 'flex',
                    flexDirection: 'column',
                    background: '#05050f',
                    fontFamily: 'monospace',
                    position: 'relative',
                    overflow: 'hidden',
                }}
            >
                {/* ── Grid overlay ───────────────────────────────────────── */}
                <div
                    style={{
                        position: 'absolute',
                        inset: 0,
                        backgroundImage: `
                            linear-gradient(rgba(30,30,58,0.35) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(30,30,58,0.35) 1px, transparent 1px)
                        `,
                        backgroundSize: '60px 60px',
                        zIndex: 0,
                    }}
                />

                {/* ── Radial glow behind ticker ───────────────────────────── */}
                <div
                    style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: 600,
                        height: 400,
                        borderRadius: '50%',
                        background: `radial-gradient(ellipse, ${signalColor}18 0%, transparent 70%)`,
                        zIndex: 0,
                    }}
                />

                {/* ── Content ─────────────────────────────────────────────── */}
                <div
                    style={{
                        position: 'relative',
                        zIndex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        height: '100%',
                        padding: '48px 60px 0 60px',
                    }}
                >
                    {/* Header row */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                        {/* Brand */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <span
                                style={{
                                    fontSize: 28,
                                    fontWeight: 800,
                                    letterSpacing: '0.18em',
                                    color: '#fcd97a',
                                    textTransform: 'uppercase',
                                }}
                            >
                                PHAETON CAPITAL
                            </span>
                            <span
                                style={{
                                    fontSize: 13,
                                    letterSpacing: '0.22em',
                                    color: '#5d5d8a',
                                    textTransform: 'uppercase',
                                }}
                            >
                                MARKET INTELLIGENCE
                            </span>
                        </div>

                        {/* Horizon badge */}
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                padding: '8px 18px',
                                borderRadius: 8,
                                background: 'rgba(30,30,58,0.7)',
                                border: '1px solid #1e1e3a',
                                color: '#9898c0',
                                fontSize: 13,
                                letterSpacing: '0.10em',
                            }}
                        >
                            {horizon}D HORIZON
                        </div>
                    </div>

                    {/* Centre block */}
                    <div
                        style={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 28,
                        }}
                    >
                        {/* Ticker */}
                        <div
                            style={{
                                fontSize: 96,
                                fontWeight: 900,
                                color: '#f0efff',
                                letterSpacing: '-0.02em',
                                lineHeight: 1,
                                textShadow: `0 0 60px ${signalColor}40`,
                            }}
                        >
                            {ticker}
                        </div>

                        {/* Signal + Score row */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                            {/* Signal badge */}
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '10px 24px',
                                    borderRadius: 10,
                                    background: signalBg,
                                    border: `1.5px solid ${signalBorder}`,
                                    color: signalColor,
                                    fontSize: 17,
                                    fontWeight: 700,
                                    letterSpacing: '0.12em',
                                    textTransform: 'uppercase',
                                }}
                            >
                                {signalLabel}
                            </div>

                            {/* Divider */}
                            <div style={{ width: 1, height: 36, background: '#1e1e3a' }} />

                            {/* Score pill */}
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'baseline',
                                    gap: 6,
                                    padding: '10px 24px',
                                    borderRadius: 10,
                                    background: scoreBg,
                                    border: `1.5px solid ${scoreColor}50`,
                                }}
                            >
                                <span
                                    style={{
                                        fontSize: 36,
                                        fontWeight: 800,
                                        color: scoreColor,
                                        lineHeight: 1,
                                    }}
                                >
                                    {score != null ? score.toFixed(1) : '—'}
                                </span>
                                <span style={{ fontSize: 14, color: '#5d5d8a', letterSpacing: '0.06em' }}>
                                    / 100
                                </span>
                            </div>

                            {/* Label */}
                            <span style={{ fontSize: 13, color: '#5d5d8a', letterSpacing: '0.10em' }}>
                                COMPOSITE SCORE
                            </span>
                        </div>

                        {/* Thin accent line */}
                        <div
                            style={{
                                width: 120,
                                height: 2,
                                borderRadius: 1,
                                background: `linear-gradient(90deg, transparent, ${signalColor}80, transparent)`,
                            }}
                        />
                    </div>
                </div>

                {/* ── Bottom bar ──────────────────────────────────────────── */}
                <div
                    style={{
                        position: 'relative',
                        zIndex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '16px 60px',
                        borderTop: '1px solid #1e1e3a',
                        background: 'rgba(9,9,31,0.80)',
                    }}
                >
                    <span style={{ fontSize: 12, color: '#5d5d8a', letterSpacing: '0.08em' }}>
                        Generated by Phaeton Capital · phaeton.capital
                    </span>
                    <span style={{ fontSize: 12, color: '#5d5d8a', letterSpacing: '0.06em' }}>
                        {date}
                    </span>
                </div>
            </div>
        ),
        {
            width: 1200,
            height: 630,
        }
    );
}
