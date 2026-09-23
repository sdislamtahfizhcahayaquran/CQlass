/* CQlass — hard guard for report attendance.
   Present on report = Admin effective days - Sick - Excused - Unexcused.
   This request path intentionally bypasses window.fetch wrappers so Preview/PDF
   always reads the verified report-preview-v2 Edge Function directly. */
(function(){
  'use strict';
  if(window.__CQ_RAPOR_EFFECTIVE_ATTENDANCE_GUARD__) return;
  window.__CQ_RAPOR_EFFECTIVE_ATTENDANCE_GUARD__=true;

  const num=v=>{const n=Number(v);return Number.isFinite(n)&&n>=0?Math.trunc(n):0};
  function normalizeAttendance(report){
    if(!report||typeof report!=='object'||!report.attendance||typeof report.attendance!=='object') return report;
    const a=report.attendance;
    const effectiveRaw=a.effective_days!=null?a.effective_days:a.total;
    const effective=Number(effectiveRaw);
    if(!Number.isFinite(effective)||effective<0) return report;
    const total=Math.trunc(effective),sick=num(a.sick),excused=num(a.excused),unexcused=num(a.unexcused),late=num(a.late);
    const present=Math.max(0,total-sick-excused-unexcused);
    const denom=Math.max(1,total);
    a.present=present;
    a.total=total;
    a.effective_days=total;
    a.sick=sick;
    a.excused=excused;
    a.unexcused=unexcused;
    a.late=late;
    a.present_formula='effective_days_minus_sick_excused_unexcused';
    a.percent={
      ...(a.percent||{}),
      present:Math.round(present/denom*100),
      sick:Math.round(sick/denom*100),
      excused:Math.round(excused/denom*100),
      unexcused:Math.round(unexcused/denom*100)
    };
    return report;
  }
  function normalizePayload(d){
    if(d?.report) normalizeAttendance(d.report);
    if(Array.isArray(d?.reports)) d.reports.forEach(normalizeAttendance);
    return d;
  }

  function install(){
    if(typeof getAuthToken!=='function'||typeof SUPABASE_URL==='undefined'||typeof SUPABASE_PUBLISHABLE_KEY==='undefined'){
      return setTimeout(install,50);
    }

    reportPreviewRequest=async function(action,payload={},timeoutMs=35000){
      const token=getAuthToken();if(!token)throw new Error('Sesi login tidak ditemukan.');
      const url=SUPABASE_URL+'/functions/v1/report-preview-v2?cq_effective=20260923-1';
      return await new Promise((resolve,reject)=>{
        const xhr=new XMLHttpRequest();
        xhr.open('POST',url,true);
        xhr.timeout=timeoutMs;
        xhr.setRequestHeader('Content-Type','application/json');
        xhr.setRequestHeader('apikey',SUPABASE_PUBLISHABLE_KEY);
        xhr.setRequestHeader('Authorization','Bearer '+SUPABASE_PUBLISHABLE_KEY);
        xhr.setRequestHeader('x-session-token',token);
        xhr.onload=()=>{
          let d={};
          try{d=xhr.responseText?JSON.parse(xhr.responseText):{}}catch(_){return reject(new Error('Respons Rapor bukan JSON. HTTP '+xhr.status+'.'))}
          if(xhr.status<200||xhr.status>=300||d.success===false){
            const map={session_invalid:'Sesi login tidak valid.',session_expired:'Sesi login telah berakhir.',forbidden:'Akun ini tidak memiliki akses Rapor.',class_forbidden:'Kelas tidak berada dalam akses akun ini.',student_not_in_class:'Siswa tidak ditemukan pada kelas ini.',academic_year_not_found:'Tahun ajaran belum tersedia di Supabase.'};
            return reject(new Error(map[d.error]||d.error||('HTTP '+xhr.status)));
          }
          resolve(normalizePayload(d));
        };
        xhr.onerror=()=>reject(new Error('Server Rapor gagal dihubungi.'));
        xhr.ontimeout=()=>reject(new Error('Server Rapor terlalu lama merespons.'));
        xhr.send(JSON.stringify({action,...payload}));
      });
    };

    if(typeof renderRaporPreview==='function'&&!renderRaporPreview.__cqEffectiveGuard){
      const original=renderRaporPreview;
      const guarded=function(){try{normalizeAttendance(raporPreviewState?.report)}catch(_){}return original.apply(this,arguments)};
      guarded.__cqEffectiveGuard=true;
      renderRaporPreview=guarded;
    }
  }
  install();
})();
