// src/dashboard.tsx
import React, { useEffect, useState } from "react";

import EthPrice from "@/lib/eth";
import BnbPrice from "@/lib/bnb";
import WhaleAlertsRow from "@/components/WhaleAlertsRow";
import MarketTickerGroup from "@/components/MarketTickerGroup";
import BusinessTicker from "@/components/BusinessTicker";
//import NewsTicker from "@/components/NewsTicker";
import GoldBox from "@/components/GoldBox";

/* ---- Simple News List ---- */
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
    const id = setInterval(load, 10 * 60 * 1000);
    return () => {
      alive = false;
      clearInterval(id);
    };
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

/* ---- MAIN DASHBOARD ---- */
export default function Dashboard() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-black to-gray-900 text-white p-6">
      <h1 className="text-4xl font-bold mb-6 text-center bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-green-500">
        GlassTrade Dashboard
      </h1>

      {/* Optional: headline train */}
      

      {/* Top two big price blocks */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 mb-8">
        <EthPrice />
        <BnbPrice />
      </section>

      {/* Four small summary boxes */}
      <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {/* 1: Gold */}
        <div className="bg-white/10 p-6 rounded-xl text-center min-h-[120px]">
          <GoldBox />
        </div>

        {/* 2: Large Transfers */}
        <div className="bg-white/10 p-6 rounded-xl text-center min-h-[120px]">
          <div className="text-sm opacity-70 mb-1">Large Transfers</div>
          <div className="text-2xl font-semibold">—</div>
        </div>

        {/* 3: ETH Block */}
        <div className="bg-white/10 p-6 rounded-xl text-center min-h-[120px]">
          <div className="text-sm opacity-70 mb-1">ETH Block</div>
          <div className="text-2xl font-semibold">—</div>
        </div>

        {/* 4: BSC Block */}
        <div className="bg-white/10 p-6 rounded-xl text-center min-h-[120px]">
          <div className="text-sm opacity-70 mb-1">BSC Block</div>
          <div className="text-2xl font-semibold">—</div>
        </div>
      </section>

      {/* Whale alerts row */}
      <section className="mt-2">
        <WhaleAlertsRow />
      </section>

      {/* Market ticker + business ticker */}
      <section className="mt-10">
        <MarketTickerGroup />
        <div className="mt-6">
          <BusinessTicker />
        </div>
      </section>

      {/* Optional news list */}
      <section className="mt-10">
        <NewsList />
      </section>

      <div className="mt-8 text-center">
        <a href="/" className="text-cyan-400 hover:underline">
          ← Back to Landing Page
        </a>
      </div>
    </main>
  );
}
