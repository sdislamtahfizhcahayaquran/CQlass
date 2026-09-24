/* CQlass — restore the original PTS Tahfizh report appearance.
   The report already has its own stable layout and English normalization elsewhere.
   This compatibility layer only removes the temporary bordered-table polish. */
(function(){
  'use strict';

  function restore(){
    const injected=document.getElementById('cq-tahfizh-report-preview-polish-css');
    if(injected) injected.remove();

    document.querySelectorAll('#rpv-preview .rpv-tahfizh').forEach(table=>{
      try{ delete table.dataset.cqTemplate; }catch(_){ }
      table.style.removeProperty('border-collapse');
      table.style.removeProperty('table-layout');
      table.style.removeProperty('font-size');
      table.style.removeProperty('line-height');
      table.querySelectorAll('td,th,tr').forEach(el=>{
        el.style.removeProperty('border');
        el.style.removeProperty('height');
        el.style.removeProperty('background');
        el.style.removeProperty('padding');
      });
    });
  }

  window.CQRestoreTahfizhReportLegacy=restore;
  restore();
  document.addEventListener('DOMContentLoaded',restore);
  document.addEventListener('cq:rapor-preview-rendered',restore);
  new MutationObserver(()=>{
    if(document.querySelector('#rpv-preview .rpv-tahfizh')) requestAnimationFrame(restore);
  }).observe(document.documentElement,{childList:true,subtree:true});
})();
