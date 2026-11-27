/* CQlass — Rapor Akhir Semester (Indonesia / English).
   Tampilan mengikuti sheet cetak Excel (XKOM, XSIK, XKOGU/XKOGD, XPSIK, XNILAI).
   Urutan: Komentar (1), Sikap/Adab (2-3), [Tahfizh 4-6 dicetak terpisah], Kognitif (mulai 7), Psikomotorik, Nilai, Rapor IKM (XDESK).
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
 {code:'B',id:'Kedisiplinan dan Interaksi saat KBM',en:'Discipline and Classroom Interaction',items:[
  ['disiplin_1','Tidak terlambat datang ke sekolah','Arrives at school on time'],
  ['disiplin_2','Menggunakan seragam sekolah','Wears the school uniform'],
  ['disiplin_3','Bersikap jujur dan bertanggung jawab','Is honest and responsible'],
  ['disiplin_4','Menghargai guru dan teman','Respects teachers and classmates'],
  ['disiplin_5','Berani minta maaf bila salah dan memaafkan kesalahan orang','Apologizes when wrong and forgives others'],
  ['disiplin_6','Tertib dan memperhatikan saat di kelas','Is orderly and attentive in class']]},
 {code:'C',id:'Sikap Kepemimpinan',en:'Leadership',items:[
  ['pimpin_1','Menunjukkan inisiatif dan pengaruh yang baik','Shows initiative and a positive influence'],
  ['pimpin_2','Mampu menyatakan pendapat','Is able to express opinions'],
  ['pimpin_3','Mampu menerima pendapat orang lain','Is able to accept the opinions of others'],
  ['pimpin_4','Menunjukkan keteladanan pada kelompok','Sets a good example for the group'],
  ['pimpin_5','Memberi tanggapan baik terhadap instruksi','Responds well to instructions']]},
 {code:'D',id:'Kebersihan dan Kesehatan',en:'Cleanliness and Health',items:[
  ['bersih_1','Mengkonsumsi makanan yang halal dan sehat','Eats halal and healthy food'],
  ['bersih_2','Meletakkan sesuatu sesuai tempatnya','Puts things back in their place'],
  ['bersih_3','Membuang sampah pada tempatnya','Throws litter in the bin'],
  ['bersih_4','Menjaga kebersihan dan kerapian pakaian','Keeps clothes clean and tidy'],
  ['bersih_5','Membiasakan berhemat dan tidak mubazir','Is thrifty and avoids waste'],
  ['bersih_6','Membiasakan cuci tangan','Washes hands regularly'],
  ['bersih_7','Membiasakan memotong kuku dan membersihkan telinga','Keeps nails trimmed and ears clean'],
  ['bersih_8','Rajin melaksanakan piket kebersihan kelas','Carries out class cleaning duty diligently'],
  ['bersih_9','Menjaga kebersihan WC dan tempat wudhu','Keeps the toilets and wudhu area clean']]},
 {code:'E',id:'Sikap Kemandirian',en:'Independence',items:[
  ['mandiri_1','Mampu makan dan minum sendiri','Eats and drinks independently'],
  ['mandiri_2','Berani ke kamar mandi sendiri','Goes to the bathroom independently'],
  ['mandiri_3','Mampu menggunakan dan merapikan peralatan pribadi','Uses and tidies up personal belongings'],
  ['mandiri_4','Menyelesaikan tugas sesuai kemampuan','Completes tasks according to ability'],
  ['mandiri_5','Mampu mengendalikan sikap di saat-saat yang tidak nyaman','Stays composed in uncomfortable situations']]}
];
const PSIKOMOTOR=[
 {code:'01',id:'Project Based Learning (PjBL)',en:'Project Based Learning (PjBL)',groups:[
  {id:'Kegiatan PjBL',en:'PjBL Activities',items:[
   ['pbl_k1','Penjelasan tema, tujuan, dan pembentukan tim','Theme briefing, objectives, and team formation'],
   ['pbl_k2','Mengikuti outing','Joins the outing'],
   ['pbl_k3','Mengikuti presentasi PjBL','Joins the PjBL presentation'],
   ['pbl_k4','Mengikuti kegiatan puncak PjBL','Joins the PjBL culminating event']]},
  {id:'Hasil PjBL',en:'PjBL Outcomes',items:[
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
   ['ekskul_2','Mengikuti perlombaan','Participates in competitions']]}]}
];
const LEGEND={
 sikap:{id:'A = Terampil;  B = Menguasai;  C = Berkembang;  D = Tumbuh',en:'A = Skilled;  B = Proficient;  C = Developing;  D = Emerging'},
 kognitif:{id:'A = Terampil;  B = Menguasai;  C = Berkembang;  D = Tumbuh',en:'A = Skilled;  B = Proficient;  C = Developing;  D = Emerging'},
 psikomotor:{id:'A = Sangat aktif;  B = Aktif sesekali;  C = Pasif;  D = Tidak mengikuti',en:'A = Very active;  B = Occasionally active;  C = Passive;  D = Did not participate'},
 kepribadian:{id:'A = Sangat baik;  B = Baik;  C = Cukup;  D = Perlu bimbingan',en:'A = Excellent;  B = Good;  C = Fair;  D = Needs guidance'}
};
/* ---------- Kokurikuler (PjBL) per jenjang: 2 dimensi profil lulusan, skor 1-4 ----------
   Sumber: Rubrik_PjBL_Dimensi_Profil_Lulusan.xlsx. Komentar mengikuti rumus "Generator komentar" di file itu:
   skor 3-4 = kekuatan ("sudah baik"/"sangat baik ... dengan mampu ..."), skor 1-2 = "masih perlu berlatih dalam ...". */
