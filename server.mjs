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
const NEWSDATA_KEY = process.env.VITE_NEWSDATA_KEY || "pub_9d6ed60eaba84f238bbaed7dd3e506bd";
const POLYGON_KEY = process.env.VITE_POLYGON_KEY || "";
const OPENAI_KEY = process.env.OPENAI_KEY || "";
const SSL_KEY = process.env.SSL_KEY || "/home/vmbsinyo/glasstrade-certs/privkey.pem";
const SSL_CERT = process.env.SSL_CERT || "/home/vmbsinyo/glasstrade-certs/fullchain.pem";
const hasSSL = fs.existsSync(SSL_KEY) && fs.existsSync(SSL_CERT);

console.log("[Sentotrade] PORT:", PORT, "SSL:", hasSSL);

const STATS_FILE = path.join(__dirname, "stats.jsonl");
const PREDICTIONS_FILE = path.join(__dirname, "predictions.jsonl");
const GURU_HISTORY = path.join(__dirname, "guru-history.jsonl");
const GURU_HISTORY_MAX = 500;
const GURU_MAX_FILE_MB = 2;
const GURU_TIMEOUT_MS = 8000;

function logStat(cat, data) {
  const line = JSON.stringify({ t: new Date().toISOString(), cat, data }) + "\n";
  fs.appendFile(STATS_FILE, line, () => {});
}

function savePrediction(pred) {
  fs.appendFile(PREDICTIONS_FILE, JSON.stringify(pred) + "\n", () => {});
  logStat("prediction", { id: pred.id, asset: pred.asset, call: pred.call, status: pred.status });
}

function loadPredictions(limit = 50) {
  if (!fs.existsSync(PREDICTIONS_FILE)) return [];
  const lines = fs.readFileSync(PREDICTIONS_FILE, "utf8").trim().split("\n").filter(Boolean);
  return lines.slice(-limit).map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
}

const AI_PRED_SOURCE = "AI-Gossip";
const AI_PRED_COOLDOWN_MS = 30 * 60 * 1000;
let lastAiPredAt = 0;

function inferAssetFromSignal(gossip = {}, headlines = []) {
  const text = headlines.map(h => `${h.title || ""} ${h.description || ""}`).join(" ").toLowerCase();
  const spy = Object.keys(gossip.spywords || {}).join(" ").toLowerCase();
  const geo = (gossip.geopoliticalTags || []).join(" ").toLowerCase();
  const risk = JSON.stringify(gossip.riskEntities || {}).toLowerCase();
  const blob = `${text} ${spy} ${geo} ${risk}`;

  if (/\boil|\bbrent\b|\bwti\b|\benergy\b/.test(blob)) return "OIL";
  if (/\btesla\b|\btsla\b|\bnasdaq\b|\btech\b/.test(blob)) return "TSLA";
  if (/\btariff\b|\btrade war\b|\bs&p\b|\bspx\b|\bspy\b/.test(blob)) return "SPX";
  if (/\bdxy\b|\bdollar\b|\busd\b|\bfed\b/.test(blob)) return "DXY";
  if (/\bgold\b|\bxau\b|\bsafe haven\b/.test(blob)) return "GOLD";
  if (/\bethereum|\beth\b/.test(blob)) return "ETH";
  if (/\bxrp\b/.test(blob)) return "XRP";
  if (/\bbitcoin|\bbtc\b|\bcrypto\b/.test(blob)) return "BTC";
  return "BTC";
}

function inferSignalAssetFromGossip(gossip, prices) {
  const asset = inferAssetFromSignal(gossip || {}, (gossip && gossip.headlines) || []);
  if (asset === "OIL")  return { asset: "OIL",  px: prices?.oil  ?? null, ch: prices?.oilCh  ?? null, up: 1.01,  dn: 0.99  };
  if (asset === "GOLD") return { asset: "Gold", px: prices?.gold ?? null, ch: prices?.goldCh ?? null, up: 1.003, dn: 0.997 };
  if (asset === "TSLA") return { asset: "TSLA", px: prices?.tsla ?? null, ch: prices?.tslaCh ?? null, up: 1.008, dn: 0.992 };
  if (asset === "ETH")  return { asset: "ETH",  px: prices?.eth  ?? null, ch: prices?.ethCh  ?? null, up: 1.006, dn: 0.994 };
  if (asset === "DOGE") return { asset: "DOGE", px: prices?.doge ?? null, ch: prices?.dogeCh ?? null, up: 1.02,  dn: 0.98  };
  return { asset: "BTC", px: prices?.btc ?? null, ch: prices?.btcCh ?? null, up: 1.005, dn: 0.995 };
}

function pickReferencePrice(asset, prices = {}) {
  const map = {
    BTC: "btc",
    ETH: "eth",
    XRP: "xrp",
    GOLD: "gold",
    OIL: "oil",
    TSLA: "tsla",
    SPX: "spx",
    DXY: "dxy",
    DOGE: "doge"
  };
  const key = map[asset];
  if (!key) return null;
  const v = prices[key];
  return (typeof v === "number" && Number.isFinite(v) && v > 0) ? v : null;
}

