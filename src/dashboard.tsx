// src/dashboard.tsx
import MarketSlots from "@/components/MarketSlots";
// src/dashboard.tsx
import { useState, useEffect } from "react";
import EquitiesCommoditiesPanel from "@/components/EquitiesCommoditiesPanel";

import EthPrice from "@/lib/eth";
import BnbPrice from "@/lib/bnb";

import WhaleAlertsRow from "@/components/WhaleAlertsRow";
import MarketTickerGroup from "@/components/MarketTickerGroup";
import BusinessTicker from "@/components/BusinessTicker";

import GoldBox from "@/components/GoldBox";
import BitcoinBox from "@/components/BitcoinBox";
import OilBox from "@/components/OilBox";
import ForexBox from "@/components/ForexBox";
import TeslaBox from "@/components/TeslaBox";
import IntelligenceFeed from "@/lib/IntelligenceFeed";
import GuruDrawer from "@/components/GuruDrawer";
import NavBar from "@/components/NavBar";
import { buildThemes, type WatchdogTheme } from "@/lib/watchdogThemes";

/** Latest row from `/api/predictions` — FastGossip lane + Step 20a price-shock + Step 24b catalyst-watch. */
interface BreakingPulsePred {
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
}

function isFastPulseRow(p: BreakingPulsePred): boolean {
  if (String(p.source || "").toLowerCase() === "ai-gossip-fast") return true;
  const id = String(p.id || "").toLowerCase();
  if (id.startsWith("aigf_")) return true;
  if (String(p.why || "").toLowerCase().includes("fast gossip")) return true;
  return false;
}

function isPriceShockRow(p: BreakingPulsePred): boolean {
  if (String(p.source || "").toLowerCase() === "price-shock") return true;
  const id = String(p.id || "").toLowerCase();
  if (id.startsWith("ps_")) return true;
  return false;
}

function isCatalystWatchRow(p: BreakingPulsePred): boolean {
  if (String(p.source || "").toLowerCase() === "catalyst-watch") return true;
  const id = String(p.id || "");
  if (id.toLowerCase().startsWith("cw_")) return true;
  return false;
}

function isBreakingPulseRow(p: BreakingPulsePred): boolean {
  return isFastPulseRow(p) || isPriceShockRow(p) || isCatalystWatchRow(p);
}

function catalystWatchThemeLabel(row: BreakingPulsePred): string {
  const c = String(row.cluster || "").toLowerCase();
  if (c === "musk_intel") return "Musk / Tesla / Intel";
  if (c === "fed_pivot") return "Fed policy / yields / inflation";
  if (c === "us_china_trade") return "US–China trade & export controls";
  return "Macro / catalyst headlines";
}

/** Text after `Fast gossip (intensity N):` in `why`, else full why trimmed. */
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
  if (mins == null || !Number.isFinite(mins)) return "recently";
  if (mins < 1 / 60) return "just now";
  if (mins < 1) return `${Math.max(1, Math.round(mins * 60))}s ago`;
  if (mins < 60) return `${Math.round(mins)}m ago`;
  const h = Math.floor(mins / 60);
  const rm = Math.round(mins % 60);
  if (h < 48) return rm > 0 ? `${h}h ${rm}m ago` : `${h}h ago`;
  return `${Math.round(mins / 1440)}d ago`;
}

function useBreakingPulse() {
  const [row, setRow] = useState<BreakingPulsePred | null>(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const r = await fetch("/api/predictions?limit=50", { cache: "no-store" });
        const d = await r.json();
        const items: BreakingPulsePred[] = Array.isArray(d.items) ? d.items : [];
        const hit = items.find(isBreakingPulseRow) ?? null;
        if (alive) {
          setRow(hit);
          setLoaded(true);
        }
      } catch {
        if (alive) {
          setRow(null);
          setLoaded(true);
        }
      }
    }
    void load();
    const id = setInterval(load, 60000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);
  return { row, loaded };
}

function useTopWatchdogTheme() {
  const [theme, setTheme] = useState<WatchdogTheme | null>(null);
  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const r = await fetch("/api/news", { cache: "no-store" });
        const d = await r.json();
        const articles = d.articles || [];
        const themes = buildThemes(articles);
        const top = themes.find((t) => t.heat > 0) ?? null;
        if (alive) setTheme(top);
      } catch { /* silent */ }
    }
    load();
    const id = setInterval(load, 120000);
    return () => { alive = false; clearInterval(id); };
  }, []);
  return theme;
}

function useMarketPulse() {
  const [data, setData] = useState<{ intensity: number; spywords: string[]; alerts: string[] } | null>(null);
  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const r = await fetch("/api/gossip", { cache: "no-store" });
        const d = await r.json();
        if (alive) setData(d);
      } catch { /* silent */ }
    }
    load();
    const id = setInterval(load, 60000);
    return () => { alive = false; clearInterval(id); };
  }, []);
  return data;
}

