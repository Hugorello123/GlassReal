// Market Pressure Lab — news flow + theme heat + engine flags per asset (TEST DATA edge tests below).
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import NavBar from "@/components/NavBar";
import { apiUrl } from "@/lib/sameOriginApi";
import {
  buildSentimentFollowStats,
  isDirectionalLaneSignal,
  isNarrativeSignal,
  quickTestLabel,
  testResultBadge,
} from "@/lib/followRule";
import {
  buildAssetPressureMap,
  buildMarketWeather,
  mapPressureCallLabel,
  NO_HEADLINE_DRIVER,
  pressureLevelMeta,
  splitPressureMapForUi,
  type AssetPressure,
  type GossipPayload,
  type SpotPrices,
} from "@/lib/pressureLab";
import { buildThemes } from "@/lib/watchdogThemes";
import { TEST } from "@/lib/testDataCopy";

/** Archive regime/fast-pulse cards stay de-emphasized; swing headline is always prominent. */
const SOFT_PREDICTIONS_SCOREBOARD = true;

/** Rows from `GET /api/predictions` (engine + resolver). */
interface ServerSignal {
  id?: string;
  source?: string;
  cluster?: string;
  affectedAssets?: string[];
  time?: string;
  asset?: string;
  call?: string;
  entry?: number | string;
  target?: number | string;
  targetPct?: string;
  timeframe?: string;
  horizon?: string;
  why?: string;
  status?: string;
  outcome?: string;
  // MFE-enriched milestone fields (present when signal has been backfilled)
  directionOk?: boolean;
  m1Hit?: boolean;
  m2Hit?: boolean;
  m3Hit?: boolean;
  speedTag?: string;
  favPct?: number;
  m1Pct?: number;
  followOutcome?: string;
  followWin?: boolean;
  dirQual?: "pass" | "miss" | string;
  // Regime context stamped at signal fire time
  regimeVix?: number;
  regimeYield10y?: number;
  regimeVixLabel?: string;
  regimeFearGreed?: number;
  regimeFearGreedLabel?: string;
  // Rule-based intelligence brief
  interpretation?: string;
  watchList?: string[];
  confirmSignals?: string[];
  riskFlags?: string[];
}

/** Matches `record` on `GET /api/predictions` (full merged file counts). */
interface ServerPredictionRecord {
  hit: number;
  missed: number;
  partial: number;
  open?: number;
  // directional / milestone summary (from enriched predictions.jsonl)
  dirOk?: number;
  dirTotal?: number;
  m1?: number;
  m2?: number;
  m3?: number;
  swingM1?: number;
  swingDirTotal?: number;
  swingM2?: number;
  followEvAvg?: number;
  sentimentM1?: number;
  sentimentDirTotal?: number;
  sentimentM2?: number;
  sentimentEvAvg?: number;
  narrativeM1?: number;
  narrativeDirTotal?: number;
}

type ServerTrackStats = {
  hit: number;
  missed: number;
  partial: number;
  open: number;
  resolved: number;
  // directional accuracy from MFE-enriched rows
  dirOk: number;
  dirTotal: number;
  m1: number;
  m2: number;
  /** Weighted win rate: hits + half partials, same as Guru / AI cards. */
  rate: number;
  /** Strict hits ÷ resolved (what most people mean by “hit %”). */
  hitRatePct: number;
  fromApi: boolean;
};

