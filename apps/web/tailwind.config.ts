import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                // Backgrounds (Zinc scale)
                'bg-void':    '#09090b', // Zinc 950
                'bg-base':    '#18181b', // Zinc 900
                'bg-raised':  '#27272a', // Zinc 800
                'bg-overlay': '#27272a', // Zinc 800
                // Borders
                'border-dim':     '#27272a', // Zinc 800
                'border-default': '#3f3f46', // Zinc 700
                'border-bright':  '#52525b', // Zinc 600
                // Accent spectrum (minimalist)
                'gold-deep':    '#d4d4d8', // Zinc 300
                'gold-muted':   '#a1a1aa', // Zinc 400
                'gold-base':    '#f4f4f5', // Zinc 100
                'gold-bright':  '#ffffff', // White
                'gold-pale':    '#71717a', // Zinc 500
                'gold-shimmer': '#3f3f46', // Zinc 700
                // Signals
                'bull':         '#34d399', // Emerald 400
                'bull-dim':     '#064e3b', // Emerald 900
                'bear':         '#fb7185', // Rose 400
                'bear-dim':     '#881337', // Rose 900
                'neutral-sig':  '#a1a1aa', // Zinc 400
                'warn':         '#fbbf24', // Amber 400
                // Text
                'text-primary':   '#f4f4f5', // Zinc 100
                'text-secondary': '#a1a1aa', // Zinc 400
                'text-tertiary':  '#71717a', // Zinc 500
                'text-disabled':  '#52525b', // Zinc 600
            },
            fontFamily: {
                sans:    ['Inter', 'system-ui', 'sans-serif'],
                mono:    ['JetBrains Mono', 'monospace'],
                display: ['Inter', 'system-ui', 'sans-serif'],
            },
            boxShadow: {
                'card':       '0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.2)',
                'card-hover': '0 4px 6px rgba(0,0,0,0.4), 0 2px 4px rgba(0,0,0,0.2)',
                'card-bull':  '0 0 0 1px rgba(52,211,153,0.2)',
                'card-bear':  '0 0 0 1px rgba(251,113,133,0.2)',
                'card-gold':  '0 0 0 1px rgba(244,244,245,0.1)',
                'glow-bull':  'none',
                'glow-bear':  'none',
                'glow-gold':  'none',
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
                'orbit':         'none',
            },
            keyframes: {
                fadeIn:      { from: { opacity: '0' }, to: { opacity: '1' } },
                slideUp:     { from: { opacity: '0', transform: 'translateY(16px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
                heroEnter:   { from: { opacity: '0', transform: 'scale(0.97) translateY(8px)' }, to: { opacity: '1', transform: 'scale(1) translateY(0)' } },
                barFillIn:   { from: { width: '0%', opacity: '0.5' }, to: { opacity: '1' } },
                shimmerSweep:{ from: { transform: 'translateX(-100%)' }, to: { transform: 'translateX(300%)' } },
                ticker:      { from: { transform: 'translateX(0)' }, to: { transform: 'translateX(-50%)' } },
                livePulse: {
                    '0%':   { boxShadow: '0 0 0 0 rgba(5,150,105,0.2)' },
                    '70%':  { boxShadow: '0 0 0 6px transparent' },
                    '100%': { boxShadow: '0 0 0 0 transparent' },
                },
            },
        },
    },
    plugins: [],
};
export default config;
