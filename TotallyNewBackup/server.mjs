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

app.listen(PORT, () => {
  console.log(`🔁 Proxy server running at http://localhost:${PORT}`);
});
