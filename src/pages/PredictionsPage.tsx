// PredictionsPage.tsx — real prediction tracker. No fake history.
import { Fragment, useEffect, useState } from "react";
import { Link } from "react-router";
import NavBar from "@/components/NavBar";
import { apiUrl } from "@/lib/sameOriginApi";

interface Prediction {
  id: string;
  asset: string;
  call: "Long" | "Short";
  target: string;
  timeframe: string;
  date: string;
  status: "open" | "hit" | "missed" | "partial" | "void";
  outcome: string;
  notes: string;
}

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  open: { bg: "bg-blue-500/15", text: "text-blue-400", label: "Open" },
  hit: { bg: "bg-green-500/15", text: "text-green-400", label: "Hit" },
  missed: { bg: "bg-red-500/15", text: "text-red-400", label: "Missed" },
  partial: { bg: "bg-amber-500/15", text: "text-amber-400", label: "Partial" },
  void: { bg: "bg-gray-500/15", text: "text-gray-400", label: "Void" },
};

const STORAGE_KEY = "sentotrade_predictions";

/** When `true`, hides the localStorage win-rate block (use when server predictions UI is primary). Set in `.env`: `VITE_HIDE_LOCAL_PREDICTIONS=true` */
const HIDE_LOCAL_PREDICTION_TRACKER = import.meta.env.VITE_HIDE_LOCAL_PREDICTIONS === "true";

