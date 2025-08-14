// src/dashboard.tsx
import React from "react";

import EthPrice from "@/lib/eth";
import BnbPrice from "@/lib/bnb";

import WhaleAlertsRow from "@/components/WhaleAlertsRow";
import MarketTickerGroup from "@/components/MarketTickerGroup";
import BusinessTicker from "@/components/BusinessTicker";
import GoldBox from "@/components/GoldBox";
import BitcoinBox from "@/components/BitcoinBox";
import OilBox from "@/components/OilBox";

/* ---- MAIN DASHBOARD ---- */
export default function Dashboard() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-black to-gray-900 text-white p-6">
      <h1 className="text-4xl font-bold mb-6 text-center bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-green-500">
        GlassTrade Dashboard
      </h1>

      {/* Top two big price blocks */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <EthPrice />
        <BnbPrice />
      </section>

      {/* Four widgets */}
      <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {/* 1: Gold */}
        <div className="bg-white/10 p-6 rounded-xl text-center min-h-[120px]">
          <GoldBox />
        </div>
<BitcoinBox />
<OilBox />


        {/* 4: Placeholder */}
        <div className="bg-white/10 p-6 rounded-xl text-center min-h-[120px]">
          <div className="text-sm opacity-70 mb-1">Coming Soon</div>
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

      <div className="mt-8 text-center">
        <a href="/" className="text-cyan-400 hover:underline">
          ← Back to Landing Page
        </a>
      </div>
    </main>
  );
}