function shouldCreateAiPrediction(current, previous, alerts = []) {
  const intensityJump = ((current?.intensity || 0) - (previous?.intensity || 0)) >= 3;
  const bullShift = Math.abs((current?.bullish || 0) - (previous?.bullish || 0)) >= 30;
  const bearShift = Math.abs((current?.bearish || 0) - (previous?.bearish || 0)) >= 30;
  const firstTimeSignal = alerts.some(a => /first time/i.test(String(a?.message || "")));
  const whaleSignal = alerts.some(a => /breakout|ban|whale/i.test(`${a?.word || ""} ${a?.message || ""}`));
  return intensityJump || bullShift || bearShift || firstTimeSignal || whaleSignal;
}

function buildAiPrediction({ headlines, scores, prices }) {
  const now = Date.now();
  const asset = inferAssetFromSignal(scores || {}, headlines);
  const entry = pickReferencePrice(asset, prices);
  if (!entry) return null;

  const direction = (scores?.bullish || 0) >= (scores?.bearish || 0) ? "Long" : "Short";
  const target = direction === "Long" ? entry * 1.03 : entry * 0.97;
  const confidence = Math.max(35, Math.min(95, (scores?.intensity || 0) * 10));

  return {
    id: `ai-gossip-${now}`,
    t: new Date(now).toISOString(),
    source: AI_PRED_SOURCE,
    asset,
    call: direction,
    entry,
    target,
    timeframe: "72h",
    expiresAt: new Date(now + 72 * 60 * 60 * 1000).toISOString(),
    status: "open",
    confidence,
    notes: "Auto-generated from gossip spike"
  };
}

/* ─── news cache (3 min) ─── */
let newsCache = { articles: [{ title: "Loading...", url: "#" }], ts: 0 };
const NEWS_CACHE_MS = 180000;

const MARKET_ALLOW = [
  "price","market","stock","crypto","bitcoin","ethereum","oil","gold","fed",
  "rate","tariff","trade","economy","earnings","revenue","inflation",
  "war","sanction","ban","etf","futures","options","dxy","spx","nasdaq","tesla","tsla"
];
const MARKET_BLOCK = [
  "murder","arrested","celebrity","dating","kardashian","divorce","baby","wedding","viral video","crime","homicide"
];

function isMarketHeadline(title = "") {
  const t = String(title || "").toLowerCase();
  if (!t) return false;
  if (MARKET_BLOCK.some(w => t.includes(w))) return false;
  return MARKET_ALLOW.some(w => t.includes(w));
}

async function fetchNewsWithCache() {
  const now = Date.now();
  if (now - newsCache.ts < NEWS_CACHE_MS && newsCache.articles.length > 1) return newsCache.articles;
  let articles = [];
  try {
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), 4000);
    const q = encodeURIComponent("crypto OR oil OR tesla OR tariff OR war OR fed OR dxy OR spy OR nasdaq");
    const r = await fetch(`https://newsdata.io/api/1/news?apikey=${NEWSDATA_KEY}&q=${q}&language=en&size=10`, { signal: ctrl.signal });
    const d = await r.json();
    if (d?.results?.length) articles = d.results.filter(a => isMarketHeadline(a.title)).map(a => ({ title: a.title, url: a.link })).slice(0, 10);
  } catch (e) {}
  if (!articles.length) articles = [{ title: "News temporarily unavailable", url: "#" }];
  newsCache = { articles, ts: now };
  logStat("news", { count: articles.length });
  return articles;
}

/* ─── TSLA price cache (1 min) ─── */
let tslaCache = { price: null, change: null, ts: 0 };
async function fetchTesla() {
  const now = Date.now();
  if (now - tslaCache.ts < 60000 && tslaCache.price) return { price: tslaCache.price, change: tslaCache.change };
  try {
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), 5000);
    const r = await fetch(`https://api.polygon.io/v2/aggs/ticker/TSLA/prev?apikey=${POLYGON_KEY}`, { signal: ctrl.signal });
    if (!r.ok) throw new Error("HTTP " + r.status);
    const d = await r.json();
    const res = d?.results?.[0];
    const price = res?.c ?? 0;
    const prev = res?.o ?? 0;
    const ch = price && prev ? ((price - prev) / prev) * 100 : null;
    tslaCache = { price: price ? `$${price.toFixed(2)}` : null, change: ch !== null ? `${ch >= 0 ? "+" : ""}${ch.toFixed(2)}%` : null, ts: now };
    return { price: tslaCache.price, change: tslaCache.change };
  } catch (e) {
    return { price: tslaCache.price || "—", change: tslaCache.change || "" };
  }
}

/* ─── ENHANCED GOSSIP v2 ─── */
const GOSSIP_CACHE_MS = 120000;
let gossipCache = { headlines: [], scores: { bullish: 0, bearish: 0, neutral: 0, intensity: 0 }, spywords: {}, alerts: [], ts: 0 };

