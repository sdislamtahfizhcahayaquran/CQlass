/* CQlass — HRD clean workspace */
(function(){
'use strict';
if(window.__cqHrdWorkspaceLoaded)return;
window.__cqHrdWorkspaceLoaded=true;

const jktDate=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const state={active:'dashboard',month:jktDate().slice(0,7),dailyDate:jktDate(),admin:null,liveQuery:'',liveSort:'issues',monthlyQuery:'',monthlyRole:'all',monthlyStatus:'all',monthlySort:'az',reportOpen:false,manageOpen:false};
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const low=v=>String(v??'').trim().toLowerCase();
const content=()=>document.getElementById('content');
const token=()=>{try{return typeof getAuthToken==='function'?getAuthToken():(localStorage.getItem('cqlass_session_token')||'')}catch(_){return''}};
const baseUrl=()=>typeof SUPABASE_URL!=='undefined'?SUPABASE_URL:'https://lmglkxzemtvxcgktiord.supabase.co';
const publishable=()=>typeof SUPABASE_PUBLISHABLE_KEY!=='undefined'?SUPABASE_PUBLISHABLE_KEY:'';
const minDate=(a,b)=>String(a)<=String(b)?String(a):String(b);
const monthRange=m=>{const[y,mo]=String(m).split('-').map(Number);return{start:m+'-01',end:new Date(Date.UTC(y,mo,0)).toISOString().slice(0,10)}};

function readUser(){try{return (typeof currentUser!=='undefined'&&currentUser)||JSON.parse(localStorage.getItem('cqlass_user')||'{}')||{}}catch(_){return{}}}
function isHrd(){const u=readUser(),norm=x=>low(x).replace(/[\s-]+/g,'_'),r=[u.role,u.primary_role,u.role_code,...(Array.isArray(u.roles)?u.roles.map(x=>typeof x==='string'?x:(x?.role_code||x?.role||'')):[])].map(norm);return norm(u.username)==='hrd'||r.includes('hrd')||r.includes('human_resources')||r.includes('human_resource')}
function stampDom(){if(!isHrd())return;const app=document.getElementById('app-screen'),side=document.getElementById('sidebar'),main=document.getElementById('content');document.documentElement.dataset.cqHrd='workspace';if(app)app.dataset.cqRoleWorkspace='hrd';if(side)side.dataset.cqOwner='hrd-workspace';if(main)main.dataset.cqOwner='hrd-workspace'}


async function api(slug,payload){
  const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),12000);
  try{
    const res=await fetch(baseUrl()+'/functions/v1/'+slug,{method:'POST',headers:{'Content-Type':'application/json','apikey':publishable(),'Authorization':'Bearer '+publishable(),'x-session-token':token()},body:JSON.stringify(payload||{}),signal:ctrl.signal});
    const raw=await res.text();let data={};try{data=raw?JSON.parse(raw):{}}catch(_){throw new Error('Respons HRD tidak valid.');}
    if(!res.ok||data.success===false)throw new Error(data.message||data.error||'Data HRD belum dapat dimuat.');
    return data;
  }catch(e){if(e?.name==='AbortError')throw new Error('Layanan HRD terlalu lama merespons.');throw e}
  finally{clearTimeout(timer)}
}

