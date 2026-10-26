/* CQlass — Academic menu projection.
   One ordered view for the active Academic role; never mutate the shared registry.
   app-core owns sidebar rendering, lookup and navigation. */
(function(){
  'use strict';
  if(window.__CQ_ACADEMIC_SIDEBAR_CLEAN_V1__)return;
  const roles=['akademik','kabid_akademik','academic'];
  function isAcademic(){
    const u=typeof currentUser!=='undefined'?currentUser:null;
    const role=String(u?.role||u?.role_code||u?.primary_role||'').trim().toLowerCase().replace(/[\s-]+/g,'_');
    return roles.includes(role);
  }
  function groups(){
    if(!isAcademic()||typeof MODULE_GROUPS==='undefined'||!Array.isArray(MODULE_GROUPS))return null;
    const registry=new Map();
    for(const group of MODULE_GROUPS)for(const item of group.items||[]){
      if(!item?.id)continue;
      const prior=registry.get(item.id);
      if(!prior||(!prior.render&&typeof item.render==='function'))registry.set(item.id,item);
    }
    function item(id,label,renderer){
      const source=registry.get(id);
      const render=renderer||source?.render;
      if(typeof render!=='function'||source?.built===false)return null;
      return {...source,id,label:label||source?.label||id,roles:roles.slice(),built:true,render};
    }
    const rpp=registry.has('rpp-lp-akademik')?'rpp-lp-akademik':'rpp-lp';
    return [
      {id:'akademik',label:'Akademik',roles:roles.slice(),items:[
        item('leger'),item('master-tp-akademik'),item(rpp,'RPP & LP'),
        item('bilingual'),item('pjbl'),item('akd-badal'),item('jadwal-mengajar')
      ].filter(Boolean)},
      {id:'academic-monitoring',label:'Monitoring',roles:roles.slice(),items:[
        item('legger-live','Monitoring Nilai'),
        item('academic-ranking-report','Ranking',window.renderAcademicRankingReport),
        item('laporan-akademik-guru','Progres Guru')
      ].filter(Boolean)},
      {id:'laporan',label:'Laporan',roles:roles.slice(),items:[
        item('akd-badal-recap','Rekapan Badal'),item('academic-pjbl-report','Laporan PjBL'),
        item('rapor','Cetak Rapor'),item('laporan-promosi','Promo Socmed',window.renderPromotionReport),
        item('academic-download-data','Download Data',window.renderAcademicDownloadData)
      ].filter(Boolean)}
    ];
  }
  window.cqAcademicMenuGroups=groups;
  window.__CQ_ACADEMIC_SIDEBAR_CLEAN_V1__=true;
  if(isAcademic()&&typeof renderSidebar==='function')renderSidebar();
})();
