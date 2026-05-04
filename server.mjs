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

function dedupeArticlesByTitle(rows) {
  const seen = new Set();
  const out = [];
  for (const a of rows) {
    const t = String(a?.title || "").trim().toLowerCase().replace(/\s+/g, " ");
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(a);
  }
  return out.slice(0, 24);
}

async function fetchNewsWithCache() {
  const now = Date.now();
  if (now - newsCache.ts < NEWS_CACHE_MS) {
    console.log("[News] Serving cache, age:", Math.round((now - newsCache.ts) / 1000), "s");
    return newsCache.articles;
  }
  let articles = [];
  try {
    const q1 = `https://newsdata.io/api/1/news?apikey=${NEWSDATA_KEY}&q=war%20OR%20ceasefire%20OR%20sanctions%20OR%20conflict%20OR%20peace%20OR%20geopolitical&language=en&size=10`;
    const q2 = `https://newsdata.io/api/1/news?apikey=${NEWSDATA_KEY}&q=oil%20OR%20fed%20OR%20inflation%20OR%20rates%20OR%20tariff%20OR%20macro&language=en&size=10`;
    const [r1, r2] = await Promise.all([
      fetch(q1, { signal: AbortSignal.timeout(5000) }),
      fetch(q2, { signal: AbortSignal.timeout(5000) }),
    ]);
    const rows = [];
    for (const r of [r1, r2]) {
      if (!r.ok) continue;
      const d = await r.json();
      if (d?.results?.length) rows.push(...d.results.map(a => ({ title: a.title, url: a.link })));
    }
    articles = dedupeArticlesByTitle(rows).slice(0, 20);
    console.log("[News] Fresh fetch:", articles.length, "articles (merged)");
  } catch (e) {
    console.log("[News] Fetch error:", e.message);
  }
  if (!articles.length) articles = [{ title: "News temporarily unavailable", url: "#" }];
  newsCache = { articles, ts: now };
  logStat("news", { count: articles.length, cached: false });
  return articles;
}

const GOSSIP_KEYWORDS = ["gold", "oil", "btc", "bitcoin", "tesla", "fed", "tariff", "inflation", "rate", "spy"];

function gossipIsPlaceholderArticle(a) {
  const t = String(a?.title || "").toLowerCase();
  return !t || t === "loading..." || t.includes("news temporarily unavailable");
}

function gossipTitleMatchesKeyword(title) {
  const lower = String(title || "").toLowerCase();
  return GOSSIP_KEYWORDS.some((kw) => lower.includes(kw));
}

function gossipPayloadFromArticles(articles) {
  const valid = (articles || []).filter((a) => !gossipIsPlaceholderArticle(a));
  const matchingCount = valid.filter((a) => gossipTitleMatchesKeyword(a.title)).length;
  const intensity = Math.min(10, matchingCount);

  const keywordCounts = Object.create(null);
  for (const kw of GOSSIP_KEYWORDS) keywordCounts[kw] = 0;
  for (const a of valid) {
    const lower = String(a.title || "").toLowerCase();
    for (const kw of GOSSIP_KEYWORDS) {
      if (lower.includes(kw)) keywordCounts[kw]++;
    }
  }
  const spywords = Object.entries(keywordCounts)
    .filter(([, c]) => c > 0)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 5)
    .map(([kw]) => kw);

  const alerts = [];
  for (const a of valid) {
    if (alerts.length >= 3) break;
    if (gossipTitleMatchesKeyword(a.title)) alerts.push(String(a.title || ""));
  }

  const headlines = valid.slice(0, 5).map((a) => ({
    title: String(a.title || ""),
    url: String(a.url || "#"),
  }));

  return { intensity, spywords, alerts, headlines };
}

/** Same-origin indices feed for SPA (avoids browser CORS on Yahoo).
 *  Yahoo returns 404 for comma-separated multi-symbol chart URLs — fetch each ticker. */
