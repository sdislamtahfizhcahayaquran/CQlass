/* CQlass HRD — Performance + Administrative Completeness */
(function(){
  const PERF_URL=SUPABASE_URL+'/functions/v1/hrd-performance';
  const ADMIN_URL=SUPABASE_URL+'/functions/v1/hrd-administration';
  const nowJkt=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const today=nowJkt(),monthStart=today.slice(0,8)+'01';
  const state={tab:'administration',period:'month',perf:null,admin:null,query:'',start:monthStart,end:today,category:'all'};
  const esc=v=>typeof escapeHtml==='function'?escapeHtml(String(v==null?'':v)):String(v==null?'':v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const num=v=>v==null||v===''?'—':Number(v).toLocaleString('id-ID',{maximumFractionDigits:1});
  const per=v=>v==null?'—':num(v)+'%';
  const low=v=>String(v||'').trim().toLowerCase();
  const fmtDate=v=>{if(!v)return '—';const d=String(v).slice(0,10);try{return new Intl.DateTimeFormat('id-ID',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(d+'T00:00:00+07:00'))}catch{return d}};
  const fmtDateTime=v=>{if(!v)return '—';try{return new Intl.DateTimeFormat('id-ID',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',timeZone:'Asia/Jakarta'}).format(new Date(v))}catch{return String(v)}};
  const fmtSize=n=>{n=Number(n)||0;if(!n)return '';if(n<1024)return n+' B';if(n<1048576)return (n/1024).toFixed(1)+' KB';return (n/1048576).toFixed(1)+' MB'};
  const iconStatus=s=>({present:'✅',missing:'❌',partial:'⚠️',na:'—',contextual:'ℹ️',separate:'◎'}[s]||'•');
  const statusLabel=s=>({present:'Ada laporan',missing:'Belum Mengerjakan',partial:'Sebagian',na:'Tidak Berlaku',contextual:'Info Kontekstual',separate:'Terpisah'}[s]||s||'—');
  const granLabel=g=>({lp_period:'Periode LP',daily:'Harian',monthly:'Bulanan',semester:'Semester'}[g]||g||'—');

  function injectAdminStyle(){
    if(document.getElementById('hrd-admin-v2-style'))return;
    const st=document.createElement('style');st.id='hrd-admin-v2-style';st.textContent=`
      .hrd-navtabs{display:flex;gap:6px;width:max-content;max-width:100%;padding:5px;background:#eaf4f3;border:1px solid #d5e7e5;border-radius:16px;overflow:auto}
      .hrd-navtabs button{border:0;background:transparent;color:#587272;font-weight:800;padding:10px 15px;border-radius:11px;cursor:pointer;white-space:nowrap}
      .hrd-navtabs button.active{background:#fff;color:var(--cq-deeper,#064a4a);box-shadow:0 4px 14px rgba(10,80,80,.09)}
      .hrd-admin-hero{background:linear-gradient(135deg,var(--cq-deeper,#064a4a),var(--cq-teal,#0A6E6E) 58%,#208e82)}
      .hrd-admin-toolbar{align-items:flex-end}.hrd-date-field{display:grid;gap:5px;min-width:145px}.hrd-date-field label{font-size:10px;text-transform:uppercase;letter-spacing:.07em;font-weight:850;color:#6f8585}
      .hrd-date-field input,.hrd-date-field select{height:42px;border:1px solid #d6e6e6;background:#f9fcfc;border-radius:12px;padding:0 11px;color:#173535;font:inherit;outline:none}
      .hrd-cat-field{min-width:190px}.hrd-apply,.hrd-link-btn,.hrd-download{height:42px;border:0;border-radius:12px;background:var(--cq-teal,#0A6E6E);color:#fff;padding:0 15px;font-weight:800;cursor:pointer}
      .hrd-link-btn{height:34px;background:#e8f4f3;color:#0a6763;padding:0 11px}.hrd-download{height:34px;flex:0 0 auto}.hrd-download:disabled{opacity:.55;cursor:wait}
      .hrd-granularity-note{padding:12px 14px;border:1px solid #d7e8e6;background:#f2f9f8;border-radius:15px;color:#5f7777;font-size:11px;line-height:1.55}
      .hrd-priority-board{border-color:#eadfd2}.hrd-priority-table{min-width:820px}.hrd-priority-table tbody tr{cursor:default}
      .hrd-issue-count{display:inline-grid;place-items:center;min-width:32px;height:32px;border-radius:10px;background:#fdebea;color:#9d3a34;font-weight:900}
      .hrd-admin-cards{padding:16px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;background:#f7fbfa}
      .hrd-admin-card{background:#fff;border:1px solid #dce9e8;border-radius:18px;padding:15px;box-shadow:0 6px 20px rgba(22,75,75,.05);transition:.25s}
      .hrd-admin-card.pulse{box-shadow:0 0 0 4px rgba(10,110,110,.18),0 14px 32px rgba(22,75,75,.1);transform:translateY(-2px)}
      .hrd-admin-card-head{display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:13px}.hrd-card-issue{font-size:11px;font-weight:850;border-radius:999px;padding:6px 9px;white-space:nowrap}.hrd-card-issue.bad{background:#fdebea;color:#9d3a34}.hrd-card-issue.ok{background:#e6f7ee;color:#177145}
      .hrd-chip-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.hrd-admin-chip{border:1px solid #dfe9e8;background:#fbfdfd;border-radius:14px;padding:11px;text-align:left;cursor:pointer;min-height:82px;color:#244343;transition:.16s}
      .hrd-admin-chip:hover{transform:translateY(-1px);box-shadow:0 5px 16px rgba(20,75,75,.07)}.hrd-admin-chip.present{border-color:#bfe4d1;background:#f4fbf7}.hrd-admin-chip.missing{border-color:#efcecb;background:#fff8f7}.hrd-admin-chip.partial{border-color:#ead9a8;background:#fffaf0}.hrd-admin-chip.na{opacity:.66;background:#f4f6f6}.hrd-admin-chip.contextual,.hrd-admin-chip.separate{border-style:dashed;background:#f8fbfb}
      .hrd-chip-top{display:flex;justify-content:space-between;gap:8px;align-items:flex-start}.hrd-chip-top b{font-size:12px}.hrd-chip-top span{font-size:9px;font-weight:850;white-space:nowrap}.hrd-chip-meta{font-size:10px;color:#708787;margin-top:9px}.hrd-chip-meta strong{font-size:16px;color:#214343}.hrd-chip-foot{font-size:9px;color:#738888;margin-top:5px}
      .hrd-context-title{font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:#829494;font-weight:800;margin:13px 0 7px}.hrd-chip-grid.context{grid-template-columns:repeat(2,minmax(0,1fr))}
      .hrd-detail-status{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;padding:12px 13px;border-radius:14px;margin-bottom:12px;background:#f4f8f8}.hrd-detail-status b{font-size:12px}.hrd-detail-status span{font-size:10px;color:#6c8282;max-width:65%;line-height:1.5}.hrd-detail-status.present{background:#eff9f4}.hrd-detail-status.missing{background:#fff3f2}.hrd-detail-status.partial{background:#fff8e9}
      .hrd-admin-mini{font-size:11px;color:#617979;padding:8px 0;border-bottom:1px dashed #e3eceb}.hrd-item-list{display:grid;gap:8px;margin-top:12px}.hrd-item{display:flex;justify-content:space-between;gap:12px;align-items:center;border:1px solid #e0ebea;background:#fbfdfd;border-radius:13px;padding:11px 12px}.hrd-item-main{min-width:0}.hrd-item-main b{display:block;font-size:12px;color:#234141}.hrd-item-main span{display:block;font-size:10px;color:#6b8383;margin-top:3px;line-height:1.45}.hrd-item-main small{display:block;font-size:9px;color:#8a9b9b;margin-top:5px}
      .hrd-small-empty{padding:20px}.hrd-halaqah-list{display:grid;gap:12px;margin-top:12px}.hrd-halaqah{border:1px solid #dce9e8;border-radius:15px;padding:12px;background:#fbfdfd}.hrd-halaqah-head{display:flex;justify-content:space-between;gap:10px;align-items:center}.hrd-halaqah-head b{font-size:13px}.hrd-halaqah-head small{display:block;color:#7b9090;font-size:10px;margin-top:3px}.hrd-admin-state{font-size:10px;font-weight:850;border-radius:999px;padding:6px 8px}.hrd-admin-state.present{background:#e6f7ee;color:#177145}.hrd-admin-state.missing{background:#fdebea;color:#9d3a34}
      @media(max-width:1000px){.hrd-admin-cards{grid-template-columns:1fr}.hrd-admin-toolbar .hrd-search{flex-basis:100%}}
      @media(max-width:620px){.hrd-navtabs{width:100%}.hrd-navtabs button{flex:1}.hrd-admin-toolbar>*{width:100%;min-width:0}.hrd-admin-cards{padding:10px}.hrd-chip-grid,.hrd-chip-grid.context{grid-template-columns:1fr}.hrd-admin-card-head{align-items:flex-start}.hrd-item{align-items:flex-start;flex-direction:column}.hrd-download{width:100%}.hrd-detail-status{flex-direction:column}.hrd-detail-status span{max-width:none}}
    `;document.head.appendChild(st);
  }

  if(typeof normalizeAuthUser==='function'){
    const baseNormalize=normalizeAuthUser;
    normalizeAuthUser=function(user){
      const x=baseNormalize(user);
      const rawRoles=[...(Array.isArray(user?.roles)?user.roles:[]),user?.role,user?.primary_role,user?.role_code].map(low);
      if(low(x.username)==='hrd'||rawRoles.includes('hrd')){
        x.role='hrd';x.roles=[...new Set([...(Array.isArray(x.roles)?x.roles:[]),'hrd'])];
      }
      return x;
    };
  }

  if(typeof DASHBOARD_MODULE!=='undefined'){
    if(!DASHBOARD_MODULE.roles.includes('hrd'))DASHBOARD_MODULE.roles.push('hrd');
    const baseRender=DASHBOARD_MODULE.render;
    DASHBOARD_MODULE.render=function(content){
      if(currentUser&&currentUser.role==='hrd')return renderHRDDashboard(content);
      return baseRender(content);
    };
  }

  async function api(url,payload){
    const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),50000);
    try{
      const res=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json','apikey':SUPABASE_PUBLISHABLE_KEY,'Authorization':'Bearer '+SUPABASE_PUBLISHABLE_KEY,'x-session-token':getAuthToken()},body:JSON.stringify(payload||{}),signal:ctrl.signal});
      const raw=await res.text();let d={};try{d=raw?JSON.parse(raw):{}}catch(_){throw new Error('Respons HRD tidak valid.')}
      if(!res.ok||d.success===false)throw new Error(d.error==='forbidden'?'Akses HRD tidak diizinkan.':(d.message||d.error||'Gagal memuat data HRD.'));
      return d;
    }catch(e){if(e?.name==='AbortError')throw new Error('Layanan HRD terlalu lama merespons.');throw e}
    finally{clearTimeout(timer)}
  }
  const perfApi=p=>api(PERF_URL,p);
  const adminApi=p=>api(ADMIN_URL,p);

  function statusBadge(s){s=s||{key:'data',label:'Data awal'};return '<span class="hrd-badge '+esc(s.key||'data')+'">'+esc(s.label||'Data awal')+'</span>'}
  function ring(v,large){const n=v==null?0:Math.max(0,Math.min(100,Number(v)));return '<div class="hrd-ring'+(large?' large':'')+'" style="--v:'+n+'"><b>'+(v==null?'—':Math.round(n))+'</b></div>'}
  function kpi(label,value,sub){return '<div class="hrd-kpi"><span>'+esc(label)+'</span><strong>'+esc(value)+'</strong><small>'+esc(sub||'')+'</small></div>'}
  function dimBar(label,v){return '<div class="hrd-dim"><span>'+esc(label)+'</span><em><i style="width:'+Math.max(0,Math.min(100,Number(v||0)))+'%"></i></em><b>'+esc(v==null?'—':Math.round(v))+'</b></div>'}
  function metric(v,label){return '<div class="hrd-metric"><b>'+esc(v)+'</b><span>'+esc(label)+'</span></div>'}
  function navTabs(){
    return '<section class="hrd-navtabs">'
      +'<button class="'+(state.tab==='administration'?'active':'')+'" onclick="hrdSwitchTab(\'administration\')">Kelengkapan Administrasi</button>'
      +'<button class="'+(state.tab==='performance'?'active':'')+'" onclick="hrdSwitchTab(\'performance\')">Performance</button>'
      +'</section>';
  }

  function renderHRDDashboard(content){
    injectAdminStyle();
    content.innerHTML='<div class="hrd-shell" id="hrd-root"><div class="hrd-loading"><span class="spinner"></span> Menyiapkan dashboard HRD...</div></div>';
    loadActive();
  }
  function loadActive(){return state.tab==='performance'?loadPerformance():loadAdministration()}

  async function loadPerformance(){
    const root=document.getElementById('hrd-root');if(!root)return;
    root.innerHTML=navTabs()+'<div class="hrd-loading"><span class="spinner"></span> Menyusun Teacher Performance Intelligence...</div>';
    try{state.perf=await perfApi({action:'summary',period:state.period});drawPerformance()}
    catch(e){root.innerHTML=navTabs()+'<div class="hrd-board"><div class="hrd-empty"><b>Dashboard Performance belum dapat dimuat</b><br><span>'+esc(e.message||'Terjadi kendala')+'</span></div></div>'}
  }

  function drawPerformance(){
    const root=document.getElementById('hrd-root'),d=state.perf;if(!root||!d)return;
    const s=d.summary||{},p=d.period||{};
    root.innerHTML=navTabs()
      +'<section class="hrd-hero"><div class="hrd-eyebrow">HRD // Teacher Performance Intelligence</div><h1>Performa Guru 360°</h1><p>Performance membaca indikator kualitas/keterlaksanaan yang punya denominator data. Kelengkapan administrasi dipisahkan di tab tersendiri dan tidak mengubah badge Performance.</p><div class="hrd-live"><i></i> LIVE DATA · '+esc(p.label||'Periode aktif')+'</div></section>'
      +'<section class="hrd-kpis">'+kpi('Guru Aktif',num(s.teachers),'profil guru terpantau')+kpi('Rata-rata Indeks',num(s.average_score),'dari guru yang punya data')+kpi('Coverage Layak',per(s.data_coverage_pct),'confidence ≥ 35%')+kpi('Highlight Unggul',num(s.excellent),'indeks ≥ 90')+kpi('Perlu Perhatian',num(s.attention),'berdasarkan data yang tersedia')+'</section>'
      +'<section class="hrd-toolbar"><div class="hrd-search"><input id="hrd-search" autocomplete="off" placeholder="Cari nama guru, username, posisi, atau kelas..." value="'+esc(state.query)+'"></div><div class="hrd-period">'+[['week','Pekan'],['month','Bulan'],['semester','Semester'],['year','Tahun']].map(x=>'<button class="'+(state.period===x[0]?'active':'')+'" onclick="hrdSetPeriod(\''+x[0]+'\')">'+x[1]+'</button>').join('')+'</div></section>'
      +'<section class="hrd-board"><div class="hrd-board-head"><div><h2>Teacher Performance Matrix</h2><p>'+esc(p.start||'')+' s.d. '+esc(p.end||'')+' · klik guru untuk detail Performance.</p></div><div class="hrd-legend">Performance ≠ Kelengkapan Administrasi<br>Tab ini tetap memakai logika lama.</div></div><div id="hrd-table-holder"></div></section>'
      +detailShell();
    document.getElementById('hrd-search')?.addEventListener('input',e=>{state.query=e.target.value||'';renderPerformanceTable()});
    renderPerformanceTable();
  }

  function filteredPerformance(){
    const q=low(state.query);return (state.perf?.teachers||[]).filter(t=>!q||[t.name,t.username,t.position,(t.classes||[]).join(' ')].some(v=>low(v).includes(q)));
  }
  function renderPerformanceTable(){
    const box=document.getElementById('hrd-table-holder');if(!box)return;const rows=filteredPerformance();
    if(!rows.length){box.innerHTML='<div class="hrd-empty">Tidak ada guru yang cocok dengan pencarian.</div>';return}
    box.innerHTML='<div class="hrd-tablewrap"><table class="hrd-table"><thead><tr><th>#</th><th>Guru</th><th>Performance Index</th><th>Confidence</th><th>Akademik</th><th>Pelaporan</th><th>Timesheet</th><th>Evidence</th><th>Status</th></tr></thead><tbody>'
      +rows.map((t,i)=>{const rp=t.reporting||{},ts=t.timesheet||{},ac=t.academic||{},ev=t.contributions||{};return '<tr onclick="hrdOpenDetail(\''+esc(t.teacher_id)+'\')"><td class="hrd-rank">'+(i+1)+'</td><td><div class="hrd-teacher"><div class="hrd-avatar">'+esc((t.name||'?').trim().charAt(0).toUpperCase())+'</div><div><b>'+esc(t.name)+'</b><small>'+esc(t.position||t.username||'Guru')+(t.classes?.length?' · '+esc(t.classes.slice(0,2).join(', ')):'')+'</small></div></div></td><td><div class="hrd-score">'+ring(t.score)+'<div><b>'+esc(t.score==null?'Belum cukup data':num(t.score))+'</b><small>'+esc(t.score==null?'menunggu denominator':'indeks data CQlass')+'</small></div></div></td><td><div class="hrd-confidence"><b>'+esc(t.confidence)+'%</b><div class="hrd-mini-track"><i style="width:'+Math.min(100,Number(t.confidence||0))+'%"></i></div></div></td><td>'+(ac.assignments?'<b>'+per(ac.coverage_pct)+'</b><br><small>'+num(ac.assignments_started)+' / '+num(ac.assignments)+' penugasan</small>':'<span class="hrd-dash">—</span>')+'</td><td>'+(rp.tasks_total||rp.lp_items||rp.rpp_uploads?'<b>'+num(rp.tasks_done)+'/'+num(rp.tasks_total)+' tugas</b><br><small>'+num(rp.rpp_uploads)+' RPP · '+num(rp.lp_items)+' LP</small>':'<span class="hrd-dash">Belum ada data</span>')+'</td><td>'+(ts.teaching_entries||ts.activities||ts.events?'<b>'+num(ts.teaching_jp)+' JP</b><br><small>'+num(ts.activities)+' aktivitas · '+num(ts.events)+' event</small>':'<span class="hrd-dash">Belum ada data</span>')+'</td><td><b>'+num(ev.total)+'</b><br><small>jejak kontribusi</small></td><td>'+statusBadge(t.status)+'</td></tr>'}).join('')
      +'</tbody></table></div>';
  }

  function highlights(t){
    const out=[],a=t.academic||{},r=t.reporting||{},ts=t.timesheet||{},c=t.contributions||{},th=t.tahfizh||{};
    if(a.assignments&&a.coverage_pct===100)out.push(['Akademik lengkap','Semua penugasan mapel guru ini sudah memiliki data nilai.']);
    else if(a.assignments&&Number(a.coverage_pct)<70)out.push(['Akademik perlu dilengkapi',per(a.coverage_pct)+' penugasan sudah memiliki data nilai.']);
    if(th.assignments&&th.coverage_pct===100)out.push(['Tahfizh aktif','Semua penugasan tahfizh memiliki bukti data bulanan.']);
    if(r.tasks_total&&r.task_completion_pct===100)out.push(['Tugas harian tuntas','Seluruh tugas harian pada periode ini berstatus selesai.']);
    if(ts.events&&Number(ts.event_attendance_pct)>=95)out.push(['Kehadiran kegiatan kuat',per(ts.event_attendance_pct)+' kehadiran pada event yang tercatat.']);
    if(c.total>0)out.push(['Kontribusi terdokumentasi',num(c.total)+' evidence lintas MT, PjBL, kegiatan, ekskul, RPP, dan tahfizh.']);
    if(!out.length)out.push(['Data masih berkembang','Belum cukup evidence untuk menghasilkan highlight yang kuat pada periode ini.']);
    return out.slice(0,5);
  }
  function openPerformanceDetail(id){
    const t=(state.perf?.teachers||[]).find(x=>x.teacher_id===id);if(!t)return;
    const modal=document.getElementById('hrd-detail'),body=document.getElementById('hrd-detail-body');if(!modal||!body)return;
    document.getElementById('hrd-detail-name').textContent=t.name||'Detail Guru';
    document.getElementById('hrd-detail-meta').textContent=[t.position,t.username,t.classes?.join(', ')].filter(Boolean).join(' · ')||'Profil guru';
    const a=t.academic||{},th=t.tahfizh||{},r=t.reporting||{},ts=t.timesheet||{},c=t.contributions||{};
    body.innerHTML='<div class="hrd-detail-grid"><section class="hrd-panel"><h4>Performance Signal</h4><div class="hrd-bigscore">'+ring(t.score,true)+'<div><strong>'+esc(t.score==null?'Belum cukup data':num(t.score))+'</strong><span>'+statusBadge(t.status)+' · confidence '+esc(t.confidence)+'%</span></div></div>'+(t.dimensions||[]).map(x=>dimBar(x.label,x.score)).join('')+(!(t.dimensions||[]).length?'<div class="hrd-empty">Belum ada dimensi dengan denominator yang dapat dihitung.</div>':'')+'<div class="hrd-source-note">Performance tetap dipisahkan dari pemeriksaan kelengkapan administrasi.</div></section>'
      +'<section class="hrd-panel"><h4>Stat Highlight</h4>'+highlights(t).map(x=>'<div class="hrd-flag"><div>✦</div><div><b>'+esc(x[0])+'</b><span>'+esc(x[1])+'</span></div></div>').join('')+'</section></div>'
      +'<div class="hrd-detail-grid" style="margin-top:16px"><section class="hrd-panel"><h4>Akademik & Tahfizh</h4><div class="hrd-metric-grid">'+metric(num(a.assignments),'Penugasan mapel')+metric(per(a.coverage_pct),'Coverage penugasan bernilai')+metric(num(a.score_count),'Nilai terinput')+metric(num(a.students),'Siswa bernilai')+metric(num(a.average_score),'Rata-rata nilai siswa')+metric(num(th.rows),'Baris tahfizh bulanan')+metric(num(th.assignments),'Penugasan tahfizh')+metric(per(th.coverage_pct),'Coverage tahfizh')+'</div></section>'
      +'<section class="hrd-panel"><h4>RPP, LP & Tugas Harian</h4><div class="hrd-metric-grid">'+metric(num(r.rpp_uploads),'RPP terunggah')+metric(num(r.lp_items),'Item LP')+metric(per(r.lp_progress_avg),'Rata-rata progres LP')+metric(num(r.tasks_done),'Tugas selesai')+metric(num(r.tasks_total),'Tugas tercatat')+metric(per(r.task_completion_pct),'Ketuntasan tugas')+'</div></section></div>'
      +'<div class="hrd-detail-grid" style="margin-top:16px"><section class="hrd-panel"><h4>Timesheet & Kehadiran Kegiatan</h4><div class="hrd-metric-grid">'+metric(num(ts.teaching_entries),'Entry mengajar')+metric(num(ts.teaching_jp),'Total JP')+metric(num(ts.activities),'Aktivitas kerja')+metric(num(ts.events),'Event tercatat')+metric(per(ts.event_attendance_pct),'Kehadiran event')+'</div></section>'
      +'<section class="hrd-panel"><h4>Kontribusi Lintas Lini</h4><div class="hrd-metric-grid">'+metric(num(c.morning_talk),'Morning Talk')+metric(num(c.pjbl),'PjBL')+metric(num(c.activities),'Laporan kegiatan')+metric(num(c.extracurricular_sessions),'Pertemuan ekskul')+metric(num(c.extracurricular_assessments),'Penilaian ekskul')+metric(num(c.total),'Total evidence')+'</div></section></div>';
    openModal();
  }

  async function loadAdministration(){
    const root=document.getElementById('hrd-root');if(!root)return;
    root.innerHTML=navTabs()+'<div class="hrd-loading"><span class="spinner"></span> Menghitung kelengkapan berdasarkan periode laporan...</div>';
    try{state.admin=await adminApi({action:'administration',start:state.start,end:state.end});drawAdministration()}
    catch(e){root.innerHTML=navTabs()+'<div class="hrd-board"><div class="hrd-empty"><b>Kelengkapan administrasi belum dapat dimuat</b><br><span>'+esc(e.message||'Terjadi kendala')+'</span></div></div>'}
  }

  function adminCategoryOptions(){
    const labels={rpp:'RPP',timesheet:'Timesheet / JP',academic:'Capaian & Kognitif',tahfizh:'Tahfizh',bilingual:'Bilingual',pjbl:'PBL / Market Day'};
    return '<option value="all">Semua kategori</option>'+Object.entries(labels).map(([k,v])=>'<option value="'+k+'" '+(state.category===k?'selected':'')+'>'+esc(v)+'</option>').join('');
  }
  function selectedIssue(t){
    if(state.category==='all')return t.missing_count>0||t.partial_count>0;
    const c=(t.categories||[]).find(x=>x.key===state.category);
    return !!c&&c.applicable&&(c.status==='missing'||c.status==='partial');
  }
  function issueText(t){
    if(state.category!=='all'){
      const c=(t.categories||[]).find(x=>x.key===state.category);
      if(!c)return '—';
      if(c.key==='tahfizh'&&c.missing_halaqah)return c.missing_halaqah+' halaqah belum lengkap';
      return statusLabel(c.status);
    }
    const a=[...(t.missing_categories||[])];
    if((t.partial_categories||[]).length)a.push(...t.partial_categories.map(x=>x+' (sebagian)'));
    const th=(t.categories||[]).find(x=>x.key==='tahfizh');
    if(th?.missing_halaqah&&th.status==='partial')a.push(th.missing_halaqah+' halaqah Tahfizh kosong');
    return a.join(', ')||'—';
  }
  function filteredAdminTeachers(){
    const q=low(state.query);
    return (state.admin?.teachers||[]).filter(t=>{
      const search=!q||[t.name,t.username,t.position,(t.classes||[]).join(' ')].some(v=>low(v).includes(q));
      if(!search)return false;
      if(state.category==='all')return true;
      return (t.categories||[]).some(c=>c.key===state.category&&c.applicable);
    });
  }
  function priorityRows(){
    return (state.admin?.teachers||[]).filter(selectedIssue).sort((a,b)=>{
      if(state.category==='tahfizh'){
        const aa=(a.categories||[]).find(x=>x.key==='tahfizh'),bb=(b.categories||[]).find(x=>x.key==='tahfizh');
        return Number(bb?.missing_halaqah||0)-Number(aa?.missing_halaqah||0)||a.name.localeCompare(b.name,'id');
      }
      return Number(b.issue_units||0)-Number(a.issue_units||0)||Number(b.missing_count||0)-Number(a.missing_count||0)||a.name.localeCompare(b.name,'id');
    });
  }
  function drawAdministration(){
    const root=document.getElementById('hrd-root'),d=state.admin;if(!root||!d)return;
    const s=d.summary||{},sp=d.source_period||{};
    root.innerHTML=navTabs()
      +'<section class="hrd-hero hrd-admin-hero"><div class="hrd-eyebrow">HRD // Administrative Completeness</div><h1>Kelengkapan Administrasi Guru</h1><p>Status dihitung dari laporan yang periode cakupannya overlap dengan rentang filter. Aktivitas login/klik tidak dipakai sebagai penentu. Tahfizh selalu diperiksa per halaqah.</p><div class="hrd-live"><i></i> '+esc(fmtDate(state.start))+' — '+esc(fmtDate(state.end))+'</div></section>'
      +'<section class="hrd-kpis">'+kpi('Guru Aktif',num(s.teachers),'guru diperiksa')+kpi('Perlu Ditindaklanjuti',num(s.with_issues),'minimal 1 isu kelengkapan')+kpi('Tanpa Isu',num(s.clean),'pada kategori yang berlaku')+kpi('Kategori Kosong',num(s.missing_category_units),'status Belum Mengerjakan')+kpi('Halaqah Kosong',num(s.missing_halaqah_units),'breakdown Tahfizh')+'</section>'
      +'<section class="hrd-toolbar hrd-admin-toolbar"><div class="hrd-date-field"><label>Dari</label><input type="date" id="hrd-date-start" value="'+esc(state.start)+'"></div><div class="hrd-date-field"><label>Sampai</label><input type="date" id="hrd-date-end" value="'+esc(state.end)+'"></div><button class="hrd-apply" onclick="hrdApplyDate()">Terapkan Periode</button><div class="hrd-date-field hrd-cat-field"><label>Kategori</label><select id="hrd-category" onchange="hrdSetCategory(this.value)">'+adminCategoryOptions()+'</select></div><div class="hrd-search"><input id="hrd-search" autocomplete="off" placeholder="Cari guru..." value="'+esc(state.query)+'"></div></section>'
      +'<div class="hrd-granularity-note"><b>Granularity sumber:</b> RPP = periode LP · Timesheet/PBL = harian · Tahfizh = bulanan · Capaian & Bilingual = semester. Semester operasional '+esc(fmtDate(sp.semester_start))+'–'+esc(fmtDate(sp.semester_end))+(sp.semester_dates_derived?' (diturunkan dari LP karena master semester belum berisi tanggal).':'')+'</div>'
      +'<section class="hrd-board hrd-priority-board"><div class="hrd-board-head"><div><h2>Prioritas: Belum Mengerjakan</h2><p>Diurutkan dari isu terbanyak. Tahfizh yang sebagian lengkap tetap masuk karena ada halaqah yang kosong.</p></div><div class="hrd-legend">'+esc(state.category==='all'?'Semua kategori administratif':'Filter: '+documentCategoryLabel(state.category))+'</div></div><div id="hrd-priority-holder"></div></section>'
      +'<section class="hrd-board"><div class="hrd-board-head"><div><h2>Drill-down Per Guru</h2><p>Klik chip kategori untuk melihat item laporan, periode, tanggal dibuat, dan file RPP.</p></div><div class="hrd-legend">✅ Ada · ❌ Belum · ⚠️ Sebagian</div></div><div id="hrd-admin-cards" class="hrd-admin-cards"></div></section>'
      +detailShell();
    document.getElementById('hrd-search')?.addEventListener('input',e=>{state.query=e.target.value||'';renderPriority();renderAdminCards()});
    renderPriority();renderAdminCards();
  }
  function documentCategoryLabel(key){
    return ({rpp:'RPP',timesheet:'Timesheet / JP',academic:'Capaian & Kognitif',tahfizh:'Tahfizh',bilingual:'Bilingual',pjbl:'PBL / Market Day'}[key]||key);
  }
  function renderPriority(){
    const box=document.getElementById('hrd-priority-holder');if(!box)return;
    let rows=priorityRows();const q=low(state.query);if(q)rows=rows.filter(t=>[t.name,t.username,t.position,(t.classes||[]).join(' ')].some(v=>low(v).includes(q)));
    if(!rows.length){box.innerHTML='<div class="hrd-empty"><b>Tidak ada guru pada daftar prioritas ini.</b><br><span>Artinya tidak ada status ❌/⚠️ untuk filter yang sedang dipilih.</span></div>';return}
    box.innerHTML='<div class="hrd-tablewrap"><table class="hrd-table hrd-priority-table"><thead><tr><th>#</th><th>Guru</th><th>Isu</th><th>Kategori / Halaqah yang perlu dicek</th><th>Aksi</th></tr></thead><tbody>'
      +rows.map((t,i)=>'<tr><td class="hrd-rank">'+(i+1)+'</td><td><div class="hrd-teacher"><div class="hrd-avatar">'+esc((t.name||'?').charAt(0).toUpperCase())+'</div><div><b>'+esc(t.name)+'</b><small>'+esc(t.position||t.username||'Guru')+'</small></div></div></td><td><span class="hrd-issue-count">'+esc(state.category==='all'?String(t.issue_units||t.missing_count||0):'1')+'</span></td><td>'+esc(issueText(t))+'</td><td><button class="hrd-link-btn" onclick="hrdFocusTeacher(\''+esc(t.teacher_id)+'\')">Lihat Guru</button></td></tr>').join('')
      +'</tbody></table></div>';
  }
  function chipHtml(t,c,context=false){
    const last=c.last_created_at?'Terakhir '+fmtDateTime(c.last_created_at):'Belum ada item';
    const count=c.item_count||0;
    return '<button class="hrd-admin-chip '+esc(c.status)+'" onclick="hrdOpenAdminDetail(\''+esc(t.teacher_id)+'\',\''+esc(c.key)+'\', '+(context?'true':'false')+')">'
      +'<div class="hrd-chip-top"><b>'+esc(c.label)+'</b><span>'+iconStatus(c.status)+' '+esc(statusLabel(c.status))+'</span></div>'
      +'<div class="hrd-chip-meta"><strong>'+esc(count)+'</strong> item · '+esc(last)+'</div>'
      +(c.key==='tahfizh'&&c.applicable?'<div class="hrd-chip-foot">'+esc((c.halaqah||[]).length)+' halaqah · '+esc(c.missing_halaqah||0)+' kosong</div>':'')
      +'</button>';
  }
  function renderAdminCards(){
    const box=document.getElementById('hrd-admin-cards');if(!box)return;const rows=filteredAdminTeachers();
    if(!rows.length){box.innerHTML='<div class="hrd-empty">Tidak ada guru yang cocok dengan filter.</div>';return}
    box.innerHTML=rows.map(t=>{
      let cats=(t.categories||[]).filter(c=>state.category==='all'||c.key===state.category);
      const ctx=state.category==='all'?(t.context_categories||[]):[];
      return '<article class="hrd-admin-card" id="hrd-teacher-'+esc(t.teacher_id)+'"><div class="hrd-admin-card-head"><div class="hrd-teacher"><div class="hrd-avatar">'+esc((t.name||'?').charAt(0).toUpperCase())+'</div><div><b>'+esc(t.name)+'</b><small>'+esc([t.position,t.username,(t.classes||[]).slice(0,3).join(', ')].filter(Boolean).join(' · ')||'Guru')+'</small></div></div><div class="hrd-card-issue '+((t.missing_count||t.partial_count)?'bad':'ok')+'">'+((t.missing_count||t.partial_count)?esc((t.issue_units||t.missing_count)+' isu'):'✓ Tidak ada isu')+'</div></div>'
        +'<div class="hrd-chip-grid">'+cats.map(c=>chipHtml(t,c,false)).join('')+'</div>'
        +(ctx.length?'<div class="hrd-context-title">Informasi kontekstual — tidak dihitung sebagai kelengkapan/Performance</div><div class="hrd-chip-grid context">'+ctx.map(c=>chipHtml(t,c,true)).join('')+'</div>':'')
        +'</article>';
    }).join('');
  }

  function detailShell(){return '<div class="hrd-detail" id="hrd-detail" onclick="if(event.target===this)hrdCloseDetail()"><div class="hrd-detail-card"><div class="hrd-detail-top"><div><h3 id="hrd-detail-name">Detail Guru</h3><p id="hrd-detail-meta"></p></div><button class="hrd-close" onclick="hrdCloseDetail()">×</button></div><div class="hrd-detail-body" id="hrd-detail-body"></div></div></div>'}
  function itemRows(items,categoryKey){
    if(!items?.length)return '<div class="hrd-empty hrd-small-empty">Belum ada item laporan yang mencakup periode filter ini.</div>';
    return '<div class="hrd-item-list">'+items.map(x=>'<div class="hrd-item"><div class="hrd-item-main"><b>'+esc(x.title||'Item laporan')+'</b><span>'+esc(x.description||'')+'</span><small>Periode: '+esc(fmtDate(x.period_start))+(x.period_end&&x.period_end!==x.period_start?' s.d. '+esc(fmtDate(x.period_end)):'')+' · dibuat '+esc(fmtDateTime(x.created_at))+'</small></div>'+(categoryKey==='rpp'&&x.submission_id?'<button class="hrd-download" onclick="hrdOpenRppFile(\''+esc(x.submission_id)+'\',this)">Download</button>':'')+'</div>').join('')+'</div>';
  }
  function openAdminDetail(id,key,isContext){
    const t=(state.admin?.teachers||[]).find(x=>x.teacher_id===id);if(!t)return;
    const all=isContext?(t.context_categories||[]):(t.categories||[]);
    const c=all.find(x=>x.key===key);if(!c)return;
    const modal=document.getElementById('hrd-detail'),body=document.getElementById('hrd-detail-body');if(!modal||!body)return;
    document.getElementById('hrd-detail-name').textContent=t.name+' — '+c.label;
    document.getElementById('hrd-detail-meta').textContent=statusLabel(c.status)+' · '+c.item_count+' item · granularity '+granLabel(c.granularity);
    let html='<section class="hrd-panel"><div class="hrd-detail-status '+esc(c.status)+'"><b>'+iconStatus(c.status)+' '+esc(statusLabel(c.status))+'</b><span>'+esc(c.note||'Status mengikuti periode sumber yang tersedia.')+'</span></div>';
    if(c.expected_count!=null)html+='<div class="hrd-admin-mini">Target RPP relevan pada periode ini: <b>'+esc(c.expected_count)+'</b></div>';
    if(c.responsibility_classes?.length)html+='<div class="hrd-admin-mini">Kelas tanggung jawab: <b>'+esc(c.responsibility_classes.join(', '))+'</b></div>';
    if(key==='tahfizh'){
      html+='<div class="hrd-halaqah-list">'+(c.halaqah||[]).map(h=>'<div class="hrd-halaqah"><div class="hrd-halaqah-head"><div><b>'+esc(h.label)+'</b><small>'+esc(h.student_count)+' siswa · '+esc(h.item_count)+' laporan</small></div><span class="hrd-admin-state '+esc(h.status)+'">'+iconStatus(h.status)+' '+esc(statusLabel(h.status))+'</span></div>'+itemRows(h.items,'tahfizh')+'</div>').join('')+'</div>';
    }else html+=itemRows(c.items,key);
    html+='</section>';
    body.innerHTML=html;openModal();
  }
  async function openRppFile(id,btn){
    const old=btn?.textContent;if(btn){btn.disabled=true;btn.textContent='Menyiapkan...'}
    try{const d=await adminApi({action:'rpp_file',submission_id:id});if(!d.url)throw new Error('URL file tidak tersedia.');window.open(d.url,'_blank','noopener')}
    catch(e){if(typeof showToast==='function')showToast(e.message||'Gagal membuka RPP.',true);else alert(e.message||'Gagal membuka RPP.')}
    finally{if(btn){btn.disabled=false;btn.textContent=old||'Download'}}
  }
  function openModal(){document.getElementById('hrd-detail')?.classList.add('open');document.body.style.overflow='hidden'}
  function closeDetail(){document.getElementById('hrd-detail')?.classList.remove('open');document.body.style.overflow=''}

  function switchTab(v){
    if(!['administration','performance'].includes(v)||state.tab===v)return;
    state.tab=v;loadActive();
  }
  function setPeriod(v){if(!['week','month','semester','year'].includes(v))return;state.period=v;loadPerformance()}
  function applyDate(){
    const a=document.getElementById('hrd-date-start')?.value||'',b=document.getElementById('hrd-date-end')?.value||'';
    if(!a||!b||a>b){if(typeof showToast==='function')showToast('Rentang tanggal tidak valid.',true);return}
    state.start=a;state.end=b;state.admin=null;loadAdministration();
  }
  function setCategory(v){state.category=v||'all';renderPriority();renderAdminCards()}
  function focusTeacher(id){
    const el=document.getElementById('hrd-teacher-'+id);if(el){el.scrollIntoView({behavior:'smooth',block:'center'});el.classList.add('pulse');setTimeout(()=>el.classList.remove('pulse'),1300)}
  }

  window.hrdSwitchTab=switchTab;
  window.hrdOpenDetail=openPerformanceDetail;
  window.hrdCloseDetail=closeDetail;
  window.hrdSetPeriod=setPeriod;
  window.hrdApplyDate=applyDate;
  window.hrdSetCategory=setCategory;
  window.hrdOpenAdminDetail=openAdminDetail;
  window.hrdOpenRppFile=openRppFile;
  window.hrdFocusTeacher=focusTeacher;
})();