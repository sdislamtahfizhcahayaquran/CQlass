// Rapor Akhir Semester: backend route (mocked Supabase) + print template. No production requests.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),{stripTypeScriptTypes}=require('node:module');

let roles=[],homeroom=true,revoked=false,entries=[],writes=0,yearActive=true;
const scores=[];
for(let i=0;i<1500;i++)scores.push({student_id:'filler',subject_id:'s-mtk',learning_objective_id:null,score:50,assessment_type:'TUGAS_1'});
const add=(st,sub,type,score,lo=null)=>scores.push({student_id:st,subject_id:sub,learning_objective_id:lo,score,assessment_type:type});
for(const t of ['TUGAS_1','TUGAS_2','TUGAS_3','TUGAS_4','TUGAS_5'])add('st1','s-mtk',t,80);
add('st1','s-mtk','TP',90,'o1');add('st1','s-mtk','TP',70,'o2');add('st1','s-mtk','WWP',80);add('st1','s-mtk','ASAS',90);
add('st1','s-arab','TP',85,'o3');
function tableData(table){return({
 user_sessions:{user_account_id:'u',expires_at:'2099-01-01',revoked_at:revoked?'2026-01-01':null},
 user_accounts:{id:'u',teacher_id:'t',username:'guru1',status:'active'},
 user_roles:roles.map(r=>({role_code:r,is_active:true})),
 academic_years:{id:'year',name:'2026/2027',is_active:yearActive},
 semesters:{semester_no:1,is_active:true},
 report_class_assignments:homeroom?[{class_id:'class'}]:[],
 classes:table==='classes'?null:null,
 student_enrollments:[{student_id:'st1'},{student_id:'st2'}],
 students:[{id:'st1',nis:'1',nisn:'11',full_name:'Budi',status:'AKTIF'},{id:'st2',nis:'2',nisn:'22',full_name:'Ani',status:'AKTIF'}],
 subjects:[{id:'s-mtk',code:'MTK',name:'Matematika',sort_order:2},{id:'s-arab',code:'ARB',name:'Bahasa Arab',sort_order:9}],
 learning_objectives:[{id:'o1',subject_id:'s-mtk',description:'Bilangan cacah',sort_order:1,kktp:75},{id:'o2',subject_id:'s-mtk',description:'Pecahan',sort_order:2,kktp:78},{id:'o3',subject_id:'s-arab',description:'Mufradat',sort_order:1,kktp:null}],
 academic_scores:scores,
 semester_report_entries:entries
})[table]}
const sb={from(table){const q={_table:table,_single:false};for(const k of ['select','eq','in','order','match','is','limit'])q[k]=()=>q;q.range=(a,b)=>{q._range=[a,b];return q};
 q.update=r=>{q._write={type:'update',r};return q};q.insert=r=>{q._write={type:'insert',r};return q};
 q.maybeSingle=q.single=async()=>result(true);q.then=(a,b)=>Promise.resolve(result(false)).then(a,b);
 function result(single){if(q._write){writes++;const r=q._write.r;const i=entries.findIndex(e=>e.student_id===r.student_id);if(i>=0)entries[i]={...entries[i],...r};else entries.push({...r});return{error:null,data:{student_id:r.student_id}}}
  if(table==='classes')return{error:null,data:single?{id:'class',name:'4A',grade_level:4}:[{id:'class',name:'4A'}]};
  let d=tableData(table);if(Array.isArray(d)&&q._range)d=d.slice(q._range[0],q._range[1]+1);if(single&&Array.isArray(d))d=d[0]||null;return{error:null,data:d}}
 return q}};
const source=fs.readFileSync('supabase/functions/admin-academic-period/semester-report.ts','utf8').replace(/^import .*;$/gm,'').replace(/export (async )?function/g,'$1function');
const ctx={createClient:()=>sb,Deno:{env:{get:()=> 'mock'}},Response,Request,URL,TextEncoder,crypto:require('node:crypto').webcrypto,console:{error(){},log:console.log}};vm.createContext(ctx);vm.runInContext(stripTypeScriptTypes(source),ctx);
const call=(b,token=true)=>ctx.handleSemesterReport(new Request('https://test.invalid/semester-report',{method:'POST',headers:token?{'x-session-token':'test'}:{},body:JSON.stringify(b)}));

