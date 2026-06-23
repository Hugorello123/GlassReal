// Shared Watchdog theme engine — used by WatchdogPage and Dashboard Market Pulse.
// Polarity-aware impacts aligned with scorecard energy logic (frontend only).

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

const OIL_TERMS = ["oil", "opec", "crude", "wti", "brent", "petroleum", "gasoline", "fuel", "usoil"];

/** Scorecard-aligned oil polarity — null = unclear, no directional call. */
export function getOilPolarity(title: string): "up" | "down" | null {
  const t = title.toLowerCase();
  let bear = 0;
  let bull = 0;
  const bearish = [
    "peace deal",
    "peace agreement",
    "sanctions lifted",
    "agreement reached",
    "deal reached",
    "ceasefire",
    "truce",
    "supply increase",
    "production rise",
    "output hike",
    "production increase",
    "oil prices fall",
    "oil drops",
    "let the oil flow",
  ];
  const bullish = [
    "attack",
    "blockade",
    "strike",
    "strikes",
    "war",
    "supply cut",
    "production cut",
    "output freeze",
    "opec cut",
    "supply disruption",
    "embargo",
    "pipeline",
    "refinery",
    "hormuz",
  ];
  for (const p of bearish) if (t.includes(p)) bear++;
  for (const p of bullish) {
    if (p.includes(" ") ? t.includes(p) : t.split(/\W+/).includes(p)) bull++;
  }
  if (bear > 0 && bull > 0) return bear >= bull ? "down" : "up";
  if (bear > 0) return "down";
  if (bull > 0) return "up";
  return null;
}

function headlineMatchesOilTheme(lower: string): boolean {
  return OIL_TERMS.some((kw) => lower.includes(kw));
}

function getGoldPolarity(title: string): "up" | "down" | null {
  const t = title.toLowerCase();
  let bear = 0;
  let bull = 0;
  for (const p of ["hawkish", "rate hike", "strong dollar", "dollar rises", "risk-on rally", "yields rise"]) {
    if (t.includes(p)) bear++;
  }
  for (const p of [
    "safe haven",
    "geopolitical",
    "war",
    "sanctions",
    "panic",
    "recession",
    "recession fear",
    "risk-off",
    "gold surges",
    "debt crisis",
    "wall street down",
    "market selloff",
  ]) {
    if (t.includes(p)) bull++;
  }
  if (bear > bull && bear > 0) return "down";
  if (bull > bear && bull > 0) return "up";
  return null;
}

function getBtcPolarity(title: string): "up" | "down" | null {
  const t = title.toLowerCase();
  let bear = 0;
  let bull = 0;
  for (const p of [
    "crackdown",
    "crypto ban",
    "ban bitcoin",
    "sec sue",
    "regulation clampdown",
    "restrict crypto",
    "crypto rules",
    "market oversight",
    "clarity act",
    "regulatory",
    "regulation",
    "sec charges",
  ]) {
    if (t.includes(p)) bear++;
  }
  for (const p of ["etf approval", "etf approved", "adoption", "inflow", "crypto rally", "bitcoin rally"]) {
    if (t.includes(p)) bull++;
  }
  if (bear > bull && bear > 0) return "down";
  if (bull > bear && bull > 0) return "up";
  return null;
}

function getDxyPolarity(title: string): "up" | "down" | null {
  const t = title.toLowerCase();
  let bear = 0;
  let bull = 0;
  for (const p of ["rate cut", "cuts rates", "weak jobs", "recession", "dollar falls", "dollar weak"]) {
    if (t.includes(p)) bear++;
  }
  for (const p of [
    "rate hike",
    "hawkish",
    "hold rates steady",
    "hold interest rates",
    "interest rates steady",
    "rates steady",
    "rates unchanged",
    "rate unchanged",
    "hold steady",
    "strong jobs",
    "dollar rises",
  ]) {
    if (t.includes(p)) bull++;
  }
  // "hold" + "steady" without exact phrase (e.g. "hold US interest rates steady")
  if (t.includes("hold") && t.includes("steady")) bull++;
  if (bear > bull && bear > 0) return "down";
  if (bull > bear && bull > 0) return "up";
  return null;
}

function setImpact(theme: WatchdogTheme, asset: string, direction: "▲" | "▼" | "—", strength: number) {
  const imp = theme.impacts.find((i) => i.asset === asset);
  if (imp) {
    imp.direction = direction;
    imp.strength = strength;
  }
}

