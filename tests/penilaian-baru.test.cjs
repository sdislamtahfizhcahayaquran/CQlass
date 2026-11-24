// Sistem penilaian baru + perubahan tampilan Rapor Akhir Semester (2026-11-24). Tanpa request ke produksi.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),{stripTypeScriptTypes}=require('node:module');
const plain=v=>JSON.parse(JSON.stringify(v));

// 1) Rumus browser (cq-scoring.js) sama persis dengan rumus server (semester-report.ts).
const w={};w.window=w;vm.createContext(w);vm.runInContext(fs.readFileSync('cq-scoring.js','utf8'),w);const S=w.CQ_SCORE;
const src=fs.readFileSync('supabase/functions/admin-academic-period/semester-report.ts','utf8');
const fnSrc=['const avg','const r2','export function rawScore','export function raporScore','export function finalScore'].map(k=>{const i=src.indexOf(k);return src.slice(i,src.indexOf('\n',i))}).join('\n').replace(/export /g,'');
const sv={};vm.createContext(sv);vm.runInContext(stripTypeScriptTypes(fnSrc)+';this.rawScore=rawScore;this.raporScore=raporScore;this.finalScore=finalScore;',sv);
let seed=7;const rnd=()=>(seed=(seed*1103515245+12345)%2147483648)/2147483648;const sc=()=>Math.round(40+rnd()*60);
for(let i=0;i<500;i++){const t=[sc(),sc(),sc(),sc(),sc()],p=Array.from({length:1+Math.floor(rnd()*6)},sc),wwp=sc(),asas=sc();
 assert.equal(S.raw(t,p,wwp,asas),sv.rawScore(t,p,wwp,asas),'raw equal');assert.equal(S.rapor(S.raw(t,p,wwp,asas)),sv.finalScore(t,p,wwp,asas),'rapor equal')}
assert.equal(S.raw([80,80,80,80,80],[90,70],80,90),84,'8+24+16+36');
// Tugas cukup minimal 1 terisi; rata-rata dari tugas yang terisi.
assert.equal(S.raw([80,null,80,80,80],[90],80,90),87,'missing Tugas 2 still counts (avg of filled tasks)');
assert.equal(S.raw([null,null,null,null,70],[90],80,90),86,'one task is enough: 7+27+16+36');
assert.equal(S.raw([null,null,null,null,null],[90],80,90),null,'no task at all -> no score');
assert.equal(S.raw([80,80,80,80,80],[90,null],80,90),null,'every TP still required');
assert.equal(S.tpScore([null,70,null,null,null],90,80,90),86,'per-TP score with one task');
assert.deepEqual([95,85,80,70,40].map(S.tpLetter),['A','B','C','C','C'],'TP letters never below C');
for(const [x,y] of [[84,85],[89,90],[79,80],[70,77],[76.4,77],[93.6,95],[99,96],[100,96],[96,96],[88,88],[82.5,83]])assert.equal(S.rapor(x),y,`rapor(${x})`);
assert.deepEqual([89,88,82,81,75,74,96].map(S.letter),['A','B','B','C','C','D','A']);
assert.equal(S.tpScore([80,80,80,80,80],90,80,90),87);assert.equal(S.tpScore([80,80,80,80,80],90,null,90),null,'per-TP stays empty until WWP/ASAS filled');
for(let i=0;i<200;i++){const t=[sc(),null,sc(),null,sc()].map(v=>rnd()<.3?null:v),p=[sc(),sc()];assert.equal(S.raw(t,p,70,80),sv.rawScore(t,p,70,80),'raw equal with gaps')}
console.log('PASS scoring: browser = server formula (700 random cases incl. empty tasks), rapor rules 77..96 + no 4/9, letters, per-TP score, min 1 Tugas, TP letter >= C.');

