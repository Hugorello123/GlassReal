// src/components/WhaleAlertsRow.tsx
import React from "react";
import { useEffect, useMemo, useRef, useState } from "react";

/** ===== Small helpers ===== */
function usd(n: number) {
  return n.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}
function btc(n: number) {
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}
function shortHash(h?: string) {
  if (!h) return "";
  return h.slice(0, 6) + "…" + h.slice(-6);
}
function ago(unixSec?: number) {
  const ms = Date.now() - (Number(unixSec) * 1000 || Date.now());
  const s = Math.max(1, Math.floor(ms / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ago`;
}
async function safeJson(url: string, init?: RequestInit) {
  try {
    const r = await fetch(url, init);
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

/** ===== Config (env or defaults) ===== */
const MIN_USD = Number(import.meta.env.VITE_WHALE_MIN_USD ?? "") || 2_000_000; // default $2M+
const PRICE_REFRESH_MS = 60_000;            // BTCUSD refresh cadence
const CG_KEY = import.meta.env.VITE_CG_KEY; // CoinGecko Pro key (header)

/** Display limits */
const MAX_LIST = 10;     // keep the whale list short
const SEED_COUNT = 3;    // show up to 3 recent whales on first load
const SEED_FLEX = 0.8;   // allow 20% below MIN_USD for the initial seed only

/** ===== UI row (marquee) ===== */
function TickerRow({
  label,
  emoji,
  items,
  speedSec = 60,
}: {
  label: string;
  emoji: string;
  items: React.ReactNode[];
  speedSec?: number;
}) {
  const feed = useMemo(
    () => (items.length ? items : ["…listening for whales…"]),
    [items]
  );
  const loop = useMemo(() => [...feed, "•", ...feed], [feed]);

  return (
    <div className="bg-white/5 rounded-lg ring-1 ring-white/10 backdrop-blur-sm px-4 py-3 md:px-5 md:py-3.5 mb-4">
      <div className="flex items-center gap-3 md:gap-4 text-base md:text-lg leading-6 text-white/95 tracking-wide">
        <div className="shrink-0 font-semibold">
          <span className="mr-1">{emoji}</span>
          {label}
        </div>
        <div className="relative overflow-hidden w-full">
          <div
            className="whitespace-nowrap inline-block animate-whale-ticker will-change-transform"
            style={{ animationDuration: `${speedSec}s` }}
          >
            <span className="opacity-90">
              {loop.map((t, i) => (
                <span key={i} className="mx-4 md:mx-5 inline-block">
                  {t}
                </span>
              ))}
            </span>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes whale-ticker { 0% { transform: translateX(0) } 100% { transform: translateX(-50%) } }
        .animate-whale-ticker { animation: whale-ticker linear infinite; }
        .animate-whale-ticker:hover { animation-play-state: paused; }
      `}</style>
    </div>
  );
}

/** ===== Types ===== */
type WhaleEvent = {
  hash: string;
  time: number;       // unix seconds
  outsCount: number;
  totalBtc: number;
  usdVal: number;
  maxOutBtc: number;
};
// --- FlowBadge: reads /api/flow/btc and shows a small summary under the ticker
function FlowBadge({
  window_s = 600,
  min_usd = 2_000_000,
}: { window_s?: number; min_usd?: number }) {
  const [data, setData] = React.useState<{
    to_exch?: { count: number; usd: number };
    from_exch?: { count: number; usd: number };
    top?: { dir: "to" | "from" | null; usd: number; amount: number; txid: string | null };
  } | null>(null);

  // local money formatter (avoid touching anything else)
  const money = (n: number) =>
    n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });

  React.useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const r = await fetch(`/api/flow/btc?window_s=${window_s}&min_usd=${min_usd}`);
        if (!r.ok) throw new Error(String(r.status));
        const j = await r.json();
        if (alive) setData(j);
      } catch {
        /* stay quiet */
      }
    };
    load();
    const id = window.setInterval(load, 20_000); // refresh every 20s
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [window_s, min_usd]);

  const toC = data?.to_exch?.count ?? 0;
  const fromC = data?.from_exch?.count ?? 0;
  const topUSD = data?.top?.usd ?? 0;
  const dir = data?.top?.dir;

  return (
    <div className="mt-2 inline-flex items-center gap-2 text-[11px] md:text-xs bg-white/10 border border-white/15 rounded-md px-2 py-1">
      <span className="opacity-80">Flow (10m):</span>
      <span>to <span className="font-semibold">{toC}</span></span>
      <span>/ from <span className="font-semibold">{fromC}</span></span>
      {topUSD > 0 ? (
        <span className="opacity-90">
          • top <span className="font-semibold">{money(topUSD)}</span>{" "}
          <span className="uppercase tracking-wider text-white/70">
            {dir === "to" ? "→ EXCH" : "← EXCH"}
          </span>
        </span>
      ) : (
        <span className="opacity-60">• quiet</span>
      )}
    </div>
  );
}

