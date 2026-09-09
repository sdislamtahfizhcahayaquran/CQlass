/* CQlass — Academic Dashboard hard guard
   Final source-level guard: Kabid Akademik must never fall back to the generic Kesiswaan dashboard.
   FIX5: normalizes duplicated academic role metadata while the final renderer is running.
*/
(function(){
  'use strict';
  if(window.__CQ_AK_HARD_GUARD_V5__) return;

  function norm(v){return String(v||'').trim().toLowerCase().replace(/[\s-]+/g,'_');}
  function getUser(){try{return (typeof currentUser!=='undefined'&&currentUser)?currentUser:null;}catch(_){return null;}}
  function currentRole(){
    const u=getUser()||{};
    return norm(u.role||u.primary_role||u.role_code||'');
  }
  function isAcademicRole(v){
    const r=norm(v||currentRole());
    return r==='akademik'||r==='kabid_akademik'||r==='academic'||r.includes('kabid_akademik')||r.includes('academic');
  }
  function isDashboardActive(){
    try{if(typeof activeModule!=='undefined') return String(activeModule)==='dashboard';}catch(_){ }
    const sb=document.getElementById('sidebar');
    if(!sb) return true;
    const active=[...sb.querySelectorAll('.active,[aria-current="page"]')].find(function(el){return String(el.textContent||'').trim()==='Dashboard';});
    return !!active;
  }
  function content(){return document.getElementById('content');}

  let painting=false;
  function paint(force){
    if(!isAcademicRole()) return false;
    const c=content();
    if(!c) return false;
    if(painting) return true;
    const fn=window.renderAcademicKabidDashboardFinal;
    if(typeof fn!=='function'){
      c.innerHTML='<div style="margin:20px;padding:18px;border:1px solid #dcece7;border-radius:16px;background:#fff;color:#53716b;font:600 13px Plus Jakarta Sans,Arial">Menyiapkan dashboard akademik...</div>';
      return false;
    }

    /*
      The auth payload can contain role="akademik" AND role_code="akademik".
      The older final renderer combined both into "akademik_akademik" and rejected it,
      which is why the content area became completely blank.  Keep the canonical role
      and temporarily hide duplicate aliases until the async render is complete.
    */
    const u=getUser();
    const snapshot=u?{role_code:u.role_code,primary_role:u.primary_role,roles:u.roles}:null;
    if(u){
      u.role='akademik';
      u.role_code='';
      u.primary_role='';
      u.roles=[];
    }
    painting=true;
    try{
      const out=fn(c,force!==false);
      Promise.resolve(out).catch(function(err){
        console.error('Academic dashboard render failed:',err);
        if(!c.querySelector('.akf')) c.innerHTML='<div style="margin:20px;padding:18px;border:1px solid #f1d7d7;border-radius:16px;background:#fff5f5;color:#9d4148;font:600 13px Plus Jakarta Sans,Arial">Dashboard akademik gagal dimuat. Silakan muat ulang halaman.</div>';
      }).finally(function(){
        if(u&&snapshot){u.role_code=snapshot.role_code;u.primary_role=snapshot.primary_role;u.roles=snapshot.roles;}
        painting=false;
      });
      return true;
    }catch(err){
      if(u&&snapshot){u.role_code=snapshot.role_code;u.primary_role=snapshot.primary_role;u.roles=snapshot.roles;}
      painting=false;
      console.error('Academic dashboard render failed:',err);
      c.innerHTML='<div style="margin:20px;padding:18px;border:1px solid #f1d7d7;border-radius:16px;background:#fff5f5;color:#9d4148;font:600 13px Plus Jakarta Sans,Arial">Dashboard akademik gagal dimuat. Silakan muat ulang halaman.</div>';
      return true;
    }
  }

  try{
    if(typeof renderDashboard==='function'&&!renderDashboard.__cqAkHardV5){
      const legacy=renderDashboard;
      renderDashboard=function(c){if(isAcademicRole()&&paint(true))return;return legacy.apply(this,arguments);};
      renderDashboard.__cqAkHardV5=true;
    }
  }catch(e){console.warn('Academic hard guard renderDashboard:',e);}

  try{
    if(typeof renderRoleDashboard==='function'&&!renderRoleDashboard.__cqAkHardV5){
      const legacy=renderRoleDashboard;
      renderRoleDashboard=function(d){
        const r=norm((d&&d.role)||currentRole());
        if(isAcademicRole(r)){paint(true);return;}
        return legacy.apply(this,arguments);
      };
      renderRoleDashboard.__cqAkHardV5=true;
    }
  }catch(e){console.warn('Academic hard guard renderRoleDashboard:',e);}

  try{
    if(typeof DASHBOARD_MODULE!=='undefined'){
      if(Array.isArray(DASHBOARD_MODULE.roles))['akademik','kabid_akademik'].forEach(function(r){if(!DASHBOARD_MODULE.roles.includes(r))DASHBOARD_MODULE.roles.push(r);});
      const legacy=DASHBOARD_MODULE.render;
      DASHBOARD_MODULE.render=function(c){if(isAcademicRole()&&paint(true))return;return typeof legacy==='function'?legacy.apply(this,arguments):undefined;};
    }
  }catch(e){console.warn('Academic hard guard module:',e);}

  try{
    if(typeof setActiveModule==='function'&&!setActiveModule.__cqAkHardV5){
      const legacy=setActiveModule;
      setActiveModule=function(id){
        if(isAcademicRole()&&String(id)==='dashboard'){
          try{if(typeof activeModule!=='undefined')activeModule='dashboard';}catch(_){ }
          try{if(typeof renderSidebar==='function')renderSidebar();}catch(_){ }
          if(paint(true))return;
        }
        return legacy.apply(this,arguments);
      };
      setActiveModule.__cqAkHardV5=true;
    }
  }catch(e){console.warn('Academic hard guard navigation:',e);}

  let timer=null;
  function repair(){
    if(!isAcademicRole()||!isDashboardActive())return;
    const c=content();if(!c)return;
    const text=String(c.textContent||'');
    const legacy=/Reward Bulan Ini|Pelanggaran Bulan Ini|Perilaku Bulan Ini|Siswa dalam Scope|Tren Kehadiran|5 Siswa Inspiratif|5 Kelas Inspiratif/i.test(text);
    const blank=!String(c.innerHTML||'').trim();
    if(legacy||blank)paint(true);
  }
  const obs=new MutationObserver(function(){clearTimeout(timer);timer=setTimeout(repair,60);});
  function start(){
    const c=content();if(c)obs.observe(c,{childList:true,subtree:true});
    setTimeout(repair,50);setTimeout(repair,300);setTimeout(repair,1000);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  window.addEventListener('load',function(){setTimeout(repair,100);setTimeout(repair,700);},{once:true});

  window.__CQ_AK_HARD_GUARD_V5__=true;
})();
