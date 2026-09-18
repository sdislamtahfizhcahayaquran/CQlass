/* CQlass — Live Readiness Rapor PTS untuk Kabid Akademik */
(function(){
  'use strict';
  if(window.__CQ_ACADEMIC_PTS_READINESS_LIVE__) return;
  window.__CQ_ACADEMIC_PTS_READINESS_LIVE__=1;

  const BASE=(typeof SUPABASE_URL!=='undefined'?SUPABASE_URL:'https://lmglkxzemtvxcgktiord.supabase.co')+'/functions/v1/academic-pts-readiness';
  const REFRESH_MS=30000;
  let data=null,busy=false,lastLoad=0,tab='classes',classFilter='all';
  const E=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

  function role(){
    try{
      const u=typeof currentUser!=='undefined'&&currentUser?currentUser:JSON.parse(localStorage.getItem('cqlass_user')||'{}');
      return String(u?.role||u?.role_code||u?.primary_role||'').toLowerCase().replace(/[\s-]+/g,'_');
    }catch(_){return''}
  }
  function isAcademic(){const r=role();return r==='akademik'||r==='kabid_akademik'||r.includes('kabid_akademik')||r.includes('academic')}
  function token(){try{return getAuthToken()||''}catch(_){return localStorage.getItem('cqlass_session_token')||''}}
  function jakartaToday(){try{return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())}catch(_){return new Date().toISOString().slice(0,10)}}
  async function api(){
    const key=typeof SUPABASE_PUBLISHABLE_KEY!=='undefined'?SUPABASE_PUBLISHABLE_KEY:'';
    const end=jakartaToday(),start=end.slice(0,7)+'-01';
    const res=await fetch(BASE,{method:'POST',headers:{'Content-Type':'application/json','apikey':key,'Authorization':'Bearer '+key,'x-session-token':token()},body:JSON.stringify({semester_no:1,attendance_start:start,attendance_end:end,points_start:start,points_end:end})});
    const j=await res.json().catch(()=>({}));
    if(!res.ok||j.success===false) throw Error(j.error||'Gagal memuat kesiapan Rapor PTS');
    return j;
  }
  function css(){
    if(document.getElementById('akpts-css'))return;
    const s=document.createElement('style');s.id='akpts-css';s.textContent=`
      #akpts-live{margin:0 0 11px;background:#fff;border:1px solid #dbe7f4;border-radius:19px;box-shadow:0 9px 24px rgba(29,72,120,.06);overflow:hidden;color:#17324d}
      .akpts-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;padding:15px 16px 10px;background:linear-gradient(100deg,#fbfdff,#f3f8ff)}
      .akpts-head b{display:block;font-size:14px;color:#153c63}.akpts-head small{display:block;font-size:8.7px;color:#71849a;margin-top:3px;line-height:1.45}
      .akpts-refresh{border:1px solid #cbdcf0;background:#fff;color:#28639c;border-radius:10px;padding:7px 10px;font-size:9px;font-weight:900;cursor:pointer;white-space:nowrap}
      .akpts-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;padding:0 16px 10px}.akpts-kpi{border:1px solid #dfebf7;border-radius:13px;background:#f9fbfe;padding:10px 11px}.akpts-kpi strong{display:block;font-size:20px;color:#174f86;line-height:1}.akpts-kpi span{display:block;margin-top:5px;font-size:8px;color:#71849a}.akpts-kpi.ready{background:#edf8f3;border-color:#d5ecdf}.akpts-kpi.ready strong{color:#167253}
      .akpts-tabs{display:flex;gap:6px;flex-wrap:wrap;padding:0 16px 10px}.akpts-tab{border:1px solid #d7e4f2;background:#fff;color:#4f6d8c;border-radius:999px;padding:6px 10px;font-size:8.5px;font-weight:900;cursor:pointer}.akpts-tab.on{background:#1f659f;color:#fff;border-color:#1f659f}
      .akpts-filter{display:flex;gap:6px;padding:0 16px 10px}.akpts-filter button{border:0;background:#eef4fa;color:#52708e;border-radius:8px;padding:5px 8px;font-size:8px;font-weight:800;cursor:pointer}.akpts-filter button.on{background:#dcecff;color:#18598f}
      .akpts-wrap{overflow:auto;border-top:1px solid #edf2f7}.akpts-table{width:100%;border-collapse:collapse;min-width:1120px}.akpts-table th,.akpts-table td{padding:8px 9px;border-bottom:1px solid #edf2f7;text-align:left;vertical-align:middle;font-size:8.8px}.akpts-table th{background:#f6f9fd;color:#637b94;text-transform:uppercase;letter-spacing:.03em;font-size:7.7px;position:sticky;top:0;z-index:1}.akpts-table tbody tr:hover{background:#fbfdff}
      .akpts-class{font-weight:900;color:#173c61;font-size:9.7px;white-space:nowrap}.akpts-owner{color:#647b91;max-width:150px}.akpts-check{display:inline-flex;align-items:center;justify-content:center;min-width:22px;height:22px;border-radius:7px;font-size:10px;font-weight:900}.akpts-check.yes{background:#e6f7ef;color:#117150}.akpts-check.no{background:#fff0e8;color:#a85820}.akpts-check.wait{background:#eef3f8;color:#60758b}
      .akpts-status{display:inline-flex;border-radius:999px;padding:5px 8px;font-size:7.8px;font-weight:900;white-space:nowrap}.akpts-status.ready{background:#e4f7ee;color:#106b4c}.akpts-status.pending{background:#fff0e6;color:#9b5420}.akpts-sub{font-size:7.6px;color:#7c8ea0;margin-top:3px;line-height:1.35}.akpts-missing{max-width:260px;color:#795e43;line-height:1.4}.akpts-progress{min-width:140px}.akpts-bar{height:5px;border-radius:99px;background:#e7eef6;overflow:hidden;margin-top:4px}.akpts-bar i{display:block;height:100%;border-radius:99px;background:#3b82bd}.akpts-time{white-space:nowrap;color:#718399}.akpts-empty{padding:20px;text-align:center;color:#71849a;font-size:9px}.akpts-note{padding:9px 16px 12px;font-size:8px;color:#7a643c;background:#fffaf0;border-top:1px solid #f4ead4;line-height:1.45}
      @media(max-width:1000px){.akpts-kpis{grid-template-columns:repeat(2,1fr)}}@media(max-width:600px){.akpts-kpis{grid-template-columns:1fr 1fr}.akpts-head{padding:13px}.akpts-kpis,.akpts-tabs,.akpts-filter{padding-left:13px;padding-right:13px}}
    `;document.head.appendChild(s);
  }
  function fmtTime(v){if(!v)return'—';try{return new Intl.DateTimeFormat('id-ID',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'Asia/Jakarta'}).format(new Date(v))}catch(_){return String(v)}}
  function check(v,sub=''){return `<span class="akpts-check ${v?'yes':'no'}" title="${E(sub)}">${v?'✓':'!'}</span>${sub?`<div class="akpts-sub">${E(sub)}</div>`:''}`}
  function status(s){return s==='siap'?'<span class="akpts-status ready">SIAP DIBAGIKAN</span>':'<span class="akpts-status pending">BELUM SIAP</span>'}
  function ratio(done,total){const d=Number(done)||0,t=Number(total)||0,p=t?Math.round(d/t*100):0;return `<div class="akpts-progress"><b>${d} / ${t}</b><div class="akpts-bar"><i style="width:${Math.max(0,Math.min(100,p))}%"></i></div><div class="akpts-sub">${p}% selesai</div></div>`}
  function classesRows(){
    let rows=data?.classes||[];if(classFilter==='ready')rows=rows.filter(x=>x.status==='siap');if(classFilter==='pending')rows=rows.filter(x=>x.status!=='siap');
    if(!rows.length)return '<tr><td colspan="11"><div class="akpts-empty">Tidak ada kelas pada filter ini.</div></td></tr>';
    return rows.map(x=>`<tr>
      <td><div class="akpts-class">${E(x.class_name)}</div><div class="akpts-sub">${E(x.students)} siswa</div></td>
      <td class="akpts-owner">${E(x.homeroom_teacher||'—')}</td>
      <td>${check(x.components?.academic,`${x.academic?.ready_assignments||0}/${x.academic?.total_assignments||0} mapel`)}</td>
      <td>${check(x.components?.reward,`${x.reward?.count||0} data`)}</td>
      <td>${check(x.components?.discipline,`${x.discipline?.count||0} data`)}</td>
      <td>${check(x.components?.activity,`${x.activity?.used_codes||0} kegiatan`)}</td>
      <td>${check(x.components?.attendance,x.attendance?.source_mode?`${x.attendance.source_mode} · ${x.attendance.validated_students||0}/${x.attendance.total_students||0}`:'belum pilih sumber')}</td>
      <td>${check(x.components?.tahfizh,`${x.tahfizh?.complete_students||0}/${x.tahfizh?.total_students||0} siswa`)}</td>
      <td>${check(x.components?.extracurricular,`${x.extracurricular?.complete_students||0}/${x.extracurricular?.total_students||0} siswa`)}</td>
      <td>${status(x.status)}</td>
      <td class="akpts-missing">${x.missing?.length?E(x.missing.join(' · ')):'—'}</td>
    </tr>`).join('');
  }
  function academicRows(){const rows=data?.academic_teachers||[];if(!rows.length)return '<tr><td colspan="6"><div class="akpts-empty">Belum ada penugasan guru mapel.</div></td></tr>';return rows.map(x=>`<tr><td><b>${E(x.teacher_name)}</b></td><td>${ratio(x.ready_assignments,x.total_assignments)}</td><td><span class="akpts-status ${x.status==='selesai'?'ready':'pending'}">${x.status==='selesai'?'SELESAI':'BELUM SELESAI'}</span></td><td class="akpts-time">${fmtTime(x.last_update)}</td><td class="akpts-missing">${x.missing_assignments?.length?E(x.missing_assignments.slice(0,5).join(' · '))+(x.missing_assignments.length>5?` +${x.missing_assignments.length-5}`:''):'—'}</td><td><div class="akpts-sub">Selesai = semua mapel/kelas minimal 2 TP terisi penuh untuk seluruh siswa.</div></td></tr>`).join('')}
  function walasRows(){const rows=data?.walas||[];if(!rows.length)return '<tr><td colspan="8"><div class="akpts-empty">Belum ada data wali kelas.</div></td></tr>';return rows.map(x=>`<tr><td><b>${E(x.teacher_name)}</b><div class="akpts-sub">${E(x.class_name)}</div></td><td>${check(x.components?.reward)}</td><td>${check(x.components?.discipline)}</td><td>${check(x.components?.activity)}</td><td>${check(x.components?.attendance)}</td><td>${check(x.components?.extracurricular)}</td><td>${ratio(x.done_components,x.total_components)}</td><td><span class="akpts-status ${x.status==='selesai'?'ready':'pending'}">${x.status==='selesai'?'SELESAI':'BELUM SELESAI'}</span></td></tr>`).join('')}
  function tahfizhRows(){const rows=data?.tahfizh_teachers||[];if(!rows.length)return '<tr><td colspan="6"><div class="akpts-empty">Belum ada data guru halaqah.</div></td></tr>';return rows.map(x=>`<tr><td><b>${E(x.teacher_name)}</b></td><td>${E((x.classes||[]).join(', ')||'—')}</td><td>${ratio(x.complete_students,x.total_students)}</td><td><span class="akpts-status ${x.status==='selesai'?'ready':'pending'}">${x.status==='selesai'?'SELESAI':'BELUM SELESAI'}</span></td><td class="akpts-time">${fmtTime(x.last_update)}</td><td><div class="akpts-sub">Lengkap bila seluruh komponen PTS Tahfizh siswa sudah terisi.</div></td></tr>`).join('')}
  function table(){
    if(tab==='academic')return `<div class="akpts-wrap"><table class="akpts-table" style="min-width:900px"><thead><tr><th>Guru Mapel</th><th>Penugasan Siap</th><th>Status</th><th>Update Terakhir</th><th>Yang Belum</th><th>Ketentuan</th></tr></thead><tbody>${academicRows()}</tbody></table></div>`;
    if(tab==='walas')return `<div class="akpts-wrap"><table class="akpts-table" style="min-width:900px"><thead><tr><th>Wali Kelas</th><th>Reward</th><th>Kedisiplinan</th><th>Kegiatan</th><th>Absensi</th><th>Ekskul</th><th>Progres</th><th>Status</th></tr></thead><tbody>${walasRows()}</tbody></table></div>`;
    if(tab==='tahfizh')return `<div class="akpts-wrap"><table class="akpts-table" style="min-width:850px"><thead><tr><th>Guru Halaqah</th><th>Kelas</th><th>Siswa Lengkap</th><th>Status</th><th>Update Terakhir</th><th>Ketentuan</th></tr></thead><tbody>${tahfizhRows()}</tbody></table></div>`;
    return `<div class="akpts-filter"><button class="${classFilter==='all'?'on':''}" onclick="akPtsFilter('all')">Semua</button><button class="${classFilter==='ready'?'on':''}" onclick="akPtsFilter('ready')">Siap Dibagikan</button><button class="${classFilter==='pending'?'on':''}" onclick="akPtsFilter('pending')">Belum Siap</button></div><div class="akpts-wrap"><table class="akpts-table"><thead><tr><th>Kelas</th><th>Walas</th><th>Nilai ≥2 TP</th><th>Reward</th><th>Kedisiplinan</th><th>Kegiatan</th><th>Absensi</th><th>Tahfizh</th><th>Ekskul</th><th>Status Rapor</th><th>Yang Belum</th></tr></thead><tbody>${classesRows()}</tbody></table></div>`;
  }
  function render(){
    if(!isAcademic()||!data)return;
    const root=document.querySelector('#content #cq-ak7, #content .ak7');if(!root)return;css();
    let box=document.getElementById('akpts-live');if(!box){box=document.createElement('section');box.id='akpts-live';const anchor=root.querySelector('.ak7-kpis');if(anchor)anchor.insertAdjacentElement('afterend',box);else root.prepend(box)}
    const s=data.summary||{},period=data.attendance_period||{};
    box.innerHTML=`<div class="akpts-head"><div><b>Live Readiness Rapor PTS</b><small>Pantau sampai benar-benar siap dibagikan ke orang tua · Semester ${E(data.semester_no)} · periode ${E(period.start||'')} s.d. ${E(period.end||'')} · sinkron ${fmtTime(data.generated_at)}</small></div><button class="akpts-refresh" onclick="akPtsRefresh()">↻ Perbarui</button></div>
      <div class="akpts-kpis"><div class="akpts-kpi ready"><strong>${E(s.classes_ready||0)} / ${E(s.classes||0)}</strong><span>Kelas siap dibagikan</span></div><div class="akpts-kpi"><strong>${E(s.academic_teachers_done||0)} / ${E(s.academic_teachers||0)}</strong><span>Guru mapel selesai ≥2 TP</span></div><div class="akpts-kpi"><strong>${E(s.walas_done||0)} / ${E(s.walas||0)}</strong><span>Walas selesai komponen rapor</span></div><div class="akpts-kpi"><strong>${E(s.tahfizh_teachers_done||0)} / ${E(s.tahfizh_teachers||0)}</strong><span>Guru Tahfizh selesai PTS</span></div></div>
      <div class="akpts-tabs"><button class="akpts-tab ${tab==='classes'?'on':''}" onclick="akPtsTab('classes')">Per Kelas</button><button class="akpts-tab ${tab==='academic'?'on':''}" onclick="akPtsTab('academic')">Guru Mapel</button><button class="akpts-tab ${tab==='walas'?'on':''}" onclick="akPtsTab('walas')">Wali Kelas</button><button class="akpts-tab ${tab==='tahfizh'?'on':''}" onclick="akPtsTab('tahfizh')">Tahfizh</button></div>${table()}<div class="akpts-note">Catatan: reward/kedisiplinan yang benar-benar nihil belum punya tombol konfirmasi nihil. Untuk mencegah kelas salah dinyatakan siap, 0 data sementara ditandai <b>perlu cek</b> dan belum dihitung selesai.</div>`;
  }
  async function load(force=false){if(!isAcademic()||busy)return;if(!force&&data&&Date.now()-lastLoad<REFRESH_MS)return render();busy=true;try{data=await api();lastLoad=Date.now();render()}catch(e){console.warn('Live Readiness Rapor PTS:',e)}finally{busy=false}}
  window.akPtsTab=t=>{tab=String(t||'classes');render()};window.akPtsFilter=f=>{classFilter=String(f||'all');render()};window.akPtsRefresh=()=>load(true);
  function tick(){if(!isAcademic())return;const root=document.querySelector('#content #cq-ak7, #content .ak7');if(!root)return;if(!data||Date.now()-lastLoad>=REFRESH_MS)load();else if(!document.getElementById('akpts-live'))render()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(tick,800));else setTimeout(tick,800);setInterval(tick,2000);
})();
