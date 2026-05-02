// Stats + prediction split + API “limits” (replaces legacy public/stats-ai-split.js after SPA deploy).
import { useEffect, useState } from "react";

type StatsSummary = {
  total: number;
  categories: { bias: number; prediction: number; news: number };
  predictionRecord: { hit: number; missed: number; partial: number; open: number };
  lastNewsCount: number;
  latestBias: { score?: number; label?: string } | null;
};

type Health = {
  time?: string;
  keys?: { polygon?: boolean; bitquery?: boolean; newsdata?: boolean };
};

function Pill({ label, value, tone }: { label: string; value: number; tone: "green" | "red" | "amber" | "blue" | "gray" }) {
  const tones = {
    green: "border-green-500/40 bg-green-500/10 text-green-300",
    red: "border-red-500/40 bg-red-500/10 text-red-300",
    amber: "border-amber-500/40 bg-amber-500/10 text-amber-200",
    blue: "border-blue-500/40 bg-blue-500/10 text-blue-300",
    gray: "border-white/20 bg-white/5 text-gray-300",
  };
  return (
    <div className={`rounded-lg border px-3 py-2 text-center ${tones[tone]}`}>
      <div className="text-xl font-bold tabular-nums">{value}</div>
      <div className="text-[10px] uppercase tracking-wide opacity-80">{label}</div>
    </div>
  );
}

export default function StatsSummarySplitCard() {
  const [summary, setSummary] = useState<StatsSummary | null>(null);
  const [health, setHealth] = useState<Health | null>(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const [sRes, hRes] = await Promise.all([fetch("/api/stats/summary"), fetch("/api/health")]);
        if (!alive) return;
        if (sRes.ok) setSummary(await sRes.json());
        if (hRes.ok) setHealth(await hRes.json());
        if (!sRes.ok && !hRes.ok) setErr("Stats API unavailable");
      } catch {
        if (alive) setErr("Could not load stats");
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    const t = setInterval(load, 120_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  if (loading) {
    return (
      <section className="mb-8 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-gray-500">
        Loading stats split…
      </section>
    );
  }

  if (err && !summary && !health) {
    return (
      <section className="mb-8 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-200">
        {err}
      </section>
    );
  }

  const pr = summary?.predictionRecord ?? { hit: 0, missed: 0, partial: 0, open: 0 };
  const cat = summary?.categories ?? { bias: 0, prediction: 0, news: 0 };
  const keys = health?.keys;

  return (
    <section
      className="mb-8 rounded-xl border border-cyan-500/25 bg-gradient-to-br from-white/[0.07] to-white/[0.02] p-5 shadow-lg shadow-black/20"
      aria-labelledby="stats-split-heading"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
        <h2 id="stats-split-heading" className="text-lg font-semibold text-white">
          Stats split &amp; limits
        </h2>
        {health?.time ? (
          <span className="text-[11px] text-gray-500 font-mono">API: {health.time}</span>
        ) : null}
      </div>

      <p className="text-xs text-gray-500 mb-4">
        Logged prediction outcomes (from server stats file) and which external keys the app can use.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
        <Pill label="Hit" value={pr.hit} tone="green" />
        <Pill label="Missed" value={pr.missed} tone="red" />
        <Pill label="Partial" value={pr.partial} tone="amber" />
        <Pill label="Open" value={pr.open} tone="blue" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
        <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-3">
          <div className="text-[11px] uppercase tracking-wide text-gray-500 mb-2">Event counts</div>
          <ul className="space-y-1 text-gray-300">
            <li>
              <span className="text-gray-500">Total logged:</span> {summary?.total ?? 0}
            </li>
            <li>
              <span className="text-gray-500">Bias samples:</span> {cat.bias}
            </li>
            <li>
              <span className="text-gray-500">Prediction events:</span> {cat.prediction}
            </li>
            <li>
              <span className="text-gray-500">News snapshots:</span> {cat.news}
              {summary?.lastNewsCount != null ? (
                <span className="text-gray-600"> (last batch: {summary.lastNewsCount})</span>
              ) : null}
            </li>
          </ul>
          {summary?.latestBias && typeof summary.latestBias.score === "number" ? (
            <p className="mt-2 text-xs text-gray-500">
              Latest bias: {summary.latestBias.score} ({String(summary.latestBias.label ?? "—")})
            </p>
          ) : null}
        </div>

        <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-3">
          <div className="text-[11px] uppercase tracking-wide text-gray-500 mb-2">API keys / limits</div>
          {keys ? (
            <ul className="space-y-1 text-gray-300">
              <li className="flex justify-between gap-2">
                <span>Polygon</span>
                <span className={keys.polygon ? "text-green-400" : "text-gray-600"}>
                  {keys.polygon ? "configured" : "off"}
                </span>
              </li>
              <li className="flex justify-between gap-2">
                <span>BitQuery</span>
                <span className={keys.bitquery ? "text-green-400" : "text-gray-600"}>
                  {keys.bitquery ? "configured" : "off"}
                </span>
              </li>
              <li className="flex justify-between gap-2">
                <span>NewsData</span>
                <span className={keys.newsdata ? "text-green-400" : "text-gray-600"}>
                  {keys.newsdata ? "configured" : "off"}
                </span>
              </li>
            </ul>
          ) : (
            <p className="text-gray-500 text-xs">Health endpoint not available.</p>
          )}
        </div>
      </div>
    </section>
  );
}
