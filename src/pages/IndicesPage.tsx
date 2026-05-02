// IndicesPage.tsx — LIVE index data via Yahoo Finance
import { useEffect, useState } from "react";
import { Link } from "react-router";
import NavBar from "@/components/NavBar";
import { apiUrl } from "@/lib/sameOriginApi";

interface IndexData {
  name: string;
  ticker: string;
  price: string;
  change: string;
  changePct: string;
  status: "bullish" | "bearish" | "neutral";
}

export default function IndicesPage() {
  const [indices, setIndices] = useState<IndexData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(apiUrl("/api/indices"), {
          headers: { Accept: "application/json" },
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`Indices API ${res.status}`);
        const rawText = await res.text();
        const ct = res.headers.get("content-type") || "";
        const looksHtml = /^\s*</.test(rawText) || rawText.includes("<!DOCTYPE");
        if (looksHtml || !ct.includes("application/json")) {
          throw new Error(
            "Indices API returned HTML, not JSON — /api/* is not reaching Node. Fix nginx (or proxy): pass /api/ to the Node process, not static try_files / index.html."
          );
        }
        const data = JSON.parse(rawText);
        const rows = Array.isArray(data?.indices) ? data.indices : [];
        const out: IndexData[] = rows.map((row: any) => ({
          name: String(row.name || "—"),
          ticker: String(row.ticker || "—"),
          price: String(row.price ?? "—"),
          change: String(row.change ?? "—"),
          changePct: String(row.changePct ?? "—"),
          status: (row.status as IndexData["status"]) || "neutral",
        }));
        setIndices(out.length ? out : []);
        if (!out.length) setError("No index data returned");
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
            Live index levels from <code className="text-cyan-400/90">/api/indices</code> (server-side Yahoo chart). Updates on page load.
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