const LEXICON = {
  bullish: ["breakout", "moon", "pump", "accumulate", "whale buying", "institutional", "etf approval", "bullish", "rally", "surge", "rocket", " ATH", "all time high", "parabolic", "explode", "soar", "bounce", "recovery", "uptrend", "green", "buy signal", "rate cut", "easing", "stimulus", "dovish", "soft landing", "beat earnings", "record revenue"],
  bearish: ["dump", "crash", "rug pull", "liquidation", "sec", "ban", "bearish", "collapse", "recession", "death cross", "capitulate", "panic", "bloodbath", "nosedive", "plunge", "selloff", "downtrend", "red", "sell signal", "correction", "bear market", "rate hike", "hawkish", "sticky inflation", "default", "downgrade", "supply shock", "slowdown", "layoffs"],
  neutral: ["upgrade", "partnership", "listing", "merge", "fork", "airdrop", "halving", "announcement", "integration", "adoption", "fed", "powell", "cpi", "ppi", "inflation", "tariff", "trade", "economy", "gdp", "fomc", "oil", "gold", "tesla", "nasdaq", "spx", "dxy"]
};

const RISK_ENTITIES = {
  countries: ["usa", "us", "china", "russia", "ukraine", "iran", "israel", "saudi", "eu", "europe", "japan", "india", "brazil", "venezuela", "north korea", "south korea", "taiwan", "turkey", "syria", "lebanon", "yemen", "gaza", "palestine"],
  commodities: ["oil", "gold", "crude", "brent", "wti", "gas", "natural gas", "silver", "copper", "wheat", "corn", "soy", "lithium", "cobalt", "uranium", "aluminum", "nickel"],
  organizations: ["opec", "federal reserve", "fed", "ecb", "boe", "boj", "imf", "world bank", "wto", "nato", "g7", "g20", "brics", "eu", "european union", "opec+", "iea"],
  people: ["trump", "biden", "putin", "xi", "netanyahu", "macron", "scholz", "sunak", "modi", "erdogan", "milei", "powell"]
};

const GEOPOLITICAL_TAGS = ["war", "invasion", "sanctions", "tariff", "embargo", "assassination", "coup", "election", "strike", "protest", "riot", "terrorism", "cyberattack", "drone", "missile", "bombing", "ceasefire", "peace", "treaty", "alliance"];

function countSpywords(text) {
  const lower = text.toLowerCase();
  const counts = { bullish: 0, bearish: 0, neutral: 0, details: {} };
  for (const [cat, words] of Object.entries(LEXICON)) {
    for (const w of words) {
      const esc = w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const matches = (lower.match(new RegExp(esc, "g")) || []).length;
      if (matches) { counts[cat] += matches; counts.details[w] = (counts.details[w] || 0) + matches; }
    }
  }
  return counts;
}

function extractRiskEntities(text) {
  const lower = text.toLowerCase();
  const found = { countries: [], commodities: [], organizations: [], people: [] };
  for (const [cat, words] of Object.entries(RISK_ENTITIES)) {
    for (const w of words) {
      if (lower.includes(w) && !found[cat].includes(w)) found[cat].push(w);
    }
  }
  return found;
}

function extractGeopoliticalTags(text) {
  const lower = text.toLowerCase();
  return GEOPOLITICAL_TAGS.filter(tag => lower.includes(tag));
}

function scoreGossip(headlines) {
  let bullish = 0, bearish = 0, neutral = 0, totalSpywords = 0;
  const spywordCounts = {};
  const allEntities = { countries: [], commodities: [], organizations: [], people: [] };
  const allGeoTags = [];
  const sourceCounts = {};
  for (const h of headlines) {
    const counts = countSpywords(h.title + " " + (h.text || ""));
    bullish += counts.bullish; bearish += counts.bearish; neutral += counts.neutral;
    totalSpywords += counts.bullish + counts.bearish + counts.neutral;
    for (const [w, c] of Object.entries(counts.details)) spywordCounts[w] = (spywordCounts[w] || 0) + c;
    const entities = extractRiskEntities(h.title);
    for (const [cat, items] of Object.entries(entities)) { for (const item of items) { if (!allEntities[cat].includes(item)) allEntities[cat].push(item); } }
    const geoTags = extractGeopoliticalTags(h.title);
    for (const tag of geoTags) { if (!allGeoTags.includes(tag)) allGeoTags.push(tag); }
    sourceCounts[h.source] = (sourceCounts[h.source] || 0) + 1;
  }
  const total = headlines.length || 1;
  return { bullish: Math.round((bullish / total) * 100), bearish: Math.round((bearish / total) * 100), neutral: Math.round((neutral / total) * 100), intensity: totalSpywords, spywords: spywordCounts, totalHeadlines: headlines.length, sourceBreakdown: sourceCounts, riskEntities: allEntities, geopoliticalTags: allGeoTags };
}

function detectAlerts(current, previous) {
  const alerts = [];
  if (!previous) return alerts;
  for (const [word, count] of Object.entries(current.spywords || {})) {
    const prev = previous.spywords?.[word] || 0;
    if (count > 0 && prev === 0) alerts.push(`'${word}' appeared for first time`);
    else if (count >= 3 && prev < 2) alerts.push(`'${word}' spiked (${count}x)`);
  }
  const bullDelta = current.bullish - previous.bullish;
  const bearDelta = current.bearish - previous.bearish;
  if (bullDelta >= 20) alerts.push(`Bullish sentiment surged +${bullDelta}pp`);
  if (bearDelta >= 20) alerts.push(`Bearish sentiment surged +${bearDelta}pp`);
  return alerts;
}