function formatSignalTime(iso: string | undefined) {
  if (!iso) return "—";
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return String(iso);
  return new Date(t).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

/** Catalyst Watch / awareness rows — not Live Edge Tests; keep out of scored-test table. */
function isCatalystAwarenessRow(r: ServerSignal): boolean {
  if (String(r.source || "").toLowerCase() === "catalyst-watch") return true;
  if (String(r.status || "").toLowerCase() === "watching") return true;
  if (String(r.call || "").trim().toLowerCase() === "watch") return true;
  return false;
}

function catalystClusterTheme(cluster: string): string {
  const c = String(cluster || "").toLowerCase();
  if (c === "musk_intel") return "Musk / Tesla / Intel";
  if (c === "fed_pivot") return "Fed policy / yields / inflation";
  if (c === "us_china_trade") return "US–China trade & export controls";
  if (c === "energy_incident") return "Energy / supply disruption";
  return "Catalyst cluster";
}

function formatRelativeAgo(iso: string | undefined): string {
  const t = Date.parse(String(iso || ""));
  if (!Number.isFinite(t)) return "recently";
  const mins = (Date.now() - t) / 60000;
  if (mins < 1 / 60) return "just now";
  if (mins < 1) return `${Math.max(1, Math.round(mins * 60))}s ago`;
  if (mins < 60) return `${Math.round(mins)}m ago`;
  const h = Math.floor(mins / 60);
  const rm = Math.round(mins % 60);
  if (h < 48) return rm > 0 ? `${h}h ${rm}m ago` : `${h}h ago`;
  return `${Math.round(mins / 1440)}d ago`;
}

type CatalystWatchGroup = {
  cluster: string;
  theme: string;
  time: string;
  horizon: string;
  assets: string[];
};

function buildCatalystWatchGroups(rows: ServerSignal[], maxGroups: number): CatalystWatchGroup[] {
  const m = new Map<
    string,
    { cluster: string; timeMs: number; timeIso: string; horizon: string; assets: Set<string> }
  >();
  for (const r of rows) {
    if (!isCatalystAwarenessRow(r)) continue;
    const cluster = String(r.cluster || "unknown");
    const t = Date.parse(String(r.time || "")) || 0;
    let g = m.get(cluster);
    const assets = new Set<string>();
    const one = String(r.asset || "").trim();
    if (one) assets.add(one);
    const aff = Array.isArray(r.affectedAssets) ? r.affectedAssets : [];
    for (const x of aff) {
      const s = String(x || "").trim();
      if (s) assets.add(s);
    }
    if (!g) {
      m.set(cluster, {
        cluster,
        timeMs: t,
        timeIso: String(r.time || ""),
        horizon: String(r.horizon || r.timeframe || "20m-4h"),
        assets,
      });
    } else {
      if (t > g.timeMs) {
        g.timeMs = t;
        g.timeIso = String(r.time || "");
      }
      for (const s of assets) g.assets.add(s);
    }
  }
  return [...m.values()]
    .map((v) => ({
      cluster: v.cluster,
      theme: catalystClusterTheme(v.cluster),
      time: v.timeIso,
      horizon: v.horizon,
      assets: [...v.assets].sort(),
    }))
    .sort((a, b) => (Date.parse(b.time) || 0) - (Date.parse(a.time) || 0))
    .slice(0, maxGroups);
}

function MilestoneBonusTags({ row }: { row: ServerSignal }) {
  const tags: string[] = [];
  if (row.m2Hit) tags.push("Ran further (bonus)");
  if (row.m3Hit) tags.push("Big run (bonus)");
  if (!tags.length) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {tags.map((t) => (
        <span
          key={t}
          className="text-[10px] px-2 py-0.5 rounded-full border font-semibold text-amber-300/90 border-amber-500/35 bg-amber-500/10 whitespace-nowrap"
        >
          {t}
        </span>
      ))}
    </div>
  );
}

/** Tape-only lines — price badge already shows 24h move; not headline evidence. */
const TAPE_ONLY_EVIDENCE =
  /^(24h move|Price [+-−]|news hot, tape weak|headline headwind, tape firm)/i;

function pressureCardEvidence(row: AssetPressure): string[] {
  const seen = new Set<string>();
  const lines: string[] = [];
  for (const raw of row.evidence) {
    const line = raw.trim();
    if (!line || TAPE_ONLY_EVIDENCE.test(line)) continue;
    const key = line.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    lines.push(line);
  }
  return lines.length ? lines.slice(0, 2) : [NO_HEADLINE_DRIVER];
}

function formatThemeLikelyPressure(impacts: { asset: string; direction: string }[]): string {
  return impacts
    .filter((imp) => imp.direction && imp.direction !== "—")
    .slice(0, 4)
    .map((imp) => `${imp.asset} ${imp.direction}`)
    .join(" · ");
}

function compactEdgeLine(row: ServerSignal): string {
  const asset = row.asset || "—";
  const pressure = isNarrativeSignal(row)
    ? mapPressureCallLabel(row.call || "build")
    : mapPressureCallLabel(row.call);
  const win = row.horizon || row.timeframe || "—";
  const st = testResultBadge(row);
  const fr = quickTestLabel(row);
  return `${asset} · ${pressure} · ${win} · ${st.label} · ${fr.text}`;
}

function edgeRowKey(row: ServerSignal, ri: number): string {
  return row.id ? String(row.id) : `srv-${ri}-${row.time}-${row.asset}`;
}

