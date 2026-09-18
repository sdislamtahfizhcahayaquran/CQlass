/* CQlass — Guru Partner menu + fresh module loaders */
(function(){
  let patched=false;
  const PARTNER_ROLE='partner';
  function loadFresh(src){
    const base=src.split('?')[0];
    if([...document.scripts].some(s=>(s.getAttribute('src')||'').includes(base)))return;
    const s=document.createElement('script');s.src=src;s.defer=true;document.head.appendChild(s);
  }
  function loadPartnerModules(){
    loadFresh('guru-partner-class-picker.js?v=20260918-material1');
    loadFresh('guru-partner-pts-kuadran.js?v=20260918-materialonly2');
    loadFresh('guru-partner-points.js?v=20260917-scope2');
  }
  function stripPartnerFromOtherGroups(){
    if(typeof MODULE_GROUPS==='undefined'||!Array.isArray(MODULE_GROUPS))return;
    for(const group of MODULE_GROUPS){
      if(!group)continue;
      if(group.id==='partner-tasks'){
        group.label='Tahfizh';
        group.roles=[PARTNER_ROLE];
        for(const item of (group.items||[])) item.roles=[PARTNER_ROLE];
        continue;
      }
      if(Array.isArray(group.roles)) group.roles=group.roles.filter(r=>String(r||'').toLowerCase()!==PARTNER_ROLE);
      for(const item of (group.items||[])){
        if(Array.isArray(item.roles)) item.roles=item.roles.filter(r=>String(r||'').toLowerCase()!==PARTNER_ROLE);
      }
    }
  }
  function cleanPartnerSidebar(){
    if(String(window.currentUser?.role||'').toLowerCase()!==PARTNER_ROLE)return;
    const sb=document.getElementById('sidebar');if(!sb)return;
    [...sb.querySelectorAll('.nav-group-head')].forEach(head=>{
      const label=String(head.querySelector('span')?.textContent||head.textContent||'').trim().toLowerCase();
      if(label!=='tahfizh'){
        const next=head.nextElementSibling;
        if(next?.classList?.contains('nav-group-items'))next.remove();
        head.remove();
      }
    });
  }
  function patch(){
    if(typeof MODULE_GROUPS==='undefined')return false;
    stripPartnerFromOtherGroups();
    const g=MODULE_GROUPS.find(x=>x.id==='partner-tasks');
    if(!g)return false;
    g.label='Tahfizh';g.roles=[PARTNER_ROLE];
    const pts=(g.items||[]).find(x=>x.id==='partner-pts');
    if(!pts)return false;
    pts.label='Nilai PTS';pts.roles=[PARTNER_ROLE];
    const abs=(g.items||[]).find(x=>x.id==='absensi');if(abs)abs.roles=[PARTNER_ROLE];
    if(!(g.items||[]).some(x=>x.id==='partner-monthly')){
      g.items.push({id:'partner-monthly',label:'Laporan Bulanan',roles:[PARTNER_ROLE],built:true,render:function(content){content.innerHTML='<div class="card"><span class="spinner"></span> Membuka Laporan Bulanan Tahfizh...</div>';setTimeout(function(){window.location.href='tahfizh-monthly.html?v=20260907-datafix2'},30)}});
    }else{
      const monthly=(g.items||[]).find(x=>x.id==='partner-monthly');if(monthly)monthly.roles=[PARTNER_ROLE];
    }
    loadPartnerModules();
    if(typeof renderSidebar==='function'&&window.currentUser?.role===PARTNER_ROLE){setTimeout(function(){renderSidebar();setTimeout(cleanPartnerSidebar,0)},80)}
    patched=true;
    return true;
  }
  loadPartnerModules();
  if(!patch()){
    const timer=setInterval(function(){if(patch())clearInterval(timer)},150);
    setTimeout(function(){clearInterval(timer);patch()},5000);
  }
  const observer=new MutationObserver(function(){if(String(window.currentUser?.role||'').toLowerCase()===PARTNER_ROLE){stripPartnerFromOtherGroups();cleanPartnerSidebar()}});
  observer.observe(document.documentElement,{childList:true,subtree:true});
  setInterval(function(){if(String(window.currentUser?.role||'').toLowerCase()===PARTNER_ROLE){stripPartnerFromOtherGroups();cleanPartnerSidebar()}},2000);
})();