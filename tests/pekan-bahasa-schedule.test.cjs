const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const {stripTypeScriptTypes}=require('node:module');
const crypto=require('node:crypto').webcrypto;
function backend(username='dila',category='PEKAN_BAHASA'){
 let handler;
 const event={id:'event',category,scope_label:'Banat',pic_text:null,planned_date:'2026-10-02',status:'TERJADWAL'};
 const tables={user_sessions:[{token_hash:require('node:crypto').createHash('sha256').update('session').digest('hex'),user_account_id:'u',expires_at:'2099-01-01'}],user_accounts:[{id:'u',teacher_id:'t',username,status:'AKTIF'}],user_roles:username==='head'?[{teacher_id:'t',role_code:'pimpinan',is_active:true}]:[],academic_years:[{id:'y',name:'2026/2027',is_active:true}],semesters:[{academic_year_id:'y',semester_no:1,is_active:true}],activity_events:[event],classes:[{id:'a',name:'4A Banat',is_active:true},{id:'b',name:'4B Banat',is_active:true},{id:'c',name:'4A Banin',is_active:true}],student_enrollments:[{student_id:'s',class_id:'a',academic_year_id:'y',semester_no:1,is_active:true}],students:[{id:'s',full_name:'Siswa'}]};
 class Q{
  constructor(name){this.name=name;this.filters=[];this.one=false;this.patch=null;}
  select(){return this}eq(k,v){this.filters.push(x=>x[k]===v);return this}in(k,v){this.filters.push(x=>v.includes(x[k]));return this}order(){return this}limit(){return this}maybeSingle(){this.one=true;return this}single(){this.one=true;return this}update(p){this.patch=p;return this}
  then(ok,bad){const data=(tables[this.name]||[]).filter(x=>this.filters.every(f=>f(x)));if(this.patch)data.forEach(x=>Object.assign(x,this.patch));return Promise.resolve({data:this.one?data[0]||null:data,error:null}).then(ok,bad)}
 }
 const ctx={createClient:()=>({from:n=>new Q(n)}),Deno:{env:{get:()=>''},serve:f=>handler=f},crypto,TextEncoder,Request,Response,console:{error(){}},Date,Map,Set,Uint8Array,atob};vm.createContext(ctx);
 vm.runInContext(stripTypeScriptTypes(fs.readFileSync('supabase/functions/activity-report/index.ts','utf8').replace(/^import .*\n/,'')),ctx);
 return {event,call:async body=>{const r=await handler(new Request('https://test',{method:'POST',headers:{'x-session-token':'session'},body:JSON.stringify({event_id:'event',...body})}));return {status:r.status,...await r.json()}}};
}
for(const username of ['dila','saad'])test(username+' saves PIC and valid scope; legacy client preserves both',async()=>{
 const b=backend(username);const r=await b.call({action:'save_event',status:'TERLAKSANA',scope_label:'Kelas 4A Banat',pic_text:'Bu Guru'});
 assert.equal(r.success,true);assert.equal(b.event.pic_text,'Bu Guru');assert.equal(b.event.scope_label,'Kelas 4A Banat');
 await b.call({action:'save_event',status:'TERLAKSANA',notes:'edit'});assert.equal(b.event.pic_text,'Bu Guru');assert.equal(b.event.scope_label,'Kelas 4A Banat');
});
test('scope preview is read-only, filters roster, validates scope and denies other users/categories',async()=>{
 const b=backend();const r=await b.call({action:'preview_scope',scope_label:'Kelas 4A Banat'});assert.equal(r.success,true);assert.equal(r.roster.length,1);assert.deepEqual(r.attendance.classes,['4A Banat']);assert.equal(b.event.scope_label,'Banat');
 assert.equal((await b.call({action:'save_event',status:'TERJADWAL',scope_label:'invalid',pic_text:'bad'})).success,false);assert.equal(b.event.pic_text,null);
 assert.equal((await backend('head').call({action:'save_event',status:'TERJADWAL',scope_label:'Kelas 4A Banat'})).status,403);
 assert.equal((await backend('other').call({action:'preview_scope',scope_label:'Banat'})).status,403);
 assert.equal((await backend('dila','TASMI').call({action:'preview_scope',scope_label:'Banat'})).status,403);
 const detail=await b.call({action:'detail'});assert.ok(detail.scope_options.includes('Kelas 4A Banat'));
});
function ui(username='dila',edit=true){
 const {JSDOM}=require('jsdom');const dom=new JSDOM('<div id="content"></div>',{url:'https://test',runScripts:'outside-only'}),w=dom.window;
 Object.assign(w,{SUPABASE_URL:'https://test',SUPABASE_PUBLISHABLE_KEY:'public',currentUser:{username,role:'guru'},getAuthToken:()=> 'session',escapeHtml:v=>String(v).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;'),showToast(){},renderSidebar(){},MODULES:[],MODULE_GROUPS:[]});
 const event={id:'event',category:'PEKAN_BAHASA',title:'Pekan Bahasa',scope_label:'Banat',pic_text:'Bu Lama',planned_date:'2026-10-02',status:'TERJADWAL',permission:{edit}},participants=[{student_id:'s',performance_category:'Pidato',placement:1}];
 const detail=()=>({success:true,event:{...event},scope_options:['Banat','Kelas 4A Banat'],attendance:{available:true,total:2,present:2,classes:['4A Banat','4B Banat'],date:'2026-10-02'},roster:[{id:'s',name:'Siswa',class_name:'4A Banat'}],participants,photos:[]});
 let calls=[],previews=[];
 w.fetch=async(url,opts)=>{const b=JSON.parse(opts.body);calls.push(b);let d;
 if(b.action==='preview_scope')return new Promise(resolve=>previews.push(d=>resolve({ok:true,text:async()=>JSON.stringify(d)})));
 if(b.action==='detail')d=detail();else if(b.action==='save_event'){Object.assign(event,b);d={success:true}}else d={success:true,events:[]};return{ok:true,text:async()=>JSON.stringify(d)};};
 w.eval(fs.readFileSync('kegiatan-report.js','utf8'));return{w,calls,previews};
}
test('UI previews scope without saving, retains PIC and participant edits, then sends both fields',async()=>{
 const {w,calls,previews}=ui();await w.kv2OpenEvent('event');const doc=w.document;
 assert.equal(doc.getElementById('kv2-pic').value,'Bu Lama');doc.getElementById('kv2-pic').value='Bu Baru';
 doc.querySelector('.kv2-langcat').value='Storytelling';doc.getElementById('kv2-scope').value='Kelas 4A Banat';
 const first=w.kv2PreviewScope();assert.equal(doc.getElementById('kv2-save').disabled,true);await w.kv2SaveEvent();assert.equal(calls.some(x=>x.action==='save_event'),false);
 previews.shift()({success:true,attendance:{available:true,total:1,present:1,classes:['4A Banat'],date:'2026-10-02'},roster:[{id:'s',name:'Siswa',class_name:'4A Banat'}]});await first;
 assert.equal(doc.getElementById('kv2-pic').value,'Bu Baru');assert.equal(doc.querySelector('.kv2-langcat').value,'Storytelling');assert.equal(doc.querySelector('.kv2-langcheck').checked,true);
 await w.kv2SaveEvent();const save=calls.find(x=>x.action==='save_event');assert.equal(save.pic_text,'Bu Baru');assert.equal(save.scope_label,'Kelas 4A Banat');
 assert.equal(calls.find(x=>x.action==='save_language_participants').participants[0].performance_category,'Storytelling');
});
test('UI ignores stale preview replies and keeps read-only viewers locked',async()=>{
 const {w,previews}=ui();await w.kv2OpenEvent('event');const first=w.kv2PreviewScope(),second=w.kv2PreviewScope();
 previews[1]({success:true,attendance:{available:true,present:9,total:9,classes:[]},roster:[]});await second;
 previews[0]({success:true,attendance:{available:true,present:1,total:1,classes:[]},roster:[]});await first;assert.match(w.document.getElementById('kv2-attendance').textContent,/9 hadir/);
 const viewer=ui('head',false);await viewer.w.kv2OpenEvent('event');assert.equal(viewer.w.document.getElementById('kv2-pic'),null);assert.equal(viewer.w.document.getElementById('kv2-scope'),null);assert.equal(viewer.w.document.getElementById('kv2-save'),null);
});
