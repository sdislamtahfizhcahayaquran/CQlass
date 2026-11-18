/* CQlass — Rapor Akhir Semester (Indonesia / English).
   Tampilan mengikuti sheet cetak Excel (XKOM, XSIK, XKOGU/XKOGD, XPSIK, XNILAI).
   Urutan: Komentar (1), Sikap/Adab (2-3), [Tahfizh 4-6 dicetak terpisah], Kognitif (mulai 7), Psikomotorik, Nilai, [IKM menyusul].
   Data: report-preview-v2 (identitas, kehadiran, tanda tangan) + /admin-academic-period/semester-report
   (nilai akhir & nilai TP dari academic_scores, isian walas). */
(function(){
'use strict';
const SCHOOL="SD Islam Tahfizh Cahaya Qur'an";
const GRADES=['A','B','C','D'];

/* ---------- Katalog isian walas (kunci dipakai di database; jangan diubah) ---------- */
const KEPRIBADIAN=[
 {key:'sikap',id:'Sikap',en:'Attitude'},
 {key:'kerajinan',id:'Kerajinan',en:'Diligence'},
 {key:'kebersihan',id:'Kebersihan dan kerapian',en:'Cleanliness and tidiness'}
];
const SIKAP=[
 {code:'A',id:'Sikap Bertauhid dan Beribadah',en:'Faith and Worship',items:[
  ['tauhid_1','Tidak takut berlebihan kepada selain Allah','Does not excessively fear anything other than Allah'],
  ['tauhid_2','Mengesakan Allah dalam ucapan','Affirms the oneness of Allah in speech'],
  ['tauhid_3','Menunjukkan kesyukuran dengan ucapan hamdalah','Shows gratitude by saying Alhamdulillah'],
  ['tauhid_4','Membiasakan berwudhu dengan tertib dan benar','Performs wudhu properly and in the correct order'],
  ['tauhid_5','Membiasakan diri sholat fardhu dan tertib','Performs the obligatory prayers regularly and properly'],
  ['tauhid_6','Membiasakan diri berinfak','Gets used to giving charity (infaq)'],
  ['tauhid_7','Membiasakan diri dzikrullah','Gets used to remembering Allah (dhikr)'],
  ['tauhid_8','Menghadiri majelis ilmu bersama orang tua','Attends religious study gatherings with parents']]},
 {code:'B',id:'Sikap kepada Orang Tua',en:'Attitude toward Parents',items:[
  ['ortu_1','Mendengarkan dan mematuhi perintah/nasihat mereka','Listens to and follows their instructions and advice'],
  ['ortu_2','Memenuhi panggilan mereka','Responds when they call'],
  ['ortu_3','Merendah, kasih sayang dan tidak menyusahkan mereka','Is humble, loving, and does not burden them'],
  ['ortu_4','Berbuat baik dan sabar kepada mereka','Is kind and patient toward them'],
  ['ortu_5','Tidak curiga dan tidak membangkang mereka','Is not suspicious of or defiant toward them']]},
 {code:'C',id:'Kedisiplinan dan Interaksi saat KBM',en:'Discipline and Classroom Interaction',items:[
  ['disiplin_1','Tidak terlambat datang ke sekolah','Arrives at school on time'],
  ['disiplin_2','Menggunakan seragam sekolah','Wears the school uniform'],
  ['disiplin_3','Bersikap jujur dan bertanggung jawab','Is honest and responsible'],
  ['disiplin_4','Menghargai guru dan teman','Respects teachers and classmates'],
  ['disiplin_5','Berani minta maaf bila salah dan memaafkan kesalahan orang','Apologizes when wrong and forgives others'],
  ['disiplin_6','Tertib dan memperhatikan saat di kelas','Is orderly and attentive in class']]},
 {code:'D',id:'Sikap Kepemimpinan',en:'Leadership',items:[
  ['pimpin_1','Menunjukkan inisiatif dan pengaruh yang baik','Shows initiative and a positive influence'],
  ['pimpin_2','Mampu menyatakan pendapat','Is able to express opinions'],
  ['pimpin_3','Mampu menerima pendapat orang lain','Is able to accept the opinions of others'],
  ['pimpin_4','Menunjukkan keteladanan pada kelompok','Sets a good example for the group'],
  ['pimpin_5','Memberi tanggapan baik terhadap instruksi','Responds well to instructions']]},
 {code:'E',id:'Kebersihan dan Kesehatan',en:'Cleanliness and Health',items:[
  ['bersih_1','Mengkonsumsi makanan yang halal dan sehat','Eats halal and healthy food'],
  ['bersih_2','Meletakkan sesuatu sesuai tempatnya','Puts things back in their place'],
  ['bersih_3','Membuang sampah pada tempatnya','Throws litter in the bin'],
  ['bersih_4','Menjaga kebersihan dan kerapian pakaian','Keeps clothes clean and tidy'],
  ['bersih_5','Membiasakan berhemat dan tidak mubazir','Is thrifty and avoids waste'],
  ['bersih_6','Membiasakan cuci tangan','Washes hands regularly'],
  ['bersih_7','Membiasakan memotong kuku dan membersihkan telinga','Keeps nails trimmed and ears clean'],
  ['bersih_8','Rajin melaksanakan piket kebersihan kelas','Carries out class cleaning duty diligently'],
  ['bersih_9','Menjaga kebersihan WC dan tempat wudhu','Keeps the toilets and wudhu area clean'],
  ['bersih_10','Tertib dan benar dalam beristinja','Performs istinja properly'],
  ['bersih_11','Membiasakan diri gosok gigi','Brushes teeth regularly']]},
 {code:'F',id:'Sikap Kemandirian',en:'Independence',items:[
  ['mandiri_1','Mampu makan dan minum sendiri','Eats and drinks independently'],
  ['mandiri_2','Berani ke kamar mandi sendiri','Goes to the bathroom independently'],
  ['mandiri_3','Mampu menggunakan dan merapikan peralatan pribadi','Uses and tidies up personal belongings'],
  ['mandiri_4','Menyelesaikan tugas sesuai kemampuan','Completes tasks according to ability'],
  ['mandiri_5','Mampu mengendalikan sikap di saat-saat yang tidak nyaman','Stays composed in uncomfortable situations']]}
];
const PSIKOMOTOR=[
 {code:'01',id:'Project Based Learning (PBL)',en:'Project Based Learning (PBL)',groups:[
  {id:'Kegiatan PBL',en:'PBL Activities',items:[
   ['pbl_k1','Penjelasan tema, tujuan, dan pembentukan tim','Theme briefing, objectives, and team formation'],
   ['pbl_k2','Mengikuti outing','Joins the outing'],
   ['pbl_k3','Mengikuti presentasi PBL','Joins the PBL presentation'],
   ['pbl_k4','Mengikuti kegiatan puncak PBL','Joins the PBL culminating event']]},
  {id:'Hasil PBL',en:'PBL Outcomes',items:[
   ['pbl_h1','Orisinalitas ide','Originality of ideas'],
   ['pbl_h2','Kreativitas dan desain','Creativity and design'],
   ['pbl_h3','Waktu penyelesaian','Completion time'],
   ['pbl_h4','Kesesuaian project','Project suitability'],
   ['pbl_h5','Kerja sama kelompok','Teamwork']]}]},
 {code:'02',id:'Integrasi Program',en:'Program Integration',groups:[
  {id:'Program Intra',en:'Intracurricular Programs',items:[
   ['intra_1','Market day','Market Day'],
   ['intra_2',"Tasmi' syahriyyah","Monthly Tasmi'"],
   ['intra_3','Pekan bahasa','Language Week'],
   ['intra_4','Literasi / Perpustakaan','Literacy / Library']]},
  {id:'Ekstrakurikuler dan Perlombaan',en:'Extracurricular Activities and Competitions',items:[
   ['ekskul_1','Mengikuti ekstrakurikuler','Participates in extracurricular activities'],
   ['ekskul_2','Mengikuti perlombaan','Participates in competitions'],
   ['ekskul_3','Bintang prestasi','Achievement stars']]}]}
];
const LEGEND={
 sikap:{id:'A = Terampil;  B = Menguasai;  C = Berkembang;  D = Tumbuh',en:'A = Skilled;  B = Proficient;  C = Developing;  D = Emerging'},
 kognitif:{id:'A = Terampil;  B = Menguasai;  C = Berkembang;  D = Tumbuh',en:'A = Skilled;  B = Proficient;  C = Developing;  D = Emerging'},
 psikomotor:{id:'A = Sangat aktif;  B = Aktif sesekali;  C = Pasif;  D = Tidak mengikuti',en:'A = Very active;  B = Occasionally active;  C = Passive;  D = Did not participate'},
 kepribadian:{id:'A = Sangat baik;  B = Baik;  C = Cukup;  D = Perlu bimbingan',en:'A = Excellent;  B = Good;  C = Fair;  D = Needs guidance'}
};
window.CQ_SEMESTER_CATALOG={KEPRIBADIAN,SIKAP,PSIKOMOTOR,LEGEND,GRADES};

/* ---------- Mapel ---------- */
const SUBJECTS=[
 {key:'akidah',re:/akidah|aqidah/,en:'Aqidah (Islamic Creed)',group:'pai',kind:'diniyah'},
 {key:'fikih',re:/fikih|fiqh|fiqih/,en:'Fiqh (Islamic Jurisprudence)',group:'pai',kind:'diniyah'},
 {key:'adab',re:/adab|akhlak/,en:'Akhlak (Islamic Manners)',group:'pai',kind:'diniyah'},
 {key:'hadits',re:/hadits|hadith|hadis/,en:'Hadith',group:'pai',kind:'diniyah'},
 {key:'arab',re:/arab/,en:'Arabic Language',group:'mulok',kind:'diniyah'},
 {key:'siroh',re:/siroh|sirah|seerah/,en:'Seerah (Prophetic Biography)',group:'mulok',kind:'diniyah'},
 {key:'tajwid',re:/tajwid|tajweed/,en:"Tajweed (Qur'anic Recitation)",group:'mulok',kind:'diniyah'},
 {key:'inggris',re:/inggris|english/,en:'English',group:'mulok',kind:'umum'},
 {key:'sunda',re:/sunda/,en:'Sundanese Language',group:'mulok',kind:'umum'},
 {key:'pkn',re:/pancasila|kewarganegaraan|\bpkn\b|\bppkn\b/,en:'Pancasila Education',group:'main',kind:'umum'},
 {key:'indo',re:/indonesia/,en:'Bahasa Indonesia',group:'main',kind:'umum'},
 {key:'mtk',re:/matematika|mathematics/,en:'Mathematics',group:'main',kind:'umum'},
 {key:'ipas',re:/ipas|alam dan sosial|natural and social/,en:'Natural and Social Sciences',group:'main',kind:'umum'},
 {key:'ipa',re:/\bipa\b|pengetahuan alam|natural sciences|sains/,en:'Natural Sciences',group:'main',kind:'umum'},
 {key:'ips',re:/\bips\b|pengetahuan sosial|social sciences/,en:'Social Sciences',group:'main',kind:'umum'},
 {key:'sbdp',re:/seni|sbdp|prakarya|arts/,en:'Arts, Culture, and Crafts',group:'main',kind:'umum'},
 {key:'pjok',re:/pjok|jasmani|penjas|physical/,en:'Physical Education, Sports, and Health',group:'main',kind:'umum'}
];
function classify(subject){const n=String(subject?.name||'').toLowerCase();return SUBJECTS.find(s=>s.re.test(n))||{key:'',en:'',group:'main',kind:'umum'}}
function subjectName(subject,lang){const c=classify(subject);return lang==='en'&&c.en?c.en:String(subject?.name||'-')}

/* ---------- Angka & terbilang ---------- */
const ID_NUM=['','satu','dua','tiga','empat','lima','enam','tujuh','delapan','sembilan','sepuluh','sebelas'];
function idWords(n){if(n<12)return ID_NUM[n];if(n<20)return idWords(n-10)+' belas';if(n<100)return idWords(Math.floor(n/10))+' puluh'+(n%10?' '+idWords(n%10):'');if(n===100)return'seratus';return String(n)}
const EN_ONES=['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'];
const EN_TENS=['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'];
function enWords(n){if(n<20)return EN_ONES[n];if(n<100)return EN_TENS[Math.floor(n/10)]+(n%10?'-'+EN_ONES[n%10]:'');if(n===100)return'one hundred';return String(n)}
function terbilang(v,lang){if(v===null||v===undefined||v==='')return'-';const n=Number(v);if(!Number.isInteger(n)||n<0||n>100)return'-';const w=n===0?(lang==='en'?'zero':'nol'):lang==='en'?enWords(n):idWords(n);return w.charAt(0).toUpperCase()+w.slice(1)}
function tpGrade(score){const n=Number(score);if(score===null||score===undefined||score===''||!Number.isFinite(n))return'';return n>=89?'A':n>=82?'B':n>=75?'C':'D'}

/* ---------- Teks antarmuka ---------- */
const T={
 id:{sem:n=>Number(n)===2?'II (Dua)':'I (Satu)',year:'Tahun Ajaran',name:'Nama',nameLong:'Nama Siswa',cls:'Kelas',semL:'Semester',school:'Sekolah',
  nilai:'NILAI RAPOR',psik:'PENILAIAN PSIKOMOTORIK',kogu:'PENILAIAN KOGNITIF UMUM',kogd:'PENILAIAN KOGNITIF DINIYAH',sikap:'PENILAIAN SIKAP',kom:'KOMENTAR UMUM',
  lphb:'LAPORAN PENILAIAN HASIL BELAJAR SISWA',no:'NO',subject:'MATA PELAJARAN',kktp:'KKTP',score:'NILAI',num:'ANGKA',words:'HURUF',
  pai:'Pendidikan Agama Islam dan Budi Pekerti',mulok:'Muatan Lokal',kepribadian:'KEPRIBADIAN',value:'NILAI',absence:'KETIDAKHADIRAN',days:'HARI',sick:'Sakit',excused:'Izin',unexcused:'Tanpa Keterangan',
  parent:'Orang Tua / Wali',homeroom:'Wali Kelas',principal:'Kepala Sekolah',page:(i,n)=>`Halaman ${i}${n?` | ${n}`:''}`,noComment:'',noTp:'Tujuan pembelajaran belum diatur.',noSubject:'Belum ada mata pelajaran untuk kelompok ini.',
  masehi:d=>d?new Intl.DateTimeFormat('id-ID',{day:'2-digit',month:'long',year:'numeric'}).format(d)+' M':'-',hijriSuffix:' H',incomplete:'Nilai belum lengkap'},
 en:{sem:n=>Number(n)===2?'II (Two)':'I (One)',year:'Academic Year',name:'Name',nameLong:'Student Name',cls:'Class',semL:'Semester',school:'School',
  nilai:'SEMESTER REPORT CARD',psik:'PSYCHOMOTOR ASSESSMENT',kogu:'COGNITIVE ASSESSMENT: GENERAL SUBJECTS',kogd:'COGNITIVE ASSESSMENT: ISLAMIC STUDIES',sikap:'ATTITUDE ASSESSMENT',kom:'GENERAL COMMENTS',
  lphb:'STUDENT LEARNING ACHIEVEMENT REPORT',no:'NO',subject:'SUBJECT',kktp:'KKTP',score:'SCORE',num:'NUMBER',words:'IN WORDS',
  pai:'Islamic Studies',mulok:'Local Content Subjects',kepribadian:'PERSONALITY',value:'RATING',absence:'ABSENCES',days:'DAYS',sick:'Illness',excused:'Excused',unexcused:'Unexcused',
  parent:'Parent / Guardian',homeroom:'Homeroom Teacher',principal:'Principal',page:(i,n)=>`Page ${i}${n?` | ${n}`:''}`,noComment:'',noTp:'Learning objectives have not been set.',noSubject:'No subjects in this group yet.',
  masehi:d=>d?new Intl.DateTimeFormat('en-GB',{day:'2-digit',month:'long',year:'numeric'}).format(d)+' CE':'-',hijriSuffix:' AH',incomplete:'Incomplete scores'}
};
// Rapor Tahfizh (3 lembar) dicetak terpisah tetapi nomor halamannya disisakan setelah halaman Sikap/Adab.
const TAHFIZH_PAGES=3;
const LOGO='rapor-semester-logo.png',FOOTER='rapor-semester-footer.jpg';

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function letters(i){return String.fromCharCode(97+i)}

/* ---------- Gaya (mengikuti sheet cetak Excel) ---------- */
function injectStyles(){if(document.getElementById('cq-semester-print-style'))return;const s=document.createElement('style');s.id='cq-semester-print-style';s.textContent=`
.srp-page{display:flex;flex-direction:column;padding:13mm 14mm 32mm 15mm!important;font-family:Tahoma,Verdana,'Segoe UI',sans-serif;font-size:8pt;color:#111}
.srp-title{font-family:'Segoe UI',Tahoma,Arial,sans-serif;font-weight:700;font-size:12pt;letter-spacing:.2px;margin:0 0 3mm 112mm;white-space:nowrap}
.srp-id{display:grid;grid-template-columns:1fr 20mm 1fr;align-items:center;column-gap:4mm;margin:0 0 6mm;font-family:'Segoe UI',Tahoma,Arial,sans-serif;font-size:8pt}
.srp-id img{width:20mm;height:20mm;object-fit:contain}
.srp-kv{display:grid;grid-template-columns:auto 4mm 1fr;row-gap:2mm;align-items:baseline}.srp-kv .v{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.srp-kv.r{grid-template-columns:24mm 4mm 1fr}.srp-kv.l{grid-template-columns:14mm 4mm 1fr}
.srp-nid{display:grid;grid-template-columns:1fr 64mm 20mm;align-items:start;column-gap:3mm;margin:0 0 5mm;font-family:Tahoma,Verdana,sans-serif;font-size:8pt}
.srp-nid .srp-kv.l{grid-template-columns:26mm 4mm 1fr}.srp-nid img{width:20mm;height:20mm;object-fit:contain;margin-top:-3mm}
.srp-big{text-align:center;font-family:Tahoma,Verdana,sans-serif;font-weight:700;font-size:16pt;margin:1mm 0 6mm;letter-spacing:.3px}
.srp-t{width:100%;border-collapse:collapse;table-layout:fixed;border:1.6px solid #000;line-height:1.25;font-size:8pt}.srp-t td,.srp-t th{border:.6px solid #000;padding:1mm 1.6mm;vertical-align:middle}
.srp-t .hd th,.srp-t th.hd{background:#ffffcc;font-weight:900;text-align:center}.srp-t .hd th.title{text-align:left;font-size:10pt;letter-spacing:.2px}
.srp-t .code{text-align:center;font-weight:900;font-size:10pt}.srp-t .c{text-align:center}.srp-t .ck{text-align:center;font-size:7.5pt}
.srp-t .sh td{font-weight:900;background:#fff}.srp-t .grey{background:#e6e6e6}.srp-t .sub{padding-left:3mm}.srp-t .bul{display:inline-block;width:2.6mm;height:2.6mm;background:#111;margin:0 3mm 0 1mm;vertical-align:middle}
.srp-t .muted{color:#666;font-style:italic}.srp-gap{height:3.5mm}
.srp-box{display:inline-block;width:3.4mm;height:3.4mm;border:1px solid #333;vertical-align:middle;background:#fff}.srp-box.on{background:#111;border-color:#111}
.srp-legend{font-size:8pt;font-style:italic;margin:3mm 0 0 10mm}
.srp-two{display:grid;grid-template-columns:1fr 1fr;column-gap:16mm;align-items:start;margin-top:7mm}
.srp-sign-area{margin-top:6mm}
.srp-date{text-align:center;line-height:1.7;margin-bottom:1mm;font-family:Tahoma,Verdana,sans-serif;font-size:8pt}
.srp-sign{display:grid;grid-template-columns:1fr 1fr 1fr;column-gap:4mm;text-align:center;font-family:'Segoe UI',Tahoma,Arial,sans-serif;font-size:8pt}
.srp-sign>div{position:relative;min-height:33mm;display:flex;flex-direction:column;align-items:center}
.srp-sign .name{margin-top:auto;text-decoration:underline;white-space:nowrap}.srp-sign .line{margin-top:auto;width:70%;border-bottom:1px solid #111;height:1px}
.srp-sign img{position:absolute;top:5mm;left:50%;transform:translateX(-50%);max-width:44mm;max-height:20mm;object-fit:contain}
.srp-comment{border:1.6px solid #000}.srp-comment .band{height:6.5mm;background:#ffffcc}.srp-comment .body{min-height:82mm;padding:4mm 5mm;border-top:1.6px solid #000;border-bottom:1.6px solid #000;font-family:Tahoma,Verdana,sans-serif;font-size:9.5pt;line-height:1.6;white-space:pre-wrap;text-align:justify}
.srp-foot{position:absolute;left:0;right:0;bottom:0;height:26.4mm}.srp-foot img{display:block;width:100%;height:100%;object-fit:fill}
.srp-pno{position:absolute;right:14mm;bottom:27.5mm;max-width:120mm;text-align:right;font-family:Tahoma,Verdana,sans-serif;font-size:7.5pt;color:#555;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding-right:2mm;border-right:2px solid #b5174f}
`;document.head.appendChild(s)}

/* ---------- Bagian halaman ---------- */
function headHtml(ctx,title){const L=T[ctx.lang],st=ctx.student;return`<div class="srp-title">${esc(title)}</div>
<div class="srp-id"><div class="srp-kv l"><span>${L.name}</span><span>:</span><span class="v">${esc(st.name||'')}</span><span>${L.cls}</span><span>:</span><span class="v">${esc(ctx.className||'-')}</span></div><img src="${LOGO}" alt=""><div class="srp-kv r"><span>${L.semL}</span><span>:</span><span>${esc(L.sem(ctx.semester))}</span><span>${L.year}</span><span>:</span><span>${esc(ctx.year||'-')}</span></div></div>`}
function boxes(selected){return GRADES.map(g=>`<td class="c"><span class="srp-box${selected===g?' on':''}" aria-label="${g}${selected===g?' ✓':''}"></span></td>`).join('')}
function signHtml(ctx,third){const L=T[ctx.lang],tr=ctx.teachers||{};let d=null;if(ctx.printDate){const x=new Date(ctx.printDate+'T00:00:00');if(!Number.isNaN(x.getTime()))d=x}
 const hijri=String(ctx.hijri||'').trim();const hijriLine=hijri?`Depok, ${esc(hijri)}${/\b(H|AH|M|CE)$/i.test(hijri)?'':L.hijriSuffix}`:'';
 const img=u=>u?`<img crossorigin="anonymous" src="${esc(u)}" alt="">`:'';
 return`<div class="srp-sign-area"><div class="srp-date">${hijriLine?`<div><u>${hijriLine}</u></div><div>${esc(L.masehi(d))}</div>`:`<div><u>Depok, ${esc(L.masehi(d))}</u></div>`}</div>
<div class="srp-sign"><div>${L.parent}<div class="line"></div></div><div>${L.homeroom}${img(tr.homeroom_signature_url)}<div class="name">${esc(tr.homeroom||'_______________')}</div></div><div>${L.principal}${img(tr.principal_signature_url)}<div class="name">${esc(tr.principal||'_______________')}</div></div></div></div>`}

function nilaiPage(ctx){const L=T[ctx.lang],subs=ctx.subjects,acad=ctx.academic||{},st=ctx.student;
 const kk=s=>s.kktp_min==null?'-':(s.kktp_min===s.kktp_max?String(s.kktp_min):`${s.kktp_min}-${s.kktp_max}`);
 const cells=s=>{const f=(acad[s.id]||{}).final;return`<td class="c">${esc(kk(s))}</td><td class="c">${f==null?'-':f}</td><td${f==null?' class="muted"':''}>${f==null?esc(L.incomplete):esc(terbilang(f,ctx.lang))}</td>`};
 const group=(no,label,list)=>`<tr><td class="c" rowspan="${list.length+1}">${no}</td><td>${esc(label)}</td><td class="grey"></td><td class="grey" colspan="2"></td></tr>`+list.map(s=>`<tr><td class="sub"><span class="bul"></span>${esc(subjectName(s,ctx.lang))}</td>${cells(s)}</tr>`).join('');
 const pai=subs.filter(s=>classify(s).group==='pai'),mulok=subs.filter(s=>classify(s).group==='mulok'),main=subs.filter(s=>classify(s).group==='main');let no=0,body='';
 if(pai.length)body+=group(++no,L.pai,pai);
 for(const s of main)body+=`<tr><td class="c">${++no}</td><td>${esc(subjectName(s,ctx.lang))}</td>${cells(s)}</tr>`;
 if(mulok.length)body+=group(++no,L.mulok,mulok);
 if(!body)body=`<tr><td colspan="5" class="c muted">${L.noSubject}</td></tr>`;
 const kp=(ctx.entry||{}).kepribadian||{},att=ctx.attendance||{};
 return`<div class="srp-title">${esc(L.nilai)}</div>
<div class="srp-nid"><div class="srp-kv l"><span>${L.school}</span><span>:</span><span class="v">${SCHOOL}</span><span>${L.nameLong}</span><span>:</span><span class="v">${esc(st.name||'')}</span><span>NISN</span><span>:</span><span class="v">${esc(st.nisn||'-')}</span><span>NPSN</span><span>:</span><span class="v">70004670</span></div><div class="srp-kv r"><span>${L.cls}</span><span>:</span><span class="v">${esc(ctx.className||'-')}</span><span>${L.semL}</span><span>:</span><span>${esc(L.sem(ctx.semester))}</span><span>${L.year}</span><span>:</span><span>${esc(ctx.year||'-')}</span></div><img src="${LOGO}" alt=""></div>
<div class="srp-big">${L.lphb}</div>
<table class="srp-t"><colgroup><col style="width:7%"><col style="width:44%"><col style="width:12%"><col style="width:10%"><col></colgroup><thead><tr class="hd"><th rowspan="2">${L.no}</th><th rowspan="2">${L.subject}</th><th rowspan="2">${L.kktp}</th><th colspan="2">${L.score}</th></tr><tr class="hd"><th>${L.num}</th><th>${L.words}</th></tr></thead><tbody>${body}</tbody></table>
<div class="srp-two"><table class="srp-t"><colgroup><col style="width:13%"><col><col style="width:26%"></colgroup><thead><tr class="hd"><th>${L.no}</th><th>${L.kepribadian}</th><th>${L.value}</th></tr></thead><tbody>${KEPRIBADIAN.map((k,i)=>`<tr><td class="c">${i+1}</td><td>${esc(k[ctx.lang])}</td><td class="c">${esc(kp[k.key]||'-')}</td></tr>`).join('')}</tbody></table>
<table class="srp-t"><colgroup><col><col style="width:30%"></colgroup><thead><tr class="hd"><th>${L.absence}</th><th>${L.days}</th></tr></thead><tbody>${[[L.sick,att.sick],[L.excused,att.excused],[L.unexcused,att.unexcused]].map(([l,v])=>`<tr><td><span class="bul" style="margin-left:0"></span>${l}</td><td class="c">${Number(v)||0}</td></tr>`).join('')}</tbody></table></div>`+signHtml(ctx)}

/* Paginate blocks of rows onto A4 pages using an estimated height budget (mm). */
function paginate(blocks,budget){const pages=[];let cur=[],used=0;for(const b of blocks){if(cur.length&&used+b.h>budget){pages.push(cur);cur=[];used=0}cur.push(b);used+=b.h}if(cur.length)pages.push(cur);return pages.length?pages:[[]]}
// Calibrated in Chrome on A4 (Tahoma 10.5px, ~118mm label column): one line ≈ 5.6mm, each extra line ≈ +3.9mm.
const rowH=text=>1.7+3.9*Math.max(1,Math.ceil(String(text||'').length/80));
function gradeBlocks(groups,ctx){return groups.map(g=>({h:7.5+g.rows.reduce((n,r)=>n+rowH(r.label)+(r.subhead?5.6:0),0)+3.5,html:`<table class="srp-t"><colgroup><col style="width:6.5%"><col><col style="width:7.5%"><col style="width:7.5%"><col style="width:7.5%"><col style="width:7.5%"></colgroup><thead><tr class="hd"><th class="code">${esc(g.code)}</th><th class="title">${esc(g.title)}</th>${GRADES.map(x=>`<th>${x}</th>`).join('')}</tr></thead><tbody>${g.rows.length?g.rows.map(r=>`${r.subhead?`<tr class="sh"><td></td><td colspan="5">${esc(r.subhead.toUpperCase())}</td></tr>`:''}<tr><td class="ck">✔</td><td>${esc(r.label)}</td>${boxes(r.grade)}</tr>`).join(''):`<tr><td></td><td colspan="5" class="muted">${esc(T[ctx.lang].noTp)}</td></tr>`}</tbody></table><div class="srp-gap"></div>`}))}
function kognitifGroups(ctx,kind){const acad=ctx.academic||{};return ctx.subjects.filter(s=>classify(s).kind===kind).map((s,idx)=>{const a=acad[s.id]||{};return{code:String(idx+1).padStart(2,'0'),title:subjectName(s,ctx.lang).toUpperCase(),rows:(s.objectives||[]).map((o,i)=>({label:o.description||`TP ${i+1}`,grade:tpGrade(a.tp?.[i])}))}})}
function sikapGroups(ctx){const v=ctx.entry?.sikap||{};return SIKAP.map(c=>({code:c.code,title:c[ctx.lang].toUpperCase(),rows:c.items.map(([k,id,en])=>({label:ctx.lang==='en'?en:id,grade:v[k]||''}))}))}
function psikGroups(ctx){const v=ctx.entry?.psikomotor||{};return PSIKOMOTOR.map(c=>({code:c.code,title:c[ctx.lang].toUpperCase(),rows:c.groups.flatMap(g=>g.items.map(([k,id,en],i)=>({subhead:i===0?g[ctx.lang]:'',label:ctx.lang==='en'?en:id,grade:v[k]||''})))}))}
function blockPages(ctx,title,groups,legendKey){const L=T[ctx.lang];if(!groups.length)return[headHtml(ctx,title)+`<p class="muted">${L.noSubject}</p>`];return paginate(gradeBlocks(groups,ctx),206).map(p=>headHtml(ctx,title)+p.map(b=>b.html).join('')+`<div class="srp-legend">${esc(LEGEND[legendKey][ctx.lang])}</div>`)}
function komentarPage(ctx){const L=T[ctx.lang],c=String(ctx.entry?.komentar||'').trim();return headHtml(ctx,L.kom)+`<div class="srp-comment"><div class="band"></div><div class="body">${c?esc(c):''}</div><div class="band"></div></div>`+signHtml(ctx)}

/* Semua halaman satu siswa. report = hasil report-preview-v2 yang sudah ditempeli semester_print. */
function pagesHtml(report,opts){
 injectStyles();const sp=report?.semester_print;if(!sp)throw new Error('Data Rapor Semester belum dimuat.');
 const lang=opts?.lang==='en'?'en':'id';
 const ctx={lang,student:report.student||{},className:report.class?.name||sp.class?.name||'',semester:report.semester_no||sp.semester_no,year:report.academic_year||sp.academic_year,teachers:report.teachers||{},attendance:report.attendance||{},subjects:sp.subjects||[],academic:sp.student?.academic||{},entry:sp.student?.entry?.data||{},printDate:opts?.printDate||'',hijri:opts?.hijri||''};
 const L=T[lang];
 // Urutan cetak sekolah: 1 Komentar, 2-3 Sikap/Adab, 4-6 Tahfizh (dicetak terpisah), Kognitif mulai hal. 7, Psikomotorik, Nilai, lalu IKM (menyusul).
 // Seperti sheet XSIK: lembar 1 = kategori A-C, lembar 2 = D-F.
 const sg=sikapGroups(ctx);
 const first=[komentarPage(ctx),...blockPages(ctx,L.sikap,sg.slice(0,3),'sikap'),...blockPages(ctx,L.sikap,sg.slice(3),'sikap')];
 const rest=[...blockPages(ctx,L.kogu,kognitifGroups(ctx,'umum'),'kognitif'),...blockPages(ctx,L.kogd,kognitifGroups(ctx,'diniyah'),'kognitif'),...blockPages(ctx,L.psik,psikGroups(ctx),'psikomotor'),nilaiPage(ctx)];
 const numbered=[...first.map((html,i)=>[html,i+1]),...rest.map((html,i)=>[html,first.length+TAHFIZH_PAGES+i+1])];
 return numbered.map(([html,no])=>`<section class="rpv-paper srp-page" data-student-id="${esc(ctx.student.id||'')}" data-page-no="${no}">${html}<div class="srp-foot"><img src="${FOOTER}" alt=""></div><div class="srp-pno">${esc(L.page(no,ctx.student.name))}</div></section>`).join('');
}

/* Ambil data cetak satu kelas lalu tempelkan ke tiap laporan siswa. */
async function attach(reports,{academicYear,semester,classId}){
 const list=(reports||[]).filter(Boolean);if(!list.length)return reports;
 const token=typeof getAuthToken==='function'?getAuthToken():'';if(!token)throw new Error('Sesi login tidak ditemukan.');
 const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),60000);let d;
 try{const r=await fetch(`${SUPABASE_URL}/functions/v1/admin-academic-period/semester-report`,{method:'POST',headers:{'Content-Type':'application/json',apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:'Bearer '+SUPABASE_PUBLISHABLE_KEY,'x-session-token':token},body:JSON.stringify({action:'print_data',academic_year:academicYear,semester_no:semester,class_id:classId}),signal:ctl.signal});d=await r.json().catch(()=>({}));if(!r.ok||!d.success)throw new Error(d.error||`Data Rapor Semester gagal dimuat (HTTP ${r.status}).`)}
 catch(e){if(e?.name==='AbortError')throw new Error('Server Rapor Semester terlalu lama merespons.');throw e}finally{clearTimeout(timer)}
 const by=new Map((d.students||[]).map(s=>[String(s.id),s]));
 for(const r of list){r.semester_print={academic_year:d.academic_year,semester_no:d.semester_no,class:d.class,subjects:d.subjects||[],student:by.get(String(r.student?.id))||{academic:{},entry:null}}}
 return reports;
}

window.cqSemesterPagesHtml=pagesHtml;
window.cqSemesterAttach=attach;
window.__cqSemesterInternals={terbilang,tpGrade,classify,paginate,subjectName};
})();
