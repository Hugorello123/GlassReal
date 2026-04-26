import https from "https";
import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 8443;
const POLYGON_KEY = process.env.VITE_POLYGON_KEY || "";
const BITQUERY_TOKEN = process.env.VITE_BITQUERY_TOKEN || "";
const NEWSDATA_KEY = process.env.VITE_NEWSDATA_KEY || "pub_9d6ed60eaba84f238bbaed7dd3e506bd";
const SSL_KEY = process.env.SSL_KEY || "/home/vmbsinyo/glasstrade-certs/privkey.pem";
const SSL_CERT = process.env.SSL_CERT || "/home/vmbsinyo/glasstrade-certs/fullchain.pem";
const hasSSL = fs.existsSync(SSL_KEY) && fs.existsSync(SSL_CERT);

console.log("[Sentotrade] PORT:", PORT, "SSL:", hasSSL);

/* ─── stats accumulator ─── */
const STATS_FILE = path.join(__dirname, "stats.jsonl");
function logStat(cat, data) {
  const line = JSON.stringify({ t: new Date().toISOString(), cat, data }) + "\n";
  fs.appendFile(STATS_FILE, line, () => {});
}

/* ─── news cache (3 minutes) ─── */
let newsCache = { articles: [{ title: "Loading...", url: "#" }], ts: 0 };
const NEWS_CACHE_MS = 180000; // 3 minutes

async function fetchNewsWithCache() {
  const now = Date.now();
  if (now - newsCache.ts < NEWS_CACHE_MS) {
    console.log("[News] Serving cache, age:", Math.round((now - newsCache.ts) / 1000), "s");
    return newsCache.articles;
  }
  let articles = [];
  try {
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), 4000);
    const r = await fetch(`https://newsdata.io/api/1/news?apikey=${NEWSDATA_KEY}&q=crypto&language=en&size=10`, { signal: ctrl.signal });
    const d = await r.json();
    if (d?.results?.length) articles = d.results.map(a => ({ title: a.title, url: a.link })).slice(0, 10);
    console.log("[News] Fresh fetch:", articles.length, "articles");
  } catch (e) {
    console.log("[News] Fetch error:", e.message);
  }
  if (!articles.length) articles = [{ title: "News temporarily unavailable", url: "#" }];
  newsCache = { articles, ts: now };
  logStat("news", { count: articles.length, cached: false });
  return articles;
}

/* ─── auto-prediction engine ─── */
const PREDICTIONS_FILE = path.join(__dirname, "predictions.jsonl");

async function fetchPrices() {
  try {
    const r = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,pax-gold&vs_currencies=usd&include_24hr_change=true", { signal: AbortSignal.timeout(5000) });
    const d = await r.json();
    return { btc: d?.bitcoin?.usd ?? null, btcCh: d?.bitcoin?.usd_24h_change ?? null, eth: d?.ethereum?.usd ?? null, ethCh: d?.ethereum?.usd_24h_change ?? null, gold: d?.["pax-gold"]?.usd ?? null, goldCh: d?.["pax-gold"]?.usd_24h_change ?? null };
  } catch { return null; }
}

function generateSignals(prices) {
  const signals = [];
  if (!prices) return signals;
  const now = new Date().toISOString();
  if (prices.btcCh !== null && prices.btcCh < -1.5) signals.push({ id: "sig_" + Date.now() + "_btc_long", time: now, asset: "BTC", call: "Long", entry: prices.btc, target: (prices.btc * 1.005).toFixed(2), targetPct: "+0.5%", timeframe: "12h", why: `BTC oversold (${prices.btcCh.toFixed(2)}% 24h). Expect bounce.`, horizon: "12h", status: "open", outcome: "—" });
  if (prices.btcCh !== null && prices.btcCh > 1.5) signals.push({ id: "sig_" + Date.now() + "_btc_short", time: now, asset: "BTC", call: "Short", entry: prices.btc, target: (prices.btc * 0.995).toFixed(2), targetPct: "-0.5%", timeframe: "12h", why: `BTC overbought (+${prices.btcCh.toFixed(2)}% 24h). Expect pullback.`, horizon: "12h", status: "open", outcome: "—" });
  if (prices.goldCh !== null && prices.goldCh > 0.7) signals.push({ id: "sig_" + Date.now() + "_gold_long", time: now, asset: "Gold", call: "Long", entry: prices.gold, target: (prices.gold * 1.003).toFixed(2), targetPct: "+0.3%", timeframe: "6h", why: `Gold breaking (+${prices.goldCh.toFixed(2)}% 24h). Safe-haven flow.`, horizon: "6h", status: "open", outcome: "—" });
  if (prices.goldCh !== null && prices.goldCh < -0.7) signals.push({ id: "sig_" + Date.now() + "_gold_short", time: now, asset: "Gold", call: "Short", entry: prices.gold, target: (prices.gold * 0.997).toFixed(2), targetPct: "-0.3%", timeframe: "6h", why: `Gold selling off (${prices.goldCh.toFixed(2)}% 24h). Risk-on tone.`, horizon: "6h", status: "open", outcome: "—" });
  return signals;
}

function savePredictions(preds) {
  for (const p of preds) {
    fs.appendFile(PREDICTIONS_FILE, JSON.stringify(p) + "\n", () => {});
    logStat("prediction", { id: p.id, asset: p.asset, call: p.call, status: p.status });
  }
}

function loadPredictions(limit = 50) {
  if (!fs.existsSync(PREDICTIONS_FILE)) return [];
  const lines = fs.readFileSync(PREDICTIONS_FILE, "utf8").trim().split("\n").filter(Boolean);
  return lines.slice(-limit).map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
}

