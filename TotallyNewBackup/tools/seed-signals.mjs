/* Seed recent signals from hourly PAXG (gold proxy) prices.
   Rule: if 1h return > +0.30% => bullish; if < -0.30% => bearish.
   Evaluate after 3h; threshold 70 bps. Writes /var/lib/glasstrade/signals.json */
const fs = await import('fs');
const fetchJson = async (u) => (await fetch(u)).json();

const DAYS = 30, HORIZ_H = 3, THRESH_BPS = 70;
const url = `https://glasstrade.app/api/cg/api/v3/coins/pax-gold/market_chart?vs_currency=usd&days=${DAYS}&interval=hourly`;
const mc = await fetchJson(url);                // { prices: [[ts,price], ...] }
const px = (mc.prices||[]).map(([t,p])=>({t:Math.floor(t/1000), p}));

const signals = [];
for (let i=1; i<px.length; i++) {
  const r1h = (px[i].p/px[i-1].p - 1);         // 1h momentum
  let direction = null;
  if (r1h > +0.003) direction = 'bullish';
  else if (r1h < -0.003) direction = 'bearish';
  if (!direction) continue;

  const j = i + HORIZ_H;                        // close 3h later
  if (j >= px.length) break;

  const open = px[i].p, close = px[j].p;
  const sign = direction === 'bullish' ? 1 : -1;
  const pnl_bps = Math.round(sign * (close/open - 1) * 10000);
  const hit = pnl_bps >= THRESH_BPS;

  signals.push({
    id: new Date(px[i].t*1e3).toISOString() + `_xau_${direction}_momo_v0`,
    asset: "XAUUSD",
    direction,
    rule_id: "momo1h+eval3h_v0",
    why: "Price momentum bootstrap (temporary until live writer)",
    horizon_h: HORIZ_H,
    threshold_bps: THRESH_BPS,
    t_open: new Date(px[i].t*1e3).toISOString(),
    price_open: +open.toFixed(2),
    t_close: new Date(px[j].t*1e3).toISOString(),
    price_close: +close.toFixed(2),
    pnl_bps,
    hit
  });
}

// keep last ~80 for UI
signals.sort((a,b)=> new Date(b.t_open)-new Date(a.t_open));
const out = JSON.stringify(signals.slice(0,80), null, 2);
fs.writeFileSync('/var/lib/glasstrade/signals.json', out);
console.log(`Wrote ${signals.length} signals`);
