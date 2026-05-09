// WatchdogPage.tsx — real news feed + dynamic theme scoring. No demo themes.
import { useEffect, useState } from "react";
import { Link } from "react-router";
import NavBar from "@/components/NavBar";
import { buildThemes, filterHeadlines, type WatchdogTheme, type AssetImpact } from "@/lib/watchdogThemes";

function impactArrows(impact: AssetImpact): string {
  const char = impact.direction === "▲" ? "▲" : impact.direction === "▼" ? "▼" : "—";
  return char.repeat(Math.max(1, impact.strength));
}

function categoryClass(cat: WatchdogTheme["category"]): string {
  if (cat === "risk-on") return "text-emerald-300";
  if (cat === "risk-off") return "text-rose-300";
  if (cat === "commodity") return "text-amber-200";
  if (cat === "macro") return "text-sky-300";
  return "text-violet-300";
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
        const hl = filterHeadlines(arts.map((a: { title?: string }) => a.title || "").filter(Boolean));
        if (!alive) return;
        setHeadlines(hl);
        setThemes(buildThemes(arts.slice(0, 24)));
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
            <span className="text-xs text-gray-300 bg-white/5 px-3 py-1 rounded-full border border-white/10">
              Updated: {lastUpdate}
            </span>
          </div>
          <p className="text-gray-300 mb-8 leading-relaxed">
            Live news scan → theme detection → asset impact scoring.
          </p>

          {loading && <div className="text-center text-gray-400 py-8">Scanning headlines…</div>}

          {/* Themes radar */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {themes.length === 0 && !loading && (
              <div className="col-span-2 bg-white/5 border border-white/10 rounded-xl p-5 text-sm text-gray-300 leading-relaxed">
                No themes detected. News feed may be empty or API key not configured.
              </div>
            )}
            {themes.map((t) => (
              <div
                key={t.id}
                className={`rounded-xl p-5 transition border ${
                  t.heat > 60
                    ? "bg-white/[0.07] border-amber-500/40"
                    : t.heat > 30
                    ? "bg-white/[0.06] border-white/20"
                    : "bg-white/[0.04] border-white/10"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-white">{t.name}</h3>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          t.heat > 60 ? "bg-amber-400" : t.heat > 30 ? "bg-cyan-400" : "bg-gray-400"
                        }`}
                        style={{ width: `${t.heat}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-gray-300 tabular-nums">{t.heat}</span>
                  </div>
                </div>
                <div className="text-sm text-gray-300 mb-2 leading-snug">
                  <span className="text-gray-400">{t.count} headline{t.count === 1 ? "" : "s"}</span>
                  <span className="text-gray-400 mx-1">•</span>
                  <span className={`font-semibold capitalize ${categoryClass(t.category)}`}>
                    {t.category.replace(/-/g, " ")}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {t.impacts.map((imp, i) => (
                    <div
                      key={i}
                      className={`text-sm px-2.5 py-1 rounded border font-medium ${
                        imp.direction === "▲"
                          ? "border-green-500/40 text-green-300 bg-green-500/15"
                          : imp.direction === "▼"
                          ? "border-red-500/40 text-red-300 bg-red-500/15"
                          : "border-gray-500/40 text-gray-300 bg-gray-500/15"
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
              <p className="text-sm text-gray-300">No headlines loaded.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[400px] overflow-y-auto pr-1">
                {headlines.map((h, i) => (
                  <div key={i} className="text-sm text-gray-200 bg-white/5 border border-white/10 rounded px-3 py-2 leading-snug">
                    {h}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-8 text-center">
            <Link to="/hub" className="text-cyan-400 hover:underline">
              ← Back to Trader Hub
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
