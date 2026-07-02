import type { Config } from "tailwindcss";

// Anthropic-inspired warm palette: ivory surfaces, book-cloth terracotta
// accent, muted earthy signal colors. The stock Tailwind scales below are
// overridden so every existing `emerald-400`/`amber-500`/`indigo-600` class
// in the codebase re-themes centrally without touching components.
const config: Config = {
    content: [
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                // Surfaces — warm charcoal (Anthropic dark)
                'bg-void':    '#1F1E1D',
                'bg-base':    '#2A2927',
                'bg-raised':  '#242320',
                'bg-overlay': '#262624',
                // Borders
                'border-dim':     '#33322E',
                'border-default': '#43413A',
                'border-bright':  '#52504A',
                // Accent — book cloth terracotta, lifted for dark
                'gold-deep':    '#E8A98C',
                'gold-muted':   '#C96442',
                'gold-base':    '#D97757',
                'gold-bright':  '#E0906F',
                'gold-pale':    '#B4552D',
                'gold-shimmer': '#3D2A1F',
                // Signals — muted earthy, lifted for dark
                'bull':         '#7FA886',
                'bull-dim':     '#2E3B2F',
                'bear':         '#D9776B',
                'bear-dim':     '#46302B',
                'neutral-sig':  '#8F8C80',
                'warn':         '#D97757',
                // Text
                'text-primary':   '#F0EEE6',
                'text-secondary': '#A6A296',
                'text-tertiary':  '#8F8C80',
                'text-disabled':  '#6B6960',

                // ── Overridden stock scales (only shades the app uses) ──
                emerald: {
                    100: '#2E3B2F', 200: '#3A4B3C', 300: '#A9C7AC', 400: '#7FA886',
                    500: '#6C9673', 600: '#5A8161', 700: '#4E7D53', 800: '#3E6247',
                    900: '#2E4A36', 950: '#2A362B',
                },
                red: {
                    100: '#46302B', 200: '#543630', 300: '#E0A197', 400: '#D9776B',
                    500: '#C9635A', 600: '#B5544A', 700: '#9C463E', 800: '#7E3831',
                    900: '#5F2B26', 950: '#3E2823',
                },
                rose: {
                    400: '#D9776B', 500: '#C9635A', 900: '#5F2B26',
                },
                amber: {
                    100: '#3D2A1F', 200: '#4A2E1F', 300: '#E8A98C', 400: '#D97757',
                    500: '#C96442', 600: '#B4552D', 700: '#9B4A28', 800: '#7F3D22',
                    900: '#66311C', 950: '#362419',
                },
                orange: {
                    300: '#E8A98C', 400: '#DB8A5C', 500: '#C97141',
                    900: '#66311C', 950: '#362419',
                },
                indigo: {
                    100: '#2A3240', 300: '#A9BCD9', 400: '#8CA3C7', 500: '#6F8BB3',
                    600: '#5F7BA6', 700: '#4C6488', 950: '#252C38',
                },
                purple: {
                    400: '#A899BC', 500: '#9587AB',
                },
                cyan: {
                    400: '#8FB4C7', 500: '#7AA3B8',
                },
                blue: {
                    400: '#8CA3C7', 500: '#6F8BB3',
                },
                slate: {
                    800: '#33312C',
                },
            },
            fontFamily: {
                sans:    ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
                mono:    ['var(--font-mono)', 'JetBrains Mono', 'monospace'],
                display: ['var(--font-display)', 'Lora', 'Georgia', 'serif'],
            },
            boxShadow: {
                'card':       '0 1px 3px rgba(0,0,0,0.25), 0 1px 2px rgba(0,0,0,0.15)',
                'card-hover': '0 4px 12px rgba(0,0,0,0.3), 0 2px 4px rgba(0,0,0,0.2)',
                'card-bull':  '0 0 0 1px rgba(127,168,134,0.3)',
                'card-bear':  '0 0 0 1px rgba(217,119,107,0.3)',
                'card-gold':  '0 0 0 1px rgba(217,119,87,0.3)',
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
                    '0%':   { boxShadow: '0 0 0 0 rgba(127,168,134,0.3)' },
                    '70%':  { boxShadow: '0 0 0 6px transparent' },
                    '100%': { boxShadow: '0 0 0 0 transparent' },
                },
            },
        },
    },
    plugins: [],
};
export default config;