const KOKU_SCALE={4:{id:'Sangat Baik',en:'Very Good'},3:{id:'Baik',en:'Good'},2:{id:'Cukup',en:'Fair'},1:{id:'Perlu Bimbingan',en:'Needs Guidance'}};
const KOKURIKULER={
 1:{id:'Smart HydroTech Garden (Berkebun Tanpa Tanah, Belajar Bersyukur pada Tumbuhan)',en:'Smart HydroTech Garden (Soil-free Gardening, Learning Gratitude for Plants)',dims:[
  {id:'Penalaran Kritis',en:'critical reasoning',kuat:'membandingkan kangkung yang ditanam di tanah dan secara hidroponik dari berbagai aspek beserta alasannya',latih:'menjelaskan sebab-akibat pertumbuhan kangkung berdasarkan data pengamatan',kuat_en:'comparing water spinach grown in soil and hydroponically from several aspects with reasons',latih_en:'explaining the causes of water spinach growth based on observation data'},
  {id:'Kolaborasi',en:'collaboration',kuat:'bekerja sama dalam menanam dan merawat kangkung serta menghargai pendapat teman',latih:'berbagi tugas dan menghargai pendapat teman dalam menanam dan merawat kangkung',kuat_en:"working together to plant and care for water spinach and respecting friends' opinions",latih_en:"sharing tasks and respecting friends' opinions while planting and caring for water spinach"}]},
 2:{id:'Aqua Farm (Merawat Ikan, Belajar Tanggung Jawab)',en:'Aqua Farm (Caring for Fish, Learning Responsibility)',dims:[
  {id:'Kolaborasi',en:'collaboration',kuat:'bekerja sama dalam merawat ikan lele dan menghargai pendapat teman',latih:'berbagi tugas dan menghargai pendapat teman dalam merawat ikan lele',kuat_en:"working together to care for the catfish and respecting friends' opinions",latih_en:"sharing tasks and respecting friends' opinions while caring for the catfish"},
  {id:'Penalaran Kritis',en:'critical reasoning',kuat:'menjelaskan kebutuhan hidup ikan lele dan menalar kondisinya berdasarkan pengamatan',latih:'menjelaskan sebab-akibat kondisi ikan lele berdasarkan data pengamatan',kuat_en:"explaining the catfish's needs and reasoning about its condition from observations",latih_en:"explaining the causes of the catfish's condition based on observation data"}]},
 3:{id:'Every Drop Matters (Setiap Tetes Air Berharga)',en:'Every Drop Matters',dims:[
  {id:'Penalaran Kritis',en:'critical reasoning',kuat:'menjelaskan pentingnya air bersih dan angin bagi makhluk hidup beserta alasannya',latih:'menjelaskan pentingnya air bersih dan angin dengan alasan yang tepat',kuat_en:'explaining the importance of clean water and wind for living things with reasons',latih_en:'explaining the importance of clean water and wind with sound reasons'},
  {id:'Kreativitas',en:'creativity',kuat:'merancang dan membuat penyaring air sederhana dengan ide yang orisinal',latih:'mengembangkan ide-ide baru untuk memperbaiki rancangan penyaring air',kuat_en:'designing and making a simple water filter with original ideas',latih_en:'developing new ideas to improve the water filter design'}]},
 4:{id:'Young Scientists Explore (Menjadi Ilmuwan Cilik yang Berpikir seperti Ulil Albab)',en:'Young Scientists Explore (Thinking like Ulil Albab)',dims:[
  {id:'Penalaran Kritis',en:'critical reasoning',kuat:'merumuskan pertanyaan sains dari kejadian sehari-hari dan menalar jawabannya berdasarkan bukti',latih:'merumuskan pertanyaan sains dan menalar jawabannya berdasarkan bukti percobaan',kuat_en:'forming science questions from everyday events and reasoning answers from evidence',latih_en:'forming science questions and reasoning answers from experimental evidence'},
  {id:'Kolaborasi',en:'collaboration',kuat:'bekerja sama dalam percobaan kelompok dan menghargai pendapat teman',latih:'berbagi tugas dan menghargai pendapat teman dalam kerja kelompok',kuat_en:"working together in group experiments and respecting friends' opinions",latih_en:"sharing tasks and respecting friends' opinions in group work"}]},
 5:{id:'Healthy Food Through Fermentation (Makanan Sehat dari Proses Fermentasi yang Halal & Thoyyib)',en:'Healthy Food Through Fermentation (Halal & Thoyyib)',dims:[
  {id:'Kreativitas',en:'creativity',kuat:'membuat tempe dan yogurt dengan ide sendiri dan hasil yang baik',latih:'mengembangkan ide-ide baru dalam membuat dan menyajikan tempe dan yogurt',kuat_en:'making tempeh and yogurt with their own ideas and good results',latih_en:'developing new ideas for making and serving tempeh and yogurt'},
  {id:'Penalaran Kritis',en:'critical reasoning',kuat:'menjelaskan pengertian fermentasi dan peran mikroorganisme secara sederhana',latih:'menjelaskan pengertian fermentasi dan peran mikroorganisme dengan alasan yang tepat',kuat_en:'explaining fermentation and the role of microorganisms simply',latih_en:'explaining fermentation and the role of microorganisms with sound reasons'}]},
 6:{id:'Smart City (Berinovasi dan Berteknologi)',en:'Smart City (Innovation and Technology)',dims:[
  {id:'Komunikasi',en:'communication',kuat:'mempresentasikan hasil proyek secara runtut, percaya diri, dan menarik',latih:'mempresentasikan hasil proyek secara runtut dan percaya diri',kuat_en:'presenting project results in an orderly, confident and engaging way',latih_en:'presenting project results in an orderly and confident way'},
  {id:'Kreativitas',en:'creativity',kuat:'menghasilkan gagasan inovatif dan media visual yang menarik',latih:'mengembangkan gagasan inovatif dan media visual yang menarik',kuat_en:'producing innovative ideas and engaging visual media',latih_en:'developing innovative ideas and engaging visual media'}]}
};
// rubric: rubrik hasil upload Akademik untuk periode & jenjang ini; tanpa itu dipakai rubrik bawaan di atas.
// Rapor English memakai frasa English bila ada di rubrik; bila belum ada, komentar memakai kalimat Indonesia.
function kokuComment(name,grade,scores,lang,rubric){const p=rubric&&Array.isArray(rubric.dims)&&rubric.dims.length===2?rubric:KOKURIKULER[Number(grade)];if(!p)return'';const a=Number(scores?.a),b=Number(scores?.b);if(!(a>=1&&a<=4)||!(b>=1&&b<=4))return'';const[A,B]=p.dims,nm=String(name||'').trim();
 if(lang==='en'&&!(A.en&&B.en&&A.kuat_en&&A.latih_en&&B.kuat_en&&B.latih_en))lang='id';
 if(lang==='en'){const lv=s=>s===4?'very good':'good';if(a>=3&&b>=3)return`${nm} shows ${lv(a)} ${A.en} in ${A.kuat_en}, as well as ${lv(b)} ${B.en} in ${B.kuat_en}.`;if(a>=3)return`${nm} shows ${lv(a)} ${A.en} in ${A.kuat_en}, and still needs practice in ${B.latih_en}.`;if(b>=3)return`${nm} shows ${lv(b)} ${B.en} in ${B.kuat_en}, and still needs practice in ${A.latih_en}.`;return`${nm} still needs practice in ${A.latih_en}, as well as in ${B.latih_en}.`}
 const lv=s=>s===4?'sangat baik':'sudah baik';if(a>=3&&b>=3)return`Ananda ${nm} ${lv(a)} dalam ${A.id.toLowerCase()} dengan mampu ${A.kuat}, serta ${lv(b)} dalam ${B.id.toLowerCase()} dengan mampu ${B.kuat}.`;
 if(a>=3)return`Ananda ${nm} ${lv(a)} dalam ${A.id.toLowerCase()} dengan mampu ${A.kuat}, dan masih perlu berlatih dalam ${B.latih}.`;if(b>=3)return`Ananda ${nm} ${lv(b)} dalam ${B.id.toLowerCase()} dengan mampu ${B.kuat}, dan masih perlu berlatih dalam ${A.latih}.`;return`Ananda ${nm} masih perlu berlatih dalam ${A.latih}, serta dalam ${B.latih}.`}
window.CQ_SEMESTER_CATALOG={KEPRIBADIAN,SIKAP,PSIKOMOTOR,LEGEND,GRADES,KOKURIKULER,KOKU_SCALE,kokuComment};

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
 {key:'ips',re:/\bips\b|pengetahuan sosial|social sciences|\bsosial\b/,en:'Social Sciences',group:'main',kind:'umum'},
 {key:'sbdp',re:/seni|sbdp|prakarya|arts/,en:'Arts, Culture, and Crafts',group:'main',kind:'umum'},
 {key:'pjok',re:/pjok|jasmani|penjas|physical/,en:'Physical Education, Sports, and Health',group:'main',kind:'umum'}
];
function classify(subject){const n=String(subject?.name||'').toLowerCase();return SUBJECTS.find(s=>s.re.test(n))||{key:'',en:'',group:'main',kind:'umum'}}
function subjectName(subject,lang){const c=classify(subject);if(lang==='en'&&c.en)return c.en;if(c.key==='pkn')return'Pendidikan Pancasila';return String(subject?.name||'-')}
/* Sistem penilaian — sama dengan cq-scoring.js (dipakai bila file itu belum dimuat, mis. di tes). */
const SC=(typeof window!=='undefined'&&window.CQ_SCORE)||(()=>{const num=v=>{if(v===null||v===undefined||String(v).trim()==='')return null;const n=Number(v);return Number.isFinite(n)?n:null};const avg=a=>a.reduce((x,y)=>x+y,0)/a.length,r2=n=>Math.round(n*100)/100;
 return{num,rapor:x=>{const n0=num(x);if(n0===null)return null;let n=Math.round(n0);if(n%10===4||n%10===9)n+=1;return Math.max(77,Math.min(96,n))},
  tpScore:(tasks,tp,wwp,asas)=>{const t=(tasks||[]).map(num).filter(x=>x!==null);if(!t.length||num(tp)===null||num(wwp)===null||num(asas)===null)return null;return r2(avg(t)*.1+num(tp)*.3+num(wwp)*.2+num(asas)*.4)},
  letter:x=>{const n=num(x);if(n===null)return'';return n>=89?'A':n>=82?'B':n>=75?'C':'D'},
  tpLetter:x=>{const n=num(x);if(n===null)return'';return n>=89?'A':n>=82?'B':'C'}}})();
