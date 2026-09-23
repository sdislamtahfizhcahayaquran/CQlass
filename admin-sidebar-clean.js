/* CQlass — Admin sidebar clean */
(function(){
'use strict';
if(window.__cqAdminSidebarClean)return;
function role(){try{return String(currentUser?.role||'').toLowerCase()}catch(_){return''}}
function isAdmin(){return role()==='admin'}
function style(){
  if(document.getElementById('cq-admin-side-css'))return;
  const el=document.createElement('style');el.id='cq-admin-side-css';
  el.textContent=`.cq-admin-side{padding:20px 15px 24px;display:flex;flex-direction:column;gap:9px}.cq-admin-nav{width:100%;min-height:48px;border:1px solid #c7dddd;border-radius:13px;background:#f5faf9;color:#173d3b;padding:0 16px;display:flex;align-items:center;gap:11px;font:700 14px/1.2 Inter,system-ui,sans-serif;text-align:left;cursor:pointer}.cq-admin-nav:hover{background:#eaf6f4}.cq-admin-nav.active{background:#0b7773;color:#fff;border-color:#0b7773}.cq-admin-nav svg{width:19px;height:19px;fill:none;stroke:currentColor;stroke-width:1.8}.cq-admin-section{margin:16px 7px 3px;font-size:10px;font-weight:800;letter-spacing:.1em;color:#617b79;text-transform:uppercase}.cq-admin-note{margin:18px 7px 0;padding-top:14px;border-top:1px solid #d7e5e4;font-size:10px;line-height:1.55;color:#7c908e}`;
  document.head.appendChild(el)
}
const I={
  dashboard:'<svg viewBox="0 0 24 24"><path d="M4 13h7V4H4zM13 20h7v-9h-7zM4 20h7v-5H4zM13 9h7V4h-7z"/></svg>',
  master:'<svg viewBox="0 0 24 24"><ellipse cx="12" cy="5" rx="7" ry="3"/><path d="M5 5v12c0 1.7 3.1 3 7 3s7-1.3 7-3V5"/></svg>',
  tp:'<svg viewBox="0 0 24 24"><path d="M5 4h14v16H5zM8 8h8M8 12h5"/></svg>',
  schedule:'<svg viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M7 3v4M17 3v4M3.5 9.5h17"/></svg>',
  users:'<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3"/><path d="M3 20c0-4 2.5-6 6-6s6 2 6 6"/></svg>',
  roles:'<svg viewBox="0 0 24 24"><circle cx="8" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 20c0-4 2.5-6 5-6s5 2 5 6M14 15c3 0 5 1.6 5 5"/><path d="M19 3v4M17 5h4"/></svg>',
  students:'<svg viewBox="0 0 24 24"><path d="M4 5h16v14H4zM8 9h8M8 13h5"/></svg>',
  uks:'<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="3"/><path d="M12 8v8M8 12h8"/></svg>',
  halaqah:'<svg viewBox="0 0 24 24"><circle cx="8" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 20c0-4 2-6 5-6s5 2 5 6M14 15c3 0 5 1.6 5 5"/></svg>',
  lock:'<svg viewBox="0 0 24 24"><rect x="5" y="10" width="14" height="10" rx="2.5"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v2.5"/></svg>',
  period:'<svg viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M7 3v4M17 3v4M3.5 9.5h17M8 13h3M13 13h3M8 16h3"/></svg>',
  report:'<svg viewBox="0 0 24 24"><path d="M6 3h9l3 3v15H6z"/><path d="M15 3v4h4M9 11h6M9 15h6M9 19h4"/></svg>'
};
function button(id,l,i,oc){const domId=id==='roles'?' id="cq-role-manager-menu"':'';return `<button${domId} class="cq-admin-nav${window.__cqAdminActive===id?' active':''}" onclick="${oc}">${i}<span>${l}</span></button>`}
function draw(active){
  if(!isAdmin())return false;style();
  if(active)window.__cqAdminActive=active;
  if(!window.__cqAdminActive)window.__cqAdminActive='dashboard';
  const s=document.getElementById('sidebar');if(!s)return false;
  s.innerHTML=`<div class="cq-admin-side">
    ${button('dashboard','Dashboard',I.dashboard,'openCleanAdminDashboard()')}
    <div class="cq-admin-section">Administrasi</div>
    ${button('data-master','Data Master',I.master,'openCleanAdminMaster()')}
    ${button('master-tp','Master TP',I.tp,'openCleanAdminMasterTP()')}
    ${button('halaqah','Pembagian Halaqah',I.halaqah,'openCleanAdminHalaqahRoute()')}
    ${button('edit-jadwal','Edit Jadwal',I.schedule,'openCleanAdminSchedule()')}
    ${button('users','Guru & Pengguna',I.users,'openCleanAdminUsers()')}
    ${button('roles','Kelola Role',I.roles,'openCleanAdminRoles()')}
    ${button('academic-period','Tahun Ajaran & Hari Efektif',I.period,'openCleanAdminAcademicPeriod()')}
    ${button('report-period','Pengaturan Rapor',I.report,'openCleanAdminReportPeriod()')}
    ${button('input-access','Periode & Kunci Input',I.lock,'openCleanAdminInputAccess()')}
    ${button('students','Siswa & Kelas',I.students,'openCleanAdminStudents()')}
    ${button('uks','Jadwal UKS',I.uks,'openCleanAdminUks()')}
    <div class="cq-admin-note">Role baru dibuat di Kelola Role, lalu dapat langsung dipilih pada Guru & Pengguna.</div>
  </div>`;
  return true
}
function set(id){window.__cqAdminActive=id;draw(id)}
window.openCleanAdminDashboard=function(){if(!isAdmin())return;set('dashboard');try{if(typeof setActiveModule==='function')return setActiveModule('dashboard')}catch(_){};window.renderAdminDashboard?.(document.getElementById('content'))};
window.openCleanAdminMaster=function(){if(!isAdmin())return;set('data-master');window.renderAdminMasterData?.(document.getElementById('content'))};
window.openAdminDataMaster=window.openCleanAdminMaster;
window.openCleanAdminMasterTP=function(){if(!isAdmin())return;set('master-tp');location.href='master-tp.html'};
window.openCleanAdminSchedule=function(){if(!isAdmin())return;set('edit-jadwal');window.renderAdminScheduleEditor?.(document.getElementById('content'))};
window.openCleanAdminUsers=function(){if(!isAdmin())return;set('users');window.renderAdminUsers?.(document.getElementById('content'))};
window.openCleanAdminRoles=function(){
  if(!isAdmin())return;
  set('roles');
  const c=document.getElementById('content');
  if(typeof window.renderRoleManager==='function')return window.renderRoleManager(c);
  if(c)c.innerHTML='<div class="card">Memuat Kelola Role...</div>';
  setTimeout(()=>{if(typeof window.renderRoleManager==='function')window.renderRoleManager(c);else if(c)c.innerHTML='<div class="card">Kelola Role belum dapat dimuat. Muat ulang halaman.</div>'},250)
};
window.openCleanAdminAcademicPeriod=function(){if(!isAdmin())return;set('academic-period');const c=document.getElementById('content');if(typeof window.renderAdminAcademicPeriod==='function')return window.renderAdminAcademicPeriod(c);if(c)c.innerHTML='<div class="card">Memuat Tahun Ajaran & Hari Efektif...</div>';setTimeout(()=>window.renderAdminAcademicPeriod?.(c),250)};
window.openCleanAdminReportPeriod=function(){
  if(!isAdmin())return;
  set('report-period');
  const c=document.getElementById('content');
  const open=()=>{
    try{
      if(typeof window.renderAdminReportPeriod==='function')return window.renderAdminReportPeriod(c);
      if(typeof MODULE_GROUPS!=='undefined'&&Array.isArray(MODULE_GROUPS)){
        for(const g of MODULE_GROUPS){
          const item=Array.isArray(g?.items)?g.items.find(x=>x&&x.id==='pengaturan-rapor'):null;
          if(item&&typeof item.render==='function')return item.render(c);
        }
      }
    }catch(_){ }
    return false;
  };
  if(open()!==false)return;
  if(c)c.innerHTML='<div class="card"><span class="spinner"></span> Memuat Pengaturan Rapor...</div>';
  if(!document.querySelector('script[data-cq-report-period-direct]')){
    const s=document.createElement('script');s.src='report-period-control.js?v=20260923-reportperiod2';s.dataset.cqReportPeriodDirect='1';document.head.appendChild(s);
  }
  let n=0;const t=setInterval(()=>{n++;if(open()!==false||n>=20){clearInterval(t);if(n>=20&&c)c.innerHTML='<div class="card">Pengaturan Rapor belum dapat dimuat. Silakan muat ulang halaman.</div>'}},100)
};
window.openCleanAdminInputAccess=function(){if(!isAdmin())return;set('input-access');const c=document.getElementById('content');if(typeof window.renderInputAccessControlAdmin==='function')return window.renderInputAccessControlAdmin(c);if(c)c.innerHTML='<div class="card">Memuat Periode & Kunci Penginputan...</div>';setTimeout(()=>window.renderInputAccessControlAdmin?.(c),250)};
window.openCleanAdminStudents=function(){if(!isAdmin())return;set('students');location.href='master-data.html'};
window.openCleanAdminUks=function(){if(!isAdmin())return;set('uks');window.renderAdminUksSchedule?.(document.getElementById('content'))};
window.openCleanAdminHalaqahRoute=function(){if(!isAdmin())return;set('halaqah');if(window.openCleanAdminHalaqah)return window.openCleanAdminHalaqah();const c=document.getElementById('content');if(c)c.innerHTML='<div class="card">Memuat Pembagian Halaqah...</div>'};
if(typeof renderSidebar==='function'){const o=renderSidebar;renderSidebar=function(){return isAdmin()?draw():o.apply(this,arguments)}}
const ob=new MutationObserver(()=>{const s=document.getElementById('sidebar');if(isAdmin()&&s&&!s.querySelector('.cq-admin-side'))draw()});
document.addEventListener('DOMContentLoaded',()=>{ob.observe(document.body,{childList:true,subtree:true});setTimeout(()=>isAdmin()&&draw(),120)});
window.__cqAdminSidebarClean=true
})();
[['admin-uks-schedule.js?v=20260914-uksadmin1','cq-admin-uks'],['admin-schedule-editor.js?v=20260916-schedule2','cq-admin-schedule'],['admin-halaqah.js?v=20260916-halaqah1','cq-admin-halaqah'],['input-access-control.js?v=20260921-access1','cq-input-access'],['input-access-layout-fix.js?v=20260921-layout1','cq-input-access-layout-fix'],['report-period-control.js?v=20260923-reportperiod2','cq-report-period-direct']].forEach(([src,key])=>{if(document.querySelector(`script[data-${key}]`))return;const s=document.createElement('script');s.src=src;s.setAttribute(`data-${key}`,'1');document.head.appendChild(s)});