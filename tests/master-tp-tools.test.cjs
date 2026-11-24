// Alat Master TP: tempel TP (Excel/Word), mapel per kelas, KKM. Mocked Supabase; no production requests.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),{stripTypeScriptTypes}=require('node:module');
const plain=v=>JSON.parse(JSON.stringify(v));

// 1) Paste parser (browser module, no DOM needed for this function).
const win={};win.window=win;vm.createContext(win);vm.runInContext(fs.readFileSync('master-upload-tools.js','utf8'),win);
const parse=win.__cqMasterUploadInternals.parsePaste;
let r=parse('Memahami rukun Islam\nMenyebutkan rukun iman\n\n  Membiasakan adab makan  ',4);
assert.deepEqual(plain(r.map(x=>[x.order,x.desc])),[[4,'Memahami rukun Islam'],[5,'Menyebutkan rukun iman'],[6,'Membiasakan adab makan']],'plain lines numbered from the start value, blank lines skipped');
r=parse('TP1. Membaca bilangan\n2) Menulis bilangan\nTP 5 Pecahan senilai\n• Desimal',1);
assert.deepEqual(plain(r.map(x=>[x.order,x.desc])),[[1,'Membaca bilangan'],[2,'Menulis bilangan'],[5,'Pecahan senilai'],[6,'Desimal']],'numbers from Word lists are used; bullets stripped; numbering continues');
r=parse('TP3\tBilangan\tMembandingkan bilangan cacah\nTP4\tPecahan\tMengurutkan pecahan',1);
assert.deepEqual(plain(r.map(x=>[x.order,x.topic,x.desc])),[[3,'Bilangan','Membandingkan bilangan cacah'],[4,'Pecahan','Mengurutkan pecahan']],'Excel columns: urutan | topik | TP');
r=parse('Topik A\tTP tanpa nomor',7);assert.deepEqual(plain(r.map(x=>[x.order,x.topic,x.desc])),[[7,'Topik A','TP tanpa nomor']],'two Excel columns without number = topik | TP');
console.log('PASS paste parser: plain lines, Word numbering and bullets, Excel columns.');

// 2) Server: add subject to more grades, switch subject off, KKM.
let subjects=[{id:'s1',name:'Coding',code:'COD-4',grade_level:4,is_active:true,subject_group:'Umum',sort_order:40},{id:'s2',name:'Coding',code:'COD-5',grade_level:5,is_active:false,subject_group:'Umum',sort_order:40},{id:'s3',name:'Matematika',code:'MTK-1',grade_level:1,is_active:true,subject_group:'Umum',sort_order:2}];
let scoreCount=0,tpCount=0,taCount=0,settings=null;const inserted=[],updates=[];
const sb={from(table){const q={_t:table,_f:{}};for(const k of ['select','in','order','gte','lte','limit','is','neq'])q[k]=()=>q;q.eq=(k,v)=>{q._f[k]=v;return q};q.range=()=>q;
 q.insert=rows=>{q._ins=rows;return q};q.update=p=>{q._upd=p;return q};q.upsert=p=>{q._ups=p;return q};
 q.maybeSingle=q.single=async()=>res(true);q.then=(a,b)=>Promise.resolve(res(false)).then(a,b);
 function res(single){
  if(q._ins){const rows=q._ins.map((x,i)=>({...x,id:'n'+(inserted.length+i)}));inserted.push(...rows);subjects.push(...rows);return{error:null,data:single?rows[0]:rows}}
  if(q._upd){updates.push({t:table,id:q._f.id,p:q._upd});const s=subjects.find(x=>x.id===q._f.id);if(s&&table==='subjects')Object.assign(s,q._upd);return{error:null,data:null}}
  if(q._ups){settings=q._ups;return{error:null,data:null}}
  if(table==='user_sessions')return{error:null,data:{user_account_id:'u',expires_at:'2099-01-01',revoked_at:null}};
  if(table==='user_accounts')return{error:null,data:{id:'u',teacher_id:'t',username:'kabid',status:'active'}};
  if(table==='user_roles')return{error:null,data:[{role_code:'kabid_akademik'}]};
  if(table==='school_units')return{error:null,data:{id:'unit'}};
  if(table==='academic_years')return{error:null,data:{id:'year',name:'2026/2027'}};
  if(table==='semesters')return{error:null,data:{semester_no:1}};
  if(table==='subjects'){const d=q._f.id?subjects.filter(x=>x.id===q._f.id):subjects;return{error:null,data:single?(d[0]||null):d}}
  if(table==='academic_scores')return{error:null,count:scoreCount,data:null};
  if(table==='learning_objectives')return{error:null,count:tpCount,data:[]};
  if(table==='teacher_subject_assignments')return{error:null,count:taCount,data:null};
  if(table==='academic_year_settings')return{error:null,data:settings};
  return{error:null,data:[]}}
 return q}};
