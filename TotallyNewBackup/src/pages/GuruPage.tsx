import React, { useEffect, useState } from "react";

type WhaleAlert = { time: string; amount: string; coin: string };
type MarketPrice = { symbol: string; price: string };
type NewsItem = { headline: string; url?: string };

export default function GuruPage() {
  const [whales, setWhales] = useState<WhaleAlert[]>([]);
  const [markets, setMarkets] = useState<MarketPrice[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [aiInsight, setAiInsight] = useState<string>("Loading AI insights...");

  // Fetch whales
  useEffect(() => {
    fetch("/api/whales")
      .then((r) => r.json())
      .then(setWhales)
      .catch(() => setWhales([{ time: "—", amount: "No data", coin: "" }]));
  }, []);

  // Fetch markets
  useEffect(() => {
    fetch("/api/market")
      .then((r) => r.json())
      .then(setMarkets)
      .catch(() => setMarkets([{ symbol: "BTC", price: "—" }]));
  }, []);

  // Fetch news
  useEffect(() => {
    fetch("/api/news")
      .then((r) => r.json())
      .then(setNews)
      .catch(() => setNews([{ headline: "No news", url: "#" }]));
  }, []);

  // Fetch AI insight
  useEffect(() => {
    fetch("/api/ai")
      .then((r) => r.text())
      .then(setAiInsight)
      .catch(() => setAiInsight("⚠️ AI insight unavailable."));
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-black to-gray-900 text-white px-6 py-10 space-y-10">
      <h1 className="text-4xl font-bold text-center">🔥 Guru Insights 🔥</h1>

      {/* Whale Alerts */}
      <section className="bg-gray-800 rounded-xl p-6 shadow-lg">
        <h2 className="text-2xl font-semibold text-red-400 mb-3">
          🐋 Whale Alerts
        </h2>
        {whales.map((w, i) => (
          <p key={i} className="text-gray-300">
            {w.time} — {w.amount} {w.coin}
          </p>
        ))}
      </section>

      {/* Market Prices */}
      <section className="bg-gray-800 rounded-xl p-6 shadow-lg">
        <h2 className="text-2xl font-semibold text-yellow-400 mb-3">
          💹 Market Prices
        </h2>
        {markets.map((m, i) => (
          <p key={i} className="text-gray-300">
            {m.symbol}: {m.price}
          </p>
        ))}
      </section>

      {/* News Feed */}
      <section className="bg-gray-800 rounded-xl p-6 shadow-lg">
        <h2 className="text-2xl font-semibold text-cyan-400 mb-3">
          📰 News Flash
        </h2>
        <ul className="list-disc pl-6 space-y-2">
          {news.map((n, i) => (
            <li key={i}>
              <a href={n.url} target="_blank" className="text-gray-300 hover:underline">
                {n.headline}
              </a>
            </li>
          ))}
        </ul>
      </section>

      {/* AI Insight */}
      <section className="bg-gray-900 border border-yellow-500 rounded-xl p-6 shadow-lg">
        <h2 className="text-2xl font-semibold text-purple-400 mb-3">
          🔮 Guru AI Insight
        </h2>
        <p className="text-gray-200">{aiInsight}</p>
      </section>
    </div>
  );
}
