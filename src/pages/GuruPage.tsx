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
                  BitQuery required
                </span>
              </div>
              {whales.length === 0 ? (
                <div className="text-sm text-gray-400 space-y-2">
                  <p>Live whale tracking is not connected.</p>
                  <p className="text-xs text-gray-500">
                    To enable: add BitQuery GraphQL queries to server.mjs → <code className="text-cyan-300">/api/flow/btc</code> and <code className="text-cyan-300">/api/flow/eth</code>.
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
          <div className="bg-gradient-to-r from-purple-900/30 to-amber-900/30 border border-white/10 rounded-xl p-5">
            <h2 className="text-lg font-semibold mb-3">🧠 Guru Read</h2>
            <pre className="text-sm text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">
              {insight || "Awaiting data…"}
            </pre>
          </div>

          <div className="mt-6 text-center text-xs text-gray-600">
            Sentotrade • experimental tools — not investment advice.
          </div>
        </div>
      </main>
    </>
  );
}