async function fetchIndicesFromYahoo() {
  const tickers = ["%5EGSPC", "%5EIXIC", "%5EDJI", "%5ERUT", "%5EVIX"];
  const settled = await Promise.allSettled(
    tickers.map((enc) =>
      fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${enc}?interval=1d&range=1d`, {
        signal: AbortSignal.timeout(8000),
        headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
      }).then((r) => {
        if (!r.ok) throw new Error("yahoo " + r.status);
        return r.json();
      })
    )
  );
  const out = [];
  for (const s of settled) {
    if (s.status !== "fulfilled") continue;
    const c = s.value?.chart?.result?.[0];
    const meta = c?.meta;
    if (!meta) continue;
    const price = meta.regularMarketPrice ?? meta.previousClose ?? null;
    const prev = meta.chartPreviousClose ?? meta.previousClose ?? price;
    const ch = price != null && prev != null ? price - prev : 0;
    const chPct = prev ? (ch / prev) * 100 : 0;
    const status = chPct > 0.1 ? "bullish" : chPct < -0.1 ? "bearish" : "neutral";
    const sym = String(meta.symbol || "");
    out.push({
      name: meta.shortName || sym.replace("^", "") || "Index",
      ticker: sym.replace("^", ""),
      price:
        price != null && Number.isFinite(price)
          ? price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
          : "—",
      change: `${ch >= 0 ? "+" : ""}${Number.isFinite(ch) ? ch.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—"}`,
      changePct: `${chPct >= 0 ? "+" : ""}${Number.isFinite(chPct) ? chPct.toFixed(2) : "0.00"}%`,
      status,
    });
  }
  return out;
}

/** Stooq lightweight quote (often works when Yahoo blocks datacenter IPs). Line: sym,date,time,open,high,low,close,vol */
function rowFromStooqLine(line, displayName, ticker) {
  const parts = String(line).trim().split(",");
  if (parts.length < 7 || parts[1] === "N/D") return null;
  const open = parseFloat(parts[3]);
  const close = parseFloat(parts[6]);
  if (!Number.isFinite(close)) return null;
  const ch = Number.isFinite(open) ? close - open : 0;
  const chPct = Number.isFinite(open) && open !== 0 ? (ch / open) * 100 : 0;
  const status = chPct > 0.1 ? "bullish" : chPct < -0.1 ? "bearish" : "neutral";
  return {
    name: displayName,
    ticker,
    price: close.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    change: `${ch >= 0 ? "+" : ""}${ch.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    changePct: `${chPct >= 0 ? "+" : ""}${chPct.toFixed(2)}%`,
    status,
  };
}

async function fetchIndicesFromStooq() {
  const specs = [
    { q: "^spx", name: "S&P 500", ticker: "GSPC" },
    { q: "^ndx", name: "Nasdaq 100", ticker: "NDX" },
    { q: "^dji", name: "Dow Jones", ticker: "DJI" },
    { q: "^rut", name: "Russell 2000", ticker: "RUT" },
    { q: "^vix", name: "VIX", ticker: "VIX" },
  ];
  const out = [];
  for (const spec of specs) {
    try {
      const r = await fetch(`https://stooq.com/q/l/?s=${encodeURIComponent(spec.q)}`, {
        signal: AbortSignal.timeout(8000),
        headers: { Accept: "text/plain", "User-Agent": "Mozilla/5.0" },
      });
      if (!r.ok) continue;
      const line = (await r.text()).split("\n").find((l) => l.trim());
      if (!line) continue;
      const row = rowFromStooqLine(line, spec.name, spec.ticker);
      if (row) out.push(row);
    } catch { /* next */ }
  }
  return out;
}

/** Prefer Yahoo; if too few rows (blocked / flaky), fill from Stooq. */
async function fetchIndicesCombined() {
  const y = await fetchIndicesFromYahoo();
  if (y.length >= 4) {
    console.log("[Indices] Yahoo:", y.length, "rows");
    return y;
  }
  console.log("[Indices] Yahoo weak (" + y.length + " rows) — Stooq fallback");
  const s = await fetchIndicesFromStooq();
  if (s.length >= 2) return s;
  console.log("[Indices] Stooq:", s.length, "rows — returning best available");
  return s.length ? s : y;
}

/* ─── auto-prediction engine ─── */
const PREDICTIONS_FILE = path.join(__dirname, "predictions.jsonl");

