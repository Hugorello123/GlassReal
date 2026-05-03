import { useEffect, useState } from "react";

export default function TeslaBox() {
  const [price, setPrice] = useState<string>("—");
  const [change, setChange] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        // Primary: Your server API (works when deployed)
        try {
          const res = await fetch('/api/prices');
          if (res.ok) {
            const data = await res.json();
            const tslaPrice = data?.prices?.tsla;
            const tslaChange = data?.prices?.tslaCh;
            if (tslaPrice != null && alive) {
              setPrice('$' + Number(tslaPrice).toFixed(2));
              setChange(tslaChange != null
                ? (tslaChange >= 0 ? '+' : '') + Number(tslaChange).toFixed(2) + '%'
                : '');
              if (alive) setLoading(false);
              return; // Server worked, we're done
            }
          }
        } catch {
          // Server not available (local preview), fall through to public API
        }

        // Fallback: Public Yahoo Finance API (works locally + deployed)
        const res = await fetch(
          'https://query1.finance.yahoo.com/v8/finance/chart/TSLA?interval=1d&range=1d'
        );
        const data = await res.json();
        const result = data?.chart?.result?.[0];
        const meta = result?.meta;
        const currentPrice = meta?.regularMarketPrice;
        const prevClose = meta?.previousClose;

        if (currentPrice != null && alive) {
          setPrice('$' + Number(currentPrice).toFixed(2));
          if (prevClose) {
            const ch = ((currentPrice - prevClose) / prevClose) * 100;
            setChange((ch >= 0 ? '+' : '') + ch.toFixed(2) + '%');
          }
        } else {
          // Ultimate fallback: static value
          setPrice('$390.82');
          setChange('+3.86%');
        }
      } catch {
        // Ultimate fallback: static value
        if (alive) {
          setPrice('$390.82');
          setChange('+3.86%');
        }
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    const id = setInterval(load, 30 * 1000); // refresh every 30s
    return () => { alive = false; clearInterval(id); };
  }, []);

  const isPositive = change.startsWith("+") || !change.startsWith("-");

  return (
    <div className="flex flex-col items-center text-center">
      <div className="text-sm opacity-70 mb-1">TESLA • TSLA</div>
      <div className="text-3xl md:text-4xl font-semibold tracking-tight">
        {loading && price === "—" ? "…" : price}
      </div>
      {change && (
        <div className={"text-sm mt-1 " + (isPositive ? "text-green-400" : "text-red-400")}>
          {change}
        </div>
      )}
    </div>
  );
}
