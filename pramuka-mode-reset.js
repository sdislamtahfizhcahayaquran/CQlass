/* CQlass — pisahkan mode Rapor Kegiatan Walas dari Input Pramuka */
(function(){
  'use strict';
  if(window.__cqPramukaModeReset)return;
  document.addEventListener('click',function(e){
    const item=e.target?.closest?.('#sidebar .nav-item');
    if(!item)return;
    const label=String(item.textContent||'').trim();
    if(label==='Input Pramuka'){
      window.__cqPramukaInputOnly=true;
      return;
    }
    if(label==='Rapor Kegiatan') window.__cqPramukaInputOnly=false;
  },true);
  window.__cqPramukaModeReset=true;
})();