// 2) Tampilan rapor.
const store=new Map();const pw={document:{getElementById:id=>store.get(id)||null,createElement:()=>({}),head:{appendChild:el=>{if(el.id)store.set(el.id,el)}}}};pw.window=pw;
const pctx=vm.createContext({...pw,Intl,Date,Number,String,Math,Array,Object,Map,Set,Error,RegExp,JSON});vm.runInContext(fs.readFileSync('semester-report-print.js','utf8'),pctx);
const I=pw.__cqSemesterInternals;
const T5=[90,90,90,90,90];
const subj=(id,name,o,n)=>({id,name,sort_order:o,objectives:Array.from({length:n},(_,i)=>({id:id+'o'+i,description:name+' TP'+(i+1)}))});
const subjects=[subj('m','Matematika',2,2),subj('a','Akidah',1,1),subj('pk','PKN',3,0),subj('pc','Pancasila',4,1),subj('ar','Bahasa Arab',9,1)];
const academic={m:{final:90,raw:90.2,tasks:T5,tp:[95,85],wwp:90,asas:90},a:{final:90,tasks:T5,tp:[90],wwp:90,asas:90},pc:{final:85,tasks:T5,tp:[80],wwp:85,asas:85},ar:{final:null,tasks:T5,tp:[88],wwp:null,asas:90}};
const report={student:{id:'s',name:'Ani'},class:{name:'4A'},semester_no:1,academic_year:'2026/2027',teachers:{homeroom:'Bu Walas',principal:'Pak Kepsek'},attendance:{},
 academic:[{name:'Mathematics',kktp:'70 - 72'}],semester_print:{subjects,class:{grade_level:4},student:{academic,entry:{data:{sikap:{},psikomotor:{}}},ekskul:[]}}};
const html=pw.cqSemesterPagesHtml(report,{lang:'id'});
const page=t=>html.split("<section").filter(s=>!s.includes(`data-part="ikm"`)&&s.includes(`<div class="srp-title">${t}</div>`)).join("<section");
// Sikap: B dihapus, istinja & gosok gigi dihapus, huruf A-E.
const sk=page('PENILAIAN SIKAP');assert(!sk.includes('Sikap kepada Orang Tua')&&!sk.includes('istinja')&&!sk.includes('gosok gigi'));
assert.deepEqual([...sk.matchAll(/<th class="code">([A-Z])<\/th>/g)].map(m=>m[1]),['A','B','C','D','E'],'sikap sections A-E');
assert(sk.includes('<th class="code">B</th><th class="title">KEDISIPLINAN DAN INTERAKSI SAAT KBM</th>'),'Kedisiplinan is now B');
// Kokurikuler: PjBL, tanpa Bintang prestasi.
const ko=page('PENILAIAN KOKURIKULER');assert(ko.includes('PjBL')&&!ko.includes('PBL)')&&!ko.includes('Bintang prestasi'));
// Intrakurikuler: Diniyah dulu (Akidah, Arab), lalu Umum, nomor bersambung; huruf per TP dari rumus per TP; PKN kosong tidak tampil.
const intra=page('PENILAIAN INTRAKURIKULER');const order=[...intra.matchAll(/<th class="code">(\d+)<\/th><th class="title">([^<]+)<\/th>/g)].map(m=>m[1]+' '+m[2]);
assert.deepEqual(order,['01 AKIDAH','02 BAHASA ARAB','03 MATEMATIKA','04 PENDIDIKAN PANCASILA'],'diniyah first, numbering continues, duplicate empty PKN hidden');
assert.equal(I.tpScores(academic.m,2)[0],9+28.5+18+36);assert.equal(I.SC.letter(91.5),'A');
// Nilai: KKTP rentang PTS (dari server PTS bila ada, kalau tidak tabel PTS), Pendidikan Pancasila sekali, tanda tangan Ortu - Kepsek - Walas.
const ni=page('NILAI RAPOR');assert(ni.includes('<td class="c">70 - 72</td><td class="c">90</td>'),'KKTP from PTS report data');
assert(ni.includes('<td class="c">78 - 81</td>'),'Akidah KKTP from PTS table');assert.equal((ni.match(/Pendidikan Pancasila/g)||[]).length,1,'PKN + Pancasila shown once');
const order3=t=>{const i=t.indexOf('class="srp-sign"');const x=t.slice(i);return[x.indexOf('Orang Tua'),x.indexOf('Kepala Sekolah'),x.indexOf('Wali Kelas')]};
const o=order3(ni);assert(o[0]<o[1]&&o[1]<o[2],'Nilai: Orang Tua - Kepala Sekolah - Wali Kelas');
const ik=html.split('<section').filter(s=>s.includes('data-part="ikm"')).join('<section');const oi=order3(ik.slice(ik.lastIndexOf('srp-sign-area')-10));assert(oi[0]<oi[1]&&oi[1]<oi[2],'IKM: Orang Tua - Kepala Sekolah - Wali Kelas');
const km=page('KOMENTAR UMUM');assert(km.includes('Wali Kelas')&&km.includes('Guru Partner')&&!km.includes('Kepala Sekolah'),'Komentar still signed by Guru Partner');
// IKM: Fase, A. Intrakurikuler, Ekstrakurikuler selebar Kokurikuler.
assert.deepEqual([1,2,3,4,5,6].map(I.faseOf),['A','A','B','B','C','C']);assert(ik.includes('A. Intrakurikuler')&&!ik.includes('Kriteria Ketuntasan'));
const eks=ik.slice(ik.indexOf('C. Ekstrakurikuler'));assert(/^C\. Ekstrakurikuler<\/div><table class="srp-t"><colgroup>/.test(eks),'ekskul table is full width like kokurikuler');
console.log('PASS rapor layout: sikap A-E, PjBL, no bintang prestasi, intrakurikuler order, KKTP PTS, PKN once, signatures, Fase, A. Intrakurikuler, ekskul width.');