// Nilai per TP (Penilaian Intrakurikuler & narasi IKM): Tugas 10% + TP itu 30% + WWP 20% + ASAS 40%; kosong bila komponen belum lengkap.
function tpScores(a,n){a=a||{};return Array.from({length:n},(_,i)=>SC.tpScore(a.tasks,(a.tp||[])[i],a.wwp,a.asas))}
// KKTP = rentang KKTP rapor PTS: nilai dari server rapor PTS bila ada, kalau tidak pakai tabel KKTP PTS.
const PTS_KKTP={akidah:'78 - 81',fikih:'79 - 82',adab:'79 - 82',hadits:'82 - 85',pkn:'79 - 82',indo:'77 - 80',mtk:'76 - 79',ipa:'75 - 78',ips:'76 - 79',ipas:'75 - 79',sbdp:'78 - 81',pjok:'78 - 81',arab:'77 - 80',inggris:'77 - 80',sunda:'76 - 79',siroh:'78 - 81',tajwid:'77 - 80'};
function kktpFor(subject,ptsRows){const k=classify(subject).key;const row=(ptsRows||[]).find(r=>k&&classify(r).key===k);const v=String(row?.kktp??'').trim();if(v&&v!=='-'&&!/^0(?:[.,]0+)?$/.test(v))return v;return PTS_KKTP[k]||'-'}
function kktpMin(subject,ptsRows){const m=String(kktpFor(subject,ptsRows)).match(/\d+/);return m?Number(m[0]):null}
// Mapel ganda (mis. "PKN" kosong dan "Pancasila" berisi nilai) cukup tampil sekali.
function uniqueSubjects(subjects){const seen=new Map(),out=[];const has=s=>(s.objectives||[]).length>0;
 for(const s of subjects||[]){const k=classify(s).key;if(k!=='pkn'){out.push(s);continue}const prev=seen.get(k);if(!prev){seen.set(k,s);out.push(s);continue}if(!has(prev)&&has(s)){out[out.indexOf(prev)]=s;seen.set(k,s)}}return out}

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
  nilai:'NILAI RAPOR',psik:'PENILAIAN KOKURIKULER',intra:'PENILAIAN INTRAKURIKULER',sikap:'PENILAIAN SIKAP',kom:'KOMENTAR UMUM',
  lphb:'LAPORAN PENILAIAN HASIL BELAJAR SISWA',no:'NO',subject:'MATA PELAJARAN',kktp:'KKTP',score:'NILAI',num:'ANGKA',words:'HURUF',
  pai:'Pendidikan Agama Islam dan Budi Pekerti',mulok:'Muatan Lokal',kepribadian:'KEPRIBADIAN',value:'NILAI',absence:'KETIDAKHADIRAN',days:'HARI',sick:'Sakit',excused:'Izin',unexcused:'Tanpa Keterangan',
  parent:'Orang Tua / Wali',homeroom:'Wali Kelas',principal:'Kepala Sekolah',partner:'Guru Partner',page:(i,n)=>`Halaman ${i}${n?` | ${n}`:''}`,noComment:'',noTp:'Tujuan pembelajaran belum diatur.',noSubject:'Belum ada mata pelajaran untuk kelompok ini.',
  masehi:d=>d?new Intl.DateTimeFormat('id-ID',{day:'2-digit',month:'long',year:'numeric'}).format(d)+' M':'-',hijriSuffix:' H',incomplete:'Nilai belum lengkap'},
 en:{sem:n=>Number(n)===2?'II (Two)':'I (One)',year:'Academic Year',name:'Name',nameLong:'Student Name',cls:'Class',semL:'Semester',school:'School',
  nilai:'SEMESTER REPORT CARD',psik:'CO-CURRICULAR ASSESSMENT',intra:'INTRACURRICULAR ASSESSMENT',sikap:'ATTITUDE ASSESSMENT',kom:'GENERAL COMMENTS',
  lphb:'STUDENT LEARNING ACHIEVEMENT REPORT',no:'NO',subject:'SUBJECT',kktp:'KKTP',score:'SCORE',num:'NUMBER',words:'IN WORDS',
  pai:'Islamic Studies',mulok:'Local Content Subjects',kepribadian:'PERSONALITY',value:'RATING',absence:'ABSENCES',days:'DAYS',sick:'Illness',excused:'Excused',unexcused:'Unexcused',
  parent:'Parent / Guardian',homeroom:'Homeroom Teacher',principal:'Principal',partner:'Partner Teacher',page:(i,n)=>`Page ${i}${n?` | ${n}`:''}`,noComment:'',noTp:'Learning objectives have not been set.',noSubject:'No subjects in this group yet.',
  masehi:d=>d?new Intl.DateTimeFormat('en-GB',{day:'2-digit',month:'long',year:'numeric'}).format(d)+' CE':'-',hijriSuffix:' AH',incomplete:'Incomplete scores'}
};
// Rapor Tahfizh (3 lembar) dicetak terpisah tetapi nomor halamannya disisakan setelah halaman Sikap/Adab.
const TAHFIZH_PAGES=3;
const LOGO='rapor-semester-logo.png',FOOTER='rapor-semester-footer.jpg';

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function letters(i){return String.fromCharCode(97+i)}

/* ---------- Gaya (mengikuti sheet cetak Excel) ---------- */
// CQlass theme CSS (cq-global-role-theme.css) sets font, 13px font-size, 8px cell padding and line-height on every
// #app-screen .content element with !important / high specificity. To keep the Excel geometry, every rule below is
// emitted twice (plain and prefixed with "#app-screen#app-screen .content") and every declaration gets !important.
// The doubled id outranks the theme's "#app-screen :is(...):not(...)x6" font rule (specificity 1,6,1).
const RAPOR_CSS=`
.srp-page,.srp-page *{font-family:Tahoma,Verdana,sans-serif;box-sizing:border-box}
.srp-title,.srp-id,.srp-id *,.srp-sign,.srp-sign *{font-family:'Segoe UI',Tahoma,Arial,sans-serif}
.srp-page{display:flex;flex-direction:column;padding:13mm 14mm 32mm 15mm;font-size:8pt;line-height:1.3;color:#111}
.srp-title{font-weight:700;font-size:12pt;line-height:1.3;letter-spacing:.2px;width:max-content;max-width:100%;min-width:69mm;margin:0 0 3mm auto;white-space:nowrap}
.srp-id{display:grid;grid-template-columns:1fr 20mm 1fr;align-items:center;column-gap:4mm;margin:0 0 6mm;font-size:8pt;line-height:1.3}
.srp-id img{width:20mm;height:20mm;max-width:none;object-fit:contain}
.srp-kv{display:grid;grid-template-columns:auto 4mm 1fr;row-gap:2mm;align-items:baseline}.srp-kv span{font-size:8pt;line-height:1.3}.srp-kv .v{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.srp-kv.r{grid-template-columns:24mm 4mm 1fr}.srp-kv.l{grid-template-columns:14mm 4mm 1fr}
.srp-nid{display:grid;grid-template-columns:1fr 64mm 20mm;align-items:start;column-gap:3mm;margin:0 0 5mm;font-size:8pt;line-height:1.3}
.srp-nid .srp-kv.l{grid-template-columns:26mm 4mm 1fr}.srp-nid img{width:20mm;height:20mm;max-width:none;object-fit:contain;margin-top:-3mm}
.srp-big{text-align:center;font-weight:700;font-size:16pt;line-height:1.25;margin:1mm 0 6mm;letter-spacing:.3px}
.srp-t{width:100%;min-width:0;max-width:100%;border-collapse:collapse;table-layout:fixed;border:1.6px solid #000;font-size:8pt;line-height:1.25;margin:0}
.srp-t td,.srp-t th{border:.6px solid #000;padding:1mm 1.6mm;vertical-align:middle;font-size:8pt;line-height:1.25;height:auto;min-width:0;background:#fff;color:#111;text-transform:none}
.srp-t .hd th,.srp-t th.hd{background:#ffffcc;font-weight:900;text-align:center}.srp-t .hd th.title{text-align:left;font-size:10pt;letter-spacing:.2px}
.srp-t .code{text-align:center;font-weight:900;font-size:10pt}.srp-t .c{text-align:center}.srp-t .ck{text-align:center;font-size:7.5pt}
.srp-t .sh td{font-weight:900}.srp-t .grey{background:#e6e6e6}.srp-t .sub{padding-left:3mm}.srp-t .bul{display:inline-block;width:2.6mm;height:2.6mm;background:#111;margin:0 3mm 0 1mm;vertical-align:middle}
.srp-t .muted{color:#666;font-style:italic}.srp-gap{height:3.5mm}
.srp-box{display:inline-block;width:3.4mm;height:3.4mm;border:1px solid #333;vertical-align:middle;background:#fff}.srp-box.on{background:#111;border-color:#111}
.srp-legend{font-size:8pt;font-style:italic;margin:3mm 0 0 10mm}
.srp-two{display:grid;grid-template-columns:1fr 1fr;column-gap:16mm;align-items:start;margin-top:6mm}
.srp-sign-area{margin-top:4mm}
.srp-date{text-align:center;line-height:1.7;margin-bottom:1mm;font-size:8pt}.srp-date div,.srp-date u{font-size:8pt}
.srp-sign{display:grid;grid-template-columns:1fr 1fr 1fr;column-gap:4mm;text-align:center;font-size:8pt;line-height:1.3}
.srp-sign>div{position:relative;min-height:28mm;display:flex;flex-direction:column;align-items:center;font-size:8pt}
.srp-sign .name{margin-top:auto;text-decoration:underline;white-space:nowrap;font-size:8pt}.srp-sign .line{margin-top:auto;width:70%;border-bottom:1px solid #111;height:1px}
.srp-sign img{position:absolute;top:5mm;left:0;right:0;margin:0 auto;transform:none;max-width:44mm;max-height:20mm;object-fit:contain}
.srp-comment{border:1.6px solid #000}.srp-comment .band{height:6.5mm;background:#ffffcc}.srp-comment .body{min-height:82mm;padding:4mm 5mm;border-top:1.6px solid #000;border-bottom:1.6px solid #000;font-size:9.5pt;line-height:1.6;white-space:pre-wrap;text-align:justify}
.srp-foot{position:absolute;left:0;right:0;bottom:0;height:26.4mm;padding:0;margin:0}.srp-foot img{display:block;width:100%;height:100%;max-width:none;object-fit:fill}
.srp-sec{font-weight:700;font-size:9pt;line-height:1.3;margin:4mm 0 1.5mm}.srp-sub{font-weight:700;font-size:8pt;margin:2.5mm 0 1mm}
.srp-ikm td,.srp-ikm th{vertical-align:middle}.srp-ikm td.cap{text-align:left;font-size:7.5pt;line-height:1.3;padding:1.2mm 2mm}.srp-ikm td.nob{border-top:0;border-bottom:0}
.srp-soon{height:14mm;text-align:center;font-style:italic;color:#666}
.srp-koku{padding:2mm 3mm;line-height:1.4}.srp-koku-p{font-size:8pt}.srp-koku-d{font-size:7.5pt;color:#444;margin:.6mm 0 1mm}.srp-koku-c{font-size:8pt;text-align:justify}
.srp-half{width:64%}.srp-absrow{display:grid;grid-template-columns:64% 1fr;column-gap:5mm;align-items:center}.srp-absrow .srp-half{width:100%}
.srp-dec{text-align:center;line-height:1.6;font-size:8pt}.srp-dec div,.srp-dec b{font-size:8pt}
.srp-pno{position:absolute;right:14mm;bottom:27.5mm;max-width:120mm;text-align:right;font-size:7.5pt;line-height:1.3;color:#555;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding-right:2mm;border-right:2px solid #b5174f}
`;
function hardenCss(css){return css.replace(/([^{}]+)\{([^{}]*)\}/g,(m,sel,decl)=>{const sels=sel.split(',').map(x=>x.trim()).filter(Boolean);const all=[...sels,...sels.map(x=>'#app-screen#app-screen .content '+x)];const d=decl.split(';').map(x=>x.trim()).filter(Boolean).map(x=>/!important$/.test(x)?x:x+'!important').join(';');return'\n'+all.join(',')+'{'+d+'}'})}
// Cetak ke printer = tanda tangan basah: gambar tanda tangan elektronik disembunyikan. Simpan PDF (html2canvas)
// memakai tampilan layar, jadi tanda tangan elektronik tetap ada di file PDF.
const PRINT_CSS=`@media print{.srp-page .srp-sign img,#app-screen#app-screen .content .srp-page .srp-sign img{display:none!important;visibility:hidden!important}}`;
function injectStyles(){if(document.getElementById('cq-semester-print-style'))return;const s=document.createElement('style');s.id='cq-semester-print-style';s.textContent=hardenCss(RAPOR_CSS)+'\n'+PRINT_CSS;document.head.appendChild(s)}

