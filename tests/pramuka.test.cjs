// Nilai Pramuka: route /admin-academic-period/pramuka (mocked Supabase) + add-on role priority in auth-user. No production requests.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),{stripTypeScriptTypes}=require('node:module');
let roles=[],username='guru1',rows=[],writes=0;
const data=t=>({
 user_sessions:{user_account_id:'u',expires_at:'2099-01-01',revoked_at:null},
 user_accounts:{id:'u',teacher_id:'t',username,status:'active'},
 academic_years:{id:'year',name:'2026/2027'},semesters:{semester_no:1},
 classes:[{id:'c4',name:'4A',grade_level:4},{id:'c5',name:'5A',grade_level:5}],
 student_enrollments:[{class_id:'c4',student_id:'s1'},{class_id:'c4',student_id:'s2'},{class_id:'c4',student_id:'s3'},{class_id:'c5',student_id:'s9'}],
 students:[{id:'s1',nis:'1',full_name:'Budi',status:'AKTIF'},{id:'s2',nis:'2',full_name:'Ani',status:'AKTIF'},{id:'s3',nis:'3',full_name:'Cici',status:'KELUAR'}],
})[t];
const sb={from(table){const q={_f:{},_in:{}};for(const k of ['select','order','not','limit'])q[k]=()=>q;q.eq=(k,v)=>{q._f[k]=v;return q};q.in=(k,v)=>{q._in[k]=v;return q};
 q.update=r=>{q._w={t:'u',r};return q};q.insert=r=>{q._w={t:'i',r};return q};
 q.maybeSingle=q.single=async()=>res(true);q.then=(a,b)=>Promise.resolve(res(false)).then(a,b);
 function res(single){
  if(table==='pramuka_assessments'){
   if(q._w){writes++;const r=q._w.r;const i=rows.findIndex(x=>x.student_id===r.student_id);if(q._w.t==='u'){if(i<0||rows[i].version!==q._f.version)return{error:null,data:null};rows[i]={...rows[i],...r}}else rows.push({...r});return{error:null,data:{student_id:r.student_id}}}
   let d=rows;if(q._in.student_id)d=d.filter(x=>q._in.student_id.includes(x.student_id));return{error:null,data:d}}
  if(table==='user_roles')return{error:null,data:roles.filter(r=>(q._in.role_code||[]).includes(r)).map(r=>({role_code:r}))};
  let d=data(table);
  if(table==='classes'){d=q._f.id?d.filter(c=>c.id===q._f.id):d}
  if(table==='student_enrollments'&&q._f.class_id)d=d.filter(e=>e.class_id===q._f.class_id);
  if(single&&Array.isArray(d))d=d[0]||null;return{error:null,data:d}}
 return q}};
const src=fs.readFileSync('supabase/functions/admin-academic-period/pramuka.ts','utf8').replace(/^import .*;$/gm,'').replace(/export (async )?function/g,'$1function').replace(/export const/g,'const');
const ctx={createClient:()=>sb,Deno:{env:{get:()=>'mock'}},Response,Request,TextEncoder,crypto:require('node:crypto').webcrypto,console:{error(){},log(){}}};vm.createContext(ctx);vm.runInContext(stripTypeScriptTypes(src),ctx);
const call=async(b,token=true)=>{const r=await ctx.handlePramuka(new Request('https://x.invalid/pramuka',{method:'POST',headers:token?{'x-session-token':'t'}:{},body:JSON.stringify(b)}));return{status:r.status,body:await r.json()}};
(async()=>{
 assert.equal((await call({},false)).status,401);
 assert.equal((await call({})).status,403,'plain guru/walas without the add-on role is refused');
 roles=['pembina_pramuka'];
 let x=await call({});assert.equal(x.status,200);assert.deepEqual(x.body.classes.map(c=>[c.name,c.total,c.done]),[['4A',3,0],['5A',1,0]]);
 x=await call({action:'load',class_id:'c4'});assert.deepEqual(x.body.students.map(s=>s.name),['Ani','Budi'],'students who left are hidden, sorted by name');
 assert.equal((await call({action:'load',class_id:'nope'})).status,404);
 const body={action:'save',class_id:'c4',academic_year_id:'year',semester_no:1,entries:[{student_id:'s1',version:0,grade:'a'},{student_id:'s2',version:0,grade:''}]};
 assert.equal((await call({...body,semester_no:2})).status,409,'stale period');
 assert.equal((await call({...body,entries:[{student_id:'s1',version:0,grade:'E'}]})).status,400,'grade E rejected');
 assert.equal((await call({...body,entries:[{student_id:'s9',version:0,grade:'A'}]})).status,400,'student from another class rejected');
 assert.equal((await call({...body,entries:[{student_id:'s3',version:0,grade:'A'}]})).status,400,'student who left rejected');
 assert.equal(writes,0);
 x=await call(body);assert.equal(x.status,200);assert.equal(x.body.saved,2);assert.equal(rows.find(r=>r.student_id==='s1').grade,'A','upper-cased');assert.equal(rows.find(r=>r.student_id==='s2').grade,null,'empty = not graded');
 assert.equal((await call(body)).status,409,'second pembina with an old version is refused');
 x=await call({...body,entries:[{student_id:'s1',version:1,grade:'B'}]});assert.equal(x.status,200);assert.equal(rows.find(r=>r.student_id==='s1').version,2);
 roles=[];username='admin';assert.equal((await call({})).status,200,'admin account may open it');
 console.log('PASS pramuka route: add-on role access, roster, validation, versioning.');
 // auth-user: add-on role never becomes the primary login role.
 const a=fs.readFileSync('supabase/functions/auth-user/index.ts','utf8');const fn=a.replace(/\r\n/g,'\n').match(/function rolePriority[\s\S]*?\n}\nfunction choosePrimaryRole[\s\S]*?\n}/)[0];
 const actx={};vm.createContext(actx);vm.runInContext(stripTypeScriptTypes(fn),actx);
 assert.equal(actx.choosePrimaryRole(['pembina_pramuka','walas','guru']),'walas');assert.equal(actx.choosePrimaryRole(['pembina_pramuka','guru']),'guru');
 assert.equal(actx.choosePrimaryRole(['sapras','guru']),'sapras','other custom roles unchanged');
 console.log('PASS auth-user: Pembina Pramuka stays an add-on (Walas/Guru remain primary).');
})().catch(e=>{console.error(e);process.exitCode=1});
