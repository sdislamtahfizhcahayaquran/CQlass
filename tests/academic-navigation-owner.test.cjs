const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');
const read=f=>fs.readFileSync(f,'utf8');
const app=read('app-core.js');
const navigation=app.slice(app.indexOf('const MODULE_GROUPS = ['),app.indexOf('/* ==========================================================\n   MODUL: CATATAN MASALAH SISWA'));
function environment(role){
 const dom=new JSDOM('<div id="login-screen"></div><div id="app-screen"><div class="topbar"><span id="user-name"></span><span id="user-role"></span></div><div class="layout"><div id="sidebar"></div><div id="content"></div></div></div>',{url:'https://example.invalid/',runScripts:'outside-only'});
 const w=dom.window,timers=new Map(),intervals=[],calls=[];let seq=0;
 const observers=[];const Observer=w.MutationObserver;w.MutationObserver=class extends Observer{constructor(fn){super(fn);observers.push(this)}};
 const close=w.close.bind(w);w.close=()=>{observers.forEach(o=>o.disconnect());close()};
 w.currentUser={role,nama:'Audit',username:'audit',roles:['akademik']};
 w.setTimeout=(fn,delay)=>{const id=++seq;timers.set(id,{fn,delay});return id};w.clearTimeout=id=>timers.delete(id);w.setInterval=fn=>(intervals.push(fn),intervals.length);w.clearInterval=()=>{};
 w.SUPABASE_URL='https://example.invalid';w.SUPABASE_PUBLISHABLE_KEY='test-only';
 w.getAuthToken=()=>'';w.saveAuthSession=()=>{};w.AUTH_STORAGE={EXPIRES:'expiry'};w.updateProfilePhotoUI=()=>{};w.callApi=async()=>({});
 const renderer=id=>c=>{calls.push(id);c.innerHTML='<input id="keep-input" value="unsaved"><span>'+id+'</span>'};
 for(const name of ['renderLegger','renderVocabularyBulanan','renderPjBL','renderCetakRapor','renderAbsensi','renderKedisiplinan','renderReward','renderMasalahSiswa','renderEkskulRekap','renderLaporanGuru','renderDashboard'])w[name]=renderer(name);
 new (require('node:vm').Script)(navigation).runInContext(dom.getInternalVMContext());
 w.eval("DASHBOARD_MODULE.roles.push('akademik','kabid_akademik','academic')");
 for(const id of ['master-tp-akademik','rpp-lp','legger-live','laporan-akademik-guru','academic-pjbl-report','akd-badal-recap','laporan-promosi']){
  w.__testModule={id,label:id,built:true,roles:['akademik','walas','admin','pimpinan'],render:renderer(id)};
  w.eval("MODULE_GROUPS.find(g=>g.id==='akademik').items.push(window.__testModule)");
 }
 w.renderAcademicRankingReport=renderer('ranking');w.renderAcademicDownloadData=renderer('download');w.renderPromotionReport=renderer('promotion');w.renderAdminScheduleEditor=renderer('schedule');w.renderAcademicBadal=renderer('badal');
 const snapshot=()=>w.eval('JSON.stringify(MODULE_GROUPS)');
 async function flush(max=1000){for(let round=0;round<8;round++){const entries=[...timers].filter(([,t])=>t.delay<=max);if(!entries.length)break;for(const [id,t] of entries){timers.delete(id);t.fn()}await new Promise(setImmediate)}}
 return {dom,w,calls,timers,intervals,snapshot,flush};
}
for(const role of ['akademik','kabid_akademik','academic'])test(role+': stable menu, one render per click, unchanged shared registry',()=>{
 const e=environment(role),{w}=e;try{
  const before=e.snapshot();const sidebar=w.renderSidebar,router=w.setActiveModule;
  w.eval(read('academic-sidebar-clean-v1.js'));
  assert.equal(w.renderSidebar,sidebar);assert.equal(w.setActiveModule,router);
  const groups=w.cqAcademicMenuGroups(),items=groups.flatMap(g=>g.items),ids=items.map(i=>i.id);
  assert.equal(ids.length,new Set(ids).size);
  assert.deepEqual(Array.from(ids),['leger','master-tp-akademik','rpp-lp','bilingual','pjbl','akd-badal','jadwal-mengajar','legger-live','academic-ranking-report','laporan-akademik-guru','akd-badal-recap','academic-pjbl-report','rapor','laporan-promosi','academic-download-data']);
  for(const id of ids){const n=e.calls.length;w.setActiveModule(id);assert.equal(e.calls.length,n+1,id);assert.equal(w.eval('activeModule'),id);assert.equal(w.document.querySelectorAll('.nav-item.active').length,1,id)}
  for(let i=0;i<8;i++){w.renderSidebar();w.cqAcademicMenuGroups()}
  assert.equal(e.snapshot(),before);
  // A module registering late must appear immediately without polling or document click handlers.
  w.eval("MODULE_GROUPS.find(g=>g.id==='akademik').items.find(i=>i.id==='rpp-lp').label='New label'");
  assert.equal(w.cqAcademicMenuGroups()[0].items.find(i=>i.id==='rpp-lp').label,'RPP & LP');
  w.currentUser.role='walas';assert.equal(w.cqAcademicMenuGroups(),null);
 }finally{e.dom.window.close()}
});
for(const role of ['admin','walas','guru','guru_partner','partner','pengabdian','tahfizh','kabid_quran','hrd','kesiswaan','kabid_kesiswaan','kegiatan','pimpinan','sapras','academic_assistant'])test(role+': Academic owner leaves role model and sidebar unchanged',()=>{
 const e=environment(role),{w}=e;try{w.renderSidebar();const html=w.document.getElementById('sidebar').innerHTML,before=e.snapshot();w.eval(read('academic-sidebar-clean-v1.js'));assert.equal(w.cqAcademicMenuGroups(),null);w.renderSidebar();assert.equal(w.document.getElementById('sidebar').innerHTML,html);assert.equal(e.snapshot(),before)}finally{e.dom.window.close()}
});
test('header never renders dashboard or replaces an open form; exact active role',async()=>{
 const e=environment('akademik'),{w}=e;try{
  w.setActiveModule('leger');let dashboardCalls=0;w.renderAcademicDashboardV7=()=>dashboardCalls++;
  w.eval(read('academic-header-shell-v9.js'));w.dispatchEvent(new w.Event('load'));await e.flush();
  for(const fn of e.intervals)fn();await e.flush();
  assert.equal(dashboardCalls,0);assert.equal(w.document.getElementById('keep-input').value,'unsaved');assert.equal(w.eval('activeModule'),'leger');
 }finally{e.dom.window.close()}
 const other=environment('admin');try{other.w.eval(read('academic-header-shell-v9.js'));other.w.dispatchEvent(new other.w.Event('load'));await other.flush();assert(!other.w.document.body.classList.contains('cq-ak-shell-v9'))}finally{other.dom.window.close()}
});
test('dashboard uses core navigation, preserves non-dashboard page across late load and refresh',async()=>{
 const e=environment('akademik'),{w}=e;try{
  w.loadActiveAcademicPeriod=async()=>({academic_year:'2031/2032',semester_no:2});
  let requests=0;w.fetch=async()=>{requests++;return {ok:true,text:async()=>'{"success":true,"teachers":[],"assignments":[],"badal":[]}'}};
  w.AbortController=AbortController;
  w.setActiveModule('leger');const router=w.setActiveModule,enter=w.enterApp;
  w.eval(read('academic-dashboard-standalone-v7.js'));
  assert.equal(w.setActiveModule,router);assert.equal(w.enterApp,enter);
  await e.flush();for(const f of e.intervals)f();await e.flush();
  assert.equal(requests,0);assert.equal(w.document.getElementById('keep-input').value,'unsaved');
  w.setActiveModule('dashboard');await e.flush();assert(w.document.getElementById('cq-ak7'));assert.equal(requests,3);
  w.setActiveModule('leger');await w.renderAcademicDashboardV7(true);for(const f of e.intervals)f();await e.flush();
  assert.equal(requests,3);assert.equal(w.document.getElementById('keep-input').value,'unsaved');
 }finally{e.dom.window.close()}
});
test('academic loader omits inactive V3 and teacher-only sidebar sorter',()=>{
 for(const role of ['akademik','kabid_akademik','academic']){
  const e=environment(role),{w}=e;try{
   w.eval(read('background-api-fix.js'));
   const scripts=Array.from(w.document.scripts,s=>s.getAttribute('src'));
   assert(!scripts.some(s=>s.includes('academic-teacher-report-v3')));assert(!scripts.some(s=>s.includes('academic-sidebar-order')));
   assert(scripts.some(s=>s.includes('academic-teacher-report.js')));
  }finally{e.dom.window.close()}
 }
});
test('real Academic module registrations work in either loader order',async()=>{
 for(const early of [true,false]){
  const e=environment('akademik'),{w}=e;
  try{
   w.eval("for(const g of MODULE_GROUPS)g.items=g.items.filter(i=>!['master-tp-akademik','rpp-lp','legger-live','laporan-akademik-guru','academic-pjbl-report','akd-badal-recap','laporan-promosi'].includes(i.id))");
   if(early)w.eval(read('academic-sidebar-clean-v1.js'));
   for(const file of ['academic-badal-sidebar-restore.js','academic-teacher-report.js','academic-master-tp.js','rpp-lp-monitoring.js','academic-legger-live.js','academic-pjbl-report.js','academic-ranking-report.js'])w.eval(read(file));
   w.document.dispatchEvent(new w.Event('DOMContentLoaded'));await e.flush(100);
   const before=e.snapshot();
   if(!early)w.eval(read('academic-sidebar-clean-v1.js'));
   const ids=Array.from(w.cqAcademicMenuGroups().flatMap(g=>g.items.map(i=>i.id)));
   assert.equal(ids.length,15);assert(ids.includes('master-tp-akademik'));assert(ids.includes('academic-ranking-report'));assert(ids.includes('laporan-akademik-guru'));assert(ids.includes('akd-badal-recap'));
   for(let i=0;i<3;i++)w.cqAcademicMenuGroups();assert.equal(e.snapshot(),before);
  }finally{e.dom.window.close()}
 }
});
test('late dashboard response cannot replace another module',async()=>{
 const e=environment('akademik'),{w}=e;let resolvePeriod;
 try{
  w.loadActiveAcademicPeriod=()=>new Promise(r=>resolvePeriod=r);
  w.fetch=async()=>({ok:true,text:async()=>'{"success":true}'});w.AbortController=AbortController;
  w.eval(read('academic-dashboard-standalone-v7.js'));w.setActiveModule('dashboard');await e.flush();
  w.setActiveModule('leger');resolvePeriod({academic_year:'2031/2032',semester_no:2});await new Promise(setImmediate);
  assert.equal(w.eval('activeModule'),'leger');assert.equal(w.document.getElementById('keep-input').value,'unsaved');assert(!w.document.getElementById('cq-ak7'));
 }finally{e.dom.window.close()}
});

test('Master TP registers its renderer without wrapping the core router or sidebar',async()=>{
 const e=environment('akademik'),{w}=e;
 try{
  const router=w.setActiveModule,sidebar=w.renderSidebar;
  w.eval(read('academic-master-tp.js'));w.document.dispatchEvent(new w.Event('DOMContentLoaded'));await e.flush(100);
  assert.equal(w.setActiveModule,router);assert.equal(w.renderSidebar,sidebar);
  assert.equal(w.findModuleByIdV2('master-tp-akademik').render,w.renderAcademicMasterTP);
 }finally{e.dom.window.close()}
});
