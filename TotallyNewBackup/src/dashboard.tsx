// src/dashboard.tsx
import { useEffect, useState } from "react";
import EthPrice from "./lib/eth";
import BnbPrice from "./lib/bnb";
import WhaleTransfersLive from "./components/WhaleTransfersLive";
import IntelligenceFeed from "./lib/IntelligenceFeed";
import MarketTickerGroup from "./components/MarketTickerGroup";
import BusinessTicker from "./components/BusinessTicker"; // <- adjust if your path differs

// --- Simple no-key news list (bulleted) ---
function NewsList() {
  const [items, setItems] = useState<string[]>(["Loading news…"]);

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        const url =
          "https://hn.algolia.com/api/v1/search?query=finance&tags=story&hitsPerPage=20";
        const res = await fetch(url, { headers: { Accept: "application/json" } });

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
    <ul style={{ listStyle: "disc", paddingLeft: 20, lineHeight: 1.6 }}>
      {items.map((t, i) => <li key={i}>{t}</li>)}
    </ul>
  );
}

// --- Main Dashboard ---
export default function Dashboard() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-black to-gray-900 text-white p-6">
      <h1 className="text-4xl font-bold mb-8 text-center bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-green-500">
        GlassTrade Dashboard
      </h1>

      {/* Live Price Components */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 mb-8">
        <EthPrice />
        <BnbPrice />
      </div>

      {/* Metric Blocks (example placeholders) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8 animate-slide-in">
        <div className="bg-white/10 p-6 rounded-xl text-center min-h-[120px]">Whale Alerts: 47</div>
        <div className="bg-white/10 p-6 rounded-xl text-center min-h-[120px]">Large Transfers: $89M</div>
        <div className="bg-white/10 p-6 rounded-xl text-center min-h-[120px]">ETH Block: 21,089,456</div>
        <div className="bg-white/10 p-6 rounded-xl text-center min-h-[120px]">BSC Block: 42,817,639</div>
      </section>

      {/* 🐋 Whale Transfers */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-orange-400 mb-6">🐋 Live Whale Transfers</h2>
        <WhaleTransfersLive />
      </section>

      {/* 📊 Market Ticker + Business ticker line */}
<section className="mt-10">
  <MarketTickerGroup />
  <section className="mt-6">
    <BusinessTicker />
  </section>
</section>
git commit -m "Describe your changes here"git commit -m "Describe your changes here"

      {/* 🗞️ Finance headlines (bulleted) */}
      <section className="mt-10">
        <h2 className="text-xl font-semibold mb-3">Finance Headlines</h2>
        <NewsList />
      </section>

      {/* 🧠 Market Intelligence */}
      <section className="mt-12">
        <IntelligenceFeed />
      </section>

      <div className="mt-8 text-center">
        <a href="/" className="text-cyan-400 hover:underline">← Back to Landing Page</a>
      </div>
    </main>
  );
}