/** ===== Main component ===== */
export default function WhaleAlertsRow() {
  const [price, setPrice] = useState<number>(0);               // BTCUSD
  const [events, setEvents] = useState<WhaleEvent[]>([]);      // whale data objects
  const aliveRef = useRef(true);
  const seenRef = useRef<Set<string>>(new Set());              // de-dup tx hashes
  const seededRef = useRef(false);
  const [, tick] = useState(0);                                 // minute tick to refresh "ago"

  useEffect(() => {
    return () => { aliveRef.current = false; };
  }, []);

  /** ---- keep "ago" fresh: tick every 60s ---- */
  useEffect(() => {
    const id = window.setInterval(() => {
      // force re-render without changing data
      if (aliveRef.current) tick((v) => v + 1);
    }, 60_000);
    return () => window.clearInterval(id);
  }, []);

  /** ---- BTC/USD price via CoinGecko Pro (uses your key) ---- */
  useEffect(() => {
    let alive = true;
    const loadPrice = async () => {
      const j = await safeJson(
        "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd",
        { headers: CG_KEY ? { "x-cg-pro-api-key": CG_KEY } : undefined }
      );
      const p = Number(j?.bitcoin?.usd);
      if (alive && isFinite(p) && p > 0) setPrice(p);
    };

    loadPrice();
    const id = window.setInterval(loadPrice, PRICE_REFRESH_MS);
    return () => { alive = false; window.clearInterval(id); };
  }, []);

  /** ---- Poll unconfirmed BTC tx (HTTP, CORS-safe) + light seeding ---- */
  useEffect(() => {
    if (!price) return; // wait until we have USD price

    let alive = true;
    const poll = async () => {
      if (!alive) return;

      try {
        const j = await safeJson(
          "https://blockchain.info/unconfirmed-transactions?format=json&cors=true"
        );
        if (!j) return;

        const txs: any[] = Array.isArray(j?.txs) ? j.txs : [];
        if (!txs.length) return;

        // Build candidates with computed metrics
        const candidates: WhaleEvent[] = txs
          .map((tx) => {
            const outs: any[] = Array.isArray(tx?.out) ? tx.out : [];
            const totalSats = outs.reduce((sum, o) => sum + (Number(o?.value) || 0), 0);
            const totalBtc = totalSats / 1e8;
            const usdVal = totalBtc * price;

            const maxOutSats = outs.reduce((m, o) => Math.max(m, Number(o?.value) || 0), 0);
            const maxOutBtc = maxOutSats / 1e8;

            return {
              hash: String(tx?.hash || ""),
              time: Number(tx?.time) || Math.floor(Date.now() / 1000),
              outsCount: outs.length,
              totalBtc,
              usdVal,
              maxOutBtc,
            } as WhaleEvent;
          })
          .filter((c) => c.hash && c.totalBtc > 0);

        // Sort by size for a nicer seed
        candidates.sort((a, b) => b.usdVal - a.usdVal);

        const newOnes: WhaleEvent[] = [];

        // Normal pass: strict threshold
        for (const c of candidates) {
          if (seenRef.current.has(c.hash)) continue;
          if (c.usdVal >= MIN_USD) {
            newOnes.push(c);
            seenRef.current.add(c.hash);
          }
        }

        // First-load seed (if nothing passed strict filter)
        if (!seededRef.current && newOnes.length === 0) {
          const seedMin = MIN_USD * SEED_FLEX;
          const seedable = candidates
            .filter((c) => !seenRef.current.has(c.hash) && c.usdVal >= seedMin)
            .slice(0, SEED_COUNT);

          for (const c of seedable) {
            newOnes.push(c);
            seenRef.current.add(c.hash);
          }
          seededRef.current = true;
        }

        if (newOnes.length && aliveRef.current) {
          setEvents((prev) => {
            // merge de-duplicated (prefer newest first)
            const merged = [...newOnes, ...prev];
            const uniq = new Map<string, WhaleEvent>();
            for (const e of merged) if (!uniq.has(e.hash)) uniq.set(e.hash, e);
            return Array.from(uniq.values()).slice(0, MAX_LIST);
          });
        }

        // Trim memory
        if (seenRef.current.size > 5000) {
          const it = seenRef.current.values();
          for (let k = 0; k < 1000; k++) {
            const n = it.next();
            if (n.done) break;
            seenRef.current.delete(n.value);
          }
        }
      } catch {
        /* ignore and try again */
      }
    };

    // initial + interval
    poll();
    const id = window.setInterval(poll, 20_000);
    return () => { alive = false; window.clearInterval(id); };
  }, [price]);

  /** ---- render nodes from data (recompute on tick so "ago" updates) ---- */
  const nodes = useMemo<React.ReactNode[]>(() => {
    return events.map((ev) => (
      <span key={ev.hash} className="inline-flex items-baseline gap-2">
        <span className="opacity-80">🐳</span>
        <span className="font-semibold text-white">{usd(ev.usdVal)}</span>
        <span className="text-white/80">({btc(ev.totalBtc)} BTC)</span>
        <span className="text-white/70">• top {btc(ev.maxOutBtc)} BTC</span>
        <span className="text-white/70">• {ev.outsCount} outs</span>
        <span className="text-white/60">• {ago(ev.time)}</span>
        <a
          className="underline"
          href={`https://www.blockchain.com/btc/tx/${ev.hash}`}
          target="_blank"
          rel="noreferrer"
        >
          {shortHash(ev.hash)}
        </a>
      </span>
    ));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, /* re-render each minute */ tick]);

  return <TickerRow label="Whale Alerts" emoji="🐳" items={nodes} speedSec={60} />;
<FlowBadge window_s={600} min_usd={2_000_000} />

}
