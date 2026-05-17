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

/* ─── Telegram alerts ─── */
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const TELEGRAM_CHAT_ID   = process.env.TELEGRAM_CHAT_ID   || "";

function formatPriceShockTelegram(p) {
  const asset = String(p.asset || "?");
  const call = String(p.call || "").toLowerCase() === "short" ? "Short" : "Long";
  const win = String(p.timeframe || p.horizon || "20m");
  const sev = String(p.shockSeverity || "pressure").toLowerCase();
  const movePct = Number(p.shockMovePct);
  const moveStr = Number.isFinite(movePct) ? `${movePct >= 0 ? "+" : ""}${movePct.toFixed(2)}%` : "?";
  const headlineOk = p.shockHeadlineMatch === true;
  const isDown = call === "Short";
  const assetLine =
    assetCooldownKey(asset) === "GOLD"
      ? "Gold / XAUUSD"
      : assetCooldownKey(asset) === "BTC"
        ? "BTC / BTC-USD"
        : assetCooldownKey(asset) === "ETH"
          ? "ETH / ETH-USD"
          : assetCooldownKey(asset) === "OIL"
            ? "Oil / WTI (CL)"
            : asset;
  let pressure = "";
  if (isDown) {
    if (sev === "severe") pressure = "Severe downside";
    else if (sev === "pressure") pressure = "Downside pressure";
    else pressure = "Downside watch";
  } else {
    if (sev === "severe") pressure = "Severe upside / breakout pressure";
    else if (sev === "pressure") pressure = "Upside pressure";
    else pressure = "Upside watch";
  }
  const U = String(asset).toUpperCase();
  const title =
    sev === "severe"
      ? isDown
        ? assetCooldownKey(asset) === "GOLD"
          ? "🔥 PRICE SHOCK — GOLD UNDER SEVERE PRESSURE"
          : `🔥 PRICE SHOCK — ${U} UNDER SEVERE DOWNSIDE`
        : `🔥 PRICE SHOCK — ${U} UPSIDE / BREAKOUT SHOCK`
      : sev === "pressure"
        ? `🔥 PRICE SHOCK — ${U} ${isDown ? "DOWNSIDE" : "UPSIDE"} PRESSURE`
        : `⚠️ ${asset} ${isDown ? "downside" : "upside"} pressure building`;
  const lines = [
    title,
    "",
    `Asset: ${assetLine}`,
    `Move: ${moveStr} in ${win}`,
    `Pressure: ${pressure}`,
    `Window: ${win} fast reaction`,
    "",
    "<b>Why this fired:</b>",
    headlineOk
      ? "Sharp short-window move with headline context in the feed."
      : "Sharp short-window gross move before/alongside confirmed headline pressure. This is a short-window gross market-move test, not a trade instruction.",
    "",
    "<b>Test opened:</b>",
    `${asset} ${call} · ${win} window`,
    "Target: ±0.4% gross move (symmetric lane)",
    "Invalidation: ±0.3% adverse move vs entry",
    "",
    headlineOk
      ? ""
      : [
          "<b>Headline:</b> No clean headline match yet",
          "<b>Signal source:</b> Price shock monitor",
          "",
          assetCooldownKey(asset) === "GOLD"
            ? "Gold is moving before the news feed explains it. Watch DXY, yields, US-China headlines, and safe-haven unwind risk."
            : "Price is moving fast — context may arrive late vs the tape.",
          "",
        ].join("\n"),
    "<i>Not financial advice. Before spread, slippage, fees, and platform costs. Gross market-move test only.</i>",
  ].filter(Boolean);
  return lines.join("\n");
}

function formatCatalystWatchTelegram(p) {
  const asset = String(p.asset || "?");
  const cluster = String(p.cluster || "").toLowerCase();
  const win = String(p.timeframe || p.horizon || "20m-4h");
  const theme =
    cluster === "musk_intel"
      ? "Musk / Tesla / Intel"
      : cluster === "fed_pivot"
        ? "Fed policy / yields / inflation"
        : cluster === "us_china_trade"
          ? "US–China trade & export controls"
          : "Macro / catalyst headlines";
  const whyBody =
    cluster === "musk_intel"
      ? "Rumor pressure is building around Musk / Tesla / Intel. No confirmed acquisition. This may create temporary sentiment volatility in related semiconductor and EV-linked names."
      : cluster === "fed_pivot"
        ? "Macro headline pressure is building around the Fed, yields, the dollar, or inflation prints. This may create short-lived volatility across rates-sensitive assets."
        : cluster === "us_china_trade"
          ? "Headline pressure is building around US–China trade, tariffs, Taiwan risk, or export controls. This may create temporary volatility in semiconductors and macro proxies."
          : String(p.why || "Awareness-only headline clustering. Not a trade signal.");
  const impact =
    cluster === "musk_intel"
      ? [
          "INTC — direct rumor/catalyst target",
          "TSLA — Tesla/Musk link",
          "NVDA / TSM / AVGO / MU / SMCI — semiconductor sympathy watch",
        ].join("\n")
      : cluster === "fed_pivot"
        ? [
            "Gold — rates / yield pressure",
            "DXY — dollar sensitivity",
            "BTC / ETH — risk-asset sensitivity",
            "TSLA / NVDA — high-beta equity sensitivity",
          ].join("\n")
        : cluster === "us_china_trade"
          ? [
              "Gold — safe-haven / macro risk",
              "DXY — macro dollar sensitivity",
              "TSM — Taiwan / chip supply-chain sensitivity",
              "NVDA — chip export-control risk",
              "INTC — US chip policy / foundry angle",
              "AVGO — semiconductor basket risk",
              "MU — China / memory-cycle exposure",
              "TSLA — China demand / exposure risk",
            ].join("\n")
          : (Array.isArray(p.affectedAssets) ? p.affectedAssets : [])
              .map((x) => String(x))
              .filter(Boolean)
              .join("\n");
  const lines = [
    `⚠️ <b>SPECULATIVE CATALYST WATCH — ${asset}</b>`,
    "",
    `<b>Theme:</b> ${theme}`,
    `<b>Asset:</b> ${asset}`,
    `<b>Window:</b> ${win}`,
    `<b>Status:</b> Awareness only`,
    "",
    "<b>Why this fired:</b>",
    whyBody,
    "",
    "<b>Watchlist impact:</b>",
    impact,
    "",
    "<i>Not financial advice. Not a trade signal.</i>",
  ];
  return lines.join("\n");
}

function formatAlert(p) {
  if (String(p.source || "").toLowerCase() === "price-shock") {
    return formatPriceShockTelegram(p);
  }
  if (String(p.source || "").toLowerCase() === "catalyst-watch") {
    return formatCatalystWatchTelegram(p);
  }
  const lines = [
    "🧪 <b>SentoTrade Live Edge Test</b>",
    "",
    `Asset: ${p.asset}`,
    `Call: ${String(p.call || "").toUpperCase()}`,
    `Window: ${p.timeframe || p.windowHours || "?"}`,
    `Entry: ${p.entry ?? "?"}`,
    `Target: ${p.target ?? "?"}`,
  ];
  if (p.why) lines.push(`Why: ${p.why}`);
  lines.push("", "<i>Not financial advice. Simulated test only.</i>");
  return lines.join("\n");
}

async function sendTelegramAlert(message) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: message, parse_mode: "HTML" }),
      signal: AbortSignal.timeout(8000),
    });
  } catch (err) {
    console.error("[Telegram] send error:", err.message);
  }
}

/* ─── stats accumulator ─── */
const STATS_FILE = path.join(__dirname, "stats.jsonl");
function logStat(cat, data) {
  const line = JSON.stringify({ t: new Date().toISOString(), cat, data }) + "\n";
  fs.appendFile(STATS_FILE, line, () => {});
}

/* ─── news cache (5 minutes) + NewsData rate-limit hardening ─── */
let newsCache = { articles: [{ title: "Loading...", url: "#" }], ts: 0 };
const NEWS_CACHE_MS = 300000; // 5 minutes
let newsQueryOffset = 0;
let NEWS_BACKOFF_UNTIL = 0;
/** Real headline rows from last successful relevance-filtered fetch (not placeholder). */
let LAST_GOOD_NEWS_ARTICLES = null;
const NEWS_LAST_GOOD_FILE = path.join(__dirname, "news_last_good.json");

