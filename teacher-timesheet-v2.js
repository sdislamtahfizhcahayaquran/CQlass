(function(){
'use strict';
const ENDPOINT=(typeof SUPABASE_URL!=='undefined'?SUPABASE_URL:'https://lmglkxzemtvxcgktiord.supabase.co')+'/functions/v1/teacher-timesheet-v2';
const WORK_SCHEDULE_ENDPOINT=(typeof SUPABASE_URL!=='undefined'?SUPABASE_URL:'https://lmglkxzemtvxcgktiord.supabase.co')+'/functions/v1/teacher-work-schedule';
const KEY=typeof SUPABASE_PUBLISHABLE_KEY!=='undefined'?SUPABASE_PUBLISHABLE_KEY:'';
const REVIEW=new Set(['akademik','kegiatan','pimpinan','hrd']);
const SPECIAL_ENDPOINT=(typeof SUPABASE_URL!=='undefined'?SUPABASE_URL:'https://lmglkxzemtvxcgktiord.supabase.co')+'/functions/v1/teacher-timesheet-special-overlay';
let S={month:new Date().toISOString().slice(0,7),teacherId:'',teacher:null,teachers:[],teaching:[],saturdays:[],activities:[],standard:[],master:[],special:[],showAll:false,recapMode:'gaps',rangeFrom:'',rangeTo:'',profile:'mapel'};
let FLEX={date:'',start:'',end:'',rows:[]};
const esc=v=>typeof escapeHtml==='function'?escapeHtml(String(v??'')):String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const role=()=>String(window.currentUser?.role||'').toLowerCase();
const token=()=>typeof getAuthToken==='function'?getAuthToken():(localStorage.getItem('cqlass_session_token')||'');
const toast=(m,e=false)=>typeof showToast==='function'?showToast(m,e):alert(m);
function fd(v){if(!v)return '-';try{return new Intl.DateTimeFormat('id-ID',{weekday:'short',day:'2-digit',month:'short'}).format(new Date(v+'T00:00:00'))}catch{return v}}
function fm(v){try{return new Intl.DateTimeFormat('id-ID',{month:'long',year:'numeric'}).format(new Date(v+'-01T00:00:00'))}catch{return v}}
const ft=v=>v?String(v).slice(0,5):'—';
async function api(action,p={}){const r=await fetch(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json','apikey':KEY,'Authorization':'Bearer '+KEY,'x-session-token':token()},body:JSON.stringify({action,month:S.month,teacher_id:S.teacherId||undefined,...p})});const d=await r.json().catch(()=>({}));if(!r.ok||d.success===false){const m={forbidden:'Akses tidak diizinkan.',invalid_input:'Lengkapi tanggal, jam, dan aktivitas.',activity_invalid:'Aktivitas tidak tersedia.',note_required:'Catatan wajib untuk aktivitas ini.',file_invalid:'Sertifikat harus PDF/JPG/PNG/WEBP.',file_too_large:'Ukuran sertifikat maksimal 8 MB.',session_expired:'Sesi berakhir. Silakan login ulang.'};throw new Error(m[d.error]||d.error||'Timesheet belum dapat diproses.')}return d}
async function workSchedule(){const r=await fetch(WORK_SCHEDULE_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json','apikey':KEY,'Authorization':'Bearer '+KEY,'x-session-token':token()},body:JSON.stringify({month:S.month,teacher_id:S.teacherId||undefined})});const d=await r.json().catch(()=>({}));if(!r.ok||d.success===false)throw new Error(d.error||'Jadwal kerja belum dapat dimuat.');return d}
function style(){if(document.getElementById('tsv2-css'))return;const x=document.createElement('style');x.id='tsv2-css';x.textContent=`.tsv2{max-width:1450px;margin:auto}.tsv2-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap;margin-bottom:14px}.tsv2-title{font-size:24px;font-weight:900;color:#173d3b}.tsv2-sub,.tsv2-help{font-size:10px;color:var(--muted);line-height:1.5}.tsv2-tools{display:flex;gap:7px;flex-wrap:wrap}.tsv2-in,.tsv2-sel{height:38px;border:1px solid var(--border);background:#fff;border-radius:10px;padding:0 10px;font:inherit;font-size:11px}.tsv2-btn{border:0;border-radius:9px;background:#08746f;color:#fff;padding:9px 12px;font-size:10px;font-weight:900;cursor:pointer}.tsv2-btn.alt{background:#edf6f5;color:#12645f}.tsv2-btn.danger{background:#fff0ed;color:#a84738}.tsv2-card{background:#fff;border:1px solid var(--border);border-radius:14px;padding:14px;margin-bottom:11px}.tsv2-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:9px;margin-bottom:11px}.tsv2-kpi{background:#fff;border:1px solid var(--border);border-radius:13px;padding:12px}.tsv2-kpi b{font-size:22px;color:#08746f;display:block}.tsv2-kpi span{font-size:9px;color:var(--muted);font-weight:800;text-transform:uppercase}.tsv2-form{display:grid;grid-template-columns:1fr 105px 105px 1.4fr 1.4fr auto;gap:8px;align-items:end;margin-top:10px}.tsv2-field label{display:block;font-size:9px;font-weight:800;color:var(--muted);margin-bottom:4px}.tsv2-field .tsv2-in,.tsv2-field .tsv2-sel{width:100%;box-sizing:border-box}.tsv2-tablewrap{overflow:auto;border:1px solid var(--border);border-radius:12px}.tsv2-table{width:100%;border-collapse:collapse;min-width:900px}.tsv2-table th,.tsv2-table td{padding:9px;border-bottom:1px solid #edf2f1;text-align:left;font-size:10px;vertical-align:middle}.tsv2-table th{background:#f5f9f8;font-size:9px;text-transform:uppercase;color:var(--muted)}.tsv2-badge{display:inline-flex;border-radius:999px;padding:4px 7px;font-size:9px;font-weight:900;background:#edf6f5;color:#12645f}.tsv2-badge.auto{background:#eaf2fb;color:#315f88}.tsv2-badge.badal{background:#f2ebfb;color:#704a9b}.tsv2-badge.warn{background:#fff3d9;color:#93610d}.tsv2-badge.off{background:#fdebea;color:#9b4035}.tsv2-sat td{background:#fbfdfd}.tsv2-replaced td{opacity:.65}.tsv2-cert{display:flex;gap:6px;align-items:center;flex-wrap:wrap}.tsv2-file{font-size:9px;max-width:170px}.tsv2-empty{padding:28px;text-align:center;color:var(--muted)}@media(max-width:900px){.tsv2-kpis{grid-template-columns:1fr 1fr}.tsv2-form{grid-template-columns:1fr 1fr}.tsv2-tools>*{flex:1 1 150px}}.tsv2-guide{background:#f7fbfb;border:1px solid #dcebea;border-radius:14px;padding:12px 14px;margin-bottom:11px;font-size:10px;line-height:1.55;color:#4c6663}.tsv2-cardnav{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin-bottom:11px}.tsv2-cardpick{border:1px solid var(--border);background:#fff;border-radius:14px;padding:13px;text-align:left;cursor:pointer}.tsv2-cardpick b{display:block;font-size:12px;color:#173d3b;margin-bottom:3px}.tsv2-cardpick span{font-size:9px;color:var(--muted);line-height:1.4}.tsv2-cardpick.active{border-color:#0b7e78;box-shadow:0 0 0 2px rgba(11,126,120,.08)}.tsv2-section[hidden]{display:none!important}.tsv2-recap-tabs{display:flex;gap:6px;flex-wrap:wrap;margin:8px 0 10px}.tsv2-recap-tabs .tsv2-btn.active{background:#08746f;color:#fff}.tsv2-gaprecap td{background:#fffaf0}.tsv2-flex-head{display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:10px}.tsv2-flex-range{font-size:11px;font-weight:900;color:#08746f}.tsv2-flex-row{display:grid;grid-template-columns:105px 105px 1.3fr 1.4fr auto;gap:8px;align-items:end;padding:9px 0;border-top:1px solid #edf2f1}.tsv2-flex-row:first-child{border-top:0}.tsv2-flex-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:10px}
@media(max-width:760px){.tsv2-cardnav{grid-template-columns:1fr}.tsv2-flex-row{grid-template-columns:1fr 1fr}.tsv2-flex-row .tsv2-field:nth-child(3),.tsv2-flex-row .tsv2-field:nth-child(4){grid-column:1/-1}}
@media(max-width:560px){.tsv2-form{grid-template-columns:1fr}}`;document.head.appendChild(x)}
function jp(){return S.teaching.filter(x=>x.source!=='digantikan').reduce((a,x)=>a+(Number(x.jp)||0),0)}
function badal(){return S.teaching.filter(x=>x.source==='badal').length}
function pendingCert(){return S.saturdays.filter(x=>x.requires_certificate&&!x.certificate).length}
async function specialOverlay(){try{const r=await fetch(SPECIAL_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json','apikey':KEY,'Authorization':'Bearer '+KEY,'x-session-token':token()},body:JSON.stringify({month:S.month,teacher_id:S.teacherId||undefined})});const d=await r.json().catch(()=>({}));return r.ok&&d.success!==false?(d.items||[]):[]}catch{return []}}
function gapRows(){try{return (window.cqTsGapItems?.()||[]).map(x=>({date:x.work_date,start:x.start_time,end:x.end_time,type:'Jam Kosong',title:'Belum terisi',detail:'',source:'gap',note:'',raw:x}))}catch{return[]}}
function inRange(date){
  const d=String(date||'').slice(0,10);
  return !!d&&(!S.rangeFrom||d>=S.rangeFrom)&&(!S.rangeTo||d<=S.rangeTo);
}
function rows(){
  if(S.recapMode==='gaps')return gapRows().filter(x=>inRange(x.date));
  const a=[];
  S.standard.filter(x=>x.display!==false||['snack_time','friday_activity','ishoma'].includes(String(x.activity_code||''))).forEach(x=>a.push({date:x.work_date,start:x.start_time,end:x.end_time,type:'Jadwal Kerja',title:x.activity,detail:'',source:'jadwal-kerja',note:x.note||'',raw:x}));
  S.teaching.forEach(x=>a.push({date:x.work_date,start:x.start_time,end:x.end_time,type:x.source==='badal'?'Badal':x.source==='digantikan'?'Digantikan':'Mengajar',title:x.subject_name,detail:x.class_name||'',source:x.source,note:x.note||'',raw:x}));
  S.special.forEach(x=>a.push({date:x.work_date,start:x.start_time,end:x.end_time,type:'Kegiatan Khusus',title:x.activity_name,detail:x.class_scope||'',source:'special_activity',note:x.notes||'',raw:x}));
  S.saturdays.filter(x=>x.configured).forEach(x=>a.push({date:x.event_date,start:x.start_time,end:x.end_time,type:'Sabtu',title:x.activity_name,detail:'',source:'sabtu',note:x.note||'',raw:x}));
  S.activities.filter(x=>x.source!=='saturday_override').forEach(x=>a.push({date:x.work_date,start:x.start_time,end:x.end_time,type:'Slot Terisi',title:x.activity,detail:'',source:'manual',note:x.note||'',raw:x}));
  return a.filter(x=>inRange(x.date)).sort((x,y)=>String(x.date+' '+(x.start||'99:99')).localeCompare(String(y.date+' '+(y.start||'99:99'))))
}
function badge(r){if(r.source==='gap')return '<span class="tsv2-badge warn">Belum Terisi</span>';if(r.source==='special_activity')return '<span class="tsv2-badge auto">Kegiatan Khusus</span>';if(r.source==='badal')return '<span class="tsv2-badge badal">Badal</span>';if(r.source==='digantikan')return '<span class="tsv2-badge off">Digantikan</span>';if(r.source==='jadwal'||r.source==='jadwal-kerja')return '<span class="tsv2-badge auto">Otomatis</span>';if(r.source==='sabtu-pending')return '<span class="tsv2-badge warn">Belum ditentukan</span>';if(r.source==='sabtu')return '<span class="tsv2-badge auto">Sabtu</span>';return '<span class="tsv2-badge">Diisi guru</span>'}
function cert(r){if(r.type!=='Sabtu'||!r.raw.requires_certificate)return '—';if(r.raw.certificate)return `<div class="tsv2-cert"><span class="tsv2-badge">Sertifikat ✓</span>${r.raw.certificate.url?`<a class="tsv2-btn alt" target="_blank" href="${esc(r.raw.certificate.url)}">Lihat</a>`:''}<span class="tsv2-help">${esc(r.raw.certificate.original_name)}</span></div>`;return `<div class="tsv2-cert"><span class="tsv2-badge warn">Wajib upload</span><input id="tsv2-cert-${esc(r.raw.id)}" class="tsv2-file" type="file" accept=".pdf,image/jpeg,image/png,image/webp"><button class="tsv2-btn" onclick="tsv2Upload('${esc(r.raw.id)}')">Upload</button></div>`}
function row(r){
  const del=r.source==='manual'&&r.raw.source==='manual',canEdit=S.recapMode==='full'&&(r.source==='manual'||r.type==='Sabtu');
  const cls=r.source==='gap'?'tsv2-gaprecap':r.type==='Sabtu'?'tsv2-sat':r.source==='digantikan'?'tsv2-replaced':'';
  if(canEdit){
    const kind=r.type==='Sabtu'?'saturday':'manual',id=String(r.raw.id||''),key=kind+'-'+id;
    return `<tr class="${cls}" data-edit-key="${esc(key)}"><td><input class="tsv2-in" data-er="date" type="date" value="${esc(r.date)}"></td><td><div style="display:flex;gap:5px"><input class="tsv2-in" data-er="start" type="time" value="${esc(ft(r.start))}"><input class="tsv2-in" data-er="end" type="time" value="${esc(ft(r.end))}"></div></td><td>${badge(r)}</td><td><input class="tsv2-in" data-er="activity" value="${esc(r.title)}"></td><td><input class="tsv2-in" data-er="note" value="${esc(r.note||'')}" placeholder="Catatan"></td><td>${cert(r)}</td><td><div style="display:flex;gap:5px;flex-wrap:wrap"><button class="tsv2-btn" onclick="tsv2SaveRecapRow('${kind}','${esc(id)}')">Simpan</button>${del?`<button class="tsv2-btn danger" onclick="tsv2Delete('${esc(id)}')">Hapus</button>`:''}</div></td></tr>`;
  }
  if(r.source==='gap')return `<tr class="${cls}"><td><b>${esc(fd(r.date))}</b></td><td>${esc(ft(r.start))}–${esc(ft(r.end))}</td><td>${badge(r)}</td><td><b>Belum terisi</b></td><td>Jam kerja belum memiliki aktivitas tercatat</td><td>—</td><td><button class="tsv2-btn alt" onclick="tsv2UseGap('${esc(r.date)}','${esc(ft(r.start))}','${esc(ft(r.end))}')">Isi</button></td></tr>`;
  return `<tr class="${cls}"><td><b>${esc(fd(r.date))}</b></td><td>${esc(ft(r.start))}${r.end?'–'+esc(ft(r.end)):''}</td><td>${badge(r)}</td><td><b>${esc(r.title)}</b>${r.detail?`<br><span class="tsv2-help">${esc(r.detail)}</span>`:''}</td><td>${esc(r.note||'—')}</td><td>${cert(r)}</td><td>—</td></tr>`
}
function monthEnd(month){const y=Number(month.slice(0,4)),m=Number(month.slice(5,7));return new Date(Date.UTC(y,m,0)).toISOString().slice(0,10)}
function ensureRange(){
  const start=S.month+'-01',end=monthEnd(S.month);
  if(!S.rangeFrom||S.rangeFrom.slice(0,7)!==S.month)S.rangeFrom=start;
  if(!S.rangeTo||S.rangeTo.slice(0,7)!==S.month)S.rangeTo=end;
}
function body(){
  const b=document.getElementById('tsv2-body');if(!b)return;
  if(!S.teacher){b.innerHTML='<div class="tsv2-card tsv2-empty">Data guru belum tersedia.</div>';return}
  ensureRange();
  const all=rows();
  const autoCount=S.standard.filter(x=>x.display!==false&&inRange(x.work_date)).length;
  const manualCount=S.activities.filter(x=>x.source!=='saturday_override'&&inRange(x.work_date)).length;
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const modeHelp=S.recapMode==='gaps'
    ? 'Menampilkan jam kerja yang belum memiliki aktivitas tercatat.'
    : 'Menampilkan seluruh aktivitas Senin–Jumat 07.00–16.00 dan Sabtu 07.30–12.00 pada rentang tanggal yang dipilih.';
  b.innerHTML=`
  <div class="tsv2-card">
    <div style="display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap">
      <div><span class="tsv2-help">Nama Guru</span><br><b style="font-size:15px">${esc(S.teacher.full_name)}</b></div>
      <span class="tsv2-badge auto">${autoCount} jadwal otomatis pada periode</span>
    </div>
  </div>
  <div class="tsv2-kpis">
    <div class="tsv2-kpi"><b>${jp()}</b><span>JP terlaksana</span></div>
    <div class="tsv2-kpi"><b>${autoCount}</b><span>Jadwal otomatis</span></div>
    <div class="tsv2-kpi"><b>${manualCount}</b><span>Aktivitas tambahan</span></div>
    <div class="tsv2-kpi"><b>${pendingCert()}</b><span>Sertifikat belum upload</span></div>
  </div>
  <div class="tsv2-card tsv2-entry-card">
    <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap">
      <div><b style="font-size:15px">Tambah Aktivitas</b><div class="tsv2-help" style="margin-top:4px">Jadwal rutin sudah masuk otomatis. Isi hanya kegiatan tambahan yang belum tercatat.</div></div>
      <span class="tsv2-badge">Cepat & sederhana</span>
    </div>
    <div class="tsv2-form">
      <div class="tsv2-field"><label>Tanggal</label><input id="tsv2-date" class="tsv2-in" type="date" value="${esc(today)}"></div>
      <div class="tsv2-field"><label>Mulai</label><input id="tsv2-start" class="tsv2-in" type="time"></div>
      <div class="tsv2-field"><label>Selesai</label><input id="tsv2-end" class="tsv2-in" type="time"></div>
      <div class="tsv2-field"><label>Kegiatan</label><select id="tsv2-act" class="tsv2-sel"><option value="">Pilih kegiatan</option>${S.master.map(x=>`<option value="${esc(x.id)}">${esc(x.name)}</option>`).join('')}</select></div>
      <div class="tsv2-field"><label>Catatan (opsional)</label><input id="tsv2-note" class="tsv2-in" placeholder="Keterangan singkat bila perlu"></div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        <button class="tsv2-btn" onclick="tsv2Save()">Simpan</button>
        <button class="tsv2-btn alt" onclick="tsv2SavePattern()">Ulang Mingguan</button>
      </div>
    </div>
    <div id="tsv2-recurring-host-2" style="margin-top:10px"></div>
  </div>
  <div class="tsv2-card tsv2-timeline-card">
    <div class="tsv2-timeline-head">
      <div><b style="font-size:15px">Rekap Timesheet</b><div class="tsv2-help" style="margin:4px 0 10px">${esc(modeHelp)}</div></div>
    </div>
    <div class="tsv2-recap-tabs">
      <button class="tsv2-btn alt ${S.recapMode==='gaps'?'active':''}" onclick="tsv2RecapMode('gaps')">1. Rekapan Jam Kosong</button>
      <button class="tsv2-btn alt ${S.recapMode==='full'?'active':''}" onclick="tsv2RecapMode('full')">2. Rekapan Keseluruhan Aktivitas</button>
    </div>
    <div class="tsv2-guide" style="display:flex;gap:10px;align-items:end;flex-wrap:wrap">
      <div class="tsv2-field"><label>Dari tanggal</label><input id="tsv2-range-from" class="tsv2-in" type="date" value="${esc(S.rangeFrom)}"></div>
      <div class="tsv2-field"><label>Sampai tanggal</label><input id="tsv2-range-to" class="tsv2-in" type="date" value="${esc(S.rangeTo)}"></div>
      <button class="tsv2-btn" onclick="tsv2ApplyRange()">Tampilkan</button>
      <button class="tsv2-btn alt" onclick="tsv2ResetRange()">1 Bulan Penuh</button>
      <div class="tsv2-help" style="margin-left:auto"><b>Periode:</b> ${esc(S.rangeFrom)} s.d. ${esc(S.rangeTo)}</div>
    </div>
    <div class="tsv2-tablewrap"><table class="tsv2-table"><thead><tr><th>Tanggal</th><th>Jam</th><th>Jenis</th><th>Kegiatan</th><th>Keterangan</th><th>Bukti</th><th>Aksi</th></tr></thead><tbody>${all.length?all.map(row).join(''):`<tr><td colspan="7" class="tsv2-empty">${S.recapMode==='gaps'?'Tidak ada jam kosong pada periode ini.':'Belum ada aktivitas pada periode ini.'}</td></tr>`}</tbody></table></div>
  </div>`;
}
async function load(){const b=document.getElementById('tsv2-body');if(b)b.innerHTML='<div class="tsv2-card tsv2-empty">Memuat Timesheet...</div>';try{const d=await api('bootstrap');S.teacher=d.teacher||null;S.teachers=d.teachers||[];S.teaching=d.teaching||[];S.saturdays=d.saturdays||[];S.activities=d.activities||[];S.master=d.activity_master||[];if(!S.teacherId&&S.teacher)S.teacherId=S.teacher.id;const [w,sp]=await Promise.all([workSchedule(),specialOverlay()]);S.standard=w.items||[];S.profile=w.profile||'mapel';S.special=sp||[];shell(false);body();setTimeout(()=>window.cqTsGapRefresh?.(),0)}catch(e){if(b)b.innerHTML=`<div class="tsv2-card tsv2-empty">${esc(e.message)}</div>`}}
function shell(fetch=true){style();const c=document.getElementById('content');if(!c)return;const select=REVIEW.has(role())&&S.teachers.length?`<select class="tsv2-sel" onchange="tsv2Teacher(this.value)">${S.teachers.map(t=>`<option value="${esc(t.id)}" ${String(t.id)===String(S.teacherId)?'selected':''}>${esc(t.full_name)}</option>`).join('')}</select>`:'';c.innerHTML=`<div class="tsv2"><div class="tsv2-head"><div><div class="tsv2-title">Timesheet</div><div class="tsv2-sub">${S.profile==='tahfizh'?'Guru Tahfizh/Partner — jadwal KBM Tahfizh, rutinitas, dan Eduhub masuk otomatis.':'Guru Mapel/Walas — jadwal mengajar, rutinitas, UKS, dan tugas otomatis sudah diperhitungkan.'} Guru cukup menambahkan aktivitas yang belum tercatat; jadwal rutin masuk otomatis.</div></div><div class="tsv2-tools">${select}<input class="tsv2-in" type="month" value="${esc(S.month)}" onchange="tsv2Month(this.value)"><button class="tsv2-btn alt" onclick="tsv2Reload()">Muat ulang</button></div></div><div id="tsv2-body"></div></div>`;if(fetch)load()}
window.renderTeacherTimesheet=()=>shell(true);
window.cqTsStandardItems=()=>Array.isArray(S.standard)?S.standard.slice():[];
window.cqTsProfile=()=>S.profile||'mapel';
window.tsv2Reload=()=>shell(true);
window.tsv2Month=v=>{if(/^\d{4}-\d{2}$/.test(v)){S.month=v;S.rangeFrom=v+'-01';S.rangeTo=monthEnd(v);shell(true)}};
window.tsv2Teacher=v=>{S.teacherId=v;shell(true)};
window.tsv2ToggleView=()=>{S.showAll=!S.showAll;body()};
window.tsv2ApplyRange=()=>{
  const from=document.getElementById('tsv2-range-from')?.value||'',to=document.getElementById('tsv2-range-to')?.value||'';
  if(!from||!to||to<from){toast('Rentang tanggal tidak valid.',true);return}
  if(from.slice(0,7)!==S.month||to.slice(0,7)!==S.month){toast('Pilih tanggal dalam bulan '+fm(S.month)+'. Untuk bulan lain, ubah pilihan bulan di atas.',true);return}
  S.rangeFrom=from;S.rangeTo=to;body();
};
window.tsv2ResetRange=()=>{S.rangeFrom=S.month+'-01';S.rangeTo=monthEnd(S.month);body()};
window.tsv2UseGap=(date,start,end)=>{
  const d=document.getElementById('tsv2-date'),s=document.getElementById('tsv2-start'),e=document.getElementById('tsv2-end');
  if(d)d.value=date;if(s)s.value=start;if(e)e.value=end;
  document.querySelector('.tsv2-entry-card')?.scrollIntoView({behavior:'smooth',block:'center'});
};
function openCardRaw(n){[1,2,3].forEach(i=>{const el=document.getElementById('tsv2-card'+i);if(el)el.hidden=i!==Number(n)});document.querySelectorAll('.tsv2-cardpick').forEach(b=>b.classList.toggle('active',Number(b.dataset.tsCard)===Number(n)))}
window.tsv2OpenCard=n=>{n=Number(n);if(n===3){body();setTimeout(()=>openCardRaw(3),0);return}openCardRaw(n)};
window.tsv2RecapMode=m=>{S.recapMode=m==='full'?'full':'gaps';body()};
window.tsv2SaveFixed=async(silent=false)=>{const form=document.querySelector('#tsv2-card1 .tsv2-form'),date=document.getElementById('tsv2-fixed-date')?.value||'',start=document.getElementById('tsv2-fixed-start')?.value||'',end=document.getElementById('tsv2-fixed-end')?.value||'',mid=document.getElementById('tsv2-fixed-act')?.value||'',note=document.getElementById('tsv2-fixed-note')?.value||'';if(form?.dataset.fixedSelected!=='1'){toast('Pilih dulu slot terjadwal.',true);return}if(!date||!start||!end||!mid||end<=start){toast('Pilih slot dan jenis aktivitas.',true);return}try{await api('save_activity',{work_date:date,start_time:start,end_time:end,activity_master_id:mid,note});if(!silent)toast('Slot terjadwal tersimpan.');await load();setTimeout(()=>window.tsv2OpenCard(1),0)}catch(e){toast(e.message,true)}};

function flexCollect(){
  return [...document.querySelectorAll('#tsv2-flex-rows .tsv2-flex-row')].map(r=>({
    start:r.querySelector('[data-flex="start"]')?.value||'',
    end:r.querySelector('[data-flex="end"]')?.value||'',
    mid:r.querySelector('[data-flex="mid"]')?.value||'',
    note:r.querySelector('[data-flex="note"]')?.value||''
  }));
}
function flexRender(){
  const host=document.getElementById('tsv2-flex-rows'),range=document.getElementById('tsv2-flex-range');if(!host)return;
  if(range)range.textContent=(FLEX.date?fd(FLEX.date)+' · ':'')+FLEX.start+'–'+FLEX.end;
  host.innerHTML=FLEX.rows.map((r,i)=>`<div class="tsv2-flex-row" data-flex-row="${i}"><div class="tsv2-field"><label>Mulai</label><input class="tsv2-in" data-flex="start" type="time" min="${esc(FLEX.start)}" max="${esc(FLEX.end)}" value="${esc(r.start||'')}"></div><div class="tsv2-field"><label>Selesai</label><input class="tsv2-in" data-flex="end" type="time" min="${esc(FLEX.start)}" max="${esc(FLEX.end)}" value="${esc(r.end||'')}"></div><div class="tsv2-field"><label>Kegiatan</label><select class="tsv2-sel" data-flex="mid"><option value="">Pilih kegiatan</option>${S.master.map(x=>`<option value="${esc(x.id)}" ${String(x.id)===String(r.mid||'')?'selected':''}>${esc(x.name)}</option>`).join('')}</select></div><div class="tsv2-field"><label>Catatan (opsional)</label><input class="tsv2-in" data-flex="note" value="${esc(r.note||'')}" placeholder="Contoh: administrasi kelas"></div><button class="tsv2-btn danger" type="button" onclick="tsv2FlexRemove(${i})" ${FLEX.rows.length===1?'disabled':''}>Hapus</button></div>`).join('');
}
window.tsv2FlexStart=(date,start,end)=>{
  FLEX={date,start,end,rows:[{start,end:'',mid:'',note:''}]};
  const card=document.querySelector('#tsv2-card1 .tsv2-flex-slot-editor'),fixed=document.querySelector('#tsv2-card1 .tsv2-fixed-slot-editor');
  if(fixed)fixed.hidden=true;if(card)card.hidden=false;flexRender();card?.scrollIntoView({behavior:'smooth',block:'center'});
};
window.tsv2FlexAdd=()=>{
  const rows=flexCollect();const last=rows[rows.length-1]||{};FLEX.rows=rows;FLEX.rows.push({start:last.end||'',end:'',mid:'',note:''});flexRender();
};
window.tsv2FlexRemove=i=>{const rows=flexCollect();if(rows.length<=1)return;rows.splice(Number(i),1);FLEX.rows=rows;flexRender()};
window.tsv2FlexSaveAll=async()=>{
  const rows=flexCollect();
  if(!FLEX.date||!FLEX.start||!FLEX.end||!rows.length){toast('Pilih dulu rentang Jumat/Sabtu.',true);return}
  for(const r of rows){
    if(!r.start||!r.end||!r.mid||r.end<=r.start){toast('Lengkapi jam mulai, selesai, dan kegiatan pada semua baris.',true);return}
    if(r.start<FLEX.start||r.end>FLEX.end){toast('Semua kegiatan harus berada di dalam rentang '+FLEX.start+'–'+FLEX.end+'.',true);return}
    if(typeof window.cqTsRangeIsGap==='function'&&!window.cqTsRangeIsGap(FLEX.date,r.start,r.end)){toast('Ada jam yang keluar dari slot kosong atau bertabrakan dengan jadwal otomatis.',true);return}
  }
  const sorted=rows.map((r,i)=>({...r,i})).sort((a,b)=>a.start.localeCompare(b.start)||a.end.localeCompare(b.end));
  for(let i=1;i<sorted.length;i++){if(sorted[i].start<sorted[i-1].end){toast('Jam kegiatan tidak boleh tumpang tindih.',true);return}}
  const created=[];
  try{
    for(const r of rows){
      const out=await api('save_activity',{work_date:FLEX.date,start_time:r.start,end_time:r.end,activity_master_id:r.mid,note:r.note});
      if(out?.row?.id)created.push(out.row.id);
    }
    toast(rows.length+' kegiatan tersimpan.');
    FLEX={date:'',start:'',end:'',rows:[]};
    await load();setTimeout(()=>window.tsv2OpenCard(1),0);
  }catch(e){
    for(const id of created.reverse()){try{await api('delete_activity',{id})}catch(_){}}
    toast('Penyimpanan dibatalkan: '+(e.message||String(e)),true);
    await load();setTimeout(()=>window.tsv2OpenCard(1),0);
  }
};
window.tsv2Save=async(silent=false)=>{const date=document.getElementById('tsv2-date')?.value||'',start=document.getElementById('tsv2-start')?.value||'',end=document.getElementById('tsv2-end')?.value||'',mid=document.getElementById('tsv2-act')?.value||'',note=document.getElementById('tsv2-note')?.value||'';if(!date||!start||!end||!mid||end<=start){toast('Lengkapi tanggal, jam, dan jenis aktivitas.',true);return}if(typeof window.cqTsRangeIsGap==='function'&&!window.cqTsRangeIsGap(date,start,end)){toast('Jam tersebut bukan jam kosong atau bertabrakan dengan jadwal otomatis.',true);return}try{await api('save_activity',{work_date:date,start_time:start,end_time:end,activity_master_id:mid,note});if(!silent)toast('Aktivitas tersimpan.');await load();setTimeout(()=>window.tsv2OpenCard(2),0)}catch(e){toast(e.message,true)}};
window.tsv2SavePattern=async()=>{const date=document.getElementById('tsv2-date')?.value||'',start=document.getElementById('tsv2-start')?.value||'',end=document.getElementById('tsv2-end')?.value||'',mid=document.getElementById('tsv2-act')?.value||'',note=document.getElementById('tsv2-note')?.value||'';if(!date||!start||!end||!mid||end<=start){toast('Lengkapi tanggal, jam, dan jenis aktivitas.',true);return}if(typeof window.cqTsRangeIsGap==='function'&&!window.cqTsRangeIsGap(date,start,end)){toast('Jam tersebut bukan jam kosong atau bertabrakan dengan jadwal otomatis.',true);return}const item=S.master.find(x=>String(x.id)===String(mid));if(!item){toast('Aktivitas tidak tersedia.',true);return}try{if(typeof window.cqRecurringSaveFromGap!=='function')throw Error('Pola mingguan belum siap. Muat ulang Timesheet.');await window.cqRecurringSaveFromGap({date,start,end,activity_name:item.name,note});toast('Pola mingguan tersimpan.');await load();setTimeout(()=>window.tsv2OpenCard(2),0)}catch(e){toast(e.message||String(e),true)}};
window.tsv2SaveRecapRow=async(kind,id,silent=false)=>{const tr=document.querySelector('[data-edit-key="'+kind+'-'+id+'"]');if(!tr)return;const val=n=>tr.querySelector('[data-er="'+n+'"]')?.value||'',work_date=val('date'),start_time=val('start'),end_time=val('end'),activity=val('activity'),note=val('note');if(!work_date||!start_time||!end_time||!activity||end_time<=start_time){toast('Lengkapi tanggal, jam, dan kegiatan.',true);return}try{if(kind==='saturday')await api('save_saturday_override',{saturday_schedule_id:id,work_date,start_time,end_time,activity,note});else await api('update_activity',{id,work_date,start_time,end_time,activity,note});if(!silent)toast('Perubahan Timesheet tersimpan.');await load();setTimeout(()=>window.tsv2OpenCard(3),0)}catch(e){toast(e.message||String(e),true)}};
window.tsv2Delete=async id=>{if(!confirm('Hapus aktivitas ini?'))return;try{await api('delete_activity',{id});toast('Aktivitas dihapus.');await load()}catch(e){toast(e.message,true)}};
window.tsv2Upload=async id=>{const f=document.getElementById('tsv2-cert-'+id)?.files?.[0];if(!f){toast('Pilih file sertifikat.',true);return}if(f.size>8*1024*1024){toast('Ukuran sertifikat maksimal 8 MB.',true);return}try{const b64=await new Promise((ok,no)=>{const r=new FileReader();r.onload=()=>ok(String(r.result||'').split(',')[1]||'');r.onerror=no;r.readAsDataURL(f)});await api('upload_certificate',{saturday_schedule_id:id,file_name:f.name,mime_type:f.type,base64:b64});toast('Sertifikat tersimpan.');await load()}catch(e){toast(e.message,true)}};
function patch(){try{if(typeof MODULE_GROUPS==='undefined')return false;const g=MODULE_GROUPS.find(x=>x.id==='akademik');if(!g)return false;['guru','walas','partner','tahfizh','akademik','pimpinan','hrd'].forEach(r=>{if(!g.roles.includes(r))g.roles.push(r)});let it=g.items.find(x=>x.id==='timesheet');if(!it){it={id:'timesheet',label:'Timesheet',roles:['guru','walas','partner','tahfizh','akademik','pimpinan','hrd'],built:true,render:window.renderTeacherTimesheet};const i=g.items.findIndex(x=>x.id==='rapor');i>=0?g.items.splice(i,0,it):g.items.push(it)}else Object.assign(it,{label:'Timesheet',roles:['guru','walas','akademik','pimpinan','hrd'],built:true,render:window.renderTeacherTimesheet});return true}catch{return false}}
let n=0;(function boot(){if(!patch()&&++n<60)setTimeout(boot,150)})();
})();
