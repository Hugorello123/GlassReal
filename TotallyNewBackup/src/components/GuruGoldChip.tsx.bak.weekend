import React, { useEffect, useMemo, useState } from "react";

/** ---------- Tunables (safe defaults) ----------
 * You can override any of these at runtime by serving /gold-chip-config.json
 * with the same shape; it’s optional.
 */
type Cfg = {
  confBase: number;
  newsWin: number;          // how many headlines to scan
  newsStrongDiff: number;   // headlines diff that “means something”
  paxStrong: number;        // |PAXG 24h| <= this => “spot: stable”
  btcRiskStrong: number;    // |BTC 24h| >= this => “risk-off” (if negative)  
  keywords: {
    bull: string;           // regex ORs (safe-haven / fear / hawkish / inflation)
    bear: string;           // regex ORs (peace / dovish / deflation / selloff)
  };
};

const DEFAULTS: Cfg = {
  confBase: 50,
  newsWin: 60,
  newsStrongDiff: 2,
  paxStrong: 0.25,
  btcRiskStrong: 2.0,
  keywords: {
    bull:
      "safe\\s*haven|war|conflict|attack|sanction|escalat|hawkish|geopolit|inflation|surge|spike|jumps|rally",
    bear:
      "ceasefire|peace|dovish|deflation|cooling|falls|drops|plunge|selloff",
  },
};

// ------------- helpers -------------
async function j<T = any>(url: string): Promise<T | null> {
  try {
    const r = await fetch(url, { credentials: "omit" });
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    return null;
  }
}

// investing-style delta: (close - open)/open
function deltaFromInvesting(payload: any): number {
  try {
    const s = payload?.symbols?.[0];
    const o = Number(s?.open ?? 0);
    const c = Number(s?.close ?? 0);
    if (!isFinite(o) || !isFinite(c) || o === 0) return 0;
    return (c - o) / Math.abs(o);
  } catch {
    return 0;
  }
}

function isWeekend(): boolean {
  // treat Saturday/Sunday as “mkts closed”
  const d = new Date();
  const day = d.getUTCDay();
  return day === 0 || day === 6;
}

type Pulse = {
  bias: "up" | "down" | "flat";
  conf: number;               // 20..90
  hints: string[];            // “spot: stable • risk-off • mkts closed”
  timeStr: string;            // “21:43”
};

// -----------------------------------

const GuruGoldChip: React.FC = () => {
  const [cfg, setCfg] = useState<Cfg>(DEFAULTS);
  const [pulse, setPulse] = useState<Pulse>({
    bias: "flat",
    conf: DEFAULTS.confBase,
    hints: [],
    timeStr: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  });

  // try to load runtime overrides; safe to ignore if not present
  useEffect(() => {
    j<Partial<Cfg>>("/gold-chip-config.json").then((over) => {
      if (!over) return;
      setCfg((prev) => ({
        ...prev,
        ...over,
        keywords: { ...prev.keywords, ...(over.keywords || {}) },
      }));
    });
  }, []);

  const bullRe = useMemo(() => new RegExp(cfg.keywords.bull, "i"), [cfg.keywords.bull]);
  const bearRe = useMemo(() => new RegExp(cfg.keywords.bear, "i"), [cfg.keywords.bear]);

  useEffect(() => {
    let stop = false;

    const run = async () => {
      // 1) fetch in parallel
      const [gdelt, dxy, us10y, cg] = await Promise.all([
        j<any>("/api/gdelt/gold"),
        j<any>("/macro/dxy"),
        j<any>("/macro/us10y"),
        j<any>(
          "/api/cg/api/v3/simple/price?ids=pax-gold,bitcoin&vs_currencies=usd&include_24hr_change=true",
        ),
      ]);

      // 2) NEWS pulse
      let pos = 0,
        neg = 0;
      try {
        const arr: any[] = Array.isArray(gdelt?.articles) ? gdelt!.articles : [];
        arr.slice(0, cfg.newsWin).forEach((a) => {
          const t = String(a?.title || a?.titletext || "");
          if (bullRe.test(t)) pos++;
          if (bearRe.test(t)) neg++;
        });
      } catch {
        /* ignore */
      }
      const diff = pos - neg;

      // 3) MACRO pulse (DXY ↑ = gold bullish, 10Y ↓ = gold bullish)
      const dxyDelta = deltaFromInvesting(dxy);
      const y10Delta = deltaFromInvesting(us10y);

      const dxySignal = dxyDelta > 0 ? 1 : dxyDelta < 0 ? -1 : 0;
      const y10Signal = y10Delta < 0 ? 1 : y10Delta > 0 ? -1 : 0;

      const macroBulls = (dxySignal === 1 ? 1 : 0) + (y10Signal === 1 ? 1 : 0);
      const macroBears = (dxySignal === -1 ? 1 : 0) + (y10Signal === -1 ? 1 : 0);

      // 4) SPOT + RISK context (PAXG, BTC)
      const paxChange = Number(cg?.["pax-gold"]?.usd_24h_change ?? 0);
      const btcChange = Number(cg?.bitcoin?.usd_24h_change ?? 0);

      // 5) Aggregate to bias + confidence
      let score = 0;
      score += Math.sign(diff) * Math.min(Math.abs(diff), cfg.newsStrongDiff); // clamp news to 0..newsStrongDiff
      score += macroBulls - macroBears;

      let bias: Pulse["bias"] = "flat";
      if (score > 0 && macroBears === 0) bias = "up";
      else if (score < 0 && macroBulls === 0) bias = "down";

      let conf = cfg.confBase;
      conf += Math.min(Math.abs(diff), 5) * 5;                // news adds up to +25
      conf += (macroBulls + macroBears) * 5;                  // macro adds up to +10
      conf = Math.max(20, Math.min(90, Math.round(conf)));   // clamp

      // Hints line
      const hints: string[] = [];
      if (Math.abs(paxChange) <= cfg.paxStrong) hints.push("spot: stable");
      else hints.push(`spot: ${paxChange > 0 ? "↑" : "↓"}`);
      const riskOff = btcChange <= -cfg.btcRiskStrong || (dxySignal === 1 && y10Signal === 1);
      if (riskOff) hints.push("risk-off");
      if (isWeekend()) hints.push("mkts closed");

      if (!stop) {
        setPulse({
          bias,
          conf,
          hints,
          timeStr: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        });
      }
    };

    run();
    const id = setInterval(run, 60_000); // refresh each minute
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, [cfg, bullRe, bearRe]);

  // ---------- UI ----------
  return (
    <div className="mt-2 flex flex-col items-center">
      <div
        id="gold-chip"
        className="inline-flex items-center gap-2 rounded-3xl border border-yellow-500/40 bg-yellow-500/10 px-4 py-2 text-sm font-semibold text-yellow-100"
      >
        <span className="text-yellow-300">Gold</span>
        <span>•</span>
        <span>{pulse.conf}%</span>
        <span>•</span>
        <span>4–24h</span>
        <span>•</span>
        <span>{pulse.timeStr}</span>
        <span>•</span>
        <span>{isWeekend() ? "weekend mode" : pulse.bias === "up" ? "bias: up" : pulse.bias === "down" ? "bias: down" : "neutral"}</span>
      </div>

      {pulse.hints.length > 0 && (
        <div className="mt-1 text-xs text-yellow-300/80">
          {pulse.hints.join(" • ")}
        </div>
      )}
    </div>
  );
};

export default GuruGoldChip;
