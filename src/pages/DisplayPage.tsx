// src/pages/DisplayPage.tsx — Flagship /#/display: full-viewport boardroom grid, ambient TV chart, SVG 24h trends (from sweep prices only).
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import TvEmbed from "@/components/TvEmbed";
import { apiUrl } from "@/lib/sameOriginApi";

const LS_DEVICE = "sento_display_device_id";
const LS_TRIAL_START = "sento_display_trial_started";
const LS_PRO_ACTIVE = "sento_display_pro_active";
const SWEEP_MS = 60_000;
const TV_ROTATE_MS = 60_000;
/** Wall / TV: shock lane auto-rotate — no mouse scroll. */
const NEWS_WIRE_ROTATE_MS = 5_000;
/** Market headlines crawl — one full loop (35–45s target for TV readability). */
const NEWS_WIRE_TICKER_MS = 40_000;

type PredRow = {
  id?: string;
  source?: string;
  cluster?: string;
  why?: string;
  time?: string;
  asset?: string;
  call?: string;
  timeframe?: string;
  horizon?: string;
  shockMovePct?: number;
};

type DisplayLifecycle = "PRO_PREVIEW" | "PRO_WARNING" | "FREE_BILLBOARD";

type CatalystGroup = {
  cluster: string;
  theme: string;
  assets: string;
  window: string;
  rel: string;
  _ts: number;
};

