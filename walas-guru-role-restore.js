/* CQlass — restore Guru/Walas relationship after role-loader isolation.
   Walas is Guru Mapel + wali-class responsibilities. This file restores the
   pre-incident teacher/walas menu authority and removes legacy Request Laporan. */
(function(){
  'use strict';
  if(window.__cqWalasGuruRoleRestoreV3)return;
  window.__cqWalasGuruRoleRestoreV3=true;

  function role(){
    try{
      const u=(typeof currentUser!=='undefined'&&currentUser)||JSON.parse(localStorage.getItem('cqlass_user')||'{}')||{};
      return String(u.role||u.primary_role||u.role_code||'').trim().toLowerCase().replace(/[\s-]+/g,'_');
    }catch(_){return''}
  }
  function isTeacher(){const r=role();return r==='guru'||r==='walas'}
  function loadOnce(src,key,done){
    if(window[key]){done?.();return true}
    const file=src.split('?')[0].split('/').pop();
    const existing=[...document.scripts].find(s=>(s.src||'').split('?')[0].endsWith('/'+file));
    if(existing){existing.addEventListener('load',()=>done?.(),{once:true});done?.();return true}
    const s=document.createElement('script');
    s.src=src;s.async=false;
    s.onload=()=>done?.();
    document.head.appendChild(s);
    return true;
  }
  function stripLegacyRequestFromModel(){
    if(!isTeacher()||typeof MODULE_GROUPS==='undefined'||!Array.isArray(MODULE_GROUPS))return;
    for(const g of MODULE_GROUPS){
      if(!g)continue;
      const gt=(String(g.id||'')+' '+String(g.label||'')).toLowerCase();
      if(gt.includes('request')&&gt.includes('laporan')&&Array.isArray(g.roles)){
        g.roles=g.roles.filter(x=>!['guru','walas'].includes(String(x||'').toLowerCase()));
      }
      if(Array.isArray(g.items))for(const it of g.items){
        if(!it)continue;
        const tx=(String(it.id||'')+' '+String(it.label||'')).toLowerCase();
        if(tx.includes('request')&&tx.includes('laporan')&&Array.isArray(it.roles)){
          it.roles=it.roles.filter(x=>!['guru','walas'].includes(String(x||'').toLowerCase()));
        }
      }
    }
  }
  function stripLegacyRequestFromDom(){
    if(!isTeacher())return;
    const sb=document.getElementById('sidebar');if(!sb)return;
    const candidates=[...sb.querySelectorAll('.nav-group,.sidebar-group,.menu-group,[data-group],section,div')];
    for(const el of candidates){
      const first=el.querySelector?.('.nav-group-title,.group-title,.sidebar-group-title,.menu-title');
      const txt=String((first||el).textContent||'').replace(/\s+/g,' ').trim().toLowerCase();
      if(txt==='request laporan'||(txt.startsWith('request laporan ')&&el.children.length<=3)){
        el.remove();
      }
    }
    [...sb.querySelectorAll('button,a,.nav-item,.menu-item')].forEach(el=>{
      if(String(el.textContent||'').replace(/\s+/g,' ').trim().toLowerCase()==='request laporan')el.remove();
    });
  }
  let rerenderTimer=0;
  function rerender(){
    // Banyak modul Walas selesai dimuat hampir bersamaan. Satukan semua permintaan
    // render menjadi satu repaint agar sidebar tidak berkedip tanpa mengubah struktur/menu.
    stripLegacyRequestFromModel();
    clearTimeout(rerenderTimer);
    rerenderTimer=setTimeout(()=>{
      try{if(typeof renderSidebar==='function')renderSidebar()}catch(_){ }
      requestAnimationFrame(stripLegacyRequestFromDom);
      setTimeout(stripLegacyRequestFromDom,80);
    },90);
  }
  function ensureTeacherWalasStack(){
    if(!isTeacher())return false;
    stripLegacyRequestFromModel();
    loadOnce('teacher-walas-sidebar-clean.js?v=20260927-ranking6','__cqTeacherWalasSidebarClean',rerender);
    loadOnce('internal-report-center.js?v=20260927-ranking4','__cqInternalReportCenter',rerender);
    setTimeout(rerender,120);
    return true;
  }

  ensureTeacherWalasStack();
  if(typeof enterApp==='function'&&!enterApp.__cqWalasGuruRoleRestoreV3){
    const old=enterApp;
    const wrapped=function(){
      const out=old.apply(this,arguments);
      setTimeout(ensureTeacherWalasStack,0);
      setTimeout(rerender,150);
      return out;
    };
    wrapped.__cqWalasGuruRoleRestoreV3=true;
    enterApp=wrapped;
  }

  const sidebar=document.getElementById('sidebar');
  if(sidebar)new MutationObserver(()=>{if(isTeacher())stripLegacyRequestFromDom()}).observe(sidebar,{childList:true,subtree:true});
  let tries=0;const timer=setInterval(()=>{tries++;if(ensureTeacherWalasStack()||tries>=24)clearInterval(timer)},250);
})();
