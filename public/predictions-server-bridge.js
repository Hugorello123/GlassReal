(function () {
  'use strict';

  function money(v) {
    var n = Number(v);
    if (!Number.isFinite(n)) return '—';
    return '$' + n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }

  function statusPill(s) {
    var st = String(s || 'open').toLowerCase();
    var c = st === 'hit' ? '#22c55e' : st === 'missed' ? '#ef4444' : st === 'partial' ? '#f59e0b' : '#60a5fa';
    return '<span style="padding:2px 8px;border-radius:999px;border:1px solid '+c+'66;color:'+c+';font-weight:700;font-size:12px;">'+st.toUpperCase()+'</span>';
  }

  function sourceOf(p) { return p.source || (p.id && p.id.startsWith('ai-gossip') ? 'AI-Gossip' : 'Bias Signal'); }

  function row(p) {
    var asset = (p.asset || '—').toUpperCase();
    var call = p.call || '—';
    var entry = money(p.entry);
    var target = money(p.target);
    var status = statusPill(p.status);
    var src = sourceOf(p);
    return '<tr>' +
      '<td style="padding:10px;border-bottom:1px solid #1f2937;font-weight:700;">'+asset+'</td>' +
      '<td style="padding:10px;border-bottom:1px solid #1f2937;">'+call+'</td>' +
      '<td style="padding:10px;border-bottom:1px solid #1f2937;">'+entry+'</td>' +
      '<td style="padding:10px;border-bottom:1px solid #1f2937;">'+target+'</td>' +
      '<td style="padding:10px;border-bottom:1px solid #1f2937;">'+status+'</td>' +
      '<td style="padding:10px;border-bottom:1px solid #1f2937;color:#93c5fd;">'+src+'</td>' +
    '</tr>';
  }

  function mount(preds) {
    var container = document.querySelector('main') || document.body;
    var old = document.getElementById('predictions-server-bridge');
    if (old) old.remove();

    var box = document.createElement('div');
    box.id = 'predictions-server-bridge';
    box.style.cssText = 'margin:20px 0;padding:16px;border:1px solid #334155;border-radius:12px;background:#0b1220;color:#e5e7eb;';
    box.innerHTML =
      '<h2 style="margin:0 0 10px 0;font-size:20px;color:#22d3ee;">Server Predictions ('+preds.length+')</h2>' +
      '<div style="overflow:auto;max-height:520px;">' +
        '<table style="width:100%;border-collapse:collapse;font-size:13px;">' +
          '<thead><tr style="text-align:left;color:#94a3b8;">' +
            '<th style="padding:10px;border-bottom:1px solid #334155;">Asset</th>' +
            '<th style="padding:10px;border-bottom:1px solid #334155;">Call</th>' +
            '<th style="padding:10px;border-bottom:1px solid #334155;">Entry</th>' +
            '<th style="padding:10px;border-bottom:1px solid #334155;">Target</th>' +
            '<th style="padding:10px;border-bottom:1px solid #334155;">Status</th>' +
            '<th style="padding:10px;border-bottom:1px solid #334155;">Source</th>' +
          '</tr></thead>' +
          '<tbody>' + preds.map(row).join('') + '</tbody>' +
        '</table>' +
      '</div>';

    container.insertBefore(box, container.firstChild);
  }

  function run() {
    if (!location.hash.includes('/predictions')) return;
    fetch('/api/predictions', { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        var items = Array.isArray(d && d.items) ? d.items : [];
        mount(items);
      })
      .catch(function (e) { console.log('[predictions-bridge] error', e); });
  }

  setTimeout(run, 700);
  window.addEventListener('hashchange', function(){ setTimeout(run, 300); });
})();
