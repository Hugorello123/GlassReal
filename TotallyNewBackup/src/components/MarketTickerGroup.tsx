// src/components/MarketTickerGroup.tsx
import { useState, useEffect } from "react";
import "../components/ticker.css"; // Assuming your ticker styles live here
import { fetchCoinStatsNews } from "../lib/fetchNews";

const MarketTickerGroup = () => {
  const [newsHeadlines, setNewsHeadlines] = useState<string[]>([]);

  useEffect(() => {
    const getNews = async () => {
      try {
        const headlines = await fetchCoinStatsNews();
        setNewsHeadlines(headlines);
      } catch (err) {
        console.error("Failed to load news:", err);
      }
    };
    getNews();
  }, []);

  const tickers = [
    {
      id: "news",
      label: "📰 News Headlines",
      items: newsHeadlines.length ? newsHeadlines : ["Loading news..."],
    },
    {
      id: "crypto",
      label: "Crypto Market 🪙",
      items: ["BTC $29,000", "ETH $1,850", "SOL $23.50", "XRP $0.64", "DOGE +24%", "LINK $7.50"],
    },
    {
      id: "gas",
      label: "Gas Tracker ⚡",
      items: ["ETH Gas: 24 Gwei", "Polygon: 19 Gwei", "BSC: 11 Gwei"],
    },
    {
      id: "indices",
      label: "Global Indices 📈",
      items: ["S&P 500 +0.74%", "NASDAQ -1.2%", "DAX +0.35%", "NIKKEI +1.1%"],
    },
    {
      id: "commodities",
      label: "Commodities 🪨",
      items: ["Gold $2,045", "Silver $24.30", "Oil $82.10", "Natural Gas $2.88"],
    },
  ];
  return (
    <div className="space-y-4">
      {tickers.map((ticker) => (
        <div key={ticker.id} className="overflow-hidden bg-white/5 rounded-md">
          <div className="text-sm text-gray-300 px-4 pt-2">{ticker.label}</div>
          <div className="ticker px-4 py-2">
            <div className="ticker__content">
              {ticker.items.map((item, idx) => (
                <span key={idx} className="mr-8 whitespace-nowrap">
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default MarketTickerGroup;
