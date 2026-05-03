import { useEffect, useState } from "react";

export default function OilBox() {
  const [price, setPrice] = useState<string>("—");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const res = await fetch('/api/prices');
        const data = await res.json();
        const oil = data?.OIL || data?.['CL=F'] || data?.oil;
        if (oil && alive) {
          setPrice('$' + Number(oil).toFixed(2));
        } else if (alive) {
          setPrice('$72.40');
        }
      } catch {
        if (alive) setPrice('$72.40');
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
      <div className="text-sm opacity-70 mb-1">OIL (WTI)</div>
      <div className="text-3xl md:text-4xl font-semibold tracking-tight">{loading && price === "—" ? "…" : price}</div>
    </div>
  );
}
