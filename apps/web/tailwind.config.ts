import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                // Backgrounds
                'bg-void':    '#fafaf9', // Stone 50
                'bg-base':    '#ffffff', // White
                'bg-raised':  '#f5f5f4', // Stone 100
                'bg-overlay': '#ffffff', // White
                // Borders
                'border-dim':     '#f5f5f4', // Stone 100
                'border-default': '#e7e5e4', // Stone 200
                'border-bright':  '#d6d3d1', // Stone 300
                // Accent spectrum (minimalist)
                'gold-deep':    '#57534e', // Stone 600
                'gold-muted':   '#78716c', // Stone 500
                'gold-base':    '#292524', // Stone 800
                'gold-bright':  '#1c1917', // Stone 900
                'gold-pale':    '#d6d3d1', // Stone 300
                'gold-shimmer': '#f5f5f4', // Stone 100
                // Signals
                'bull':         '#059669', // Emerald 600
                'bull-dim':     '#d1fae5', // Emerald 100
                'bear':         '#e11d48', // Rose 600
                'bear-dim':     '#ffe4e6', // Rose 100
                'neutral-sig':  '#78716c', // Stone 500
                'warn':         '#d97706', // Amber 600
                // Text
                'text-primary':   '#1c1917', // Stone 900
                'text-secondary': '#57534e', // Stone 600
                'text-tertiary':  '#a8a29e', // Stone 400
                'text-disabled':  '#d6d3d1', // Stone 300
            },
            fontFamily: {
                sans:    ['Inter', 'system-ui', 'sans-serif'],
                mono:    ['JetBrains Mono', 'monospace'],
                display: ['Inter', 'system-ui', 'sans-serif'],
            },
            boxShadow: {
                'card':       '0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03)',
                'card-hover': '0 4px 6px rgba(0,0,0,0.05), 0 2px 4px rgba(0,0,0,0.03)',
                'card-bull':  '0 0 0 1px rgba(5,150,105,0.2)',
                'card-bear':  '0 0 0 1px rgba(225,29,72,0.2)',
                'card-gold':  '0 0 0 1px rgba(28,25,23,0.1)',
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
