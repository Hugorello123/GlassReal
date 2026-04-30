(function(){
'use strict';

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
      
      '<div style="background:rgba(168,85,247,.08);border:1px solid rgba(168,85,247,.2);border-radius:12px;padding:18px;text-align:center">'+
        '<div style="font-size:11px;color:#a855f7;font-weight:700;letter-spacing:.08em;text-transform:uppercase">📡 AI-Gossip Spike</div>'+
        '<div id="ai-count" style="font-size:36px;font-weight:800;color:#fff;margin:10px 0">—</div>'+
        '<div style="font-size:12px;color:#94a3b8">Sentiment-triggered</div>'+
        '<div style="font-size:11px;color:#64748b;margin-top:4px">Any asset from news</div>'+
        '<div id="ai-hitrate" style="font-size:20px;font-weight:700;color:#fbbf24;margin-top:8px">—</div>'+
        '<div id="ai-assets" style="margin-top:8px;font-size:11px;color:#94a3b8;"></div>'+
      '</div>'+
      
      '<div style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:18px;text-align:center">'+
        '<div style="font-size:11px;color:#cbd5e1;font-weight:700;letter-spacing:.08em;text-transform:uppercase">✋ Manual</div>'+
        '<div id="manual-count" style="font-size:36px;font-weight:800;color:#fff;margin:10px 0">—</div>'+
        '<div style="font-size:12px;color:#94a3b8">Your own calls</div>'+
        '<div style="font-size:11px;color:#64748b;margin-top:4px">Add on Predictions page</div>'+
        '<div id="manual-hitrate" style="font-size:20px;font-weight:700;color:#fbbf24;margin-top:8px">—</div>'+
        '<div id="manual-assets" style="margin-top:8px;font-size:11px;color:#94a3b8;"></div>'+
      '</div>'+
    '</div>'+
    
    '<div style="background:rgba(255,255,255,.03);border-radius:10px;padding:16px;font-size:13px;color:#94a3b8;line-height:1.7">'+
      '<strong style="color:#22d3ee">How predictions work:</strong><br>'+
      '• <strong style="color:#22d3ee">Guru Bias Signal</strong> fires every few minutes based on market bias scores. Covers BTC, Gold, and Oil.<br>'+
      '• <strong style="color:#a855f7">AI-Gossip</strong> triggers when news sentiment spikes — new keywords, intensity jumps, or whale alerts detected. Covers any asset mentioned in headlines.<br>'+
      '• <strong style="color:#cbd5e1">Manual</strong> is where you add your own trade ideas to track performance.<br><br>'+
      '<strong style="color:#4ade80">All predictions auto-resolve</strong> within 72 hours. Hit = target reached. Missed = failed. Partial = close. This proves whether our intelligence engine actually works.'+
    '</div>';

  var predRecord=document.querySelector('.prediction-record')||document.querySelector('[class*="prediction"]');
  if(predRecord && predRecord.parentNode) predRecord.parentNode.insertBefore(box,predRecord.nextSibling);
  else if(container.firstChild) container.insertBefore(box,container.firstChild);
  else container.appendChild(box);

  loadData();
}

function getSource(p){
  var src=p.source||p.data?.source;
  if(src) return src;
  var id=p.id||p.data?.id||'';
  if(id.startsWith('ai-gossip')) return 'AI-Gossip';
  if(id.startsWith('ai-')) return 'AI-Gossip';
  if(id.startsWith('sig_')) return 'Bias Signal';
  return 'Manual';
}

function getAsset(p){
  return (p.asset||p.data?.asset||'Unknown').toUpperCase();
}

function loadData(){
  fetch('/api/predictions',{cache:'no-store'})
    .then(function(r){return r.json()})
    .then(function(d){
      var preds=Array.isArray(d&&d.items)?d.items:(Array.isArray(d)?d:[]);
      
      var bias=[];
      var ai=[];
      var manual=[];
      
      for(var i=0;i<preds.length;i++){
        var p=preds[i];
        var src=getSource(p);
        if(src==='Bias Signal') bias.push(p);
        else if(src==='AI-Gossip'||src==='AI') ai.push(p);
        else manual.push(p);
      }

      function calcRate(list){
        var hits=0,missed=0,partial=0;
        for(var i=0;i<list.length;i++){
          var o=list[i].outcome||list[i].data?.outcome||list[i].status||'';
          if(o==='Hit') hits++;
          else if(o==='Missed') missed++;
          else if(o==='Partial') partial++;
        }
        var resolved=hits+missed+partial;
        return {count:list.length,rate:resolved>0?Math.round((hits+partial*0.5)/resolved*100):0,hits:hits,missed:missed,partial:partial};
      }

      function assetBreakdown(list){
        var counts={};
        for(var i=0;i<list.length;i++){
          var a=getAsset(list[i]);
          counts[a]=(counts[a]||0)+1;
        }
        var parts=[];
        for(var a in counts){
          parts.push('<span style="display:inline-block;background:rgba(255,255,255,.06);padding:2px 8px;border-radius:6px;margin:2px;">'+a+': '+counts[a]+'</span>');
        }
        return parts.join(' ');
      }

      var biasStat=calcRate(bias);
      var aiStat=calcRate(ai);
      var manStat=calcRate(manual);

      function set(id,val,color){
        var el=document.getElementById(id);
        if(el){el.textContent=val;if(color)el.style.color=color;}
      }

      set('bias-count',biasStat.count);
      set('bias-hitrate',biasStat.resolved>0?biasStat.rate+'%':'Pending',biasStat.rate>=50?'#4ade80':'#fbbf24');
      document.getElementById('bias-assets').innerHTML=assetBreakdown(bias);
      
      set('ai-count',aiStat.count);
      set('ai-hitrate',aiStat.resolved>0?aiStat.rate+'%':'Pending',aiStat.rate>=50?'#4ade80':'#fbbf24');
      document.getElementById('ai-assets').innerHTML=assetBreakdown(ai);
      
      set('manual-count',manStat.count);
      set('manual-hitrate',manStat.resolved>0?manStat.rate+'%':'Pending',manStat.rate>=50?'#4ade80':'#fbbf24');
      document.getElementById('manual-assets').innerHTML=assetBreakdown(manual);
    })
    .catch(function(e){console.log('[TrackRecord] fetch error:',e)});
}

setTimeout(renderTrackRecord,600);
})();
