/* CQlass — Tahfizh: Reward/Kedisiplinan hanya lewat satu pintu Kesiswaan */
(function(){
  'use strict';
  if(window.__cqTahfizhKesiswaanSidebarClean20260922)return;
  window.__cqTahfizhKesiswaanSidebarClean20260922=true;

  const POINT_IDS=new Set(['reward','kedisiplinan']);
  const POINT_LABELS=new Set(['reward','reward siswa','kedisiplinan']);

  function norm(v){return String(v||'').trim().toLowerCase().replace(/\s+/g,' ')}
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
        for(const it of (g.items||[])){
          if(!it)continue;
          const id=norm(it.id),label=norm(it.label);
          if(POINT_IDS.has(id)||POINT_LABELS.has(label))it.roles=removeTahfizhRole(it.roles);
        }
      }
    }catch(e){console.warn('Tahfizh Kesiswaan model clean:',e)}
  }

  function cleanDom(){
    if(!isTahfizh())return;
    const sb=document.getElementById('sidebar');if(!sb)return;
    const nodes=[...sb.querySelectorAll('button,a,.nav-item,.sidebar-item,.menu-item,[data-module]')];
    for(const el of nodes){
      const id=norm(el.dataset?.module||el.getAttribute?.('data-module'));
      const label=norm(el.textContent);
      if(POINT_IDS.has(id)||POINT_LABELS.has(label))el.style.setProperty('display','none','important');
    }
    [...sb.querySelectorAll('.nav-group-head')].forEach(head=>{
      const label=norm(head.querySelector('span')?.textContent||head.textContent);
      if(label!=='kesiswaan')return;
      const body=head.nextElementSibling;
      if(body?.classList?.contains('nav-group-items'))body.style.setProperty('display','none','important');
      head.style.setProperty('display','none','important');
    });
  }

  function centerExists(){
    try{return typeof MODULE_GROUPS!=='undefined'&&Array.isArray(MODULE_GROUPS)&&MODULE_GROUPS.some(g=>(g?.items||[]).some(it=>it&&String(it.id)==='kesiswaan-center'))}
    catch(_){return false}
  }

  function patch(){
    if(typeof renderSidebar==='function'&&!renderSidebar.__cqTahfizhPointSingleDoor){
      const old=renderSidebar;
      const wrapped=function(){cleanModel();const out=old.apply(this,arguments);setTimeout(cleanDom,0);return out};
      wrapped.__cqTahfizhPointSingleDoor=true;
      renderSidebar=wrapped;
    }
    if(typeof setActiveModule==='function'&&!setActiveModule.__cqTahfizhPointSingleDoor){
      const old=setActiveModule;
      const wrapped=function(id){
        const key=norm(id);
        if(isTahfizh()&&POINT_IDS.has(key))return old.call(this,centerExists()?'kesiswaan-center':'dashboard');
        return old.apply(this,arguments);
      };
      wrapped.__cqTahfizhPointSingleDoor=true;
      setActiveModule=wrapped;
    }
  }

  function apply(){if(!isTahfizh())return;cleanModel();patch();cleanDom()}
  patch();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(apply,120));else setTimeout(apply,120);
  const mo=new MutationObserver(()=>{if(isTahfizh()){cleanModel();cleanDom()}});
  mo.observe(document.documentElement,{childList:true,subtree:true});
  setTimeout(apply,450);setTimeout(apply,1000);setInterval(()=>{if(isTahfizh())apply()},2500);
})();
