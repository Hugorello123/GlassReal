// src/components/EquitiesCommoditiesPanelSafe.tsx
import React from "react";

type Box = { title: string; symbol: string };

// Small helper to build TradingView iframe URL (safe, no global scripts)
function tvUrl(symbol: string) {
  const params = new URLSearchParams({
    frameElementId: "tvbox",
    symbol,
    interval: "60",
    hidesidetoolbar: "1",
    symboledit: "0",
    saveimage: "0",
    toolbarbg: "f1f3f6",
    hideideas: "1",
    theme: "dark",
    style: "1",
    timezone: "Etc/UTC",
  });
  return `https://s.tradingview.com/widgetembed/?${params.toString()}`;
}

function Widget({ title, symbol }: Box) {
  return (
    <div className="bg-white/5 rounded-xl p-2 min-h-[220px]">
      <div className="text-sm text-white/70 mb-2">{title}</div>
      <iframe
        title={title}
        src={tvUrl(symbol)}
        className="w-full h-[180px] rounded-md"
        loading="lazy"
        referrerPolicy="no-referrer"
        sandbox="allow-scripts allow-same-origin allow-popups"
      />
    </div>
  );
}

export default function EquitiesCommoditiesPanelSafe() {
  const equities: Box[] = [
    { title: "S&P 500",   symbol: "OANDA:SPX500USD" },
    { title: "Nasdaq-100",symbol: "OANDA:NAS100USD" },
    { title: "Dow",       symbol: "OANDA:US30USD" },
    { title: "Russell 2000", symbol: "OANDA:US2000USD" },
  ];

  const commodities: Box[] = [
    { title: "Gold",  symbol: "OANDA:XAUUSD" },
    { title: "WTI",   symbol: "TVC:USOIL" },
    { title: "Brent", symbol: "TVC:UKOIL" },
    { title: "Copper",symbol: "COMEX:HG1!" },
  ];

  return (
    <section className="relative z-0 mt-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Equities */}
        <div className="bg-white/5 rounded-2xl p-4">
          <h2 className="text-xl font-semibold mb-4">Equities</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {equities.map(b => <Widget key={b.title} {...b} />)}
          </div>
        </div>

        {/* Commodities */}
        <div className="bg-white/5 rounded-2xl p-4">
          <h2 className="text-xl font-semibold mb-4">Commodities</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {commodities.map(b => <Widget key={b.title} {...b} />)}
          </div>
        </div>
      </div>
    </section>
  );
}
