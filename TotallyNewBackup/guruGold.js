// guruGold.js — real Gold Event Pulse (news + macro). Caches 60s.
const Parser = require("rss-parser");
const parser = new Parser();

// naive Yahoo quotes helper
async function q(symbol) {
  const r = await fetch(
    "https://query1.finance.yahoo.com/v7/finance/quote?symbols=" +
      encodeURIComponent(symbol)
  );
  const j = await r.json();
  const x = j.quoteResponse.result[0];
  return { price: x.regularMarketPrice, change: x.regularMarketChangePercent };
}

async function getMacro() {
  const [dxy, tnx, vix] = await Promise.all([q("DX-Y.NYB"), q("^TNX"), q("^VIX")]);
  return { dxy, tnx, vix };
}

async function getNews() {
  const feeds = [
    "https://feeds.reuters.com/reuters/worldNews",
    "https://feeds.reuters.com/reuters/businessNews",
    "https://apnews.com/rss"
  ];
  const now = Date.now();
  const items = [];
  for (const url of feeds) {
    try {
      const feed = await parser.parseURL(url);
      for (const it of feed.items || []) {
        const t = new Date(it.isoDate || it.pubDate || now).getTime();
        if (now - t <= 60 * 60 * 1000) items.push((it.title || "").toLowerCase());
      }
    } catch {}
  }
  return items;
}

function scoreNews(headlines) {
  const bull = /ceasefire|truce|peace|rate cut|cuts rates|weak data|central bank.*buy|recession|slowdown/i;
  const bear = /attack|strike|missile|clash|sanction|escalat|conflict|hawkish|rate hike|hot inflation|strong jobs/i;
  let pos = 0, neg = 0;
  for (const h of headlines) {
    if (bull.test(h)) pos++;
    if (bear.test(h)) neg++;
  }
  return { pos, neg, total: headlines.length };
}

function macroVote(m) {
  const up = (x) => x && x.change > 0;
  const down = (x) => x && x.change < 0;
  const bulls = (down(m.dxy) ? 1 : 0) + (down(m.tnx) ? 1 : 0) + (up(m.vix) ? 1 : 0);
  const bears = (up(m.dxy) ? 1 : 0) + (up(m.tnx) ? 1 : 0) + (down(m.vix) ? 1 : 0);
  return { bulls, bears };
}

let cache = { ts: 0, payload: null };

async function compute() {
  const [macro, headlines] = await Promise.all([getMacro(), getNews()]);
  const ns = scoreNews(headlines);
  const mv = macroVote(macro);

  const newsBull = ns.pos >= 2 && ns.pos > ns.neg;
  const newsBear = ns.neg >= 2 && ns.neg > ns.pos;
  const macroBull = mv.bulls >= 2;
  const macroBear = mv.bears >= 2;

  let bias = "watch", conf = 54, why = "mixed headlines; macro neutral";
  if (newsBull && macroBull) {
    bias = "up";
    conf = Math.min(90, 60 + (ns.pos - ns.neg) * 4 + (mv.bulls - 1) * 6);
    why = "risk headlines + DXY↓/10Y↓/VIX↑";
  } else if (newsBear && macroBear) {
    bias = "down";
    conf = Math.min(90, 60 + (ns.neg - ns.pos) * 4 + (mv.bears - 1) * 6);
    why = "de-escalation/strong data + DXY↑/10Y↑/VIX↓";
  }

  return {
    bias,                           // "up" | "down" | "watch"
    confidence: Math.round(conf),   // 0-100
    window: "4–24h",
    why,
    macro: { dxy: macro.dxy.change, tnx: macro.tnx.change, vix: macro.vix.change },
    news: { last_hour: headlines.length, pos: ns.pos, neg: ns.neg }
  };
}

module.exports = (app) => {
  app.get("/api/guru/gold-status", async (req, res) => {
    try {
      if (Date.now() - cache.ts < 60_000 && cache.payload) return res.json(cache.payload);
      const payload = await compute();
      cache = { ts: Date.now(), payload };
      res.json(payload);
    } catch (e) {
      // degraded but never breaks the UI
      res.json({ bias: "watch", confidence: 52, window: "4–24h", why: "degraded" });
    }
  });
};
