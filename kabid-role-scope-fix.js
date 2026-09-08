/* CQlass — Kabid role scope cleanup
   Absensi/Morning Talk adalah domain Kesiswaan.
   Kabid Akademik, Tahfizh, dan Kegiatan tidak diarahkan atau diberi popup dari proses absensi. */
(function(){
  'use strict';
  if(window.__cqKabidRoleScopeFix) return;

  const NON_KESISWAAN_KABID = new Set(['akademik','tahfizh','kegiatan']);
  const KABID_ALL = new Set(['akademik','tahfizh','kesiswaan','kegiatan']);
  const ATTENDANCE_IDS = new Set(['absensi','attendance','morning-talk','morning_talk']);
  const ATTENDANCE_TEXT = /\b(absen|absensi|attendance|morning\s*talk|kehadiran)\b/i;
  const ATTENDANCE_ROW_TEXT = /\b(absen|absensi|attendance|morning\s*talk|kehadiran|hadir)\b/i;

  function role(){
    try{return String(currentUser?.role||'').toLowerCase()}catch(_){return ''}
  }
  function isNonKesiswaanKabid(){return NON_KESISWAAN_KABID.has(role())}

  function enforceModuleRoles(){
    try{
      if(typeof DASHBOARD_MODULE!=='undefined' && Array.isArray(DASHBOARD_MODULE.roles)){
        KABID_ALL.forEach(r=>{if(!DASHBOARD_MODULE.roles.includes(r)) DASHBOARD_MODULE.roles.push(r)});
      }
      if(typeof MODULE_GROUPS==='undefined' || !Array.isArray(MODULE_GROUPS)) return;

      for(const group of MODULE_GROUPS){
        if(!group || !Array.isArray(group.items)) continue;
        for(const item of group.items){
          if(!item) continue;
          const id=String(item.id||'').toLowerCase();
          const label=String(item.label||'');
          const isAttendance=ATTENDANCE_IDS.has(id) || ATTENDANCE_TEXT.test(label);
          if(!isAttendance) continue;
          item.roles=['walas','kesiswaan','pimpinan'];
        }
      }

      const kg=MODULE_GROUPS.find(g=>g&&g.id==='kesiswaan');
      if(kg) kg.roles=['guru','walas','kesiswaan','pimpinan'];
    }catch(err){console.warn('Kabid role scope:',err)}
  }

  enforceModuleRoles();

  if(typeof setActiveModule==='function'){
    const originalSetActiveModule=setActiveModule;
    setActiveModule=function(id){
      const key=String(id||'').toLowerCase();
      if(isNonKesiswaanKabid() && ATTENDANCE_IDS.has(key)){
        if(typeof activeModule!=='undefined') activeModule='dashboard';
        return originalSetActiveModule('dashboard');
      }
      return originalSetActiveModule(id);
    };
  }

  if(typeof enterApp==='function'){
    const originalEnterApp=enterApp;
    enterApp=function(){
      enforceModuleRoles();
      const out=originalEnterApp.apply(this,arguments);
      if(isNonKesiswaanKabid()){
        try{
          if(typeof activeModule!=='undefined' && ATTENDANCE_IDS.has(String(activeModule||'').toLowerCase())){
            activeModule='dashboard';
            if(typeof setActiveModule==='function') setActiveModule('dashboard');
          }
        }catch(_){ }
      }
      return out;
    };
  }

  if(typeof renderSidebar==='function'){
    const originalRenderSidebar=renderSidebar;
    renderSidebar=function(){
      enforceModuleRoles();
      return originalRenderSidebar.apply(this,arguments);
    };
  }

  if(typeof showToast==='function'){
    const originalShowToast=showToast;
    showToast=function(msg,isError){
      const text=String(msg||'').trim();
      if(isNonKesiswaanKabid() && isError){
        if(
          ATTENDANCE_TEXT.test(text) ||
          /^Terjadi kendala\. Silakan hubungi admin\.?$/i.test(text) ||
          /^Menu ini tidak termasuk tupoksi akun Anda\.?$/i.test(text)
        ){
          console.warn('Popup non-tupoksi disenyapkan untuk '+role()+':',text);
          return;
        }
      }
      return originalShowToast(msg,isError);
    };
  }

  function removeAttendanceColumn(table){
    const headers=[...table.querySelectorAll('thead th')];
    const indexes=[];
    headers.forEach((th,i)=>{if(ATTENDANCE_TEXT.test(String(th.textContent||''))) indexes.push(i)});
    if(!indexes.length) return;
    [...indexes].sort((a,b)=>b-a).forEach(i=>{
      table.querySelectorAll('tr').forEach(tr=>{
        const cells=tr.children;
        if(cells[i]) cells[i].remove();
      });
    });
  }

  function cleanDashboard(){
    if(!isNonKesiswaanKabid()) return;
    const root=document.getElementById('rd-root');
    if(!root) return;

    root.querySelectorAll('.rd-kpi').forEach(el=>{
      if(ATTENDANCE_TEXT.test(String(el.textContent||''))) el.remove();
    });
    root.querySelectorAll('.rd10-status').forEach(el=>{
      if(ATTENDANCE_TEXT.test(String(el.textContent||''))) el.remove();
    });
    root.querySelectorAll('.rd-card').forEach(card=>{
      const title=String(card.querySelector('.rd-card-title')?.textContent||'');
      if(ATTENDANCE_TEXT.test(title)){card.remove();return;}
      card.querySelectorAll('table').forEach(removeAttendanceColumn);
      card.querySelectorAll('tbody tr').forEach(tr=>{
        const first=String(tr.children?.[0]?.textContent||'').trim().toLowerCase();
        const txt=String(tr.textContent||'');
        if(first==='kesiswaan' && ATTENDANCE_ROW_TEXT.test(txt)) tr.remove();
      });
    });
  }

  const observer=new MutationObserver(function(){cleanDashboard()});
  document.addEventListener('DOMContentLoaded',function(){
    enforceModuleRoles();
    const target=document.getElementById('content')||document.body;
    if(target) observer.observe(target,{childList:true,subtree:true});
    cleanDashboard();
  });

  window.__cqKabidRoleScopeFix=true;
})();