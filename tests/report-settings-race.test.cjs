const {JSDOM}=require('jsdom'),fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
 const dom=new JSDOM('<div id="content"></div>',{runScripts:'outside-only',url:'https://example.invalid/'}),w=dom.window;const queue=[],calls=[],messages=[];
 w.MODULE_GROUPS=[];w.currentUser={role:'admin'};w.getAuthToken=()=> 'mock';w.SUPABASE_PUBLISHABLE_KEY='mock';w.showToast=x=>messages.push(x);w.reportPreviewRequest=async()=>({});
 w.fetch=async(url,opt)=>{const b=JSON.parse(opt.body);calls.push(b);if(b.action==='report_config_years')return {ok:true,json:async()=>({success:true,years:[{id:'y',name:'2028/2029',is_active:true,semesters:[{semester_no:2,is_active:true}]}]})};if(b.action==='report_config_get')return new Promise(resolve=>queue.push({b,resolve:config=>resolve({ok:true,json:async()=>({success:true,config})})}));return {ok:true,json:async()=>({success:true,config:{}})}};
 w.eval(fs.readFileSync('report-period-control.js','utf8'));
 const render=w.MODULE_GROUPS.find(x=>x.id==='administrasi').items.find(x=>x.id==='pengaturan-rapor').render;
 const loading=render(w.document.getElementById('content'));await new Promise(r=>setTimeout(r,0));
 queue[0].resolve({configured:true,data_start_date:'2029-01-01'});await loading;
 assert.equal(w.document.getElementById('cq-rp-start').value,'2029-01-01');
 const sem=w.document.getElementById('cq-rp-sem');sem.value='1';sem.dispatchEvent(new w.Event('change'));
 w.document.getElementById('cq-rp-save').click();await new Promise(r=>setTimeout(r,0));assert.equal(calls.filter(x=>x.action==='report_config_save').length,0);
 sem.value='2';sem.dispatchEvent(new w.Event('change'));
 queue[2].resolve({configured:true,data_start_date:'2029-02-01'});await new Promise(r=>setTimeout(r,0));
 queue[1].resolve({configured:true,data_start_date:'2028-07-01'});await new Promise(r=>setTimeout(r,0));
 assert.equal(w.document.getElementById('cq-rp-start').value,'2029-02-01');
 assert(messages.some(x=>x.includes('Tunggu')));dom.window.close();console.log('PASS: no save while selected report period loads; late semester response cannot replace current dates.');
})().catch(e=>{console.error(e);process.exitCode=1});
