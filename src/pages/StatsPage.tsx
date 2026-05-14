// StatsPage — Live Edge Tests scorecard from /api/predictions only (no fabricated numbers).
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import NavBar from "@/components/NavBar";
import { apiUrl } from "@/lib/sameOriginApi";

interface PredItem {
  id?: string;
  asset?: string;
  status?: string;
  source?: string;
  why?: string;
  timeframe?: string;
}

interface PredRecord {
  hit: number;
  missed: number;
  partial: number;
  open: number;
}

type AssetAgg = {
  asset: string;
  hit: number;
  missed: number;
  partial: number;
  open: number;
};

function parseRecord(raw: unknown): PredRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (
    typeof r.hit === "number" &&
    typeof r.missed === "number" &&
    typeof r.partial === "number"
  ) {
    return {
      hit: r.hit,
      missed: r.missed,
      partial: r.partial,
      open: typeof r.open === "number" ? r.open : 0,
    };
  }
  return null;
}

/** Fast lane: headline heat → ~20m gross-move test (matches Dashboard Breaking Pulse). */
function isFastPulseItem(p: PredItem): boolean {
  if (String(p.source || "").toLowerCase() === "ai-gossip-fast") return true;
  if (String(p.id || "").toLowerCase().startsWith("aigf_")) return true;
  if (String(p.why || "").toLowerCase().includes("fast gossip")) return true;
  return false;
}

/** Guru price-regime follow-through (multi-hour windows); engine rows use `sig_` ids. */
function isRegimeItem(p: PredItem): boolean {
  if (String(p.id || "").toLowerCase().startsWith("sig_")) return true;
  const src = String(p.source || "").toLowerCase();
  if (src.includes("guru") || src.includes("bias")) return true;
  return false;
}

/** When `record` is missing, derive counts from the returned items (partial list — same logic shape as Predictions page). */
function countsFromItems(items: PredItem[]): PredRecord {
  let hit = 0;
  let missed = 0;
  let partial = 0;
  let open = 0;
  for (const r of items) {
    const st = String(r.status ?? "").trim().toLowerCase();
    if (st === "open") {
      open++;
      continue;
    }
    if (st === "void" || st === "") continue;
    if (st === "hit") hit++;
    else if (st === "missed") missed++;
    else if (st === "partial") partial++;
  }
  return { hit, missed, partial, open };
}

function aggregateByAsset(items: PredItem[]): AssetAgg[] {
  const m = new Map<string, AssetAgg>();
  for (const it of items) {
    const asset = String(it.asset ?? "—").trim() || "—";
    const st = String(it.status ?? "open").trim().toLowerCase();
    if (!m.has(asset)) m.set(asset, { asset, hit: 0, missed: 0, partial: 0, open: 0 });
    const row = m.get(asset)!;
    if (st === "hit") row.hit++;
    else if (st === "missed") row.missed++;
    else if (st === "partial") row.partial++;
    else if (st === "open") row.open++;
  }
  return [...m.values()].sort((a, b) => {
    const ta = a.hit + a.missed + a.partial + a.open;
    const tb = b.hit + b.missed + b.partial + b.open;
    if (tb !== ta) return tb - ta;
    return a.asset.localeCompare(b.asset);
  });
}

function hitRateStrict(hit: number, missed: number, partial: number) {
  const closed = hit + missed + partial;
  if (closed <= 0) return null;
  return Math.round((hit / closed) * 100);
}

function weightedRate(hit: number, missed: number, partial: number) {
  const closed = hit + missed + partial;
  if (closed <= 0) return null;
  return Math.round(((hit + partial * 0.5) / closed) * 100);
}

