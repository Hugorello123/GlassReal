// src/components/TvMarketWidget.tsx
import React, { useEffect, useRef } from "react";

type Sym = { name: string; symbol: string };
type Group = { name: string; symbols: Sym[] };

export default function TvMarketWidget({
  title,
  groups,
  height = 220,
}: {
  title: string;
  groups: Group[];
  height?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !ref.current) return;
    ref.current.innerHTML = "";

    const s = document.createElement("script");
    s.src =
      "https://s3.tradingview.com/external-embedding/embed-widget-market-overview.js";
    s.async = true;

    const cfg = {
      colorTheme: "dark",
      dateRange: "1D",
      showChart: false,
      isTransparent: true,
      showSymbolLogo: true,
      locale: "en",
      width: "100%",
      height,
      tabs: groups.map(g => ({
        title: g.name,
        symbols: g.symbols.map(x => ({ s: x.symbol, d: x.name })),
      })),
    };

    s.innerHTML = JSON.stringify(cfg);
    ref.current.appendChild(s);
  }, [groups, height]);

  return (
    <div className="tradingview-widget-container">
      <div className="text-white/90 font-semibold mb-2">{title}</div>
      <div ref={ref} className="tradingview-widget-container__widget" />
    </div>
  );
}
