// IndicesPage.tsx — LIVE index data via Yahoo Finance
import { useEffect, useState } from "react";
import { Link } from "react-router";
import NavBar from "@/components/NavBar";

interface IndexData {
  name: string;
  ticker: string;
  price: string;
  change: string;
  changePct: string;
  status: "bullish" | "bearish" | "neutral";
}

const INDEX_MAP: Record<string, { name: string; yahoo: string }> = {
  "^GSPC": { name: "S&P 500", yahoo: "%5EGSPC" },
  "^IXIC": { name: "Nasdaq 100", yahoo: "%5EIXIC" },
  "^DJI": { name: "Dow Jones", yahoo: "%5EDJI" },
  "^RUT": { name: "Russell 2000", yahoo: "%5ERUT" },
  "^VIX": { name: "VIX", yahoo: "%5EVIX" },
};

function fmt(n: number | null): string {
  if (n === null || !Number.isFinite(n)) return "—";
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function IndicesPage() {
  const [indices, setIndices] = useState<IndexData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const symbols = Object.values(INDEX_MAP).map((m) => m.yahoo).join(",");
        const res = await fetch(
          `https://query1.finance.yahoo.com/v8/finance/chart/${symbols}?interval=1d&range=1d`,
          { headers: { Accept: "application/json" } }
        );
        if (!res.ok) throw new Error("Yahoo Finance unavailable");
        const data = await res.json();

        const charts = Array.isArray(data?.chart?.result)
          ? data.chart.result
          : [data?.chart?.result].filter(Boolean);

        const out: IndexData[] = [];
        for (const c of charts) {
          const meta = c?.meta;
          if (!meta) continue;
          const price = meta.regularMarketPrice ?? meta.previousClose ?? null;
          const prev = meta.chartPreviousClose ?? meta.previousClose ?? price;
          const ch = price && prev ? price - prev : 0;
          const chPct = prev ? (ch / prev) * 100 : 0;
          const status: IndexData["status"] = chPct > 0.1 ? "bullish" : chPct < -0.1 ? "bearish" : "neutral";
          out.push({
            name: meta.shortName || meta.symbol || "Index",
            ticker: meta.symbol?.replace("^", "") || "—",
            price: fmt(price),
            change: `${ch >= 0 ? "+" : ""}${fmt(ch)}`,
            changePct: `${chPct >= 0 ? "+" : ""}${chPct.toFixed(2)}%`,
            status,
          });
        }
        setIndices(out.length ? out : []);
      } catch (e: any) {
        setError(e.message || "Failed to load indices");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <>
      <NavBar current="indices" />
      <main className="min-h-screen bg-gradient-to-br from-black to-gray-900 text-white">
        <div className="max-w-4xl mx-auto px-6 py-10">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-4xl font-bold">📈 Indices</h1>
            {loading && <span className="text-xs text-gray-500">Loading…</span>}
          </div>
          <p className="text-gray-400 mb-8">
            Live index levels from Yahoo Finance. Updates on page load.
          </p>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 rounded-lg mb-6 text-sm">
              {error} — retrying next visit.
            </div>
          )}

          <div className="space-y-3">
            {indices.map((idx) => (
              <div
                key={idx.ticker}
                className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-5 py-4 hover:border-white/20 transition"
              >
                <div className="flex items-center gap-4">
                  <span className="text-2xl">📊</span>
                  <div>
                    <h3 className="font-bold">{idx.name}</h3>
                    <span className="text-sm text-gray-500">{idx.ticker}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-lg">{idx.price}</div>
                  <span
                    className={`text-sm ${
                      idx.status === "bullish"
                        ? "text-green-400"
                        : idx.status === "bearish"
                        ? "text-red-400"
                        : "text-gray-400"
                    }`}
                  >
                    {idx.change} ({idx.changePct})
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 text-center">
            <Link to="/hub" className="text-cyan-400 hover:underline">
              ← Back to Pro Hub
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