async function fetchRedditRSS() {
  try {
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), 8000);
    const r = await fetch("https://www.reddit.com/r/worldnews/.rss", { signal: ctrl.signal });
    if (!r.ok) throw new Error("HTTP " + r.status);
    const xml = await r.text();
    const items = [];
    const regex = /<item>[\s\S]*?<title>(.*?)<\/title>[\s\S]*?<link>(.*?)<\/link>[\s\S]*?<\/item>/gi;
    let m;
    while ((m = regex.exec(xml)) !== null && items.length < 20) {
      items.push({ source: "reddit", title: m[1].replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/<[^>]*>/g, ""), url: m[2].replace(/&amp;/g, "&"), ts: new Date().toISOString() });
    }
    return items;
  } catch (e) { console.log("[Reddit]", e.message); return []; }
}

async function fetchGossip() {
  const now = Date.now();
  if (now - gossipCache.ts < GOSSIP_CACHE_MS && gossipCache.headlines.length > 0) return gossipCache;
  const [news, reddit] = await Promise.allSettled([
    fetchNewsWithCache().then(a => a.map(x => ({ source: "newsdata", title: x.title, url: x.url, ts: new Date().toISOString() }))),
    fetchRedditRSS()
  ]);
  const newsItems = news.status === "fulfilled" ? news.value : [];
  const redditItems = reddit.status === "fulfilled" ? reddit.value : [];
  const all = [...newsItems, ...redditItems];
  const previous = gossipCache.scores;

  const scores = scoreGossip(all);
  const alerts = detectAlerts(scores, previous);
  const autoPredict = shouldCreateAiPrediction(scores, previous, alerts) || ((scores?.intensity || 0) >= 1);
  gossipCache = { headlines: all.slice(0, 30), scores: { bullish: scores.bullish, bearish: scores.bearish, neutral: scores.neutral, intensity: scores.intensity }, spywords: scores.spywords, alerts, sourceBreakdown: scores.sourceBreakdown, riskEntities: scores.riskEntities, geopoliticalTags: scores.geopoliticalTags, ts: now };
  logStat("gossip", { headlines: all.length, bullish: scores.bullish, bearish: scores.bearish, intensity: scores.intensity, alerts: alerts.length });

  if (autoPredict && (Date.now() - lastAiPredAt) > AI_PRED_COOLDOWN_MS) {
    const px = await fetchPrices();
    const aiPred = buildAiPrediction({ headlines: all, scores, prices: px || {} });
    if (aiPred) {
      savePrediction(aiPred);
      lastAiPredAt = Date.now();
    }
  }
  return gossipCache;
}

/* ─── GURU AI v2 (HARDENED) ─── */
function rotateHistory() {
  if (!fs.existsSync(GURU_HISTORY)) return;
  try {
    const stat = fs.statSync(GURU_HISTORY);
    const lines = fs.readFileSync(GURU_HISTORY, "utf8").trim().split("\n").filter(Boolean);
    if (lines.length > GURU_HISTORY_MAX || stat.size > GURU_MAX_FILE_MB * 1024 * 1024) {
      const keep = lines.slice(-GURU_HISTORY_MAX);
      fs.writeFileSync(GURU_HISTORY, keep.map(l => l + "\n").join(""));
      console.log("[Guru] History rotated:", lines.length, "->", keep.length);
    }
  } catch (e) { console.log("[Guru rotate error]", e.message); }
}

function buildGuruContext() {
  const now = Date.now();
  const prices = { btc: tslaCache.price ? "loaded" : "unavailable", tsla: tslaCache.price || "—", asOf: tslaCache.ts ? new Date(tslaCache.ts).toISOString() : "never" };
  const pricesStale = !tslaCache.ts || (now - tslaCache.ts) > 300000;
  const gossip = gossipCache.headlines.length > 0 ? { intensity: gossipCache.scores.intensity, bullish: gossipCache.scores.bullish, bearish: gossipCache.scores.bearish, neutral: gossipCache.scores.neutral, topSpywords: Object.entries(gossipCache.spywords || {}).sort((a, b) => b[1] - a[1]).slice(0, 5), riskEntities: gossipCache.riskEntities || {}, geopoliticalTags: gossipCache.geopoliticalTags || [], alerts: gossipCache.alerts || [], asOf: gossipCache.ts ? new Date(gossipCache.ts).toISOString() : "never" } : null;
  const gossipStale = !gossipCache.ts || (now - gossipCache.ts) > 300000;
  const predictions = loadPredictions(10);
  const stats = { total: 0, hit: 0, missed: 0, open: 0 };
  if (fs.existsSync(STATS_FILE)) {
    const lines = fs.readFileSync(STATS_FILE, "utf8").trim().split("\n").filter(Boolean);
    const parsed = lines.map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
    const preds = parsed.filter(s => s.cat === "prediction");
    stats.total = preds.length; stats.hit = preds.filter(p => p.data?.status === "hit").length; stats.missed = preds.filter(p => p.data?.status === "missed").length; stats.open = preds.filter(p => p.data?.status === "open").length;
  }
  return { prices, gossip, predictions, stats, meta: { pricesStale, gossipStale, asOf: new Date().toISOString() } };
}