const src=fs.readFileSync('supabase/functions/academic-master-tp/index.ts','utf8').replace(/^import .*;$/gm,'').replace(/Deno\.serve\(/,'globalThis.__handler=(');
const ctx={createClient:()=>sb,Deno:{env:{get:()=>'mock'}},Response,Request,TextEncoder,crypto:require('node:crypto').webcrypto,console:{error(){},log(){}},globalThis:null};ctx.globalThis=ctx;vm.createContext(ctx);vm.runInContext(stripTypeScriptTypes(src),ctx);
const call=async b=>{const r=await ctx.__handler(new Request('https://x.invalid',{method:'POST',headers:{'x-session-token':'t'},body:JSON.stringify(b)}));return{status:r.status,body:await r.json()}};

(async()=>{
 let x=await call({action:'add_subject',name:'Coding',grades:[4,5,6]});
 assert.equal(x.status,200);assert.deepEqual(plain(x.body.skipped),[4]);assert.deepEqual(plain(x.body.reactivated),[5]);assert.deepEqual(plain(x.body.created),[6]);
 assert.equal(inserted[0].code,'COD-6','code prefix reused from the existing subject');assert.equal(subjects.find(s=>s.id==='s2').is_active,true,'switched-off grade re-activated');
 x=await call({action:'add_subject',name:'Robotika Dasar',grades:[3]});assert.equal(x.status,200);assert.match(inserted[1].code,/^[A-Z0-9]{2,8}-3$/,'new subject gets a generated code');
 x=await call({action:'add_subject',name:'',grades:[3]});assert.equal(x.status,400);
 scoreCount=12;x=await call({action:'subject_set_active',subject_id:'s3',active:false});assert.equal(x.status,409);assert.match(x.body.error,/12 nilai/,'subject with scores cannot be switched off');
 scoreCount=0;tpCount=3;x=await call({action:'subject_set_active',subject_id:'s3',active:false});assert.equal(x.status,409);assert.equal(x.body.warning_code,'subject_in_use','TPs present: confirmation needed');
 x=await call({action:'subject_set_active',subject_id:'s3',active:false,force:true});assert.equal(x.status,200);assert.equal(subjects.find(s=>s.id==='s3').is_active,false);
 x=await call({action:'kkm_get'});assert.equal(x.body.kkm,70);assert.equal(x.body.configured,false,'default KKM is 70');
 assert.equal((await call({action:'kkm_save',kkm:101})).status,400);assert.equal((await call({action:'kkm_save',kkm:7.5})).status,400);
 x=await call({action:'kkm_save',kkm:75});assert.equal(x.status,200);assert.equal(settings.kkm,75);x=await call({action:'kkm_get'});assert.equal(x.body.kkm,75);
 console.log('PASS master TP server: add subject to grades (skip/reactivate/create), subject switch-off guards, KKM get/save.');
 // Rubrik kokurikuler: simpan per semester & kelas, validasi isi.
 const rub=d=>({id:'Proyek X',tujuan:'T',dims:[{id:'Kolaborasi',kuat:'bekerja sama',latih:'berbagi tugas',indicators:[{indikator:'I1',l4:'a',l3:'b',l2:'c',l1:'d'}]},{id:'Kreativitas',kuat:'membuat ide',latih:'mengembangkan ide'}],...d});
 assert.equal((await call({action:'koku_save',semester_no:3,items:[{grade_level:1,data:rub()}]})).status,400,'semester must be 1 or 2');
 assert.equal((await call({action:'koku_save',semester_no:1,items:[{grade_level:7,data:rub()}]})).status,400,'grade must be 1-6');
 assert.equal((await call({action:'koku_save',semester_no:1,items:[{grade_level:1,data:rub({dims:[{id:'A',kuat:'x',latih:'y'}]})}]})).status,400,'exactly 2 dimensions');
 x=await call({action:'koku_save',semester_no:1,items:[{grade_level:1,data:rub({dims:[{id:'Kolaborasi',kuat:'',latih:'y'},{id:'B',kuat:'x',latih:'y'}]})}]});assert.equal(x.status,400);assert.match(x.body.error,/dimensi A/);
 x=await call({action:'koku_save',semester_no:2,file_name:'r.xlsx',items:[{grade_level:2,data:rub()},{grade_level:5,data:rub()}]});assert.equal(x.status,200);assert.deepEqual(plain(x.body.saved),[2,5]);
 assert.equal(settings.length,2);assert.equal(settings[0].semester_no,2);assert.equal(settings[0].data.dims[0].indicators[0].l4,'a');assert.equal(settings[0].source_file,'r.xlsx');
 console.log('PASS kokurikuler rubric save: per semester/grade, validation.');

 // 3) KKM appears in Rapor IKM and as KKTP fallback in Nilai.
 const store=new Map();const w={document:{getElementById:id=>store.get(id)||null,createElement:()=>({}),head:{appendChild:el=>{if(el.id)store.set(el.id,el)}}}};w.window=w;
 const pctx=vm.createContext({...w,Intl,Date,Number,String,Math,Array,Object,Map,Set,Error,RegExp,JSON});vm.runInContext(fs.readFileSync('semester-report-print.js','utf8'),pctx);
 const rep={student:{id:'a',name:'Ani'},class:{name:'4A'},semester_no:1,academic_year:'2026/2027',teachers:{},attendance:{},semester_print:{kkm:75,subjects:[{id:'m',name:'Matematika',kktp_min:null,kktp_max:null,objectives:[{id:'o',description:'Bilangan'}]}],student:{academic:{m:{final:80,tp:[80]}},entry:null}}};
 // 2026-11-24: IKM bagian A berjudul "A. Intrakurikuler" (tanpa angka KKM); kolom KKTP Nilai memakai rentang KKTP rapor PTS.
 const h=w.cqSemesterPagesHtml(rep,{lang:'id'});assert(h.includes('A. Intrakurikuler')&&!h.includes('Kriteria Ketuntasan Minimal'),'IKM section A title');assert(h.includes('<td class="c">76 - 79</td><td class="c">80</td>'),'Nilai KKTP = PTS range for Matematika');
 console.log('PASS KKTP in print: IKM section A title, Nilai KKTP = PTS range.');
 // Rubrik upload menggantikan rubrik bawaan; tanpa frasa English, rapor English memakai kalimat Indonesia.
 const KC=w.CQ_SEMESTER_CATALOG.kokuComment,up={id:'Proyek Baru',dims:[{id:'Kolaborasi',kuat:'bekerja sama',latih:'berbagi tugas'},{id:'Kreativitas',kuat:'membuat ide',latih:'mengembangkan ide'}]};
 assert.equal(KC('Ani',1,{a:4,b:1},'id',up),'Ananda Ani sangat baik dalam kolaborasi dengan mampu bekerja sama, dan masih perlu berlatih dalam mengembangkan ide.');
 assert.equal(KC('Ani',1,{a:4,b:1},'en',up),KC('Ani',1,{a:4,b:1},'id',up),'English report falls back to Indonesian phrases');
 const rp={...rep,semester_print:{...rep.semester_print,kokurikuler_rubric:up,student:{academic:{},entry:{data:{kokurikuler:{a:4,b:1}}}}}};assert(w.cqSemesterPagesHtml(rp,{lang:'id'}).includes('Proyek Baru'),'IKM uses uploaded rubric');
 console.log('PASS uploaded rubric overrides built-in; EN falls back to ID.');
})().catch(e=>{console.error(e);process.exitCode=1});
