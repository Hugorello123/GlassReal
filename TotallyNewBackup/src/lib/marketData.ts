// src/lib/marketData.ts

// ✅ Market data functions with static fallbacks
export const getEquityAlerts = async () => {
  // Return static data to avoid API issues
  return { label: "TSLA", change: "+2.34" };
};

// ✅ Forex signals with static data
export const getForexSignals = async () => {
  return { label: "USD/EUR", rate: "0.9245" };
};

// ✅ Commodity prices with static data
export const getCommodityNews = async () => {
  return { label: "Gold", price: "2,045.50" };
};
