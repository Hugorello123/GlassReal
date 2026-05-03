(function () {
  'use strict';

  async function fetchGuruInsight() {
    try {
      const res = await fetch('/api/guru/history', { cache: 'no-store' });
      if (!res.ok) return null;
      const d = await res.json();
      const hist = d.history || [];
      if (!hist.length) return null;
      const latest = hist[hist.length - 1];
      let answer = String(latest.a || '');
      const stale = /stale|cannot answer/i.test(answer) || Number(latest.confidence || 0) === 0;

      if (stale) {
        return { text: 'Guru is syncing fresh market data...', confidence: 0, ts: latest.t };
      }

      if (answer.length > 70) answer = answer.slice(0, 70) + '...';
      return { text: answer, confidence: Number(latest.confidence || 0), ts: latest.t };
    } catch {
      return null;
    }
  }

  async function updateGossipWidget() {
    const insight = await fetchGuruInsight();
    const widget = document.getElementById('gossip-widget');
    if (!widget || !insight) return;

    let guruLine = document.getElementById('gw-guru');
    if (!guruLine) {
      guruLine = document.createElement('div');
      guruLine.id = 'gw-guru';
      guruLine.style.cssText = 'margin-top:6px;padding-top:6px;border-top:1px solid rgba(255,255,255,0.08);cursor:pointer;';
      widget.appendChild(guruLine);
    }

    const dot = insight.confidence >= 70 ? '🟢' : insight.confidence >= 40 ? '🟡' : '⚪';

    guruLine.textContent = '';
    const row = document.createElement('div');
    row.style.fontSize = '0.70rem';
    row.style.opacity = '0.9';

    const strong = document.createElement('strong');
    strong.textContent = `${dot} Guru:`;
    const span = document.createElement('span');
    span.textContent = ` ${insight.text}`;

    row.appendChild(strong);
    row.appendChild(span);
    guruLine.appendChild(row);

    guruLine.onclick = () => {
      const guruBtn =
        document.querySelector('[data-guru-open="1"]') ||
        document.querySelector('#guru-open-btn') ||
        document.querySelector('[title="Ask Guru"]');
      if (guruBtn) guruBtn.click();
    };
  }

  setInterval(updateGossipWidget, 60000);
  setTimeout(updateGossipWidget, 2000);
})();
