import "./globals.css";
import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Syne } from 'next/font/google';

const syne = Syne({ subsets: ['latin'], weight: ['700', '800'], variable: '--font-syne' });

export const metadata: Metadata = {
    title: "Phaeton Capital | Terminal",
    description: "Premium Trading Intelligence",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" className={syne.variable}>
            <body className="antialiased min-h-screen">
                <div className="bg-orb-indigo" />
                <div className="bg-orb-gold" />
                {children}
            </body>
        </html>
    );
}
