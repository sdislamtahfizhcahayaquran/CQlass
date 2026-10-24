// Run with NODE_PATH pointing to a jsdom installation. No production requests.
const {JSDOM}=require('jsdom');
const fs=require('fs'),assert=require('node:assert/strict');
const years=[{id:'y-old',name:'2025/2026',is_active:false,updated_at:'2026-01-01T00:00:00+00:00',semesters:[{semester_no:1},{semester_no:2}]},{id:'y-now',name:'2026/2027',is_active:true,updated_at:'2026-01-01T00:00:00+00:00',semesters:[{semester_no:1,is_active:true,updated_at:'2026-01-01T00:00:00+00:00'},{semester_no:2,is_active:false}]}];
async function setup(){const dom=new JSDOM('<div id="content"></div>',{url:'https://example.invalid/',runScripts:'outside-only'}),w=dom.window;const calls=[];let deferred=[];
 Object.assign(w,{MODULE_GROUPS:[],SUPABASE_PUBLISHABLE_KEY:'fake',getAuthToken:()=> 'fake',showToast:()=>{},confirm:()=>true});
 w.fetch=async(url,opt)=>{const b=JSON.parse(opt.body);calls.push(b);if(b.action==='effective_days'&&deferred.length)return deferred.shift()(b);const data=b.action==='list'?{success:true,years}:b.action==='effective_days'?{success:true,classes:[{id:'class-old',name:'4A',grade_level:4,effective_days:81},{id:'class-old-b',name:'4B',grade_level:4,effective_days:81}]}:{success:true};return {ok:true,json:async()=>data}};
 w.eval(fs.readFileSync('admin-academic-period.js','utf8'));await w.renderAdminAcademicPeriod(w.document.getElementById('content'));return {w,calls,deferred,close:()=>w.close()};}
(async()=>{
 let t=await setup(),w=t.w;
 assert.equal(w.document.getElementById('ay-day-year').value,'y-now','defaults to active year, not first year');
 w.document.getElementById('ay-day-year').value='y-old';w.document.getElementById('ay-day-sem').value='2';w.document.getElementById('ay-day-period').value='PAS';w.adminAYFilterChanged();await w.adminAYLoadDays();
 assert.equal(w.document.getElementById('ay-day-year').value,'y-old');assert.equal(w.document.getElementById('ay-day-sem').value,'2');assert.equal(w.document.getElementById('ay-day-period').value,'PAS');
 w.document.querySelector('.ay-grade-day').value='90';await w.adminAYSaveDays();let s=t.calls.find(x=>x.action==='save_effective_days');assert.equal(s.academic_year_id,'y-old');assert.equal(s.semester_no,2);assert.equal(s.assessment_period,'PAS');assert.equal(s.rows.length,2);assert.equal(s.rows[0].effective_days,90);
 // A selector changed without its event must still fail closed.
 w.document.getElementById('ay-day-sem').value='1';await w.adminAYSaveDays();assert.equal(t.calls.filter(x=>x.action==='save_effective_days').length,1);t.close();
 t=await setup();w=t.w;await w.adminAYLoadDays();w.document.querySelector('.ay-grade-day').value='';await w.adminAYSaveDays();assert.equal(t.calls.filter(x=>x.action==='save_effective_days').length,0,'blank is never zero');w.document.querySelector('.ay-grade-day').value='0';await w.adminAYSaveDays();assert.equal(t.calls.find(x=>x.action==='save_effective_days').rows[0].effective_days,0);t.close();
 t=await setup();w=t.w;let resolve;t.deferred.push(()=>new Promise(r=>resolve=r));const pending=w.adminAYLoadDays();w.document.getElementById('ay-day-sem').value='2';w.adminAYFilterChanged();resolve({ok:true,json:async()=>({success:true,classes:[{id:'wrong',grade_level:1,effective_days:100}]})});await pending;assert.equal(w.document.querySelectorAll('.ay-grade-day').length,0,'stale response ignored');t.close();
 t=await setup();w=t.w;let finish;t.deferred.push(()=>new Promise(r=>finish=r));const p=w.adminAYLoadDays();w.document.getElementById('content').innerHTML='<h1>Other module</h1>';finish({ok:true,json:async()=>({success:true,classes:[]})});await p;assert.equal(w.document.querySelector('h1').textContent,'Other module','late request cannot overwrite another module');t.close();
 console.log('PASS: active defaults; archive filter persistence; pinned writes; blank/zero distinction; stale response and navigation guards.');
})().catch(e=>{console.error(e);process.exitCode=1});
