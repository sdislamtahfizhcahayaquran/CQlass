/* CQlass — Kabid Kegiatan Live Report: ringkas + detail popup */
(function(){
  'use strict';
  if(window.__cqKegiatanLiveReportV3)return;
  window.__cqKegiatanLiveReportV3=true;

  const BASE=(typeof SUPABASE_URL!=='undefined'&&SUPABASE_URL)||'https://lmglkxzemtvxcgktiord.supabase.co';
  const KEY=(typeof SUPABASE_PUBLISHABLE_KEY!=='undefined'&&SUPABASE_PUBLISHABLE_KEY)||'sb_publishable_3HyNVUYXakILMKo2SK-DJw_ka7-Yx93';
  const URLS={activity:BASE+'/functions/v1/activity-report',grades:BASE+'/functions/v1/activity-extracurricular-report-grades'};
  const S={records:[],loaded:false,loading:false,lastSync:null,status:'pending',source:'all',timer:null,gradeSummary:{},gradeGeneratedAt:'',detailKey:''};
  const CAT={MD:'Market Day',NATIVE:'Native Teacher',JUMSIH:'Jumsih',EKSKUL:'Ekskul',JUMAT_BERBAGI:"Jum'at Berbagi",PEKAN_BAHASA:'Pekan Bahasa',TASMI:"Tasmi' Syahriyyah",BUNDAKU_GURUKU:'Bundaku Guruku',LAINNYA:'Kegiatan Lainnya'};
  const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const low=v=>String(v==null?'':v).trim().toLowerCase();
  const role=()=>typeof currentUser!=='undefined'?low(currentUser?.role):'';
  const allowed=()=>['kegiatan','kabid_kegiatan'].includes(role());
  const token=()=>typeof getAuthToken==='function'?getAuthToken():'';
  const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const fmtTime=d=>new Intl.DateTimeFormat('id-ID',{timeZone:'Asia/Jakarta',hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(d||new Date());

  async function request(url,action){
    const t=token();if(!t)throw new Error('Sesi login tidak ditemukan.');
    const ctl=new AbortController(),tm=setTimeout(()=>ctl.abort(),30000);
    try{
      const r=await fetch(url,{method:'POST',cache:'no-store',signal:ctl.signal,headers:{'Content-Type':'application/json','apikey':KEY,'Authorization':'Bearer '+KEY,'x-session-token':t},body:JSON.stringify({action,_ts:Date.now()})});
      const raw=await r.text();let d={};try{d=raw?JSON.parse(raw):{}}catch(_){throw new Error('Respons server tidak valid.')}
      if(!r.ok||d.success===false)throw new Error(d.error||('HTTP '+r.status));return d;
    }finally{clearTimeout(tm)}
  }

  function splitPics(v){const raw=String(v||'').trim();if(!raw)return['PIC belum ditentukan'];const out=raw.split(/\s*(?:&|,|;|\/|\+|\bdan\b)\s*/i).map(x=>x.trim()).filter(Boolean);return[...new Set(out.length?out:[raw])]}
  function getRec(M,name){
    const n=String(name||'').trim()||'Belum ditentukan',k=low(n);
    if(!M.has(k))M.set(k,{key:k,name:n,eventDue:0,eventDone:0,eventPending:0,eventFuture:0,eventPendingItems:[],gradeTotal:0,gradeDone:0,gradePending:0,gradeStartedPending:0,gradeNotStarted:0,attendancePending:0,gradeFieldPending:0,gradeRows:[],activities:new Map(),sources:new Set()});
    return M.get(k)
  }
  function addActivity(r,g,done){
    const key=String(g.activity_name||'Ekskul').trim()||'Ekskul';
    if(!r.activities.has(key))r.activities.set(key,{name:key,total:0,done:0,pending:0});
    const a=r.activities.get(key);a.total++;if(done)a.done++;else a.pending++;
  }
  function build(activity,grades){
    const M=new Map(),now=today();
    for(const e of activity?.events||[]){
      if(String(e.status||'').toUpperCase()==='BATAL')continue;
      const date=String(e.planned_date||''),isDue=date&&date<=now,done=Boolean(e.report_filled_at);
      for(const pic of splitPics(e.pic_text)){
        const r=getRec(M,pic);r.sources.add('activity');
        if(isDue){r.eventDue++;if(done)r.eventDone++;else{r.eventPending++;r.eventPendingItems.push({title:e.title||CAT[e.category]||'Kegiatan',date})}}
        else r.eventFuture++;
      }
    }
    for(const g of grades?.rows||[]){
      const done=g.assessment_status==='complete',state=g.input_state||(!done?'not_started':'complete');let r;
      if(g.source==='internal'){
        const coach=String(g.coach_name||'').trim()||'Pelatih belum ditentukan';r=getRec(M,coach);r.sources.add('internal');
      }else{
        const label=(String(g.coach_name||'').trim()||'Pelatih eksternal')+' · '+String(g.activity_name||'Ekskul Eksternal');r=getRec(M,label);r.sources.add('external');
      }
      r.gradeTotal++;if(done)r.gradeDone++;else{
        r.gradePending++;
        if(state==='not_started')r.gradeNotStarted++;else r.gradeStartedPending++;
        if(state==='attendance_pending'||(g.missing_components||[]).some(x=>low(x).includes('absensi')))r.attendancePending++;
        if(['grades_pending','partial'].includes(state)||(g.missing_components||[]).some(x=>!low(x).includes('absensi')))r.gradeFieldPending++;
      }
      r.gradeRows.push(g);addActivity(r,g,done);
    }
    const out=[...M.values()].map(r=>{
      const pending=r.eventPending+r.gradePending,done=r.eventDone+r.gradeDone,total=r.eventDue+r.gradeTotal,hasStarted=done>0||r.gradeStartedPending>0;
      let status='scheduled';if(total>0&&pending===0)status='done';else if(pending>0&&!hasStarted)status='none';else if(pending>0)status='partial';
      return{...r,pending,done,total,status,activities:[...r.activities.values()].sort((a,b)=>b.pending-a.pending||b.total-a.total||a.name.localeCompare(b.name,'id'))};
    });
    const sev={none:0,partial:1,scheduled:2,done:3};out.sort((a,b)=>(sev[a.status]-sev[b.status])||(b.pending-a.pending)||a.name.localeCompare(b.name,'id'));return out;
  }
  function summary(){const all=S.records,work=all.filter(r=>r.total>0);return{people:all.length,done:work.filter(r=>r.status==='done').length,partial:work.filter(r=>r.status==='partial').length,none:work.filter(r=>r.status==='none').length,events:all.reduce((n,r)=>n+r.eventPending,0),attendance:all.reduce((n,r)=>n+r.attendancePending,0),gradeFields:all.reduce((n,r)=>n+r.gradeFieldPending,0)}}
  const statusLabel=s=>({done:'Selesai',partial:'Belum Lengkap',none:'Belum Input',scheduled:'Belum Jatuh Tempo'}[s]||s);
  const statusClass=s=>s==='done'?'done':s==='partial'?'warn':s==='none'?'late':'scheduled';
  const activityText=r=>r.activities.map(a=>a.name+' '+a.done+'/'+a.total).join(' ');
  function filtered(){
    const q=low(document.getElementById('kglr-q')?.value||''),src=document.getElementById('kglr-source')?.value||S.source,st=document.getElementById('kglr-status')?.value||S.status;
    return S.records.filter(r=>{
      if(st==='pending'&&r.pending===0)return false;if(st!=='all'&&st!=='pending'&&r.status!==st)return false;
      if(src==='activity'&&!(r.eventDue||r.eventFuture))return false;if(src==='internal'&&!r.sources.has('internal'))return false;if(src==='external'&&!r.sources.has('external'))return false;
      if(q&&!((r.name+' '+activityText(r)+' '+r.gradeRows.map(x=>`${x.student_name||''} ${x.activity_name||''} ${x.status_detail||''}`).join(' ')).toLowerCase().includes(q)))return false;
      return true;
    })
  }

  function css(){
    if(document.getElementById('kglr-style-v3'))return;
    document.getElementById('kglr-style-v2')?.remove();
    const s=document.createElement('style');s.id='kglr-style-v3';s.textContent=`
      #kegiatan-live-report{background:#fff;border:1px solid var(--border,#dce7e7);border-radius:16px;padding:15px;margin:0 0 13px;box-shadow:0 5px 18px rgba(8,82,79,.045)}
      .kglr-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap}.kglr-title{font-size:15px;font-weight:900;color:var(--text,#173f3e)}.kglr-sub{font-size:9px;color:var(--muted,#718181);margin-top:4px}.kglr-live{display:inline-flex;align-items:center;gap:6px;font-size:8px;font-weight:850;color:#17635e}.kglr-live i{width:7px;height:7px;border-radius:50%;background:#28a477;box-shadow:0 0 0 4px rgba(40,164,119,.12)}
      .kglr-actions{display:flex;gap:6px;flex-wrap:wrap}.kglr-btn{border:1px solid var(--border,#dce7e7);background:#fff;border-radius:9px;padding:7px 10px;font-size:9px;font-weight:850;cursor:pointer;color:var(--text,#173f3e)}.kglr-btn:hover{background:#f5faf9}.kglr-btn.primary{background:var(--primary,#0a6e6e);color:#fff;border-color:var(--primary,#0a6e6e)}
      .kglr-kpis{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:7px;margin:12px 0}.kglr-kpi{border:1px solid var(--border,#dce7e7);border-radius:11px;padding:9px 10px;background:#fbfdfd}.kglr-kpi strong{display:block;font-size:18px;color:#075b59}.kglr-kpi span{font-size:7.8px;font-weight:850;color:var(--muted,#718181)}.kglr-kpi.warn{background:#fff9ee;border-color:#efd9ab}.kglr-kpi.late{background:#fff4f1;border-color:#efc6bc}.kglr-kpi.good{background:#f1faf6;border-color:#bfdfd0}.kglr-kpi.attn{background:#f4f8fb;border-color:#d8e5ec}
      .kglr-filter{display:grid;grid-template-columns:minmax(210px,1fr) 180px 180px auto;gap:7px;align-items:center}.kglr-filter input,.kglr-filter select{width:100%;box-sizing:border-box}.kglr-wrap{margin-top:10px;border:1px solid var(--border,#dce7e7);border-radius:12px;overflow:auto;max-height:48vh}.kglr-table{width:100%;border-collapse:collapse;min-width:900px}.kglr-table th,.kglr-table td{padding:10px;border-bottom:1px solid #edf1f2;text-align:left;vertical-align:middle;font-size:9.5px}.kglr-table th{position:sticky;top:0;background:#f6f9f9;z-index:2;font-size:8px;color:var(--muted,#718181);text-transform:uppercase}.kglr-name{font-weight:900;font-size:10.5px}.kglr-mini{font-size:8px;color:var(--muted,#718181);line-height:1.4;margin-top:3px}.kglr-progress{font-weight:900;color:#0a6561;font-size:10px}.kglr-click{cursor:pointer}.kglr-click:hover{background:#f8fbfb}.kglr-badge{display:inline-flex;padding:5px 8px;border-radius:999px;font-size:8px;font-weight:900;cursor:pointer}.kglr-badge.done{background:#e8f7ef;color:#357352}.kglr-badge.warn{background:#fff2de;color:#936500}.kglr-badge.late{background:#fff0ec;color:#ad4c39}.kglr-badge.scheduled{background:#eef6fb;color:#456c87}.kglr-foot{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-top:8px;font-size:8px;color:var(--muted,#718181)}
      #kglr-modal{position:fixed;inset:0;background:rgba(12,35,39,.42);display:none;align-items:center;justify-content:center;padding:20px;z-index:100000}#kglr-modal.show{display:flex}.kglr-modalbox{width:min(980px,96vw);max-height:88vh;background:#fff;border-radius:18px;border:1px solid var(--border,#dce7e7);box-shadow:0 28px 80px rgba(0,0,0,.2);overflow:hidden;display:flex;flex-direction:column}.kglr-modalhead{padding:15px 17px;border-bottom:1px solid #e8eeee;display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.kglr-modaltitle{font-size:16px;font-weight:900;color:#173f3e}.kglr-modalsub{font-size:9px;color:#718181;margin-top:3px}.kglr-close{width:31px;height:31px;border:0;background:#f1f5f5;border-radius:9px;font-size:18px;cursor:pointer}.kglr-modalbody{padding:13px 16px 16px;overflow:auto}.kglr-detailstats{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:9px}.kglr-chip{padding:5px 8px;border-radius:999px;background:#eef7f5;color:#286661;font-size:8px;font-weight:850}.kglr-chip.warn{background:#fff2de;color:#91620b}.kglr-chip.bad{background:#fff0ec;color:#a44c3b}.kglr-detailbar{display:flex;gap:7px;margin-bottom:9px;flex-wrap:wrap}.kglr-detailbar input,.kglr-detailbar select{font-size:10px}.kglr-dwrap{border:1px solid #e3ebeb;border-radius:11px;overflow:auto;max-height:55vh}.kglr-dtable{width:100%;border-collapse:collapse;min-width:780px}.kglr-dtable th,.kglr-dtable td{padding:8px 9px;border-bottom:1px solid #edf1f2;text-align:left;font-size:9px;vertical-align:middle}.kglr-dtable th{position:sticky;top:0;background:#f7fafb;z-index:1;font-size:8px;color:#718181}.kglr-grade{display:inline-flex;min-width:25px;height:25px;align-items:center;justify-content:center;border-radius:7px;background:#edf7f5;color:#0b6864;font-weight:900}.kglr-grade.empty{background:#f3f4f4;color:#9a9a9a}.kglr-rowdone{color:#39745a;font-weight:850}.kglr-rowpending{color:#a85a38;font-weight:850}
      @media(max-width:1200px){.kglr-kpis{grid-template-columns:repeat(4,1fr)}}@media(max-width:720px){.kglr-kpis{grid-template-columns:repeat(2,1fr)}.kglr-filter{grid-template-columns:1fr 1fr}.kglr-filter input{grid-column:1/-1}.kglr-modalbox{width:100%;max-height:92vh}.kglr-detailbar{flex-direction:column}}
    `;document.head.appendChild(s)
  }

  function ensureModal(){
    let m=document.getElementById('kglr-modal');if(m)return m;
    m=document.createElement('div');m.id='kglr-modal';m.innerHTML='<div class="kglr-modalbox"><div id="kglr-modal-content"></div></div>';
    m.addEventListener('click',e=>{if(e.target===m)window.kglrCloseDetail()});document.body.appendChild(m);return m;
  }
  function detailRows(){const r=S.records.find(x=>x.key===S.detailKey);if(!r)return[];const q=low(document.getElementById('kglr-dq')?.value||''),st=document.getElementById('kglr-dstatus')?.value||'all';return r.gradeRows.filter(g=>{if(st==='complete'&&g.assessment_status!=='complete')return false;if(st==='pending'&&g.assessment_status==='complete')return false;if(q&&!low(`${g.student_name} ${g.class_name} ${g.activity_name} ${g.status_detail}`).includes(q))return false;return true})}
  const grade=v=>`<span class="kglr-grade ${!v||v==='-'?'empty':''}">${esc(v||'-')}</span>`;
  function renderDetailTable(){
    const tb=document.getElementById('kglr-dbody');if(!tb)return;const rows=detailRows();
    tb.innerHTML=rows.length?rows.map(g=>{const abs=g.source==='internal'?`${Number(g.attendance_records_recorded||0)}/${Number(g.attendance_target||0)}`:(g.activity_grade||'-');const state=g.assessment_status==='complete';return`<tr><td><b>${esc(g.student_name||'-')}</b><div class="kglr-mini">${esc(g.class_name||'')}</div></td><td>${esc(g.activity_name||'-')}</td><td>${esc(abs)}</td><td>${grade(g.skill_grade)}</td><td>${grade(g.competition_grade)}</td><td><span class="${state?'kglr-rowdone':'kglr-rowpending'}">${state?'Lengkap':esc(g.status_detail||'Belum lengkap')}</span></td></tr>`}).join(''):'<tr><td colspan="6" style="padding:24px;text-align:center;color:#718181">Tidak ada data pada filter ini.</td></tr>';
    const c=document.getElementById('kglr-dcount');if(c)c.textContent=rows.length+' siswa';
  }
  function openDetail(key){
    const r=S.records.find(x=>x.key===key);if(!r||!r.gradeRows.length)return;S.detailKey=key;const m=ensureModal(),c=document.getElementById('kglr-modal-content');
    const complete=r.gradeRows.filter(x=>x.assessment_status==='complete').length,pending=r.gradeRows.length-complete,attendance=r.gradeRows.filter(x=>x.input_state==='attendance_pending').length,notStarted=r.gradeRows.filter(x=>x.input_state==='not_started').length;
    c.innerHTML=`<div class="kglr-modalhead"><div><div class="kglr-modaltitle">Detail Nilai Ekskul — ${esc(r.name)}</div><div class="kglr-modalsub">Klik status di Live Report untuk melihat apa yang sudah terisi dan apa yang masih kurang.</div></div><button class="kglr-close" onclick="kglrCloseDetail()">×</button></div><div class="kglr-modalbody"><div class="kglr-detailstats"><span class="kglr-chip">${r.gradeRows.length} siswa</span><span class="kglr-chip">${complete} lengkap</span><span class="kglr-chip warn">${pending} belum lengkap</span>${attendance?`<span class="kglr-chip warn">${attendance} nilai sudah · absensi belum</span>`:''}${notStarted?`<span class="kglr-chip bad">${notStarted} belum input</span>`:''}</div><div class="kglr-detailbar"><input id="kglr-dq" class="kv2-input" placeholder="Cari siswa..." oninput="kglrDetailTable()"><select id="kglr-dstatus" class="kv2-select" onchange="kglrDetailTable()"><option value="all">Semua siswa</option><option value="pending">Belum lengkap</option><option value="complete">Sudah lengkap</option></select><span id="kglr-dcount" class="kglr-mini"></span></div><div class="kglr-dwrap"><table class="kglr-dtable"><thead><tr><th>Siswa</th><th>Ekskul</th><th>Absensi</th><th>Kemampuan</th><th>Prestasi</th><th>Status / Kekurangan</th></tr></thead><tbody id="kglr-dbody"></tbody></table></div></div>`;
    m.classList.add('show');renderDetailTable();
  }

  function ensureBox(){if(!allowed())return null;const root=document.getElementById('kv2-root');if(!root)return null;let box=document.getElementById('kegiatan-live-report');if(!box){box=document.createElement('section');box.id='kegiatan-live-report';box.innerHTML='<div class="kglr-title">Live Report Kabid Kegiatan</div><div class="kglr-sub">Memuat data terbaru...</div>';const anchor=root.querySelector('.kv2-kpis');if(anchor)anchor.insertAdjacentElement('afterend',box);else root.prepend(box)}return box}
  function renderTable(){
    const tb=document.getElementById('kglr-body');if(!tb)return;const rows=filtered();
    tb.innerHTML=rows.length?rows.map(r=>{
      const eventSub=r.eventDue?`${r.eventDone}/${r.eventDue} selesai${r.eventPending?` · ${r.eventPending} belum`:''}`:(r.eventFuture?`${r.eventFuture} jadwal mendatang`:'—');
      const gradeSub=r.gradeTotal?`<span class="kglr-progress">${r.gradeDone}/${r.gradeTotal} lengkap</span><div class="kglr-mini">Klik untuk lihat rincian</div>`:'—';
      const src=[r.sources.has('activity')?'Kegiatan':'',r.sources.has('internal')?'Ekskul Internal':'',r.sources.has('external')?'Ekskul Eksternal':''].filter(Boolean).join(' · ');
      return`<tr class="${r.gradeRows.length?'kglr-click':''}" ${r.gradeRows.length?`onclick="kglrOpenDetail('${esc(r.key)}')"`:''}><td><div class="kglr-name">${esc(r.name)}</div><div class="kglr-mini">${esc(src||'Penanggung jawab')}</div></td><td>${eventSub}</td><td>${gradeSub}</td><td><span class="kglr-badge ${statusClass(r.status)}">${esc(statusLabel(r.status))}</span></td><td>${r.gradeRows.length?'<button class="kglr-btn" onclick="event.stopPropagation();kglrOpenDetail(\''+esc(r.key)+'\')">Lihat Detail</button>':(r.eventPending?'<button class="kglr-btn" onclick="event.stopPropagation();kglrOpenActivities()">Laporan</button>':'—')}</td></tr>`;
    }).join(''):'<tr><td colspan="5" style="padding:22px;text-align:center;color:#718181">Tidak ada data pada filter ini.</td></tr>';
    const n=document.getElementById('kglr-count');if(n)n.textContent=rows.length+' PIC/Pelatih';
  }
  function render(){
    const box=ensureBox();if(!box||!S.loaded)return;const x=summary(),gs=S.gradeSummary||{},gradeFresh=S.gradeGeneratedAt?fmtTime(new Date(S.gradeGeneratedAt)):fmtTime(S.lastSync);
    box.innerHTML=`<div class="kglr-head"><div><div class="kglr-title">Live Report Kabid Kegiatan</div><div class="kglr-sub"><span class="kglr-live"><i></i> LIVE</span> · tampilan utama dibuat ringkas; klik baris/status untuk melihat detail siswa dan komponen yang kurang</div></div><div class="kglr-actions"><button class="kglr-btn" onclick="kglrRefresh()">Refresh</button><button class="kglr-btn primary" onclick="kglrOpenGrades('')">Nilai Rapor</button></div></div><div class="kglr-kpis"><div class="kglr-kpi"><strong>${x.people}</strong><span>PIC/Pelatih</span></div><div class="kglr-kpi good"><strong>${x.done}</strong><span>Selesai</span></div><div class="kglr-kpi warn"><strong>${x.partial}</strong><span>Belum Lengkap</span></div><div class="kglr-kpi late"><strong>${x.none}</strong><span>Belum Input</span></div><div class="kglr-kpi late"><strong>${x.events}</strong><span>Laporan Tertunggak</span></div><div class="kglr-kpi attn"><strong>${Number(gs.attendance_pending||x.attendance||0)}</strong><span>Nilai Sudah · Absensi Belum</span></div><div class="kglr-kpi warn"><strong>${Number(gs.grades_pending||x.gradeFields||0)}</strong><span>Komponen Nilai Kurang</span></div></div><div class="kglr-filter"><input id="kglr-q" class="kv2-input" placeholder="Cari PIC / pelatih / siswa..." oninput="kglrTable()"><select id="kglr-source" class="kv2-select" onchange="kglrTable()"><option value="all">Semua laporan</option><option value="activity">Laporan Kegiatan</option><option value="internal">Ekskul Internal</option><option value="external">Ekskul Eksternal</option></select><select id="kglr-status" class="kv2-select" onchange="kglrTable()"><option value="pending">Perlu tindak lanjut</option><option value="all">Semua status</option><option value="none">Belum Input</option><option value="partial">Belum Lengkap</option><option value="done">Selesai</option></select><button class="kglr-btn" onclick="kglrReset()">Reset</button></div><div class="kglr-wrap"><table class="kglr-table"><thead><tr><th>PIC / Pelatih</th><th>Laporan Kegiatan</th><th>Nilai Ekskul</th><th>Status</th><th>Detail</th></tr></thead><tbody id="kglr-body"></tbody></table></div><div class="kglr-foot"><span>Nilai lengkap ${Number(gs.complete||0)}/${Number(gs.records||0)} · sinkron ${esc(gradeFresh)}</span><span id="kglr-count"></span></div>`;
    document.getElementById('kglr-source').value=S.source;document.getElementById('kglr-status').value=S.status;renderTable();
  }
  async function load(force=false){
    if(!allowed()||S.loading||S.loaded&&!force)return;const box=ensureBox();if(!box)return;S.loading=true;
    try{const [activity,grades]=await Promise.all([request(URLS.activity,'bootstrap'),request(URLS.grades,'list')]);S.records=build(activity,grades);S.gradeSummary=grades.summary||{};S.gradeGeneratedAt=grades.generated_at||'';S.loaded=true;S.lastSync=new Date();render()}
    catch(e){box.innerHTML=`<div class="kglr-head"><div><div class="kglr-title">Live Report Kabid Kegiatan</div><div class="kglr-sub" style="color:#a34c3d">${esc(e.message||'Gagal memuat data terbaru.')}</div></div><button class="kglr-btn" onclick="kglrRefresh()">Coba lagi</button></div>`}
    finally{S.loading=false}
  }

  window.kglrTable=renderTable;
  window.kglrDetailTable=renderDetailTable;
  window.kglrOpenDetail=openDetail;
  window.kglrCloseDetail=()=>document.getElementById('kglr-modal')?.classList.remove('show');
  window.kglrRefresh=()=>load(true);
  window.kglrReset=()=>{S.source='all';S.status='pending';render()};
  window.kglrOpenActivities=()=>{if(typeof setActiveModule==='function')setActiveModule('kegiatan-rinci')};
  window.kglrOpenGrades=name=>{const coach=decodeURIComponent(name||'');if(coach)window.__kxrgPendingCoach=coach;if(typeof setActiveModule==='function'){setActiveModule('kegiatan-ekskul');setTimeout(()=>{if(typeof window.kxrgShow==='function')window.kxrgShow()},650)}};

  function tick(){if(!allowed())return;css();ensureModal();const box=ensureBox();if(!box)return;if(S.loaded){if(!box.querySelector('.kglr-kpis'))render()}else if(!S.loading)load(false)}
  const mo=new MutationObserver(tick);
  function boot(){css();ensureModal();mo.observe(document.body,{childList:true,subtree:true});tick();S.timer=setInterval(()=>{if(allowed()&&document.getElementById('kegiatan-live-report'))load(true)},15000);document.addEventListener('visibilitychange',()=>{if(!document.hidden&&allowed()&&document.getElementById('kegiatan-live-report'))load(true)});window.addEventListener('focus',()=>{if(allowed()&&document.getElementById('kegiatan-live-report'))load(true)});document.addEventListener('keydown',e=>{if(e.key==='Escape')window.kglrCloseDetail()})}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
