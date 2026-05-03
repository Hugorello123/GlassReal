(function(){
'use strict';

// Only run on Predictions or Stats page
if(!location.hash.includes('predictions')&&!location.hash.includes('stats'))return;

function renderTrackRecord(){
  if(document.getElementById('track-record-box')) return;
  
  var container=document.querySelector('.stats-container')||document.querySelector('#stats-root')||document.body;
  if(!container) return setTimeout(renderTrackRecord,500);

  var box=document.createElement('div');
  box.id='track-record-box';
  box.style.cssText='background:linear-gradient(135deg,#0f172a,#1a1a2e);border:1px solid rgba(34,211,238,.25);border-radius:16px;padding:28px;margin:24px 0;box-shadow:0 8px 32px rgba(34,211,238,.1)';

  box.innerHTML=
    '<div style="display:flex;align-items:center;gap:12px;margin-bottom:20px">'+
      '<span style="font-size:28px">🤖</span>'+
      '<div>'+
        '<h2 style="margin:0;color:#22d3ee;font-size:22px">AI Intelligence Track Record</h2>'+
        '<p style="margin:4px 0 0 0;color:#94a3b8;font-size:13px">Sentotrade auto-generates predictions from gossip spikes — no human input</p>'+
      '</div>'+
    '</div>'+
    
    '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:20px">'+
      '<div style="background:rgba(34,211,238,.08);border:1px solid rgba(34,211,238,.2);border-radius:12px;padding:18px;text-align:center">'+
        '<div style="font-size:11px;color:#22d3ee;font-weight:700;letter-spacing:.08em;text-transform:uppercase">🔮 Guru Bias Signal</div>'+
        '<div id="bias-count" style="font-size:36px;font-weight:800;color:#fff;margin:10px 0">—</div>'+
        '<div style="font-size:12px;color:#94a3b8">Scheduled auto-calls</div>'+
        '<div style="font-size:11px;color:#64748b;margin-top:4px">BTC + Gold + Oil</div>'+
        '<div id="bias-hitrate" style="font-size:20px;font-weight:700;color:#fbbf24;margin-top:8px">—</div>'+
        '<div id="bias-assets" style="margin-top:8px;font-size:11px;color:#94a3b8;"></div>'+
      '</div>'+
      
      '<div style="background:rgba(6,182,212,.08);border:1px solid rgba(6,182,212,.2);border-radius:12px;padding:18px;text-align:center">'+
        '<div style="font-size:11px;color:#06b6d4;font-weight:700;letter-spacing:.08em;text-transform:uppercase">🌐 AI-Gossip</div>'+
        '<div id="ai-count" style="font-size:36px;font-weight:800;color:#fff;margin:10px 0">—</div>'+
        '<div style="font-size:12px;color:#94a3b8">Auto predictions</div>'+
        '<div style="font-size:11px;color:#64748b;margin-top:4px">All assets</div>'+
        '<div id="ai-hitrate" style="font-size:20px;font-weight:700;color:#fbbf24;margin-top:8px">—</div>'+
        '<div id="ai-assets" style="margin-top:8px;font-size:11px;color:#94a3b8;"></div>'+
      '</div>'+
      
      '<div style="background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.2);border-radius:12px;padding:18px;text-align:center">'+
        '<div style="font-size:11px;color:#f59e0b;font-weight:700;letter-spacing:.08em;text-transform:uppercase">✍️ Manual</div>'+
        '<div id="manual-count" style="font-size:36px;font-weight:800;color:#fff;margin:10px 0">—</div>'+
        '<div style="font-size:12px;color:#94a3b8">User predictions</div>'+
        '<div style="font-size:11px;color:#64748b;margin-top:4px">All assets</div>'+
        '<div id="manual-hitrate" style="font-size:20px;font-weight:700;color:#fbbf24;margin-top:8px">—</div>'+
        '<div id="manual-assets" style="margin-top:8px;font-size:11px;color:#94a3b8;"></div>'+
      '</div>'+
    '</div>'+
    
    '<div id="track-details" style="font-size:12px;color:#64748b;line-height:1.5;"></div>';
  
  container.insertBefore(box,container.firstChild);
  
  loadStats();
}

function loadStats(){
  fetch('/api/predictions').then(function(r){return r.json();}).then(function(data){
    var records=Array.isArray(data)?data:(data.predictions||[]);
    if(!records.length){
      document.getElementById('bias-count').textContent='0';
      document.getElementById('ai-count').textContent='0';
      document.getElementById('manual-count').textContent='0';
      document.getElementById('track-details').innerHTML='<p>No predictions yet. They appear here after the Guru fires a bias signal or you add one manually.</p>';
      return;
    }
    
    var bias=0,ai=0,manual=0,biasHit=0,aiHit=0,manualHit=0;
    var biasAssets=[],aiAssets=[],manualAssets=[];
    
    records.forEach(function(p){
      var src=(p.source||p.origin||'').toLowerCase();
      if(src.includes('bias')||src.includes('guru')){bias++;if((p.outcome||'').includes('Hit'))biasHit++;biasAssets.push(p.asset);}
      else if(src.includes('ai')||src.includes('auto')||src.includes('gossip')){ai++;if((p.outcome||'').includes('Hit'))aiHit++;aiAssets.push(p.asset);}
      else{manual++;if((p.outcome||'').includes('Hit'))manualHit++;manualAssets.push(p.asset);}
    });
    
    document.getElementById('bias-count').textContent=bias;
    document.getElementById('ai-count').textContent=ai;
    document.getElementById('manual-count').textContent=manual;
    document.getElementById('bias-hitrate').textContent=bias?(Math.round(biasHit/bias*100)+'%'):'—';
    document.getElementById('ai-hitrate').textContent=ai?(Math.round(aiHit/ai*100)+'%'):'—';
    document.getElementById('manual-hitrate').textContent=manual?(Math.round(manualHit/manual*100)+'%'):'—';
    
    function uniq(a){return[...new Set(a)].filter(Boolean).slice(0,5);}
    document.getElementById('bias-assets').textContent=uniq(biasAssets).join(', ')||'—';
    document.getElementById('ai-assets').textContent=uniq(aiAssets).join(', ')||'—';
    document.getElementById('manual-assets').textContent=uniq(manualAssets).join(', ')||'—';
    
    document.getElementById('track-details').innerHTML=
      '<p><strong>How it works:</strong> Bias = Guru scheduled calls. AI-Gossip = auto-generated from news spikes. Manual = your own predictions.</p>'+
      '<p>Hit rate updates as predictions resolve (Hit/Missed/Partial).</p>';
  }).catch(function(){
    document.getElementById('track-details').innerHTML='<p style="color:#ef4444">Could not load stats</p>';
  });
}

renderTrackRecord();
})();
