import React, { useEffect, useState } from "react";

/* ---------------- visual tokens ---------------- */
const CHIP_BASE =
  "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm leading-none";
const CHIP_STYLE: Record<string, string> = {
  BTC: "border-orange-400/40 bg-orange-500/10",
  WTI: "border-teal-400/40 bg-teal-500/10",
};
const SEP_DOT = <span className="opacity-50">•</span>;

/* ---------------- helpers ---------------- */
function riskFromChange(pct?: number | null): "risk-on" | "risk-off" | "neutral" {
  if (pct == null) return "neutral";
  if (pct > 0.5) return "risk-on";
  if (pct < -0.5) return "risk-off";
  return "neutral";
}
function arrow(pct?: number | null) {
  if (pct == null) return "•";
  if (pct > 0) return "↑";
  if (pct < 0) return "↓";
  return "•";
}
function fmt(n: number | null | undefined, d = 2) {
  if (n == null || Number.isNaN(n)) return "…";
  return Number(n).toFixed(d);
}
function riskClass(r: "risk-on" | "risk-off" | "neutral") {
  if (r === "risk-on") return "text-emerald-300";
  if (r === "risk-off") return "text-rose-300";
  return "text-amber-200";
}

/* ---------------- component ---------------- */
export default function ChipsBar() {
  const [btc, setBtc] = useState<{ price: number | null; chg: number | null }>({
    price: null,
    chg: null,
  });
  const [wti, setWti] = useState<{ price: number | null; chg: number | null }>({
    price: null,
    chg: null,
  });

  async function load() {
    // BTC via CoinGecko (proxied by Nginx)
    try {
      const b = await fetch(
        "/api/cg/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true"
      ).then((r) => (r.ok ? r.json() : null));
      setBtc({
        price: b?.bitcoin?.usd ?? null,
        chg: b?.bitcoin?.usd_24h_change ?? null,
      });
    } catch {
      setBtc((s) => ({ ...s, price: s.price ?? null, chg: s.chg ?? null }));
    }

    // WTI via Yahoo Finance (proxied by Nginx)
    try {
      const y = await fetch("/yq/v7/finance/quote?symbols=CL=F").then((r) =>
        r.ok ? r.json() : null
      );
      const q = y?.quoteResponse?.result?.[0];
      setWti({
        price: q?.regularMarketPrice ?? null,
        chg: q?.regularMarketChangePercent ?? null,
      });
    } catch {
      setWti((s) => ({ ...s, price: s.price ?? null, chg: s.chg ?? null }));
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, []);

  const btcRisk = riskFromChange(btc.chg);
  const wtiRisk = riskFromChange(wti.chg);

  return (
    <div className="flex items-center gap-3 overflow-x-auto pb-1">
      {/* BTC */}
      <div
        className={`${CHIP_BASE} ${CHIP_STYLE.BTC}`}
        title="Our quick take. Combine with your own levels."
      >
        <span className="font-semibold">BTC</span>
        {SEP_DOT}
        <span className="opacity-80">50%</span>
        {SEP_DOT}
        <span className={riskClass(btcRisk)}>{btcRisk}</span>
        {SEP_DOT}
        <span className="opacity-90">
          ${fmt(btc.price, 0)} ({btc.chg != null ? fmt(btc.chg, 2) : "…"}%)
        </span>
        <span className="opacity-80">{arrow(btc.chg)}</span>
      </div>

      {/* WTI */}
      <div
        className={`${CHIP_BASE} ${CHIP_STYLE.WTI}`}
        title="Our quick take. Combine with your own levels."
      >
        <span className="font-semibold">WTI</span>
        {SEP_DOT}
        <span className="opacity-80">50%</span>
        {SEP_DOT}
        <span className={riskClass(wtiRisk)}>{wtiRisk}</span>
        {SEP_DOT}
        <span className="opacity-90">
          ${fmt(wti.price, 2)} ({wti.chg != null ? fmt(wti.chg, 2) : "…"}%)
        </span>
        <span className="opacity-80">{arrow(wti.chg)}</span>
      </div>
    </div>
  );
}
