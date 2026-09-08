/* CQlass — Admin sidebar clean
   Admin hanya melihat fungsi pengelolaan sistem yang relevan.
   Data Master dibuka langsung melalui renderer agar tidak bergantung pada routing patch. */
(function(){
  'use strict';
  if(window.__cqAdminSidebarClean) return;

  function role(){
    try{return String(currentUser?.role||'').toLowerCase()}catch(_){return ''}
  }
  function isAdmin(){return role()==='admin'}

  function style(){
    if(document.getElementById('cq-admin-side-css')) return;
    const el=document.createElement('style');
    el.id='cq-admin-side-css';
    el.textContent=`
      .cq-admin-side{padding:20px 15px 24px;display:flex;flex-direction:column;gap:9px}
      .cq-admin-nav{width:100%;min-height:48px;border:1px solid #c7dddd;border-radius:13px;background:#f5faf9;color:#173d3b;padding:0 16px;display:flex;align-items:center;gap:11px;font:700 14px/1.2 Inter,system-ui,sans-serif;text-align:left;cursor:pointer;transition:.16s ease}
      .cq-admin-nav:hover{background:#eaf6f4;border-color:#8fc4c0;transform:translateY(-1px)}
      .cq-admin-nav.active{background:#0b7773;color:#fff;border-color:#0b7773;box-shadow:0 7px 18px rgba(7,112,108,.18)}
      .cq-admin-nav svg{width:19px;height:19px;flex:0 0 19px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
      .cq-admin-section{margin:16px 7px 3px;font-size:10px;font-weight:800;letter-spacing:.1em;color:#617b79;text-transform:uppercase}
      .cq-admin-note{margin:18px 7px 0;padding-top:14px;border-top:1px solid #d7e5e4;font-size:10px;line-height:1.55;color:#7c908e}
    `;
    document.head.appendChild(el);
  }

  const icons={
    dashboard:'<svg viewBox="0 0 24 24"><path d="M4 13h7V4H4zM13 20h7v-9h-7zM4 20h7v-5H4zM13 9h7V4h-7z"/></svg>',
    master:'<svg viewBox="0 0 24 24"><ellipse cx="12" cy="5" rx="7" ry="3"/><path d="M5 5v6c0 1.7 3.1 3 7 3s7-1.3 7-3V5M5 11v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6"/></svg>',
    users:'<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3"/><path d="M3 20c0-4 2.5-6 6-6s6 2 6 6"/><circle cx="17" cy="9" r="2.4"/><path d="M15 15c3 0 5 1.6 5 5"/></svg>',
    students:'<svg viewBox="0 0 24 24"><path d="M4 5h16v14H4z"/><path d="M8 9h8M8 13h5"/></svg>'
  };

  function button(id,label,icon,onclick){
    return `<button type="button" class="cq-admin-nav${window.__cqAdminActive===id?' active':''}" data-admin-nav="${id}" onclick="${onclick}">${icon}<span>${label}</span></button>`;
  }

  function draw(active){
    if(!isAdmin()) return false;
    style();
    if(active) window.__cqAdminActive=active;
    if(!window.__cqAdminActive) window.__cqAdminActive='dashboard';
    const sidebar=document.getElementById('sidebar');
    if(!sidebar) return false;
    sidebar.innerHTML=`<div class="cq-admin-side">
      ${button('dashboard','Dashboard',icons.dashboard,"openCleanAdminDashboard()")}
      <div class="cq-admin-section">Administrasi</div>
      ${button('data-master','Data Master',icons.master,"openCleanAdminMaster()")}
      ${button('users','Guru & Pengguna',icons.users,"openCleanAdminUsers()")}
      ${button('students','Siswa & Kelas',icons.students,"openCleanAdminStudents()")}
      <div class="cq-admin-note">Admin mengelola master, akun, role, siswa, kelas, jadwal, dan kalender. Input operasional tetap dikerjakan role masing-masing.</div>
    </div>`;
    return true;
  }

  function setActive(id){
    window.__cqAdminActive=id;
    draw(id);
  }

  window.openCleanAdminDashboard=function(){
    if(!isAdmin()) return;
    setActive('dashboard');
    try{
      if(typeof setActiveModule==='function') return setActiveModule('dashboard');
    }catch(err){console.warn(err)}
    const c=document.getElementById('content');
    if(c&&typeof window.renderAdminDashboard==='function') window.renderAdminDashboard(c);
  };

  window.openCleanAdminMaster=function(){
    if(!isAdmin()) return;
    setActive('data-master');
    try{if(typeof activeModule!=='undefined') activeModule='data-master'}catch(_){ }
    const c=document.getElementById('content');
    if(!c) return;
    if(typeof window.renderAdminMasterData==='function'){
      window.renderAdminMasterData(c);
      return;
    }
    c.innerHTML='<div class="card">Memuat Data Master...</div>';
    let n=0;const t=setInterval(()=>{
      if(typeof window.renderAdminMasterData==='function'){
        clearInterval(t);window.renderAdminMasterData(c);
      }else if(++n>30){clearInterval(t);c.innerHTML='<div class="card">Data Master belum dapat dimuat. Silakan muat ulang halaman.</div>'}
    },100);
  };

  window.openAdminDataMaster=window.openCleanAdminMaster;

  window.openCleanAdminUsers=function(){
    if(!isAdmin()) return;
    setActive('users');
    try{if(typeof activeModule!=='undefined') activeModule='kelola-pengguna'}catch(_){ }
    const c=document.getElementById('content');
    if(c&&typeof window.renderAdminUsers==='function') window.renderAdminUsers(c);
  };

  window.openCleanAdminStudents=function(){
    if(!isAdmin()) return;
    setActive('students');
    window.location.href='master-data.html';
  };

  if(typeof renderSidebar==='function'){
    const originalRenderSidebar=renderSidebar;
    renderSidebar=function(){
      if(isAdmin()) return draw();
      return originalRenderSidebar.apply(this,arguments);
    };
  }

  // Bila dashboard/routing lain selesai merender setelah script ini, sidebar Admin tetap dibersihkan.
  const observer=new MutationObserver(()=>{
    if(!isAdmin()) return;
    const sidebar=document.getElementById('sidebar');
    if(sidebar && !sidebar.querySelector('.cq-admin-side')) draw();
  });

  document.addEventListener('DOMContentLoaded',()=>{
    observer.observe(document.body,{childList:true,subtree:true});
    setTimeout(()=>{if(isAdmin()) draw()},120);
  });

  window.__cqAdminSidebarClean=true;
})();