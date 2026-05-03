(function(){
'use strict';
const GUIDES={
  home:"Welcome to Sentotrade. Pick a plan that fits — Trial for a day, or RAW for full access. Then log in to see your dashboard.",
  hub:"Pro Hub. This is your launchpad. Pick Dashboard for live prices, Watchdog for news, or Predictions to track your calls.",
  dashboard:"Dashboard. Live prices and whale alerts here. Start with the gossip widget — high intensity means something is moving.",
  predictions:"Predictions. Add a trade idea, set a target, and let it run. Come back to score it hit, missed, or partial.",
  guru:"Guru. Ask anything — Bitcoin outlook, oil risk, what to watch. Answers come from Sentotrade data only. No outside noise.",
  watchdog:"Watchdog. News scan and sentiment radar. Look for the themes with the most headlines — that is where volatility lives.",
  indices:"Indices. Check macro levels — S and P, Nasdaq, DXY. Big index moves often spill into crypto and commodities.",
  stats:"Stats. Your scorecard. See which calls worked, which didn't, and where you are strongest.",
  pro:"Pro. Layer the signals. Combine gossip intensity, price action, and Guru insight before you decide.",
  tutor:"Trading 101. Long means up, short means down. Risk only what you can lose. And always confirm gossip with price.",
  default:"Sentotrade guide. Tap this button on any page for a voice walkthrough."
};
const synth=window.speechSynthesis; var speaking=false;
function whichPage(){
  var h=(location.hash||'').toLowerCase();
  if(h==='#/predictions') return 'predictions';
  if(h==='#/guru')        return 'guru';
  if(h==='#/tutor')       return 'tutor';
  if(h==='#/dashboard')   return 'dashboard';
  if(h==='#/watchdog')    return 'watchdog';
  if(h==='#/indices')     return 'indices';
  if(h==='#/stats')       return 'stats';
  if(h==='#/pro')         return 'pro';
  if(h==='#/hub')         return 'hub';
  if(h==='#'||h==='#/'||h==='') return 'home';
  return 'default';
}
function play(){
  if(!synth) return;
  if(speaking){ synth.cancel(); speaking=false; update(); return; }
  var page=whichPage();
  var text=GUIDES[page]||GUIDES.default;
  var u=new SpeechSynthesisUtterance(text);
  u.rate=1; u.pitch=1; u.volume=1;
  u.onend=u.onerror=function(){ speaking=false; update(); };
  speaking=true; synth.speak(u); update();
}
function update(){
  var b=document.getElementById('vax-btn');
  if(b){ b.textContent=speaking?'⏹':'🔊'; b.title=speaking?'Stop':'Guide'; }
}
function boot(){
  if(document.getElementById('vax-box')) return;
  var s=document.createElement('style');
  s.id='vax-css';
  s.textContent='#vax-box{position:fixed;top:16px;left:16px;z-index:2147483647;display:flex;flex-direction:column;align-items:center;gap:4px}'+
    '#vax-btn{width:64px;height:64px;border-radius:50%;border:2px solid rgba(34,211,238,.5);background:linear-gradient(135deg,#0f172a,#1a1a2e);color:#22d3ee;font-size:28px;cursor:pointer;box-shadow:0 8px 24px rgba(34,211,238,.35)}'+
    '#vax-btn:hover{transform:scale(1.08)}#vax-lbl{font-size:12px;color:#22d3ee;font-weight:700}';
  document.head.appendChild(s);
  var box=document.createElement('div');
  box.id='vax-box';
  box.innerHTML='<button id="vax-btn" title="Play guide">🔊</button><span id="vax-lbl">Guide</span>';
  document.body.appendChild(box);
  document.getElementById('vax-btn').addEventListener('click',play);
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
})();
