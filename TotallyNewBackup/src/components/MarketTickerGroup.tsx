// src/components/MarketTickerGroup.tsx
import React from "react";

type RowProps = { title: string; emoji: string; items: string[] };

function Row({ title, emoji, items }: RowProps) {
  return (
    <div className="bg-white/5 rounded-xl px-4 py-3 mb-4">
      <div className="flex items-center gap-2 text-sm font-semibold opacity-90 mb-2">
        <span>{emoji}</span>
        <span>{title}</span>
      </div>
      <div className="text-sm overflow-x-auto whitespace-nowrap no-scrollbar">
        {items.join("   •   ")}
      </div>
    </div>
  );
}

export default function MarketTickerGroup() {
  // Static placeholders (clean labels). We’ll wire live data later.
  const crypto = ["BTC +0.8%", "ETH $4,206", "DOGE +2.4%", "LINK $7.50"];
  const gas = ["ETH: 19 Gwei", "BSC: 11 Gwei"];
  const indices = ["NDX +0.6%", "SPX +0.4%", "DAX +0.35%", "NIKKEI +1.1%"];
  const equity = ["AAPL $225.10", "NVDA $123.45", "TSLA $198.20", "AMZN +0.7%"];
  const commodities = ["Gold $2,345", "Silver $29.10", "Brent $82.10", "Natural Gas $2.88"];

  return (
    <section className="mt-6">
      <Row title="Crypto Market" emoji="🌐" items={crypto} />
      <Row title="Gas Tracker" emoji="⚡" items={gas} />
      <Row title="Global Indices" emoji="📈" items={indices} />
      <Row title="Equity Watchlist" emoji="📊" items={equity} />
      <Row title="Commodities" emoji="🛢️" items={commodities} />
    </section>
  );
}
