// GuruPage.tsx — LIVE prices + real news. No fake whales.
import { useEffect, useState } from "react";
import NavBar from "@/components/NavBar";

interface MarketPrice {
  symbol: string;
  price: string;
  change24h: string;
  direction: "up" | "down" | "flat";
}

interface NewsItem {
  headline: string;
  url?: string;
}

interface WhaleAlert {
  time: string;
  amount: string;
  coin: string;
  from?: string;
  to?: string;
  txid?: string;
  usd: number;
}

/** POST /api/guru/briefing — matches server.mjs Step 15a (local / no-LLM briefing). */
interface GuruBriefingPayload {
  asset: string;
  timeframe: string;
  mode: string;
  marketState: string;
  bias: string;
  confidence: number;
  reasonChain: string[];
  riskWarnings: string[];
  observationWindow: string;
  invalidationLevel: string;
  plainEnglishSummary: string;
  disclaimer: string;
  timestamp: string;
}

const BRIEFING_ASSETS: { value: string; label: string }[] = [
  { value: "BTC", label: "BTC" },
  { value: "ETH", label: "ETH" },
  { value: "GOLD", label: "Gold" },
  { value: "OIL", label: "Oil" },
  { value: "TSLA", label: "TSLA" },
  { value: "NVDA", label: "NVDA" },
  { value: "GOOGL", label: "GOOGL" },
  { value: "TSM", label: "TSM" },
  { value: "AVGO", label: "AVGO" },
  { value: "MU", label: "MU" },
  { value: "INTC", label: "INTC" },
  { value: "SMCI", label: "SMCI" },
  { value: "PANW", label: "PANW" },
  { value: "SOUN", label: "SOUN" },
];

/** Values must match server BRIEFING_TIMEFRAMES (server.mjs). */
const BRIEFING_TIMEFRAMES: { value: string; label: string }[] = [
  { value: "1h-4h", label: "1h–4h" },
  { value: "4h-1d", label: "4h–1d (≈ day session)" },
  { value: "1d-5d", label: "1d–5d (multi-day)" },
  { value: "12h", label: "12h" },
  { value: "24h", label: "24h" },
  { value: "1w", label: "1 week" },
  { value: "session", label: "Session" },
];

const BRIEFING_MODES: { value: string; label: string }[] = [
  { value: "momentum_check", label: "Momentum Check" },
  { value: "sentiment_read", label: "Sentiment Read" },
  { value: "risk_check", label: "Risk Check" },
];

/* ─── live price fetch ─── */
async function fetchLivePrices(): Promise<MarketPrice[]> {
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,binancecoin,ripple&vs_currencies=usd&include_24hr_change=true"
    );
    if (!res.ok) return [];
    const data = await res.json();
    const map: Record<string, string> = {
      bitcoin: "BTC",
      ethereum: "ETH",
      solana: "SOL",
      binancecoin: "BNB",
      ripple: "XRP",
    };
    return Object.entries(data).map(([id, v]: [string, any]) => {
      const price = v?.usd ?? 0;
      const ch = v?.usd_24h_change ?? 0;
      return {
        symbol: map[id] || id.toUpperCase(),
        price: price >= 1 ? `$${price.toLocaleString("en-US", { maximumFractionDigits: 2 })}` : `$${price.toFixed(4)}`,
        change24h: `${ch >= 0 ? "+" : ""}${ch.toFixed(2)}%`,
        direction: ch > 0.5 ? "up" : ch < -0.5 ? "down" : "flat",
      };
    });
  } catch {
    return [];
  }
}

/* ─── real news fetch ─── */
async function fetchLiveNews(): Promise<NewsItem[]> {
  try {
    const res = await fetch("/api/news");
    if (!res.ok) return [];
    const data = await res.json();
    return (data?.articles || [])
      .slice(0, 8)
      .map((a: any) => ({ headline: a.title || "News item", url: a.link || "#" }));
  } catch {
    return [];
  }
}

/* ─── AI insight from real data ─── */
function generateInsight(prices: MarketPrice[], news: NewsItem[]): string {
  const btc = prices.find((p) => p.symbol === "BTC");
  const eth = prices.find((p) => p.symbol === "ETH");
  const hot = news[0]?.headline || "No major headlines.";

  return `Guru Analysis — ${new Date().toUTCString()}

📊 MARKET SNAPSHOT
BTC: ${btc?.price ?? "—"} (${btc?.change24h ?? "—"})
ETH: ${eth?.price ?? "—"} (${eth?.change24h ?? "—"})

📰 HEADLINE SCAN
"${hot}"

🧠 READ
Watch BTC 24h change for risk-on/off tone. ETH leading alt sentiment. If headline heat ≥3/hr, expect volatility in 15–60m window. Gold inverse to DXY; confirm with ±0.7% moves.
`;
}

