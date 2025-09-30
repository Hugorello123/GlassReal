(()=>{const p=v=>v!=null?(v.toFixed(2)+'%'):'—',vx=v=>v!=null?v.toFixed(1):'—';
function set(label,text){
  const nodes=[...document.querySelectorAll('*')].filter(n=>n.childElementCount===0&&n.textContent?.trim().startsWith(label+':'));
  nodes.forEach(n=>n.textContent=`${label}: ${text}`);
}
async function go(){
  try{
    const r=await fetch('/api/macro/ust-vix',{cache:'no-store'}); if(!r.ok) return;
    const d=await r.json();
    set('2Y',p(d.ust_2y)); set('5Y',p(d.ust_5y)); set('10Y',p(d.ust_10y));
    set('Curve (10Y–2Y)',p(d.curve_10y_2y)); set('VIX',vx(d.vix));
  }catch{}
}
go(); setInterval(go,60_000);
})();
