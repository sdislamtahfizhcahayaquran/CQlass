/* Fallback loader: ensure Kabid Kegiatan report grades card is loaded even with stale internal loader cache. */
(function(){
  'use strict';
  function ensure(){
    if(window.kxrgRefresh || document.getElementById('kx-report-grade-card')) return;
    if(document.querySelector('script[src*="kegiatan-exkul-report-grades.js"]')) return;
    var s=document.createElement('script');
    s.src='kegiatan-exkul-report-grades.js?v=20260921-reportgrades3';
    s.async=false;
    document.head.appendChild(s);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',function(){setTimeout(ensure,250)});
  else setTimeout(ensure,250);
})();
