// Input nilai guru: cari nama siswa. Baris tersembunyi tidak ikut navigasi, tempel Excel, dan tarik-isi. Tanpa request ke produksi.
const fs=require('node:fs'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const dom=new JSDOM(fs.readFileSync('index.html','utf8').replace(/<script[\s\S]*?<\/script>/g,''),{runScripts:'outside-only',url:'https://x.invalid/'}),w=dom.window;w.document.getElementById('content').innerHTML='<div id="academic-grid-table-area"></div>';
w.CSS={escape:s=>String(s).replace(/["\\]/g,'\\$&')};w.eval(fs.readFileSync('cq-scoring.js','utf8'));
w.eval(fs.readFileSync('app-core.js','utf8')+'\n;window.__g={state:()=>academicGridState,render:renderAcademicGridTable,filter:academicFilterStudents,keydown:academicGridKeydown,paste:academicGridPaste,at:academicInputAt};');const G=w.__g,d=w.document;
const st=G.state();st.assignmentId='a1';st.objectives=[{id:'o1',code:'TP1'}];st.canEdit=true;
st.students=['Adifa Azmya Zahira','Asma Taqiyyah Al-\'Alimah','Azizah Arfannisa','Fathia Shanum Azzahra','Fatimah Izzah Azzahra'].map((name,i)=>({id:'s'+i,name,components:{},tp:[]}));
G.render();
const search=d.getElementById('ag-search');assert(search,'search box shown');assert.equal(search.placeholder,'Cari nama siswa…');
const visible=()=>[...d.querySelectorAll('#academic-score-table tbody tr[data-student-id]')].filter(tr=>!tr.hidden).map(tr=>tr.dataset.studentId);
// jsdom (outside-only) tidak menjalankan oninput inline: panggil handler yang sama seperti atribut oninput.
const type=v=>{const el=d.getElementById('ag-search');el.value=v;G.filter(el.value)};
type('azzahra');assert.deepEqual(visible(),['s3','s4'],'case-insensitive part of name');assert.equal(d.getElementById('ag-search-count').textContent,'2 dari 5 siswa');
type('fat izz');assert.deepEqual(visible(),['s4'],'all typed words must match');
type('alimah');assert.deepEqual(visible(),['s1'],'punctuation ignored');
type('zzz');assert.deepEqual(visible(),[]);assert.equal(d.getElementById('ag-search-count').textContent,'Tidak ada siswa dengan nama itu');
// Navigasi: dari Adifa (baris 0) turun langsung ke Azizah (baris 2) bila Asma tersembunyi.
type('a');type('');assert.equal(visible().length,5);assert.equal(d.getElementById('ag-search-count').hidden,true);
d.querySelector('tr[data-student-id="s1"]').hidden=true;
const inp=(r,c)=>d.querySelector(`.ag-score-input[data-row="${r}"][data-col="${c}"]`);
inp(0,0).focus();G.keydown({key:'ArrowDown',shiftKey:false,preventDefault(){}},inp(0,0));assert.equal(d.activeElement,inp(2,0),'ArrowDown skips hidden row');
G.keydown({key:'ArrowUp',shiftKey:false,preventDefault(){}},inp(2,0));assert.equal(d.activeElement,inp(0,0),'ArrowUp skips hidden row');
assert.equal(G.at(1,0),null,'hidden row cell is not a fill/paste target');
// Tempel 2 baris dari Excel mulai Adifa: masuk ke Adifa dan Azizah, Asma (tersembunyi) tidak berubah.
G.paste({clipboardData:{getData:()=>'80\n90\n'},preventDefault(){}},inp(0,0));
assert.equal(inp(0,0).value,'80');assert.equal(inp(2,0).value,'90');assert.equal(inp(1,0).value,'','hidden student untouched');
// Ganti kelas/mapel: pencarian direset.
type('fathia');st.assignmentId='a2';G.render();assert.equal(d.getElementById('ag-search').value,'');assert.equal(visible().length,5);
// Gambar ulang di kelas yang sama: pencarian tetap.
type('fathia');G.render();assert.equal(d.getElementById('ag-search').value,'fathia');assert.deepEqual(visible(),['s3']);
console.log('PASS guru input search: filter by name, count, keyboard/paste skip hidden rows, reset on class change.');
dom.window.close();
