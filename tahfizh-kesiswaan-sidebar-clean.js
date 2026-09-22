/* CQlass — Tahfizh: Kesiswaan seperti Walas, submenu Kedisiplinan + Reward */
(function(){
  'use strict';
  if(window.__cqTahfizhKesiswaanSidebarClean20260922V4)return;
  window.__cqTahfizhKesiswaanSidebarClean20260922V4=true;

  const GROUP_ID='tahfizh-kesiswaan-group';
  // Marker tak terlihat menjaga grup ini dari cleanup shell lama; visual tetap "Kesiswaan".
  const GROUP_LABEL='Kesiswaan\u200B';
  const ROLES=['tahfizh','kabid_tahfizh'];
  const POINT_ORDER=['kedisiplinan','reward'];
  const POINT_IDS=new Set(POINT_ORDER);
  const POINT_LABELS=new Set(['reward','reward siswa','kedisiplinan']);
  const norm=v=>String(v||'').replace(/[\u200B-\u200D\uFEFF]/g,'').trim().toLowerCase().replace(/\s+/g,' ');

  function role(){
    try{return norm(currentUser?.role||currentUser?.primary_role||currentUser?.role_code).replace(/[ -]+/g,'_')}
    catch(_){try{return norm(JSON.parse(localStorage.getItem('cqlass_user')||'{}').role).replace(/[ -]+/g,'_')}catch(_2){return''}}
  }
  function isTahfizh(){const r=role();return r==='tahfizh'||r==='kabid_tahfizh'||(r.includes('kabid')&&(r.includes('tahfizh')||r.includes('quran')))}
  function removeTahfizhRole(arr){return Array.isArray(arr)?arr.filter(x=>!ROLES.includes(norm(x).replace(/[ -]+/g,'_'))):[]}
  function removeGroup(id){if(typeof MODULE_GROUPS==='undefined')return;const i=MODULE_GROUPS.findIndex(g=>g&&g.id===id);if(i>=0)MODULE_GROUPS.splice(i,1)}

  function ensureGroup(){
    if(!isTahfizh()||typeof MODULE_GROUPS==='undefined'||!Array.isArray(MODULE_GROUPS))return false;

    // Ambil modul asli Kedisiplinan/Reward agar UI dan alurnya sama dengan Walas.
    const routes=new Map();
    for(const g of MODULE_GROUPS){
      for(const it of (g?.items||[])){
        const id=norm(it?.id),label=norm(it?.label);
        if(POINT_IDS.has(id)&&!routes.has(id))routes.set(id,it);
        else if(label==='kedisiplinan'&&!routes.has('kedisiplinan'))routes.set('kedisiplinan',it);
        else if((label==='reward'||label==='reward siswa')&&!routes.has('reward'))routes.set('reward',it);
      }
    }

    // Hilangkan akses Tahfizh ke salinan point-menu di grup lain agar tidak dobel.
    for(const g of MODULE_GROUPS){
      if(!g||!Array.isArray(g.items)||g.id===GROUP_ID)continue;
      for(const it of g.items){
        const id=norm(it?.id),label=norm(it?.label);
        if(POINT_IDS.has(id)||POINT_LABELS.has(label))it.roles=removeTahfizhRole(it.roles);
        if(id==='kesiswaan-center'||label==='kesiswaan')it.roles=removeTahfizhRole(it.roles);
      }
    }

    removeGroup(GROUP_ID);
    const items=[];
    const discipline=routes.get('kedisiplinan');
    if(discipline){discipline.label='Kedisiplinan';discipline.roles=[...ROLES];discipline.hidden=false;items.push(discipline)}
    const reward=routes.get('reward');
    if(reward){reward.label='Reward';reward.roles=[...ROLES];reward.hidden=false;items.push(reward)}

    const group={id:GROUP_ID,label:GROUP_LABEL,roles:[...ROLES],items};
    const tahIndex=MODULE_GROUPS.findIndex(g=>g&&(['tahfizh','partner-tasks'].includes(String(g.id||'').toLowerCase())||norm(g.label)==='tahfizh'));
    MODULE_GROUPS.splice(tahIndex>=0?tahIndex+1:0,0,group);
    return true;
  }

  function cleanDom(){
    if(!isTahfizh())return;
    const sb=document.getElementById('sidebar');if(!sb)return;
    [...sb.querySelectorAll('.nav-group-head')].forEach(head=>{
      const rawLabel=String(head.querySelector('span')?.textContent||head.textContent||'');
      const label=norm(rawLabel),body=head.nextElementSibling;
      if(!body?.classList?.contains('nav-group-items'))return;

      // Pada grup Laporan, jangan biarkan Kesiswaan/Reward/Kedisiplinan muncul lagi.
      if(label==='laporan'){
        [...body.querySelectorAll('button,a,.nav-item,.sidebar-item,.menu-item,[data-module]')].forEach(el=>{
          const id=norm(el.dataset?.module||el.getAttribute?.('data-module')),txt=norm(el.textContent);
          if(POINT_IDS.has(id)||POINT_LABELS.has(txt)||id==='kesiswaan-center'||txt==='kesiswaan')el.remove();
        });
      }
    });
  }

  function patch(){
    if(typeof renderSidebar==='function'&&!renderSidebar.__cqTahfizhKesiswaanV4){
      const old=renderSidebar;
      const wrapped=function(){if(isTahfizh())ensureGroup();const out=old.apply(this,arguments);requestAnimationFrame(cleanDom);return out};
      wrapped.__cqTahfizhKesiswaanV4=true;renderSidebar=wrapped;
    }
  }

  function apply(){if(!isTahfizh())return;const ok=ensureGroup();patch();if(ok&&typeof renderSidebar==='function')renderSidebar();cleanDom()}
  patch();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(apply,50),{once:true});else setTimeout(apply,50);
  window.addEventListener('load',()=>setTimeout(apply,0),{once:true});
  const attach=()=>{const sb=document.getElementById('sidebar');if(!sb||sb.__cqTahfizhKesiswaanObserverV4)return;sb.__cqTahfizhKesiswaanObserverV4=true;new MutationObserver(cleanDom).observe(sb,{childList:true,subtree:true})};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',attach,{once:true});else attach();
})();