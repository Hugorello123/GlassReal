// src/pages/DisplayPage.tsx — boardroom / TV display shell (Step 27a). No mock market data.
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { apiUrl } from "@/lib/sameOriginApi";

const LS_DEVICE = "sento_display_device_id";
const LS_TRIAL_START = "sento_display_trial_started";
const LS_PRO_ACTIVE = "sento_display_pro_active";
const SWEEP_MS = 60_000;

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

function isBreakingPulseRow(p: PredRow): boolean {
  return isFastPulseRow(p) || isPriceShockRow(p) || isCatalystWatchRow(p);
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

function pulseSourceLabel(p: PredRow): string {
  if (isPriceShockRow(p)) return "price-shock";
  if (isCatalystWatchRow(p)) return "catalyst-watch";
  if (isFastPulseRow(p)) return "ai-gossip-fast";
  return "awareness";
}

function shortReason(p: PredRow): string {
  if (isCatalystWatchRow(p)) return catalystWatchThemeLabel(p);
  if (isPriceShockRow(p)) {
    const w = String(p.why || "").trim();
    return w.slice(0, 120) || "Price pressure window — awareness.";
  }
  const h = parseFastGossipHeadline(p.why);
  return h.slice(0, 120) || "Headline-linked chatter — awareness.";
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

type PricesState = Record<string, unknown> | null;

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
    const [predP] = await Promise.all([
      fetch(apiUrl("/api/predictions?limit=50"), { cache: "no-store" }).catch(() => null),
    ]);

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
        const items: PredRow[] = Array.isArray(j.items) ? j.items : [];
        setPredictions(items);
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

  const catalystRows = useMemo(() => {
    return predictions
      .filter(isCatalystWatchRow)
      .sort((a, b) => (Date.parse(String(b.time || "")) || 0) - (Date.parse(String(a.time || "")) || 0))
      .slice(0, 6);
  }, [predictions]);

  const breakingRows = useMemo(() => {
    return predictions
      .filter(isBreakingPulseRow)
      .sort((a, b) => (Date.parse(String(b.time || "")) || 0) - (Date.parse(String(a.time || "")) || 0))
      .slice(0, 8);
  }, [predictions]);

  const newsHeadlines = useMemo(() => {
    if (!newsArticles.length || isPlaceholderNewsArticles(newsArticles)) return [];
    return newsArticles.slice(0, 6).map((a) => String(a.title || "").trim()).filter(Boolean);
  }, [newsArticles]);

  const p = prices && typeof prices === "object" ? prices : null;
  const btc = p ? fmtUsd(p.btc) : null;
  const eth = p ? fmtUsd(p.eth) : null;
  const gold = p ? fmtUsd(p.gold) : null;
  const oil = p ? fmtUsd(p.oil) : null;
  const btcCh = p ? fmtCh(p.btcCh) : null;
  const ethCh = p ? fmtCh(p.ethCh) : null;
  const goldCh = p ? fmtCh(p.goldCh) : null;
  const oilCh = p ? fmtCh(p.oilCh) : null;

  const statusColor =
    healthOk === true ? "bg-emerald-500/90 shadow-[0_0_12px_rgba(16,185,129,0.35)]" : healthOk === false ? "bg-amber-500/80" : "bg-slate-500/60";

  return (
    <div
      className="relative min-h-0 h-[100dvh] w-full overflow-hidden text-slate-100 flex flex-col"
      style={{ background: "#070809" }}
    >
      {/* Burn-in: slow drifting gradient (no bright static blocks) */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.07] z-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 20% 30%, rgba(34,211,238,0.5), transparent 55%), radial-gradient(ellipse 70% 50% at 80% 70%, rgba(99,102,241,0.45), transparent 50%)",
          animation: "displayAmbient 48s ease-in-out infinite alternate",
        }}
      />
      <style>{`@keyframes displayAmbient { 0% { transform: translate(0,0) scale(1); } 100% { transform: translate(2%,-1%) scale(1.03); } }`}</style>

      {/* Warning-phase banner */}
      {showWarningBanner && (
        <div className="relative z-20 shrink-0 border-b border-amber-500/25 bg-amber-950/35 px-4 py-2 text-center text-sm md:text-base text-amber-100/95">
          Display Pro preview ends in {daysLeftPro} day{daysLeftPro === 1 ? "" : "s"}. Scan or open{" "}
          <span className="font-semibold text-cyan-200/90">sentotrade.io</span> to keep this layout.
        </div>
      )}

      <header className="relative z-10 shrink-0 flex items-center justify-between gap-3 px-4 py-3 border-b border-white/[0.06] bg-black/40 backdrop-blur-sm">
        <div className="flex items-baseline gap-3 min-w-0">
          <span className={`text-xl md:text-2xl font-bold tracking-tight truncate ${visualFree ? "text-cyan-300/95" : "text-slate-200"}`}>
            SentoTrade Display
          </span>
          <span className="hidden sm:inline text-slate-500 text-sm md:text-base font-medium">·</span>
          <span className="hidden sm:inline text-slate-400 text-sm md:text-base font-medium whitespace-nowrap">Market Weather</span>
        </div>
        <div className="flex items-center gap-3 shrink-0 text-sm md:text-base tabular-nums text-slate-300">
          <time dateTime={clock.toISOString()}>
            {clock.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </time>
          <span className={`inline-block h-2.5 w-2.5 rounded-full ${statusColor}`} title={healthOk ? "Radar online" : "Radar degraded"} />
          <span className="hidden md:inline text-xs text-slate-500 max-w-[10rem] truncate">Powered by SentoTrade</span>
        </div>
      </header>

      <div className="relative z-10 flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-2 px-2 py-2 lg:px-3 lg:py-3">
        {/* Left — core tiles */}
        <aside className="lg:col-span-3 min-h-0 flex flex-col gap-2 overflow-hidden">
          <div className="text-[10px] uppercase tracking-widest text-slate-500 px-1">Spot (terminal feed)</div>
          <div className="flex-1 grid grid-cols-2 lg:grid-cols-1 gap-2 min-h-0 auto-rows-fr">
            <Tile label="Gold" sub="XAU / GC" value={gold} change={goldCh} />
            <Tile label="Oil" sub="WTI / CL" value={oil} change={oilCh} />
            <Tile label="DXY" sub="Dollar index" value={null} change={null} unavailable />
            <Tile label="USD/ZAR" sub="Emerging FX" value={null} change={null} unavailable />
            <Tile label="BTC" sub="USD" value={btc} change={btcCh} />
            <Tile label="ETH" sub="USD" value={eth} change={ethCh} />
          </div>
        </aside>

        {/* Center — weather / catalyst / headlines */}
        <main className="lg:col-span-5 min-h-0 flex flex-col gap-2 overflow-hidden rounded-lg border border-white/[0.06] bg-black/35 p-3 backdrop-blur-sm">
          <div className="flex justify-between items-start gap-2 shrink-0">
            <h2 className="text-lg md:text-xl font-semibold text-cyan-200/90">Market weather</h2>
            <div className="text-right text-xs text-slate-500 leading-tight">
              <div>Last radar sweep: {lastSweepLabel}</div>
              {nextSweepSec != null && <div>Next sweep in {nextSweepSec}s</div>}
            </div>
          </div>
          <div className="shrink-0 flex items-baseline gap-2">
            <span className="text-slate-500 text-sm">Gossip intensity</span>
            <span className="text-2xl md:text-3xl font-bold text-slate-100 tabular-nums">
              {gossip ? `${gossip.intensity}/10` : "—"}
            </span>
            {!gossip && <span className="text-xs text-slate-500">watching</span>}
          </div>
          {gossip && gossip.spywords.length > 0 && (
            <div className="flex flex-wrap gap-1.5 shrink-0">
              {gossip.spywords.slice(0, 8).map((w, i) => (
                <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300/90 border border-cyan-500/15">
                  {w}
                </span>
              ))}
            </div>
          )}
          <div className="shrink-0 mt-1">
            <h3 className="text-xs uppercase tracking-wider text-slate-500 mb-1">Catalyst watch (latest)</h3>
            {catalystRows.length === 0 ? (
              <p className="text-sm text-slate-500">Watching — no catalyst-watch rows right now.</p>
            ) : (
              <ul className="space-y-1.5 overflow-y-auto max-h-[22vh] lg:max-h-[28vh] pr-1">
                {catalystRows.map((r) => (
                  <li key={r.id || `${r.asset}-${r.time}`} className="text-sm md:text-base leading-snug border-l-2 border-amber-500/40 pl-2">
                    <span className="text-amber-200/90 font-semibold">{String(r.asset || "—")}</span>
                    <span className="text-slate-500"> · </span>
                    <span className="text-slate-300">{catalystWatchThemeLabel(r)}</span>
                    <span className="text-slate-500"> · {formatRelativePulse(r.time)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="flex-1 min-h-0 flex flex-col mt-1">
            <h3 className="text-xs uppercase tracking-wider text-slate-500 mb-1 shrink-0">Headlines</h3>
            {newsHeadlines.length === 0 ? (
              <p className="text-sm text-slate-500">Data unavailable — headlines not loaded or filtered quiet.</p>
            ) : (
              <ul className="space-y-1 overflow-y-auto flex-1 min-h-0 pr-1 text-sm md:text-base leading-snug text-slate-200/95">
                {newsHeadlines.map((t, i) => (
                  <li key={i} className="line-clamp-2">
                    · {t}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </main>

        {/* Right — breaking pulse list */}
        <aside className="lg:col-span-4 min-h-0 flex flex-col overflow-hidden rounded-lg border border-white/[0.06] bg-black/35 p-3 backdrop-blur-sm">
          <h2 className="text-lg md:text-xl font-semibold text-orange-200/90 shrink-0 mb-2">Breaking pulse</h2>
          {breakingRows.length === 0 ? (
            <p className="text-sm text-slate-500">Watching — no price-shock / catalyst / fast-gossip rows in the recent window.</p>
          ) : (
            <ul className="space-y-2 overflow-y-auto flex-1 min-h-0 pr-1">
              {breakingRows.map((r) => (
                <li
                  key={r.id || `${r.source}-${r.time}-${r.asset}`}
                  className="rounded-md border border-white/[0.05] bg-white/[0.03] px-2 py-2"
                >
                  <div className="text-xs text-slate-500 uppercase tracking-wide">{pulseSourceLabel(r)}</div>
                  <div className="text-base md:text-lg font-semibold text-slate-100 leading-tight">
                    {String(r.asset || "—")} · <span className="text-slate-300 font-medium">Awareness</span> ·{" "}
                    {String(r.call || "—")}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {String(r.timeframe || r.horizon || "—")} · {formatRelativePulse(r.time)}
                  </div>
                  <p className="text-xs md:text-sm text-slate-400 mt-1 line-clamp-2">{shortReason(r)}</p>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>

      {/* Semiconductors strip */}
      <div className="relative z-10 shrink-0 border-t border-white/[0.06] bg-black/45 px-4 py-2 text-center text-sm md:text-base tracking-wide text-slate-300/95">
        AI / Semiconductors watch — <span className="text-cyan-200/85 font-medium">NVDA · INTC · TSM · AVGO · MU · SMCI · SOUN</span>
      </div>

      {/* Trial / promo footers */}
      <footer className="relative z-10 shrink-0 border-t border-white/[0.06] bg-black/55 px-3 py-2 space-y-1">
        {visualFree ? (
          <>
            <div className="text-center text-amber-100/90 text-sm md:text-base font-semibold">
              Free Display Active · Powered by SentoTrade
            </div>
            <div className="text-center text-slate-400 text-xs md:text-sm">
              Display Pro: cleaner layout, custom branding, custom assets — $5/month <span className="italic">soon</span>
            </div>
            <div className="text-center font-mono text-2xl md:text-4xl text-cyan-300/90 py-1 tracking-tight">sentotrade.io</div>
          </>
        ) : (
          <div className="text-center text-slate-500 text-xs md:text-sm">Display Pro preview</div>
        )}
        <p className="text-center text-[10px] md:text-xs text-slate-600 leading-snug">
          Market awareness only. Not financial advice. Not a broker. Data refreshes periodically ({Math.round(SWEEP_MS / 60000)}m sweep).
        </p>
      </footer>
    </div>
  );
}

function Tile({
  label,
  sub,
  value,
  change,
  unavailable,
}: {
  label: string;
  sub: string;
  value: string | null;
  change: string | null;
  unavailable?: boolean;
}) {
  const show = unavailable ? false : !!value;
  return (
    <div className="rounded-lg border border-white/[0.07] bg-white/[0.04] px-3 py-2 flex flex-col justify-center min-h-[4.5rem]">
      <div className="text-[10px] md:text-xs uppercase tracking-wider text-slate-500">{label}</div>
      <div className="text-[10px] text-slate-600 mb-0.5">{sub}</div>
      {unavailable || !show ? (
        <div className="text-sm md:text-lg text-slate-500 leading-tight">Data unavailable</div>
      ) : (
        <>
          <div className="text-xl md:text-3xl font-bold tabular-nums text-slate-50 leading-none">{value}</div>
          {change && <div className="text-xs md:text-sm text-slate-400 mt-0.5 tabular-nums">{change} 24h</div>}
        </>
      )}
    </div>
  );
}
