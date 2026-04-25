// PredictionsPage.tsx — real prediction tracker. No fake history.
import { useEffect, useState } from "react";
import { Link } from "react-router";
import NavBar from "@/components/NavBar";

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

export default function PredictionsPage() {
  const [predictions, setPredictions] = useState<Prediction[]>(loadPredictions);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ asset: "", call: "Long" as "Long" | "Short", target: "", timeframe: "", notes: "" });

  useEffect(() => {
    savePredictions(predictions);
  }, [predictions]);

  const hitCount = predictions.filter((p) => p.status === "hit").length;
  const partialCount = predictions.filter((p) => p.status === "partial").length;
  const totalClosed = predictions.filter((p) => p.status !== "open" && p.status !== "void").length;
  const winRate = totalClosed > 0 ? Math.round(((hitCount + partialCount * 0.5) / totalClosed) * 100) : 0;

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
            <div className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-center">
              <div className="text-2xl font-bold text-green-400">{winRate}%</div>
              <div className="text-xs text-gray-500">Win Rate</div>
            </div>
          </div>
          <p className="text-gray-400 mb-8">
            Track your market calls. Add a prediction, then score the outcome when it resolves.
          </p>

          {/* Add button */}
          <div className="mb-6">
            <button
              onClick={() => setShowForm(!showForm)}
              className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded-lg transition"
            >
              {showForm ? "Cancel" : "+ Add Prediction"}
            </button>
          </div>

          {/* Form */}
          {showForm && (
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
          {predictions.length === 0 ? (
            <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center">
              <p className="text-gray-400">No predictions tracked yet.</p>
              <p className="text-xs text-gray-500 mt-2">
                Click "Add Prediction" to start tracking your calls. All data stays in your browser.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {predictions.map((p) => {
                const st = STATUS_COLORS[p.status];
                return (
                  <div key={p.id} className="bg-white/5 border border-white/10 rounded-xl p-4 hover:border-white/20 transition">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className="font-bold">{p.asset}</span>
                        <span className={`text-xs px-2 py-1 rounded-full border ${st.bg} ${st.text}`}>
                          {st.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">{p.date}</span>
                        <button
                          onClick={() => deletePrediction(p.id)}
                          className="text-xs text-red-400 hover:text-red-300 px-2 py-1"
                          title="Delete"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm mb-3">
                      <div>
                        <span className="text-gray-500">Call:</span>
                        <span className={`ml-1 font-semibold ${p.call === "Long" ? "text-green-400" : "text-red-400"}`}>
                          {p.call}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Target:</span>
                        <span className="ml-1">{p.target}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Window:</span>
                        <span className="ml-1">{p.timeframe}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Outcome:</span>
                        <span className="ml-1 text-gray-300">{p.outcome}</span>
                      </div>
                    </div>
                    {p.notes && <p className="text-xs text-gray-500 mb-2">{p.notes}</p>}

                    {/* Status actions */}
                    {p.status === "open" && (
                      <div className="flex gap-2">
                        <button onClick={() => updateStatus(p.id, "hit", "Target reached")} className="text-xs bg-green-600/20 text-green-400 border border-green-500/30 px-3 py-1 rounded hover:bg-green-600/30">Mark Hit</button>
                        <button onClick={() => updateStatus(p.id, "partial", "Partial reach")} className="text-xs bg-amber-600/20 text-amber-400 border border-amber-500/30 px-3 py-1 rounded hover:bg-amber-600/30">Mark Partial</button>
                        <button onClick={() => updateStatus(p.id, "missed", "Target not reached")} className="text-xs bg-red-600/20 text-red-400 border border-red-500/30 px-3 py-1 rounded hover:bg-red-600/30">Mark Missed</button>
                        <button onClick={() => updateStatus(p.id, "void", "Invalidated")} className="text-xs bg-gray-600/20 text-gray-400 border border-gray-500/30 px-3 py-1 rounded hover:bg-gray-600/30">Void</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-8 text-center">
            <Link to="/hub" className="text-cyan-400 hover:underline">← Back to Pro Hub</Link>
          </div>
        </div>
      </main>
    </>
  );
}
