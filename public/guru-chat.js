(function(){
'use strict';
var chatOpen=false;
function initChat(){
  if(document.getElementById('guru-chat-box')||document.getElementById('guru-chat-minimized')) return;
  if(!document.getElementById('guru-chat-css')){
    var s=document.createElement('style');
    s.id='guru-chat-css';
    s.textContent='#guru-chat-box{position:fixed;bottom:20px;left:20px;z-index:2147483646;width:380px;max-width:calc(100vw - 40px);background:#0f172a;border:1px solid rgba(34,211,238,.3);border-radius:12px;box-shadow:0 12px 40px rgba(0,0,0,.5);display:flex;flex-direction:column;overflow:hidden}'+
      '#guru-chat-header{background:linear-gradient(135deg,#0f172a,#1a1a2e);padding:12px 16px;border-bottom:1px solid rgba(34,211,238,.2);display:flex;align-items:center;gap:8px;cursor:pointer}'+
      '#guru-chat-header h3{margin:0;font-size:14px;color:#22d3ee;flex:1}'+
      '#guru-chat-toggle{background:none;border:none;color:#22d3ee;font-size:18px;cursor:pointer}'+
      '#guru-chat-body{height:320px;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:8px}'+
      '#guru-chat-body .msg{padding:10px 14px;border-radius:10px;font-size:13px;line-height:1.5;max-width:90%}'+
      '#guru-chat-body .user-msg{background:rgba(34,211,238,.15);color:#e2e8f0;align-self:flex-end}'+
      '#guru-chat-body .guru-msg{background:rgba(255,255,255,.06);color:#cbd5e1;align-self:flex-start;border-left:2px solid #22d3ee}'+
      '#guru-chat-body .thinking{font-style:italic;color:#94a3b8;font-size:12px}'+
      '#guru-chat-input{display:flex;padding:12px;border-top:1px solid rgba(34,211,238,.2);gap:8px}'+
      '#guru-chat-input input{flex:1;background:rgba(255,255,255,.06);border:1px solid rgba(34,211,238,.2);border-radius:8px;padding:8px 12px;color:#e2e8f0;font-size:13px;outline:none}'+
      '#guru-chat-input input:focus{border-color:rgba(34,211,238,.5)}'+
      '#guru-chat-input button{background:linear-gradient(135deg,#0f172a,#1a1a2e);border:1px solid rgba(34,211,238,.3);color:#22d3ee;padding:8px 16px;border-radius:8px;cursor:pointer;font-size:13px}'+
      '#guru-chat-minimized{width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#0f172a,#1a1a2e);border:2px solid rgba(34,211,238,.4);color:#22d3ee;font-size:24px;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 6px 18px rgba(34,211,238,.25);position:fixed;bottom:20px;left:20px;z-index:2147483646}';
    document.head.appendChild(s);
  }
  renderOpen();
}
function renderOpen(){
  var m=document.getElementById('guru-chat-minimized'); if(m) m.remove();
  var box=document.createElement('div');
  box.id='guru-chat-box';
  box.innerHTML='<div id="guru-chat-header"><span>🔮</span><h3>Ask Guru</h3><button id="guru-chat-toggle">−</button></div>'+
    '<div id="guru-chat-body"><div class="msg guru-msg">Ask me anything about markets. I use only Sentotrade data.</div></div>'+
    '<div id="guru-chat-input"><input type="text" id="guru-chat-field" placeholder="e.g. What is Bitcoin risk?" /><button id="guru-chat-send">Ask</button></div>';
  document.body.appendChild(box);
  chatOpen=true;
  document.getElementById('guru-chat-toggle').onclick=function(e){e.stopPropagation();toggleGuruChat()};
  document.getElementById('guru-chat-header').onclick=toggleGuruChat;
  document.getElementById('guru-chat-send').onclick=sendGuruQuestion;
  document.getElementById('guru-chat-field').onkeydown=function(e){if(e.key==='Enter')sendGuruQuestion()};
  document.getElementById('guru-chat-field').focus();
}
function renderMinimized(){
  var e=document.getElementById('guru-chat-box'); if(e) e.remove();
  var btn=document.createElement('button');
  btn.id='guru-chat-minimized';
  btn.innerHTML='🔮';
  btn.title='Ask Guru';
  btn.onclick=toggleGuruChat;
  document.body.appendChild(btn);
  chatOpen=false;
}
window.toggleGuruChat=function(){if(chatOpen)renderMinimized();else renderOpen()};
window.sendGuruQuestion=function(){
  var f=document.getElementById('guru-chat-field');
  var b=document.getElementById('guru-chat-send');
  var body=document.getElementById('guru-chat-body');
  if(!f||!f.value.trim())return;
  var q=f.value.trim(); f.value='';
  var u=document.createElement('div'); u.className='msg user-msg'; u.textContent=q; body.appendChild(u);
  var t=document.createElement('div'); t.className='msg thinking'; t.textContent='Guru is analyzing...'; body.appendChild(t);
  body.scrollTop=body.scrollHeight; b.disabled=true;
  fetch('/api/guru/ask',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question:q})})
    .then(function(r){return r.json()})
    .then(function(d){
      t.remove();
      var g=document.createElement('div'); g.className='msg guru-msg';
      g.textContent=d.answer||'No response.'; body.appendChild(g); body.scrollTop=body.scrollHeight;
    })
    .catch(function(){
      t.remove();
      var err=document.createElement('div'); err.className='msg guru-msg'; err.textContent='Guru is offline. Try again later.'; err.style.color='#f87171'; body.appendChild(err); body.scrollTop=body.scrollHeight;
    })
    .finally(function(){b.disabled=false});
};
if((location.hash||'').toLowerCase().includes('guru')) initChat();
})();