function usePredictionStats() {
  const [open, setOpen] = useState<number | null>(null);
  const [hitrate, setHitrate] = useState<number | null>(null);
  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const r = await fetch("/api/predictions?limit=1", { cache: "no-store" });
        const d = await r.json();
        const rec = d.record || {};
        if (alive) {
          setOpen(rec.open ?? null);
          const total = (rec.hit || 0) + (rec.missed || 0) + (rec.partial || 0);
          setHitrate(total > 0 ? Math.round(((rec.hit || 0) + (rec.partial || 0) * 0.5) / total * 100) : 0);
        }
      } catch { /* silent */ }
    }
    load();
    const id = setInterval(load, 60000);
    return () => { alive = false; clearInterval(id); };
  }, []);
  return { open, hitrate };
}

export default function Dashboard() {
  useEffect(() => { window.scrollTo(0, 0); }, []);
  const [guruTopic, setGuruTopic] = useState<string | undefined>(undefined);
  const pulse = useMarketPulse();
  const breaking = useBreakingPulse();
  const stats = usePredictionStats();
  const topTheme = useTopWatchdogTheme();
  const intensityCfg = pulse
    ? pulse.intensity <= 2 ? { label: "Quiet", color: "text-amber-400" }
    : pulse.intensity <= 5 ? { label: "Active", color: "text-green-400" }
    : { label: "High", color: "text-red-500" }
    : { label: "Quiet", color: "text-amber-400" };

  return (
    <>
      <NavBar current="dashboard" />
      <main className="min-h-screen bg-gradient-to-br from-black to-gray-900 text-white px-4 py-4 sm:p-6" style={{ overflowAnchor: "none" }}>
        <h1 className="text-4xl font-bold mb-6 text-center bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-green-500">
          Sentotrade Dashboard
        </h1>

        {/* MARKET PULSE HERO */}
        <section className="w-full mb-8 rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-slate-900 to-black p-6 shadow-lg shadow-cyan-500/5">
          <BreakingPulseStrip row={breaking.row} loaded={breaking.loaded} />

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">🌐</span>
              <div>
                <h2 className="text-lg font-bold text-cyan-400 tracking-wide">MARKET PULSE</h2>
                <p className="text-xs text-slate-400">Real-time sentiment pressure across crypto, gold, forex, equities, commodities, and macro.</p>
              </div>
            </div>
            <div className="text-left md:text-right">
              <div className="text-xs text-slate-400 uppercase tracking-wider">Intensity</div>
              <div className={`text-2xl font-bold ${intensityCfg.color}`}>
                {pulse ? `${pulse.intensity}/10 ${intensityCfg.label}` : "—"}
              </div>
            </div>
          </div>

          {/* min-h reserves layout space before data loads — prevents scroll jump */}
          <div className="flex flex-wrap gap-2 mb-3 min-h-[2rem]">
            {pulse?.spywords?.slice(0, 6).map((word, i) => (
              <span key={i} className="text-xs px-2 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">{word}</span>
            ))}
          </div>

          <div className="mb-3 min-h-[2.5rem]">
            {topTheme && topTheme.heat > 0 && (
              <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
                <span className="text-sm">🔥</span>
                <div className="text-sm">
                  <span className="text-orange-400 font-semibold">Dominant Theme: {topTheme.name}</span>
                  <span className="text-slate-400 mx-2">•</span>
                  <span className="text-xs text-slate-400">{topTheme.category.replace(/-/g, " ")}</span>
                  {topTheme.impacts.length > 0 && (
                    <span className="text-xs text-slate-500 ml-2">
                      {topTheme.impacts.slice(0, 3).map((imp, idx) => (
                        <span key={idx} className="ml-1">{imp.asset} {imp.direction}</span>
                      ))}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-slate-700/50 bg-black/30 p-4 mb-4">
            {pulse?.alerts && pulse.alerts.length > 0 ? (
              <div className="space-y-2">
                {pulse.alerts.slice(0, 3).map((alert, i) => (
                  <div key={i} className="text-sm text-slate-300">{alert}</div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-slate-400">Quiet for now — scanning news, on-chain and market pressure every minute.</div>
            )}
          </div>

          <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-6 text-xs text-slate-400 border-t border-slate-700/50 pt-3">
            <span>Live Edge Tests: {stats.open !== null ? stats.open : "—"} active</span>
            <span>
              Blended archive accuracy:{" "}
              <span className="tabular-nums text-slate-500">{stats.hitrate !== null ? `${stats.hitrate}%` : "—"}</span>
              <span className="text-slate-600"> (regime tuning)</span>
            </span>
            <span className="text-cyan-500/70 md:ml-auto">Updates every 60s</span>
          </div>
        </section>

        <EquitiesCommoditiesPanel />

        {/* Top two big price blocks */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <EthPrice />
          <BnbPrice />
        </section>

        {/* Four widgets */}
        <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 mb-10">
          {/* 1: Gold */}
          <div className="bg-white/10 p-6 rounded-xl text-center min-h-[120px]">
            <GoldBox />
          </div>
          {/* 2: Bitcoin */}
          <div className="bg-white/10 p-6 rounded-xl text-center min-h-[120px]">
            <BitcoinBox />
          </div>
          {/* 3: Oil */}
          <div className="bg-white/10 p-6 rounded-xl text-center min-h-[120px]">
            <OilBox />
          </div>
          {/* 5: Tesla */}
          <div className="bg-white/10 p-6 rounded-xl text-center min-h-[120px]">
            <TeslaBox />
          </div>
          {/* 4: Forex alternating */}
          <div className="bg-white/10 p-6 rounded-xl text-center min-h-[120px]">
            <ForexBox />
          </div>
        </section>

        {/* Whale alerts row */}
        <section className="mt-2">
          <WhaleAlertsRow />
          <div className="mt-1 text-xs text-white/60 text-center md:text-left">
            Large unconfirmed BTC transfers (≥ $2M). "top" = largest single output; "outs" = number of outputs.
          </div>
        </section>


        {/* Market ticker + business ticker */}
        <section className="mt-10">
          <MarketTickerGroup />
          <MarketSlots />
          <div className="mt-6">
            <BusinessTicker />
          </div>
        </section>

        {/* Intelligence feed */}
        <section className="mt-10">
          <IntelligenceFeed onAskGuru={(title: string) => setGuruTopic(title)} />
          <div className="mt-3 text-sm text-amber-100 bg-amber-500/10 border border-amber-400/20 rounded-lg px-3 py-2 text-center md:text-left">
            <span className="mr-1">🧭</span>
            <span className="font-semibold">Headlines impact:</span>
            <span className="ml-1">
              moves often land in <span className="font-semibold">15–60m</span>. Risk-on language (strong USD / yields up / tariff relief)
              tends to be <span className="font-semibold">bearish</span> for gold; risk-off (sanctions, shocks) tends to be
              <span className="font-semibold"> bullish</span>. Watch DXY strength or a pickup in headline heat (≥3/hr) for confirmation.
            </span>
          </div>
        </section>

        {/* Legend */}
        <div className="mt-8 text-center text-xs md:text-sm text-white/80 bg-white/10 border border-white/20 rounded-lg px-3 py-2">
          <span className="mr-1">📎</span>
          <span className="opacity-90">Legend:</span>
          <span className="ml-1">
            Bias (bullish/neutral/bearish) • Window (5–30m / 15–60m) • Tape (calm/active/noisy). Rule of thumb: BTC ±1.5% often nudges gold the other way; Gold ±0.7% confirms.
          </span>
        </div>

        <GuruDrawer topic={guruTopic} onClose={() => setGuruTopic(undefined)} open={!!guruTopic} />
      </main>
    </>
  );
}

function isGoldAsset(asset: string | undefined): boolean {
  const a = String(asset || "").toUpperCase();
  return a.includes("GOLD") || a.includes("XAU");
}

/** Prefer server `shockMovePct`; else parse from `[Price shock tier/window] ±x.xx%`. */
function parseShockMovePct(row: BreakingPulsePred): number | null {
  if (typeof row.shockMovePct === "number" && Number.isFinite(row.shockMovePct)) return row.shockMovePct;
  const w = String(row.why || "");
  const m = w.match(/\[Price shock\s+[^\]]+\]\s*([+-]?\d+(?:\.\d+)?)\s*%/i);
  if (m) {
    const n = parseFloat(m[1]);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function priceShockStripTitle(row: BreakingPulsePred): string {
  const assetU = String(row.asset || "ASSET").toUpperCase().trim() || "ASSET";
  const sev = String(row.shockSeverity || "").toLowerCase();
  const isDown = String(row.call || "").toLowerCase() === "short";
  if (isGoldAsset(row.asset) && sev === "severe" && isDown) return "🔥 GOLD UNDER SEVERE PRESSURE";
  if (isDown) return `🔥 PRICE SHOCK — ${assetU} UNDER PRESSURE`;
  return `🔥 PRICE SHOCK — ${assetU} UPSIDE PRESSURE`;
}

function pulseStripHot(row: BreakingPulsePred | null): boolean {
  if (!row) return false;
  const ageMin = ageMinutesFromIso(row.time);
  if (ageMin == null || !Number.isFinite(ageMin)) return false;
  if (isPriceShockRow(row)) {
    const sev = String(row.shockSeverity || "").toLowerCase();
    if (sev === "severe") return ageMin < 30;
    return ageMin < 15;
  }
  if (isCatalystWatchRow(row)) return ageMin < 45;
  return ageMin < 5;
}

function BreakingPulseStrip({ row, loaded }: { row: BreakingPulsePred | null; loaded: boolean }) {
  const windowLabel = String(row?.timeframe || row?.horizon || "20m").trim() || "20m";
  const callU = String(row?.call || "Long").toUpperCase();
  const asset = String(row?.asset || "—").trim() || "—";
  const rel = formatRelativePulse(row?.time);
  const headline = parseFastGossipHeadline(row?.why);
  const isHot = pulseStripHot(row);

  if (!loaded) {
    return (
      <div className="mb-5 rounded-xl border border-slate-700/40 bg-black/25 px-4 py-3 min-h-[5.5rem]" aria-hidden>
        <div className="h-3 w-40 bg-slate-700/50 rounded animate-pulse mb-2" />
        <div className="h-3 w-full max-w-md bg-slate-700/30 rounded animate-pulse" />
      </div>
    );
  }

  if (!row) {
    return (
      <div className="mb-5 rounded-xl border border-slate-700/50 bg-black/30 px-4 py-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Breaking Pulse</div>
        <p className="text-sm text-slate-400 mt-1">No breaking pulse right now — scanning headlines and price shocks.</p>
        <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
          Short-window gross market-move tests before spread, slippage, fees, and platform costs — not instructions.
        </p>
      </div>
    );
  }

  if (isPriceShockRow(row)) {
    const move = parseShockMovePct(row);
    const movePart =
      move != null ? `${move >= 0 ? "+" : ""}${move.toFixed(2)}%` : null;
    const metaBits = [asset, callU, windowLabel, rel];
    if (movePart) metaBits.splice(3, 0, movePart);
    const title = priceShockStripTitle(row);
    const border = isHot ? "border-orange-500/45 bg-orange-950/25" : "border-amber-500/35 bg-amber-950/15";
    const whyText = String(row.why || "").trim();
    return (
      <div className={`mb-5 rounded-xl border px-4 py-3 ${border}`}>
        <div className={`text-xs font-bold uppercase tracking-wide ${isHot ? "text-orange-300" : "text-amber-200/90"}`}>{title}</div>
        <p className="text-sm text-slate-100 mt-1.5 font-medium">{metaBits.join(" · ")}</p>
        {whyText ? (
          <p className="text-sm text-slate-300 mt-2 leading-snug">{whyText}</p>
        ) : null}
        <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
          Short-window gross market-move test before spread, slippage, fees, and platform costs.
        </p>
      </div>
    );
  }

  if (isCatalystWatchRow(row)) {
    const theme = catalystWatchThemeLabel(row);
    const assetU = String(row.asset || "—").toUpperCase().trim() || "—";
    const title = `⚠️ SPECULATIVE CATALYST WATCH — ${assetU}`;
    const border = isHot ? "border-amber-500/50 bg-amber-950/20" : "border-slate-600/60 bg-slate-900/40";
    return (
      <div className={`mb-5 rounded-xl border px-4 py-3 ${border}`}>
        <div className={`text-xs font-bold uppercase tracking-wide ${isHot ? "text-amber-200" : "text-amber-100/85"}`}>{title}</div>
        <p className="text-sm text-slate-100 mt-1.5 font-medium">
          {theme} · {windowLabel} · {rel}
        </p>
        <p className="text-sm text-slate-300 mt-2 leading-snug">No confirmed deal — awareness only.</p>
        <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
          Speculative headline cluster — not a trade signal or Live Edge Test.
        </p>
      </div>
    );
  }

  const title = isHot ? "🔥 BREAKING PULSE" : "Recent Fast Pulse";
  const border = isHot ? "border-orange-500/45 bg-orange-950/25" : "border-amber-500/35 bg-amber-950/15";

  return (
    <div className={`mb-5 rounded-xl border px-4 py-3 ${border}`}>
      <div className={`text-xs font-bold uppercase tracking-wide ${isHot ? "text-orange-300" : "text-amber-200/90"}`}>{title}</div>
      <p className="text-sm text-slate-100 mt-1.5 font-medium">
        {asset} · {callU} · {windowLabel} window · {rel}
      </p>
      <p className="text-sm text-slate-300 mt-2 leading-snug">
        <span className="text-slate-500">Fast headline heat → </span>
        {headline ? <span>{headline}</span> : <span className="text-slate-500">short-window pressure logged.</span>}
      </p>
      <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
        Short-window gross market-move test before spread, slippage, fees, and platform costs — pressure radar, not a signal to act on.
      </p>
    </div>
  );
}