function StatSegment({
  title,
  intro,
  record,
  hitRateSub,
  borderClass,
  footnote,
}: {
  title: string;
  intro: string;
  record: PredRecord;
  hitRateSub: string;
  borderClass: string;
  footnote?: string;
}) {
  const hit = record.hit;
  const missed = record.missed;
  const partial = record.partial;
  const open = record.open;
  const closed = hit + missed + partial;
  const strictPct = hitRateStrict(hit, missed, partial);
  const weightedPct = weightedRate(hit, missed, partial);

  return (
    <section className={`mb-10 rounded-2xl border p-5 ${borderClass}`}>
      <h2 className="text-lg font-bold text-white tracking-tight">{title}</h2>
      <p className="text-sm text-gray-400 mt-2 max-w-3xl leading-relaxed">{intro}</p>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-5 mb-3">
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
          <div className="text-2xl font-bold text-white">{closed}</div>
          <div className="text-[11px] text-gray-500 mt-1 uppercase tracking-wide">Closed</div>
        </div>
        <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4 text-center">
          <div className="text-2xl font-bold text-green-400">{hit}</div>
          <div className="text-[11px] text-gray-500 mt-1 uppercase tracking-wide">Hits</div>
        </div>
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-center">
          <div className="text-2xl font-bold text-red-400">{missed}</div>
          <div className="text-[11px] text-gray-500 mt-1 uppercase tracking-wide">Missed</div>
        </div>
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-center">
          <div className="text-2xl font-bold text-amber-300">{partial}</div>
          <div className="text-[11px] text-gray-500 mt-1 uppercase tracking-wide">Partial</div>
        </div>
        <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 text-center">
          <div className="text-2xl font-bold text-blue-400">{open}</div>
          <div className="text-[11px] text-gray-500 mt-1 uppercase tracking-wide">Open</div>
        </div>
        <div className="rounded-xl border border-cyan-500/25 bg-cyan-500/5 p-4 text-center">
          <div className="text-2xl font-bold text-cyan-300">{strictPct !== null ? `${strictPct}%` : "—"}</div>
          <div className="text-[11px] text-gray-500 mt-1 uppercase tracking-wide">Strict gross %</div>
          <div className="text-[10px] text-gray-600 mt-1 leading-tight">{hitRateSub}</div>
        </div>
      </div>

      {weightedPct !== null && (
        <p className="text-xs text-gray-500">
          Weighted score (partials half): <span className="text-gray-300 font-medium">{weightedPct}%</span>
        </p>
      )}
      {footnote ? <p className="text-xs text-amber-600/85 mt-2 leading-relaxed">{footnote}</p> : null}
    </section>
  );
}

