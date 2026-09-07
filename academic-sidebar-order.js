// CQlass — Sidebar order & Timesheet placement guard
// Timesheet berada di grup Laporan. Cetak Rapor selalu paling akhir di Akademik.
(function(){
  const TIMESHEET_ROLES=['guru','walas','akademik','pimpinan','admin'];

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
    relocateTimesheet();
    fixAcademicOrder();
  }

  function install(){
    fixSidebar();
    if(typeof renderSidebar==='function'&&!renderSidebar.__cqlassSidebarOrderGuard){
      const original=renderSidebar;
      const wrapped=function(){
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
