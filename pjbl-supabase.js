/* CQlass PjBL Supabase V1 — no weekly individual scoring */
const PJBL_API_URL = `${SUPABASE_URL}/functions/v1/pjbl`;
const pjblV2 = {
  classes: [],
  classId: '',
  timeline: [],
  week: 1,
  log: null,
  canWrite: false,
  photoBase64: '',
  photoMime: '',
  loading: false
};

function pjblV2Escape(v){ return typeof escapeHtml === 'function' ? escapeHtml(v) : String(v ?? ''); }
function pjblV2Role(){ return String(currentUser?.role || '').toLowerCase(); }

async function pjblV2Request(action, payload={}){
  const token = getAuthToken();
  if(!token) throw new Error('Sesi login tidak ditemukan. Silakan login kembali.');
  const ctrl = new AbortController();
  const timer = setTimeout(()=>ctrl.abort(), 30000);
  try{
    const res = await fetch(PJBL_API_URL, {
      method:'POST',
      headers:{
        'Content-Type':'application/json',
        'apikey':SUPABASE_PUBLISHABLE_KEY,
        'Authorization':`Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
        'x-session-token':token
      },
      body:JSON.stringify({action, ...payload}),
      signal:ctrl.signal
    });
    const raw = await res.text();
    let data={};
    try{ data=raw ? JSON.parse(raw) : {}; }catch(_){ throw new Error(`Respons PjBL tidak valid (HTTP ${res.status}).`); }
    if(!res.ok || data.success===false){
      const map={
        session_invalid:'Sesi login tidak berlaku. Silakan login kembali.',
        session_expired:'Sesi login sudah berakhir. Silakan login kembali.',
        class_forbidden:'Anda tidak memiliki akses ke kelas tersebut.',
        no_class_access:'Belum ada kelas PjBL yang terhubung ke akun ini.',
        write_forbidden:'Akun ini hanya dapat melihat laporan PjBL.',
        photo_too_large:'Foto terlalu besar. Maksimal 4 MB setelah kompresi.',
        photo_type_invalid:'Format foto harus JPG, PNG, atau WebP.'
      };
      throw new Error(map[data.error] || data.message || data.error || `HTTP ${res.status}`);
    }
    return data;
  }catch(err){
    if(err?.name==='AbortError') throw new Error('Server PjBL terlalu lama merespons. Silakan coba lagi.');
    throw err;
  }finally{ clearTimeout(timer); }
}

function pjblV2InjectStyle(){
  if(document.getElementById('pjbl-v2-style')) return;
  const style=document.createElement('style');
  style.id='pjbl-v2-style';
  style.textContent=`
    .pjbl-v2-toolbar{display:flex;gap:12px;align-items:end;flex-wrap:wrap;margin-bottom:14px}
    .pjbl-v2-field{display:flex;flex-direction:column;gap:6px;min-width:180px;flex:1}
    .pjbl-v2-field label{font-size:12px;font-weight:700;color:var(--text-muted,#667085)}
    .pjbl-v2-field select,.pjbl-v2-field textarea{width:100%;border:1px solid var(--border,#d7dde5);border-radius:10px;background:#fff;padding:10px 12px;font:inherit;color:inherit}
    .pjbl-v2-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.2fr);gap:14px}
    .pjbl-v2-card{background:#fff;border:1px solid var(--border,#e1e5ea);border-radius:14px;padding:16px}
    .pjbl-v2-card h3{margin:0 0 12px;font-size:15px}
    .pjbl-v2-meta{display:grid;grid-template-columns:120px 1fr;gap:8px 12px;font-size:13px}
    .pjbl-v2-meta b{color:var(--text-muted,#667085);font-weight:600}
    .pjbl-v2-activity{white-space:pre-wrap;line-height:1.55;background:var(--primary-light,#eef8f8);border-radius:10px;padding:12px;margin-top:12px}
    .pjbl-v2-textarea{min-height:88px;resize:vertical}
    .pjbl-v2-save{display:flex;align-items:center;gap:10px;margin-top:14px;flex-wrap:wrap}
    .pjbl-v2-note{font-size:12px;color:var(--text-muted,#667085);line-height:1.45}
    .pjbl-v2-photo{margin-top:10px;border:1px dashed var(--border,#d7dde5);border-radius:10px;padding:12px}
    .pjbl-v2-photo img{max-width:260px;max-height:180px;border-radius:10px;display:block;margin-top:8px;object-fit:cover}
    .pjbl-v2-badge{display:inline-flex;align-items:center;border-radius:999px;padding:4px 9px;font-size:11px;font-weight:700;background:var(--primary-light,#eef8f8);color:var(--primary,#0A6E6E)}
    .pjbl-v2-history{font-size:11px;color:#667085;margin-top:10px}
    @media(max-width:850px){.pjbl-v2-grid{grid-template-columns:1fr}.pjbl-v2-meta{grid-template-columns:100px 1fr}}
  `;
  document.head.appendChild(style);
}

function renderPjBL(content){
  pjblV2InjectStyle();
  content.innerHTML=`
    <div class="page-title">PjBL — Project Based Learning</div>
    <div class="page-sub">Monitoring proyek per kelas. Guru cukup mencatat pelaksanaan, kendala, tindak lanjut, dan dokumentasi; tidak ada kewajiban memberi nilai setiap siswa setiap pekan.</div>
    <div class="card">
      <div class="pjbl-v2-toolbar">
        <div class="pjbl-v2-field" style="max-width:300px">
          <label>Kelas</label>
          <select id="pjbl-v2-class"><option value="">Memuat kelas...</option></select>
        </div>
        <div class="pjbl-v2-field" style="max-width:360px">
          <label>Pekan PjBL</label>
          <select id="pjbl-v2-week" disabled><option value="">Pilih kelas terlebih dahulu</option></select>
        </div>
      </div>
      <div id="pjbl-body"><div class="empty-state"><span class="spinner" style="border-top-color:var(--primary)"></span> Memuat PjBL dari Supabase...</div></div>
    </div>`;
  document.getElementById('pjbl-v2-class')?.addEventListener('change', e=>pjblV2LoadClass(e.target.value));
  document.getElementById('pjbl-v2-week')?.addEventListener('change', e=>pjblV2LoadWeek(Number(e.target.value)));
  pjblV2Bootstrap();
}

async function pjblV2Bootstrap(){
  const body=document.getElementById('pjbl-body');
  try{
    const res=await pjblV2Request('bootstrap');
    if(activeModule!=='pjbl') return;
    pjblV2.classes=Array.isArray(res.classes)?res.classes:[];
    const sel=document.getElementById('pjbl-v2-class');
    if(!sel) return;
    sel.innerHTML='<option value="">Pilih kelas</option>'+pjblV2.classes.map(c=>`<option value="${pjblV2Escape(c.id)}">${pjblV2Escape(c.name)}</option>`).join('');
    const preferred = res.default_class_id || pjblV2.classes.find(c=>String(c.name).toLowerCase()===String(currentUser?.kelas||'').toLowerCase())?.id || (pjblV2.classes.length===1?pjblV2.classes[0].id:'');
    if(res.class_locked && preferred) sel.disabled=true;
    if(preferred){ sel.value=preferred; await pjblV2LoadClass(preferred); }
    else if(body) body.innerHTML='<div class="empty-state"><div class="icon">📋</div>Pilih kelas untuk melihat Timeline dan laporan PjBL.</div>';
  }catch(err){
    if(body) body.innerHTML=`<div class="empty-state"><div class="icon">!</div>${pjblV2Escape(err.message)}</div>`;
  }
}

async function pjblV2LoadClass(classId){
  if(!classId) return;
  pjblV2.classId=classId;
  pjblV2.photoBase64=''; pjblV2.photoMime='';
  const body=document.getElementById('pjbl-body');
  if(body) body.innerHTML='<div class="empty-state"><span class="spinner" style="border-top-color:var(--primary)"></span> Memuat timeline dan log PjBL...</div>';
  try{
    const res=await pjblV2Request('load',{class_id:classId});
    if(activeModule!=='pjbl'||pjblV2.classId!==classId) return;
    pjblV2.timeline=Array.isArray(res.timeline)?res.timeline:[];
    pjblV2.week=Number(res.selected_week||1);
    pjblV2.log=res.log||null;
    pjblV2.canWrite=Boolean(res.can_write);
    pjblV2RenderWeekOptions();
    pjblV2RenderBody(res.class||null);
  }catch(err){ if(body) body.innerHTML=`<div class="empty-state"><div class="icon">!</div>${pjblV2Escape(err.message)}</div>`; }
}

function pjblV2RenderWeekOptions(){
  const sel=document.getElementById('pjbl-v2-week'); if(!sel) return;
  const rows=pjblV2.timeline;
  if(!rows.length){ sel.innerHTML='<option value="1">Pekan 1</option>'; sel.disabled=false; sel.value='1'; return; }
  sel.innerHTML=rows.map(r=>{
    const agenda=r.is_school_agenda?' • Agenda Sekolah':'';
    const phase=r.phase?` • ${r.phase}`:'';
    return `<option value="${Number(r.week_no)}">Pekan ${Number(r.week_no)}${pjblV2Escape(phase)}${pjblV2Escape(agenda)}</option>`;
  }).join('');
  sel.disabled=false;
  if(rows.some(r=>Number(r.week_no)===Number(pjblV2.week))) sel.value=String(pjblV2.week);
  else { pjblV2.week=Number(rows[0].week_no); sel.value=String(pjblV2.week); }
}

async function pjblV2LoadWeek(week){
  if(!pjblV2.classId||!week) return;
  pjblV2.week=Number(week); pjblV2.photoBase64=''; pjblV2.photoMime='';
  const body=document.getElementById('pjbl-body');
  if(body) body.innerHTML='<div class="empty-state"><span class="spinner" style="border-top-color:var(--primary)"></span> Memuat Pekan '+pjblV2Escape(week)+'...</div>';
  try{
    const res=await pjblV2Request('load',{class_id:pjblV2.classId,week_no:pjblV2.week});
    if(activeModule!=='pjbl'||Number(pjblV2.week)!==Number(week)) return;
    pjblV2.timeline=Array.isArray(res.timeline)?res.timeline:pjblV2.timeline;
    pjblV2.log=res.log||null; pjblV2.canWrite=Boolean(res.can_write);
    pjblV2RenderBody(res.class||null);
  }catch(err){ if(body) body.innerHTML=`<div class="empty-state"><div class="icon">!</div>${pjblV2Escape(err.message)}</div>`; }
}

function pjblV2RenderBody(classInfo){
  const body=document.getElementById('pjbl-body'); if(!body) return;
  const tl=pjblV2.timeline.find(x=>Number(x.week_no)===Number(pjblV2.week))||{};
  const log=pjblV2.log||{};
  const readOnly=!pjblV2.canWrite;
  const val=v=>pjblV2Escape(v||'');
  const photo=String(log.photo_url||'');
  const photoBlock=photo ? (/drive\.google\.com/i.test(photo)
    ? `<a class="btn-secondary" href="${val(photo)}" target="_blank" rel="noopener">Buka dokumentasi lama</a>`
    : `<a href="${val(photo)}" target="_blank" rel="noopener"><img src="${val(photo)}" alt="Dokumentasi PjBL" onerror="this.style.display='none'"></a>`)
    : '<span class="pjbl-v2-note">Belum ada dokumentasi foto.</span>';
  body.innerHTML=`
    <div class="pjbl-v2-grid">
      <section class="pjbl-v2-card">
        <h3>Timeline Pekan ${Number(pjblV2.week)}</h3>
        <div class="pjbl-v2-meta">
          <b>Kelas</b><span>${val(classInfo?.name||'')}</span>
          <b>Proyek</b><span>${val(tl.project_name||'-')}</span>
          <b>Tanggal</b><span>${val(tl.date_text||'-')}</span>
          <b>Tahap</b><span><span class="pjbl-v2-badge">${val(tl.phase|| (tl.is_school_agenda?'Agenda Sekolah':'PjBL'))}</span></span>
        </div>
        <div class="pjbl-v2-activity">${val(tl.activity||log.planned_activity||'Timeline kegiatan belum tersedia.')}</div>
        ${tl.is_school_agenda?'<div class="pjbl-v2-history">Pekan ini tercatat sebagai agenda sekolah. Laporan pelaksanaan PjBL boleh dikosongkan bila memang tidak ada kegiatan proyek.</div>':''}
      </section>
      <section class="pjbl-v2-card">
        <h3>Laporan Pelaksanaan</h3>
        <div class="pjbl-v2-field">
          <label>Realisasi kegiatan</label>
          <textarea id="pjbl-v2-actual" class="pjbl-v2-textarea" ${readOnly?'disabled':''} placeholder="Apa yang benar-benar dilaksanakan pada pekan ini?">${val(log.actual_activity)}</textarea>
        </div>
        <div class="pjbl-v2-field" style="margin-top:10px">
          <label>Kendala</label>
          <textarea id="pjbl-v2-obstacle" class="pjbl-v2-textarea" ${readOnly?'disabled':''} placeholder="Kendala yang muncul; isi Tidak ada bila lancar.">${val(log.obstacle)}</textarea>
        </div>
        <div class="pjbl-v2-field" style="margin-top:10px">
          <label>Tindak lanjut / saran</label>
          <textarea id="pjbl-v2-suggestion" class="pjbl-v2-textarea" ${readOnly?'disabled':''} placeholder="Apa tindak lanjut untuk pekan berikutnya?">${val(log.suggestion)}</textarea>
        </div>
        <div class="pjbl-v2-photo">
          <b style="font-size:12px">Dokumentasi</b>
          <div id="pjbl-v2-photo-current">${photoBlock}</div>
          ${readOnly?'':`<input id="pjbl-v2-photo" type="file" accept="image/jpeg,image/png,image/webp" style="margin-top:10px;max-width:100%"><div class="pjbl-v2-note">Foto baru akan dikompresi otomatis dan disimpan di Supabase Storage (private).</div>`}
        </div>
        ${readOnly?'<div class="pjbl-v2-note" style="margin-top:12px">Mode lihat saja. Pengisian laporan dilakukan oleh wali kelas/akun yang ditugaskan.</div>':`<div class="pjbl-v2-save"><button class="btn" id="pjbl-v2-save">Simpan Laporan Pekan ${Number(pjblV2.week)}</button><span class="pjbl-v2-note">Tidak ada penilaian individual mingguan.</span></div>`}
        ${log.recorded_by_name?`<div class="pjbl-v2-history">Terakhir dicatat: ${val(log.recorded_by_name)}${log.source_system==='sheet_master'?' · histori SHEET MASTER':''}</div>`:''}
      </section>
    </div>`;
  if(!readOnly){
    document.getElementById('pjbl-v2-photo')?.addEventListener('change',pjblV2PhotoChanged);
    document.getElementById('pjbl-v2-save')?.addEventListener('click',pjblV2Save);
  }
}

async function pjblV2PhotoChanged(e){
  const file=e.target.files?.[0]; if(!file){pjblV2.photoBase64='';pjblV2.photoMime='';return;}
  try{
    const out=await pjblV2CompressImage(file);
    pjblV2.photoBase64=out.base64; pjblV2.photoMime=out.mime;
    const wrap=document.getElementById('pjbl-v2-photo-current');
    if(wrap) wrap.innerHTML=`<img src="${pjblV2Escape(out.dataUrl)}" alt="Preview foto PjBL"><div class="pjbl-v2-note">Foto baru siap disimpan.</div>`;
  }catch(err){ e.target.value=''; showToast(err.message||'Foto tidak dapat diproses.',true); }
}

function pjblV2CompressImage(file){
  return new Promise((resolve,reject)=>{
    if(!/^image\/(jpeg|png|webp)$/i.test(file.type||'')) return reject(new Error('Pilih foto JPG, PNG, atau WebP.'));
    if(file.size>15*1024*1024) return reject(new Error('File foto terlalu besar. Maksimal 15 MB sebelum kompresi.'));
    const reader=new FileReader();
    reader.onerror=()=>reject(new Error('Foto tidak dapat dibaca.'));
    reader.onload=()=>{
      const img=new Image();
      img.onerror=()=>reject(new Error('Format foto tidak dapat dibuka.'));
      img.onload=()=>{
        const max=1600, scale=Math.min(1,max/Math.max(img.width,img.height));
        const canvas=document.createElement('canvas'); canvas.width=Math.max(1,Math.round(img.width*scale)); canvas.height=Math.max(1,Math.round(img.height*scale));
        const ctx=canvas.getContext('2d'); ctx.drawImage(img,0,0,canvas.width,canvas.height);
        let quality=.82, dataUrl='';
        do{ dataUrl=canvas.toDataURL('image/jpeg',quality); quality-=.08; }while(dataUrl.length>5.2*1024*1024 && quality>.42);
        const base64=dataUrl.split(',')[1]||'';
        if(Math.ceil(base64.length*3/4)>4*1024*1024) return reject(new Error('Foto masih lebih dari 4 MB setelah kompresi. Pilih foto lain.'));
        resolve({dataUrl,base64,mime:'image/jpeg'});
      };
      img.src=reader.result;
    };
    reader.readAsDataURL(file);
  });
}

async function pjblV2Save(){
  const btn=document.getElementById('pjbl-v2-save'); if(!btn||pjblV2.loading) return;
  pjblV2.loading=true; btn.disabled=true; const old=btn.textContent; btn.innerHTML='<span class="spinner"></span>Menyimpan...';
  try{
    const res=await pjblV2Request('save_log',{
      class_id:pjblV2.classId, week_no:pjblV2.week,
      actual_activity:document.getElementById('pjbl-v2-actual')?.value?.trim()||'',
      obstacle:document.getElementById('pjbl-v2-obstacle')?.value?.trim()||'',
      suggestion:document.getElementById('pjbl-v2-suggestion')?.value?.trim()||'',
      photo_base64:pjblV2.photoBase64||'', photo_mime:pjblV2.photoMime||''
    });
    pjblV2.log=res.log||null; pjblV2.photoBase64=''; pjblV2.photoMime='';
    pjblV2RenderBody(res.class||null); showToast('Laporan PjBL berhasil disimpan.');
  }catch(err){ showToast(err.message||'Gagal menyimpan PjBL.',true); }
  finally{ pjblV2.loading=false; const now=document.getElementById('pjbl-v2-save'); if(now){now.disabled=false;now.textContent=old;} }
}