export default function GuruPage() {
  const [prices, setPrices] = useState<MarketPrice[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [whales, setWhales] = useState<WhaleAlert[]>([]);
  const [insight, setInsight] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState("—");

  const [bfAsset, setBfAsset] = useState("BTC");
  const [bfTimeframe, setBfTimeframe] = useState("1h-4h");
  const [bfMode, setBfMode] = useState("momentum_check");
  const [bfLoading, setBfLoading] = useState(false);
  const [bfError, setBfError] = useState<string | null>(null);
  const [bfResult, setBfResult] = useState<GuruBriefingPayload | null>(null);

  async function runBriefing() {
    setBfLoading(true);
    setBfError(null);
    setBfResult(null);
    try {
      const res = await fetch("/api/guru/briefing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          asset: bfAsset,
          timeframe: bfTimeframe,
          mode: bfMode,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          typeof data.error === "string"
            ? data.error
            : data.error
              ? JSON.stringify(data.error)
              : `Request failed (${res.status})`;
        setBfError(msg);
        return;
      }
      if (data.briefing) setBfResult(data.briefing as GuruBriefingPayload);
      else setBfError("Unexpected response shape");
    } catch {
      setBfError("Network error — try again.");
    } finally {
      setBfLoading(false);
    }
  }

  useEffect(() => {
    let alive = true;

    async function load() {
      const [p, n] = await Promise.all([fetchLivePrices(), fetchLiveNews()]);
      if (!alive) return;
      setPrices(p);
      setNews(n);
      setWhales([]); // real whale data requires BitQuery — we show honest empty state
      setInsight(generateInsight(p, n));
      setLastUpdate(new Date().toLocaleTimeString());
      setLoading(false);
    }

    load();
    const timer = setInterval(load, 60_000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);

  return (
    <>
      <NavBar current="guru" />
      <main className="min-h-screen bg-gradient-to-br from-black to-gray-900 text-white">
        <div className="max-w-5xl mx-auto px-6 py-10">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-400 to-purple-500">
                🔮 Guru Insights
              </h1>
              <p className="text-gray-400 text-sm mt-1">
                Live prices + real news scan. No simulated data.
              </p>
            </div>
            <span className="text-xs text-gray-500 bg-white/5 px-3 py-1 rounded-full border border-white/10">
              Updated: {lastUpdate}
            </span>
          </div>

          {/* Guru AI Briefing — market-readiness panel (not trade advice) */}
          <section className="mb-8 rounded-2xl border border-cyan-500/25 bg-cyan-950/20 p-5 shadow-lg shadow-cyan-900/10">
            <h2 className="text-lg font-semibold text-cyan-200 mb-1">Guru AI Briefing</h2>
            <p className="text-xs text-gray-400 mb-4">
              On-demand <span className="text-cyan-300/90">market briefing</span> from SentoTrade feeds (prices, headline scan, Live Edge Tests). Educational only — not financial advice.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Asset</label>
                <select
                  value={bfAsset}
                  onChange={(e) => setBfAsset(e.target.value)}
                  className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-cyan-500/40"
                >
                  {BRIEFING_ASSETS.map((a) => (
                    <option key={a.value} value={a.value}>
                      {a.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Timeframe</label>
                <select
                  value={bfTimeframe}
                  onChange={(e) => setBfTimeframe(e.target.value)}
                  className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-cyan-500/40"
                >
                  {BRIEFING_TIMEFRAMES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Mode</label>
                <select
                  value={bfMode}
                  onChange={(e) => setBfMode(e.target.value)}
                  className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-cyan-500/40"
                >
                  {BRIEFING_MODES.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void runBriefing()}
              disabled={bfLoading}
              className="w-full sm:w-auto rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 px-5 py-3 text-sm font-semibold text-black transition"
            >
              Ask Guru
            </button>
            {bfLoading && (
              <p className="mt-4 text-sm text-cyan-200/90">Guru is reading the tape…</p>
            )}
            {bfError && (
              <p className="mt-4 text-sm text-red-400 whitespace-pre-wrap break-words">{bfError}</p>
            )}
            {bfResult && !bfLoading && (
              <div className="mt-5 rounded-xl border border-white/10 bg-black/35 p-4 space-y-3 text-sm">
                <div>
                  <span className="text-xs uppercase tracking-wide text-gray-500">Market state</span>
                  <p className="text-gray-100 mt-1">{bfResult.marketState}</p>
                </div>
                <div className="flex flex-wrap gap-4">
                  <div>
                    <span className="text-xs uppercase tracking-wide text-gray-500">Bias</span>
                    <p className="text-amber-200 font-medium mt-1">{bfResult.bias}</p>
                  </div>
                  <div>
                    <span className="text-xs uppercase tracking-wide text-gray-500">Confidence</span>
                    <p className="text-gray-100 font-medium mt-1">{bfResult.confidence}%</p>
                  </div>
                  <div>
                    <span className="text-xs uppercase tracking-wide text-gray-500">Observation window</span>
                    <p className="text-gray-100 mt-1">{bfResult.observationWindow}</p>
                  </div>
                </div>
                <div>
                  <span className="text-xs uppercase tracking-wide text-gray-500">Reason chain</span>
                  <ul className="mt-1 list-disc list-inside text-gray-300 space-y-1">
                    {bfResult.reasonChain.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <span className="text-xs uppercase tracking-wide text-gray-500">Risk warnings</span>
                  <ul className="mt-1 list-disc list-inside text-amber-100/90 space-y-1">
                    {bfResult.riskWarnings.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <span className="text-xs uppercase tracking-wide text-gray-500">Invalidation</span>
                  <p className="text-gray-300 mt-1">{bfResult.invalidationLevel}</p>
                </div>
                <div>
                  <span className="text-xs uppercase tracking-wide text-gray-500">Plain summary</span>
                  <p className="text-gray-200 mt-1 leading-relaxed">{bfResult.plainEnglishSummary}</p>
                </div>
                <p className="text-xs text-gray-500 pt-2 border-t border-white/10">{bfResult.disclaimer}</p>
                <p className="text-[11px] text-gray-600">Generated: {bfResult.timestamp}</p>
              </div>
            )}
          </section>

          {loading && (
            <div className="text-center text-gray-500 py-8">Loading live data…</div>
          )}

          {/* Live Prices */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-6">
            {prices.map((m) => (
              <div key={m.symbol} className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                <div className="text-xs text-gray-400 uppercase tracking-wider">{m.symbol}</div>
                <div className="text-lg font-bold mt-1">{m.price}</div>
                <div
                  className={`text-xs mt-1 ${
                    m.direction === "up"
                      ? "text-green-400"
                      : m.direction === "down"
                      ? "text-red-400"
                      : "text-gray-400"
                  }`}
                >
                  {m.change24h}
                </div>
              </div>
            ))}
          </div>

          {/* Two columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
            {/* Whale Alerts — honest empty state */}
            <div className="bg-gray-900/50 border border-white/10 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold">🐋 Whale Alerts</h2>
                <span className="text-[10px] bg-amber-500/10 text-amber-300 border border-amber-500/20 px-2 py-0.5 rounded-full">
                  Optional
                </span>
              </div>
              {whales.length === 0 ? (
                <div className="text-sm text-gray-400 space-y-2">
                  <p>On-chain whale lines will show here when exchange flows are connected (BitQuery).</p>
                  <p className="text-xs text-gray-500">
                    For large BTC transfers now, use the <span className="text-cyan-300">Dashboard</span> whale row.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {whales.map((w, i) => (
                    <div key={i} className="flex justify-between text-sm border-b border-white/5 py-2">
                      <span className="text-gray-300">
                        {w.amount} {w.coin}
                      </span>
                      <span className="text-gray-500">{w.time}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* News Feed */}
            <div className="bg-gray-900/50 border border-white/10 rounded-xl p-5">
              <h2 className="text-lg font-semibold mb-3">📰 Headlines</h2>
              {news.length === 0 ? (
                <p className="text-sm text-gray-400">No headlines loaded.</p>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {news.map((n, i) => (
                    <a
                      key={i}
                      href={n.url || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-sm text-gray-300 hover:text-cyan-300 transition border-b border-white/5 py-2"
                    >
                      {n.headline}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* AI Insight */}
          <div id="guru-read" className="bg-gradient-to-r from-purple-900/30 to-amber-900/30 border border-white/10 rounded-xl p-5 scroll-mt-24">
            <h2 className="text-lg font-semibold mb-3">🧠 Guru Read</h2>
            <pre className="text-sm text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">
              {insight || "Awaiting data…"}
            </pre>
          </div>

          <div className="mt-6 text-center text-xs text-gray-600">
            Sentotrade • experimental tools — not investment advice.
          </div>

          <button
            type="button"
            className="fixed bottom-28 right-5 z-[100] flex h-14 w-14 items-center justify-center rounded-full border-2 border-purple-400/70 bg-purple-600 text-2xl shadow-lg shadow-black/50 hover:bg-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-300"
            aria-label="Jump to Guru read"
            onClick={() =>
              document.getElementById("guru-read")?.scrollIntoView({ behavior: "smooth", block: "start" })
            }
          >
            🔮
          </button>
        </div>
      </main>
    </>
  );
}
