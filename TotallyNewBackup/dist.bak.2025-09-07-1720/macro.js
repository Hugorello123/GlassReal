(() => {
  const POLL_MS = 120000;

  const TIPS = {
    "2Y": "US 2-year yield • Near-term Fed policy proxy. Up=tighter; down=dovish.",
    "5Y": "US 5-year yield • Mid-curve context between policy (2Y) and long end (10Y).",
    "10Y": "US 10-year yield • Growth/inflation & real-rate proxy. Up often bearish gold.",
    "Curve (10Y–2Y)": "Yield curve slope. 2Y↓ steepening=dovish; 10Y↑ steepening=reflation.",
    "VIX": "Equity volatility. High=risk-off (gold supportive); Low=risk-on."
  };

  function ensureRoot() {
    const pin = document.getElementById("macro-pins");
    if (pin) return pin;
    let r = document.getElementById("macro-root");
    if (!r) {
      r = document.createElement("div");
      r.id = "macro-root";
      r.style.cssText = "margin:10px 0 6px;display:flex;flex-wrap:wrap;gap:8px;align-items:center";
      document.body.insertBefore(r, document.body.firstElementChild);
    }
    return r;
  }

  const chip = (k, v, s = "") =>
    `<span title="${TIPS[k]||''}" style="border:1px solid rgba(255,255,255,.12);border-radius:14px;padding:4px 8px;display:inline-block">${k}: <b>${v}${s}</b></span>`;

  const hint = `<span style="opacity:.65;font-size:12px;margin-right:8px">Tip: hover for details</span>`;

  async function tick() {
    try {
      const r = await fetch("/api/macro/ust-vix", { cache: "no-store" });
      const m = await r.json();
      if (!m || typeof m !== "object") return;

      const curve = m.curve_10y_2y ?? (
        m.ust10y!=null && m.ust2y!=null ? +(m.ust10y - m.ust2y).toFixed(2) : null
      );

      const parts = [];
      if (m.ust2y!=null)  parts.push(chip("2Y",  m.ust2y,  "%"));
      if (m.ust5y!=null)  parts.push(chip("5Y",  m.ust5y,  "%"));
      if (m.ust10y!=null) parts.push(chip("10Y", m.ust10y, "%"));
      if (curve!=null)    parts.push(chip("Curve (10Y–2Y)", curve, "%"));
      if (m.vix!=null)    parts.push(chip("VIX", m.vix));

      const el = ensureRoot();
      if (parts.length) el.innerHTML = hint + parts.join(" ");
    } catch {}
  }

  tick();
  setInterval(tick, POLL_MS);
})();
