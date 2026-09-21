/* CQlass — Guru Partner menu + fresh module loaders */
(function(){
  let patched=false;
  const PARTNER_ROLE='partner';
  const REPORT_KEEP=new Set(['absensi','partner-kesiswaan','timesheet','laporan-promosi']);
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
        group.label='Tahfizh'; group.roles=[PARTNER_ROLE];
        group.items=(group.items||[]).filter(x=>x&&['partner-pts','partner-monthly'].includes(x.id));
        for(const item of group.items)item.roles=[PARTNER_ROLE];
        continue;
      }
      if(group.id==='laporan'){
        group.label='Laporan'; if(!Array.isArray(group.roles))group.roles=[]; if(!group.roles.includes(PARTNER_ROLE))group.roles.push(PARTNER_ROLE);
        continue;
      }
      if(Array.isArray(group.roles))group.roles=group.roles.filter(r=>String(r||'').toLowerCase()!==PARTNER_ROLE);
      for(const item of (group.items||[])){if(Array.isArray(item.roles))item.roles=item.roles.filter(r=>String(r||'').toLowerCase()!==PARTNER_ROLE)}
    }
  }
  function ensurePartnerReports(){
    if(typeof MODULE_GROUPS==='undefined')return;
    let report=MODULE_GROUPS.find(x=>x&&x.id==='laporan'); if(!report){report={id:'laporan',label:'Laporan',roles:[PARTNER_ROLE],items:[]};MODULE_GROUPS.push(report)}
    if(!Array.isArray(report.items))report.items=[]; if(!report.roles.includes(PARTNER_ROLE))report.roles.push(PARTNER_ROLE);
    const find=id=>{for(const g of MODULE_GROUPS){const x=(g.items||[]).find(i=>i&&i.id===id);if(x)return x}return null};
    const abs=find('absensi'); if(abs){abs.roles=[...(abs.roles||[]).filter(r=>r!==PARTNER_ROLE),PARTNER_ROLE]; if(!report.items.some(x=>x.id==='absensi'))report.items.unshift(abs)}
    let kis=report.items.find(x=>x&&x.id==='partner-kesiswaan'); if(!kis){kis={id:'partner-kesiswaan',label:'Kesiswaan',roles:[PARTNER_ROLE],built:true,render:function(content){content.innerHTML='<div class="card"><div class="page-title">Kesiswaan</div><div class="page-sub">Pilih data yang akan dicatat.</div><div class="gp-actions"><button class="gp-action" onclick="setActiveModule(\'partner-reward\')"><b>Reward</b><small>Catat reward siswa.</small></button><button class="gp-action" onclick="setActiveModule(\'partner-discipline\')"><b>Kedisiplinan</b><small>Catat kedisiplinan per siswa atau jenis pelanggaran.</small></button></div></div>'}};report.items.push(kis)}
    const rw=find('partner-reward'),ds=find('partner-discipline'); for(const x of [rw,ds])if(x){x.roles=[PARTNER_ROLE];x.hidden=true}
    const order=['absensi','partner-kesiswaan','timesheet','laporan-promosi']; report.items.sort((a,b)=>{const ai=order.indexOf(a.id),bi=order.indexOf(b.id);return(ai<0?99:ai)-(bi<0?99:bi)});
    report.items.forEach(x=>{if(REPORT_KEEP.has(x.id))x.roles=[...(x.roles||[]).filter(r=>r!==PARTNER_ROLE),PARTNER_ROLE]});
  }
  function cleanPartnerSidebar(){
    if(String(window.currentUser?.role||'').toLowerCase()!==PARTNER_ROLE)return;
    const sb=document.getElementById('sidebar');if(!sb)return;
    [...sb.querySelectorAll('.nav-group-head')].forEach(head=>{
      const label=String(head.querySelector('span')?.textContent||head.textContent||'').trim().toLowerCase();
      if(label!=='tahfizh'&&label!=='laporan'){
        const next=head.nextElementSibling;
        if(next?.classList?.contains('nav-group-items'))next.remove();
        head.remove();
      }
    });
  }
  function patch(){
    if(typeof MODULE_GROUPS==='undefined')return false;
    stripPartnerFromOtherGroups();ensurePartnerReports();
    const g=MODULE_GROUPS.find(x=>x.id==='partner-tasks');
    if(!g)return false;
    g.label='Tahfizh';g.roles=[PARTNER_ROLE];
    const pts=(g.items||[]).find(x=>x.id==='partner-pts');
    if(!pts)return false;
    pts.label='Nilai PTS';pts.roles=[PARTNER_ROLE];
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
  const observer=new MutationObserver(function(){if(String(window.currentUser?.role||'').toLowerCase()===PARTNER_ROLE){stripPartnerFromOtherGroups();ensurePartnerReports();cleanPartnerSidebar()}});
  observer.observe(document.documentElement,{childList:true,subtree:true});
  setInterval(function(){if(String(window.currentUser?.role||'').toLowerCase()===PARTNER_ROLE){stripPartnerFromOtherGroups();ensurePartnerReports();cleanPartnerSidebar()}},2000);
})();