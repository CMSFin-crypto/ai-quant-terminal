import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap"
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap"
});

export const metadata: Metadata = {
  title: "Real Quant AI Terminal V2",
  description: "Ultra hedge fund workstation for options, volatility, flow, and risk analysis powered by AI.",
  keywords: [
    "quant",
    "trading",
    "options",
    "terminal",
    "AI",
    "volatility",
    "risk analysis",
    "dark pool",
    "flow analysis",
    "hedge fund",
    "Black-Scholes",
    "Monte Carlo"
  ],
  authors: [{ name: "AI Quant Terminal" }],
  icons: {
    icon: "/favicon.png"
  },
  openGraph: {
    title: "Real Quant AI Terminal V2",
    description: "Ultra hedge fund workstation for options, volatility, flow, and risk analysis powered by AI.",
    type: "website",
    locale: "en_US",
    siteName: "Quant AI Terminal",
    images: [{ url: "/opengraph-image.png", width: 1344, height: 768 }]
  },
  twitter: {
    card: "summary_large_image",
    title: "Real Quant AI Terminal V2",
    description: "Ultra hedge fund workstation for options, volatility, flow, and risk analysis powered by AI.",
    images: ["/opengraph-image.png"]
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