async function askGuru(question) {
  const ctx = buildGuruContext();
  if (ctx.meta.pricesStale && ctx.meta.gossipStale) {
    return { answer: "Guru cannot answer: both price data and gossip are stale or unavailable. Last prices: " + ctx.prices.asOf + ". Last gossip: " + (ctx.gossip?.asOf || "never") + ".", evidence: { used: [], missing: ["prices", "gossip"], stale: ["prices", "gossip"] }, confidence: 0, freshness: { prices: ctx.prices.asOf, gossip: ctx.gossip?.asOf || "never", predictions: "loaded" }, context: ctx, model: "guru-local-v1" };
  }
  if (ctx.meta.pricesStale) {
    return { answer: "Guru has limited confidence: price data is stale (last: " + ctx.prices.asOf + "). Gossip is current. I'll answer but note uncertainty.", evidence: { used: ["gossip.intensity", "gossip.spywords", "predictions", "stats"], missing: [], stale: ["prices"] }, confidence: 40, freshness: { prices: ctx.prices.asOf, gossip: ctx.gossip?.asOf || "never", predictions: "loaded" }, context: ctx, model: "guru-local-v1" };
  }
  if (ctx.meta.gossipStale) {
    return { answer: "Guru has limited confidence: gossip is stale (last: " + (ctx.gossip?.asOf || "never") + "). Prices are current. I'll answer but note uncertainty.", evidence: { used: ["prices.tsla", "predictions", "stats"], missing: [], stale: ["gossip"] }, confidence: 40, freshness: { prices: ctx.prices.asOf, gossip: ctx.gossip?.asOf || "never", predictions: "loaded" }, context: ctx, model: "guru-local-v1" };
  }
  rotateHistory();
  const g = ctx.gossip || {};
  const topSpywords = Array.isArray(g.topSpywords) ? g.topSpywords : [];
  const geopoliticalTags = Array.isArray(g.geopoliticalTags) ? g.geopoliticalTags : [];
  const alerts = Array.isArray(g.alerts) ? g.alerts : [];
  const systemPrompt = `You are Guru, the Sentotrade market intelligence analyst.
RULES (violate any = invalid answer):
1. ONLY use data from this app. Never use general knowledge.
2. Cite specific fields: "Evidence: gossip.intensity=4, geopoliticalTags=[sanctions], predictions[0].call=Long"
3. If data is insufficient, say: "Insufficient data: missing [X], stale [Y]"
4. No invented numbers. No speculation beyond data interpretation.
5. Format: Conclusion -> Evidence used -> Confidence (0-100) -> Freshness note.

Current app data:
- Prices: TSLA ${ctx.prices.tsla} (asOf: ${ctx.prices.asOf})
- Gossip intensity: ${g.intensity || 0}, bullish: ${g.bullish || 0}%, bearish: ${g.bearish || 0}%
- Top spywords: ${topSpywords.map(([w, c]) => w + "(" + c + ")").join(", ") || "none"}
- Geopolitical: ${geopoliticalTags.join(", ") || "none"}
- Risk entities: ${JSON.stringify(g.riskEntities || {})}
- Alerts: ${alerts.join("; ") || "none"}
- Open predictions: ${ctx.predictions.filter(p => p.status === "open").length}
- Stats: ${ctx.stats.hit} hit, ${ctx.stats.missed} missed, ${ctx.stats.open} open`;
  if (OPENAI_KEY) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), GURU_TIMEOUT_MS);
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${OPENAI_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "system", content: systemPrompt }, { role: "user", content: question }], max_tokens: 150, temperature: 0.5 }),
        signal: ctrl.signal
      });
      clearTimeout(timer);
      if (!res.ok) throw new Error("HTTP " + res.status);
      const d = await res.json();
      const answer = d.choices?.[0]?.message?.content || "Guru received empty response.";
      return { answer, evidence: { used: ["prices", "gossip", "predictions", "stats"], missing: [], stale: [] }, confidence: 85, freshness: { prices: ctx.prices.asOf, gossip: g.asOf || "never", predictions: "loaded" }, context: ctx, model: "gpt-4o-mini" };
    } catch (e) {
      console.log("[Guru OpenAI fallback]", e.message);
    }
  }
  const intensityNote = g.intensity > 5 ? "High gossip activity detected." : g.intensity > 0 ? "Some activity detected." : "No significant gossip.";
  const sentiment = g.bullish > g.bearish ? "Bullish" : g.bearish > g.bullish ? "Bearish" : "Neutral";
  const alertNote = alerts.length ? `Key alert: ${alerts[0]}` : "No major alerts.";
  const geoNote = geopoliticalTags.length ? `Geopolitical factors: ${geopoliticalTags.slice(0, 3).join(", ")}.` : "No geopolitical tags detected.";
  return { answer: `Conclusion: ${sentiment} tone (${g.bullish || 0}%/${g.bearish || 0}%). ${intensityNote} ${alertNote} ${geoNote} ${ctx.predictions.filter(p => p.status === "open").length} predictions open. Evidence used: gossip.intensity, gossip.sentiment, gossip.alerts, gossip.geopoliticalTags, predictions.status, stats.open. Confidence: ${g.intensity > 3 ? 70 : 50}. Freshness: prices ${ctx.prices.asOf}, gossip ${g.asOf || "never"}.`, evidence: { used: ["gossip.intensity", "gossip.sentiment", "gossip.alerts", "gossip.geopoliticalTags", "predictions", "stats"], missing: [], stale: [] }, confidence: g.intensity > 3 ? 70 : 50, freshness: { prices: ctx.prices.asOf, gossip: g.asOf || "never", predictions: "loaded" }, context: ctx, model: "guru-local-v1" };
}

