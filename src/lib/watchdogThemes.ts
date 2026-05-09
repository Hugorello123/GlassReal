// Shared Watchdog theme engine — used by WatchdogPage and Dashboard Market Pulse.

export interface AssetImpact {
  asset: string;
  direction: "▲" | "▼" | "—";
  strength: number;
}

export interface WatchdogTheme {
  id: string;
  name: string;
  heat: number;
  count: number;
  category: "risk-on" | "risk-off" | "commodity" | "macro" | "fx";
  impacts: AssetImpact[];
  keywords: string[];
}

/** Drop obvious spam / affiliate headlines so themes stay market-relevant */
const SPAM_TITLE =
  /casino|slot\b|royal vegas|online poker|betting site|lottery jackpot|viagra|cbd gummies|crypto giveaway|double your bitcoin|free spins/i;

export function filterHeadlines(headlines: string[]): string[] {
  return headlines.filter((h) => h && !SPAM_TITLE.test(h));
}

/* ─── theme engine: per-headline hits (fair when feed mixes crypto + macro) ─── */
export function buildThemes(articles: { title?: string; [key: string]: unknown }[]): WatchdogTheme[] {
  const themes: WatchdogTheme[] = [
    {
      id: "gold",
      name: "Gold / Safe Haven",
      heat: 0, count: 0, category: "commodity",
      impacts: [{ asset: "Gold", direction: "▲", strength: 2 }, { asset: "BTC", direction: "▼", strength: 1 }],
      keywords: ["gold", "xau", "safe haven", "fear", "recession", "yield drop", "real yield"],
    },
    {
      id: "btc",
      name: "Bitcoin / Crypto Flow",
      heat: 0, count: 0, category: "risk-on",
      impacts: [{ asset: "BTC", direction: "▲", strength: 3 }, { asset: "ETH", direction: "▲", strength: 2 }],
      keywords: ["bitcoin", "btc", "etf", "crypto", "ethereum", "eth", "inflow", "adoption"],
    },
    {
      id: "oil",
      name: "Oil / Energy",
      heat: 0, count: 0, category: "commodity",
      impacts: [{ asset: "Oil", direction: "▲", strength: 2 }, { asset: "DXY", direction: "▲", strength: 1 }],
      keywords: ["oil", "crude", "opec", "wti", "brent", "energy", "gasoline", "petroleum"],
    },
    {
      id: "tesla",
      name: "Tesla / EV",
      heat: 0, count: 0, category: "risk-on",
      impacts: [{ asset: "TSLA", direction: "▲", strength: 2 }, { asset: "SPX", direction: "▲", strength: 1 }],
      keywords: ["tesla", "tsla", "elon musk", "electric vehicle", "ev ", "cybertruck", "model y", "model 3"],
    },
    {
      id: "macro",
      name: "Fed / Rates / Macro",
      heat: 0, count: 0, category: "macro",
      impacts: [{ asset: "DXY", direction: "▲", strength: 2 }, { asset: "Gold", direction: "▼", strength: 1 }],
      keywords: ["fed", "federal reserve", "cpi", "inflation", "jobs report", "nfp", "pmi", "gdp", "treasury", "yield", "interest rate"],
    },
    {
      id: "tariff",
      name: "Tariffs / Trade War",
      heat: 0, count: 0, category: "risk-off",
      impacts: [{ asset: "Gold", direction: "▲", strength: 2 }, { asset: "SPX", direction: "▼", strength: 2 }],
      keywords: ["tariff", "trade war", "sanctions", "china", "export", "import", "wto"],
    },
  ];

  const titles = articles.map((a) => a.title || "").filter(Boolean) as string[];
  const clean = filterHeadlines(titles);

  for (const t of themes) {
    let headlineHits = 0;
    for (const h of clean) {
      const lower = h.toLowerCase();
      if (t.keywords.some((kw) => lower.includes(kw))) headlineHits++;
    }
    t.count = headlineHits;
    t.heat = Math.min(100, headlineHits * 18);
  }

  themes.sort((a, b) => b.heat - a.heat);
  return themes;
}
