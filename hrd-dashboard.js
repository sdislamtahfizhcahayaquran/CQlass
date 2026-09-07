/* CQlass HRD — Teacher Performance Intelligence */
(function(){
  const HRD_URL=SUPABASE_URL+'/functions/v1/hrd-performance';
  const state={period:'month',data:null,query:''};
  const esc=v=>escapeHtml(String(v==null?'':v));
  const num=v=>v==null||v===''?'—':Number(v).toLocaleString('id-ID',{maximumFractionDigits:1});
  const per=v=>v==null?'—':num(v)+'%';
  const low=v=>String(v||'').trim().toLowerCase();

  if(typeof normalizeAuthUser==='function'){
    const baseNormalize=normalizeAuthUser;
    normalizeAuthUser=function(user){
      const x=baseNormalize(user);
      const rawRoles=[...(Array.isArray(user?.roles)?user.roles:[]),user?.role,user?.primary_role,user?.role_code].map(low);
      if(low(x.username)==='hrd'||rawRoles.includes('hrd')){
        x.role='hrd';
        x.roles=[...new Set([...(Array.isArray(x.roles)?x.roles:[]),'hrd'])];
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

  async function api(payload){
    const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),40000);
    try{
      const res=await fetch(HRD_URL,{method:'POST',headers:{'Content-Type':'application/json','apikey':SUPABASE_PUBLISHABLE_KEY,'Authorization':'Bearer '+SUPABASE_PUBLISHABLE_KEY,'x-session-token':getAuthToken()},body:JSON.stringify(payload||{}),signal:ctrl.signal});
      const raw=await res.text();let d={};try{d=raw?JSON.parse(raw):{}}catch(_){throw new Error('Respons HRD tidak valid.');}
      if(!res.ok||d.success===false)throw new Error(d.error==='forbidden'?'Akses HRD tidak diizinkan.':(d.message||d.error||'Gagal memuat data HRD.'));
      return d;
    }catch(e){if(e?.name==='AbortError')throw new Error('Dashboard HRD terlalu lama merespons.');throw e}
    finally{clearTimeout(timer)}
  }

  function statusBadge(s){s=s||{key:'data',label:'Data awal'};return '<span class="hrd-badge '+esc(s.key||'data')+'">'+esc(s.label||'Data awal')+'</span>'}
  function ring(v,large){const n=v==null?0:Math.max(0,Math.min(100,Number(v)));return '<div class="hrd-ring'+(large?' large':'')+'" style="--v:'+n+'"><b>'+(v==null?'—':Math.round(n))+'</b></div>'}
  function kpi(label,value,sub){return '<div class="hrd-kpi"><span>'+esc(label)+'</span><strong>'+esc(value)+'</strong><small>'+esc(sub||'')+'</small></div>'}
  function dimBar(label,v){return '<div class="hrd-dim"><span>'+esc(label)+'</span><em><i style="width:'+Math.max(0,Math.min(100,Number(v||0)))+'%"></i></em><b>'+esc(v==null?'—':Math.round(v))+'</b></div>'}
  function metric(v,label){return '<div class="hrd-metric"><b>'+esc(v)+'</b><span>'+esc(label)+'</span></div>'}

  function renderHRDDashboard(content){
    content.innerHTML='<div class="hrd-shell" id="hrd-root"><div class="hrd-loading"><span class="spinner"></span> Menyusun Teacher Performance Intelligence...</div></div>';
    loadHRD();
  }

  async function loadHRD(){
    const root=document.getElementById('hrd-root');if(!root)return;
    try{state.data=await api({action:'summary',period:state.period});draw();}
    catch(e){root.innerHTML='<div class="hrd-board"><div class="hrd-empty"><b>Dashboard HRD belum dapat dimuat</b><br><span>'+esc(e.message||'Terjadi kendala')+'</span></div></div>';}
  }

  function draw(){
    const root=document.getElementById('hrd-root'),d=state.data;if(!root||!d)return;
    const s=d.summary||{},p=d.period||{};
    root.innerHTML=''
      +'<section class="hrd-hero"><div class="hrd-eyebrow">HRD // Teacher Performance Intelligence</div><h1>Performa Guru 360°</h1><p>Highlight seluruh lini laporan guru yang sudah tercatat di CQlass. Indeks hanya memakai dimensi yang memiliki bukti data; modul yang belum digunakan tidak menurunkan skor guru.</p><div class="hrd-live"><i></i> LIVE DATA · '+esc(p.label||'Periode aktif')+'</div></section>'
      +'<section class="hrd-kpis">'
      +kpi('Guru Aktif',num(s.teachers),'profil guru terpantau')
      +kpi('Rata-rata Indeks',num(s.average_score),'dari guru yang punya data')
      +kpi('Coverage Layak',per(s.data_coverage_pct),'confidence ≥ 35%')
      +kpi('Highlight Unggul',num(s.excellent),'indeks ≥ 90')
      +kpi('Perlu Perhatian',num(s.attention),'berdasarkan data yang tersedia')
      +'</section>'
      +'<section class="hrd-toolbar"><div class="hrd-search"><input id="hrd-search" autocomplete="off" placeholder="Cari nama guru, username, posisi, atau kelas..." value="'+esc(state.query)+'"></div><div class="hrd-period">'+[['week','Pekan'],['month','Bulan'],['semester','Semester'],['year','Tahun']].map(x=>'<button class="'+(state.period===x[0]?'active':'')+'" onclick="hrdSetPeriod(\''+x[0]+'\')">'+x[1]+'</button>').join('')+'</div></section>'
      +'<section class="hrd-board"><div class="hrd-board-head"><div><h2>Teacher Performance Matrix</h2><p>'+esc(p.start||'')+' s.d. '+esc(p.end||'')+' · klik nama guru untuk membuka detail semua lini.</p></div><div class="hrd-legend">Indeks = gabungan dimensi yang memiliki denominator data<br>Confidence = seberapa banyak dimensi penilaian yang sudah tersedia</div></div><div id="hrd-table-holder"></div></section>'
      +'<div class="hrd-detail" id="hrd-detail" onclick="if(event.target===this)hrdCloseDetail()"><div class="hrd-detail-card"><div class="hrd-detail-top"><div><h3 id="hrd-detail-name">Detail Guru</h3><p id="hrd-detail-meta"></p></div><button class="hrd-close" onclick="hrdCloseDetail()">×</button></div><div class="hrd-detail-body" id="hrd-detail-body"></div></div></div>';
    document.getElementById('hrd-search')?.addEventListener('input',e=>{state.query=e.target.value||'';renderTable()});
    renderTable();
  }

  function filtered(){
    const q=low(state.query);return (state.data?.teachers||[]).filter(t=>!q||[t.name,t.username,t.position,(t.classes||[]).join(' ')].some(v=>low(v).includes(q)));
  }

  function renderTable(){
    const box=document.getElementById('hrd-table-holder');if(!box)return;const rows=filtered();
    if(!rows.length){box.innerHTML='<div class="hrd-empty">Tidak ada guru yang cocok dengan pencarian.</div>';return;}
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

  function openDetail(id){
    const t=(state.data?.teachers||[]).find(x=>x.teacher_id===id);if(!t)return;
    const modal=document.getElementById('hrd-detail'),body=document.getElementById('hrd-detail-body');if(!modal||!body)return;
    document.getElementById('hrd-detail-name').textContent=t.name||'Detail Guru';document.getElementById('hrd-detail-meta').textContent=[t.position,t.username,t.classes?.join(', ')].filter(Boolean).join(' · ')||'Profil guru';
    const a=t.academic||{},th=t.tahfizh||{},r=t.reporting||{},ts=t.timesheet||{},c=t.contributions||{};
    body.innerHTML='<div class="hrd-detail-grid"><section class="hrd-panel"><h4>Performance Signal</h4><div class="hrd-bigscore">'+ring(t.score,true)+'<div><strong>'+esc(t.score==null?'Belum cukup data':num(t.score))+'</strong><span>'+statusBadge(t.status)+' · confidence '+esc(t.confidence)+'%</span></div></div>'+(t.dimensions||[]).map(x=>dimBar(x.label,x.score)).join('')+(!(t.dimensions||[]).length?'<div class="hrd-empty">Belum ada dimensi dengan denominator yang dapat dihitung.</div>':'')+'<div class="hrd-source-note">Performance Index bukan penilaian personal. Nilai ini membaca kelengkapan/keterlaksanaan yang memiliki denominator jelas di CQlass dan otomatis mengabaikan lini yang belum memiliki data.</div></section>'
      +'<section class="hrd-panel"><h4>Stat Highlight</h4>'+highlights(t).map(x=>'<div class="hrd-flag"><div>✦</div><div><b>'+esc(x[0])+'</b><span>'+esc(x[1])+'</span></div></div>').join('')+'</section></div>'
      +'<div class="hrd-detail-grid" style="margin-top:16px"><section class="hrd-panel"><h4>Akademik & Tahfizh</h4><div class="hrd-metric-grid">'+metric(num(a.assignments),'Penugasan mapel')+metric(per(a.coverage_pct),'Coverage penugasan bernilai')+metric(num(a.score_count),'Nilai terinput')+metric(num(a.students),'Siswa bernilai')+metric(num(a.average_score),'Rata-rata nilai siswa')+metric(num(th.rows),'Baris tahfizh bulanan')+metric(num(th.assignments),'Penugasan tahfizh')+metric(per(th.coverage_pct),'Coverage tahfizh')+'</div></section>'
      +'<section class="hrd-panel"><h4>RPP, LP & Tugas Harian</h4><div class="hrd-metric-grid">'+metric(num(r.rpp_uploads),'RPP terunggah')+metric(num(r.lp_items),'Item LP')+metric(per(r.lp_progress_avg),'Rata-rata progres LP')+metric(num(r.tasks_done),'Tugas selesai')+metric(num(r.tasks_total),'Tugas tercatat')+metric(per(r.task_completion_pct),'Ketuntasan tugas')+'</div></section></div>'
      +'<div class="hrd-detail-grid" style="margin-top:16px"><section class="hrd-panel"><h4>Timesheet & Kehadiran Kegiatan</h4><div class="hrd-metric-grid">'+metric(num(ts.teaching_entries),'Entry mengajar')+metric(num(ts.teaching_jp),'Total JP')+metric(num(ts.activities),'Aktivitas kerja')+metric(num(ts.events),'Event tercatat')+metric(per(ts.event_attendance_pct),'Kehadiran event')+'</div></section>'
      +'<section class="hrd-panel"><h4>Kontribusi Lintas Lini</h4><div class="hrd-metric-grid">'+metric(num(c.morning_talk),'Morning Talk')+metric(num(c.pjbl),'PjBL')+metric(num(c.activities),'Laporan kegiatan')+metric(num(c.extracurricular_sessions),'Pertemuan ekskul')+metric(num(c.extracurricular_assessments),'Penilaian ekskul')+metric(num(c.total),'Total evidence')+'</div></section></div>';
    modal.classList.add('open');document.body.style.overflow='hidden';
  }
  function closeDetail(){document.getElementById('hrd-detail')?.classList.remove('open');document.body.style.overflow='';}
  function setPeriod(v){if(!['week','month','semester','year'].includes(v))return;state.period=v;const root=document.getElementById('hrd-root');if(root)root.innerHTML='<div class="hrd-loading"><span class="spinner"></span> Memperbarui periode HRD...</div>';loadHRD();}

  window.hrdOpenDetail=openDetail;window.hrdCloseDetail=closeDetail;window.hrdSetPeriod=setPeriod;
})();