/* ─── auto signal engine ─── */
async function fetchPrices() {
  try {
    const [cg, yf, oilf] = await Promise.allSettled([
      fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,pax-gold&vs_currencies=usd&include_24hr_change=true", { signal: AbortSignal.timeout(5000) }).then(r => r.json()),
      fetch(`https://api.polygon.io/v2/aggs/ticker/TSLA/prev?apikey=${POLYGON_KEY}`, { signal: AbortSignal.timeout(5000) }).then(r => r.json()),
      fetch("https://query1.finance.yahoo.com/v8/finance/chart/CL=F?interval=1d&range=5d", { signal: AbortSignal.timeout(5000) }).then(r => r.json())
    ]);
    const d = cg.status === "fulfilled" ? cg.value : {};
    const yd = yf.status === "fulfilled" ? yf.value : {};
    const od = oilf.status === "fulfilled" ? oilf.value : {};

    const yRes = yd?.results?.[0];
    const yPrice = yRes?.c ?? 0;
    const yPrev = yRes?.o ?? 0;
    const yCh = yPrice && yPrev ? ((yPrice - yPrev) / yPrev) * 100 : null;

    const oRes = od?.chart?.result?.[0];
    const oMeta = oRes?.meta || {};
    const oPrice = Number(oMeta.regularMarketPrice || 0) || null;
    const oPrev = Number(oMeta.chartPreviousClose || 0) || null;
    const oCh = (oPrice && oPrev) ? ((oPrice - oPrev) / oPrev) * 100 : null;

    return {
      btc: d?.bitcoin?.usd ?? null, btcCh: d?.bitcoin?.usd_24h_change ?? null,
      eth: d?.ethereum?.usd ?? null, ethCh: d?.ethereum?.usd_24h_change ?? null,
      gold: d?.["pax-gold"]?.usd ?? null, goldCh: d?.["pax-gold"]?.usd_24h_change ?? null,
      tsla: yPrice || null, tslaCh: yCh,
      oil: oPrice, oilCh: oCh
    };
  } catch { return null; }
}


function validSignalPrice(asset, px) {
  if (!Number.isFinite(px) || px <= 0) return false;
  if (asset === "BTC") return px > 10000;
  if (asset === "ETH") return px > 500 && px < 20000;
  if (asset === "Gold") return px > 1000 && px < 10000;
  if (asset === "TSLA") return px > 20 && px < 5000;
  if (asset === "OIL") return px > 20 && px < 200;
  if (asset === "DOGE") return px > 0.001 && px < 5;
  return true;
}

function generateSignals(prices, gossipCtx = gossipCache) {
  const signals = [];
  if (!prices) return signals;
  const now = new Date().toISOString();
  const inferred = inferSignalAssetFromGossip(gossipCtx, prices);
  if (inferred.px !== null && Number.isFinite(inferred.px) && inferred.ch !== null && Number.isFinite(inferred.ch) && validSignalPrice(inferred.asset, inferred.px)) {
    if (inferred.ch < -1.0) {
      signals.push({
        id: "sig_" + Date.now() + "_" + inferred.asset.toLowerCase() + "_long",
        source: "Bias Signal",
        time: now,
        asset: inferred.asset,
        call: "Long",
        entry: inferred.px,
        target: (inferred.px * inferred.up).toFixed(2),
        targetPct: `+${((inferred.up - 1) * 100).toFixed(1)}%`,
        timeframe: inferred.asset === "Gold" ? "6h" : inferred.asset === "TSLA" ? "24h" : "12h",
        why: `${inferred.asset} oversold (${inferred.ch.toFixed(2)}% 24h). Theme-routed signal.`,
        horizon: inferred.asset === "Gold" ? "6h" : inferred.asset === "TSLA" ? "24h" : "12h",
        status: "open",
        outcome: "—"
      });
    } else if (inferred.ch > 1.0) {
      signals.push({
        id: "sig_" + Date.now() + "_" + inferred.asset.toLowerCase() + "_short",
        source: "Bias Signal",
        time: now,
        asset: inferred.asset,
        call: "Short",
        entry: inferred.px,
        target: (inferred.px * inferred.dn).toFixed(2),
        targetPct: `${((inferred.dn - 1) * 100).toFixed(1)}%`,
        timeframe: inferred.asset === "Gold" ? "6h" : inferred.asset === "TSLA" ? "24h" : "12h",
        why: `${inferred.asset} overbought (+${inferred.ch.toFixed(2)}% 24h). Theme-routed signal.`,
        horizon: inferred.asset === "Gold" ? "6h" : inferred.asset === "TSLA" ? "24h" : "12h",
        status: "open",
        outcome: "—"
      });
    }
  }

  if (signals.length) { for (const s of signals) savePrediction(s); console.log("[Signals] Generated", signals.length, ":", signals.map(s => s.asset + " " + s.call).join(", ")); }
  return signals;
}

