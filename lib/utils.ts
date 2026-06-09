/**
 * Shared utility functions and formatters for the AI Quant Terminal.
 */

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0
});

const stockMoney = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2
});

export { money, stockMoney };

export function formatSource(source: string): string {
  const labels: Record<string, string> = {
    polygon: "Polygon",
    yahoo: "Yahoo Finance",
    "yahoo-partial": "Yahoo (Partial)",
    "yahoo-limited": "Yahoo (Limited)",
    "stooq-free": "Stooq",
    "stooq-partial": "Stooq Partial",
    "stooq-limited": "Stooq (Limited)",
    "finnhub-free": "Finnhub",
    "finnhub-partial": "Finnhub Partial",
    "finnhub-limited": "Finnhub (Limited)",
    simulated: "Simulated",
    unknown: "Unknown"
  };

  return labels[source] || source;
}
