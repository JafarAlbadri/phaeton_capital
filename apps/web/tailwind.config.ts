import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
                mono: ["'JetBrains Mono'", "'Fira Code'", "ui-monospace", "monospace"],
                display: ["Inter", "system-ui", "sans-serif"],
            },
            colors: {
                background: "#08081a",
                surface: "#0e0e24",
                "surface-2": "#14142e",
                foreground: "#e2e8f0",
                muted: "#64748b",
                border: "rgba(255,255,255,0.07)",
                "border-strong": "rgba(255,255,255,0.12)",
                gold: {
                    DEFAULT: "#f59e0b",
                    light: "#fcd34d",
                    dim: "rgba(245,158,11,0.15)",
                },
                bull: {
                    DEFAULT: "#10b981",
                    light: "#34d399",
                    dim: "rgba(16,185,129,0.12)",
                },
                bear: {
                    DEFAULT: "#ef4444",
                    light: "#f87171",
                    dim: "rgba(239,68,68,0.12)",
                },
                warn: {
                    DEFAULT: "#f97316",
                    dim: "rgba(249,115,22,0.12)",
                },
                info: {
                    DEFAULT: "#6366f1",
                    dim: "rgba(99,102,241,0.12)",
                },
                cyan: {
                    DEFAULT: "#06b6d4",
                    dim: "rgba(6,182,212,0.12)",
                },
            },
            borderRadius: {
                card: "12px",
                pill: "999px",
            },
            boxShadow: {
                card: "0 1px 3px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.06)",
                "card-hover": "0 4px 24px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.10)",
                glow: "0 0 20px rgba(245,158,11,0.3)",
                "glow-bull": "0 0 20px rgba(16,185,129,0.25)",
                "glow-bear": "0 0 20px rgba(239,68,68,0.25)",
            },
            animation: {
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'fade-in': 'fadeIn 0.3s ease-out',
                'slide-up': 'slideUp 0.4s ease-out',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                slideUp: {
                    '0%': { opacity: '0', transform: 'translateY(8px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
            },
            backgroundImage: {
                'card-gradient': 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, transparent 100%)',
                'gold-gradient': 'linear-gradient(135deg, #f59e0b 0%, #fcd34d 100%)',
                'bull-gradient': 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
                'bear-gradient': 'linear-gradient(135deg, #ef4444 0%, #f87171 100%)',
            },
        },
    },
    plugins: [],
};
export default config;