function loadNewsLastGoodFromDisk() {
  try {
    if (!fs.existsSync(NEWS_LAST_GOOD_FILE)) return;
    const raw = fs.readFileSync(NEWS_LAST_GOOD_FILE, "utf8").trim();
    if (!raw) return;
    const o = JSON.parse(raw);
    const arr = Array.isArray(o?.articles) ? o.articles : Array.isArray(o) ? o : null;
    if (!arr || !arr.length) return;
    const cleaned = arr
      .filter((a) => a && typeof a.title === "string" && typeof a.url === "string")
      .map((a) => ({ title: String(a.title).slice(0, 500), url: String(a.url).slice(0, 2000) }))
      .slice(0, 30);
    if (!cleaned.length) return;
    LAST_GOOD_NEWS_ARTICLES = cleaned;
    console.log(
      "[News] Loaded last-good snapshot from disk:",
      cleaned.length,
      "articles",
      o?.savedAt ? `(saved ${o.savedAt})` : ""
    );
  } catch (e) {
    console.log("[News] Could not load news_last_good.json:", e.message);
  }
}

function saveNewsLastGoodToDisk(articles) {
  if (!articles || !articles.length) return;
  if (isPlaceholderNewsArticles(articles)) return;
  try {
    const payload = { savedAt: new Date().toISOString(), articles };
    const body = JSON.stringify(payload);
    const tmp = NEWS_LAST_GOOD_FILE + ".tmp." + process.pid;
    fs.writeFileSync(tmp, body, "utf8");
    fs.renameSync(tmp, NEWS_LAST_GOOD_FILE);
    console.log("[News] Saved last-good snapshot to disk:", articles.length, "articles");
  } catch (e) {
    console.log("[News] Could not save news_last_good.json:", e.message);
  }
}

function hydrateNewsCacheFromDiskSnapshot() {
  if (!LAST_GOOD_NEWS_ARTICLES || !LAST_GOOD_NEWS_ARTICLES.length) return;
  if (!isPlaceholderNewsArticles(newsCache.articles) && newsCache.articles?.length > 1) return;
  newsCache = { articles: LAST_GOOD_NEWS_ARTICLES.slice(), ts: Date.now() };
  console.log("[News] Hydrated in-memory cache from disk snapshot for cold start / placeholder bootstrap");
}
function isExcludedNewsUrl(url) {
  const u = String(url || "").toLowerCase();
  return u.includes("reddit.com") || u.includes("redd.it");
}

/** NewsData: decoded `q` must be ≤100 chars (free tier). Multiple short strips, merged + deduped. */
const NEWS_Q_STRIPS = [
  "markets OR stocks OR earnings OR inflation",
  "bitcoin OR ethereum OR crypto",
  "oil OR gold OR dollar OR yields",
  "fed OR rates OR cpi",
  "tariffs OR trade war OR trade talks",
  "china OR taiwan OR rare earths",
  "export controls OR chip controls",
  "nvidia OR tesla OR apple",
  "boeing OR bessent OR beijing",
  "semiconductor OR supply chain",
];
for (const _nq of NEWS_Q_STRIPS) {
  if (_nq.length > 100) console.error("[News] FATAL: query strip >100 chars:", _nq.length);
}

