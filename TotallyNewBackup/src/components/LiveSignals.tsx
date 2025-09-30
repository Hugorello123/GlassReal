import { useEffect, useState } from "react";

type Whale = {
  ts: number;
  asset: string;
  usd: number;
  btc?: number;
  why?: string;
  link?: string;
  hash?: string;
};

function timeAgo(ts: number) {
  const s = Math.max(1, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ago`;
}

export default function LiveSignals() {
  const [whales, setWhales] = useState<Whale[]>([]);
  const [macro, setMacro] = useState<{ dxy?: number; y10?: number }>({});
  const [news, setNews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ok = true;
    const get = (u: string) => fetch(u).then(r => r.json());

    (async () => {
      try {
        const [W, D, Y, G] = await Promise.allSettled([
          get("/api/live/whales"),
          get("/macro/dxy"),
          get("/macro/us10y"),
          get("/api/gdelt/gold"),
        ]);

        if (!ok) return;

        if (W.status === "fulfilled")
          setWhales(W.value.items?.slice(0, 8) ?? []);

        if (D.status === "fulfilled") {
          const close = D.value?.symbols?.[0]?.close ?? D.value?.[0]?.close;
          if (close) setMacro(m => ({ ...m, dxy: Number(close) }));
        }
        if (Y.status === "fulfilled") {
          const close = Y.value?.symbols?.[0]?.close ?? Y.value?.[0]?.close;
          if (close) setMacro(m => ({ ...m, y10: Number(close) }));
        }
        if (G.status === "fulfilled")
          setNews(G.value?.articles?.slice(0, 3) ?? []);
      } catch {}
      setLoading(false);
    })();

    return () => {
      ok = false;
    };
  }, []);

  return (
    <div className="mt-4 space-y-4">
      {/* Macro */}
      <div className="rounded-xl bg-white/5 p-3 text-sm text-white">
        <div className="mb-1 font-semibold">Macro snapshot</div>
        <div className="flex gap-4 text-xs text-gray-300">
          <div>
            DXY: <span className="text-white">{macro.dxy ?? "…"}</span>
          </div>
          <div>
            US 10Y: <span className="text-white">{macro.y10 ?? "…"}</span>
          </div>
        </div>
      </div>

      {/* Whales */}
      <div className="rounded-xl bg-white/5 p-3 text-sm text-white">
        <div className="mb-1 font-semibold">Live whales (last 2h)</div>
        {loading ? (
          <div className="text-xs text-gray-400">loading…</div>
        ) : whales.length === 0 ? (
          <div className="text-xs text-gray-400">
            No large on-chain flow detected yet.
          </div>
        ) : (
          <ul className="text-xs leading-5">
            {whales.map(w => (
              <li key={w.hash ?? `${w.asset}-${w.ts}-${w.usd}`}>
                <span className="font-medium">{w.asset}</span> ~ $
                {w.usd.toLocaleString()}{" "}
                {w.btc ? `(${w.btc} BTC)` : ""} • {timeAgo(w.ts)}
                {w.link ? (
                  <>
                    {" "}
                    ·{" "}
                    <a
                      className="underline"
                      target="_blank"
                      rel="noreferrer"
                      href={w.link}
                    >
                      tx
                    </a>
                  </>
                ) : null}
                {w.why ? (
                  <>
                    {" "}
                    — <span className="text-gray-400">{w.why}</span>
                  </>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>


{[...new Map(
  news.map((a: any) => [
    String((a?.title || "").toLowerCase().replace(/\s+/g, " ").trim()),
    a,
  ])
).values()] // ✅ de-dupe by normalized title
  .filter((a: any) => {
    const t = (
      (a?.title || a?.text || "") +
      " " +
      (a?.summary || "")
    ).toLowerCase();

    const u = String(a?.url || "").toLowerCase();

    // 🚫 junk / pop-culture / obits / sports
    const deny =
      /heart of gold|gold digger|rihanna|taylor swift|medal|olympic|trophy|award|golden state|golden globes|tribute|obituary|funeral|killed|stabbed|shooting|music|song|album|concert|football|soccer|rugby|cricket/i;

    // ✅ trusted finance domains
    const allowHost =
      /kitco\.com|reuters\.com|bloomberg\.com|marketwatch\.com|investing\.com|cnbc\.com|fxstreet\.com|forexlive\.com|tradingeconomics\.com|financialpost\.com|ft\.com/i;

    // ✅ finance-y text (XAU / futures / bullion / etc.)
    const allowText =
      /\b(xau|spot gold|gold price|gold prices|gold futures?|comex|lbma|bullion|ounce|oz|etf|miners?|safe haven|usd|\$\d)/i;

    // Keep only if not junk AND (trusted host OR finance terms present)
    return !deny.test(t) && (allowHost.test(u) || allowText.test(t));
  })
  .map((a: any, i: number) => (
    <li key={a.url || i}>
      <a
        className="underline"
        href={a.url}
        target="_blank"
        rel="noreferrer"
      >
        {a.title}
      </a>
    </li>
  ))}