function installCss(){
  if(document.getElementById('cq-hrd-clean-css'))return;
  const s=document.createElement('style');s.id='cq-hrd-clean-css';s.textContent=`
  .cq-hrd-side{padding:18px 14px 26px;display:flex;flex-direction:column;gap:7px}.cq-hrd-section{margin:17px 8px 4px;font-size:10px;font-weight:900;letter-spacing:.12em;text-transform:uppercase;color:#718582}.cq-hrd-nav{width:100%;min-height:44px;border:0;border-radius:12px;background:transparent;color:#294846;padding:0 13px;display:flex;align-items:center;font:750 13px/1.2 Inter,system-ui,sans-serif;text-align:left;cursor:pointer}.cq-hrd-nav:hover{background:#eef7f5}.cq-hrd-nav.active{background:#0a6e6e;color:#fff}.cq-hrd-group-label{width:100%;border:0;background:transparent;margin:7px 0 2px;padding:9px 11px;border-radius:9px;color:#607774;text-align:left;cursor:pointer;font:900 9px/1.2 Inter,system-ui,sans-serif;text-transform:uppercase;letter-spacing:.1em}.cq-hrd-group-label:hover,.cq-hrd-group-label.open{background:#eef7f5;color:#234d49}.cq-hrd-sub{display:grid;gap:2px;padding:0}.cq-hrd-sub[hidden]{display:none!important}.cq-hrd-sub .cq-hrd-nav{padding-left:12px;background:transparent}.cq-hrd-sub .cq-hrd-nav:hover{background:#eef7f5}.cq-hrd-sub .cq-hrd-nav.active{background:#0d7c76;color:#fff}.cq-hrd-sub .cq-hrd-nav{min-height:38px;font-size:12px}
  @media(max-width:760px){
    .layout:has(.cq-hrd-side){display:block!important}
    .sidebar:has(>.cq-hrd-side){width:100%!important;min-width:0!important;height:auto!important;min-height:0!important;position:static!important;border-right:0!important;border-bottom:1px solid #d9e9e6!important}
    .sidebar:has(>.cq-hrd-side) .cq-hrd-side{padding:8px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px}
    .sidebar:has(>.cq-hrd-side) .cq-hrd-nav{min-height:38px;padding:0 9px;font-size:11px}
    .sidebar:has(>.cq-hrd-side) .cq-hrd-group-label{margin:8px 4px 3px;grid-column:1/-1}
    .sidebar:has(>.cq-hrd-side) .cq-hrd-sub{display:contents}
    .sidebar:has(>.cq-hrd-side) .cq-hrd-sub .cq-hrd-nav{padding-left:9px}
    .content:has(.cq-hrd-clean-mode),.content.cq-hrd-clean-mode{width:100%!important;max-width:none!important;padding:10px!important}
    .cq-hrd-head{border-radius:16px!important;padding:16px!important}
    .cq-hrd-grid{grid-template-columns:1fr 1fr!important}
    .cq-hrd-table-wrap{overflow-x:auto!important;-webkit-overflow-scrolling:touch}
    .cq-hrd-table{min-width:620px}
  }
  .cq-hrd-clean{display:grid;gap:14px}.cq-hrd-head{display:flex;justify-content:space-between;gap:14px;align-items:flex-end;padding:19px 20px;border-radius:18px;background:linear-gradient(135deg,#073f43,#0a6e6e);color:#fff}.cq-hrd-head h1{font-size:22px;margin:3px 0 5px}.cq-hrd-head p{margin:0;color:#d9eeee;font-size:11px;line-height:1.55}.cq-hrd-eyebrow{font-size:9px;font-weight:900;letter-spacing:.13em;text-transform:uppercase;color:#aee2de}.cq-hrd-page-title{display:flex;align-items:end;justify-content:space-between;gap:12px;padding:0 2px 2px}.cq-hrd-page-title h1{margin:0 0 3px;color:#173f3d;font-size:18px;line-height:1.2}.cq-hrd-page-title p{margin:0;color:#718582;font-size:9.5px;line-height:1.4}
  .cq-hrd-tools{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.cq-hrd-tools input,.cq-hrd-tools select{height:39px;border:1px solid #d6e5e3;border-radius:11px;background:#fff;padding:0 11px;color:#294846}.cq-hrd-btn{height:39px;border:0;border-radius:11px;background:#0a6e6e;color:#fff;padding:0 13px;font-weight:850;cursor:pointer}.cq-hrd-btn.alt{background:#e9f4f2;color:#0a6763}.cq-hrd-btn.danger{background:#fff0ee;color:#a13d35}
  .cq-hrd-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.cq-hrd-kpi,.cq-hrd-panel{background:#fff;border:1px solid #dce9e7;border-radius:16px;padding:15px;box-shadow:0 5px 18px rgba(20,70,70,.04)}.cq-hrd-kpi span{display:block;font-size:10px;color:#748986;font-weight:750}.cq-hrd-kpi b{display:block;font-size:24px;color:#183f3d;margin-top:7px}.cq-hrd-kpi small{display:block;font-size:9px;color:#91a19e;margin-top:3px}.cq-hrd-panel h2{margin:0 0 12px;font-size:15px;color:#214441}
  .cq-hrd-table-wrap{overflow:auto;border:1px solid #e0eae8;border-radius:14px}.cq-hrd-table{width:100%;border-collapse:collapse;min-width:760px}.cq-hrd-table th{padding:10px 11px;text-align:left;background:#f1f7f6;color:#607773;font-size:9px;text-transform:uppercase;letter-spacing:.05em}.cq-hrd-table td{padding:11px;border-top:1px solid #edf2f1;color:#355451;font-size:11px;vertical-align:top}.cq-hrd-table td b{color:#193f3d}
  .cq-hrd-chip{display:inline-block;border-radius:999px;background:#edf6f4;color:#356d67;padding:5px 8px;font-size:9px;font-weight:850;margin:2px 3px 2px 0}.cq-hrd-promo-tools{display:grid;grid-template-columns:minmax(180px,1fr) 170px 170px auto;gap:8px;margin-bottom:12px}.cq-hrd-promo-evidence{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.cq-hrd-promo-view{border:0;cursor:pointer}.cq-hrd-modal{position:fixed;inset:0;z-index:99999;background:rgba(8,35,35,.72);display:flex;align-items:center;justify-content:center;padding:18px}.cq-hrd-modal-card{width:min(760px,96vw);max-height:92vh;overflow:auto;background:#fff;border-radius:18px;padding:14px;box-shadow:0 24px 70px rgba(0,0,0,.25)}.cq-hrd-modal-head{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:10px}.cq-hrd-modal-head b{font-size:14px;color:#193f3d}.cq-hrd-modal-close{border:0;background:#edf6f4;color:#285f5a;border-radius:10px;padding:8px 11px;font-weight:900;cursor:pointer}.cq-hrd-modal-img{width:100%;max-height:68vh;object-fit:contain;background:#f4f8f7;border-radius:13px;display:block}.cq-hrd-modal-meta{margin-top:10px;padding:10px 12px;background:#f4f8f7;border-radius:12px;color:#355451;font-size:11px;line-height:1.65}@media(max-width:620px){.cq-hrd-promo-tools{grid-template-columns:1fr 1fr}.cq-hrd-promo-tools input{grid-column:1/-1}}.cq-hrd-chip.bad{background:#fff0ee;color:#a13d35}.cq-hrd-chip.warn{background:#fff8e7;color:#8b6816}.cq-hrd-chip.ok{background:#eaf7ef;color:#24714b}.cq-hrd-empty{padding:28px;text-align:center;color:#708783;font-size:11px}
  .cq-hrd-timeline{display:grid;gap:8px}.cq-hrd-time-row{display:grid;grid-template-columns:105px 125px minmax(180px,1.1fr) minmax(220px,1.5fr) 110px;gap:10px;align-items:start;padding:11px 12px;border:1px solid #e3ecea;border-radius:12px;background:#fff}.cq-hrd-time-row.gap{background:#fff8e7;border-color:#f0dfad}.cq-hrd-time-row.off{background:#f6f8f8;color:#738582}.cq-hrd-time{font-weight:900;color:#1f4d49}.cq-hrd-time-title{font-weight:850;color:#244a47}.cq-hrd-time-note{font-size:10px;line-height:1.5;color:#657a77}.cq-hrd-day-summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px}.cq-hrd-day-summary>div{border:1px solid #dce9e7;border-radius:13px;padding:12px;background:#f9fbfb}.cq-hrd-day-summary b{display:block;font-size:20px;color:#183f3d}.cq-hrd-day-summary span{font-size:9px;color:#748986;font-weight:800;text-transform:uppercase}@media(max-width:850px){.cq-hrd-time-row{grid-template-columns:90px 1fr}.cq-hrd-time-row>*:nth-child(n+3){grid-column:2}.cq-hrd-day-summary{grid-template-columns:1fr 1fr}}
  .cq-hrd-quick{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}.cq-hrd-quick button{border:1px solid #dbe8e6;background:#f8fbfb;border-radius:13px;padding:13px;text-align:left;color:#284946;font-weight:850;cursor:pointer}.cq-hrd-quick small{display:block;color:#7a8e8b;font-weight:500;margin-top:5px}
  .cq-hrd-sat{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.cq-hrd-sat-card{border:1px solid #dde9e7;background:#fff;border-radius:15px;padding:14px}.cq-hrd-sat-card h3{margin:0 0 5px;font-size:13px;color:#214441}.cq-hrd-sat-card p{margin:4px 0;color:#708783;font-size:10px;line-height:1.5}.cq-hrd-form{display:grid;grid-template-columns:1.2fr 1.5fr .8fr .8fr 1.5fr auto;gap:9px;align-items:end}.cq-hrd-field{display:grid;gap:5px}.cq-hrd-field label{font-size:9px;text-transform:uppercase;letter-spacing:.06em;color:#6f8582;font-weight:850}.cq-hrd-field input,.cq-hrd-field select{height:40px;border:1px solid #d8e6e4;border-radius:11px;padding:0 10px;background:#fff}
  #content.cq-hrd-clean-mode #hrd-report-inbox-panel,#content.cq-hrd-clean-mode .hrd-navtabs,#content.cq-hrd-clean-mode .cq-hf-wrap{display:none!important}
  @media(max-width:1000px){.cq-hrd-grid{grid-template-columns:repeat(2,1fr)}.cq-hrd-form{grid-template-columns:repeat(2,1fr)}.cq-hrd-sat{grid-template-columns:1fr}}@media(max-width:620px){.cq-hrd-grid,.cq-hrd-quick,.cq-hrd-form{grid-template-columns:1fr}.cq-hrd-head{align-items:flex-start;flex-direction:column}.cq-hrd-tools>*{width:100%}}
  `;document.head.appendChild(s);
}

function navButton(id,label,fn){return `<button class="cq-hrd-nav${state.active===id?' active':''}" onclick="${fn}">${label}</button>`}
function drawSidebar(active){
  if(!isHrd())return false;stampDom();installCss();if(active)state.active=active;
  const s=document.getElementById('sidebar');if(!s)return false;
  s.dataset.cqOwner='hrd-workspace';s.innerHTML=`<div class="cq-hrd-side" data-cq-owner="hrd-workspace">
    ${navButton('dashboard','Dashboard','openHrdCleanDashboard()')}
    <button class="cq-hrd-group-label ${state.reportOpen?'open':''}" onclick="hrdToggleGroup('report')">Laporan</button>
    <div class="cq-hrd-sub" ${state.reportOpen?'':'hidden'}>
      ${navButton('live','Aktivitas Harian 07.00–16.00','openHrdCleanLive()')}
      ${navButton('monthly','Laporan Bulanan','openHrdCleanMonthly()')}
      ${navButton('promotion','Laporan Promo Socmed','openHrdCleanPromotion()')}
    </div>
    <button class="cq-hrd-group-label ${state.manageOpen?'open':''}" onclick="hrdToggleGroup('manage')">Pengelolaan</button>
    <div class="cq-hrd-sub" ${state.manageOpen?'':'hidden'}>
      ${navButton('periods','Pengaturan Periode','openHrdReportPeriods()')}
      ${navButton('saturday-manage','Kegiatan Hari Sabtu','openHrdCleanSaturdayManage()')}
    </div>
  </div>`;
  return true;
}
function setActive(id){state.active=id;stampDom();drawSidebar(id);const c=content();if(c)c.classList.add('cq-hrd-clean-mode')}
function head(title,sub){return `<div class="cq-hrd-page-title"><div><h1>${esc(title)}</h1><p>${esc(sub)}</p></div></div>`}
function loading(title){const c=content();if(c)c.innerHTML=`<div class="cq-hrd-clean">${head(title,'Data ditarik langsung dari sumber CQlass.')}<div class="cq-hrd-panel cq-hrd-empty"><span class="spinner"></span> Memuat...</div></div>`}
function errorView(title,e){const c=content();if(c)c.innerHTML=`<div class="cq-hrd-clean">${head(title,'Data ditarik langsung dari sumber CQlass.')}<div class="cq-hrd-panel cq-hrd-empty">${esc(e?.message||'Data belum dapat dimuat.')}</div></div>`}
function teacherName(t){return t?.name||t?.teacher_name||t?.full_name||'Guru'}
function rolesText(t){const a=t?.role_labels||t?.roles||[];return Array.isArray(a)&&a.length?a.join(', '):(t?.position||t?.role||'—')}
function categoryLabel(c){return c?.label||({rpp:'RPP',timesheet:'Timesheet',academic:'Akademik',tahfizh:'Tahfizh',bilingual:'Bilingual',pjbl:'PBL / Market Day',work_activity:'Aktivitas Kerja',principal_work:'Administrasi Kepala Sekolah',promotion:'Promosi Socmed'}[c?.key]||c?.key||'Data')}
function issueCount(t){return Number(t?.missing_count||0)+Number(t?.partial_count||0)}

