# Free Deployment

The easiest free deployment path for this Next.js app is:

1. Push the project to GitHub.
2. Import the GitHub repository into Vercel.
3. Add environment variables in Vercel.
4. Deploy.

## GitHub

Create a new empty repository on GitHub, then run these commands from this project folder:

```powershell
git init
git add .
git commit -m "Initial AI quant terminal"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/ai-quant-terminal.git
git push -u origin main
```

Do not commit `.env.local`. It is ignored by `.gitignore`.

## Vercel

Go to:

```text
https://vercel.com/new
```

Import the GitHub repository. Vercel detects Next.js automatically.

Add these environment variables in Vercel:

```env
FINNHUB_API_KEY=your_finnhub_key_here
POLYGON_API_KEY=optional_polygon_key_here
NEXT_PUBLIC_DATA_MODE=FREE
```

If you do not have Polygon, leave `POLYGON_API_KEY` empty or skip it. Finnhub plus Stooq fallback is enough for the free mode.

## Free Hosting Notes

Vercel Hobby is the best free option for this project because the app uses Next.js API routes. Static-only hosts are not ideal because `/api/quote`, `/api/history`, and `/api/options` need server routes.
