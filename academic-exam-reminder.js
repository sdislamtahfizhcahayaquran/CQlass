/* CQlass — Jadwal Ujian TP/KD dari LP
   Read-only reminder untuk Guru/Walas + monitoring Kabid Akademik.
   Sumber jadwal: school_lp_targets via rpp-lp-manager:exam_schedule.
   Status selesai dihitung dari keterisian nilai TP, bukan tombol manual. */
(function(){
  'use strict';
  if(window.__CQ_EXAM_REMINDER_V1__) return;
  window.__CQ_EXAM_REMINDER_V1__=true;

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
    if(document.getElementById('cq-exam-reminder-style'))return;
    const s=document.createElement('style');s.id='cq-exam-reminder-style';s.textContent=`
      .cqer{font-family:inherit;margin:0 0 16px;color:#173f3b}.cqer *{box-sizing:border-box}
      .cqer-alert{display:flex;align-items:center;justify-content:space-between;gap:12px;background:#fff1ee;border:1px solid #f3c5bc;color:#9b3e30;border-radius:12px;padding:10px 13px;margin-bottom:9px;font-size:12px;font-weight:700}
      .cqer-alert button,.cqer-link{border:0;background:transparent;color:inherit;font:inherit;font-size:11px;font-weight:850;cursor:pointer;text-decoration:underline;text-underline-offset:2px}
      .cqer-card{background:#fff;border:1px solid #dbe9e6;border-radius:15px;box-shadow:0 3px 12px rgba(35,80,75,.04);overflow:hidden}
      .cqer-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:14px 16px 11px;border-bottom:1px solid #edf3f1;flex-wrap:wrap}
      .cqer-title{font-size:15px;font-weight:850;color:#173f3b}.cqer-sub{font-size:10.5px;color:#71847f;margin-top:3px}
      .cqer-stats{display:flex;gap:6px;flex-wrap:wrap}.cqer-stat{border:1px solid #dce9e6;background:#f8fbfa;border-radius:999px;padding:5px 9px;font-size:9.5px;font-weight:800;color:#58726d}
      .cqer-stat.red{background:#fff1ee;color:#a44838;border-color:#f4d1ca}.cqer-stat.orange{background:#fff7e8;color:#936711;border-color:#f0dfb6}.cqer-stat.green{background:#edf8f2;color:#267157;border-color:#cfe9db}.cqer-stat.blue{background:#eef5fb;color:#376c94;border-color:#d4e4f0}
      .cqer-tools{display:flex;gap:7px;align-items:center;padding:9px 16px;background:#fbfdfc;border-bottom:1px solid #edf3f1;flex-wrap:wrap}.cqer-filter{height:31px;border:1px solid #d7e5e2;border-radius:8px;background:#fff;padding:0 8px;font:inherit;font-size:10.5px;color:#315a55}
      .cqer-list{padding:4px 16px 10px}.cqer-row{display:grid;grid-template-columns:minmax(150px,1.15fr) minmax(130px,.85fr) minmax(130px,.9fr) minmax(110px,.7fr) auto;gap:10px;align-items:center;padding:10px 0;border-bottom:1px solid #edf3f1}.cqer-row:last-child{border-bottom:0}
      .cqer-main b{display:block;font-size:11.5px}.cqer-main span,.cqer-meta{font-size:10px;color:#738681}.cqer-date{font-size:10.5px;font-weight:750}.cqer-progress{font-size:10px;color:#617c77}.cqer-bar{height:4px;background:#edf2f1;border-radius:99px;overflow:hidden;margin-top:4px}.cqer-bar i{display:block;height:100%;background:currentColor;opacity:.55}
      .cqer-pill{display:inline-flex;padding:4px 7px;border-radius:999px;font-size:9px;font-weight:850;white-space:nowrap}.cqer-pill.overdue{background:#fff0ed;color:#aa4636}.cqer-pill.current{background:#fff5df;color:#8a620f}.cqer-pill.upcoming{background:#edf5fb;color:#356d98}.cqer-pill.completed{background:#eaf7f0;color:#2c7459}
      .cqer-action{height:29px;border:1px solid #c9dfdb;border-radius:8px;background:#edf7f5;color:#0e7167;padding:0 9px;font:inherit;font-size:9.5px;font-weight:850;cursor:pointer;white-space:nowrap}.cqer-action:hover{background:#dff1ee}
      .cqer-empty{padding:18px;text-align:center;color:#71847f;font-size:11px}.cqer-foot{padding:8px 16px 11px;text-align:center}.cqer-more{border:0;background:#fff;color:#0d756a;font:inherit;font-size:10.5px;font-weight:800;cursor:pointer}
      @media(max-width:820px){.cqer-row{grid-template-columns:1fr 1fr}.cqer-action{justify-self:start}.cqer-status{justify-self:start}}
      @media(max-width:520px){.cqer-row{grid-template-columns:1fr}.cqer-head{padding:12px}.cqer-list{padding:3px 12px 8px}.cqer-tools{padding:8px 12px}}
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
    return `<div class="cqer-row">
      <div class="cqer-main"><b>${esc(r.subject_name||'Mata pelajaran')} · ${esc(r.class_name||'')}</b><span>${esc(r.teacher_name||'')}${linked?' · '+esc(linked):''}</span></div>
      <div><div class="cqer-date">${esc(fmtDate(r))}</div><div class="cqer-meta">${esc(r.target_text||'Ujian TP/KD')}</div></div>
      <div class="cqer-progress"><span>Nilai TP ${progress}%</span><div class="cqer-bar" style="color:${r.status==='completed'?'#2c7459':r.status==='overdue'?'#aa4636':'#b17a18'}"><i style="width:${progress}%"></i></div></div>
      <div class="cqer-status"><span class="cqer-pill ${esc(r.status)}">${labelStatus(r.status)}${progress>0&&r.status!=='completed'?' · Proses':''}</span></div>
      <button class="cqer-action" onclick="cqExamOpenScore('${esc(r.assignment_id)}')">Input Nilai</button>
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
    if(state.loading&&!state.data){m.innerHTML='<div class="cqer-card"><div class="cqer-empty"><span class="spinner"></span> Memuat jadwal Ujian TP/KD dari LP...</div></div>';return}
    if(state.error&&!state.data){m.innerHTML=`<div class="cqer-card"><div class="cqer-empty">Jadwal ujian belum dapat dimuat. <button class="cqer-more" onclick="cqExamRefresh(true)">Coba lagi</button></div></div>`;return}
    const d=state.data||{summary:{},rows:[]},sm=d.summary||{},allRows=Array.isArray(d.rows)?d.rows:[];
    const shown=filteredRows(),limit=academicRole()?(state.expanded?120:12):(state.expanded?50:6),rows=shown.slice(0,limit);
    const alert=Number(sm.overdue)>0?`<div class="cqer-alert"><span>🔴 ${academicRole()?Number(sm.overdue)+' jadwal ujian terlambat di seluruh guru':'Anda memiliki '+Number(sm.overdue)+' Ujian TP/KD yang melewati jadwal LP dan nilai belum lengkap'}.</span><button onclick="cqExamSetFilter('overdue')">Lihat jadwal →</button></div>`:'';
    const tools=academicRole()?`<div class="cqer-tools"><select class="cqer-filter" onchange="cqExamSetFilter(this.value)">
      <option value="active" ${state.filter==='active'?'selected':''}>Perlu perhatian</option>
      <option value="overdue" ${state.filter==='overdue'?'selected':''}>Terlambat</option>
      <option value="current" ${state.filter==='current'?'selected':''}>Pekan Ini</option>
      <option value="upcoming" ${state.filter==='upcoming'?'selected':''}>Mendatang</option>
      <option value="completed" ${state.filter==='completed'?'selected':''}>Selesai</option>
      <option value="all" ${state.filter==='all'?'selected':''}>Semua</option>
    </select><span class="cqer-meta">Sumber: LP · status nilai dibaca otomatis</span></div>`:'';
    m.innerHTML=alert+`<div class="cqer-card"><div class="cqer-head"><div><div class="cqer-title">${academicRole()?'Monitoring':'Jadwal'} Ujian TP/KD</div><div class="cqer-sub">Otomatis dari LP · tidak bergantung pada notifikasi lonceng</div></div><div class="cqer-stats">
      <span class="cqer-stat red">${Number(sm.overdue)||0} terlambat</span><span class="cqer-stat orange">${Number(sm.current)||0} pekan ini</span><span class="cqer-stat blue">${Number(sm.upcoming)||0} mendatang</span><span class="cqer-stat green">${Number(sm.completed)||0} selesai</span>
    </div></div>${tools}<div class="cqer-list">${rows.length?rows.map(rowHtml).join(''):'<div class="cqer-empty">Tidak ada jadwal pada filter ini.</div>'}</div>
    ${shown.length>limit?`<div class="cqer-foot"><button class="cqer-more" onclick="cqExamToggleMore()">Tampilkan ${shown.length-limit} jadwal lainnya</button></div>`:''}</div>`;
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