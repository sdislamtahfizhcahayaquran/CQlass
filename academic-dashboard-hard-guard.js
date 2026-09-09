/* CQlass — Academic Dashboard hard guard
   Final source-level guard: Kabid Akademik must never fall back to the generic Kesiswaan dashboard. */
(function(){
  'use strict';
  if(window.__CQ_AK_HARD_GUARD__) return;

  function norm(v){
    return String(v||'').trim().toLowerCase().replace(/[\s-]+/g,'_');
  }
  function currentRole(){
    try{
      const u=(typeof currentUser!=='undefined'&&currentUser)?currentUser:{};
      return norm(u.role||u.primary_role||u.role_code||'');
    }catch(_){return '';}
  }
  function isAcademicRole(v){
    const r=norm(v||currentRole());
    return r==='akademik'||r==='kabid_akademik'||r==='academic'||r.includes('kabid_akademik')||r.includes('academic');
  }
  function isDashboardActive(){
    try{if(typeof activeModule!=='undefined') return String(activeModule)==='dashboard';}catch(_){ }
    return true;
  }
  function content(){return document.getElementById('content');}
  function paint(force){
    if(!isAcademicRole()) return false;
    const c=content();
    if(!c) return false;
    if(typeof window.renderAcademicKabidDashboardFinal==='function'){
      window.renderAcademicKabidDashboardFinal(c,force!==false);
      return true;
    }
    return false;
  }

  /* 1) Replace the direct legacy renderer. This stops role-dashboard/Kesiswaan data at the source. */
  try{
    if(typeof renderDashboard==='function'&&!renderDashboard.__cqAkHard){
      const legacy=renderDashboard;
      const wrapped=function(c){
        if(isAcademicRole()&&paint(true)) return;
        return legacy.apply(this,arguments);
      };
      wrapped.__cqAkHard=true;
      renderDashboard=wrapped;
    }
  }catch(e){console.warn('Academic hard guard renderDashboard:',e);}

  /* 2) Block any already-running legacy request from repainting the academic page. */
  try{
    if(typeof renderRoleDashboard==='function'&&!renderRoleDashboard.__cqAkHard){
      const legacy=renderRoleDashboard;
      const wrapped=function(d){
        const r=norm((d&&d.role)||currentRole());
        if(isAcademicRole(r)){
          paint(true);
          return;
        }
        return legacy.apply(this,arguments);
      };
      wrapped.__cqAkHard=true;
      renderRoleDashboard=wrapped;
    }
  }catch(e){console.warn('Academic hard guard renderRoleDashboard:',e);}

  /* 3) Dashboard module itself always points to the academic renderer for this role. */
  try{
    if(typeof DASHBOARD_MODULE!=='undefined'){
      if(Array.isArray(DASHBOARD_MODULE.roles)){
        ['akademik','kabid_akademik'].forEach(function(r){if(!DASHBOARD_MODULE.roles.includes(r))DASHBOARD_MODULE.roles.push(r);});
      }
      if(!DASHBOARD_MODULE.__cqAkHard){
        const legacy=DASHBOARD_MODULE.render;
        DASHBOARD_MODULE.render=function(c){
          if(isAcademicRole()&&paint(true)) return;
          return typeof legacy==='function'?legacy.apply(this,arguments):undefined;
        };
        DASHBOARD_MODULE.__cqAkHard=true;
      }
    }
  }catch(e){console.warn('Academic hard guard module:',e);}

  /* 4) Intercept navigation BEFORE the generic setActiveModule can launch the legacy dashboard. */
  try{
    if(typeof setActiveModule==='function'&&!setActiveModule.__cqAkHard){
      const legacy=setActiveModule;
      const wrapped=function(id){
        if(isAcademicRole()&&String(id)==='dashboard'){
          try{if(typeof activeModule!=='undefined')activeModule='dashboard';}catch(_){ }
          try{if(typeof renderSidebar==='function')renderSidebar();}catch(_){ }
          if(paint(true)) return;
        }
        return legacy.apply(this,arguments);
      };
      wrapped.__cqAkHard=true;
      setActiveModule=wrapped;
    }
  }catch(e){console.warn('Academic hard guard navigation:',e);}

  function repair(){
    if(!isAcademicRole()||!isDashboardActive()) return;
    const c=content();
    if(!c) return;
    const text=String(c.textContent||'');
    const legacy=/Reward Bulan Ini|Pelanggaran Bulan Ini|Perilaku Bulan Ini|Siswa dalam Scope|Tren Kehadiran|5 Siswa Inspiratif|5 Kelas Inspiratif/i.test(text);
    const missing=!c.querySelector('.akf');
    if(legacy||missing) paint(true);
  }

  let repairTimer=null;
  const observer=new MutationObserver(function(){
    clearTimeout(repairTimer);
    repairTimer=setTimeout(repair,30);
  });
  function start(){
    const c=content();
    if(c) observer.observe(c,{childList:true,subtree:true,characterData:true});
    setTimeout(repair,0);
    setTimeout(repair,150);
    setTimeout(repair,600);
    setTimeout(repair,1500);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
  window.addEventListener('load',function(){setTimeout(repair,80);setTimeout(repair,500);},{once:true});

  window.__CQ_AK_HARD_GUARD__=true;
})();
