/**
 * Market Pressure Lab — compose gossip, news themes, predictions, and spot moves
 * into per-asset pressure strips (frontend only; no new engine).
 */

import { buildThemes, type WatchdogTheme } from "@/lib/watchdogThemes";

export type PressureLevel = "up" | "down" | "mixed" | "quiet";

export type PressureSignalRow = {
  id?: string;
  asset?: string;
  call?: string;
  source?: string;
  status?: string;
  cluster?: string;
  why?: string;
  interpretation?: string;
  watchList?: string[];
  confirmSignals?: string[];
  affectedAssets?: string[];
  time?: string;
};

export type GossipPayload = {
  intensity?: number;
  spywords?: string[];
  alerts?: string[];
  headlines?: { title?: string; url?: string }[];
};

export type SpotPrices = Record<string, unknown>;

export type AssetPressure = {
  asset: string;
  level: PressureLevel;
  label: string;
  subtitle: string;
  score: number;
  evidence: string[];
  priceCh: number | null;
  themeTags: string[];
  hasOpenSignal: boolean;
  hasCatalyst: boolean;
  /** True when the only engine signal is a repeated catalyst-watch boilerplate. */
  onlyGenericCatalyst: boolean;
};

export type MarketWeather = {
  label: "Calm" | "Watching" | "Hot";
  intensity: number;
  spywords: string[];
  dominantTheme: WatchdogTheme | null;
  summary: string;
};

export const PRESSURE_ASSETS = [
  "Gold",
  "Oil",
  "BTC",
  "ETH",
  "TSLA",
  "NVDA",
  "INTC",
  "SPX",
  "DXY",
] as const;

/** Default pressure map strip — secondary assets behind “+N more”. */
export const PRIMARY_MAP_ASSETS = ["Gold", "Oil", "BTC", "ETH", "NVDA", "DXY"] as const;
export const SECONDARY_MAP_ASSETS = ["TSLA", "INTC", "SPX"] as const;

const GENERIC_CATALYST_RE = /^speculative catalyst watch:/i;

export const NO_HEADLINE_DRIVER = "No clear headline driver";

export function isGenericCatalystText(line: string): boolean {
  return GENERIC_CATALYST_RE.test(String(line || "").trim());
}

