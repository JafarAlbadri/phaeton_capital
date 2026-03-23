import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ["ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", 'Courier New', "monospace"],
                display: ["ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", 'Courier New', "monospace"],
            },
            colors: {
                background: "#000000",
                foreground: "#ffb700",
                border: "#333333",
                brand: {
                    50: '#fffbf0',
                    100: '#fef3c7',
                    400: '#fbbf24',
                    500: '#f59e0b',
                    900: '#78350f',
                    glow: 'transparent'
                },
                terminal: {
                    amber: '#ffb700',
                    green: '#00ff00',
                    red: '#ff0000',
                    blue: '#00ffff'
                }
            },
            animation: {
                'float': 'float 6s ease-in-out infinite',
                'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'glow': 'glow 2s ease-in-out infinite alternate',
            },
            keyframes: {
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-10px)' },
                },
                glow: {
                    '0%': { boxShadow: '0 0 5px rgba(16,185,129,0.2)' },
                    '100%': { boxShadow: '0 0 20px rgba(16,185,129,0.6)' },
                }
            }
        },
    },
    plugins: [],
};
export default config;
