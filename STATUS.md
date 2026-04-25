# Sentotrade Status Legend — v2.0 Production

## 🔗 Live URL
**https://sentotrade.io:8443**

---

## ✅ FULLY LIVE — Real Data Flowing

| Feature | Data Source | Update Freq | Status |
|---------|-------------|-------------|--------|
| ETH Price | CoinGecko API | ~30s | ✅ Live |
| BNB Price | CoinGecko API | ~30s | ✅ Live |
| BTC Price | CoinGecko API | ~30s | ✅ Live |
| Gold Price | Live API | ~30s | ✅ Live |
| Oil Price | Yahoo Finance | ~60s | ✅ Live |
| Forex (EUR/USD etc) | open.er-api.com | ~60s | ✅ Live |
| Market Tickers | Polygon.io API | ~60s | ✅ Live |
| Business Ticker | Live feed | ~60s | ✅ Live |
| Indices (S&P, Nasdaq, Dow, Russell) | Yahoo Finance v8 | Page load | ✅ Live |
| Pro Dashboard Bias Score | CoinGecko BTC + Gold + News count | ~60s | ✅ Live |
| Guru Prices (BTC/ETH/SOL/BNB/XRP) | CoinGecko | ~60s | ✅ Live |
| Predictions Tracker | User-entered, browser-stored | Manual | ✅ Live |

---

## 🟡 BIN READY — Infrastructure In Place, Needs API Key or Connection

| Feature | What's Ready | What's Needed | ETA |
|---------|--------------|---------------|-----|
| **News Headlines** | `/api/news` endpoint exists. Code tries NewsCatcher → GDELT fallback | NewsData.io free key OR NewsCatcher server fix | 2 min |
| **Watchdog Themes** | Theme engine scans headlines, scores 5 categories, assigns asset impacts | News feed to scan | When news works |
| **Guru AI Read** | Generates insight from live prices + headlines | Headlines flowing | When news works |
| **Whale Alerts** | `WhaleTransfersLive` component, `fetchWhaleData.ts` service | BitQuery GraphQL query + token | 1 session |
| **Exchange Flow Pills** | `/api/flow/btc` and `/api/flow/eth` endpoints exist | BitQuery backend query | 1 session |
| **USDT Mint/Burn** | `/api/stable/usdt-eth` endpoint exists | Etherscan API key | 1 session |
| **Signals Table** | `/api/signal/recent` endpoint, table UI ready | Signal generation logic (manual or automated) | 1 session |

---

## 🟠 HONEST EMPTY STATES — No Fake Data

| Page | What Shows Instead of Fakes |
|------|----------------------------|
| **Watchdog** | "No themes detected. News feed may be empty." + empty radar |
| **Guru** | "Live whale tracking is not connected." + "BitQuery required" badge |
| **Pro Dashboard Signals** | "No signals generated yet. Signal engine needs backend wiring." |
| **Predictions** | "No predictions tracked yet. Click Add Prediction to start." |
| **Analog Scenarios** | Instructions to drop images in `public/analogs/` + create manifest |

---

## 🔐 API Keys Configured

| Key | Location | Status |
|-----|----------|--------|
| Polygon (Massive) | `.env` VITE_POLYGON_KEY | ✅ Active |
| BitQuery | `.env` VITE_BITQUERY_TOKEN | ✅ Active (not yet wired to queries) |
| NewsCatcher (RapidAPI) | `.env` VITE_NEWSCATCHER_KEY | ✅ Active (their server down) |

---

## 📦 Git Status

- **Local repo**: `/home/vmbsinyo/glasstrade-sandbox` (server runtime)
- **Source repo**: Commit `a1ad95d` — "Sentotrade v2.0 - production build with live data feeds"
- **Files**: 76 source files, 9,527 lines
- **GitHub**: Push to `Hugorello123/GlassReal` or new repo

---

## 🚀 Next Session Checklist

1. [ ] Get NewsData.io free key → wire into `/api/news`
2. [ ] Wire BitQuery GraphQL → `/api/flow/btc` + `/api/flow/eth`
3. [ ] Add Etherscan key → `/api/stable/usdt-eth`
4. [ ] Build signal generation logic → `/api/signal/recent`
5. [ ] Add OpenAI/Claude key → real Guru AI insights
6. [ ] Add email alerts / Telegram bot
7. [ ] Port 80/443 redirect (remove `:8443` from URL)

---

*Sentotrade • experimental tools — not investment advice.*