/** Trim, collapse whitespace, fix space-before-punctuation, cap length. */
export function cleanEvidenceLine(raw: string, max = 120): string {
  let t = String(raw || "")
    .replace(/\s+/g, " ")
    .replace(/\s+([.,;:!?])/g, "$1")
    .trim();
  if (!t) return "";
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${lastSpace > 72 ? cut.slice(0, lastSpace) : cut}…`;
}

export function formatEvidenceForDisplay(raw: string[]): string[] {
  const out: string[] = [];
  for (const line of raw) {
    if (isGenericCatalystText(line)) continue;
    const cleaned = cleanEvidenceLine(line, 120);
    if (!cleaned || out.includes(cleaned)) continue;
    out.push(cleaned);
    if (out.length >= 2) break;
  }
  return out;
}

const ASSET_ALIASES: Record<string, string> = {
  gold: "Gold",
  xau: "Gold",
  xauusd: "Gold",
  oil: "Oil",
  wti: "Oil",
  crude: "Oil",
  btc: "BTC",
  bitcoin: "BTC",
  eth: "ETH",
  ethereum: "ETH",
  tsla: "TSLA",
  tesla: "TSLA",
  nvda: "NVDA",
  nvidia: "NVDA",
  intc: "INTC",
  intel: "INTC",
  spx: "SPX",
  "s&p": "SPX",
  dxy: "DXY",
  usd: "DXY",
};

const PRICE_CH_KEYS: Record<string, string> = {
  Gold: "goldCh",
  Oil: "oilCh",
  BTC: "btcCh",
  ETH: "ethCh",
  TSLA: "tslaCh",
  NVDA: "nvdaCh",
  INTC: "intcCh",
  SPX: "spxCh",
};

const ASSET_HEADLINE_HINTS: Record<string, string[]> = {
  Gold: ["gold", "xau", "safe haven"],
  Oil: ["oil", "opec", "crude", "iran", "hormuz", "wti"],
  BTC: ["bitcoin", "btc", "crypto", "etf"],
  ETH: ["ethereum", "eth", "crypto"],
  TSLA: ["tesla", "tsla", "musk", "elon"],
  NVDA: ["nvidia", "nvda", "chip", "semiconductor", "ai "],
  INTC: ["intel", "intc"],
  SPX: ["s&p", "spx", "wall street", "stocks", "nasdaq", "dow"],
  DXY: ["dollar", "dxy", "usd", "fed", "yields"],
};

export function normalizePressureAsset(raw: string | undefined): string | null {
  const t = String(raw || "").trim();
  if (!t) return null;
  const key = t.toLowerCase().replace(/[^a-z0-9&]/g, "");
  if (ASSET_ALIASES[key]) return ASSET_ALIASES[key];
  const upper = t.toUpperCase();
  if ((PRESSURE_ASSETS as readonly string[]).includes(upper)) return upper;
  if ((PRESSURE_ASSETS as readonly string[]).includes(t)) return t;
  return null;
}

export function mapPressureCallLabel(call: unknown): string {
  const c = String(call ?? "")
    .trim()
    .toLowerCase();
  if (c === "long") return "Upside pressure";
  if (c === "short") return "Downside pressure";
  if (c === "watch") return "Mixed / watch";
  if (c === "build") return "Narrative building";
  const raw = String(call ?? "").trim();
  return raw || "No edge / quiet";
}

export function pressureLevelMeta(level: PressureLevel): {
  dot: string;
  ring: string;
  text: string;
  bg: string;
} {
  switch (level) {
    case "up":
      return {
        dot: "🟢",
        ring: "border-emerald-500/40 bg-emerald-950/25",
        text: "text-emerald-300",
        bg: "bg-emerald-500/10",
      };
    case "down":
      return {
        dot: "🔴",
        ring: "border-rose-500/40 bg-rose-950/25",
        text: "text-rose-300",
        bg: "bg-rose-500/10",
      };
    case "mixed":
      return {
        dot: "🟡",
        ring: "border-amber-500/40 bg-amber-950/20",
        text: "text-amber-300",
        bg: "bg-amber-500/10",
      };
    default:
      return {
        dot: "⚪",
        ring: "border-white/10 bg-white/[0.03]",
        text: "text-gray-400",
        bg: "bg-white/[0.02]",
      };
  }
}

function impactScore(dir: "▲" | "▼" | "—", strength: number): number {
  if (dir === "▲") return strength;
  if (dir === "▼") return -strength;
  return 0;
}

function priceChangePct(prices: SpotPrices | null, asset: string): number | null {
  if (!prices) return null;
  const key = PRICE_CH_KEYS[asset];
  if (!key) return null;
  const x = Number(prices[key]);
  return Number.isFinite(x) ? x : null;
}

function headlineMatchesAsset(title: string, asset: string): boolean {
  const lower = title.toLowerCase();
  const hints = ASSET_HEADLINE_HINTS[asset] || [asset.toLowerCase()];
  return hints.some((h) => lower.includes(h));
}

function pushEvidence(bucket: string[], line: string, max = 4) {
  const t = cleanEvidenceLine(line, 200);
  if (!t || isGenericCatalystText(t) || bucket.includes(t)) return;
  if (bucket.length < max) bucket.push(t);
}

function isOpenScoredRow(r: PressureSignalRow): boolean {
  const st = String(r.status || "").toLowerCase();
  return st === "open";
}

function isCatalystRow(r: PressureSignalRow): boolean {
  if (String(r.source || "").toLowerCase() === "catalyst-watch") return true;
  if (String(r.call || "").toLowerCase() === "watch") return true;
  if (String(r.status || "").toLowerCase() === "watching") return true;
  return false;
}

function callScore(call: string): number {
  const c = call.toLowerCase();
  if (c === "long" || c === "build") return 2;
  if (c === "short") return -2;
  if (c === "watch") return 0;
  return 0;
}

export function buildMarketWeather(
  gossip: GossipPayload | null,
  themes: WatchdogTheme[],
): MarketWeather {
  const intensity = Math.min(10, Math.max(0, Number(gossip?.intensity) || 0));
  const spywords = Array.isArray(gossip?.spywords) ? gossip!.spywords!.slice(0, 6) : [];
  const dominantTheme = themes.find((t) => t.heat > 0) || null;

  let label: MarketWeather["label"] = "Calm";
  if (intensity >= 7) label = "Hot";
  else if (intensity >= 3) label = "Watching";

  const parts: string[] = [];
  if (dominantTheme) parts.push(`${dominantTheme.name} heating up`);
  if (spywords.length) parts.push(spywords.slice(0, 3).join(" · "));
  const summary =
    parts.length > 0
      ? parts.join(" — ")
      : label === "Calm"
        ? "Quiet tape — few headline matches in the sweep"
        : "Headline flow active — scan pressure map below";

  return { label, intensity, spywords, dominantTheme, summary };
}

export function buildAssetPressureMap(input: {
  newsArticles: { title?: string }[];
  gossip: GossipPayload | null;
  predictions: PressureSignalRow[];
  prices?: SpotPrices | null;
  shockAlerts?: string[];
}): AssetPressure[] {
  const themes = buildThemes(input.newsArticles);
  const gossipAlerts = [
    ...(input.gossip?.alerts || []),
    ...(input.shockAlerts || []),
    ...(input.gossip?.headlines || []).map((h) => h.title || "").filter(Boolean),
  ];

  const byAsset = new Map<string, AssetPressure>();

  for (const asset of PRESSURE_ASSETS) {
    let score = 0;
    const evidence: string[] = [];
    const themeTags: string[] = [];
    let hasOpenSignal = false;
    let hasCatalyst = false;

    for (const theme of themes) {
      if (theme.count <= 0) continue;
      const imp = theme.impacts.find((i) => normalizePressureAsset(i.asset) === asset);
      if (!imp) continue;
      score += impactScore(imp.direction, imp.strength);
      if (imp.direction !== "—") themeTags.push(theme.name);
      for (const alert of gossipAlerts) {
        if (headlineMatchesAsset(alert, asset)) {
          pushEvidence(evidence, alert.slice(0, 140));
        }
      }
    }

    const assetRows = input.predictions.filter((r) => {
      const a = normalizePressureAsset(r.asset);
      if (a === asset) return true;
      const aff = Array.isArray(r.affectedAssets) ? r.affectedAssets : [];
      return aff.some((x) => normalizePressureAsset(x) === asset);
    });

    const openRows = assetRows
      .filter(isOpenScoredRow)
      .sort((a, b) => (Date.parse(String(b.time || "")) || 0) - (Date.parse(String(a.time || "")) || 0));
    const catalystRows = assetRows.filter(isCatalystRow);

    if (openRows.length) {
      hasOpenSignal = true;
      const head = openRows[0];
      score += callScore(String(head.call || ""));
      pushEvidence(evidence, head.why || head.interpretation || "");
      if (head.watchList?.length) pushEvidence(evidence, head.watchList[0]);
      if (head.confirmSignals?.length) pushEvidence(evidence, head.confirmSignals[0]);
    }

    if (catalystRows.length) {
      hasCatalyst = true;
      const cw = catalystRows[0];
      const clusterLabel = String(cw.cluster || "theme").replace(/_/g, " ");
      if (!hasOpenSignal && themeTags.length === 0) {
        pushEvidence(evidence, `${clusterLabel} theme in headlines`);
      }
    }

    const priceCh = priceChangePct(input.prices ?? null, asset);
    if (priceCh != null) {
      const newsBullish = score > 0;
      const newsBearish = score < 0;
      const priceUp = priceCh > 0.15;
      const priceDown = priceCh < -0.15;
      if (newsBullish && priceDown) {
        pushEvidence(evidence, `Price −${Math.abs(priceCh).toFixed(2)}% 24h — news hot, tape weak`);
      } else if (newsBearish && priceUp) {
        pushEvidence(evidence, `Price +${priceCh.toFixed(2)}% 24h — headline headwind, tape firm`);
      } else if (Math.abs(priceCh) >= 0.3) {
        pushEvidence(evidence, `24h move ${priceCh >= 0 ? "+" : ""}${priceCh.toFixed(2)}%`);
      }
    }

    if (!evidence.length && gossipAlerts.length) {
      for (const alert of gossipAlerts) {
        if (headlineMatchesAsset(alert, asset)) {
          pushEvidence(evidence, alert.slice(0, 140));
          if (evidence.length >= 2) break;
        }
      }
    }

    let level: PressureLevel = "quiet";
    let label = "No edge / quiet";

    const newsVsPriceConflict =
      priceCh != null &&
      ((score > 0 && priceCh < -0.2) || (score < 0 && priceCh > 0.2));

    if (hasCatalyst && !hasOpenSignal && Math.abs(score) < 2) {
      level = "mixed";
      label = "Mixed / watch";
    } else if (newsVsPriceConflict) {
      level = "mixed";
      label = "Mixed / watch";
    } else if (score >= 2) {
      level = "up";
      label = "Upside pressure";
    } else if (score <= -2) {
      level = "down";
      label = "Downside pressure";
    } else if (hasOpenSignal) {
      const openCall = String(openRows[0]?.call || "").toLowerCase();
      if (openCall === "long" || openCall === "build") {
        level = "up";
        label = mapPressureCallLabel(openCall);
      } else if (openCall === "short") {
        level = "down";
        label = "Downside pressure";
      } else {
        level = "mixed";
        label = "Mixed / watch";
      }
    } else if (hasCatalyst || themeTags.length > 0) {
      level = "mixed";
      label = "Mixed / watch";
    } else if (Math.abs(score) === 1) {
      level = score > 0 ? "up" : "down";
      label = score > 0 ? "Upside pressure" : "Downside pressure";
    }

    const subtitleParts: string[] = [];
    if (themeTags.length) subtitleParts.push(themeTags.slice(0, 2).join(" + "));
    if (input.gossip?.spywords?.length) {
      const relevant = input.gossip.spywords.filter((w) =>
        headlineMatchesAsset(w, asset) || ASSET_HEADLINE_HINTS[asset]?.some((h) => w.includes(h)),
      );
      if (relevant.length) subtitleParts.push(relevant.slice(0, 2).join(" · "));
    }
    if (hasOpenSignal && openRows[0]?.source) {
      subtitleParts.push(String(openRows[0].source).replace(/-/g, " "));
    }
    const subtitle =
      subtitleParts.length > 0
        ? subtitleParts.join(" · ")
        : level === "quiet"
          ? "No active theme or engine flag"
          : "Headline + tape read";

    const displayEvidence = formatEvidenceForDisplay(evidence);
    const onlyGenericCatalyst =
      hasCatalyst &&
      !hasOpenSignal &&
      themeTags.length === 0 &&
      displayEvidence.length === 0 &&
      Math.abs(score) < 2;

    byAsset.set(asset, {
      asset,
      level,
      label,
      subtitle,
      score,
      evidence: displayEvidence,
      priceCh,
      themeTags,
      hasOpenSignal,
      hasCatalyst,
      onlyGenericCatalyst,
    });
  }

  const order = { up: 0, down: 1, mixed: 2, quiet: 3 };
  return [...byAsset.values()]
    .filter((r) => !r.onlyGenericCatalyst)
    .sort((a, b) => order[a.level] - order[b.level] || Math.abs(b.score) - Math.abs(a.score));
}

export function splitPressureMapForUi(rows: AssetPressure[], showSecondary: boolean) {
  const primary = PRIMARY_MAP_ASSETS.map((a) => rows.find((r) => r.asset === a)).filter(
    (r): r is AssetPressure => !!r,
  );
  const secondary = SECONDARY_MAP_ASSETS.map((a) => rows.find((r) => r.asset === a)).filter(
    (r): r is AssetPressure => !!r,
  );
  const visible = showSecondary ? [...primary, ...secondary] : primary;
  const hiddenCount = showSecondary ? 0 : secondary.length;
  return { visible, hiddenCount, secondary };
}
