/* CQlass compatibility/theme loader
   1) Shared typography, sidebar vine, and single building hero for every role.
   2) School logo favicon for every role/page.
   3) Kabid Akademik deterministic header V9 compatibility.
   4) Sapras dashboard hard guard so generic role dashboard cannot override Sapras.
   5) Rapor document style isolation so dashboard CSS cannot alter printable report geometry.
*/
(function(){
  'use strict';
  var THEME='20260922-theme6-raporisolated1';
  var SAPRAS_FIX='20260915-sapras-hard1';
  var FAVICON='logo_sd.png?v=20260910-favicon1';

  function ensureFavicon(){
    var links=document.querySelectorAll('link[rel="icon"],link[rel="shortcut icon"]');
    if(links.length){
      links.forEach(function(l){
        l.setAttribute('href',FAVICON);
        l.setAttribute('type','image/png');
      });
    }else{
      var icon=document.createElement('link');
      icon.rel='icon';
      icon.type='image/png';
      icon.href=FAVICON;
      document.head.appendChild(icon);
    }

    var shortcut=document.querySelector('link[rel="shortcut icon"]');
    if(!shortcut){
      shortcut=document.createElement('link');
      shortcut.rel='shortcut icon';
      shortcut.type='image/png';
      shortcut.href=FAVICON;
      document.head.appendChild(shortcut);
    }

    var apple=document.querySelector('link[rel="apple-touch-icon"]');
    if(!apple){
      apple=document.createElement('link');
      apple.rel='apple-touch-icon';
      document.head.appendChild(apple);
    }
    apple.href=FAVICON;
  }

  function ensureStyle(){
    var l=document.querySelector('link[data-cq-global-role-theme]');
    if(!l){
      l=document.createElement('link');
      l.rel='stylesheet';
      l.dataset.cqGlobalRoleTheme='1';
      document.head.appendChild(l);
    }
    var next='cq-global-role-theme.css?v='+THEME;
    if(!l.href||l.href.indexOf(THEME)<0)l.href=next;

    var r=document.querySelector('link[data-cq-rapor-style-guard]');
    if(!r){
      r=document.createElement('link');
      r.rel='stylesheet';
      r.dataset.cqRaporStyleGuard='1';
      document.head.appendChild(r);
    }
    var raporNext='rapor-style-isolation.css?v='+THEME;
    if(!r.href||r.href.indexOf(THEME)<0)r.href=raporNext;
  }

  function ensureGlobalRuntime(){
    if(window.__CQ_GLOBAL_ROLE_THEME_V3__) return;
    var old=document.querySelector('script[data-cq-global-role-theme]');
    if(old)old.remove();
    var g=document.createElement('script');
    g.src='cq-global-role-theme.js?v='+THEME;
    g.dataset.cqGlobalRoleTheme='1';
    g.async=false;
    document.head.appendChild(g);
  }

  function ensureAcademicHeader(){
    if(window.__CQ_AK_HEADER_V9__ || document.querySelector('script[data-cq-ak-header-v9]')) return;
    var s=document.createElement('script');
    s.src='academic-header-shell-v9.js?v=20260910-v9b';
    s.dataset.cqAkHeaderV9='1';
    s.async=false;
    s.onload=function(){
      try{window.dispatchEvent(new Event('load'));}catch(_){ }
    };
    document.head.appendChild(s);
  }

  function ensureSaprasHardGuard(){
    var css=document.querySelector('link[data-cq-sapras-hard-css]');
    if(!css){
      css=document.createElement('link');
      css.rel='stylesheet';
      css.href='sapras-dashboard-hard-guard.css?v='+SAPRAS_FIX;
      css.dataset.cqSaprasHardCss='1';
      document.head.appendChild(css);
    }
    if(window.__CQ_SAPRAS_HARD_GUARD__ || document.querySelector('script[data-cq-sapras-hard-guard]')) return;
    var s=document.createElement('script');
    s.src='sapras-dashboard-hard-guard.js?v='+SAPRAS_FIX;
    s.dataset.cqSaprasHardGuard='1';
    s.async=false;
    document.head.appendChild(s);
  }

  ensureFavicon();
  ensureStyle();
  ensureGlobalRuntime();
  ensureAcademicHeader();
  ensureSaprasHardGuard();
})();