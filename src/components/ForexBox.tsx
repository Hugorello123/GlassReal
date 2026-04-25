// src/components/ForexBox.tsx
import { useEffect, useRef, useState } from "react";

type Rates = Record<string, number>;

export default function ForexBox() {
  const [rates, setRates] = useState<Rates | null>(null);
  const [i, setI] = useState(0);
  const alive = useRef(true);

  // Pairs to rotate through
  const PAIRS: { label: string; calc: (r: Rates) => number | null }[] = [
    { label: "EUR/USD", calc: (r) => (r.EUR ? 1 / r.EUR : null) },
    { label: "GBP/USD", calc: (r) => (r.GBP ? 1 / r.GBP : null) },
    { label: "USD/JPY", calc: (r) => r.JPY ?? null },
    { label: "USD/ZAR", calc: (r) => r.ZAR ?? null },
  ];

  // Color for currency codes
  const fxColor = (c: string) =>
    ({
      USD: "text-emerald-300",
      EUR: "text-indigo-300",
      GBP: "text-rose-300",
      JPY: "text-amber-300",
      ZAR: "text-cyan-300",
    }[c] || "text-slate-200");

  useEffect(() => {
    alive.current = true;

    async function load() {
      try {
        const res = await fetch("https://open.er-api.com/v6/latest/USD", {
          headers: { Accept: "application/json" },
        });
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json();
        const r: Rates = data?.rates ?? {};
        if (alive.current) setRates(r);
      } catch {
        if (alive.current) setRates(null);
      }
    }

    load();
    const refreshId = window.setInterval(load, 5 * 60 * 1000); // refresh 5 min
    const rotateId = window.setInterval(() => {
      setI((x) => (x + 1) % PAIRS.length);
    }, 4000); // rotate every 4s

    return () => {
      alive.current = false;
      window.clearInterval(refreshId);
      window.clearInterval(rotateId);
    };
  }, []);

  const pair = PAIRS[i];
  const value = rates ? pair.calc(rates) : null;

  const formatted =
    value !== null && Number.isFinite(value)
      ? value > 20
        ? value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : value.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 })
      : "—";

  // Split label to color each currency
  const [base, quote] = pair.label.split("/");

  return (
    <div className="flex flex-col items-center text-center">
      <div className="text-base md:text-lg opacity-80 mb-1 font-medium tracking-wide">
        FOREX • <span className={fxColor(base)}>{base}</span>/
        <span className={fxColor(quote)}>{quote}</span>
      </div>
      <div className="text-4xl md:text-5xl font-semibold tracking-tight">{formatted}</div>
    </div>
  );
}
