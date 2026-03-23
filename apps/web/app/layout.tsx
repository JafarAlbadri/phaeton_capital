import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "SentimentCrowd | Intelligence Dashboard",
    description: "Premium Bun-Native Trading Intelligence",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body className="antialiased min-h-screen bg-black text-terminal-amber selection:bg-terminal-green selection:text-black">
                <main className="relative flex min-h-screen flex-col">
                    {children}
                </main>
            </body>
        </html>
    );
}
