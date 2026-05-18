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

function shortReason(p: PredRow, maxLen: number): string {
  let base: string;
  if (isCatalystWatchRow(p)) base = catalystWatchThemeLabel(p);
  else if (isPriceShockRow(p)) {
    const w = String(p.why || "").trim();
    base = w || "Price pressure window — awareness.";
  } else {
    const h = parseFastGossipHeadline(p.why);
    base = h || "Headline-linked chatter — awareness.";
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

  /** Pro-style layout: boardroom density, minimal promo (not Free billboard). */
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
    const cap = isProBoardroom ? 4 : 5;
    return predictions
      .filter(isCatalystWatchRow)
      .sort((a, b) => (Date.parse(String(b.time || "")) || 0) - (Date.parse(String(a.time || "")) || 0))
      .slice(0, cap);
  }, [predictions, isProBoardroom]);

  const breakingRows = useMemo(() => {
    const cap = isProBoardroom ? 4 : 5;
    return predictions
      .filter(isBreakingPulseRow)
      .sort((a, b) => (Date.parse(String(b.time || "")) || 0) - (Date.parse(String(a.time || "")) || 0))
      .slice(0, cap);
  }, [predictions, isProBoardroom]);

  const newsHeadlines = useMemo(() => {
    const cap = isProBoardroom ? 5 : 6;
    if (!newsArticles.length || isPlaceholderNewsArticles(newsArticles)) return [];
    return newsArticles
      .slice(0, cap)
      .map((a) => String(a.title || "").trim())
      .filter(Boolean)
      .map((t) => trimDisplayLine(t, isProBoardroom ? 72 : 96));
  }, [newsArticles, isProBoardroom]);

  const p = prices && typeof prices === "object" ? prices : null;
  const btc = p ? fmtUsd(p.btc) : null;
  const eth = p ? fmtUsd(p.eth) : null;
  const gold = p ? fmtUsd(p.gold) : null;
  const oil = p ? fmtUsd(p.oil) : null;
  const btcCh = p ? fmtCh(p.btcCh) : null;
  const ethCh = p ? fmtCh(p.ethCh) : null;
  const goldCh = p ? fmtCh(p.goldCh) : null;
  const oilCh = p ? fmtCh(p.oilCh) : null;

  const spotSlots = useMemo(() => {
    const rows = [
      { key: "gold", label: "Gold", sub: "XAU / GC", value: gold, change: goldCh },
      { key: "oil", label: "Oil", sub: "WTI / CL", value: oil, change: oilCh },
      { key: "btc", label: "BTC", sub: "USD", value: btc, change: btcCh },
      { key: "eth", label: "ETH", sub: "USD", value: eth, change: ethCh },
    ];
    return rows.filter((r): r is (typeof rows)[number] & { value: string } => r.value != null && r.value !== "");
  }, [gold, oil, btc, eth, goldCh, oilCh, btcCh, ethCh]);

  const statusColor =
    healthOk === true ? "bg-emerald-500/90 shadow-[0_0_12px_rgba(16,185,129,0.35)]" : healthOk === false ? "bg-amber-500/80" : "bg-slate-500/60";

  const reasonMax = isProBoardroom ? 52 : 72;

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
        <div className="relative z-20 shrink-0 border-b border-amber-500/25 bg-amber-950/35 px-3 py-1.5 text-center text-xs md:text-sm text-amber-100/95">
          Display Pro preview ends in {daysLeftPro} day{daysLeftPro === 1 ? "" : "s"}. Scan or open{" "}
          <span className="font-semibold text-cyan-200/90">sentotrade.io</span> to keep this layout.
        </div>
      )}

      <header
        className={`relative z-10 shrink-0 flex items-center justify-between gap-2 px-3 border-b border-white/[0.06] bg-black/40 backdrop-blur-sm ${
          isProBoardroom ? "py-1.5" : "py-2 md:px-4"
        }`}
      >
        <div className="flex items-baseline gap-2 min-w-0">
          <span
            className={`font-bold tracking-tight truncate ${
              visualFree ? "text-xl md:text-2xl text-cyan-300/95" : "text-base md:text-lg text-slate-100 font-semibold"
            }`}
          >
            SentoTrade Display
          </span>
          <span
            className={`hidden sm:inline font-medium whitespace-nowrap ${
              isProBoardroom ? "text-[11px] text-slate-500" : "text-slate-400 text-sm md:text-base"
            }`}
          >
            {isProBoardroom ? "· Radar" : "· Market Weather"}
          </span>
        </div>
        <div className={`flex items-center gap-2 shrink-0 tabular-nums text-slate-300 ${isProBoardroom ? "text-sm" : "text-sm md:text-base"}`}>
          <time dateTime={clock.toISOString()}>
            {clock.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </time>
          <span className={`inline-block h-2.5 w-2.5 rounded-full ${statusColor}`} title={healthOk ? "Radar online" : "Radar degraded"} />
          <span
            className={`hidden lg:inline text-slate-500 truncate ${isProBoardroom ? "text-[10px] max-w-[7rem]" : "text-xs max-w-[10rem]"}`}
          >
            {isProBoardroom ? "SentoTrade" : "Powered by SentoTrade"}
          </span>
        </div>
      </header>

      <div className="relative z-10 flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-1.5 px-2 py-1 lg:px-3 lg:py-1.5 min-h-0">
        {/* Left — spot tiles only when /api/prices returned a real figure */}
        <aside className="lg:col-span-3 min-h-0 flex flex-col gap-1 overflow-hidden">
          <div
            className={`uppercase tracking-widest text-slate-500 px-1 shrink-0 font-semibold ${
              isProBoardroom ? "text-[10px]" : "text-[11px]"
            }`}
          >
            Spot (/api/prices)
          </div>
          {spotSlots.length === 0 ? (
            <div className="flex-1 min-h-0 flex items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.02] px-2 py-3">
              <p className="text-center text-sm text-slate-500 leading-snug">Watching · no spot quotes on last sweep.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 flex-1 min-h-0 auto-rows-fr content-start">
              {spotSlots.map((s, idx) => (
                <div
                  key={s.key}
                  className={
                    spotSlots.length === 1
                      ? "col-span-2"
                      : spotSlots.length === 3 && idx === 2
                        ? "col-span-2 max-w-lg mx-auto w-full"
                        : ""
                  }
                >
                  <SpotTile label={s.label} sub={s.sub} value={s.value} change={s.change} dense={isProBoardroom} />
                </div>
              ))}
            </div>
          )}
        </aside>

        {/* Center — weather / catalyst / headlines (no scrollbars — clipped lists) */}
        <main
          className={`lg:col-span-5 min-h-0 flex flex-col overflow-hidden rounded-lg border border-white/[0.06] bg-black/35 backdrop-blur-sm min-h-0 ${
            isProBoardroom ? "gap-1 p-2" : "gap-1.5 p-2.5 md:p-3"
          }`}
        >
          <div className="flex justify-between items-start gap-2 shrink-0">
            <h2 className={`font-semibold text-cyan-200/90 ${isProBoardroom ? "text-base" : "text-base md:text-xl"}`}>Market weather</h2>
            <div className={`text-right text-slate-500 leading-tight shrink-0 ${isProBoardroom ? "text-[10px]" : "text-xs"}`}>
              <div>Sweep {lastSweepLabel}</div>
              {nextSweepSec != null && <div>Next {nextSweepSec}s</div>}
            </div>
          </div>
          <div className="shrink-0 flex items-baseline gap-2">
            <span className={`text-slate-500 ${isProBoardroom ? "text-xs" : "text-xs md:text-sm"}`}>Gossip intensity</span>
            <span className={`font-bold text-slate-100 tabular-nums ${isProBoardroom ? "text-2xl" : "text-xl md:text-3xl"}`}>
              {gossip ? `${gossip.intensity}/10` : "—"}
            </span>
            {!gossip && <span className="text-xs text-slate-500">watching</span>}
          </div>
          {gossip && gossip.spywords.length > 0 && (
            <div className="flex flex-wrap gap-1 shrink-0 overflow-hidden">
              {gossip.spywords.slice(0, isProBoardroom ? 6 : 8).map((w, i) => (
                <span
                  key={i}
                  className={`rounded-full bg-cyan-500/10 text-cyan-300/90 border border-cyan-500/15 ${
                    isProBoardroom ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-0.5"
                  }`}
                >
                  {w}
                </span>
              ))}
            </div>
          )}
          <div className="shrink-0 min-h-0 overflow-hidden">
            <h3 className={`uppercase tracking-wider text-slate-500 mb-0.5 ${isProBoardroom ? "text-[10px]" : "text-xs"}`}>
              Catalyst watch
            </h3>
            {catalystRows.length === 0 ? (
              <p className={`text-slate-500 ${isProBoardroom ? "text-xs" : "text-sm"}`}>Watching — none right now.</p>
            ) : (
              <ul className="space-y-0.5 overflow-hidden">
                {catalystRows.map((r) => (
                  <li
                    key={r.id || `${r.asset}-${r.time}`}
                    className={`leading-tight border-l-2 border-amber-500/40 pl-2 text-slate-200 truncate ${
                      isProBoardroom ? "text-xs" : "text-sm md:text-base"
                    }`}
                    title={`${String(r.asset || "—")} — ${catalystWatchThemeLabel(r)}`}
                  >
                    <span className="text-amber-200/90 font-semibold">{String(r.asset || "—")}</span>
                    <span className="text-slate-500"> · </span>
                    <span className="text-slate-300">{trimDisplayLine(catalystWatchThemeLabel(r), isProBoardroom ? 36 : 48)}</span>
                    <span className="text-slate-500"> · {formatRelativePulse(r.time)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden mt-0.5">
            <h3 className={`uppercase tracking-wider text-slate-500 mb-0.5 shrink-0 ${isProBoardroom ? "text-[10px]" : "text-xs"}`}>
              Headlines
            </h3>
            {newsHeadlines.length === 0 ? (
              <p className={`text-slate-500 shrink-0 ${isProBoardroom ? "text-xs" : "text-sm"}`}>Watching — none right now.</p>
            ) : (
              <ul className={`space-y-0.5 overflow-hidden text-slate-200/95 ${isProBoardroom ? "text-xs" : "text-sm md:text-base"}`}>
                {newsHeadlines.map((t, i) => (
                  <li key={i} className="leading-snug truncate" title={t}>
                    · {t}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </main>

        {/* Right — breaking pulse */}
        <aside
          className={`lg:col-span-4 min-h-0 flex flex-col overflow-hidden rounded-lg border border-white/[0.06] bg-black/35 backdrop-blur-sm min-h-0 ${
            isProBoardroom ? "p-2 gap-1" : "p-2.5 md:p-3 gap-1.5"
          }`}
        >
          <h2 className={`font-semibold text-orange-200/90 shrink-0 ${isProBoardroom ? "text-base mb-1" : "text-base md:text-xl mb-1.5"}`}>
            Breaking pulse
          </h2>
          {breakingRows.length === 0 ? (
            <p className={`text-slate-500 shrink-0 ${isProBoardroom ? "text-xs" : "text-sm"}`}>Watching — none in window.</p>
          ) : (
            <ul className="space-y-1 overflow-hidden flex-1 min-h-0">
              {breakingRows.map((r) => (
                <li
                  key={r.id || `${r.source}-${r.time}-${r.asset}`}
                  className={`rounded-md border border-white/[0.05] bg-white/[0.03] overflow-hidden ${
                    isProBoardroom ? "px-1.5 py-1" : "px-2 py-1.5"
                  }`}
                >
                  <div className={`text-slate-500 uppercase tracking-wide ${isProBoardroom ? "text-[9px]" : "text-xs"}`}>
                    {pulseSourceLabel(r)}
                  </div>
                  <div className={`font-semibold text-slate-100 leading-tight truncate ${isProBoardroom ? "text-sm" : "text-base md:text-lg"}`}>
                    {String(r.asset || "—")} · <span className="text-slate-300 font-medium">Awareness</span> · {String(r.call || "—")}
                  </div>
                  <div className={`text-slate-500 ${isProBoardroom ? "text-[10px]" : "text-xs"}`}>
                    {String(r.timeframe || r.horizon || "—")} · {formatRelativePulse(r.time)}
                  </div>
                  <p className={`text-slate-400 mt-0.5 truncate ${isProBoardroom ? "text-[10px]" : "text-xs md:text-sm"}`} title={shortReason(r, reasonMax)}>
                    {shortReason(r, reasonMax)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>

      {/* Semiconductors strip */}
      <div
        className={`relative z-10 shrink-0 border-t border-white/[0.06] bg-black/45 text-center tracking-wide text-slate-300/95 ${
          isProBoardroom ? "px-2 py-1 text-xs" : "px-3 py-1.5 text-xs md:text-base"
        }`}
      >
        AI / Semiconductors — <span className="text-cyan-200/85 font-medium">NVDA · INTC · TSM · AVGO · MU · SMCI · SOUN</span>
      </div>

      <footer className={`relative z-10 shrink-0 border-t border-white/[0.06] bg-black/55 px-2 ${isProBoardroom ? "py-1" : "py-1.5"}`}>
        {visualFree ? (
          <div className="space-y-0.5">
            <p className="text-center text-slate-100/95 text-sm md:text-[0.95rem] leading-snug">
              Free Display Active · Powered by SentoTrade · Open full radar at{" "}
              <span className="text-cyan-300/90 font-semibold">sentotrade.io</span>
            </p>
            <p className="text-center text-slate-500 text-[10px] md:text-xs">Display Pro add-ons — coming soon</p>
          </div>
        ) : (
          <div className="space-y-0">
            <p className="text-center text-slate-400 text-xs md:text-sm">Display Pro preview · Powered by SentoTrade</p>
            {tierParam === "pro" && typeof window !== "undefined" && localStorage.getItem(LS_PRO_ACTIVE) !== "true" && (
              <p className="text-center text-[10px] text-slate-600">URL preview — not billing</p>
            )}
          </div>
        )}
        <p
          className={`text-center text-slate-600 leading-snug mt-0.5 ${
            isProBoardroom ? "text-[9px] line-clamp-2" : "text-[10px] md:text-xs"
          }`}
        >
          Market awareness only. Not financial advice. Not a broker. Data refreshes periodically ({Math.round(SWEEP_MS / 60000)}m sweep).
        </p>
      </footer>
    </div>
  );
}

function SpotTile({
  label,
  sub,
  value,
  change,
  dense,
}: {
  label: string;
  sub: string;
  value: string;
  change: string | null;
  dense?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border border-white/[0.08] bg-white/[0.05] flex flex-col justify-center min-h-0 ${
        dense ? "px-2 py-2" : "px-3 py-2.5"
      }`}
    >
      <div
        className={`uppercase tracking-wider text-slate-400 font-semibold ${dense ? "text-xs" : "text-xs md:text-sm"}`}
      >
        {label}
      </div>
      <div className={`text-slate-500 ${dense ? "text-[10px]" : "text-[10px] md:text-xs"}`}>{sub}</div>
      <div
        className={`font-bold tabular-nums text-white leading-none ${dense ? "text-xl md:text-2xl mt-0.5" : "text-2xl md:text-4xl mt-1"}`}
      >
        {value}
      </div>
      {change ? (
        <div className={`text-slate-400 tabular-nums mt-0.5 ${dense ? "text-[10px]" : "text-xs md:text-sm"}`}>{change} 24h</div>
      ) : null}
    </div>
  );
}
