// src/components/GuruDrawer.tsx
import React from "react";

/* ---------- types & helpers ---------- */
type Inputs = {
  btcChange: number | null;   // % 24h
  goldChange: number | null;  // % 24h (PAXG proxy)
  headlineCount: number;      // filtered gold headlines last hour
  updated: string;
};

const pct = (n: number | null, digits = 2) =>
  n === null || Number.isNaN(n) ? "n/a" : `${n.toFixed(digits)}%`;

function scoreAndExplain(inp: Inputs) {
  let score = 0;
  const notes: string[] = [];
  const flips: string[] = [];

  // BTC risk tone (risk-on tends to weigh on gold short-term)
  if (inp.btcChange !== null) {
    const b = inp.btcChange;
    if (b <= -1.5) { score += 0.8; notes.push(`BTC ${pct(b)} (risk-off → gold +)`); flips.push(`BTC > −1.0% would soften the bid`); }
    else if (b <= -0.5) { score += 0.4; notes.push(`BTC ${pct(b)} (mild risk-off)`); }
    else if (b >= 1.5) { score -= 0.8; notes.push(`BTC ${pct(b)} (risk-on → gold −)`); flips.push(`BTC < +1.0% would ease headwind`); }
    else if (b >= 0.5) { score -= 0.4; notes.push(`BTC ${pct(b)} (mild risk-on)`); }
    else { notes.push(`BTC ${pct(b)} (neutral)`); }
  } else {
    notes.push(`BTC n/a`);
  }

  // Gold self move (confirmation)
  if (inp.goldChange !== null) {
    const g = inp.goldChange;
    if (g >= 0.7) { score += 0.5; notes.push(`Gold ${pct(g)} (confirming)`); flips.push(`Gold < +0.4% would cool the bid`); }
    else if (g <= -0.7) { score -= 0.5; notes.push(`Gold ${pct(g)} (drag)`); flips.push(`Gold > −0.4% would neutralize`); }
    else if (Math.abs(g) >= 0.3) { notes.push(`Gold ${pct(g)} (slight tone)`); }
    else { notes.push(`Gold ${pct(g)} (flat)`); }
  } else {
    notes.push(`Gold n/a`);
  }

  // Tape heat from headlines (affects wording, not score)
  const tape = inp.headlineCount >= 10 ? "noisy" : inp.headlineCount >= 3 ? "active" : "calm";

  let bias: "bearish" | "neutral" | "bullish" = "neutral";
  if (score >= 0.75) bias = "bullish";
  else if (score <= -0.75) bias = "bearish";

  return { score, bias, notes, flips, tape };
}

function makeAnswer(q: string, inp: Inputs) {
  const { score, bias, notes, flips, tape } = scoreAndExplain(inp);
  const s = score.toFixed(2).replace(/^-?0\.00$/, "0");

  const drivers = `Drivers: ${notes.join(" • ")}. Tape: ${tape}.`;
  const bottom = `Bottom line: short-term bias ${bias} for gold (score ${s}).`;
  const change = `What could flip it: ${flips.length ? flips.join(" • ") : "watch BTC ±1% swings."}`;

  const kind = (q || "").toLowerCase();
  if (kind.includes("why")) return `${bottom}\n${drivers}`;
  if (kind.includes("risk") || kind.includes("catalyst"))
    return `${bottom}\nFocus for the next 24h: BTC ±1% moves, headline heat (>${Math.max(2, inp.headlineCount + 1)} items/hr).`;
  if (kind.includes("flip")) return `${bottom}\n${change}`;
  return `${bottom}\n${drivers}\n${change}`;
}

async function j(url: string) {
  try { const r = await fetch(url); if (!r.ok) return null; return await r.json(); }
  catch { return null; }
}

/* ---------- component ---------- */
type Props = { open?: boolean; topic?: string; onClose?: () => void };

