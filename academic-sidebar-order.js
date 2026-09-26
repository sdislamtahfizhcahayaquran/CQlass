// CQlass — Sidebar order & Timesheet placement guard
// Timesheet berada di grup Laporan. Cetak Rapor selalu paling akhir di Akademik.
(function(){
  // Timesheet adalah menu input untuk tenaga pengajar dan petugas Pengabdian.
  // Catatan penting: role "tahfizh" di CQlass adalah Kabid Tahfizh, BUKAN Guru Tahfizh,
  // sehingga sengaja tidak dimasukkan. Guru Tahfizh memakai akun guru/partner sesuai assignment.
  // Pengabdian hanya menerima tugas badal/aktivitas kerja; bukan pengelola akademik atau Tahfizh.
  const TIMESHEET_ROLES=['guru','walas','partner','guru_partner','pengabdian'];

  // Pulihkan pola sebelum isolasi role 24 Sep: Walas tetap Guru Mapel,
  // dengan fitur wali kelas sebagai tambahan. Keduanya memakai satu cleaner yang sama.
  function restoreTeacherWalasStructure(){
    try{
      const r=String((typeof currentUser!=='undefined'&&currentUser?.role)||'').trim().toLowerCase();
      if(r!=='guru'&&r!=='walas') return false;
      if(window.__cqTeacherWalasSidebarClean) return true;
      if(document.querySelector('script[data-cq-teacher-walas-clean]')) return true;
      const s=document.createElement('script');
      s.src='teacher-walas-sidebar-clean.js?v=20260924-role-restore1';
      s.dataset.cqTeacherWalasClean='1';
      s.onload=function(){
        try{if(typeof renderSidebar==='function')renderSidebar()}catch(_){}
      };
      document.head.appendChild(s);
      return true;
    }catch(_){return false}
  }

  function ensurePengabdianDashboard(){
    try{
      if(typeof DASHBOARD_MODULE!=='undefined'&&Array.isArray(DASHBOARD_MODULE.roles)&&!DASHBOARD_MODULE.roles.includes('pengabdian')){
        DASHBOARD_MODULE.roles.push('pengabdian');
      }
    }catch(err){console.warn('Dashboard Pengabdian gagal dipasang',err)}
  }

  function relocateTimesheet(){
    try{
      if(typeof MODULE_GROUPS==='undefined') return false;
      const academic=MODULE_GROUPS.find(g=>g&&g.id==='akademik');
      let reports=MODULE_GROUPS.find(g=>g&&g.id==='laporan');
      if(!reports){
        reports={id:'laporan',label:'Laporan',roles:[],items:[]};
        MODULE_GROUPS.push(reports);
      }
      if(!Array.isArray(reports.roles)) reports.roles=[];
      if(!Array.isArray(reports.items)) reports.items=[];
      TIMESHEET_ROLES.forEach(r=>{if(!reports.roles.includes(r)) reports.roles.push(r)});

      let item=null;
      for(const group of MODULE_GROUPS){
        if(!Array.isArray(group?.items)) continue;
        const idx=group.items.findIndex(x=>x&&x.id==='timesheet');
        if(idx>=0){
          const [found]=group.items.splice(idx,1);
          if(!item) item=found;
        }
      }
      if(!item&&typeof window.renderTeacherTimesheet==='function'){
        item={id:'timesheet',label:'Timesheet',roles:[...TIMESHEET_ROLES],built:true,render:window.renderTeacherTimesheet};
      }
      if(item){
        item.label='Timesheet';
        item.roles=[...TIMESHEET_ROLES];
        item.built=true;
        item.render=window.renderTeacherTimesheet||item.render;
        reports.items.push(item);
        // Walas/Guru: urutan Laporan final harus Timesheet, Promosi Socmed, Saran & Masukan.
        const r=String((typeof currentUser!=='undefined'&&currentUser?.role)||'').toLowerCase();
        if(r==='walas'||r==='guru'){
          const allowed=new Set(['timesheet','laporan-promosi','internal-feedback']);
          for(const it of reports.items){
            if(!it||!Array.isArray(it.roles))continue;
            if(!allowed.has(String(it.id||'')))it.roles=it.roles.filter(x=>!['walas','guru'].includes(String(x||'').toLowerCase()));
          }
          const order=['timesheet','laporan-promosi','internal-feedback','academic-ranking-report'];
          reports.items.sort((a,b)=>{const ai=order.indexOf(String(a?.id||'')),bi=order.indexOf(String(b?.id||''));return(ai<0?99:ai)-(bi<0?99:bi)});
        }
      }
      return Boolean(item||reports.items.some(x=>x&&x.id==='timesheet'));
    }catch(err){
      console.warn('Pemindahan Timesheet gagal',err);
      return false;
    }
  }

  function fixAcademicOrder(){
    try{
      if(typeof MODULE_GROUPS==='undefined') return false;
      const group=MODULE_GROUPS.find(g=>g&&g.id==='akademik');
      if(!group||!Array.isArray(group.items)) return false;
      const idx=group.items.findIndex(item=>item&&item.id==='rapor');
      if(idx<0) return false;
      if(idx!==group.items.length-1){
        const [rapor]=group.items.splice(idx,1);
        group.items.push(rapor);
      }
      return true;
    }catch(err){
      console.warn('Academic sidebar order gagal',err);
      return false;
    }
  }

  function fixSidebar(){
    restoreTeacherWalasStructure();
    ensurePengabdianDashboard();
    relocateTimesheet();
    fixAcademicOrder();
  }

  function install(){
    restoreTeacherWalasStructure();
    fixSidebar();
    if(typeof renderSidebar==='function'&&!renderSidebar.__cqlassSidebarOrderGuard){
      const original=renderSidebar;
      const wrapped=function(){
        restoreTeacherWalasStructure();
        fixSidebar();
        return original.apply(this,arguments);
      };
      wrapped.__cqlassSidebarOrderGuard=true;
      wrapped.__cqlassRaporLast=true;
      renderSidebar=wrapped;
    }
    try{
      if(typeof currentUser!=='undefined'&&currentUser&&typeof renderSidebar==='function') renderSidebar();
    }catch(_){}
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',install);
  else install();
})();
