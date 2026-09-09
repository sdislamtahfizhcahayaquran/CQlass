/* CQlass — compatibility loader: Kabid Akademik header V9 */
(function(){
  'use strict';
  if(window.__CQ_AK_HEADER_V9__ || document.querySelector('script[data-cq-ak-header-v9]')) return;
  var s=document.createElement('script');
  s.src='academic-header-shell-v9.js?v=20260910-v9b';
  s.dataset.cqAkHeaderV9='1';
  s.async=false;
  s.onload=function(){
    try{window.dispatchEvent(new Event('load'));}catch(_){ }
  };
  document.head.appendChild(s);
})();
