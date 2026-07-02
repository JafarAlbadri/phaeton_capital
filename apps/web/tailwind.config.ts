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
                // Surfaces
                'bg-void':    '#F0EEE6', // page ivory
                'bg-base':    '#FFFFFF', // cards
                'bg-raised':  '#F5F3EB',
                'bg-overlay': '#FAF9F5',
                // Borders
                'border-dim':     '#EAE6DA',
                'border-default': '#DFDACB',
                'border-bright':  '#CFC9B8',
                // Accent — book cloth terracotta
                'gold-deep':    '#8A4630',
                'gold-muted':   '#B4552D',
                'gold-base':    '#C96442',
                'gold-bright':  '#A8552F',
                'gold-pale':    '#D9906F',
                'gold-shimmer': '#EFD9CC',
                // Signals — muted, earthy
                'bull':         '#4E7D53',
                'bull-dim':     '#E4EDE2',
                'bear':         '#C24E42',
                'bear-dim':     '#F4E0DC',
                'neutral-sig':  '#8F8C80',
                'warn':         '#C96442',
                // Text
                'text-primary':   '#1F1E1D',
                'text-secondary': '#6E6C60',
                'text-tertiary':  '#8F8C80',
                'text-disabled':  '#B9B5A7',

                // ── Overridden stock scales (only shades the app uses) ──
                emerald: {
                    100: '#E4EDE2', 200: '#C9DCC6', 300: '#8FB292', 400: '#4E7D53',
                    500: '#3E6B47', 600: '#35593C', 700: '#2C4A33', 800: '#233B29',
                    900: '#1B2E20', 950: '#DCE8DA',
                },
                red: {
                    100: '#F4E0DC', 200: '#EAC7C0', 300: '#D88A7B', 400: '#C24E42',
                    500: '#A93E33', 600: '#8F3329', 700: '#752A22', 800: '#5C211B',
                    900: '#452019', 950: '#F0DAD5',
                },
                rose: {
                    400: '#C24E42', 500: '#A93E33', 900: '#452019',
                },
                amber: {
                    100: '#F5E4D7', 200: '#EDCDB8', 300: '#D9906F', 400: '#C96442',
                    500: '#B4552D', 600: '#9B4A28', 700: '#7F3D22', 800: '#66311C',
                    900: '#4E2616', 950: '#F2E2D6',
                },
                orange: {
                    300: '#D9906F', 400: '#C05A2E', 500: '#A84E27',
                    900: '#4E2616', 950: '#F2E2D6',
                },
                indigo: {
                    100: '#E2E8F1', 300: '#A3B6D6', 400: '#7E97BE', 500: '#5F7BA6',
                    600: '#4C6488', 700: '#3E5270', 950: '#E6EBF3',
                },
                purple: {
                    400: '#8B7BA3', 500: '#75658D',
                },
                cyan: {
                    400: '#5F8FA6', 500: '#4E7A8F',
                },
                blue: {
                    400: '#5F7BA6', 500: '#4C6488',
                },
                slate: {
                    800: '#EEEAE0',
                },
            },
            fontFamily: {
                sans:    ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
                mono:    ['var(--font-mono)', 'JetBrains Mono', 'monospace'],
                display: ['var(--font-display)', 'Lora', 'Georgia', 'serif'],
            },
            boxShadow: {
                'card':       '0 1px 3px rgba(31,30,29,0.06), 0 1px 2px rgba(31,30,29,0.04)',
                'card-hover': '0 4px 12px rgba(31,30,29,0.08), 0 2px 4px rgba(31,30,29,0.05)',
                'card-bull':  '0 0 0 1px rgba(78,125,83,0.25)',
                'card-bear':  '0 0 0 1px rgba(194,78,66,0.25)',
                'card-gold':  '0 0 0 1px rgba(201,100,66,0.2)',
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
                    '0%':   { boxShadow: '0 0 0 0 rgba(78,125,83,0.25)' },
                    '70%':  { boxShadow: '0 0 0 6px transparent' },
                    '100%': { boxShadow: '0 0 0 0 transparent' },
                },
            },
        },
    },
    plugins: [],
};
export default config;
