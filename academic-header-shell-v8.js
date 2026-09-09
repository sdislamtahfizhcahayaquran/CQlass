/* CQlass — Kabid Akademik header/shell V8
   Narrow repair for the app header and shell. No academic data mutations.
*/
(function(){
  'use strict';
  if(window.__CQ_AK_HEADER_V8__) return;

  function norm(v){return String(v||'').trim().toLowerCase().replace(/[\s-]+/g,'_');}
  function readUser(){
    try{if(typeof currentUser!=='undefined'&&currentUser)return currentUser;}catch(_){ }
    try{return JSON.parse(localStorage.getItem('cqlass_user')||'null')||{};}catch(_){return {};}
  }
  function isAcademic(){
    var u=readUser()||{};
    var vals=[u.role,u.role_code,u.primary_role].concat(Array.isArray(u.roles)?u.roles:[]).map(norm).filter(Boolean);
    return vals.some(function(r){return r==='akademik'||r==='kabid_akademik'||r==='academic'||r.indexOf('kabid_akademik')>=0||r.indexOf('academic')>=0;});
  }
  function name(){
    var u=readUser()||{};
    return u.nama||u.full_name||u.name||u.teacher_name||u.display_name||u.username||'Kabid Akademik';
  }
  function initials(v){
    return String(v||'KA').replace(/[^A-Za-zÀ-ÿ\s]/g,' ').trim().split(/\s+/).filter(Boolean).slice(0,2).map(function(x){return x.charAt(0).toUpperCase();}).join('')||'KA';
  }
  function injectCss(){
    if(document.getElementById('cq-ak-header-v8-css'))return;
    var s=document.createElement('style');
    s.id='cq-ak-header-v8-css';
    s.textContent=`
      body.cq-ak-shell-v8 #app-screen{display:block!important;min-height:100vh!important;background:#f4fbf8!important}
      body.cq-ak-shell-v8 #app-screen>.topbar{min-height:72px!important;padding:10px 24px!important;background:rgba(255,255,255,.97)!important;color:#0b3f39!important;border-bottom:1px solid #dcebe6!important;box-shadow:0 4px 18px rgba(7,59,56,.07)!important;display:flex!important;align-items:center!important;justify-content:space-between!important;position:sticky!important;top:0!important;z-index:1000!important;backdrop-filter:blur(14px)!important}
      body.cq-ak-shell-v8 .topbar-left{display:flex!important;align-items:center!important;gap:12px!important;min-width:250px!important;visibility:visible!important;opacity:1!important}
      body.cq-ak-shell-v8 .topbar-logo{display:block!important;width:42px!important;height:42px!important;object-fit:contain!important;border-radius:10px!important;visibility:visible!important;opacity:1!important}
      body.cq-ak-shell-v8 .topbar-title{display:block!important;color:#073b38!important;font:800 17px/1.15 'Plus Jakarta Sans',Inter,sans-serif!important;letter-spacing:-.02em!important;visibility:visible!important;opacity:1!important}
      body.cq-ak-shell-v8 .topbar-title span{display:block!important;margin-top:3px!important;color:#607c75!important;font:650 10px/1.2 Inter,sans-serif!important;opacity:1!important;letter-spacing:.01em!important}
      body.cq-ak-shell-v8 .topbar-right{display:flex!important;align-items:center!important;justify-content:flex-end!important;gap:10px!important;margin-left:auto!important;color:#163f39!important;visibility:visible!important;opacity:1!important;flex-wrap:nowrap!important}
      body.cq-ak-shell-v8 #user-name{display:inline-block!important;color:#153f39!important;font-size:12px!important;font-weight:800!important;visibility:visible!important;opacity:1!important;white-space:nowrap!important}
      body.cq-ak-shell-v8 #user-role{display:inline-flex!important;align-items:center!important;background:#e9f7f2!important;color:#0b766a!important;border:1px solid #cde8df!important;padding:5px 10px!important;border-radius:999px!important;font-size:9px!important;font-weight:900!important;letter-spacing:.05em!important;visibility:visible!important;opacity:1!important;white-space:nowrap!important}
      body.cq-ak-shell-v8 .user-photo-slot{display:flex!important;width:36px!important;height:36px!important;min-width:36px!important;border-radius:50%!important;background:#e4f4ef!important;border:1px solid #d2e9e2!important;color:#0c776c!important;align-items:center!important;justify-content:center!important;overflow:hidden!important;font-weight:900!important;visibility:visible!important;opacity:1!important}
      body.cq-ak-shell-v8 .bell-btn{display:flex!important;align-items:center!important;justify-content:center!important;width:34px!important;height:34px!important;border-radius:10px!important;border:1px solid #dbe9e5!important;background:#f6fbf9!important;color:#37665e!important;visibility:visible!important;opacity:1!important}
      body.cq-ak-shell-v8 .account-btn,body.cq-ak-shell-v8 .logout-btn{display:inline-flex!important;align-items:center!important;justify-content:center!important;min-height:34px!important;padding:7px 11px!important;border-radius:10px!important;font-size:10px!important;font-weight:800!important;visibility:visible!important;opacity:1!important}
      body.cq-ak-shell-v8 .account-btn{background:#eef8f5!important;color:#0b776c!important;border:1px solid #d1e8e1!important}
      body.cq-ak-shell-v8 .logout-btn{background:#0c756b!important;color:#fff!important;border:1px solid #0c756b!important}
      body.cq-ak-shell-v8 #app-screen>.layout{display:flex!important;min-height:calc(100vh - 72px)!important;visibility:visible!important;opacity:1!important}
      body.cq-ak-shell-v8 #sidebar{display:block!important;flex:0 0 220px!important;visibility:visible!important;opacity:1!important}
      body.cq-ak-shell-v8 #content{display:block!important;flex:1 1 auto!important;min-width:0!important;min-height:calc(100vh - 72px)!important;visibility:visible!important;opacity:1!important}
      @media(max-width:900px){body.cq-ak-shell-v8 #user-name{display:none!important}body.cq-ak-shell-v8 .topbar-left{min-width:auto!important}body.cq-ak-shell-v8 .account-btn{display:none!important}}
    `;
    document.head.appendChild(s);
  }
  function ensurePhoto(){
    var slot=document.getElementById('user-photo-slot');
    if(!slot)return;
    if(!String(slot.innerHTML||'').trim())slot.innerHTML='<span class="foto-profil-fallback">'+initials(name())+'</span>';
  }
  function repair(){
    if(!isAcademic())return false;
    injectCss();
    document.body.classList.add('cq-ak-shell-v8');
    var app=document.getElementById('app-screen');
    if(app)app.style.display='block';
    var title=document.querySelector('.topbar-title');
    if(title)title.innerHTML='CQlass<span>SDIT Cahaya Qur\'an</span>';
    var nm=document.getElementById('user-name');if(nm)nm.textContent=name();
    var rb=document.getElementById('user-role');if(rb)rb.textContent='Kabid Akademik';
    ensurePhoto();
    var layout=document.querySelector('#app-screen>.layout');if(layout)layout.style.display='flex';
    var content=document.getElementById('content');
    if(content&&!String(content.innerHTML||'').trim()&&typeof window.renderAcademicDashboardV7==='function'){
      try{window.renderAcademicDashboardV7(true);}catch(e){console.error('AK header V8 dashboard:',e);}
    }
    return true;
  }

  try{
    if(typeof enterApp==='function'&&!enterApp.__cqAkHeaderV8){
      var oldEnter=enterApp;
      enterApp=function(){var out=oldEnter.apply(this,arguments);setTimeout(repair,0);setTimeout(repair,250);setTimeout(repair,900);return out;};
      enterApp.__cqAkHeaderV8=true;
    }
  }catch(e){console.warn('AK header V8 enterApp:',e);}

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(repair,80);},{once:true});else setTimeout(repair,80);
  window.addEventListener('load',function(){setTimeout(repair,120);setTimeout(repair,700);},{once:true});
  setInterval(repair,1500);
  window.__CQ_AK_HEADER_V8__=true;
})();