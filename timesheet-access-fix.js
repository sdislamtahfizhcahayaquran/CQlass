/* CQlass — Timesheet access-context guard
   Tenaga pengajar selalu membuka Timesheet miliknya sendiri.
   Reviewer (HRD/Kabid terkait/Pimpinan/Admin) tetap boleh memilih guru. */
(function(){
  'use strict';
  if(window.__cqTimesheetAccessFix20260922V1) return;
  window.__cqTimesheetAccessFix20260922V1=true;

  const previousFetch=window.fetch.bind(window);
  const REVIEW=new Set(['admin','akademik','kegiatan','pimpinan','hrd']);
  const norm=v=>String(v||'').trim().toLowerCase().replace(/[-\s]+/g,'_');

  function activeRole(){
    try{
      const u=window.currentUser||JSON.parse(localStorage.getItem('cqlass_user')||'{}')||{};
      return norm(u.role||u.primary_role||u.role_code||'');
    }catch(_){return ''}
  }

  function isTimesheetUrl(url){
    return /\/functions\/v1\/teacher-timesheet(?:-v2)?(?:\?|$)/.test(String(url||''));
  }

  function toV2(url){
    const raw=String(url||'');
    if(raw.includes('/functions/v1/teacher-timesheet-v2')) return raw;
    return raw.replace('/functions/v1/teacher-timesheet','/functions/v1/teacher-timesheet-v2');
  }

  window.fetch=function(input,init){
    try{
      const raw=typeof input==='string'?input:(input&&input.url)||'';
      if(!isTimesheetUrl(raw)) return previousFetch(input,init);

      const nextUrl=toV2(raw);
      let nextInit=init?{...init}:init;

      // Guru, walas, partner/guru Tahfizh, dan role pengajar lain tidak boleh
      // membawa teacher_id lama dari sesi/role sebelumnya. Backend akan
      // menggunakan teacher_id akun yang sedang login.
      if(!REVIEW.has(activeRole())&&nextInit&&typeof nextInit.body==='string'){
        try{
          const payload=JSON.parse(nextInit.body);
          if(payload&&typeof payload==='object'){
            delete payload.teacher_id;
            nextInit={...nextInit,body:JSON.stringify(payload)};
          }
        }catch(_){}
      }

      if(typeof input==='string') input=nextUrl;
      else if(nextUrl!==raw) input=new Request(nextUrl,input);
      return previousFetch(input,nextInit);
    }catch(_){
      return previousFetch(input,init);
    }
  };
})();
