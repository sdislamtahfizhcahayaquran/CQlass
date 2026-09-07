/* CQlass — route guard khusus Kabid Kegiatan */
(function(){
  'use strict';
  function role(){
    try{return String(currentUser?.role||'').toLowerCase()}catch(_){return''}
  }
  function isKegiatan(){return role()==='kegiatan'}
  function ensureDashboardRole(){
    try{
      if(typeof DASHBOARD_MODULE!=='undefined'&&Array.isArray(DASHBOARD_MODULE.roles)&&!DASHBOARD_MODULE.roles.includes('kegiatan')){
        DASHBOARD_MODULE.roles.push('kegiatan');
      }
    }catch(_){ }
  }
  function routeTarget(id){
    if(!isKegiatan()) return id;
    if(!id || id==='absensi') return 'kegiatan-laporan';
    return id;
  }

  ensureDashboardRole();

  try{
    if(typeof setActiveModule==='function' && !window.__kegiatanRouteSetPatched){
      window.__kegiatanRouteSetPatched=true;
      const originalSetActiveModule=setActiveModule;
      setActiveModule=function(id){
        return originalSetActiveModule.call(this,routeTarget(id));
      };
    }
  }catch(e){console.warn('Kegiatan route set patch:',e)}

  try{
    if(typeof renderSidebar==='function' && !window.__kegiatanRouteSidebarPatched){
      window.__kegiatanRouteSidebarPatched=true;
      const originalRenderSidebar=renderSidebar;
      renderSidebar=function(){
        ensureDashboardRole();
        try{
          if(isKegiatan() && (activeModule==='absensi' || !activeModule)) activeModule='kegiatan-laporan';
        }catch(_){ }
        return originalRenderSidebar.apply(this,arguments);
      };
    }
  }catch(e){console.warn('Kegiatan route sidebar patch:',e)}

  function forceCorrectPage(){
    if(!isKegiatan()) return;
    ensureDashboardRole();
    try{
      const bad=document.querySelector('#content .page-title');
      const title=String(bad?.textContent||'').toLowerCase();
      if(typeof activeModule!=='undefined' && (activeModule==='absensi' || title.includes('morning talk'))){
        setActiveModule('kegiatan-laporan');
        return;
      }
      if(typeof activeModule!=='undefined' && activeModule==='dashboard'){
        // Dashboard generik boleh ada, tetapi untuk Kabid Kegiatan halaman kerja utama harus modul kegiatan.
        setActiveModule('kegiatan-laporan');
      }
    }catch(e){console.warn('Kegiatan route force:',e)}
  }

  document.addEventListener('DOMContentLoaded',function(){
    setTimeout(forceCorrectPage,80);
    setTimeout(forceCorrectPage,450);
  });
  setTimeout(forceCorrectPage,900);
})();
