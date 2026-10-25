const fs=require('node:fs'),cp=require('node:child_process'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const {stripTypeScriptTypes}=require('node:module');
const tracked=new Set(cp.execFileSync('git',['ls-files'],{encoding:'utf8'}).trim().split('\n').filter(f=>fs.existsSync(f)));
for(const f of tracked){
 if(f.endsWith('.ts'))cp.execFileSync(process.execPath,['--check','--input-type=module'],{input:stripTypeScriptTypes(fs.readFileSync(f,'utf8')),stdio:'pipe'});
 if(f.endsWith('.html')){const dom=new JSDOM(fs.readFileSync(f,'utf8'));for(const script of dom.window.document.querySelectorAll('script:not([src])'))if(!script.type||['text/javascript','module'].includes(script.type))cp.execFileSync(process.execPath,['--check','--input-type='+ (script.type==='module'?'module':'commonjs')],{input:script.textContent,stdio:'pipe'});dom.window.close()}
 if(/\.(js|cjs)$/.test(f))cp.execFileSync(process.execPath,['--check',f],{stdio:'pipe'});
 if(!/\.(js|html|css)$/.test(f))continue;
 const source=fs.readFileSync(f,'utf8');
 for(const m of source.matchAll(/["'`]((?:\.\/)?[A-Za-z0-9_-]+\.(?:js|css|html|png|webp))(?:[?'"`])/g))assert(tracked.has(m[1].replace(/^\.\//,'')),`${f}: untracked dependency ${m[1]}`);
}
const html=fs.readFileSync('index.html','utf8');
const staticFiles=[...html.matchAll(/<script[^>]+src="([^"?]+)/g)].map(x=>x[1]);assert.equal(staticFiles.length,new Set(staticFiles).size);
for(const role of ['admin','guru','walas','guru_partner','partner','pengabdian','akademik','kabid_akademik','kabid_quran','tahfizh','hrd','kegiatan','kesiswaan','pimpinan','sapras']){
 const dom=new JSDOM('<div id="sidebar"></div><div id="content"></div>',{runScripts:'outside-only',url:'https://example.invalid/CQlass/'}),w=dom.window,loaded=[];
 w.currentUser={role};w.localStorage.setItem('cqlass_user',JSON.stringify({role}));w.MODULE_GROUPS=[];w.DASHBOARD_MODULE={roles:[]};w.setTimeout=()=>0;w.enterApp=()=>{};w.renderSidebar=()=>{};w.setActiveModule=()=>{};
 for(const f of staticFiles){const s=w.document.createElement('script');s.src=f;w.document.head.appendChild(s)}
 const append=w.document.head.appendChild.bind(w.document.head);w.document.head.appendChild=node=>{const out=append(node);if(node.tagName==='SCRIPT'){const f=node.getAttribute('src').split('?')[0].replace(/^\.\//,'');assert(tracked.has(f),f);loaded.push(f);node.onload?.()}return out};
 w.eval(fs.readFileSync('background-api-fix.js','utf8'));w.eval(fs.readFileSync('final-integration.js','utf8'));w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
 for(const f of ['academic-sidebar-clean-v1.js','tahfizh-kabid-dashboard-layout.js','tahfizh-kabid-input-live.js','cq-icons.js','ui-refinement.js','pjbl-supabase.js'])assert(!loaded.includes(f),role+' duplicate '+f);
 assert.equal(loaded.filter(f=>f==='guru-partner-tahfizh-menu.js').length,1,role+' partner loader');assert(!loaded.includes('academic-badal-v2.js'));
 dom.window.close();
}
for(const role of ['kabid_quran','guru','admin','walas']){
 const dom=new JSDOM('<div id="sidebar"></div><div id="content"></div>',{runScripts:'outside-only'}),w=dom.window,timers=[];
 w.currentUser={role};w.MODULE_GROUPS=[];w.DASHBOARD_MODULE={roles:[]};w.enterApp=()=>{};w.renderSidebar=()=>{};w.setTimeout=f=>(timers.push(f),timers.length);
 w.eval(fs.readFileSync('role-transition-guard.js','utf8'));w.eval(fs.readFileSync('quran-role-final-ui.js','utf8'));w.enterApp();while(timers.length)timers.shift()();w.cqQuranFinalUI();w.cqQuranFinalUI();
 const items=w.MODULE_GROUPS.flatMap(g=>g.items);assert.equal(items.length,role==='kabid_quran'?7:0);assert.equal(new Set(items.map(x=>x.id)).size,items.length);assert.equal(w.document.getElementById('content').style.visibility,'');
 if(role==='kabid_quran'){for(const it of items){it.render();const path=w.document.querySelector('iframe').getAttribute('src').split('?')[0];assert(tracked.has(path),path)}}dom.window.close();
}
const dom=new JSDOM('<div id="content"></div>',{runScripts:'outside-only'}),w=dom.window;w.currentUser={role:'akademik'};let route;w.setActiveModule=id=>route=id;w.eval(fs.readFileSync('academic-download-data.js','utf8'));w.renderAcademicDownloadData(w.document.getElementById('content'));w.document.querySelector('[data-dl="Nilai"]').click();assert.equal(route,'legger-live');assert(!fs.readFileSync('academic-download-data.js','utf8').includes('getLeggerNilai'));dom.window.close();
console.log('PASS: repository JS syntax and tracked dependencies; 15 roles avoid duplicate eager loaders; one Partner loader; native Quran menu/reveal intact; score download uses Monitoring Nilai route.');
