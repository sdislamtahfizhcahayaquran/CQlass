// Login guru/walas: mulai di Dashboard, semua sub-menu sidebar tertutup (juga saat ganti akun tanpa reload). Tanpa request ke produksi.
const fs=require('node:fs'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const dom=new JSDOM(fs.readFileSync('index.html','utf8').replace(/<script[\s\S]*?<\/script>/g,''),{runScripts:'outside-only',url:'https://x.invalid/'}),w=dom.window;
w.CSS={escape:s=>String(s)};w.fetch=async()=>({ok:true,status:200,json:async()=>({success:true}),text:async()=>'{}'});
w.eval(fs.readFileSync('app-core.js','utf8')+'\n;window.__a={enter:enterApp,setUser:u=>{currentUser=u},active:()=>activeModule,group:()=>openGroupId,setGroup:g=>{openGroupId=g},setModule:setActiveModule};');
const A=w.__a;
for(const role of ['guru','walas']){
 A.setUser({nama:'Ustadzah '+role,username:role,role,roles:[role]});
 A.setGroup('absensi-group-from-previous-account');
 A.enter();
 assert.equal(A.active(),'dashboard',role+' lands on Dashboard');assert.equal(A.group(),null,role+': no submenu group open');
 assert.equal(w.document.querySelectorAll('#sidebar .nav-group-head.open').length,0,role+': sidebar shows no expanded group');
 assert(w.document.querySelector('#sidebar .nav-item.active')?.textContent.includes('Dashboard'),role+': Dashboard item is active');
}
console.log('PASS login landing: guru and walas start on Dashboard with every sidebar submenu collapsed.');
dom.window.close();