function EdgeTestDetails({ row }: { row: ServerSignal }) {
  return (
    <div className="mt-2 rounded-lg border border-slate-700/80 bg-slate-900/50 p-3 space-y-2 text-xs">
      {row.why ? (
        <div>
          <span className="font-semibold text-cyan-400 mr-1">Why:</span>
          <span className="text-slate-300">{row.why}</span>
        </div>
      ) : null}
      {row.interpretation ? (
        <div className="text-slate-200 leading-relaxed">
          <span className="font-semibold text-amber-400 mr-1">Read:</span>
          {row.interpretation}
        </div>
      ) : null}
      {row.watchList && row.watchList.length > 0 ? (
        <div>
          <span className="font-semibold text-blue-400">Watch:</span>
          <ul className="mt-1 space-y-0.5 pl-3">
            {row.watchList.map((w, i) => (
              <li key={i} className="text-slate-400">
                · {w}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="flex gap-6 flex-wrap">
        {row.confirmSignals && row.confirmSignals.length > 0 ? (
          <div className="flex-1 min-w-[180px]">
            <span className="font-semibold text-green-400">Confirms:</span>
            <ul className="mt-1 space-y-0.5 pl-3">
              {row.confirmSignals.map((c, i) => (
                <li key={i} className="text-slate-400">
                  · {c}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {row.riskFlags && row.riskFlags.length > 0 ? (
          <div className="flex-1 min-w-[180px]">
            <span className="font-semibold text-red-400">Risk:</span>
            <ul className="mt-1 space-y-0.5 pl-3">
              {row.riskFlags.map((r, i) => (
                <li key={i} className="text-slate-400">
                  · {r}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** Default rows shown for server history (newest first); avoids a huge scroll. */
const SERVER_RECENT_COUNT = 25;

/** Gentle poll while tab visible — server resolver runs ~every 2m; 60s keeps UI fresh without spam. */
const SERVER_PREDICTIONS_REFRESH_MS = 60_000;

export default function PredictionsPage() {
  const [serverItems, setServerItems] = useState<ServerSignal[]>([]);
  /** Full hit/miss/open counts from merged predictions file (same response as `items`). */
  const [serverRecord, setServerRecord] = useState<ServerPredictionRecord | null>(null);
  const [serverLoading, setServerLoading] = useState(true);
  const [serverErr, setServerErr] = useState("");
  const [serverShowAll, setServerShowAll] = useState(false);
  const [hide20m, setHide20m] = useState(true);
  const [sentimentOnly, setSentimentOnly] = useState(false);
  const [gossip, setGossip] = useState<GossipPayload | null>(null);
  const [newsArticles, setNewsArticles] = useState<{ title?: string }[]>([]);
  const [shockAlerts, setShockAlerts] = useState<string[]>([]);
  const [prices, setPrices] = useState<SpotPrices | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);
  const [showSecondaryPressure, setShowSecondaryPressure] = useState(false);
  const [expandedEdgeIds, setExpandedEdgeIds] = useState<Set<string>>(() => new Set());

  const loadLabFeeds = useCallback(async () => {
    const [gp, np, nsh, pp] = await Promise.all([
      fetch(apiUrl("/api/gossip"), { cache: "no-store" }).catch(() => null),
      fetch(`${apiUrl("/api/news")}?_=${Date.now()}`, { cache: "no-store" }).catch(() => null),
      fetch(`${apiUrl("/api/news-shock")}?_=${Date.now()}`, { cache: "no-store" }).catch(() => null),
      fetch(apiUrl("/api/prices"), { cache: "no-store" }).catch(() => null),
    ]);
    if (gp?.ok) {
      try {
        setGossip((await gp.json()) as GossipPayload);
      } catch {
        setGossip(null);
      }
    }
    if (np?.ok) {
      try {
        const j = await np.json();
        setNewsArticles(Array.isArray(j.articles) ? j.articles : []);
      } catch {
        setNewsArticles([]);
      }
    }
    if (nsh?.ok) {
      try {
        const j = await nsh.json();
        const arts = Array.isArray(j.articles) ? j.articles : [];
        setShockAlerts(
          arts
            .map((a: { title?: string }) => String(a.title || "").trim())
            .filter((t: string) => t && t !== "Loading..." && !t.includes("unavailable")),
        );
      } catch {
        setShockAlerts([]);
      }
    }
    if (pp?.ok) {
      try {
        const j = await pp.json();
        setPrices((j?.prices ?? j) as SpotPrices);
      } catch {
        setPrices(null);
      }
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadServerPredictions(isInitial: boolean) {
      try {
        const res = await fetch(apiUrl("/api/predictions?limit=100"), {
          headers: { Accept: "application/json" },
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`Predictions API ${res.status}`);
        const ct = res.headers.get("content-type") || "";
        if (!ct.includes("application/json")) throw new Error("Predictions API returned non-JSON (check server / proxy)");
        const data = await res.json();
        const items = Array.isArray(data?.items) ? data.items : [];
        const rec = data?.record;
        if (!cancelled) {
          setServerErr("");
          setServerItems(items as ServerSignal[]);
          if (
            rec &&
            typeof rec.hit === "number" &&
            typeof rec.missed === "number" &&
            typeof rec.partial === "number"
          ) {
            setServerRecord({
              hit: rec.hit,
              missed: rec.missed,
              partial: rec.partial,
              open: typeof rec.open === "number" ? rec.open : undefined,
              dirOk: typeof rec.dirOk === "number" ? rec.dirOk : undefined,
              dirTotal: typeof rec.dirTotal === "number" ? rec.dirTotal : undefined,
              m1: typeof rec.m1 === "number" ? rec.m1 : undefined,
              m2: typeof rec.m2 === "number" ? rec.m2 : undefined,
              m3: typeof rec.m3 === "number" ? rec.m3 : undefined,
              swingM1: typeof rec.swingM1 === "number" ? rec.swingM1 : undefined,
              swingDirTotal: typeof rec.swingDirTotal === "number" ? rec.swingDirTotal : undefined,
              swingM2: typeof rec.swingM2 === "number" ? rec.swingM2 : undefined,
              followEvAvg: typeof rec.followEvAvg === "number" ? rec.followEvAvg : undefined,
              sentimentM1: typeof rec.sentimentM1 === "number" ? rec.sentimentM1 : undefined,
              sentimentDirTotal: typeof rec.sentimentDirTotal === "number" ? rec.sentimentDirTotal : undefined,
              sentimentM2: typeof rec.sentimentM2 === "number" ? rec.sentimentM2 : undefined,
              sentimentEvAvg: typeof rec.sentimentEvAvg === "number" ? rec.sentimentEvAvg : undefined,
              narrativeM1: typeof rec.narrativeM1 === "number" ? rec.narrativeM1 : undefined,
              narrativeDirTotal: typeof rec.narrativeDirTotal === "number" ? rec.narrativeDirTotal : undefined,
            });
          } else setServerRecord(null);
        }
      } catch (e: unknown) {
        if (!cancelled) setServerErr(e instanceof Error ? e.message : "Failed to load server signals");
      } finally {
        if (!cancelled && isInitial) setServerLoading(false);
      }
    }

    void loadServerPredictions(true);
    void loadLabFeeds();

    const interval = setInterval(() => {
      if (!cancelled && !document.hidden) {
        void loadServerPredictions(false);
        void loadLabFeeds();
      }
    }, SERVER_PREDICTIONS_REFRESH_MS);

    const onVisible = () => {
      if (!cancelled && document.visibilityState === "visible") {
        void loadServerPredictions(false);
        void loadLabFeeds();
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [loadLabFeeds]);

  const serverTestItems = useMemo(() => serverItems.filter((r) => !isCatalystAwarenessRow(r)), [serverItems]);
  const serverCatalystItems = useMemo(() => serverItems.filter(isCatalystAwarenessRow), [serverItems]);
  const serverCatalystGroups = useMemo(() => buildCatalystWatchGroups(serverCatalystItems, 6), [serverCatalystItems]);

  const serverTrack = buildServerTrackStats(serverRecord, serverTestItems);
  const sentimentStats = useMemo(
    () => buildSentimentFollowStats(serverTestItems, serverRecord),
    [serverTestItems, serverRecord]
  );
  /** 20m price-shock rows — historical noise, hidden by default */
  const is20mRow = (r: ServerSignal) =>
    (String(r.timeframe || r.horizon || "").toLowerCase() === "20m") ||
    (String(r.source || "").toLowerCase() === "price-shock");

  const count20m = useMemo(() => serverTestItems.filter(is20mRow).length, [serverTestItems]);
  const countArchiveHidden = useMemo(
    () => serverTestItems.filter((r) => !isDirectionalLaneSignal(r)).length,
    [serverTestItems]
  );

  const serverFiltered = useMemo(() => {
    let rows = hide20m ? serverTestItems.filter((r) => !is20mRow(r)) : serverTestItems;
    if (sentimentOnly) rows = rows.filter(isDirectionalLaneSignal);
    return rows;
  }, [serverTestItems, hide20m, sentimentOnly]);

  const serverDisplayed =
    serverShowAll || serverFiltered.length <= SERVER_RECENT_COUNT
      ? serverFiltered
      : serverFiltered.slice(0, SERVER_RECENT_COUNT);

  const weather = useMemo(
    () => buildMarketWeather(gossip, buildThemes(newsArticles)),
    [gossip, newsArticles],
  );

  const pressureMap = useMemo(
    () =>
      buildAssetPressureMap({
        newsArticles,
        gossip,
        predictions: serverItems as Parameters<typeof buildAssetPressureMap>[0]["predictions"],
        prices,
        shockAlerts,
      }),
    [newsArticles, gossip, serverItems, prices, shockAlerts],
  );

  const pressureUi = useMemo(
    () => splitPressureMapForUi(pressureMap, showSecondaryPressure),
    [pressureMap, showSecondaryPressure],
  );

  function toggleEdgeDetails(key: string) {
    setExpandedEdgeIds((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <>
      <NavBar current="predictions" />
      <main className="min-h-screen bg-gradient-to-br from-black to-gray-900 text-white">
        <div className="max-w-4xl mx-auto px-6 py-10">
          <header className="mb-6 space-y-2">
            <div className="inline-block rounded-md border border-amber-400/50 bg-amber-500/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-amber-200">
              Research Mode
            </div>
            <p className="text-sm text-gray-300 max-w-2xl leading-relaxed">
              Testing whether market pressure leads to short-term follow-through.
            </p>
            <h1 className="text-3xl font-bold text-white pt-1">Market Pressure Lab</h1>
            <p className="text-sm text-gray-400 max-w-2xl leading-relaxed">
              See what the news flow is pressuring before opening ten tabs.
            </p>
            <p className="text-xs text-gray-500">Market awareness only — not financial advice.</p>
          </header>

          {/* ── 1. Market Weather ── */}
          <section
            className="mb-6 rounded-2xl border border-cyan-500/25 bg-gradient-to-br from-slate-900/90 to-black p-5 shadow-lg shadow-cyan-500/5"
            aria-labelledby="market-weather-heading"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 id="market-weather-heading" className="text-lg font-bold text-cyan-300 tracking-wide">
                  Market weather
                </h2>
                <p className="text-xs text-slate-500 mt-1">Gossip intensity · active themes · headline heat</p>
              </div>
              <div className="text-left sm:text-right">
                <div className="text-[10px] uppercase tracking-wider text-slate-500">Tape</div>
                <div
                  className={`text-2xl font-extrabold tabular-nums ${
                    weather.label === "Hot"
                      ? "text-red-400"
                      : weather.label === "Watching"
                        ? "text-amber-400"
                        : "text-slate-400"
                  }`}
                >
                  {serverLoading && !gossip ? "…" : weather.label}
                </div>
                <div className="text-xs text-slate-500 tabular-nums">{weather.intensity}/10 intensity</div>
              </div>
            </div>
            <p className="text-sm text-slate-300 mt-3 leading-relaxed">{weather.summary}</p>
            {weather.spywords.length > 0 ? (
              <div className="flex flex-wrap gap-2 mt-3">
                {weather.spywords.map((w) => (
                  <span
                    key={w}
                    className="text-xs px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/25"
                  >
                    {w}
                  </span>
                ))}
              </div>
            ) : null}
            {weather.dominantTheme ? (
              <div className="mt-3 text-xs border border-orange-500/20 rounded-lg px-3 py-2 bg-orange-500/5 space-y-1">
                <div className="text-orange-300/90">
                  <span className="font-semibold">Dominant theme:</span> {weather.dominantTheme.name}
                </div>
                {formatThemeLikelyPressure(weather.dominantTheme.impacts) ? (
                  <div className="text-slate-400">
                    Likely pressure: {formatThemeLikelyPressure(weather.dominantTheme.impacts)}
                  </div>
                ) : null}
              </div>
            ) : null}
          </section>

          {/* ── 2. Pressure Map ── */}
          <section className="mb-8" aria-labelledby="pressure-map-heading">
            <h2 id="pressure-map-heading" className="text-lg font-semibold text-white mb-1">
              Pressure map
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Same headline can push assets differently — green tailwind, red headwind, yellow watch, grey quiet.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {pressureUi.visible.map((row) => {
                const meta = pressureLevelMeta(row.level);
                const selected = selectedAsset === row.asset;
                const lines = pressureCardEvidence(row);
                return (
                  <button
                    key={row.asset}
                    type="button"
                    onClick={() => setSelectedAsset(row.asset)}
                    className={`text-left rounded-xl border p-4 transition ${meta.ring} ${
                      selected ? "ring-2 ring-cyan-400/50" : "hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-bold text-white text-lg">{row.asset}</div>
                        <div className={`text-sm font-semibold mt-0.5 ${meta.text}`}>
                          {meta.dot} {row.label}
                        </div>
                      </div>
                      {row.priceCh != null ? (
                        <div
                          className={`text-xs font-mono tabular-nums px-2 py-1 rounded ${
                            row.priceCh >= 0 ? "text-emerald-400 bg-emerald-500/10" : "text-rose-400 bg-rose-500/10"
                          }`}
                        >
                          {row.priceCh >= 0 ? "+" : ""}
                          {row.priceCh.toFixed(2)}%
                        </div>
                      ) : null}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-2 leading-snug line-clamp-2">{row.subtitle}</p>
                    <ul className="mt-2 space-y-1">
                      {lines.map((line, i) => (
                        <li
                          key={i}
                          className={`text-[10px] leading-snug line-clamp-2 ${
                            line === NO_HEADLINE_DRIVER ? "text-slate-600 italic" : "text-slate-400"
                          }`}
                        >
                          · {line}
                        </li>
                      ))}
                    </ul>
                  </button>
                );
              })}
            </div>
            {pressureUi.hiddenCount > 0 ? (
              <button
                type="button"
                onClick={() => setShowSecondaryPressure(true)}
                className="mt-3 text-sm text-cyan-400/90 hover:text-cyan-300 underline-offset-2 hover:underline"
              >
                +{pressureUi.hiddenCount} more monitored
              </button>
            ) : showSecondaryPressure && pressureUi.secondary.length > 0 ? (
              <button
                type="button"
                onClick={() => setShowSecondaryPressure(false)}
                className="mt-3 text-sm text-gray-500 hover:text-gray-300"
              >
                Show fewer assets
              </button>
            ) : null}
          </section>

          {serverCatalystGroups.length > 0 ? (
            <div
              role="region"
              aria-labelledby="catalyst-watch-heading"
              className="mb-6 rounded-xl border border-amber-500/30 bg-amber-950/15 px-4 py-4"
            >
              <h2 id="catalyst-watch-heading" className="text-lg font-semibold text-amber-200 mb-1">
                ⚠️ Catalyst Watch
              </h2>
              <p className="text-sm text-gray-400 mb-4 leading-relaxed max-w-2xl">
                Awareness-only catalyst stories currently being monitored. No entry. No target. Not scored.
              </p>
              <ul className="space-y-3">
                {serverCatalystGroups.map((g) => (
                  <li key={g.cluster} className="rounded-lg border border-white/10 bg-black/25 px-3 py-3 text-sm">
                    <div className="font-semibold text-white">{g.theme}</div>
                    <div className="text-gray-500 text-xs mt-1">
                      {formatRelativeAgo(g.time)} · {g.horizon}
                    </div>
                    <div className="text-gray-400 mt-2 text-xs">
                      <span className="text-gray-500">Assets:</span> {g.assets.length ? g.assets.join(", ") : "—"}
                    </div>
                    <div className="text-[11px] text-amber-200/80 mt-2">Outcome: Awareness only</div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <section className="mb-10" aria-labelledby="server-signals-heading">
            <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
              <h2 id="server-signals-heading" className="text-lg font-semibold text-white">
                Live edge tests
              </h2>
              <div className="flex gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setSentimentOnly((v) => !v)}
                  className={`text-xs border rounded px-2 py-1 transition ${sentimentOnly ? "text-cyan-300 border-cyan-500/40 bg-cyan-950/30" : "text-gray-500 border-white/10 hover:text-gray-300"}`}
                >
                  {sentimentOnly ? `Show all (${countArchiveHidden} archive)` : "Directional only"}
                </button>
                {count20m > 0 && (
                  <button
                    type="button"
                    onClick={() => setHide20m((v) => !v)}
                    className="text-xs text-gray-500 hover:text-gray-300 border border-white/10 rounded px-2 py-1 transition"
                  >
                    {hide20m ? `Show 20m (${count20m})` : `Hide 20m`}
                  </button>
                )}
              </div>
            </div>
            <p className="text-sm text-gray-500 mb-3 leading-relaxed">
              Experimental follow-through checks —{" "}
              <strong className="text-gray-400">Pressure</strong> → Pass? → Gain/Loss. Not a signal to trade.
              {sentimentOnly ? " · sentiment + narrative only" : " · full archive"}
            </p>
            {serverErr && (
              <div className="bg-amber-500/10 border border-amber-500/30 text-amber-200 px-4 py-3 rounded-lg mb-4 text-sm">
                {serverErr} — refresh the page to retry.
              </div>
            )}
            {serverLoading ? (
              <p className="text-sm text-gray-400">Loading server signals…</p>
            ) : serverTestItems.length === 0 && serverItems.length > 0 ? (
              <p className="text-sm text-gray-300 border border-amber-500/20 rounded-lg px-4 py-3 bg-amber-500/5 mb-4">
                No scored tests in this batch — only Catalyst Watch awareness rows were returned. See{" "}
                <strong className="text-amber-200">Catalyst Watch</strong> above; scored tests will reappear when the
                engine opens Long/Short rows.
              </p>
            ) : serverFiltered.length === 0 ? (
              <p className="text-sm text-gray-300 border border-white/10 rounded-lg px-4 py-3 bg-white/[0.03]">
                {sentimentOnly
                  ? "No directional predictions yet — fires on headline cluster (price or narrative e.g. SpaceX). Show all to see swing archive."
                  : "No server signals to show yet (engine may be between runs, or filters are quiet)."}
              </p>
            ) : (
              <div className="space-y-2">
                <div className="rounded-xl border border-cyan-500/20 bg-white/[0.03] divide-y divide-white/5">
                  {serverDisplayed.map((row, ri) => {
                    const key = edgeRowKey(row, ri);
                    const expanded = expandedEdgeIds.has(key);
                    const hasDetails =
                      !!row.why ||
                      !!row.interpretation ||
                      (row.watchList && row.watchList.length > 0) ||
                      (row.confirmSignals && row.confirmSignals.length > 0) ||
                      (row.riskFlags && row.riskFlags.length > 0);
                    const fr = quickTestLabel(row);
                    return (
                      <div key={key} className="px-4 py-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm text-slate-200 font-medium leading-snug">
                            {compactEdgeLine(row)}
                          </p>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[10px] text-gray-600 whitespace-nowrap">
                              {formatSignalTime(row.time)}
                            </span>
                            {hasDetails ? (
                              <button
                                type="button"
                                onClick={() => toggleEdgeDetails(key)}
                                className="text-xs text-cyan-400/90 hover:text-cyan-300 border border-cyan-500/30 rounded px-2 py-0.5"
                              >
                                {expanded ? "hide" : "details"}
                              </button>
                            ) : null}
                          </div>
                        </div>
                        {row.m2Hit || row.m3Hit ? (
                          <div className="mt-1.5">
                            <MilestoneBonusTags row={row} />
                          </div>
                        ) : null}
                        {expanded && hasDetails ? <EdgeTestDetails row={row} /> : null}
                        {!expanded && row.outcome && row.outcome !== "—" ? (
                          <p className={`text-[11px] mt-1 ${fr.className}`}>{row.outcome}</p>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
                {serverFiltered.length > SERVER_RECENT_COUNT ? (
                  <button
                    type="button"
                    onClick={() => setServerShowAll((v) => !v)}
                    className="text-sm text-cyan-400 hover:text-cyan-300 underline-offset-2 hover:underline"
                  >
                    {serverShowAll
                      ? "Show fewer rows"
                      : `Show full history (${serverFiltered.length} scored rows)`}
                  </button>
                ) : null}
              </div>
            )}
          </section>

          {/* ── 5. Research performance (collapsed) ── */}
          <details className="mb-10 border-t border-white/10 pt-6 text-sm text-gray-500 group">
            <summary className="cursor-pointer list-none flex items-center justify-between gap-2 hover:text-gray-300">
              <span className="text-base font-semibold text-gray-400 group-open:text-gray-300">
                Engine tuning data — not a product claim
              </span>
              <span className="text-xs text-gray-600">Research performance</span>
            </summary>
            <div className="mt-4">
              <p className="text-sm text-gray-500 mb-4">
                Closed-test scorecard for engine tuning only.{" "}
                <Link to="/stats" className="text-cyan-400/90 hover:text-cyan-300 underline-offset-2 hover:underline">
                  Full stats →
                </Link>
              </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4 max-w-xl">
              <div className="rounded-xl px-4 py-3 text-center border border-cyan-500/30 bg-cyan-950/15 col-span-2 sm:col-span-1">
                <div className="text-3xl font-extrabold tabular-nums text-cyan-300">
                  {serverLoading ? "…" : sentimentStats.swingHitPct !== null ? `${sentimentStats.swingHitPct}%` : "—"}
                </div>
                <div className="text-xs font-bold uppercase tracking-wide text-cyan-200/90 mt-1">{TEST.testsPassed}</div>
                <div className="text-[10px] text-gray-500 mt-0.5">
                  {sentimentStats.swingTotal > 0
                    ? `${sentimentStats.swingM1}/${sentimentStats.swingTotal} directional ${TEST.testsRun}`
                    : "—"}
                </div>
              </div>
              {sentimentStats.followEvPct !== null && sentimentStats.swingTotal > 0 && (
                <div className="rounded-xl px-4 py-3 text-center border border-emerald-500/30 bg-emerald-950/15">
                  <div
                    className={`text-2xl font-extrabold tabular-nums ${sentimentStats.followEvPct >= 0 ? "text-emerald-400" : "text-red-400"}`}
                  >
                    {sentimentStats.followEvPct >= 0 ? "+" : ""}
                    {sentimentStats.followEvPct}%
                  </div>
                  <div className="text-[10px] font-semibold uppercase text-emerald-300/80 mt-1">{TEST.avgGainPerTest}</div>
                </div>
              )}
              <div className="rounded-xl px-4 py-3 text-center border border-white/10 bg-white/[0.03]">
                <div className="text-2xl font-bold tabular-nums text-gray-400">
                  {serverTrack.dirTotal > 0 ? `${Math.round((serverTrack.m1 / serverTrack.dirTotal) * 100)}%` : "—"}
                </div>
                <div className="text-[10px] font-semibold uppercase text-gray-500 mt-1">All archive</div>
                <div className="text-[10px] text-gray-600">
                  {serverTrack.m1}/{serverTrack.dirTotal}
                </div>
              </div>
            </div>
            <details className="text-sm text-gray-500">
              <summary className="cursor-pointer hover:text-gray-300">Archive lanes breakdown</summary>
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                <ServerCombinedTrackCard
                  stats={serverTrack}
                  loading={serverLoading}
                  softScoreboard={SOFT_PREDICTIONS_SCOREBOARD}
                />
                <TrackCard
                  title="🧭 Regime (archive)"
                  items={serverTestItems}
                  bucket="guru"
                  desc="Shorter-window context"
                  assets="BTC + Gold + Oil"
                  softScoreboard
                />
              </div>
            </details>
            </div>
          </details>

          <p className="text-[11px] text-gray-600 leading-relaxed max-w-2xl mt-8 border-t border-white/10 pt-6">
            {TEST.disclaimer}
          </p>

          <div className="mt-6 text-center">
            <Link to="/hub" className="text-cyan-400 hover:underline">← Back to Trader Hub</Link>
          </div>
        </div>
      </main>
    </>
  );
}

function classify(row: ServerSignal): "guru" | "ai" | "manual" {
  const src = String(row.source || "").toLowerCase();
  if (src.includes("bias") || src.includes("guru")) return "guru";
  if (src.includes("ai") || src.includes("auto") || src.includes("gossip")) return "ai";
  const id = String(row.id || "").toLowerCase();
  if (id.startsWith("sig_")) return "guru";
  if (id.startsWith("ai-") || id.startsWith("ai_gossip")) return "ai";
  return "manual";
}

function resolvedRate(items: ServerSignal[]) {
  let hit = 0,
    missed = 0,
    partial = 0;
  for (const r of items) {
    const statusRaw = String(r.status ?? "").trim().toLowerCase();
    if (statusRaw === "hit") {
      hit++;
      continue;
    }
    if (statusRaw === "missed") {
      missed++;
      continue;
    }
    if (statusRaw === "partial") {
      partial++;
      continue;
    }
    if (statusRaw === "open" || statusRaw === "void" || statusRaw === "" || statusRaw === "watching") continue;
    const oc = String(r.outcome || "").toLowerCase();
    if (oc.includes("target reached") || oc.includes("reached @")) hit++;
    else if (oc.includes("partial move")) partial++;
    else if (oc.includes("not met") || oc.includes("no price data")) missed++;
  }
  const resolved = hit + missed + partial;
  const rate = resolved > 0 ? Math.round(((hit + partial * 0.5) / resolved) * 100) : 0;
  return { hit, missed, partial, resolved, rate };
}

function buildServerTrackStats(
  fullRecord: ServerPredictionRecord | null,
  serverItems: ServerSignal[]
): ServerTrackStats {
  const rec = fullRecord;
  if (
    rec &&
    typeof rec.hit === "number" &&
    typeof rec.missed === "number" &&
    typeof rec.partial === "number"
  ) {
    const hit = rec.hit;
    const missed = rec.missed;
    const partial = rec.partial;
    const open = rec.open ?? 0;
    const resolved = hit + missed + partial;
    const rate = resolved > 0 ? Math.round(((hit + partial * 0.5) / resolved) * 100) : 0;
    const hitRatePct = resolved > 0 ? Math.round((hit / resolved) * 100) : 0;
    return {
      hit, missed, partial, open, resolved, rate, hitRatePct, fromApi: true,
      dirOk: rec.dirOk ?? 0, dirTotal: rec.dirTotal ?? 0,
      m1: rec.m1 ?? 0, m2: rec.m2 ?? 0,
    };
  }
  const r = resolvedRate(serverItems);
  const open = serverItems.filter((s) => String(s.status ?? "").trim().toLowerCase() === "open").length;
  const hitRatePct = r.resolved > 0 ? Math.round((r.hit / r.resolved) * 100) : 0;
  // compute directional stats from items directly when API record is missing
  let dirOk = 0, dirTotal = 0, m1 = 0, m2 = 0;
  for (const sig of serverItems) {
    if (typeof sig.directionOk === "boolean") {
      dirTotal++;
      if (sig.directionOk) dirOk++;
      if (sig.m1Hit) m1++;
      if (sig.m2Hit) m2++;
    }
  }
  return {
    hit: r.hit, missed: r.missed, partial: r.partial, open,
    resolved: r.resolved, rate: r.rate, hitRatePct, fromApi: false,
    dirOk, dirTotal, m1, m2,
  };
}

function ServerCombinedTrackCard({
  stats,
  loading,
  softScoreboard,
}: {
  stats: ServerTrackStats;
  loading: boolean;
  softScoreboard?: boolean;
}) {
  const { resolved, open, fromApi, dirTotal, m1, m2 } = stats;
  const hitPct = dirTotal > 0 ? Math.round((m1 / dirTotal) * 100) : null;
  const m2Pct = dirTotal > 0 ? Math.round((m2 / dirTotal) * 100) : null;
  const soft = !!softScoreboard;
  return (
    <div className="rounded-xl border-2 border-green-500/35 bg-green-950/20 p-4 text-center">
      <div className="text-xs font-bold uppercase tracking-wider text-gray-500">
        All tests passed
      </div>
      <div className="font-extrabold my-2 tabular-nums text-4xl text-green-400">
        {loading ? "…" : hitPct !== null ? `${hitPct}%` : "—"}
      </div>
      <div className="text-xs font-medium text-gray-400">{dirTotal > 0 ? `${m1}/${dirTotal} scored` : "loading"}</div>
      {m2Pct !== null && m2Pct > 0 && (
        <div className="text-xs text-amber-400/80 mt-1 font-medium">
          {m2Pct}% ran further
        </div>
      )}
      {!soft && (
        <div className="mt-3 pt-2 border-t border-white/5">
          <div className="text-[10px] text-gray-700 leading-snug">
            {loading ? "…" : `${open} open · ${resolved} closed`}
            {fromApi ? " · full archive on file" : ""}
          </div>
        </div>
      )}
    </div>
  );
}

function TrackCard({
  title,
  items,
  bucket,
  desc,
  assets,
  softScoreboard,
}: {
  title: string;
  items: ServerSignal[];
  bucket: "guru" | "ai" | "manual";
  desc: string;
  assets: string;
  softScoreboard?: boolean;
}) {
  const soft = !!softScoreboard;
  const bucketed = items.filter((r) => classify(r) === bucket);
  const { resolved, rate } = resolvedRate(bucketed);
  const sampleAssets = Array.from(new Set(bucketed.slice(0, 8).map((r) => r.asset || "—"))).join(", ") || "—";
  const tone = bucket === "guru" ? "border-cyan-500/20 bg-cyan-500/5" : bucket === "ai" ? "border-purple-500/20 bg-purple-500/5" : "border-white/10 bg-white/5";
  const titleColor = bucket === "guru" ? "text-cyan-300" : bucket === "ai" ? "text-purple-300" : "text-gray-300";

  return (
    <div className={`rounded-xl border p-4 text-center ${tone}`}>
      <div className={`text-xs font-bold uppercase tracking-wider ${titleColor}`}>{title}</div>
      <div className="text-3xl font-extrabold text-white my-2">{bucketed.length}</div>
      <div className="text-xs font-medium text-gray-300">{desc}</div>
      <div className="text-xs text-gray-400 mt-1">{assets}</div>
      <div className={`font-bold mt-2 tabular-nums ${soft ? "text-base text-gray-500" : "text-lg text-yellow-400"}`}>
        {resolved > 0 ? `${rate}%` : "—"}
      </div>
      <div className="text-xs text-gray-400 mt-2 truncate leading-snug">{sampleAssets}</div>
    </div>
  );
}
