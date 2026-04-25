// ProDashboardPage.tsx — real data only. No demo signals.
import { useEffect, useState } from "react";
import NavBar from "@/components/NavBar";

/* ────── types ────── */
type FlowData = {
  to_exch: { count: number; usd: number };
  from_exch: { count: number; usd: number };
  top?: { usd: number; dir: string };
};

type BiasData = {
  score: number;
  label: "bullish" | "bearish" | "neutral";
  btc24h: string;
  gold24h: string;
  headlines: number;
  why: string;
  tape: string;
};

type SignalRow = {
  time: string;
  signal: string;
  why: string;
  horizon: string;
  outcome: string;
};

/* ────── helpers ────── */
function fmtPct(n: number | null): string {
  if (n === null || !Number.isFinite(n)) return "n/a";
  return `${n > 0 ? "+" : ""}${n.toFixed(2)}%`;
}

function biasLabel(score: number): { label: "bullish" | "bearish" | "neutral"; class: string } {
  if (score >= 65) return { label: "bullish", class: "text-green-400 bg-green-500/10 border-green-500/30" };
  if (score <= 35) return { label: "bearish", class: "text-red-400 bg-red-500/10 border-red-500/30" };
  if (score > 55) return { label: "bullish", class: "text-green-300 bg-green-500/5 border-green-500/20" };
  if (score < 45) return { label: "bearish", class: "text-red-300 bg-red-500/5 border-red-500/20" };
  return { label: "neutral", class: "text-gray-300 bg-gray-500/10 border-gray-500/30" };
}

function implication(score: number): string {
  if (Number.isNaN(score)) return "Awaiting bias…";
  if (score <= 35) return "Risk-off: favor shorts / safe-haven posture; gold support likely.";
  if (score <= 45) return "Leaning risk-off: fade strength; tighten stops on longs.";
  if (score < 55) return "Neutral: range-trade; wait for BTC/ETH inflow confirmation.";
  if (score < 65) return "Leaning risk-on: buy dips; keep position sizes modest.";
  if (score < 75) return "Risk-on: momentum entries OK; trail stops aggressively.";
  return "Strong risk-on: breakout conditions; scale in only with flow confirmation.";
}

