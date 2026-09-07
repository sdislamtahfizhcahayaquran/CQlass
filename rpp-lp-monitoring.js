// ==========================================================
// CQlass — RPP & LP Monitoring
// LP = target pacing sekolah, bukan deadline kaku.
// Kesesuaian isi RPP dan pacing dilaporkan terpisah.
// ==========================================================
(function(){
  const RPP_ENDPOINT = `${SUPABASE_URL}/functions/v1/rpp-lp-manager`;
  const AY = '2026/2027';
  const SEM = 1;
  const REVIEW_ROLES = new Set(['admin','pimpinan','akademik']);
  const SHIFTED = new Set(['carryover','shifted','postponed','no_meeting']);
  let state = { mode:'teacher', assignments:[], targets:[], tracking:[], submissions:[], reportRows:[], assignmentId:'', filter:'active' };

  function role(){ return String(currentUser?.role || '').toLowerCase(); }
  function isReviewer(){ return REVIEW_ROLES.has(role()); }
  function esc(v){ return typeof escapeHtml === 'function' ? escapeHtml(v) : String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m])); }
  function today(){ return new Date().toISOString().slice(0,10); }
  function plusDays(n){ const d=new Date(); d.setDate(d.getDate()+n); return d.toISOString().slice(0,10); }
  function fmtDate(v){ if(!v) return '-'; try{return new Intl.DateTimeFormat('id-ID',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(v+'T00:00:00'));}catch(_){return v;} }
  function fmtSize(n){ n=Number(n)||0; if(n<1024)return `${n} B`; if(n<1048576)return `${(n/1024).toFixed(1)} KB`; return `${(n/1048576).toFixed(1)} MB`; }
  function toast(msg,err=false){ if(typeof showToast==='function') showToast(msg,err); }

  async function api(action,payload={}){
    const token = typeof getAuthToken==='function' ? getAuthToken() : localStorage.getItem('cqlass_session_token') || '';
    const res = await fetch(RPP_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json','apikey':SUPABASE_PUBLISHABLE_KEY,'Authorization':`Bearer ${SUPABASE_PUBLISHABLE_KEY}`,'x-session-token':token},body:JSON.stringify({action,academic_year:AY,semester_no:SEM,...payload})});
    const text=await res.text(); let data={};
    try{ data=text?JSON.parse(text):{}; }catch(_){ throw new Error('Respons layanan RPP tidak valid.'); }
    if(!res.ok || data.success===false) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  }

  function statusText(st){
    const m={not_started:'Belum dimulai',in_progress:'Sedang berjalan',completed:'Selesai',carryover:'Lanjutan materi sebelumnya',shifted:'Pacing bergeser',postponed:'Ditunda',no_meeting:'Tidak ada pertemuan'};
    return m[st]||st||'Belum dimulai';
  }
  function contentText(st){
    const m={pending_review:'Belum diverifikasi',match:'Sesuai LP',needs_review:'Perlu verifikasi',mismatch:'Terindikasi tidak sesuai',unreadable:'Dokumen tidak terbaca'};
    return m[st]||'Belum ada pemeriksaan';
  }
  function contentClass(st){ return st==='match'?'ok':st==='mismatch'?'bad':(st==='needs_review'||st==='unreadable'||st==='pending_review')?'warn':'muted'; }
  function pacingClass(st){ return st==='completed'?'ok':SHIFTED.has(st)?'warn':st==='in_progress'?'info':'muted'; }
  function rppText(st){ const m={sudah_upload:'Sudah upload',belum_upload:'Belum upload',tidak_ada_pertemuan:'Tidak ada pertemuan',tidak_wajib:'Tidak wajib'}; return m[st]||st; }

  function injectStyle(){
    if(document.getElementById('rpp-lp-style')) return;
    const s=document.createElement('style'); s.id='rpp-lp-style'; s.textContent=`
      .rpp-wrap{max-width:1450px;margin:0 auto}.rpp-head{display:flex;gap:14px;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;margin-bottom:18px}.rpp-title{font-size:24px;font-weight:900;color:var(--text,#173b39)}.rpp-sub{font-size:12px;color:var(--muted,#71807f);max-width:760px;line-height:1.55;margin-top:5px}.rpp-tabs{display:flex;gap:7px;flex-wrap:wrap}.rpp-tab{border:1px solid var(--border,#dce6e5);background:#fff;border-radius:10px;padding:9px 13px;font-weight:800;font-size:12px;cursor:pointer}.rpp-tab.active{background:var(--primary,#0A6E6E);color:#fff;border-color:var(--primary,#0A6E6E)}
      .rpp-kpis{display:grid;grid-template-columns:repeat(6,minmax(125px,1fr));gap:10px;margin:12px 0 18px}.rpp-kpi{background:#fff;border:1px solid var(--border,#dce6e5);border-radius:13px;padding:13px}.rpp-kpi b{font-size:22px;color:var(--text,#173b39);display:block}.rpp-kpi span{font-size:10px;color:var(--muted,#71807f);font-weight:800;text-transform:uppercase;letter-spacing:.04em}
      .rpp-toolbar{display:flex;gap:9px;align-items:center;flex-wrap:wrap;margin-bottom:13px}.rpp-select,.rpp-input{border:1px solid var(--border,#dce6e5);border-radius:10px;background:#fff;padding:9px 10px;font-size:12px;min-height:38px}.rpp-select{min-width:210px}.rpp-card{background:#fff;border:1px solid var(--border,#dce6e5);border-radius:14px;padding:15px;margin-bottom:11px}.rpp-card.current{border-color:#86b8b3;box-shadow:0 0 0 2px rgba(10,110,110,.06)}.rpp-card-top{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.rpp-period{font-size:10px;text-transform:uppercase;letter-spacing:.04em;color:var(--muted,#71807f);font-weight:800}.rpp-target{font-size:15px;font-weight:900;color:var(--text,#173b39);margin-top:4px;line-height:1.4}.rpp-meta{font-size:11px;color:var(--muted,#71807f);margin-top:5px}.rpp-badge{display:inline-flex;align-items:center;border-radius:999px;padding:5px 8px;font-size:10px;font-weight:900;white-space:nowrap}.rpp-badge.ok{background:#e7f5ee;color:#18724f}.rpp-badge.warn{background:#fff3d8;color:#9a6515}.rpp-badge.bad{background:#fde7e7;color:#a53737}.rpp-badge.info{background:#e7f0f8;color:#275d87}.rpp-badge.muted{background:#eef1f1;color:#687675}.rpp-controls{display:grid;grid-template-columns:minmax(180px,1fr) 100px minmax(210px,1.4fr) auto;gap:8px;margin-top:12px;align-items:center}.rpp-file{margin-top:10px;border-top:1px dashed var(--border,#dce6e5);padding-top:10px;display:flex;gap:8px;align-items:center;flex-wrap:wrap}.rpp-btn{border:0;background:var(--primary,#0A6E6E);color:#fff;border-radius:9px;padding:8px 11px;font-size:11px;font-weight:900;cursor:pointer}.rpp-btn.secondary{background:#edf4f3;color:#1d5e5a}.rpp-btn.danger{background:#9d3d3d}.rpp-btn:disabled{opacity:.5;cursor:not-allowed}.rpp-note{font-size:10px;color:var(--muted,#71807f)}
      .rpp-table-wrap{overflow:auto;background:#fff;border:1px solid var(--border,#dce6e5);border-radius:14px}.rpp-table{border-collapse:collapse;width:100%;min-width:1250px;font-size:11px}.rpp-table th{position:sticky;top:0;background:#f4f8f7;text-align:left;padding:9px;border-bottom:1px solid var(--border,#dce6e5);font-size:10px;text-transform:uppercase;letter-spacing:.03em}.rpp-table td{padding:9px;border-bottom:1px solid #edf1f0;vertical-align:top}.rpp-table tr:hover td{background:#fbfdfc}.rpp-empty{background:#fff;border:1px dashed var(--border,#dce6e5);border-radius:14px;padding:30px;text-align:center;color:var(--muted,#71807f);font-size:12px}.rpp-help{background:#eef7f6;border:1px solid #cfe5e2;border-radius:12px;padding:11px 13px;font-size:11px;color:#315e5a;line-height:1.5;margin-bottom:14px}
      @media(max-width:900px){.rpp-kpis{grid-template-columns:repeat(2,1fr)}.rpp-controls{grid-template-columns:1fr}.rpp-select{width:100%;min-width:0}.rpp-card-top{flex-direction:column}.rpp-toolbar>*{width:100%}}
    `; document.head.appendChild(s);
  }

  async function loadTeacher(){
    const box=document.getElementById('rpp-body'); if(box) box.innerHTML='<div class="rpp-empty">Memuat target LP dan RPP...</div>';
    try{
      const d=await api('bootstrap'); state.assignments=d.assignments||[]; state.targets=d.targets||[]; state.tracking=d.tracking||[]; state.submissions=d.submissions||[];
      if(!state.assignmentId && state.assignments[0]) state.assignmentId=state.assignments[0].id;
      renderTeacherBody();
    }catch(e){ if(box) box.innerHTML=`<div class="rpp-empty">Gagal memuat: ${esc(e.message)}</div>`; }
  }

  function assignmentTargets(as){ return state.targets.filter(t=>t.subject_id===as.subject_id && Number(t.grade_level)===Number(as.grade_level)).sort((a,b)=>String(a.period_start).localeCompare(String(b.period_start))); }
  function trackingFor(as,t){ return state.tracking.find(x=>x.lp_target_id===t.id&&x.teacher_id===as.teacher_id&&x.class_id===as.class_id&&x.subject_id===as.subject_id); }
  function submissionFor(tr){ return tr ? state.submissions.find(x=>x.tracking_id===tr.id && x.upload_status==='uploaded') || state.submissions.find(x=>x.tracking_id===tr.id) : null; }
  function targetVisible(t,tr){
    if(state.filter==='all') return true;
    if(state.filter==='shifted') return tr && SHIFTED.has(tr.execution_status);
    const td=today();
    if(state.filter==='current') return t.period_start<=td && t.period_end>=td;
    if(state.filter==='pending') return t.require_rpp && t.period_start<=td && (!tr || tr.execution_status!=='completed');
    return t.period_start<=plusDays(14) && t.period_end>=plusDays(-21);
  }

  function renderTeacherBody(){
    const box=document.getElementById('rpp-body'); if(!box)return;
    if(!state.assignments.length){ box.innerHTML='<div class="rpp-empty">Belum ada penugasan mapel yang terhubung ke akun ini.</div>'; return; }
    const as=state.assignments.find(x=>x.id===state.assignmentId)||state.assignments[0]; state.assignmentId=as.id;
    const targets=assignmentTargets(as).filter(t=>targetVisible(t,trackingFor(as,t)));
    box.innerHTML=`
      <div class="rpp-help"><b>Aturan:</b> tanggal LP adalah target sekolah, bukan deadline kaku. Jika materi sebelumnya belum tuntas, pilih <b>Lanjutan materi sebelumnya</b> atau <b>Pacing bergeser</b>. RPP tetap dapat dinilai sesuai LP; pergeseran dicatat terpisah.</div>
      <div class="rpp-toolbar">
        <select class="rpp-select" onchange="rppSelectAssignment(this.value)">${state.assignments.map(x=>`<option value="${esc(x.id)}" ${x.id===as.id?'selected':''}>${esc(x.class_name)} — ${esc(x.subject_name)}</option>`).join('')}</select>
        <select class="rpp-select" onchange="rppSetFilter(this.value)">
          <option value="active" ${state.filter==='active'?'selected':''}>Sekitar periode berjalan</option><option value="current" ${state.filter==='current'?'selected':''}>LP minggu ini</option><option value="pending" ${state.filter==='pending'?'selected':''}>Belum selesai</option><option value="shifted" ${state.filter==='shifted'?'selected':''}>Pacing bergeser</option><option value="all" ${state.filter==='all'?'selected':''}>Semua semester</option>
        </select>
        <button class="rpp-btn secondary" onclick="rppReloadTeacher()">Muat ulang</button>
      </div>
      ${targets.length?targets.map(t=>teacherCard(as,t)).join(''):'<div class="rpp-empty">Tidak ada target LP pada filter ini.</div>'}`;
  }

  function teacherCard(as,t){
    const tr=trackingFor(as,t), sub=submissionFor(tr), st=tr?.execution_status||'not_started';
    const current=t.period_start<=today()&&t.period_end>=today();
    const noFile=!t.require_rpp || st==='no_meeting' || st==='postponed';
    return `<div class="rpp-card ${current?'current':''}" id="rpp-card-${t.id}">
      <div class="rpp-card-top"><div><div class="rpp-period">Pekan ${esc(t.week_no)} • ${esc(t.period_label)} • ${esc(t.target_type)}</div><div class="rpp-target">${esc(t.target_text)}</div><div class="rpp-meta">${esc(as.class_name)} • ${esc(as.subject_name)} ${t.require_rpp?'':'• RPP tidak diwajibkan untuk agenda ini'}</div></div><span class="rpp-badge ${pacingClass(st)}">${esc(statusText(st))}</span></div>
      <div class="rpp-controls">
        <select class="rpp-select" id="rpp-status-${t.id}" onchange="rppToggleReason('${t.id}')">
          ${[['not_started','Belum dimulai'],['in_progress','Sedang berjalan'],['completed','Selesai'],['carryover','Lanjutan materi sebelumnya'],['shifted','Pacing bergeser'],['postponed','Ditunda'],['no_meeting','Tidak ada pertemuan']].map(([v,l])=>`<option value="${v}" ${v===st?'selected':''}>${l}</option>`).join('')}
        </select>
        <input class="rpp-input" id="rpp-progress-${t.id}" type="number" min="0" max="100" value="${Number(tr?.progress_percent)||0}" placeholder="Progress %">
        <input class="rpp-input" id="rpp-reason-${t.id}" value="${esc(tr?.shift_reason||'')}" placeholder="Alasan jika bergeser/ditunda/tidak mengajar" ${SHIFTED.has(st)?'':'style="opacity:.55"'}>
        <button class="rpp-btn secondary" onclick="rppSaveTracking('${as.id}','${t.id}')">Simpan pacing</button>
      </div>
      <div class="rpp-file">
        ${sub?`<span class="rpp-badge ${contentClass(sub.content_status)}">${esc(contentText(sub.content_status))}</span><b style="font-size:11px">${esc(sub.original_filename)}</b><span class="rpp-note">${fmtSize(sub.file_size)} • ${sub.uploaded_at?fmtDate(sub.uploaded_at.slice(0,10)):'belum selesai upload'}</span>${sub.upload_status==='uploaded'?`<button class="rpp-btn secondary" onclick="rppOpenFile('${sub.id}')">Lihat RPP</button>`:''}`:'<span class="rpp-note">Belum ada RPP yang diunggah untuk target ini.</span>'}
        ${!noFile?`<label class="rpp-btn" style="cursor:pointer">${sub?'Upload versi baru':'Upload RPP'}<input type="file" hidden accept=".pdf,.doc,.docx,image/jpeg,image/png,image/webp" onchange="rppUploadFile('${as.id}','${t.id}',this)"></label>`:''}
      </div>
    </div>`;
  }

  async function loadReport(){
    const box=document.getElementById('rpp-body'); if(box)box.innerHTML='<div class="rpp-empty">Menyiapkan monitoring RPP seluruh guru...</div>';
    try{ const d=await api('report',{through_date:today()}); state.reportRows=d.rows||[]; renderReport(d.summary||{}); }catch(e){if(box)box.innerHTML=`<div class="rpp-empty">Gagal memuat laporan: ${esc(e.message)}</div>`;}
  }
  function renderReport(summary){
    const box=document.getElementById('rpp-body'); if(!box)return;
    const rows=state.reportRows;
    box.innerHTML=`
      <div class="rpp-help">Laporan memisahkan <b>Kesesuaian Isi RPP</b> dari <b>Pacing LP</b>. RPP yang terlambat karena materi sebelumnya molor tidak otomatis menjadi “tidak sesuai”. Status isi yang belum diverifikasi tidak dianggap salah.</div>
      <div class="rpp-kpis"><div class="rpp-kpi"><b>${summary.rows||0}</b><span>Target s.d. hari ini</span></div><div class="rpp-kpi"><b>${summary.submitted||0}</b><span>RPP masuk</span></div><div class="rpp-kpi"><b>${summary.missing||0}</b><span>Belum upload</span></div><div class="rpp-kpi"><b>${summary.shifted||0}</b><span>Pacing bergeser</span></div><div class="rpp-kpi"><b>${summary.no_meeting||0}</b><span>Tidak ada pertemuan</span></div><div class="rpp-kpi"><b>${summary.mismatch||0}</b><span>Terindikasi tidak sesuai</span></div></div>
      <div class="rpp-toolbar"><input class="rpp-input" id="rpp-search" placeholder="Cari guru / kelas / mapel / materi" oninput="rppFilterReport()"><select class="rpp-select" id="rpp-report-status" onchange="rppFilterReport()"><option value="all">Semua status RPP</option><option value="belum_upload">Belum upload</option><option value="sudah_upload">Sudah upload</option><option value="tidak_ada_pertemuan">Tidak ada pertemuan</option></select><select class="rpp-select" id="rpp-report-content" onchange="rppFilterReport()"><option value="all">Semua pemeriksaan isi</option><option value="pending_review">Belum diverifikasi</option><option value="match">Sesuai LP</option><option value="needs_review">Perlu verifikasi</option><option value="mismatch">Terindikasi tidak sesuai</option><option value="unreadable">Tidak terbaca</option></select><button class="rpp-btn secondary" onclick="rppReloadReport()">Muat ulang</button></div>
      <div class="rpp-table-wrap"><table class="rpp-table"><thead><tr><th>Guru</th><th>Kelas / Mapel</th><th>Target LP</th><th>Periode Target</th><th>RPP</th><th>Kesesuaian Isi</th><th>Pacing</th><th>Alasan / Catatan</th><th>Aksi</th></tr></thead><tbody id="rpp-report-body">${reportRowsHtml(rows)}</tbody></table></div>`;
  }
  function reportRowsHtml(rows){ if(!rows.length)return '<tr><td colspan="9" style="text-align:center;padding:25px">Tidak ada data pada filter ini.</td></tr>'; return rows.map(r=>`<tr>
    <td><b>${esc(r.teacher_name)}</b></td><td>${esc(r.class_name)}<br><span class="rpp-note">${esc(r.subject_name)}</span></td><td><b>${esc(r.target_text)}</b><br><span class="rpp-note">Pekan ${esc(r.week_no)} • ${esc(r.target_type)}</span></td><td>${esc(r.period_label)}</td>
    <td><span class="rpp-badge ${r.rpp_status==='sudah_upload'?'ok':r.rpp_status==='belum_upload'?'bad':'muted'}">${esc(rppText(r.rpp_status))}</span>${r.filename?`<br><span class="rpp-note">${esc(r.filename)}</span>`:''}</td>
    <td>${r.submission_id?`<span class="rpp-badge ${contentClass(r.content_status)}">${esc(contentText(r.content_status))}</span>`:'<span class="rpp-badge muted">Belum ada RPP</span>'}</td>
    <td><span class="rpp-badge ${pacingClass(r.execution_status)}">${esc(statusText(r.execution_status))}</span>${r.progress_percent?`<br><span class="rpp-note">${esc(r.progress_percent)}%</span>`:''}</td>
    <td>${esc(r.shift_reason||r.teacher_note||r.review_note||'-')}</td><td>${r.submission_id?`<button class="rpp-btn secondary" onclick="rppOpenFile('${r.submission_id}')">Lihat</button> <button class="rpp-btn secondary" onclick="rppReview('${r.submission_id}','${esc(r.content_status||'pending_review')}')">Periksa</button>`:'-'}</td>
  </tr>`).join(''); }

  function renderShell(){
    injectStyle(); const c=document.getElementById('content'); if(!c)return;
    const reviewer=isReviewer();
    c.innerHTML=`<div class="rpp-wrap"><div class="rpp-head"><div><div class="rpp-title">RPP & Target LP</div><div class="rpp-sub">Pemantauan RPP berdasarkan target pembelajaran sekolah. Tanggal LP dipakai sebagai target pacing; pergeseran karena materi belum tuntas, tidak ada pertemuan, atau kegiatan sekolah dicatat tanpa otomatis menilai RPP salah.</div></div>${reviewer?`<div class="rpp-tabs"><button id="rpp-tab-report" class="rpp-tab ${state.mode==='report'?'active':''}" onclick="rppSwitchMode('report')">Monitoring Guru</button>${currentUser?.teacher_id?`<button id="rpp-tab-teacher" class="rpp-tab ${state.mode==='teacher'?'active':''}" onclick="rppSwitchMode('teacher')">RPP Saya</button>`:''}</div>`:''}</div><div id="rpp-body"></div></div>`;
    if(reviewer && state.mode==='report') loadReport(); else loadTeacher();
  }

  window.renderRppLp = function(){ state.mode=isReviewer()?'report':'teacher'; renderShell(); };
  window.rppSwitchMode=function(mode){state.mode=mode;renderShell();};
  window.rppSelectAssignment=function(id){state.assignmentId=id;renderTeacherBody();};
  window.rppSetFilter=function(v){state.filter=v;renderTeacherBody();};
  window.rppToggleReason=function(id){const st=document.getElementById(`rpp-status-${id}`)?.value||'';const el=document.getElementById(`rpp-reason-${id}`);if(el)el.style.opacity=SHIFTED.has(st)?'1':'.55';};
  window.rppReloadTeacher=loadTeacher; window.rppReloadReport=loadReport;
  window.rppSaveTracking=async function(assignmentId,targetId){
    const st=document.getElementById(`rpp-status-${targetId}`)?.value||'not_started'; const progress=Number(document.getElementById(`rpp-progress-${targetId}`)?.value||0); const reason=document.getElementById(`rpp-reason-${targetId}`)?.value||'';
    if(SHIFTED.has(st)&&!reason.trim()){toast('Isi alasan pergeseran/penundaan terlebih dahulu.',true);return;}
    try{await api('save_tracking',{assignment_id:assignmentId,lp_target_id:targetId,execution_status:st,progress_percent:progress,shift_reason:reason});toast('Pacing LP tersimpan.');await loadTeacher();}catch(e){toast(`Gagal menyimpan: ${e.message}`,true);}
  };
  window.rppUploadFile=async function(assignmentId,targetId,input){
    const file=input.files?.[0]; if(!file)return; if(file.size>25*1024*1024){toast('Ukuran file maksimal 25 MB.',true);input.value='';return;}
    const allowed=['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','image/jpeg','image/png','image/webp']; if(!allowed.includes(file.type)){toast('Format RPP harus PDF, DOC/DOCX, JPG, PNG, atau WEBP.',true);input.value='';return;}
    try{
      toast('Menyiapkan upload RPP...');
      const sign=await api('create_upload',{assignment_id:assignmentId,lp_target_id:targetId,filename:file.name,mime_type:file.type,file_size:file.size});
      const fd=new FormData(); fd.append('cacheControl','3600'); fd.append('',file);
      const up=await fetch(sign.signed_url,{method:'PUT',headers:{'apikey':SUPABASE_PUBLISHABLE_KEY,'x-upsert':'false'},body:fd});
      if(!up.ok){const t=await up.text();throw new Error(`Upload file gagal (${up.status}) ${t.slice(0,120)}`);}
      await api('complete_upload',{submission_id:sign.submission_id}); toast('RPP berhasil diunggah.'); await loadTeacher();
    }catch(e){toast(`Upload gagal: ${e.message}`,true);}finally{input.value='';}
  };
  window.rppOpenFile=async function(id){try{const d=await api('view_file',{submission_id:id});window.open(d.url,'_blank','noopener');}catch(e){toast(`File tidak dapat dibuka: ${e.message}`,true);}};
  window.rppReview=async function(id,current){
    const options='1 = Sesuai LP\n2 = Perlu verifikasi\n3 = Terindikasi tidak sesuai\n4 = Dokumen tidak terbaca\n0 = Belum diverifikasi'; const pick=prompt(`Pilih hasil pemeriksaan isi RPP:\n${options}`,current==='match'?'1':current==='needs_review'?'2':current==='mismatch'?'3':current==='unreadable'?'4':'0'); if(pick===null)return; const map={'0':'pending_review','1':'match','2':'needs_review','3':'mismatch','4':'unreadable'}; if(!map[pick]){toast('Pilihan tidak valid.',true);return;} const note=prompt('Catatan pemeriksaan (opsional):','')??''; try{await api('review',{submission_id:id,content_status:map[pick],review_note:note});toast('Hasil pemeriksaan tersimpan.');await loadReport();}catch(e){toast(`Gagal menyimpan pemeriksaan: ${e.message}`,true);}
  };
  window.rppFilterReport=function(){const q=String(document.getElementById('rpp-search')?.value||'').toLowerCase().trim(),rs=document.getElementById('rpp-report-status')?.value||'all',cs=document.getElementById('rpp-report-content')?.value||'all';const rows=state.reportRows.filter(r=>(!q||`${r.teacher_name} ${r.class_name} ${r.subject_name} ${r.target_text}`.toLowerCase().includes(q))&&(rs==='all'||r.rpp_status===rs)&&(cs==='all'||r.content_status===cs));const body=document.getElementById('rpp-report-body');if(body)body.innerHTML=reportRowsHtml(rows);};

  function patchMenu(){
    try{
      if(typeof MODULE_GROUPS==='undefined') return;
      let g=MODULE_GROUPS.find(x=>x.id==='akademik');
      if(!g){MODULE_GROUPS.unshift({id:'akademik',label:'Akademik',roles:['guru','walas','akademik','pimpinan','admin'],items:[]});g=MODULE_GROUPS[0];}
      ['guru','walas','akademik','pimpinan','admin'].forEach(r=>{if(!g.roles.includes(r))g.roles.push(r)});
      if(!g.items.some(x=>x.id==='rpp-lp'))g.items.push({id:'rpp-lp',label:'RPP & LP',roles:['guru','walas','akademik','pimpinan','admin'],built:true,render:window.renderRppLp});
    }catch(e){console.warn('RPP menu patch gagal',e);}
  }
  patchMenu();
})();
