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
      <main className="min-h-screen bg-gradient-to-br from-black to-gray-900 text-white p-6" style={{ overflowAnchor: "none" }}>
        <h1 className="text-4xl font-bold mb-6 text-center bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-green-500">
          Sentotrade Dashboard
        </h1>

        {/* MARKET PULSE HERO */}
        <section className="w-full mb-8 rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-slate-900 to-black p-6 shadow-lg shadow-cyan-500/5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">🌐</span>
              <div>
                <h2 className="text-lg font-bold text-cyan-400 tracking-wide">MARKET PULSE</h2>
                <p className="text-xs text-slate-400">Real-time sentiment pressure across crypto, equities, commodities and macro.</p>
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
            <span>Today's accuracy: {stats.hitrate !== null ? `${stats.hitrate}%` : "—"}</span>
            <span className="text-cyan-500/70 md:ml-auto">Updates every 60s</span>
          </div>
        </section>

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


        <EquitiesCommoditiesPanel />

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
