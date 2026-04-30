(function(){
function styleCards(){
  // AI card glow (left card)
  var ai = document.getElementById('ai-count');
  if (ai && ai.closest('div')) {
    var card = ai.closest('div');
    card.style.boxShadow = '0 0 0 1px rgba(34,211,238,.25), 0 8px 24px rgba(34,211,238,.18)';
    card.style.borderColor = 'rgba(34,211,238,.45)';
  }

  // Manual card glow (right card)
  var man = document.getElementById('manual-count');
  if (man && man.closest('div')) {
    var card2 = man.closest('div');
    card2.style.boxShadow = '0 0 0 1px rgba(245,158,11,.22), 0 8px 24px rgba(245,158,11,.16)';
    card2.style.borderColor = 'rgba(245,158,11,.40)';
  }
}

function addLegend(){
  var box=document.getElementById('predictions-server-bridge');
  if(!box) return;
  if(document.getElementById('pred-legend')) return;

  var lg=document.createElement('div');
  lg.id='pred-legend';
  lg.style.cssText='margin:0 0 12px 0;padding:10px 14px;background:rgba(255,255,255,0.04);border:1px solid rgba(148,163,184,.25);border-radius:10px;font-size:12px;color:#cbd5e1;display:flex;gap:16px;flex-wrap:wrap;';
  lg.innerHTML='<span><strong style="color:#60a5fa;">● OPEN</strong> = still running</span><span><strong style="color:#f59e0b;">● PARTIAL</strong> = close to target</span><span><strong style="color:#22c55e;">● HIT</strong> = target reached</span><span><strong style="color:#ef4444;">● MISSED</strong> = failed</span>';
  box.insertBefore(lg, box.children[1] || box.firstChild);
}

setTimeout(function(){
  addLegend();
  styleCards();
}, 900);

window.addEventListener('hashchange', function(){
  setTimeout(function(){
    addLegend();
    styleCards();
  }, 350);
});
})();
