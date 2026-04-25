import { useEffect, useState } from "react";
import { fetchWhaleTransfers } from "../lib/fetchWhaleData";

interface WhaleTransfer {
  amount: string;
  currency: { symbol: string };
  sender: { address: string };
  receiver: { address: string };
  transaction: { hash: string };
}

export default function WhaleTransfersLive() {
  const [transfers, setTransfers] = useState<WhaleTransfer[]>([]);

  useEffect(() => {
    const fetchAndUpdate = async () => {
      try {
        const newTransfers = await fetchWhaleTransfers();
        setTransfers((prev) => {
          // Avoid duplicates
          const existingHashes = new Set(
            prev.map((tx) => tx.transaction?.hash),
          );
          const fresh = newTransfers.filter(
            (tx: WhaleTransfer) => !existingHashes.has(tx.transaction?.hash),
          );
          return [...fresh, ...prev].slice(0, 20); // Keep last 20 only
        });
      } catch (err) {
        console.error("Whale fetch failed:", err);
      }
    };

    fetchAndUpdate(); // Initial
    const interval = setInterval(fetchAndUpdate, 10000); // every 10s

    return () => clearInterval(interval);
  }, []);

  // Whale summary data
  const whaleSummary = [
    { token: "ETH", volume: "2,347 ETH", value: "$8.5M", change: "+12.3%", color: "text-blue-400" },
    { token: "BTC", volume: "143.2 BTC", value: "$6.2M", change: "+8.1%", color: "text-orange-400" },
    { token: "USDT", volume: "4.8M USDT", value: "$4.8M", change: "+2.1%", color: "text-green-400" },
    { token: "USDC", volume: "3.2M USDC", value: "$3.2M", change: "+1.8%", color: "text-cyan-400" }
  ];

  return (
    <div className="bg-white/10 p-4 rounded-xl">
      <h2 className="text-sm text-gray-300 mb-2">Whale Transfers</h2>
      
      {/* Whale Summary Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {whaleSummary.map((item, idx) => (
          <div key={idx} className="bg-white/10 p-3 rounded-lg">
            <div className="flex justify-between items-start mb-1">
              <h3 className={`text-sm font-bold ${item.color}`}>{item.token}</h3>
              <span className="text-xs text-green-400">{item.change}</span>
            </div>
            <div className="text-xs text-gray-300">{item.volume}</div>
            <div className="text-xs text-gray-400">{item.value}</div>
          </div>
        ))}
      </div>

      {/* Live Feed */}
      {transfers.length === 0 ? (
        <p className="text-xs text-gray-400">No recent moves</p>
      ) : (
        <ul className="space-y-1 text-sm">
          {transfers.map((tx, idx) => (
            <li
              key={idx}
              className="text-white animate-fade-in-up"
              style={{
                animationDelay: `${idx * 0.1}s`,
                animationFillMode: "both",
              }}
            >
              🐳 ${parseFloat(tx.amount).toLocaleString()}{" "}
              {tx.currency.symbol.toUpperCase()}
              {` from ${tx.sender.address.slice(0, 6)}... → ${tx.receiver.address.slice(0, 6)}...`}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
