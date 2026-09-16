/* CQlass — Guru Partner menu + fresh module loaders */
(function(){
  let patched=false;
  function loadFresh(src,key){
    if(document.querySelector(`script[data-cq-${key}]`))return;
    const s=document.createElement('script');s.src=src;s.defer=true;s.dataset[`cq${key.replace(/(^|-)([a-z])/g,(_,a,b)=>b.toUpperCase())}`]='1';document.head.appendChild(s);
  }
  function loadPartnerModules(){
    loadFresh('guru-partner-class-picker.js?v=20260917-ptslock3','partner-pts-lock');
    loadFresh('guru-partner-points.js?v=20260917-scope2','partner-points');
  }
  function patch(){
    if(typeof MODULE_GROUPS==='undefined')return false;
    const g=MODULE_GROUPS.find(x=>x.id==='partner-tasks');
    if(!g)return false;
    const pts=(g.items||[]).find(x=>x.id==='partner-pts');
    if(!pts)return false;
    pts.label='Nilai PTS';
    if(!(g.items||[]).some(x=>x.id==='partner-monthly')){
      g.items.push({id:'partner-monthly',label:'Laporan Bulanan',roles:['partner'],built:true,render:function(content){content.innerHTML='<div class="card"><span class="spinner"></span> Membuka Laporan Bulanan Tahfizh...</div>';setTimeout(function(){window.location.href='tahfizh-monthly.html?v=20260907-datafix2'},30)}});
    }
    loadPartnerModules();
    if(!patched&&typeof renderSidebar==='function'&&window.currentUser?.role==='partner')setTimeout(renderSidebar,80);
    patched=true;
    return true;
  }
  loadPartnerModules();
  if(!patch()){
    const timer=setInterval(function(){if(patch())clearInterval(timer)},150);
    setTimeout(function(){clearInterval(timer);patch()},5000);
  }
})();