async function getAdmin(month=state.month,force=false){
  if(!force&&state.admin&&state.admin.__month===month)return state.admin;
  const r=monthRange(month),end=minDate(r.end,jktDate());
  const d=await api('hrd-live-report',{action:'administration',start:r.start,end});d.__month=month;state.admin=d;return d;
}
function summary(d){const a=d?.summary||{},rows=d?.teachers||[];return{total:Number(a.teachers||a.total_teachers||rows.length||0),clean:Number(a.clean??rows.filter(t=>issueCount(t)===0).length),issues:Number(a.with_issues??rows.filter(t=>issueCount(t)>0).length),promoDone:Number(a.promotion_complete||0),promoMissing:Number(a.promotion_missing||0)}}

async function renderDashboard(){
  setActive('dashboard');
  const c=content();if(!c)return;
  c.innerHTML=`<div class="cq-hrd-clean">${head('Dashboard','Ringkasan HRD bulan berjalan. Detail tersedia di menu Laporan.')}<div class="cq-hrd-grid"><div class="cq-hrd-kpi"><span>Total Guru</span><b>—</b><small>memuat data</small></div><div class="cq-hrd-kpi"><span>Administrasi Lengkap</span><b>—</b><small>memuat data</small></div><div class="cq-hrd-kpi"><span>Perlu Ditindaklanjuti</span><b>—</b><small>memuat data</small></div><div class="cq-hrd-kpi"><span>Promosi Socmed</span><b>—</b><small>memuat data</small></div></div><div class="cq-hrd-panel"><h2>Akses Cepat</h2><div class="cq-hrd-quick"><button onclick="openHrdCleanLive()">Live Report<small>Aktivitas harian guru 07.00–16.00</small></button><button onclick="openHrdCleanMonthly()">Laporan Bulanan<small>Rekap administrasi dan aktivitas guru</small></button><button onclick="openHrdCleanSaturdayManage()">Jadwal Kegiatan Sabtu<small>Atur kegiatan Sabtu</small></button></div></div><div id="cq-hrd-dashboard-status" class="cq-hrd-panel" style="padding:11px 15px;color:#708783;font-size:10px">Sedang menyinkronkan ringkasan laporan… Menu tetap dapat digunakan.</div></div>`;
  try{const d=await getAdmin(),s=summary(d);if(!content())return;content().innerHTML=`<div class="cq-hrd-clean">${head('Dashboard','Ringkasan HRD bulan berjalan. Detail tersedia di menu Laporan.')}<div class="cq-hrd-grid"><div class="cq-hrd-kpi"><span>Total Guru</span><b>${s.total}</b><small>guru aktif terpantau</small></div><div class="cq-hrd-kpi"><span>Administrasi Lengkap</span><b>${s.clean}</b><small>tanpa kekurangan terdeteksi</small></div><div class="cq-hrd-kpi"><span>Perlu Ditindaklanjuti</span><b>${s.issues}</b><small>ada data belum lengkap</small></div><div class="cq-hrd-kpi"><span>Promosi Socmed</span><b>${s.promoDone}</b><small>${s.promoMissing} guru belum</small></div></div><div class="cq-hrd-panel"><h2>Akses Cepat</h2><div class="cq-hrd-quick"><button onclick="openHrdCleanLive()">Aktivitas Harian<small>Timeline kerja guru 07.00–16.00</small></button><button onclick="openHrdCleanMonthly()">Laporan Bulanan<small>Rekap kelengkapan laporan guru</small></button><button onclick="openHrdCleanSaturdayManage()">Jadwal Kegiatan Sabtu<small>HRD menentukan kegiatan Sabtu</small></button></div></div></div>`}catch(e){const box=document.getElementById('cq-hrd-dashboard-status');if(box){box.innerHTML='<b>Ringkasan belum tersinkron.</b> '+esc(e?.message||'Sumber laporan belum merespons.')+' Gunakan Live Report atau Laporan Bulanan untuk mencoba kembali.';box.style.color='#8b6816';}console.warn('HRD dashboard summary:',e)}
}

