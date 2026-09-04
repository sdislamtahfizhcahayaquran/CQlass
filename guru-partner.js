/* CQlass — Guru Partner: Dashboard + Tugas Kelas (Absensi, Nilai PTS Tahfizh) */
(function(){
  const API = `${SUPABASE_URL}/functions/v1/partner-tasks`;
  let boot=null, activeClassId='', rows=[], reports=new Map(), dirty=false;
  const oldEnterApp=window.enterApp;
  const oldDashRender=DASHBOARD_MODULE.render;
  const icon=(name)=>window.CQIcons?.svg?.(name)||'';

  async function req(action,payload={}){
    const token=getAuthToken();
    if(!token) throw new Error('Sesi login tidak ditemukan.');
    const res=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json','apikey':SUPABASE_PUBLISHABLE_KEY,'Authorization':`Bearer ${SUPABASE_PUBLISHABLE_KEY}`,'x-session-token':token},body:JSON.stringify({action,semester_no:1,...payload})});
    const data=await res.json().catch(()=>({success:false,error:'invalid_response'}));
    if(!res.ok||data.success===false) throw Object.assign(new Error(data.error||'Gagal memuat tugas.'),{status:res.status,code:data.error});
    return data;
  }

  function installRole(){
    if(!DASHBOARD_MODULE.roles.includes('partner')) DASHBOARD_MODULE.roles.push('partner');
    DASHBOARD_MODULE.render=function(content){
      if(currentUser?.role==='partner') return renderPartnerDashboard(content);
      return oldDashRender(content);
    };
    if(!MODULE_GROUPS.some(g=>g.id==='partner-tasks')){
      MODULE_GROUPS.push({
        id:'partner-tasks',label:'Tugas Kelas',roles:['partner'],items:[
          {id:'absensi',label:'Absensi',roles:['partner'],built:true,render:renderAbsensi},
          {id:'partner-pts',label:'Nilai PTS',roles:['partner'],built:true,render:renderPartnerPTS}
        ]
      });
    }
  }

  async function detectPartner(){
    if(!currentUser||currentUser.role!=='guru') return;
    try{
      boot=await req('bootstrap');
      if(!boot||boot.role!=='partner') return;
      installRole();
      currentUser.role='partner';
      currentUser.kelas=(boot.classes||[]).find(c=>c.is_partner_class)?.name||currentUser.kelas||'';
      const roleEl=document.getElementById('user-role'); if(roleEl) roleEl.textContent='GURU PARTNER';
      activeModule='dashboard'; openGroupId=null;
      renderSidebar(); setActiveModule('dashboard');
    }catch(err){
      if(err?.code!=='not_partner'&&err?.status!==403) console.warn('Partner mode:',err);
    }
  }

  window.enterApp=function(){
    oldEnterApp.apply(this,arguments);
    setTimeout(detectPartner,80);
  };

  function styles(){
    if(document.getElementById('gp-style')) return;
    const s=document.createElement('style'); s.id='gp-style'; s.textContent=`
      .gp-hero{display:flex;justify-content:space-between;gap:18px;align-items:flex-start;padding:22px;border:1px solid var(--border);border-radius:18px;background:linear-gradient(135deg,#f7fbfb,#eef8f7)}
      .gp-hero h2{margin:0 0 5px;font-size:22px}.gp-hero p{margin:0;color:var(--muted);font-size:12px}.gp-badge{display:inline-flex;align-items:center;gap:6px;padding:7px 10px;border-radius:999px;background:#fff;border:1px solid var(--border);font-size:11px;font-weight:800}
      .gp-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-top:14px}.gp-kpi{background:#fff;border:1px solid var(--border);border-radius:16px;padding:16px}.gp-kpi .i{width:34px;height:34px;border-radius:10px;background:#eaf7f6;color:var(--primary);display:flex;align-items:center;justify-content:center;margin-bottom:11px}.gp-kpi .i svg{width:18px;height:18px}.gp-kpi strong{display:block;font-size:22px}.gp-kpi span{font-size:11px;color:var(--muted);font-weight:700}
      .gp-actions{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:14px}.gp-action{border:1px solid var(--border);background:#fff;border-radius:16px;padding:18px;cursor:pointer;text-align:left}.gp-action:hover{box-shadow:0 8px 24px rgba(20,60,58,.08)}.gp-action-head{display:flex;align-items:center;gap:10px;font-weight:900}.gp-action-head svg{width:20px;height:20px}.gp-action small{display:block;color:var(--muted);margin-top:8px;line-height:1.5}
      .gp-toolbar{display:flex;gap:10px;align-items:end;flex-wrap:wrap}.gp-field{min-width:210px}.gp-field label{display:block;font-size:10px;font-weight:900;color:var(--muted);margin-bottom:5px}.gp-field select{width:100%;padding:10px 12px;border:1px solid var(--border);border-radius:10px;background:#fff}.gp-save{margin-left:auto}
      .gp-tablewrap{overflow:auto;border:1px solid var(--border);border-radius:14px;background:#fff;margin-top:12px;max-height:66vh}.gp-table{border-collapse:separate;border-spacing:0;min-width:1450px;width:100%;font-size:11px}.gp-table th{position:sticky;top:0;z-index:3;background:#eef7f6;padding:9px 8px;border-bottom:1px solid var(--border);border-right:1px solid var(--border);text-align:center}.gp-table td{padding:0;border-bottom:1px solid var(--border);border-right:1px solid var(--border);background:#fff}.gp-table td.name{padding:8px 10px;min-width:180px;position:sticky;left:0;z-index:2;font-weight:800}.gp-table tbody tr:nth-child(even) td{background:#fbfdfd}.gp-cell{width:100%;min-width:92px;border:0;outline:0;padding:8px 9px;background:transparent;font:inherit;color:inherit}.gp-cell:focus{box-shadow:inset 0 0 0 2px var(--primary);background:#fff}.gp-cell.wide{min-width:180px}.gp-note{font-size:11px;color:var(--muted);margin-top:8px;line-height:1.5}.gp-state{font-size:11px;font-weight:800;color:var(--muted)}.gp-state.dirty{color:#a26100}
      @media(max-width:800px){.gp-kpis{grid-template-columns:1fr 1fr}.gp-actions{grid-template-columns:1fr}.gp-hero{flex-direction:column}.gp-save{margin-left:0}.gp-field{min-width:100%;width:100%}}
    `; document.head.appendChild(s);
  }

  async function renderPartnerDashboard(content){
    styles();
    content.innerHTML='<div class="card"><span class="spinner"></span>Memuat dashboard...</div>';
    try{boot=await req('bootstrap');}catch(e){content.innerHTML=`<div class="empty-state">${escapeHtml(e.message)}</div>`;return}
    const st=boot.stats||{}, att=`${st.attendance_done||0}/${st.attendance_total||0}`, pts=st.pts_total?Math.round((st.pts_filled||0)/st.pts_total*100):0;
    content.innerHTML=`
      <div class="page-title">Dashboard Guru Partner</div><div class="page-sub">Ringkasan tugas kelas dan Tahfizh PTS yang menjadi tanggung jawab Anda.</div>
      <div class="gp-hero"><div><h2>${escapeHtml(boot.teacher_name||currentUser.nama)}</h2><p>${escapeHtml(boot.academic_year||'2026/2027')} · Semester 1</p></div><span class="gp-badge">${icon('user')} Guru Partner</span></div>
      <div class="gp-kpis">
        <div class="gp-kpi"><div class="i">${icon('home')}</div><strong>${st.partner_classes||0}</strong><span>Kelas Partner</span></div>
        <div class="gp-kpi"><div class="i">${icon('calendar')}</div><strong>${att}</strong><span>Absensi Hari Ini</span></div>
        <div class="gp-kpi"><div class="i">${icon('book')}</div><strong>${st.assigned_classes||0}</strong><span>Kelas/Halaqah Tahfizh</span></div>
        <div class="gp-kpi"><div class="i">${icon('chart')}</div><strong>${pts}%</strong><span>Kelengkapan Nilai PTS</span></div>
      </div>
      <div class="gp-actions">
        <button class="gp-action" onclick="setActiveModule('absensi')"><div class="gp-action-head">${icon('calendar')} Absensi</div><small>Isi Morning Talk dan kehadiran kelas partner. Jika Walas sudah mengisi, data yang sama langsung tampil.</small></button>
        <button class="gp-action" onclick="setActiveModule('partner-pts')"><div class="gp-action-head">${icon('book')} Nilai PTS</div><small>Pilih kelas/halaqah yang ditugaskan, lalu isi data Tahfizh PTS langsung pada tabel.</small></button>
      </div>`;
  }

  function val(r,k){return String(r?.[k]??'')}
  function cell(studentId,key,value,wide=false){return `<input class="gp-cell ${wide?'wide':''}" type="text" inputmode="text" data-student="${escapeHtml(studentId)}" data-key="${key}" value="${escapeHtml(value)}" oninput="gpDirty()" onkeydown="gpGridKey(event)" onpaste="gpGridPaste(event)">`}
  async function renderPartnerPTS(content){
    styles(); dirty=false; rows=[]; reports=new Map();
    content.innerHTML='<div class="card"><span class="spinner"></span>Memuat penugasan Tahfizh...</div>';
    try{boot=await req('bootstrap');}catch(e){content.innerHTML=`<div class="empty-state">${escapeHtml(e.message)}</div>`;return}
    const classes=boot.classes||[];
    if(!classes.length){content.innerHTML='<div class="empty-state">Belum ada kelas atau halaqah Tahfizh yang ditugaskan.</div>';return}
    activeClassId=classes[0].id;
    content.innerHTML=`<div class="page-title">Nilai PTS Tahfizh</div><div class="page-sub">Nama guru otomatis mengikuti akun. Input dapat di-copy/paste, tombol panah untuk berpindah sel, dan Enter untuk turun ke siswa berikutnya.</div>
      <div class="card"><div class="gp-toolbar"><div class="gp-field"><label>Kelas / Halaqah</label><select id="gp-class" onchange="gpChangeClass(this.value)">${classes.map(c=>`<option value="${escapeHtml(c.id)}">${escapeHtml(c.name)}${c.is_halaqah_class&&!c.is_partner_class?' · Halaqah':''}</option>`).join('')}</select></div><div class="gp-field"><label>Guru Pengisi</label><div class="gp-badge">${icon('user')} ${escapeHtml(boot.teacher_name||currentUser.nama)}</div></div><span class="gp-state" id="gp-state">Tersimpan</span><button class="btn gp-save" id="gp-save" onclick="gpSave()">${icon('save')} Simpan</button></div><div id="gp-grid"></div></div>`;
    await loadClass();
  }

  async function loadClass(){
    const box=document.getElementById('gp-grid'); if(!box)return; box.innerHTML='<div style="padding:18px"><span class="spinner"></span>Memuat siswa...</div>';
    try{const d=await req('roster',{class_id:activeClassId});rows=d.students||[];reports=new Map((d.reports||[]).map(r=>[r.student_id,r]));dirty=false;renderGrid();}catch(e){box.innerHTML=`<div class="empty-state">${escapeHtml(e.message)}</div>`}
  }
  function renderGrid(){
    const box=document.getElementById('gp-grid'); if(!box)return;
    if(!rows.length){box.innerHTML='<div class="empty-state">Belum ada siswa aktif pada kelas ini.</div>';return}
    box.innerHTML=`<div class="gp-note">Guru Halaqah tidak perlu diketik. Sistem otomatis menyimpan nama akun yang sedang mengisi.</div><div class="gp-tablewrap"><table class="gp-table"><thead><tr><th>No</th><th>Nama Siswa</th><th>Materi Hafalan</th><th>LP Tahfizh</th><th>Realisasi Saat Ini</th><th>Prestasi Tahfizh</th><th>Jml Surat</th><th>Jml Baris</th><th>Jml Ayat</th><th>Jml Baris LP</th><th>Persentase</th><th>Kenaikan Juz</th></tr></thead><tbody>${rows.map((s,i)=>{const r=reports.get(s.id)||{};return `<tr><td style="padding:8px;text-align:center">${i+1}</td><td class="name">${escapeHtml(s.full_name||s.name||'')}</td><td>${cell(s.id,'materi_hafalan',val(r,'materi_hafalan'),true)}</td><td>${cell(s.id,'lp_tahfizh',val(r,'lp_tahfizh'),true)}</td><td>${cell(s.id,'realisasi_saat_ini',val(r,'realisasi_saat_ini'),true)}</td><td>${cell(s.id,'prestasi_tahfizh',val(r,'prestasi_tahfizh'),true)}</td><td>${cell(s.id,'jumlah_surat',val(r,'jumlah_surat'))}</td><td>${cell(s.id,'jumlah_baris',val(r,'jumlah_baris'))}</td><td>${cell(s.id,'jumlah_ayat',val(r,'jumlah_ayat'))}</td><td>${cell(s.id,'jumlah_baris_lp',val(r,'jumlah_baris_lp'))}</td><td>${cell(s.id,'persentase',val(r,'persentase'))}</td><td>${cell(s.id,'mengikuti_kenaikan_juz',val(r,'mengikuti_kenaikan_juz'))}</td></tr>`}).join('')}</tbody></table></div>`;
    updateState();
  }

  window.gpDirty=function(){dirty=true;updateState()};
  function updateState(){const st=document.getElementById('gp-state');if(st){st.textContent=dirty?'Belum disimpan':'Tersimpan';st.classList.toggle('dirty',dirty)}}
  window.gpChangeClass=async function(id){if(dirty&&!confirm('Ada data yang belum disimpan. Tetap pindah kelas?')){document.getElementById('gp-class').value=activeClassId;return}activeClassId=id;await loadClass()};
  window.gpGridKey=function(e){const inputs=[...document.querySelectorAll('.gp-cell')];const i=inputs.indexOf(e.target);if(i<0)return;const cols=10;let n=i;if(e.key==='Enter'||e.key==='ArrowDown')n=i+cols;else if(e.key==='ArrowUp')n=i-cols;else if(e.key==='ArrowRight'&&e.target.selectionStart===e.target.value.length)n=i+1;else if(e.key==='ArrowLeft'&&e.target.selectionStart===0)n=i-1;else return;if(n>=0&&n<inputs.length){e.preventDefault();inputs[n].focus();inputs[n].select()}};
  window.gpGridPaste=function(e){const text=e.clipboardData?.getData('text/plain')||'';if(!/[\t\n]/.test(text))return;const inputs=[...document.querySelectorAll('.gp-cell')],start=inputs.indexOf(e.target);if(start<0)return;e.preventDefault();const matrix=text.replace(/\r/g,'').split('\n').filter((x,i,a)=>x!==''||i<a.length-1).map(r=>r.split('\t'));const cols=10;matrix.forEach((r,ri)=>r.forEach((v,ci)=>{const el=inputs[start+ri*cols+ci];if(el){el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}))}}));};
  window.gpSave=async function(){const btn=document.getElementById('gp-save');if(!btn)return;const inputs=[...document.querySelectorAll('.gp-cell')];const map=new Map(rows.map(s=>[s.id,{student_id:s.id}]));inputs.forEach(el=>{const x=map.get(el.dataset.student);if(x)x[el.dataset.key]=el.value.trim()});const old=btn.innerHTML;btn.disabled=true;btn.innerHTML='<span class="spinner"></span>Menyimpan...';try{const d=await req('save',{class_id:activeClassId,items:[...map.values()]});dirty=false;updateState();showToast(`${d.saved||0} data siswa berhasil disimpan.`)}catch(e){showToast(e.message||'Gagal menyimpan nilai PTS.',true)}finally{btn.disabled=false;btn.innerHTML=old}};

  installRole();
})();