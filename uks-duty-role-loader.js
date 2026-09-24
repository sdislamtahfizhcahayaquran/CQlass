/* CQlass — UKS duty role loader. Management roles must not bootstrap teacher UKS duty. */
(function(){
  'use strict';
  if(window.__cqUksDutyRoleLoaderV1)return;
  window.__cqUksDutyRoleLoaderV1=true;
  const ALLOWED=new Set(['guru','walas','partner','guru_partner','pengabdian','tahfizh']);
  const norm=v=>String(v||'').trim().toLowerCase().replace(/[\s-]+/g,'_');
  function role(){
    try{
      const saved=JSON.parse(localStorage.getItem('cqlass_user')||'{}')||{};
      const u=(typeof currentUser!=='undefined'&&currentUser)||saved;
      return norm(u.role||u.primary_role||u.role_code||saved.role||'');
    }catch(_){return''}
  }
  function load(){
    const r=role();if(!ALLOWED.has(r)||window.__cqUksDutyRoleScriptRequested)return false;
    window.__cqUksDutyRoleScriptRequested=true;
    const s=document.createElement('script');s.src='./uks-duty.js?v=20260924-rolelazy1';s.async=false;
    s.onerror=()=>console.warn('CQlass UKS duty script gagal dimuat.');document.head.appendChild(s);return true;
  }
  load();
  if(typeof enterApp==='function'&&!enterApp.__cqUksDutyRoleLoaderV1){
    const old=enterApp;const wrapped=function(){const out=old.apply(this,arguments);setTimeout(load,0);return out};
    wrapped.__cqUksDutyRoleLoaderV1=true;enterApp=wrapped;
  }
})();