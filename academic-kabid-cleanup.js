/* CQlass — compatibility loader for final Kabid dashboards. */
(function(){
  'use strict';
  function loadFinal(){
    if(!document.querySelector('script[data-cq-ak-final]')&&!window.__CQ_AK_FINAL__){const s=document.createElement('script');s.src='academic-kabid-dashboard-final.js?v=20260909-fix1';s.dataset.cqAkFinal='1';s.async=false;(document.body||document.head).appendChild(s)}
    if(!document.querySelector('script[data-cq-profile-photo-zoom]')){const z=document.createElement('script');z.src='profile-photo-zoom.js?v=20260911-zoom1';z.dataset.cqProfilePhotoZoom='1';z.async=false;(document.body||document.head).appendChild(z)}
    if(!document.querySelector('script[data-cq-badal-v2]')&&!window.__CQ_BADAL_V2__){const b=document.createElement('script');b.src='academic-badal-v2.js?v=20260915-2';b.dataset.cqBadalV2='1';b.async=false;(document.body||document.head).appendChild(b)}
    if(!document.querySelector('script[data-cq-tahfizh-badal]')&&!window.__CQ_TAHFIZH_BADAL__){const t=document.createElement('script');t.src='tahfizh-badal.js?v=20260915-1';t.dataset.cqTahfizhBadal='1';t.async=false;(document.body||document.head).appendChild(t)}
    if(!document.querySelector('script[data-cq-tahfizh-kabid-dash]')&&!window.__CQ_TAHFIZH_KABID_DASH__){const k=document.createElement('script');k.src='tahfizh-kabid-dashboard.js?v=20260916-critical1';k.dataset.cqTahfizhKabidDash='1';k.async=false;(document.body||document.head).appendChild(k)}
  }
  if(document.readyState==='complete') setTimeout(loadFinal,0); else window.addEventListener('load',()=>setTimeout(loadFinal,0),{once:true});
})();