export default function ProDashboardPage() {
  const [bias, setBias] = useState<BiasData | null>(null);
  const [btcFlow, setBtcFlow] = useState<FlowData | null>(null);
  const [ethFlow, setEthFlow] = useState<FlowData | null>(null);
  const [usdtFlow, setUsdtFlow] = useState<any>(null);
  const [signals, setSignals] = useState<SignalRow[]>([]);
  const [lastUpdate, setLastUpdate] = useState<string>("—");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    async function loadBias() {
      try {
        const prices = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=pax-gold,bitcoin&vs_currencies=usd&include_24hr_change=true")
          .then((r) => r.ok ? r.json() : null);
        const news = await fetch("/api/news").then((r) => r.ok ? r.json() : null);

        const goldCh = Number(prices?.["pax-gold"]?.usd_24h_change);
        const btcCh = Number(prices?.bitcoin?.usd_24h_change);
        const headlines = Array.isArray(news?.articles) ? news.articles.length : 0;

        let score = 50;
        const why: string[] = [];

        if (Number.isFinite(btcCh)) {
          if (btcCh <= -1.5) { score += 8; why.push("BTC risk-off"); }
          else if (btcCh <= -0.5) { score += 4; why.push("BTC mild risk-off"); }
          else if (btcCh >= 1.5) { score -= 8; why.push("BTC risk-on"); }
          else if (btcCh >= 0.5) { score -= 4; why.push("BTC mild risk-on"); }
          else { why.push("BTC neutral"); }
        }

        if (Number.isFinite(goldCh)) {
          if (goldCh >= 0.7) { score += 5; why.push("Gold confirming"); }
          else if (goldCh <= -0.7) { score -= 5; why.push("Gold drag"); }
          else if (Math.abs(goldCh) >= 0.3) { why.push("Gold slight tone"); }
          else { why.push("Gold flat"); }
        }

        const tape = headlines >= 10 ? "noisy" : headlines >= 3 ? "active" : "calm";
        if (tape === "noisy") score = Math.round((score - 50) * 0.8 + 50);
        score = Math.max(35, Math.min(65, Math.round(score)));

        const label = score >= 65 ? "bullish" : score <= 35 ? "bearish" : score > 55 ? "bullish" : score < 45 ? "bearish" : "neutral";

        if (alive) {
          setBias({
            score,
            label,
            btc24h: fmtPct(btcCh),
            gold24h: fmtPct(goldCh),
            headlines,
            why: why.join(" • ") || "inputs n/a",
            tape,
          });
        }
      } catch {
        // no fallback — bias stays null until real data arrives
      }
    }

    async function loadFlow() {
      try {
        const [B, E, U] = await Promise.allSettled([
          fetch("/api/flow/btc?window_s=1800&min_usd=500000").then((r) => r.ok ? r.json() : null),
          fetch("/api/flow/eth?window_s=1800&min_usd=500000").then((r) => r.ok ? r.json() : null),
          fetch("/api/stable/usdt-eth?window_s=7200").then((r) => r.ok ? r.json() : null),
        ]);
        if (alive) {
          setBtcFlow(B.status === "fulfilled" && B.value?.to_exch ? B.value : null);
          setEthFlow(E.status === "fulfilled" && E.value?.to_exch ? E.value : null);
          setUsdtFlow(U.status === "fulfilled" && U.value?.mints ? U.value : null);
        }
      } catch {
        // flows stay null
      }
    }

    async function loadSignals() {
      try {
        const resp = await fetch("/api/signal/recent?limit=5");
        if (!resp.ok) return;
        const data = await resp.json();
        const rows = Array.isArray(data) ? data : data?.items || [];
        if (rows.length && alive) {
          setSignals(rows.map((r: any) => ({
            time: r.time || r.ts || "—",
            signal: r.signal || r.label || "—",
            why: r.why || r.reason || "",
            horizon: r.horizon || r.h || "6h",
            outcome: r.outcome_pct != null ? `${r.outcome_pct}%` : r.outcome || "—",
          })));
        }
      } catch {
        // signals stay empty
      }
    }

    Promise.all([loadBias(), loadFlow(), loadSignals()]).then(() => {
      if (alive) {
        setLastUpdate(new Date().toLocaleTimeString());
        setLoading(false);
      }
    });

    const biasTimer = setInterval(() => { loadBias(); setLastUpdate(new Date().toLocaleTimeString()); }, 60_000);
    const flowTimer = setInterval(loadFlow, 20_000);
    const sigTimer = setInterval(loadSignals, 60_000);

    return () => {
      alive = false;
      clearInterval(biasTimer);
      clearInterval(flowTimer);
      clearInterval(sigTimer);
    };
  }, []);

  const bcfg = bias ? biasLabel(bias.score) : { label: "neutral" as const, class: "text-gray-300 bg-gray-500/10 border-gray-500/30" };

  return (
    <>
      <NavBar current="pro" />
      <main className="min-h-screen bg-gradient-to-br from-black to-gray-900 text-white">
        <div className="max-w-6xl mx-auto px-6 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-green-400">
                Pro Dashboard
              </h1>
              <p className="text-gray-400 text-sm mt-1">
                Session bias, exchange flows, signals & analogs — real data only
              </p>
            </div>
            <span className="text-xs text-gray-500 bg-white/5 px-3 py-1 rounded-full border border-white/10">
              Updated: {lastUpdate}
            </span>
          </div>

          {loading && (
            <div className="text-center text-gray-500 py-8">Loading live data…</div>
          )}

          {/* Exchange Flow Pills */}
          <div className="flex flex-wrap gap-2 mb-6">
            {btcFlow && (
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/30 border border-white/10 text-xs">
                <span className="text-cyan-400 font-semibold">BTC</span>
                <span>to {btcFlow.to_exch.count} / from {btcFlow.from_exch.count}</span>
                {btcFlow.top && (
                  <span className="text-gray-400">top {(btcFlow.top.usd / 1e6).toFixed(1)}M {btcFlow.top.dir === "to" ? "→ EXCH" : "← EXCH"}</span>
                )}
              </span>
            )}
            {ethFlow && (
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/30 border border-white/10 text-xs">
                <span className="text-purple-400 font-semibold">ETH</span>
                <span>to {ethFlow.to_exch.count} / from {ethFlow.from_exch.count}</span>
              </span>
            )}
            {usdtFlow && (
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/30 border border-white/10 text-xs">
                <span className="text-green-400 font-semibold">USDT</span>
                <span className={usdtFlow.mints.usd > usdtFlow.burns.usd ? "text-green-400" : usdtFlow.mints.usd < usdtFlow.burns.usd ? "text-red-400" : "text-gray-400"}>
                  mints {(usdtFlow.mints.usd / 1e6).toFixed(1)}M / burns {(usdtFlow.burns.usd / 1e6).toFixed(1)}M
                </span>
              </span>
            )}
            {!btcFlow && !ethFlow && !usdtFlow && (
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/30 border border-white/10 text-xs text-gray-500">
                Flow data: connect BitQuery backend for live exchange flows
              </span>
            )}
          </div>

          {/* Session Bias + Event Playbook */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
            {/* Bias Card */}
            <div className="bg-gray-900/50 border border-white/10 rounded-xl p-5">
              <h2 className="text-lg font-semibold mb-3">Session Bias</h2>
              {bias ? (
                <>
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`px-4 py-1.5 rounded-lg font-bold text-sm border ${bcfg.class}`}>
                      {bias.label.toUpperCase()} {bias.score}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 mb-3">{implication(bias.score)}</p>
                  <div className="text-xs text-gray-500 space-y-1">
                    <div>BTC 24h: <span className="text-cyan-300">{bias.btc24h}</span></div>
                    <div>Gold 24h: <span className="text-amber-300">{bias.gold24h}</span></div>
                    <div>Headlines/hr: <span className="text-white">{bias.headlines}</span></div>
                  </div>
                  <div className="mt-3 text-xs text-gray-400">{bias.why} • tape {bias.tape}</div>
                </>
              ) : (
                <p className="text-sm text-gray-400">Calculating from live CoinGecko + news feeds…</p>
              )}
              <div className="mt-3 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 text-xs text-amber-200">
                Read: BTC falling = mild tailwind; BTC rising = mild headwind. Gold ±0.7% confirms. Watch DXY and headline heat (≥3/hr).
              </div>
            </div>

            {/* Event Playbook */}
            <div className="bg-gray-900/50 border border-dashed border-white/10 rounded-xl p-5">
              <h2 className="text-lg font-semibold mb-3">Event Playbook</h2>
              <div className="text-sm text-gray-400 space-y-2">
                <p>Risk-on (tariff relief, strong USD/yields) → <span className="text-red-400">bearish gold</span></p>
                <p>Risk-off (sanctions, shocks) → <span className="text-green-400">bullish gold</span></p>
                <p>Window: <span className="text-white font-semibold">15–60m</span></p>
              </div>
              <div className="mt-4 text-xs text-gray-500">
                Legend: 50 neutral; 55–64 mild; ≥65 strong.
              </div>
            </div>
          </div>

          {/* Recent Signals Table */}
          <div className="bg-gray-900/50 border border-white/10 rounded-xl p-5 mb-6">
            <h2 className="text-lg font-semibold mb-3">Recent Signals</h2>
            {signals.length === 0 ? (
              <p className="text-sm text-gray-400">
                No signals generated yet. Signal engine needs backend wiring or manual entry.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-400 text-xs border-b border-white/10">
                      <th className="text-left py-2 px-2">Time</th>
                      <th className="text-left py-2 px-2">Signal</th>
                      <th className="text-left py-2 px-2">Why</th>
                      <th className="text-left py-2 px-2">Horizon</th>
                      <th className="text-left py-2 px-2">Outcome</th>
                    </tr>
                  </thead>
                  <tbody>
                    {signals.map((s, i) => (
                      <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition">
                        <td className="py-2 px-2 text-gray-300 whitespace-nowrap">{s.time}</td>
                        <td className="py-2 px-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            s.signal.toLowerCase().includes("risk-on") ? "bg-green-500/15 text-green-400 border border-green-500/30" :
                            s.signal.toLowerCase().includes("risk-off") ? "bg-red-500/15 text-red-400 border border-red-500/30" :
                            "bg-gray-500/15 text-gray-400 border border-gray-500/30"
                          }`}>
                            {s.signal}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-gray-400 max-w-[300px] truncate">{s.why}</td>
                        <td className="py-2 px-2 text-gray-400">{s.horizon}</td>
                        <td className="py-2 px-2 text-gray-300">{s.outcome}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Analog Scenarios */}
          <div className="bg-gray-900/50 border border-white/10 rounded-xl p-5 mb-6">
            <h2 className="text-lg font-semibold mb-3">Analog Scenarios</h2>
            <div className="text-sm text-gray-500">
              Drop images in <code className="text-cyan-300">public/analogs/</code> and create a <code className="text-cyan-300">manifest.json</code> to auto-populate historical pattern matches.
            </div>
            <div className="mt-2 text-xs text-gray-600">
              Tip: Use clear titles and short notes (e.g., “Aug 2019 Yuan deval — Gold +3%/24h”).
            </div>
          </div>

          <div className="text-center text-xs text-gray-600 py-4">
            Sentotrade • experimental tools — not investment advice.
          </div>
        </div>
      </main>
    </>
  );
}
