// Rekapan Nilai & Ranking: auth + role scoping (mocked Supabase). No production requests.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),{stripTypeScriptTypes}=require('node:module');

let roles=[],homeroom=[],revoked=false,expired=false,status='active',username='guru1',teacherId='t',rpcCalls=0;
const report={success:true,academic_year:'2026/2027',semester_no:1,classes:[{id:'c4a',name:'4A',grade_level:4},{id:'c4b',name:'4B',grade_level:4}],
 rows:[{student_id:'s1',student_name:'Budi',class_id:'c4a',grade_level:4,total:180,grade_rank:1,class_rank:1},{student_id:'s2',student_name:'Ani',class_id:'c4b',grade_level:4,total:170,grade_rank:2,class_rank:1}]};
const seen=[];
function tableData(table){return({
 user_sessions:{user_account_id:'u',expires_at:expired?'2000-01-01':'2099-01-01',revoked_at:revoked?'2026-01-01':null},
 user_accounts:{id:'u',teacher_id:teacherId,username,status},
 user_roles:roles.map(r=>({role_code:r,is_active:true})),
 academic_years:{id:'year'},
 semesters:{semester_no:1},
 report_class_assignments:homeroom.map(c=>({class_id:c}))
})[table]}
const sb={
 rpc(name){rpcCalls++;assert.equal(name,'academic_ranking_report_final');return Promise.resolve({error:null,data:structuredClone(report)})},
 from(table){const q={};for(const k of ['select','in','order','limit','is'])q[k]=()=>q;q.eq=(c,v)=>{seen.push([table,c,v]);return q};
  const result=single=>{let d=tableData(table);if(single&&Array.isArray(d))d=d[0]||null;return{error:null,data:d}};
  q.maybeSingle=q.single=async()=>result(true);q.then=(a,b)=>Promise.resolve(result(false)).then(a,b);return q}};
const source=fs.readFileSync('supabase/functions/academic-ranking-report/index.ts','utf8').replace(/^import .*;$/gm,'').replace(/export (async )?function/g,'$1function');
const ctx={createClient:()=>sb,Deno:{env:{get:()=>'mock'},serve(){}},Response,Request,URL,TextEncoder,structuredClone,crypto:require('node:crypto').webcrypto,console:{error(){},log:console.log}};
vm.createContext(ctx);vm.runInContext(stripTypeScriptTypes(source),ctx);
const call=(token=true,method='POST')=>ctx.handleRankingReport(new Request('https://test.invalid/academic-ranking-report',{method,headers:token?{'x-session-token':'test'}:{},body:method==='POST'?'{"action":"list"}':undefined}));
const reset=()=>{roles=[];homeroom=[];revoked=false;expired=false;status='active';username='guru1';teacherId='t'};

(async()=>{
 // Tanpa sesi / sesi tidak valid: 401 dan RPC tidak dipanggil.
 assert.equal((await call(false)).status,401,'no token');
 revoked=true;assert.equal((await call()).status,401,'revoked');reset();
 expired=true;assert.equal((await call()).status,401,'expired');reset();
 status='nonaktif';assert.equal((await call()).status,401,'inactive account');reset();
 assert.equal(rpcCalls,0,'RPC never reached without a valid session');
 assert.equal((await call(true,'GET')).status,405);

 // Peran lain (guru/partner/tahfizh/kesiswaan) tanpa perwalian: 403.
 for(const r of [[],['kabid_kesiswaan'],['kabid_quran'],['hrd'],['yayasan'],['pengabdian']]){roles=r;const res=await call();assert.equal(res.status,403,'denied: '+r.join(','));}
 assert.equal(rpcCalls,0,'RPC never reached for denied roles');reset();

 // Admin / pimpinan / akademik: semua baris.
 for(const r of [['admin'],['pimpinan'],['kabid_akademik'],['akademik']]){roles=r;const d=await (await call()).json();assert.equal(d.rows.length,2,'all rows for '+r);assert.equal(d.classes.length,2);}
 reset();username='admin';teacherId=null;assert.equal((await (await call()).json()).rows.length,2,'username admin counts as admin');reset();

 // Walas: hanya kelas perwalian semester aktif.
 homeroom=['c4a'];seen.length=0;
 const res=await call();assert.equal(res.status,200);const d=await res.json();
 assert.deepEqual(d.rows.map(x=>x.student_id),['s1']);assert.deepEqual(d.classes.map(x=>x.id),['c4a']);assert.equal(d.scope,'homeroom');
 assert.equal(d.rows[0].grade_rank,1,'grade rank kept from full cohort');
 assert.ok(seen.some(([t,c,v])=>t==='report_class_assignments'&&c==='homeroom_teacher_id'&&v==='t'),'homeroom looked up by teacher_id');
 assert.ok(seen.some(([t,c,v])=>t==='report_class_assignments'&&c==='academic_year_id'&&v==='year'),'homeroom scoped to active year');
 assert.ok(seen.some(([t,c,v])=>t==='report_class_assignments'&&c==='semester_no'&&v===1),'homeroom scoped to active semester');
 assert.equal(res.headers.get('cache-control'),'no-store');
 reset();teacherId=null;homeroom=['c4a'];assert.equal((await call()).status,403,'account without teacher_id cannot be walas');reset();

 console.log('academic-ranking-report tests passed');
})().catch(e=>{console.error(e);process.exit(1)});
