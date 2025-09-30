import axios from "axios";

/**
 * Very light "whale" feed:
 * - Uses blockchain.info unconfirmed tx feed (free, no key)
 * - Flags txs with >= 200 BTC total output as "whales"
 * - Returns top 10 recent
 */
export default function (app) {
  app.get("/api/live/whales", async (_req, res) => {
    try {
      const r = await axios.get(
        "https://blockchain.info/unconfirmed-transactions?format=json&cors=true",
        { timeout: 8000 }
      );
      const txs = Array.isArray(r.data?.txs) ? r.data.txs : [];

      const items = txs
        .map((tx) => {
          const totalSats = (tx.out || []).reduce((s, o) => s + (o.value || 0), 0);
          const totalBTC = totalSats / 1e8;
          return {
            hash: tx.hash,
            time: tx.time,
            total_btc: +totalBTC.toFixed(4),
          };
        })
        .filter((t) => t.total_btc >= 200) // whale threshold
        .slice(0, 10);

      res.json({ ts: Date.now(), count: items.length, items });
    } catch (e) {
      res.json({ ts: Date.now(), count: 0, items: [], error: "source_unavailable" });
    }
  });
}
