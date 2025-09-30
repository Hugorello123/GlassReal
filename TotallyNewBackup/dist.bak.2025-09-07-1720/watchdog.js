(() => {
  const POLL_MS = 120000, ROOT_ID = "watchdog-root";
  const ASSETS = ["Gold","Oil","BTC","USD","CNH","Stocks"];
  const arrow = n => n<=-2?"▼▼":n===-1?"▼":n===1?"▲":n>=2?"▲▲":"↔";
  const nowHHMM = () => new Date().toTimeString().slice(0,8);

  function ensureRoot() {
    let r = document.getElementById(ROOT_ID);
    if (!r) {
      r = document.createElement("section");
      r.id = ROOT_ID;
      r.style.cssText = "margin:12px 0;border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:12px;background:rgba(255,255,255,.03)";
      document.body.insertBefore(r, document.body.firstElementChild);
    }
    return r;
  }

  function render(themes){
    // sort by heat desc
    themes = [...themes].sort((a,b)=> (b.heat|0)-(a.heat|0));
    // net gold
    const netGold = themes.reduce((s,t)=> s + ((t.impact&&typeof t.impact.Gold==="number")?t.impact.Gold:0), 0);
    const root = ensureRoot();

    const header = `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:6px">
        <div style="font-weight:700">Sentimental Watchdog</div>
        <div style="opacity:.8">Gold net: <b>${arrow(netGold)}</b> (${netGold}) • ${themes.length} theme(s) • Live ${nowHHMM()}</div>
      </div>`;

    const cards = themes.map(t=>{
      const impacts = ASSETS
        .map(a=>{
          const v = (t.impact && typeof t.impact[a]==="number") ? t.impact[a] : 0;
          if (v===0) return ""; // hide zeroes for signal/noise
          return `<span style="opacity:.9;padding-right:10px">${a}: <b>${arrow(v)}</b></span>`;
        })
        .filter(Boolean).join("");
      return `
        <div style="padding:10px;border:1px solid rgba(255,255,255,.06);border-radius:10px;margin-top:8px">
          <div style="display:flex;justify-content:space-between;gap:8px;align-items:center">
            <div><strong>🔥 ${t.title}</strong></div>
            <div style="opacity:.7">heat ${t.heat} • ${t.count}</div>
          </div>
          <div style="margin-top:6px">${impacts || '<span style="opacity:.5">no strong impacts</span>'}</div>
        </div>`;
    }).join("");

    root.innerHTML = header + cards;
  }

  function hide(){ const r = document.getElementById(ROOT_ID); if (r) r.remove(); }

  async function tick(){
    try{
      const res = await fetch("/api/watchdog/summary?window=6h", {cache:"no-store"});
      const data = await res.json();
      if (Array.isArray(data) && data.length) render(data); else hide();
    }catch{ hide(); }
  }
  tick();
  setInterval(tick, POLL_MS);
})();