/* ---------- Bagian halaman ---------- */
function headHtml(ctx,title){const L=T[ctx.lang],st=ctx.student;return`<div class="srp-title">${esc(title)}</div>
<div class="srp-id"><div class="srp-kv l"><span>${L.name}</span><span>:</span><span class="v">${esc(st.name||'')}</span><span>${L.cls}</span><span>:</span><span class="v">${esc(ctx.className||'-')}</span></div><img src="${LOGO}" alt=""><div class="srp-kv r"><span>${L.semL}</span><span>:</span><span>${esc(L.sem(ctx.semester))}</span><span>${L.year}</span><span>:</span><span>${esc(ctx.year||'-')}</span></div></div>`}
function boxes(selected){return GRADES.map(g=>`<td class="c"><span class="srp-box${selected===g?' on':''}" aria-label="${g}${selected===g?' ✓':''}"></span></td>`).join('')}
// third==='partner': halaman Komentar ditandatangani Guru Partner (bukan Kepala Sekolah).
// Gambar tanda tangan elektronik hanya untuk Simpan PDF; saat dicetak ke printer gambar disembunyikan (tanda tangan basah).
function signHtml(ctx,third){const L=T[ctx.lang],tr=ctx.teachers||{},pt=ctx.partner||{};let d=null;if(ctx.printDate){const x=new Date(ctx.printDate+'T00:00:00');if(!Number.isNaN(x.getTime()))d=x}
 const hijri=String(ctx.hijri||'').trim();const hijriLine=hijri?`Depok, ${esc(hijri)}${/\b(H|AH|M|CE)$/i.test(hijri)?'':L.hijriSuffix}`:'';
 const img=u=>u?`<img crossorigin="anonymous" src="${esc(u)}" alt="">`:'';
 const homeroom=`<div>${L.homeroom}${img(tr.homeroom_signature_url)}<div class="name">${esc(tr.homeroom||'_______________')}</div></div>`;
 return`<div class="srp-sign-area"><div class="srp-date">${hijriLine?`<div><u>${hijriLine}</u></div><div>${esc(L.masehi(d))}</div>`:`<div><u>Depok, ${esc(L.masehi(d))}</u></div>`}</div>
<div class="srp-sign"><div>${L.parent}<div class="line"></div></div>${third==='partner'?`${homeroom}<div>${L.partner}${img(pt.signature_url)}<div class="name">${esc(pt.name||'_______________')}</div></div>`:`<div>${L.principal}${img(tr.principal_signature_url)}<div class="name">${esc(tr.principal||'_______________')}</div></div>${homeroom}`}</div></div>`}

