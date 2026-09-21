/* CQlass — Kabid Kegiatan Live Report: laporan kegiatan + rapor ekskul */
(function(){
  'use strict';
  if(window.__cqKegiatanLiveReportV1) return;
  window.__cqKegiatanLiveReportV1=true;

  const BASE=(typeof SUPABASE_URL!=='undefined'&&SUPABASE_URL)||'https://lmglkxzemtvxcgktiord.supabase.co';
  const KEY=(typeof SUPABASE_PUBLISHABLE_KEY!=='undefined'&&SUPABASE_PUBLISHABLE_KEY)||'sb_publishable_3HyNVUYXakILMKo2SK-DJw_ka7-Yx93';
  const URLS={
    activity:BASE+'/functions/v1/activity-report',
    exkul:BASE+'/functions/v1/activity-extracurricular',
    grades:BASE+'/functions/v1/activity-extracurricular-report-grades'
  };
  const S={records:[],loaded:false,loading:false,lastSync:null,errors:[],status:'pending',source:'all',timer:null};
  const CAT={MD:'Market Day',NATIVE:'Native Teacher',JUMSIH:'Jumsih',EKSKUL:'Ekskul',JUMAT_BERBAGI:"Jum\'at Berbagi",PEKAN_BAHASA:'Pekan Bahasa',TASMI:"Tasmi\' Syahriyyah",BUNDAKU_GURUKU:'Bundaku Guruku',LAINNYA:'Kegiatan Lainnya'};
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
      const r=await fetch(url,{method:'POST',signal:ctl.signal,headers:{'Content-Type':'application/json','apikey':KEY,'Authorization':'Bearer '+KEY,'x-session-token':t},body:JSON.stringify({action})});
      const raw=await r.text();let d={};try{d=raw?JSON.parse(raw):{}}catch(_){throw new Error('Respons server tidak valid.');}
      if(!r.ok||d.success===false)throw new Error(d.error||('HTTP '+r.status));
      return d;
    }finally{clearTimeout(tm)}
  }

  function splitPics(v){
    const raw=String(v||'').trim();
    if(!raw)return['PIC belum ditentukan'];
    const out=raw.split(/\s*(?:&|,|;|\/|\+|\bdan\b)\s*/i).map(x=>x.trim()).filter(Boolean);
    return [...new Set(out.length?out:[raw])];
  }
  function recMap(){return new Map()}
  function getRec(M,name){
    const n=String(name||'').trim()||'Belum ditentukan',k=low(n);
    if(!M.has(k))M.set(k,{name:n,eventDue:0,eventDone:0,eventPending:0,eventFuture:0,eventPendingItems:[],gradeTotal:0,gradeDone:0,gradePending:0,activities:new Map(),sources:new Set()});
    return M.get(k);
  }
  function addActivity(r,name,done,source){
    const key=String(name||'Ekskul').trim()||'Ekskul';
    if(!r.activities.has(key))r.activities.set(key,{name:key,total:0,done:0,pending:0});
    const a=r.activities.get(key);a.total++;if(done)a.done++;else a.pending++;
    r.sources.add(source);
  }

  function build(activity,exkul,grades){
    const M=recMap(),now=today();
    for(const e of activity?.events||[]){
      if(String(e.status||'').toUpperCase()==='BATAL')continue;
      const date=String(e.planned_date||'');
      const isDue=date&&date<=now;
      const done=Boolean(e.report_filled_at);
      for(const pic of splitPics(e.pic_text)){
        const r=getRec(M,pic);r.sources.add('activity');
        if(isDue){r.eventDue++;if(done)r.eventDone++;else{r.eventPending++;if(r.eventPendingItems.length<8)r.eventPendingItems.push({title:e.title||CAT[e.category]||'Kegiatan',date,category:CAT[e.category]||e.category||'Kegiatan'});}}
        else r.eventFuture++;
      }
    }

    const coachByKey=new Map();
    for(const row of exkul?.rows||[]){
      for(const it of row.internal||[]){
        coachByKey.set(String(row.student_id)+'|'+String(it.extracurricular_id),{coach:String(it.coach_name||'').trim()||'Pelatih belum ditentukan',activity:it.extracurricular_name||'Ekskul Internal'});
      }
    }
    for(const g of grades?.rows||[]){
      const done=g.assessment_status==='complete';
      if(g.source==='internal'){
        const meta=coachByKey.get(String(g.student_id)+'|'+String(g.activity_id))||{coach:'Pelatih belum ditentukan',activity:g.activity_name||'Ekskul Internal'};
        const r=getRec(M,meta.coach);r.gradeTotal++;if(done)r.gradeDone++;else r.gradePending++;addActivity(r,meta.activity||g.activity_name,done,'internal');
      }else if(g.source==='external'){
        const label='Pelatih eksternal · '+String(g.activity_name||'Ekskul Eksternal');
        const r=getRec(M,label);r.gradeTotal++;if(done)r.gradeDone++;else r.gradePending++;addActivity(r,g.activity_name||'Ekskul Eksternal',done,'external');
      }
    }

    const out=[...M.values()].map(r=>{
      const pending=r.eventPending+r.gradePending,done=r.eventDone+r.gradeDone,total=r.eventDue+r.gradeTotal;
      let status='scheduled';
      if(total>0&&pending===0)status='done';
      else if(pending>0&&done===0)status='none';
      else if(pending>0)status='partial';
      return{...r,pending,done,total,status,activities:[...r.activities.values()].sort((a,b)=>b.pending-a.pending||b.total-a.total||a.name.localeCompare(b.name,'id'))};
    });
    const sev={none:0,partial:1,scheduled:2,done:3};
    out.sort((a,b)=>(sev[a.status]-sev[b.status])||(b.pending-a.pending)||a.name.localeCompare(b.name,'id'));
    return out;
  }

  function summary(){
    const all=S.records,work=all.filter(r=>r.total>0);
    return{
      people:all.length,
      done:work.filter(r=>r.status==='done').length,
      partial:work.filter(r=>r.status==='partial').length,
      none:work.filter(r=>r.status==='none').length,
      events:all.reduce((n,r)=>n+r.eventPending,0),
      grades:all.reduce((n,r)=>n+r.gradePending,0)
    };
  }
  function statusLabel(s){return{done:'Selesai',partial:'Belum Lengkap',none:'Belum Input',scheduled:'Belum Jatuh Tempo'}[s]||s}
  function statusClass(s){return s==='done'?'done':s==='partial'?'warn':s==='none'?'late':'scheduled'}
  function activityText(r){return r.activities.map(a=>a.name+' '+a.done+'/'+a.total).join(' ')}
  function filtered(){
    const q=low(document.getElementById('kglr-q')?.value||''),src=document.getElementById('kglr-source')?.value||S.source,st=document.getElementById('kglr-status')?.value||S.status;
    return S.records.filter(r=>{
      if(st==='pending'&&r.pending===0)return false;if(st!=='all'&&st!=='pending'&&r.status!==st)return false;
      if(src==='activity'&&!(r.eventDue||r.eventFuture))return false;if(src==='internal'&&!r.sources.has('internal'))return false;if(src==='external'&&!r.sources.has('external'))return false;
      if(q&&!((r.name+' '+activityText(r)+' '+r.eventPendingItems.map(x=>x.title).join(' ')).toLowerCase().includes(q)))return false;
      return true;
    });
  }

  function css(){
    if(document.getElementById('kglr-style'))return;
    const s=document.createElement('style');s.id='kglr-style';s.textContent=`
      #kegiatan-live-report{background:#fff;border:1px solid var(--border,#dce7e7);border-radius:16px;padding:15px;margin:0 0 13px;box-shadow:0 5px 18px rgba(8,82,79,.045)}
      .kglr-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap}.kglr-title{font-size:15px;font-weight:900;color:var(--text,#173f3e)}.kglr-sub{font-size:9.5px;color:var(--muted,#718181);margin-top:4px}.kglr-live{display:inline-flex;align-items:center;gap:6px;font-size:8.5px;font-weight:850;color:#17635e}.kglr-live i{width:7px;height:7px;border-radius:50%;background:#28a477;box-shadow:0 0 0 4px rgba(40,164,119,.12)}
      .kglr-actions{display:flex;gap:6px;flex-wrap:wrap}.kglr-btn{border:1px solid var(--border,#dce7e7);background:#fff;border-radius:9px;padding:8px 10px;font-size:9px;font-weight:850;cursor:pointer;color:var(--text,#173f3e)}.kglr-btn.primary{background:var(--primary,#0a6e6e);color:#fff;border-color:var(--primary,#0a6e6e)}
      .kglr-kpis{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:7px;margin:12px 0}.kglr-kpi{border:1px solid var(--border,#dce7e7);border-radius:11px;padding:9px 10px;background:#fbfdfd}.kglr-kpi strong{display:block;font-size:19px;color:#075b59}.kglr-kpi span{font-size:8px;font-weight:850;color:var(--muted,#718181)}.kglr-kpi.warn{background:#fff9ee;border-color:#efd9ab}.kglr-kpi.late{background:#fff4f1;border-color:#efc6bc}.kglr-kpi.good{background:#f1faf6;border-color:#bfdfd0}
      .kglr-filter{display:grid;grid-template-columns:minmax(210px,1fr) 180px 180px auto;gap:7px;align-items:center}.kglr-filter input,.kglr-filter select{width:100%;box-sizing:border-box}
      .kglr-wrap{margin-top:10px;border:1px solid var(--border,#dce7e7);border-radius:12px;overflow:auto;max-height:48vh}.kglr-table{width:100%;border-collapse:collapse;min-width:980px}.kglr-table th,.kglr-table td{padding:9px 10px;border-bottom:1px solid #edf1f2;text-align:left;vertical-align:top;font-size:9.5px}.kglr-table th{position:sticky;top:0;background:#f6f9f9;z-index:2;font-size:8px;color:var(--muted,#718181);text-transform:uppercase}.kglr-name{font-weight:900;font-size:10.5px}.kglr-mini{font-size:8px;color:var(--muted,#718181);line-height:1.45;margin-top:3px}.kglr-badge{display:inline-flex;padding:5px 8px;border-radius:999px;font-size:8px;font-weight:900}.kglr-badge.done{background:#e8f7ef;color:#357352}.kglr-badge.warn{background:#fff2de;color:#936500}.kglr-badge.late{background:#fff0ec;color:#ad4c39}.kglr-badge.scheduled{background:#eef6fb;color:#456c87}.kglr-progress{font-weight:900;color:#0a6561}.kglr-missing{color:#aa4c3b;font-weight:850}.kglr-foot{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-top:8px;font-size:8px;color:var(--muted,#718181)}
      @media(max-width:1100px){.kglr-kpis{grid-template-columns:repeat(3,1fr)}}@media(max-width:720px){.kglr-kpis{grid-template-columns:repeat(2,1fr)}.kglr-filter{grid-template-columns:1fr 1fr}.kglr-filter input{grid-column:1/-1}}@media(max-width:520px){.kglr-filter{grid-template-columns:1fr}.kglr-filter input{grid-column:auto}}
    `;document.head.appendChild(s);
  }

  function ensureBox(){
    if(!allowed())return null;
    const root=document.getElementById('kv2-root');if(!root)return null;
    let box=document.getElementById('kegiatan-live-report');
    if(!box){box=document.createElement('section');box.id='kegiatan-live-report';box.innerHTML='<div class="kglr-title">Live Report Kabid Kegiatan</div><div class="kglr-sub"><span class="spinner"></span> Memuat status semua laporan...</div>';const anchor=root.querySelector('.kv2-kpis');if(anchor)anchor.insertAdjacentElement('afterend',box);else root.prepend(box)}
    return box;
  }

  function renderTable(){
    const tb=document.getElementById('kglr-body');if(!tb)return;const rows=filtered();
    tb.innerHTML=rows.length?rows.map(r=>{
      const pendingEvents=r.eventPendingItems.map(x=>x.title).slice(0,3);
      const eventSub=r.eventDue?`${r.eventDone}/${r.eventDue} laporan jatuh tempo${r.eventPending?` · <span class="kglr-missing">${r.eventPending} belum</span>`:''}`:(r.eventFuture?`${r.eventFuture} jadwal mendatang`:'—');
      const eventNames=pendingEvents.length?`<div class="kglr-mini">Belum: ${pendingEvents.map(esc).join(' · ')}</div>`:'';
      const acts=r.activities.slice(0,3).map(a=>`${esc(a.name)} ${a.done}/${a.total}`).join(' · ');
      const gradeSub=r.gradeTotal?`<span class="kglr-progress">${r.gradeDone}/${r.gradeTotal}</span>${r.gradePending?` · <span class="kglr-missing">${r.gradePending} belum</span>`:''}`:'—';
      const src=[r.sources.has('activity')?'Kegiatan':'',r.sources.has('internal')?'Ekskul Internal':'',r.sources.has('external')?'Ekskul Eksternal':''].filter(Boolean).join(' · ');
      const action=[];if(r.eventPending)action.push('<button class="kglr-btn" onclick="kglrOpenActivities()">Laporan</button>');if(r.gradePending)action.push('<button class="kglr-btn" onclick="kglrOpenGrades()">Nilai Rapor</button>');
      return `<tr><td><div class="kglr-name">${esc(r.name)}</div><div class="kglr-mini">${esc(src||'Penanggung jawab')}</div></td><td>${eventSub}${eventNames}</td><td>${gradeSub}${acts?`<div class="kglr-mini">${acts}</div>`:''}</td><td><span class="kglr-badge ${statusClass(r.status)}">${statusLabel(r.status)}</span><div class="kglr-mini">${r.pending?`${r.pending} item belum selesai`:'Tidak ada tunggakan'}</div></td><td><div class="kglr-actions">${action.join('')||'—'}</div></td></tr>`;
    }).join(''):'<tr><td colspan="5" style="padding:24px;text-align:center;color:#7b8989">Tidak ada data pada filter ini.</td></tr>';
    const c=document.getElementById('kglr-count');if(c)c.textContent=rows.length+' penanggung jawab';
  }

  function render(){
    const box=ensureBox();if(!box||!S.loaded)return;const x=summary();
    box.innerHTML=`<div class="kglr-head"><div><div class="kglr-title">Live Report Semua Laporan Kabid Kegiatan</div><div class="kglr-sub">Laporan kegiatan + nilai Rapor PTS ekskul. Jadwal yang belum jatuh tempo tidak dihitung sebagai tunggakan.</div><div class="kglr-live" style="margin-top:7px"><i></i> LIVE · otomatis diperbarui setiap 30 detik · sinkron ${esc(fmtTime(S.lastSync))}</div>${S.errors.length?`<div class="kglr-mini kglr-missing">Sebagian sumber belum termuat: ${S.errors.map(esc).join(' · ')}</div>`:''}</div><div class="kglr-actions"><button class="kglr-btn" onclick="kglrOpenActivities()">Laporan Kegiatan</button><button class="kglr-btn" onclick="kglrOpenGrades()">Rapor Ekskul</button><button class="kglr-btn primary" onclick="kglrRefresh()">Refresh</button></div></div>
      <div class="kglr-kpis"><div class="kglr-kpi"><strong>${x.people}</strong><span>PIC / Pelatih Terpantau</span></div><div class="kglr-kpi good"><strong>${x.done}</strong><span>Selesai</span></div><div class="kglr-kpi warn"><strong>${x.partial}</strong><span>Belum Lengkap</span></div><div class="kglr-kpi late"><strong>${x.none}</strong><span>Belum Input</span></div><div class="kglr-kpi late"><strong>${x.events}</strong><span>Laporan Kegiatan Tertunggak</span></div><div class="kglr-kpi warn"><strong>${x.grades}</strong><span>Nilai Rapor Ekskul Belum Lengkap</span></div></div>
      <div class="kglr-filter"><input id="kglr-q" class="kv2-input" placeholder="Cari guru / pelatih / ekskul..." oninput="kglrTable()"><select id="kglr-source" class="kv2-select" onchange="kglrTable()"><option value="all">Semua laporan</option><option value="activity">Laporan Kegiatan</option><option value="internal">Rapor Ekskul Internal</option><option value="external">Rapor Ekskul Eksternal</option></select><select id="kglr-status" class="kv2-select" onchange="kglrTable()"><option value="pending">Belum selesai</option><option value="none">Belum input</option><option value="partial">Belum lengkap</option><option value="done">Selesai</option><option value="scheduled">Belum jatuh tempo</option><option value="all">Semua status</option></select><button class="kglr-btn" onclick="kglrReset()">Reset</button></div>
      <div class="kglr-wrap"><table class="kglr-table"><thead><tr><th>Penanggung Jawab</th><th>Laporan Kegiatan</th><th>Rapor Ekskul</th><th>Status</th><th>Aksi</th></tr></thead><tbody id="kglr-body"></tbody></table></div><div class="kglr-foot"><span>Prioritas: yang belum selesai tampil paling atas.</span><span id="kglr-count"></span></div>`;
    document.getElementById('kglr-source').value=S.source;document.getElementById('kglr-status').value=S.status;renderTable();
  }

  async function load(force=false){
    if(S.loading||S.loaded&&!force)return;const box=ensureBox();if(!box)return;
    S.loading=true;if(!S.loaded)box.innerHTML='<div class="kglr-title">Live Report Kabid Kegiatan</div><div class="kglr-sub"><span class="spinner"></span> Memuat status semua laporan...</div>';
    const settled=await Promise.allSettled([request(URLS.activity,'bootstrap'),request(URLS.exkul,'bootstrap'),request(URLS.grades,'list')]);
    S.errors=[];const data=settled.map((r,i)=>{if(r.status==='fulfilled')return r.value;S.errors.push(['Laporan Kegiatan','Data Ekskul','Rapor Ekskul'][i]+' ('+(r.reason?.message||'gagal')+')');return{};});
    if(settled.every(x=>x.status==='rejected')){S.loading=false;box.innerHTML='<div class="kglr-title">Live Report Kabid Kegiatan</div><div class="kglr-sub kglr-missing">Data live belum dapat dimuat. <button class="kglr-btn" onclick="kglrRefresh()">Coba lagi</button></div>';return}
    S.records=build(data[0],data[1],data[2]);S.loaded=true;S.lastSync=new Date();S.loading=false;render();
  }

  window.kglrTable=renderTable;
  window.kglrRefresh=()=>{S.loaded=false;load(true)};
  window.kglrReset=()=>{S.source='all';S.status='pending';render();};
  window.kglrOpenActivities=()=>{if(typeof setActiveModule==='function')setActiveModule('kegiatan-rinci')};
  window.kglrOpenGrades=()=>{if(typeof setActiveModule==='function'){setActiveModule('kegiatan-ekskul');setTimeout(()=>{if(typeof window.kxrgShow==='function')window.kxrgShow()},700)}};

  function tick(){if(!allowed())return;css();const box=ensureBox();if(!box)return;if(S.loaded){if(!box.querySelector('.kglr-kpis'))render()}else if(!S.loading)load(false)}
  const mo=new MutationObserver(()=>tick());
  function boot(){css();mo.observe(document.body,{childList:true,subtree:true});tick();S.timer=setInterval(()=>{if(allowed()&&document.getElementById('kegiatan-live-report'))load(true)},30000)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
