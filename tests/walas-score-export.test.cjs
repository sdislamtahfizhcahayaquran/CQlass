// Download nilai semua mapel (walas): baris Excel dari print_data. Tanpa request ke produksi.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const plain=v=>JSON.parse(JSON.stringify(v));
const w={};w.window=w;vm.createContext(w);vm.runInContext(fs.readFileSync('semester-report-walas.js','utf8'),w);
const pd={kkm:75,academic_year:'2026/2027',semester_no:1,class:{name:'4A'},
 subjects:[{id:'m',name:'Matematika',objectives:[{id:'o1'},{id:'o2'}]},{id:'b',name:'Bahasa Indonesia',objectives:[{id:'o3'}]}],
 students:[
  {nis:'101',name:'Ani',academic:{m:{final:81,tasks:[80,80,80,80,80],tp:[70,90],wwp:80,asas:82},b:{final:null,tasks:[90,null,90,90,90],tp:[88],wwp:null,asas:90}}},
  {nis:'102',name:'Budi',academic:{m:{final:70,tasks:[70,70,70,70,70],tp:[65,75],wwp:70,asas:70},b:{final:90,tasks:[90,90,90,90,90],tp:[90],wwp:90,asas:90}}}]};
const s=w.__cqWalasScoreSheets(pd);
assert.deepEqual(plain(s.sum.head),['No','NIS','Nama Siswa','Matematika','Bahasa Indonesia','Jumlah','Rata-rata','Mapel Belum Lengkap','Mapel di Bawah KKM']);
assert.deepEqual(plain(s.sum.rows[0]),[1,'101','Ani',81,'',81,81,1,0],'empty NA stays empty and counts as incomplete');
assert.deepEqual(plain(s.sum.rows[1]),[2,'102','Budi',70,90,160,80,0,1],'below-KKM count uses configured KKM');
assert.deepEqual(plain(s.avgRow.slice(2,5)),['Rata-rata kelas',75.5,90]);
assert.deepEqual(plain(s.det.groups),[{name:'Matematika',from:4,width:12},{name:'Bahasa Indonesia',from:16,width:11}]);
assert.equal(s.det.head.length,3+12+11);
assert.deepEqual(plain(s.det.head.slice(3,15)),['T1','T2','T3','T4','T5','RT','TP1','TP2','RTP','WWP','ASAS','NA']);
assert.deepEqual(plain(s.det.rows[0].slice(3,15)),[80,80,80,80,80,80,70,90,80,80,82,81],'T1-5, RT, TP1-2, RTP, WWP, ASAS, NA');
assert.deepEqual(plain(s.det.rows[0].slice(15)),[90,'',90,90,90,90,88,88,'',90,''],'missing components stay empty; RT from filled tasks');
console.log('PASS walas score export: NA summary (jumlah, rata-rata, belum lengkap, < KKM), class average, detail components.');

// Rekap Nilai (sheet RN) + Ranking (sheet RANK).
const store=new Map();const pw={document:{getElementById:id=>store.get(id)||null,createElement:()=>({}),head:{appendChild:el=>{if(el.id)store.set(el.id,el)}}}};pw.window=pw;
const pctx=vm.createContext({...pw,Intl,Date,Number,String,Math,Array,Object,Map,Set,Error,RegExp,JSON});vm.runInContext(fs.readFileSync('semester-report-print.js','utf8'),pctx);
const rw={__cqSemesterInternals:pw.__cqSemesterInternals};rw.window=rw;vm.createContext(rw);vm.runInContext(fs.readFileSync('semester-report-walas.js','utf8'),rw);
const R=rw.__cqWalasRekap;
const sub=(id,name,o)=>({id,name,sort_order:o,objectives:[]});
const st=(nis,name,f)=>({nis,name,academic:Object.fromEntries(Object.entries(f).map(([k,v])=>[k,{final:v}]))});
const rd={kkm:75,academic_year:'2026/2027',semester_no:2,class:{name:'4A'},
 subjects:[sub('m','Matematika',2),sub('h','Hadits',9),sub('a','Akidah',1),sub('t','Tajwid',20),sub('p','Pendidikan Pancasila',3)],
 students:[st('1','Ani',{m:90,h:80,a:80,t:80,p:70}),st('2','Budi',{m:80,h:80,a:90,t:80,p:70}),st('3','Cici',{m:95,h:95,a:95,t:95,p:null}),st('4','Dodi',{m:70,h:70,a:70,t:70,p:70})]};
const rm=R.rekapModel(rd);
assert.deepEqual(plain(rm.subs.map(s=>s.name)),['Akidah','Hadits','Pendidikan Pancasila','Matematika','Tajwid'],'order follows the RN sheet: PAI first, then umum, then mulok');
assert.deepEqual(plain(rm.people.map(p=>[p.name,p.total,p.rank])),[['Ani',400,1],['Budi',400,1],['Cici',380,null],['Dodi',350,3]],'equal totals share a rank (Excel RANK); incomplete student is not ranked');
assert.equal(rm.people[2].missing,1);assert.equal(rm.people[0].below,1,'one subject below KKM 75');
const html=R.rekapHtml(rd,{walas:'Ust. Walas'});
assert(html.includes('Rekapitulasi Nilai Raport 4A')&&html.includes('Semester Genap Tahun Akademik 2026/2027'));
assert(html.includes('Pendidikan Agama Islam'),'PAI group row');assert(html.includes('<td class="c low">70</td>'),'below KKM highlighted');
assert(html.includes('Belum lengkap: 1 mapel'));assert(html.includes('Kabid Akademik')&&html.includes('Ust. Walas'));
assert(R.rekapHtml({...rd,class:{name:'<b>x</b>'}}).includes('&lt;b&gt;x&lt;/b&gt;'),'class name escaped');
console.log('PASS rekap nilai + ranking: RN order, tied ranks, incomplete not ranked, KKM highlight, signatures.');
