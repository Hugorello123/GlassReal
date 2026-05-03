(function(){
  const container = document.createElement('div');
  container.id = 'gossip-widget';
  container.style.cssText = 'position:fixed;bottom:16px;right:16px;width:320px;max-height:260px;overflow-y:auto;background:rgba(15,23,42,0.95);border:1px solid rgba(6,182,212,0.4);border-radius:12px;padding:12px;z-index:99999;color:#e2e8f0;font-family:sans-serif;font-size:12px;box-shadow:0 10px 30px rgba(0,0,0,0.5);';
  container.innerHTML = '<div style="font-weight:700;color:#06b6d4;margin-bottom:8px;">🌐 Gossip Signal</div><div id="gossip-content" style="line-height:1.5;">Loading…</div>';
  document.addEventListener('DOMContentLoaded', () => document.body.appendChild(container));

  async function load() {
    try {
      const res = await fetch('/api/gossip', { cache: 'no-store' });
      if (!res.ok) throw new Error('API error');
      const data = await res.json();
      const headlines = (data.headlines || []).slice(0, 5);
      const html = headlines.length
        ? headlines.map(h => `<div style="margin-bottom:6px;padding-bottom:6px;border-bottom:1px solid rgba(255,255,255,0.08);"><span style="color:#f59e0b;font-size:10px;">${h.source||'News'}</span> ${h.title||''}</div>`).join('')
        : '<div style="opacity:0.6;">No fresh headlines.</div>';
      const el = document.getElementById('gossip-content');
      if (el) el.innerHTML = html;
    } catch(e) {
      const el = document.getElementById('gossip-content');
      if (el) el.innerHTML = '<div style="opacity:0.6;">Gossip feed paused.</div>';
    }
  }
  setTimeout(load, 1500);
  setInterval(load, 60000);
})();
