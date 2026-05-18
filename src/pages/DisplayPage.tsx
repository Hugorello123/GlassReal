// src/pages/DisplayPage.tsx — TV / boardroom display (Step 27a-3). No mock market data.
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { apiUrl } from "@/lib/sameOriginApi";

const LS_DEVICE = "sento_display_device_id";
const LS_TRIAL_START = "sento_display_trial_started";
const LS_PRO_ACTIVE = "sento_display_pro_active";
const SWEEP_MS = 60_000;
/** Fresh catalyst callout in Breaking pulse (ribbon still lists all clusters). */
const ACTIVE_CATALYST_FRESH_MS = 15 * 60 * 1000;

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
  shockSeverity?: string;
  shockMovePct?: number;
};

type DisplayLifecycle = "PRO_PREVIEW" | "PRO_WARNING" | "FREE_BILLBOARD";

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

function parseFastGossipHeadline(why: string | undefined): string {
  const w = String(why || "");
  const m = w.match(/Fast gossip\s*\(\s*intensity\s*\d+\s*\)\s*:\s*(.*)/i);
  const tail = (m?.[1] ?? "").trim();
  return tail || w.trim();
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

function shortReason(p: PredRow, maxLen: number): string {
  let base: string;
  if (isCatalystWatchRow(p)) base = catalystWatchThemeLabel(p);
  else if (isPriceShockRow(p)) {
    const w = String(p.why || "").trim();
    base = w || "Price pressure — awareness.";
  } else {
    const h = parseFastGossipHeadline(p.why);
    base = h || "Headline heat — awareness.";
  }
  return trimDisplayLine(base, maxLen);
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
  if (x > 0) return "text-emerald-400 font-semibold";
  if (x < 0) return "text-red-400 font-semibold";
  return "text-slate-400";
}

type PricesState = Record<string, unknown> | null;

type CatalystGroup = {
  cluster: string;
  theme: string;
  assets: string;
  window: string;
  rel: string;
  _ts: number;
};

export default function DisplayPage() {
  const [searchParams] = useSearchParams();
  const tierParam = (searchParams.get("tier") || "auto").toLowerCase();

  const [clock, setClock] = useState(() => new Date());
  const [lifecycle, setLifecycle] = useState<DisplayLifecycle>("PRO_PREVIEW");
  const [lastSweepAt, setLastSweepAt] = useState<number | null>(null);
  const [tick, setTick] = useState(0);

  const [healthOk, setHealthOk] = useState<boolean | null>(null);
  const [prices, setPrices] = useState<PricesState>(null);
  const [predictions, setPredictions] = useState<PredRow[]>([]);
  const [newsArticles, setNewsArticles] = useState<{ title?: string; url?: string }[]>([]);
  const [gossip, setGossip] = useState<{
    intensity: number;
    spywords: string[];
    alerts: string[];
    headlines: { title: string; url: string }[];
  } | null>(null);

  const visualFree = useMemo(() => {
    if (tierParam === "free") return true;
    if (tierParam === "pro") return false;
    return lifecycle === "FREE_BILLBOARD";
  }, [tierParam, lifecycle]);

  const isProBoardroom = !visualFree;
  const showWarningBanner = tierParam === "auto" && lifecycle === "PRO_WARNING";

  const daysElapsed = typeof window !== "undefined" ? daysElapsedTrial() : 0;
  const daysLeftPro = Math.max(1, 31 - daysElapsed);

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
    const id = window.setInterval(() => setTick((x) => x + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  const sweep = useCallback(async () => {
    const t0 = Date.now();
    const [hp, pp, np, gp] = await Promise.all([
      fetch(apiUrl("/api/health"), { cache: "no-store" }).catch(() => null),
      fetch(apiUrl("/api/prices"), { cache: "no-store" }).catch(() => null),
      fetch(apiUrl("/api/news"), { cache: "no-store" }).catch(() => null),
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

    setLastSweepAt(t0);
  }, []);

  useEffect(() => {
    void sweep();
    const id = window.setInterval(() => void sweep(), SWEEP_MS);
    return () => window.clearInterval(id);
  }, [sweep]);

  const lastSweepLabel = useMemo(() => {
    if (!lastSweepAt) return "watching";
    const sec = Math.max(0, Math.floor((Date.now() - lastSweepAt) / 1000));
    if (sec < 5) return "just now";
    if (sec < 60) return `${sec}s ago`;
    return `${Math.floor(sec / 60)}m ago`;
  }, [lastSweepAt, tick]);

  const nextSweepSec = useMemo(() => {
    if (!lastSweepAt) return null;
    const elapsed = Date.now() - lastSweepAt;
    const rem = SWEEP_MS - (elapsed % SWEEP_MS);
    return Math.max(0, Math.ceil(rem / 1000));
  }, [lastSweepAt, tick]);

  /** One ribbon per cluster — avoids repeating the same catalyst story on four cards. */
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

  /** Newest cluster only, if last fire within 15m — one “Active catalyst” strip in Breaking pulse. */
  const activeCatalystFresh = useMemo(() => {
    const g = catalystGroups[0];
    if (!g || !g._ts) return null;
    if (Date.now() - g._ts > ACTIVE_CATALYST_FRESH_MS) return null;
    return g;
  }, [catalystGroups]);

  /** Pulse strip: price-shock + fast gossip; fresh catalyst also gets a single highlight card below. */
  const pulseRows = useMemo(() => {
    return predictions
      .filter((r) => isPriceShockRow(r) || isFastPulseRow(r))
      .sort((a, b) => (Date.parse(String(b.time || "")) || 0) - (Date.parse(String(a.time || "")) || 0))
      .slice(0, isProBoardroom ? 4 : 5);
  }, [predictions, isProBoardroom]);

  const newsHeadlines = useMemo(() => {
    const cap = isProBoardroom ? 5 : 6;
    if (!newsArticles.length || isPlaceholderNewsArticles(newsArticles)) return [];
    return newsArticles
      .slice(0, cap)
      .map((a) => String(a.title || "").trim())
      .filter(Boolean)
      .map((t) => trimDisplayLine(t, isProBoardroom ? 100 : 120));
  }, [newsArticles, isProBoardroom]);

  const p = prices && typeof prices === "object" ? prices : null;
  const spotDefs = [
    { key: "gold", label: "Gold", sub: "XAU / GC", raw: p?.gold, rawCh: p?.goldCh },
    { key: "oil", label: "Oil", sub: "WTI / CL", raw: p?.oil, rawCh: p?.oilCh },
    { key: "btc", label: "BTC", sub: "USD", raw: p?.btc, rawCh: p?.btcCh },
    { key: "eth", label: "ETH", sub: "USD", raw: p?.eth, rawCh: p?.ethCh },
  ] as const;

  const statusColor =
    healthOk === true ? "bg-emerald-500" : healthOk === false ? "bg-amber-500" : "bg-slate-500";

  return (
    <div
      className="relative min-h-0 h-[100dvh] w-full overflow-hidden text-slate-100 flex flex-col bg-[#070809]"
    >
      {/* Masks global VoiceAvatar (fixed top-20 left-4 z-50, w-10 h-10 rounded-full) — match size/shape to avoid edge halo */}
      <div
        className="fixed top-20 left-4 z-[100] h-10 w-10 rounded-full bg-[#070809] ring-1 ring-black/60 pointer-events-auto"
        aria-hidden
        title=""
      />

      {/* Burn-in: static very low-opacity wash only (no animated blobs that read as defects) */}
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.04]"
        style={{
          background:
            "radial-gradient(ellipse 100% 80% at 50% 0%, rgba(34,211,238,0.35), transparent 50%), radial-gradient(ellipse 80% 60% at 100% 100%, rgba(180,83,9,0.12), transparent 45%)",
        }}
      />

      {showWarningBanner && (
        <div className="relative z-20 shrink-0 border-b border-amber-500/30 bg-amber-950/40 px-3 py-1.5 text-center text-sm text-amber-100">
          Display Pro preview ends in {daysLeftPro} day{daysLeftPro === 1 ? "" : "s"}. Open{" "}
          <span className="font-semibold text-cyan-300">sentotrade.io</span> to keep this layout.
        </div>
      )}

      <header
        className={`relative z-10 shrink-0 flex items-center justify-between border-b border-white/[0.08] bg-black/50 px-4 ${
          isProBoardroom ? "py-2" : "py-2.5"
        }`}
      >
        <div className="flex items-baseline gap-2 min-w-0">
          <span
            className={`font-bold tracking-tight truncate ${
              visualFree ? "text-xl text-cyan-300" : "text-lg text-slate-100"
            }`}
          >
            SentoTrade Display
          </span>
          <span className="hidden md:inline text-slate-500 text-sm">{isProBoardroom ? "· Radar" : "· TV"}</span>
        </div>
        <div className="flex items-center gap-3 text-slate-200 tabular-nums text-base">
          <time dateTime={clock.toISOString()}>
            {clock.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </time>
          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${statusColor}`} title={healthOk ? "Online" : "Degraded"} />
        </div>
      </header>

      {/* TV grid: left stacked spots · right command deck */}
      <div className="relative z-10 flex-1 min-h-0 flex flex-col lg:flex-row gap-3 px-3 py-2 lg:px-4 lg:py-3">
        {/* Left — four stacked large tiles */}
        <section className="flex shrink-0 flex-col gap-2 lg:w-[min(26%,320px)] lg:min-w-[220px] lg:flex-initial lg:max-h-full">
          <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-200/70">Spot · /api/prices</div>
          <div className="grid min-h-0 flex-1 grid-rows-4 gap-2 lg:min-h-0">
            {spotDefs.map((def) => {
              const val = fmtUsd(def.raw);
              const ch = fmtCh(def.rawCh);
              return (
                <BigSpotTile
                  key={def.key}
                  label={def.label}
                  sub={def.sub}
                  value={val}
                  changeStr={ch}
                  changeRaw={def.rawCh}
                  compact={isProBoardroom}
                />
              );
            })}
          </div>
        </section>

        {/* Command panel — gossip hero + catalyst + headlines + pulse (no duplicate catalyst-watch labels) */}
        <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-cyan-500/15 bg-black/40 px-4 py-3 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03)]">
          <div className="mb-3 flex shrink-0 items-end justify-between gap-3 border-b border-white/[0.06] pb-2">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.25em] text-cyan-300/80">Gossip intensity</div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-5xl font-black tabular-nums leading-none tracking-tight text-white lg:text-6xl">
                  {gossip ? gossip.intensity : "—"}
                </span>
                <span className="text-3xl font-bold tabular-nums leading-none text-slate-500 lg:text-4xl">/</span>
                <span className="text-3xl font-bold tabular-nums leading-none text-slate-500 lg:text-4xl">10</span>
              </div>
            </div>
            <div className="text-right text-xs leading-tight text-slate-500">
              <div>Sweep {lastSweepLabel}</div>
              {nextSweepSec != null && <div className="text-cyan-600/80">Next {nextSweepSec}s</div>}
            </div>
          </div>

          {gossip && gossip.spywords.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {gossip.spywords.slice(0, 10).map((w, i) => (
                <span
                  key={i}
                  className="rounded-md border border-amber-500/25 bg-amber-950/30 px-3 py-1 text-sm font-semibold uppercase tracking-wide text-amber-100"
                >
                  {w}
                </span>
              ))}
            </div>
          )}

          <div className="mb-2 shrink-0">
            <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-200/80">Catalyst watch</div>
            {catalystGroups.length === 0 ? (
              <p className="mt-1 text-base text-slate-500">Watching — no catalyst cluster on the wire.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {catalystGroups.map((g) => (
                  <li
                    key={g.cluster}
                    className="rounded-lg border border-amber-500/20 bg-amber-950/20 px-3 py-2 text-lg leading-snug text-amber-50"
                  >
                    <span className="font-bold text-amber-200">{g.assets}</span>
                    <span className="text-amber-100/70"> — </span>
                    <span className="text-slate-200">{g.theme}</span>
                    <span className="text-slate-500"> · {g.window} · {g.rel}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="min-h-0 max-h-[32vh] shrink-0 overflow-y-auto overflow-x-hidden border-t border-white/[0.06] py-2 lg:max-h-none lg:overflow-hidden">
            <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Headlines</div>
            {newsHeadlines.length === 0 ? (
              <p className="mt-1 text-base text-slate-500">Watching — none right now.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {newsHeadlines.map((t, i) => (
                  <li key={i} className="text-lg leading-snug text-slate-100 line-clamp-2">
                    <span className="text-cyan-500/80">▸</span> {t}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-auto flex min-h-0 flex-1 flex-col overflow-hidden border-t border-white/[0.06] pt-2">
            <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-orange-300/80">Breaking pulse</div>
            {activeCatalystFresh && (
              <div className="mt-2 shrink-0 rounded-lg border border-amber-400/35 bg-amber-950/30 px-3 py-2">
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300">Active catalyst</div>
                <div className="mt-0.5 text-lg font-bold leading-tight text-amber-50">{activeCatalystFresh.assets}</div>
                <div className="text-sm text-slate-300">
                  {activeCatalystFresh.theme} · {activeCatalystFresh.window} · {activeCatalystFresh.rel}
                </div>
              </div>
            )}
            {pulseRows.length === 0 ? (
              <p className="mt-2 text-base text-slate-500">Watching — no price-shock or fast-gossip rows.</p>
            ) : (
              <ul className="mt-2 min-h-0 flex-1 space-y-2 overflow-y-auto overflow-x-hidden lg:overflow-hidden">
                {pulseRows.map((r) => (
                  <li
                    key={r.id || `${r.source}-${r.time}`}
                    className="rounded-lg border border-orange-500/20 bg-orange-950/15 px-3 py-2"
                  >
                    <div className="text-lg font-bold leading-tight text-orange-100">
                      {isPriceShockRow(r) ? "Price shock" : "Headline heat"}{" "}
                      <span className="text-slate-300">·</span> {String(r.asset || "—")}{" "}
                      <span className="text-slate-400">·</span> {String(r.call || "—")}
                    </div>
                    <div className="mt-0.5 text-sm text-slate-500">
                      {String(r.timeframe || r.horizon || "—")} · {formatRelativePulse(r.time)}
                    </div>
                    <p className="mt-1 line-clamp-2 text-base text-slate-300">{shortReason(r, 140)}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>

      {/* Full-width ticker */}
      <div className="relative z-10 shrink-0 border-t border-cyan-500/20 bg-black/60 py-3 text-center">
        <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500">AI / Semiconductors</div>
        <div className="mt-1 text-2xl font-bold tracking-[0.14em] text-cyan-200 md:text-3xl">
          NVDA · INTC · TSM · AVGO · MU · SMCI · SOUN
        </div>
      </div>

      <footer className="relative z-10 shrink-0 border-t border-white/[0.06] bg-black/60 px-3 py-2">
        {visualFree ? (
          <p className="text-center text-sm text-slate-100 md:text-base">
            Free Display Active · Powered by SentoTrade · Open full radar at{" "}
            <span className="font-semibold text-cyan-300">sentotrade.io</span>
          </p>
        ) : (
          <div>
            <p className="text-center text-sm text-slate-400">Display Pro preview · Powered by SentoTrade</p>
            {tierParam === "pro" && typeof window !== "undefined" && localStorage.getItem(LS_PRO_ACTIVE) !== "true" && (
              <p className="text-center text-[10px] text-slate-600">URL preview — not billing</p>
            )}
          </div>
        )}
        <p className="mt-1 text-center text-[10px] text-slate-600 leading-snug md:text-[11px]">
          Market awareness only. Not financial advice. Not a broker. Data refreshes periodically ({Math.round(SWEEP_MS / 60000)}m sweep).
        </p>
      </footer>
    </div>
  );
}

function BigSpotTile({
  label,
  sub,
  value,
  changeStr,
  changeRaw,
  compact,
}: {
  label: string;
  sub: string;
  value: string | null;
  changeStr: string | null;
  changeRaw: unknown;
  compact?: boolean;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col justify-center rounded-xl border border-white/[0.1] bg-gradient-to-b from-white/[0.07] to-black/40 px-3 py-2">
      <div className={`font-bold uppercase tracking-[0.15em] text-amber-200/90 ${compact ? "text-xs" : "text-sm"}`}>{label}</div>
      <div className="text-[11px] text-slate-500">{sub}</div>
      {value ? (
        <>
          <div className={`mt-1 font-black tabular-nums leading-none text-white ${compact ? "text-3xl" : "text-3xl lg:text-4xl"}`}>
            {value}
          </div>
          {changeStr ? (
            <div className={`mt-1 tabular-nums ${compact ? "text-sm" : "text-base"} ${chgToneClass(changeRaw)}`}>
              {changeStr} <span className="text-slate-500 font-normal">24h</span>
            </div>
          ) : null}
        </>
      ) : (
        <div className="mt-2 text-lg text-slate-500">Watching</div>
      )}
    </div>
  );
}
