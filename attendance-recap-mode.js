(function(){
  window.__CQ_ATTENDANCE_RECAP_MODE_LEGACY_DISABLED__=true;
  if(!document.querySelector('script[data-cq-raw-exkul]')){
    var s=document.createElement('script');
    s.src='extracurricular-raw-ui.js?v=20260916-raw2';
    s.dataset.cqRawEkskul='1';
    document.head.appendChild(s);
  }

  function isAdmin(){try{return String(currentUser?.role||'').toLowerCase()==='admin'}catch(_){return false}}
  window.openCleanAdminRawEkskul=function(){
    if(!isAdmin())return;
    window.__cqAdminActive='raw-ekskul';
    var c=document.getElementById('content');
    if(!c)return;
    if(typeof window.renderAdminRawEkskul==='function')return window.renderAdminRawEkskul(c);
    c.innerHTML='<div class="card">Memuat Raw Ekskul...</div>';
    var n=0,t=setInterval(function(){
      if(typeof window.renderAdminRawEkskul==='function'){clearInterval(t);window.renderAdminRawEkskul(c)}
      else if(++n>40){clearInterval(t);c.innerHTML='<div class="card">Raw Ekskul belum dapat dimuat. Silakan muat ulang halaman.</div>'}
    },100);
  };
  function addAdminButton(){
    if(!isAdmin())return;
    var side=document.querySelector('.cq-admin-side');
    if(!side||side.querySelector('[data-admin-nav="raw-ekskul"]'))return;
    var ref=side.querySelector('[data-admin-nav="data-master"]');
    if(!ref)return;
    var b=document.createElement('button');
    b.type='button';b.className='cq-admin-nav'+(window.__cqAdminActive==='raw-ekskul'?' active':'');b.dataset.adminNav='raw-ekskul';
    b.innerHTML='<svg viewBox="0 0 24 24"><path d="M4 5h16v14H4z"/><path d="M8 9h8M8 13h8M8 17h5"/></svg><span>Raw Ekskul</span>';
    b.onclick=window.openCleanAdminRawEkskul;
    ref.insertAdjacentElement('afterend',b);
  }
  var mo=new MutationObserver(function(){setTimeout(addAdminButton,0)});
  document.addEventListener('DOMContentLoaded',function(){mo.observe(document.body,{childList:true,subtree:true});setTimeout(addAdminButton,400)});
  setTimeout(addAdminButton,1200);
})();