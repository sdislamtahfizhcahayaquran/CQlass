/* CQlass — Tahfizh: Kesiswaan berdiri sendiri, Reward/Kedisiplinan lewat satu pintu */
(function(){
  'use strict';
  if(window.__cqTahfizhKesiswaanSidebarClean20260922V3)return;
  window.__cqTahfizhKesiswaanSidebarClean20260922V3=true;

  const GROUP_ID='tahfizh-kesiswaan-group';
  const CENTER_ID='kesiswaan-center';
  const ROLES=['tahfizh','kabid_tahfizh'];
  const POINT_IDS=new Set(['reward','kedisiplinan']);
  const POINT_LABELS=new Set(['reward','reward siswa','kedisiplinan']);
  const norm=v=>String(v||'').trim().toLowerCase().replace(/\s+/g,' ');

  function role(){
    try{return norm(currentUser?.role||currentUser?.primary_role||currentUser?.role_code).replace(/[ -]+/g,'_')}
    catch(_){try{return norm(JSON.parse(localStorage.getItem('cqlass_user')||'{}').role).replace(/[ -]+/g,'_')}catch(_2){return''}}
  }
  function isTahfizh(){const r=role();return r==='tahfizh'||r==='kabid_tahfizh'||(r.includes('kabid')&&(r.includes('tahfizh')||r.includes('quran')))}
  function removeTahfizhRole(arr){return Array.isArray(arr)?arr.filter(x=>!ROLES.includes(norm(x).replace(/[ -]+/g,'_'))):[]}
  function removeGroup(id){if(typeof MODULE_GROUPS==='undefined')return;const i=MODULE_GROUPS.findIndex(g=>g&&g.id===id);if(i>=0)MODULE_GROUPS.splice(i,1)}

  function fallbackCenter(content){
    content.innerHTML=`<div class="cq-kesiswaan-center"><h1>Kesiswaan</h1><p class="sub">Pilih data yang akan dicatat. Reward dan Kedisiplinan memakai database siswa yang sama dengan Walas dan Kesiswaan.</p><div class="cq-kesiswaan-choice-grid"><button type="button" class="cq-kesiswaan-choice" id="cq-tahfizh-reward"><b>Reward</b><span>Catat reward siswa.</span><span class="go">Buka Reward →</span></button><button type="button" class="cq-kesiswaan-choice" id="cq-tahfizh-discipline"><b>Kedisiplinan</b><span>Catat kedisiplinan per siswa atau jenis pelanggaran.</span><span class="go">Buka Kedisiplinan →</span></button></div></div>`;
    document.getElementById('cq-tahfizh-reward')?.addEventListener('click',()=>{if(typeof renderReward==='function')renderReward(content);else if(typeof setActiveModule==='function')setActiveModule('reward')});
    document.getElementById('cq-tahfizh-discipline')?.addEventListener('click',()=>{if(typeof renderKedisiplinan==='function')renderKedisiplinan(content);else if(typeof setActiveModule==='function')setActiveModule('kedisiplinan')});
  }

  function ensureGroup(){
    if(!isTahfizh()||typeof MODULE_GROUPS==='undefined'||!Array.isArray(MODULE_GROUPS))return false;
    let center=null;
    for(const g of MODULE_GROUPS){
      if(!g||!Array.isArray(g.items))continue;
      const x=g.items.find(it=>it&&it.id===CENTER_ID);if(x&&!center)center=x;
      g.items=g.items.filter(it=>it&&it.id!==CENTER_ID);
      for(const it of g.items){
        const id=norm(it?.id),label=norm(it?.label);
        if(POINT_IDS.has(id)||POINT_LABELS.has(label))it.roles=removeTahfizhRole(it.roles);
      }
    }
    removeGroup(GROUP_ID);
    if(!center)center={id:CENTER_ID,label:'Kesiswaan',built:true,render:fallbackCenter};
    center.label='Kesiswaan';center.roles=[...ROLES];center.built=true;
    if(typeof center.render!=='function')center.render=fallbackCenter;
    const group={id:GROUP_ID,label:'Kesiswaan',roles:[...ROLES],items:[center]};
    const tahIndex=MODULE_GROUPS.findIndex(g=>g&&(['tahfizh','partner-tasks'].includes(String(g.id||'').toLowerCase())||norm(g.label)==='tahfizh'));
    MODULE_GROUPS.splice(tahIndex>=0?tahIndex+1:0,0,group);
    return true;
  }

  function cleanDom(){
    if(!isTahfizh())return;
    const sb=document.getElementById('sidebar');if(!sb)return;
    [...sb.querySelectorAll('.nav-group-head')].forEach(head=>{
      const label=norm(head.querySelector('span')?.textContent||head.textContent);
      const body=head.nextElementSibling;if(!body?.classList?.contains('nav-group-items'))return;
      if(label==='laporan'||label==='kesiswaan'){
        [...body.querySelectorAll('button,a,.nav-item,.sidebar-item,.menu-item,[data-module]')].forEach(el=>{
          const id=norm(el.dataset?.module||el.getAttribute?.('data-module')),txt=norm(el.textContent);
          if(POINT_IDS.has(id)||POINT_LABELS.has(txt))el.style.setProperty('display','none','important');
          if(label==='laporan'&&(id===CENTER_ID||txt==='kesiswaan'))el.style.setProperty('display','none','important');
        });
      }
    });
  }

  function patch(){
    if(typeof renderSidebar==='function'&&!renderSidebar.__cqTahfizhKesiswaanV3){
      const old=renderSidebar;
      const wrapped=function(){if(isTahfizh())ensureGroup();const out=old.apply(this,arguments);requestAnimationFrame(cleanDom);return out};
      wrapped.__cqTahfizhKesiswaanV3=true;renderSidebar=wrapped;
    }
    if(typeof setActiveModule==='function'&&!setActiveModule.__cqTahfizhKesiswaanV3){
      const old=setActiveModule;
      const wrapped=function(id){const key=norm(id);if(isTahfizh()&&POINT_IDS.has(key))return old.call(this,CENTER_ID);return old.apply(this,arguments)};
      wrapped.__cqTahfizhKesiswaanV3=true;setActiveModule=wrapped;
    }
  }

  function apply(){if(!isTahfizh())return;const ok=ensureGroup();patch();if(ok&&typeof renderSidebar==='function')renderSidebar();cleanDom()}
  patch();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(apply,50),{once:true});else setTimeout(apply,50);
  window.addEventListener('load',()=>setTimeout(apply,0),{once:true});
  const attach=()=>{const sb=document.getElementById('sidebar');if(!sb||sb.__cqTahfizhKesiswaanObserverV3)return;sb.__cqTahfizhKesiswaanObserverV3=true;new MutationObserver(cleanDom).observe(sb,{childList:true,subtree:true})};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',attach,{once:true});else attach();
})();
