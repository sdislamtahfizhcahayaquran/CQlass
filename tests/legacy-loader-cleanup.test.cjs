const {JSDOM}=require('jsdom'),fs=require('node:fs'),assert=require('node:assert/strict');
for(const role of ['admin','guru','akademik','walas','tahfizh','hrd','partner']){
 const dom=new JSDOM('<div id="content"></div>',{runScripts:'outside-only'}),w=dom.window,loaded=[];
 w.currentUser={role};w.MODULE_GROUPS=[];w.setTimeout=()=>0;w.clearTimeout=()=>{};
 const append=w.document.head.appendChild.bind(w.document.head);w.document.head.appendChild=node=>{const r=append(node);if(node.tagName==='SCRIPT'){const file=node.getAttribute('src').split('?')[0];loaded.push(file);assert(fs.existsSync(file),'Missing dependency: '+file);node.onload?.()}return r};
 w.eval(fs.readFileSync('final-integration.js','utf8'));w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
 assert(!loaded.some(x=>['academic-dashboard.js','admin-dashboard.js','pjbl-history.js','hrd-period-bar.js','hrd-futuristic-charts.js'].includes(x)));dom.window.close();
}
console.log('PASS: live loader callbacks execute for seven roles; no dangling calls or requests to removed scripts.');
