// Halaman input nilai guru: kolom Nilai Murni + Nilai Rapor dan peringatan "Cek Rapor" yang berubah saat mengetik. Tanpa request ke produksi.
const fs=require('node:fs'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const dom=new JSDOM(fs.readFileSync('index.html','utf8').replace(/<script[\s\S]*?<\/script>/g,''),{runScripts:'outside-only',url:'https://x.invalid/'}),w=dom.window;w.document.getElementById('content').innerHTML='<div id="academic-grid-table-area"></div>';
w.CSS={escape:s=>String(s).replace(/["\\]/g,'\\$&')};w.eval(fs.readFileSync('cq-scoring.js','utf8'));w.eval(fs.readFileSync('app-core.js','utf8')+'\n;window.__g={state:()=>academicGridState,render:renderAcademicGridTable,setTP:academicSetTPScore,refresh:academicRefreshStudentRow};');const G=w.__g;
const comp=(t,w2,a)=>({TUGAS_1:{score:t},TUGAS_2:{score:t},TUGAS_3:{score:t},TUGAS_4:{score:null},TUGAS_5:{score:null},WWP:{score:w2},ASAS:{score:a}});
const objectives=[{id:'o1',code:'TP1'},{id:'o2',code:'TP2'}];
const tp=(a,b)=>[{learning_objective_id:'o1',score:a},{learning_objective_id:'o2',score:b}];
const st=G.state();st.objectives=objectives;st.canEdit=true;st.students=JSON.parse(JSON.stringify([
 {id:'s1',name:'Ani',components:comp(90,90,90),tp:tp(96,70)},
 {id:'s2',name:'Budi',components:comp(95,95,95),tp:tp(95,92)},
 {id:'s3',name:'Cici',components:comp(80,null,80),tp:tp(80,80)}]));G.render();
const row=id=>w.document.querySelector(`tr[data-student-id="${id}"]`),cell=(id,k)=>row(id).querySelector(`[data-calc="${k}"]`).textContent.trim();
const heads=[...w.document.querySelectorAll('#academic-score-table thead th')].map(t=>t.textContent);
assert(heads.includes('Nilai Murni')&&heads.includes('Nilai Rapor')&&heads.includes('Cek Rapor')&&!heads.includes('NA'));
// Ani: murni 9+(83*.3=24.9)+18+36 = 87.9 -> rapor 88 (B); TP 96 -> A, TP 70 -> B: tidak ada peringatan.
assert.equal(cell('s1','final'),'87.9');assert.equal(cell('s1','rapor'),'88');assert.equal(cell('s1','predicate'),'B');assert.equal(cell('s1','check'),'✓');
// Budi: semua TP A -> peringatan.
assert.match(cell('s2','check'),/Semua TP A/);assert.match(row('s2').querySelector('.ag-warn').title,/minimal 1 TP terbaik dan 1 TP terendah/);
// Cici: WWP kosong -> belum ada nilai dan belum ada peringatan.
assert.equal(cell('s3','final'),'—');assert.equal(cell('s3','check'),'—');
assert.equal(w.document.getElementById('ag-check-count').textContent,'⚠ 1 siswa: TP terbaik = terendah');
// Saat mengetik: TP2 Budi diturunkan -> peringatan hilang, hitungan ikut berubah, predikat tetap dari nilai rapor.
G.setTP(st.students[1],'o2',60);G.refresh('s2');
assert.equal(cell('s2','check'),'✓');assert.equal(w.document.getElementById('ag-check-count').hidden,true);
G.setTP(st.students[0],'o2',62);G.refresh('s1');
assert.equal(cell('s1','rapor'),w.CQ_SCORE.rapor(Number(cell('s1','final'))).toString());assert.equal(cell('s1','predicate'),w.CQ_SCORE.letter(Number(cell('s1','rapor'))),'predicate after typing uses nilai rapor');
console.log('PASS guru input: Nilai Murni + Nilai Rapor columns, live Cek Rapor warning and count, predikat from nilai rapor.');
dom.window.close();
