/* CQlass — Guru Partner/Tahfizh menu: Tahfizh + Kesiswaan + Laporan */
(function(){
  'use strict';
  if(window.__cqPartnerTahfizhMenu20260922V2)return;
  window.__cqPartnerTahfizhMenu20260922V2=true;

  const ROLE='partner';
  const KESISWAAN_GROUP='partner-kesiswaan-group';
  const CENTER='partner-kesiswaan';
  const ROUTES=new Set(['partner-reward','partner-discipline']);
  const REPORT_KEEP=new Set(['absensi','timesheet','laporan-promosi']);

  const norm=v=>String(v||'').trim().toLowerCase().replace(/\s+/g,' ');
  const isPartner=()=>norm(window.currentUser?.role)==='partner';
  const withoutRole=(arr)=>Array.isArray(arr)?arr.filter(r=>norm(r)!==ROLE):[];

  function loadFresh(src){
    const base=src.split('?')[0];
    if([...document.scripts].some(s=>(s.getAttribute('src')||'').includes(base)))return;
    const s=document.createElement('script');s.src=src;s.defer=true;document.head.appendChild(s);
  }
  function loadPartnerModules(){
    loadFresh('guru-partner-class-picker.js?v=20260918-material1');
    loadFresh('guru-partner-pts-kuadran.js?v=20260918-materialonly2');
    loadFresh('guru-partner-points.js?v=20260922-kesiswaan2');
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
  function renderCenter(content){
    content.innerHTML=`<div class="card"><div class="page-title">Kesiswaan</div><div class="page-sub">Pilih data yang akan dicatat. Reward dan Kedisiplinan tetap memakai data siswa yang sama dengan Walas dan Kesiswaan.</div><div class="gp-actions"><button class="gp-action" id="cq-partner-reward-card"><b>Reward</b><small>Catat reward siswa tanpa membuat data ganda.</small></button><button class="gp-action" id="cq-partner-discipline-card"><b>Kedisiplinan</b><small>Catat per siswa atau berdasarkan jenis pelanggaran.</small></button></div><div class="page-sub" style="margin-top:12px">Sistem menolak siswa + tanggal + jenis yang sama bila sudah dicatat oleh Walas, Guru Partner/Tahfizh, Kesiswaan, atau role lain.</div></div>`;
    document.getElementById('cq-partner-reward-card')?.addEventListener('click',()=>openRoute('partner-reward'));
    document.getElementById('cq-partner-discipline-card')?.addEventListener('click',()=>openRoute('partner-discipline'));
  }
  function openRoute(id){
    loadPartnerModules();
    let n=0;const go=()=>{
      if(typeof setActiveModule==='function'&&findItem(id)){setActiveModule(id);return}
      if(++n<25)setTimeout(go,80);
      else if(typeof showToast==='function')showToast('Modul Kesiswaan belum termuat. Silakan coba sekali lagi.',true);
    };go();
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

  function ensureKesiswaanGroup(){
    if(typeof MODULE_GROUPS==='undefined')return;
    removeGroup(KESISWAAN_GROUP);
    const center={id:CENTER,label:'Kesiswaan',roles:[ROLE],built:true,render:renderCenter};
    const items=[center];
    for(const id of ['partner-discipline','partner-reward']){
      const x=findItem(id);if(x){x.roles=[ROLE];x.hidden=true;items.push(x)}
    }
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

    // Tidak ada lagi Kesiswaan/Reward/Kedisiplinan di grup Laporan untuk Guru Partner.
    for(const it of report.items){
      const id=norm(it?.id),label=norm(it?.label);
      if(id===CENTER||ROUTES.has(id)||id==='kesiswaan-center'||id==='reward'||id==='kedisiplinan'||label==='kesiswaan'||label==='reward'||label==='kedisiplinan')it.roles=withoutRole(it.roles);
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
      [...body.querySelectorAll('button,a,.nav-item,.menu-item,[data-module]')].forEach(el=>{
        const id=norm(el.dataset?.module||el.getAttribute?.('data-module'));
        const text=norm(el.textContent);
        if(label==='laporan'&&(text==='kesiswaan'||text==='kedisiplinan'||text==='reward'||id===CENTER||ROUTES.has(id)||id==='kesiswaan-center'||id==='reward'||id==='kedisiplinan'))el.style.setProperty('display','none','important');
        if(label==='kesiswaan'&&(ROUTES.has(id)||text==='reward'||text==='kedisiplinan'))el.style.setProperty('display','none','important');
      });
    });
  }

  function build(){
    if(typeof MODULE_GROUPS==='undefined'||!Array.isArray(MODULE_GROUPS))return false;
    loadPartnerModules();
    stripPartnerFromOtherGroups();
    ensureTahfizhGroup();
    ensureKesiswaanGroup();
    ensureReports();
    return true;
  }
  function install(){
    if(!build())return false;
    if(typeof renderSidebar==='function'&&!renderSidebar.__cqPartnerTahfizhMenuV2){
      const old=renderSidebar;
      const wrapped=function(){if(isPartner())build();const out=old.apply(this,arguments);setTimeout(cleanSidebar,0);return out};
      wrapped.__cqPartnerTahfizhMenuV2=true;renderSidebar=wrapped;
    }
    if(isPartner()&&typeof renderSidebar==='function')setTimeout(()=>{renderSidebar();setTimeout(cleanSidebar,0)},60);
    return true;
  }

  loadPartnerModules();
  if(!install()){
    const t=setInterval(()=>{if(install())clearInterval(t)},120);setTimeout(()=>{clearInterval(t);install()},5000);
  }
  const mo=new MutationObserver(()=>{if(isPartner()){build();cleanSidebar()}});mo.observe(document.documentElement,{childList:true,subtree:true});
  setInterval(()=>{if(isPartner()){build();cleanSidebar()}},2000);
})();