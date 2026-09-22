/* CQlass — Guru Partner/Tahfizh menu: Tahfizh + Kesiswaan + Laporan */
(function(){
  'use strict';
  if(window.__cqPartnerTahfizhMenu20260922V4)return;
  window.__cqPartnerTahfizhMenu20260922V4=true;

  const ROLE='partner';
  const KESISWAAN_GROUP='partner-kesiswaan-group';
  const RAW_DISCIPLINE='partner-discipline';
  const RAW_REWARD='partner-reward';
  const RAW_ROUTES=new Set([RAW_DISCIPLINE,RAW_REWARD]);
  const REPORT_KEEP=new Set(['absensi','timesheet','laporan-promosi']);

  const norm=v=>String(v||'').trim().toLowerCase().replace(/\s+/g,' ');
  const isPartner=()=>norm(window.currentUser?.role)==='partner';
  const withoutRole=arr=>Array.isArray(arr)?arr.filter(r=>norm(r)!==ROLE):[];

  function loadFresh(src){
    const base=src.split('?')[0];
    if([...document.scripts].some(s=>(s.getAttribute('src')||'').includes(base)))return;
    const s=document.createElement('script');s.src=src;s.defer=true;document.head.appendChild(s);
  }
  function loadPartnerModules(){
    loadFresh('guru-partner-class-picker.js?v=20260918-material1');
    loadFresh('guru-partner-pts-kuadran.js?v=20260918-materialonly2');
    loadFresh('guru-partner-points.js?v=20260922-kesiswaan3');
  }
  function findItem(id){
    if(typeof MODULE_GROUPS==='undefined')return null;
    for(const g of MODULE_GROUPS){const x=(g?.items||[]).find(i=>i&&i.id===id);if(x)return x}
    return null;
  }
  function removeGroup(id){
    if(typeof MODULE_GROUPS==='undefined')return;
    const i=MODULE_GROUPS.findIndex(g=>g&&g.id===id);if(i>=0)MODULE_GROUPS.splice(i,1);
  }

  function renderProxy(content,rawId,label){
    content.innerHTML=`<div class="card"><span class="spinner"></span> Memuat ${label}...</div>`;
    loadPartnerModules();
    let n=0;
    const go=()=>{
      const raw=findItem(rawId);
      if(raw&&typeof raw.render==='function'){
        try{return raw.render(content)}catch(e){console.warn('Partner Kesiswaan render:',e)}
      }
      if(++n<45)return setTimeout(go,100);
      content.innerHTML=`<div class="empty-state">Modul ${label} belum dapat dimuat. Silakan buka ulang menu ini.</div>`;
    };
    go();
  }

  function stripPartnerFromOtherGroups(){
    if(typeof MODULE_GROUPS==='undefined'||!Array.isArray(MODULE_GROUPS))return;
    for(const group of MODULE_GROUPS){
      if(!group)continue;
      if(group.id==='partner-tasks'||group.id===KESISWAAN_GROUP||group.id==='laporan')continue;
      group.roles=withoutRole(group.roles);
      for(const item of (group.items||[]))item.roles=withoutRole(item.roles);
    }
  }

  function ensureTahfizhGroup(){
    if(typeof MODULE_GROUPS==='undefined')return;
    let g=MODULE_GROUPS.find(x=>x&&x.id==='partner-tasks');
    if(!g){g={id:'partner-tasks',label:'Tahfizh',roles:[ROLE],items:[]};MODULE_GROUPS.push(g)}
    g.label='Tahfizh';g.roles=[ROLE];
    g.items=(g.items||[]).filter(x=>x&&['partner-pts','partner-monthly'].includes(x.id));
    const pts=g.items.find(x=>x.id==='partner-pts');if(pts){pts.label='Nilai PTS';pts.roles=[ROLE]}
    let monthly=g.items.find(x=>x.id==='partner-monthly');
    if(!monthly){monthly={id:'partner-monthly',label:'Laporan Bulanan',roles:[ROLE],built:true,render:function(content){content.innerHTML='<div class="card"><span class="spinner"></span> Membuka Laporan Bulanan Tahfizh...</div>';setTimeout(()=>{window.location.href='tahfizh-monthly.html?v=20260907-datafix2'},30)}};g.items.push(monthly)}
    monthly.roles=[ROLE];
  }

  function hideRawRoutes(){
    if(typeof MODULE_GROUPS==='undefined')return;
    for(const g of MODULE_GROUPS){
      for(const it of (g?.items||[])){
        if(!RAW_ROUTES.has(it?.id))continue;
        it.roles=withoutRole(it.roles);
        it.hidden=true;
      }
    }
  }

  function ensureKesiswaanGroup(){
    if(typeof MODULE_GROUPS==='undefined')return;
    hideRawRoutes();
    removeGroup(KESISWAAN_GROUP);
    const items=[
      {id:'partner-kesiswaan-discipline',label:'Kedisiplinan',roles:[ROLE],built:true,render:c=>renderProxy(c,RAW_DISCIPLINE,'Kedisiplinan')},
      {id:'partner-kesiswaan-reward',label:'Reward',roles:[ROLE],built:true,render:c=>renderProxy(c,RAW_REWARD,'Reward')}
    ];
    const group={id:KESISWAAN_GROUP,label:'Kesiswaan',roles:[ROLE],items};
    const tahIdx=MODULE_GROUPS.findIndex(g=>g&&g.id==='partner-tasks');
    MODULE_GROUPS.splice(tahIdx>=0?tahIdx+1:0,0,group);
  }

  function ensureReports(){
    if(typeof MODULE_GROUPS==='undefined')return;
    let report=MODULE_GROUPS.find(x=>x&&x.id==='laporan');
    if(!report){report={id:'laporan',label:'Laporan',roles:[ROLE],items:[]};MODULE_GROUPS.push(report)}
    report.label='Laporan';report.roles=[...new Set([...(report.roles||[]).filter(r=>norm(r)!==ROLE),ROLE])];
    if(!Array.isArray(report.items))report.items=[];

    for(const it of report.items){
      const id=norm(it?.id),label=norm(it?.label);
      if(id==='kesiswaan-center'||id==='reward'||id==='kedisiplinan'||label==='kesiswaan'||label==='reward'||label==='kedisiplinan'||RAW_ROUTES.has(id)){
        it.roles=withoutRole(it.roles);it.hidden=true;
      }
    }

    const abs=findItem('absensi');if(abs){abs.roles=[...new Set([...withoutRole(abs.roles),ROLE])];if(!report.items.some(x=>x===abs||x?.id==='absensi'))report.items.unshift(abs)}
    for(const id of ['timesheet','laporan-promosi']){
      const x=findItem(id);if(x){x.roles=[...new Set([...withoutRole(x.roles),ROLE])];if(!report.items.some(y=>y===x||y?.id===id))report.items.push(x)}
    }
    report.items.forEach(x=>{if(REPORT_KEEP.has(x?.id))x.roles=[...new Set([...withoutRole(x.roles),ROLE])]});
    const order=['absensi','timesheet','laporan-promosi'];
    report.items.sort((a,b)=>{const ai=order.indexOf(a?.id),bi=order.indexOf(b?.id);return(ai<0?99:ai)-(bi<0?99:bi)});
  }

  function cleanSidebar(){
    if(!isPartner())return;
    const sb=document.getElementById('sidebar');if(!sb)return;
    const allowed=new Set(['tahfizh','kesiswaan','laporan']);
    [...sb.querySelectorAll('.nav-group-head')].forEach(head=>{
      const label=norm(head.querySelector('span')?.textContent||head.textContent);
      const body=head.nextElementSibling;
      if(!allowed.has(label)){
        if(body?.classList?.contains('nav-group-items'))body.remove();head.remove();return;
      }
      if(!body?.classList?.contains('nav-group-items'))return;
      if(label==='laporan'){
        [...body.querySelectorAll('button,a,.nav-item,.menu-item,[data-module]')].forEach(el=>{
          const id=norm(el.dataset?.module||el.getAttribute?.('data-module'));
          const text=norm(el.textContent);
          if(text==='kesiswaan'||text==='kedisiplinan'||text==='reward'||id==='kesiswaan-center'||id==='reward'||id==='kedisiplinan'||RAW_ROUTES.has(id))el.remove();
        });
      }
    });
  }

  function build(){
    if(typeof MODULE_GROUPS==='undefined'||!Array.isArray(MODULE_GROUPS))return false;
    loadPartnerModules();
    stripPartnerFromOtherGroups();
    ensureTahfizhGroup();
    ensureKesiswaanGroup();
    ensureReports();
    hideRawRoutes();
    return true;
  }
  function install(){
    if(!build())return false;
    if(typeof renderSidebar==='function'&&!renderSidebar.__cqPartnerTahfizhMenuV4){
      const old=renderSidebar;
      const wrapped=function(){if(isPartner())build();const out=old.apply(this,arguments);requestAnimationFrame(cleanSidebar);return out};
      wrapped.__cqPartnerTahfizhMenuV4=true;renderSidebar=wrapped;
    }
    if(isPartner()&&typeof renderSidebar==='function')setTimeout(()=>{renderSidebar();requestAnimationFrame(cleanSidebar)},60);
    return true;
  }

  loadPartnerModules();
  if(!install()){
    const t=setInterval(()=>{if(install())clearInterval(t)},120);setTimeout(()=>{clearInterval(t);install()},5000);
  }
  const attach=()=>{
    const sb=document.getElementById('sidebar');if(!sb||sb.__cqPartnerSidebarObserverV4)return;
    sb.__cqPartnerSidebarObserverV4=true;new MutationObserver(cleanSidebar).observe(sb,{childList:true,subtree:true});
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',attach,{once:true});else attach();
  setInterval(()=>{if(isPartner()){build();if(typeof renderSidebar==='function')renderSidebar();cleanSidebar()}},1800);
})();