/* CQlass — role transition guard: prevent wrong sidebar/content flash before Kabid Tahfizh shell is ready */
(function(){
  'use strict';
  if(window.__cqRoleTransitionGuardV1||typeof enterApp!=='function')return;
  window.__cqRoleTransitionGuardV1=true;
  const norm=v=>String(v||'').trim().toLowerCase().replace(/[\s-]+/g,'_');
  const role=()=>{try{return norm((typeof currentUser!=='undefined'&&currentUser?.role)||JSON.parse(localStorage.getItem('cqlass_user')||'{}').role||'')}catch(_){return''}};
  const old=enterApp;
  enterApp=function(){
    const isKabid=role()==='kabid_tahfizh';
    const sidebar=document.getElementById('sidebar'),content=document.getElementById('content');
    if(isKabid){
      if(sidebar)sidebar.style.visibility='hidden';
      if(content)content.style.visibility='hidden';
    }
    const out=old.apply(this,arguments);
    if(isKabid){
      let tries=0;
      const reveal=()=>{
        tries++;
        const ready=typeof window.cqStabilizeKabidTahfizh==='function';
        if(ready){try{window.cqStabilizeKabidTahfizh(true)}catch(_){}}
        if(ready||tries>=20){
          if(sidebar)sidebar.style.visibility='';
          if(content)content.style.visibility='';
          return;
        }
        setTimeout(reveal,50);
      };
      setTimeout(reveal,0);
    }
    return out;
  };
  enterApp.__cqRoleTransitionGuardV1=true;
})();