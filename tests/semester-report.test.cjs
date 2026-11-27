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
 semester_report_entries:entries,
 pramuka_assessments:[{student_id:'st1',grade:'B'},{student_id:'st2',grade:null}]
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
 // Rapor IKM: kesehatan, prestasi, keputusan.
 const ikmData=d=>({...body,entries:[{...body.entries[0],version:2,data:{...body.entries[0].data,...d}}]});
 assert.equal((await call(ikmData({kesehatan:{tb:'999'}}))).status,400,'height out of range rejected');
 assert.equal((await call(ikmData({kesehatan:{bb:'abc'}}))).status,400,'non-numeric weight rejected');
 assert.equal((await call(ikmData({prestasi:[{jenis:'a'},{jenis:'b'},{jenis:'c'},{jenis:'d'}]}))).status,400,'more than 3 achievements rejected');
 assert.equal((await call(ikmData({keputusan:'lompat'}))).status,400,'unknown decision rejected');
 assert.equal((await call(ikmData({kokurikuler:{a:5}}))).status,400,'kokurikuler score 5 rejected');
 assert.equal((await call(ikmData({kesehatan:{tb:'125,5',bb:'30',pendengaran:'b',gigi:''},prestasi:[{jenis:'Juara 1 Tahfizh',keterangan:'Tingkat kota'},{jenis:'',keterangan:''}],keputusan:'naik'}))).status,200);
 const plain=v=>JSON.parse(JSON.stringify(v));
 assert.deepEqual(plain(entries[0].data.kesehatan),{tb:'125.5',bb:'30',pendengaran:'B'},'decimal comma accepted, empty fields dropped, health grade uppercased');
