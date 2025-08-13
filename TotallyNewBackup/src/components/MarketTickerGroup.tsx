// src/components/MarketTickerGroup.tsx
import React, { useEffect, useMemo, useState } from "react";

/* ===== UI row ===== */
function TickerRow({
  label,
  emoji,
  items,
  speedSec = 36,
}: {
  label: string;
  emoji: string;
  items: string[];
  speedSec?: number;
}) {
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
        @keyframes glass-ticker { 0% { transform: translateX(0) } 100% { transform: translateX(-50%) } }
        .animate-glass-ticker { animation: glass-ticker linear infinite; }
      `}</style>
    </div>
  );
}

/* ===== helpers ===== */
const REFRESH_MS = 30000; // change to 10000 for 10s
const polyKey = import.meta.env.VITE_POLYGON_KEY || import.meta.env.VITE_POLYGON_API_KEY;
const FMP_KEY = import.meta.env.VITE_FMP_KEY || "demo";

function usd(n: unknown) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  return v.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 });
}
function pct(n: unknown) {
  const v = typeof n === "string" ? parseFloat(n) : Number(n);
  if (!Number.isFinite(v)) return "";
  return `${v >= 0 ? "▲" : "▼"} ${Math.abs(v).toFixed(2)}%`;
}
function fxFmt(n: unknown) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  const dp = v >= 100 ? 2 : v >= 10 ? 3 : 4;
  return v.toFixed(dp);
}
async function safeJson(url: string): Promise<any | null> {
  try {
    const r = await fetch(url);
    return r.ok ? r.json() : null;
  } catch {
    return null;
  }
}

/* ===== Polygon helpers ===== */
async function polyLastMinuteOrPrev(ticker: string) {
  if (!POLY_KEY) return undefined;
  const today = new Date().toISOString().slice(0, 10);

  // latest 1m candle today
  let j = await safeJson(
    `https://api.polygon.io/v2/aggs/ticker/${encodeURIComponent(
      ticker
    )}/range/1/minute/${today}/${today}?adjusted=true&sort=desc&limit=1&apiKey=${POLY_KEY}`
  );
  let price = j?.results?.[0]?.c;

  // fallback: previous close
  if (typeof price !== "number") {
    j = await safeJson(
      `https://api.polygon.io/v2/aggs/ticker/${encodeURIComponent(
        ticker
      )}/prev?adjusted=true&apiKey=${POLY_KEY}`
    );
    price = j?.results?.[0]?.c;
  }
  return typeof price === "number" ? price : undefined;
}

async function polyPrevClose(ticker: string) {
  if (!POLY_KEY) return undefined;
  const j = await safeJson(
    `https://api.polygon.io/v2/aggs/ticker/${encodeURIComponent(
      ticker
    )}/prev?adjusted=true&apiKey=${POLY_KEY}`
  );
  const price = j?.results?.[0]?.c;
  return typeof price === "number" ? price : undefined;
}

async function polyFxLast(base: string, quote: string) {
  if (!POLY_KEY) return undefined;
  const j = await safeJson(
    `https://api.polygon.io/v1/last/forex/${base}/${quote}?apiKey=${POLY_KEY}`
  );
  const last = j?.last;
  const p = Number(last?.price ?? (last?.ask + last?.bid) / 2);
  return Number.isFinite(p) ? p : undefined;
}
import WhaleAlertsRow from "@/components/WhaleAlertsRow";
<WhaleAlertsRow />

