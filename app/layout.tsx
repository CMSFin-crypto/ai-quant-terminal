import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Real Quant AI Terminal V2",
  description: "Ultra hedge fund workstation for options, volatility, flow, and risk."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
