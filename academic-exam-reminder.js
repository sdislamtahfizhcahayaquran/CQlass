/* CQlass — Jadwal Ujian TP/KD dari LP
   Read-only reminder untuk Guru/Walas + monitoring Kabid Akademik.
   Sumber jadwal: school_lp_targets via rpp-lp-manager:exam_schedule.
   Status selesai dihitung dari keterisian nilai TP, bukan tombol manual. */
(function(){
  'use strict';
  if(window.__CQ_EXAM_REMINDER_V2__) return;
  window.__CQ_EXAM_REMINDER_V2__=true;

  const ENDPOINT=(typeof SUPABASE_URL!=='undefined'?SUPABASE_URL:'https://lmglkxzemtvxcgktiord.supabase.co')+'/functions/v1/rpp-lp-manager';
  const CACHE_MS=90*1000;
  let state={loading:false,loadedAt:0,data:null,filter:'active',expanded:false,error:''};
  let observer=null, renderTimer=0;

  const norm=v=>String(v||'').trim().toLowerCase().replace(/[\s-]+/g,'_');
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  function role(){
    try{return norm((typeof currentUser!=='undefined'&&currentUser?.role)||JSON.parse(localStorage.getItem('cqlass_user')||'{}')?.role)}catch(_){return''}
  }
  function eligible(){return ['guru','walas','akademik','kabid_akademik','academic'].includes(role())}
  function academicRole(){return ['akademik','kabid_akademik','academic'].includes(role())}
  function todayJakarta(){
    try{return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())}
    catch(_){return new Date().toISOString().slice(0,10)}
  }
  function token(){
    try{return typeof getAuthToken==='function'?getAuthToken():(localStorage.getItem('cqlass_session_token')||'')}catch(_){return''}
  }
  function headers(){
    const key=typeof SUPABASE_PUBLISHABLE_KEY!=='undefined'?SUPABASE_PUBLISHABLE_KEY:'';
    return {'Content-Type':'application/json','apikey':key,'Authorization':'Bearer '+key,'x-session-token':token()};
  }
  async function request(){
    const r=await fetch(ENDPOINT,{method:'POST',headers:headers(),body:JSON.stringify({action:'exam_schedule',academic_year:'2026/2027',semester_no:1,today:todayJakarta()})});
    const d=await r.json().catch(()=>({}));
    if(!r.ok||d.success===false) throw new Error(d.error||'Jadwal ujian belum dapat dimuat.');
    return d;
  }
  function injectStyle(){
    if(document.getElementById('cq-exam-reminder-style-v2'))return;
    document.getElementById('cq-exam-reminder-style')?.remove();
    const s=document.createElement('style');s.id='cq-exam-reminder-style-v2';s.textContent=`
      .cqer{font-family:inherit;margin:0 0 18px;color:#173f3b}.cqer *{box-sizing:border-box}
      .cqer-card{background:rgba(255,255,255,.96);border:1px solid #dceae7;border-radius:22px;box-shadow:0 10px 28px rgba(31,91,84,.075);overflow:hidden}
      .cqer-head{padding:20px 22px 14px;display:flex;justify-content:space-between;gap:18px;align-items:flex-start;flex-wrap:wrap}
      .cqer-eyebrow{font-size:10px;letter-spacing:.11em;text-transform:uppercase;font-weight:900;color:#0b8276;margin-bottom:6px}
      .cqer-title{font-size:21px;line-height:1.15;font-weight:900;color:#123f3a;letter-spacing:-.025em}
      .cqer-sub{font-size:11px;color:#71847f;margin-top:6px}
      .cqer-summary{display:grid;grid-template-columns:repeat(4,minmax(92px,1fr));gap:8px;min-width:min(100%,430px)}
      .cqer-stat{border:1px solid #dfebe8;background:#fbfdfc;border-radius:14px;padding:9px 11px;min-width:0}
      .cqer-stat strong{display:block;font-size:17px;line-height:1;font-weight:900;letter-spacing:-.02em}
      .cqer-stat span{display:block;margin-top:4px;font-size:8.7px;font-weight:800;text-transform:uppercase;letter-spacing:.045em;opacity:.78}
      .cqer-stat.red{background:#fff5f2;color:#aa4636;border-color:#f4d7d0}.cqer-stat.orange{background:#fff9ee;color:#8e6617;border-color:#efdfb9}.cqer-stat.blue{background:#f1f7fb;color:#356d98;border-color:#d7e6f0}.cqer-stat.green{background:#eff8f3;color:#2c7459;border-color:#d4e9dc}
      .cqer-priority{margin:0 22px 13px;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 12px;border-radius:12px;background:#fff7f5;border:1px solid #f2d7d1;color:#934434}
      .cqer-priority-main{display:flex;align-items:center;gap:9px;min-width:0}.cqer-priority-dot{width:8px;height:8px;border-radius:50%;background:#c85e4a;box-shadow:0 0 0 4px rgba(200,94,74,.10);flex:0 0 auto}
      .cqer-priority b{font-size:11px}.cqer-priority span{font-size:10px;color:#aa6b5f}.cqer-priority button{border:0;background:transparent;color:#8d3f31;font:inherit;font-size:10px;font-weight:900;cursor:pointer;white-space:nowrap}
      .cqer-section{padding:0 22px 8px}.cqer-section-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:5px 0 9px}
      .cqer-section-title{font-size:10px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;color:#6b807c}.cqer-section-note{font-size:9.5px;color:#91a09d}
      .cqer-list{display:grid;gap:9px;padding-bottom:8px}
      .cqer-row{position:relative;display:grid;grid-template-columns:minmax(0,1.3fr) minmax(130px,.72fr) minmax(145px,.8fr) auto;gap:14px;align-items:center;padding:13px 14px 13px 17px;border:1px solid #e4eeeb;border-radius:14px;background:#fff;box-shadow:0 2px 8px rgba(34,77,72,.025);overflow:hidden}
      .cqer-row:before{content:'';position:absolute;left:0;top:0;bottom:0;width:4px;background:#d4e7e3}.cqer-row.overdue:before{background:#ce6a56}.cqer-row.current:before{background:#d2a244}.cqer-row.upcoming:before{background:#6b9ec5}.cqer-row.completed:before{background:#66a88b}
      .cqer-main{min-width:0}.cqer-main-top{display:flex;align-items:center;gap:7px;flex-wrap:wrap}.cqer-main b{font-size:12.5px;line-height:1.25}.cqer-tp{display:inline-flex;align-items:center;padding:3px 6px;border-radius:999px;background:#eef7f5;color:#0e7569;font-size:8.5px;font-weight:900}
      .cqer-main span{display:block;margin-top:4px;font-size:9.7px;color:#778986}.cqer-date{font-size:10.8px;font-weight:850;color:#315c57}.cqer-date-sub{font-size:9.2px;color:#83938f;margin-top:3px}
      .cqer-progress{font-size:9.5px;color:#647d78}.cqer-progress-line{display:flex;justify-content:space-between;gap:8px}.cqer-progress-line b{font-size:9.6px;color:#315c57}.cqer-bar{height:6px;background:#edf2f1;border-radius:99px;overflow:hidden;margin-top:6px}.cqer-bar i{display:block;height:100%;background:currentColor;border-radius:inherit}
      .cqer-progress.overdue{color:#c76b59}.cqer-progress.current{color:#cf9c39}.cqer-progress.upcoming{color:#6f9dbc}.cqer-progress.completed{color:#62a083}
      .cqer-side{display:flex;align-items:center;justify-content:flex-end;gap:8px}.cqer-pill{display:inline-flex;padding:5px 8px;border-radius:999px;font-size:8.7px;font-weight:900;white-space:nowrap}.cqer-pill.overdue{background:#fff0ed;color:#aa4636}.cqer-pill.current{background:#fff5df;color:#8a620f}.cqer-pill.upcoming{background:#edf5fb;color:#356d98}.cqer-pill.completed{background:#eaf7f0;color:#2c7459}
      .cqer-action{height:32px;border:1px solid #bddbd5;border-radius:10px;background:#edf8f6;color:#0d756a;padding:0 10px;font:inherit;font-size:9.4px;font-weight:900;cursor:pointer;white-space:nowrap}.cqer-action:hover{background:#dff2ee}.cqer-action.finish{background:#fff8e9;color:#8a620f;border-color:#ead9ac}
      .cqer-tools{display:flex;gap:8px;align-items:center;padding:0 22px 12px;flex-wrap:wrap}.cqer-filter{height:33px;border:1px solid #d6e5e1;border-radius:9px;background:#fff;padding:0 9px;font:inherit;font-size:10px;color:#315a55}
      .cqer-meta{font-size:9.5px;color:#82938f}.cqer-empty{padding:20px;text-align:center;color:#71847f;font-size:10.5px}.cqer-foot{padding:5px 22px 17px;text-align:center}
      .cqer-more{border:0;background:transparent;color:#0d756a;font:inherit;font-size:10.5px;font-weight:900;cursor:pointer}.cqer-more:hover{text-decoration:underline}
      @media(max-width:980px){.cqer-summary{grid-template-columns:repeat(2,minmax(105px,1fr));width:100%}.cqer-row{grid-template-columns:1fr 1fr}.cqer-side{justify-content:flex-start}}
      @media(max-width:620px){.cqer-card{border-radius:16px}.cqer-head{padding:16px}.cqer-summary{grid-template-columns:repeat(2,1fr)}.cqer-section{padding:0 14px 6px}.cqer-priority{margin:0 14px 12px}.cqer-tools{padding:0 14px 10px}.cqer-row{grid-template-columns:1fr;gap:9px}.cqer-side{justify-content:space-between}.cqer-title{font-size:18px}}
    `;document.head.appendChild(s);
  }
  function labelStatus(s){return s==='overdue'?'Terlambat':s==='current'?'Pekan Ini':s==='upcoming'?'Mendatang':s==='completed'?'Selesai':'—'}
  function fmtDate(row){return row.period_label||[row.period_start,row.period_end].filter(Boolean).join(' – ')||'—'}
  function activeRows(rows){
    const today=todayJakarta();
    const future=new Date(today+'T00:00:00+07:00');future.setDate(future.getDate()+35);
    const futureY=future.toISOString().slice(0,10);
    return rows.filter(r=>r.status==='overdue'||r.status==='current'||(r.status==='upcoming'&&String(r.period_start||'')<=futureY));
  }
  function filteredRows(){
    const rows=Array.isArray(state.data?.rows)?state.data.rows:[];
    if(state.filter==='active')return activeRows(rows);
    if(state.filter==='all')return rows;
    return rows.filter(r=>r.status===state.filter);
  }
  function rowHtml(r){
    const linked=(r.linked_tp||[]).map(x=>x.code).join(', ');
    const progress=Math.max(0,Math.min(100,Number(r.score_progress)||0));
    const teacher=academicRole()?esc(r.teacher_name||''):'';
    const total=Math.max(0,Number(r.student_total)||0);
    const estimated=total?Math.round(total*progress/100):0;
    const remaining=Math.max(0,total-estimated);
    const nearly=progress>=80&&progress<100;
    const progressText=progress>=100?'Nilai lengkap':nearly?(remaining===1?'Tinggal 1 siswa':`Tinggal sekitar ${remaining} siswa`):(total?`${estimated}/${total} siswa dinilai`:`Nilai TP ${progress}%`);
    const actionLabel=nearly?'Selesaikan →':'Isi Nilai →';
    return `<div class="cqer-row ${esc(r.status)}">
      <div class="cqer-main">
        <div class="cqer-main-top"><b>${esc(r.subject_name||'Mata pelajaran')} · ${esc(r.class_name||'')}</b>${linked?`<span class="cqer-tp">${esc(linked)}</span>`:''}</div>
        <span>${teacher?(teacher+' · '):''}${esc(r.target_text||'Ujian TP/KD')}</span>
      </div>
      <div><div class="cqer-date">${esc(fmtDate(r))}</div><div class="cqer-date-sub">${labelStatus(r.status)}${nearly?' · hampir selesai':''}</div></div>
      <div class="cqer-progress ${esc(r.status)}"><div class="cqer-progress-line"><span>${progressText}</span><b>${progress}%</b></div><div class="cqer-bar"><i style="width:${progress}%"></i></div></div>
      <div class="cqer-side"><span class="cqer-pill ${esc(r.status)}">${nearly?'Hampir selesai':labelStatus(r.status)}</span>${r.status==='completed'?'':`<button class="cqer-action ${nearly?'finish':''}" onclick="cqExamOpenScore('${esc(r.assignment_id)}')">${actionLabel}</button>`}</div>
    </div>`;
  }
  function mount(){
    if(!eligible()||String(typeof activeModule!=='undefined'?activeModule:'')!=='dashboard')return null;
    const c=document.getElementById('content');if(!c)return null;
    let m=document.getElementById('cq-exam-reminder-mount');
    if(!m){m=document.createElement('div');m.id='cq-exam-reminder-mount';m.className='cqer';c.prepend(m)}
    return m;
  }
  function paint(){
    injectStyle();const m=mount();if(!m)return;
    if(state.loading&&!state.data){m.innerHTML='<div class="cqer-card"><div class="cqer-empty"><span class="spinner"></span> Menyiapkan jadwal ujian dari LP...</div></div>';return}
    if(state.error&&!state.data){m.innerHTML=`<div class="cqer-card"><div class="cqer-empty">Jadwal ujian belum dapat dimuat. <button class="cqer-more" onclick="cqExamRefresh(true)">Coba lagi</button></div></div>`;return}
    const d=state.data||{summary:{},rows:[]},sm=d.summary||{};
    const shown=filteredRows(),limit=academicRole()?(state.expanded?120:8):(state.expanded?50:4),rows=shown.slice(0,limit);
    const title=academicRole()?'Monitoring Ujian TP/KD':'Yang perlu Anda selesaikan';
    const subtitle=academicRole()?'Pantau jadwal ujian seluruh guru berdasarkan LP dan keterisian nilai TP.':'Jadwal ujian otomatis dari LP Anda. Fokus pada yang perlu dituntaskan lebih dulu.';
    const priority=Number(sm.overdue)>0?`<div class="cqer-priority"><div class="cqer-priority-main"><i class="cqer-priority-dot"></i><div><b>${academicRole()?Number(sm.overdue)+' jadwal perlu perhatian':'Ada '+Number(sm.overdue)+' jadwal yang melewati target LP'}</b><span> · prioritaskan nilai yang belum lengkap</span></div></div><button onclick="cqExamSetFilter('overdue')">Lihat terlambat →</button></div>`:'';
    const tools=academicRole()?`<div class="cqer-tools"><select class="cqer-filter" onchange="cqExamSetFilter(this.value)">
      <option value="active" ${state.filter==='active'?'selected':''}>Perlu perhatian</option>
      <option value="overdue" ${state.filter==='overdue'?'selected':''}>Terlambat</option>
      <option value="current" ${state.filter==='current'?'selected':''}>Pekan Ini</option>
      <option value="upcoming" ${state.filter==='upcoming'?'selected':''}>Mendatang</option>
      <option value="completed" ${state.filter==='completed'?'selected':''}>Selesai</option>
      <option value="all" ${state.filter==='all'?'selected':''}>Semua</option>
    </select><span class="cqer-meta">Status berubah otomatis saat nilai TP masuk.</span></div>`:'';
    m.innerHTML=`<div class="cqer-card">
      <div class="cqer-head">
        <div><div class="cqer-eyebrow">Academic Reminder</div><div class="cqer-title">${title}</div><div class="cqer-sub">${subtitle}</div></div>
        <div class="cqer-summary">
          <div class="cqer-stat red"><strong>${Number(sm.overdue)||0}</strong><span>Terlambat</span></div>
          <div class="cqer-stat orange"><strong>${Number(sm.current)||0}</strong><span>Pekan Ini</span></div>
          <div class="cqer-stat blue"><strong>${Number(sm.upcoming)||0}</strong><span>Mendatang</span></div>
          <div class="cqer-stat green"><strong>${Number(sm.completed)||0}</strong><span>Selesai</span></div>
        </div>
      </div>
      ${priority}${tools}
      <div class="cqer-section"><div class="cqer-section-head"><div class="cqer-section-title">${state.filter==='active'?'Prioritas Anda':state.filter==='all'?'Semua Jadwal':labelStatus(state.filter)}</div><div class="cqer-section-note">${shown.length} jadwal</div></div>
        <div class="cqer-list">${rows.length?rows.map(rowHtml).join(''):'<div class="cqer-empty">Tidak ada jadwal pada bagian ini.</div>'}</div>
      </div>
      ${shown.length>limit?`<div class="cqer-foot"><button class="cqer-more" onclick="cqExamToggleMore()">Lihat semua ${shown.length} jadwal →</button></div>`:''}
    </div>`;
  }
  async function load(force){
    if(!eligible())return;
    const now=Date.now();if(!force&&state.data&&now-state.loadedAt<CACHE_MS){paint();return}
    if(state.loading)return;
    state.loading=true;state.error='';paint();
    try{state.data=await request();state.loadedAt=Date.now()}
    catch(e){state.error=e?.message||'Gagal memuat jadwal.'}
    finally{state.loading=false;paint()}
  }
  function ensure(){
    if(!eligible()||String(typeof activeModule!=='undefined'?activeModule:'')!=='dashboard')return;
    mount();load(false);
  }
  function scheduleEnsure(){
    clearTimeout(renderTimer);renderTimer=setTimeout(ensure,40);
    setTimeout(ensure,350);setTimeout(ensure,1100);
  }
  window.cqExamRefresh=force=>load(Boolean(force));
  window.cqExamSetFilter=f=>{state.filter=f||'active';state.expanded=false;paint()};
  window.cqExamToggleMore=()=>{state.expanded=true;paint()};
  window.cqExamOpenScore=function(assignmentId){
    try{
      if(typeof setActiveModule==='function')setActiveModule('leger');
      let tries=0;const timer=setInterval(()=>{
        tries++;
        try{
          if(typeof academicGridState!=='undefined'&&Array.isArray(academicGridState.assignments)&&academicGridState.assignments.some(a=>String(a.id)===String(assignmentId))){
            clearInterval(timer);
            if(typeof academicChooseAssignment==='function')academicChooseAssignment(String(assignmentId));
          }else if(tries>=25)clearInterval(timer);
        }catch(_){if(tries>=25)clearInterval(timer)}
      },120);
    }catch(_){}
  };

  function patchDashboardRole(){
    try{
      if(typeof DASHBOARD_MODULE!=='undefined'&&Array.isArray(DASHBOARD_MODULE.roles)&&!DASHBOARD_MODULE.roles.includes('guru'))DASHBOARD_MODULE.roles.push('guru');
    }catch(_){}
  }
  patchDashboardRole();

  if(typeof enterApp==='function'&&!enterApp.__cqExamReminder){
    const old=enterApp;enterApp=function(){
      patchDashboardRole();
      const out=old.apply(this,arguments);
      setTimeout(()=>{
        try{
          if(role()==='guru'&&typeof activeModule!=='undefined'&&activeModule!=='dashboard'&&typeof setActiveModule==='function')setActiveModule('dashboard');
          else scheduleEnsure();
        }catch(_){}
      },80);
      return out;
    };enterApp.__cqExamReminder=true;
  }
  if(typeof setActiveModule==='function'&&!setActiveModule.__cqExamReminder){
    const old=setActiveModule;setActiveModule=function(){
      const out=old.apply(this,arguments);scheduleEnsure();return out;
    };setActiveModule.__cqExamReminder=true;
  }
  const content=document.getElementById('content');
  if(content){
    observer=new MutationObserver(()=>{if(eligible()&&String(typeof activeModule!=='undefined'?activeModule:'')==='dashboard'&&!document.getElementById('cq-exam-reminder-mount'))scheduleEnsure()});
    observer.observe(content,{childList:true,subtree:false});
  }
  setTimeout(()=>{patchDashboardRole();try{if(typeof renderSidebar==='function'&&eligible())renderSidebar()}catch(_){}scheduleEnsure()},250);
})();