let lastSignalRun = 0;
async function runSignalEngine() {
  const now = Date.now();
  if (now - lastSignalRun < 300000) return;
  lastSignalRun = now;
  const prices = await fetchPrices();
  if (!prices) return;
  const signals = generateSignals(prices);
  if (signals.length) {
    savePredictions(signals);
    console.log("[Signals] Generated", signals.length, ":", signals.map(s => s.asset + " " + s.call).join(", "));
  }
}

const mime = {
  ".html": "text/html", ".js": "application/javascript", ".css": "text/css",
  ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg", ".gif": "image/gif", ".svg": "image/svg+xml",
  ".ico": "image/x-icon", ".woff2": "font/woff2", ".woff": "font/woff", ".ttf": "font/ttf"
};

function handleRequest(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") { res.writeHead(200); return res.end(); }
  const url = req.url;

  if (url === "/api/health") return res.writeHead(200, {"Content-Type": "application/json"}).end(JSON.stringify({ status: "ok", time: new Date().toISOString(), ssl: hasSSL, keys: { polygon: !!POLYGON_KEY, bitquery: !!BITQUERY_TOKEN, newsdata: !!NEWSDATA_KEY } }));

  if (url === "/api/news") {
    fetchNewsWithCache().then(articles => res.writeHead(200, {"Content-Type": "application/json"}).end(JSON.stringify({ articles })));
    return;
  }

  if (url === "/api/flow/btc" || url === "/api/flow/eth") return res.writeHead(200, {"Content-Type": "application/json"}).end(JSON.stringify({ status: "connect_bitquery", to_exch: { count: 0, usd: 0 }, from_exch: { count: 0, usd: 0 } }));
  if (url === "/api/stable/usdt-eth") return res.writeHead(200, {"Content-Type": "application/json"}).end(JSON.stringify({ status: "connect_etherscan", mints: { count: 0, usd: 0 }, burns: { count: 0, usd: 0 } }));
  if (url === "/api/watchdog/summary") return res.writeHead(200, {"Content-Type": "application/json"}).end("[]");
  if (url === "/api/signal/recent" || url === "/api/predictions") return res.writeHead(200, {"Content-Type": "application/json"}).end(JSON.stringify({ items: loadPredictions(50) }));

  if (url === "/api/stats/log" && req.method === "POST") {
    let body = "";
    req.on("data", chunk => body += chunk);
    req.on("end", () => { try { const e = JSON.parse(body); if (e.cat && e.data) { logStat(e.cat, e.data); res.writeHead(200).end(JSON.stringify({ ok: true })); } else res.writeHead(400).end(JSON.stringify({ error: "Missing cat or data" })); } catch { res.writeHead(400).end(JSON.stringify({ error: "Invalid JSON" })); } });
    return;
  }

  if (url === "/api/stats" || url.startsWith("/api/stats?")) {
    const q = new URL(url, "http://localhost").searchParams;
    let stats = []; if (fs.existsSync(STATS_FILE)) { const lines = fs.readFileSync(STATS_FILE, "utf8").trim().split("\n").filter(Boolean); stats = lines.map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean); if (q.get("cat")) stats = stats.filter(s => s.cat === q.get("cat")); }
    return res.writeHead(200, {"Content-Type": "application/json"}).end(JSON.stringify({ stats: stats.slice(-parseInt(q.get("limit") || "1000", 10)) }));
  }

  if (url === "/api/stats/summary") {
    let all = [], bias = [], predictions = [], news = [];
    if (fs.existsSync(STATS_FILE)) { const lines = fs.readFileSync(STATS_FILE, "utf8").trim().split("\n").filter(Boolean); const parsed = lines.map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean); all = parsed; bias = parsed.filter(s => s.cat === "bias"); predictions = parsed.filter(s => s.cat === "prediction"); news = parsed.filter(s => s.cat === "news"); }
    return res.writeHead(200, {"Content-Type": "application/json"}).end(JSON.stringify({ total: all.length, categories: { bias: bias.length, prediction: predictions.length, news: news.length }, latestBias: bias[bias.length - 1]?.data || null, predictionRecord: { hit: predictions.filter(p => p.data?.status === "hit").length, missed: predictions.filter(p => p.data?.status === "missed").length, partial: predictions.filter(p => p.data?.status === "partial").length, open: predictions.filter(p => p.data?.status === "open").length }, lastNewsCount: news[news.length - 1]?.data?.count || 0 }));
  }

  const staticDir = path.join(__dirname, "public");
  let filePath = path.join(staticDir, url === "/" ? "index.html" : url);
  if (!fs.existsSync(filePath) && !path.extname(filePath)) { const h = filePath + ".html"; if (fs.existsSync(h)) filePath = h; }
  if (!fs.existsSync(filePath)) filePath = path.join(staticDir, "index.html");
  const ext = path.extname(filePath).toLowerCase();
  fs.readFile(filePath, (err, c) => { if (err) { res.writeHead(404, {"Content-Type": "text/plain"}); return res.end("Not found"); } res.writeHead(200, {"Content-Type": mime[ext] || "application/octet-stream" }); res.end(c); });
}

/* ─── start server ─── */
let server;
if (hasSSL) { server = https.createServer({ key: fs.readFileSync(SSL_KEY), cert: fs.readFileSync(SSL_CERT) }, handleRequest); server.listen(PORT, () => console.log("HTTPS sentotrade.io:" + PORT)); }
else { server = http.createServer(handleRequest); server.listen(PORT, () => console.log("HTTP port " + PORT)); }

/* ─── auto-run signal engine every 5 minutes ─── */
runSignalEngine();
setInterval(runSignalEngine, 300000);
