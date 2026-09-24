(function(){
  'use strict';
  var FAVICON='logo_sd.png?v=20260924-favicon-school1';
  function apply(){
    document.querySelectorAll('link[rel="icon"],link[rel="shortcut icon"],link[rel="apple-touch-icon"]').forEach(function(el){el.remove();});
    var icon=document.createElement('link');
    icon.rel='icon';
    icon.type='image/png';
    icon.href=FAVICON;
    document.head.appendChild(icon);
    var shortcut=document.createElement('link');
    shortcut.rel='shortcut icon';
    shortcut.type='image/png';
    shortcut.href=FAVICON;
    document.head.appendChild(shortcut);
    var apple=document.createElement('link');
    apple.rel='apple-touch-icon';
    apple.href=FAVICON;
    document.head.appendChild(apple);
  }
  apply();
  document.addEventListener('DOMContentLoaded',apply,{once:true});
  window.addEventListener('load',apply,{once:true});
})();
