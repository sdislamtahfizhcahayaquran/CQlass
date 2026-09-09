/* CQlass — Kabid Akademik Header/Shell V9
   Deterministic header rebuild for Kabid Akademik.
   Recreates missing header nodes instead of only styling legacy DOM.
*/
(function(){
  'use strict';
  if(window.__CQ_AK_HEADER_V9__) return;

  function norm(v){return String(v||'').trim().toLowerCase().replace(/[\s-]+/g,'_');}
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];});}
  function readUser(){
    try{if(typeof currentUser!=='undefined'&&currentUser)return currentUser;}catch(_){ }
    try{return JSON.parse(localStorage.getItem('cqlass_user')||'null')||{};}catch(_){return {};}
  }
  function isAcademic(){
    var u=readUser()||{};
    var vals=[u.role,u.role_code,u.primary_role].concat(Array.isArray(u.roles)?u.roles:[]).map(norm).filter(Boolean);
    return vals.some(function(r){return r==='akademik'||r==='kabid_akademik'||r==='academic'||r.indexOf('kabid_akademik')>=0||r.indexOf('academic')>=0;});
  }
  function displayName(){
    var u=readUser()||{};
    return u.nama||u.full_name||u.name||u.teacher_name||u.display_name||u.username||'Kabid Akademik';
  }
  function initials(v){
    var clean=String(v||'KA').replace(/[^A-Za-zÀ-ÿ\s]/g,' ').trim();
    return clean.split(/\s+/).filter(Boolean).slice(0,2).map(function(x){return x.charAt(0).toUpperCase();}).join('')||'KA';
  }
  function injectCss(){
    if(document.getElementById('cq-ak-header-v9-css')) return;
    var s=document.createElement('style');
    s.id='cq-ak-header-v9-css';
    s.textContent=`
      body.cq-ak-shell-v9 #app-screen{display:block!important;min-height:100vh!important;background:#f4fbf8!important}
      body.cq-ak-shell-v9 #app-screen>.topbar{height:72px!important;min-height:72px!important;padding:9px 22px!important;background:rgba(255,255,255,.98)!important;color:#0b3f39!important;border-bottom:1px solid #dcebe6!important;box-shadow:0 5px 20px rgba(7,59,56,.07)!important;display:flex!important;align-items:center!important;justify-content:space-between!important;gap:20px!important;position:sticky!important;top:0!important;z-index:1000!important;backdrop-filter:blur(14px)!important;-webkit-backdrop-filter:blur(14px)!important;box-sizing:border-box!important}
      body.cq-ak-shell-v9 .cq-ak-top-left{display:flex!important;align-items:center!important;gap:11px!important;min-width:230px!important;flex:0 0 auto!important}
      body.cq-ak-shell-v9 .cq-ak-top-logo{width:43px!important;height:43px!important;object-fit:contain!important;display:block!important;flex:0 0 43px!important}
      body.cq-ak-shell-v9 .cq-ak-brand{display:flex!important;flex-direction:column!important;justify-content:center!important;min-width:0!important}
      body.cq-ak-shell-v9 .cq-ak-brand strong{font:800 18px/1.05 'Plus Jakarta Sans',Inter,sans-serif!important;letter-spacing:-.025em!important;color:#073b38!important;white-space:nowrap!important}
      body.cq-ak-shell-v9 .cq-ak-brand span{margin-top:4px!important;font:650 10px/1.1 Inter,sans-serif!important;color:#688079!important;white-space:nowrap!important}
      body.cq-ak-shell-v9 .cq-ak-top-right{margin-left:auto!important;display:flex!important;align-items:center!important;justify-content:flex-end!important;gap:9px!important;min-width:0!important;flex:0 1 auto!important}
      body.cq-ak-shell-v9 .cq-ak-user-photo{width:38px!important;height:38px!important;min-width:38px!important;border-radius:50%!important;display:flex!important;align-items:center!important;justify-content:center!important;overflow:hidden!important;background:linear-gradient(145deg,#e8f7f2,#dff1ed)!important;border:1px solid #d2e8e1!important;color:#0c776c!important;font:900 13px/1 Inter,sans-serif!important}
      body.cq-ak-shell-v9 .cq-ak-user-photo img{width:100%!important;height:100%!important;object-fit:cover!important;display:block!important}
      body.cq-ak-shell-v9 .cq-ak-user-meta{display:flex!important;flex-direction:column!important;justify-content:center!important;min-width:0!important;margin-right:3px!important}
      body.cq-ak-shell-v9 #user-name{display:block!important;color:#153f39!important;font:800 11.5px/1.15 Inter,sans-serif!important;max-width:190px!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important;visibility:visible!important;opacity:1!important}
      body.cq-ak-shell-v9 #user-role{display:block!important;margin-top:3px!important;color:#0b776a!important;font:800 8.5px/1 Inter,sans-serif!important;letter-spacing:.04em!important;text-transform:uppercase!important;white-space:nowrap!important;visibility:visible!important;opacity:1!important;background:transparent!important;padding:0!important;border:0!important}
      body.cq-ak-shell-v9 .cq-ak-icon-btn{width:35px!important;height:35px!important;min-width:35px!important;border-radius:10px!important;border:1px solid #dbe9e5!important;background:#f7fbfa!important;color:#35665e!important;display:flex!important;align-items:center!important;justify-content:center!important;cursor:pointer!important;position:relative!important;padding:0!important}
      body.cq-ak-shell-v9 .cq-ak-icon-btn svg{width:17px!important;height:17px!important;display:block!important}
      body.cq-ak-shell-v9 .cq-ak-header-btn{height:35px!important;border-radius:10px!important;padding:0 12px!important;font:800 9.5px/1 Inter,sans-serif!important;cursor:pointer!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;white-space:nowrap!important}
      body.cq-ak-shell-v9 .cq-ak-account{background:#eef8f5!important;color:#0b776c!important;border:1px solid #d1e8e1!important}
      body.cq-ak-shell-v9 .cq-ak-logout{background:linear-gradient(95deg,#0c665d,#158370)!important;color:#fff!important;border:1px solid #0c756b!important;box-shadow:0 5px 13px rgba(12,117,107,.14)!important}
      body.cq-ak-shell-v9 .cq-ak-badge{position:absolute!important;right:-4px!important;top:-5px!important;min-width:16px!important;height:16px!important;padding:0 4px!important;border-radius:999px!important;display:none;align-items:center!important;justify-content:center!important;background:#e2565d!important;color:#fff!important;font:800 8px/16px Inter,sans-serif!important;border:2px solid #fff!important}
      body.cq-ak-shell-v9 #app-screen>.layout{display:flex!important;min-height:calc(100vh - 72px)!important;visibility:visible!important;opacity:1!important}
      body.cq-ak-shell-v9 #sidebar{display:block!important;flex:0 0 220px!important;visibility:visible!important;opacity:1!important;top:72px!important;height:calc(100vh - 72px)!important;min-height:calc(100vh - 72px)!important}
      body.cq-ak-shell-v9 #content{display:block!important;flex:1 1 auto!important;min-width:0!important;min-height:calc(100vh - 72px)!important;visibility:visible!important;opacity:1!important}
      @media(max-width:1050px){body.cq-ak-shell-v9 .cq-ak-user-meta{display:none!important}body.cq-ak-shell-v9 .cq-ak-account{display:none!important}}
      @media(max-width:700px){body.cq-ak-shell-v9 #app-screen>.topbar{padding:8px 12px!important;height:64px!important;min-height:64px!important}body.cq-ak-shell-v9 .cq-ak-brand span{display:none!important}body.cq-ak-shell-v9 .cq-ak-top-left{min-width:0!important}body.cq-ak-shell-v9 .cq-ak-top-logo{width:38px!important;height:38px!important;flex-basis:38px!important}body.cq-ak-shell-v9 .cq-ak-logout{padding:0 9px!important}body.cq-ak-shell-v9 #sidebar{top:64px!important;height:calc(100vh - 64px)!important}}
    `;
    document.head.appendChild(s);
  }

  function photoHtml(){
    var old=document.getElementById('user-photo-slot');
    if(old){
      var img=old.querySelector('img');
      if(img&&img.getAttribute('src')) return '<img src="'+esc(img.getAttribute('src'))+'" alt="Foto profil">';
    }
    return '<span>'+esc(initials(displayName()))+'</span>';
  }

  function rebuildHeader(){
    var app=document.getElementById('app-screen');
    if(!app) return false;
    var top=app.querySelector(':scope > .topbar');
    if(!top){
      top=document.createElement('div');
      top.className='topbar';
      app.insertBefore(top,app.firstChild||null);
    }
    var photo=photoHtml();
    var n=esc(displayName());
    top.innerHTML=`
      <div class="topbar-left cq-ak-top-left">
        <img src="logo_sd.png" class="topbar-logo cq-ak-top-logo" alt="Logo SDIT Cahaya Qur'an">
        <div class="topbar-title cq-ak-brand"><strong>CQlass</strong><span>SDIT Cahaya Qur'an</span></div>
      </div>
      <div class="topbar-right cq-ak-top-right">
        <div class="user-photo-slot cq-ak-user-photo" id="user-photo-slot">${photo}</div>
        <div class="cq-ak-user-meta"><span id="user-name">${n}</span><span class="role-badge" id="user-role">Kabid Akademik</span></div>
        <div id="bell-wrap" style="position:relative">
          <button type="button" class="bell-btn cq-ak-icon-btn" onclick="toggleBellPanel(event)" aria-label="Notifikasi">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"></path><path d="M10 21h4"></path></svg>
            <span class="bell-badge cq-ak-badge" id="bell-badge">0</span>
          </button>
          <div class="bell-panel" id="bell-panel"></div>
        </div>
        <button type="button" class="account-btn cq-ak-header-btn cq-ak-account" onclick="openAccountModal()">Ubah Akun</button>
        <button type="button" class="logout-btn cq-ak-header-btn cq-ak-logout" onclick="logout()">Keluar</button>
      </div>`;
    return true;
  }

  function ensureLayout(){
    var app=document.getElementById('app-screen');
    if(!app) return;
    app.style.display='block';
    var layout=app.querySelector(':scope > .layout');
    if(layout) layout.style.display='flex';
  }

  function ensureDashboard(){
    var c=document.getElementById('content');
    if(!c) return;
    var empty=!String(c.innerHTML||'').trim();
    var academicDash=!!document.getElementById('cq-ak7');
    if((empty||!academicDash)&&typeof window.renderAcademicDashboardV7==='function'){
      try{
        if(typeof activeModule!=='undefined'&&(activeModule==null||String(activeModule)===''||String(activeModule)==='dashboard')) activeModule='dashboard';
      }catch(_){ }
      try{window.renderAcademicDashboardV7(true);}catch(e){console.error('AK Header V9 dashboard:',e);}
    }
  }

  var rebuilding=false;
  function repair(force){
    if(!isAcademic()) return false;
    injectCss();
    document.body.classList.add('cq-ak-shell-v9');
    document.body.classList.remove('cq-ak-shell-v8');
    ensureLayout();
    var top=document.querySelector('#app-screen > .topbar');
    var broken=force||!top||!top.querySelector('.cq-ak-top-left')||!top.querySelector('.cq-ak-top-right')||!top.querySelector('.cq-ak-brand strong')||!top.querySelector('#user-name')||!top.querySelector('#user-role')||!top.querySelector('.cq-ak-logout');
    if(broken&&!rebuilding){
      rebuilding=true;
      try{rebuildHeader();}finally{rebuilding=false;}
    }else{
      var nm=document.getElementById('user-name');if(nm)nm.textContent=displayName();
      var rb=document.getElementById('user-role');if(rb)rb.textContent='Kabid Akademik';
    }
    ensureDashboard();
    return true;
  }

  try{
    if(typeof enterApp==='function'&&!enterApp.__cqAkHeaderV9){
      var oldEnter=enterApp;
      enterApp=function(){
        var out=oldEnter.apply(this,arguments);
        setTimeout(function(){repair(true);},0);
        setTimeout(function(){repair(false);},180);
        setTimeout(function(){repair(false);},700);
        return out;
      };
      enterApp.__cqAkHeaderV9=true;
    }
  }catch(e){console.warn('AK Header V9 enterApp:',e);}

  document.addEventListener('DOMContentLoaded',function(){setTimeout(function(){repair(true);},80);},{once:true});
  window.addEventListener('load',function(){setTimeout(function(){repair(true);},120);setTimeout(function(){repair(false);},650);},{once:true});

  var observer=new MutationObserver(function(){
    if(!isAcademic()||rebuilding) return;
    var top=document.querySelector('#app-screen > .topbar');
    if(!top||!top.querySelector('.cq-ak-top-left')||!top.querySelector('.cq-ak-top-right')) setTimeout(function(){repair(true);},0);
  });
  if(document.documentElement) observer.observe(document.documentElement,{childList:true,subtree:true});

  setInterval(function(){repair(false);},1800);
  window.__CQ_AK_HEADER_V9__=true;
})();