// src/dashboard.tsx
import MarketSlots from "@/components/MarketSlots";
// src/dashboard.tsx
import { useState } from "react";
import EquitiesCommoditiesPanel from "@/components/EquitiesCommoditiesPanel";

import EthPrice from "@/lib/eth";
import BnbPrice from "@/lib/bnb";

import WhaleAlertsRow from "@/components/WhaleAlertsRow";
import MarketTickerGroup from "@/components/MarketTickerGroup";
import BusinessTicker from "@/components/BusinessTicker";

import GoldBox from "@/components/GoldBox";
import BitcoinBox from "@/components/BitcoinBox";
import OilBox from "@/components/OilBox";
import ForexBox from "@/components/ForexBox";
import IntelligenceFeed from "@/lib/IntelligenceFeed";
import GuruDrawer from "@/components/GuruDrawer";
import NavBar from "@/components/NavBar";

export default function Dashboard() {
  const [guruTopic, setGuruTopic] = useState<string | undefined>(undefined);

  return (
    <>
      <NavBar current="dashboard" />
      <main className="min-h-screen bg-gradient-to-br from-black to-gray-900 text-white p-6">
        <h1 className="text-4xl font-bold mb-6 text-center bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-green-500">
          Sentotrade Dashboard
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
          {/* 2: Bitcoin */}
          <div className="bg-white/10 p-6 rounded-xl text-center min-h-[120px]">
            <BitcoinBox />
          </div>
          {/* 3: Oil */}
          <div className="bg-white/10 p-6 rounded-xl text-center min-h-[120px]">
            <OilBox />
          </div>
          {/* 4: Forex alternating */}
          <div className="bg-white/10 p-6 rounded-xl text-center min-h-[120px]">
            <ForexBox />
          </div>
        </section>

        {/* Whale alerts row */}
        <section className="mt-2">
          <WhaleAlertsRow />
          <div className="mt-1 text-xs text-white/60 text-center md:text-left">
            Large unconfirmed BTC transfers (≥ $2M). "top" = largest single output; "outs" = number of outputs.
          </div>
        </section>

        <EquitiesCommoditiesPanel />

        {/* Market ticker + business ticker */}
        <section className="mt-10">
          <MarketTickerGroup />
          <MarketSlots />
          <div className="mt-6">
            <BusinessTicker />
          </div>
        </section>

        {/* Intelligence feed */}
        <section className="mt-10">
          <IntelligenceFeed onAskGuru={(title: string) => setGuruTopic(title)} />
          <div className="mt-3 text-sm text-amber-100 bg-amber-500/10 border border-amber-400/20 rounded-lg px-3 py-2 text-center md:text-left">
            <span className="mr-1">🧭</span>
            <span className="font-semibold">Headlines impact:</span>
            <span className="ml-1">
              moves often land in <span className="font-semibold">15–60m</span>. Risk-on language (strong USD / yields up / tariff relief)
              tends to be <span className="font-semibold">bearish</span> for gold; risk-off (sanctions, shocks) tends to be
              <span className="font-semibold"> bullish</span>. Watch DXY strength or a pickup in headline heat (≥3/hr) for confirmation.
            </span>
          </div>
        </section>

        {/* Legend */}
        <div className="mt-8 text-center text-xs md:text-sm text-white/80 bg-white/10 border border-white/20 rounded-lg px-3 py-2">
          <span className="mr-1">📎</span>
          <span className="opacity-90">Legend:</span>
          <span className="ml-1">
            Bias (bullish/neutral/bearish) • Window (5–30m / 15–60m) • Tape (calm/active/noisy). Rule of thumb: BTC ±1.5% often nudges gold the other way; Gold ±0.7% confirms.
          </span>
        </div>

        <GuruDrawer topic={guruTopic} onClose={() => setGuruTopic(undefined)} open={!!guruTopic} />
      </main>
    </>
  );
}
