/* CQlass — clean sidebar for Guru Mapel & Walas
   Guru: Pembelajaran + Kesiswaan + Laporan.
   Walas: sama, ditambah Cetak Rapor sebagai grup terakhir.
   Request/Laporan Kesiswaan tidak boleh tampil untuk Guru/Walas.
   Laporan Guru Bulanan disembunyikan karena sudah tidak relevan.
*/
(function(){
  'use strict';
  if(window.__cqTeacherWalasSidebarClean) return;

  const TEACHER_ROLES=['guru','walas'];
  const LEARNING_IDS=['leger','rpp-lp','pjbl','bilingual'];
  const LABELS={leger:'Input Nilai','rpp-lp':'RPP & LP',pjbl:'PjBL',bilingual:'Bilingual'};

  function without(arr,vals){
    arr=Array.isArray(arr)?arr:[];
    return arr.filter(x=>!vals.includes(x));
  }
  function cloneItem(item,roles,label){
    return {...item,label:label||item.label,roles:[...roles]};
  }
  function findItem(id){
    if(typeof MODULE_GROUPS==='undefined') return null;
    for(const g of MODULE_GROUPS){
      const item=(g?.items||[]).find(x=>x&&x.id===id);
      if(item) return item;
    }
    return null;
  }
  function removeGroup(id){
    const i=MODULE_GROUPS.findIndex(g=>g&&g.id===id);
    if(i>=0) MODULE_GROUPS.splice(i,1);
  }
  function isKesiswaanReportRequest(item){
    if(!item) return false;
    const text=`${item.id||''} ${item.label||''}`.toLowerCase();
    return (text.includes('request')||text.includes('permintaan')) && text.includes('laporan');
  }

  function cleanStructure(){
    try{
      if(typeof MODULE_GROUPS==='undefined'||!Array.isArray(MODULE_GROUPS)) return false;

      // Guard utama: Request Laporan adalah fitur internal HRD/Kesiswaan,
      // sehingga role guru dan walas tidak pernah mendapat item tersebut.
      for(const group of MODULE_GROUPS){
        if(!group) continue;
        if(Array.isArray(group.items)){
          group.items.forEach(item=>{
            if(isKesiswaanReportRequest(item)) item.roles=without(item.roles,TEACHER_ROLES);
          });
        }
      }

      // Laporan Guru Bulanan sudah tidak dipakai lagi.
      const reports=MODULE_GROUPS.find(g=>g&&g.id==='laporan');
      if(reports&&Array.isArray(reports.items)){
        reports.items=reports.items.filter(x=>x&&x.id!=='laporan-guru');
        if(!Array.isArray(reports.roles)) reports.roles=[];
        TEACHER_ROLES.forEach(r=>{if(!reports.roles.includes(r)) reports.roles.push(r)});
      }

      const academic=MODULE_GROUPS.find(g=>g&&g.id==='akademik');
      if(!academic||!Array.isArray(academic.items)) return false;

      // Ambil modul inti guru dari struktur yang sudah ada.
      const learningItems=[];
      for(const id of LEARNING_IDS){
        const src=findItem(id);
        if(src) learningItems.push(cloneItem(src,TEACHER_ROLES,LABELS[id]));
      }

      // Modul asli tetap tersedia untuk Kabid/Pimpinan, tetapi tidak dobel di guru/walas.
      for(const id of LEARNING_IDS){
        const src=findItem(id);
        if(src) src.roles=without(src.roles,TEACHER_ROLES);
      }
      academic.roles=without(academic.roles,TEACHER_ROLES);

      // Pembelajaran khusus guru/walas.
      removeGroup('pembelajaran-guru');
      const learningGroup={id:'pembelajaran-guru',label:'Pembelajaran',roles:[...TEACHER_ROLES],items:learningItems};
      const studentIndex=MODULE_GROUPS.findIndex(g=>g&&g.id==='kesiswaan');
      MODULE_GROUPS.splice(studentIndex>=0?studentIndex:0,0,learningGroup);

      // Cetak Rapor khusus Walas dibuat sebagai grup paling akhir.
      const rapor=academic.items.find(x=>x&&x.id==='rapor');
      removeGroup('akademik-walas');
      if(rapor){
        rapor.roles=without(rapor.roles,['walas']);
        MODULE_GROUPS.push({
          id:'akademik-walas',
          label:'Akademik',
          roles:['walas'],
          items:[cloneItem(rapor,['walas'],'Cetak Rapor')]
        });
      }

      return true;
    }catch(err){
      console.warn('Sidebar guru/walas gagal dirapikan:',err);
      return false;
    }
  }

  function install(){
    cleanStructure();
    if(typeof renderSidebar==='function'&&!renderSidebar.__cqTeacherWalasClean){
      const original=renderSidebar;
      const wrapped=function(){
        cleanStructure();
        return original.apply(this,arguments);
      };
      wrapped.__cqTeacherWalasClean=true;
      renderSidebar=wrapped;
    }
    try{
      if(typeof currentUser!=='undefined'&&currentUser&&typeof renderSidebar==='function') renderSidebar();
    }catch(_){}
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',install);
  else install();
  window.__cqTeacherWalasSidebarClean=true;
})();
