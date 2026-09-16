/* CQlass — Rapor PTS identity guard
 * NIS and NISN are independent identifiers.
 * Never substitute NISN for NIS. Missing NISN is rendered as '-'.
 */
(function(){
  'use strict';
  if(window.__cqRaporIdentityFix)return;

  function clean(v){ return String(v == null ? '' : v).trim(); }
  function normalizeStudent(s){
    if(!s || typeof s !== 'object') return s;
    return { ...s, nis: clean(s.nis), nisn: clean(s.nisn) || '-' };
  }

  function install(){
    if(typeof window.reportPreviewRequest !== 'function'){
      setTimeout(install, 30);
      return;
    }
    if(window.reportPreviewRequest.__cqIdentityGuard)return;

    const original = window.reportPreviewRequest;
    async function guarded(action,payload,timeoutMs){
      const data = await original(action,payload,timeoutMs);
      if(!data || typeof data !== 'object') return data;

      if(action === 'students' && Array.isArray(data.students)){
        data.students = data.students.map(normalizeStudent);
      }

      if(action === 'preview' && data.report && typeof data.report === 'object'){
        const reportStudent = data.report.student || {};
        const selectedId = String(payload?.student_id || reportStudent.id || '');
        const cached = Array.isArray(window.raporPreviewState?.students)
          ? window.raporPreviewState.students.find(s => String(s.id) === selectedId)
          : null;

        // The students endpoint is the source of truth for the selected student's
        // identifiers. This prevents a backend/report mapping bug from copying
        // NISN into the NIS field.
        const source = cached || reportStudent;
        data.report.student = {
          ...reportStudent,
          nis: clean(source.nis),
          nisn: clean(source.nisn) || '-'
        };
      }
      return data;
    }
    guarded.__cqIdentityGuard = true;
    window.reportPreviewRequest = guarded;
    window.__cqRaporIdentityFix = true;
  }

  install();
})();