/* ===== LOADERS (Polygon + FMP) ===== */
// Crypto → Polygon (BTC, ETH, SOL, BNB)
async function loadCrypto(): Promise<string[]> {
  try {
    const coins = [
      { t: "X:BTCUSD", label: "BTC" },
      { t: "X:ETHUSD", label: "ETH" },
      { t: "X:SOLUSD", label: "SOL" },
      { t: "X:BNBUSD", label: "BNB" },
    ];
    const results = await Promise.all(
      coins.map(async (c) => {
        const last = await polyLastMinuteOrPrev(c.t);
        const prev = await polyPrevClose(c.t);
        const changePct = last != null && prev != null ? ((last - prev) / prev) * 100 : undefined;
        return last != null
          ? `${c.label} ${usd(last)} ${pct(changePct)}`
          : prev != null
          ? `${c.label} ${usd(prev)}`
          : `${c.label} —`;
      })
    );
    return results;
  } catch {
    return [];
  }
}

// Equities (indices) → Polygon (SPX, NDX, DJI, RUT)
async function loadEquities(): Promise<string[]> {
  try {
    const idx = [
      { t: "I:SPX", label: "S&P 500" },
      { t: "I:NDX", label: "Nasdaq 100" },
      { t: "I:DJI", label: "Dow Jones" },
      { t: "I:RUT", label: "Russell 2000" },
    ];
    const vals = await Promise.all(
      idx.map(async (x) => {
        const p = await polyLastMinuteOrPrev(x.t);
        if (p == null) return `${x.label} —`;
        // optional change vs prev
        const prev = await polyPrevClose(x.t);
        const ch = prev != null ? ((p - prev) / prev) * 100 : undefined;
        return `${x.label} ${usd(p)} ${pct(ch)}`;
      })
    );
    return vals;
  } catch {
    return [];
  }
}

// Commodities → FMP (WTI, Brent, Gold, Copper)
async function loadCommodities(): Promise<string[]> {
  try {
    const j = await safeJson(
      `https://financialmodelingprep.com/api/v3/quotes/commodity?apikey=${FMP_KEY}`
    );
    const want = new Set(["CL=F", "BZ=F", "GC=F", "HG=F"]);
    return (Array.isArray(j) ? j : [])
      .filter((q: any) => want.has(q.symbol))
      .map((q: any) => `${q.name || q.symbol} ${usd(q.price)} ${pct(q.changesPercentage)}`);
  } catch {
    return [];
  }
}

// Forex → Polygon (EURUSD, USDZAR, USDJPY, GBPUSD)
async function loadForex(): Promise<string[]> {
  try {
    const pairs = [
      { b: "EUR", q: "USD", label: "EURUSD" },
      { b: "USD", q: "ZAR", label: "USDZAR" },
      { b: "USD", q: "JPY", label: "USDJPY" },
      { b: "GBP", q: "USD", label: "GBPUSD" },
    ];
    const vals = await Promise.all(
      pairs.map(async (p) => {
        const price = await polyFxLast(p.b, p.q);
        return price != null ? `${p.label} ${fxFmt(price)}` : `${p.label} —`;
      })
    );
    return vals;
  } catch {
    return [];
  }
}

/* ===== main ===== */
export default function MarketTickerGroup() {
  const [crypto, setCrypto] = useState<string[]>([]);
  const [equity, setEquity] = useState<string[]>([]);
  const [commodities, setCommodities] = useState<string[]>([]);
  const [forex, setForex] = useState<string[]>([]);

  useEffect(() => {
    let alive = true;

    const loadAll = async () => {
      const [c, e, m, f] = await Promise.all([
        loadCrypto(),
        loadEquities(),
        loadCommodities(),
        loadForex(),
      ]);
      if (!alive) return;
      setCrypto(c.length ? c : ["BTC —", "ETH —", "SOL —", "BNB —"]);
      setEquity(e.length ? e : ["S&P 500 —", "Nasdaq 100 —", "Dow Jones —", "Russell 2000 —"]);
      setCommodities(m.length ? m : ["WTI —", "Brent —", "Gold —", "Copper —"]);
      setForex(f.length ? f : ["EURUSD —", "USDZAR —", "USDJPY —", "GBPUSD —"]);
    };

    loadAll();
    const t = setInterval(loadAll, REFRESH_MS);
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
