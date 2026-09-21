/* CQlass — final cleanup for Kabid Kesiswaan navigation */
(function(){
  'use strict';
  if(window.__cqKesiswaanFinalCleanupV2)return;
  window.__cqKesiswaanFinalCleanupV2=true;
  const REMOVE=new Set(['laporan-unduh','sac-pembinaan','sac-kasus','sac-kedisiplinan','sac-perizinan','sac-kesehatan','sac-komunikasi_orangtua','sac-catatan_siswa']);
  function apply(){
    try{
      if(typeof MODULE_GROUPS==='undefined'||!Array.isArray(MODULE_GROUPS))return false;
      const report=MODULE_GROUPS.find(g=>g&&g.id==='laporan');
      if(report&&Array.isArray(report.items))report.items=report.items.filter(it=>it&&!REMOVE.has(String(it.id||'')));
      if(typeof renderSidebar==='function')renderSidebar();
      return true;
    }catch(e){console.warn('Kesiswaan final cleanup:',e);return false}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(apply,250));
  else setTimeout(apply,250);
  setTimeout(apply,900);
  setTimeout(apply,2200);
})();
