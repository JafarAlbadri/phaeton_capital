import "./globals.css";
import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Lora } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });
const lora = Lora({ subsets: ['latin'], variable: '--font-display' });

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
        <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable} ${lora.variable}`}>
            <body className="antialiased min-h-screen">
                {children}
            </body>
        </html>
    );
}
