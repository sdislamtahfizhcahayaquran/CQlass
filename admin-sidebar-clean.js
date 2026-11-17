/* CQlass — Admin sidebar clean */
(function(){
'use strict';
if(window.__cqAdminSidebarClean)return;
function role(){try{return String(currentUser?.role||'').toLowerCase()}catch(_){return''}}
function isAdmin(){return role()==='admin'}
function style(){
  if(document.getElementById('cq-admin-side-css'))return;
  const el=document.createElement('style');el.id='cq-admin-side-css';
  el.textContent=`.cq-admin-side{padding:16px 12px 24px;display:flex;flex-direction:column;gap:2px}.cq-admin-nav{width:100%;min-height:40px;border:0;border-radius:11px;background:transparent;color:#2c4a48;padding:0 12px;display:flex;align-items:center;gap:11px;font:600 13.5px/1.2 'Plus Jakarta Sans',Inter,system-ui,sans-serif;text-align:left;cursor:pointer;transition:background .12s,color .12s}.cq-admin-nav:hover{background:#eaf5f3;color:#0b5e5a}.cq-admin-nav.active{background:#0a6e6e;color:#fff;box-shadow:0 6px 14px rgba(10,110,110,.2)}.cq-admin-nav svg{flex:none;width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;opacity:.9}.cq-admin-nav span{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.cq-admin-nav.home{min-height:44px;font-weight:700;margin-bottom:4px}.cq-admin-section{margin:14px 12px 4px;font-size:10px;font-weight:800;letter-spacing:.11em;color:#7a918f;text-transform:uppercase}.cq-admin-ext{font-size:10px;font-weight:700;color:#8aa09e;flex:none}.cq-admin-nav.active .cq-admin-ext{color:#cdeee8}`;
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
  partner:'<svg viewBox="0 0 24 24"><path d="M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM16 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/><path d="M2 20c0-3.3 2.7-6 6-6 1.5 0 2.9.6 4 1.5 1.1-.9 2.5-1.5 4-1.5 3.3 0 6 2.7 6 6"/></svg>',
  ball:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 3v18M3 12h18M5.6 5.6c3.6 3.6 9.2 3.6 12.8 0M5.6 18.4c3.6-3.6 9.2-3.6 12.8 0"/></svg>',
  task:'<svg viewBox="0 0 24 24"><path d="M9 5h10M9 12h10M9 19h10"/><path d="m4 5 1 1 2-2M4 12l1 1 2-2M4 19l1 1 2-2"/></svg>',
  star:'<svg viewBox="0 0 24 24"><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z"/></svg>',
  report:'<svg viewBox="0 0 24 24"><path d="M6 3h9l3 3v15H6z"/><path d="M15 3v4h4M9 11h6M9 15h6M9 19h4"/></svg>'
};
function button(id,l,i,oc,ext){const domId=id==='roles'?' id="cq-role-manager-menu"':'';return `<button${domId} class="cq-admin-nav${id==='dashboard'?' home':''}${window.__cqAdminActive===id?' active':''}" data-admin-nav="${id}" onclick="${oc}" title="${l}">${i}<span>${l}</span>${ext?'<small class="cq-admin-ext">↗</small>':''}</button>`}
function draw(active){
  try{document.body.classList.toggle('cq-admin-ui',isAdmin())}catch(_){}
  if(!isAdmin())return false;style();
  if(active)window.__cqAdminActive=active;
  if(!window.__cqAdminActive)window.__cqAdminActive='dashboard';
  const s=document.getElementById('sidebar');if(!s)return false;
  s.innerHTML=`<nav class="cq-admin-side" aria-label="Menu Admin">
    ${button('dashboard','Beranda',I.dashboard,'openCleanAdminDashboard()')}
    <div class="cq-admin-section">Periode</div>
    ${button('academic-period','Tahun Ajaran',I.period,'openCleanAdminAcademicPeriod()')}
    ${button('input-access','Kunci Input Nilai',I.lock,'openCleanAdminInputAccess()')}
    ${button('report-period','Pengaturan Rapor',I.report,'openCleanAdminReportPeriod()')}
    <div class="cq-admin-section">Data Sekolah</div>
    ${button('students','Siswa & Kelas',I.students,'openCleanAdminStudents()',true)}
    ${button('data-master','Data Master',I.master,'openCleanAdminMaster()')}
    ${button('master-tp','Master TP',I.tp,'openCleanAdminMasterTP()',true)}
    <div class="cq-admin-section">Guru & Akun</div>
    ${button('users','Guru & Pengguna',I.users,'openCleanAdminUsers()')}
    ${button('roles','Kelola Role',I.roles,'openCleanAdminRoles()')}
    <div class="cq-admin-section">Penugasan & Jadwal</div>
    ${button('penugasan','Penugasan Guru',I.task,'openCleanAdminAssignments()')}
    ${button('edit-jadwal','Jadwal Mengajar',I.schedule,'openCleanAdminSchedule()')}
    ${button('halaqah','Pembagian Halaqah',I.halaqah,'openCleanAdminHalaqahRoute()')}
    ${button('partner-kelas','Partner Kelas',I.partner,'openCleanAdminClassPartners()')}
    ${button('ekskul','Data Ekskul',I.ball,'openCleanAdminExtracurricular()')}
    <div class="cq-admin-section">Kegiatan</div>
    ${button('uks','Jadwal UKS',I.uks,'openCleanAdminUks()')}
    ${button('kegiatan-khusus','Kegiatan Khusus',I.star,'openCleanAdminSpecialActivity()')}
    <div class="cq-admin-section">Laporan</div>
    ${button('rapor-readiness','Laporan Nilai Rapor',I.report,'openCleanAdminRaporReadiness()')}
  </nav>`;
  return true
}
function set(id){if(id==='penugasan-jadwal')id='penugasan';window.__cqAdminActive=id;const s=document.getElementById('sidebar');if(!s||!s.querySelector('.cq-admin-side')){draw(id);return}s.querySelectorAll('.cq-admin-nav').forEach(function(b){b.classList.toggle('active',b.dataset.adminNav===id)})}
window.openCleanAdminPlanning=function(){if(!isAdmin())return;return window.openCleanAdminAssignments()};
window.openCleanAdminExtracurricular=function(){
  if(!isAdmin())return;set('ekskul');
  try{if(typeof activeModule!=='undefined')activeModule='kegiatan-ekskul'}catch(_){}
  const c=document.getElementById('content');if(!c)return;
  if(typeof window.renderKegiatanEkskul==='function')return window.renderKegiatanEkskul(c);
  c.innerHTML='<div class="card">Data Ekskul belum dapat dimuat. Silakan muat ulang halaman.</div>';
};
window.openCleanAdminDashboard=function(){
  if(!isAdmin())return;
  set('dashboard');
  try{if(typeof activeModule!=='undefined')activeModule='dashboard'}catch(_){}
  const c=document.getElementById('content');
  if(typeof window.renderAdminDashboard==='function')return window.renderAdminDashboard(c);
  if(c)c.innerHTML='<div class="card"><span class="spinner"></span> Memuat Dashboard Admin...</div>';
  let n=0;const t=setInterval(()=>{n++;if(typeof window.renderAdminDashboard==='function'){clearInterval(t);window.renderAdminDashboard(c)}else if(n>=30){clearInterval(t);if(c)c.innerHTML='<div class="card">Dashboard Admin belum dapat dimuat. Muat ulang halaman.</div>'}},100);
};
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
    const s=document.createElement('script');s.src='report-period-control.js?v=20261025-period2';s.dataset.cqReportPeriodDirect='1';document.head.appendChild(s);
  }
  let n=0;const t=setInterval(()=>{n++;if(open()!==false||n>=20){clearInterval(t);if(n>=20&&c)c.innerHTML='<div class="card">Pengaturan Rapor belum dapat dimuat. Silakan muat ulang halaman.</div>'}},100)
};
window.openCleanAdminRaporReadiness=function(){if(!isAdmin())return;set('rapor-readiness');const c=document.getElementById('content');if(typeof window.renderAdminRaporReadiness==='function')return window.renderAdminRaporReadiness(c);if(c)c.innerHTML='<div class="card">Memuat Laporan Nilai Rapor...</div>';setTimeout(()=>window.renderAdminRaporReadiness?.(c),200)};
window.openCleanAdminInputAccess=function(){if(!isAdmin())return;set('input-access');const c=document.getElementById('content');if(typeof window.renderInputAccessControlAdmin==='function')return window.renderInputAccessControlAdmin(c);if(c)c.innerHTML='<div class="card">Memuat Periode & Kunci Penginputan...</div>';setTimeout(()=>window.renderInputAccessControlAdmin?.(c),250)};
window.openCleanAdminStudents=function(){if(!isAdmin())return;set('students');location.href='master-data.html'};
window.openCleanAdminUks=function(){if(!isAdmin())return;set('uks');window.renderAdminUksSchedule?.(document.getElementById('content'))};
window.openCleanAdminSpecialActivity=function(){if(!isAdmin())return;set('kegiatan-khusus');const c=document.getElementById('content');if(typeof window.renderAdminSpecialActivity==='function')return window.renderAdminSpecialActivity(c);if(c)c.innerHTML='<div class="card">Memuat Kegiatan Khusus...</div>';setTimeout(()=>window.renderAdminSpecialActivity?.(c),250)};
window.openCleanAdminHalaqahRoute=function(){if(!isAdmin())return;set('halaqah');if(window.openCleanAdminHalaqah)return window.openCleanAdminHalaqah();const c=document.getElementById('content');if(c)c.innerHTML='<div class="card">Memuat Pembagian Halaqah...</div>'};
window.openCleanAdminClassPartners=function(){if(!isAdmin())return;set('partner-kelas');const c=document.getElementById('content');if(typeof window.renderAdminClassPartners==='function')return window.renderAdminClassPartners(c);if(c)c.innerHTML='<div class="card">Memuat Partner Kelas...</div>';setTimeout(()=>window.renderAdminClassPartners?.(c),200)};
window.openCleanAdminAssignments=function(){if(!isAdmin())return;set('penugasan');const c=document.getElementById('content');if(typeof window.renderAdminAssignments==='function')return window.renderAdminAssignments(c);if(c)c.innerHTML='<div class="card">Memuat Penugasan...</div>';setTimeout(()=>window.renderAdminAssignments?.(c),200)};
window.__cqRenderAdminSidebar=function(){return isAdmin()?draw():false}
function takeAdminOwnership(){
  if(!isAdmin())return false;
  draw(window.__cqAdminActive||'dashboard');
  if((!window.__cqAdminActive||window.__cqAdminActive==='dashboard')&&typeof window.renderAdminDashboard==='function'){
    try{window.renderAdminDashboard(document.getElementById('content'))}catch(_){}
  }
  return true;
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(takeAdminOwnership,0),{once:true});
else setTimeout(takeAdminOwnership,0);
setTimeout(takeAdminOwnership,250);

window.__cqAdminSidebarClean=true
})();
[['admin-assignments.js?v=20261025-role1','cq-admin-assignments'],['admin-uks-schedule.js?v=20260914-uksadmin1','cq-admin-uks'],['admin-schedule-editor.js?v=20261025-planning1','cq-admin-schedule'],['admin-halaqah.js?v=20260916-halaqah1','cq-admin-halaqah'],['input-access-control.js?v=20260921-access1','cq-input-access'],['input-access-layout-fix.js?v=20260921-layout1','cq-input-access-layout-fix'],['report-period-control.js?v=20261025-period2','cq-report-period-direct']].forEach(([src,key])=>{if(document.querySelector(`script[data-${key}]`))return;const s=document.createElement('script');s.src=src;s.setAttribute(`data-${key}`,'1');document.head.appendChild(s)});