// Returns 1 page, or 2 when the subject table is too long (then Kepribadian, Ketidakhadiran and signatures move to page 2 with the standard header).
// Measured in Chrome with the CQlass theme loaded: table starts at 61mm, header 11.5mm, one-line row 5.75mm, bottom block 73mm;
// keep the last signature line at most 256mm so it stays clear of the "Halaman N | Nama" line (266mm).
function nilaiPages(ctx){const L=T[ctx.lang],subs=uniqueSubjects(ctx.subjects),acad=ctx.academic||{},st=ctx.student;let estRows=0;
 // KKTP = rentang KKTP yang sama dengan rapor PTS.
 const kk=s=>kktpFor(s,ctx.ptsAcademic);
 const cells=s=>{const f=(acad[s.id]||{}).final;return`<td class="c">${esc(kk(s))}</td><td class="c">${f==null?'-':f}</td><td${f==null?' class="muted"':''}>${f==null?esc(L.incomplete):esc(terbilang(f,ctx.lang))}</td>`};
 const lineRows=n=>Math.max(1,Math.ceil(String(n||'').length/46));
 const group=(no,label,list)=>{estRows+=1+list.reduce((a,s)=>a+lineRows(subjectName(s,ctx.lang)),0);return`<tr><td class="c" rowspan="${list.length+1}">${no}</td><td>${esc(label)}</td><td class="grey"></td><td class="grey" colspan="2"></td></tr>`+list.map(s=>`<tr><td class="sub"><span class="bul"></span>${esc(subjectName(s,ctx.lang))}</td>${cells(s)}</tr>`).join('')};
 const pai=subs.filter(s=>classify(s).group==='pai'),mulok=subs.filter(s=>classify(s).group==='mulok'),main=subs.filter(s=>classify(s).group==='main');let no=0,body='';
 if(pai.length)body+=group(++no,L.pai,pai);
 for(const s of main){estRows+=lineRows(subjectName(s,ctx.lang));body+=`<tr><td class="c">${++no}</td><td>${esc(subjectName(s,ctx.lang))}</td>${cells(s)}</tr>`}
 if(mulok.length)body+=group(++no,L.mulok,mulok);
 if(!body)body=`<tr><td colspan="5" class="c muted">${L.noSubject}</td></tr>`;
 const kp=(ctx.entry||{}).kepribadian||{},att=ctx.attendance||{};
 const top=`<div class="srp-title">${esc(L.nilai)}</div>
<div class="srp-nid"><div class="srp-kv l"><span>${L.school}</span><span>:</span><span class="v">${SCHOOL}</span><span>${L.nameLong}</span><span>:</span><span class="v">${esc(st.name||'')}</span><span>NISN</span><span>:</span><span class="v">${esc(st.nisn||'-')}</span><span>NPSN</span><span>:</span><span class="v">70004670</span></div><div class="srp-kv r"><span>${L.cls}</span><span>:</span><span class="v">${esc(ctx.className||'-')}</span><span>${L.semL}</span><span>:</span><span>${esc(L.sem(ctx.semester))}</span><span>${L.year}</span><span>:</span><span>${esc(ctx.year||'-')}</span></div><img src="${LOGO}" alt=""></div>
<div class="srp-big">${L.lphb}</div>
<table class="srp-t"><colgroup><col style="width:7%"><col style="width:44%"><col style="width:12%"><col style="width:10%"><col></colgroup><thead><tr class="hd"><th rowspan="2">${L.no}</th><th rowspan="2">${L.subject}</th><th rowspan="2">${L.kktp}</th><th colspan="2">${L.score}</th></tr><tr class="hd"><th>${L.num}</th><th>${L.words}</th></tr></thead><tbody>${body}</tbody></table>`;
 const bottom=`<div class="srp-two"><table class="srp-t"><colgroup><col style="width:13%"><col><col style="width:26%"></colgroup><thead><tr class="hd"><th>${L.no}</th><th>${L.kepribadian}</th><th>${L.value}</th></tr></thead><tbody>${KEPRIBADIAN.map((k,i)=>`<tr><td class="c">${i+1}</td><td>${esc(k[ctx.lang])}</td><td class="c">${esc(kp[k.key]||'-')}</td></tr>`).join('')}</tbody></table>
<table class="srp-t"><colgroup><col><col style="width:30%"></colgroup><thead><tr class="hd"><th>${L.absence}</th><th>${L.days}</th></tr></thead><tbody>${[[L.sick,att.sick],[L.excused,att.excused],[L.unexcused,att.unexcused]].map(([l,v])=>`<tr><td><span class="bul" style="margin-left:0"></span>${l}</td><td class="c">${Number(v)||0}</td></tr>`).join('')}</tbody></table></div>`+signHtml(ctx);
 return 61+11.5+estRows*5.75+73<=256?[top+bottom]:[top,headHtml(ctx,L.nilai)+bottom.replace('class="srp-two"','class="srp-two" style="margin-top:0"')]}

/* Paginate blocks of rows onto A4 pages using an estimated height budget (mm). */
function paginate(blocks,budget){const pages=[];let cur=[],used=0;for(const b of blocks){if(cur.length&&used+b.h>budget){pages.push(cur);cur=[];used=0}cur.push(b);used+=b.h}if(cur.length)pages.push(cur);return pages.length?pages:[[]]}
// Calibrated in Chrome on A4 (Tahoma 10.5px, ~118mm label column): one line ≈ 5.6mm, each extra line ≈ +3.9mm.
const rowH=text=>1.7+3.9*Math.max(1,Math.ceil(String(text||'').length/80));
function gradeBlocks(groups,ctx){return groups.map(g=>({h:7.5+g.rows.reduce((n,r)=>n+rowH(r.label)+(r.subhead?5.6:0),0)+3.5,html:`<table class="srp-t"><colgroup><col style="width:6.5%"><col><col style="width:7.5%"><col style="width:7.5%"><col style="width:7.5%"><col style="width:7.5%"></colgroup><thead><tr class="hd"><th class="code">${esc(g.code)}</th><th class="title">${esc(g.title)}</th>${GRADES.map(x=>`<th>${x}</th>`).join('')}</tr></thead><tbody>${g.rows.length?g.rows.map(r=>`${r.subhead?`<tr class="sh"><td></td><td colspan="5">${esc(upPjbl(r.subhead))}</td></tr>`:''}<tr><td class="ck">✔</td><td>${esc(r.label)}</td>${boxes(r.grade)}</tr>`).join(''):`<tr><td></td><td colspan="5" class="muted">${esc(T[ctx.lang].noTp)}</td></tr>`}</tbody></table><div class="srp-gap"></div>`}))}
function intraGroups(ctx){const acad=ctx.academic||{};const list=uniqueSubjects(ctx.subjects.filter(s=>!s.virtual_from));const ordered=[...list.filter(s=>classify(s).kind==='diniyah'),...list.filter(s=>classify(s).kind!=='diniyah')];return ordered.map((s,idx)=>{const n=(s.objectives||[]).length,sc=tpScores(acad[s.id],n);return{code:String(idx+1).padStart(2,'0'),title:subjectName(s,ctx.lang).toUpperCase(),rows:(s.objectives||[]).map((o,i)=>({label:(ctx.lang==='en'&&String(o.description_en||'').trim())||o.description||`TP ${i+1}`,grade:SC.tpLetter(sc[i])}))}})}
function sikapGroups(ctx){const v=ctx.entry?.sikap||{};return SIKAP.map(c=>({code:c.code,title:c[ctx.lang].toUpperCase(),rows:c.items.map(([k,id,en])=>({label:ctx.lang==='en'?en:id,grade:v[k]||''}))}))}
const upPjbl=t=>String(t).toUpperCase().replace(/PJBL/g,'PjBL');
function psikGroups(ctx){const v=ctx.entry?.psikomotor||{};return PSIKOMOTOR.map(c=>({code:c.code,title:upPjbl(c[ctx.lang]),rows:c.groups.flatMap(g=>g.items.map(([k,id,en],i)=>({subhead:i===0?g[ctx.lang]:'',label:ctx.lang==='en'?en:id,grade:v[k]||''})))}))}
function blockPages(ctx,title,groups,legendKey){const L=T[ctx.lang];if(!groups.length)return[headHtml(ctx,title)+`<p class="muted">${L.noSubject}</p>`];return paginate(gradeBlocks(groups,ctx),206).map(p=>headHtml(ctx,title)+p.map(b=>b.html).join('')+`<div class="srp-legend">${esc(LEGEND[legendKey][ctx.lang])}</div>`)}
function komentarPage(ctx){const L=T[ctx.lang],c=String(ctx.entry?.komentar||'').trim();return headHtml(ctx,L.kom)+`<div class="srp-comment"><div class="band"></div><div class="body">${c?esc(c):''}</div><div class="band"></div></div>`+signHtml(ctx,'partner')}