/* ─── auto resolve predictions ─── */
async function resolvePredictions() {
  const all = loadPredictions(1000);
  const open = all.filter(p => p.status === "open" || !p.status);
  if (!open.length) return;
  const prices = await fetchPrices();
  if (!prices) return;
  const priceNow = { BTC: prices.btc, ETH: prices.eth, Gold: prices.gold, TSLA: prices.tsla };
  let changed = false;
  for (const p of open) {
    const current = priceNow[p.asset];
    if (!current || !p.target) continue;
    const target = parseFloat(p.target);
    const entry = parseFloat(p.entry) || current;
    const created = new Date(p.time).getTime();
    const timeframeHours = parseFloat(p.timeframe) || 12;
    const expired = (Date.now() - created) > (timeframeHours * 3600 * 1000);
    const halfDistance = Math.abs(target - entry) * 0.5;
    if (p.call === "Long") {
      if (current >= target) { p.status = "hit"; p.outcome = "Target reached"; changed = true; }
      else if (expired) { p.status = "missed"; p.outcome = "Expired below target"; changed = true; }
      else if (current >= entry + halfDistance) { p.status = "partial"; p.outcome = "Halfway to target"; changed = true; }
    } else if (p.call === "Short") {
      if (current <= target) { p.status = "hit"; p.outcome = "Target reached"; changed = true; }
      else if (expired) { p.status = "missed"; p.outcome = "Expired above target"; changed = true; }
      else if (current <= entry - halfDistance) { p.status = "partial"; p.outcome = "Halfway to target"; changed = true; }
    }
  }
  if (changed) {
    fs.writeFileSync(PREDICTIONS_FILE, all.map(p => JSON.stringify(p)).join("\n") + "\n");
    const resolved = all.filter(p => p.status !== "open");
    console.log("[Resolve]", resolved.length, "resolved,", open.length - resolved.length, "still open");
  }
}