const GuruDrawer: React.FC<Props> = ({ open = true, topic = "", onClose }) => {
  const [inp, setInp] = React.useState<Inputs>({
    btcChange: null,
    goldChange: null,
    headlineCount: 0,
    updated: "",
  });
  const [q, setQ] = React.useState<string>(topic || "Why is gold neutral right now?");
  const [answer, setAnswer] = React.useState<string>("");

  React.useEffect(() => { if (topic) setQ(topic); }, [topic]);

  // Fetch inputs your app already serves
  React.useEffect(() => {
    let live = true;

    const pull = async () => {
      const prices = await j(
        "/api/cg/api/v3/simple/price?ids=pax-gold,bitcoin&vs_currencies=usd&include_24hr_change=true"
      );
      const gold = Number(prices?.["pax-gold"]?.usd_24h_change);
      const btc  = Number(prices?.bitcoin?.usd_24h_change);

      const news = await j("/api/gdelt/gold");
      const headlines = Array.isArray(news?.articles) ? news.articles.length : 0;

      if (!live) return;
      setInp({
        btcChange: Number.isFinite(btc) ? btc : null,
        goldChange: Number.isFinite(gold) ? gold : null,
        headlineCount: headlines,
        updated: new Date().toLocaleTimeString(),
      });
    };

    pull();
    const id = window.setInterval(pull, 180_000); // refresh every 3 min
    return () => { live = false; window.clearInterval(id); };
  }, []);

  const quickAsk = (text: string) => { setQ(text); setAnswer(makeAnswer(text, inp)); };
  const onAsk = () => setAnswer(makeAnswer(q, inp));

  if (!open) return null;

  // sanitized topline (remove duplicate "Bottom line:" prefix)
  const topline = makeAnswer("why", inp).split("\n")[0].replace(/^Bottom line:\s*/i, "");

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm">
      <div className="absolute right-0 top-0 h-full w-full sm:w-[560px] bg-[#121418] shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="text-lg font-semibold">Ask the Guru</div>
          <button
            onClick={onClose}
            className="rounded-md px-2 py-1 text-white/70 hover:text-white hover:bg-white/10"
            aria-label="Close"
          >✕</button>
        </div>

        {/* Top status card */}
        <div className="m-4 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm">
          <div className="mb-1">
            <span className="font-semibold">Bottom line:</span>{" "}
            <span className="opacity-90">{topline}</span>
          </div>
          <div className="text-xs text-white/60">
            Inputs — BTC 24h: {pct(inp.btcChange)} • Gold 24h: {pct(inp.goldChange)} • Headlines/hr: {inp.headlineCount} • Updated: {inp.updated || "…"}
          </div>
          <div className="mt-1 text-[11px] text-white/50">
            Note: fast heuristic. Pair with the chip score and your levels.
          </div>
        </div>

        {/* Quick prompts */}
        <div className="px-4">
          <div className="mb-2 text-xs text-white/60">QUICK PROMPTS</div>
          <div className="flex flex-wrap gap-2">
            <button className="rounded-full border border-white/15 bg-white/[0.02] px-3 py-1 text-sm hover:bg-white/10"
              onClick={() => quickAsk("Why is gold neutral right now?")}>
              Why is gold neutral right now?
            </button>
            <button className="rounded-full border border-white/15 bg-white/[0.02] px-3 py-1 text-sm hover:bg-white/10"
              onClick={() => quickAsk("Any risk-off catalysts in the next 24h?")}>
              Any risk-off catalysts in the next 24h?
            </button>
            <button className="rounded-full border border-white/15 bg-white/[0.02] px-3 py-1 text-sm hover:bg-white/10"
              onClick={() => quickAsk("What flips the bias the other way?")}>
              What flips the bias the other way?
            </button>
          </div>
        </div>

        {/* Question box */}
        <div className="p-4">
          <textarea
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-black/40 p-3 text-sm outline-none focus:ring-2 focus:ring-cyan-400/40"
            rows={4}
          />
          <div className="mt-2 flex gap-2">
            <button
              onClick={onAsk}
              className="rounded-lg bg-[#8A2BE2] px-4 py-2 text-sm font-semibold text-white shadow hover:brightness-110"
            >
              Ask
            </button>
            <button
              onClick={() => setQ("")}
              className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white/80 hover:bg-white/10"
            >
              Clear
            </button>
            {answer && (
              <button
                onClick={() => navigator.clipboard.writeText(answer)}
                className="ml-auto rounded-lg border border-white/10 px-3 py-2 text-xs text-white/80 hover:bg-white/10"
              >
                Copy answer
              </button>
            )}
          </div>
        </div>

        {/* Answer card */}
        {answer && (
          <div className="mx-4 mb-6 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm whitespace-pre-line">
            {answer}
          </div>
        )}
      </div>
    </div>
  );
};

export default GuruDrawer;
