/* CQlass — restore Guru/Walas relationship after role-loader isolation.
   Walas is still a Guru Mapel; wali-class features are additive, not a separate base menu. */
(function(){
  'use strict';
  if(window.__cqWalasGuruRoleRestoreV1)return;
  window.__cqWalasGuruRoleRestoreV1=true;

  function role(){
    try{
      const u=(typeof currentUser!=='undefined'&&currentUser)||JSON.parse(localStorage.getItem('cqlass_user')||'{}')||{};
      return String(u.role||u.primary_role||u.role_code||'').trim().toLowerCase().replace(/[\s-]+/g,'_');
    }catch(_){return''}
  }

  function loadTeacherWalas(){
    const r=role();
    if(r!=='guru'&&r!=='walas')return false;
    if(window.__cqTeacherWalasSidebarClean)return true;
    if(document.querySelector('script[data-cq-teacher-walas-clean]'))return true;
    const s=document.createElement('script');
    s.src='teacher-walas-sidebar-clean.js?v=20260924-role-restore2';
    s.dataset.cqTeacherWalasClean='1';
    s.async=false;
    s.onload=function(){try{if(typeof renderSidebar==='function')renderSidebar()}catch(_){}};
    document.head.appendChild(s);
    return true;
  }

  loadTeacherWalas();
  if(typeof enterApp==='function'&&!enterApp.__cqWalasGuruRoleRestoreV1){
    const old=enterApp;
    const wrapped=function(){
      const out=old.apply(this,arguments);
      setTimeout(loadTeacherWalas,0);
      return out;
    };
    wrapped.__cqWalasGuruRoleRestoreV1=true;
    enterApp=wrapped;
  }
  let tries=0;
  const timer=setInterval(()=>{tries++;if(loadTeacherWalas()||tries>=20)clearInterval(timer)},250);
})();