export default function StatsPage() {
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const [items, setItems] = useState<PredItem[]>([]);
  const [recordFromApi, setRecordFromApi] = useState<PredRecord | null>(null);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const res = await fetch(apiUrl("/api/predictions?limit=200"), {
          headers: { Accept: "application/json" },
          cache: "no-store",
        });
        if (!alive) return;
        if (!res.ok) {
          setUnavailable(true);
          setItems([]);
          setRecordFromApi(null);
          return;
        }
        const ct = res.headers.get("content-type") || "";
        if (!ct.includes("application/json")) {
          setUnavailable(true);
          setItems([]);
          setRecordFromApi(null);
          return;
        }
        const data = await res.json();
        if (!alive) return;
        const list = Array.isArray(data.items) ? (data.items as PredItem[]) : [];
        setItems(list);
        setRecordFromApi(parseRecord(data.record));
        setUnavailable(false);
      } catch {
        if (!alive) return;
        setUnavailable(true);
        setItems([]);
        setRecordFromApi(null);
      } finally {
        if (alive) setLoading(false);
      }
    }
    void load();
    const id = setInterval(() => {
      if (!document.hidden) void load();
    }, 60_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  const displayRecord = useMemo(() => {
    if (recordFromApi) return recordFromApi;
    if (items.length) return countsFromItems(items);
    return { hit: 0, missed: 0, partial: 0, open: 0 };
  }, [recordFromApi, items]);

  const fastItems = useMemo(() => items.filter(isFastPulseItem), [items]);
  const regimeItems = useMemo(() => items.filter(isRegimeItem), [items]);
  const fastRecord = useMemo(() => countsFromItems(fastItems), [fastItems]);
  const regimeRecord = useMemo(() => countsFromItems(regimeItems), [regimeItems]);

  const byAsset = useMemo(() => aggregateByAsset(items), [items]);

  const subsetNote =
    items.length > 0
      ? `Lane counts below use the latest ${items.length} rows returned by the API. Hit % can differ from full-file history if older rows sit outside this window.`
      : undefined;

  const archiveFootnote = recordFromApi
    ? "Totals from the merged predictions file (all sources, all time) — same `record` object as the API."
    : subsetNote;

  return (
    <div className="min-h-screen bg-gradient-to-br from-black to-gray-900 text-white">
      <NavBar current="stats" />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-cyan-300">📊 Stats</h1>
          <p className="text-sm text-gray-400 mt-2 max-w-2xl leading-relaxed">
            Live Edge Tests scorecard from{" "}
            <code className="text-cyan-200/90 text-xs">GET /api/predictions?limit=200</code>. Same universe as{" "}
            <Link to="/predictions" className="text-cyan-400 underline hover:text-cyan-300">
              Live Edge Tests
            </Link>
            . If the API fails, nothing below is guessed.
          </p>
          <p className="text-sm text-gray-400 mt-3 max-w-2xl leading-relaxed">
            Results are gross market-move tests before spread, slippage, fees, and platform costs. Fast headline reactions
            (~20m) are shown separately from longer regime follow-through so one blended number does not define the product.
          </p>
        </div>

        {loading && <p className="text-gray-400 text-sm mb-6">Loading…</p>}

        {unavailable && !loading && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-8 text-center text-amber-100">
            Stats temporarily unavailable.
          </div>
        )}

        {!unavailable && !loading && (
          <>
            <StatSegment
              title="🔥 Fast Pulse tests"
              intro="Headline heat → short-window gross-move check (~20m). These rows use the fast gossip lane (`ai-gossip-fast` / `aigf_*`). They measure immediate pressure, not multi-hour follow-through."
              record={fastRecord}
              hitRateSub="hits ÷ closed · ~20m window"
              borderClass="border-orange-500/30 bg-orange-950/15"
              footnote={subsetNote}
            />

            <StatSegment
              title="🧭 Regime tests (Guru follow-through)"
              intro="Price-triggered follow-through from the Guru engine — multi-hour windows (e.g. 4h–24h). Rows are identified by `sig_*` ids. Harder bar than the fast pulse; misses here are normal transparency."
              record={regimeRecord}
              hitRateSub="hits ÷ closed · multi-hour window"
              borderClass="border-cyan-500/25 bg-cyan-950/15"
              footnote={subsetNote}
            />

            <StatSegment
              title="📚 Archive — all lanes"
              intro="All sources and histories merged — the honest blended record. Use Fast vs Regime above to read the story; use this block for full-file totals and per-asset rollups."
              record={displayRecord}
              hitRateSub="hits ÷ closed (all sources)"
              borderClass="border-white/10 bg-white/[0.04]"
              footnote={archiveFootnote}
            />

            <section className="mb-6">
              <h2 className="text-lg font-semibold text-white mb-3">By asset (all lanes)</h2>
              {items.length === 0 ? (
                <p className="text-sm text-gray-400 border border-white/10 rounded-lg px-4 py-3 bg-white/[0.03]">
                  No prediction rows returned yet.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-white/10">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-white/5 text-gray-400 text-xs uppercase tracking-wide">
                      <tr>
                        <th className="px-3 py-2">Asset</th>
                        <th className="px-3 py-2 text-right">Hit</th>
                        <th className="px-3 py-2 text-right">Missed</th>
                        <th className="px-3 py-2 text-right">Partial</th>
                        <th className="px-3 py-2 text-right">Open</th>
                        <th className="px-3 py-2 text-right">Strict gross %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {byAsset.map((row) => {
                        const c = row.hit + row.missed + row.partial;
                        const hr = c > 0 ? Math.round((row.hit / c) * 100) : null;
                        return (
                          <tr key={row.asset} className="border-t border-white/5 hover:bg-white/[0.02]">
                            <td className="px-3 py-2 font-medium text-gray-200">{row.asset}</td>
                            <td className="px-3 py-2 text-right text-green-400">{row.hit}</td>
                            <td className="px-3 py-2 text-right text-red-400">{row.missed}</td>
                            <td className="px-3 py-2 text-right text-amber-300">{row.partial}</td>
                            <td className="px-3 py-2 text-right text-blue-400">{row.open}</td>
                            <td className="px-3 py-2 text-right text-gray-300">{hr !== null ? `${hr}%` : "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
