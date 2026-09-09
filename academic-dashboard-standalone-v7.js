/* CQlass — Kabid Akademik Dashboard Standalone V7
   Deterministic dashboard renderer for role akademik.
   Tidak bergantung pada renderer dashboard generic/legacy.
*/
(function(){
  'use strict';
  if(window.__CQ_AK_STANDALONE_V7__) return;

  const AY='2026/2027';
  const SEM=1;
  const BASE=(typeof SUPABASE_URL!=='undefined'&&SUPABASE_URL)||'https://lmglkxzemtvxcgktiord.supabase.co';
  const APIKEY=(typeof SUPABASE_PUBLISHABLE_KEY!=='undefined'&&SUPABASE_PUBLISHABLE_KEY)||'sb_publishable_3HyNVUYXakILMKo2SK-DJw_ka7-Yx93';
  const EP={
    report:BASE+'/functions/v1/academic-teacher-report',
    analytics:BASE+'/functions/v1/academic-analytics',
    ops:BASE+'/functions/v1/academic-kabid-ops'
  };
  const state={active:true,loading:false,lastData:null,lastAt:0,repairTimer:null};

  function norm(v){return String(v||'').trim().toLowerCase().replace(/[\s-]+/g,'_');}
  function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
  function num(v){const x=Number(v);return Number.isFinite(x)?x:0;}
  function pct(v){return Math.round(num(v)*10)/10+'%';}
  function clamp(v){return Math.max(0,Math.min(100,num(v)));}

  function readUser(){
    try{
      if(typeof currentUser!=='undefined'&&currentUser) return currentUser;
    }catch(_){ }
    try{return JSON.parse(localStorage.getItem('cqlass_user')||'null')||{};}catch(_){return {};}
  }
  function roleValues(){
    const u=readUser()||{};
    return [u.role,u.role_code,u.primary_role].concat(Array.isArray(u.roles)?u.roles:[]).map(norm).filter(Boolean);
  }
  function isAcademic(){
    return roleValues().some(r=>r==='akademik'||r==='kabid_akademik'||r==='academic'||r.includes('kabid_akademik')||r.includes('academic'));
  }
  function userName(){
    const u=readUser()||{};
    return u.nama||u.full_name||u.name||u.teacher_name||u.display_name||u.username||'Kabid Akademik';
  }
  function dashboardActive(){
    if(!state.active) return false;
    try{if(typeof activeModule!=='undefined'&&activeModule!=null)return String(activeModule)==='dashboard';}catch(_){ }
    const sb=document.getElementById('sidebar');
    if(sb){
      const active=[...sb.querySelectorAll('.active,[aria-current="page"]')].find(el=>String(el.textContent||'').trim()==='Dashboard');
      if(active) return true;
    }
    return state.active;
  }
  function appVisible(){
    const app=document.getElementById('app-screen');
    if(!app) return false;
    return getComputedStyle(app).display!=='none';
  }
  function token(){
    try{if(typeof getAuthToken==='function')return getAuthToken()||'';}catch(_){ }
    return localStorage.getItem('cqlass_session_token')||'';
  }
  function headers(){
    return {'Content-Type':'application/json','apikey':APIKEY,'Authorization':'Bearer '+APIKEY,'x-session-token':token()};
  }

  function injectCss(){
    if(document.getElementById('cq-ak7-css')) return;
    const s=document.createElement('style');
    s.id='cq-ak7-css';
    s.textContent=`
      body.cq-ak7 .content{background:radial-gradient(circle at 94% 0,#daf4ec 0,transparent 28%),linear-gradient(180deg,#f7fcfa,#edf8f4)!important;padding:20px!important}
      body.cq-ak7 .sidebar{background:linear-gradient(180deg,#fff,#f1faf7)!important;border-right:1px solid #d9ebe6!important}
      .ak7{max-width:1480px;margin:0 auto;color:#103b36;font-family:Inter,system-ui,sans-serif}.ak7 *{box-sizing:border-box}
      .ak7-hero{min-height:154px;border-radius:25px;padding:24px 28px;display:flex;align-items:center;position:relative;overflow:hidden;margin-bottom:12px;border:1px solid rgba(255,255,255,.94);box-shadow:0 16px 38px rgba(7,59,56,.09);background:linear-gradient(90deg,rgba(252,255,254,.98),rgba(249,254,252,.93) 50%,rgba(12,117,101,.18)),url('login-bg.webp?v=20260909-upload1') center 48%/cover}
      .ak7-hero:after{content:'';position:absolute;right:-70px;top:-115px;width:330px;height:330px;border-radius:50%;border:1px solid rgba(255,255,255,.55);box-shadow:0 0 0 38px rgba(255,255,255,.07),0 0 0 76px rgba(255,255,255,.035)}
      .ak7-hero>div{position:relative;z-index:1}.ak7-eye{font-size:10px;font-weight:900;letter-spacing:.13em;text-transform:uppercase;color:#16786b}.ak7-title{font:800 30px/1.08 Poppins,'Plus Jakarta Sans',sans-serif;letter-spacing:-.035em;color:#073c38;margin-top:6px}.ak7-title span{color:#2ba17a}.ak7-sub{font-size:11px;font-weight:600;color:#5e7871;margin-top:8px;max-width:720px;line-height:1.5}.ak7-chips{display:flex;gap:7px;flex-wrap:wrap;margin-top:13px}.ak7-chip{padding:6px 10px;border-radius:10px;background:rgba(255,255,255,.92);border:1px solid #d7ebe5;color:#177267;font-size:9px;font-weight:800}
      .ak7-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:11px}.ak7-kpi{min-height:105px;padding:15px 16px;border:1px solid #dcece7;border-radius:18px;background:#fff;box-shadow:0 9px 24px rgba(7,59,56,.05);position:relative;overflow:hidden}.ak7-kpi:after{content:'';position:absolute;width:90px;height:90px;border-radius:50%;right:-30px;bottom:-38px;background:rgba(20,145,114,.06)}.ak7-kpi.green{background:linear-gradient(145deg,#fbfffd,#eaf9f2)}.ak7-kpi.blue{background:linear-gradient(145deg,#fbfdff,#edf5ff)}.ak7-kpi.gold{background:linear-gradient(145deg,#fffefa,#fff4dc)}.ak7-kpi.red{background:linear-gradient(145deg,#fffafa,#ffeded)}.ak7-kpi b{display:block;font-size:10px;color:#60756f}.ak7-kpi strong{display:block;font-size:29px;line-height:1;margin:7px 0 4px;color:#0b403a}.ak7-kpi small{font-size:9px;color:#738781}
      .ak7-main{display:grid;grid-template-columns:minmax(0,1.7fr) minmax(300px,.68fr);gap:11px}.ak7-bottom{display:grid;grid-template-columns:minmax(0,1.6fr) 310px;gap:11px;margin-top:11px}.ak7-card{background:rgba(255,255,255,.97);border:1px solid #dcece7;border-radius:19px;box-shadow:0 9px 24px rgba(7,59,56,.05);overflow:hidden}.ak7-head{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;padding:14px 16px 11px}.ak7-head b{display:block;font-size:14px;color:#103f39}.ak7-head small{display:block;font-size:9px;color:#788b85;margin-top:3px}.ak7-link{border:0;background:transparent;color:#0a7d70;font-size:9px;font-weight:900;cursor:pointer}.ak7-wrap{overflow:auto}.ak7-table{width:100%;border-collapse:collapse;min-width:760px}.ak7-table th,.ak7-table td{padding:9px 10px;border-top:1px solid #edf2f0;font-size:9.5px;text-align:left;vertical-align:middle}.ak7-table th{background:#f1f8f6;color:#60756f;font-size:8px;text-transform:uppercase;letter-spacing:.04em}.ak7-bar{display:inline-block;width:64px;height:6px;margin-left:5px;background:#e5efec;border-radius:999px;overflow:hidden;vertical-align:middle}.ak7-bar i{display:block;height:100%;background:linear-gradient(90deg,#149272,#4ac497)}.ak7-badge{display:inline-flex;padding:4px 7px;border-radius:999px;background:#e7f7f0;color:#08746f;font-size:8px;font-weight:900}.ak7-badge.warn{background:#fff3d4;color:#936613}.ak7-badge.bad{background:#ffebeb;color:#a13d45}
      .ak7-alerts{padding:0 15px 12px}.ak7-alert{display:grid;grid-template-columns:9px 1fr;gap:9px;padding:10px 0;border-top:1px solid #edf2f0}.ak7-alert i{width:8px;height:8px;border-radius:50%;margin-top:4px;background:#e86269}.ak7-alert.warn i{background:#e9b52c}.ak7-alert.info i{background:#49a3d7}.ak7-alert b{display:block;font-size:9.5px}.ak7-alert span{display:block;margin-top:2px;font-size:8.5px;color:#748782;line-height:1.4}.ak7-badal{padding:0 15px 13px}.ak7-badal-row{display:grid;grid-template-columns:70px 75px 1fr 1fr 1fr;gap:8px;align-items:center;padding:9px 0;border-top:1px solid #edf2f0;font-size:9px}.ak7-badal-row.header{font-size:8px;text-transform:uppercase;color:#71847e;font-weight:900;background:#f4faf8;margin:0 -15px;padding:8px 15px}.ak7-ready{padding:0 16px 15px}.ak7-ring{--p:0;width:108px;height:108px;border-radius:50%;margin:9px auto;display:grid;place-items:center;position:relative;background:conic-gradient(#27a77f calc(var(--p)*1%),#e7efec 0)}.ak7-ring:before{content:'';position:absolute;width:79px;height:79px;border-radius:50%;background:#fff}.ak7-ring strong{position:relative;z-index:1;font-size:20px;color:#0c403a}.ak7-ready-row{display:flex;justify-content:space-between;gap:10px;padding:6px 0;font-size:8.7px;color:#687d77}.ak7-ready-row b{color:#123f39}.ak7-note{margin:0 0 11px;padding:10px 12px;border-radius:13px;background:#fff8e8;border:1px solid #f0dfb7;color:#7d6426;font-size:9px;display:none}.ak7-note.show{display:block}.ak7-empty{padding:22px;text-align:center;color:#7a8d87;font-size:9px}.ak7-loading{opacity:.62}.ak7-btn{border:0;border-radius:10px;padding:8px 11px;background:linear-gradient(95deg,#0d7369,#2fa579);color:#fff;font:800 9px 'Plus Jakarta Sans',sans-serif;cursor:pointer}.ak7-btn.sec{background:#eff8f5;color:#0c7469;border:1px solid #cde6df}.ak7-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:12px}
      @media(max-width:1150px){.ak7-main,.ak7-bottom{grid-template-columns:1fr}.ak7-kpis{grid-template-columns:repeat(2,1fr)}}@media(max-width:680px){body.cq-ak7 .content{padding:12px!important}.ak7-kpis{grid-template-columns:1fr}.ak7-title{font-size:24px}.ak7-hero{padding:19px;min-height:140px}.ak7-badal-row{grid-template-columns:65px 60px 1fr}.ak7-badal-row>*:nth-child(4),.ak7-badal-row>*:nth-child(5){display:none}}
    `;
    document.head.appendChild(s);
  }

  function today(){
    try{return new Intl.DateTimeFormat('id-ID',{timeZone:'Asia/Jakarta',weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date());}catch(_){return '';}
  }
  function go(id){
    try{if(typeof setActiveModule==='function')setActiveModule(id);}catch(_){ }
  }
  window.cqAk7Go=go;

  function shell(){
    return `<div id="cq-ak7" class="ak7">
      <section class="ak7-hero"><div>
        <div class="ak7-eye">CQlass · Akademik</div>
        <div class="ak7-title">Selamat Bekerja,<br><span>${esc(userName())}</span></div>
        <div class="ak7-sub">Pantau guru mata pelajaran, kelengkapan nilai, siswa prioritas, dan kebutuhan badal dalam satu halaman.</div>
        <div class="ak7-chips"><span class="ak7-chip">Semester ${SEM}</span><span class="ak7-chip">TA ${AY}</span><span class="ak7-chip">${esc(today())}</span></div>
        <div class="ak7-actions"><button class="ak7-btn" onclick="cqAk7Go('akd-monitoring-nilai')">Monitoring Mapel</button><button class="ak7-btn sec" onclick="cqAk7Go('akd-laporan-guru')">Laporan Guru</button></div>
      </div></section>
      <div id="ak7-note" class="ak7-note"></div>
      <div class="ak7-kpis">
        <div class="ak7-kpi green"><b>Guru Belum Input</b><strong id="ak7-notstarted">—</strong><small>guru mapel yang belum mulai</small></div>
        <div class="ak7-kpi blue"><b>Mapel Belum Lengkap</b><strong id="ak7-pending">—</strong><small>penugasan guru · mapel · kelas</small></div>
        <div class="ak7-kpi gold"><b>Siswa Prioritas</b><strong id="ak7-prio">—</strong><small>perlu perhatian akademik</small></div>
        <div class="ak7-kpi red"><b>Badal Hari Ini</b><strong id="ak7-badal-kpi">—</strong><small>penugasan guru pengganti</small></div>
      </div>
      <div class="ak7-main">
        <section class="ak7-card"><div class="ak7-head"><div><b>Monitoring Guru Mapel</b><small>Prioritas penugasan dengan kelengkapan terendah.</small></div><button class="ak7-link" onclick="cqAk7Go('akd-monitoring-nilai')">Lihat Semua →</button></div><div class="ak7-wrap"><table class="ak7-table"><thead><tr><th>Guru</th><th>Mapel</th><th>Kelas</th><th>Kelengkapan</th><th>Terisi / Target</th><th>Rata-rata</th><th>Status</th></tr></thead><tbody id="ak7-monitor"><tr><td colspan="7"><div class="ak7-empty">Memuat data akademik...</div></td></tr></tbody></table></div></section>
        <section class="ak7-card"><div class="ak7-head"><div><b>Perlu Perhatian</b><small>Temuan yang perlu dilihat lebih dahulu.</small></div><button class="ak7-link" onclick="cqAk7Go('akd-laporan-guru')">Laporan Guru →</button></div><div id="ak7-alerts" class="ak7-alerts"><div class="ak7-empty">Memuat prioritas...</div></div></section>
      </div>
      <div class="ak7-bottom">
        <section class="ak7-card"><div class="ak7-head"><div><b>Badal Guru Hari Ini</b><small>Guru pengganti yang sudah ditetapkan hari ini.</small></div><button class="ak7-link" onclick="cqAk7Go('akd-badal')">Kelola Badal →</button></div><div class="ak7-badal"><div class="ak7-badal-row header"><b>Jam</b><b>Kelas</b><b>Mapel</b><b>Guru Asal</b><b>Guru Badal</b></div><div id="ak7-badal-list"><div class="ak7-empty">Memuat data badal...</div></div></div></section>
        <section class="ak7-card"><div class="ak7-head"><div><b>Kesiapan Nilai Rapor</b><small>Berdasarkan kelengkapan nilai mapel.</small></div></div><div class="ak7-ready"><div id="ak7-ring" class="ak7-ring" style="--p:0"><strong id="ak7-ready-pct">—</strong></div><div class="ak7-ready-row"><span>Lengkap</span><b id="ak7-complete">—</b></div><div class="ak7-ready-row"><span>Dalam Proses</span><b id="ak7-process">—</b></div><div class="ak7-ready-row"><span>Belum Mulai</span><b id="ak7-empty-count">—</b></div><button class="ak7-btn sec" style="width:100%;margin-top:7px" onclick="cqAk7Go('akd-rapor-ready')">Lihat Detail</button></div></section>
      </div>
    </div>`;
  }

  function mount(){
    if(!isAcademic()||!dashboardActive()||!appVisible()) return false;
    injectCss();
    document.body.classList.add('cq-ak7');
    const c=document.getElementById('content');
    if(!c) return false;
    if(!c.querySelector('#cq-ak7')) c.innerHTML=shell();
    return true;
  }

  async function post(url,body){
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),18000);
    try{
      const r=await fetch(url,{method:'POST',headers:headers(),body:JSON.stringify(body||{}),signal:controller.signal});
      const raw=await r.text();
      let d={};try{d=raw?JSON.parse(raw):{};}catch(_){throw new Error('Respons data akademik tidak valid.');}
      if(!r.ok||d.success===false) throw new Error(d.message||d.detail||d.error||('HTTP '+r.status));
      return d;
    }finally{clearTimeout(timer);}
  }

  async function load(force){
    if(!force&&state.lastData&&Date.now()-state.lastAt<30000) return state.lastData;
    const results=await Promise.allSettled([
      post(EP.report,{academic_year:AY,semester_no:SEM}),
      post(EP.analytics,{academic_year:AY,semester_no:SEM}),
      post(EP.ops,{action:'summary'})
    ]);
    const data={report:{},analytics:{},ops:{teachers:[],badal_today:[]},errors:[]};
    if(results[0].status==='fulfilled') data.report=results[0].value; else data.errors.push('Laporan guru: '+(results[0].reason?.message||'gagal dimuat'));
    if(results[1].status==='fulfilled') data.analytics=results[1].value; else data.errors.push('Analitik nilai: '+(results[1].reason?.message||'gagal dimuat'));
    if(results[2].status==='fulfilled') data.ops=results[2].value; else data.errors.push('Badal: '+(results[2].reason?.message||'gagal dimuat'));
    state.lastData=data;state.lastAt=Date.now();return data;
  }

  function text(id,v){const el=document.getElementById(id);if(el)el.textContent=v;}
  function paintData(d){
    if(!document.getElementById('cq-ak7')) return;
    const report=d.report||{},analytics=d.analytics||{},ops=d.ops||{};
    const teachers=(report.teachers||[]).slice().sort((a,b)=>num(a.progress)-num(b.progress));
    const assignments=(analytics.assignment_reports||[]).slice().sort((a,b)=>num(a.completion)-num(b.completion));
    const pending=assignments.filter(x=>num(x.completion)<100);
    const notStarted=num(report.summary?.not_started||teachers.filter(x=>String(x.status||'').toLowerCase().includes('belum input')).length);
    const prio=num(analytics.summary?.attention||analytics.attention_students?.length||0);
    const badal=(ops.badal_today||[]).slice();
    const complete=assignments.filter(x=>num(x.completion)>=100).length;
    const process=assignments.filter(x=>num(x.completion)>0&&num(x.completion)<100).length;
    const empty=assignments.filter(x=>num(x.completion)<=0).length;
    const readyPct=assignments.length?Math.round(complete/assignments.length*100):0;

    text('ak7-notstarted',notStarted);
    text('ak7-pending',pending.length);
    text('ak7-prio',prio);
    text('ak7-badal-kpi',badal.length);
    text('ak7-ready-pct',readyPct+'%');
    text('ak7-complete',complete);
    text('ak7-process',process);
    text('ak7-empty-count',empty);
    const ring=document.getElementById('ak7-ring');if(ring)ring.style.setProperty('--p',readyPct);

    const monitor=document.getElementById('ak7-monitor');
    if(monitor){
      monitor.innerHTML=assignments.slice(0,8).map(x=>{
        const c=num(x.completion);const cls=c<70?'bad':c<100?'warn':'';const status=c>=100?'Lengkap':c<=0?'Belum Input':'Dalam Proses';
        return `<tr><td><b>${esc(x.teacher_name||'—')}</b></td><td>${esc(x.subject_name||'—')}</td><td>${esc(x.class_name||'—')}</td><td>${pct(c)}<span class="ak7-bar"><i style="width:${clamp(c)}%"></i></span></td><td>${num(x.filled)}/${num(x.expected)}</td><td>${Number.isFinite(Number(x.average))?Math.round(Number(x.average)*10)/10:'—'}</td><td><span class="ak7-badge ${cls}">${status}</span></td></tr>`;
      }).join('')||'<tr><td colspan="7"><div class="ak7-empty">Belum ada data penugasan akademik.</div></td></tr>';
    }

    const alerts=[];
    teachers.filter(x=>String(x.status||'').toLowerCase().includes('belum input')||num(x.zero_assignments)>0).slice(0,2).forEach(x=>alerts.push(['bad',x.teacher_name||'Guru mapel',(num(x.zero_assignments)||1)+' penugasan belum mulai diisi.']));
    pending.slice(0,2).forEach(x=>alerts.push(['warn',(x.subject_name||'Mapel')+' · '+(x.class_name||''),'Kelengkapan nilai '+pct(x.completion)+'.']));
    if(prio) alerts.push(['info','Siswa prioritas',prio+' siswa memerlukan perhatian akademik.']);
    const alertEl=document.getElementById('ak7-alerts');if(alertEl)alertEl.innerHTML=alerts.slice(0,5).map(a=>`<div class="ak7-alert ${a[0]}"><i></i><div><b>${esc(a[1])}</b><span>${esc(a[2])}</span></div></div>`).join('')||'<div class="ak7-empty">Tidak ada prioritas tinggi dari data yang tersedia.</div>';

    const badalEl=document.getElementById('ak7-badal-list');if(badalEl)badalEl.innerHTML=badal.slice(0,5).map(x=>`<div class="ak7-badal-row"><b>${esc(String(x.start_time||'').slice(0,5)||'—')}</b><span>${esc(x.class_name||'—')}</span><span>${esc(x.subject_name||'—')}</span><span>${esc(x.original_teacher_name||'—')}</span><span><b>${esc(x.substitute_teacher_name||'—')}</b></span></div>`).join('')||'<div class="ak7-empty">Belum ada penugasan badal aktif hari ini.</div>';

    const note=document.getElementById('ak7-note');
    if(note){
      if(d.errors&&d.errors.length){note.textContent='Sebagian data belum dapat dimuat: '+d.errors.join(' · ');note.classList.add('show');}
      else {note.textContent='';note.classList.remove('show');}
    }
  }

  async function render(force){
    if(!mount()) return;
    if(state.loading) return;
    state.loading=true;
    try{paintData(await load(force));}
    catch(err){
      const note=document.getElementById('ak7-note');if(note){note.textContent='Dashboard tetap aktif, tetapi data belum dapat dimuat: '+(err?.message||'Terjadi kendala.');note.classList.add('show');}
    }finally{state.loading=false;}
  }

  function schedule(force){
    clearTimeout(state.repairTimer);
    state.repairTimer=setTimeout(()=>render(force),30);
  }

  try{
    if(typeof DASHBOARD_MODULE!=='undefined'){
      if(Array.isArray(DASHBOARD_MODULE.roles)&&!DASHBOARD_MODULE.roles.includes('akademik'))DASHBOARD_MODULE.roles.push('akademik');
      const base=DASHBOARD_MODULE.render;
      DASHBOARD_MODULE.render=function(c){
        if(isAcademic()){state.active=true;try{if(typeof activeModule!=='undefined')activeModule='dashboard';}catch(_){ }schedule(true);return;}
        return typeof base==='function'?base.apply(this,arguments):undefined;
      };
    }
  }catch(e){console.warn('AK7 dashboard module:',e);}

  try{
    if(typeof setActiveModule==='function'){
      const base=setActiveModule;
      setActiveModule=function(id){
        if(isAcademic()&&String(id)==='dashboard'){
          state.active=true;
          try{if(typeof activeModule!=='undefined')activeModule='dashboard';}catch(_){ }
          try{if(typeof renderSidebar==='function')renderSidebar();}catch(_){ }
          schedule(true);
          return;
        }
        if(isAcademic()) state.active=false;
        return base.apply(this,arguments);
      };
    }
  }catch(e){console.warn('AK7 navigation:',e);}

  try{
    if(typeof enterApp==='function'){
      const base=enterApp;
      enterApp=function(){
        const out=base.apply(this,arguments);
        if(isAcademic()){
          state.active=true;
          setTimeout(()=>schedule(true),0);
          setTimeout(()=>schedule(false),300);
          setTimeout(()=>schedule(false),1200);
        }
        return out;
      };
    }
  }catch(e){console.warn('AK7 enterApp:',e);}

  document.addEventListener('click',function(ev){
    const target=ev.target?.closest?.('#sidebar button,#sidebar a');
    if(!target||!isAcademic()) return;
    if(target.closest('.nav-group-head')) return;
    const label=String(target.textContent||'').trim();
    if(label==='Dashboard'){state.active=true;setTimeout(()=>schedule(true),0);}
    else if(target.classList.contains('nav-item')||/setActiveModule/.test(target.getAttribute('onclick')||'')) state.active=false;
  },true);

  function watchContent(){
    const c=document.getElementById('content');if(!c)return;
    new MutationObserver(function(){
      if(isAcademic()&&dashboardActive()&&appVisible()&&!c.querySelector('#cq-ak7'))schedule(false);
    }).observe(c,{childList:true,subtree:false});
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',function(){watchContent();setTimeout(()=>schedule(false),100);},{once:true});
  }else{
    watchContent();setTimeout(()=>schedule(false),100);
  }
  window.addEventListener('load',function(){setTimeout(()=>schedule(false),150);setTimeout(()=>schedule(false),1000);},{once:true});
  setInterval(function(){if(isAcademic()&&dashboardActive()&&appVisible()&&!document.getElementById('cq-ak7'))schedule(false);},1200);

  window.renderAcademicDashboardV7=function(force){state.active=true;return render(force!==false);};
  window.__CQ_AK_STANDALONE_V7__=true;
})();