function applyVotePolarity(
  theme: WatchdogTheme,
  asset: string,
  votes: { up: number; down: number; neutral: number },
) {
  if (votes.down > votes.up) setImpact(theme, asset, "▼", Math.min(3, Math.max(2, 1 + votes.down)));
  else if (votes.up > votes.down) setImpact(theme, asset, "▲", Math.min(3, Math.max(2, 1 + votes.up)));
  else setImpact(theme, asset, "—", 1);
}

function tallyPolarity(
  headlines: string[],
  matchFn: (lower: string) => boolean,
  polarityFn: (title: string) => "up" | "down" | null,
) {
  const votes = { up: 0, down: 0, neutral: 0 };
  for (const h of headlines) {
    const lower = h.toLowerCase();
    if (!matchFn(lower)) continue;
    const pol = polarityFn(h);
    if (pol === "up") votes.up++;
    else if (pol === "down") votes.down++;
    else votes.neutral++;
  }
  return votes;
}

function applyOilThemePolarity(theme: WatchdogTheme, headlines: string[]) {
  if (theme.count === 0) {
    setImpact(theme, "Oil", "—", 1);
    setImpact(theme, "DXY", "—", 1);
    return;
  }
  const votes = tallyPolarity(headlines, headlineMatchesOilTheme, getOilPolarity);
  applyVotePolarity(theme, "Oil", votes);
  if (votes.down > votes.up) setImpact(theme, "DXY", "▼", 1);
  else if (votes.up > votes.down) setImpact(theme, "DXY", "▲", 1);
  else setImpact(theme, "DXY", "—", 1);
}

function applyGoldThemePolarity(theme: WatchdogTheme, headlines: string[]) {
  if (theme.count === 0) {
    setImpact(theme, "Gold", "—", 1);
    setImpact(theme, "BTC", "—", 1);
    return;
  }
  const match = (lower: string) => theme.keywords.some((kw) => lower.includes(kw));
  const goldVotes = tallyPolarity(headlines, match, getGoldPolarity);
  applyVotePolarity(theme, "Gold", goldVotes);
  if (goldVotes.up > goldVotes.down) setImpact(theme, "BTC", "▼", 1);
  else if (goldVotes.down > goldVotes.up) setImpact(theme, "BTC", "▲", 1);
  else setImpact(theme, "BTC", "—", 1);
}

function applyBtcThemePolarity(theme: WatchdogTheme, headlines: string[]) {
  if (theme.count === 0) {
    setImpact(theme, "BTC", "—", 1);
    setImpact(theme, "ETH", "—", 1);
    return;
  }
  const match = (lower: string) => theme.keywords.some((kw) => lower.includes(kw));
  const btcVotes = tallyPolarity(headlines, match, getBtcPolarity);
  applyVotePolarity(theme, "BTC", btcVotes);
  if (btcVotes.up > btcVotes.down) setImpact(theme, "ETH", "▲", Math.min(3, Math.max(2, btcVotes.up + 1)));
  else if (btcVotes.down > btcVotes.up) setImpact(theme, "ETH", "▼", 1);
  else setImpact(theme, "ETH", "—", 1);
}

function applyMacroThemePolarity(theme: WatchdogTheme, headlines: string[]) {
  if (theme.count === 0) {
    setImpact(theme, "DXY", "—", 1);
    setImpact(theme, "Gold", "—", 1);
    return;
  }
  const match = (lower: string) => theme.keywords.some((kw) => lower.includes(kw));
  const dxyVotes = tallyPolarity(headlines, match, getDxyPolarity);
  applyVotePolarity(theme, "DXY", dxyVotes);
  if (dxyVotes.up > dxyVotes.down) setImpact(theme, "Gold", "▼", 1);
  else if (dxyVotes.down > dxyVotes.up) setImpact(theme, "Gold", "▲", 1);
  else setImpact(theme, "Gold", "—", 1);
}

function applyTariffThemePolarity(theme: WatchdogTheme) {
  if (theme.count === 0) {
    setImpact(theme, "Gold", "—", 1);
    setImpact(theme, "SPX", "—", 1);
    return;
  }
  setImpact(theme, "Gold", "▲", 2);
  setImpact(theme, "SPX", "▼", 2);
}

function applyTeslaThemePolarity(theme: WatchdogTheme) {
  if (theme.count === 0) {
    setImpact(theme, "TSLA", "—", 1);
    setImpact(theme, "SPX", "—", 1);
    return;
  }
  setImpact(theme, "TSLA", "▲", 2);
  setImpact(theme, "SPX", "▲", 1);
}