function randDeviceId(): string {
  const u = globalThis.crypto?.randomUUID?.();
  if (u) return `disp_${u.replace(/-/g, "").slice(0, 16)}`;
  return `disp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function ensureAnonymousDevice(): void {
  if (typeof window === "undefined") return;
  if (!localStorage.getItem(LS_DEVICE)) localStorage.setItem(LS_DEVICE, randDeviceId());
  if (!localStorage.getItem(LS_TRIAL_START)) localStorage.setItem(LS_TRIAL_START, String(Date.now()));
}

function daysElapsedTrial(): number {
  const raw = localStorage.getItem(LS_TRIAL_START);
  const t = Number(raw);
  if (!Number.isFinite(t)) return 0;
  return Math.floor((Date.now() - t) / (24 * 60 * 60 * 1000));
}

function lifecycleFromTrial(): DisplayLifecycle {
  if (typeof window === "undefined") return "PRO_PREVIEW";
  if (localStorage.getItem(LS_PRO_ACTIVE) === "true") return "PRO_PREVIEW";
  const d = daysElapsedTrial();
  if (d <= 23) return "PRO_PREVIEW";
  if (d <= 30) return "PRO_WARNING";
  return "FREE_BILLBOARD";
}

function isFastPulseRow(p: PredRow): boolean {
  if (String(p.source || "").toLowerCase() === "ai-gossip-fast") return true;
  const id = String(p.id || "").toLowerCase();
  if (id.startsWith("aigf_")) return true;
  if (String(p.why || "").toLowerCase().includes("fast gossip")) return true;
  return false;
}

function isPriceShockRow(p: PredRow): boolean {
  if (String(p.source || "").toLowerCase() === "price-shock") return true;
  const id = String(p.id || "").toLowerCase();
  if (id.startsWith("ps_")) return true;
  return false;
}

function isCatalystWatchRow(p: PredRow): boolean {
  if (String(p.source || "").toLowerCase() === "catalyst-watch") return true;
  const id = String(p.id || "");
  if (id.toLowerCase().startsWith("cw_")) return true;
  return false;
}

function catalystWatchThemeLabel(row: PredRow): string {
  const c = String(row.cluster || "").toLowerCase();
  if (c === "musk_intel") return "Musk / Tesla / Intel";
  if (c === "fed_pivot") return "Fed policy / yields / inflation";
  if (c === "us_china_trade") return "US–China trade & export controls";
  if (c === "energy_incident") return "Energy / supply disruption";
  return "Macro / catalyst headlines";
}

function ageMinutesFromIso(iso: string | undefined): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  return (Date.now() - t) / 60000;
}

function formatRelativePulse(iso: string | undefined): string {
  const mins = ageMinutesFromIso(iso);
  if (mins == null || !Number.isFinite(mins)) return "watching";
  if (mins < 1 / 60) return "just now";
  if (mins < 1) return `${Math.max(1, Math.round(mins * 60))}s ago`;
  if (mins < 60) return `${Math.round(mins)}m ago`;
  const h = Math.floor(mins / 60);
  const rm = Math.round(mins % 60);
  if (h < 48) return rm > 0 ? `${h}h ${rm}m ago` : `${h}h ago`;
  return `${Math.round(mins / 1440)}d ago`;
}

/** Wall-safe labels: avoid Long/Short trade wording on /display. */
function mapPressureCallLabel(call: unknown): string {
  const c = String(call ?? "")
    .trim()
    .toLowerCase();
  if (c === "long") return "Upside pressure";
  if (c === "short") return "Downside pressure";
  if (c === "watch") return "Awareness watch";
  const raw = String(call ?? "").trim();
  return raw || "—";
}

function trimDisplayLine(s: string, max: number): string {
  const t = String(s || "")
    .replace(/\s+/g, " ")
    .trim();
  if (t.length <= max) return t;
  return `${t.slice(0, Math.max(0, max - 1))}…`;
}

function isPlaceholderNewsArticles(articles: { title?: string }[]): boolean {
  if (!articles?.length || articles.length !== 1) return false;
  const t = String(articles[0]?.title || "");
  return (
    t.includes("News temporarily unavailable") ||
    t.includes("No high-quality market headlines passed the relevance filter") ||
    t === "Loading..."
  );
}

function isPlaceholderShockArticles(articles: { title?: string }[]): boolean {
  if (!articles?.length) return true;
  if (articles.length !== 1) return false;
  const t = String(articles[0]?.title || "");
  return (
    t.includes("Global shock watch temporarily unavailable") ||
    t.includes("No geopolitical shock headlines matched")
  );
}

function fmtUsd(n: unknown, digits = 2): string | null {
  const x = Number(n);
  if (!Number.isFinite(x)) return null;
  return `$${x.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}

function fmtCh(n: unknown): string | null {
  const x = Number(n);
  if (!Number.isFinite(x)) return null;
  const sign = x >= 0 ? "+" : "";
  return `${sign}${x.toFixed(2)}%`;
}

function chgToneClass(raw: unknown): string {
  const x = Number(raw);
  if (!Number.isFinite(x)) return "text-slate-500";
  if (x > 0.05) return "text-emerald-400 font-semibold";
  if (x < -0.05) return "text-red-400 font-semibold";
  return "text-amber-300/90 font-semibold";
}

function chgBarClass(raw: unknown): string {
  const x = Number(raw);
  if (!Number.isFinite(x)) return "bg-slate-600/60";
  if (x > 0.05) return "bg-emerald-500";
  if (x < -0.05) return "bg-red-500";
  return "bg-amber-500/80";
}

function buildMarketReadTwoLines(input: {
  intensity: number | null;
  topCluster: string | null;
  topTheme: string | null;
}): [string, string] {
  const { intensity, topCluster, topTheme } = input;
  let line1 = "Low heat · Watching spots and headlines.";
  if (typeof intensity === "number" && Number.isFinite(intensity)) {
    if (intensity >= 7) line1 = `High heat · Gossip ${intensity}/10 — many concurrent threads.`;
    else if (intensity >= 4) line1 = `Moderate heat · Gossip ${intensity}/10 on the wire.`;
    else line1 = `Low heat · Gossip ${intensity}/10 — routine scan band.`;
  }
  let line2 = "No highlighted catalyst cluster on this sweep.";
  const c = (topCluster || "").toLowerCase();
  if (c === "us_china_trade" || c.includes("us_china") || c.includes("china")) {
    line2 = "US–China trade cluster active on the wire.";
  } else if (topTheme && topCluster) {
    line2 = trimDisplayLine(`${topTheme} — cluster ${topCluster} active.`, 110);
  }
  return [trimDisplayLine(line1, 95), trimDisplayLine(line2, 95)];
}

/** Single header line: heat + gossip score + catalyst context (no long filler clauses). */
function buildMarketWeatherOneLine(input: {
  intensity: number | null;
  topCluster: string | null;
  topTheme: string | null;
}): string {
  const [l1, l2] = buildMarketReadTwoLines(input);
  const l1c = l1
    .replace(/\s*—\s*many concurrent threads\.?$/i, "")
    .replace(/\s*—\s*routine scan band\.?$/i, "")
    .replace(/\s+on the wire\.?$/i, "");
  return trimDisplayLine(`${l1c} · ${l2}`, 200);
}

/** 24h path from last price + 24h % only — no extra HTTP. Stroke tuned for TV distance viewing. */
function MiniAreaTrendSvg({ gid, price, chPct }: { gid: string; price: number; chPct: number }) {
  const n = 18;
  const start = price / (1 + chPct / 100);
  let minV = Math.min(start, price);
  let maxV = Math.max(start, price);
  const span = maxV - minV || Math.abs(price) * 1e-6 || 1;
  const pad = span * 0.12;
  minV -= pad;
  maxV += pad;
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const v = start + (price - start) * t;
    const x = (i / (n - 1)) * 100;
    const y = 36 - ((v - minV) / (maxV - minV)) * 28 - 4;
    pts.push({ x, y });
  }
  const lineD = pts.map((pt, i) => `${i === 0 ? "M" : "L"}${pt.x.toFixed(2)},${pt.y.toFixed(2)}`).join(" ");
  const areaD = `${lineD} L100,40 L0,40 Z`;
  const up = chPct >= 0;
  const stroke = up ? "#5eead4" : "#fb7185";
  const g0 = up ? "#14b8a6" : "#ef4444";
  return (
    <svg viewBox="0 0 100 40" className="h-10 w-[118px] shrink-0" preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id={`a-${gid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={g0} stopOpacity="0.72" />
          <stop offset="100%" stopColor={g0} stopOpacity="0.06" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#a-${gid})`} />
      <path
        d={lineD}
        fill="none"
        stroke={stroke}
        strokeWidth="2.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type PricesState = Record<string, unknown> | null;

export default function DisplayPage() {
  const [searchParams] = useSearchParams();
  const tierParam = (searchParams.get("tier") || "auto").toLowerCase();

  const [clock, setClock] = useState(() => new Date());
  const [lifecycle, setLifecycle] = useState<DisplayLifecycle>("PRO_PREVIEW");

  const [healthOk, setHealthOk] = useState<boolean | null>(null);
  const [prices, setPrices] = useState<PricesState>(null);
  const [predictions, setPredictions] = useState<PredRow[]>([]);
  const [newsArticles, setNewsArticles] = useState<{ title?: string; url?: string }[]>([]);
  const [shockArticles, setShockArticles] = useState<{ title?: string; url?: string }[]>([]);
  const [gossip, setGossip] = useState<{
    intensity: number;
    spywords: string[];
    alerts: string[];
    headlines: { title: string; url: string }[];
  } | null>(null);

  const [tvSymbol, setTvSymbol] = useState<"FOREXCOM:XAUUSD" | "BINANCE:BTCUSDT">("FOREXCOM:XAUUSD");
  const [shockWireIdx, setShockWireIdx] = useState(0);

  const visualFree = useMemo(() => {
    if (tierParam === "free") return true;
    if (tierParam === "pro") return false;
    return lifecycle === "FREE_BILLBOARD";
  }, [tierParam, lifecycle]);

  const isProBoardroom = !visualFree;
  const showWarningBanner = tierParam === "auto" && lifecycle === "PRO_WARNING";
  const showUpgradeStrip = visualFree || showWarningBanner;

  const daysElapsed = typeof window !== "undefined" ? daysElapsedTrial() : 0;
  const daysLeftPro = Math.max(1, 31 - daysElapsed);

  useEffect(() => {
    const ob = document.body.style.overflow;
    const oh = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = ob;
      document.documentElement.style.overflow = oh;
    };
  }, []);

  useEffect(() => {
    ensureAnonymousDevice();
    const apply = () => {
      if (tierParam === "auto") setLifecycle(lifecycleFromTrial());
      else setLifecycle(tierParam === "free" ? "FREE_BILLBOARD" : "PRO_PREVIEW");
    };
    apply();
    if (tierParam !== "auto") return;
    const id = window.setInterval(apply, 5 * 60 * 1000);
    return () => window.clearInterval(id);
  }, [tierParam]);

  useEffect(() => {
    const id = window.setInterval(() => setClock(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      setTvSymbol((s) => (s === "FOREXCOM:XAUUSD" ? "BINANCE:BTCUSDT" : "FOREXCOM:XAUUSD"));
    }, TV_ROTATE_MS);
    return () => window.clearInterval(id);
  }, []);

  const sweep = useCallback(async () => {
    const [hp, pp, np, nsh, gp] = await Promise.all([
      fetch(apiUrl("/api/health"), { cache: "no-store" }).catch(() => null),
      fetch(apiUrl("/api/prices"), { cache: "no-store" }).catch(() => null),
      fetch(apiUrl("/api/news"), { cache: "no-store" }).catch(() => null),
      fetch(apiUrl("/api/news-shock"), { cache: "no-store" }).catch(() => null),
      fetch(apiUrl("/api/gossip"), { cache: "no-store" }).catch(() => null),
    ]);
    const predP = await fetch(apiUrl("/api/predictions?limit=50"), { cache: "no-store" }).catch(() => null);

    if (hp?.ok) {
      try {
        const j = await hp.json();
        setHealthOk(j?.status === "ok");
      } catch {
        setHealthOk(false);
      }
    } else setHealthOk(false);

    if (pp?.ok) {
      try {
        const j = await pp.json();
        setPrices((j?.prices ?? j) as PricesState);
      } catch {
        setPrices(null);
      }
    } else setPrices(null);

    if (predP?.ok) {
      try {
        const j = await predP.json();
        setPredictions(Array.isArray(j.items) ? j.items : []);
      } catch {
        setPredictions([]);
      }
    } else setPredictions([]);

    if (np?.ok) {
      try {
        const j = await np.json();
        setNewsArticles(Array.isArray(j.articles) ? j.articles : []);
      } catch {
        setNewsArticles([]);
      }
    } else setNewsArticles([]);

    if (nsh?.ok) {
      try {
        const j = await nsh.json();
        setShockArticles(Array.isArray(j.articles) ? j.articles : []);
      } catch {
        setShockArticles([]);
      }
    } else setShockArticles([]);

    if (gp?.ok) {
      try {
        const j = await gp.json();
        setGossip({
          intensity: Number(j.intensity) || 0,
          spywords: Array.isArray(j.spywords) ? j.spywords : [],
          alerts: Array.isArray(j.alerts) ? j.alerts : [],
          headlines: Array.isArray(j.headlines) ? j.headlines : [],
        });
      } catch {
        setGossip(null);
      }
    } else setGossip(null);
  }, []);

  useEffect(() => {
    void sweep();
    const id = window.setInterval(() => void sweep(), SWEEP_MS);
    return () => window.clearInterval(id);
  }, [sweep]);

  const catalystGroups = useMemo((): CatalystGroup[] => {
    const rows = predictions.filter(isCatalystWatchRow);
    const by = new Map<string, PredRow[]>();
    for (const r of rows) {
      const k = String(r.cluster || "default");
      if (!by.has(k)) by.set(k, []);
      by.get(k)!.push(r);
    }
    const out: CatalystGroup[] = [];
    for (const [, list] of by) {
      list.sort((a, b) => (Date.parse(String(b.time || "")) || 0) - (Date.parse(String(a.time || "")) || 0));
      const head = list[0];
      const assets = [...new Set(list.map((x) => String(x.asset || "").trim()).filter(Boolean))];
      if (!assets.length) continue;
      const t0 = Date.parse(String(head.time || "")) || 0;
      out.push({
        cluster: String(head.cluster || ""),
        theme: catalystWatchThemeLabel(head),
        assets: assets.join(" · "),
        window: String(head.timeframe || head.horizon || "—"),
        rel: formatRelativePulse(head.time),
        _ts: t0,
      });
    }
    out.sort((a, b) => b._ts - a._ts);
    return out.slice(0, 4);
  }, [predictions]);

  const pulseRowsThree = useMemo(() => {
    return predictions
      .filter((r) => isPriceShockRow(r) || isFastPulseRow(r))
      .sort((a, b) => (Date.parse(String(b.time || "")) || 0) - (Date.parse(String(a.time || "")) || 0))
      .slice(0, 3);
  }, [predictions]);

  const pressureRowsVisible = pulseRowsThree.slice(0, 2);
  const pressureMoreCount = Math.max(0, pulseRowsThree.length - pressureRowsVisible.length);

  const p = prices && typeof prices === "object" ? prices : null;
  const spotDefs = [
    { key: "gold", label: "Gold", sub: "XAU / GC", raw: p?.gold, rawCh: p?.goldCh },
    { key: "oil", label: "Oil", sub: "WTI / CL", raw: p?.oil, rawCh: p?.oilCh },
    { key: "btc", label: "BTC", sub: "USD", raw: p?.btc, rawCh: p?.btcCh },
    { key: "eth", label: "ETH", sub: "USD", raw: p?.eth, rawCh: p?.ethCh },
  ] as const;

  const headlineFive = useMemo(() => {
    if (!newsArticles.length || isPlaceholderNewsArticles(newsArticles)) return [];
    return newsArticles
      .slice(0, 5)
      .map((a) => String(a.title || "").replace(/\s+/g, " ").trim())
      .filter(Boolean);
  }, [newsArticles]);

  const newsWireTickerLine = useMemo(() => {
    if (!headlineFive.length) return "";
    return headlineFive.join("  ·  ");
  }, [headlineFive]);

  const shockHeadlineThree = useMemo(() => {
    if (!shockArticles.length || isPlaceholderShockArticles(shockArticles)) return [];
    return shockArticles
      .slice(0, 3)
      .map((a) => trimDisplayLine(String(a.title || "").trim(), 240))
      .filter(Boolean);
  }, [shockArticles]);

  useEffect(() => {
    setShockWireIdx(0);
  }, [shockHeadlineThree]);

  useEffect(() => {
    if (shockHeadlineThree.length <= 1) return;
    const id = window.setInterval(() => {
      setShockWireIdx((i) => (i + 1) % shockHeadlineThree.length);
    }, NEWS_WIRE_ROTATE_MS);
    return () => window.clearInterval(id);
  }, [shockHeadlineThree]);

  const weatherOneLine = useMemo(
    () =>
      buildMarketWeatherOneLine({
        intensity: gossip?.intensity ?? null,
        topCluster: catalystGroups[0]?.cluster ?? null,
        topTheme: catalystGroups[0]?.theme ?? null,
      }),
    [gossip?.intensity, catalystGroups],
  );

  const catalystWatchStripText = useMemo(() => {
    if (!catalystGroups.length) return "No highlighted cluster on this sweep.";
    const segments: string[] = [];
    for (const g of catalystGroups) {
      const c = String(g.cluster || "")
        .trim()
        .toUpperCase()
        .replace(/\s+/g, "_");
      if (c) segments.push(c);
      for (const tok of g.assets.split("·")) {
        const t = tok.trim();
        if (t) segments.push(t);
      }
    }
    return segments.join(" · ");
  }, [catalystGroups]);

  /** Only NVDA/INTC have live % on /api/prices today; others stay "—" until wired on the server. */
  const hotSectorRows = useMemo(() => {
    const specs = [
      ["NVDA", "nvda"],
      ["INTC", "intc"],
      ["TSM", null],
      ["AVGO", null],
      ["MU", null],
      ["SMCI", null],
    ] as const;
    const liveKeys = new Set(["nvda", "intc"]);
    const pr = p && typeof p === "object" ? (p as Record<string, unknown>) : null;
    return specs.map(([sym, key]) => {
      if (!key || !pr || !liveKeys.has(key)) return { sym, chRaw: null as unknown, hasLiveCh: false };
      const chKey = `${key}Ch`;
      if (!Object.prototype.hasOwnProperty.call(pr, chKey)) return { sym, chRaw: null as unknown, hasLiveCh: false };
      const raw = pr[chKey];
      if (raw === null || raw === undefined) return { sym, chRaw: null as unknown, hasLiveCh: false };
      const n = Number(raw);
      if (!Number.isFinite(n)) return { sym, chRaw: null as unknown, hasLiveCh: false };
      return { sym, chRaw: raw, hasLiveCh: true };
    });
  }, [p]);

  const statusColor =
    healthOk === true ? "bg-emerald-500" : healthOk === false ? "bg-amber-500" : "bg-slate-500";

  const hotSectorsBlock = (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-cyan-500/35 bg-gradient-to-b from-cyan-950/40 via-[#0a1018] to-black/80 px-1.5 py-1.5 shadow-[0_0_36px_-12px_rgba(34,211,238,0.25),inset_0_1px_0_rgba(255,255,255,0.06)]">
      <span className="sr-only">
        Twenty-four hour percent from the sweep when the ticker is on the price feed: NVDA and INTC only. Other symbols are labels until wired.
      </span>
      <div className="shrink-0 text-[9px] font-bold uppercase tracking-[0.22em] text-cyan-200 drop-shadow-[0_0_8px_rgba(34,211,238,0.45)]">
        Hot sectors
      </div>
      <div className="mt-0.5 shrink-0 text-[9px] font-bold uppercase tracking-[0.18em] text-violet-200/95 [text-shadow:0_0_14px_rgba(167,139,250,0.35)]">
        AI / Semiconductors
      </div>
      <div className="mt-1 grid min-h-0 min-w-0 flex-1 grid-cols-2 grid-rows-3 gap-x-1 gap-y-0.5 overflow-hidden text-center font-mono">
        {hotSectorRows.map((row, i) => {
          const chStr = row.hasLiveCh ? fmtCh(row.chRaw) : null;
          return (
            <div
              key={row.sym}
              className={`flex min-h-0 min-w-0 flex-col items-center justify-center overflow-hidden rounded border px-0.5 py-0.5 [text-shadow:0_0_10px_rgba(255,255,255,0.2)] ${
                i % 2 === 0
                  ? "border-cyan-400/45 bg-gradient-to-br from-cyan-900/50 via-slate-900/95 to-slate-950 shadow-[0_0_14px_-6px_rgba(34,211,238,0.4),inset_0_1px_0_rgba(255,255,255,0.1)]"
                  : "border-violet-400/40 bg-gradient-to-br from-violet-950/55 via-slate-900/95 to-slate-950 shadow-[0_0_14px_-6px_rgba(167,139,250,0.3),inset_0_1px_0_rgba(255,255,255,0.08)]"
              }`}
            >
              <span className="text-[10px] font-black leading-none tracking-wide text-white">{row.sym}</span>
              {chStr ? (
                <span className={`mt-0.5 text-[9px] font-bold leading-none tabular-nums ${chgToneClass(row.chRaw)}`}>
                  {chStr}
                </span>
              ) : (
                <span className="mt-0.5 text-[9px] font-semibold leading-none tabular-nums text-slate-500">—</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  const catalystWatchStripEl = (
    <div className="flex min-h-[2.5rem] min-w-0 flex-1 items-center gap-2 rounded-lg border border-amber-500/35 bg-amber-950/25 px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400/90">Catalyst watch</span>
      <div className="min-w-0 flex-1 overflow-x-auto">
        <span className="inline-block whitespace-nowrap font-mono text-[11px] text-amber-50/95 md:text-xs">{catalystWatchStripText}</span>
      </div>
    </div>
  );

  const newsWireCard = (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-emerald-500/30 bg-black/50 p-3 shadow-inner">
      <div className="flex min-h-0 min-w-0 flex-[2.35] flex-col overflow-hidden pb-4">
        <div className="flex shrink-0 items-baseline justify-between gap-2">
          <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-emerald-300/90">News wire</div>
          <span className="shrink-0 text-[10px] font-medium text-slate-500">Market headlines · live</span>
        </div>
        <div className="mt-2 flex min-h-0 min-w-0 flex-1 flex-col justify-center overflow-hidden">
          {headlineFive.length === 0 ? (
            <p className="text-sm font-medium leading-snug text-slate-500">No headlines on this sweep.</p>
          ) : (
            <>
              <style>{`
                @keyframes display-news-wire-ticker {
                  0% { transform: translateX(0); }
                  100% { transform: translateX(-50%); }
                }
                .display-news-wire-ticker-track {
                  animation: display-news-wire-ticker ${NEWS_WIRE_TICKER_MS}ms linear infinite;
                  will-change: transform;
                }
              `}</style>
              <div
                className="relative min-h-[2.75rem] w-full overflow-hidden"
                aria-live="polite"
                aria-label="Market headlines ticker"
              >
                <div className="display-news-wire-ticker-track flex w-max whitespace-nowrap">
                  <span className="inline-block shrink-0 px-6 text-sm font-semibold leading-snug text-slate-100 md:text-base">
                    {newsWireTickerLine}
                  </span>
                  <span
                    className="inline-block shrink-0 px-6 text-sm font-semibold leading-snug text-slate-100 md:text-base"
                    aria-hidden
                  >
                    {newsWireTickerLine}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex min-h-0 min-w-0 flex-[0.95] shrink-0 flex-col overflow-hidden border-t border-rose-500/25 pt-3">
        <div className="flex shrink-0 items-baseline justify-between gap-2">
          <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-rose-300/90">Global shock watch</div>
          {shockHeadlineThree.length > 1 ? (
            <div className="text-[10px] font-medium tabular-nums text-slate-500" aria-live="polite">
              {shockWireIdx + 1} / {shockHeadlineThree.length} · auto
            </div>
          ) : null}
        </div>
        <div className="mt-1.5 flex min-h-0 min-w-0 flex-1 flex-col justify-start overflow-hidden pb-0.5">
          {shockHeadlineThree.length === 0 ? (
            <p className="line-clamp-2 text-xs font-medium leading-snug text-slate-500 md:text-sm">
              No global shock headlines in this sweep.
            </p>
          ) : (
            <div className="flex min-h-0 min-w-0 flex-1 flex-col justify-start overflow-hidden">
              {shockHeadlineThree.length > 1 ? (
                <div className="mb-1.5 flex shrink-0 justify-center gap-2" aria-hidden>
                  {shockHeadlineThree.map((_, i) => (
                    <span
                      key={i}
                      className={`h-1.5 w-1.5 rounded-full transition-colors duration-300 ${i === shockWireIdx ? "bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.4)]" : "bg-slate-600"}`}
                    />
                  ))}
                </div>
              ) : null}
              <div key={shockWireIdx} className="min-w-0 flex-1 overflow-hidden">
                <div className="font-mono text-xs font-bold text-rose-400/90">{shockWireIdx + 1}.</div>
                <p
                  className="mt-1.5 line-clamp-2 min-h-0 break-words text-sm font-semibold leading-snug text-rose-50/95 md:text-base"
                  aria-live="polite"
                  title={shockHeadlineThree[shockWireIdx]}
                >
                  {shockHeadlineThree[shockWireIdx]}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const shocksCard = (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-orange-500/35 bg-gradient-to-b from-orange-950/40 to-black/80 p-2.5 shadow-[0_0_24px_-8px_rgba(249,115,22,0.2)]">
      <div className="shrink-0 text-[10px] font-bold uppercase tracking-[0.22em] text-orange-200/95">Live Pressure Watch</div>
      <div className="mt-1.5 flex min-h-0 flex-1 flex-col justify-center gap-1.5 overflow-hidden">
        {pulseRowsThree.length === 0 ? (
          <div className="space-y-1.5 overflow-hidden">
            <p className="line-clamp-2 text-sm font-medium leading-snug text-slate-300">No active price shocks in this sweep.</p>
            <p className="line-clamp-2 text-xs leading-snug text-slate-500">Market is being monitored for unusual moves.</p>
          </div>
        ) : (
          <>
            {pressureRowsVisible.map((r) => (
              <div
                key={r.id || `${r.source}-${r.time}`}
                className="min-w-0 shrink-0 overflow-hidden rounded-md border border-orange-400/25 bg-black/35 px-2 py-1.5"
              >
                <div className="truncate text-sm font-bold leading-tight text-orange-50">
                  {String(r.asset || "—")} · {mapPressureCallLabel(r.call)}
                </div>
                <div className="truncate text-[11px] leading-tight text-slate-400">
                  {String(r.timeframe || r.horizon || "—")} · {formatRelativePulse(r.time)}
                </div>
                <p className="line-clamp-1 text-[10px] leading-tight text-slate-400">Move detected near model threshold.</p>
              </div>
            ))}
            {pressureMoreCount > 0 ? (
              <div className="shrink-0 pt-0.5 text-center text-[10px] font-medium tabular-nums text-slate-500">
                +{pressureMoreCount} more monitored
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );

  const chartBlock = (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-700/50 bg-[#06080c] p-2 shadow-inner">
      <div className="mb-2 flex shrink-0 flex-wrap items-end justify-between gap-2 px-1">
        <div className="text-sm font-bold uppercase tracking-[0.12em] text-slate-100 md:text-base">
          {tvSymbol.includes("XAU") ? "Gold / U.S. dollar" : "Bitcoin / USD"}
        </div>
        <div className="text-[10px] font-medium text-slate-500">Gold ↔ BTC · auto</div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col">
        <TvEmbed key={tvSymbol} symbol={tvSymbol} height={400} interval="60" ambient />
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-0 flex h-[100dvh] max-h-[100dvh] w-screen max-w-[100vw] flex-col overflow-hidden bg-[#0B0E11] text-slate-100">
      <div
        className="pointer-events-none absolute inset-0 z-[1]"
        style={{
          background: `
            radial-gradient(ellipse 90% 55% at 50% 0%, rgba(45,212,191,0.06), transparent 50%),
            linear-gradient(rgba(148,163,184,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(148,163,184,0.04) 1px, transparent 1px)
          `,
          backgroundSize: "100% 100%, 48px 48px, 48px 48px",
        }}
      />

      <header className="relative z-10 grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-3 border-b border-white/[0.07] bg-black/55 px-4 py-3 md:px-6">
        <div className="min-w-0 justify-self-start">
          <span
            className={`block truncate font-bold uppercase tracking-[0.12em] ${visualFree ? "text-base text-cyan-300 md:text-lg" : "text-sm text-slate-100 md:text-base"}`}
          >
            SentoTrade Display
          </span>
          <span className="hidden text-[11px] uppercase tracking-widest text-slate-600 sm:block">
            {isProBoardroom ? "Boardroom" : "Public"} · live sweep
          </span>
        </div>
        <div className="max-w-[min(78vw,52rem)] min-w-0 justify-self-center px-2 text-center">
          <p className="line-clamp-2 text-sm font-semibold leading-snug text-slate-100 md:text-base">
            {weatherOneLine}
          </p>
        </div>
        <div className="flex items-center justify-end gap-3 justify-self-end tabular-nums">
          <time className="text-lg font-semibold text-slate-100 md:text-xl" dateTime={clock.toISOString()}>
            {clock.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </time>
          <span className={`h-3 w-3 shrink-0 rounded-full ${statusColor}`} title={healthOk ? "Online" : "Degraded"} />
        </div>
      </header>

      {/* Mobile / narrow: stacked */}
      <div className="relative z-10 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overflow-x-hidden px-3 py-3 lg:hidden">
        <section className="shrink-0 space-y-2">
          <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-amber-200/80">Spot · /api/prices</div>
          <div className="grid grid-cols-2 gap-2">
            {spotDefs.map((def) => (
              <BigSpotTile
                key={def.key}
                gid={def.key}
                label={def.label}
                sub={def.sub}
                value={fmtUsd(def.raw)}
                changeStr={fmtCh(def.rawCh)}
                changeRaw={def.rawCh}
                priceNum={Number(def.raw)}
                chNum={Number(def.rawCh)}
                compact
              />
            ))}
          </div>
        </section>
        {catalystWatchStripEl}
        <div className="grid min-h-0 shrink-0 grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-2">
          <div className="flex h-full min-h-[11rem] min-w-0 flex-col overflow-hidden sm:min-h-[12rem]">{hotSectorsBlock}</div>
          <div className="flex h-full min-h-[11rem] min-w-0 flex-col overflow-hidden sm:min-h-[12rem]">{newsWireCard}</div>
          <div className="flex h-full min-h-[11rem] min-w-0 flex-col overflow-hidden sm:min-h-[12rem]">{shocksCard}</div>
        </div>
        <div className="min-h-[260px] shrink-0 flex-1">{chartBlock}</div>
      </div>

      {/* Desktop: spots + strip + 3 cards + chart */}
      <div
        className="relative z-10 hidden min-h-0 flex-1 gap-3 overflow-hidden px-4 pb-3 pt-3 md:px-5 lg:grid"
        style={{
          gridTemplateAreas: `"spots strip strip strip" "spots hot news shocks" "spots chart chart chart"`,
          gridTemplateColumns: "minmax(248px, 0.95fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)",
          gridTemplateRows: "auto minmax(0, 1fr) minmax(260px, 44vh)",
        }}
      >
        <section
          className="flex min-h-0 flex-col gap-2 overflow-hidden rounded-xl border border-white/[0.08] bg-black/35 p-3"
          style={{ gridArea: "spots" }}
        >
          <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-amber-200/85">Spot · prices</div>
          <div className="flex min-h-0 flex-1 flex-col justify-between gap-2">
            {spotDefs.map((def) => (
              <BigSpotTile
                key={def.key}
                gid={def.key}
                label={def.label}
                sub={def.sub}
                value={fmtUsd(def.raw)}
                changeStr={fmtCh(def.rawCh)}
                changeRaw={def.rawCh}
                priceNum={Number(def.raw)}
                chNum={Number(def.rawCh)}
                compact={false}
              />
            ))}
          </div>
        </section>

        <div className="flex min-h-0 min-w-0 items-stretch" style={{ gridArea: "strip" }}>
          {catalystWatchStripEl}
        </div>

        <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden" style={{ gridArea: "hot" }}>
          {hotSectorsBlock}
        </div>
        <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden" style={{ gridArea: "news" }}>
          {newsWireCard}
        </div>
        <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden" style={{ gridArea: "shocks" }}>
          {shocksCard}
        </div>

        <div className="min-h-0 overflow-hidden" style={{ gridArea: "chart" }}>
          {chartBlock}
        </div>
      </div>

      {showUpgradeStrip && (
        <div className="relative z-10 shrink-0 border-t border-amber-500/25 bg-gradient-to-r from-amber-950/50 via-black/80 to-amber-950/40 px-4 py-3 md:px-6">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
            <div className="min-w-0 flex-1 text-sm leading-snug text-amber-50 md:text-base">
              {showWarningBanner && (
                <p className="font-semibold text-amber-100">
                  Display Pro preview ends in {daysLeftPro} day{daysLeftPro === 1 ? "" : "s"}. Open{" "}
                  <span className="text-cyan-300">sentotrade.io</span> to keep this layout.
                </p>
              )}
              {visualFree && (
                <p className={showWarningBanner ? "mt-1 text-amber-100/90" : "font-medium text-amber-100/95"}>
                  Free display tier · Open the full radar, Live Edge Tests, and Trader Desk at{" "}
                  <span className="font-semibold text-cyan-300">sentotrade.io</span>
                </p>
              )}
            </div>
            <div className="flex shrink-0 flex-col items-center gap-1 rounded-xl border border-amber-500/35 bg-black/50 px-4 py-3 text-center shadow-lg">
              <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500">Scan for full radar</div>
              <div
                className="flex h-20 w-20 items-center justify-center rounded-lg border-2 border-dashed border-slate-600 bg-slate-900/90 text-[10px] font-bold text-slate-500"
                aria-hidden
              >
                QR
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="relative z-10 shrink-0 border-t border-cyan-500/20 bg-black/90 px-3 py-2.5">
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-lg font-bold tabular-nums md:text-xl">
          {fmtCh(p?.goldCh) && (
            <span className="whitespace-nowrap">
              <span className="text-slate-400">Gold</span> <span className={chgToneClass(p?.goldCh)}>{fmtCh(p?.goldCh)}</span>
            </span>
          )}
          {fmtCh(p?.oilCh) && (
            <span className="whitespace-nowrap">
              <span className="text-slate-400">WTI</span> <span className={chgToneClass(p?.oilCh)}>{fmtCh(p?.oilCh)}</span>
            </span>
          )}
          {fmtCh(p?.btcCh) && (
            <span className="whitespace-nowrap">
              <span className="text-slate-400">BTC</span> <span className={chgToneClass(p?.btcCh)}>{fmtCh(p?.btcCh)}</span>
            </span>
          )}
          {fmtCh(p?.ethCh) && (
            <span className="whitespace-nowrap">
              <span className="text-slate-400">ETH</span> <span className={chgToneClass(p?.ethCh)}>{fmtCh(p?.ethCh)}</span>
            </span>
          )}
          {!fmtCh(p?.goldCh) && !fmtCh(p?.oilCh) && !fmtCh(p?.btcCh) && !fmtCh(p?.ethCh) && (
            <span className="text-slate-500">Waiting for /api/prices…</span>
          )}
        </div>
      </div>

      <footer className="relative z-10 shrink-0 border-t border-white/[0.05] bg-black/70 px-3 py-1.5">
        <p className="text-center text-[10px] leading-tight text-slate-600 md:text-[11px]">
          Market awareness only · Not financial advice · Not a broker · {Math.round(SWEEP_MS / 60000)}m sweep
          {!visualFree && tierParam === "pro" && typeof window !== "undefined" && localStorage.getItem(LS_PRO_ACTIVE) !== "true" && (
            <span className="text-slate-600"> · URL preview — not billing</span>
          )}
        </p>
        <p className="mt-1 text-center text-[10px] leading-tight text-slate-500 md:text-[11px]">
          <a
            href="https://sentotrade.io"
            className="text-cyan-500/90 underline-offset-2 hover:text-cyan-300 hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            sentotrade.io
          </a>
          <span className="text-slate-600"> · </span>
          <a
            href="https://sentotrade.io/#/display?tier=pro"
            className="text-slate-400 underline-offset-2 hover:text-slate-200 hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            View live display
          </a>
        </p>
      </footer>
    </div>
  );
}

function BigSpotTile({
  gid,
  label,
  sub,
  value,
  changeStr,
  changeRaw,
  priceNum,
  chNum,
  compact,
}: {
  gid: string;
  label: string;
  sub: string;
  value: string | null;
  changeStr: string | null;
  changeRaw: unknown;
  priceNum: number;
  chNum: number;
  compact?: boolean;
}) {
  const showSpark = Number.isFinite(priceNum) && Number.isFinite(chNum);
  return (
    <div className="flex min-h-0 flex-1 flex-row items-stretch justify-between gap-2 overflow-hidden rounded-xl border border-white/[0.1] bg-gradient-to-b from-white/[0.06] to-black/55 px-3 py-2.5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]">
      <div className="flex min-w-0 flex-1 flex-col justify-center">
        <div className={`font-bold uppercase tracking-[0.14em] text-amber-200/90 ${compact ? "text-[10px]" : "text-xs"}`}>{label}</div>
        <div className="text-[10px] text-slate-500">{sub}</div>
        {value ? (
          <>
            <div
              className={`mt-1 font-black tabular-nums leading-none tracking-tight text-white ${compact ? "text-2xl" : "text-3xl lg:text-4xl"}`}
            >
              {value}
            </div>
            {changeStr ? (
              <div className={`mt-1 tabular-nums ${compact ? "text-sm" : "text-base lg:text-lg"} ${chgToneClass(changeRaw)}`}>
                {changeStr} <span className="font-normal text-slate-500">24h</span>
              </div>
            ) : null}
          </>
        ) : (
          <div className="mt-1 text-sm text-slate-500">Watching</div>
        )}
        <div className="mt-auto pt-2">
          <div className="h-1 w-full overflow-hidden rounded-full bg-slate-900/90 ring-1 ring-white/5">
            <div className={`h-full w-full rounded-full ${chgBarClass(changeRaw)} opacity-90`} />
          </div>
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end justify-center self-center">
        {showSpark ? <MiniAreaTrendSvg gid={gid} price={priceNum} chPct={chNum} /> : (
          <div className="h-10 w-[118px] shrink-0 rounded bg-slate-900/60" />
        )}
      </div>
    </div>
  );
}
