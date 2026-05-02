// WatchdogPage.tsx — real news feed + dynamic theme scoring. No demo themes.
import { useEffect, useState } from "react";
import { Link } from "react-router";
import NavBar from "@/components/NavBar";

interface AssetImpact {
  asset: string;
  direction: "▲" | "▼" | "—";
  strength: number;
}

interface WatchdogTheme {
  id: string;
  name: string;
  heat: number;
  count: number;
  category: "risk-on" | "risk-off" | "commodity" | "macro" | "fx";
  impacts: AssetImpact[];
  keywords: string[];
}

/** Drop obvious spam / affiliate headlines so themes stay market-relevant */
const SPAM_TITLE =
  /casino|slot\b|royal vegas|online poker|betting site|lottery jackpot|viagra|cbd gummies|crypto giveaway|double your bitcoin|free spins/i;

function filterHeadlines(headlines: string[]): string[] {
  return headlines.filter((h) => h && !SPAM_TITLE.test(h));
}

/* ─── theme engine: per-headline hits (fair when feed mixes crypto + macro) ─── */
function buildThemes(headlines: string[]): WatchdogTheme[] {
  const themes: WatchdogTheme[] = [
    {
      id: "gold",
      name: "Gold / Safe Haven",
      heat: 0, count: 0, category: "commodity",
      impacts: [{ asset: "Gold", direction: "▲", strength: 2 }, { asset: "BTC", direction: "▼", strength: 1 }],
      keywords: ["gold", "xau", "safe haven", "fear", "recession", "yield drop", "real yield"],
    },
    {
      id: "btc",
      name: "Bitcoin / Crypto Flow",
      heat: 0, count: 0, category: "risk-on",
      impacts: [{ asset: "BTC", direction: "▲", strength: 3 }, { asset: "ETH", direction: "▲", strength: 2 }],
      keywords: ["bitcoin", "btc", "etf", "crypto", "ethereum", "eth", "inflow", "adoption"],
    },
    {
      id: "oil",
      name: "Oil / Energy",
      heat: 0, count: 0, category: "commodity",
      impacts: [{ asset: "Oil", direction: "▲", strength: 2 }, { asset: "DXY", direction: "▲", strength: 1 }],
      keywords: ["oil", "crude", "opec", "wti", "brent", "energy", "gasoline", "petroleum"],
    },
    {
      id: "tesla",
      name: "Tesla / EV",
      heat: 0, count: 0, category: "risk-on",
      impacts: [{ asset: "TSLA", direction: "▲", strength: 2 }, { asset: "SPX", direction: "▲", strength: 1 }],
      keywords: ["tesla", "tsla", "elon musk", "electric vehicle", "ev ", "cybertruck", "model y", "model 3"],
    },
    {
      id: "macro",
      name: "Fed / Rates / Macro",
      heat: 0, count: 0, category: "macro",
      impacts: [{ asset: "DXY", direction: "▲", strength: 2 }, { asset: "Gold", direction: "▼", strength: 1 }],
      keywords: ["fed", "federal reserve", "cpi", "inflation", "jobs report", "nfp", "pmi", "gdp", "treasury", "yield", "interest rate"],
    },
    {
      id: "tariff",
      name: "Tariffs / Trade War",
      heat: 0, count: 0, category: "risk-off",
      impacts: [{ asset: "Gold", direction: "▲", strength: 2 }, { asset: "SPX", direction: "▼", strength: 2 }],
      keywords: ["tariff", "trade war", "sanctions", "china", "export", "import", "wto"],
    },
  ];

  const clean = filterHeadlines(headlines);
  for (const t of themes) {
    let headlineHits = 0;
    for (const h of clean) {
      const lower = h.toLowerCase();
      if (t.keywords.some((kw) => lower.includes(kw))) headlineHits++;
    }
    t.count = headlineHits;
    t.heat = Math.min(100, headlineHits * 18);
  }

  themes.sort((a, b) => b.heat - a.heat);
  return themes;
}

function impactArrows(impact: AssetImpact): string {
  const char = impact.direction === "▲" ? "▲" : impact.direction === "▼" ? "▼" : "—";
  return char.repeat(Math.max(1, impact.strength));
}

export default function WatchdogPage() {
  const [headlines, setHeadlines] = useState<string[]>([]);
  const [themes, setThemes] = useState<WatchdogTheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState("—");

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        const res = await fetch("/api/news");
        if (!res.ok) throw new Error("News API error");
        const data = await res.json();
        const arts = (data?.articles || []).slice(0, 24);
        const hl = filterHeadlines(arts.map((a: any) => a.title || "").filter(Boolean));
        if (!alive) return;
        setHeadlines(hl);
        setThemes(buildThemes(hl));
        setLastUpdate(new Date().toLocaleTimeString());
      } catch (e) {
        if (!alive) return;
        setHeadlines([]);
        setThemes([]);
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    const timer = setInterval(load, 120_000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);

  return (
    <>
      <NavBar current="watchdog" />
      <main className="min-h-screen bg-gradient-to-br from-black to-gray-900 text-white">
        <div className="max-w-5xl mx-auto px-6 py-10">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-4xl font-bold">🛡️ Watchdog</h1>
            <span className="text-xs text-gray-500 bg-white/5 px-3 py-1 rounded-full border border-white/10">
              Updated: {lastUpdate}
            </span>
          </div>
          <p className="text-gray-400 mb-8">
            Live news scan → theme detection → asset impact scoring.
          </p>

          {loading && <div className="text-center text-gray-500 py-8">Scanning headlines…</div>}

          {/* Themes radar */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {themes.length === 0 && !loading && (
              <div className="col-span-2 bg-white/5 border border-white/10 rounded-xl p-5 text-sm text-gray-400">
                No themes detected. News feed may be empty or API key not configured.
              </div>
            )}
            {themes.map((t) => (
              <div
                key={t.id}
                className={`bg-white/5 border rounded-xl p-5 transition ${
                  t.heat > 60
                    ? "border-amber-500/40"
                    : t.heat > 30
                    ? "border-white/20"
                    : "border-white/10 opacity-70"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold">{t.name}</h3>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          t.heat > 60 ? "bg-amber-400" : t.heat > 30 ? "bg-cyan-400" : "bg-gray-500"
                        }`}
                        style={{ width: `${t.heat}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-400">{t.heat}</span>
                  </div>
                </div>
                <div className="text-xs text-gray-500 mb-2">
                  {t.count} headline{t.count === 1 ? "" : "s"} • {t.category}
                </div>
                <div className="flex gap-3">
                  {t.impacts.map((imp, i) => (
                    <div
                      key={i}
                      className={`text-xs px-2 py-1 rounded border ${
                        imp.direction === "▲"
                          ? "border-green-500/30 text-green-400 bg-green-500/10"
                          : imp.direction === "▼"
                          ? "border-red-500/30 text-red-400 bg-red-500/10"
                          : "border-gray-500/30 text-gray-400 bg-gray-500/10"
                      }`}
                    >
                      {imp.asset} {impactArrows(imp)}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Raw headlines */}
          <div className="bg-gray-900/50 border border-white/10 rounded-xl p-5">
            <h2 className="text-lg font-semibold mb-3">📰 Source Headlines</h2>
            {headlines.length === 0 ? (
              <p className="text-sm text-gray-400">No headlines loaded.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[400px] overflow-y-auto pr-1">
                {headlines.map((h, i) => (
                  <div key={i} className="text-xs text-gray-300 bg-white/5 border border-white/5 rounded px-3 py-2">
                    {h}
                  </div>
                ))}
              </div>
            )}
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