/* ---------- Rapor IKM (sheet XDESK) ---------- */
// Nilai dan capaian mengikuti rumus Excel XDESK/DESKRIP: PAI = rata-rata Akidah, Fikih, Adab, Arab, Hadits, Siroh;
// IPAS = rata-rata IPA dan IPS; prestasi A>=90, B>=80, C>=65, D; capaian = TP nilai tertinggi dan terendah.
const IKM_KKM=70;
// Characters per line in the capaian column (Tahoma 7.5pt, ~98mm); measured in Chrome with the CQlass theme.
const CAP_CHARS=64;
const IKM_ROWS=[
 {id:'Pendidikan Agama Islam',en:'Islamic Religious Education',keys:['akidah','fikih','adab','arab','hadits','siroh']},
 {id:'Pendidikan Pancasila',en:'Pancasila Education',keys:['pkn']},
 {id:'Bahasa Indonesia',en:'Bahasa Indonesia',keys:['indo']},
 {id:'Matematika',en:'Mathematics',keys:['mtk']},
 {id:'Ilmu Pengetahuan Alam dan Sosial',en:'Natural and Social Sciences',keys:['ipas','ipa','ips']},
 {id:'Pendidikan Seni Budaya dan Prakarya',en:'Arts, Culture, and Crafts',keys:['sbdp']},
 {id:'Pendidikan Jasmani, Olahraga, dan Kesehatan',en:'Physical Education, Sports, and Health',keys:['pjok']}
];
const IKM_MULOK=[{id:'Bahasa Arab',en:'Arabic Language',keys:['arab']},{id:'Bahasa Inggris',en:'English',keys:['inggris']},{id:'Bahasa Sunda',en:'Sundanese Language',keys:['sunda']},{id:'Siroh',en:'Seerah (Prophetic Biography)',keys:['siroh']}];
function ikmLetter(n){return n==null?'':SC.letter(n)}
const IKM_WORD={id:{A:'sangat baik dalam',B:'baik dalam',C:'cukup baik dalam',D:'kurang baik dalam'},en:{A:'excellent',B:'good',C:'fair',D:'limited'}};
function tpPhrase(text,lang){let s=String(text||'').trim().replace(/[.\s]+$/,'');if(lang==='en')s=s.replace(/^(students?|the student)\s+(is|are)\s+able\s+to\s+/i,'').replace(/^is\s+able\s+to\s+/i,'');else s=s.replace(/^peserta\s+didik\s+/i,'').replace(/^(mampu|dapat)\s+/i,'');return s?s.charAt(0).toLowerCase()+s.slice(1):s}
function ikmEval(ctx,keys){const acad=ctx.academic||{};const subs=uniqueSubjects(ctx.subjects).filter(s=>keys.includes(classify(s).key)&&(s.objectives||[]).length);if(!subs.length)return null;
 // Nilai akhir = nilai rapor tiap mapel; gabungan (PAI, IPAS) dirata-rata lalu diberi aturan nilai rapor lagi.
 const finals=subs.map(s=>(acad[s.id]||{}).final);const final=finals.every(f=>f!=null)?SC.rapor(finals.reduce((a,b)=>a+b,0)/finals.length):null;
 // Narasi: TP dengan nilai per TP tertinggi dan terendah (Tugas 10% + TP 30% + WWP 20% + ASAS 40%).
 let hi=null,lo=null;for(const s of subs){const sc=tpScores(acad[s.id],(s.objectives||[]).length);(s.objectives||[]).forEach((o,i)=>{const v=sc[i];if(v==null)return;const d=(ctx.lang==='en'&&String(o.description_en||'').trim())||o.description;if(!hi||v>hi.v)hi={v,d};if(!lo||v<lo.v)lo={v,d}})}
 return{final,letter:ikmLetter(final),hi,lo}}
function capaian(ctx,ev){const nm=String(ctx.student.name||'').trim(),W=IKM_WORD[ctx.lang];if(!ev||!ev.hi)return'';const a=SC.tpLetter(ev.hi.v),b=SC.tpLetter(ev.lo.v),same=ev.hi===ev.lo||ev.hi.d===ev.lo.d;
 if(ctx.lang==='en')return`${nm} shows ${W[a]} achievement in ${tpPhrase(ev.hi.d,'en')}`+(same?'.':` and ${W[b]} achievement in ${tpPhrase(ev.lo.d,'en')}.`);
 return`Ananda ${nm} ${W[a]} ${tpPhrase(ev.hi.d,'id')}`+(same?'.':` dan ${W[b]} ${tpPhrase(ev.lo.d,'id')}.`)}
