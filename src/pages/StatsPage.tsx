import { useEffect, useState } from "react";
import NavBar from "@/components/NavBar";
import { apiUrl } from "@/lib/sameOriginApi";

interface StatsSummary {
  total: number;
  categories: { bias: number; prediction: number; news: number };
  predictionRecord: { hit: number; missed: number; partial: number; open: number };
  latestBias: { score?: number; label?: string; tape?: string } | null;
  lastNewsCount: number;
}

interface ServerPrediction {
  id: string;
  time: string;
  asset: string;
  call: string;
  entry: number;
  target?: string;
  targetPct?: string;
  timeframe?: string;
  status: string;
  outcome?: string;
  why?: string;
}

const MANUAL_KEY = "sentotrade_predictions";

function loadManual(): any[] {
  try { return JSON.parse(localStorage.getItem(MANUAL_KEY) || "[]"); } catch { return []; }
}

export default function StatsPage() {
  const [summary, setSummary] = useState<StatsSummary | null>(null);
  const [serverPredictions, setServerPredictions] = useState<ServerPrediction[]>([]);
  const [gossip, setGossip] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const [sRes, pRes, gRes] = await Promise.all([
          fetch(apiUrl("/api/stats/summary")),
          fetch(apiUrl("/api/predictions?limit=200")),
          fetch(apiUrl("/api/gossip")).catch(() => null),
        ]);
        if (!alive) return;

        if (sRes.ok) setSummary(await sRes.json());
        if (pRes.ok) {
          const data = await pRes.json();
          setServerPredictions(data.items || []);
        }
        if (gRes && gRes.ok) setGossip(await gRes.json());
      } catch {
        if (alive) setErr("Failed to load stats");
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    const id = setInterval(load, 60000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  const manual = loadManual();
  const manualScored = manual.filter((p: any) => p.status !== "open" && p.status !== "void");
  const manualRate = manualScored.length > 0
    ? Math.round(((manual.filter((p: any) => p.status === "hit").length + manual.filter((p: any) => p.status === "partial").length * 0.5) / manualScored.length) * 100)
    : 0;

  const rec = summary?.predictionRecord || { hit: 0, missed: 0, partial: 0, open: 0 };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black to-gray-900 text-white">
      <NavBar current="stats" />

      <div className="max-w-6xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-1">Sentotrade Dashboard</h1>
        <p className="text-sm text-gray-400 mb-6">Sentotrade auto-generates predictions from gossip spikes — no human input.</p>

        {/* ── AI Intelligence Track Record ── */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-cyan-300 mb-4">AI Intelligence Track Record</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* AI-Gossip */}
            <div className="bg-gray-900/50 border border-cyan-500/20 rounded-xl p-5 text-center">
              <div className="text-xs text-cyan-400 font-semibold uppercase tracking-wider mb-2">AI-Gossip</div>
              <div className="text-4xl font-bold mb-2">{serverPredictions.length}</div>
              <div className="text-sm text-gray-400 mb-2">Auto predictions</div>
              <div className="text-lg text-green-400">
                {rec.hit + rec.missed + rec.partial > 0
                  ? Math.round(((rec.hit + rec.partial * 0.5) / (rec.hit + rec.missed + rec.partial)) * 100) + "%"
                  : "Pending"}
              </div>
              <div className="text-xs text-gray-500 mt-3 text-left">
                BTC: {serverPredictions.filter((p) => p.asset?.includes("BTC")).length}<br />
                Gold: {serverPredictions.filter((p) => p.asset?.includes("Gold")).length}<br />
                Oil: {serverPredictions.filter((p) => p.asset?.includes("Oil")).length}<br />
                TSLA: {serverPredictions.filter((p) => p.asset === "TSLA").length}
              </div>
            </div>

            {/* Guru Bias */}
            <div className="bg-gray-900/50 border border-purple-500/20 rounded-xl p-5 text-center">
              <div className="text-xs text-purple-400 font-semibold uppercase tracking-wider mb-2">Guru Bias</div>
              <div className="text-4xl font-bold mb-2">{summary?.categories?.bias || 0}</div>
              <div className="text-sm text-gray-400 mb-2">Bias scans</div>
              <div className="text-lg text-yellow-400">{summary?.latestBias?.label || "—"}</div>
              <div className="text-xs text-gray-500 mt-3 text-left">
                Score: {summary?.latestBias?.score || "—"}<br />
                Tape: {summary?.latestBias?.tape || "—"}
              </div>
            </div>

            {/* Manual */}
            <div className="bg-gray-900/50 border border-gray-500/20 rounded-xl p-5 text-center">
              <div className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-2">Manual</div>
              <div className="text-4xl font-bold mb-2">{manual.length}</div>
              <div className="text-sm text-gray-400 mb-2">Your predictions</div>
              <div className="text-lg text-gray-300">{manualScored.length > 0 ? manualRate + "%" : "--"}</div>
            </div>
          </div>
        </section>

        {/* ── Stats Bin ── */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-1">📊 Stats Bin</h2>
          <p className="text-sm text-gray-400 mb-4">Accumulated data from every market scan, bias read, and prediction tracked.</p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-cyan-400">{summary?.total || 0}</div>
              <div className="text-xs text-gray-500 mt-1">Total Datapoints</div>
            </div>
            <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-400">{summary?.categories?.bias || 0}</div>
              <div className="text-xs text-gray-500 mt-1">Bias Scores</div>
            </div>
            <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-yellow-400">{summary?.categories?.prediction || 0}</div>
              <div className="text-xs text-gray-500 mt-1">Predictions</div>
            </div>
            <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-purple-400">{summary?.lastNewsCount || 0}</div>
              <div className="text-xs text-gray-500 mt-1">News Snapshots</div>
            </div>
          </div>
        </section>

        {/* ── Prediction Record ── */}
        <section className="mb-8">
          <h3 className="text-lg font-semibold mb-3">Prediction Record</h3>
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-green-900/20 border border-green-700 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-green-400">{rec.hit}</div>
              <div className="text-xs text-gray-400">Hit</div>
            </div>
            <div className="bg-red-900/20 border border-red-700 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-red-400">{rec.missed}</div>
              <div className="text-xs text-gray-400">Missed</div>
            </div>
            <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-yellow-400">{rec.partial}</div>
              <div className="text-xs text-gray-400">Partial</div>
            </div>
            <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-blue-400">{rec.open}</div>
              <div className="text-xs text-gray-400">Open</div>
            </div>
          </div>
        </section>

        {/* ── Gossip Signal ── */}
        <section className="mb-8">
          <h3 className="text-lg font-semibold mb-2">🌐 Gossip Signal</h3>
          {gossip ? (
            <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4">
              <p className="text-sm text-gray-300">Intensity: <span className="font-bold text-white">{gossip.intensity || "—"}</span></p>
              <p className="text-sm text-gray-400 mt-1">
                Top spywords: {Array.isArray(gossip.spywords) ? gossip.spywords.join(", ") : gossip.spywords || "—"}
              </p>
              <p className="text-sm text-gray-400 mt-1">
                Latest alerts: {Array.isArray(gossip.alerts) ? gossip.alerts.slice(0, 3).join(" • ") : gossip.latest || "—"}
              </p>
            </div>
          ) : (
            <div className="bg-gray-900/30 border border-gray-700 rounded-lg p-4">
              <p className="text-sm text-gray-500">Gossip feed paused.</p>
              <p className="text-xs text-gray-600 mt-1">Server endpoint /api/gossip not available.</p>
            </div>
          )}
        </section>

        {/* Loading / Error */}
        {loading && <p className="text-gray-500 text-sm mb-4">Loading stats…</p>}
        {err && <p className="text-red-400 text-sm mb-4">{err}</p>}
      </div>
    </div>
  );
}
