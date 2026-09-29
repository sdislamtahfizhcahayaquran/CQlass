/* CQlass — Kabid Qur'an uses the native CQlass sidebar/module pattern (same as Walas). */
(function(){
'use strict';
if(window.__CQ_QURAN_NATIVE_V1__)return;window.__CQ_QURAN_NATIVE_V1__=true;
const ROLE='kabid_quran';
const norm=v=>String(v||'').replace(/[\u200B-\u200D\uFEFF]/g,'').trim().toLowerCase().replace(/[\s-]+/g,'_');
function user(){try{return (typeof currentUser!=='undefined'&&currentUser)||JSON.parse(localStorage.getItem('cqlass_user')||'{}')||{}}catch(_){return{}}}
function allowed(){const u=user();return norm(u.role||u.primary_role||u.role_code)===ROLE}
const defs=[
 ['quran_daily','Monitoring Guru','Laporan Harian','tahfizh-daily-report.html?v=20260929-quran11'],
 ['quran_badal','Monitoring Guru','Badal Tahfizh','tahfizh-badal.html?v=20260929-quran11'],
 ['quran_pts','Penilaian','Nilai PTS','tahfizh-pts.html?v=20260929-quran11'],
 ['quran_ukj','Penilaian','UKJ','tahfizh-ukj-score.html?v=20260929-quran11'],
 ['quran_monthly','Laporan','Laporan Bulanan','tahfizh-monthly.html?v=20260929-quran11']
];
function injectCss(){
 if(document.getElementById('cq-quran-native-css'))return;
 const s=document.createElement('style');s.id='cq-quran-native-css';s.textContent=`
 body.cq-quran-native #sidebar .nav-chevron{display:none!important}
 body.cq-quran-native .cq-quran-host{width:100%;min-height:calc(100vh - 110px);background:transparent;overflow:hidden}
 body.cq-quran-native .cq-quran-frame{display:block;width:100%;height:calc(100vh - 118px);min-height:720px;border:0;background:transparent}
 `;document.head.appendChild(s);
}
function renderPage(url){
 const content=document.getElementById('content');if(!content||!allowed())return;
 content.innerHTML='<div class="cq-quran-host"><iframe class="cq-quran-frame" title="Modul Kabid Qur\'an"></iframe></div>';
 const frame=content.querySelector('.cq-quran-frame');
 frame.onload=()=>{try{
   const d=frame.contentDocument;if(!d)return;
   d.documentElement.classList.add('cq-embedded-quran');
   const st=d.createElement('style');st.textContent=`
   html.cq-embedded-quran body{margin:0!important;background:transparent!important;color:var(--text,#17324d)!important;font-family:Inter,system-ui,-apple-system,"Segoe UI",sans-serif!important}
   html.cq-embedded-quran .top,html.cq-embedded-quran header.top,html.cq-embedded-quran a[href="index.html"]{display:none!important}
   html.cq-embedded-quran .wrap,html.cq-embedded-quran .screen-ui>.wrap{max-width:none!important;margin:0!important;padding:8px 4px 28px!important}
   html.cq-embedded-quran h1,html.cq-embedded-quran h2,html.cq-embedded-quran h3,html.cq-embedded-quran button,html.cq-embedded-quran input,html.cq-embedded-quran select,html.cq-embedded-quran table{font-family:inherit!important}
   `;d.head.appendChild(st);
 }catch(_){}};
 frame.src=url;
}
function install(){
 if(!allowed()||typeof MODULE_GROUPS==='undefined'||!Array.isArray(MODULE_GROUPS))return false;
 document.body.classList.add('cq-quran-native');document.body.classList.remove('cq-quran-final');injectCss();
 const badge=document.getElementById('user-role');if(badge)badge.textContent="KABID QUR'AN";
 if(typeof DASHBOARD_MODULE!=='undefined'&&Array.isArray(DASHBOARD_MODULE.roles)&&!DASHBOARD_MODULE.roles.includes(ROLE))DASHBOARD_MODULE.roles.push(ROLE);
 const wanted=['Monitoring Guru','Penilaian','Laporan'];
 for(const label of wanted){
   let g=MODULE_GROUPS.find(x=>x&&x.id==='quran_'+label.toLowerCase().replace(/\s+/g,'_'));
   if(!g){g={id:'quran_'+label.toLowerCase().replace(/\s+/g,'_'),label,roles:[ROLE],items:[]};MODULE_GROUPS.push(g)}
   if(!g.roles.includes(ROLE))g.roles.push(ROLE);
 }
 for(const [id,group,label,url] of defs){
   const gid='quran_'+group.toLowerCase().replace(/\s+/g,'_');
   const g=MODULE_GROUPS.find(x=>x.id===gid);if(!g)continue;
   let m=g.items.find(x=>x.id===id);
   if(!m){m={id,label,roles:[ROLE],built:true,render:()=>renderPage(url)};g.items.push(m)}
   else{m.label=label;m.roles=[ROLE];m.built=true;m.render=()=>renderPage(url)}
 }
 // Remove kabid_quran visibility from unrelated legacy groups only; never mutate other roles.
 MODULE_GROUPS.forEach(g=>{if(!g||String(g.id||'').startsWith('quran_'))return;
   if(Array.isArray(g.roles))g.roles=g.roles.filter(r=>norm(r)!==ROLE);
   if(Array.isArray(g.items))g.items.forEach(m=>{if(Array.isArray(m.roles))m.roles=m.roles.filter(r=>norm(r)!==ROLE)});
 });
 return true;
}
function sync(){
 if(!install())return false;
 try{if(typeof renderSidebar==='function')renderSidebar()}catch(_){}
 return true;
}
let n=0;(function boot(){n++;if(sync()||n>=40)return;setTimeout(boot,150)})();
if(typeof enterApp==='function'&&!enterApp.__cqQuranNativeV1){
 const old=enterApp;enterApp=function(){install();const out=old.apply(this,arguments);if(allowed())setTimeout(sync,50);return out};enterApp.__cqQuranNativeV1=true;
}
window.cqQuranFinalUI=sync;
})();
