/* CQlass — Kabid Akademik sidebar organizer
   Scope keras: hanya akademik / kabid_akademik.
   Tidak mengubah hak/menu role lain dan tidak menghapus modul sumber. */
(function(){
'use strict';
if(window.__CQ_ACADEMIC_SIDEBAR_CLEAN_V1__)return;

const AROLES=['akademik','kabid_akademik'];
const N=v=>String(v||'').trim().toLowerCase().replace(/[\s-]+/g,'_');
function isAcademic(){
  const u=typeof currentUser!=='undefined'?currentUser:null;
  if(!u)return false;
  return [u.role,u.role_code,u.primary_role].concat(Array.isArray(u.roles)?u.roles:[])
    .map(N).some(r=>r==='akademik'||r==='kabid_akademik'||r==='academic');
}
function onlyAcademic(it,label){
  if(!it)return null;
  it.roles=AROLES.slice();
  if(label)it.label=label;
  return it;
}
function findItem(id){
  if(typeof MODULE_GROUPS==='undefined'||!Array.isArray(MODULE_GROUPS))return null;
  for(const g of MODULE_GROUPS){const it=(g.items||[]).find(x=>x&&x.id===id);if(it)return it}
  return null;
}
function removeFromAcademic(id){
  const it=findItem(id);if(it&&Array.isArray(it.roles))it.roles=it.roles.filter(r=>!AROLES.includes(N(r))&&N(r)!=='academic');
}
function ensureGroup(id,label){
  let g=MODULE_GROUPS.find(x=>x&&x.id===id);
  if(!g){g={id,label,roles:AROLES.slice(),items:[]};MODULE_GROUPS.push(g)}
  g.label=label;if(!Array.isArray(g.items))g.items=[];
  g.roles=[...new Set([...(g.roles||[]),...AROLES])];
  return g;
}
function move(id,target,label){
  let it=findItem(id);if(!it)return null;
  for(const g of MODULE_GROUPS){if(Array.isArray(g.items))g.items=g.items.filter(x=>x!==it)}
  onlyAcademic(it,label);target.items.push(it);return it;
}
function ensureSynthetic(target,id,label,renderer){
  let it=findItem(id);
  if(it){for(const g of MODULE_GROUPS){if(Array.isArray(g.items))g.items=g.items.filter(x=>x!==it)}}
  else it={id,label,built:true,render:renderer};
  onlyAcademic(it,label);it.built=true;if(renderer)it.render=renderer;target.items.push(it);return it;
}
function apply(){
  if(!isAcademic()||typeof MODULE_GROUPS==='undefined'||!Array.isArray(MODULE_GROUPS))return false;

  const academic=ensureGroup('akademik','Akademik');
  const monitoring=ensureGroup('academic-monitoring','Monitoring');
  const reports=ensureGroup('laporan','Laporan');

  // Bersihkan hanya keanggotaan role Akademik dari item yang akan diposisikan ulang.
  const ids=['leger','master-tp-akademik','rpp-lp','rpp-lp-akademik','bilingual','pjbl','akd-badal',
    'legger-live','academic-ranking-report','laporan-akademik-guru','akd-laporan-guru',
    'academic-pjbl-report','akd-badal-recap','rapor','laporan-promosi'];
  ids.forEach(removeFromAcademic);

  // Pengelolaan Akademik.
  ['leger','master-tp-akademik','bilingual','pjbl','akd-badal'].forEach(id=>{const it=findItem(id);if(it)move(id,academic)});
  const rpp=findItem('rpp-lp-akademik')||findItem('rpp-lp');
  if(rpp)move(rpp.id,academic,'RPP & LP');

  // Monitoring Akademik.
  const mon=findItem('legger-live');
  if(mon)move('legger-live',monitoring,'Monitoring Nilai');
  const ranking=findItem('academic-ranking-report');
  if(ranking)move('academic-ranking-report',monitoring,'Ranking');
  const teacher=findItem('akd-laporan-guru')||findItem('laporan-akademik-guru');
  if(teacher)move(teacher.id,monitoring,'Progres Guru');
  if(typeof window.renderAcademicPtsReadiness==='function'){
    ensureSynthetic(monitoring,'academic-pts-readiness','Kesiapan Rapor',window.renderAcademicPtsReadiness);
  }

  // Laporan/Rekap.
  const recap=findItem('akd-badal-recap');if(recap)move('akd-badal-recap',reports,'Rekapan Badal');
  const pj=findItem('academic-pjbl-report');if(pj)move('academic-pjbl-report',reports,'Laporan PjBL');
  const rapor=findItem('rapor');if(rapor)move('rapor',reports,'Cetak Rapor');

  // Promo Socmed: renderer bersama, tetapi item sidebar ini dibatasi ke Akademik saja.
  const promo=findItem('laporan-promosi');
  if(promo)move('laporan-promosi',reports,'Promo Socmed');
  else if(typeof window.renderPromotionReport==='function')ensureSynthetic(reports,'laporan-promosi','Promo Socmed',window.renderPromotionReport);

  // Urutan deterministik, tanpa mengubah item milik role lain.
  const order=(g,ids)=>{
    const rank=new Map(ids.map((id,i)=>[id,i]));
    g.items.sort((a,b)=>{
      const aa=(a.roles||[]).some(r=>AROLES.includes(N(r)))?rank.get(a.id):undefined;
      const bb=(b.roles||[]).some(r=>AROLES.includes(N(r)))?rank.get(b.id):undefined;
      if(aa===undefined&&bb===undefined)return 0;if(aa===undefined)return 1;if(bb===undefined)return-1;return aa-bb;
    });
  };
  order(academic,['leger','master-tp-akademik','rpp-lp-akademik','rpp-lp','bilingual','pjbl','akd-badal']);
  order(monitoring,['legger-live','academic-ranking-report','academic-pts-readiness','akd-laporan-guru','laporan-akademik-guru']);
  order(reports,['akd-badal-recap','academic-pjbl-report','rapor','laporan-promosi']);
  return true;
}
function install(){
  // Jalankan sesudah patch awal, lalu jadikan lapisan final sebelum render.
  apply();
  if(typeof renderSidebar==='function'&&!renderSidebar.__cqAcademicSidebarCleanV1){
    const old=renderSidebar;
    renderSidebar=function(){
      // Wrapper lama dapat menambah item sebelum memanggil kita; normalisasi di titik terakhir ini.
      if(isAcademic())apply();
      const out=old.apply(this,arguments);
      // Beberapa patch lama memutasi MODULE_GROUPS di dalam rantai render.
      // Normalisasi model sekali lagi tanpa render rekursif agar render berikutnya tetap deterministik.
      if(isAcademic())apply();
      return out;
    };
    renderSidebar.__cqAcademicSidebarCleanV1=true;
  }
  if(isAcademic()&&typeof renderSidebar==='function'){
    renderSidebar();
    // Ranking legacy memasang ulang role lewat click capture; bersihkan setelah event selesai.
    document.addEventListener('click',function(){setTimeout(function(){if(isAcademic()){apply();try{renderSidebar()}catch(_){}}},0)},true);
    // Guard ringan untuk patch interval/late loader saat startup saja.
    [80,250,600,1200,2200,4200].forEach(function(ms){setTimeout(function(){if(isAcademic()){apply();try{renderSidebar()}catch(_){}}},ms)});
  }
  window.__CQ_ACADEMIC_SIDEBAR_CLEAN_V1__=true;
}
let n=0;(function wait(){if(typeof MODULE_GROUPS!=='undefined'){install();return}if(++n<100)setTimeout(wait,120)})();
})();