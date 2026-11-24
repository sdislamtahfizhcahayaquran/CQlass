// Download & Cek Nilai (guru mapel): cek narasi Rapor IKM + legger per kelas. Tanpa request ke produksi.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const plain=v=>JSON.parse(JSON.stringify(v));
const w={document:{getElementById:()=>null,addEventListener(){},createElement:()=>({}),head:{appendChild(){}}}};w.window=w;
const ctx=vm.createContext({...w,Intl,Date,Number,String,Math,Array,Object,Map,Set,Error,RegExp,JSON,MutationObserver:class{observe(){}}});
for(const f of ['cq-scoring.js','cq-legger-export.js','semester-report-print.js','guru-nilai-tools.js'])vm.runInContext(fs.readFileSync(f,'utf8'),ctx);
const G=w.__cqGuruNilaiTools;
const st=(name,tasks,tp,wwp,asas)=>({id:name,name,nis:'1'+name.length,components:{TUGAS_1:{score:tasks[0]},TUGAS_2:{score:tasks[1]},TUGAS_3:{score:tasks[2]},TUGAS_4:{score:tasks[3]},TUGAS_5:{score:tasks[4]},WWP:{score:wwp},ASAS:{score:asas}},tp:tp.map(score=>({score}))});
const obj=[{description:'Peserta didik mampu membaca bilangan cacah.'},{description:'Peserta didik mampu menulis pecahan.'},{description:'Membandingkan desimal.'}];
const T5=v=>[v,v,v,v,v];
// Huruf berbeda (A dan C): siap, narasi dua bagian.
let r=G.checkStudent(st('Ani',T5(90),[95,70,85],90,90),obj);
// TP1 95 -> 9+28.5+18+36=91.5 (A); TP2 70 -> 84 (B); TP3 85 -> 88.5 (B).
 assert.equal(r.status,'ok');assert.deepEqual(plain(r.letters),['A','B','B']);
assert.equal(r.text,'Ananda Ani sangat baik dalam membaca bilangan cacah dan baik dalam menulis pecahan.');assert.equal(r.warn,'');
// Semua TP huruf sama: peringatan.
r=G.checkStudent(st('Budi',T5(95),[95,92,94],95,95),obj);
assert.equal(r.status,'same');assert.match(r.warn,/Huruf TP terbaik dan terendah sama \(A\)\. Harus ada minimal 1 TP terbaik dan 1 TP terendah dengan huruf berbeda/);
assert.match(r.text,/^Ananda Budi sangat baik dalam membaca bilangan cacah dan sangat baik dalam menulis pecahan\.$/,'narration still shown so the teacher sees it');
// Nilai belum lengkap: tanpa narasi, sebut komponen yang kosong.
r=G.checkStudent(st('Cici',[90,90,null,90,90],[90,null,80],null,90),obj);
assert.equal(r.status,'incomplete');assert.equal(r.warn,'Nilai belum lengkap: 1 TP, WWP.','one empty Tugas is fine now (minimum 1 Tugas)');assert.equal(r.text,'');assert.deepEqual(plain(r.letters),['','','']);
// Satu TP saja.
r=G.checkStudent(st('Dodi',T5(80),[80],80,80),[obj[0]]);assert.equal(r.status,'same');assert.match(r.warn,/Hanya 1 TP/);assert.equal(r.text,'Ananda Dodi cukup baik dalam membaca bilangan cacah.','8+24+16+32=80 -> C');
r=G.checkStudent(st('Eko',[null,null,null,null,null],[90,80,70],80,80),obj);assert.equal(r.warn,'Nilai belum lengkap: Tugas (minimal 1).');
// Huruf per TP minimal C: semua TP rendah -> C, bukan D.
r=G.checkStudent(st('Fani',T5(60),[60,55,50],60,60),obj);assert.deepEqual(plain(r.letters),['C','C','C']);assert.match(r.text,/cukup baik dalam/);assert.doesNotMatch(r.text,/kurang baik/);
console.log('PASS cek deskripsi: ready, same-letter warning (min A/B spread), incomplete list, single TP, min 1 Tugas, TP letter >= C.');

// Legger: 2 mapel di 4A + 1 mapel di 4B -> 2 sheet, kelas urut, mapel urut.
const load=(cls,sub,students)=>({assignment:{class_id:cls,class_name:cls,subject_name:sub},components:{tp:obj.slice(0,2)},students});
const models=G.leggerModels([load('4B','Matematika',[st('Eka',T5(80),[80,80],80,80)]),load('4A','Matematika',[st('Ani',T5(90),[95,70],90,90),st('Budi',T5(70),[70,70],70,70)]),load('4A','Bahasa Arab',[st('Ani',T5(80),[80,80],80,80)])]);
assert.deepEqual(plain(models.map(m=>m.title)),['LEGGER NILAI KELAS 4A','LEGGER NILAI KELAS 4B']);
assert.deepEqual(plain(models[0].groups.map(g=>g.name)),['BAHASA ARAB','MATEMATIKA']);
const ani=models[0].rows.find(x=>x[1]==='Ani'),budi=models[0].rows.find(x=>x[1]==='Budi');
const W=models[0].groups[0].width;assert.equal(ani[3+W-1],'C','Ani Arab: murni 80 -> rapor 80 -> C');
assert.equal(W,14,'2 TP: 5 Tugas + Rata + 2 TP + Rata KD + WWP + Asas + Murni + Rapor + Predikat');assert.deepEqual(plain(budi.slice(3,3+W)),Array(W).fill(''),'Budi has no Arab scores: empty block');
assert.deepEqual(plain(budi.slice(3+W+W-3)),[70,77,'C'],'Budi MTK murni 70 -> rapor 77 (C)');
console.log('PASS legger guru: one sheet per class, subjects sorted, missing subject block empty, murni/rapor/predikat.');
