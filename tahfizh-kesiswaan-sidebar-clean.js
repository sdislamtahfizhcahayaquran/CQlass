/* CQlass — Tahfizh biasa: Kesiswaan seperti Walas, submenu Kedisiplinan + Reward */
(function(){
  'use strict';
  if(window.__cqTahfizhKesiswaanSidebarClean20260924V6)return;
  window.__cqTahfizhKesiswaanSidebarClean20260924V6=true;

  const GROUP_ID='tahfizh-kesiswaan-group';
  const GROUP_LABEL='Kesiswaan\u200B';
  const ROLES=['tahfizh'];
  const GENERIC_POINT_IDS=new Set(['kedisiplinan','reward']);
  const GENERIC_POINT_LABELS=new Set(['kedisiplinan','reward','reward siswa']);
  const norm=v=>String(v||'').replace(/[\u200B-\u200D\uFEFF]/g,'').trim().toLowerCase().replace(/\s+/g,' ');

  function role(){
    try{return norm(currentUser?.role||currentUser?.primary_role||currentUser?.role_code).replace(/[ -]+/g,'_')}
    catch(_){try{return norm(JSON.parse(localStorage.getItem('cqlass_user')||'{}').role).replace(/[ -]+/g,'_')}catch(_2){return''}}
  }
  function isTahfizh(){return role()==='tahfizh'}
  function removeTahfizhRole(arr){return Array.isArray(arr)?arr.filter(x=>!ROLES.includes(norm(x).replace(/[ -]+/g,'_'))):[]}
  function removeGroup(id){if(typeof MODULE_GROUPS==='undefined')return;const i=MODULE_GROUPS.findIndex(g=>g&&g.id===id);if(i>=0)MODULE_GROUPS.splice(i,1)}

  function renderPoint(content,kind){
    const label=kind==='discipline'?'Kedisiplinan':'Reward';
    const tryRender=()=>{
      try{
        if(kind==='discipline'&&typeof renderKedisiplinan==='function'){renderKedisiplinan(content);return true}
        if(kind==='reward'&&typeof renderReward==='function'){renderReward(content);return true}
      }catch(e){console.warn('Tahfizh Kesiswaan render:',e)}
      return false;
    };
    if(tryRender())return;
    content.innerHTML=`<div class="card"><span class="spinner"></span> Memuat ${label}...</div>`;
    let n=0;const t=setInterval(()=>{if(tryRender()||++n>40){clearInterval(t);if(n>40)content.innerHTML=`<div class="empty-state">Modul ${label} belum dapat dimuat. Silakan buka ulang menu ini.</div>`}},100);
  }

  function ensureGroup(){
    if(!isTahfizh()||typeof MODULE_GROUPS==='undefined'||!Array.isArray(MODULE_GROUPS))return false;

    for(const g of MODULE_GROUPS){
      if(!g||!Array.isArray(g.items)||g.id===GROUP_ID)continue;
      for(const it of g.items){
        const id=norm(it?.id),label=norm(it?.label);
        if(GENERIC_POINT_IDS.has(id)||GENERIC_POINT_LABELS.has(label)||id==='kesiswaan-center'||label==='kesiswaan'){
          it.roles=removeTahfizhRole(it.roles);
        }
      }
    }

    removeGroup(GROUP_ID);
    const items=[
      {id:'tahfizh-kedisiplinan',label:'Kedisiplinan',roles:[...ROLES],built:true,render:c=>renderPoint(c,'discipline')},
      {id:'tahfizh-reward',label:'Reward',roles:[...ROLES],built:true,render:c=>renderPoint(c,'reward')}
    ];
    const group={id:GROUP_ID,label:GROUP_LABEL,roles:[...ROLES],items};
    const tahIndex=MODULE_GROUPS.findIndex(g=>g&&(['tahfizh','partner-tasks'].includes(String(g.id||'').toLowerCase())||norm(g.label)==='tahfizh'));
    MODULE_GROUPS.splice(tahIndex>=0?tahIndex+1:0,0,group);
    return true;
  }

  function cleanDom(){
    if(!isTahfizh())return;
    const sb=document.getElementById('sidebar');if(!sb)return;
    [...sb.querySelectorAll('.nav-group-head')].forEach(head=>{
      const label=norm(head.querySelector('span')?.textContent||head.textContent),body=head.nextElementSibling;
      if(!body?.classList?.contains('nav-group-items'))return;
      if(label==='laporan'){
        [...body.querySelectorAll('button,a,.nav-item,.sidebar-item,.menu-item,[data-module]')].forEach(el=>{
          const id=norm(el.dataset?.module||el.getAttribute?.('data-module')),txt=norm(el.textContent);
          if(GENERIC_POINT_IDS.has(id)||GENERIC_POINT_LABELS.has(txt)||id==='kesiswaan-center'||txt==='kesiswaan')el.remove();
        });
      }
    });
  }

  function patch(){
    if(typeof renderSidebar==='function'&&!renderSidebar.__cqTahfizhKesiswaanV6){
      const old=renderSidebar;
      const wrapped=function(){if(isTahfizh())ensureGroup();const out=old.apply(this,arguments);requestAnimationFrame(cleanDom);return out};
      wrapped.__cqTahfizhKesiswaanV6=true;renderSidebar=wrapped;
    }
  }

  function apply(){if(!isTahfizh())return;const ok=ensureGroup();patch();if(ok&&typeof renderSidebar==='function')renderSidebar();cleanDom()}
  patch();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(apply,50),{once:true});else setTimeout(apply,50);
  window.addEventListener('load',()=>setTimeout(apply,0),{once:true});
  const attach=()=>{const sb=document.getElementById('sidebar');if(!sb||sb.__cqTahfizhKesiswaanObserverV6)return;sb.__cqTahfizhKesiswaanObserverV6=true;new MutationObserver(cleanDom).observe(sb,{childList:true,subtree:true})};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',attach,{once:true});else attach();
})();
