// src/dashboard.tsx
import React, { useEffect, useState } from "react";

import MarketTickerGroup from "@/components/MarketTickerGroup";
import BusinessTicker from "@/components/BusinessTicker";
import WhaleTransfersLive from "@/components/WhaleTransfersLive";
import WhaleAlertsRow from "@/components/WhaleAlertsRow";

import EthPrice from "@/lib/eth";
import BnbPrice from "@/lib/bnb";
import IntelligenceFeed from "@/lib/IntelligenceFeed";

/* --- Simple no-key news list (stub) --- */
function NewsList() {
  const [items, setItems] = useState<string[]>(["Loading news…"]);

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        const res = await fetch(
          "https://hn.algolia.com/api/v1/search?query=finance&tags=story&hitsPerPage=20",
          { headers: { Accept: "application/json" } }
        );
        if (!res.ok) {
          if (alive) setItems(["News Headlines following soon…"]);
          return;
        }
        const data: any = await res.json();
        const titles: string[] = Array.isArray(data?.hits)
          ? data.hits.map((h: any) => h?.title).filter(Boolean)
          : [];
        if (alive) setItems(titles.length ? titles.slice(0, 8) : ["News Headlines following soon…"]);
      } catch {
        if (alive) setItems(["News Headlines following soon…"]);
      }
    }

    load();
    const id = window.setInterval(load, 10 * 60 * 1000);
    return () => { alive = false; window.clearInterval(id); };
  }, []);

  return (
    <section className="bg-white/5 rounded-2xl p-4">
      <h2 className="text-lg font-semibold mb-3">News</h2>
      <ul className="list-disc pl-5 space-y-2 text-sm opacity-90">
        {items.map((t, i) => <li key={i}>{t}</li>)}
      </ul>
    </section>
  );
}

/* --- Main Dashboard (single default export) --- */
export default function Dashboard() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-black to-gray-900 text-white p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        <h1 className="text-3xl md:text-4xl font-bold text-center bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-green-500">
          GlassTrade Dashboard
        </h1>

        {/* Live Price Components */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <EthPrice />
          <BnbPrice />
        </section>

        {/* Live price “trains” + business ticker */}
        <section className="space-y-6">
          <MarketTickerGroup />
          <BusinessTicker />
        </section>

        {/* Whale Alerts headline row */}
        <section className="mt-2">
          <WhaleAlertsRow />
        </section>

        {/* Live Whale Transfers */}
        <section className="mt-6">
          <h2 className="text-2xl font-bold text-orange-400 mb-4">🐋 Live Whale Transfers</h2>
          <WhaleTransfersLive />
        </section>

        {/* Finance headlines */}
        <NewsList />

        {/* Market Intelligence */}
        <section className="mt-6">
          <IntelligenceFeed />
        </section>

        <div className="text-center">
          <a href="/" className="text-cyan-400 hover:underline">← Back to Landing Page</a>
        </div>
      </div>
    </main>
  );
}
