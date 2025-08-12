// server/market.mjs
import http from "node:http";

const PORT = process.env.PORT || 8080;
const API = "https://api.polygon.io";
const KEY =
  process.env.POLYGON_API_KEY ||
  process.env.VITE_POLYGON_API_KEY ||
  "";

const pause = (ms) => new Promise((r) => setTimeout(r, ms));
async function getJSON(url) {
  const r = await fetch(url, { headers: { Accept: "application/json" } });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

function fmt(n) {
  return Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

async function priceStock(t) {
  // 1) prev close
  try {
    const j = await getJSON(
      `${API}/v2/aggs/ticker/${encodeURIComponent(t)}/prev?adjusted=true&apiKey=${KEY}`
    );
    const res = Array.isArray(j?.results) ? j.results[0] : null;
    const c = typeof res?.c === "number" ? res.c : null;
    if (c) return c;
  } catch {}
  // 2) v3 last trade
  try {
    const j = await getJSON(
      `${API}/v3/last_trade/stocks/${encodeURIComponent(t)}?apiKey=${KEY}`
    );
    const p = typeof j?.results?.p === "number" ? j.results.p : null;
    if (p) return p;
  } catch {}
  // 3) v2 last trade (two shapes)
  try {
    const j = await getJSON(
      `${API}/v2/last/trade/${encodeURIComponent(t)}?apiKey=${KEY}`
    );
    const p1 = typeof j?.results?.p === "number" ? j.results.p : null;
    const p2 = typeof j?.last?.price === "number" ? j.last.price : null;
    const p = p1 ?? p2;
    if (p) return p;
  } catch {}
  // 4) snapshot
  try {
    const j = await getJSON(
      `${API}/v2/snapshot/locale/us/markets/stocks/tickers/${encodeURIComponent(
        t
      )}?apiKey=${KEY}`
    );
    const dayC =
      typeof j?.ticker?.day?.c === "number"
        ? j.ticker.day.c
        : typeof j?.day?.c === "number"
        ? j.day.c
        : null;
    const lastP =
      typeof j?.ticker?.lastTrade?.p === "number"
        ? j.ticker.lastTrade.p
        : typeof j?.lastTrade?.p === "number"
        ? j.lastTrade.p
        : null;
    const val = dayC ?? lastP;
    if (typeof val === "number") return val;
  } catch {}

  return null;
}

async function priceIndexNDX() {
  try {
    const j = await getJSON(
      `${API}/v2/aggs/ticker/I:NDX/prev?adjusted=true&apiKey=${KEY}`
    );
    const res = Array.isArray(j?.results) ? j.results[0] : null;
    const c = typeof res?.c === "number" ? res.c : null;
    return c ?? null;
  } catch {
    return null;
  }
}

async function buildPayload() {
  const indices = {};
  const equity = {};

  indices.NDX = await priceIndexNDX();
  await pause(200);
  indices.SPX = await priceStock("SPY"); // proxy
  await pause(200);
  indices.DJI = await priceStock("DIA"); // proxy
  await pause(200);
  indices.RUT = await priceStock("IWM"); // proxy
  await pause(200);

  equity.AAPL = await priceStock("AAPL");
  await pause(200);
  equity.NVDA = await priceStock("NVDA");
  await pause(200);
  equity.TSLA = await priceStock("TSLA");

  return {
    asOf: new Date().toISOString(),
    indices,
    equity,
    source: "polygon",
  };
}

let cache = { data: null, ts: 0 };
const TTL = 60 * 1000;

function sendJson(res, code, obj) {
  res.statusCode = code;
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(obj));
}

const server = http.createServer(async (req, res) => {
  if (req.url?.startsWith("/api/market")) {
    const now = Date.now();
    if (cache.data && now - cache.ts < TTL) {
      return sendJson(res, 200, { ...cache.data, cached: true });
    }
    try {
      const data = await buildPayload();
      cache = { data, ts: Date.now() };
      return sendJson(res, 200, { ...data, cached: false });
    } catch (e) {
      if (cache.data) {
        return sendJson(res, 200, {
          ...cache.data,
          cached: true,
          error: "live fetch failed",
        });
      }
      return sendJson(res, 503, { error: "unavailable" });
    }
  }

  if (req.url === "/healthz") return res.end("ok");

  res.statusCode = 404;
  res.end("not found");
});

server.listen(PORT, () =>
  console.log(`market api on http://localhost:${PORT}`)
);