// 3) Server: kelas 1-3 mendapat baris Pendidikan Pancasila dari Akhlak.
const tables={user_sessions:{user_account_id:'u',expires_at:'2099-01-01',revoked_at:null},user_accounts:{id:'u',teacher_id:'t',username:'admin',status:'active'},user_roles:[],
 academic_years:{id:'y',name:'2026/2027',is_active:true},semesters:{semester_no:1,is_active:true},report_class_assignments:[],student_enrollments:[{student_id:'s1'}],students:[{id:'s1',nis:'1',full_name:'Ani',status:'AKTIF'}],
 subjects:[{id:'ak',code:'AKH',name:'Akhlak',sort_order:3},{id:'mt',code:'MTK',name:'Matematika',sort_order:5}],learning_objectives:[{id:'o1',subject_id:'ak',description:'Adab makan',sort_order:1}],
 academic_scores:[...['TUGAS_1','TUGAS_2','TUGAS_3','TUGAS_4','TUGAS_5'].map(t=>({student_id:'s1',subject_id:'ak',assessment_type:t,score:80})),{student_id:'s1',subject_id:'ak',assessment_type:'TP',learning_objective_id:'o1',score:90},{student_id:'s1',subject_id:'ak',assessment_type:'WWP',score:80},{student_id:'s1',subject_id:'ak',assessment_type:'ASAS',score:90}],
 semester_report_entries:[]};
const sb={from(t){const q={};for(const k of ['select','eq','in','order','match','is','limit','not'])q[k]=()=>q;q.range=()=>q;q.maybeSingle=q.single=async()=>res(true);q.then=(a,b)=>Promise.resolve(res(false)).then(a,b);
 function res(single){if(t==='classes')return{error:null,data:single?{id:'c',name:'1A',grade_level:1}:[{id:'c',name:'1A'}]};let d=tables[t];if(single&&Array.isArray(d))d=d[0]||null;return{error:null,data:d??(single?null:[])}}return q}};
const rs=fs.readFileSync('supabase/functions/admin-academic-period/semester-report.ts','utf8').replace(/^import .*;$/gm,'').replace(/export (async )?function/g,'$1function');
const rctx={createClient:()=>sb,Deno:{env:{get:()=>'mock'}},Response,Request,URL,TextEncoder,crypto:require('node:crypto').webcrypto,console:{error(){},log(){}}};vm.createContext(rctx);vm.runInContext(stripTypeScriptTypes(rs),rctx);
(async()=>{
 const r=await rctx.handleSemesterReport(new Request('https://x.invalid/semester-report',{method:'POST',headers:{'x-session-token':'t'},body:JSON.stringify({action:'print_data',academic_year:'2026/2027',semester_no:1,class_id:'c'})}));const d=await r.json();
 assert.equal(r.status,200,JSON.stringify(d));const pk=d.subjects.find(s=>s.name==='Pendidikan Pancasila');assert(pk&&pk.virtual_from==='ak','grade 1 gets Pendidikan Pancasila from Akhlak');
 const a=d.students[0].academic;assert.equal(a[pk.id].final,a.ak.final);assert.equal(a.ak.raw,87);assert.equal(a.ak.final,87);
 console.log('PASS server: grade 1-3 Pendidikan Pancasila = Akhlak; raw 87 -> rapor 87.');
})().catch(e=>{console.error(e);process.exitCode=1});
