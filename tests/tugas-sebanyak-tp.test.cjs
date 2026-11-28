// Kolom Tugas sebanyak TP (minimal 1, maksimal 10); Tugas yang sudah terisi tetap tampil. Tanpa request ke produksi.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const plain=v=>JSON.parse(JSON.stringify(v));
// 1) Aturan bersama di cq-scoring.js.
const sw={};vm.runInNewContext(fs.readFileSync('cq-scoring.js','utf8'),{window:sw});const S=sw.CQ_SCORE;
assert.equal(S.taskCount(3,0),3);assert.equal(S.taskCount(0,0),1,'minimal 1 Tugas');assert.equal(S.taskCount(3,5),5,'filled Tugas 5 stays visible');assert.equal(S.taskCount(12,0),10,'maksimal 10');
assert.equal(S.highestTask([[80,null,null],[null,70,null,null,90]]),5);assert.deepEqual(plain(S.taskKeys(3)),['TUGAS_1','TUGAS_2','TUGAS_3']);
// Nilai tetap rata-rata Tugas yang terisi, berapa pun kolomnya.
assert.equal(S.raw([80,null,null,null,null,null,90],[80,80],80,80),S.raw([85],[80,80],80,80));

// 2) Halaman input nilai guru.
const dom=new JSDOM(fs.readFileSync('index.html','utf8').replace(/<script[\s\S]*?<\/script>/g,''),{runScripts:'outside-only',url:'https://x.invalid/'}),w=dom.window,d=w.document;d.getElementById('content').innerHTML='<div id="academic-grid-table-area"></div>';
w.CSS={escape:s=>String(s).replace(/["\\]/g,'\\$&')};w.eval(fs.readFileSync('cq-scoring.js','utf8'));
w.eval(fs.readFileSync('app-core.js','utf8')+'\n;window.__g={state:()=>academicGridState,render:renderAcademicGridTable,final:academicFinalScore,cols:()=>ACADEMIC_COMPONENTS};');const G=w.__g;
const obj=n=>Array.from({length:n},(_,i)=>({id:'o'+i,code:'TP'+(i+1)}));
const stu=(comps,tps)=>({id:'s1',name:'Ani',components:Object.fromEntries(Object.entries(comps).map(([k,v])=>[k,{score:v}])),tp:tps.map((v,i)=>({learning_objective_id:'o'+i,score:v}))});
const heads=()=>[...d.querySelectorAll('#academic-score-table thead th')].map(t=>t.textContent).filter(t=>/^T\d+$/.test(t));
const st=G.state();st.canEdit=true;st.assignmentId='a';
st.objectives=obj(3);st.students=[stu({TUGAS_1:80,WWP:80,ASAS:80},[80,80,80])];G.render();
assert.deepEqual(heads(),['T1','T2','T3'],'3 TP -> T1..T3');assert(d.querySelector('.ag-meta').textContent.includes('3 Tugas'));
st.objectives=obj(7);st.students=[stu({TUGAS_1:80,WWP:80,ASAS:80},[80,80,80,80,80,80,80])];G.render();
assert.deepEqual(heads(),['T1','T2','T3','T4','T5','T6','T7'],'7 TP -> T1..T7');
assert.equal(d.querySelectorAll('tr[data-student-id="s1"] .ag-score-input[data-component="TUGAS_7"]').length,1,'Tugas 7 can be typed');
// Data lama: Tugas 5 sudah terisi padahal hanya 2 TP -> kolom T5 tetap tampil dan ikut dihitung.
st.objectives=obj(2);st.students=[stu({TUGAS_1:60,TUGAS_5:100,WWP:80,ASAS:80},[80,80])];G.render();
assert.deepEqual(heads(),['T1','T2','T3','T4','T5'],'filled Tugas 5 is not hidden');
assert.equal(G.final(st.students[0],st.objectives),80*.1+80*.3+80*.2+80*.4,'average of filled Tugas (60,100)');
// Kolom TP mulai setelah kolom Tugas (navigasi kolom tetap urut).
const tp0=d.querySelector('tr[data-student-id="s1"] .ag-score-input[data-kind="tp"]');assert.equal(tp0.dataset.col,'5');

// 3) Legger Excel: kolom Tugas per mapel sebanyak TP (atau Tugas terakhir yang terisi).
const lw={CQ_SCORE:S};vm.runInNewContext(fs.readFileSync('cq-legger-export.js','utf8'),{window:lw,document:{}});
const m=lw.CQ_LEGGER.sheetModel('4A',[{name:'IPA',tpCount:3},{name:'Fikih',tpCount:2}],[{nis:'1',name:'Ani',scores:[{tasks:[80,null,null,null,null,null,null,null,null,null],tp:[80,80,80],wwp:80,asas:80},{tasks:[70,null,null,90],tp:[80,80],wwp:80,asas:80}]}]);
assert.deepEqual(plain(m.comp.slice(3,7)),['Tugas 1','Tugas 2','Tugas 3','Rata Tugas'],'IPA: 3 TP -> 3 Tugas');
const f0=m.groups[1].from-1;assert.deepEqual(plain(m.comp.slice(f0,f0+5)),['Tugas 1','Tugas 2','Tugas 3','Tugas 4','Rata Tugas'],'Fikih: Tugas 4 filled -> 4 Tugas');
assert(!m.note.includes('1-5'));

// 4) Download Data guru/Akademik: header T1..Tn.
const root={CQ_SCORE:S};const src=fs.readFileSync('academic-download-data.js','utf8');
assert(src.includes("...Array.from({length:m.taskCount},(_,i)=>'T'+(i+1)),'Rata Tugas'"),'download header uses task count');

// 5) Server: semester-report memotong Tugas sebanyak TP, Tugas yang terisi tetap ikut; fast-save & academic-scores menerima Tugas 6-10.
const sr=fs.readFileSync('supabase/functions/admin-academic-period/semester-report.ts','utf8');assert(sr.includes("const TASKS=Array.from({length:10},(_,i)=>'TUGAS_'+(i+1));")&&sr.includes('t10.slice(0,Math.min(TASKS.length,Math.max(1,tp.length,hi)))'));
assert(fs.readFileSync('supabase/functions/academic-fast-save/index.ts','utf8').includes('Array.from({length:10},(_,i)=>"TUGAS_"+(i+1))'));
assert(fs.readFileSync('supabase/functions/academic-scores/index.ts','utf8').includes('const NON_TP_COMPONENTS: readonly string[] = [...TASK_COMPONENTS, "WWP", "ASAS"];'));
console.log('PASS Tugas columns follow TP count (min 1, max 10), filled Tugas never hidden, legger/download/server aligned.');
dom.window.close();
