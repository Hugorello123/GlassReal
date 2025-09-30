import express from "express";
import liveWhales from "./liveWhales.js";

const app = express();

app.get("/api/health", (_req, res) => res.json({ ok: true, ts: Date.now() }));
liveWhales(app);

const PORT = 5000;
app.listen(PORT, () => console.log(`API up on :${PORT}`));
