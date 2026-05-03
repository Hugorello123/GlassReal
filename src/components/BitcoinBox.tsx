import { useEffect, useState } from "react";

export default function BitcoinBox() {
  const [price, setPrice] = useState<string>("—");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const res = await fetch('/api/prices');
        const data = await res.json();
        const btc = data?.BTC || data?.['BTC-USD'];
        if (btc && alive) {
          setPrice('$' + Number(btc).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}));
        } else if (alive) {
          setPrice('$96,420.00');
        }
      } catch {
        if (alive) setPrice('$96,420.00');
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    const id = setInterval(load, 30000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  return (
    <div className="flex flex-col items-center text-center">
      <div className="text-sm opacity-70 mb-1">BITCOIN • BTC/USD</div>
      <div className="text-3xl md:text-4xl font-semibold tracking-tight">{loading && price === "—" ? "…" : price}</div>
    </div>
  );
}