function escapeReToken(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Single-token allow: word-ish boundaries (ASCII) so "eth" does not match "whether". */
function headlineHasToken(hayNorm, token) {
  const t = escapeReToken(token);
  return new RegExp(`(?:^|[^a-z0-9])${t}(?:$|[^a-z0-9])`, "i").test(hayNorm);
}

/** Multi-word phrases (already lowercased, spaces collapsed). */
function headlineHasPhrase(hayNorm, phrase) {
  const inner = phrase.split(/\s+/).map(escapeReToken).join("\\s+");
  return new RegExp(`(?:^|[^a-z0-9])${inner}(?:$|[^a-z0-9])`, "i").test(hayNorm);
}

const MARKET_ALLOW_PHRASES = [
  "palo alto",
  "super micro",
  "ai stocks",
  "chip stocks",
  "wall street",
  "us-china",
  "u.s.-china",
  "usa china",
  "export controls",
  "export control",
  "rare earth",
  "rare earths",
  "trade war",
  "trade talks",
  "trade truce",
  "chip controls",
  "supply chain",
  "xi jinping",
  "trump china",
  "trump tariff",
  "trump trade",
  "us china trade",
  "export ban",
  "chip export",
];
const MARKET_ALLOW_WORDS = [
  "market", "markets", "stock", "stocks", "shares", "trader", "traders", "trading", "crypto", "bitcoin", "btc",
  "ethereum", "eth", "oil", "gold", "fed", "inflation", "cpi", "rates", "dollar", "yields", "earnings", "revenue",
  "profit", "tariff", "tariffs", "sanctions", "semiconductor", "semiconductors", "nvidia", "tesla", "apple", "microsoft", "google",
  "alphabet", "broadcom", "tsm", "micron", "intel", "nasdaq", "spy", "ai",
  "china", "beijing", "bessent", "boeing", "taiwan", "yuan", "renminbi", "delegation", "summit",
];

const MARKET_BLOCK_WORDS = [
  "celebrity", "movie", "tv", "netflix", "wwe", "sports", "crime", "murder", "dating", "gossip", "reality",
  "actor", "actress", "music", "song", "anime", "disney", "trailer",
];

/** Block obvious non-market noise; \b avoids clipping GameStop for "game". */
const MARKET_BLOCK_GAME_RE = /\bgame\b/i;

function isMarketRelevantHeadline(title) {
  const hay = String(title || "").toLowerCase().replace(/\s+/g, " ").trim();
  if (!hay) return false;
  for (const w of MARKET_BLOCK_WORDS) {
    if (headlineHasToken(hay, w)) return false;
  }
  if (MARKET_BLOCK_GAME_RE.test(hay)) return false;
  for (const ph of MARKET_ALLOW_PHRASES) {
    if (headlineHasPhrase(hay, ph)) return true;
  }
  for (const w of MARKET_ALLOW_WORDS) {
    if (headlineHasToken(hay, w)) return true;
  }
  return false;
}

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

function newsPlaceholderArticles(anyHttpOk) {
  return [
    {
      title: anyHttpOk
        ? "No high-quality market headlines passed the relevance filter right now."
        : "News temporarily unavailable",
      url: "#",
    },
  ];
}

function isPlaceholderNewsArticles(articles) {
  if (!articles || !articles.length) return true;
  if (articles.length !== 1) return false;
  const t = String(articles[0]?.title || "");
  return (
    t.includes("News temporarily unavailable") ||
    t.includes("No high-quality market headlines passed the relevance filter") ||
    t === "Loading..."
  );
}

/** Catalyst Watch: anticipatory headline clustering — awareness rows only (not trade tests). */
const CATALYST_WINDOW_MS = 10 * 60 * 1000;
const CATALYST_ASSET_THROTTLE_MS = 30 * 60 * 1000;
let catalystHeadlineRing = [];
const catalystAssetLastFire = new Map();

const CATALYST_CLUSTERS = {
  musk_intel: {
    keywords: [
      "musk",
      "tesla",
      "intel",
      "intc",
      "buyout",
      "acquisition",
      "takeover",
      "foundry",
      "declined to comment",
      "avoided question",
      "refused to answer",
      "speculation",
      "rumor",
    ],
    assets: ["INTC", "TSLA", "NVDA", "TSM", "AVGO", "MU", "SMCI"],
    why:
      "Speculative catalyst watch: rumor pressure building around Musk / Tesla / Intel. No confirmed acquisition. Awareness only — not a trade signal.",
  },
  fed_pivot: {
    keywords: [
      "fed",
      "federal reserve",
      "pivot",
      "rate cut",
      "emergency meeting",
      "powell",
      "yields",
      "dollar",
      "cpi",
      "inflation",
    ],
    assets: ["Gold", "DXY", "BTC", "ETH", "TSLA", "NVDA"],
    why:
      "Speculative catalyst watch: macro headline pressure building around Fed policy, yields, the dollar, or inflation. Awareness only — not a trade signal.",
  },
  us_china_trade: {
    keywords: [
      "china",
      "beijing",
      "taiwan",
      "tariffs",
      "tariff",
      "trade war",
      "trade talks",
      "trade truce",
      "export controls",
      "chip controls",
      "rare earth",
      "rare earths",
      "boeing",
      "bessent",
      "xi",
      "trump",
    ],
    assets: ["Gold", "DXY", "TSM", "NVDA", "INTC", "AVGO", "MU", "TSLA"],
    why:
      "Speculative catalyst watch: headline pressure building around US–China trade, tariffs, or export controls. Awareness only — not a trade signal.",
  },
};

function normalizeCatalystTitle(title) {
  return String(title || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function pushCatalystHeadlinesFromArticles(articles) {
  const now = Date.now();
  for (const a of articles || []) {
    const titleNorm = normalizeCatalystTitle(a?.title);
    if (!titleNorm || titleNorm === "loading...") continue;
    catalystHeadlineRing.push({ t: now, titleNorm });
  }
  catalystHeadlineRing = catalystHeadlineRing.filter((x) => now - x.t <= CATALYST_WINDOW_MS);
}

function catalystClusterMatchCount(hay) {
  const out = Object.create(null);
  for (const clusterId of Object.keys(CATALYST_CLUSTERS)) {
    const kws = CATALYST_CLUSTERS[clusterId].keywords;
    let n = 0;
    for (const kw of kws) {
      const k = String(kw).toLowerCase().trim();
      if (!k) continue;
      if (k.includes(" ")) {
        if (hay.includes(k)) n++;
      } else if (headlineHasToken(hay, k)) {
        n++;
      }
    }
    out[clusterId] = n;
  }
  return out;
}

function detectCatalystWatch(articles) {
  const rows = [];
  if (!articles || !articles.length) return rows;
  if (isPlaceholderNewsArticles(articles)) return rows;

  pushCatalystHeadlinesFromArticles(articles);
  const now = Date.now();
  const hay = catalystHeadlineRing.map((x) => x.titleNorm).join(" . ");
  if (!hay) return rows;

  const matchCounts = catalystClusterMatchCount(hay);
  const rand = () => Math.random().toString(36).slice(2, 8);

  for (const clusterId of Object.keys(CATALYST_CLUSTERS)) {
    if ((matchCounts[clusterId] || 0) < 2) continue;
    const def = CATALYST_CLUSTERS[clusterId];
    const idTs = Date.now();
    const affectedAssets = def.assets.slice();
    for (const asset of def.assets) {
      const tk = `${clusterId}|${assetCooldownKey(asset)}`;
      const last = catalystAssetLastFire.get(tk) || 0;
      if (now - last < CATALYST_ASSET_THROTTLE_MS) continue;
      catalystAssetLastFire.set(tk, now);
      rows.push({
        id: `cw_${idTs}_${clusterId}_${asset}_${rand()}`,
        time: new Date().toISOString(),
        source: "catalyst-watch",
        asset,
        call: "Watch",
        status: "watching",
        timeframe: "20m-4h",
        horizon: "20m-4h",
        entry: null,
        target: null,
        affectedAssets,
        cluster: clusterId,
        why: def.why,
        outcome: "—",
      });
    }
  }
  return rows;
}

loadNewsLastGoodFromDisk();
hydrateNewsCacheFromDiskSnapshot();

async function fetchNewsWithCache() {
  const now = Date.now();
  if (now - newsCache.ts < NEWS_CACHE_MS) {
    console.log("[News] Serving cache, age:", Math.round((now - newsCache.ts) / 1000), "s");
    return newsCache.articles;
  }
  if (now < NEWS_BACKOFF_UNTIL) {
    console.log("[News] Backoff active until", new Date(NEWS_BACKOFF_UNTIL).toISOString());
    let articles =
      LAST_GOOD_NEWS_ARTICLES && LAST_GOOD_NEWS_ARTICLES.length
        ? LAST_GOOD_NEWS_ARTICLES.slice()
        : !isPlaceholderNewsArticles(newsCache.articles)
          ? newsCache.articles.slice()
          : null;
    if (articles && articles.length) {
      console.log("[News] Using last good articles", articles.length, "(backoff, no upstream fetch)");
    } else {
      articles = newsPlaceholderArticles(false);
    }
    newsCache = { articles, ts: now };
    return articles;
  }

  const n = NEWS_Q_STRIPS.length;
  const batchSize = 3;
  const start = newsQueryOffset % n;
  const strips = [];
  for (let k = 0; k < batchSize; k++) strips.push(NEWS_Q_STRIPS[(start + k) % n]);
  newsQueryOffset = (start + batchSize) % n;

  const stripSummaries = strips.map((s) => (s.length > 52 ? `${s.slice(0, 49)}…` : s));
  console.log("[News] Fetch strips", `${start}–${(start + batchSize - 1) % n}`, ":", stripSummaries.join(" | "));

  let articles = [];
  let anyHttpOk = false;
  let rawMergedCount = 0;
  let saw429 = false;
  try {
    const newsSize = 8;
    const urls = strips.map(
      (strip) =>
        `https://newsdata.io/api/1/news?apikey=${NEWSDATA_KEY}&q=${encodeURIComponent(strip)}&language=en&size=${newsSize}`
    );
    const responses = await Promise.all(urls.map((u) => fetch(u, { signal: AbortSignal.timeout(8000) })));
    const rows = [];
    for (let i = 0; i < responses.length; i++) {
      const r = responses[i];
      const strip = strips[i];
      if (r.status === 429) {
        saw429 = true;
        NEWS_BACKOFF_UNTIL = Date.now() + 10 * 60 * 1000;
      }
      if (r.ok) {
        anyHttpOk = true;
        const d = await r.json().catch(() => ({}));
        if (d?.results?.length) rows.push(...d.results.map((a) => ({ title: a.title, url: a.link })));
      } else {
        const text = await r.text().catch(() => "");
        let detail = "";
        try {
          const j = JSON.parse(text);
          detail = j?.results?.message || j?.results?.code || j?.message || j?.status || "";
        } catch {
          detail = text.slice(0, 160);
        }
        const shortQ = strip.length > 60 ? `${strip.slice(0, 57)}...` : strip;
        const safeDetail = String(detail)
          .replaceAll(String(NEWSDATA_KEY), "***")
          .slice(0, 160);
        console.log("[News] Query failed", r.status, shortQ, safeDetail);
      }
    }
    if (saw429) {
      console.log("[News] Backoff set until", new Date(NEWS_BACKOFF_UNTIL).toISOString(), "(429 from NewsData)");
    }
    const merged = dedupeArticlesByTitle(rows).filter((a) => !isExcludedNewsUrl(a.url));
    rawMergedCount = merged.length;
    articles = merged.filter((a) => isMarketRelevantHeadline(a.title)).slice(0, 20);
    console.log("[News] Fresh fetch:", rawMergedCount, "merged →", articles.length, "after relevance filter");
  } catch (e) {
    console.log("[News] Fetch error:", e.message);
  }

  if (articles.length > 0) {
    LAST_GOOD_NEWS_ARTICLES = articles.slice();
    saveNewsLastGoodToDisk(articles);
  } else if (LAST_GOOD_NEWS_ARTICLES && LAST_GOOD_NEWS_ARTICLES.length) {
    console.log("[News] Using last good articles", LAST_GOOD_NEWS_ARTICLES.length, "(empty or filtered-out fetch)");
    articles = LAST_GOOD_NEWS_ARTICLES.slice();
  } else {
    articles = newsPlaceholderArticles(anyHttpOk);
  }

  if (!isPlaceholderNewsArticles(articles) && articles.length) {
    try {
      const cwRows = detectCatalystWatch(articles);
      if (cwRows.length) {
        savePredictions(cwRows);
        console.log("[CatalystWatch] Appended", cwRows.length, "awareness rows");
      }
    } catch (e) {
      console.log("[CatalystWatch]", e?.message || e);
    }
  }

  newsCache = { articles, ts: now };
  logStat("news", { count: articles.length, cached: false, rawMerged: rawMergedCount, saw429, strips: batchSize });
  return articles;
}

const GOSSIP_KEYWORDS = [
  "gold",
  "oil",
  "btc",
  "bitcoin",
  "tesla",
  "fed",
  "tariff",
  "inflation",
  "rate",
  "spy",
  "china",
  "taiwan",
  "boeing",
  "export control",
  "rare earth",
  "trade war",
  "semiconductor",
  "yuan",
];

function gossipIsPlaceholderArticle(a) {
  const t = String(a?.title || "").toLowerCase();
  return (
    !t ||
    t === "loading..." ||
    t.includes("news temporarily unavailable") ||
    t.includes("no high-quality market headlines passed the relevance filter")
  );
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
const PREDICTIONS_FILE  = path.join(__dirname, "predictions.jsonl");
const ONBOARDING_FILE   = path.join(__dirname, "onboarding.jsonl");
const GURU_BRIEFINGS_FILE = path.join(__dirname, "guru_briefings.jsonl");
const GURU_QUOTA_FILE = path.join(__dirname, "guru_quota.jsonl");

async function fetchPrices() {
  try {
    const yahooMap = [
      { key: "tsla", ticker: "TSLA" }, { key: "intc", ticker: "INTC" },
      { key: "aapl", ticker: "AAPL" }, { key: "nvda", ticker: "NVDA" },
      { key: "spx", ticker: "^GSPC" }, { key: "oil", ticker: "CL=F" },
      { key: "gold", ticker: "GC=F" }, { key: "silver", ticker: "SI=F" }
    ];
    // CoinGecko (free, may rate-limit server IPs) with Binance fallback
    const cg = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true", { signal: AbortSignal.timeout(5000) }).then(r => r.json()).catch(() => ({}));
    let btcUsd = cg?.bitcoin?.usd ?? null;
    let btcCh  = cg?.bitcoin?.usd_24h_change ?? null;
    let ethUsd = cg?.ethereum?.usd ?? null;
    let ethCh  = cg?.ethereum?.usd_24h_change ?? null;
    // Binance fallback when CoinGecko is rate-limited
    if (btcUsd === null || ethUsd === null) {
      const [bnBtc, bnEth] = await Promise.allSettled([
        fetch("https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT", { signal: AbortSignal.timeout(5000) }).then(r => r.json()),
        fetch("https://api.binance.com/api/v3/ticker/24hr?symbol=ETHUSDT", { signal: AbortSignal.timeout(5000) }).then(r => r.json()),
      ]);
      if (btcUsd === null && bnBtc.status === "fulfilled") {
        btcUsd = Number(bnBtc.value?.lastPrice) || null;
        btcCh  = Number(bnBtc.value?.priceChangePercent) || null;
      }
      if (ethUsd === null && bnEth.status === "fulfilled") {
        ethUsd = Number(bnEth.value?.lastPrice) || null;
        ethCh  = Number(bnEth.value?.priceChangePercent) || null;
      }
    }
    const yahoo = await Promise.allSettled(yahooMap.map(t => fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${t.ticker}?interval=1d&range=5d`, { signal: AbortSignal.timeout(5000) }).then(r => r.json()).then(j => ({ key: t.key, meta: j?.chart?.result?.[0]?.meta || {} }))));
    const prices = {
      btc: btcUsd, btcCh,
      eth: ethUsd, ethCh,
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

/** Defaults (fallback for assets not configured in ASSET_REGIMES). */
const PRED_TARGET_FRAC = 0.008;
const PRED_STOP_LOSS_FRAC = 0.006;
const PRED_WINDOW_HOURS = 12;

/** Asset-specific target/stop/window. Values are percentages + hours.
 *  Keys are Pascal (Gold, Oil). `assetCooldownKey` uses GOLD/OIL — getAssetRegime matches case-insensitively. */
const ASSET_REGIMES = {
  Oil: { target: 0.8, stop: 0.6, windowHours: 12 },
  Gold: { target: 0.4, stop: 0.6, windowHours: 12 },
  BTC: { target: 2.5, stop: 1.5, windowHours: 24 },
  ETH: { target: 2.5, stop: 1.5, windowHours: 24 },
  TSLA: { target: 1.2, stop: 0.8, windowHours: 4 },
};

const TREND_YAHOO_TICKERS = {
  BTC: "BTC-USD",
  ETH: "ETH-USD",
  GOLD: "GC=F",
  OIL: "CL=F",
  TSLA: "TSLA",
};

const TREND_CACHE_MS = 10 * 60 * 1000;
const trendGateCache = new Map();
const COOLDOWN_LOSS_STREAK = 3;
const COOLDOWN_MS = 12 * 60 * 60 * 1000;

function getAssetRegime(asset) {
  const key = assetCooldownKey(asset);
  let cfg = ASSET_REGIMES[key];
  if (!cfg && key) {
    const kLower = String(key).toLowerCase();
    for (const [regimeName, row] of Object.entries(ASSET_REGIMES)) {
      if (String(regimeName).toLowerCase() === kLower) {
        cfg = row;
        break;
      }
    }
  }
  return {
    targetFrac: ((cfg?.target ?? (PRED_TARGET_FRAC * 100)) / 100),
    stopFrac: ((cfg?.stop ?? (PRED_STOP_LOSS_FRAC * 100)) / 100),
    windowHours: cfg?.windowHours ?? PRED_WINDOW_HOURS,
  };
}

function pctLabel(frac, call) {
  const sign = String(call || "").toLowerCase() === "short" ? "-" : "+";
  return `${sign}${(frac * 100).toFixed(1)}%`;
}

async function fetchTrendSnapshot(asset) {
  const key = assetCooldownKey(asset);
  const ticker = TREND_YAHOO_TICKERS[key];
  if (!ticker) return null;

  const cached = trendGateCache.get(key);
  if (cached && (Date.now() - cached.ts) < TREND_CACHE_MS) return cached.data;

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?range=7d&interval=1d`;
  const json = await fetch(url, {
    signal: AbortSignal.timeout(7000),
    headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0" },
  }).then((r) => {
    if (!r.ok) throw new Error(`yahoo ${r.status}`);
    return r.json();
  });

  const result = json?.chart?.result?.[0];
  const closesRaw = result?.indicators?.quote?.[0]?.close || [];
  const closes = closesRaw.map((x) => Number(x)).filter((n) => Number.isFinite(n));
  if (closes.length < 2) throw new Error("insufficient close data");
  const snap = { ago: closes[0], current: closes[closes.length - 1] };
  trendGateCache.set(key, { ts: Date.now(), data: snap });
  return snap;
}

/** Fail-open by design: Yahoo outage should not stop all predictions. */
async function checkTrendFilter(asset, call) {
  const dir = String(call || "").toLowerCase() === "short" ? "Short" : "Long";
  try {
    const snap = await fetchTrendSnapshot(asset);
    if (!snap) return true;
    if (dir === "Short" && snap.current > snap.ago) {
      console.log(`[TrendGate] BLOCKED ${asset} Short — 7d trend is UP (${snap.ago} → ${snap.current}).`);
      return false;
    }
    if (dir === "Long" && snap.current < snap.ago) {
      console.log(`[TrendGate] BLOCKED ${asset} Long — 7d trend is DOWN (${snap.ago} → ${snap.current}).`);
      return false;
    }
    return true;
  } catch (e) {
    console.log(`[TrendGate] WARN ${asset} ${dir} — fail-open (${e?.message || e})`);
    return true;
  }
}

/** Consecutive misses gate for exact asset + call across full history (not just head). */
function checkCooldownGate(asset, call, newestFirst) {
  try {
    const targetAsset = assetCooldownKey(asset);
    const targetCall = String(call || "").toLowerCase() === "short" ? "short" : "long";
    let losses = 0;
    let lastMissTs = 0;
    for (const p of newestFirst) {
      const pAsset = assetCooldownKey(p.asset);
      const pCall = String(p.call || "").toLowerCase() === "short" ? "short" : "long";
      if (pAsset !== targetAsset || pCall !== targetCall) continue;
      const st = String(p.status || "").toLowerCase();
      if (st === "missed") {
        losses++;
        if (!lastMissTs) {
          lastMissTs = Date.parse(p.resolvedAt || p.updatedAt || p.time || p.ts || "") || 0;
        }
        continue;
      }
      // Same asset+call but not missed (hit, partial, open) — streak ends here
      break;
    }
    if (losses >= COOLDOWN_LOSS_STREAK && lastMissTs) {
      const until = lastMissTs + COOLDOWN_MS;
      if (Date.now() < until) {
        console.log(`[CooldownGate] BLOCKED ${asset} ${String(call)} — ${losses} consecutive losses, cooling down until ${new Date(until).toISOString()}.`);
        return false;
      }
    }
    return true;
  } catch (e) {
    console.log(`[CooldownGate] WARN ${asset} ${String(call)} — fail-open (${e?.message || e})`);
    return true;
  }
}

function generateSignals(prices) {
  const signals = [];
  if (!prices) return signals;
  const now = new Date().toISOString();
  const ts = Date.now();
  function pushGuruSignal(asset, call, entry, why, idSuffix) {
    const regime = getAssetRegime(asset);
    const isShort = String(call).toLowerCase() === "short";
    const target = entry * (isShort ? (1 - regime.targetFrac) : (1 + regime.targetFrac));
    const win = `${regime.windowHours}h`;
    signals.push({
      id: "sig_" + ts + "_" + idSuffix,
      time: now,
      asset,
      call,
      entry,
      target: target.toFixed(2),
      targetPct: pctLabel(regime.targetFrac, call),
      timeframe: win,
      why,
      horizon: win,
      stopLossFrac: regime.stopFrac,
      status: "open",
      outcome: "—",
    });
  }
  if (prices.btcCh !== null && prices.btcCh < -1.5) pushGuruSignal("BTC", "Long", prices.btc, `BTC oversold (${prices.btcCh.toFixed(2)}% 24h). Expect bounce.`, "btc_long");
  if (prices.btcCh !== null && prices.btcCh > 1.5) pushGuruSignal("BTC", "Short", prices.btc, `BTC overbought (+${prices.btcCh.toFixed(2)}% 24h). Expect pullback.`, "btc_short");
  if (prices.eth != null && prices.ethCh !== null && prices.ethCh < -1.5) pushGuruSignal("ETH", "Long", prices.eth, `ETH oversold (${prices.ethCh.toFixed(2)}% 24h). Expect bounce.`, "eth_long");
  if (prices.eth != null && prices.ethCh !== null && prices.ethCh > 1.5) pushGuruSignal("ETH", "Short", prices.eth, `ETH overbought (+${prices.ethCh.toFixed(2)}% 24h). Expect pullback.`, "eth_short");
  if (prices.goldCh !== null && prices.goldCh > 0.5) pushGuruSignal("Gold", "Long", prices.gold, `Gold breaking (+${prices.goldCh.toFixed(2)}% 24h). Safe-haven flow.`, "gold_long");
  if (prices.goldCh !== null && prices.goldCh < -1.0) pushGuruSignal("Gold", "Short", prices.gold, `Gold selling off (${prices.goldCh.toFixed(2)}% 24h). Risk-on tone.`, "gold_short");
  /* Oil / TSLA: session vs prior close from Yahoo (not CoinGecko 24h). Same target band as other guru signals. */
  if (prices.oil != null && prices.oilCh != null && prices.oilCh < -2) pushGuruSignal("Oil", "Long", prices.oil, `WTI weak (${prices.oilCh.toFixed(2)}% vs prior). Mean reversion watch.`, "oil_long");
  if (prices.oil != null && prices.oilCh != null && prices.oilCh > 2) pushGuruSignal("Oil", "Short", prices.oil, `WTI strong (+${prices.oilCh.toFixed(2)}% vs prior). Pullback watch.`, "oil_short");
  if (prices.tsla != null && prices.tslaCh != null && prices.tslaCh < -2.5) pushGuruSignal("TSLA", "Long", prices.tsla, `TSLA soft (${prices.tslaCh.toFixed(2)}% vs prior). Bounce watch.`, "tsla_long");
  if (prices.tsla != null && prices.tslaCh != null && prices.tslaCh > 2.5) pushGuruSignal("TSLA", "Short", prices.tsla, `TSLA hot (+${prices.tslaCh.toFixed(2)}% vs prior). Fade watch.`, "tsla_short");
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
    const st = String(p.status || "").toLowerCase();
    const src = String(p.source || "").toLowerCase();
    if (st === "open" || src === "catalyst-watch") {
      sendTelegramAlert(formatAlert(p)).catch(e => console.error("[Telegram]", e.message));
    }
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
    if (String(p.source || "").toLowerCase() === "catalyst-watch") continue;
    if (String(p.status || "").toLowerCase() === "watching") continue;
    if (String(p.call || "").trim().toLowerCase() === "watch") continue;
    const st = String(p.status ?? "open").toLowerCase();
    if (st === "hit") hit++;
    else if (st === "missed") missed++;
    else if (st === "partial") partial++;
    else open++;
  }
  return { hit, missed, partial, open };
}

/* ─── Guru briefing: plan + clientId quota (guru_quota.jsonl); Claude Haiku only for trial/raw when ANTHROPIC_API_KEY is set ─── */
const BRIEFING_ALLOWED_ASSETS = ["BTC", "ETH", "GOLD", "OIL", "TSLA", "NVDA", "INTC", "GOOGL", "TSM", "AVGO", "MU", "SMCI", "PANW", "SOUN"];
const BRIEFING_TIMEFRAMES = new Set(["1h-4h", "4h-1d", "1d-5d", "1w", "12h", "24h", "session"]);
const BRIEFING_MODES = new Set(["momentum_check", "sentiment_read", "risk_check"]);
const BRIEFING_REQUIRED_DISCLAIMER = "Educational market briefing only. Not financial advice.";

function normalizeBriefingAssetInput(raw) {
  const x = String(raw || "").trim().toUpperCase();
  if (x === "XAU" || x === "XAUUSD") return "GOLD";
  if (x === "WTI" || x === "CRUDE") return "OIL";
  if (x === "GOOG") return "GOOGL";
  return x;
}

function guruQuotaDateUtc() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeBriefingPlan(raw) {
  const p = String(raw || "").trim().toLowerCase();
  if (p === "trial") return "trial";
  if (p === "raw") return "raw";
  return "free";
}

function guruBriefingDailyCap(plan) {
  if (plan === "trial") return 5;
  if (plan === "raw") return 10;
  return 1;
}

function sanitizeBriefingClientId(raw) {
  const s = String(raw || "").trim();
  if (!s || s.length > 128) return "";
  if (!/^cid_[a-z0-9_-]{4,120}$/i.test(s)) return "";
  return s;
}

function countGuruBriefingsToday(clientId, ymd) {
  if (!fs.existsSync(GURU_QUOTA_FILE)) return 0;
  let text;
  try {
    text = fs.readFileSync(GURU_QUOTA_FILE, "utf8");
  } catch {
    return 0;
  }
  const lines = text.trim().split("\n").filter(Boolean);
  let n = 0;
  for (const line of lines) {
    try {
      const row = JSON.parse(line);
      if (String(row.clientId || "") === clientId && String(row.date || "") === ymd) n++;
    } catch {
      /* skip bad line */
    }
  }
  return n;
}

function appendGuruQuota(entry) {
  fs.appendFileSync(GURU_QUOTA_FILE, JSON.stringify(entry) + "\n");
}

/** Map briefing asset to live price fields from fetchPrices() — no invented numbers. */
function briefingPriceFromPrices(assetNorm, prices) {
  if (!prices || typeof prices !== "object") {
    return { ok: false, price: null, changePct: null, note: "Price feed unavailable." };
  }
  const row = (pk, ck) => {
    const price = prices[pk] != null && Number.isFinite(Number(prices[pk])) ? Number(prices[pk]) : null;
    const ch = prices[ck] != null && Number.isFinite(Number(prices[ck])) ? Number(prices[ck]) : null;
    if (price == null && ch == null) {
      return { ok: false, price: null, changePct: null, note: "Price data unavailable for this symbol on the current feed." };
    }
    const chNote =
      ch != null
        ? `Recent reference move ≈ ${ch >= 0 ? "+" : ""}${ch.toFixed(2)}% (feed-dependent; not a trade signal).`
        : "Level observed on feed; percentage change not available.";
    return { ok: true, price, changePct: ch, note: chNote };
  };
  switch (assetNorm) {
    case "BTC":
      return row("btc", "btcCh");
    case "ETH":
      return row("eth", "ethCh");
    case "GOLD":
      return row("gold", "goldCh");
    case "OIL":
      return row("oil", "oilCh");
    case "TSLA":
      return row("tsla", "tslaCh");
    case "NVDA":
      return row("nvda", "nvdaCh");
    case "INTC":
      return row("intc", "intcCh");
    default:
      return { ok: false, price: null, changePct: null, note: "Price data unavailable for this symbol on the current feed." };
  }
}

function headlineMentionsAsset(title, assetNorm) {
  const t = String(title || "").toLowerCase();
  const map = {
    BTC: ["bitcoin", "btc"],
    ETH: ["ethereum", "eth "],
    GOLD: ["gold", "xau"],
    OIL: ["oil", "wti", "crude", "brent"],
    TSLA: ["tesla", "tsla"],
    NVDA: ["nvidia", "nvda"],
    INTC: ["intel", "intc"],
    GOOGL: ["alphabet", "google", "googl"],
    TSM: ["tsmc", "taiwan semi", "tsm"],
    AVGO: ["broadcom", "avgo"],
    MU: ["micron", " mu"],
    SMCI: ["super micro", "smci"],
    PANW: ["palo alto", "panw"],
    SOUN: ["soundhound", "soun"],
  };
  const keys = map[assetNorm];
  if (!keys) return false;
  return keys.some((k) => t.includes(k));
}

async function buildLocalBriefing(assetNorm, timeframe, mode) {
  const ts = new Date().toISOString();
  const disclaimer = BRIEFING_REQUIRED_DISCLAIMER;
  const prices = (await fetchPrices().catch(() => null)) || {};
  const articles = await fetchNewsWithCache().catch(() => []);
  const gossip = gossipPayloadFromArticles(articles);
  const preds = readAllPredictionsMerged();
  const px = briefingPriceFromPrices(assetNorm, prices);
  const assetLabel = assetNorm === "GOLD" ? "Gold" : assetNorm;

  const ak = assetCooldownKey(assetLabel);
  const openForAsset = preds.filter(
    (p) => String(p.status || "").toLowerCase() === "open" && assetCooldownKey(p.asset) === ak
  );
  const recentAny = preds
    .filter((p) => assetCooldownKey(p.asset) === ak)
    .sort((a, b) => String(b.time || "").localeCompare(String(a.time || "")))
    .slice(0, 5);

  const hl = (articles || []).find((a) => headlineMentionsAsset(a.title, assetNorm));
  const reasonChain = [];
  if (px.ok && px.price != null) {
    reasonChain.push(`${assetLabel} last price on feed: ${px.price.toLocaleString("en-US", { maximumFractionDigits: 2 })} USD.`);
  } else {
    reasonChain.push(`${assetLabel}: ${px.note}`);
  }
  reasonChain.push(`Market Pulse intensity (headline keyword scan): ${gossip.intensity ?? 0}/10.`);
  if (gossip.spywords && gossip.spywords.length) {
    reasonChain.push(`Top related keywords in headlines: ${gossip.spywords.slice(0, 5).join(", ")}.`);
  }
  if (openForAsset.length) {
    reasonChain.push(`There ${openForAsset.length === 1 ? "is" : "are"} ${openForAsset.length} open Live Edge Test(s) for this asset bucket — review the test record, not as a recommendation.`);
  } else {
    reasonChain.push("No open Live Edge Test for this asset bucket right now.");
  }
  if (hl?.title) {
    reasonChain.push(`Recent headline touchpoint: ${String(hl.title).slice(0, 140)}${String(hl.title).length > 140 ? "…" : ""}`);
  }

  let bias = "neutral";
  let confidence = 52;
  const ch = px.changePct;
  if (mode === "momentum_check") {
    if (px.ok && ch != null) {
      if (ch <= -1.2) {
        bias = "watchful-to-stabilization";
        confidence = 58;
      } else if (ch >= 1.2) {
        bias = "watchful-to-extension";
        confidence = 58;
      }
    }
  } else if (mode === "sentiment_read") {
    const inten = Number(gossip.intensity) || 0;
    if (inten >= 6) {
      bias = "headline-heat-elevated";
      confidence = 62;
    } else if (inten <= 2) {
      bias = "headline-heat-quiet";
      confidence = 48;
    }
  } else if (mode === "risk_check") {
    bias = "risk-awareness";
    confidence = 55;
    if (openForAsset.length) confidence = Math.min(72, confidence + openForAsset.length * 4);
    if (px.ok && ch != null && Math.abs(ch) >= 2.5) confidence = Math.min(75, confidence + 6);
  }

  const riskWarnings = [
    "This is an observational briefing only — not an instruction to trade, size, or time entries.",
    "Feeds can lag or disagree; cross-check levels on your own tools if you act privately.",
  ];
  if ((Number(gossip.intensity) || 0) >= 5) {
    riskWarnings.push("Headline heat is elevated — event risk can move unrelated markets.");
  }
  if (!px.ok) {
    riskWarnings.push("Price context is incomplete — do not infer levels from this briefing alone.");
  }

  let marketState = "";
  if (!px.ok) {
    marketState = `${assetLabel}: ${px.note} Use other data (tests, headlines) as context only.`;
  } else if (ch == null) {
    marketState = `${assetLabel} is visible on the feed near ${px.price?.toLocaleString("en-US", { maximumFractionDigits: 2 })}; change % not available for this snapshot.`;
  } else {
    marketState = `${assetLabel} snapshot: last ≈ ${px.price?.toLocaleString("en-US", { maximumFractionDigits: 2 })} with a recent reference move of about ${ch >= 0 ? "+" : ""}${ch.toFixed(2)}%.`;
  }
  if (mode === "sentiment_read") {
    marketState += ` Sentiment read: headline-scan intensity ${gossip.intensity ?? 0}/10.`;
  }
  if (mode === "risk_check") {
    marketState += ` Risk check: ${openForAsset.length} open test(s) in this bucket; ${recentAny.filter((p) => String(p.status).toLowerCase() === "missed").length} recent row(s) show as missed in the last few lines — informational only.`;
  }

  const invalidationLevel =
    "Invalidate this read if a major headline shock or a sharp move in BTC (for macro-correlated names) contradicts the tone above within your chosen observation window.";

  const plainEnglishSummary =
    `Worth watching? ${assetLabel} is framed here as a monitoring question only. ` +
    (px.ok
      ? `Price data is present on the server feed; combine with your own discipline and the ${timeframe} window you selected.`
      : `Price data is missing on the current feed for this symbol — treat the rest as context, not as a trigger.`) +
    ` Modes are labels for how we weighted headlines vs price vs tests — not a performance promise.`;

  return {
    asset: assetNorm,
    timeframe,
    mode,
    marketState,
    bias,
    confidence,
    reasonChain,
    riskWarnings,
    observationWindow: timeframe,
    invalidationLevel,
    plainEnglishSummary,
    disclaimer,
    timestamp: ts,
  };
}

/* Claude Haiku (Messages API) — only for trial/raw when ANTHROPIC_API_KEY is set; free always local */
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "";
const CLAUDE_BRIEFING_MODEL = process.env.CLAUDE_BRIEFING_MODEL || "claude-3-5-haiku-20241022";
const CLAUDE_BRIEFING_TIMEOUT_MS = Number.isFinite(Number(process.env.CLAUDE_BRIEFING_TIMEOUT_MS))
  ? Math.min(20000, Math.max(4000, Number(process.env.CLAUDE_BRIEFING_TIMEOUT_MS)))
  : 9500;

function extractJsonObjectFromModelText(text) {
  const s = String(text || "").trim();
  if (!s) return null;
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const inner = fence ? fence[1].trim() : s;
  const start = inner.indexOf("{");
  const end = inner.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(inner.slice(start, end + 1));
  } catch {
    return null;
  }
}

function validateHaikuBriefingOverlay(parsed, assetNorm, timeframe, mode, localBriefing) {
  if (!parsed || typeof parsed !== "object") return null;
  if (String(parsed.asset || "").trim().toUpperCase() !== assetNorm) return null;
  if (String(parsed.timeframe || "").trim() !== timeframe) return null;
  if (String(parsed.mode || "").trim() !== mode) return null;

  const clip = (x, max) => String(x ?? "").trim().slice(0, max);
  const arrOfStr = (x, maxItems, maxEach) => {
    if (!Array.isArray(x)) return null;
    const out = [];
    for (const item of x.slice(0, maxItems)) {
      const line = clip(item, maxEach);
      if (line) out.push(line);
    }
    return out.length ? out : null;
  };

  const conf = Math.round(Number(parsed.confidence));
  const confidence = Number.isFinite(conf) ? Math.min(100, Math.max(0, conf)) : localBriefing.confidence;

  const reasonChain = arrOfStr(parsed.reasonChain, 12, 420) || localBriefing.reasonChain;
  const riskWarnings = arrOfStr(parsed.riskWarnings, 10, 420) || localBriefing.riskWarnings;

  const marketState = clip(parsed.marketState, 240) || localBriefing.marketState;
  const bias = clip(parsed.bias, 96) || localBriefing.bias;
  const observationWindow = clip(parsed.observationWindow, 64) || localBriefing.observationWindow;
  const invalidationLevel = clip(parsed.invalidationLevel, 480) || localBriefing.invalidationLevel;
  const plainEnglishSummary = clip(parsed.plainEnglishSummary, 1200) || localBriefing.plainEnglishSummary;

  return {
    asset: assetNorm,
    timeframe,
    mode,
    marketState,
    bias,
    confidence,
    reasonChain,
    riskWarnings,
    observationWindow,
    invalidationLevel,
    plainEnglishSummary,
    disclaimer: BRIEFING_REQUIRED_DISCLAIMER,
    timestamp: localBriefing.timestamp,
  };
}

async function tryClaudeHaikuBriefing(localBriefing, assetNorm, timeframe, mode) {
  if (!ANTHROPIC_API_KEY) return null;

  const system = [
    "You are SentoTrade Guru briefing writer.",
    "Output a single JSON object only (no markdown outside the JSON). No prose before or after.",
    "Educational market-readiness briefing only: observational language, risk awareness, invalidation framing.",
    "Never instruct the user to buy, sell, hold, size positions, or enter trades. No price targets as recommendations.",
    "You are given a draft briefing built from live feed facts. Refine clarity and structure; do not contradict stated numbers or feed facts.",
    "Required JSON keys: asset, timeframe, mode, marketState, bias, confidence (integer 0-100), reasonChain (array of strings), riskWarnings (array of strings), observationWindow, invalidationLevel, plainEnglishSummary, disclaimer.",
    `The disclaimer string must be exactly: ${JSON.stringify(BRIEFING_REQUIRED_DISCLAIMER)}`,
  ].join(" ");

  const userPayload = JSON.stringify({
    asset: assetNorm,
    timeframe,
    mode,
    localDraft: localBriefing,
  });

  const body = JSON.stringify({
    model: CLAUDE_BRIEFING_MODEL,
    max_tokens: 2048,
    temperature: 0.35,
    system,
    messages: [{ role: "user", content: userPayload }],
  });

  let res;
  try {
    res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body,
      signal: AbortSignal.timeout(CLAUDE_BRIEFING_TIMEOUT_MS),
    });
  } catch (e) {
    console.log("[GuruBriefing] Haiku request error:", e && e.message);
    return null;
  }

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    console.log("[GuruBriefing] Haiku HTTP", res.status, errText.slice(0, 200));
    return null;
  }

  let json;
  try {
    json = await res.json();
  } catch {
    return null;
  }

  const textBlock = json?.content?.find((c) => c && c.type === "text");
  const rawText = textBlock?.text ?? "";
  const parsed = extractJsonObjectFromModelText(rawText);
  const out = validateHaikuBriefingOverlay(parsed, assetNorm, timeframe, mode, localBriefing);
  if (!out) console.log("[GuruBriefing] Haiku parse/validate failed, using local");
  return out;
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

/* ─── Step 20a: Price shock monitor (short-window radar; source price-shock) ─── */
const PRICE_SNAPSHOTS_FILE = path.join(__dirname, "price_snapshots.jsonl");
const PRICE_SHOCK_POLL_MS = Number(process.env.PRICE_SHOCK_POLL_MS) || 120000;
const PRICE_SHOCK_COOLDOWN_MS = Number(process.env.PRICE_SHOCK_COOLDOWN_MS) || 25 * 60 * 1000;
const PRICE_SHOCK_TARGET_FRAC = 0.004;
const PRICE_SHOCK_STOP_FRAC = 0.003;
const SHOCK_SNAP_BUFFER_MAX = 45;

/** Ladder thresholds as % (e.g. 0.4 == 0.40% move). */
const SHOCK_LADDERS = {
  GOLD: { watch20: 0.25, press20: 0.4, severe20: 0.6, severe60: 1.0 },
  BTC: { watch20: 0.6, press20: 1.0, severe20: 1.5, severe60: 3.0 },
  ETH: { watch20: 0.65, press20: 1.05, severe20: 1.55, severe60: 3.2 },
  OIL: { watch20: 0.35, press20: 0.55, severe20: 0.85, severe60: 1.4 },
};

const SHOCK_PRICE_FIELDS = [
  { asset: "Gold", field: "g", priceKey: "gold", regimeKey: "GOLD" },
  { asset: "BTC", field: "b", priceKey: "btc", regimeKey: "BTC" },
  { asset: "ETH", field: "e", priceKey: "eth", regimeKey: "ETH" },
  { asset: "Oil", field: "o", priceKey: "oil", regimeKey: "OIL" },
];

let shockSnapBuffer = [];
let shockMonRunning = false;

function loadPriceShockBufferFromDisk() {
  try {
    if (!fs.existsSync(PRICE_SNAPSHOTS_FILE)) return;
    const raw = fs.readFileSync(PRICE_SNAPSHOTS_FILE, "utf8").trim();
    if (!raw) return;
    const lines = raw.split("\n").filter(Boolean);
    const tail = lines.slice(-SHOCK_SNAP_BUFFER_MAX);
    for (const ln of tail) {
      try {
        const o = JSON.parse(ln);
        if (o && o.t && ["g", "b", "e", "o"].every((k) => Number.isFinite(Number(o[k])))) shockSnapBuffer.push(o);
      } catch {
        /* skip bad line */
      }
    }
    if (shockSnapBuffer.length) console.log("[PriceShock] Loaded", shockSnapBuffer.length, "snapshots from disk");
  } catch (e) {
    console.log("[PriceShock] load buffer:", e.message);
  }
}

/** Newest snapshot whose age is at least `minAgeMs` (staleness floor for baseline price). */
function findRefSnapForAge(buffer, nowMs, minAgeMs) {
  let best = null;
  let bestAge = Infinity;
  for (let i = buffer.length - 1; i >= 0; i--) {
    const s = buffer[i];
    const ts = Date.parse(s.t);
    if (!Number.isFinite(ts)) continue;
    const age = nowMs - ts;
    if (age < minAgeMs) continue;
    if (age < bestAge) {
      bestAge = age;
      best = s;
    }
  }
  return best;
}

function pctMoveSince(cur, oldPx) {
  if (!Number.isFinite(cur) || !Number.isFinite(oldPx) || oldPx === 0) return null;
  return ((cur - oldPx) / oldPx) * 100;
}

function priceShockCooldownOk(asset, call, merged, nowMs) {
  const k = assetCooldownKey(asset);
  const c = String(call || "").toLowerCase() === "short" ? "short" : "long";
  const cutoff = nowMs - PRICE_SHOCK_COOLDOWN_MS;
  for (const p of merged) {
    if (String(p.source || "").toLowerCase() !== "price-shock") continue;
    if (assetCooldownKey(p.asset) !== k) continue;
    if (String(p.call || "").toLowerCase() !== c) continue;
    const t = Date.parse(p.time || p.ts || "") || 0;
    if (t >= cutoff) return false;
  }
  return true;
}

function classifyShockMove(m20, m60, ladder) {
  const a20 = m20 != null && Number.isFinite(m20) ? Math.abs(m20) : 0;
  const a60 = m60 != null && Number.isFinite(m60) ? Math.abs(m60) : 0;
  const severe = a60 >= ladder.severe60 || a20 >= ladder.severe20;
  const pressure = m20 != null && Number.isFinite(m20) && a20 >= ladder.press20;
  const watch = m20 != null && Number.isFinite(m20) && a20 >= ladder.watch20;
  if (!severe && !pressure && !watch) return null;

  let tier;
  if (severe) tier = "severe";
  else if (pressure) tier = "pressure";
  else tier = "watch";

  const severeFrom60 = a60 >= ladder.severe60 && a20 < ladder.severe20;
  const windowLabel = tier === "severe" && severeFrom60 ? "60m" : "20m";

  let displayMove;
  if (tier === "severe" && severeFrom60 && m60 != null && Number.isFinite(m60)) displayMove = m60;
  else if (m20 != null && Number.isFinite(m20)) displayMove = m20;
  else if (m60 != null && Number.isFinite(m60)) displayMove = m60;
  else return null;

  const call = displayMove >= 0 ? "Long" : "Short";
  return { tier, windowLabel, displayMove, call };
}

function buildPriceShockRow(meta) {
  const { asset, call, entry, tier, windowLabel, displayMove, headlineMatch } = meta;
  if (!call || entry == null || !Number.isFinite(entry)) return null;
  const isShort = call === "Short";
  const targetFrac = PRICE_SHOCK_TARGET_FRAC;
  const target = entry * (isShort ? (1 - targetFrac) : (1 + targetFrac));
  const id =
    "ps_" +
    Date.now() +
    "_" +
    assetCooldownKey(asset).toLowerCase() +
    "_" +
    Math.random().toString(36).slice(2, 8);
  const now = new Date().toISOString();
  const why =
    `[Price shock ${tier}/${windowLabel}] ${displayMove >= 0 ? "+" : ""}${displayMove.toFixed(2)}% — ` +
    (headlineMatch ? "headline-assisted lane" : "no headline dependency; short-window gross move vs snapshot");
  return {
    id,
    time: now,
    source: "price-shock",
    asset,
    call,
    entry,
    target: target.toFixed(2),
    targetPct: isShort ? `-${(targetFrac * 100).toFixed(1)}%` : `+${(targetFrac * 100).toFixed(1)}%`,
    timeframe: windowLabel,
    horizon: windowLabel,
    stopLossFrac: PRICE_SHOCK_STOP_FRAC,
    why,
    status: "open",
    outcome: "—",
    shockSeverity: tier,
    shockMovePct: Number(Number(displayMove).toFixed(4)),
    shockHeadlineMatch: !!headlineMatch,
  };
}

async function runPriceShockMonitor() {
  if (shockMonRunning) return;
  shockMonRunning = true;
  try {
    const prices = await fetchPrices();
    if (!prices) return;
    const g = prices.gold,
      b = prices.btc,
      e = prices.eth,
      o = prices.oil;
    if (![g, b, e, o].every((x) => Number.isFinite(x))) {
      console.log("[PriceShock] skip tick — incomplete spot row");
      return;
    }
    const nowMs = Date.now();
    const snap = { t: new Date().toISOString(), g, b, e, o };
    try {
      fs.appendFileSync(PRICE_SNAPSHOTS_FILE, JSON.stringify(snap) + "\n");
    } catch (e) {
      console.log("[PriceShock] cannot append snapshot:", e.message);
      return;
    }
    shockSnapBuffer.push(snap);
    if (shockSnapBuffer.length > SHOCK_SNAP_BUFFER_MAX) {
      shockSnapBuffer.splice(0, shockSnapBuffer.length - SHOCK_SNAP_BUFFER_MAX);
    }

    if (shockSnapBuffer.length < 3) return;

    const ref20 = findRefSnapForAge(shockSnapBuffer, nowMs, 18 * 60 * 1000);
    const ref60 = findRefSnapForAge(shockSnapBuffer, nowMs, 55 * 60 * 1000);
    if (!ref20) return;

    const merged = readAllPredictionsMerged();
    const newestFirst = merged.slice().sort((a, b) => String(b.time || "").localeCompare(String(a.time || "")));
    const openTests = new Set(
      newestFirst
        .filter((p) => String(p.status || "").toLowerCase() === "open")
        .map((p) => assetCooldownKey(p.asset) + "|" + String(p.call || "").toLowerCase())
    );
    const batch = [];

    for (const { asset, field, priceKey, regimeKey } of SHOCK_PRICE_FIELDS) {
      const cur = prices[priceKey];
      if (!Number.isFinite(cur)) continue;
      const p20 = ref20 && Number.isFinite(Number(ref20[field])) ? Number(ref20[field]) : null;
      const p60 = ref60 && Number.isFinite(Number(ref60[field])) ? Number(ref60[field]) : null;
      const m20 = p20 != null ? pctMoveSince(cur, p20) : null;
      const m60 = p60 != null ? pctMoveSince(cur, p60) : null;
      const ladder = SHOCK_LADDERS[regimeKey];
      if (!ladder) continue;
      if (m20 == null) continue;

      const cls = classifyShockMove(m20, m60, ladder);
      if (!cls) continue;

      const openKey = assetCooldownKey(asset) + "|" + String(cls.call).toLowerCase();
      if (openTests.has(openKey)) {
        console.log(`[PriceShock] SKIP ${asset} ${cls.call} — open test exists`);
        continue;
      }
      if (!priceShockCooldownOk(asset, cls.call, merged, nowMs)) continue;

      const row = buildPriceShockRow({
        asset,
        call: cls.call,
        entry: cur,
        tier: cls.tier,
        windowLabel: cls.windowLabel,
        displayMove: cls.displayMove,
        headlineMatch: false,
      });
      if (!row) continue;
      batch.push(row);
      merged.push(row);
      openTests.add(openKey);
      console.log(`[PriceShock] ${cls.tier} ${asset} ${cls.call} ${cls.displayMove.toFixed(2)}% (${cls.windowLabel})`);
    }
    if (batch.length) savePredictions(batch);
  } catch (e) {
    console.log("[PriceShock]", e && e.message);
  } finally {
    shockMonRunning = false;
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
      if (String(p.source || "").toLowerCase() === "catalyst-watch") continue;
      if (String(p.status || "").toLowerCase() === "watching") continue;
      if (String(p.call || "").trim().toLowerCase() === "watch") continue;
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
  const throttled = throttleSignalsByAsset(raw, SIGNAL_ASSET_COOLDOWN_MS);
  if (raw.length && !throttled.length) {
    console.log("[Signals] Throttled — each asset already has a prediction within", Math.round(SIGNAL_ASSET_COOLDOWN_MS / 60000), "min");
  }
  const newestFirst = readAllPredictionsMerged().sort((a, b) => String(b.time || "").localeCompare(String(a.time || "")));

  /** OpenTestGate: skip if an open test for the same normalised asset+call already exists. */
  const openTests = new Set(
    newestFirst
      .filter(p => String(p.status || "").toLowerCase() === "open")
      .map(p => assetCooldownKey(p.asset) + "|" + String(p.call || "").toLowerCase())
  );

  const signals = [];
  for (const s of throttled) {
    const openKey = assetCooldownKey(s.asset) + "|" + String(s.call || "").toLowerCase();
    if (openTests.has(openKey)) {
      console.log(`[OpenTestGate] SKIP ${s.asset} ${s.call} — open test already exists`);
      continue;
    }
    if (!(await checkTrendFilter(s.asset, s.call))) continue;
    if (!checkCooldownGate(s.asset, s.call, newestFirst)) continue;
    signals.push(s);
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

  if (pathOnly === "/api/guru/briefing" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", async () => {
      res.setHeader("Content-Type", "application/json");
      try {
        const parsed = JSON.parse(body || "{}");
        const assetIn = normalizeBriefingAssetInput(parsed.asset);
        const timeframe = String(parsed.timeframe || "").trim();
        const mode = String(parsed.mode || "").trim();
        if (!BRIEFING_ALLOWED_ASSETS.includes(assetIn)) {
          res.writeHead(400).end(JSON.stringify({ error: "unsupported_asset", allowed: BRIEFING_ALLOWED_ASSETS }));
          return;
        }
        if (!BRIEFING_TIMEFRAMES.has(timeframe)) {
          res.writeHead(400).end(JSON.stringify({ error: "unsupported_timeframe", allowed: [...BRIEFING_TIMEFRAMES] }));
          return;
        }
        if (!BRIEFING_MODES.has(mode)) {
          res.writeHead(400).end(JSON.stringify({ error: "unsupported_mode", allowed: [...BRIEFING_MODES] }));
          return;
        }
        const clientId = sanitizeBriefingClientId(parsed.clientId);
        if (!clientId) {
          res.writeHead(400).end(
            JSON.stringify({
              error: "clientId_required",
              message: "Missing or invalid clientId. Reload the page so the app can create one.",
            })
          );
          return;
        }
        const plan = normalizeBriefingPlan(parsed.plan);
        const cap = guruBriefingDailyCap(plan);
        const quotaDate = guruQuotaDateUtc();
        const used = countGuruBriefingsToday(clientId, quotaDate);
        if (used >= cap) {
          res.writeHead(429).end(
            JSON.stringify({
              error: "guru_daily_limit",
              limit: cap,
              plan,
              message: `Daily Guru briefing limit reached (${cap} for ${plan} tier). Try again tomorrow (UTC).`,
            })
          );
          return;
        }

        const localBriefing = await buildLocalBriefing(assetIn, timeframe, mode);
        let briefing = localBriefing;
        let briefingSource = "local";
        const allowClaude = (plan === "trial" || plan === "raw") && !!ANTHROPIC_API_KEY;
        if (allowClaude) {
          const ai = await tryClaudeHaikuBriefing(localBriefing, assetIn, timeframe, mode);
          if (ai) {
            briefing = ai;
            briefingSource = "claude_haiku";
          }
        }
        appendGuruQuota({
          t: new Date().toISOString(),
          clientId,
          plan,
          date: quotaDate,
          source: briefingSource,
        });
        const logLine = {
          time: briefing.timestamp,
          asset: assetIn,
          timeframe,
          mode,
          bias: briefing.bias,
          confidence: briefing.confidence,
          marketState: String(briefing.marketState || "").slice(0, 240),
          source: briefingSource,
          clientId,
          plan,
        };
        fs.appendFileSync(GURU_BRIEFINGS_FILE, JSON.stringify(logLine) + "\n");
        res.writeHead(200).end(JSON.stringify({ briefing }));
      } catch {
        res.writeHead(400).end(JSON.stringify({ error: "invalid_json" }));
      }
    });
    return;
  }

  if (pathOnly.startsWith("/api/flow/btc") || pathOnly.startsWith("/api/flow/eth")) return res.writeHead(200, {"Content-Type": "application/json"}).end(JSON.stringify({ status: "connect_bitquery", to_exch: { count: 0, usd: 0 }, from_exch: { count: 0, usd: 0 } }));
  if (pathOnly.startsWith("/api/stable/usdt-eth")) return res.writeHead(200, {"Content-Type": "application/json"}).end(JSON.stringify({ status: "connect_etherscan", mints: { count: 0, usd: 0 }, burns: { count: 0, usd: 0 } }));
  if (pathOnly === "/api/watchdog/summary") return res.writeHead(200, {"Content-Type": "application/json"}).end("[]");

  if (pathOnly === "/api/onboarding" && req.method === "POST") {
    let body = "";
    req.on("data", chunk => body += chunk);
    req.on("end", () => {
      try {
        const { email, telegram, plan } = JSON.parse(body);
        const ip = String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "").split(",")[0].trim();
        const record = {
          time: new Date().toISOString(),
          email:    String(email    || "").slice(0, 200),
          telegram: String(telegram || "").replace(/^@/, "").slice(0, 100),
          plan:     String(plan     || "").slice(0, 50),
          ip,
        };
        fs.appendFileSync(ONBOARDING_FILE, JSON.stringify(record) + "\n");
        logStat("onboarding", { email: record.email, telegram: record.telegram, plan: record.plan });
        sendTelegramAlert(
          `🎉 <b>New Onboarding</b>\n\nPlan: ${record.plan || "?"}\nEmail: ${record.email || "?"}\nTelegram: @${record.telegram || "?"}`
        ).catch(() => {});
        res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify({ ok: true }));
      } catch {
        res.writeHead(400, { "Content-Type": "application/json" }).end(JSON.stringify({ error: "Invalid JSON" }));
      }
    });
    return;
  }

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
  fs.readFile(filePath, (err, c) => {
    if (err) { res.writeHead(404, {"Content-Type": "text/plain"}); return res.end("Not found"); }
    // Hashed assets (/assets/*.js, /assets/*.css) are safe to cache forever.
    // index.html and other entry points must revalidate on every request.
    const isHashed = pathOnly.startsWith("/assets/");
    const cacheControl = isHashed
      ? "public, max-age=31536000, immutable"
      : "no-cache, must-revalidate";
    res.writeHead(200, { "Content-Type": mime[ext] || "application/octet-stream", "Cache-Control": cacheControl });
    res.end(c);
  });
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

loadPriceShockBufferFromDisk();
setTimeout(() => {
  runPriceShockMonitor().catch(() => {});
}, 8000);
setInterval(() => {
  runPriceShockMonitor().catch(() => {});
}, PRICE_SHOCK_POLL_MS);
