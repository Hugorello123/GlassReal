// src/components/WhaleBTCStream.tsx
import { useEffect, useRef, useState } from "react";

type WhaleEvent = {
  id: string;
  time: number;         // unix seconds
  btc: number;          // total outputs (approx)
  usd: number;          // btc * price
  to: string | null;    // first output address
};

const USD_THRESHOLD = 5_000_000;        // show tx >= $5m (change if you like)
const MAX_ROWS = 20;                     // keep last N events

function usd(n: number) {
  return n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}
function btc(n: number) {
  return n.toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 2 });
}

export default function WhaleBTCStream() {
  const [price, setPrice] = useState<number>(0);
  const [rows, setRows] = useState<WhaleEvent[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const stopRef = useRef(false);

  // --- fetch BTCUSD (blockchain.info -> coindesk fallback) ---
  useEffect(() => {
    let alive = true;

    async function loadPrice() {
      try {
        const r = await fetch("https://blockchain.info/ticker", { headers: { Accept: "application/json" } });
        const j = await r.json();
        if (alive && j?.USD?.last) setPrice(Number(j.USD.last));
      } catch {
        try {
          const r2 = await fetch("https://api.coindesk.com/v1/bpi/currentprice/USD.json");
          const j2 = await r2.json();
          const p = Number(j2?.bpi?.USD?.rate_float);
          if (alive && p) setPrice(p);
        } catch {
          /* leave price as is */
        }
      }
    }

    loadPrice();
    const t = setInterval(loadPrice, 60_000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  // --- websocket: blockchain.info live unconfirmed tx ---
  useEffect(() => {
    stopRef.current = false;

    function connect() {
      if (stopRef.current) return;
      try {
        const ws = new WebSocket("wss://ws.blockchain.info/inv");
        wsRef.current = ws;

        ws.onopen = () => {
          // subscribe to unconfirmed transactions
          ws.send(JSON.stringify({ op: "unconfirmed_sub" }));
        };

        ws.onmessage = (ev) => {
          try {
            const msg = JSON.parse(ev.data);
            const x = msg?.x;
            if (!x?.out) return;

            const sat = (x.out as any[]).reduce((s, o) => s + (Number(o?.value) || 0), 0);
            const btcVal = sat / 1e8;
            const usdVal = price ? btcVal * price : 0;

            if (usdVal >= USD_THRESHOLD) {
              const event: WhaleEvent = {
                id: String(x?.hash || Date.now() + Math.random()),
                time: Number(x?.time) || Math.floor(Date.now() / 1000),
                btc: btcVal,
                usd: usdVal,
                to: (x.out[0]?.addr as string) || null,
              };
              setRows((prev) => [event, ...prev].slice(0, MAX_ROWS));
            }
          } catch {
            /* ignore malformed packets */
          }
        };

        ws.onclose = () => {
          if (!stopRef.current) setTimeout(connect, 1500); // auto-reconnect
        };
        ws.onerror = () => {
          try { ws.close(); } catch {}
        };
      } catch {
        setTimeout(connect, 1500);
      }
    }

    connect();
    return () => {
      stopRef.current = true;
      try { wsRef.current?.close(); } catch {}
      wsRef.current = null;
    };
  }, [price]); // price in deps so USD filter updates

  return (
    <div className="bg-white/5 rounded-xl p-4">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-xl font-semibold">🐋 BTC Whale Stream</h2>
        <div className="text-sm opacity-70">BTCUSD {price ? usd(price) : "…"} • ≥ {usd(USD_THRESHOLD)}</div>
      </div>

      {rows.length === 0 ? (
        <div className="opacity-70">Listening for big BTC transfers…</div>
      ) : (
        <ul className="space-y-2">
          {rows.map((e) => (
            <li key={e.id} className="bg-white/10 rounded-lg px-3 py-2 flex items-center justify-between">
              <div className="truncate">
                <div className="font-medium">≥ {usd(e.usd)} &nbsp;
                  <span className="opacity-80">({btc(e.btc)} BTC)</span>
                </div>
                <div className="text-xs opacity-70 truncate">
                  {new Date(e.time * 1000).toLocaleTimeString()} • to {e.to ?? "multiple"}
                </div>
              </div>
              <a
                href={`https://www.blockchain.com/btc/tx/${e.id}`}
                target="_blank"
                rel="noreferrer"
                className="text-cyan-300 text-xs hover:underline ml-3 shrink-0"
              >
                view
              </a>
            </li>
          ))}
        </ul>
      )}

      {/* tiny CSS for aesthetic */}
      <style>{`
        .space-y-2 > :not([hidden]) ~ :not([hidden]) { --tw-space-y-reverse: 0; margin-top: calc(0.5rem * (1 - var(--tw-space-y-reverse))); margin-bottom: calc(0.5rem * var(--tw-space-y-reverse)); }
      `}</style>
    </div>
  );
}
