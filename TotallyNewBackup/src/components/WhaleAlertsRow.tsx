// src/components/WhaleAlertsRow.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";

/** ===== Small helpers ===== */
function usd(n: number) {
  return n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}
function btc(n: number) {
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}
function shortHash(h?: string) {
  if (!h) return "";
  return h.slice(0, 6) + "…" + h.slice(-6);
}
async function safeJson(url: string) {
  try {
    const r = await fetch(url, { headers: { Accept: "application/json" } });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

/** ===== Config (env or defaults) ===== */
const MIN_USD = Number(import.meta.env.VITE_WHALE_MIN_USD ?? "") || 2_000_000; // default $2M+
const MAX_ITEMS = 40; // keep last N whale lines
const PRICE_REFRESH_MS = 60_000; // BTCUSD refresh cadence

/** ===== UI row (marquee) ===== */
function TickerRow({ label, emoji, items, speedSec = 36 }: { label: string; emoji: string; items: string[]; speedSec?: number }) {
  const feed = useMemo(() => (items.length ? items : ["…listening for whales…"]), [items]);
  const loop = useMemo(() => [...feed, "•", ...feed], [feed]);
  return (
    <div className="bg-white/5 rounded-xl px-4 py-2 mb-3">
      <div className="flex items-center gap-3">
        <div className="shrink-0 font-semibold"><span className="mr-1">{emoji}</span>{label}</div>
        <div className="relative overflow-hidden w-full">
          <div className="whitespace-nowrap inline-block animate-whale-ticker will-change-transform" style={{ animationDuration: `${speedSec}s` }}>
            <span className="opacity-80">
              {loop.map((t, i) => <span key={i} className="mx-4 inline-block">{t}</span>)}
            </span>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes whale-ticker { 0% { transform: translateX(0) } 100% { transform: translateX(-50%) } }
        .animate-whale-ticker { animation: whale-ticker linear infinite; }
      `}</style>
    </div>
  );
}

/** ===== Main component ===== */
export default function WhaleAlertsRow() {
  const [price, setPrice] = useState<number>(0);          // BTCUSD
  const [items, setItems] = useState<string[]>([]);       // whale lines
  const wsRef = useRef<WebSocket | null>(null);

  // Fetch BTCUSD price from blockchain.info ticker (via Vite proxy)
  useEffect(() => {
    let alive = true;
    const loadPrice = async () => {
      const j = await safeJson("https://blockchain.info/ticker");
      const p = Number(j?.USD?.last ?? j?.USD?.["15m"]);
      if (alive && isFinite(p) && p > 0) setPrice(p);
    };
    loadPrice();
    const id = window.setInterval(loadPrice, PRICE_REFRESH_MS);
    return () => { alive = false; window.clearInterval(id); };
  }, []);

  // Open WebSocket to blockchain.info (via Vite WS proxy)
  useEffect(() => {
    let alive = true;

    // Close any prior
    if (wsRef.current) {
      try { wsRef.current.close(); } catch {}
      wsRef.current = null;
    }

    const url = (location.protocol === "https:" ? "wss" : "ws") + "://" + location.host + "/ws/bci/inv";
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      // subscribe to unconfirmed transactions
      ws.send(JSON.stringify({ op: "unconfirmed_sub" }));
      // (optional) blocks: ws.send(JSON.stringify({ op: "blocks_sub" }));
    };

    ws.onmessage = (ev) => {
      if (!alive) return;
      try {
        const msg = JSON.parse(ev.data);
        if (msg?.op !== "utx") return;
        const x = msg?.x;
        if (!x?.out) return;

        // total BTC moved on outputs
        const totalSats = (Array.isArray(x.out) ? x.out : []).reduce((sum: number, o: any) => sum + (Number(o?.value) || 0), 0);
        const totalBtc = totalSats / 1e8;
        if (!(totalBtc > 0)) return;

        const px = price || 0;
        if (!px) return; // wait until we have price

        const usdVal = totalBtc * px;
        if (usdVal < MIN_USD) return; // filter small txs

        const hash = x?.hash;
        const line = `🐋 ${usd(usdVal)} (${btc(totalBtc)} BTC) • ${shortHash(hash)}`;

        // push to ticker list
        setItems((prev) => {
          const next = [line, ...prev];
          return next.slice(0, MAX_ITEMS);
        });
      } catch {}
    };

    ws.onerror = () => { /* ignore; proxy handles reconnect on refresh */ };
    ws.onclose = () => { /* noop */ };

    return () => {
      alive = false;
      try { ws.close(); } catch {}
    };
  }, [price]); // when price updates, we keep the same socket but dependency is ok.

  return <TickerRow label="Whale Alerts" emoji="🐋" items={items} speedSec={40} />;
}
