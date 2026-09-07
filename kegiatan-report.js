/* CQlass — Kabid Kegiatan: target, realisasi, dokumentasi, Pekan Bahasa, dan status ekskul */
(function(){
  'use strict';

  const ACTIVITY_URL = SUPABASE_URL + '/functions/v1/activity-report';
  const EXKUL_STATUS_URL = SUPABASE_URL + '/functions/v1/activity-extracurricular';
  const KAT_LABEL = {
    MD:'Market Day', NATIVE:'Native Teacher', JUMSIH:'Jumsih', EKSKUL:'Ekskul',
    JUMAT_BERBAGI:"Jum'at Berbagi", PEKAN_BAHASA:'Pekan Bahasa', TASMI:"Tasmi' Syahriyyah",
    BUNDAKU_GURUKU:'Bundaku Guruku', LAINNYA:'Kegiatan Lainnya'
  };
  const STATUS_LABEL = {
    TERJADWAL:'Terjadwal', TERLAKSANA:'Terlaksana', DITUNDA:'Ditunda',
    DIJADWALKAN_ULANG:'Dijadwalkan Ulang', BATAL:'Batal'
  };

  let KR = { events:[], period:null, month:'', detail:null, exkul:null, exkulRows:[], exkulState:'unknown' };

  function esc(v){ return escapeHtml(String(v == null ? '' : v)); }
  function userCanMenu(){
    const u=currentUser||{};
    return ['kegiatan','tahfizh','pimpinan'].includes(String(u.role||'').toLowerCase()) || ['dila','saad','fatih'].includes(String(u.username||'').toLowerCase());
  }
  function canEditExkul(){ return String(currentUser?.role||'').toLowerCase()==='kegiatan'; }
  function canViewExkul(){ return ['kegiatan','pimpinan'].includes(String(currentUser?.role||'').toLowerCase()); }

  async function request(url,action,payload={}){
    const token=getAuthToken();
    if(!token) throw new Error('Sesi login tidak ditemukan.');
    const ctl=new AbortController(), timer=setTimeout(()=>ctl.abort(),35000);
    try{
      const r=await fetch(url,{method:'POST',signal:ctl.signal,headers:{
        'Content-Type':'application/json','apikey':SUPABASE_PUBLISHABLE_KEY,
        'Authorization':'Bearer '+SUPABASE_PUBLISHABLE_KEY,'x-session-token':token
      },body:JSON.stringify({action,...payload})});
      const raw=await r.text(); let d={}; try{d=raw?JSON.parse(raw):{}}catch(_){throw new Error('Respons kegiatan tidak valid.')}
      if(!r.ok||d.success===false){
        const m={forbidden:'Anda tidak memiliki akses ke kegiatan ini.',session_invalid:'Sesi login sudah berakhir.',photo_limit:'Maksimal 10 foto per kegiatan.',image_too_large:'Foto masih terlalu besar setelah diproses.',readonly:'Data ini hanya dapat diubah Kabid Kegiatan.',student_internal:'Siswa sudah terdaftar pada ekskul internal.'};
        throw new Error(m[d.error]||d.error||'Data kegiatan belum berhasil diproses.');
      }
      return d;
    }catch(e){ if(e?.name==='AbortError') throw new Error('Server kegiatan terlalu lama merespons.'); throw e; }
    finally{ clearTimeout(timer); }
  }
  const act=(a,p)=>request(ACTIVITY_URL,a,p);
  const exk=(a,p)=>request(EXKUL_STATUS_URL,a,p);

  function injectStyles(){
    if(document.getElementById('kegiatan-report-style')) return;
    const s=document.createElement('style'); s.id='kegiatan-report-style';
    s.textContent=`
      .kr-shell{max-width:1380px;margin:0 auto}.kr-head{display:flex;justify-content:space-between;gap:14px;align-items:flex-start;flex-wrap:wrap;margin-bottom:14px}
      .kr-head h2{margin:0;font-size:23px;color:var(--text)}.kr-head p{margin:5px 0 0;color:var(--muted);font-size:11px}.kr-toolbar{display:flex;gap:8px;flex-wrap:wrap}.kr-select,.kr-input,.kr-textarea{border:1px solid var(--border);border-radius:10px;background:#fff;color:var(--text);font:inherit;font-size:11px;padding:9px 10px;outline:none}.kr-select:focus,.kr-input:focus,.kr-textarea:focus{border-color:var(--primary);box-shadow:0 0 0 3px rgba(10,110,110,.08)}
      .kr-kpis{display:grid;grid-template-columns:repeat(4,minmax(130px,1fr));gap:10px;margin-bottom:14px}.kr-kpi{background:#fff;border:1px solid var(--border);border-radius:14px;padding:14px}.kr-kpi strong{display:block;font-size:24px;color:#075b59;line-height:1}.kr-kpi span{display:block;margin-top:7px;font-size:10px;font-weight:850;color:var(--muted)}.kr-kpi small{display:block;margin-top:4px;font-size:9px;color:var(--muted)}
      .kr-card{background:#fff;border:1px solid var(--border);border-radius:15px;padding:15px;margin-bottom:11px}.kr-event{display:grid;grid-template-columns:110px minmax(240px,1fr) minmax(160px,.7fr) auto;gap:14px;align-items:center}.kr-date{font-size:11px;font-weight:900;color:#075b59}.kr-title{font-size:12px;font-weight:900}.kr-meta{font-size:10px;color:var(--muted);margin-top:4px;line-height:1.45}.kr-badge{display:inline-flex;border-radius:999px;padding:5px 8px;font-size:9px;font-weight:900;background:#eef5f5;color:#466}.kr-badge.done{background:#e8f7ef;color:#357352}.kr-badge.warn{background:#fff2de;color:#936500}.kr-badge.late{background:#fff0ec;color:#ad4c39}.kr-actions{display:flex;gap:6px;justify-content:flex-end}.kr-btn{border:0;border-radius:9px;padding:8px 10px;background:var(--primary);color:#fff;font:inherit;font-size:10px;font-weight:850;cursor:pointer}.kr-btn.secondary{background:#eef5f5;color:#275f5c}.kr-btn.ghost{background:#fff;border:1px solid var(--border);color:var(--text)}.kr-btn:disabled{opacity:.55;cursor:not-allowed}
      .kr-section-title{font-size:13px;font-weight:900;margin-bottom:10px}.kr-empty{padding:22px;text-align:center;color:var(--muted);font-size:11px}.kr-exkul-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:9px}.kr-exkul-stat{border:1px solid var(--border);border-radius:12px;padding:12px;background:#fff;cursor:pointer;text-align:left}.kr-exkul-stat strong{display:block;font-size:21px;color:#075b59}.kr-exkul-stat span{font-size:9.5px;font-weight:850;color:var(--muted)}
      .kr-overlay{position:fixed;inset:0;background:rgba(11,36,35,.42);z-index:400;display:none;align-items:center;justify-content:center;padding:18px}.kr-overlay.open{display:flex}.kr-modal{width:min(980px,100%);max-height:92vh;overflow:auto;background:#fff;border-radius:18px;box-shadow:0 24px 70px rgba(0,0,0,.22)}.kr-modal-head{position:sticky;top:0;z-index:3;background:#fff;border-bottom:1px solid var(--border);padding:16px 18px;display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.kr-modal-title{font-size:16px;font-weight:900}.kr-close{border:0;background:#eef4f4;width:32px;height:32px;border-radius:10px;cursor:pointer;font-size:20px}.kr-modal-body{padding:17px}.kr-form-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:11px}.kr-field label{display:block;font-size:9.5px;font-weight:850;color:var(--muted);margin-bottom:5px;text-transform:uppercase}.kr-field .kr-input,.kr-field .kr-select,.kr-field .kr-textarea{width:100%;box-sizing:border-box}.kr-field.span2{grid-column:span 2}.kr-field.span3{grid-column:1/-1}.kr-textarea{min-height:78px;resize:vertical}.kr-read{min-height:37px;display:flex;align-items:center;padding:0 10px;background:#f6f9f9;border:1px solid var(--border);border-radius:9px;font-size:11px;font-weight:700}.kr-att{display:flex;gap:8px;flex-wrap:wrap;padding:10px;border-radius:11px;background:#f4f9f8;margin:11px 0}.kr-att b{font-size:11px}.kr-att span{font-size:10px;color:var(--muted)}
      .kr-photos{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-top:8px}.kr-photo{aspect-ratio:1.2;border-radius:10px;overflow:hidden;background:#eef3f3}.kr-photo img{width:100%;height:100%;object-fit:cover;display:block}.kr-upload{border:1px dashed #9fc9c6;border-radius:11px;padding:12px;background:#f6fbfa}.kr-upload input{width:100%;font-size:10px}.kr-upload-note{font-size:9.5px;color:var(--muted);margin-top:5px}.kr-savebar{display:flex;justify-content:flex-end;gap:8px;margin-top:15px;padding-top:13px;border-top:1px solid var(--border)}
      .kr-lang-tools{display:flex;gap:8px;align-items:center;margin:9px 0}.kr-lang-table-wrap{max-height:340px;overflow:auto;border:1px solid var(--border);border-radius:11px}.kr-lang-table{width:100%;border-collapse:collapse;min-width:720px}.kr-lang-table th,.kr-lang-table td{padding:7px 8px;border-bottom:1px solid var(--border);font-size:10px;text-align:left}.kr-lang-table th{position:sticky;top:0;background:#f3f8f8;z-index:1;color:var(--muted);font-size:9px}.kr-lang-table input[type=text],.kr-lang-table select{width:100%;box-sizing:border-box;border:1px solid var(--border);border-radius:7px;padding:6px;font:inherit;font-size:9.5px}
      .kr-list-toolbar{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:10px}.kr-mini-table{width:100%;border-collapse:collapse}.kr-mini-table th,.kr-mini-table td{padding:8px;border-bottom:1px solid var(--border);font-size:10px;text-align:left}.kr-mini-table th{font-size:9px;color:var(--muted);text-transform:uppercase}.kr-status-editor{display:flex;gap:5px;align-items:center}.kr-status-editor input{min-width:120px}
      @media(max-width:900px){.kr-event{grid-template-columns:90px 1fr auto}.kr-event>div:nth-child(3){grid-column:2}.kr-kpis,.kr-exkul-grid{grid-template-columns:repeat(2,1fr)}.kr-form-grid{grid-template-columns:1fr 1fr}.kr-field.span3{grid-column:1/-1}.kr-photos{grid-template-columns:repeat(3,1fr)}}
      @media(max-width:620px){.kr-event{grid-template-columns:1fr}.kr-event>div:nth-child(3){grid-column:auto}.kr-actions{justify-content:flex-start}.kr-form-grid{grid-template-columns:1fr}.kr-field.span2,.kr-field.span3{grid-column:auto}.kr-kpis{grid-template-columns:repeat(2,1fr)}.kr-photos{grid-template-columns:repeat(2,1fr)}}
    `;
    document.head.appendChild(s);
  }

  function ensureModal(){
    if(document.getElementById('kr-overlay')) return;
    const o=document.createElement('div'); o.id='kr-overlay'; o.className='kr-overlay';
    o.innerHTML='<div class="kr-modal" id="kr-modal"></div>';
    o.addEventListener('click',e=>{if(e.target===o)closeKegiatanModal()});
    document.body.appendChild(o);
  }

  function installMenu(){
    try{
      const idx=MODULE_GROUPS.findIndex(g=>g.id==='kegiatan_report');
      if(idx>=0) MODULE_GROUPS.splice(idx,1);
      if(!userCanMenu()) return;
      MODULE_GROUPS.push({
        id:'kegiatan_report',label:'Kegiatan',roles:[currentUser.role],
        items:[{id:'kegiatan-laporan',label:'Laporan Kegiatan',roles:[currentUser.role],built:true,render:renderKegiatanReport}]
      });
    }catch(e){console.error('Menu kegiatan gagal dipasang',e)}
  }

  if(typeof renderSidebar==='function'){
    const oldRenderSidebar=renderSidebar;
    renderSidebar=function(){ installMenu(); return oldRenderSidebar.apply(this,arguments); };
    if(currentUser){ try{renderSidebar()}catch(_){} }
  }

  window.renderKegiatanReport=function(content){
    injectStyles(); ensureModal();
    content.innerHTML='<div class="kr-shell" id="kr-root"><div class="kr-card"><span class="spinner"></span> Memuat laporan kegiatan...</div></div>';
    loadKegiatanBootstrap();
  };

  async function loadKegiatanBootstrap(){
    const root=document.getElementById('kr-root'); if(!root)return;
    try{
      const d=await act('bootstrap'); KR.events=d.events||[]; KR.period=d.period||null;
      const currentMonth=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit'}).format(new Date());
      const months=[...new Set(KR.events.map(e=>String(e.planned_date||'').slice(0,7)).filter(Boolean))].sort();
      KR.month=months.includes(currentMonth)?currentMonth:(months[0]||currentMonth);
      if(canViewExkul()){
        try{const x=await exk('summary');KR.exkul=x.summary||null}catch(e){console.warn(e);KR.exkul=null}
      }
      renderKegiatanDashboard();
    }catch(e){root.innerHTML='<div class="kr-card kr-empty">'+esc(e.message||'Laporan kegiatan belum dapat dimuat.')+'</div>';}
  }

  function monthLabel(ym){
    if(!ym)return''; const [y,m]=ym.split('-').map(Number);
    return new Intl.DateTimeFormat('id-ID',{month:'long',year:'numeric'}).format(new Date(y,m-1,1));
  }
  function formatDate(v){if(!v)return'-';try{return new Intl.DateTimeFormat('id-ID',{weekday:'short',day:'numeric',month:'short',year:'numeric'}).format(new Date(v+'T12:00:00+07:00'))}catch(_){return v}}
  function derivedState(e){
    if(e.status==='TERLAKSANA')return{label:'Terlaksana',cls:'done'};
    if(['DITUNDA','DIJADWALKAN_ULANG'].includes(e.status))return{label:STATUS_LABEL[e.status],cls:'warn'};
    if(e.status==='BATAL')return{label:'Batal',cls:'late'};
    const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
    if(!e.report_filled_at&&e.planned_date<today)return{label:'Belum Dilaporkan',cls:'late'};
    return{label:'Terjadwal',cls:''};
  }

  window.krChangeMonth=function(v){KR.month=v;renderKegiatanDashboard()};
  function renderKegiatanDashboard(){
    const root=document.getElementById('kr-root'); if(!root)return;
    const months=[...new Set(KR.events.map(e=>String(e.planned_date||'').slice(0,7)).filter(Boolean))].sort();
    const rows=KR.events.filter(e=>String(e.planned_date||'').startsWith(KR.month));
    const terlaksana=rows.filter(e=>e.status==='TERLAKSANA').length;
    const overdue=rows.filter(e=>derivedState(e).label==='Belum Dilaporkan').length;
    const planned=rows.filter(e=>derivedState(e).label==='Terjadwal').length;
    root.innerHTML=`
      <div class="kr-head"><div><h2>Laporan Kabid Kegiatan</h2><p>Target jadwal, realisasi, absensi yang sudah tersedia, dan dokumentasi dalam satu laporan.</p></div><div class="kr-toolbar"><select class="kr-select" onchange="krChangeMonth(this.value)">${months.map(m=>`<option value="${esc(m)}" ${m===KR.month?'selected':''}>${esc(monthLabel(m))}</option>`).join('')}</select></div></div>
      <div class="kr-kpis">
        <div class="kr-kpi"><strong>${rows.length}</strong><span>Target Kegiatan</span><small>${esc(monthLabel(KR.month))}</small></div>
        <div class="kr-kpi"><strong>${terlaksana}</strong><span>Terlaksana</span><small>Sudah dilaporkan</small></div>
        <div class="kr-kpi"><strong>${overdue}</strong><span>Belum Dilaporkan</span><small>Jadwal sudah lewat</small></div>
        <div class="kr-kpi"><strong>${planned}</strong><span>Masih Terjadwal</span><small>Belum jatuh tempo</small></div>
      </div>
      ${canViewExkul()?renderExkulHighlights():''}
      <div class="kr-section-title">Realisasi Kegiatan — ${esc(monthLabel(KR.month))}</div>
      <div>${rows.length?rows.map(renderEventRow).join(''):'<div class="kr-card kr-empty">Belum ada jadwal pada bulan ini.</div>'}</div>`;
  }

  function renderExkulHighlights(){
    const x=KR.exkul; if(!x)return'<div class="kr-card"><div class="kr-section-title">Status Ekskul Siswa</div><div class="kr-empty">Status ekskul belum dapat dimuat.</div></div>';
    return `<div class="kr-card"><div class="kr-section-title">Status Ekskul Siswa</div><div class="kr-exkul-grid">
      <button class="kr-exkul-stat" onclick="krOpenExkul('internal')"><strong>${x.internal||0}</strong><span>Ekskul Internal</span></button>
      <button class="kr-exkul-stat" onclick="krOpenExkul('external')"><strong>${x.external||0}</strong><span>Ekskul di Luar</span></button>
      <button class="kr-exkul-stat" onclick="krOpenExkul('none')"><strong>${x.none||0}</strong><span>Tidak Ikut Ekskul</span></button>
      <button class="kr-exkul-stat" onclick="krOpenExkul('unknown')"><strong>${x.unknown||0}</strong><span>Belum Ada Status</span></button>
    </div></div>`;
  }

  function renderEventRow(e){
    const st=derivedState(e), p=e.permission||{};
    return `<div class="kr-card kr-event">
      <div><div class="kr-date">${esc(formatDate(e.planned_date))}</div><div class="kr-meta">${esc(KAT_LABEL[e.category]||e.category)}</div></div>
      <div><div class="kr-title">${esc(e.title)}</div><div class="kr-meta">${esc(e.scope_label||'-')}${e.pic_text?' · '+esc(e.pic_text):''}${e.schedule_note?' · '+esc(e.schedule_note):''}</div></div>
      <div><span class="kr-badge ${st.cls}">${esc(st.label)}</span><div class="kr-meta">${e.report_filled_at?'Satu record · dapat diedit':'Belum ada realisasi'}</div></div>
      <div class="kr-actions"><button class="kr-btn ${e.report_filled_at?'secondary':''}" onclick="krOpenEvent('${esc(e.id)}')">${e.report_filled_at?(p.edit?'Lihat / Edit':'Lihat'):p.edit?'Isi Laporan':'Lihat'}</button></div>
    </div>`;
  }

  window.krOpenEvent=async function(id){
    ensureModal(); const o=document.getElementById('kr-overlay'),m=document.getElementById('kr-modal');
    o.classList.add('open'); m.innerHTML='<div class="kr-modal-body"><span class="spinner"></span> Memuat kegiatan...</div>';
    try{const d=await act('detail',{event_id:id});KR.detail=d;renderEventModal()}catch(e){m.innerHTML='<div class="kr-modal-body kr-empty">'+esc(e.message)+'</div>'}
  };
  window.closeKegiatanModal=function(){document.getElementById('kr-overlay')?.classList.remove('open');KR.detail=null};

  function renderEventModal(){
    const d=KR.detail,e=d.event,a=d.attendance||{},edit=!!e.permission?.edit;
    const participants=new Map((d.participants||[]).map(x=>[String(x.student_id),x]));
    const statusOpts=['TERJADWAL','TERLAKSANA','DITUNDA','DIJADWALKAN_ULANG','BATAL'];
    const m=document.getElementById('kr-modal');
    m.innerHTML=`
      <div class="kr-modal-head"><div><div class="kr-modal-title">${esc(e.title)}</div><div class="kr-meta">${e.report_filled_at?'Sudah diisi — perubahan berikutnya masuk sebagai Edit':'Belum diisi — penyimpanan pertama akan mengunci menjadi satu record'}</div></div><button class="kr-close" onclick="closeKegiatanModal()">×</button></div>
      <div class="kr-modal-body">
        <div class="kr-form-grid">
          <div class="kr-field"><label>Jadwal Target</label><div class="kr-read">${esc(formatDate(e.planned_date))}</div></div>
          <div class="kr-field"><label>Tanggal Realisasi</label><input id="kr-actual-date" class="kr-input" type="date" value="${esc(e.actual_date||'')}" ${edit?'':'disabled'}></div>
          <div class="kr-field"><label>Status</label><select id="kr-status" class="kr-select" ${edit?'':'disabled'}>${statusOpts.map(s=>`<option value="${s}" ${s===e.status?'selected':''}>${esc(STATUS_LABEL[s])}</option>`).join('')}</select></div>
          <div class="kr-field"><label>Kelas / Sasaran</label><div class="kr-read">${esc(e.scope_label||'-')}</div></div>
          <div class="kr-field"><label>PIC Jadwal</label><div class="kr-read">${esc(e.pic_text||'-')}</div></div>
          <div class="kr-field"><label>Tanggal Absensi</label><input id="kr-att-date" class="kr-input" type="date" value="${esc(e.attendance_date||e.actual_date||e.planned_date)}" ${edit?'':'disabled'}></div>
          <div class="kr-field span3"><label>Absensi Peserta</label>${a.available?`<div class="kr-att"><b>${a.present||0} hadir / ${a.total||0} siswa</b><span>Diambil otomatis dari absensi ${esc((a.classes||[]).join(', '))} tanggal ${esc(formatDate(a.date))}.</span></div>`:`<div class="kr-att"><b>Absensi belum tersedia</b><span>Jika data absensi belum ada di sistem, isi jumlah peserta secara manual. Tanggal absensi boleh diperbaiki.</span></div>`}</div>
          ${!a.available?`<div class="kr-field"><label>Jumlah Peserta Manual</label><input id="kr-manual-count" class="kr-input" type="number" min="0" value="${e.manual_participant_count??''}" ${edit?'':'disabled'}></div>`:''}
          <div class="kr-field span3"><label>Catatan Singkat</label><textarea id="kr-notes" class="kr-textarea" ${edit?'':'disabled'} placeholder="Kendala, hasil, atau evaluasi singkat...">${esc(e.notes||'')}</textarea></div>
        </div>
        ${e.category==='PEKAN_BAHASA'?renderLanguageSection(d.roster||[],participants,edit):''}
        <div class="kr-card" style="margin-top:12px"><div class="kr-section-title">Dokumentasi Foto</div>${renderPhotos(d.photos||[])}${edit?`<div class="kr-upload"><input id="kr-photo-input" type="file" accept="image/*" multiple onchange="krUploadPhotos(event)"><div class="kr-upload-note">Upload foto asli dari kamera. CQlass otomatis mengecilkan dan mengompres foto sebelum disimpan. Maksimal 10 foto per kegiatan.</div></div>`:''}</div>
        <div class="kr-savebar"><button class="kr-btn ghost" onclick="closeKegiatanModal()">Tutup</button>${edit?'<button id="kr-save" class="kr-btn" onclick="krSaveEvent()">Simpan</button>':''}</div>
      </div>`;
  }

  function renderPhotos(rows){
    if(!rows.length)return'<div class="kr-meta" style="margin-bottom:10px">Belum ada foto dokumentasi.</div>';
    return `<div class="kr-photos">${rows.map(p=>`<a class="kr-photo" href="${esc(p.url)}" target="_blank" rel="noopener"><img src="${esc(p.url)}" loading="lazy" alt="Dokumentasi kegiatan"></a>`).join('')}</div><div style="height:10px"></div>`;
  }

  function renderLanguageSection(roster,selected,edit){
    return `<div class="kr-card" style="margin-top:12px"><div class="kr-section-title">Peserta & Pemenang Pekan Bahasa</div><div class="kr-meta">Peserta dipilih dari data siswa yang sudah ada. Pemenang berlaku untuk pelaksanaan ini saja, bukan akumulasi Jumat sebelumnya.</div>
      <div class="kr-lang-tools"><input id="kr-lang-search" class="kr-input" placeholder="Cari nama / kelas..." oninput="krFilterLanguage()"><span class="kr-badge">${selected.size} peserta tersimpan</span></div>
      <div class="kr-lang-table-wrap"><table class="kr-lang-table"><thead><tr><th>Ikut</th><th>Nama</th><th>Kelas</th><th>Kategori / Penampilan</th><th>Juara</th></tr></thead><tbody>
      ${roster.map(r=>{const old=selected.get(String(r.id));return `<tr class="kr-lang-row" data-search="${esc((r.name+' '+r.class_name).toLowerCase())}"><td><input class="kr-lang-check" type="checkbox" data-student-id="${esc(r.id)}" ${old?'checked':''} ${edit?'':'disabled'}></td><td><strong>${esc(r.name)}</strong></td><td>${esc(r.class_name)}</td><td><input class="kr-lang-category" type="text" value="${esc(old?.performance_category||'')}" ${edit?'':'disabled'}></td><td><select class="kr-lang-place" ${edit?'':'disabled'}><option value="">-</option>${[1,2,3].map(n=>`<option value="${n}" ${Number(old?.placement)===n?'selected':''}>Juara ${n}</option>`).join('')}</select></td></tr>`}).join('')}
      </tbody></table></div></div>`;
  }
  window.krFilterLanguage=function(){const q=(document.getElementById('kr-lang-search')?.value||'').toLowerCase().trim();document.querySelectorAll('.kr-lang-row').forEach(r=>r.style.display=!q||(r.dataset.search||'').includes(q)?'':'none')};

  window.krSaveEvent=async function(){
    const d=KR.detail,e=d?.event;if(!e)return;const btn=document.getElementById('kr-save');if(btn){btn.disabled=true;btn.innerHTML='<span class="spinner"></span>Menyimpan...'}
    try{
      await act('save_event',{event_id:e.id,status:document.getElementById('kr-status')?.value||e.status,actual_date:document.getElementById('kr-actual-date')?.value||'',attendance_date:document.getElementById('kr-att-date')?.value||'',manual_participant_count:document.getElementById('kr-manual-count')?.value??null,notes:document.getElementById('kr-notes')?.value||''});
      if(e.category==='PEKAN_BAHASA'){
        const list=[];document.querySelectorAll('.kr-lang-row').forEach(row=>{const ck=row.querySelector('.kr-lang-check');if(!ck?.checked)return;list.push({student_id:ck.dataset.studentId,performance_category:row.querySelector('.kr-lang-category')?.value||'',placement:row.querySelector('.kr-lang-place')?.value||null})});
        await act('save_language_participants',{event_id:e.id,participants:list});
      }
      showToast('Laporan kegiatan berhasil disimpan.');
      const fresh=await act('detail',{event_id:e.id});KR.detail=fresh;renderEventModal();await refreshAfterEdit();
    }catch(err){showToast(err.message||'Laporan belum tersimpan.',true)}finally{const b=document.getElementById('kr-save');if(b){b.disabled=false;b.textContent='Simpan'}}
  };

  async function compressPhoto(file){
    const url=URL.createObjectURL(file);try{
      const img=await new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=reject;i.src=url});
      const max=1600,ratio=Math.min(1,max/Math.max(img.naturalWidth,img.naturalHeight)),w=Math.max(1,Math.round(img.naturalWidth*ratio)),h=Math.max(1,Math.round(img.naturalHeight*ratio));
      const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');x.drawImage(img,0,0,w,h);
      let q=.8,blob=await new Promise(r=>c.toBlob(r,'image/jpeg',q));
      while(blob&&blob.size>1800000&&q>.5){q-=.08;blob=await new Promise(r=>c.toBlob(r,'image/jpeg',q))}
      if(!blob)throw new Error('Foto tidak dapat diproses.');
      return await new Promise((resolve,reject)=>{const fr=new FileReader();fr.onload=()=>resolve({base64:fr.result,mime_type:'image/jpeg'});fr.onerror=reject;fr.readAsDataURL(blob)});
    }finally{URL.revokeObjectURL(url)}
  }

  window.krUploadPhotos=async function(ev){
    const files=[...(ev.target.files||[])];if(!files.length||!KR.detail?.event)return;
    ev.target.disabled=true;showToast('Foto sedang diproses otomatis...');
    try{
      for(const f of files){const p=await compressPhoto(f);await act('upload_photo',{event_id:KR.detail.event.id,...p})}
      showToast(files.length+' foto berhasil disimpan.');KR.detail=await act('detail',{event_id:KR.detail.event.id});renderEventModal();await refreshAfterEdit();
    }catch(e){showToast(e.message||'Foto belum berhasil diunggah.',true)}finally{if(ev.target)ev.target.disabled=false}
  };

  async function refreshAfterEdit(){
    const d=await act('bootstrap');KR.events=d.events||[];renderKegiatanDashboard();
  }

  window.krOpenExkul=async function(state){
    ensureModal();KR.exkulState=state;const o=document.getElementById('kr-overlay'),m=document.getElementById('kr-modal');o.classList.add('open');m.innerHTML='<div class="kr-modal-body"><span class="spinner"></span> Memuat siswa...</div>';
    try{const d=await exk('list',{state});KR.exkulRows=d.rows||[];renderExkulModal()}catch(e){m.innerHTML='<div class="kr-modal-body kr-empty">'+esc(e.message)+'</div>'}
  };
  function exkulStateLabel(s){return{internal:'Ekskul Internal',external:'Ekskul di Luar Sekolah',none:'Tidak Mengikuti Ekskul',unknown:'Belum Ada Status'}[s]||s}
  function renderExkulModal(){
    const s=KR.exkulState,edit=canEditExkul(),m=document.getElementById('kr-modal');
    m.innerHTML=`<div class="kr-modal-head"><div><div class="kr-modal-title">${esc(exkulStateLabel(s))}</div><div class="kr-meta">${KR.exkulRows.length} siswa</div></div><button class="kr-close" onclick="closeKegiatanModal()">×</button></div><div class="kr-modal-body"><div class="kr-list-toolbar"><input id="kr-ex-search" class="kr-input" placeholder="Cari siswa / kelas..." oninput="krFilterExkul()"></div><div style="overflow:auto"><table class="kr-mini-table"><thead><tr><th>Nama</th><th>Kelas</th><th>Keterangan</th>${edit&&s==='unknown'?'<th>Tetapkan Status</th>':''}</tr></thead><tbody>${KR.exkulRows.map(r=>`<tr class="kr-ex-row" data-search="${esc((r.name+' '+r.class_name).toLowerCase())}"><td><strong>${esc(r.name)}</strong><div class="kr-meta">${esc(r.nis||'')}</div></td><td>${esc(r.class_name)}</td><td>${esc(r.activity_name||r.notes||'-')}</td>${edit&&s==='unknown'?`<td><div class="kr-status-editor"><input id="kr-act-${esc(r.student_id)}" class="kr-input" placeholder="Nama ekskul luar (jika ada)"><button class="kr-btn secondary" onclick="krSetExkul('${esc(r.student_id)}','external')">Ekskul Luar</button><button class="kr-btn ghost" onclick="krSetExkul('${esc(r.student_id)}','none')">Tidak Ikut</button></div></td>`:''}</tr>`).join('')}</tbody></table></div></div>`;
  }
  window.krFilterExkul=function(){const q=(document.getElementById('kr-ex-search')?.value||'').toLowerCase().trim();document.querySelectorAll('.kr-ex-row').forEach(r=>r.style.display=!q||(r.dataset.search||'').includes(q)?'':'none')};
  window.krSetExkul=async function(studentId,state){
    try{const activity=document.getElementById('kr-act-'+studentId)?.value||'';if(state==='external'&&!activity.trim()){showToast('Isi nama ekskul luar terlebih dahulu.',true);return}const d=await exk('set',{student_id:studentId,state,activity_name:activity});KR.exkul=d.summary||KR.exkul;showToast('Status ekskul siswa disimpan.');const l=await exk('list',{state:KR.exkulState});KR.exkulRows=l.rows||[];renderExkulModal();renderKegiatanDashboard()}catch(e){showToast(e.message||'Status belum tersimpan.',true)}
  };

  injectStyles(); ensureModal();
})();
