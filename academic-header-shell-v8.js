/* CQlass compatibility/theme loader
   1) Shared typography, sidebar vine, and single building hero for every role.
   2) School logo favicon for every role/page.
   3) Kabid Akademik deterministic header V9 compatibility.
*/
(function(){
  'use strict';
  var THEME='20260910-theme4';
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

  ensureFavicon();
  ensureStyle();
  ensureGlobalRuntime();
  ensureAcademicHeader();
})();
