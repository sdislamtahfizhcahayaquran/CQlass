/* CQlass — Kabid Kegiatan: Live Absensi Ekskul
   Memantau siapa yang sudah/belum mengisi absensi, materi, dan foto dokumentasi (foto opsional).
*/
(function(){
  'use strict';
  if(window.__cqKegiatanEkskulAttendanceLiveV1)return;
  window.__cqKegiatanEkskulAttendanceLiveV1=true;

  const BASE=(typeof SUPABASE_URL!=='undefined'&&SUPABASE_URL)||'https://lmglkxzemtvxcgktiord.supabase.co';
  const KEY=(typeof SUPABASE_PUBLISHABLE_KEY!=='undefined'&&SUPABASE_PUBLISHABLE_KEY)||'sb_publishable_3HyNVUYXakILMKo2SK-DJw_ka7-Yx93';
  const URL=BASE+'/functions/v1/activity-extracurricular';
  const S={rows:[],date:'',loaded:false,loading:false,filter:'scheduled',status:'all',q:'',timer:null,last:null};
  const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const low=v=>String(v==null?'':v).trim().toLowerCase();
  const role=()=>{try{return low(currentUser?.role)}catch(_){return''}};
  const allowed=()=>['kegiatan','kabid_kegiatan'].includes(role());
  const token=()=>typeof getAuthToken==='function'?getAuthToken():'';
  const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const fmt=v=>{if(!v)return'—';try{return new Intl.DateTimeFormat('id-ID',{timeZone:'Asia/Jakarta',hour:'2-digit',minute:'2-digit'}).format(new Date(v))}catch(_){return'—'}};

  async function api(date){
    const t=token();if(!t)throw new Error('Sesi login tidak ditemukan.');
    const r=await fetch(URL,{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json','apikey':KEY,'Authorization':'Bearer '+KEY,'x-session-token':t},body:JSON.stringify({action:'attendance_live',date})});
    const d=await r.json().catch(()=>({success:false,error:'Respons server tidak valid.'}));
    if(!r.ok||d.success===false)throw new Error(d.error||('HTTP '+r.status));return d;
  }

  function css(){
    if(document.getElementById('kxatt-style-v1'))return;
    const s=document.createElement('style');s.id='kxatt-style-v1';s.textContent=`
      #kegiatan-exkul-attendance-live{background:#fff;border:1px solid var(--border,#dce7e7);border-radius:16px;padding:15px;margin:0 0 13px;box-shadow:0 5px 18px rgba(8,82,79,.045)}
      .kxatt-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap}.kxatt-title{font-size:15px;font-weight:900;color:#173f3e}.kxatt-sub{font-size:9px;color:#718181;margin-top:4px}.kxatt-actions{display:flex;gap:7px;align-items:end;flex-wrap:wrap}.kxatt-field label{display:block;font-size:8px;font-weight:850;color:#718181;margin-bottom:4px}.kxatt-field input,.kxatt-field select{font-size:10px;padding:7px 9px}
      .kxatt-btn{border:1px solid #dce7e7;background:#fff;border-radius:9px;padding:7px 10px;font-size:9px;font-weight:850;cursor:pointer;color:#173f3e}.kxatt-btn:hover{background:#f5faf9}
      .kxatt-kpis{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:7px;margin:11px 0}.kxatt-kpi{border:1px solid #dce7e7;border-radius:11px;padding:9px 10px;background:#fbfdfd}.kxatt-kpi strong{display:block;font-size:18px;color:#075b59}.kxatt-kpi span{font-size:7.8px;font-weight:850;color:#718181}.kxatt-kpi.good{background:#f1faf6;border-color:#bfdfd0}.kxatt-kpi.bad{background:#fff4f1;border-color:#efc6bc}.kxatt-kpi.warn{background:#fff9ee;border-color:#efd9ab}.kxatt-kpi.info{background:#f4f8fb;border-color:#d8e5ec}
      .kxatt-filter{display:grid;grid-template-columns:minmax(220px,1fr) 180px 180px;gap:7px}.kxatt-filter input,.kxatt-filter select{font-size:10px}
      .kxatt-wrap{margin-top:10px;border:1px solid #dce7e7;border-radius:12px;overflow:auto;max-height:48vh}.kxatt-table{width:100%;border-collapse:collapse;min-width:980px}.kxatt-table th,.kxatt-table td{padding:9px;border-bottom:1px solid #edf1f2;text-align:left;vertical-align:middle;font-size:9.5px}.kxatt-table th{position:sticky;top:0;background:#f6f9f9;z-index:2;font-size:8px;color:#718181;text-transform:uppercase}.kxatt-name{font-weight:900;font-size:10.5px}.kxatt-mini{font-size:8px;color:#718181;line-height:1.45;margin-top:2px}.kxatt-badge{display:inline-flex;padding:5px 8px;border-radius:999px;font-size:8px;font-weight:900}.kxatt-badge.sudah{background:#e8f7ef;color:#357352}.kxatt-badge.sebagian{background:#fff2de;color:#936500}.kxatt-badge.belum{background:#fff0ec;color:#ad4c39}.kxatt-badge.tidak_jadwal{background:#eef3f5;color:#64757c}.kxatt-photo{display:inline-flex;align-items:center;gap:5px;text-decoration:none;font-size:8px;font-weight:850;color:#0a6e6e}.kxatt-photo img{width:54px;height:40px;object-fit:cover;border-radius:7px;border:1px solid #dce7e7}.kxatt-empty-photo{font-size:8px;color:#8a9698}.kxatt-material{max-width:250px;white-space:normal;line-height:1.4}.kxatt-foot{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-top:8px;font-size:8px;color:#718181}
      @media(max-width:900px){.kxatt-kpis{grid-template-columns:repeat(2,1fr)}.kxatt-filter{grid-template-columns:1fr}.kxatt-actions{width:100%}}
    `;document.head.appendChild(s);
  }

  function ensure(){
    if(!allowed())return null;
    const root=document.getElementById('kv2-root');if(!root)return null;
    let box=document.getElementById('kegiatan-exkul-attendance-live');
    if(!box){
      box=document.createElement('section');box.id='kegiatan-exkul-attendance-live';
      const live=document.getElementById('kegiatan-live-report');
      if(live)live.insertAdjacentElement('afterend',box);else{const k=root.querySelector('.kv2-kpis');if(k)k.insertAdjacentElement('afterend',box);else root.prepend(box)}
    }
    return box;
  }

  function viewRows(){
    const q=low(document.getElementById('kxatt-q')?.value||S.q),mode=document.getElementById('kxatt-mode')?.value||S.filter,st=document.getElementById('kxatt-status')?.value||S.status;
    return S.rows.filter(r=>{
      if(mode==='scheduled'&&!r.scheduled&&!['sudah','sebagian'].includes(r.status))return false;
      if(st!=='all'&&r.status!==st)return false;
      if(q&&!low([r.extracurricular_name,r.assignment_label,r.coach_name,r.material].join(' ')).includes(q))return false;
      return true;
    });
  }
  const statusLabel=s=>({sudah:'Sudah Absen',sebagian:'Sebagian',belum:'Belum Absen',tidak_jadwal:'Tidak Jadwal'}[s]||s);

  function renderTable(){
    const tb=document.getElementById('kxatt-body');if(!tb)return;
    const rows=viewRows();
    tb.innerHTML=rows.length?rows.map(r=>{
      const a=r.attendance_summary||{},abs=`${Number(r.attendance_records||0)}/${Number(r.expected_students||0)}`;
      const attendance=r.status==='tidak_jadwal'?'—':`${abs}<div class="kxatt-mini">H ${a.Hadir||0} · I ${a.Izin||0} · S ${a.Sakit||0} · A ${a.Alfa||0}</div>`;
      const photo=r.photo_url?`<a class="kxatt-photo" href="${esc(r.photo_url)}" target="_blank" rel="noopener"><img src="${esc(r.photo_url)}" alt="Foto dokumentasi"><span>Lihat</span></a>`:'<span class="kxatt-empty-photo">Tidak ada · opsional</span>';
      return `<tr><td><div class="kxatt-name">${esc(r.extracurricular_name)}</div><div class="kxatt-mini">${esc(r.day_text||'')} ${r.time_text?'· '+esc(r.time_text):''}</div></td><td><b>${esc(r.assignment_label||r.coach_name||'Pelatih')}</b><div class="kxatt-mini">${esc(r.coach_name||'')}</div></td><td><span class="kxatt-badge ${esc(r.status)}">${esc(statusLabel(r.status))}</span></td><td>${attendance}</td><td class="kxatt-material">${r.material?esc(r.material):'<span class="kxatt-mini">Belum diisi</span>'}${r.notes?'<div class="kxatt-mini">'+esc(r.notes)+'</div>':''}</td><td>${photo}</td><td>${fmt(r.updated_at)}</td></tr>`;
    }).join(''):'<tr><td colspan="7" style="padding:22px;text-align:center;color:#718181">Tidak ada data pada filter ini.</td></tr>';
    const n=document.getElementById('kxatt-count');if(n)n.textContent=rows.length+' kelompok';
  }

  function render(){
    const box=ensure();if(!box||!S.loaded)return;
    const scheduled=S.rows.filter(r=>r.scheduled||['sudah','sebagian'].includes(r.status)),done=scheduled.filter(r=>r.status==='sudah').length,partial=scheduled.filter(r=>r.status==='sebagian').length,pending=scheduled.filter(r=>r.status==='belum').length,withPhoto=scheduled.filter(r=>r.has_photo).length;
    box.innerHTML=`<div class="kxatt-head"><div><div class="kxatt-title">Live Absensi Ekskul</div><div class="kxatt-sub">Pantau absensi pelatih, materi pertemuan, dan dokumentasi foto. Foto bersifat opsional dan tidak memengaruhi status absensi.</div></div><div class="kxatt-actions"><div class="kxatt-field"><label>Tanggal</label><input id="kxatt-date" type="date" value="${esc(S.date)}" onchange="kxattDate(this.value)"></div><button class="kxatt-btn" onclick="kxattRefresh()">Refresh</button></div></div>
    <div class="kxatt-kpis"><div class="kxatt-kpi"><strong>${scheduled.length}</strong><span>Kelompok Terpantau</span></div><div class="kxatt-kpi good"><strong>${done}</strong><span>Sudah Absen</span></div><div class="kxatt-kpi warn"><strong>${partial}</strong><span>Absensi Sebagian</span></div><div class="kxatt-kpi bad"><strong>${pending}</strong><span>Belum Absen</span></div><div class="kxatt-kpi info"><strong>${withPhoto}</strong><span>Ada Foto (Opsional)</span></div></div>
    <div class="kxatt-filter"><input id="kxatt-q" class="kv2-input" placeholder="Cari ekskul / pelatih / materi..." oninput="kxattTable()"><select id="kxatt-mode" class="kv2-select" onchange="kxattTable()"><option value="scheduled">Jadwal tanggal ini</option><option value="all">Semua kelompok</option></select><select id="kxatt-status" class="kv2-select" onchange="kxattTable()"><option value="all">Semua status</option><option value="sudah">Sudah Absen</option><option value="sebagian">Sebagian</option><option value="belum">Belum Absen</option><option value="tidak_jadwal">Tidak Jadwal</option></select></div>
    <div class="kxatt-wrap"><table class="kxatt-table"><thead><tr><th>Ekskul</th><th>Pelatih / Kelompok</th><th>Status</th><th>Absensi Siswa</th><th>Materi</th><th>Foto</th><th>Update</th></tr></thead><tbody id="kxatt-body"></tbody></table></div><div class="kxatt-foot"><span>Otomatis diperbarui ±15 detik</span><span id="kxatt-count"></span></div>`;
    document.getElementById('kxatt-mode').value=S.filter;document.getElementById('kxatt-status').value=S.status;renderTable();
  }

  async function load(force=false){
    if(!allowed()||S.loading||S.loaded&&!force)return;const box=ensure();if(!box)return;
    S.loading=true;if(!S.date)S.date=today();
    if(!S.loaded)box.innerHTML='<div class="kxatt-title">Live Absensi Ekskul</div><div class="kxatt-sub">Memuat data terbaru...</div>';
    try{const d=await api(S.date);S.rows=d.rows||[];S.loaded=true;S.last=new Date();render()}catch(e){box.innerHTML=`<div class="kxatt-head"><div><div class="kxatt-title">Live Absensi Ekskul</div><div class="kxatt-sub" style="color:#a34c3d">${esc(e.message||'Gagal memuat data.')}</div></div><button class="kxatt-btn" onclick="kxattRefresh()">Coba lagi</button></div>`}finally{S.loading=false}
  }
  window.kxattTable=renderTable;
  window.kxattRefresh=()=>load(true);
  window.kxattDate=v=>{S.date=v||today();S.loaded=false;load(true)};
  function tick(){if(!allowed())return;css();const box=ensure();if(!box)return;if(!S.loaded&&!S.loading)load(false)}
  const mo=new MutationObserver(tick);
  function boot(){css();S.date=today();mo.observe(document.body,{childList:true,subtree:true});tick();S.timer=setInterval(()=>{if(allowed()&&document.getElementById('kegiatan-exkul-attendance-live'))load(true)},15000);document.addEventListener('visibilitychange',()=>{if(!document.hidden&&allowed())load(true)})}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();