(async()=>{
 // Akses
 assert.equal((await call({},false)).status,401);
 revoked=true;assert.equal((await call({})).status,401);revoked=false;
 homeroom=false;assert.equal((await call({})).status,403);
 assert.equal((await call({action:'print_data',academic_year:'2026/2027',semester_no:1,class_id:'class'})).status,403,'non-walas without read-all role');
 roles=['akademik'];assert.equal((await call({action:'print_data',academic_year:'2026/2027',semester_no:1,class_id:'class'})).status,200,'kabid akademik may print');roles=[];homeroom=true;
 assert.equal((await call({action:'load',class_id:'other'})).status,403);
 const boot=await (await call({})).json();assert.equal(boot.academic_year_id,'year');

 // Validasi & simpan
 const body={action:'save',class_id:'class',academic_year_id:'year',semester_no:1,entries:[{student_id:'st1',version:0,data:{kepribadian:{sikap:'A'},sikap:{tauhid_1:'b'},psikomotor:{intra_3:'C'},komentar:'Ananda rajin.'}}]};
 assert.equal((await call({...body,academic_year_id:'old'})).status,409);
 assert.equal((await call({...body,entries:[{...body.entries[0],data:{sikap:{tauhid_1:'E'}}}]})).status,400,'grade E rejected');
 assert.equal((await call({...body,entries:[{...body.entries[0],data:{sikap:{'Bad Key':'A'}}}]})).status,400,'bad key rejected');
 assert.equal((await call({...body,entries:[{...body.entries[0],student_id:'outsider'}]})).status,400,'foreign student rejected');
 assert.equal((await call({...body,entries:[body.entries[0],body.entries[0]]})).status,400,'duplicate student rejected');
 assert.equal((await call({...body,entries:[{...body.entries[0],data:{komentar:'x'.repeat(1501)}}]})).status,400,'long comment rejected');
 assert.equal(writes,0);
 const saved=await call(body);assert.equal(saved.status,200);assert.equal(writes,1);
 assert.equal(entries[0].data.sikap.tauhid_1,'B','grades are normalised to upper case');assert.equal(entries[0].version,1);
 assert.equal((await call(body)).status,409,'stale version rejected');assert.equal(writes,1);
 assert.equal((await call({...body,entries:[{...body.entries[0],version:1}]})).status,200);assert.equal(entries[0].version,2);

 // Data cetak: nilai akhir mengikuti rumus legger, TP dibaca lebih dari 1000 baris.
 const pd=await (await call({action:'print_data',academic_year:'2026/2027',semester_no:1,class_id:'class'})).json();
 assert.equal(pd.success,true);const mtk=pd.subjects.find(s=>s.id==='s-mtk');assert.equal(mtk.kktp_min,75);assert.equal(mtk.kktp_max,78);
 const budi=pd.students.find(s=>s.id==='st1');
 assert.equal(budi.academic['s-mtk'].final,Math.round(80*.1+80*.3+80*.1+90*.5));assert.deepEqual(budi.academic['s-mtk'].tp,[90,70]);
 assert.equal(budi.academic['s-arab'].final,null,'incomplete subject has no final score');assert.equal(budi.entry.data.komentar,'Ananda rajin.');
 assert.equal(pd.students.find(s=>s.id==='st2').entry,null);
 console.log('PASS semester-report route: auth, walas scope, read-all print, period, grade/key/student/comment validation, versioning, legger final score, paged scores.');

 // Template cetak (tanpa browser).
 const store=new Map();
 const win={document:{getElementById:id=>store.get(id)||null,createElement:()=>({}),head:{appendChild:el=>{if(el.id)store.set(el.id,el)}}}};win.window=win;
 const pctx=vm.createContext({...win,Intl,Date,Number,String,Math,Array,Object,Map,Set,Error,RegExp,JSON});vm.runInContext(fs.readFileSync('semester-report-print.js','utf8'),pctx);
 const I=win.__cqSemesterInternals;
 assert.equal(I.terbilang(87,'id'),'Delapan puluh tujuh');assert.equal(I.terbilang(11,'id'),'Sebelas');assert.equal(I.terbilang(100,'id'),'Seratus');assert.equal(I.terbilang(87,'en'),'Eighty-seven');assert.equal(I.terbilang(null,'id'),'-');
 assert.equal(I.tpGrade(89),'A');assert.equal(I.tpGrade(82),'B');assert.equal(I.tpGrade(75),'C');assert.equal(I.tpGrade(74),'D');assert.equal(I.tpGrade(null),'');
 assert.equal(I.classify({name:'Ilmu Pengetahuan Alam dan Sosial'}).key,'ipas');assert.equal(I.classify({name:'Ilmu Pengetahuan Alam'}).key,'ipa');assert.equal(I.classify({name:'Bahasa Inggris'}).key,'inggris');assert.equal(I.classify({name:'Bahasa Indonesia'}).key,'indo');assert.equal(I.classify({name:'Akidah'}).kind,'diniyah');
 const report={student:{id:'st1',name:'Budi',nis:'1',nisn:'11'},class:{name:'4A'},semester_no:1,academic_year:'2026/2027',report_type:'SEMESTER',teachers:{homeroom:'Bu Walas',principal:'Pak Kepsek'},attendance:{sick:2,excused:1,unexcused:0}};
 report.semester_print={subjects:pd.subjects,student:budi};
 const id=win.cqSemesterPagesHtml(report,{lang:'id',printDate:'2026-12-19',hijri:'28 Jumadil Akhir 1448'});
 for(const s of ['NILAI RAPOR','Matematika','Sembilan puluh dua'.slice(0,0)+I.terbilang(budi.academic['s-mtk'].final,'id'),'Muatan Lokal','PENILAIAN KOGNITIF UMUM','PENILAIAN KOGNITIF DINIYAH','Bilangan cacah','Mufradat','PENILAIAN SIKAP','PENILAIAN PSIKOMOTORIK','Pekan bahasa','KOMENTAR UMUM','Ananda rajin.','Depok, 28 Jumadil Akhir 1448 H','19 Desember 2026 M','Bu Walas','Pak Kepsek','Nilai belum lengkap'])assert(id.includes(s),'ID page contains '+s);
 const pages=(id.match(/class="rpv-paper srp-page"/g)||[]).length;assert(pages>=6,'expected at least 6 A4 pages, got '+pages);
 const nums=[...id.matchAll(/data-page-no="(\d+)"/g)].map(m=>Number(m[1]));const titles=[...id.matchAll(/<div class="srp-title">([^<]+)<\/div>/g)].map(m=>m[1]);
 assert.equal(titles[0],'KOMENTAR UMUM');assert.equal(titles[1],'PENILAIAN SIKAP');assert.equal(titles[titles.length-1],'NILAI RAPOR','Nilai is the last page before IKM');
 assert.deepEqual(nums.slice(0,3),[1,2,3],'Komentar 1, Sikap/Adab 2-3');assert.equal(nums[3],7,'Kognitif starts at page 7 (Tahfizh 4-6 printed separately)');assert.equal(titles[3],'PENILAIAN KOGNITIF UMUM');
 const many={...report,semester_print:{subjects:Array.from({length:24},(_,i)=>({id:'m'+i,name:'Mapel '+i,sort_order:i,kktp_min:75,kktp_max:75,objectives:[]})),student:{academic:{},entry:null}}};
 const mt=[...win.cqSemesterPagesHtml(many,{lang:'id'}).matchAll(/<div class="srp-title">([^<]+)<\/div>/g)].map(m=>m[1]);
 assert.deepEqual(mt.slice(-2),['NILAI RAPOR','NILAI RAPOR'],'long subject list splits Nilai into 2 pages, both with header');
 assert.equal(titles.filter(t=>t==='NILAI RAPOR').length,1,'short subject list keeps Nilai on 1 page');
 assert(id.includes('Halaman 7 | Budi'),'footer shows page number and student name');assert(id.includes('Halaman 7')&&id.includes('rapor-semester-logo.png')&&id.includes('rapor-semester-footer.jpg'),'page number, logo and footer present');
 assert.equal((id.match(/srp-box on/g)||[]).length,2+1+1+1,'checked boxes: 2 MTK TP + 1 Arab TP + 1 sikap + 1 psikomotor');
 const en=win.cqSemesterPagesHtml(report,{lang:'en',printDate:'2026-12-19',hijri:''});
 for(const s of ['SEMESTER REPORT CARD','Mathematics','Arabic Language','Local Content Subjects','Language Week','GENERAL COMMENTS','Homeroom Teacher','Principal','19 December 2026 CE','Incomplete scores'])assert(en.includes(s),'EN page contains '+s);
 assert(!en.includes('Matematika'),'EN uses English subject names');
 assert(!win.cqSemesterPagesHtml({...report,student:{...report.student,name:'<script>x</script>'}},{lang:'id'}).includes('<script>x'),'names are escaped');
 console.log('PASS semester-report print: terbilang ID/EN, TP grade bands, subject grouping, all pages in both languages, page numbers, escaping.');
})().catch(e=>{console.error(e);process.exitCode=1});