function sortedLiveRows(){let rows=[...(state.admin?.teachers||[])];const q=low(state.liveQuery);if(q)rows=rows.filter(t=>low(teacherName(t)).includes(q));if(state.liveSort==='az')rows.sort((a,b)=>teacherName(a).localeCompare(teacherName(b),'id'));else if(state.liveSort==='za')rows.sort((a,b)=>teacherName(b).localeCompare(teacherName(a),'id'));else if(state.liveSort==='complete')rows.sort((a,b)=>Number(b.completeness_index||0)-Number(a.completeness_index||0)||teacherName(a).localeCompare(teacherName(b),'id'));else rows.sort((a,b)=>issueCount(b)-issueCount(a)||teacherName(a).localeCompare(teacherName(b),'id'));return rows}
function drawLive(){
  const c=content(),rows=sortedLiveRows(),s=summary(state.admin||{});if(!c)return;
  c.innerHTML=`<div class="cq-hrd-clean">${head('Live Report','Pusat monitoring HRD: siapa yang lengkap dan apa yang masih perlu ditindaklanjuti.')}<div class="cq-hrd-grid"><div class="cq-hrd-kpi"><span>Total Guru</span><b>${s.total}</b></div><div class="cq-hrd-kpi"><span>Lengkap</span><b>${s.clean}</b></div><div class="cq-hrd-kpi"><span>Perlu Ditindaklanjuti</span><b>${s.issues}</b></div><div class="cq-hrd-kpi"><span>Promosi Belum</span><b>${s.promoMissing}</b></div></div><div class="cq-hrd-panel"><div class="cq-hrd-tools"><input type="date" value="${esc(state.dailyDate)}" onchange="stateDailyDate(this.value)"><input placeholder="Cari guru..." value="${esc(state.liveQuery)}" oninput="hrdCleanLiveQuery(this.value)"><select onchange="hrdCleanLiveSort(this.value)"><option value="issues" ${state.liveSort==='issues'?'selected':''}>Paling banyak belum</option><option value="complete" ${state.liveSort==='complete'?'selected':''}>Paling lengkap</option><option value="az" ${state.liveSort==='az'?'selected':''}>A–Z</option><option value="za" ${state.liveSort==='za'?'selected':''}>Z–A</option></select><button class="cq-hrd-btn alt" onclick="hrdCleanReload()">Muat Ulang</button></div><div class="cq-hrd-table-wrap" style="margin-top:12px"><table class="cq-hrd-table"><thead><tr><th>Guru</th><th>Role</th><th>Kelengkapan</th><th>Status</th><th>Yang perlu dicek</th><th>Aktivitas 07.00–16.00</th></tr></thead><tbody>${rows.map(t=>{const issue=issueCount(t),miss=[...(t.missing_categories||[]),...(t.partial_categories||[])].join(', ');return `<tr><td><b>${esc(teacherName(t))}</b></td><td>${esc(rolesText(t))}</td><td>${Math.round(Number(t.completeness_index||0))}%</td><td><span class="cq-hrd-chip ${issue?'bad':'ok'}">${issue?issue+' perlu dicek':'Lengkap'}</span></td><td>${esc(miss||'—')}</td><td><button class="cq-hrd-btn alt" onclick="openHrdDailyTeacher('${esc(t.teacher_id||t.id||'')}')">Lihat Timeline</button></td></tr>`}).join('')||'<tr><td colspan="6" class="cq-hrd-empty">Tidak ada data.</td></tr>'}</tbody></table></div></div></div>`;
}
async function renderLive(){setActive('live');loading('Live Report');try{await getAdmin(state.month,true);drawLive()}catch(e){errorView('Live Report',e)}}
function hm(v){return String(v||'').slice(0,5)}
function mins(v){const m=hm(v).match(/^(\d{2}):(\d{2})$/);return m?Number(m[1])*60+Number(m[2]):null}
function clock(n){return String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0')}
async function hrdDailySource(teacherId,date){
  const month=String(date).slice(0,7);
  const [ts,ws,sp]=await Promise.all([
    api('teacher-timesheet',{action:'bootstrap',month,teacher_id:teacherId}),
    api('teacher-work-schedule',{month,teacher_id:teacherId}),
    api('teacher-timesheet-special-overlay',{month,teacher_id:teacherId}).catch(()=>({items:[]}))
  ]);
  const rows=[];
  (ws.items||[]).filter(x=>x.work_date===date).forEach(x=>rows.push({start:x.start_time,end:x.end_time,type:'Jadwal Kerja',title:x.activity||'Aktivitas kerja',detail:x.note||'',source:'otomatis',result:x.uks_reported===true?'Laporan UKS tersedia':x.uks_reported===false?'Belum ada laporan UKS':''}));
  (ts.teaching||[]).filter(x=>x.work_date===date).forEach(x=>rows.push({start:x.start_time,end:x.end_time,type:x.source==='badal'?'Badal':x.source==='digantikan'?'Digantikan':'Mengajar',title:[x.subject_name,x.class_name].filter(Boolean).join(' • ')||'Mengajar',detail:x.note||'',source:x.source||'mengajar',result:x.source==='digantikan'?'Digantikan guru lain':'Jadwal mengajar tercatat'}));
  (ts.activities||[]).filter(x=>x.work_date===date).forEach(x=>rows.push({start:x.start_time,end:x.end_time,type:'Aktivitas Tambahan',title:x.activity||'Aktivitas kerja',detail:x.note||'',source:'diisi guru',result:x.note?'Catatan aktivitas tersedia':'Aktivitas tercatat'}));
  (sp.items||[]).filter(x=>x.work_date===date).forEach(x=>rows.push({start:x.start_time,end:x.end_time,type:'Kegiatan Khusus',title:x.activity_name||'Kegiatan khusus',detail:[x.class_scope,x.notes].filter(Boolean).join(' • '),source:'otomatis',result:'Kegiatan khusus tercatat'}));
  (ts.saturdays||[]).filter(x=>x.event_date===date).forEach(x=>rows.push({start:x.start_time,end:x.end_time,type:'Kegiatan Sabtu',title:x.activity_name||'Kegiatan Sabtu',detail:x.note||'',source:x.configured?'otomatis':'jadwal',result:x.requires_certificate?(x.certificate?'Sertifikat tersedia':'Sertifikat belum tersedia'):'Kegiatan tercatat'}));
  return {teacher:ts.teacher,rows};
}
function normalizeDaily(rows){
  const startDay=7*60,endDay=16*60,valid=rows.map(r=>({...r,a:mins(r.start),b:mins(r.end)})).filter(r=>r.a!=null&&r.b!=null&&r.b>r.a&&r.b>startDay&&r.a<endDay).map(r=>({...r,a:Math.max(startDay,r.a),b:Math.min(endDay,r.b)})).sort((x,y)=>x.a-y.a||x.b-y.b);
  const merged=[];for(const r of valid){if(!merged.length||r.a>merged[merged.length-1][1])merged.push([r.a,r.b]);else merged[merged.length-1][1]=Math.max(merged[merged.length-1][1],r.b)}
  const gaps=[];let p=startDay;for(const [a,b] of merged){if(a>p)gaps.push({start:clock(p),end:clock(a),type:'Belum Ada Catatan',title:'Belum ada catatan aktivitas',detail:'Rentang ini belum memiliki jadwal atau laporan aktivitas di CQlass.',source:'perlu dicek',result:'Belum terjelaskan',gap:true,a:p,b:a});p=Math.max(p,b)}if(p<endDay)gaps.push({start:clock(p),end:clock(endDay),type:'Belum Ada Catatan',title:'Belum ada catatan aktivitas',detail:'Rentang ini belum memiliki jadwal atau laporan aktivitas di CQlass.',source:'perlu dicek',result:'Belum terjelaskan',gap:true,a:p,b:endDay});
  return {rows:[...valid,...gaps].sort((x,y)=>(x.a??mins(x.start))-(y.a??mins(y.start))),gapMinutes:gaps.reduce((n,x)=>n+(x.b-x.a),0),activityMinutes:merged.reduce((n,x)=>n+(x[1]-x[0]),0)};
}
window.openHrdDailyTeacher=async teacherId=>{
  const d=state.dailyDate||jktDate(),t=(state.admin?.teachers||[]).find(x=>String(x.teacher_id||x.id||'')===String(teacherId)),c=content();if(!c)return;
  c.innerHTML=`<div class="cq-hrd-clean">${head('Aktivitas Harian 07.00–16.00',(t?teacherName(t):'Guru')+' • '+d)}<div class="cq-hrd-panel cq-hrd-empty"><span class="spinner"></span> Menggabungkan seluruh aktivitas guru...</div></div>`;
  try{const src=await hrdDailySource(teacherId,d),n=normalizeDaily(src.rows),actual=n.rows.filter(x=>!x.gap),missing=n.rows.filter(x=>x.gap);c.innerHTML=`<div class="cq-hrd-clean">${head('Aktivitas Harian 07.00–16.00',(t?teacherName(t):(src.teacher?.full_name||'Guru'))+' • '+d)}
    <div class="cq-hrd-panel"><div class="cq-hrd-tools"><button class="cq-hrd-btn alt" onclick="openHrdCleanLive()">← Kembali</button><input type="date" value="${esc(d)}" onchange="stateDailyDate(this.value);openHrdDailyTeacher('${esc(teacherId)}')"><button class="cq-hrd-btn alt" onclick="openHrdDailyTeacher('${esc(teacherId)}')">Muat Ulang</button></div></div>
    <div class="cq-hrd-day-summary"><div><span>Aktivitas Tercatat</span><b>${actual.length}</b></div><div><span>Waktu Tercakup</span><b>${Math.floor(n.activityMinutes/60)}j ${n.activityMinutes%60}m</b></div><div><span>Rentang Belum Tercatat</span><b>${missing.length}</b></div><div><span>Waktu Belum Terjelaskan</span><b>${Math.floor(n.gapMinutes/60)}j ${n.gapMinutes%60}m</b></div></div>
    <div class="cq-hrd-panel"><h2>Timeline Kerja</h2><p style="margin:-4px 0 13px;color:#64748b;font-size:10px">Gabungan jadwal otomatis dan laporan guru. “Belum Ada Catatan” tidak berarti guru tidak bekerja; artinya aktivitas pada rentang tersebut belum tercatat di CQlass.</p><div class="cq-hrd-timeline">${n.rows.map(r=>`<div class="cq-hrd-time-row ${r.gap?'gap':''}"><div class="cq-hrd-time">${esc(hm(r.start))}–${esc(hm(r.end))}</div><div><span class="cq-hrd-chip ${r.gap?'warn':'ok'}">${esc(r.type)}</span><div class="cq-hrd-time-note">${esc(r.source||'')}</div></div><div><div class="cq-hrd-time-title">${esc(r.title)}</div><div class="cq-hrd-time-note">${esc(r.detail||'—')}</div></div><div><b style="font-size:10px">Hasil / Bukti</b><div class="cq-hrd-time-note">${esc(r.result||r.detail||'Aktivitas tercatat')}</div></div><div><span class="cq-hrd-chip ${r.gap?'bad':'ok'}">${r.gap?'Perlu Dicek':'Tercatat'}</span></div></div>`).join('')||'<div class="cq-hrd-empty">Belum ada aktivitas pada tanggal ini.</div>'}</div></div></div>`;
  }catch(e){errorView('Aktivitas Harian',e)}
};
window.stateDailyDate=v=>{if(/^\d{4}-\d{2}-\d{2}$/.test(v))state.dailyDate=v};


async function renderAdministration(){
  setActive('administration');loading('Administrasi Guru');
  try{const d=await getAdmin(),rows=d.teachers||[],c=content();if(!c)return;c.innerHTML=`<div class="cq-hrd-clean">${head('Administrasi Guru','Menampilkan kewajiban administrasi yang berlaku untuk masing-masing guru. Promosi Socmed dipisahkan ke laporan tersendiri.')}<div class="cq-hrd-panel"><div class="cq-hrd-table-wrap"><table class="cq-hrd-table"><thead><tr><th>Guru</th><th>Role</th><th>Selesai</th><th>Belum / Sebagian</th><th>Detail Administrasi</th></tr></thead><tbody>${rows.map(t=>{const cats=(t.categories||[]).filter(x=>x&&x.applicable!==false&&x.key!=='promotion');const done=cats.filter(x=>x.status==='present').length,miss=cats.filter(x=>x.status==='missing'||x.status==='partial');return `<tr><td><b>${esc(teacherName(t))}</b></td><td>${esc(rolesText(t))}</td><td>${done}/${cats.length}</td><td><span class="cq-hrd-chip ${miss.length?'bad':'ok'}">${miss.length||'Lengkap'}</span></td><td>${cats.map(x=>`<span class="cq-hrd-chip ${x.status==='missing'?'bad':x.status==='partial'?'warn':x.status==='present'?'ok':''}">${esc(categoryLabel(x))}: ${esc(x.status==='present'?'Selesai':x.status==='partial'?'Sebagian':x.status==='missing'?'Belum':'Info')}</span>`).join('')||'—'}</td></tr>`}).join('')||'<tr><td colspan="5" class="cq-hrd-empty">Belum ada data administrasi guru.</td></tr>'}</tbody></table></div></div></div>`}catch(e){errorView('Administrasi Guru',e)}
}

function findPromotion(t){return (t.categories||[]).find(x=>x&&x.key==='promotion')||null}
function promoWhen(v){if(!v)return '—';try{return new Intl.DateTimeFormat('id-ID',{timeZone:'Asia/Jakarta',day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(v))+' WIB'}catch{return String(v)}}
function promoDate(v){if(!v)return '—';try{return new Intl.DateTimeFormat('id-ID',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(v+'T12:00:00'))}catch{return String(v)}}
function promoFilteredRows(){
 const q=low(document.getElementById('hrd-promo-q')?.value),status=document.getElementById('hrd-promo-status')?.value||'all',sort=document.getElementById('hrd-promo-sort')?.value||'latest';
 let rows=[...(window.__cqHrdPromoRows||[])];
 if(q)rows=rows.filter(x=>low(x.name).includes(q)||low((x.roles||[]).join(' ')).includes(q));
 if(status==='done')rows=rows.filter(x=>Number(x.count)>0);else if(status==='missing')rows=rows.filter(x=>!Number(x.count));
 rows.sort((x,y)=>{if(sort==='az')return String(x.name||'').localeCompare(String(y.name||''),'id');if(sort==='za')return String(y.name||'').localeCompare(String(x.name||''),'id');const xa=x.items?.[0]?.created_at||'',ya=y.items?.[0]?.created_at||'';return sort==='oldest'?String(xa).localeCompare(String(ya)):String(ya).localeCompare(String(xa))});
 return rows;
}
function drawPromoRows(){
 const body=document.getElementById('hrd-promo-body');if(!body)return;const rows=promoFilteredRows();
 body.innerHTML=rows.map((x,idx)=>{const last=x.items?.[0]||null;return `<tr><td><b>${idx+1}</b></td><td><b>${esc(x.name)}</b></td><td>${esc((x.roles||[]).join(', ')||x.position||'Guru')}</td><td>${last?'<b>'+esc(promoWhen(last.created_at))+'</b>':'<span class="cq-hrd-chip bad">Belum upload</span>'}</td><td>${x.count||0}</td><td>${(x.items||[]).length?`<button class="cq-hrd-chip ok cq-hrd-promo-view" onclick="openHrdPromoPhoto('${esc(x.id||'')}')">Lihat Bukti</button>`:'—'}</td></tr>`}).join('')||'<tr><td colspan="6" class="cq-hrd-empty">Tidak ada data yang sesuai filter.</td></tr>';
}
window.filterHrdPromo=drawPromoRows;
window.openHrdPromoPhoto=(personId)=>{const row=(window.__cqHrdPromoRows||[]).find(x=>String(x.id||'')===String(personId));if(!row)return;const items=[...(row.items||[])].sort((a,b)=>String(a.created_at||'').localeCompare(String(b.created_at||'')));if(!items.length)return;const old=document.getElementById('cq-hrd-promo-modal');if(old)old.remove();const m=document.createElement('div');m.id='cq-hrd-promo-modal';m.className='cq-hrd-modal';m.onclick=e=>{if(e.target===m)m.remove()};const evidence=items.map(i=>`<div class="cq-hrd-promo-gallery-item">${i.photo_url?`<img class="cq-hrd-modal-img" src="${esc(i.photo_url)}" alt="Bukti Promo Socmed">`:'<div class="cq-hrd-empty">Foto tidak tersedia.</div>'}<div class="cq-hrd-modal-meta"><b>${esc(promoWhen(i.created_at))}</b>${i.description?`<br>${esc(i.description)}`:''}</div></div>`).join('');m.innerHTML=`<div class="cq-hrd-modal-card"><div class="cq-hrd-modal-head"><b>Promo Socmed — ${esc(row.name||'')}</b><button class="cq-hrd-modal-close" onclick="document.getElementById('cq-hrd-promo-modal')?.remove()">Tutup</button></div><div class="cq-hrd-promo-gallery">${evidence}</div></div>`;document.body.appendChild(m)};
async function renderPromotion(){
 setActive('promotion');loading('Laporan Promo Socmed');
 try{
  const ps=await api('hrd-live-report',{action:'period_list'}),active=(ps.periods||[]).find(x=>x.is_active)||(ps.periods||[])[0];
  if(!active)throw new Error('Buat Periode Laporan terlebih dahulu.');
  const d=await api('hrd-live-report',{action:'promotion_center',start:active.start_date,end:active.end_date}),rows=d.rows||[],c=content();if(!c)return;
  rows.forEach(x=>{x.items=(x.items||[]).sort((a,b)=>String(b.created_at||'').localeCompare(String(a.created_at||'')))});
  window.__cqHrdPromoRows=rows;const sm=d.summary||{};
  c.innerHTML=`<div class="cq-hrd-clean">${head('Laporan Promo Socmed',active.name+' • '+active.start_date+' s.d. '+active.end_date)}<div class="cq-hrd-grid"><div class="cq-hrd-kpi"><span>Personel</span><b>${sm.people||0}</b></div><div class="cq-hrd-kpi"><span>Sudah Upload</span><b>${sm.done||0}</b></div><div class="cq-hrd-kpi"><span>Belum Upload</span><b>${sm.missing||0}</b></div><div class="cq-hrd-kpi"><span>Total Unggahan</span><b>${sm.uploads||0}</b></div></div><div class="cq-hrd-panel"><div class="cq-hrd-promo-tools"><input id="hrd-promo-q" placeholder="Cari nama / role..." oninput="filterHrdPromo()"><select id="hrd-promo-status" onchange="filterHrdPromo()"><option value="all">Semua status</option><option value="done">Sudah upload</option><option value="missing">Belum upload</option></select><select id="hrd-promo-sort" onchange="filterHrdPromo()"><option value="latest">Upload terbaru</option><option value="oldest">Upload terlama</option><option value="az">Nama A–Z</option><option value="za">Nama Z–A</option></select><button class="cq-hrd-btn alt" onclick="document.getElementById('hrd-promo-q').value='';document.getElementById('hrd-promo-status').value='all';document.getElementById('hrd-promo-sort').value='latest';filterHrdPromo()">Reset</button></div><div class="cq-hrd-table-wrap"><table class="cq-hrd-table"><thead><tr><th>No</th><th>Nama</th><th>Role</th><th>Upload Terakhir</th><th>Jumlah</th><th>Bukti</th></tr></thead><tbody id="hrd-promo-body"></tbody></table></div></div></div>`;
  drawPromoRows();
 }catch(e){errorView('Laporan Promo Socmed',e)}
}
async function renderPeriods(){
 setActive('periods');loading('Periode Laporan');
 try{const d=await api('hrd-live-report',{action:'period_list'}),rows=d.periods||[],c=content();if(!c)return;c.innerHTML=`<div class="cq-hrd-clean">${head('Periode Laporan','Rentang tanggal fleksibel untuk laporan HRD. Data asli tidak disalin atau diubah.')}<div class="cq-hrd-panel"><h2>Buat Periode</h2><div class="cq-hrd-form" style="grid-template-columns:1.4fr 1fr 1fr .8fr auto"><div class="cq-hrd-field"><label>Nama Periode</label><input id="hrdp-name" placeholder="Oktober 2026"></div><div class="cq-hrd-field"><label>Mulai</label><input id="hrdp-start" type="date"></div><div class="cq-hrd-field"><label>Selesai</label><input id="hrdp-end" type="date"></div><div class="cq-hrd-field"><label>Status</label><select id="hrdp-active"><option value="1">Aktif</option><option value="0">Arsip</option></select></div><button class="cq-hrd-btn" onclick="saveHrdPeriod()">Simpan</button></div></div><div class="cq-hrd-panel"><div class="cq-hrd-table-wrap"><table class="cq-hrd-table"><thead><tr><th>Periode</th><th>Mulai</th><th>Selesai</th><th>Status</th></tr></thead><tbody>${rows.map(x=>`<tr><td><b>${esc(x.name)}</b></td><td>${esc(x.start_date)}</td><td>${esc(x.end_date)}</td><td><span class="cq-hrd-chip ${x.is_active?'ok':''}">${x.is_active?'Aktif':'Arsip'}</span></td></tr>`).join('')}</tbody></table></div></div></div>`}catch(e){errorView('Periode Laporan',e)}
}
window.saveHrdPeriod=async()=>{try{const p={action:'period_save',name:document.getElementById('hrdp-name')?.value,start_date:document.getElementById('hrdp-start')?.value,end_date:document.getElementById('hrdp-end')?.value,is_active:document.getElementById('hrdp-active')?.value==='1'};const r=await api('hrd-live-report',p);if(r.success===false)throw new Error(r.error==='period_overlap'?'Rentang bertabrakan dengan periode yang sudah ada.':r.error);if(typeof showToast==='function')showToast('Periode laporan tersimpan.');renderPeriods()}catch(e){typeof showToast==='function'?showToast(e.message,true):alert(e.message)}};

function waitRenderer(name,title){const c=content();let n=0;(function step(){n++;if(typeof window[name]==='function')return window[name](c);if(n<35)return setTimeout(step,100);if(c)c.innerHTML=`<div class="cq-hrd-clean">${head(title,'Data ditarik langsung dari CQlass.')}<div class="cq-hrd-panel cq-hrd-empty">${esc(title)} belum dapat dimuat. Muat ulang halaman.</div></div>`})()}
function renderTimesheet(){setActive('timesheet');const c=content();if(c)c.innerHTML=`<div class="cq-hrd-clean">${head('Timesheet','Monitoring Timesheet guru tersedia melalui Laporan Bulanan. HRD tidak memiliki form input Timesheet guru.')}<div class="cq-hrd-panel cq-hrd-empty">Pilih guru dari Laporan Bulanan untuk melihat detail aktivitas kerjanya.</div></div>`}

async function renderAttendance(){
  setActive('attendance');loading('Kehadiran');
  try{const r=monthRange(state.month),d=await api('hrd-performance-range',{start:r.start,end:minDate(r.end,jktDate())}),rows=d.teachers||[],c=content();if(!c)return;c.innerHTML=`<div class="cq-hrd-clean">${head('Kehadiran','Kehadiran guru pada periode berjalan. Data ini tidak dicampur dengan kehadiran siswa.')}<div class="cq-hrd-panel"><div class="cq-hrd-table-wrap"><table class="cq-hrd-table"><thead><tr><th>Guru</th><th>Kehadiran</th><th>Status Data</th></tr></thead><tbody>${rows.map(t=>{const dim=(t.dimensions||[]).find(x=>low(x.label)==='kehadiran'),v=dim?.score;return `<tr><td><b>${esc(t.name||'Guru')}</b></td><td>${v==null?'—':Math.round(Number(v))+'%'}</td><td><span class="cq-hrd-chip ${v==null?'warn':'ok'}">${v==null?'Belum ada event kehadiran':'Tercatat'}</span></td></tr>`}).join('')||'<tr><td colspan="3" class="cq-hrd-empty">Belum ada data kehadiran.</td></tr>'}</tbody></table></div></div></div>`}catch(e){errorView('Kehadiran',e)}
}

async function saturdayData(){return api('hrd-saturday-schedule',{action:'bootstrap',month:state.month})}
function saturdayCards(d,manage){const rows=d.schedules||[];if(!rows.length)return '<div class="cq-hrd-empty">Belum ada jadwal Kegiatan Sabtu pada bulan ini.</div>';return `<div class="cq-hrd-sat">${rows.map(x=>`<div class="cq-hrd-sat-card"><h3>${esc(x.event_date)} — ${esc(x.activity_name||'Kegiatan Sabtu')}</h3><p>${esc(String(x.start_time||'').slice(0,5))}–${esc(String(x.end_time||'').slice(0,5))} · Semua guru</p><p>${esc(x.note||'Tanpa catatan')}</p><p>Kehadiran tercatat: ${Number(x.attendance_filled||0)} · Guru aktif: ${Number(d.teacher_count||0)}</p>${manage?`<button class="cq-hrd-btn danger" onclick="hrdDeleteSaturday('${esc(x.id)}')">Hapus Jadwal</button>`:''}</div>`).join('')}</div>`}
async function renderSaturday(){setActive('saturday');loading('Kegiatan Sabtu');try{const d=await saturdayData(),c=content();if(c)c.innerHTML=`<div class="cq-hrd-clean">${head('Kegiatan Sabtu','Monitoring jadwal yang ditetapkan HRD dan keterisian laporannya.')}<div class="cq-hrd-panel">${saturdayCards(d,false)}</div></div>`}catch(e){errorView('Kegiatan Sabtu',e)}}

function monthlyStatus(c){if(c?.applicable===false)return 'Tidak Berlaku';const v=low(c?.status);if(['present','complete','completed','done','filled'].includes(v))return 'Selesai';if(['partial','incomplete'].includes(v))return 'Sebagian';return 'Belum Selesai'}
function monthlyItems(c){return Array.isArray(c?.items)?c.items:[]}
function monthlyTeacherStatus(t){if(Number(t?.missing_count||0)>0)return 'missing';if(Number(t?.partial_count||0)>0)return 'partial';return 'complete'}
function monthlyRoleKey(t){const r=low(rolesText(t));if(/tahfizh|partner/.test(r))return 'tahfizh';if(/wali|walas/.test(r))return 'walas';if(/mapel|subject|guru bidang/.test(r))return 'mapel';if(/kepala|kabid|pimpinan|wakil/.test(r))return 'leadership';return 'other'}
function monthlyFilteredRows(){
 let rows=[...(state.admin?.teachers||[])],q=low(state.monthlyQuery);
 if(q)rows=rows.filter(t=>low(teacherName(t)).includes(q));
 if(state.monthlyRole!=='all')rows=rows.filter(t=>monthlyRoleKey(t)===state.monthlyRole);
 if(state.monthlyStatus!=='all')rows=rows.filter(t=>monthlyTeacherStatus(t)===state.monthlyStatus);
 if(state.monthlySort==='za')rows.sort((a,b)=>teacherName(b).localeCompare(teacherName(a),'id'));
 else if(state.monthlySort==='missing')rows.sort((a,b)=>Number(b.missing_count||0)-Number(a.missing_count||0)||teacherName(a).localeCompare(teacherName(b),'id'));
 else if(state.monthlySort==='complete')rows.sort((a,b)=>Number(b.completed_count||0)-Number(a.completed_count||0)||teacherName(a).localeCompare(teacherName(b),'id'));
 else rows.sort((a,b)=>teacherName(a).localeCompare(teacherName(b),'id'));
 return rows;
}
function monthlySection(c){
 const items=monthlyItems(c),status=monthlyStatus(c);if(c?.applicable===false)return '';
 const rows=items.map((i,n)=>`<tr><td>${n+1}</td><td>${esc(i.period_start||i.work_date||i.activity_date||'—')}</td><td><b>${esc(i.title||i.activity||i.task_code||categoryLabel(c))}</b></td><td>${esc(i.description||i.note||i.status||'—')}</td></tr>`).join('');
 return `<div class="cq-hrd-panel"><div style="display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap"><h2 style="margin:0">${esc(categoryLabel(c))}</h2><span class="cq-hrd-chip ${status==='Selesai'?'ok':status==='Sebagian'?'warn':'bad'}">${esc(status)}</span></div>${c?.note?`<p style="margin:8px 0 14px;color:#64748b">${esc(c.note)}</p>`:''}<div class="cq-hrd-table-wrap"><table class="cq-hrd-table"><thead><tr><th>No</th><th>Tanggal</th><th>Aktivitas / Data</th><th>Keterangan</th></tr></thead><tbody>${rows||'<tr><td colspan="4" class="cq-hrd-empty">Belum ada data pada periode ini.</td></tr>'}</tbody></table></div></div>`;
}
window.openHrdMonthlyTeacher=(teacherId)=>{const d=state.admin||{},t=(d.teachers||[]).find(x=>String(x.teacher_id||x.id||'')===String(teacherId));if(!t)return;const c=content();if(!c)return;const cats=(t.categories||[]).filter(x=>x?.applicable!==false);const done=cats.filter(x=>monthlyStatus(x)==='Selesai').length,partial=cats.filter(x=>monthlyStatus(x)==='Sebagian').length,missing=cats.filter(x=>monthlyStatus(x)==='Belum Selesai').length;c.innerHTML=`<div class="cq-hrd-clean">${head('Detail Laporan Bulanan',teacherName(t)+' • '+state.month)}<div class="cq-hrd-panel"><button class="cq-hrd-btn alt" onclick="openHrdCleanMonthly()">← Kembali ke Daftar Guru</button><div style="margin-top:16px"><h2 style="margin-bottom:4px">${esc(teacherName(t))}</h2><p style="margin:0;color:#64748b">${esc(rolesText(t))}</p></div></div><div class="cq-hrd-grid"><div class="cq-hrd-kpi"><span>Bagian Berlaku</span><b>${cats.length}</b></div><div class="cq-hrd-kpi"><span>Selesai</span><b>${done}</b></div><div class="cq-hrd-kpi"><span>Sebagian</span><b>${partial}</b></div><div class="cq-hrd-kpi"><span>Belum Selesai</span><b>${missing}</b></div></div>${cats.map(monthlySection).join('')||'<div class="cq-hrd-panel cq-hrd-empty">Belum ada komponen laporan yang berlaku.</div>'}</div>`};
function drawMonthlyRows(){
 const body=document.getElementById('hrd-monthly-body');if(!body)return;const rows=monthlyFilteredRows();
 body.innerHTML=rows.map((t,idx)=>`<tr><td>${idx+1}</td><td><button style="border:0;background:none;padding:0;color:#0f4c81;font:inherit;font-weight:800;cursor:pointer;text-align:left" onclick="openHrdMonthlyTeacher('${esc(t.teacher_id||t.id||'')}')">${esc(teacherName(t))}</button></td><td>${esc(rolesText(t))}</td><td>${Number(t.completed_count||0)}/${Number(t.required_count||0)}</td><td>${Number(t.missing_count||0)}</td><td>${Number(t.partial_count||0)}</td><td>${Math.round(Number(t.completeness_index||0))}%</td></tr>`).join('')||'<tr><td colspan="7" class="cq-hrd-empty">Tidak ada guru yang sesuai filter.</td></tr>';
}
window.filterHrdMonthly=()=>{state.monthlyQuery=document.getElementById('hrd-monthly-q')?.value||'';state.monthlyRole=document.getElementById('hrd-monthly-role')?.value||'all';state.monthlyStatus=document.getElementById('hrd-monthly-status')?.value||'all';state.monthlySort=document.getElementById('hrd-monthly-sort')?.value||'az';drawMonthlyRows()};
window.resetHrdMonthly=()=>{state.monthlyQuery='';state.monthlyRole='all';state.monthlyStatus='all';state.monthlySort='az';renderMonthly()};
async function renderMonthly(){
 setActive('monthly');loading('Laporan Bulanan');
 try{const d=await getAdmin(),s=summary(d),c=content();if(!c)return;c.innerHTML=`<div class="cq-hrd-clean">${head('Laporan Bulanan','Klik nama guru untuk membuka detail laporan seperti lembar laporan Excel.')}<div class="cq-hrd-grid"><div class="cq-hrd-kpi"><span>Total Guru</span><b>${s.total}</b></div><div class="cq-hrd-kpi"><span>Lengkap</span><b>${s.clean}</b></div><div class="cq-hrd-kpi"><span>Belum Lengkap</span><b>${s.issues}</b></div><div class="cq-hrd-kpi"><span>Promosi Belum</span><b>${s.promoMissing}</b></div></div><div class="cq-hrd-panel"><div class="cq-hrd-tools" style="margin-bottom:12px"><input id="hrd-monthly-q" placeholder="Cari nama guru..." value="${esc(state.monthlyQuery)}" oninput="filterHrdMonthly()"><select id="hrd-monthly-role" onchange="filterHrdMonthly()"><option value="all">Semua Role</option><option value="walas">Walas</option><option value="mapel">Guru Mapel</option><option value="tahfizh">Partner / Tahfizh</option><option value="leadership">Pimpinan / Kabid</option><option value="other">Role Lain</option></select><select id="hrd-monthly-status" onchange="filterHrdMonthly()"><option value="all">Semua Status</option><option value="complete">Selesai</option><option value="partial">Sebagian</option><option value="missing">Belum Selesai</option></select><select id="hrd-monthly-sort" onchange="filterHrdMonthly()"><option value="az">Nama A–Z</option><option value="za">Nama Z–A</option><option value="missing">Paling Banyak Belum</option><option value="complete">Paling Banyak Selesai</option></select><button class="cq-hrd-btn alt" onclick="resetHrdMonthly()">Reset</button></div><div class="cq-hrd-table-wrap"><table class="cq-hrd-table"><thead><tr><th>No</th><th>Guru</th><th>Role</th><th>Selesai</th><th>Belum</th><th>Sebagian</th><th>Indeks</th></tr></thead><tbody id="hrd-monthly-body"></tbody></table></div></div></div>`;
 document.getElementById('hrd-monthly-role').value=state.monthlyRole;document.getElementById('hrd-monthly-status').value=state.monthlyStatus;document.getElementById('hrd-monthly-sort').value=state.monthlySort;drawMonthlyRows();
 }catch(e){errorView('Laporan Bulanan',e)}
}

async function renderSaturdayManage(){
  setActive('saturday-manage');loading('Jadwal Kegiatan Sabtu');
  try{const d=await saturdayData(),c=content(),master=d.master||[];if(!c)return;c.innerHTML=`<div class="cq-hrd-clean">${head('Jadwal Kegiatan Sabtu','HRD menentukan kegiatan Sabtu. Jadwal yang disimpan otomatis terbaca di Timesheet guru.')}<div class="cq-hrd-panel"><h2>Atur Jadwal</h2><div class="cq-hrd-form"><div class="cq-hrd-field"><label>Tanggal Sabtu</label><input id="hrd-sat-date" type="date"></div><div class="cq-hrd-field"><label>Kegiatan</label><select id="hrd-sat-master"><option value="">Pilih kegiatan</option>${master.map(m=>`<option value="${esc(m.id)}">${esc(m.name)}</option>`).join('')}</select></div><div class="cq-hrd-field"><label>Mulai</label><input id="hrd-sat-start" type="time" value="08:00"></div><div class="cq-hrd-field"><label>Selesai</label><input id="hrd-sat-end" type="time" value="10:00"></div><div class="cq-hrd-field"><label>Catatan</label><input id="hrd-sat-note" placeholder="Opsional"></div><button class="cq-hrd-btn" onclick="hrdSaveSaturday()">Simpan</button></div></div><div class="cq-hrd-panel"><h2>Jadwal Bulan Ini</h2>${saturdayCards(d,true)}</div></div>`}catch(e){errorView('Jadwal Kegiatan Sabtu',e)}
}

window.hrdCleanLiveQuery=v=>{state.liveQuery=v;drawLive()};
window.hrdCleanLiveSort=v=>{state.liveSort=v;drawLive()};
window.hrdCleanReload=async()=>{state.admin=null;await renderLive()};
window.hrdSaveSaturday=async()=>{const date=document.getElementById('hrd-sat-date')?.value||'',mid=document.getElementById('hrd-sat-master')?.value||'',start=document.getElementById('hrd-sat-start')?.value||'',end=document.getElementById('hrd-sat-end')?.value||'',note=document.getElementById('hrd-sat-note')?.value||'';if(!date||!mid)return typeof showToast==='function'?showToast('Tanggal dan kegiatan wajib dipilih.',true):alert('Tanggal dan kegiatan wajib dipilih.');if(new Date(date+'T12:00:00Z').getUTCDay()!==6)return typeof showToast==='function'?showToast('Tanggal harus hari Sabtu.',true):alert('Tanggal harus hari Sabtu.');try{await api('hrd-saturday-schedule',{action:'save',event_date:date,activity_master_id:mid,start_time:start,end_time:end,note});if(typeof showToast==='function')showToast('Jadwal Kegiatan Sabtu tersimpan.');renderSaturdayManage()}catch(e){typeof showToast==='function'?showToast(e.message,true):alert(e.message)}};
window.hrdDeleteSaturday=async id=>{try{await api('hrd-saturday-schedule',{action:'delete',id});if(typeof showToast==='function')showToast('Jadwal Kegiatan Sabtu dihapus.');renderSaturdayManage()}catch(e){typeof showToast==='function'?showToast(e.message,true):alert(e.message)}};

window.hrdToggleGroup=g=>{if(g==='report'){state.reportOpen=!state.reportOpen;if(state.reportOpen)state.manageOpen=false}else if(g==='manage'){state.manageOpen=!state.manageOpen;if(state.manageOpen)state.reportOpen=false}side()};
window.__cqRenderHrdSidebar=()=>drawSidebar();
window.openHrdCleanDashboard=renderDashboard;
window.openHrdCleanLive=()=>{state.reportOpen=true;renderLive()};
window.openHrdCleanTimesheet=renderTimesheet;
window.openHrdCleanAdministration=renderAdministration;
window.openHrdCleanAttendance=renderAttendance;
window.openHrdCleanPromotion=()=>{state.reportOpen=true;renderPromotion()};
window.openHrdReportPeriods=renderPeriods;
window.openHrdCleanSaturday=renderSaturday;
window.openHrdCleanMonthly=()=>{state.reportOpen=true;renderMonthly()};
window.openHrdCleanSaturdayManage=()=>{state.manageOpen=true;renderSaturdayManage()};

function install(){
  if(!isHrd())return false;installCss();
  try{if(typeof DASHBOARD_MODULE!=='undefined'){DASHBOARD_MODULE.label='Dashboard';if(Array.isArray(DASHBOARD_MODULE.roles)&&!DASHBOARD_MODULE.roles.includes('hrd'))DASHBOARD_MODULE.roles.push('hrd')}}catch(_){ }
  drawSidebar();const c=content();if(c)c.classList.add('cq-hrd-clean-mode');
  return true;
}

if(typeof renderSidebar==='function'&&!renderSidebar.__cqHrdWorkspaceWrapped){const old=renderSidebar;const wrapped=function(){if(isHrd())return drawSidebar();return old.apply(this,arguments)};wrapped.__cqHrdWorkspaceWrapped=true;renderSidebar=wrapped;window.__cqHrdSidebarOwner=wrapped}
let repairing=false;
const observer=new MutationObserver(()=>{if(!isHrd()||repairing)return;const s=document.getElementById('sidebar');if(s&&(s.dataset.cqOwner!=='hrd-workspace'||!s.querySelector(':scope > .cq-hrd-side[data-cq-owner="hrd-workspace"]'))){repairing=true;drawSidebar();queueMicrotask(()=>{repairing=false})}const old=document.getElementById('hrd-report-inbox-panel');if(old)old.remove()});
function start(){observer.observe(document.body,{childList:true,subtree:true});stampDom();if(install()){setTimeout(()=>{const s=document.getElementById('sidebar');if(s&&!s.querySelector('.cq-hrd-side'))drawSidebar();if(!content()?.firstElementChild)renderDashboard()},60)}else{let n=0;const t=setInterval(()=>{n++;if(install()){clearInterval(t);const s=document.getElementById('sidebar');if(s&&!s.querySelector('.cq-hrd-side'))drawSidebar();if(!content()?.firstElementChild)renderDashboard()}else if(n>=40)clearInterval(t)},250)}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
if(typeof enterApp==='function'&&!enterApp.__cqHrdWorkspaceWrapped){const old=enterApp;const wrapped=function(){const out=old.apply(this,arguments);setTimeout(()=>{if(isHrd()){install();drawSidebar();renderDashboard()}},90);return out};wrapped.__cqHrdWorkspaceWrapped=true;enterApp=wrapped}
})();
/* HRD sidebar compact polish v7 */
.sidebar:has(>.cq-hrd-side){padding-left:18px!important;padding-right:18px!important}
.sidebar:has(>.cq-hrd-side) .cq-hrd-side{display:block!important;padding:10px 0!important}
.sidebar:has(>.cq-hrd-side) .cq-hrd-nav{
  display:flex!important;align-items:center!important;min-height:38px!important;
  margin:2px 0!important;padding:8px 12px!important;border-radius:10px!important;
  font-size:10px!important;line-height:1.2!important;font-weight:760!important;
  white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;
}
.sidebar:has(>.cq-hrd-side) .cq-hrd-nav.active{
  min-height:38px!important;background:#0d817b!important;color:#fff!important;
  box-shadow:none!important;font-weight:850!important;
}
.sidebar:has(>.cq-hrd-side) .cq-hrd-group-label{
  display:flex!important;align-items:center!important;width:100%!important;min-height:30px!important;
  margin:10px 0 2px!important;padding:5px 12px!important;border-radius:8px!important;
  font-size:8px!important;letter-spacing:.13em!important;color:#718582!important;
}
.sidebar:has(>.cq-hrd-side) .cq-hrd-group-label.open{background:transparent!important;color:#526b68!important}
.sidebar:has(>.cq-hrd-side) .cq-hrd-sub{display:grid!important;gap:1px!important;padding-left:7px!important}
.sidebar:has(>.cq-hrd-side) .cq-hrd-sub[hidden]{display:none!important}
.sidebar:has(>.cq-hrd-side) .cq-hrd-sub .cq-hrd-nav{
  min-height:36px!important;padding:7px 11px!important;font-size:9.5px!important;
}
.sidebar:has(>.cq-hrd-side) .cq-hrd-sub .cq-hrd-nav.active{
  min-height:36px!important;border-radius:9px!important;
}
@media(max-width:1180px){
  .sidebar:has(>.cq-hrd-side) .cq-hrd-nav{font-size:9px!important}
  .sidebar:has(>.cq-hrd-side) .cq-hrd-sub .cq-hrd-nav{font-size:8.7px!important}
}
