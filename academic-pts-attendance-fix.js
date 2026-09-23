/* CQlass — Academic PTS attendance readiness fix
   Absensi pada Live Readiness Kabid Akademik mengikuti Rekap Editable terakhir yang tersimpan.
   Tidak bergantung pada target hari efektif atau pemilihan sumber rapor.
*/
(function(){
  'use strict';
  if(window.__CQ_ACADEMIC_PTS_ATTENDANCE_FIX__) return;
  window.__CQ_ACADEMIC_PTS_ATTENDANCE_FIX__=true;

  const nativeFetch=window.fetch.bind(window);
  const SUPA=(typeof SUPABASE_URL!=='undefined'?SUPABASE_URL:'https://lmglkxzemtvxcgktiord.supabase.co');
  const MAIN='/functions/v1/academic-pts-readiness';
  const ATT=SUPA+'/functions/v1/academic-attendance-readiness';

  function urlOf(input){
    try{return typeof input==='string'?input:(input instanceof URL?input.toString():input?.url||'')}catch(_){return''}
  }
  function cloneHeaders(h){try{return new Headers(h||{})}catch(_){return new Headers()}}
  function merge(base,attendance){
    if(!base||base.success===false||!Array.isArray(base.classes))return base;
    const byClass=new Map((attendance?.classes||[]).map(x=>[String(x.class_id||''),x]));

    base.classes.forEach(c=>{
      const a=byClass.get(String(c.class_id||''));
      if(!a)return;
      c.components=c.components||{};
      c.components.attendance=!!a.complete;
      c.attendance={
        source_mode:'editable',
        validated_students:Number(a.complete_students)||0,
        complete_students:Number(a.complete_students)||0,
        total_students:Number(a.total_students)||0,
        period_start:a.period_start||null,
        period_end:a.period_end||null,
        last_update:a.last_update||null,
        status:a.status||(!a.complete_students?'belum_diisi':a.complete?'lengkap':'sebagian')
      };
      c.missing=(Array.isArray(c.missing)?c.missing:[]).filter(x=>!/absensi/i.test(String(x||'')));
      if(!a.complete)c.missing.push((Number(a.complete_students)||0)>0?'Absensi Rekap Editable belum lengkap':'Absensi Rekap Editable belum diisi');
      c.status=c.missing.length?'belum_siap':'siap';
    });

    const classMap=new Map(base.classes.map(c=>[String(c.class_id||''),c]));
    if(Array.isArray(base.walas)){
      base.walas.forEach(w=>{
        const c=classMap.get(String(w.class_id||''));
        if(!c)return;
        w.components=w.components||{};
        w.components.attendance=!!c.components?.attendance;
        w.attendance=c.attendance;
        const own=[w.components.reward,w.components.discipline,w.components.activity,w.components.attendance,w.components.extracurricular];
        w.done_components=own.filter(Boolean).length;
        w.total_components=own.length;
        w.status=w.done_components===w.total_components?'selesai':w.done_components>0?'sebagian':'belum';
      });
    }

    base.summary=base.summary||{};
    base.summary.classes=base.classes.length;
    base.summary.classes_ready=base.classes.filter(x=>x.status==='siap').length;
    if(Array.isArray(base.walas)){
      base.summary.walas=base.walas.length;
      base.summary.walas_done=base.walas.filter(x=>x.status==='selesai').length;
    }
    base.attendance_rule='editable_recap_latest_saved';
    return base;
  }

  window.fetch=async function(input,init){
    const url=urlOf(input);
    if(!url.includes(MAIN))return nativeFetch(input,init);

    const response=await nativeFetch(input,init);
    if(!response.ok)return response;

    try{
      const base=await response.clone().json();
      if(base?.success===false)return response;
      const headers=cloneHeaders(init?.headers||(input instanceof Request?input.headers:null));
      const body=init?.body||(input instanceof Request?await input.clone().text():JSON.stringify({}));
      const ar=await nativeFetch(ATT,{method:'POST',headers,body:body||JSON.stringify({})});
      const aj=await ar.json().catch(()=>({}));
      if(!ar.ok||aj?.success===false)return response;
      const merged=merge(base,aj);
      const h=cloneHeaders(response.headers);h.set('Content-Type','application/json; charset=utf-8');h.delete('content-length');h.delete('content-encoding');
      return new Response(JSON.stringify(merged),{status:response.status,statusText:response.statusText,headers:h});
    }catch(err){
      console.warn('PTS attendance readiness merge skipped:',err);
      return response;
    }
  };

  function polish(){
    const box=document.getElementById('akpts-live');if(!box)return;
    box.querySelectorAll('.akpts-note').forEach(el=>{
      el.textContent='Absensi dihitung dari Rekap Editable terakhir yang sudah disimpan untuk seluruh siswa aktif. Tidak memakai target hari efektif atau pilihan sumber rapor.';
    });
    box.querySelectorAll('.akpts-sub').forEach(el=>{
      if(/^editable\s*·/i.test((el.textContent||'').trim()))el.textContent='Rekap Editable · '+(el.textContent||'').replace(/^editable\s*·\s*/i,'');
    });
  }
  const mo=new MutationObserver(()=>setTimeout(polish,20));
  document.addEventListener('DOMContentLoaded',()=>{mo.observe(document.body,{childList:true,subtree:true});setTimeout(()=>{polish();try{window.akPtsRefresh?.()}catch(_){}},250)});
  if(document.readyState!=='loading')setTimeout(()=>{mo.observe(document.body,{childList:true,subtree:true});polish();try{window.akPtsRefresh?.()}catch(_){}},250);
})();
