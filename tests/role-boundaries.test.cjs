const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),{stripTypeScriptTypes}=require('node:module');
const crypto=require('node:crypto').webcrypto;
function db(rows){return{rows,fail:null,calls:[],writes:[],from(table){let one=false;const filters=[];this.calls.push({table,filters});const q={select:()=>q,eq:(k,v)=>(filters.push([k,v]),q),single:()=>{one=true;return q},maybeSingle:()=>{one=true;return q},order:()=>q,limit:()=>q,then:(a,b)=>{const data=(rows[table]||[]).filter(r=>filters.every(([k,v])=>r[k]===v));return Promise.resolve({data:one?data[0]||null:data,error:this.fail===table?{message:'read_failed'}:null}).then(a,b)}};for(const op of ['insert','update','upsert','delete'])q[op]=()=>{this.writes.push(table);throw Error('unexpected_write')};return q}}}
function rt(name,s){const c={createClient:()=>s,Response,Request,TextEncoder,crypto,console,Deno:{env:{get:()=> 'mock'},serve:()=>{}}};vm.createContext(c);vm.runInContext(stripTypeScriptTypes(fs.readFileSync('supabase/functions/'+name+'/index.ts','utf8').replace(/^import .*;$/gm,'')),c);c.s=s;c.a={id:'u',teacher_id:'t',username:'admin'};c.req=new Request('https://example.invalid',{headers:{'x-session-token':'test'}});return code=>vm.runInContext(code,c)}
function data(){return{user_sessions:[{token_hash:require('node:crypto').createHash('sha256').update('test').digest('hex'),user_account_id:'u',expires_at:'2099-01-01'}],user_accounts:[{id:'u',teacher_id:'t',username:'admin',status:'AKTIF'}],user_account_roles:[],user_roles:[],teachers:[{id:'t',position:'Kepala Sekolah'}],academic_years:[{id:'y',is_active:true}],semesters:[{academic_year_id:'y',semester_no:2,is_active:true}],report_class_assignments:[],class_partner_assignments:[],tahfizh_teacher_assignments:[]}}
function grant(rows,role){rows.user_account_roles=[{user_account_id:'u',role_code:role,is_active:true}];rows.user_roles=[{teacher_id:'t',role_code:role,is_active:true}]}
(async()=>{
 for(const name of ['hrd-live-report','hrd-saturday-schedule','student-affairs-center','activity-extracurricular','admin-academic-period']){
  const rows=data(),s=db(rows),run=rt(name,s),fn=name==='student-affairs-center'?'me(req)':'auth(req)';
  const result=await run(fn);
  if(name.startsWith('hrd'))assert.equal(result,null,name);else if(name==='admin-academic-period')assert.equal(result.is_admin,false);else assert.equal(result.roles.length,0,name);
  const role=name.startsWith('hrd')?'hrd':name==='student-affairs-center'?'kabid_kesiswaan':name==='activity-extracurricular'?'kabid_kegiatan':'admin';grant(rows,role);assert(await run(fn));
  s.fail='user_account_roles';await assert.rejects(run(fn));s.fail=null;
  rows.user_accounts[0].status='NONAKTIF';assert.equal(await run(fn),null,name+' disabled');rows.user_accounts[0].status='AKTIF';
  rows.user_sessions[0].revoked_at='2026-01-01';assert.equal(await run(fn),null,name+' revoked');assert.equal(s.writes.length,0);
  if(name==='activity-extracurricular'){assert.equal(run('canEdit({roles:["admin"]})'),true);assert.equal(run('canEdit({roles:["pimpinan"]})'),false);assert.equal(run('canEdit({roles:["pengabdian"]})'),false)}
 }
 for(const [name,fn] of [['teacher-timesheet','roles(s,a)'],['academic-scores','getRoles(s,a)']]){
  const rows=data(),s=db(rows),run=rt(name,s);assert(!(await run(fn)).includes('admin'));grant(rows,'custom_administrator');assert(!(await run(fn)).includes('admin'));grant(rows,'admin');assert((await run(fn)).includes('admin'));s.fail='user_roles';await assert.rejects(run(fn));assert.equal(s.writes.length,0);
 }
 const rows=data(),s=db(rows),run=rt('attendance',s);
 rows.report_class_assignments=[{academic_year_id:'old',semester_no:2,homeroom_teacher_id:'t',class_id:'old'},{academic_year_id:'y',semester_no:1,homeroom_teacher_id:'t',class_id:'prior'}];
 let c=await run('ctx(s,a)');assert.equal(c.allowed,false);assert.equal(c.elevated,false);
 rows.class_partner_assignments=[{academic_year_id:'y',semester_no:2,teacher_id:'t',class_id:'partner',is_active:true}];c=await run('ctx(s,a)');assert.deepEqual(Array.from(c.classIds),['partner']);assert(c.roles.includes('guru_partner'));assert(!c.roles.includes('walas'));
 rows.report_class_assignments.push({academic_year_id:'y',semester_no:2,homeroom_teacher_id:'t',class_id:'home'});c=await run('ctx(s,a)');assert.deepEqual(Array.from(c.classIds).sort(),['home','partner']);
 grant(rows,'kabid_kesiswaan');assert((await run('ctx(s,a)')).elevated);s.fail='class_partner_assignments';await assert.rejects(run('ctx(s,a)'));s.fail=null;
 rows.semesters=[];await assert.rejects(run('ctx(s,a)'),/active_period_missing/);assert.equal(s.writes.length,0);
 const pr=data(),ps=db(pr),pts=rt('tahfizh-pts-public',ps);
 assert.equal(await pts('resolveRole(s,a)'),'guru');grant(pr,'guru_tahfizh');assert.equal(await pts('resolveRole(s,a)'),'guru');
 pr.report_class_assignments=[{academic_year_id:'old',semester_no:2,homeroom_teacher_id:'t',class_id:'old'},{academic_year_id:'y',semester_no:2,homeroom_teacher_id:'t',class_id:'home'}];pr.tahfizh_teacher_assignments=[{academic_year_id:'y',semester_no:2,teacher_id:'t',class_id:'tah',is_active:true},{academic_year_id:'y',semester_no:1,teacher_id:'t',class_id:'prior',is_active:true}];
 assert.deepEqual(Array.from(await pts('allowedClasses(s,a,"guru","y",2)')).sort(),['home','tah']);
 grant(pr,'kabid_quran');assert.equal(await pts('resolveRole(s,a)'),'kabid_quran');assert.equal(await pts('allowedClasses(s,a,"kabid_quran","y",2)'),null);
 ps.fail='tahfizh_teacher_assignments';await assert.rejects(pts('allowedClasses(s,a,"guru","y",2)'));ps.fail='user_account_roles';await assert.rejects(pts('resolveRole(s,a)'));assert.equal(ps.writes.length,0);
 console.log('PASS: nine service role boundaries; usernames/positions/custom role substrings cannot grant privileges; disabled/revoked sessions denied; lookup failures deny; active-period Partner/Walas union; Tahfizh scoped vs Kabid Quran; Admin edits extracurricular; Pengabdian not manager.');
})().catch(e=>{console.error(e);process.exitCode=1});
