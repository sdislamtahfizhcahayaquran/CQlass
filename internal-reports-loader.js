(function(){
  'use strict';

  function readUser(){
    try{
      if(typeof currentUser!=='undefined'&&currentUser)return currentUser;
      return JSON.parse(localStorage.getItem('cqlass_user')||'{}')||{};
    }catch(_){return {}}
  }
  function role(){
    const u=readUser();
    return String(u.role||u.primary_role||u.role_code||'').trim().toLowerCase();
  }
  function isHrd(){
    const u=readUser(),r=role(),username=String(u.username||'').trim().toLowerCase();
    const rs=(Array.isArray(u.roles)?u.roles:[]).map(x=>String(typeof x==='string'?x:(x?.role_code||x?.role||'')).trim().toLowerCase());
    return r==='hrd'||username==='hrd'||rs.includes('hrd');
  }
  function fileName(src){
    try{return new URL(src,location.href).pathname.split('/').pop()}catch(_){return String(src).split('?')[0].split('/').pop()}
  }
  function already(src){
    const name=fileName(src);
    return [...document.scripts].some(s=>fileName(s.src||'')===name);
  }
  function load(src){
    return new Promise(resolve=>{
      if(already(src))return resolve(false);
      const s=document.createElement('script');
      s.src=src;s.async=true;
      s.onload=()=>resolve(true);s.onerror=()=>{console.warn('CQlass script gagal dimuat:',src);resolve(false)};
      document.head.appendChild(s);
    });
  }

  // Hindari file yang sudah dimuat langsung dari index atau loader lain.
  const common=[
    'report-preview-v2-route.js?v=20260917-report3',
    'report-period-control.js?v=20260923-reportperiod1',
    'rapor-identity-fix.js?v=20260917-nisnisn1',
    'academic-report-class-picker.js?v=20260921-classpicker1',
    'rapor-achievement-stars.js?v=20260922-stars8',
    'kesiswaan-points-recap.js?v=20260915-3',
    'kesiswaan-super-report.js?v=20260921-live2',
    'kesiswaan-case-followup-ui.js?v=20260921-followup1',
    'kesiswaan-excel-xlsx.js?v=20260921-xlsx1',
    'promotion-report-edit.js?v=20260922-edit1',
    'extracurricular-raw-ui.js?v=20260916-raw2',
    'kegiatan-exkul-report-grades.js?v=20260921-reportgrades2',
    'kegiatan-exkul-external-admin.js?v=20260921-extadmin1',
    'kegiatan-exkul-layout-fix.js?v=20260916-layout1',
    'school-activity-report.js?v=20260916-activity3',
    'school-activity-drag-fill.js?v=20260916-drag2',
    'school-activity-sidebar-fallback.js?v=20260916-activity3',
    'pramuka-mode-reset.js?v=20260916-pramuka1',
    'pramuka-special-access.js?v=20260916-pramuka3'
  ];

  const hrdOnly=[];
  const sources=isHrd()?hrdOnly:common;

  Promise.allSettled(sources.map(load)).then(()=>{
    if(!isHrd())load('kesiswaan-final-cleanup.js?v=20260922-single6');
  });
})();
