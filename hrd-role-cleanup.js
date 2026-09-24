/* CQlass — HRD clean workspace */
(function(){
'use strict';
if(window.__cqHrdRoleCleanupV2)return;
window.__cqHrdRoleCleanupV2=true;

const jktDate=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const state={active:'dashboard',month:jktDate().slice(0,7),admin:null,liveQuery:'',liveSort:'issues'};
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const low=v=>String(v??'').trim().toLowerCase();
const content=()=>document.getElementById('content');
const token=()=>{try{return typeof getAuthToken==='function'?getAuthToken():(localStorage.getItem('cqlass_session_token')||'')}catch(_){return''}};
const baseUrl=()=>typeof SUPABASE_URL!=='undefined'?SUPABASE_URL:'https://lmglkxzemtvxcgktiord.supabase.co';
const publishable=()=>typeof SUPABASE_PUBLISHABLE_KEY!=='undefined'?SUPABASE_PUBLISHABLE_KEY:'';
const minDate=(a,b)=>String(a)<=String(b)?String(a):String(b);
const monthRange=m=>{const[y,mo]=String(m).split('-').map(Number);return{start:m+'-01',end:new Date(Date.UTC(y,mo,0)).toISOString().slice(0,10)}};

function readUser(){try{return (typeof currentUser!=='undefined'&&currentUser)||JSON.parse(localStorage.getItem('cqlass_user')||'{}')||{}}catch(_){return{}}}
function isHrd(){const u=readUser(),r=[u.role,u.primary_role,u.role_code,...(Array.isArray(u.roles)?u.roles.map(x=>typeof x==='string'?x:(x?.role_code||x?.role||'')):[])].map(x=>low(x).replace(/[\s-]+/g,'_'));return low(u.username)==='hrd'||r.includes('hrd')}

async function api(slug,payload){
  const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),45000);
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
  .cq-hrd-side{padding:18px 14px 26px;display:flex;flex-direction:column;gap:7px}.cq-hrd-section{margin:17px 8px 4px;font-size:10px;font-weight:900;letter-spacing:.12em;text-transform:uppercase;color:#718582}.cq-hrd-nav{width:100%;min-height:44px;border:0;border-radius:12px;background:transparent;color:#294846;padding:0 13px;display:flex;align-items:center;font:750 13px/1.2 Inter,system-ui,sans-serif;text-align:left;cursor:pointer}.cq-hrd-nav:hover{background:#eef7f5}.cq-hrd-nav.active{background:#0a6e6e;color:#fff}
  .cq-hrd-clean{display:grid;gap:14px}.cq-hrd-head{display:flex;justify-content:space-between;gap:14px;align-items:flex-end;padding:19px 20px;border-radius:18px;background:linear-gradient(135deg,#073f43,#0a6e6e);color:#fff}.cq-hrd-head h1{font-size:22px;margin:3px 0 5px}.cq-hrd-head p{margin:0;color:#d9eeee;font-size:11px;line-height:1.55}.cq-hrd-eyebrow{font-size:9px;font-weight:900;letter-spacing:.13em;text-transform:uppercase;color:#aee2de}
  .cq-hrd-tools{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.cq-hrd-tools input,.cq-hrd-tools select{height:39px;border:1px solid #d6e5e3;border-radius:11px;background:#fff;padding:0 11px;color:#294846}.cq-hrd-btn{height:39px;border:0;border-radius:11px;background:#0a6e6e;color:#fff;padding:0 13px;font-weight:850;cursor:pointer}.cq-hrd-btn.alt{background:#e9f4f2;color:#0a6763}.cq-hrd-btn.danger{background:#fff0ee;color:#a13d35}
  .cq-hrd-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.cq-hrd-kpi,.cq-hrd-panel{background:#fff;border:1px solid #dce9e7;border-radius:16px;padding:15px;box-shadow:0 5px 18px rgba(20,70,70,.04)}.cq-hrd-kpi span{display:block;font-size:10px;color:#748986;font-weight:750}.cq-hrd-kpi b{display:block;font-size:24px;color:#183f3d;margin-top:7px}.cq-hrd-kpi small{display:block;font-size:9px;color:#91a19e;margin-top:3px}.cq-hrd-panel h2{margin:0 0 12px;font-size:15px;color:#214441}
  .cq-hrd-table-wrap{overflow:auto;border:1px solid #e0eae8;border-radius:14px}.cq-hrd-table{width:100%;border-collapse:collapse;min-width:760px}.cq-hrd-table th{padding:10px 11px;text-align:left;background:#f1f7f6;color:#607773;font-size:9px;text-transform:uppercase;letter-spacing:.05em}.cq-hrd-table td{padding:11px;border-top:1px solid #edf2f1;color:#355451;font-size:11px;vertical-align:top}.cq-hrd-table td b{color:#193f3d}
  .cq-hrd-chip{display:inline-block;border-radius:999px;background:#edf6f4;color:#356d67;padding:5px 8px;font-size:9px;font-weight:850;margin:2px 3px 2px 0}.cq-hrd-chip.bad{background:#fff0ee;color:#a13d35}.cq-hrd-chip.warn{background:#fff8e7;color:#8b6816}.cq-hrd-chip.ok{background:#eaf7ef;color:#24714b}.cq-hrd-empty{padding:28px;text-align:center;color:#708783;font-size:11px}
  .cq-hrd-quick{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}.cq-hrd-quick button{border:1px solid #dbe8e6;background:#f8fbfb;border-radius:13px;padding:13px;text-align:left;color:#284946;font-weight:850;cursor:pointer}.cq-hrd-quick small{display:block;color:#7a8e8b;font-weight:500;margin-top:5px}
  .cq-hrd-sat{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.cq-hrd-sat-card{border:1px solid #dde9e7;background:#fff;border-radius:15px;padding:14px}.cq-hrd-sat-card h3{margin:0 0 5px;font-size:13px;color:#214441}.cq-hrd-sat-card p{margin:4px 0;color:#708783;font-size:10px;line-height:1.5}.cq-hrd-form{display:grid;grid-template-columns:1.2fr 1.5fr .8fr .8fr 1.5fr auto;gap:9px;align-items:end}.cq-hrd-field{display:grid;gap:5px}.cq-hrd-field label{font-size:9px;text-transform:uppercase;letter-spacing:.06em;color:#6f8582;font-weight:850}.cq-hrd-field input,.cq-hrd-field select{height:40px;border:1px solid #d8e6e4;border-radius:11px;padding:0 10px;background:#fff}
  #content.cq-hrd-clean-mode #hrd-report-inbox-panel,#content.cq-hrd-clean-mode .hrd-navtabs,#content.cq-hrd-clean-mode .cq-hf-wrap{display:none!important}
  @media(max-width:1000px){.cq-hrd-grid{grid-template-columns:repeat(2,1fr)}.cq-hrd-form{grid-template-columns:repeat(2,1fr)}.cq-hrd-sat{grid-template-columns:1fr}}@media(max-width:620px){.cq-hrd-grid,.cq-hrd-quick,.cq-hrd-form{grid-template-columns:1fr}.cq-hrd-head{align-items:flex-start;flex-direction:column}.cq-hrd-tools>*{width:100%}}
  `;document.head.appendChild(s);
}

function navButton(id,label,fn){return `<button class="cq-hrd-nav${state.active===id?' active':''}" onclick="${fn}">${label}</button>`}
function drawSidebar(active){
  if(!isHrd())return false;installCss();if(active)state.active=active;
  const s=document.getElementById('sidebar');if(!s)return false;
  s.innerHTML=`<div class="cq-hrd-side">
    ${navButton('dashboard','Dashboard','openHrdCleanDashboard()')}
    <div class="cq-hrd-section">Laporan</div>
    ${navButton('live','Live Report','openHrdCleanLive()')}
    ${navButton('timesheet','Timesheet','openHrdCleanTimesheet()')}
    ${navButton('administration','Administrasi Guru','openHrdCleanAdministration()')}
    ${navButton('attendance','Kehadiran','openHrdCleanAttendance()')}
    ${navButton('promotion','Promosi Socmed','openHrdCleanPromotion()')}
    ${navButton('saturday','Kegiatan Sabtu','openHrdCleanSaturday()')}
    ${navButton('monthly','Rekap Bulanan','openHrdCleanMonthly()')}
    <div class="cq-hrd-section">Pengelolaan</div>
    ${navButton('saturday-manage','Jadwal Kegiatan Sabtu','openHrdCleanSaturdayManage()')}
  </div>`;
  return true;
}
function setActive(id){state.active=id;drawSidebar(id);const c=content();if(c)c.classList.add('cq-hrd-clean-mode')}
function head(title,sub){return `<div class="cq-hrd-head"><div><div class="cq-hrd-eyebrow">HRD // CQlass</div><h1>${esc(title)}</h1><p>${esc(sub)}</p></div></div>`}
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
  setActive('dashboard');loading('Dashboard');
  try{const d=await getAdmin(),s=summary(d),c=content();if(!c)return;c.innerHTML=`<div class="cq-hrd-clean">${head('Dashboard','Ringkasan HRD bulan berjalan. Detail tersedia di menu Laporan.')}<div class="cq-hrd-grid"><div class="cq-hrd-kpi"><span>Total Guru</span><b>${s.total}</b><small>guru aktif terpantau</small></div><div class="cq-hrd-kpi"><span>Administrasi Lengkap</span><b>${s.clean}</b><small>tanpa kekurangan terdeteksi</small></div><div class="cq-hrd-kpi"><span>Perlu Ditindaklanjuti</span><b>${s.issues}</b><small>ada data belum lengkap</small></div><div class="cq-hrd-kpi"><span>Promosi Socmed</span><b>${s.promoDone}</b><small>${s.promoMissing} guru belum</small></div></div><div class="cq-hrd-panel"><h2>Akses Cepat</h2><div class="cq-hrd-quick"><button onclick="openHrdCleanLive()">Live Report<small>Monitoring guru secara langsung</small></button><button onclick="openHrdCleanTimesheet()">Timesheet<small>Aktivitas kerja dan jadwal guru</small></button><button onclick="openHrdCleanSaturdayManage()">Jadwal Kegiatan Sabtu<small>HRD menentukan kegiatan Sabtu</small></button></div></div></div>`}catch(e){errorView('Dashboard',e)}
}

function sortedLiveRows(){let rows=[...(state.admin?.teachers||[])];const q=low(state.liveQuery);if(q)rows=rows.filter(t=>low(teacherName(t)).includes(q));if(state.liveSort==='az')rows.sort((a,b)=>teacherName(a).localeCompare(teacherName(b),'id'));else if(state.liveSort==='za')rows.sort((a,b)=>teacherName(b).localeCompare(teacherName(a),'id'));else if(state.liveSort==='complete')rows.sort((a,b)=>Number(b.completeness_index||0)-Number(a.completeness_index||0)||teacherName(a).localeCompare(teacherName(b),'id'));else rows.sort((a,b)=>issueCount(b)-issueCount(a)||teacherName(a).localeCompare(teacherName(b),'id'));return rows}
function drawLive(){
  const c=content(),rows=sortedLiveRows(),s=summary(state.admin||{});if(!c)return;
  c.innerHTML=`<div class="cq-hrd-clean">${head('Live Report','Pusat monitoring HRD: siapa yang lengkap dan apa yang masih perlu ditindaklanjuti.')}<div class="cq-hrd-grid"><div class="cq-hrd-kpi"><span>Total Guru</span><b>${s.total}</b></div><div class="cq-hrd-kpi"><span>Lengkap</span><b>${s.clean}</b></div><div class="cq-hrd-kpi"><span>Perlu Ditindaklanjuti</span><b>${s.issues}</b></div><div class="cq-hrd-kpi"><span>Promosi Belum</span><b>${s.promoMissing}</b></div></div><div class="cq-hrd-panel"><div class="cq-hrd-tools"><input placeholder="Cari guru..." value="${esc(state.liveQuery)}" oninput="hrdCleanLiveQuery(this.value)"><select onchange="hrdCleanLiveSort(this.value)"><option value="issues" ${state.liveSort==='issues'?'selected':''}>Paling banyak belum</option><option value="complete" ${state.liveSort==='complete'?'selected':''}>Paling lengkap</option><option value="az" ${state.liveSort==='az'?'selected':''}>A–Z</option><option value="za" ${state.liveSort==='za'?'selected':''}>Z–A</option></select><button class="cq-hrd-btn alt" onclick="hrdCleanReload()">Muat Ulang</button></div><div class="cq-hrd-table-wrap" style="margin-top:12px"><table class="cq-hrd-table"><thead><tr><th>Guru</th><th>Role</th><th>Kelengkapan</th><th>Status</th><th>Yang perlu dicek</th></tr></thead><tbody>${rows.map(t=>{const issue=issueCount(t),miss=[...(t.missing_categories||[]),...(t.partial_categories||[])].join(', ');return `<tr><td><b>${esc(teacherName(t))}</b></td><td>${esc(rolesText(t))}</td><td>${Math.round(Number(t.completeness_index||0))}%</td><td><span class="cq-hrd-chip ${issue?'bad':'ok'}">${issue?issue+' perlu dicek':'Lengkap'}</span></td><td>${esc(miss||'—')}</td></tr>`}).join('')||'<tr><td colspan="5" class="cq-hrd-empty">Tidak ada data.</td></tr>'}</tbody></table></div></div></div>`;
}
async function renderLive(){setActive('live');loading('Live Report');try{await getAdmin(state.month,true);drawLive()}catch(e){errorView('Live Report',e)}}

async function renderAdministration(){
  setActive('administration');loading('Administrasi Guru');
  try{const d=await getAdmin(),rows=d.teachers||[],c=content();if(!c)return;c.innerHTML=`<div class="cq-hrd-clean">${head('Administrasi Guru','Menampilkan kewajiban administrasi yang berlaku untuk masing-masing guru. Promosi Socmed dipisahkan ke laporan tersendiri.')}<div class="cq-hrd-panel"><div class="cq-hrd-table-wrap"><table class="cq-hrd-table"><thead><tr><th>Guru</th><th>Role</th><th>Selesai</th><th>Belum / Sebagian</th><th>Detail Administrasi</th></tr></thead><tbody>${rows.map(t=>{const cats=(t.categories||[]).filter(x=>x&&x.applicable!==false&&x.key!=='promotion');const done=cats.filter(x=>x.status==='present').length,miss=cats.filter(x=>x.status==='missing'||x.status==='partial');return `<tr><td><b>${esc(teacherName(t))}</b></td><td>${esc(rolesText(t))}</td><td>${done}/${cats.length}</td><td><span class="cq-hrd-chip ${miss.length?'bad':'ok'}">${miss.length||'Lengkap'}</span></td><td>${cats.map(x=>`<span class="cq-hrd-chip ${x.status==='missing'?'bad':x.status==='partial'?'warn':x.status==='present'?'ok':''}">${esc(categoryLabel(x))}: ${esc(x.status==='present'?'Selesai':x.status==='partial'?'Sebagian':x.status==='missing'?'Belum':'Info')}</span>`).join('')||'—'}</td></tr>`}).join('')||'<tr><td colspan="5" class="cq-hrd-empty">Belum ada data administrasi guru.</td></tr>'}</tbody></table></div></div></div>`}catch(e){errorView('Administrasi Guru',e)}
}

function findPromotion(t){return (t.categories||[]).find(x=>x&&x.key==='promotion')||null}
async function renderPromotion(){
  setActive('promotion');loading('Promosi Socmed');
  try{const d=await getAdmin(),rows=d.teachers||[],c=content();if(!c)return;const done=rows.filter(t=>findPromotion(t)?.status==='present').length,missing=rows.filter(t=>findPromotion(t)?.status!=='present').length;c.innerHTML=`<div class="cq-hrd-clean">${head('Promosi Socmed','Monitoring minimal 1 foto promosi per guru pada periode berjalan.')}<div class="cq-hrd-grid"><div class="cq-hrd-kpi"><span>Total Guru</span><b>${rows.length}</b></div><div class="cq-hrd-kpi"><span>Sudah</span><b>${done}</b></div><div class="cq-hrd-kpi"><span>Belum</span><b>${missing}</b></div><div class="cq-hrd-kpi"><span>Target</span><b>1</b><small>foto / bulan</small></div></div><div class="cq-hrd-panel"><div class="cq-hrd-table-wrap"><table class="cq-hrd-table"><thead><tr><th>Guru</th><th>Role</th><th>Status</th><th>Jumlah</th><th>Terakhir</th></tr></thead><tbody>${rows.map(t=>{const p=findPromotion(t),ok=p?.status==='present';return `<tr><td><b>${esc(teacherName(t))}</b></td><td>${esc(rolesText(t))}</td><td><span class="cq-hrd-chip ${ok?'ok':'bad'}">${ok?'Sudah':'Belum'}</span></td><td>${Number(p?.item_count||0)}</td><td>${esc(p?.last_created_at?String(p.last_created_at).slice(0,10):'—')}</td></tr>`}).join('')}</tbody></table></div></div></div>`}catch(e){errorView('Promosi Socmed',e)}
}

function waitRenderer(name,title){const c=content();let n=0;(function step(){n++;if(typeof window[name]==='function')return window[name](c);if(n<35)return setTimeout(step,100);if(c)c.innerHTML=`<div class="cq-hrd-clean">${head(title,'Data ditarik langsung dari CQlass.')}<div class="cq-hrd-panel cq-hrd-empty">${esc(title)} belum dapat dimuat. Muat ulang halaman.</div></div>`})()}
function renderTimesheet(){setActive('timesheet');loading('Timesheet');waitRenderer('renderTeacherTimesheet','Timesheet')}

async function renderAttendance(){
  setActive('attendance');loading('Kehadiran');
  try{const r=monthRange(state.month),d=await api('hrd-performance-range',{start:r.start,end:minDate(r.end,jktDate())}),rows=d.teachers||[],c=content();if(!c)return;c.innerHTML=`<div class="cq-hrd-clean">${head('Kehadiran','Kehadiran guru pada periode berjalan. Data ini tidak dicampur dengan kehadiran siswa.')}<div class="cq-hrd-panel"><div class="cq-hrd-table-wrap"><table class="cq-hrd-table"><thead><tr><th>Guru</th><th>Kehadiran</th><th>Status Data</th></tr></thead><tbody>${rows.map(t=>{const dim=(t.dimensions||[]).find(x=>low(x.label)==='kehadiran'),v=dim?.score;return `<tr><td><b>${esc(t.name||'Guru')}</b></td><td>${v==null?'—':Math.round(Number(v))+'%'}</td><td><span class="cq-hrd-chip ${v==null?'warn':'ok'}">${v==null?'Belum ada event kehadiran':'Tercatat'}</span></td></tr>`}).join('')||'<tr><td colspan="3" class="cq-hrd-empty">Belum ada data kehadiran.</td></tr>'}</tbody></table></div></div></div>`}catch(e){errorView('Kehadiran',e)}
}

async function saturdayData(){return api('hrd-saturday-schedule',{action:'bootstrap',month:state.month})}
function saturdayCards(d,manage){const rows=d.schedules||[];if(!rows.length)return '<div class="cq-hrd-empty">Belum ada jadwal Kegiatan Sabtu pada bulan ini.</div>';return `<div class="cq-hrd-sat">${rows.map(x=>`<div class="cq-hrd-sat-card"><h3>${esc(x.event_date)} — ${esc(x.activity_name||'Kegiatan Sabtu')}</h3><p>${esc(String(x.start_time||'').slice(0,5))}–${esc(String(x.end_time||'').slice(0,5))} · Semua guru</p><p>${esc(x.note||'Tanpa catatan')}</p><p>Kehadiran tercatat: ${Number(x.attendance_filled||0)} · Guru aktif: ${Number(d.teacher_count||0)}</p>${manage?`<button class="cq-hrd-btn danger" onclick="hrdDeleteSaturday('${esc(x.id)}')">Hapus Jadwal</button>`:''}</div>`).join('')}</div>`}
async function renderSaturday(){setActive('saturday');loading('Kegiatan Sabtu');try{const d=await saturdayData(),c=content();if(c)c.innerHTML=`<div class="cq-hrd-clean">${head('Kegiatan Sabtu','Monitoring jadwal yang ditetapkan HRD dan keterisian laporannya.')}<div class="cq-hrd-panel">${saturdayCards(d,false)}</div></div>`}catch(e){errorView('Kegiatan Sabtu',e)}}

async function renderMonthly(){
  setActive('monthly');loading('Rekap Bulanan');
  try{const d=await getAdmin(),s=summary(d),rows=d.teachers||[],c=content();if(!c)return;c.innerHTML=`<div class="cq-hrd-clean">${head('Rekap Bulanan','Ringkasan kelengkapan administrasi '+state.month+'.')}<div class="cq-hrd-grid"><div class="cq-hrd-kpi"><span>Total Guru</span><b>${s.total}</b></div><div class="cq-hrd-kpi"><span>Lengkap</span><b>${s.clean}</b></div><div class="cq-hrd-kpi"><span>Belum Lengkap</span><b>${s.issues}</b></div><div class="cq-hrd-kpi"><span>Promosi Belum</span><b>${s.promoMissing}</b></div></div><div class="cq-hrd-panel"><div class="cq-hrd-table-wrap"><table class="cq-hrd-table"><thead><tr><th>Guru</th><th>Selesai</th><th>Belum</th><th>Sebagian</th><th>Indeks</th></tr></thead><tbody>${rows.map(t=>`<tr><td><b>${esc(teacherName(t))}</b></td><td>${Number(t.completed_count||0)}/${Number(t.required_count||0)}</td><td>${Number(t.missing_count||0)}</td><td>${Number(t.partial_count||0)}</td><td>${Math.round(Number(t.completeness_index||0))}%</td></tr>`).join('')}</tbody></table></div></div></div>`}catch(e){errorView('Rekap Bulanan',e)}
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

window.openHrdCleanDashboard=renderDashboard;
window.openHrdCleanLive=renderLive;
window.openHrdCleanTimesheet=renderTimesheet;
window.openHrdCleanAdministration=renderAdministration;
window.openHrdCleanAttendance=renderAttendance;
window.openHrdCleanPromotion=renderPromotion;
window.openHrdCleanSaturday=renderSaturday;
window.openHrdCleanMonthly=renderMonthly;
window.openHrdCleanSaturdayManage=renderSaturdayManage;

function install(){
  if(!isHrd())return false;installCss();
  try{if(typeof DASHBOARD_MODULE!=='undefined'){DASHBOARD_MODULE.label='Dashboard';if(Array.isArray(DASHBOARD_MODULE.roles)&&!DASHBOARD_MODULE.roles.includes('hrd'))DASHBOARD_MODULE.roles.push('hrd')}}catch(_){ }
  drawSidebar();const c=content();if(c)c.classList.add('cq-hrd-clean-mode');
  return true;
}

if(typeof renderSidebar==='function'&&!renderSidebar.__cqHrdCleanV2){const old=renderSidebar;const wrapped=function(){return isHrd()?drawSidebar():old.apply(this,arguments)};wrapped.__cqHrdCleanV2=true;renderSidebar=wrapped}
const observer=new MutationObserver(()=>{if(isHrd()){const s=document.getElementById('sidebar');if(s&&!s.querySelector('.cq-hrd-side'))drawSidebar();const old=document.getElementById('hrd-report-inbox-panel');if(old)old.remove()}});
function start(){observer.observe(document.body,{childList:true,subtree:true});if(install())setTimeout(renderDashboard,60)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
if(typeof enterApp==='function'&&!enterApp.__cqHrdCleanV2){const old=enterApp;const wrapped=function(){const out=old.apply(this,arguments);setTimeout(()=>{if(install())renderDashboard()},90);return out};wrapped.__cqHrdCleanV2=true;enterApp=wrapped}
})();