/* CQlass — Tahfizh: Reward/Kedisiplinan hanya lewat satu pintu Kesiswaan */
(function(){
  'use strict';
  if(window.__cqTahfizhKesiswaanSidebarClean20260922V2)return;
  window.__cqTahfizhKesiswaanSidebarClean20260922V2=true;

  const POINT_IDS=new Set(['reward','kedisiplinan']);
  const POINT_LABELS=new Set(['reward','reward siswa','kedisiplinan']);
  const norm=v=>String(v||'').trim().toLowerCase().replace(/\s+/g,' ');

  function role(){
    try{return norm(currentUser?.role||currentUser?.primary_role||currentUser?.role_code).replace(/[ -]+/g,'_')}
    catch(_){try{return norm(JSON.parse(localStorage.getItem('cqlass_user')||'{}').role).replace(/[ -]+/g,'_')}catch(_2){return''}}
  }
  function isTahfizh(){const r=role();return r==='tahfizh'||r==='kabid_tahfizh'||(r.includes('kabid')&&(r.includes('tahfizh')||r.includes('quran')))}
  function removeTahfizhRole(arr){return Array.isArray(arr)?arr.filter(x=>!['tahfizh','kabid_tahfizh'].includes(norm(x).replace(/[ -]+/g,'_'))):arr}

  function cleanModel(){
    if(!isTahfizh())return;
    try{
      if(typeof MODULE_GROUPS==='undefined'||!Array.isArray(MODULE_GROUPS))return;
      for(const g of MODULE_GROUPS){
        if(!g)continue;
        const gid=norm(g.id),glabel=norm(g.label);
        if(gid==='kesiswaan'||glabel==='kesiswaan')g.roles=removeTahfizhRole(g.roles);
        if(Array.isArray(g.items))g.items=g.items.filter(it=>{
          const id=norm(it?.id),label=norm(it?.label);
          if(POINT_IDS.has(id)||POINT_LABELS.has(label)){
            it.roles=removeTahfizhRole(it.roles);
          }
          return true;
        });
      }
    }catch(e){console.warn('Tahfizh Kesiswaan model clean:',e)}
  }

  function cleanDom(){
    if(!isTahfizh())return;
    const sb=document.getElementById('sidebar');if(!sb)return;
    [...sb.querySelectorAll('button,a,.nav-item,.sidebar-item,.menu-item,[data-module]')].forEach(el=>{
      const id=norm(el.dataset?.module||el.getAttribute?.('data-module'));
      const label=norm(el.textContent);
      if(POINT_IDS.has(id)||POINT_LABELS.has(label))el.remove();
    });
  }

  function centerExists(){
    try{return typeof MODULE_GROUPS!=='undefined'&&Array.isArray(MODULE_GROUPS)&&MODULE_GROUPS.some(g=>(g?.items||[]).some(it=>it&&String(it.id)==='kesiswaan-center'))}
    catch(_){return false}
  }

  function patch(){
    if(typeof renderSidebar==='function'&&!renderSidebar.__cqTahfizhPointSingleDoorV2){
      const old=renderSidebar;
      const wrapped=function(){cleanModel();const out=old.apply(this,arguments);requestAnimationFrame(cleanDom);return out};
      wrapped.__cqTahfizhPointSingleDoorV2=true;renderSidebar=wrapped;
    }
    if(typeof setActiveModule==='function'&&!setActiveModule.__cqTahfizhPointSingleDoorV2){
      const old=setActiveModule;
      const wrapped=function(id){
        const key=norm(id);
        if(isTahfizh()&&POINT_IDS.has(key))return old.call(this,centerExists()?'kesiswaan-center':'dashboard');
        return old.apply(this,arguments);
      };
      wrapped.__cqTahfizhPointSingleDoorV2=true;setActiveModule=wrapped;
    }
  }

  function apply(){if(!isTahfizh())return;cleanModel();patch();cleanDom()}
  patch();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(apply,40),{once:true});else setTimeout(apply,40);
  window.addEventListener('load',()=>setTimeout(apply,0),{once:true});

  // Hanya pantau sidebar. Versi lama memantau seluruh dokumen + polling 2,5 detik,
  // yang membuat UI terasa berat.
  const attach=()=>{
    const sb=document.getElementById('sidebar');if(!sb||sb.__cqTahfizhKesiswaanObserver)return;
    sb.__cqTahfizhKesiswaanObserver=true;
    new MutationObserver(cleanDom).observe(sb,{childList:true,subtree:true});
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',attach,{once:true});else attach();
})();
