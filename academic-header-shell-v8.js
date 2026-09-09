/* CQlass compatibility/theme loader
   1) Shared lightweight visual language for every role.
   2) Kabid Akademik deterministic header V9 compatibility.
*/
(function(){
  'use strict';

  function ensureStyle(){
    if(document.querySelector('link[data-cq-global-role-theme]')) return;
    var l=document.createElement('link');
    l.rel='stylesheet';
    l.href='cq-global-role-theme.css?v=20260910-theme1';
    l.dataset.cqGlobalRoleTheme='1';
    document.head.appendChild(l);
  }

  function ensureGlobalRuntime(){
    if(window.__CQ_GLOBAL_ROLE_THEME__ || document.querySelector('script[data-cq-global-role-theme]')) return;
    var g=document.createElement('script');
    g.src='cq-global-role-theme.js?v=20260910-theme1';
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

  ensureStyle();
  ensureGlobalRuntime();
  ensureAcademicHeader();
})();