const ROMAN=['','I','II','III','IV','V','VI','VII'];
const GRADE_WORD={id:['','Satu','Dua','Tiga','Empat','Lima','Enam','Tujuh'],en:['','One','Two','Three','Four','Five','Six','Seven']};
const EKS_WORD={id:{A:'Sangat baik',B:'Baik',C:'Cukup',D:'Perlu bimbingan'},en:{A:'Excellent',B:'Good',C:'Fair',D:'Needs guidance'}};
function ekskulPredikat(e){const r=String(e.rating||'').trim().toUpperCase();if(GRADES.includes(r))return r;const v=[e.activity,e.skill].map(x=>({A:4,B:3,C:2,D:1})[String(x||'').toUpperCase()]).filter(Boolean);if(!v.length)return'';const m=Math.round(v.reduce((a,b)=>a+b,0)/v.length);return['','D','C','B','A'][m]}
function ikmEkskul(ctx){const list=[...(ctx.ekskul||[])];let i=list.findIndex(e=>/pramuka|scout/i.test(e.name||''));const pr=i>=0?list.splice(i,1)[0]:{name:'Pramuka',wajib:true};pr.name=ctx.lang==='en'?'Scouting (Pramuka)':'Pramuka';return[pr,...list.sort((a,b)=>String(a.name).localeCompare(String(b.name),'id'))]}
const IKM_T={
 id:{title:'NILAI RAPOR',kkm:()=>'A. Intrakurikuler',fase:'Fase',cont:'LAPORAN PENILAIAN HASIL BELAJAR SISWA',final:'NILAI AKHIR',prestasi:'PRESTASI',capaian:'CAPAIAN KOMPETENSI',mulok:'Muatan Lokal',
  koku:'B. Kokurikuler',kokuH:'Kokurikuler',soon:'Segera hadir — penilaian kokurikuler sedang disiapkan.',notGraded:'Belum dinilai.',eks:'C. Ekstrakurikuler',eksH:'Ekstrakurikuler',pred:'Predikat',ket:'Keterangan',external:'luar sekolah',
  tbbb:'D. Tinggi dan Berat Badan',aspek:'Aspek yang dinilai',tb:'Tinggi Badan',bb:'Berat Badan',cm:'cm',kg:'kg',kes:'E. Kondisi Kesehatan',fisik:'Aspek Fisik',dengar:'Pendengaran',lihat:'Penglihatan',gigi:'Gigi',kesLeg:'A = Sangat baik;  B = Baik;  C = Cukup;  D = Kurang baik',
  pres:'F. Prestasi',jenis:'Jenis Prestasi',absen:'G. Ketidakhadiran',absenH:'Ketidakhadiran',day:n=>`${n} hari`,keputusan:'Keputusan:',dasar:'Berdasarkan pencapaian seluruh kompetensi, peserta didik dinyatakan:',naik:(r,w)=>`Naik ke Kelas : ${r} (${w})`,tinggal:(r,w)=>`Tinggal di Kelas : ${r} (${w})`,lulus:'LULUS',belumLulus:'BELUM LULUS',
  kar:'H. Karakter dan Kedisiplinan',karA:'1. Rekap Pelanggaran',level:'Tingkat',inc:'Jumlah Kejadian',minor:'Ringan',moderate:'Sedang',severe:'Berat',vtot:p=>`Total Poin Pelanggaran: ${p} Poin`,karB:'2. Penghargaan dan Pembinaan',cat:'Kategori',pts:'Poin',award:'Penghargaan / Teladan',guided:'Poin berkurang melalui pembinaan',ftot:p=>`Total Poin Akhir: ${p} Poin`},
 en:{title:'SEMESTER REPORT',kkm:()=>'A. Intracurricular',fase:'Phase',cont:'STUDENT LEARNING ACHIEVEMENT REPORT',final:'FINAL SCORE',prestasi:'GRADE',capaian:'COMPETENCY ACHIEVEMENT',mulok:'Local Content Subjects',
  koku:'B. Co-curricular',kokuH:'Co-curricular',soon:'Coming soon — the co-curricular assessment is being prepared.',notGraded:'Not yet assessed.',eks:'C. Extracurricular Activities',eksH:'Extracurricular',pred:'Grade',ket:'Remarks',external:'outside school',
  tbbb:'D. Height and Weight',aspek:'Aspect',tb:'Height',bb:'Weight',cm:'cm',kg:'kg',kes:'E. Health Condition',fisik:'Physical Aspect',dengar:'Hearing',lihat:'Vision',gigi:'Teeth',kesLeg:'A = Very good;  B = Good;  C = Fair;  D = Poor',
  pres:'F. Achievements',jenis:'Achievement',absen:'G. Absences',absenH:'Absence',day:n=>`${n} day${Number(n)===1?'':'s'}`,keputusan:'Decision:',dasar:'Based on the achievement of all competencies, the student is declared:',naik:(r,w)=>`Promoted to Grade : ${r} (${w})`,tinggal:(r,w)=>`Retained in Grade : ${r} (${w})`,lulus:'GRADUATED',belumLulus:'NOT YET GRADUATED',
  kar:'H. Character and Discipline',karA:'1. Disciplinary Record Summary',level:'Level',inc:'Incidents',minor:'Minor',moderate:'Moderate',severe:'Severe',vtot:p=>`Total Violation Points: ${p} Points`,karB:'2. Merit and Guidance Record',cat:'Category',pts:'Points',award:'Achievement / Role Model Award',guided:'Points deducted through guidance',ftot:p=>`Final Total Points: ${p} Points`}
};
const dash=v=>{const s=String(v??'').trim();return s?esc(s):'-'};
function faseOf(g){g=Number(g)||0;return g>=5?'C':g>=3?'B':g>=1?'A':'-'}
function ikmPages(ctx){const L=T[ctx.lang],K=IKM_T[ctx.lang],st=ctx.student,en=ctx.lang==='en';
 // Rows of table A (each with an estimated height in mm; the capaian column holds ~60 characters per line).
 const rows=[];let no=0;const rowH=t=>Math.max(8,2.6+3.45*Math.ceil(String(t||'').length/CAP_CHARS));
 const subjRow=(label,ev,num,indent)=>{const cap=capaian(ctx,ev);const f=ev?ev.final:null;rows.push({h:rowH(cap),html:`<tr>${indent?'<td class="nob"></td>':`<td class="c">${num}</td>`}<td${indent?' class="sub"':''}>${indent?'<span class="bul"></span>':''}${esc(label)}</td><td class="c">${f==null?'-':f}</td><td class="c">${f==null?'-':ikmLetter(f)}</td><td class="cap">${cap?esc(cap):`<span class="muted">${esc(L.incomplete)}</span>`}</td></tr>`})};
 for(const r of IKM_ROWS){const ev=ikmEval(ctx,r.keys);if(ev)subjRow(en?r.en:r.id,ev,++no,false)}
 const mul=IKM_MULOK.map(r=>({r,ev:ikmEval(ctx,r.keys)})).filter(x=>x.ev);
 // Muatan lokal: the group header stays with its first subject; later subjects may continue on the next page.
 if(mul.length){const n=++no;rows.push({h:6,html:`<tr><td class="c">${n}</td><td colspan="4" class="grey">${esc(K.mulok)}</td></tr>`,group:1});for(const x of mul)subjRow(en?x.r.en:x.r.id,x.ev,'',true)}
 if(!rows.length)rows.push({h:9,html:`<tr><td colspan="5" class="c muted">${esc(L.noSubject)}</td></tr>`});
 const thead=`<colgroup><col style="width:6%"><col style="width:22%"><col style="width:8.5%"><col style="width:9.5%"><col></colgroup><thead><tr class="hd"><th>${L.no}</th><th>${L.subject}</th><th>${K.final}</th><th>${K.prestasi}</th><th>${K.capaian}</th></tr></thead>`;
 const top=`<div class="srp-title">${esc(K.title)}</div>
<div class="srp-nid"><div class="srp-kv l"><span>${L.school}</span><span>:</span><span class="v">${SCHOOL}</span><span>${L.nameLong}</span><span>:</span><span class="v">${esc(st.name||'')}</span><span>NISN</span><span>:</span><span class="v">${esc(st.nisn||'-')}</span><span>NPSN</span><span>:</span><span class="v">70004670</span></div><div class="srp-kv r"><span>${L.cls}</span><span>:</span><span class="v">${esc(ctx.className||'-')}</span><span>${esc(K.fase)}</span><span>:</span><span class="v">${esc(faseOf(ctx.gradeLevel))}</span><span>${L.semL}</span><span>:</span><span>${esc(L.sem(ctx.semester))}</span><span>${L.year}</span><span>:</span><span>${esc(ctx.year||'-')}</span></div><img src="${LOGO}" alt=""></div>
<div class="srp-big">${esc(K.cont)}</div><div class="srp-sec">${esc(K.kkm(ctx.kkm))}</div>`;
 // Keep a muatan-lokal header together with its rows.
 const units=[];for(let i=0;i<rows.length;i++){if(rows[i].group){const g=rows.slice(i,i+rows[i].group+1);units.push({h:g.reduce((a,b)=>a+b.h,0),html:g.map(x=>x.html).join('')});i+=rows[i].group}else units.push(rows[i])}
 // Table A starts ~78mm from the top on page 1 and ~45mm on later pages; keep its last row above ~258mm.
 const pages=[];let cur=[],used=0,budget=178;for(const u of units){if(cur.length&&used+u.h>budget){pages.push(cur);cur=[];used=0;budget=200}cur.push(u);used+=u.h}if(cur.length)pages.push(cur);
 const out=pages.map((p,i)=>(i===0?top:headHtml(ctx,K.title))+`<table class="srp-t srp-ikm">${thead}<tbody>${p.map(u=>u.html).join('')}</tbody></table>`);
 // Sections B-H and signatures.
 const kes=(ctx.entry||{}).kesehatan||{},s1=ctx.semester==2?(ctx.kesehatanS1||{}):kes,s2=ctx.semester==2?kes:{};
 const unit=(v,u)=>{const s=String(v??'').trim();return s?`${esc(s)} ${u}`:'-'};
 const small=(head,rowsHtml,cols)=>`<table class="srp-t srp-half">${cols}<thead><tr class="hd">${head}</tr></thead><tbody>${rowsHtml}</tbody></table>`;
 const eks=ikmEkskul(ctx);
 const eksRows=eks.map((e,i)=>{const p=ekskulPredikat(e);const ket=[p?EKS_WORD[ctx.lang][p]:'',e.external?`${K.external}${e.institution?': '+e.institution:''}`:''].filter(Boolean).join(' · ');return`<tr><td class="c">${i+1}</td><td>${esc(e.name)}</td><td class="c">${p||'-'}</td><td>${ket?esc(ket):'-'}</td></tr>`}).join('');
 const pres=Array.isArray((ctx.entry||{}).prestasi)?ctx.entry.prestasi:[];const att=ctx.attendance||{},pts=ctx.points||{},cats=pts.categories||{};
 const g=Number(ctx.gradeLevel)||0,stay=(ctx.entry||{}).keputusan==='tinggal';
 const decision=Number(ctx.semester)===2?`<div class="srp-dec"><b>${esc(K.keputusan)}</b><div>${esc(K.dasar)}</div><b>${g>=6?esc(stay?K.belumLulus:K.lulus):g?esc(stay?K.tinggal(ROMAN[g],GRADE_WORD[ctx.lang][g]):K.naik(ROMAN[g+1],GRADE_WORD[ctx.lang][g+1])):'-'}</b></div>`:'';
 const blocks=[
  (()=>{const proj=(ctx.kokuRubric&&Array.isArray(ctx.kokuRubric.dims)&&ctx.kokuRubric.dims.length===2)?ctx.kokuRubric:KOKURIKULER[g],sc=(ctx.entry||{}).kokurikuler||{},cm=kokuComment(st.name,g,sc,ctx.lang,proj);
   const dimLine=proj?proj.dims.map((d,i)=>{const v=Number(i?sc.b:sc.a);return`${en&&d.en?d.en.replace(/^./,c=>c.toUpperCase()):d.id}: ${v>=1&&v<=4?`${v} (${KOKU_SCALE[v][ctx.lang]})`:'-'}`}).join(' · '):'';
   const body=proj?`<div class="srp-koku-p"><b>${esc(en&&proj.en?proj.en:proj.id)}</b></div><div class="srp-koku-d">${esc(dimLine)}</div><div class="srp-koku-c">${cm?esc(cm):`<span class="muted">${esc(K.notGraded)}</span>`}</div>`:`<span class="muted">${esc(K.notGraded)}</span>`;
   return{h:30+Math.ceil(cm.length/120)*4,html:`<div class="srp-sec">${esc(K.koku)}</div><table class="srp-t"><thead><tr class="hd"><th>${esc(K.kokuH)}</th></tr></thead><tbody><tr><td class="srp-koku">${body}</td></tr></tbody></table>`}})(),
  {h:14+eks.length*5.2,html:`<div class="srp-sec">${esc(K.eks)}</div><table class="srp-t"><colgroup><col style="width:6%"><col style="width:30%"><col style="width:10%"><col></colgroup><thead><tr class="hd"><th>${L.no}</th><th>${esc(K.eksH)}</th><th>${esc(K.pred)}</th><th>${esc(K.ket)}</th></tr></thead><tbody>${eksRows}</tbody></table>`},
  {h:26,html:`<div class="srp-sec">${esc(K.tbbb)}</div><table class="srp-t srp-half"><colgroup><col style="width:9%"><col style="width:45%"><col><col></colgroup><thead><tr class="hd"><th rowspan="2">${L.no}</th><th rowspan="2">${esc(K.aspek)}</th><th colspan="2">${L.semL}</th></tr><tr class="hd"><th>1</th><th>2</th></tr></thead><tbody><tr><td class="c">1</td><td>${esc(K.tb)}</td><td class="c">${unit(s1.tb,K.cm)}</td><td class="c">${unit(s2.tb,K.cm)}</td></tr><tr><td class="c">2</td><td>${esc(K.bb)}</td><td class="c">${unit(s1.bb,K.kg)}</td><td class="c">${unit(s2.bb,K.kg)}</td></tr></tbody></table>`},
  {h:32,html:`<div class="srp-sec">${esc(K.kes)}</div>`+small(`<th>${L.no}</th><th>${esc(K.fisik)}</th><th>${esc(K.ket)}</th>`,[[K.dengar,kes.pendengaran],[K.lihat,kes.penglihatan],[K.gigi,kes.gigi]].map(([l,v],i)=>`<tr><td class="c">${i+1}</td><td>${esc(l)}</td><td class="c">${dash(v)}</td></tr>`).join(''),'<colgroup><col style="width:9%"><col style="width:55%"><col></colgroup>')+`<div class="srp-legend" style="margin-left:0">${esc(K.kesLeg)}</div>`},
  {h:27,html:`<div class="srp-sec">${esc(K.pres)}</div><table class="srp-t"><colgroup><col style="width:5%"><col style="width:40%"><col></colgroup><thead><tr class="hd"><th>${L.no}</th><th>${esc(K.jenis)}</th><th>${esc(K.ket)}</th></tr></thead><tbody>${[0,1,2].map(i=>`<tr><td class="c">${i+1}</td><td>${dash(pres[i]?.jenis)}</td><td>${dash(pres[i]?.keterangan)}</td></tr>`).join('')}</tbody></table>`},
  {h:30,html:`<div class="srp-sec">${esc(K.absen)}</div><div class="srp-absrow">`+small(`<th>${L.no}</th><th>${esc(K.absenH)}</th><th>${esc(K.ket)}</th>`,[[L.sick,att.sick],[L.excused,att.excused],[L.unexcused,att.unexcused]].map(([l,v],i)=>`<tr><td class="c">${i+1}</td><td>${esc(l)}</td><td class="c">${esc(K.day(Number(v)||0))}</td></tr>`).join(''),'<colgroup><col style="width:9%"><col style="width:55%"><col></colgroup>')+decision+`</div>`},
  {h:52,html:`<div class="srp-sec">${esc(K.kar)}</div><div class="srp-sub">${esc(K.karA)}</div><table class="srp-t"><colgroup><col style="width:45%"><col style="width:18%"><col></colgroup><thead><tr class="hd"><th>${esc(K.level)}</th><th>${esc(K.inc)}</th><th>${esc(K.ket)}</th></tr></thead><tbody>${[[K.minor,cats.Minor],[K.moderate,cats.Moderate],[K.severe,cats.Severe]].map(([l,c])=>`<tr><td>${esc(l)}</td><td class="c">${Number(c?.incidents)||0}</td><td>-</td></tr>`).join('')}<tr><td colspan="3"><b>${esc(K.vtot(Number(pts.violation_total)||0))}</b></td></tr></tbody></table>
<div class="srp-sub">${esc(K.karB)}</div><table class="srp-t"><colgroup><col style="width:45%"><col style="width:18%"><col></colgroup><thead><tr class="hd"><th>${esc(K.cat)}</th><th>${esc(K.pts)}</th><th>${esc(K.ket)}</th></tr></thead><tbody><tr><td>${esc(K.award)}</td><td class="c">${Number(pts.reward_total)||0}</td><td>-</td></tr><tr><td>${esc(K.guided)}</td><td class="c">${Number(pts.violation_total)||0}</td><td>-</td></tr><tr><td colspan="3"><b>${esc(K.ftot(Number(pts.final_total)||0))}</b></td></tr></tbody></table>`},
  {h:44,html:signHtml(ctx)}
 ];
 return[...out,...paginate(blocks,212).map(p=>headHtml(ctx,K.title)+p.map(b=>b.html).join(''))];
}

