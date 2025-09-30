// liveWhales.js — polls mempool, keeps 50 big transfers, serves /api/live/whales
module.exports = function liveWhales(app) {
  const RING_SIZE = 50;
  const POLL_MS = 30_000;  // 30s
  const MIN_BTC = Number(process.env.WHALE_MIN_BTC || 200);
  const BASE = process.env.PUBLIC_BASE || "https://glasstrade.app";

  const buf = [];          // newest-first
  const seen = new Set();  // tx dedupe
  let lastUpdated = 0;
  let lastPriceUSD = null;

  const haveFetch = typeof fetch === "function";
  const doFetch = (...a) => haveFetch ? fetch(...a) : import("node-fetch").then(m => m.default(...a));

  async function fetchBTCUSD() {
    try {
      const r = await doFetch(`${BASE}/api/cg/api/v3/simple/price?ids=bitcoin&vs_currencies=usd`);
      const j = await r.json();
      lastPriceUSD = j?.bitcoin?.usd ?? null;
    } catch {}
  }

  function pushItem(it) {
    if (seen.has(it.hash)) return;
    seen.add(it.hash);
    buf.unshift(it);
    if (buf.length > RING_SIZE) buf.length = RING_SIZE;
    if (seen.size > 2000) {
      const keep = new Set(buf.map(x => x.hash));
      for (const h of Array.from(seen)) if (!keep.has(h)) seen.delete(h);
    }
  }

  async function poll() {
    try {
      if (!lastPriceUSD || Date.now() - lastUpdated > 5 * 60_000) await fetchBTCUSD();

      const url = "https://blockchain.info/unconfirmed-transactions?format=json&cors=true";
      const r = await doFetch(url, { headers: { "User-Agent": "glasstrade-whales/1.0" } });
      const j = await r.json();
      const arr = Array.isArray(j?.txs) ? j.txs : [];

      for (const tx of arr) {
        const sat = (tx.out || []).reduce((s, o) => s + (o?.value || 0), 0);
        const btc = sat / 1e8;
        if (btc >= MIN_BTC) {
          const usd = lastPriceUSD ? Math.round(btc * lastPriceUSD) : null;
          pushItem({
            hash: tx.hash,
            btc: Number(btc.toFixed(2)),
            usd,
            outs: (tx.out || []).length,
            ins: (tx.inputs || []).length,
            seenAt: new Date().toISOString(),
          });
        }
      }
      lastUpdated = Date.now();
    } catch {}
  }

  // start
  poll();
  setInterval(poll, POLL_MS);

  // API
  app.get("/api/live/whales", (_req, res) => {
    res.json({
      updatedAt: new Date(lastUpdated || Date.now()).toISOString(),
      minBtc: MIN_BTC,
      items: buf,
    });
  });
};