assert.equal((await call(ikmData({kesehatan:{gigi:'Baik'}}))).status,400,'health condition must be A-D');
 assert.deepEqual(plain(entries[0].data.prestasi),[{jenis:'Juara 1 Tahfizh',keterangan:'Tingkat kota'}],'empty achievement rows dropped');assert.equal(entries[0].data.keputusan,'naik');assert.equal(entries[0].version,3);

 // Data cetak: nilai akhir mengikuti rumus legger, TP dibaca lebih dari 1000 baris.
 const pd=await (await call({action:'print_data',academic_year:'2026/2027',semester_no:1,class_id:'class'})).json();
 assert.equal(pd.success,true);const mtk=pd.subjects.find(s=>s.id==='s-mtk');assert.equal(mtk.kktp_min,75);assert.equal(mtk.kktp_max,78);
 const budi=pd.students.find(s=>s.id==='st1');
 // Rumus baru: Tugas 10% + TP 30% + WWP 20% + ASAS 40% = 8+24+16+36 = 84 murni -> rapor 85 (akhiran 4 naik 1).
 assert.equal(budi.academic['s-mtk'].raw,84);assert.equal(budi.academic['s-mtk'].final,85);assert.deepEqual(budi.academic['s-mtk'].tp,[90,70]);
 assert.equal(budi.academic['s-arab'].final,null,'incomplete subject has no final score');assert.equal(budi.entry.data.komentar,'Ananda rajin.');
 assert.equal(pd.students.find(s=>s.id==='st2').entry,null);
 assert.deepEqual(budi.ekskul.map(e=>[e.name,e.rating]),[['Pramuka','B']],'Pramuka grade from Pembina Pramuka joins the ekskul list');
 assert.deepEqual(pd.students.find(s=>s.id==='st2').ekskul,[],'ungraded Pramuka adds no row (template shows an empty Pramuka row)');
 assert.equal(budi.academic['s-mtk'].wwp,80);assert.deepEqual(budi.academic['s-mtk'].tasks,[80,80,80,80,80],'components for the walas Excel download');
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
 for(const s of ['NILAI RAPOR','Matematika','Sembilan puluh dua'.slice(0,0)+I.terbilang(budi.academic['s-mtk'].final,'id'),'Muatan Lokal','PENILAIAN INTRAKURIKULER','Bilangan cacah','Mufradat','PENILAIAN SIKAP','PENILAIAN KOKURIKULER','Pekan bahasa','PROJECT BASED LEARNING (PjBL)','KEGIATAN PjBL','KOMENTAR UMUM','Ananda rajin.','Depok, 28 Jumadil Akhir 1448 H','19 Desember 2026 M','Bu Walas','Pak Kepsek','Nilai belum lengkap'])assert(id.includes(s),'ID page contains '+s);
 const pages=(id.match(/class="rpv-paper srp-page"/g)||[]).length;assert(pages>=6,'expected at least 6 A4 pages, got '+pages);
 const noIkm=h=>h.split('<section').filter(s=>!s.includes('data-part="ikm"')).join('<section');
 const nums=[...id.matchAll(/data-page-no="(\d+)"/g)].map(m=>Number(m[1]));const titles=[...noIkm(id).matchAll(/<div class="srp-title">([^<]+)<\/div>/g)].map(m=>m[1]);
 assert.equal(titles[0],'KOMENTAR UMUM');assert.equal(titles[1],'PENILAIAN SIKAP');assert.equal(titles[titles.length-1],'NILAI RAPOR','Nilai is the last page before IKM');
 assert.deepEqual(nums.slice(0,3),[1,2,3],'Komentar 1, Sikap/Adab 2-3');assert.equal(nums[3],7,'Intrakurikuler starts at page 7 (Tahfizh 4-6 printed separately)');assert.equal(titles[3],'PENILAIAN INTRAKURIKULER');
 const many={...report,semester_print:{subjects:Array.from({length:24},(_,i)=>({id:'m'+i,name:'Mapel '+i,sort_order:i,kktp_min:75,kktp_max:75,objectives:[]})),student:{academic:{},entry:null}}};
 const mt=[...noIkm(win.cqSemesterPagesHtml(many,{lang:'id'})).matchAll(/<div class="srp-title">([^<]+)<\/div>/g)].map(m=>m[1]);
 assert.deepEqual(mt.slice(-2),['NILAI RAPOR','NILAI RAPOR'],'long subject list splits Nilai into 2 pages, both with header');
 assert.equal(titles.filter(t=>t==='NILAI RAPOR').length,1,'short subject list keeps Nilai on 1 page');
 assert(id.includes('Halaman 7 | Budi'),'footer shows page number and student name');assert(id.includes('Halaman 7')&&id.includes('rapor-semester-logo.png')&&id.includes('rapor-semester-footer.jpg'),'page number, logo and footer present');
 assert.equal((id.match(/srp-box on/g)||[]).length,2+1+1,'checked boxes: 2 MTK TP + 1 sikap + 1 kokurikuler; Arab TP stays empty until WWP/ASAS are filled');
 const en=win.cqSemesterPagesHtml(report,{lang:'en',printDate:'2026-12-19',hijri:''});
 for(const s of ['SEMESTER REPORT CARD','Mathematics','Arabic Language','Local Content Subjects','Language Week','GENERAL COMMENTS','Homeroom Teacher','Principal','19 December 2026 CE','Incomplete scores'])assert(en.includes(s),'EN page contains '+s);
 assert(!en.includes('Matematika'),'EN uses English subject names');
 const enTp={...report,semester_print:{subjects:pd.subjects.map(s=>({...s,objectives:s.objectives.map((o,i)=>({...o,description_en:i===0?'Whole numbers':''}))})),student:budi}};
 const enHtml=win.cqSemesterPagesHtml(enTp,{lang:'en'}),idHtml=win.cqSemesterPagesHtml(enTp,{lang:'id'});
 assert(enHtml.includes('Whole numbers')&&!enHtml.includes('Bilangan cacah'),'EN report uses description_en');assert(enHtml.includes('Pecahan'),'EN falls back to Indonesian when description_en is empty');
 assert(idHtml.includes('Bilangan cacah')&&!idHtml.includes('Whole numbers'),'ID report keeps Indonesian TP');
 assert(!win.cqSemesterPagesHtml({...report,student:{...report.student,name:'<script>x</script>'}},{lang:'id'}).includes('<script>x'),'names are escaped');
 console.log('PASS semester-report print: terbilang ID/EN, TP grade bands, subject grouping, all pages in both languages, page numbers, escaping.');

 // Rapor IKM (XDESK).
 const ikmOf=h=>h.split('<section').filter(s=>s.includes('data-part="ikm"')).join('<section');
 const ikmReport={...report,points:{categories:{Minor:{incidents:2},Moderate:{incidents:0},Severe:{incidents:0}},violation_total:10,reward_total:25,final_total:15},
  semester_print:{subjects:pd.subjects,class:{grade_level:4},student:{...budi,ekskul:[{name:'Robotic',activity:'A',skill:'B'},{name:'Pramuka',activity:'B',skill:'B'},{name:'Renang',external:true,institution:'Klub Tirta',activity:'A',skill:'A'}]}}};
 const ik=ikmOf(win.cqSemesterPagesHtml(ikmReport,{lang:'id'}));
 assert(ik.length>0,'IKM pages exist');assert(id.lastIndexOf('data-part="ikm"')>id.lastIndexOf('LAPORAN PENILAIAN HASIL BELAJAR SISWA</div>\n<table class="srp-t"><colgroup><col style="width:7%">'),'IKM comes after Nilai');
 for(const s of ['A. Intrakurikuler','CAPAIAN KOMPETENSI','<span>Fase</span><span>:</span><span class="v">B</span>','B. Kokurikuler','Belum dinilai.','C. Ekstrakurikuler','D. Tinggi dan Berat Badan','125.5 cm','30 kg','E. Kondisi Kesehatan','A = Sangat baik;  B = Baik;  C = Cukup;  D = Kurang baik','F. Prestasi','Juara 1 Tahfizh','Tingkat kota','G. Ketidakhadiran','2 hari','H. Karakter dan Kedisiplinan','Total Poin Pelanggaran: 10 Poin','Total Poin Akhir: 15 Poin','Klub Tirta'])assert(ik.includes(s),'IKM contains '+s);
 const mtkFinal=budi.academic['s-mtk'].final;assert(ik.includes(`<td class="c">${mtkFinal}</td><td class="c">${I.ikmLetter(mtkFinal)}</td>`),'Matematika final score and grade');assert.equal(I.ikmLetter(89),'A');assert.equal(I.ikmLetter(88),'B');assert.equal(I.ikmLetter(82),'B');assert.equal(I.ikmLetter(81),'C');assert.equal(I.ikmLetter(75),'C');assert.equal(I.ikmLetter(74),'D');
 // Nilai per TP: TP1 90 -> 8+27+16+36=87 (B), TP2 70 -> 8+21+16+36=81 (C).
 assert(ik.includes('Ananda Budi baik dalam bilangan cacah dan cukup baik dalam pecahan.'),'capaian uses highest and lowest per-TP score');
 assert(ik.indexOf('>Pramuka<')<ik.indexOf('>Robotic<'),'Pramuka listed first');assert(!ik.includes('Keputusan:'),'no promotion decision in semester 1');
 assert.equal(I.tpPhrase('Peserta didik mampu memahami teks.','id'),'memahami teks');assert.equal(I.tpPhrase('Students are able to read.','en'),'read');
 const s2=ikmOf(win.cqSemesterPagesHtml({...ikmReport,semester_no:2,semester_print:{...ikmReport.semester_print,student:{...ikmReport.semester_print.student,kesehatan_s1:{tb:'120',bb:'28'}}}},{lang:'id'}));
 assert(s2.includes('Naik ke Kelas : V (Lima)')&&s2.includes('120 cm')&&s2.includes('125.5 cm'),'semester 2: promotion and both semesters of height');
 const g6=ikmOf(win.cqSemesterPagesHtml({...ikmReport,semester_no:2,semester_print:{...ikmReport.semester_print,class:{grade_level:6}}},{lang:'id'}));assert(g6.includes('LULUS'),'grade 6 graduates');
 const ikEn=ikmOf(win.cqSemesterPagesHtml(ikmReport,{lang:'en'}));for(const s of ['Not yet assessed.','Scouting (Pramuka)','A. Intracurricular','Budi shows good achievement in','Final Total Points: 15 Points'])assert(ikEn.includes(s),'EN IKM contains '+s);
 // Kokurikuler: komentar sama persis dengan "Generator komentar" di Rubrik_PjBL_Dimensi_Profil_Lulusan.xlsx.
 const KC=win.CQ_SEMESTER_CATALOG.kokuComment;
 assert.equal(KC('Putra',1,{a:2,b:2},'id'),'Ananda Putra masih perlu berlatih dalam menjelaskan sebab-akibat pertumbuhan kangkung berdasarkan data pengamatan, serta dalam berbagi tugas dan menghargai pendapat teman dalam menanam dan merawat kangkung.');
 assert.equal(KC('Putra',2,{a:3,b:2},'id'),'Ananda Putra sudah baik dalam kolaborasi dengan mampu bekerja sama dalam merawat ikan lele dan menghargai pendapat teman, dan masih perlu berlatih dalam menjelaskan sebab-akibat kondisi ikan lele berdasarkan data pengamatan.');
 assert.equal(KC('Putra',6,{a:3,b:2},'id'),'Ananda Putra sudah baik dalam komunikasi dengan mampu mempresentasikan hasil proyek secara runtut, percaya diri, dan menarik, dan masih perlu berlatih dalam mengembangkan gagasan inovatif dan media visual yang menarik.');
 assert.match(KC('Putra',4,{a:4,b:3},'id'),/^Ananda Putra sangat baik dalam penalaran kritis .*, serta sudah baik dalam kolaborasi /);assert.match(KC('Putra',3,{a:1,b:4},'id'),/^Ananda Putra sangat baik dalam kreativitas .* dan masih perlu berlatih dalam menjelaskan pentingnya air bersih/);
 assert.equal(KC('Putra',4,{a:3},'id'),'','both scores required');assert.match(KC('Putra',5,{a:4,b:4},'en'),/^Putra shows very good creativity in .*, as well as very good critical reasoning in /);
 const kk=ikmOf(win.cqSemesterPagesHtml({...ikmReport,semester_print:{...ikmReport.semester_print,student:{...ikmReport.semester_print.student,entry:{data:{...budi.entry.data,kokurikuler:{a:4,b:2}}}}}},{lang:'id'}));
 assert(kk.includes('Young Scientists Explore')&&kk.includes('Penalaran Kritis: 4 (Sangat Baik)')&&kk.includes('Kolaborasi: 2 (Cukup)')&&kk.includes('Ananda Budi sangat baik dalam penalaran kritis'),'IKM B shows project, scores and comment');
 // Tanda tangan: Komentar oleh Guru Partner; gambar tanda tangan disembunyikan saat dicetak ke printer.
 const sg=win.cqSemesterPagesHtml({...report,teachers:{...report.teachers,principal_signature_url:'https://x.invalid/p.png'},semester_print:{...report.semester_print,partner:{name:'Ust. Partner',signature_url:'https://x.invalid/gp.png'}}},{lang:'id'});
 const kom=sg.split('<section').find(s=>s.includes('KOMENTAR UMUM'));assert(kom.includes('Guru Partner')&&kom.includes('Ust. Partner')&&kom.includes('gp.png')&&!kom.includes('Kepala Sekolah'),'Komentar page signed by Guru Partner, not principal');
 assert(sg.split('<section').some(s=>s.includes('PENILAIAN SIKAP')===false&&s.includes('Kepala Sekolah')),'other pages keep the principal');
 assert(/@media print\{[^}]*\.srp-sign img[^}]*display:none/.test(store.get('cq-semester-print-style').textContent),'printer output hides e-signatures (wet signature)');
 console.log('PASS kokurikuler comments (Excel generator), Guru Partner signature on Komentar, no e-signature when printing.');
 console.log('PASS rapor IKM: A. Intrakurikuler + Fase, capaian from highest/lowest TP, Pramuka first, kesehatan, prestasi, absences, character points, semester 2 decision, English.');
})().catch(e=>{console.error(e);process.exitCode=1});