/* ─── HTTP HANDLER ─── */
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

  if (url === "/api/health") return res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify({ status: "ok", time: new Date().toISOString(), ssl: hasSSL }));

  if (url === "/api/news") {
    fetchNewsWithCache().then(a => res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify({ articles: a })));
    return;
  }
  if (url === "/api/gossip") {
    fetchGossip().then(g => res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify({ scores: g.scores, spywords: g.spywords, alerts: g.alerts, headlines: g.headlines.slice(0, 10), sourceBreakdown: g.sourceBreakdown, riskEntities: g.riskEntities, geopoliticalTags: g.geopoliticalTags, timestamp: new Date().toISOString() })));
    return;
  }
  if (url === "/api/price/tsla") {
    fetchTesla().then(t => res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify(t)));
    return;
  }
  if (url === "/api/predictions" || url === "/api/signal/recent") return res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify({ items: loadPredictions(50) }));
  if (url === "/api/flow/btc" || url === "/api/flow/eth") {
    (async () => {
      try {
        const isBtc = url === "/api/flow/btc";
        const key = process.env.BITQUERY_API_KEY || process.env.VITE_BITQUERY_TOKEN;
        if (!key) throw new Error("Missing BITQUERY_API_KEY");

        const query = isBtc
          ? `query { bitcoin(network: bitcoin) { transactions(options: {limit: 25, desc: "block.height"}) { amount } } }`
          : `query { ethereum(network: ethereum) { transfers(options: {limit: 25, desc: "block.height"}) { amount } } }`;

        const r = await fetch("https://graphql.bitquery.io", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}` },
          body: JSON.stringify({ query })
        });

        const text = await r.text();
        if (!r.ok) throw new Error(`BitQuery HTTP ${r.status}: ${text}`);

        let json;
        try { json = JSON.parse(text); } catch { throw new Error(`BitQuery non-JSON: ${text}`); }
        if (json.errors) throw new Error(JSON.stringify(json.errors));

        const rows = isBtc ? (json?.data?.bitcoin?.transactions || []) : (json?.data?.ethereum?.transfers || []);
        const amounts = rows.map(x => Number(x?.amount) || 0).filter(n => Number.isFinite(n));
        const total = amounts.reduce((a, b) => a + b, 0);

        return res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify({
          status: "ok",
          source: "bitquery",
          chain: isBtc ? "btc" : "eth",
          sampled: rows.length,
          to_exch: { count: rows.length, usd: total },
          from_exch: { count: 0, usd: 0 }
        }));
      } catch (e) {
        return res.writeHead(500, { "Content-Type": "application/json" }).end(JSON.stringify({
          status: "error",
          source: "bitquery",
          error: String(e?.message || e),
          to_exch: { count: 0, usd: 0 },
          from_exch: { count: 0, usd: 0 }
        }));
      }
    })();
    return;
  }
  if (url === "/api/stable/usdt-eth") return res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify({ status: "connect_etherscan", mints: { count: 0, usd: 0 }, burns: { count: 0, usd: 0 } }));
  if (url === "/api/watchdog/summary") return res.writeHead(200, { "Content-Type": "application/json" }).end("[]");

  if (url === "/api/stats/log" && req.method === "POST") {
    let body = "";
    req.on("data", c => body += c);
    req.on("end", () => {
      try {
        const e = JSON.parse(body);
        if (e.cat && e.data) { logStat(e.cat, e.data); res.writeHead(200).end(JSON.stringify({ ok: true })); }
        else res.writeHead(400, { "Content-Type": "application/json" }).end(JSON.stringify({ error: "Missing cat or data" }));
      } catch { res.writeHead(400, { "Content-Type": "application/json" }).end(JSON.stringify({ error: "Invalid JSON" })); }
    });
    return;
  }
  if (url === "/api/stats" || url.startsWith("/api/stats?")) {
    const q = new URL(url, "http://localhost").searchParams;
    let stats = []; if (fs.existsSync(STATS_FILE)) { const lines = fs.readFileSync(STATS_FILE, "utf8").trim().split("\n").filter(Boolean); stats = lines.map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean); if (q.get("cat")) stats = stats.filter(s => s.cat === q.get("cat")); }
    return res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify({ stats: stats.slice(-parseInt(q.get("limit") || "1000", 10)) }));
  }
  if (url === "/api/stats/summary") {
    let all = [], bias = [], predictions = [], news = [];
    if (fs.existsSync(STATS_FILE)) { const lines = fs.readFileSync(STATS_FILE, "utf8").trim().split("\n").filter(Boolean); const parsed = lines.map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean); all = parsed; bias = parsed.filter(s => s.cat === "bias"); predictions = parsed.filter(s => s.cat === "prediction"); news = parsed.filter(s => s.cat === "news"); }
    return res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify({ total: all.length, categories: { bias: bias.length, prediction: predictions.length, news: news.length }, latestBias: bias[bias.length - 1]?.data || null, predictionRecord: { hit: predictions.filter(p => p.data?.status === "hit").length, missed: predictions.filter(p => p.data?.status === "missed").length, partial: predictions.filter(p => p.data?.status === "partial").length, open: predictions.filter(p => p.data?.status === "open").length }, lastNewsCount: news[news.length - 1]?.data?.count || 0 }));
  }

  /* ─── GURU ENDPOINTS ─── */
  if (url === "/api/guru/ask" && req.method === "POST") {
    let body = "";
    let aborted = false;
    req.on("data", c => {
      body += c;
      if (!aborted && body.length > 16384) {
        aborted = true;
        res.writeHead(413, { "Content-Type": "application/json" }).end(JSON.stringify({ error: "Payload too large" }));
        req.destroy();
      }
    });
    req.on("end", async () => {
      if (aborted) return;
      try {
        const parsed = JSON.parse(body);
        const question = parsed.question;
        if (typeof question !== "string") { res.writeHead(400, { "Content-Type": "application/json" }).end(JSON.stringify({ error: "question must be a string" })); return; }
        const q = question.trim();
        if (!q) { res.writeHead(400, { "Content-Type": "application/json" }).end(JSON.stringify({ error: "question is empty" })); return; }
        if (q.length > 500) { res.writeHead(400, { "Content-Type": "application/json" }).end(JSON.stringify({ error: "question too long (max 500)" })); return; }
        const result = await askGuru(q);
        const entry = { t: new Date().toISOString(), q, a: result.answer, model: result.model, confidence: result.confidence };
        fs.appendFile(GURU_HISTORY, JSON.stringify(entry) + "\n", () => {});
        rotateHistory();
        res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify(result));
      } catch { res.writeHead(400, { "Content-Type": "application/json" }).end(JSON.stringify({ error: "Invalid JSON" })); }
    });
    return;
  }
  if (url === "/api/guru/history") {
    rotateHistory();
    let hist = [];
    if (fs.existsSync(GURU_HISTORY)) { const lines = fs.readFileSync(GURU_HISTORY, "utf8").trim().split("\n").filter(Boolean); hist = lines.map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean).slice(-20); }
    return res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify({ history: hist }));
  }

  /* ─── STATIC FILES ─── */
  const staticDir = path.join(__dirname, "public");
  let filePath = path.join(staticDir, url === "/" ? "index.html" : url);
  if (!fs.existsSync(filePath) && !path.extname(filePath)) { const h = filePath + ".html"; if (fs.existsSync(h)) filePath = h; }
  if (!fs.existsSync(filePath)) filePath = path.join(staticDir, "index.html");
  const ext = path.extname(filePath).toLowerCase();
  fs.readFile(filePath, (err, c) => { if (err) { res.writeHead(404, { "Content-Type": "text/plain" }); return res.end("Not found"); } res.writeHead(200, { "Content-Type": mime[ext] || "application/octet-stream" }); res.end(c); });
}

/* ─── START SERVER ─── */
if (hasSSL) {
  https.createServer({ key: fs.readFileSync(SSL_KEY), cert: fs.readFileSync(SSL_CERT) }, handleRequest).listen(PORT, () => console.log("HTTPS sentotrade.io:" + PORT));
} else {
  http.createServer(handleRequest).listen(PORT, () => console.log("HTTP port " + PORT));
}


function runSignalEngine() {
  const tick = async () => {
    try {
      const prices = await fetchPrices();
      const signals = generateSignals(prices, gossipCache);
      if (signals.length) {
        for (const sig of signals) savePrediction(sig);
        console.log("[Signals] Generated", signals.length, ":", signals.map(s => s.asset + " " + s.call).join(", "));
      }
      await resolvePredictions();
    } catch (e) {
      console.log("[Signals] error:", e && e.message ? e.message : e);
    }
  };
  tick();
  setInterval(tick, 2 * 60 * 1000);
}

runSignalEngine();
setInterval(runSignalEngine, 300000);
resolvePredictions();
setInterval(resolvePredictions, 120000);