/* Semua halaman satu siswa. report = hasil report-preview-v2 yang sudah ditempeli semester_print. */
function pagesHtml(report,opts){
 injectStyles();const sp=report?.semester_print;if(!sp)throw new Error('Data Rapor Semester belum dimuat.');
 const lang=opts?.lang==='en'?'en':'id';
 const ctx={lang,student:report.student||{},className:report.class?.name||sp.class?.name||'',semester:report.semester_no||sp.semester_no,year:report.academic_year||sp.academic_year,teachers:report.teachers||{},attendance:report.attendance||{},subjects:sp.subjects||[],academic:sp.student?.academic||{},entry:sp.student?.entry?.data||{},printDate:opts?.printDate||'',hijri:opts?.hijri||'',
  points:report.points||{},ekskul:sp.student?.ekskul||[],kesehatanS1:sp.student?.kesehatan_s1||{},gradeLevel:sp.class?.grade_level||report.class?.grade_level||null,kkm:Number.isFinite(Number(sp.kkm))&&sp.kkm!==null&&sp.kkm!==''?Number(sp.kkm):IKM_KKM,partner:sp.partner||null,kokuRubric:sp.kokurikuler_rubric||null,ptsAcademic:Array.isArray(report.academic)?report.academic:[]};
 const L=T[lang];
 // Urutan cetak sekolah: 1 Komentar, 2-3 Sikap/Adab, 4-6 Tahfizh (dicetak terpisah), Intrakurikuler mulai hal. 7, Kokurikuler, Nilai, lalu IKM.
 // Sikap: lembar 1 = kategori A-C, lembar 2 = D-E.
 const sg=sikapGroups(ctx);
 const first=[komentarPage(ctx),...blockPages(ctx,L.sikap,sg.slice(0,3),'sikap'),...blockPages(ctx,L.sikap,sg.slice(3),'sikap')];
 const rest=[...blockPages(ctx,L.intra,intraGroups(ctx),'kognitif'),...blockPages(ctx,L.psik,psikGroups(ctx),'psikomotor'),...nilaiPages(ctx)].map(h=>[h,'']).concat(ikmPages(ctx).map(h=>[h,'ikm']));
 const numbered=[...first.map((html,i)=>[html,i+1,'']),...rest.map(([html,part],i)=>[html,first.length+TAHFIZH_PAGES+i+1,part])];
 return numbered.map(([html,no,part])=>`<section class="rpv-paper srp-page" data-student-id="${esc(ctx.student.id||'')}" data-page-no="${no}"${part?` data-part="${part}"`:''}>${html}<div class="srp-foot"><img src="${FOOTER}" alt=""></div><div class="srp-pno">${esc(L.page(no,ctx.student.name))}</div></section>`).join('');
}

/* Ambil data cetak satu kelas lalu tempelkan ke tiap laporan siswa. */
async function attach(reports,{academicYear,semester,classId}){
 const list=(reports||[]).filter(Boolean);if(!list.length)return reports;
 const token=typeof getAuthToken==='function'?getAuthToken():'';if(!token)throw new Error('Sesi login tidak ditemukan.');
 const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),60000);let d;
 try{const r=await fetch(`${SUPABASE_URL}/functions/v1/admin-academic-period/semester-report`,{method:'POST',headers:{'Content-Type':'application/json',apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:'Bearer '+SUPABASE_PUBLISHABLE_KEY,'x-session-token':token},body:JSON.stringify({action:'print_data',academic_year:academicYear,semester_no:semester,class_id:classId}),signal:ctl.signal});d=await r.json().catch(()=>({}));if(!r.ok||!d.success)throw new Error(d.error||`Data Rapor Semester gagal dimuat (HTTP ${r.status}).`)}
 catch(e){if(e?.name==='AbortError')throw new Error('Server Rapor Semester terlalu lama merespons.');throw e}finally{clearTimeout(timer)}
 const by=new Map((d.students||[]).map(s=>[String(s.id),s]));
 // Tanda tangan Guru Partner dibersihkan latarnya seperti tanda tangan rapor lain.
 if(d.partner?.signature_url&&typeof cleanStoredTeacherSignature==='function'){try{d.partner.signature_url=await cleanStoredTeacherSignature(d.partner.signature_url)}catch(_){}}
 for(const r of list){r.semester_print={academic_year:d.academic_year,semester_no:d.semester_no,kkm:d.kkm,partner:d.partner||null,kokurikuler_rubric:d.kokurikuler_rubric||null,class:d.class,subjects:d.subjects||[],student:by.get(String(r.student?.id))||{academic:{},entry:null}}}
 return reports;
}

window.cqSemesterPagesHtml=pagesHtml;
window.cqSemesterAttach=attach;
window.__cqSemesterInternals={terbilang,tpGrade,classify,paginate,subjectName,ikmEval,capaian,ikmLetter,tpPhrase,ekskulPredikat,kktpFor,kktpMin,uniqueSubjects,tpScores,intraGroups,faseOf,SC,PTS_KKTP};
})();
