import { useState } from "react";
import GuruDrawer from "../components/GuruDrawer";

const feedData = [
  {
    id: 1,
    message: "Massive BTC transfer: $18.2M to cold storage",
    time: "1 min ago",
  },
  {
    id: 2,
    message: "ETH gas fees spiking: 45 gwei average",
    time: "3 min ago",
  },
  { id: 3, message: "SHIB volume surge: +340% in 1hr", time: "6 min ago" },
  {
    id: 4,
    message: "SOL whale accumulation: $7.8M purchased",
    time: "9 min ago",
  },
  { id: 5, message: "DeFi TVL hits new milestone: $95B", time: "14 min ago" },
];

const IntelligenceFeed = () => {
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);

  return (
    <>
      <div className="bg-white/10 p-4 rounded-xl">
        <h2 className="text-2xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500">
          🧠 Market Intelligence Feed
        </h2>
        <div className="space-y-4">
          {feedData.map((item) => (
            <div key={item.id} className="p-3 bg-white/5 rounded text-white">
              <div className="font-medium">{item.message}</div>
              <div className="text-xs text-gray-400 mb-2">{item.time}</div>
              <button 
                onClick={() => setSelectedTopic(item.message)}
                className="text-xs bg-purple-600 text-white px-2 py-1 rounded hover:bg-purple-700">
                ⭐ Ask the Guru
              </button>
            </div>
          ))}
        </div>
      </div>
      
      {selectedTopic && (
        <GuruDrawer topic={selectedTopic} onClose={() => setSelectedTopic(null)} />
      )}
    </>
  );
};

export default IntelligenceFeed;
