export type Stock = {
  symbol: string;
  name: string;
  sector:
    | "AI Technology"
    | "Semiconductors"
    | "Tech"
    | "Retail"
    | "Consumer"
    | "Industrials"
    | "Finance"
    | "Energy"
    | "Healthcare"
    | "Defense"
    | "Auto"
    | "E-Commerce";
};

export const STOCKS: Stock[] = [
  { symbol: "MSFT", name: "Microsoft", sector: "AI Technology" },
  { symbol: "GOOGL", name: "Alphabet", sector: "AI Technology" },
  { symbol: "META", name: "Meta", sector: "AI Technology" },
  { symbol: "PLTR", name: "Palantir", sector: "AI Technology" },
  { symbol: "SNOW", name: "Snowflake", sector: "AI Technology" },
  { symbol: "AI", name: "C3.ai", sector: "AI Technology" },
  { symbol: "DDOG", name: "Datadog", sector: "AI Technology" },
  { symbol: "ANET", name: "Arista Networks", sector: "AI Technology" },

  { symbol: "AMD", name: "AMD", sector: "Semiconductors" },
  { symbol: "NVDA", name: "NVIDIA", sector: "Semiconductors" },
  { symbol: "AVGO", name: "Broadcom", sector: "Semiconductors" },
  { symbol: "TSM", name: "Taiwan Semiconductor", sector: "Semiconductors" },
  { symbol: "MU", name: "Micron", sector: "Semiconductors" },
  { symbol: "SNDK", name: "Sandisk", sector: "Semiconductors" },
  { symbol: "QCOM", name: "Qualcomm", sector: "Semiconductors" },
  { symbol: "ASML", name: "ASML", sector: "Semiconductors" },
  { symbol: "MRVL", name: "Marvell Technology", sector: "Semiconductors" },
  { symbol: "LRCX", name: "Lam Research", sector: "Semiconductors" },

  { symbol: "AAPL", name: "Apple", sector: "Tech" },
  { symbol: "CRM", name: "Salesforce", sector: "Tech" },
  { symbol: "ORCL", name: "Oracle", sector: "Tech" },
  { symbol: "ADBE", name: "Adobe", sector: "Tech" },
  { symbol: "NOW", name: "ServiceNow", sector: "Tech" },

  { symbol: "WMT", name: "Walmart", sector: "Retail" },
  { symbol: "COST", name: "Costco", sector: "Retail" },
  { symbol: "TGT", name: "Target", sector: "Retail" },
  { symbol: "HD", name: "Home Depot", sector: "Retail" },
  { symbol: "LOW", name: "Lowe's", sector: "Retail" },

  { symbol: "KO", name: "Coca-Cola", sector: "Consumer" },
  { symbol: "MCD", name: "McDonald's", sector: "Consumer" },

  { symbol: "CAT", name: "Caterpillar", sector: "Industrials" },
  { symbol: "VRT", name: "Vertiv", sector: "Industrials" },
  { symbol: "GLW", name: "Corning", sector: "Industrials" },

  { symbol: "JPM", name: "JPMorgan Chase", sector: "Finance" },
  { symbol: "BAC", name: "Bank of America", sector: "Finance" },
  { symbol: "GS", name: "Goldman Sachs", sector: "Finance" },
  { symbol: "MS", name: "Morgan Stanley", sector: "Finance" },
  { symbol: "C", name: "Citigroup", sector: "Finance" },

  { symbol: "XOM", name: "Exxon Mobil", sector: "Energy" },
  { symbol: "CVX", name: "Chevron", sector: "Energy" },
  { symbol: "COP", name: "ConocoPhillips", sector: "Energy" },
  { symbol: "SLB", name: "SLB", sector: "Energy" },
  { symbol: "OXY", name: "Occidental Petroleum", sector: "Energy" },
  { symbol: "DVN", name: "Devon Energy", sector: "Energy" },
  { symbol: "TPL", name: "Texas Pacific Land", sector: "Energy" },
  { symbol: "NEE", name: "NextEra Energy", sector: "Energy" },
  { symbol: "GEV", name: "GE Vernova", sector: "Energy" },

  { symbol: "JNJ", name: "Johnson & Johnson", sector: "Healthcare" },
  { symbol: "PFE", name: "Pfizer", sector: "Healthcare" },
  { symbol: "MRK", name: "Merck", sector: "Healthcare" },
  { symbol: "UNH", name: "UnitedHealth", sector: "Healthcare" },
  { symbol: "ABBV", name: "AbbVie", sector: "Healthcare" },
  { symbol: "LLY", name: "Eli Lilly", sector: "Healthcare" },
  { symbol: "BMY", name: "Bristol Myers Squibb", sector: "Healthcare" },
  { symbol: "MRNA", name: "Moderna", sector: "Healthcare" },

  { symbol: "LMT", name: "Lockheed Martin", sector: "Defense" },
  { symbol: "RTX", name: "RTX", sector: "Defense" },
  { symbol: "NOC", name: "Northrop Grumman", sector: "Defense" },
  { symbol: "GD", name: "General Dynamics", sector: "Defense" },
  { symbol: "BA", name: "Boeing", sector: "Defense" },
  { symbol: "AXON", name: "Axon Enterprise", sector: "Defense" },

  { symbol: "TSLA", name: "Tesla", sector: "Auto" },
  { symbol: "GM", name: "General Motors", sector: "Auto" },
  { symbol: "F", name: "Ford", sector: "Auto" },

  { symbol: "AMZN", name: "Amazon", sector: "E-Commerce" },
  { symbol: "SHOP", name: "Shopify", sector: "E-Commerce" },
  { symbol: "MELI", name: "MercadoLibre", sector: "E-Commerce" }
];
