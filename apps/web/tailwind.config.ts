import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                // Backgrounds
                'bg-void':    '#05050f',
                'bg-base':    '#080818',
                'bg-raised':  '#0d0d24',
                'bg-overlay': '#12122e',
                // Borders
                'border-dim':     '#1a1a3a',
                'border-default': '#252550',
                'border-bright':  '#3a3a7a',
                // Gold spectrum (brand signature)
                'gold-deep':    '#92620a',
                'gold-muted':   '#b8860b',
                'gold-base':    '#d4a017',
                'gold-bright':  '#f0b429',
                'gold-pale':    '#fcd97a',
                'gold-shimmer': '#fff3c4',
                // Signals
                'bull':         '#0ecf8a',
                'bull-dim':     '#064d33',
                'bear':         '#f5495a',
                'bear-dim':     '#4d0a10',
                'neutral-sig':  '#8b9cb5',
                'warn':         '#f5a623',
                // Text
                'text-primary':   '#f0efff',
                'text-secondary': '#9898c0',
                'text-tertiary':  '#5d5d8a',
                'text-disabled':  '#2d2d55',
            },
            fontFamily: {
                sans:    ['Inter var', 'Inter', 'system-ui', 'sans-serif'],
                mono:    ['JetBrains Mono', 'Fira Code', 'monospace'],
                display: ['var(--font-syne)', 'Syne', 'system-ui', 'sans-serif'],
            },
            boxShadow: {
                'card':       '0 1px 0 rgba(255,255,255,0.04) inset, 0 4px 20px rgba(0,0,0,0.45), 0 1px 3px rgba(0,0,0,0.7)',
                'card-hover': '0 1px 0 rgba(255,255,255,0.06) inset, 0 12px 40px rgba(0,0,0,0.55), 0 4px 12px rgba(0,0,0,0.8)',
                'card-bull':  '0 0 40px rgba(14,207,138,0.08), 0 0 0 1px rgba(14,207,138,0.15)',
                'card-bear':  '0 0 40px rgba(245,73,90,0.08), 0 0 0 1px rgba(245,73,90,0.15)',
                'card-gold':  '0 0 40px rgba(212,160,23,0.08), 0 0 0 1px rgba(212,160,23,0.15)',
                'glow-bull':  '0 0 20px rgba(14,207,138,0.5)',
                'glow-bear':  '0 0 20px rgba(245,73,90,0.5)',
                'glow-gold':  '0 0 20px rgba(212,160,23,0.5)',
            },
            animation: {
                'pulse-slow':    'pulse 4s ease-in-out infinite',
                'fade-in':       'fadeIn 0.3s ease-out forwards',
                'slide-up':      'slideUp 0.45s cubic-bezier(0.34,1.56,0.64,1) forwards',
                'hero-enter':    'heroEnter 0.6s cubic-bezier(0.34,1.56,0.64,1) forwards',
                'bar-fill':      'barFillIn 0.8s cubic-bezier(0.34,1.56,0.64,1) forwards',
                'shimmer-sweep': 'shimmerSweep 1.2s ease 1s forwards',
                'ticker':        'ticker 20s linear infinite',
                'live-pulse':    'livePulse 2.5s ease-out infinite',
                'orbit':         'orbit 30s linear infinite',
            },
            keyframes: {
                fadeIn:      { from: { opacity: '0' }, to: { opacity: '1' } },
                slideUp:     { from: { opacity: '0', transform: 'translateY(16px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
                heroEnter:   { from: { opacity: '0', transform: 'scale(0.97) translateY(8px)' }, to: { opacity: '1', transform: 'scale(1) translateY(0)' } },
                barFillIn:   { from: { width: '0%', opacity: '0.5' }, to: { opacity: '1' } },
                shimmerSweep:{ from: { transform: 'translateX(-100%)' }, to: { transform: 'translateX(300%)' } },
                ticker:      { from: { transform: 'translateX(0)' }, to: { transform: 'translateX(-50%)' } },
                livePulse: {
                    '0%':   { boxShadow: '0 0 0 0 rgba(14,207,138,0.5)' },
                    '70%':  { boxShadow: '0 0 0 8px transparent' },
                    '100%': { boxShadow: '0 0 0 0 transparent' },
                },
                orbit: {
                    from: { transform: 'rotate(0deg) translateX(200px) rotate(0deg)' },
                    to:   { transform: 'rotate(360deg) translateX(200px) rotate(-360deg)' },
                },
            },
        },
    },
    plugins: [],
};
export default config;
