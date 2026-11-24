// Download nilai walas (Nilai Rapor, Nilai Murni, Legger) + Rekap Nilai & Ranking. Tanpa request ke produksi.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const plain=v=>JSON.parse(JSON.stringify(v));
const store=new Map();const w={document:{getElementById:id=>store.get(id)||null,createElement:()=>({}),head:{appendChild:el=>{if(el.id)store.set(el.id,el)}}}};w.window=w;
const ctx=vm.createContext({...w,Intl,Date,Number,String,Math,Array,Object,Map,Set,Error,RegExp,JSON});
for(const f of ['cq-scoring.js','cq-legger-export.js','semester-report-print.js','semester-report-walas.js'])vm.runInContext(fs.readFileSync(f,'utf8'),ctx);
const T5=v=>[v,v,v,v,v];
const ac=(tasks,tp,wwp,asas)=>{const raw=w.CQ_SCORE.raw(tasks,tp,wwp,asas);return{tasks,tp,wwp,asas,raw,final:w.CQ_SCORE.rapor(raw)}};
const pd={kkm:70,academic_year:'2026/2027',semester_no:1,class:{name:'4A'},
 subjects:[{id:'m',name:'Matematika',sort_order:2,objectives:[{id:'o1'},{id:'o2'}]},{id:'pk',name:'PKN',sort_order:3,objectives:[]},{id:'pc',name:'Pancasila',sort_order:4,objectives:[{id:'o3'}]},{id:'a',name:'Akidah',sort_order:1,objectives:[{id:'o4'}]}],
 students:[
  {nis:'101',name:'Ani',academic:{m:ac(T5(80),[90,70],80,90),pc:ac(T5(90),[90],90,90),a:ac(T5(80),[80],null,80)}},
  {nis:'102',name:'Budi',academic:{m:ac(T5(70),[70,70],70,70),pc:ac(T5(85),[85],85,85),a:ac(T5(90),[90],90,90)}}]};
assert.equal(pd.students[0].academic.m.raw,84);assert.equal(pd.students[0].academic.m.final,85);
const s=w.__cqWalasScoreSheets(pd);
assert.deepEqual(plain(s.subs.map(x=>x.name)),['Matematika','Pancasila','Akidah'],'empty duplicate PKN dropped');
assert.deepEqual(plain(s.rapor.head),['No','NIS','Nama Siswa','Matematika','Pancasila','Akidah','Jumlah','Rata-rata','Mapel Belum Lengkap','Mapel di Bawah KKTP']);
assert.deepEqual(plain(s.rapor.rows[0]),[1,'101','Ani',85,90,'',175,87.5,1,0],'rapor values; Akidah incomplete');
assert.deepEqual(plain(s.murni.rows[0].slice(3,6)),[84,90,''],'murni values');
assert.deepEqual(plain(s.rapor.rows[1].slice(3,6)),[77,85,90],'Budi MTK raw 70 -> rapor 77 (minimum)');assert.equal(s.rapor.rows[1][9],0,'rapor 77 is not below the MTK KKTP floor 76');assert.equal(s.murni.rows[1][9],1,'murni 70 is below the MTK KKTP floor 76');
// Legger: format legger sekolah.
const L=s.legger;assert.equal(L.title,'LEGGER NILAI KELAS 4A');assert.deepEqual(plain(L.groups.map(g=>g.name)),['MATEMATIKA','PANCASILA','AKIDAH']);
assert.deepEqual(plain(L.comp.slice(3,3+L.groups[0].width)),['Tugas 1','Tugas 2','Tugas 3','Tugas 4','Tugas 5','Rata Tugas','TP1','TP2','Rata KD','WWP','Asas','Nilai Murni','Nilai Rapor','Predikat']);
assert.deepEqual(plain(L.rows[0].slice(0,17)),[1,'Ani','101',80,80,80,80,80,80,90,70,80,80,90,84,85,'B']);
assert.deepEqual(plain(L.rows[0].slice(-8)),[80,80,80,'',80,'','',''],'incomplete Akidah: no murni/rapor/predikat');
console.log('PASS walas download: rapor vs murni sheets, KKTP count, duplicate PKN once, legger format like the school legger.');

// Rekap Nilai (sheet RN) + Ranking (sheet RANK).
const R=w.__cqWalasRekap;
const sub=(id,name,o)=>({id,name,sort_order:o,objectives:[{id:id+'1'}]});
const st=(nis,name,f)=>({nis,name,academic:Object.fromEntries(Object.entries(f).map(([k,v])=>[k,{final:v,raw:v===null?null:v-0.4}]))});
const rd={kkm:75,academic_year:'2026/2027',semester_no:2,class:{name:'4A'},
 subjects:[sub('m','Matematika',2),sub('h','Hadits',9),sub('a','Akidah',1),sub('t','Tajwid',20),sub('p','Pendidikan Pancasila',3)],
 students:[st('1','Ani',{m:90,h:80,a:80,t:80,p:77}),st('2','Budi',{m:80,h:80,a:90,t:80,p:77}),st('3','Cici',{m:95,h:95,a:95,t:95,p:null}),st('4','Dodi',{m:77,h:77,a:77,t:77,p:77})]};
const rm=R.rekapModel(rd);
assert.deepEqual(plain(rm.subs.map(s=>s.name)),['Akidah','Hadits','Pendidikan Pancasila','Matematika','Tajwid'],'order follows the RN sheet');
assert.deepEqual(plain(rm.rows.map(r=>r.kktp)),['78 - 81','82 - 85','79 - 82','76 - 79','77 - 80'],'KKTP = PTS ranges');
assert.deepEqual(plain(rm.people.map(p=>[p.name,p.total,p.rank])),[['Ani',407,1],['Budi',407,1],['Cici',380,null],['Dodi',385,3]],'equal totals share a rank; incomplete not ranked');
assert.equal(rm.people[0].below,2,'Ani: Hadits 80 < 82 and Pancasila 77 < 79');
const html=R.rekapHtml(rd,{walas:'Ust. Walas'});
assert(html.includes('Rekapitulasi Nilai Raport 4A')&&html.includes('<th style="width:40px">KKTP</th>')&&!html.includes('>KKM<'));
assert(html.includes('<td class="c low"><span class="vr">80</span><span class="vm low">79.6</span></td>'),'rapor value shown, murni value hidden until toggled');
assert(html.includes('Tampilkan nilai murni')&&html.includes('Kabid Akademik')&&html.includes('Ust. Walas')&&html.includes('Belum lengkap: 1 mapel'));
assert(R.rekapHtml({...rd,class:{name:'<b>x</b>'}}).includes('&lt;b&gt;x&lt;/b&gt;'),'class name escaped');
console.log('PASS rekap nilai + ranking: RN order, KKTP PTS, rapor/murni toggle, tied ranks, incomplete not ranked, signatures.');
