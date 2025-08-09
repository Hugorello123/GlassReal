// server.mjs
import express from "express";
import fetch from "node-fetch";
import path from "path";
import { fileURLToPath } from "url";
import adminRoutes from "./server/admin.mjs";
import onboardingRoutes from "./server/onboarding.mjs";

const app = express();
const PORT = 8080;
app.use("/api", adminRoutes);


// Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Live CoinStats Proxy Route
app.get("/api/coinstats/news", async (req, res) => {
  try {
    const response = await fetch("https://api.coinstats.app/public/v1/news?skip=0&limit=10");
    const data = await response.json();
    res.json(
      data.news.map((item) => ({
        title: item.title,
        source: item.source,
        link: item.link,
      }))
    );
  } catch (error) {
    console.error("CoinStats fetch error:", error);
    res.status(500).json({ error: "Failed to fetch CoinStats news" });
  }
});

// ✅ Connect the onboarding route
import onboardingRoutes from "./server/onboarding.mjs";
app.use("/api", onboardingRoutes);

// Optional: serve frontend
app.use(express.static(path.join(__dirname, "dist")));
// --- Cached News proxy (5-min cache) ---
let NEWS_CACHE = { ts: 0, articles: [] };

app.get("/api/news", async (_req, res) => {
  try {
    // 5 minutes cache
    if (Date.now() - NEWS_CACHE.ts < 5 * 60 * 1000 && NEWS_CACHE.articles.length) {
      return res.json({ articles: NEWS_CACHE.articles, cached: true });
    }

    const url = "https://newscatcher.p.rapidapi.com/v1/search_free?q=crypto&lang=en&page=1&page_size=20&media=False&sort_by=relevancy";
    const r = await fetch(url, {
      headers: {
        "x-rapidapi-key": "fc6389bd42msh6cc1bb1dcd03218p1aafcdjsn48c9a4e7e386",
        "x-rapidapi-host": "newscatcher.p.rapidapi.com",
        "Accept": "application/json"
      }
    });

    // On 429, keep old cache (if any) and send samples
    if (!r.ok) {
      return res.json({
        articles: NEWS_CACHE.articles.length ? NEWS_CACHE.articles : [
          { title: "Sample: Markets mixed as traders eye CPI" },
          { title: "Sample: Bitcoin holds key support" },
          { title: "Sample: Oil slips; gold inches higher" }
        ],
        status: r.status
      });
    }

    const data = await r.json();
    const articles = (data.articles || []).map(a => ({ title: a.title })).filter(a => a.title);
    NEWS_CACHE = { ts: Date.now(), articles };
    res.json({ articles, cached: false });
  } catch (e) {
    res.json({
      articles: [
        { title: "Network issue — showing sample headlines" },
        { title: "Crypto majors steady; volumes light" }
      ],
      error: String(e)
    });
  }
});

app.listen(PORT, () => {
  console.log(`🔁 Proxy server running at http://localhost:${PORT}`);
});
