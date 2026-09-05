/* CQlass — Academic Fast Save
   Simpan seluruh perubahan nilai dalam satu batch ke data utama.
   Sinkronisasi Legger Google berjalan terpisah melalui legger_sync_outbox.
*/
(function(){
  const BASE=(typeof SUPABASE_URL!=='undefined'?SUPABASE_URL:'https://lmglkxzemtvxcgktiord.supabase.co');
  const FAST_URL=BASE+'/functions/v1/academic-fast-save';
  let saving=false;
  let rerun=false;

  function token(){try{return typeof getAuthToken==='function'?getAuthToken():(localStorage.getItem('cqlass_session_token')||'')}catch(_){return ''}}
  function headers(){
    const key=(typeof SUPABASE_PUBLISHABLE_KEY!=='undefined'?SUPABASE_PUBLISHABLE_KEY:'');
    const t=token();
    const h={'Content-Type':'application/json','apikey':key,'Authorization':'Bearer '+key};
    if(t)h['x-session-token']=t;
    return h;
  }
  async function request(payload){
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),20000);
    try{
      const r=await fetch(FAST_URL,{method:'POST',headers:headers(),body:JSON.stringify(payload),signal:controller.signal});
      const raw=await r.text();let d={};
      try{d=raw?JSON.parse(raw):{}}catch(_){throw new Error('Respons penyimpanan tidak valid.');}
      if(!r.ok||d.success===false)throw new Error(d.detail||d.error||'Nilai belum berhasil disimpan.');
      return d;
    }catch(err){
      if(err?.name==='AbortError')throw new Error('Penyimpanan terlalu lama. Silakan coba lagi.');
      throw err;
    }finally{clearTimeout(timer);}
  }
  function same(a,b){
    if(!a||!b||a.kind!==b.kind||String(a.student_id)!==String(b.student_id))return false;
    if(a.kind==='tp'&&String(a.learning_objective_id)!==String(b.learning_objective_id))return false;
    if(a.kind==='component'&&String(a.assessment_type)!==String(b.assessment_type))return false;
    const av=a.score===null||a.score===undefined||a.score===''?null:Number(a.score);
    const bv=b.score===null||b.score===undefined||b.score===''?null:Number(b.score);
    return av===bv;
  }
  function inputKey(input){
    const studentId=input?.dataset?.studentId;if(!studentId)return '';
    if(input.dataset.kind==='tp')return `${studentId}|TP|${input.dataset.objectiveId}`;
    return `${studentId}|${input.dataset.component}`;
  }
  function refreshDirtyClasses(){
    document.querySelectorAll('#academic-score-table .ag-score-input').forEach(input=>{
      const k=inputKey(input);input.closest('.ag-score-cell')?.classList.toggle('dirty',Boolean(k&&academicGridState?.dirty?.has(k)));
    });
  }
  function setBusy(on){
    const b=document.getElementById('ag-save-button');
    const state=document.getElementById('ag-save-state');
    if(b){b.disabled=on||!academicGridState?.dirty?.size;b.innerHTML=on?'<span class="spinner"></span>Menyimpan cepat...':(academicGridState?.dirty?.size?`Simpan Perubahan (${academicGridState.dirty.size})`:'Simpan Perubahan');}
    if(state&&on){state.textContent='Menyimpan ke CQlass...';state.classList.add('dirty');}
  }

  async function fastSave(){
    if(typeof academicGridState==='undefined'||!academicGridState.canEdit||!academicGridState.dirty?.size)return;
    const invalid=document.querySelector('#academic-score-table .ag-score-input.invalid');
    if(invalid){if(typeof showToast==='function')showToast('Masih ada nilai yang tidak valid. Gunakan angka 0–100.',true);invalid.focus();return;}
    if(saving){rerun=true;return;}
    saving=true;rerun=false;
    const snapshot=[...academicGridState.dirty.entries()];
    setBusy(true);
    try{
      const items=snapshot.map(([,ch])=>ch.kind==='tp'
        ?{student_id:ch.student_id,assessment_type:'TP',learning_objective_id:ch.learning_objective_id,score:ch.score}
        :{student_id:ch.student_id,assessment_type:ch.assessment_type,learning_objective_id:null,score:ch.score});
      const result=await request({
        action:'save_batch',
        assignment_id:academicGridState.assignmentId,
        academic_year:academicGridState.academicYear,
        semester_no:academicGridState.semester,
        items
      });
      let cleared=0;
      for(const [key,sent] of snapshot){const cur=academicGridState.dirty.get(key);if(same(cur,sent)){academicGridState.dirty.delete(key);cleared++;}}
      refreshDirtyClasses();
      if(typeof academicUpdateSaveState==='function')academicUpdateSaveState();
      if(typeof showToast==='function')showToast(`${Number(result.saved)||cleared||items.length} nilai tersimpan. Legger diperbarui otomatis.`);
      try{setTimeout(()=>window.CQlassLeggerGoogleSync?.drain?.(),0)}catch(_){}
    }catch(err){
      if(typeof showToast==='function')showToast(err?.message||'Nilai belum berhasil disimpan.',true);
      if(typeof academicUpdateSaveState==='function')academicUpdateSaveState();
    }finally{
      saving=false;setBusy(false);
      if((rerun||academicGridState?.dirty?.size)&&rerun)setTimeout(()=>void fastSave(),0);
    }
  }

  function install(){
    if(typeof academicGridSave!=='function')return false;
    window.academicGridSave=fastSave;
    return true;
  }
  let tries=0;const timer=setInterval(()=>{tries++;if(install()||tries>80)clearInterval(timer)},250);
  window.CQlassAcademicFastSave={save:fastSave};
})();