function loadPredictions(): Prediction[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function savePredictions(list: Prediction[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

/** Rows from `GET /api/predictions` (engine + resolver). */
interface ServerSignal {
  id?: string;
  source?: string;
  time?: string;
  asset?: string;
  call?: string;
  entry?: number | string;
  target?: number | string;
  targetPct?: string;
  timeframe?: string;
  horizon?: string;
  why?: string;
  status?: string;
  outcome?: string;
}

/** Matches `record` on `GET /api/predictions` (full merged file counts). */
interface ServerPredictionRecord {
  hit: number;
  missed: number;
  partial: number;
  open?: number;
}

type ServerTrackStats = {
  hit: number;
  missed: number;
  partial: number;
  open: number;
  resolved: number;
  /** Weighted win rate: hits + half partials, same as Guru / AI cards. */
  rate: number;
  /** Strict hits ÷ resolved (what most people mean by “hit %”). */
  hitRatePct: number;
  fromApi: boolean;
};

function formatSignalTime(iso: string | undefined) {
  if (!iso) return "—";
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return String(iso);
  return new Date(t).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function formatServerNum(x: number | string | undefined) {
  if (x == null || x === "") return "—";
  if (typeof x === "number" && Number.isFinite(x))
    return x.toLocaleString("en-US", { maximumFractionDigits: 2 });
  return String(x);
}

function serverStatusBadge(st: string | undefined) {
  const k = String(st || "open").toLowerCase();
  return STATUS_COLORS[k] || { bg: "bg-white/10", text: "text-gray-300", label: st || "—" };
}

/** Default rows shown for server history (newest first); avoids a huge scroll. */
const SERVER_RECENT_COUNT = 25;

export default function PredictionsPage() {
  const [predictions, setPredictions] = useState<Prediction[]>(loadPredictions);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ asset: "", call: "Long" as "Long" | "Short", target: "", timeframe: "", notes: "" });
  const [serverItems, setServerItems] = useState<ServerSignal[]>([]);
  /** Full hit/miss/open counts from merged predictions file (same response as `items`). */
  const [serverRecord, setServerRecord] = useState<ServerPredictionRecord | null>(null);
  const [serverLoading, setServerLoading] = useState(true);
  const [serverErr, setServerErr] = useState("");
  const [serverShowAll, setServerShowAll] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(apiUrl("/api/predictions?limit=100"), {
          headers: { Accept: "application/json" },
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`Predictions API ${res.status}`);
        const ct = res.headers.get("content-type") || "";
        if (!ct.includes("application/json")) throw new Error("Predictions API returned non-JSON (check server / proxy)");
        const data = await res.json();
        const items = Array.isArray(data?.items) ? data.items : [];
        const rec = data?.record;
        if (!cancelled) setServerItems(items as ServerSignal[]);
        if (!cancelled) {
          if (
            rec &&
            typeof rec.hit === "number" &&
            typeof rec.missed === "number" &&
            typeof rec.partial === "number"
          ) {
            setServerRecord({
              hit: rec.hit,
              missed: rec.missed,
              partial: rec.partial,
              open: typeof rec.open === "number" ? rec.open : undefined,
            });
          } else setServerRecord(null);
        }
      } catch (e: unknown) {
        if (!cancelled) setServerErr(e instanceof Error ? e.message : "Failed to load server signals");
      } finally {
        if (!cancelled) setServerLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    savePredictions(predictions);
  }, [predictions]);

  const serverTrack = buildServerTrackStats(serverRecord, serverItems);

  const serverDisplayed =
    serverShowAll || serverItems.length <= SERVER_RECENT_COUNT
      ? serverItems
      : serverItems.slice(0, SERVER_RECENT_COUNT);

  function addPrediction() {
    if (!form.asset || !form.target || !form.timeframe) return;
    const newP: Prediction = {
      id: Date.now().toString(),
      asset: form.asset,
      call: form.call,
      target: form.target,
      timeframe: form.timeframe,
      date: new Date().toISOString().split("T")[0],
      status: "open",
      outcome: "—",
      notes: form.notes,
    };
    setPredictions((prev) => [newP, ...prev]);
    setForm({ asset: "", call: "Long", target: "", timeframe: "", notes: "" });
    setShowForm(false);
  }

  function updateStatus(id: string, status: Prediction["status"], outcome: string) {
    setPredictions((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status, outcome } : p))
    );
  }

  function deletePrediction(id: string) {
    setPredictions((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <>
      <NavBar current="predictions" />
      <main className="min-h-screen bg-gradient-to-br from-black to-gray-900 text-white">
        <div className="max-w-4xl mx-auto px-6 py-10">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-4xl font-bold">🔭 Predictions</h1>
            {!HIDE_LOCAL_PREDICTION_TRACKER && (
              <div className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-center max-w-[155px]">
                <div className="text-2xl font-bold text-green-400">
                  {serverTrack.resolved > 0 ? `${serverTrack.hitRatePct}%` : "—"}
                </div>
                <div className="text-xs text-gray-500">Hit rate</div>
                <div className="text-[10px] text-gray-600 leading-tight mt-1">
                  {serverTrack.resolved > 0
                    ? `${serverTrack.hit} / ${serverTrack.resolved} closed · server`
                    : "Loading or no closed calls"}
                </div>
              </div>
            )}
          </div>

          {/* ── AI Intelligence Track Record ── */}
          <section className="mb-8">
            <div className="flex items-center gap-3 mb-5">
              <span className="text-2xl">🤖</span>
              <div>
                <h2 className="text-xl font-bold text-cyan-300 m-0">AI Intelligence Track Record</h2>
                <p className="text-xs text-gray-500 mt-1">Sentotrade auto-generates predictions from gossip spikes — no human input</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <TrackCard
                title="🔮 Guru Bias Signal"
                items={serverItems}
                bucket="guru"
                desc="Scheduled auto-calls"
                assets="BTC + Gold + Oil"
              />
              <TrackCard
                title="📡 AI-Gossip Spike"
                items={serverItems}
                bucket="ai"
                desc="Sentiment-triggered"
                assets="Any asset from news"
              />
              <ServerCombinedTrackCard stats={serverTrack} loading={serverLoading} />
            </div>

            <div className="bg-white/5 border border-white/10 rounded-lg p-4 text-sm text-gray-400">
              <strong className="text-gray-300">How predictions work:</strong> Our system continuously scans live market data, news sentiment, and on-chain signals. When a strong pattern emerges (Guru Bias) or a gossip spike crosses the threshold (AI-Gossip), it auto-generates a prediction with entry, target, and timeframe. You can also add your own calls below; those stay in this browser only. Each prediction is resolved automatically or manually scored as Hit, Partial, or Missed.
            </div>
          </section>

          <section className="mb-10" aria-labelledby="server-signals-heading">
            <h2 id="server-signals-heading" className="text-lg font-semibold text-white mb-1">
              Live signals (server)
            </h2>
            <p className="text-xs text-gray-500 mb-3">
              Auto-generated from live prices; times use your device&apos;s timezone.
            </p>
            {serverErr && (
              <div className="bg-amber-500/10 border border-amber-500/30 text-amber-200 px-4 py-3 rounded-lg mb-4 text-sm">
                {serverErr} — refresh the page to retry.
              </div>
            )}
            {serverLoading ? (
              <p className="text-sm text-gray-500">Loading server signals…</p>
            ) : serverItems.length === 0 ? (
              <p className="text-sm text-gray-500 border border-white/10 rounded-lg px-4 py-3 bg-white/[0.03]">
                No server signals to show yet (engine may be between runs, or filters are quiet).
              </p>
            ) : (
              <div className="space-y-2">
              <div className="overflow-x-auto rounded-xl border border-cyan-500/20 bg-white/[0.03] shadow-lg shadow-black/20">
                <table className="w-full min-w-[720px] text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 bg-black/40 text-left">
                      <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400 whitespace-nowrap">
                        Time
                      </th>
                      <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400 whitespace-nowrap">
                        Asset
                      </th>
                      <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400 whitespace-nowrap">
                        Call
                      </th>
                      <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400 whitespace-nowrap">
                        Entry
                      </th>
                      <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400 whitespace-nowrap">
                        Target
                      </th>
                      <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400 whitespace-nowrap">
                        Window
                      </th>
                      <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400 whitespace-nowrap">
                        Status
                      </th>
                      <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400 min-w-[140px]">
                        Outcome
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {serverDisplayed.map((row, ri) => {
                      const st = serverStatusBadge(row.status);
                      const call = String(row.call || "—");
                      const win = row.horizon || row.timeframe || "—";
                      return (
                        <Fragment key={row.id ? `${row.id}-${ri}` : `srv-${ri}-${row.time}-${row.asset}`}>
                          <tr className="border-b border-white/5 hover:bg-white/[0.04]">
                            <td className="px-3 py-3 text-gray-400 whitespace-nowrap text-xs">
                              {formatSignalTime(row.time)}
                            </td>
                            <td className="px-3 py-3 font-semibold text-white whitespace-nowrap">{row.asset || "—"}</td>
                            <td
                              className={`px-3 py-3 font-semibold whitespace-nowrap ${
                                call.toLowerCase() === "short" ? "text-red-400" : "text-green-400"
                              }`}
                            >
                              {call}
                            </td>
                            <td className="px-3 py-3 text-gray-200 tabular-nums">{formatServerNum(row.entry)}</td>
                            <td className="px-3 py-3 text-gray-200 tabular-nums">
                              {formatServerNum(row.target)}
                              {row.targetPct ? (
                                <span className="text-gray-500 text-xs ml-1">({row.targetPct})</span>
                              ) : null}
                            </td>
                            <td className="px-3 py-3 text-gray-300 text-xs">{win}</td>
                            <td className="px-3 py-3 whitespace-nowrap">
                              <span className={`text-xs px-2 py-1 rounded-full border ${st.bg} ${st.text}`}>{st.label}</span>
                            </td>
                            <td className="px-3 py-3 text-gray-300 text-xs max-w-[220px]">{row.outcome || "—"}</td>
                          </tr>
                          {row.why ? (
                            <tr className="border-b border-white/5 bg-black/25">
                              <td colSpan={8} className="px-3 py-2 text-xs text-gray-500">
                                {row.why}
                              </td>
                            </tr>
                          ) : null}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {serverItems.length > SERVER_RECENT_COUNT ? (
                <button
                  type="button"
                  onClick={() => setServerShowAll((v) => !v)}
                  className="text-sm text-cyan-400 hover:text-cyan-300 underline-offset-2 hover:underline"
                >
                  {serverShowAll
                    ? "Show fewer rows"
                    : `Show full history (${serverItems.length} rows)`}
                </button>
              ) : null}
              </div>
            )}
          </section>

          {HIDE_LOCAL_PREDICTION_TRACKER ? (
            <p className="text-sm text-gray-500 mb-8 border border-white/10 rounded-lg px-4 py-3 bg-white/[0.03]">
              Personal call tracker (browser-only) is hidden in this build. Your manual list is not shown below.
            </p>
          ) : (
            <p className="text-gray-400 mb-8">
              Track your market calls below. Add a prediction, then score the outcome when it resolves.
            </p>
          )}

          {/* Add button */}
          {!HIDE_LOCAL_PREDICTION_TRACKER && (
          <div className="mb-6">
            <button
              onClick={() => setShowForm(!showForm)}
              className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded-lg transition"
            >
              {showForm ? "Cancel" : "+ Add Prediction"}
            </button>
          </div>
          )}

          {/* Form */}
          {!HIDE_LOCAL_PREDICTION_TRACKER && showForm && (
            <div className="bg-white/5 border border-white/10 rounded-xl p-5 mb-6 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Asset</label>
                  <input
                    className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-white"
                    placeholder="e.g. Gold (XAUUSD)"
                    value={form.asset}
                    onChange={(e) => setForm((f) => ({ ...f, asset: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Call</label>
                  <select
                    className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-white"
                    value={form.call}
                    onChange={(e) => setForm((f) => ({ ...f, call: e.target.value as "Long" | "Short" }))}
                  >
                    <option value="Long">Long</option>
                    <option value="Short">Short</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Target</label>
                  <input
                    className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-white"
                    placeholder="e.g. $2,380"
                    value={form.target}
                    onChange={(e) => setForm((f) => ({ ...f, target: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Timeframe</label>
                  <input
                    className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-white"
                    placeholder="e.g. 7 days"
                    value={form.timeframe}
                    onChange={(e) => setForm((f) => ({ ...f, timeframe: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Notes</label>
                <input
                  className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-white"
                  placeholder="Why you made this call"
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </div>
              <button
                onClick={addPrediction}
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg transition"
              >
                Save Prediction
              </button>
            </div>
          )}

          {/* List */}
          {!HIDE_LOCAL_PREDICTION_TRACKER && predictions.length === 0 ? (
            <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center">
              <p className="text-gray-400">No predictions tracked yet.</p>
              <p className="text-xs text-gray-500 mt-2">
                Click "Add Prediction" to start tracking your calls. All data stays in your browser.
              </p>
            </div>
          ) : !HIDE_LOCAL_PREDICTION_TRACKER ? (
            <div className="overflow-x-auto rounded-xl border border-white/10 bg-white/[0.03] shadow-lg shadow-black/20">
              <table className="w-full min-w-[640px] text-sm border-collapse">
                <thead>
                  <tr className="border-b border-white/10 bg-black/40 text-left">
                    <th scope="col" className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400 align-bottom whitespace-nowrap">
                      Asset
                    </th>
                    <th scope="col" className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400 align-bottom whitespace-nowrap">
                      Status
                    </th>
                    <th scope="col" className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400 align-bottom whitespace-nowrap">
                      Call
                    </th>
                    <th scope="col" className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400 align-bottom whitespace-nowrap">
                      Target
                    </th>
                    <th scope="col" className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400 align-bottom whitespace-nowrap">
                      Window
                    </th>
                    <th scope="col" className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400 align-bottom whitespace-nowrap">
                      Date
                    </th>
                    <th scope="col" className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400 align-bottom min-w-[120px]">
                      Outcome
                    </th>
                    <th scope="col" className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400 align-bottom text-right whitespace-nowrap">
                      <span className="sr-only">Delete</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {predictions.map((p) => {
                    const st = STATUS_COLORS[p.status];
                    return (
                      <Fragment key={p.id}>
                        <tr className="border-b border-white/5 hover:bg-white/[0.04] transition-colors">
                          <td className="px-3 py-3 align-middle font-semibold text-white whitespace-nowrap">{p.asset}</td>
                          <td className="px-3 py-3 align-middle whitespace-nowrap">
                            <span className={`text-xs px-2 py-1 rounded-full border ${st.bg} ${st.text}`}>{st.label}</span>
                          </td>
                          <td className={`px-3 py-3 align-middle font-semibold whitespace-nowrap ${p.call === "Long" ? "text-green-400" : "text-red-400"}`}>
                            {p.call}
                          </td>
                          <td className="px-3 py-3 align-middle text-gray-200 tabular-nums">{p.target}</td>
                          <td className="px-3 py-3 align-middle text-gray-300">{p.timeframe}</td>
                          <td className="px-3 py-3 align-middle text-gray-500 whitespace-nowrap">{p.date}</td>
                          <td className="px-3 py-3 align-middle text-gray-300 text-xs max-w-[200px]">{p.outcome}</td>
                          <td className="px-3 py-3 align-middle text-right">
                            <button
                              type="button"
                              onClick={() => deletePrediction(p.id)}
                              className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded hover:bg-red-500/10"
                              title="Delete"
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                        {p.notes ? (
                          <tr className="border-b border-white/5 bg-black/20">
                            <td colSpan={8} className="px-3 py-2 text-xs text-gray-500">
                              {p.notes}
                            </td>
                          </tr>
                        ) : null}
                        {p.status === "open" ? (
                          <tr className="border-b border-white/10">
                            <td colSpan={8} className="px-3 py-3">
                              <div className="flex flex-wrap gap-2">
                                <button type="button" onClick={() => updateStatus(p.id, "hit", "Target reached")} className="text-xs bg-green-600/20 text-green-400 border border-green-500/30 px-3 py-1.5 rounded-md hover:bg-green-600/30">Mark Hit</button>
                                <button type="button" onClick={() => updateStatus(p.id, "partial", "Partial reach")} className="text-xs bg-amber-600/20 text-amber-400 border border-amber-500/30 px-3 py-1.5 rounded-md hover:bg-amber-600/30">Mark Partial</button>
                                <button type="button" onClick={() => updateStatus(p.id, "missed", "Target not reached")} className="text-xs bg-red-600/20 text-red-400 border border-red-500/30 px-3 py-1.5 rounded-md hover:bg-red-600/30">Mark Missed</button>
                                <button type="button" onClick={() => updateStatus(p.id, "void", "Invalidated")} className="text-xs bg-gray-600/20 text-gray-400 border border-gray-500/30 px-3 py-1.5 rounded-md hover:bg-gray-600/30">Void</button>
                              </div>
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : null}

          <div className="mt-8 text-center">
            <Link to="/hub" className="text-cyan-400 hover:underline">← Back to Pro Hub</Link>
          </div>
        </div>
      </main>
    </>
  );
}

function classify(row: ServerSignal): "guru" | "ai" | "manual" {
  const src = String(row.source || "").toLowerCase();
  if (src.includes("bias") || src.includes("guru")) return "guru";
  if (src.includes("ai") || src.includes("auto") || src.includes("gossip")) return "ai";
  const id = String(row.id || "").toLowerCase();
  if (id.startsWith("sig_")) return "guru";
  if (id.startsWith("ai-") || id.startsWith("ai_gossip")) return "ai";
  return "manual";
}

function resolvedRate(items: ServerSignal[]) {
  let hit = 0,
    missed = 0,
    partial = 0;
  for (const r of items) {
    const statusRaw = String(r.status ?? "").trim().toLowerCase();
    if (statusRaw === "hit") {
      hit++;
      continue;
    }
    if (statusRaw === "missed") {
      missed++;
      continue;
    }
    if (statusRaw === "partial") {
      partial++;
      continue;
    }
    if (statusRaw === "open" || statusRaw === "void" || statusRaw === "") continue;
    const oc = String(r.outcome || "").toLowerCase();
    if (oc.includes("target reached") || oc.includes("reached @")) hit++;
    else if (oc.includes("partial move")) partial++;
    else if (oc.includes("not met") || oc.includes("no price data")) missed++;
  }
  const resolved = hit + missed + partial;
  const rate = resolved > 0 ? Math.round(((hit + partial * 0.5) / resolved) * 100) : 0;
  return { hit, missed, partial, resolved, rate };
}

function buildServerTrackStats(
  fullRecord: ServerPredictionRecord | null,
  serverItems: ServerSignal[]
): ServerTrackStats {
  const rec = fullRecord;
  if (
    rec &&
    typeof rec.hit === "number" &&
    typeof rec.missed === "number" &&
    typeof rec.partial === "number"
  ) {
    const hit = rec.hit;
    const missed = rec.missed;
    const partial = rec.partial;
    const open = rec.open ?? 0;
    const resolved = hit + missed + partial;
    const rate = resolved > 0 ? Math.round(((hit + partial * 0.5) / resolved) * 100) : 0;
    const hitRatePct = resolved > 0 ? Math.round((hit / resolved) * 100) : 0;
    return { hit, missed, partial, open, resolved, rate, hitRatePct, fromApi: true };
  }
  const r = resolvedRate(serverItems);
  const open = serverItems.filter((s) => String(s.status ?? "").trim().toLowerCase() === "open").length;
  const hitRatePct = r.resolved > 0 ? Math.round((r.hit / r.resolved) * 100) : 0;
  return {
    hit: r.hit,
    missed: r.missed,
    partial: r.partial,
    open,
    resolved: r.resolved,
    rate: r.rate,
    hitRatePct,
    fromApi: false,
  };
}

function ServerCombinedTrackCard({ stats, loading }: { stats: ServerTrackStats; loading: boolean }) {
  const { resolved, rate, hitRatePct, hit, missed, partial, open, fromApi } = stats;
  return (
    <div className="rounded-xl border p-4 text-center border-green-500/25 bg-green-500/5">
      <div className="text-[10px] font-bold uppercase tracking-wider text-green-400">📊 All server signals</div>
      <div className="text-3xl font-extrabold text-green-300 my-2">
        {loading ? "…" : resolved > 0 ? `${hitRatePct}%` : "—"}
      </div>
      <div className="text-xs text-gray-400">Hit rate (resolved)</div>
      <div className="text-[10px] text-gray-600 mt-1">
        Win score {resolved > 0 ? `${rate}%` : "—"} — partials count half
      </div>
      <div className="text-[10px] text-gray-500 mt-2 leading-snug">
        {loading
          ? "Loading…"
          : `${hit} hit · ${partial} partial · ${missed} missed${open ? ` · ${open} open` : ""}`}
      </div>
      {!loading && resolved === 0 ? (
        <div className="text-[10px] text-amber-500/80 mt-1">No closed server rows yet</div>
      ) : null}
      <div className="text-[10px] text-gray-600 mt-1">
        {fromApi ? "All rows in predictions file" : "Partial list only — deploy latest server + frontend"}
      </div>
    </div>
  );
}

function TrackCard({ title, items, bucket, desc, assets }: { title: string; items: ServerSignal[]; bucket: "guru" | "ai" | "manual"; desc: string; assets: string }) {
  const bucketed = items.filter((r) => classify(r) === bucket);
  const { resolved, rate } = resolvedRate(bucketed);
  const sampleAssets = Array.from(new Set(bucketed.slice(0, 8).map((r) => r.asset || "—"))).join(", ") || "—";
  const tone = bucket === "guru" ? "border-cyan-500/20 bg-cyan-500/5" : bucket === "ai" ? "border-purple-500/20 bg-purple-500/5" : "border-white/10 bg-white/5";
  const titleColor = bucket === "guru" ? "text-cyan-400" : bucket === "ai" ? "text-purple-400" : "text-gray-400";

  return (
    <div className={`rounded-xl border p-4 text-center ${tone}`}>
      <div className={`text-[10px] font-bold uppercase tracking-wider ${titleColor}`}>{title}</div>
      <div className="text-3xl font-extrabold text-white my-2">{bucketed.length}</div>
      <div className="text-xs text-gray-400">{desc}</div>
      <div className="text-[10px] text-gray-600 mt-1">{assets}</div>
      <div className="text-lg font-bold text-yellow-400 mt-2">{resolved > 0 ? `${rate}%` : "—"}</div>
      <div className="text-[10px] text-gray-500 mt-2 truncate">{sampleAssets}</div>
    </div>
  );
}
