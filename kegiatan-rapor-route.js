/* CQlass — Kabid Kegiatan: dedicated Rapor sidebar.
   Dashboard remains focused on live attendance; report/grade monitoring lives here. */
(function(){
  'use strict';
  if(window.__cqKegiatanRaporRouteV1)return;
  window.__cqKegiatanRaporRouteV1=true;
  const norm=v=>String(v||'').trim().toLowerCase().replace(/[\s-]+/g,'_');
  function role(){try{return norm(currentUser?.role||JSON.parse(localStorage.getItem('cqlass_user')||'{}')?.role)}catch(_){return''}}
  function allowed(){return ['kegiatan','kabid_kegiatan'].includes(role())}
  function render(c){
    if(!allowed())return;
    c=c||document.getElementById('content');if(!c)return;
    c.innerHTML=`<div id="kv2-root" class="kv2"><div class="kv2-head"><div><h2 style="margin:0">Rapor Ekskul</h2><p style="margin:5px 0 0;color:var(--muted,#718181);font-size:11px">Pantau kelengkapan nilai rapor ekskul per pelatih dan siswa.</p></div></div><div class="kv2-kpis"></div></div>`;
    setTimeout(()=>{try{window.kglrRefresh?.()}catch(_){}
      try{if(typeof window.kxrgShow==='function')window.kxrgShow()}catch(_){}
    },80);
  }
  function install(){
    if(!allowed()||typeof MODULE_GROUPS==='undefined'||!Array.isArray(MODULE_GROUPS))return false;
    let g=MODULE_GROUPS.find(x=>x&&x.id==='kegiatan-rapor-group');
    if(!g){
      g={id:'kegiatan-rapor-group',label:'Rapor',roles:['kegiatan'],items:[]};
      MODULE_GROUPS.push(g);
    }
    if(!g.roles.includes('kegiatan'))g.roles.push('kegiatan');
    let it=g.items.find(x=>x&&x.id==='kegiatan-rapor');
    const def={id:'kegiatan-rapor',label:'Rapor Ekskul',roles:['kegiatan'],built:true,render};
    if(it)Object.assign(it,def);else g.items.push(def);
    return true;
  }
  window.renderKegiatanRaporRoute=render;
  function boot(){if(install()&&allowed()){try{renderSidebar?.()}catch(_){}}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,70));else setTimeout(boot,0);
  setTimeout(boot,400);setTimeout(boot,1200);
})();