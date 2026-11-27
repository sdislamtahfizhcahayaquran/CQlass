// Tab Kesehatan walas: Pendengaran, Penglihatan, Gigi diisi A-D (A = Sangat baik, B = Baik, C = Cukup, D = Kurang baik). Tanpa request ke produksi.
const fs=require('node:fs'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const dom=new JSDOM('<div id="content"></div>',{runScripts:'outside-only',url:'https://x.invalid/'}),w=dom.window;
const saved=[];
w.fetch=async(url,opt)=>{const b=JSON.parse(opt.body);let j={success:true};
 if(b.action==='bootstrap')j={success:true,semester_no:1,classes:[{id:'c1',name:'2A Banat'}]};
 if(b.action==='load')j={success:true,students:[{id:'s1',name:'Ani'},{id:'s2',name:'Budi'}],entries:[{student_id:'s1',version:1,data:{kesehatan:{tb:'120',gigi:'B'}}}]};
 if(b.action==='save'){saved.push(b);j={success:true,saved:(b.entries||[]).map(e=>({student_id:e.student_id,version:2}))}}
 return{ok:true,status:200,json:async()=>j}};
w.eval(`var SUPABASE_URL='https://x.invalid',SUPABASE_PUBLISHABLE_KEY='k',getAuthToken=()=>'t',currentUser={role:'walas',username:'u'},activeModule='semester-report';`);
w.eval(fs.readFileSync('semester-report-print.js','utf8'));w.eval(fs.readFileSync('semester-report-walas.js','utf8'));
const tick=()=>new Promise(r=>setTimeout(r,20)),c=w.document.getElementById('content');
(async()=>{
 await w.renderSemesterReportWalas(c);await tick();
 const tabBtn=[...c.querySelectorAll('button')].find(b=>b.textContent.trim().startsWith('Kesehatan'));assert(tabBtn,'Kesehatan tab');tabBtn.click();await tick();
 const txt=c.textContent;assert(txt.includes('A = Sangat baik · B = Baik · C = Cukup · D = Kurang baik'),'legend shown');assert(!c.querySelector('#sr-kes-opt'),'old free-text suggestions removed');
 const inp=(r,k)=>c.querySelector(`input.sr-h[data-r="${r}"][data-h="${k}"]`);
 assert.equal(inp(0,'gigi').value,'B');assert(inp(0,'gigi').classList.contains('grade'));assert.equal(inp(0,'gigi').maxLength,1);assert(inp(0,'tb').classList.contains('num'),'TB stays a number');
 const type=(el,v)=>{el.value=v;el.dispatchEvent(new w.Event('input'))};
 type(inp(1,'pendengaran'),'a');assert.equal(inp(1,'pendengaran').value,'A','lowercase becomes uppercase');assert.equal(inp(1,'pendengaran').getAttribute('aria-invalid'),'false');
 type(inp(1,'gigi'),'E');assert.equal(inp(1,'gigi').getAttribute('aria-invalid'),'true');assert.match(c.querySelector('#sr-msg').textContent,/A, B, C, atau D/);
 type(inp(1,'gigi'),'');
 const fill=c.querySelector('select[data-kfillg="penglihatan"]');assert(fill,'fill select per grade column');fill.value='C';fill.dispatchEvent(new w.Event('change'));await tick();
 assert.equal(inp(0,'penglihatan').value,'C');assert.equal(inp(1,'penglihatan').value,'C');
 console.log('PASS walas Kesehatan: Pendengaran/Penglihatan/Gigi use A-D with legend, uppercase, invalid letters flagged, fill-all select.');
 dom.window.close();
})().catch(e=>{console.error(e);process.exit(1)});
