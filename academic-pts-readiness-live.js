/* CQlass — Live Readiness Rapor PTS untuk Kabid Akademik */
(function(){
  'use strict';
  if(window.__CQ_ACADEMIC_PTS_READINESS_LIVE_V3__) return;
  window.__CQ_ACADEMIC_PTS_READINESS_LIVE_V3__=1;

  const BASE=(typeof SUPABASE_URL!=='undefined'?SUPABASE_URL:'https://lmglkxzemtvxcgktiord.supabase.co')+'/functions/v1/academic-pts-readiness';
  const REFRESH_MS=30000;
  let data=null,busy=false,lastLoad=0,tab='classes',classFilter='all',lastError='';

  const E=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const N=v=>String(v||'').trim().toLowerCase().replace(/[\s-]+/g,'_');

  function readUser(){
    try{if(typeof currentUser!=='undefined'&&currentUser)return currentUser;}catch(_){ }
    try{return JSON.parse(localStorage.getItem('cqlass_user')||'{}')||{};}catch(_){return{};}
  }
  function roleValues(){
    const u=readUser();
    return [u.role,u.role_code,u.primary_role].concat(Array.isArray(u.roles)?u.roles:[]).map(N).filter(Boolean);
  }
  function isAcademic(){
    return roleValues().some(r=>r==='akademik'||r==='kabid_akademik'||r==='academic'||r.includes('kabid_akademik')||r.includes('academic'));
  }
  function token(){
    try{if(typeof getAuthToken==='function')return getAuthToken()||'';}catch(_){ }
    return localStorage.getItem('cqlass_session_token')||'';
  }
  function jakartaToday(){
    try{return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
    catch(_){return new Date().toISOString().slice(0,10);}
  }
  function dashboardRoot(){
    return document.querySelector('#content #cq-ak7')||document.querySelector('#content .ak7');
  }
  function dashboardVisible(){
    const root=dashboardRoot();
    if(!root)return false;
    try{if(typeof activeModule!=='undefined'&&activeModule!=null&&String(activeModule)!=='dashboard')return false;}catch(_){ }
    return true;
  }

  async function api(){
    const key=typeof SUPABASE_PUBLISHABLE_KEY!=='undefined'?SUPABASE_PUBLISHABLE_KEY:'';
    const end=jakartaToday(),start=end.slice(0,7)+'-01';
    const res=await fetch(BASE,{
      method:'POST',
      headers:{'Content-Type':'application/json','apikey':key,'Authorization':'Bearer '+key,'x-session-token':token()},
      body:JSON.stringify({semester_no:1,attendance_start:start,attendance_end:end,points_start:start,points_end:end})
    });
    const j=await res.json().catch(()=>({}));
    if(!res.ok||j.success===false)throw Error(j.error||('Gagal memuat kesiapan Rapor PTS ('+res.status+')'));
    return j;
  }

  function css(){
    if(document.getElementById('akpts-css-v3'))return;
    const s=document.createElement('style');s.id='akpts-css-v3';s.textContent=`
      #akpts-live{margin:0 0 14px;border-radius:22px;overflow:hidden;border:1px solid #d9e7ef;background:#fff;box-shadow:0 14px 34px rgba(18,65,91,.08);color:#17394d}
      #akpts-live *{box-sizing:border-box}
      .akpts-hero{display:flex;justify-content:space-between;align-items:flex-start;gap:18px;padding:20px 22px;background:linear-gradient(115deg,#0d6574 0%,#17858e 42%,#4378c8 100%);color:#fff;position:relative;overflow:hidden}
      .akpts-hero:after{content:'';position:absolute;right:-50px;top:-90px;width:260px;height:260px;border-radius:50%;border:1px solid rgba(255,255,255,.22);box-shadow:0 0 0 38px rgba(255,255,255,.05),0 0 0 76px rgba(255,255,255,.03)}
      .akpts-hero>div,.akpts-hero>button{position:relative;z-index:1}.akpts-title{font-size:20px;font-weight:900;letter-spacing:-.02em}.akpts-subtitle{font-size:11px;line-height:1.5;margin-top:5px;color:rgba(255,255,255,.85)}
      .akpts-refresh{border:1px solid rgba(255,255,255,.46);background:rgba(255,255,255,.16);backdrop-filter:blur(8px);color:#fff;border-radius:12px;padding:9px 13px;font-size:10px;font-weight:900;cursor:pointer;white-space:nowrap}.akpts-refresh:hover{background:rgba(255,255,255,.24)}
      .akpts-error{margin:14px 18px 0;padding:11px 13px;border-radius:12px;background:#fff0f0;border:1px solid #ffcaca;color:#9e3030;font-size:10px;font-weight:700;line-height:1.45}
      .akpts-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;padding:14px 18px 12px;background:#f8fbfd}
      .akpts-kpi{border-radius:16px;padding:14px 15px;min-height:98px;position:relative;overflow:hidden;border:1px solid transparent;cursor:default}
      .akpts-kpi:after{content:'';position:absolute;width:84px;height:84px;border-radius:50%;right:-24px;bottom:-32px;background:rgba(255,255,255,.38)}
      .akpts-kpi strong{display:block;font-size:27px;line-height:1;color:#17394d}.akpts-kpi span{display:block;font-size:10px;font-weight:800;margin-top:7px;color:#4d6876}.akpts-kpi small{display:block;font-size:8.5px;margin-top:4px;color:#71838c}
      .akpts-kpi.blue{background:linear-gradient(145deg,#e9f4ff,#dbeaff);border-color:#c6ddf7}.akpts-kpi.green{background:linear-gradient(145deg,#e8faef,#d6f1e2);border-color:#c3e6d3}.akpts-kpi.gold{background:linear-gradient(145deg,#fff7df,#ffebbd);border-color:#f4d997}.akpts-kpi.purple{background:linear-gradient(145deg,#f2eaff,#e4d7ff);border-color:#d5c2f5}
      .akpts-toolbar{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;padding:10px 18px 12px;border-top:1px solid #edf3f6;background:#fff}
      .akpts-tabs,.akpts-filter{display:flex;gap:7px;flex-wrap:wrap}.akpts-tab,.akpts-filter button{border:0;border-radius:999px;padding:8px 12px;font-size:9px;font-weight:900;cursor:pointer}
      .akpts-tab{background:#eef4f7;color:#4d6976}.akpts-tab.on{background:linear-gradient(90deg,#146b7a,#397fc2);color:#fff;box-shadow:0 5px 12px rgba(31,105,145,.18)}
      .akpts-filter button{background:#f3f6f8;color:#637986}.akpts-filter button.on{background:#e5efff;color:#275c9d}
      .akpts-wrap{overflow:auto;border-top:1px solid #edf3f6;max-height:590px}.akpts-table{width:100%;border-collapse:separate;border-spacing:0;min-width:1180px}.akpts-table th,.akpts-table td{padding:11px 10px;border-bottom:1px solid #edf2f4;text-align:left;vertical-align:middle;font-size:10px}.akpts-table th{background:#f5f9fb;color:#607680;text-transform:uppercase;letter-spacing:.025em;font-size:8.5px;position:sticky;top:0;z-index:3}.akpts-table tbody tr:nth-child(even){background:#fbfdfe}.akpts-table tbody tr:hover{background:#f1f8fc}.akpts-table tbody tr.akpts-row-ready{background:#f0fbf4}
      .akpts-class{font-size:11px;font-weight:900;color:#173f53;white-space:nowrap}.akpts-owner{font-weight:700;color:#4f6773;max-width:170px}.akpts-sub{font-size:8.5px;color:#758992;margin-top:4px;line-height:1.4}.akpts-time{white-space:nowrap;color:#657b85}.akpts-missing{max-width:300px;color:#7c5a3c;line-height:1.5}
      .akpts-check{display:inline-flex;align-items:center;justify-content:center;gap:4px;min-width:29px;height:29px;border-radius:9px;font-size:12px;font-weight:1000}.akpts-check.yes{background:#dff6e8;color:#147149}.akpts-check.no{background:#ffe7e7;color:#ad3c3c}.akpts-check.wait{background:#edf1f4;color:#697a83}
      .akpts-status{display:inline-flex;border-radius:999px;padding:6px 9px;font-size:8.5px;font-weight:1000;white-space:nowrap}.akpts-status.ready{background:#dff6e8;color:#116943}.akpts-status.run{background:#fff1c9;color:#8a6100}.akpts-status.pending{background:#ffe5e5;color:#a63737}
      .akpts-progress{min-width:145px}.akpts-progress>b{font-size:10px}.akpts-bar{height:7px;border-radius:99px;background:#e8eef2;overflow:hidden;margin-top:6px}.akpts-bar i{display:block;height:100%;border-radius:99px;background:linear-gradient(90deg,#1b8d83,#3f80d4)}
      .akpts-empty{padding:28px;text-align:center;color:#71858f;font-size:10px}.akpts-loading{padding:30px;text-align:center;color:#56727f;font-size:11px;font-weight:800}.akpts-loading:before{content:'↻';display:inline-block;margin-right:7px;animation:akptsSpin 1s linear infinite}@keyframes akptsSpin{to{transform:rotate(360deg)}}
      .akpts-note{padding:11px 18px 14px;font-size:9px;color:#755e2d;background:#fffaf0;border-top:1px solid #f3e6c9;line-height:1.55}
      @media(max-width:1100px){.akpts-kpis{grid-template-columns:repeat(2,1fr)}}
      @media(max-width:700px){.akpts-hero{padding:17px}.akpts-title{font-size:17px}.akpts-kpis{grid-template-columns:1fr 1fr;padding:11px}.akpts-toolbar{padding:10px 11px}.akpts-kpi strong{font-size:23px}.akpts-wrap{max-height:none}}
    `;document.head.appendChild(s);
  }

  function fmtTime(v){
    if(!v)return'—';
    try{return new Intl.DateTimeFormat('id-ID',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'Asia/Jakarta'}).format(new Date(v));}
    catch(_){return String(v);}
  }
  function check(v,sub=''){
    return `<span class="akpts-check ${v?'yes':'no'}" title="${E(sub)}">${v?'✓':'!'}</span>${sub?`<div class="akpts-sub">${E(sub)}</div>`:''}`;
  }
  function status(s){
    return s==='siap'?'<span class="akpts-status ready">SIAP DIBAGIKAN</span>':'<span class="akpts-status pending">BELUM SIAP</span>';
  }
  function ratio(done,total){
    const d=Number(done)||0,t=Number(total)||0,p=t?Math.round(d/t*100):0;
    const cls=p>=100?'ready':p>0?'run':'pending';
    return `<div class="akpts-progress"><b>${d} / ${t}</b><div class="akpts-bar"><i style="width:${Math.max(0,Math.min(100,p))}%"></i></div><div class="akpts-sub"><span class="akpts-status ${cls}" style="padding:3px 7px">${p}%</span></div></div>`;
  }

  function classesRows(){
    let rows=data?.classes||[];
    if(classFilter==='ready')rows=rows.filter(x=>x.status==='siap');
    if(classFilter==='pending')rows=rows.filter(x=>x.status!=='siap');
    if(!rows.length)return '<tr><td colspan="11"><div class="akpts-empty">Tidak ada kelas pada filter ini.</div></td></tr>';
    return rows.map(x=>`<tr class="${x.status==='siap'?'akpts-row-ready':''}">
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
  function academicRows(){
    const rows=data?.academic_teachers||[];
    if(!rows.length)return '<tr><td colspan="6"><div class="akpts-empty">Belum ada penugasan guru mapel.</div></td></tr>';
    return rows.map(x=>`<tr><td><b>${E(x.teacher_name)}</b></td><td>${ratio(x.ready_assignments,x.total_assignments)}</td><td><span class="akpts-status ${x.status==='selesai'?'ready':'pending'}">${x.status==='selesai'?'SELESAI':'BELUM SELESAI'}</span></td><td class="akpts-time">${fmtTime(x.last_update)}</td><td class="akpts-missing">${x.missing_assignments?.length?E(x.missing_assignments.slice(0,5).join(' · '))+(x.missing_assignments.length>5?` +${x.missing_assignments.length-5}`:''):'—'}</td><td><div class="akpts-sub">Semua mapel/kelas minimal 2 TP terisi penuh.</div></td></tr>`).join('');
  }
  function walasRows(){
    const rows=data?.walas||[];
    if(!rows.length)return '<tr><td colspan="8"><div class="akpts-empty">Belum ada data wali kelas.</div></td></tr>';
    return rows.map(x=>`<tr><td><b>${E(x.teacher_name)}</b><div class="akpts-sub">${E(x.class_name)}</div></td><td>${check(x.components?.reward)}</td><td>${check(x.components?.discipline)}</td><td>${check(x.components?.activity)}</td><td>${check(x.components?.attendance)}</td><td>${check(x.components?.extracurricular)}</td><td>${ratio(x.done_components,x.total_components)}</td><td><span class="akpts-status ${x.status==='selesai'?'ready':'pending'}">${x.status==='selesai'?'SELESAI':'BELUM SELESAI'}</span></td></tr>`).join('');
  }
  function tahfizhRows(){
    const rows=data?.tahfizh_teachers||[];
    if(!rows.length)return '<tr><td colspan="6"><div class="akpts-empty">Belum ada data guru halaqah.</div></td></tr>';
    return rows.map(x=>`<tr><td><b>${E(x.teacher_name)}</b></td><td>${E((x.classes||[]).join(', ')||'—')}</td><td>${ratio(x.complete_students,x.total_students)}</td><td><span class="akpts-status ${x.status==='selesai'?'ready':'pending'}">${x.status==='selesai'?'SELESAI':'BELUM SELESAI'}</span></td><td class="akpts-time">${fmtTime(x.last_update)}</td><td><div class="akpts-sub">Lengkap bila seluruh komponen PTS Tahfizh siswa terisi.</div></td></tr>`).join('');
  }
  function table(){
    if(!data)return `<div class="akpts-loading">Memuat data kesiapan Rapor PTS...</div>`;
    if(tab==='academic')return `<div class="akpts-wrap"><table class="akpts-table" style="min-width:900px"><thead><tr><th>Guru Mapel</th><th>Penugasan Siap</th><th>Status</th><th>Update Terakhir</th><th>Yang Belum</th><th>Ketentuan</th></tr></thead><tbody>${academicRows()}</tbody></table></div>`;
    if(tab==='walas')return `<div class="akpts-wrap"><table class="akpts-table" style="min-width:900px"><thead><tr><th>Wali Kelas</th><th>Reward</th><th>Kedisiplinan</th><th>Kegiatan</th><th>Absensi</th><th>Ekskul</th><th>Progres</th><th>Status</th></tr></thead><tbody>${walasRows()}</tbody></table></div>`;
    if(tab==='tahfizh')return `<div class="akpts-wrap"><table class="akpts-table" style="min-width:850px"><thead><tr><th>Guru Halaqah</th><th>Kelas</th><th>Siswa Lengkap</th><th>Status</th><th>Update Terakhir</th><th>Ketentuan</th></tr></thead><tbody>${tahfizhRows()}</tbody></table></div>`;
    return `<div class="akpts-wrap"><table class="akpts-table"><thead><tr><th>Kelas</th><th>Walas</th><th>Nilai ≥2 TP</th><th>Reward</th><th>Kedisiplinan</th><th>Kegiatan</th><th>Absensi</th><th>Tahfizh</th><th>Ekskul</th><th>Status Rapor</th><th>Yang Belum</th></tr></thead><tbody>${classesRows()}</tbody></table></div>`;
  }

  function ensureBox(){
    if(!isAcademic())return null;
    const root=dashboardRoot();if(!root)return null;
    css();
    let box=document.getElementById('akpts-live');
    if(box&&root.contains(box))return box;
    if(box)box.remove();
    box=document.createElement('section');box.id='akpts-live';
    const anchor=root.querySelector('.ak7-kpis');
    if(anchor)anchor.insertAdjacentElement('afterend',box);else root.prepend(box);
    return box;
  }
  function render(){
    const box=ensureBox();if(!box)return;
    const s=data?.summary||{};
    const period=data?.attendance_period||{};
    const generated=data?.generated_at?fmtTime(data.generated_at):'menunggu data';
    box.innerHTML=`
      <div class="akpts-hero"><div><div class="akpts-title">Live Readiness Rapor PTS</div><div class="akpts-subtitle">Kabid Akademik · kesiapan sampai rapor siap dibagikan ke orang tua · otomatis diperbarui setiap 30 detik · sinkron ${generated}</div></div><button class="akpts-refresh" onclick="akPtsRefresh()">↻ Perbarui</button></div>
      ${lastError?`<div class="akpts-error">⚠ ${E(lastError)}</div>`:''}
      <div class="akpts-kpis">
        <div class="akpts-kpi blue"><strong>${E(s.classes_ready||0)} / ${E(s.classes||0)}</strong><span>Kelas siap dibagikan</span><small>Semua komponen PTS lengkap</small></div>
        <div class="akpts-kpi green"><strong>${E(s.academic_teachers_done||0)} / ${E(s.academic_teachers||0)}</strong><span>Guru mapel selesai</span><small>Minimal 2 TP lengkap</small></div>
        <div class="akpts-kpi gold"><strong>${E(s.walas_done||0)} / ${E(s.walas||0)}</strong><span>Wali kelas selesai</span><small>Reward · disiplin · kegiatan · absen · ekskul</small></div>
        <div class="akpts-kpi purple"><strong>${E(s.tahfizh_teachers_done||0)} / ${E(s.tahfizh_teachers||0)}</strong><span>Tahfizh selesai</span><small>Input PTS halaqah lengkap</small></div>
      </div>
      <div class="akpts-toolbar">
        <div class="akpts-tabs">
          <button class="akpts-tab ${tab==='classes'?'on':''}" onclick="akPtsTab('classes')">Per Kelas</button>
          <button class="akpts-tab ${tab==='academic'?'on':''}" onclick="akPtsTab('academic')">Guru Mapel</button>
          <button class="akpts-tab ${tab==='walas'?'on':''}" onclick="akPtsTab('walas')">Wali Kelas</button>
          <button class="akpts-tab ${tab==='tahfizh'?'on':''}" onclick="akPtsTab('tahfizh')">Tahfizh</button>
        </div>
        ${tab==='classes'?`<div class="akpts-filter"><button class="${classFilter==='all'?'on':''}" onclick="akPtsFilter('all')">Semua</button><button class="${classFilter==='ready'?'on':''}" onclick="akPtsFilter('ready')">Siap</button><button class="${classFilter==='pending'?'on':''}" onclick="akPtsFilter('pending')">Belum Siap</button></div>`:''}
      </div>
      ${table()}
      <div class="akpts-note">Periode absensi: ${E(period.start||'—')} s.d. ${E(period.end||'—')}. Jika Reward/Kedisiplinan bernilai 0, sistem menandainya perlu konfirmasi nihil agar tidak salah menganggap data sudah selesai.</div>`;
  }

  async function load(force=false){
    if(!isAcademic()||busy)return;
    render();
    if(!force&&data&&Date.now()-lastLoad<REFRESH_MS)return;
    busy=true;lastError='';
    try{data=await api();lastLoad=Date.now();lastError='';}
    catch(e){lastError=e?.message||'Gagal memuat data Live Readiness Rapor PTS';console.warn('Academic PTS readiness:',e);}
    finally{busy=false;render();}
  }

  window.akPtsTab=t=>{tab=String(t||'classes');render();};
  window.akPtsFilter=f=>{classFilter=String(f||'all');render();};
  window.akPtsRefresh=()=>load(true);

  function tick(){
    if(!isAcademic()||!dashboardVisible())return;
    ensureBox();
    if(!data||Date.now()-lastLoad>=REFRESH_MS)load();
    else if(!document.getElementById('akpts-live'))render();
  }

  function install(){
    tick();
    const content=document.getElementById('content');
    if(content&&!content.__akPtsObserver){
      content.__akPtsObserver=1;
      new MutationObserver(()=>{
        if(!isAcademic()||!dashboardVisible())return;
        /* Only restore this widget if another module actually removed it.
           Do not tick on every dashboard child mutation. */
        if(!document.getElementById('akpts-live'))setTimeout(tick,250);
      }).observe(content,{childList:true,subtree:false});
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,450));else setTimeout(install,450);
  /* One cadence for Academic live UI. The former 2s watchdog plus MutationObserver
     could repeatedly re-enter render paths and make the dashboard appear to blink. */
  setInterval(tick,30000);
})();