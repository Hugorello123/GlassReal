const API_BASE = import.meta.env.VITE_BACKEND_URL || "http://localhost:8080";

export async function fetchCoinStatsNews(): Promise<string[]> {
  try {
    const res = await fetch(`${API_BASE}/api/coinstats/news`);
    const json = await res.json();

    console.log("💥 News API Response:", json); // <-- This will print the shape
    if (!Array.isArray(json)) {
      console.warn("⚠️ News response is not an array. Check backend response.");
      return [];
    }

    return json.map((item: any) => item.title);
  } catch (error) {
    console.error("❌ Failed to fetch news:", error);
    return [];
  }
}
