# Real Quant AI Terminal V2

Ultra hedge fund style workstation for stock/options research with a free-first data path.

## What It Includes

- Multi-sector stock scanner
- Options signal engine with BUY CALL, SELL CALL, BUY PUT, SELL PUT, WATCH, and AVOID
- AI Historical Analyst
- Historical volatility, momentum, drawdown, and daily VaR
- Macro and geopolitical risk layer
- Volatility surface
- Flow-style premium scanner
- Strategy builder
- Portfolio risk engine

## Free Data Mode

The app is configured for free mode by default:

```env
FINNHUB_API_KEY=your_finnhub_key_here
POLYGON_API_KEY=YOUR_POLYGON_KEY
NEXT_PUBLIC_DATA_MODE=FREE
```

If no Polygon key is provided, historical prices are requested from Stooq's free CSV endpoint. If free data is unavailable for a symbol, the app falls back to local simulation data so the workstation still opens.

## Optional Polygon Key

If you have a Polygon key, put it in `.env.local`:

```env
POLYGON_API_KEY=your_key_here
```

Polygon is used for options snapshots and stock historical data when available. Stooq remains the free fallback for historical prices.

Use server-side env names on Vercel and GitHub deployments. The app still supports the older `NEXT_PUBLIC_*` names locally, but keys are safer when they are not public.

## Run

On Windows, if PowerShell blocks `npm`, use `npm.cmd`:

```powershell
npm.cmd install
npm.cmd run dev
```

Then open:

```text
http://localhost:3000
```

## Deploy Free

Use GitHub + Vercel Hobby for the free web version. See `DEPLOY_FREE.md`.

## Note

This is a research workstation, not financial advice. It should help compare probability, volatility, trend, and risk, but every signal still needs human review before trading.
