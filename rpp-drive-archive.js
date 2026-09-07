// CQlass — RPP Drive archive helper
// Struktur Drive: KELAS -> GURU -> BULAN.
// Upload utama tetap tercatat di CQlass; tombol Drive mengarahkan guru ke folder arsip yang tepat.
(function(){
  const ROOT_URL='https://drive.google.com/drive/folders/1xgN1kDyXlIeqRLmZ7qZXrWuGwn2Xe3sA';
  const API=(typeof SUPABASE_URL!=='undefined'?SUPABASE_URL:'https://lmglkxzemtvxcgktiord.supabase.co')+'/functions/v1/rpp-lp-manager';
  const KEY=typeof SUPABASE_PUBLISHABLE_KEY!=='undefined'?SUPABASE_PUBLISHABLE_KEY:'';
  const AY='2026/2027', SEM=1;

  const TEACHER_FOLDERS={
    '1|9c401131-f34b-4707-8938-78b3b07cf1fb':'1KJdtC3TvIMv-a-YEaT49vZuEWpz57kFy',
    '1|046ccbdd-29f9-4971-aba5-2605d92a2d23':'1AyHYRK-So0ehsLuKZk4RBPDE5IBFL-aI',
    '1|47e5b1a4-ec12-4148-b0d7-7bde13e1c65a':'1pLY4a4vQXtQeu7HeFcAX_0dtpZvYPAQj',
    '1|4896b25f-a0f6-4ade-aba8-c4eb84e79609':'1xBFclrKBp1qWBMyNFrO_7tj9UdTncfYp',
    '2|ef55299d-5ed4-4c3e-a1de-729345a1a59b':'191Xh6h5ZWCAkkjZqoHW_G75LMhqSUrLH',
    '2|22159065-5814-4247-bb91-8f761f6d7c83':'1SRsSoa4nlS8ZnRzmTODxAyDrOExLDTYR',
    '2|9b302714-8126-43de-bcb7-0d109e9f0826':'1C4dpD38lviKe4jg9AR9KCmaiHFIQG8l1',
    '2|2b2ac8df-3c98-4814-8d62-7351b4803afb':'1Xqgpoj3NLSJZzFF0csLZXdXJaa4FYvAI',
    '3|4ec008e7-556c-472e-9796-e3b7f5f3bde3':'1JB8UMW670oy70_f2RceOQ6vL_FnghM65',
    '3|85b48ae6-866a-4f37-a2f0-ad5ea69b913e':'1oL0HpDMhkoVYesMC27X8cMGWlzy7vS_7',
    '3|1b96bb5f-1a66-4594-9119-9b7e63e92094':'1t3VSuQPd5-FKQRqAeaiVwSTyAnwZUu8e',
    '3|a2aac623-2e3f-4133-b4a3-35e0f46583c8':'1pWyVotQ7q7a1hg_AS6t16s1VjOK0xlwV',
    '4|71df35ca-f2a6-43bd-b8d3-c8b279c66fc5':'19cYBLEqntBlZq0fQp9q69ObqieNlSaEY',
    '4|dbb304d4-092c-42a3-87b0-17635be2d7e2':'1dohqNkO56k48QKtaS0_rtbkJ4zV8RdTt',
    '4|2d7456be-ec71-4426-8352-691dbb7da3d0':'1o1BdByR9ma0_HGxESLW8aevQhRFvOuc_',
    '4|22159065-5814-4247-bb91-8f761f6d7c83':'1pMkSNV99ey8LK90WkZ4kRCUDOGQPd5pP',
    '4|9b302714-8126-43de-bcb7-0d109e9f0826':'1tD3HNjrMdZimYus1nO_08HPx3E8E6-WH',
    '4|9f00f0d4-3da7-4f63-9aa3-d0158ec83fd5':'1sL2cH3V-gQJ_JqwyBu09-CHJ_-gyeSku',
    '4|f2937551-8c6d-4e55-bb19-7156cacf7721':'10fMU8uIBJx43Tigh09MU9oKoUQl3Jlif',
    '4|11a6a816-1294-4d36-80b1-bd774c19715e':'1Tx8XhucDexm-gUyb_IwLFdzd5oUOJPKn',
    '5|71df35ca-f2a6-43bd-b8d3-c8b279c66fc5':'15AO29qQwx9OgensnB1WfYxQkeIW-Hifd',
    '5|9f00f0d4-3da7-4f63-9aa3-d0158ec83fd5':'1B0vbnmnbK94k6tT6eImJBgCvipCE5HuH',
    '5|3f7d2f30-dacb-4c44-b7bc-98e3d36c9aec':'1zpSYL0E2tq7MTesoJ1iRV2G2mIaIJnaK',
    '5|bcc1cf29-4da9-440e-ab27-436708c14068':'1oTEQzbQVbNM1PvSpMsjIpuDg5BS8RIcA',
    '5|f2937551-8c6d-4e55-bb19-7156cacf7721':'1Dk2AZbSoqo9NPLUWuoZGgIObJAfWJt_N',
    '5|11a6a816-1294-4d36-80b1-bd774c19715e':'1ChRi-aNcnzR-u-WR7mh_h63XDZWboNYo',
    '6|1e377706-1703-4cb9-805f-7a74d3901fa0':'1Ps-sg-TBJosvxoMm-oaEL28_bciu2sHv',
    '6|481bb9e6-279d-4a5a-8856-50da8607003a':'1ijyofxk8WObAZpeISGX2gJbFj8aT9CLG'
  };
  const SEP2026={
    '1|9c401131-f34b-4707-8938-78b3b07cf1fb':'1t6SUz7ZhktfjnzDzz0joSH0dvzI32pFK','1|046ccbdd-29f9-4971-aba5-2605d92a2d23':'1yNlPWLjbHcWq2GjW9zeSSvfzSTgqA3dR','1|47e5b1a4-ec12-4148-b0d7-7bde13e1c65a':'1o3kI7SezBiti3aKY_rBdM2yEoWfxfwwH','1|4896b25f-a0f6-4ade-aba8-c4eb84e79609':'1sl7EWJd3IAnNLp4SWK_GXzUVj-Fy8jza',
    '2|ef55299d-5ed4-4c3e-a1de-729345a1a59b':'1sKu69fQoY6VpHxc3C6k6GjwWFpZSlUkb','2|22159065-5814-4247-bb91-8f761f6d7c83':'1__Nc_LAPDd8dUzqfkVPRFcr0NACO3Ahv','2|9b302714-8126-43de-bcb7-0d109e9f0826':'1EaJ26ghfncfOrltdUB99RIvJyLrgfXZQ','2|2b2ac8df-3c98-4814-8d62-7351b4803afb':'1-5gi56I5VAHwV4tsoqbDyoMWA7Y-u8ig',
    '3|4ec008e7-556c-472e-9796-e3b7f5f3bde3':'1wz2YUIu1bNbcHUz5V6B31Po8h1zgmu3H','3|85b48ae6-866a-4f37-a2f0-ad5ea69b913e':'1ugZ-DHvblZptOdDFCpJE5hwEaPyU1NhS','3|1b96bb5f-1a66-4594-9119-9b7e63e92094':'1TZitq7Trvl_RaBhVC-__wEQP12deiVAh','3|a2aac623-2e3f-4133-b4a3-35e0f46583c8':'1FQ0mBP_VSTlcAoxSuLtiGn5JlGXH5DrK',
    '4|71df35ca-f2a6-43bd-b8d3-c8b279c66fc5':'1FMW5e_OOvjoe5pCQFbUMqmDGyRiJCB_M','4|dbb304d4-092c-42a3-87b0-17635be2d7e2':'1pYvVo8ic32JLOXPef2-OC7uGtuXAGzKJ','4|2d7456be-ec71-4426-8352-691dbb7da3d0':'1UOTCMGmMIjito7NaG8oWeAlv8_4xfkiO','4|22159065-5814-4247-bb91-8f761f6d7c83':'1aR3YnlzB0eDWuJwHQ2PY6Y9ScomThaeO','4|9b302714-8126-43de-bcb7-0d109e9f0826':'1Rvi1FKlGyAna9jbTnWaJEPYZc_vrT7Tv','4|9f00f0d4-3da7-4f63-9aa3-d0158ec83fd5':'13jfzJLHUIYKtEg23-exe7jrMWJpArGPk','4|f2937551-8c6d-4e55-bb19-7156cacf7721':'1tbIKBK3PScuDkSvQPSBWE4qzeWvRvnbi','4|11a6a816-1294-4d36-80b1-bd774c19715e':'1-jmFSZ7SnhsQwCvZg_6q0yDCwYFYzsVU',
    '5|71df35ca-f2a6-43bd-b8d3-c8b279c66fc5':'1BFVphnBcNKxHXkj2ZhOfXL3m_Ch-y7-m','5|9f00f0d4-3da7-4f63-9aa3-d0158ec83fd5':'1eSmJiI74EmoSw1kX3Lqo0c_bCgpFsEN0','5|3f7d2f30-dacb-4c44-b7bc-98e3d36c9aec':'1a6K3sxloAJohtb4n3O6jzVargaRC5_GS','5|bcc1cf29-4da9-440e-ab27-436708c14068':'1Mc531EnYN-COKTfBNmsQ3_0cC1HeyYF1','5|f2937551-8c6d-4e55-bb19-7156cacf7721':'1zUmNDSpfg_adGouyfeCeFUGhE5cWrAwv','5|11a6a816-1294-4d36-80b1-bd774c19715e':'1U0Pwvct7x6dvn7wHMtU-2vkGR8K20LiD',
    '6|1e377706-1703-4cb9-805f-7a74d3901fa0':'17SeDF9_D6EtyGJNpuKmfou0lmKFyQW1S','6|481bb9e6-279d-4a5a-8856-50da8607003a':'1UO_obgqGEP5i-Y8syrwfgqRaeoYfZ8iR'
  };

  let boot=null, bootPromise=null, patched=false;
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const token=()=>typeof getAuthToken==='function'?getAuthToken():(localStorage.getItem('cqlass_session_token')||'');
  const toast=(m,e=false)=>typeof showToast==='function'&&showToast(m,e);
  async function api(action,payload={}){
    const r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json','apikey':KEY,'Authorization':`Bearer ${KEY}`,'x-session-token':token()},body:JSON.stringify({action,academic_year:AY,semester_no:SEM,...payload})});
    const d=await r.json().catch(()=>({})); if(!r.ok||d.success===false)throw new Error(d.error||`HTTP ${r.status}`); return d;
  }
  async function bootstrap(force=false){ if(boot&&!force)return boot;if(bootPromise&&!force)return bootPromise;bootPromise=api('bootstrap').then(d=>(boot=d,d)).finally(()=>bootPromise=null);return bootPromise; }
  const cardTargetId=card=>String(card?.id||'').replace('rpp-card-','');
  function selectedAssignment(){ const sel=document.querySelector('.rpp-wrap .rpp-toolbar select.rpp-select'); if(!sel||!boot)return null; return (boot.assignments||[]).find(a=>a.id===sel.value)||null; }
  function tracking(as,targetId){return (boot?.tracking||[]).find(x=>x.lp_target_id===targetId&&x.class_id===as?.class_id&&x.subject_id===as?.subject_id&&x.teacher_id===as?.teacher_id)||null;}
  function driveKey(as){return `${Number(as?.grade_level)||0}|${String(as?.teacher_id||currentUser?.teacher_id||'')}`;}
  function monthInfo(date){const d=date?new Date(date+'T00:00:00'):new Date();return {m:d.getMonth()+1,y:d.getFullYear(),label:new Intl.DateTimeFormat('id-ID',{month:'long',year:'numeric'}).format(d).toUpperCase()};}
  function driveFolder(as,date){const k=driveKey(as),mi=monthInfo(date);if(mi.m===9&&mi.y===2026&&SEP2026[k])return {id:SEP2026[k],exact:true,label:mi.label};if(TEACHER_FOLDERS[k])return {id:TEACHER_FOLDERS[k],exact:false,label:mi.label};return null;}
  function safePart(v,max=80){return String(v||'RPP').normalize('NFKD').replace(/[\\/:*?"<>|]+/g,' ').replace(/\s+/g,' ').trim().slice(0,max)||'RPP';}
  function recommendedName(card,as,date,ext='pdf'){const target=card.querySelector('.rpp-target')?.textContent?.trim()||'Materi';const mapel=as?.subject_name||'Mapel';return `RPP - ${safePart(mapel,45)} - ${safePart(target,70)} - ${date||'tanggal-pelaksanaan'}.${ext.replace(/^\./,'')}`;}
  function ensureStyle(){if(document.getElementById('rpp-drive-style'))return;const s=document.createElement('style');s.id='rpp-drive-style';s.textContent='.rpp-date-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:10px;padding-top:10px;border-top:1px dashed var(--border,#dce6e5)}.rpp-date-row label{font-size:10px;font-weight:900;color:var(--muted,#71807f);text-transform:uppercase}.rpp-drive-hint{font-size:10px;color:var(--muted,#71807f);max-width:720px;line-height:1.4}.rpp-drive-btn{background:#edf4f3!important;color:#1d5e5a!important;text-decoration:none!important;display:inline-flex;align-items:center}.rpp-drive-root{margin-left:auto}';document.head.appendChild(s);}
  function injectRootButton(){const wrap=document.querySelector('.rpp-wrap');if(!wrap)return;const head=wrap.querySelector('.rpp-head');if(head&&!head.querySelector('.rpp-drive-root')){const a=document.createElement('a');a.className='rpp-btn secondary rpp-drive-root';a.href=ROOT_URL;a.target='_blank';a.rel='noopener';a.textContent='Arsip RPP Drive';head.appendChild(a);}}
  async function decorate(){
    if(!document.querySelector('.rpp-wrap'))return;ensureStyle();injectRootButton();
    try{await bootstrap();}catch(_){return;}
    const as=selectedAssignment();if(!as)return;
    document.querySelectorAll('.rpp-card[id^="rpp-card-"]').forEach(card=>{
      const tid=cardTargetId(card),tr=tracking(as,tid);if(card.querySelector('.rpp-date-row'))return;
      const fileRow=card.querySelector('.rpp-file');if(!fileRow)return;
      const row=document.createElement('div');row.className='rpp-date-row';
      const date=tr?.actual_start||tr?.actual_end||'';const folder=driveFolder(as,date||new Date().toISOString().slice(0,10));
      row.innerHTML=`<label>Tanggal Pelaksanaan</label><input class="rpp-input rpp-actual-date" type="date" value="${esc(date)}" data-target="${esc(tid)}"><span class="rpp-drive-hint">Nama arsip mengikuti: <b>RPP - Mapel - Judul Materi - Tanggal Pelaksanaan</b></span>${folder?`<a class="rpp-btn rpp-drive-btn" target="_blank" rel="noopener" href="https://drive.google.com/drive/folders/${folder.id}" data-folder-exact="${folder.exact?'1':'0'}">${folder.exact?'Upload / buka '+esc(folder.label):'Buka folder guru'}</a>`:''}`;
      fileRow.insertAdjacentElement('beforebegin',row);
      const dateInput=row.querySelector('.rpp-actual-date'),drive=row.querySelector('.rpp-drive-btn');
      dateInput?.addEventListener('change',()=>{const f=driveFolder(as,dateInput.value);if(drive&&f){drive.href=`https://drive.google.com/drive/folders/${f.id}`;drive.textContent=f.exact?'Upload / buka '+f.label:'Buka folder guru';drive.dataset.folderExact=f.exact?'1':'0';}});
      drive?.addEventListener('click',()=>{const d=dateInput?.value||'';const name=recommendedName(card,as,d,'pdf');navigator.clipboard?.writeText(name).catch(()=>{});toast(d?'Nama arsip RPP sudah disalin.':'Isi tanggal pelaksanaan agar nama arsip lengkap.');});
    });
    patchFunctions();
  }
  function patchFunctions(){
    if(patched||typeof window.rppSaveTracking!=='function'||typeof window.rppUploadFile!=='function')return;patched=true;
    window.rppSaveTracking=async function(assignmentId,targetId){
      const st=document.getElementById(`rpp-status-${targetId}`)?.value||'not_started';const progress=Number(document.getElementById(`rpp-progress-${targetId}`)?.value||0);const reason=document.getElementById(`rpp-reason-${targetId}`)?.value||'';const date=document.querySelector(`.rpp-actual-date[data-target="${CSS.escape(targetId)}"]`)?.value||'';
      if(['carryover','shifted','postponed','no_meeting'].includes(st)&&!reason.trim()){toast('Isi alasan pergeseran/penundaan terlebih dahulu.',true);return;}
      try{await api('save_tracking',{assignment_id:assignmentId,lp_target_id:targetId,execution_status:st,progress_percent:progress,shift_reason:reason,actual_start:date||null,actual_end:st==='completed'?(date||null):null});toast('Pacing dan tanggal pelaksanaan tersimpan.');boot=null;if(typeof rppReloadTeacher==='function')await rppReloadTeacher();setTimeout(decorate,80);}catch(e){toast(`Gagal menyimpan: ${e.message}`,true);}
    };
    window.rppUploadFile=async function(assignmentId,targetId,input){
      const file=input.files?.[0];if(!file)return;const card=document.getElementById(`rpp-card-${targetId}`);const date=card?.querySelector('.rpp-actual-date')?.value||'';if(!date){toast('Isi tanggal pelaksanaan terlebih dahulu.',true);input.value='';return;}if(file.size>25*1024*1024){toast('Ukuran file maksimal 25 MB.',true);input.value='';return;}
      const allowed=['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','image/jpeg','image/png','image/webp'];if(!allowed.includes(file.type)){toast('Format RPP harus PDF, DOC/DOCX, JPG, PNG, atau WEBP.',true);input.value='';return;}
      try{const d=await bootstrap();const as=(d.assignments||[]).find(a=>a.id===assignmentId);const ext=(file.name.split('.').pop()||'pdf').toLowerCase();const filename=recommendedName(card,as,date,ext);toast('Menyiapkan upload RPP...');const sign=await api('create_upload',{assignment_id:assignmentId,lp_target_id:targetId,filename,mime_type:file.type,file_size:file.size});const fd=new FormData();fd.append('cacheControl','3600');fd.append('',file);const up=await fetch(sign.signed_url,{method:'PUT',headers:{'apikey':KEY,'x-upsert':'false'},body:fd});if(!up.ok)throw new Error(`Upload file gagal (${up.status})`);await api('complete_upload',{submission_id:sign.submission_id});const st=document.getElementById(`rpp-status-${targetId}`)?.value||'in_progress';const progress=Number(document.getElementById(`rpp-progress-${targetId}`)?.value||0);const reason=document.getElementById(`rpp-reason-${targetId}`)?.value||'';await api('save_tracking',{assignment_id:assignmentId,lp_target_id:targetId,execution_status:st,progress_percent:progress,shift_reason:reason,actual_start:date,actual_end:st==='completed'?date:null});toast('RPP berhasil diunggah dan tanggal pelaksanaan tersimpan.');boot=null;if(typeof rppReloadTeacher==='function')await rppReloadTeacher();setTimeout(decorate,80);}catch(e){toast(`Upload gagal: ${e.message}`,true);}finally{input.value='';}
    };
  }
  const obs=new MutationObserver(()=>setTimeout(decorate,30));
  function start(){const c=document.getElementById('content');if(c)obs.observe(c,{childList:true,subtree:true});setTimeout(decorate,300);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
