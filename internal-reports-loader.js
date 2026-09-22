(function(){
  'use strict';

  function readUser(){
    try{
      if(typeof currentUser!=='undefined'&&currentUser)return currentUser;
      return JSON.parse(localStorage.getItem('cqlass_user')||'{}')||{};
    }catch(_){return {}}
  }
  function isHrd(){
    const u=readUser();
    const role=String(u.role||u.primary_role||u.role_code||'').trim().toLowerCase();
    const username=String(u.username||'').trim().toLowerCase();
    const roles=(Array.isArray(u.roles)?u.roles:[]).map(x=>String(typeof x==='string'?x:(x?.role_code||x?.role||'')).trim().toLowerCase());
    return role==='hrd'||username==='hrd'||roles.includes('hrd');
  }

  const common=[
    'report-preview-v2-route.js?v=20260917-report3',
    'rapor-identity-fix.js?v=20260917-nisnisn1',
    'academic-report-class-picker.js?v=20260921-classpicker1',
    'rapor-achievement-stars.js?v=20260917-stars7',
    'internal-report-center.js?v=20260911-sapras-dashboard1',
    'kesiswaan-points-recap.js?v=20260915-3',
    'kesiswaan-super-report.js?v=20260921-live2',
    'kesiswaan-case-followup-ui.js?v=20260921-followup1',
    'kesiswaan-excel-xlsx.js?v=20260921-xlsx1',
    'student-affairs-center.js?v=20260921-center2',
    'kesiswaan-final-cleanup.js?v=20260922-single3',
    'promotion-report.js?v=20260921-live6',
    'extracurricular-raw-ui.js?v=20260916-raw2',
    'kegiatan-exkul-capacity.js?v=20260918-extpts2',
    'kegiatan-exkul-report-grades.js?v=20260921-reportgrades2',
    'kegiatan-exkul-external-admin.js?v=20260921-extadmin1',
    'kegiatan-exkul-layout-fix.js?v=20260916-layout1',
    'school-activity-report.js?v=20260916-activity3',
    'school-activity-drag-fill.js?v=20260916-drag2',
    'school-activity-sidebar-fallback.js?v=20260916-activity3',
    'pramuka-mode-reset.js?v=20260916-pramuka1',
    'pramuka-special-access.js?v=20260916-pramuka3'
  ];

  // HRD cukup memuat pusat laporan yang benar-benar dipakai. Promosi Socmed
  // dipantau dari Live Report HRD, jadi tidak perlu halaman/sidebar tersendiri.
  const hrdOnly=[
    'internal-report-center.js?v=20260922-hrd-fast1'
  ];
  const sources=isHrd()?hrdOnly:common;

  sources.forEach(function(src){
    var s=document.createElement('script');
    s.src=src;
    s.defer=true;
    document.head.appendChild(s);
  });
})();
