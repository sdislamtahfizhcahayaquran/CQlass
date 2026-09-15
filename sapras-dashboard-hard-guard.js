/* CQlass — Sapras Dashboard Hard Guard
   Ensures role sapras always sees a dashboard focused on incoming facility reports.
*/
(function(){
  'use strict';
  if(window.__CQ_SAPRAS_HARD_GUARD__) return;
  window.__CQ_SAPRAS_HARD_GUARD__=true;

  const BASE=(typeof SUPABASE_URL!=='undefined'?SUPABASE_URL:'https://lmglkxzemtvxcgktiord.supabase.co');
  const KEY=(typeof SUPABASE_PUBLISHABLE_KEY!=='undefined'?SUPABASE_PUBLISHABLE_KEY:'');
  const API=BASE+'/functions/v1/internal-reporting';
  const state={reports:[],busy:false,loaded:false,error:''};

  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const norm=v=>String(v||'').trim().toLowerCase().replace(/[\s-]+/g,'_');
  const statusKey=s=>String(s||'').toUpperCase();
  const statusLabel=s=>({TERKIRIM:'Menunggu',DILAPORKAN:'Menunggu',DIPROSES:'Diproses',SELESAI:'Selesai'}[statusKey(s)]||String(s||'-'));
  const statusClass=s=>statusKey(s)==='SELESAI'?'done':statusKey(s)==='DIPROSES'?'process':'wait';
  const token=()=>{try{return typeof getAuthToken==='function'?getAuthToken():(localStorage.getItem('cqlass_session_token')||'')}catch(_){return ''}};

  function readUser(){
    try{if(typeof currentUser!=='undefined'&&currentUser)return currentUser;}catch(_){ }
    try{return JSON.parse(localStorage.getItem('cqlass_user')||'null')||{};}catch(_){return {};}
  }
  function role(){
    const u=readUser();
    return norm(u.role_code||u.role||u.primary_role||(Array.isArray(u.roles)&&u.roles[0])||'');
  }
  function isSapras(){return role()==='sapras'}
  function dashboardActive(){
    try{if(typeof activeModule!=='undefined'&&activeModule!=null)return String(activeModule)==='dashboard';}catch(_){ }
    const sb=document.getElementById('sidebar');
    const a=sb&&sb.querySelector('.nav-item.active,.active[aria-current="page"]');
    return !!(a&&String(a.textContent||'').trim().toLowerCase()==='dashboard');
  }
  function appVisible(){const a=document.getElementById('app-screen');return !!(a&&getComputedStyle(a).display!=='none')}
  function content(){return document.getElementById('content')}
  function toast(msg,error){try{if(typeof showToast==='function')return showToast(msg,!!error)}catch(_){ } if(error)console.error(msg);}
  function formatDate(v){try{return new Intl.DateTimeFormat('id-ID',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Jakarta'}).format(new Date(v))+' WIB'}catch(_){return String(v||'')}}

  async function req(action,payload={}){
    const h={'Content-Type':'application/json','apikey':KEY,'Authorization':'Bearer '+KEY};
    const t=token();if(t)h['x-session-token']=t;
    const ctrl=new AbortController();const timer=setTimeout(()=>ctrl.abort(),30000);
    try{
      const r=await fetch(API,{method:'POST',headers:h,body:JSON.stringify({action,...payload}),signal:ctrl.signal});
      const d=await r.json().catch(()=>({}));
      if(!r.ok||d.success===false)throw new Error(d.error||'request_failed');
      return d;
    }finally{clearTimeout(timer)}
  }

  function injectCss(){
    if(document.getElementById('cq-sapras-hard-css'))return;
    const s=document.createElement('style');s.id='cq-sapras-hard-css';s.textContent=`
      .cq-sg{max-width:1240px;margin:0 auto;padding:0 0 34px;color:#173f3d}
      .cq-sg-hero{position:relative;overflow:hidden;background:linear-gradient(135deg,#075d5b 0%,#0c7670 58%,#2c9c90);border-radius:28px;padding:30px 34px;color:#fff;box-shadow:0 16px 42px rgba(9,91,86,.16);margin-bottom:18px}
      .cq-sg-hero:after{content:'';position:absolute;width:280px;height:280px;border-radius:50%;right:-80px;top:-110px;border:1px solid rgba(255,255,255,.16);box-shadow:0 0 0 32px rgba(255,255,255,.045),0 0 0 68px rgba(255,255,255,.024)}
      .cq-sg-eye{font-size:12px;font-weight:900;letter-spacing:.12em;text-transform:uppercase;opacity:.82;margin-bottom:8px}.cq-sg-hero h1{font-size:32px;line-height:1.12;margin:0 0 7px;position:relative;z-index:1}.cq-sg-hero p{margin:0;opacity:.91;font-size:14px;position:relative;z-index:1}
      .cq-sg-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin-bottom:16px}.cq-sg-kpi{background:#fff;border:1px solid #d9e9e6;border-radius:19px;padding:18px;box-shadow:0 8px 25px rgba(24,80,75,.055)}.cq-sg-kpi strong{display:block;font-size:30px;line-height:1;color:#0b615d;margin-bottom:7px}.cq-sg-kpi span{font-size:12px;font-weight:850;color:#4e6e6b}.cq-sg-kpi small{display:block;font-size:10px;color:#839794;margin-top:4px}.cq-sg-kpi.wait strong{color:#2e709f}.cq-sg-kpi.process strong{color:#9a6a12}.cq-sg-kpi.done strong{color:#247047}
      .cq-sg-layout{display:grid;grid-template-columns:minmax(0,1.65fr) minmax(290px,.85fr);gap:16px;align-items:start}.cq-sg-card{background:#fff;border:1px solid #dce9e7;border-radius:20px;padding:20px;box-shadow:0 8px 26px rgba(24,80,75,.05);margin-bottom:16px}.cq-sg-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:14px}.cq-sg-head h2{font-size:17px;margin:0;color:#183f3d}.cq-sg-muted{font-size:11px;color:#829491;margin-top:3px}.cq-sg-count{background:#edf8f6;color:#14716a;border-radius:999px;padding:5px 9px;font-size:11px;font-weight:900}
      .cq-sg-list{display:grid;gap:11px}.cq-sg-row{border:1px solid #e0ece9;border-radius:15px;padding:14px;background:#fff}.cq-sg-row.priority{background:linear-gradient(180deg,#fff,#fbfefd);border-color:#cee5e0}.cq-sg-rowtop{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.cq-sg-ticket{font-size:13px;font-weight:900;color:#163f3d}.cq-sg-meta{font-size:10px;color:#81938f;margin-top:4px}.cq-sg-badge{display:inline-flex;padding:5px 9px;border-radius:999px;font-size:10px;font-weight:900}.cq-sg-badge.wait{background:#e9f5ff;color:#2d6d9b}.cq-sg-badge.process{background:#fff2d8;color:#936712}.cq-sg-badge.done{background:#e8f6ec;color:#297148}.cq-sg-row p{font-size:12px;line-height:1.5;color:#466663;margin:8px 0}.cq-sg-row p b{color:#214d49}.cq-sg-photo{display:inline-flex;font-size:11px;font-weight:800;color:#0b7770;text-decoration:none;margin-top:2px}.cq-sg-actions{display:flex;gap:8px;justify-content:flex-end;border-top:1px solid #edf3f1;padding-top:10px;margin-top:10px}.cq-sg-btn{border:0;border-radius:11px;padding:9px 12px;font:800 11px/1.2 inherit;cursor:pointer}.cq-sg-btn.process{background:#eef7f5;color:#176c66}.cq-sg-btn.done{background:#e9f7ee;color:#247047}
      .cq-sg-note{background:#f1f8f6;border:1px solid #dcece8;border-radius:16px;padding:14px;font-size:12px;line-height:1.55;color:#55716e}.cq-sg-note b{display:block;color:#214d49;margin-bottom:5px}.cq-sg-steps{display:grid;gap:10px;margin-top:13px}.cq-sg-step{display:flex;gap:9px;align-items:flex-start}.cq-sg-step i{font-style:normal;width:25px;height:25px;border-radius:8px;background:#dff1ed;color:#0b746d;display:grid;place-items:center;font-weight:900;flex:none}
      .cq-sg-empty{text-align:center;padding:28px 12px;color:#82938f;font-size:12px}.cq-sg-loading{text-align:center;padding:30px;color:#7e928e}
      @media(max-width:920px){.cq-sg-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.cq-sg-layout{grid-template-columns:1fr}}@media(max-width:620px){.cq-sg-hero{border-radius:20px;padding:23px 20px}.cq-sg-hero h1{font-size:25px}.cq-sg-kpis{gap:10px}.cq-sg-kpi{padding:14px}.cq-sg-kpi strong{font-size:25px}.cq-sg-card{padding:15px;border-radius:16px}.cq-sg-rowtop{flex-direction:column}.cq-sg-actions .cq-sg-btn{flex:1}}
    `;document.head.appendChild(s);
  }

  function counts(){
    const all=state.reports||[];
    return {all:all.length,wait:all.filter(x=>['TERKIRIM','DILAPORKAN'].includes(statusKey(x.status))).length,process:all.filter(x=>statusKey(x.status)==='DIPROSES').length,done:all.filter(x=>statusKey(x.status)==='SELESAI').length};
  }
  function row(r,priority){
    const st=statusKey(r.status);const open=st!=='SELESAI';
    return `<div class="cq-sg-row${priority?' priority':''}"><div class="cq-sg-rowtop"><div><div class="cq-sg-ticket">${esc(r.ticket_no||'Laporan')} · ${esc(r.reporter_name||'Wali Kelas')}</div><div class="cq-sg-meta">${formatDate(r.created_at)}${r.location?' · '+esc(r.location):''}</div></div><span class="cq-sg-badge ${statusClass(r.status)}">${statusLabel(r.status)}</span></div><p><b>Deskripsi:</b> ${esc(r.description||'-')}</p><p><b>Harapan:</b> ${esc(r.requested_action||'-')}</p>${r.photo_signed_url?`<a class="cq-sg-photo" href="${esc(r.photo_signed_url)}" target="_blank" rel="noopener">Lihat foto kondisi ↗</a>`:''}${r.resolution_note?`<p><b>Catatan penyelesaian:</b> ${esc(r.resolution_note)}</p>`:''}${open?`<div class="cq-sg-actions">${['TERKIRIM','DILAPORKAN'].includes(st)?`<button class="cq-sg-btn process" data-sg-process="${esc(r.id)}">Mulai Proses</button>`:''}<button class="cq-sg-btn done" data-sg-done="${esc(r.id)}">Tandai Selesai</button></div>`:''}</div>`;
  }
  function list(rows,priority,empty){return rows.length?`<div class="cq-sg-list">${rows.map(r=>row(r,priority)).join('')}</div>`:`<div class="cq-sg-empty">${esc(empty)}</div>`}
  function shell(){
    const u=readUser(),name=esc(u.nama||u.full_name||u.name||u.username||'Tim Sapras');
    const c=counts();const open=(state.reports||[]).filter(x=>statusKey(x.status)!=='SELESAI');const done=(state.reports||[]).filter(x=>statusKey(x.status)==='SELESAI').slice(0,6);
    return `<div class="cq-sg" data-cq-sapras-dashboard="1"><section class="cq-sg-hero"><div class="cq-sg-eye">CQlass · Sapras</div><h1>Dashboard Sapras</h1><p>Selamat bekerja, ${name}. Fokus pada laporan fasilitas: cek kondisi, mulai proses, dan catat penyelesaiannya.</p></section><section class="cq-sg-kpis"><div class="cq-sg-kpi"><strong>${c.all}</strong><span>Total Laporan</span><small>semua laporan Sapras</small></div><div class="cq-sg-kpi wait"><strong>${c.wait}</strong><span>Menunggu</span><small>belum mulai ditangani</small></div><div class="cq-sg-kpi process"><strong>${c.process}</strong><span>Diproses</span><small>sedang dikerjakan</small></div><div class="cq-sg-kpi done"><strong>${c.done}</strong><span>Selesai</span><small>sudah dituntaskan</small></div></section><div class="cq-sg-layout"><section class="cq-sg-card"><div class="cq-sg-head"><div><h2>Perlu Ditangani</h2><div class="cq-sg-muted">Laporan menunggu dan sedang diproses.</div></div><span class="cq-sg-count">${open.length}</span></div>${list(open,true,'Tidak ada laporan yang perlu ditangani.')}</section><aside><section class="cq-sg-card"><div class="cq-sg-head"><div><h2>Alur Kerja Sapras</h2><div class="cq-sg-muted">Dashboard khusus sarana-prasarana.</div></div></div><div class="cq-sg-note"><b>Tidak menampilkan Akademik, Kehadiran, Tahfizh, PjBL, atau Ekskul.</b>Dashboard ini hanya membaca laporan Sapras dari wali kelas.<div class="cq-sg-steps"><div class="cq-sg-step"><i>1</i><span>Cek deskripsi, lokasi, dan foto kondisi.</span></div><div class="cq-sg-step"><i>2</i><span>Klik <b>Mulai Proses</b> ketika pekerjaan mulai ditangani.</span></div><div class="cq-sg-step"><i>3</i><span>Klik <b>Tandai Selesai</b> setelah pekerjaan selesai.</span></div></div></div></section><section class="cq-sg-card"><div class="cq-sg-head"><div><h2>Selesai Terbaru</h2><div class="cq-sg-muted">Maksimal 6 pekerjaan terakhir.</div></div><span class="cq-sg-count">${done.length}</span></div>${list(done,false,'Belum ada pekerjaan yang ditandai selesai.')}</section></aside></div></div>`;
  }
  function bind(root){
    root.querySelectorAll('[data-sg-process]').forEach(b=>b.onclick=()=>update(b.dataset.sgProcess,'DIPROSES',''));
    root.querySelectorAll('[data-sg-done]').forEach(b=>b.onclick=()=>{const n=window.prompt('Catatan penyelesaian (opsional):','');update(b.dataset.sgDone,'SELESAI',n||'')});
  }
  function paint(){
    if(!isSapras()||!dashboardActive()||!appVisible())return;
    const c=content();if(!c)return;
    injectCss();c.innerHTML=shell();bind(c);
  }
  async function load(force){
    if(!isSapras()||!dashboardActive()||!appVisible())return;
    if(state.busy)return;
    if(state.loaded&&!force){paint();return;}
    state.busy=true;state.error='';
    const c=content();if(c&&!c.querySelector('[data-cq-sapras-dashboard]')){injectCss();c.innerHTML='<div class="cq-sg" data-cq-sapras-dashboard="1"><section class="cq-sg-hero"><div class="cq-sg-eye">CQlass · Sapras</div><h1>Dashboard Sapras</h1><p>Menyiapkan laporan sarana-prasarana...</p></section><div class="cq-sg-card cq-sg-loading">Memuat laporan Sapras...</div></div>'}
    try{const d=await req('inbox',{report_type:'SAPRAS'});state.reports=d.reports||[];state.loaded=true;paint();}
    catch(e){state.error=e.message||'Gagal memuat laporan Sapras.';if(c)c.innerHTML='<div class="cq-sg" data-cq-sapras-dashboard="1"><section class="cq-sg-hero"><div class="cq-sg-eye">CQlass · Sapras</div><h1>Dashboard Sapras</h1><p>Dashboard khusus sarana-prasarana.</p></section><div class="cq-sg-card"><div class="cq-sg-empty">Laporan belum dapat dimuat. Silakan coba lagi.</div></div></div>';console.warn('Sapras dashboard:',e)}
    finally{state.busy=false;}
  }
  async function update(id,status,note){
    try{await req('update_status',{id,status,resolution_note:note||''});toast(status==='SELESAI'?'Laporan ditandai selesai.':'Laporan mulai diproses.');state.loaded=false;await load(true)}catch(e){toast('Status laporan gagal diperbarui.',true)}
  }
  function enforce(){
    if(!isSapras()||!dashboardActive()||!appVisible())return;
    const c=content();if(!c)return;
    if(!c.querySelector('[data-cq-sapras-dashboard]'))load(false);
  }
  function patchDashboard(){
    try{
      if(typeof DASHBOARD_MODULE!=='undefined'&&!DASHBOARD_MODULE.__cqSaprasHardGuard){
        if(Array.isArray(DASHBOARD_MODULE.roles)&&!DASHBOARD_MODULE.roles.includes('sapras'))DASHBOARD_MODULE.roles.push('sapras');
        const base=DASHBOARD_MODULE.render;
        DASHBOARD_MODULE.render=function(c){if(isSapras())return load(true);return typeof base==='function'?base.apply(this,arguments):undefined};
        DASHBOARD_MODULE.__cqSaprasHardGuard=true;
      }
    }catch(e){console.warn('Sapras dashboard patch:',e)}
  }

  patchDashboard();
  const obs=new MutationObserver(()=>setTimeout(enforce,0));
  if(document.documentElement)obs.observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener('DOMContentLoaded',()=>{patchDashboard();setTimeout(()=>load(false),50)},{once:true});
  document.addEventListener('click',()=>setTimeout(enforce,30),true);
  setInterval(()=>{patchDashboard();enforce()},700);
  setTimeout(()=>load(false),60);
  window.renderSaprasHardDashboard=()=>load(true);
})();