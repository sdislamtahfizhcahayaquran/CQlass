/* CQlass — compatibility loader for the final Kabid Akademik dashboard.
   Deliberately loaded after the page finishes so legacy dashboard patches cannot override it. */
(function(){
  'use strict';
  function loadFinal(){
    if(!document.querySelector('script[data-cq-ak-final]')&&!window.__CQ_AK_FINAL__){
      const s=document.createElement('script');
      s.src='academic-kabid-dashboard-final.js?v=20260909-fix1';
      s.dataset.cqAkFinal='1';
      s.async=false;
      (document.body||document.head).appendChild(s);
    }
    if(!document.querySelector('script[data-cq-profile-photo-zoom]')){
      const z=document.createElement('script');
      z.src='profile-photo-zoom.js?v=20260911-zoom1';
      z.dataset.cqProfilePhotoZoom='1';
      z.async=false;
      (document.body||document.head).appendChild(z);
    }
  }
  if(document.readyState==='complete') setTimeout(loadFinal,0);
  else window.addEventListener('load',()=>setTimeout(loadFinal,0),{once:true});
})();