/** Tariff/trade headlines only — bare "china" matches too many mineral/supply stories. */
function headlineMatchesTariffTheme(lower: string): boolean {
  const strong = [
    "tariff",
    "tariffs",
    "trade war",
    "sanctions",
    "export ban",
    "import ban",
    "trade dispute",
    "trade deal",
    "wto",
  ];
  if (strong.some((kw) => lower.includes(kw))) return true;
  if (lower.includes("china") && (lower.includes("tariff") || lower.includes("trade war") || lower.includes("export"))) {
    return true;
  }
  return false;
}

/* ─── theme engine: per-headline hits (fair when feed mixes crypto + macro) ─── */
export function buildThemes(articles: { title?: string; [key: string]: unknown }[]): WatchdogTheme[] {
  const themes: WatchdogTheme[] = [
    {
      id: "gold",
      name: "Gold / Safe Haven",
      heat: 0,
      count: 0,
      category: "commodity",
      impacts: [
        { asset: "Gold", direction: "—", strength: 1 },
        { asset: "BTC", direction: "—", strength: 1 },
      ],
      keywords: ["gold", "xau", "safe haven", "fear", "recession", "yield drop", "real yield", "debt crisis"],
    },
    {
      id: "btc",
      name: "Bitcoin / Crypto Flow",
      heat: 0,
      count: 0,
      category: "risk-on",
      impacts: [
        { asset: "BTC", direction: "—", strength: 1 },
        { asset: "ETH", direction: "—", strength: 1 },
      ],
      keywords: ["bitcoin", "btc", "etf", "crypto", "ethereum", "eth", "inflow", "adoption"],
    },
    {
      id: "oil",
      name: "Oil / Energy",
      heat: 0,
      count: 0,
      category: "commodity",
      impacts: [
        { asset: "Oil", direction: "—", strength: 1 },
        { asset: "DXY", direction: "—", strength: 1 },
      ],
      keywords: OIL_TERMS,
    },
    {
      id: "tesla",
      name: "Tesla / EV",
      heat: 0,
      count: 0,
      category: "risk-on",
      impacts: [
        { asset: "TSLA", direction: "—", strength: 1 },
        { asset: "SPX", direction: "—", strength: 1 },
      ],
      keywords: ["tesla", "tsla", "elon musk", "electric vehicle", "ev ", "cybertruck", "model y", "model 3"],
    },
    {
      id: "macro",
      name: "Fed / Rates / Macro",
      heat: 0,
      count: 0,
      category: "macro",
      impacts: [
        { asset: "DXY", direction: "—", strength: 1 },
        { asset: "Gold", direction: "—", strength: 1 },
      ],
      keywords: [
        "fed",
        "federal reserve",
        "cpi",
        "inflation",
        "jobs report",
        "nfp",
        "pmi",
        "gdp",
        "treasury",
        "yield",
        "interest rate",
      ],
    },
    {
      id: "tariff",
      name: "Tariffs / Trade War",
      heat: 0,
      count: 0,
      category: "risk-off",
      impacts: [
        { asset: "Gold", direction: "—", strength: 1 },
        { asset: "SPX", direction: "—", strength: 1 },
      ],
      keywords: ["tariff", "tariffs", "trade war", "sanctions", "export ban", "import ban", "trade dispute", "wto"],
    },
  ];

  const titles = articles.map((a) => a.title || "").filter(Boolean) as string[];
  const clean = filterHeadlines(titles);

  for (const t of themes) {
    let headlineHits = 0;
    for (const h of clean) {
      const lower = h.toLowerCase();
      const matches =
        t.id === "oil"
          ? headlineMatchesOilTheme(lower)
          : t.id === "tariff"
            ? headlineMatchesTariffTheme(lower)
            : t.keywords.some((kw) => lower.includes(kw));
      if (matches) headlineHits++;
    }
    t.count = headlineHits;
    t.heat = Math.min(100, headlineHits * 18);

    if (t.id === "oil") applyOilThemePolarity(t, clean);
    else if (t.id === "gold") applyGoldThemePolarity(t, clean);
    else if (t.id === "btc") applyBtcThemePolarity(t, clean);
    else if (t.id === "macro") applyMacroThemePolarity(t, clean);
    else if (t.id === "tariff") applyTariffThemePolarity(t);
    else if (t.id === "tesla") applyTeslaThemePolarity(t);
  }

  themes.sort((a, b) => b.heat - a.heat);
  return themes;
}
