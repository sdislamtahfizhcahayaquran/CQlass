/* CQlass — final cleanup for Kabid Kesiswaan navigation */
(function(){
  'use strict';
  if(window.__cqKesiswaanFinalCleanup)return;
  window.__cqKesiswaanFinalCleanup=true;
  function apply(){
    try{
      if(typeof MODULE_GROUPS==='undefined'||!Array.isArray(MODULE_GROUPS))return false;
      const report=MODULE_GROUPS.find(g=>g&&g.id==='laporan');
      if(report&&Array.isArray(report.items)){
        // Legacy placeholder is obsolete: the live Laporan Kesiswaan already exports its recap.
        report.items=report.items.filter(it=>it&&it.id!=='laporan-unduh');
      }
      if(typeof renderSidebar==='function')renderSidebar();
      return true;
    }catch(e){console.warn('Kesiswaan final cleanup:',e);return false}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(apply,350));
  else setTimeout(apply,350);
  setTimeout(apply,1200);
  setTimeout(apply,3000);
})();
