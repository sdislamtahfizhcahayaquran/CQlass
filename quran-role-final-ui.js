/* CQlass — FINAL UI authority khusus role kabid_quran. Tidak menyentuh role lain. */
(function(){
'use strict';
if(window.__CQ_QURAN_FINAL_UI_V3__)return;window.__CQ_QURAN_FINAL_UI_V3__=true;
const norm=v=>String(v||'').replace(/[\u200B-\u200D\uFEFF]/g,'').trim().toLowerCase().replace(/[\s-]+/g,'_');
function user(){try{return (typeof currentUser!=='undefined'&&currentUser)||JSON.parse(localStorage.getItem('cqlass_user')||'{}')||{}}catch(_){return{}}}
function isQuran(){const u=user();return norm(u.role||u.primary_role||u.role_code)==='kabid_quran'}
const tools=[
 {label:'Laporan Harian',url:'tahfizh-daily-report.html?v=20260929-quran5'},
 {label:'Badal Tahfizh',url:'tahfizh-badal.html?v=20260929-quran5'},
 {label:'Nilai PTS',url:'tahfizh-pts.html?v=20260929-quran5'},
 {label:'UKJ',url:'tahfizh-ukj-score.html?v=20260929-quran5'},
 {label:'Laporan Bulanan',url:'tahfizh-monthly.html?v=20260929-quran5'}
];
const sections=[
 ['Monitoring Guru',tools.slice(0,2)],
 ['Penilaian',tools.slice(2,4)],
 ['Laporan',tools.slice(4)]
];
function css(){if(document.getElementById('cq-quran-final-css'))return;const s=document.createElement('style');s.id='cq-quran-final-css';s.textContent=`
body.cq-quran-final #sidebar .cq-quran-head{padding:13px 18px 8px;margin-top:8px;font-size:13px;font-weight:900;color:#49666d;text-transform:uppercase;letter-spacing:.02em}
body.cq-quran-final #sidebar .cq-quran-section{padding:11px 18px 11px 30px;font-size:12px;font-weight:850;color:#355b61;cursor:pointer;user-select:none}
body.cq-quran-final #sidebar .cq-quran-section:hover{color:#087b75}
body.cq-quran-final #sidebar .cq-quran-leaf{padding:10px 18px 10px 44px;font-size:11.5px;font-weight:700;color:#577078;cursor:pointer;border-radius:9px;margin:2px 10px}
body.cq-quran-final #sidebar .cq-quran-leaf:hover{background:#eef8f6;color:#087b75}
body.cq-quran-final #sidebar .cq-quran-sub{display:none}
body.cq-quran-final #sidebar .cq-quran-sub.open{display:block}
body.cq-quran-final #sidebar .nav-chevron,body.cq-quran-final #sidebar .cq-quran-chevron{display:none!important}
body.cq-quran-final .cq-quran-module-host{position:relative;width:100%;min-height:calc(100vh - 100px);background:transparent;overflow:hidden}
body.cq-quran-final .cq-quran-module-frame{display:block;width:100%;height:calc(100vh - 112px);min-height:720px;border:0;background:transparent}
body.cq-quran-final .cq-quran-module-loading{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font:700 13px inherit;color:#4c6d6a;background:#f5faf9;z-index:2}
`;document.head.appendChild(s)}
function go(url,label){
 if(!isQuran())return false;
 const content=document.getElementById('content');if(!content)return false;
 try{activeModule='quran-internal'}catch(_){}
 draw();
 content.innerHTML='<div class="cq-quran-module-host"><div class="cq-quran-module-loading">Memuat '+String(label||'modul')+'...</div><iframe class="cq-quran-module-frame" title="'+String(label||'Modul Kabid Qur\'an').replace(/\"/g,'&quot;')+'"></iframe></div>';
 const frame=content.querySelector('.cq-quran-module-frame');
 frame.onload=function(){
   try{
     const d=frame.contentDocument;if(!d)return;
     d.documentElement.classList.add('cq-embedded-quran');
     const st=d.createElement('style');st.textContent=`
html.cq-embedded-quran body{margin:0!important;background:transparent!important;color:#17324d!important;font-family:inherit!important}
html.cq-embedded-quran .top,html.cq-embedded-quran header.top,html.cq-embedded-quran a[href="index.html"]{display:none!important}
html.cq-embedded-quran .wrap,html.cq-embedded-quran .screen-ui>.wrap{max-width:none!important;margin:0!important;padding:0 4px 24px!important}
html.cq-embedded-quran h1,html.cq-embedded-quran h2,html.cq-embedded-quran h3,html.cq-embedded-quran button,html.cq-embedded-quran input,html.cq-embedded-quran select,html.cq-embedded-quran table{font-family:inherit!important}
html.cq-embedded-quran .card,html.cq-embedded-quran .panel,html.cq-embedded-quran section{box-shadow:none!important}
`;d.head.appendChild(st);
     content.querySelector('.cq-quran-module-loading')?.remove();
   }catch(_){content.querySelector('.cq-quran-module-loading')?.remove()}
 };
 frame.src=url;
 return true;
}
function draw(){
 if(!isQuran())return false;const sb=document.getElementById('sidebar');if(!sb)return false;
 document.body.classList.add('cq-quran-final');css();
 const prev={};sb.querySelectorAll('.cq-quran-section').forEach((x,i)=>{prev[i]=x.nextElementSibling?.classList.contains('open')});
 sb.innerHTML='';
 const d=document.createElement('div');d.className='nav-item active';d.dataset.cqQuranFinal='1';d.innerHTML='<span>Dashboard</span>';d.onclick=()=>{try{activeModule='dashboard'}catch(_){};window.renderKabidTahfizhDashboard?.(document.getElementById('content'));draw()};sb.appendChild(d);
 const h=document.createElement('div');h.className='cq-quran-head';h.dataset.cqQuranFinal='1';h.textContent='TAHFIZH';sb.appendChild(h);
 sections.forEach(([name,items],i)=>{
   const sh=document.createElement('div');sh.className='cq-quran-section';sh.dataset.cqQuranFinal='1';sh.textContent=name;sb.appendChild(sh);
   const sub=document.createElement('div');sub.className='cq-quran-sub'+((prev[i]??i===0)?' open':'');sub.dataset.cqQuranFinal='1';
   items.forEach(x=>{const e=document.createElement('div');e.className='cq-quran-leaf';e.textContent=x.label;e.onclick=()=>go(x.url,x.label);sub.appendChild(e)});
   sh.onclick=()=>sub.classList.toggle('open');sb.appendChild(sub);
 });
 return true;
}
function fixHeader(){if(!isQuran())return;const r=document.getElementById('user-role');if(r)r.textContent="KABID QUR'AN";}
let busy=false;
function enforce(){if(!isQuran())return;fixHeader();const sb=document.getElementById('sidebar');if(!sb)return;const ok=sb.querySelector('[data-cq-quran-final="1"]')&&/TAHFIZH/i.test(sb.textContent||'');if(!ok&&!busy){busy=true;draw();setTimeout(()=>busy=false,0)}}
function start(){if(!isQuran())return;draw();fixHeader();const sb=document.getElementById('sidebar');if(sb&&!sb.__cqQuranFinalObserver){sb.__cqQuranFinalObserver=true;new MutationObserver(()=>queueMicrotask(enforce)).observe(sb,{childList:true,subtree:true})}setInterval(enforce,1200)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(start,0),{once:true});else setTimeout(start,0);
window.addEventListener('load',()=>setTimeout(start,50),{once:true});
if(typeof enterApp==='function'&&!enterApp.__cqQuranFinalV3){const old=enterApp;enterApp=function(){const out=old.apply(this,arguments);if(isQuran())setTimeout(start,0);return out};enterApp.__cqQuranFinalV3=true}
window.cqQuranOpenInternal=go;
window.cqQuranFinalUI=start;
})();