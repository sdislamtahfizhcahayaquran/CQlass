/* CQlass — Kabid role scope cleanup + Admin Data Master visibility
   Absensi/Morning Talk adalah domain Kesiswaan.
   Kabid Akademik, Tahfizh, dan Kegiatan tidak diarahkan atau diberi popup dari proses absensi.
   Data Master harus selalu terlihat jelas untuk Admin. */
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
  function isAdmin(){return role()==='admin'}

  function openDataMaster(){
    try{
      if(typeof window.openCleanAdminMaster==='function'){
        window.openCleanAdminMaster();
        return;
      }
      const content=document.getElementById('content');
      if(content&&typeof window.renderAdminMasterData==='function'){
        try{if(typeof activeModule!=='undefined')activeModule='data-master'}catch(_){ }
        window.renderAdminMasterData(content);
        return;
      }
      if(typeof setActiveModule==='function') setActiveModule('data-master');
    }catch(err){
      console.warn('Buka Data Master gagal:',err);
      const content=document.getElementById('content');
      if(content&&typeof window.renderAdminMasterData==='function') window.renderAdminMasterData(content);
    }
  }
  window.openAdminDataMaster=openDataMaster;

  function ensureAdminMasterModule(){
    try{
      if(typeof MODULE_GROUPS==='undefined' || !Array.isArray(MODULE_GROUPS)) return false;
      let g=MODULE_GROUPS.find(x=>x&&x.id==='administrasi');
      if(!g){
        g={id:'administrasi',label:'Administrasi',roles:['admin'],items:[]};
        MODULE_GROUPS.push(g);
      }
      if(!Array.isArray(g.roles)) g.roles=[];
      if(!g.roles.includes('admin')) g.roles.push('admin');
      if(!Array.isArray(g.items)) g.items=[];
      let it=g.items.find(x=>x&&x.id==='data-master');
      if(!it){
        it={id:'data-master',label:'Data Master',roles:['admin'],built:true,render:function(c){
          if(typeof window.renderAdminMasterData==='function') return window.renderAdminMasterData(c);
          if(c) c.innerHTML='<div class="card">Memuat Data Master...</div>';
        }};
        g.items.unshift(it);
      }else{
        it.label='Data Master';
        it.roles=['admin'];
        it.built=true;
        it.render=function(c){
          if(typeof window.renderAdminMasterData==='function') return window.renderAdminMasterData(c);
          if(c) c.innerHTML='<div class="card">Memuat Data Master...</div>';
        };
      }
      return true;
    }catch(err){console.warn('Data Master module patch:',err);return false}
  }

  function injectAdminQuickAccess(){
    if(!isAdmin() || typeof window.__cqAdminSidebarClean!=='undefined') return;
    const sidebar=document.getElementById('sidebar');
    if(!sidebar || sidebar.querySelector('#cq-admin-master-quick')) return;
    const nodes=[...sidebar.querySelectorAll('*')];
    const title=nodes.find(el=>String(el.textContent||'').trim().toUpperCase()==='AKSES CEPAT');
    if(!title) return;
    let host=title.parentElement;
    if(!host) return;
    const btn=document.createElement('button');
    btn.id='cq-admin-master-quick';
    btn.type='button';
    btn.textContent='Data Master';
    btn.setAttribute('aria-label','Buka Data Master');
    btn.style.cssText='width:100%;margin-top:8px;min-height:44px;padding:10px 14px;border:1px solid rgba(8,124,120,.22);border-radius:12px;background:#eef7f6;color:#102f3a;font:700 14px/1.2 Inter,system-ui,sans-serif;text-align:left;cursor:pointer;';
    btn.addEventListener('click',openDataMaster);
    host.appendChild(btn);
  }

  function enforceModuleRoles(){
    try{
      ensureAdminMasterModule();
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
      if(key==='data-master'){
        ensureAdminMasterModule();
        if(isAdmin()&&typeof window.renderAdminMasterData==='function'){
          try{activeModule='data-master'}catch(_){ }
          if(typeof renderSidebar==='function')renderSidebar();
          return window.renderAdminMasterData(document.getElementById('content'));
        }
      }
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
      setTimeout(function(){
        try{
          if(typeof renderSidebar==='function') renderSidebar();
          injectAdminQuickAccess();
        }catch(_){ }
      },80);
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
      const out=originalRenderSidebar.apply(this,arguments);
      setTimeout(injectAdminQuickAccess,0);
      return out;
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

  const observer=new MutationObserver(function(){cleanDashboard();injectAdminQuickAccess()});
  document.addEventListener('DOMContentLoaded',function(){
    enforceModuleRoles();
    const target=document.getElementById('content')||document.body;
    if(target) observer.observe(document.body,{childList:true,subtree:true});
    cleanDashboard();
    setTimeout(function(){
      try{
        ensureAdminMasterModule();
        if(isAdmin()&&typeof renderSidebar==='function') renderSidebar();
        injectAdminQuickAccess();
      }catch(_){ }
    },250);
  });

  window.__cqKabidRoleScopeFix=true;
})();

/* Load the dedicated clean Admin sidebar after all legacy sidebar patches. */
(function(){
  if(document.querySelector('script[data-cq-admin-clean]')) return;
  const s=document.createElement('script');
  s.src='admin-sidebar-clean.js?v=20260908-adminclean1';
  s.dataset.cqAdminClean='1';
  document.head.appendChild(s);
})();

/* Load teacher/walas sidebar cleanup after the legacy menu patches. */
(function(){
  if(document.querySelector('script[data-cq-teacher-walas-clean]')) return;
  const s=document.createElement('script');
  s.src='teacher-walas-sidebar-clean.js?v=20260911-teacherwalas2';
  s.dataset.cqTeacherWalasClean='1';
  document.head.appendChild(s);
})();

/* Load internal feedback/report routing after sidebar cleanup. */
(function(){
  if(document.querySelector('script[data-cq-internal-report-center]')) return;
  const s=document.createElement('script');
  s.src='internal-report-center.js?v=20260911-report1';
  s.dataset.cqInternalReportCenter='1';
  document.head.appendChild(s);
})();
