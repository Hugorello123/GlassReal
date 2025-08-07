// src/dashboard.tsx
import EthPrice from "./lib/eth";
import BnbPrice from "./lib/bnb";

import WhaleTransfersLive from "./components/WhaleTransfersLive";
import IntelligenceFeed from "./lib/IntelligenceFeed";
import MarketTickerGroup from "./components/MarketTickerGroup";
// GuruDrawer handled within IntelligenceFeed component

// Removed unused imports for cleaner code
const Dashboard = () => {
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

      {/* Enhanced Metric Blocks (8 cards with interactions) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8 animate-slide-in">
        {/* Whale Alerts */}
        <div
          className="bg-white/10 p-6 rounded-xl text-center min-h-[120px] cursor-pointer hover:animate-pulse-glow transition-all duration-300"
          title="Number of recent whale activity alerts"
          onClick={() => alert("Coming soon: Whale Alert Detail View")}
        >
          <h2 className="text-sm text-gray-300">Whale Alerts</h2>
          <p className="text-xl font-bold text-orange-400">47</p>
        </div>

        {/* Large Transfers */}
        <div
          className="bg-white/10 p-6 rounded-xl text-center min-h-[120px] cursor-pointer"
          title="Total value of large token transfers"
          onClick={() => alert("Coming soon: Transfer Explorer")}
        >
          <h2 className="text-sm text-gray-300">Large Transfers</h2>
          <p className="text-xl font-bold text-cyan-400">$89M</p>
        </div>

        {/* ETH Block */}
        <div
          className="bg-white/10 p-6 rounded-xl text-center min-h-[120px] cursor-pointer"
          title="Latest Ethereum blockchain block number"
          onClick={() => alert("Coming soon: ETH Block Explorer")}
        >
          <h2 className="text-sm text-gray-300">ETH Block</h2>
          <p className="text-xl font-bold">21,089,456</p>
        </div>

        {/* BSC Block */}
        <div
          className="bg-white/10 p-6 rounded-xl text-center min-h-[120px] cursor-pointer"
          title="Latest Binance Smart Chain block number"
          onClick={() => alert("Coming soon: BSC Block Explorer")}
        >
          <h2 className="text-sm text-gray-300">BSC Block</h2>
          <p className="text-xl font-bold">42,817,639</p>
        </div>

        {/* TSLA Change */}
        <div
          className="bg-white/10 p-6 rounded-xl text-center min-h-[120px] cursor-pointer"
          title="TSLA stock movement over last 24h"
          onClick={() => alert("Coming soon: TSLA Chart")}
        >
          <h2 className="text-sm text-gray-300">TSLA Change</h2>
          <p className="text-xl font-bold text-orange-400">+2.34%</p>
        </div>

        {/* USD/EUR */}
        <div
          className="bg-white/10 p-6 rounded-xl text-center min-h-[120px] cursor-pointer"
          title="Current USD to Euro exchange rate"
          onClick={() => alert("Coming soon: Forex Details")}
        >
          <h2 className="text-sm text-gray-300">USD/EUR</h2>
          <p className="text-xl font-bold text-cyan-400">0.9245</p>
        </div>

        {/* Gold */}
        <div
          className="bg-white/10 p-6 rounded-xl text-center min-h-[120px] cursor-pointer"
          title="Current price of Gold per ounce"
          onClick={() => alert("Coming soon: Gold Trend")}
        >
          <h2 className="text-sm text-gray-300">Gold</h2>
          <p className="text-xl font-bold text-yellow-400">$2,045.50</p>
        </div>

        {/* Total Market Cap */}
        <div
          className="bg-white/10 p-6 rounded-xl text-center min-h-[120px] cursor-pointer"
          title="Combined crypto market capitalization"
          onClick={() => alert("Coming soon: Market Overview")}
        >
          <h2 className="text-sm text-gray-300">Total Market Cap</h2>
          <p className="text-xl font-bold text-green-400">$1.2T</p>
        </div>
      </section>

      {/* 🐋 Whale Transfers Section */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-orange-400 mb-6">🐋 Live Whale Transfers</h2>
        {/* 🟩 Main whale stream (comes first as per instruction) */}
        <WhaleTransfersLive />
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          {[
            { token: "ETH", volume: "2,347 ETH", usd: "$8.5M", change: "+12.3%" },
            { token: "BTC", volume: "143.2 BTC", usd: "$6.2M", change: "+8.1%" },
            { token: "USDT", volume: "4.8M USDT", usd: "$4.8M", change: "+2.1%" },
            { token: "USDC", volume: "3.2M USDC", usd: "$3.2M", change: "+1.8%" },
          ].map((item) => (
            <div
              key={item.token}
              className="bg-white/5 rounded-lg p-4 text-white shadow-sm"
            >
              <div className="text-sm text-gray-400 font-semibold">{item.token}</div>
              <div className="text-xl font-bold mt-1">{item.volume}</div>
              <div className="text-sm text-gray-300">{item.usd}</div>
              <div
                className={`text-xs mt-1 ${
                  item.change.startsWith("-") ? "text-red-400" : "text-green-400"
                }`}
              >
                {item.change}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 📊 Market Ticker Section */}
      <section className="mt-10">
        <MarketTickerGroup />
      </section>

      {/* 🧠 Market Intelligence Feed Section */}
      <section className="mt-12">
        <IntelligenceFeed />
      </section>

      <div className="mt-8 text-center">
        <a href="/" className="text-cyan-400 hover:underline">
          ← Back to Landing Page
        </a>
      </div>
    </main>
  );
};

export default Dashboard;
