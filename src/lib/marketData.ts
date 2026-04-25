// src/lib/marketData.ts — live market data via Polygon
import { POLYGON_KEY } from "./config";

const HAS_KEY = !!POLYGON_KEY;

export async function fetchMarketData(ticker: string) {
  if (!HAS_KEY) return null;
  try {
    const today = new Date().toISOString().slice(0, 10);
    const res = await fetch(
      `https://api.polygon.io/v2/aggs/ticker/${ticker}/range/1/minute/${today}/${today}?adjusted=true&sort=desc&limit=1&apiKey=${POLYGON_KEY}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data?.results?.[0]?.c ?? null;
  } catch {
    return null;
  }
}

export async function fetchPrevClose(ticker: string) {
  if (!HAS_KEY) return null;
  try {
    const res = await fetch(
      `https://api.polygon.io/v2/aggs/ticker/${ticker}/prev?adjusted=true&apiKey=${POLYGON_KEY}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data?.results?.[0] ?? null;
  } catch {
    return null;
  }
}

export async function fetchFxRate(base: string, quote: string) {
  if (!HAS_KEY) return null;
  try {
    const res = await fetch(
      `https://api.polygon.io/v1/last/forex/${base}/${quote}?apiKey=${POLYGON_KEY}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data?.last?.price ?? null;
  } catch {
    return null;
  }
}