async function fetchPrices() {
  try {
    const yahooMap = [
      { key: "tsla", ticker: "TSLA" }, { key: "intc", ticker: "INTC" },
      { key: "aapl", ticker: "AAPL" }, { key: "nvda", ticker: "NVDA" },
      { key: "spx", ticker: "^GSPC" }, { key: "oil", ticker: "CL=F" },
      { key: "gold", ticker: "GC=F" }, { key: "silver", ticker: "SI=F" }
    ];
    const cg = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true", { signal: AbortSignal.timeout(5000) }).then(r => r.json()).catch(() => ({}));
    const yahoo = await Promise.allSettled(yahooMap.map(t => fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${t.ticker}?interval=1d&range=5d`, { signal: AbortSignal.timeout(5000) }).then(r => r.json()).then(j => ({ key: t.key, meta: j?.chart?.result?.[0]?.meta || {} }))));
    const prices = {
      btc: cg?.bitcoin?.usd ?? null, btcCh: cg?.bitcoin?.usd_24h_change ?? null,
      eth: cg?.ethereum?.usd ?? null, ethCh: cg?.ethereum?.usd_24h_change ?? null
    };
    for (const r of yahoo) {
      if (r.status === "fulfilled") {
        const m = r.value.meta;
        prices[r.value.key] = Number(m.regularMarketPrice) || null;
        const ch = m.regularMarketPrice && m.chartPreviousClose ? ((m.regularMarketPrice - m.chartPreviousClose) / m.chartPreviousClose) * 100 : null;
        prices[r.value.key + "Ch"] = Number.isFinite(ch) ? ch : null;
      }
    }
    return prices;
  } catch { return null; }
}

/** Guru bias signals: symmetric target from entry; resolver uses PRED_STOP_LOSS_FRAC (keep RR sane). */
const PRED_TARGET_FRAC = 0.008;
const PRED_TARGET_PCT_LABEL = `${(PRED_TARGET_FRAC * 100).toFixed(1)}%`;
const PRED_STOP_LOSS_FRAC = 0.006;

function generateSignals(prices) {
  const signals = [];
  if (!prices) return signals;
  const now = new Date().toISOString();
  const ts = Date.now();
  const up = 1 + PRED_TARGET_FRAC;
  const down = 1 - PRED_TARGET_FRAC;
  const pctLong = "+" + PRED_TARGET_PCT_LABEL;
  const pctShort = "-" + PRED_TARGET_PCT_LABEL;
  if (prices.btcCh !== null && prices.btcCh < -1.5) signals.push({ id: "sig_" + ts + "_btc_long", time: now, asset: "BTC", call: "Long", entry: prices.btc, target: (prices.btc * up).toFixed(2), targetPct: pctLong, timeframe: "12h", why: `BTC oversold (${prices.btcCh.toFixed(2)}% 24h). Expect bounce.`, horizon: "12h", status: "open", outcome: "—" });
  if (prices.btcCh !== null && prices.btcCh > 1.5) signals.push({ id: "sig_" + ts + "_btc_short", time: now, asset: "BTC", call: "Short", entry: prices.btc, target: (prices.btc * down).toFixed(2), targetPct: pctShort, timeframe: "12h", why: `BTC overbought (+${prices.btcCh.toFixed(2)}% 24h). Expect pullback.`, horizon: "12h", status: "open", outcome: "—" });
  if (prices.eth != null && prices.ethCh !== null && prices.ethCh < -1.5) signals.push({ id: "sig_" + ts + "_eth_long", time: now, asset: "ETH", call: "Long", entry: prices.eth, target: (prices.eth * up).toFixed(2), targetPct: pctLong, timeframe: "12h", why: `ETH oversold (${prices.ethCh.toFixed(2)}% 24h). Expect bounce.`, horizon: "12h", status: "open", outcome: "—" });
  if (prices.eth != null && prices.ethCh !== null && prices.ethCh > 1.5) signals.push({ id: "sig_" + ts + "_eth_short", time: now, asset: "ETH", call: "Short", entry: prices.eth, target: (prices.eth * down).toFixed(2), targetPct: pctShort, timeframe: "12h", why: `ETH overbought (+${prices.ethCh.toFixed(2)}% 24h). Expect pullback.`, horizon: "12h", status: "open", outcome: "—" });
  if (prices.goldCh !== null && prices.goldCh > 0.5) signals.push({ id: "sig_" + ts + "_gold_long", time: now, asset: "Gold", call: "Long", entry: prices.gold, target: (prices.gold * up).toFixed(2), targetPct: pctLong, timeframe: "6h", why: `Gold breaking (+${prices.goldCh.toFixed(2)}% 24h). Safe-haven flow.`, horizon: "6h", status: "open", outcome: "—" });
  if (prices.goldCh !== null && prices.goldCh < -0.5) signals.push({ id: "sig_" + ts + "_gold_short", time: now, asset: "Gold", call: "Short", entry: prices.gold, target: (prices.gold * down).toFixed(2), targetPct: pctShort, timeframe: "6h", why: `Gold selling off (${prices.goldCh.toFixed(2)}% 24h). Risk-on tone.`, horizon: "6h", status: "open", outcome: "—" });
  /* Oil / TSLA: session vs prior close from Yahoo (not CoinGecko 24h). Same target band as other guru signals. */
  if (prices.oil != null && prices.oilCh != null && prices.oilCh < -2) signals.push({ id: "sig_" + ts + "_oil_long", time: now, asset: "Oil", call: "Long", entry: prices.oil, target: (prices.oil * up).toFixed(2), targetPct: pctLong, timeframe: "6h", why: `WTI weak (${prices.oilCh.toFixed(2)}% vs prior). Mean reversion watch.`, horizon: "6h", status: "open", outcome: "—" });
  if (prices.oil != null && prices.oilCh != null && prices.oilCh > 2) signals.push({ id: "sig_" + ts + "_oil_short", time: now, asset: "Oil", call: "Short", entry: prices.oil, target: (prices.oil * down).toFixed(2), targetPct: pctShort, timeframe: "6h", why: `WTI strong (+${prices.oilCh.toFixed(2)}% vs prior). Pullback watch.`, horizon: "6h", status: "open", outcome: "—" });
  if (prices.tsla != null && prices.tslaCh != null && prices.tslaCh < -2.5) signals.push({ id: "sig_" + ts + "_tsla_long", time: now, asset: "TSLA", call: "Long", entry: prices.tsla, target: (prices.tsla * up).toFixed(2), targetPct: pctLong, timeframe: "12h", why: `TSLA soft (${prices.tslaCh.toFixed(2)}% vs prior). Bounce watch.`, horizon: "12h", status: "open", outcome: "—" });
  if (prices.tsla != null && prices.tslaCh != null && prices.tslaCh > 2.5) signals.push({ id: "sig_" + ts + "_tsla_short", time: now, asset: "TSLA", call: "Short", entry: prices.tsla, target: (prices.tsla * down).toFixed(2), targetPct: pctShort, timeframe: "12h", why: `TSLA hot (+${prices.tslaCh.toFixed(2)}% vs prior). Fade watch.`, horizon: "12h", status: "open", outcome: "—" });
  return signals;
}

/** Canonical asset bucket for cooldown (matches resolver / priceNow families). */
function assetCooldownKey(asset) {
  if (asset == null) return "";
  const a = String(asset).toUpperCase().trim();
  if (a.includes("BTC")) return "BTC";
  if (a.includes("ETH")) return "ETH";
  if (a.includes("GOLD") || a.includes("XAU") || a.includes("PAX")) return "GOLD";
  if (a.includes("OIL") || a.includes("WTI") || a.includes("BRENT") || a.includes("CRUDE") || a.includes("USOIL")) return "OIL";
  if (a.includes("TSLA")) return "TSLA";
  return a.replace(/\s+/g, " ").slice(0, 48);
}

/** At most one new prediction per asset per cooldown window (default 1h). Uses on-disk history. */
function throttleSignalsByAsset(signals, cooldownMs) {
  if (!signals.length) return signals;
  const merged = readAllPredictionsMerged();
  const cutoff = Date.now() - cooldownMs;
  const recent = new Set();
  for (const r of merged) {
    const t = Date.parse(r.time || r.ts || "") || 0;
    if (t >= cutoff) recent.add(assetCooldownKey(r.asset));
  }
  return signals.filter((s) => !recent.has(assetCooldownKey(s.asset)));
}

function savePredictions(preds) {
  for (const p of preds) {
    fs.appendFileSync(PREDICTIONS_FILE, JSON.stringify(p) + "\n");
    logStat("prediction", { id: p.id, asset: p.asset, call: p.call, status: p.status });
  }
}

/** Merge jsonl lines by `id` (last line wins). Drops invalid lines. */
function clean(recordsFromLines) {
  const byId = new Map();
  for (const p of recordsFromLines) {
    if (p && typeof p.id === "string") byId.set(p.id, p);
  }
  return [...byId.values()].sort((a, b) => String(a.time || "").localeCompare(String(b.time || "")));
}

function readAllPredictionsMerged() {
  if (!fs.existsSync(PREDICTIONS_FILE)) return [];
  const lines = fs.readFileSync(PREDICTIONS_FILE, "utf8").trim().split("\n").filter(Boolean);
  const parsed = lines.map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  return clean(parsed);
}

/** Hit/miss/partial/open from merged predictions file — same source of truth as GET /api/predictions. */
function predictionRecordFromMerged() {
  const merged = readAllPredictionsMerged();
  let hit = 0, missed = 0, partial = 0, open = 0;
  for (const p of merged) {
    const st = String(p.status ?? "open").toLowerCase();
    if (st === "hit") hit++;
    else if (st === "missed") missed++;
    else if (st === "partial") partial++;
    else open++;
  }
  return { hit, missed, partial, open };
}

/** Atomic replace: only touches PREDICTIONS_FILE in this app directory (safe alongside other apps). */
function writePredictionsAtomic(records) {
  const tmp = PREDICTIONS_FILE + ".tmp." + process.pid;
  const body = records.length ? records.map(p => JSON.stringify(p)).join("\n") + "\n" : "";
  fs.writeFileSync(tmp, body, "utf8");
  fs.renameSync(tmp, PREDICTIONS_FILE);
}

/** Newest-first feed for API/UI. Only one OPEN row per asset (stops spam from unique ids before cooldown). */
function loadPredictions(limit = 50) {
  const merged = readAllPredictionsMerged();
  merged.sort((a, b) => String(b.time || "").localeCompare(String(a.time || "")));
  const openSeen = new Set();
  const out = [];
  for (const p of merged) {
    const st = String(p.status || "open").toLowerCase();
    if (st === "open") {
      const k = assetCooldownKey(p.asset);
      if (openSeen.has(k)) continue;
      openSeen.add(k);
    }
    out.push(p);
    if (out.length >= limit) break;
  }
  return out;
}

function horizonToMs(h) {
  if (h == null || h === "") return 12 * 3600000;
  const s = String(h).trim();
  let m = s.match(/^(\d+(?:\.\d+)?)\s*h\b/i);
  if (m) return parseFloat(m[1]) * 3600000;
  m = s.match(/^(\d+(?:\.\d+)?)\s*d\b/i);
  if (m) return parseFloat(m[1]) * 86400000;
  m = s.match(/^(\d+(?:\.\d+)?)\s*m\b/i);
  if (m) return parseFloat(m[1]) * 60000;
  return 12 * 3600000;
}

/** Strip $, commas, spaces; safe for numeric fields (avoids NaN from "$2,380"). */
function parseMoney(x) {
  if (x == null) return NaN;
  if (typeof x === "number") return Number.isFinite(x) ? x : NaN;
  const s = String(x).replace(/[$,\s]/g, "").replace(/[^0-9.-]/g, "");
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : NaN;
}

function priceNow(prices, asset) {
  if (!prices || asset == null) return null;
  const a = String(asset).toUpperCase();
  if (a.includes("BTC")) return prices.btc;
  if (a.includes("ETH")) return prices.eth;
  if (a.includes("GOLD") || a.includes("XAU") || a.includes("PAX") || a.includes("GC")) return prices.gold;
  if (a.includes("OIL") || a.includes("WTI") || a.includes("BRENT") || a.includes("CRUDE") || a.includes("USOIL") || a.includes("CL")) return prices.oil;
  if (a.includes("TSLA")) return prices.tsla;
  if (a.includes("INTC") || a.includes("INTEL")) return prices.intc;
  if (a.includes("AAPL") || a.includes("APPLE")) return prices.aapl;
  if (a.includes("NVDA") || a.includes("NVIDIA")) return prices.nvda;
  if (a.includes("SILVER") || a.includes("SI=F") || a.includes("XAG")) return prices.silver;
  if (a.includes("SPX") || a.includes("S&P") || a.includes("GSPC")) return prices.spx;
  return null;
}

/** Fast sentiment lane (AI-Gossip Spike): scalp when gossip intensity is high and headlines name an asset. */
const FAST_GOSSIP_INT_MIN = 5;
const FAST_GOSSIP_TARGET_FRAC = 0.004;
const FAST_GOSSIP_STOP_FRAC = 0.003;
const FAST_GOSSIP_COOLDOWN_MS = 20 * 60 * 1000;

function detectFastGossipAsset(title) {
  const t = String(title || "");
  if (/\b(tsla|tesla)\b/i.test(t)) return "TSLA";
  if (/\b(eth|ethereum)\b/i.test(t)) return "ETH";
  if (/\b(btc|bitcoin)\b/i.test(t)) return "BTC";
  if (/\b(xau|gold)\b/i.test(t) || /\bgold\b/i.test(t.toLowerCase())) return "Gold";
  if (/\b(wti|brent|crude)\b/i.test(t) || /\boil\b/i.test(t.toLowerCase())) return "Oil";
  return null;
}

function canAppendFastGossipForAsset(asset, merged, nowMs) {
  const k = assetCooldownKey(asset);
  for (const p of merged) {
    const st = String(p.status || "open").toLowerCase();
    if (st === "open" && assetCooldownKey(p.asset) === k) return false;
  }
  const cutoff = nowMs - FAST_GOSSIP_COOLDOWN_MS;
  for (const p of merged) {
    if (String(p.source || "").toLowerCase() !== "ai-gossip-fast") continue;
    if (assetCooldownKey(p.asset) !== k) continue;
    const t = Date.parse(p.time || p.ts || "") || 0;
    if (t >= cutoff) return false;
  }
  return true;
}

function buildFastGossipRow(asset, headline, intensity, prices) {
  const px = priceNow(prices, asset);
  if (px == null || !Number.isFinite(px)) return null;
  const entry = px;
  const target = entry * (1 + FAST_GOSSIP_TARGET_FRAC);
  const now = new Date().toISOString();
  const id = "aigf_" + Date.now() + "_" + assetCooldownKey(asset).toLowerCase() + "_" + Math.random().toString(36).slice(2, 7);
  return {
    id,
    time: now,
    source: "ai-gossip-fast",
    asset,
    call: "Long",
    entry,
    target: target.toFixed(2),
    targetPct: "+0.4%",
    timeframe: "20m",
    horizon: "20m",
    stopLossFrac: FAST_GOSSIP_STOP_FRAC,
    why: `Fast gossip (intensity ${intensity}): ${String(headline).slice(0, 140)}`,
    status: "open",
    outcome: "—",
  };
}

/** Called from GET /api/gossip after payload is built — throttled, reuses savePredictions + resolver. */
function maybeFireFastGossipPredictions(articles, intensity, prices) {
  if (intensity < FAST_GOSSIP_INT_MIN || !prices) return;
  const valid = (articles || []).filter((a) => !gossipIsPlaceholderArticle(a));
  if (!valid.length) return;
  const merged = readAllPredictionsMerged();
  const nowMs = Date.now();
  const seen = new Set();
  const batch = [];
  for (const a of valid) {
    const title = String(a.title || "");
    const asset = detectFastGossipAsset(title);
    if (!asset) continue;
    const k = assetCooldownKey(asset);
    if (seen.has(k)) continue;
    if (!canAppendFastGossipForAsset(asset, merged, nowMs)) continue;
    const row = buildFastGossipRow(asset, title, intensity, prices);
    if (!row) continue;
    seen.add(k);
    batch.push(row);
    merged.push(row);
    if (batch.length >= 3) break;
  }
  if (batch.length) {
    savePredictions(batch);
    console.log("[FastGossip] Appended", batch.length, batch.map((r) => r.asset).join(", "));
  }
}

let resolveRunning = false;
async function resolvePredictions() {
  if (resolveRunning) return;
  resolveRunning = true;
  try {
    let records = readAllPredictionsMerged();
    if (!records.length) return;

    const prices = await fetchPrices();

    const now = Date.now();
    let changed = false;

    for (const p of records) {
      const st = String(p.status || "open").toLowerCase();
      if (st !== "open") continue;

      const entry = parseMoney(p.entry);
      const target = parseMoney(p.target);
      const call = String(p.call || "").toLowerCase() === "short" ? "short" : "long";
      const t0 = Date.parse(p.time || p.ts || "") || 0;
      if (!t0 || !Number.isFinite(entry) || !Number.isFinite(target)) continue;

      const px = priceNow(prices, p.asset);
      const havePx = px != null && Number.isFinite(px);

      const deadline = t0 + horizonToMs(p.horizon || p.timeframe);
      const expired = now >= deadline;

      if (!expired && !havePx) continue;

      if (expired && !havePx) {
        p.status = "missed";
        p.outcome = "Expired — no price data";
        logStat("prediction", { id: p.id, asset: p.asset, call: p.call, status: "missed" });
        changed = true;
        continue;
      }

      // Stop-loss: optional per-row fraction (fast gossip lane); else global default.
      const stopLossPct =
        typeof p.stopLossFrac === "number" && Number.isFinite(p.stopLossFrac) && p.stopLossFrac > 0 && p.stopLossFrac < 0.5
          ? p.stopLossFrac
          : PRED_STOP_LOSS_FRAC;
      if (call === "long" && px <= entry * (1 - stopLossPct)) {
        p.status = "missed";
        p.outcome = `Stop-loss (${(stopLossPct * 100).toFixed(1)}% vs entry) @ ${px}`;
        logStat("prediction", { id: p.id, asset: p.asset, call: p.call, status: "missed" });
        changed = true;
        continue;
      }
      if (call === "short" && px >= entry * (1 + stopLossPct)) {
        p.status = "missed";
        p.outcome = `Stop-loss (${(stopLossPct * 100).toFixed(1)}% vs entry) @ ${px}`;
        logStat("prediction", { id: p.id, asset: p.asset, call: p.call, status: "missed" });
        changed = true;
        continue;
      }

      let hit = false;
      if (call === "long") hit = px >= target;
      else hit = px <= target;

      if (!expired) {
        if (hit) {
          p.status = "hit";
          p.outcome = `Target reached @ ${px}`;
          logStat("prediction", { id: p.id, asset: p.asset, call: p.call, status: "hit" });
          changed = true;
        }
        continue;
      }

      if (hit) {
        p.status = "hit";
        p.outcome = `Target reached (window end) @ ${px}`;
        logStat("prediction", { id: p.id, asset: p.asset, call: p.call, status: "hit" });
        changed = true;
        continue;
      }

      let partial = false;
      if (call === "long" && target > entry) partial = px > entry && px < target && px >= entry + 0.5 * (target - entry);
      else if (call === "short" && target < entry) partial = px < entry && px > target && px <= entry - 0.5 * (entry - target);

      if (partial) {
        p.status = "partial";
        p.outcome = `Expired — partial move @ ${px}`;
        logStat("prediction", { id: p.id, asset: p.asset, call: p.call, status: "partial" });
      } else {
        p.status = "missed";
        p.outcome = `Expired — target not met @ ${px}`;
        logStat("prediction", { id: p.id, asset: p.asset, call: p.call, status: "missed" });
      }
      changed = true;
    }

    if (changed) {
      writePredictionsAtomic(records);
      console.log("[Resolve] Updated predictions file (hit/missed/partial)");
    }
  } catch (e) {
    console.log("[Resolve] Error:", e.message);
  } finally {
    resolveRunning = false;
  }
}

let lastSignalRun = 0;
const SIGNAL_ASSET_COOLDOWN_MS = Number(process.env.SIGNAL_ASSET_COOLDOWN_MS) || 3600000;

async function runSignalEngine() {
  const now = Date.now();
  if (now - lastSignalRun < 300000) return;
  lastSignalRun = now;
  const prices = await fetchPrices();
  const raw = generateSignals(prices);
  const signals = throttleSignalsByAsset(raw, SIGNAL_ASSET_COOLDOWN_MS);
  if (raw.length && !signals.length) {
    console.log("[Signals] Throttled — each asset already has a prediction within", Math.round(SIGNAL_ASSET_COOLDOWN_MS / 60000), "min");
  }
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
  const raw = req.url || "/";
  /* Path only — strip query/hash; collapse // so /api routes always match. */
  let pathOnly = String(raw).split("?")[0].split("#")[0].trim() || "/";
  pathOnly = pathOnly.replace(/\/{2,}/g, "/").replace(/\/+$/, "") || "/";
  if (!pathOnly.startsWith("/")) pathOnly = "/" + pathOnly;
  try {
    pathOnly = decodeURIComponent(pathOnly);
  } catch { /* keep pathOnly */ }
  pathOnly = pathOnly.replace(/\/{2,}/g, "/").replace(/\/+$/, "") || "/";

  if (pathOnly === "/api/health") return res.writeHead(200, {"Content-Type": "application/json"}).end(JSON.stringify({ status: "ok", api: 2, time: new Date().toISOString(), ssl: hasSSL, keys: { polygon: !!POLYGON_KEY, bitquery: !!BITQUERY_TOKEN, newsdata: !!NEWSDATA_KEY } }));

  /* Indices early — must run before static; match flexibly so /api/indices never falls through to index.html */
  if (pathOnly === "/api/indices" || /^\/api\/indices$/i.test(pathOnly)) {
    fetchIndicesCombined()
      .then((indices) => res.writeHead(200, {"Content-Type": "application/json"}).end(JSON.stringify({ indices })))
      .catch(() => res.writeHead(200, {"Content-Type": "application/json"}).end(JSON.stringify({ indices: [] })));
    return;
  }

  if (pathOnly === "/api/prices") {
    fetchPrices()
      .then((prices) => res.writeHead(200, {"Content-Type": "application/json"}).end(JSON.stringify({ prices: prices || {} })))
      .catch(() => res.writeHead(200, {"Content-Type": "application/json"}).end(JSON.stringify({ prices: {} })));
    return;
  }

  /* First-class API: must run before static (some proxies send odd req.url). */
  if (pathOnly === "/api/predictions" || pathOnly.startsWith("/api/signal/recent")) {
    const q = new URL(raw, "http://127.0.0.1").searchParams;
    const lim = Math.min(200, Math.max(1, parseInt(q.get("limit") || "50", 10)));
    return res.writeHead(200, {"Content-Type": "application/json"}).end(JSON.stringify({ items: loadPredictions(lim), record: predictionRecordFromMerged() }));
  }

  if (pathOnly === "/api/news") {
    fetchNewsWithCache().then(articles => res.writeHead(200, {"Content-Type": "application/json"}).end(JSON.stringify({ articles })));
    return;
  }

  if (pathOnly === "/api/gossip") {
    fetchNewsWithCache()
      .then(async (articles) => {
        const body = gossipPayloadFromArticles(articles);
        try {
          const prices = await fetchPrices();
          maybeFireFastGossipPredictions(articles, body.intensity, prices);
        } catch (e) {
          console.log("[FastGossip]", e && e.message);
        }
        res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify(body));
      })
      .catch(() =>
        res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify({ intensity: 0, spywords: [], alerts: [], headlines: [] }))
      );
    return;
  }

  if (pathOnly.startsWith("/api/flow/btc") || pathOnly.startsWith("/api/flow/eth")) return res.writeHead(200, {"Content-Type": "application/json"}).end(JSON.stringify({ status: "connect_bitquery", to_exch: { count: 0, usd: 0 }, from_exch: { count: 0, usd: 0 } }));
  if (pathOnly.startsWith("/api/stable/usdt-eth")) return res.writeHead(200, {"Content-Type": "application/json"}).end(JSON.stringify({ status: "connect_etherscan", mints: { count: 0, usd: 0 }, burns: { count: 0, usd: 0 } }));
  if (pathOnly === "/api/watchdog/summary") return res.writeHead(200, {"Content-Type": "application/json"}).end("[]");

  if (pathOnly === "/api/stats/log" && req.method === "POST") {
    let body = "";
    req.on("data", chunk => body += chunk);
    req.on("end", () => { try { const e = JSON.parse(body); if (e.cat && e.data) { logStat(e.cat, e.data); res.writeHead(200).end(JSON.stringify({ ok: true })); } else res.writeHead(400).end(JSON.stringify({ error: "Missing cat or data" })); } catch { res.writeHead(400).end(JSON.stringify({ error: "Invalid JSON" })); } });
    return;
  }

  if (pathOnly === "/api/stats/summary") {
    let all = [], bias = [], predictions = [], news = [];
    if (fs.existsSync(STATS_FILE)) { const lines = fs.readFileSync(STATS_FILE, "utf8").trim().split("\n").filter(Boolean); const parsed = lines.map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean); all = parsed; bias = parsed.filter(s => s.cat === "bias"); predictions = parsed.filter(s => s.cat === "prediction"); news = parsed.filter(s => s.cat === "news"); }
    return res.writeHead(200, {"Content-Type": "application/json"}).end(JSON.stringify({ total: all.length, categories: { bias: bias.length, prediction: predictions.length, news: news.length }, latestBias: bias[bias.length - 1]?.data || null, predictionRecord: predictionRecordFromMerged(), lastNewsCount: news[news.length - 1]?.data?.count || 0 }));
  }

  if (pathOnly === "/api/stats") {
    const q = new URL(raw, "http://127.0.0.1").searchParams;
    let stats = []; if (fs.existsSync(STATS_FILE)) { const lines = fs.readFileSync(STATS_FILE, "utf8").trim().split("\n").filter(Boolean); stats = lines.map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean); if (q.get("cat")) stats = stats.filter(s => s.cat === q.get("cat")); }
    return res.writeHead(200, {"Content-Type": "application/json"}).end(JSON.stringify({ stats: stats.slice(-parseInt(q.get("limit") || "1000", 10)) }));
  }

  if (pathOnly.startsWith("/api/")) {
    console.log("[HTTP] Unhandled API path (would have been index.html):", JSON.stringify(pathOnly));
    return res.writeHead(404, {"Content-Type": "application/json"}).end(JSON.stringify({ error: "unhandled_api", path: pathOnly }));
  }

  const staticDir = path.join(__dirname, "public");
  const relStatic = pathOnly === "/" || pathOnly === "" ? "index.html" : pathOnly.replace(/^\//, "");
  let filePath = path.join(staticDir, relStatic);
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

/* ─── resolve open predictions vs live price (default 2 min; override RESOLVE_INTERVAL_MS) ─── */
const RESOLVE_MS = Number(process.env.RESOLVE_INTERVAL_MS) || 120000;
resolvePredictions();
setInterval(resolvePredictions, RESOLVE_MS);
