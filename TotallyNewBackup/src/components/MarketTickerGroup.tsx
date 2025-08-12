import React, { useEffect, useMemo, useState } from "react";

/* -------- UI row -------- */
function TickerRow({ label, emoji, items, speedSec = 36 }) {
  const feed = useMemo(() => (items?.length ? items : ["…loading…"]), [items]);
  const loop = useMemo(() => [...feed, "•", ...feed], [feed]);
  return (
    <div className="bg-white/5 rounded-xl px-4 py-2 mb-3">
      <div className="flex items-center gap-3">
        <div className="shrink-0 font-semibold">
          <span className="mr-1">{emoji}</span>
          {label}
        </div>
        <div className="relative overflow-hidden w-full">
          <div
            className="whitespace-nowrap inline-block animate-glass-ticker will-change-transform"
            style={{ animationDuration: `${speedSec}s` }}
          >
            <span className="opacity-80">
              {loop.map((t, i) => (
                <span key={i} className="mx-4 inline-block">
                  {t}
                </span>
              ))}
            </span>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes glass-ticker { 0% {transform:translateX(0)} 100% {transform:translateX(-50%)} }
        .animate-glass-ticker { animation: glass-ticker linear infinite; }
      `}</style>
    </div>
  );
}

/* -------- helpers -------- */
function usd(n) {
  const v = Number(n);
  if (!isFinite(v)) return "—";
  return v.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 });
}
function pct(n) {
  const v = Number(n);
  if (!isFinite(v)) return "";
  return `${v >= 0 ? "▲" : "▼"} ${Math.abs(v).toFixed(2)}%`;
}
const fmpKey = import.meta.env.VITE_FMP_KEY || "demo";

/* -------- loaders (no keys needed) -------- */
async function loadCrypto() {
  try {
    const r = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,binancecoin&vs_currencies=usd&include_24hr_change=true"
    );
    const j = await r.json();
    return [
      `BTC ${usd(j?.bitcoin?.usd)} ${pct(j?.bitcoin?.usd_24h_change)}`,
      `ETH ${usd(j?.ethereum?.usd)} ${pct(j?.ethereum?.usd_24h_change)}`,
      `SOL ${usd(j?.solana?.usd)} ${pct(j?.solana?.usd_24h_change)}`,
      `BNB ${usd(j?.binancecoin?.usd)} ${pct(j?.binancecoin?.usd_24h_change)}`,
    ];
  } catch {
    return [];
  }
}

async function fmp(path) {
  const r = await fetch(`https://financialmodelingprep.com/api/v3/${path}?apikey=${fmpKey}`);
  return r.json();
}

async function loadEquities() {
  try {
    const data = await fmp("quotes/index"); // S&P, Nasdaq, Dow, Russell
    const want = new Set(["^GSPC", "^IXIC", "^DJI", "^RUT"]);
    return (data || [])
      .filter((q) => want.has(q.symbol))
      .map((q) => `${q.name || q.symbol} ${usd(q.price)} ${pct(q.changesPercentage)}`);
  } catch {
    return [];
  }
}

async function loadCommodities() {
  try {
    const data = await fmp("quotes/commodity"); // WTI, Brent, Gold, Copper
    const want = new Set(["CL=F", "BZ=F", "GC=F", "HG=F"]);
    return (data || [])
      .filter((q) => want.has(q.symbol))
      .map((q) => `${q.name || q.symbol} ${usd(q.price)} ${pct(q.changesPercentage)}`);
  } catch {
    return [];
  }
}

async function loadForex() {
  try {
    const data = await fmp("quotes/forex"); // majors
    const want = new Set(["EURUSD", "USDZAR", "USDJPY", "GBPUSD"]);
    return (data || [])
      .filter((q) => want.has(q.symbol))
      .map((q) => `${q.symbol} ${Number(q.price).toFixed(4)} ${pct(q.changesPercentage)}`);
  } catch {
    return [];
  }
}

/* -------- main -------- */
export default function MarketTickerGroup() {
  const [crypto, setCrypto] = useState([]);
  const [equity, setEquity] = useState([]);
  const [commodities, setCommodities] = useState([]);
  const [forex, setForex] = useState([]);

  useEffect(() => {
    let alive = true;
    const loadAll = async () => {
      const [c, e, m, f] = await Promise.all([loadCrypto(), loadEquities(), loadCommodities(), loadForex()]);
      if (!alive) return;
      setCrypto(c.length ? c : ["BTC —", "ETH —", "SOL —", "BNB —"]);
      setEquity(e.length ? e : ["S&P 500 —", "Nasdaq —", "Dow —", "Russell 2000 —"]);
      setCommodities(m.length ? m : ["WTI —", "Brent —", "Gold —", "Copper —"]);
      setForex(f.length ? f : ["EURUSD —", "USDZAR —", "USDJPY —", "GBPUSD —"]);
    };
    loadAll();
   const t = setInterval(loadAll, 30000); // → 10000 for 10s

    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  return (
    <div className="w-full">
      <TickerRow label="Crypto" emoji="🟣" items={crypto} />
      <TickerRow label="Equities" emoji="🔵" items={equity} />
      <TickerRow label="Commodities" emoji="🟠" items={commodities} />
      <TickerRow label="Forex" emoji="🟢" items={forex} />
    </div>
  );
}
