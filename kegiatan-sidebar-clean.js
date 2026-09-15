/* CQlass — clean sidebar khusus Kabid Kegiatan
   Kedisiplinan dan Reward adalah ranah Kesiswaan, sehingga tidak ditampilkan
   dan tidak dapat dibuka dari role Kabid Kegiatan.
*/
(function(){
  'use strict';
  if(window.__cqKegiatanSidebarCleanV2) return;
  window.__cqKegiatanSidebarCleanV2=true;

  const BLOCKED_IDS=new Set(['kedisiplinan','reward']);

  function role(){
    try{return String(currentUser?.role||'').toLowerCase()}catch(_){return ''}
  }
  function isKegiatan(){return role()==='kegiatan'}
  function sidebar(){return document.getElementById('sidebar')}
  function text(el){return String(el?.textContent||'').trim()}

  function stripKegiatanPermissions(){
    if(!isKegiatan())return;
    try{
      if(typeof MODULE_GROUPS==='undefined'||!Array.isArray(MODULE_GROUPS))return;
      for(const group of MODULE_GROUPS){
        if(!group)continue;
        if(Array.isArray(group.items)){
          for(const item of group.items){
            if(!item)continue;
            if(BLOCKED_IDS.has(String(item.id||'').toLowerCase())&&Array.isArray(item.roles)){
              item.roles=item.roles.filter(r=>String(r||'').toLowerCase()!=='kegiatan');
            }
          }
        }
        if(String(group.id||'').toLowerCase()==='kesiswaan'&&Array.isArray(group.roles)){
          group.roles=group.roles.filter(r=>String(r||'').toLowerCase()!=='kegiatan');
        }
      }
    }catch(e){console.warn('Batas akses Kabid Kegiatan gagal diterapkan:',e)}
  }

  function findGroupContainer(header){
    if(!header)return null;
    let n=header;
    for(let i=0;i<5&&n&&n.parentElement;i++,n=n.parentElement){
      const p=n.parentElement;
      const directHeaders=[...p.children].filter(x=>/KESISWAAN|KEGIATAN|LAPORAN|INFO|AKADEMIK|TAHFIZH|PENCATATAN SISWA/.test(text(x).toUpperCase()));
      if(directHeaders.length||p.querySelector?.('.nav-item,.sidebar-item,.menu-item,button')) return p;
    }
    return header.parentElement;
  }

  function hideGroupByTitle(sb,title){
    const candidates=[...sb.querySelectorAll('*')].filter(el=>text(el).toUpperCase()===title);
    candidates.forEach(h=>{
      let group=h.closest('.nav-group,.sidebar-group,.menu-group,.sidebar-section');
      if(!group)group=findGroupContainer(h);
      if(group&&group!==sb)group.style.setProperty('display','none','important');
      else h.style.setProperty('display','none','important');
    });
  }

  function removeBlockedDom(sb){
    const old=document.getElementById('cq-kegiatan-pencatatan');
    if(old)old.remove();
    hideGroupByTitle(sb,'KESISWAAN');
    hideGroupByTitle(sb,'PENCATATAN SISWA');
    [...sb.querySelectorAll('button,a,.nav-item,.menu-item,.sidebar-item')].forEach(el=>{
      const moduleId=String(el.dataset?.module||el.getAttribute?.('data-module')||'').toLowerCase();
      const label=text(el).toLowerCase();
      if(BLOCKED_IDS.has(moduleId)||label==='kedisiplinan'||label==='reward siswa'||label==='reward'){
        el.style.setProperty('display','none','important');
      }
    });
  }

  function clean(){
    if(!isKegiatan())return;
    stripKegiatanPermissions();
    const sb=sidebar();if(!sb)return;
    removeBlockedDom(sb);
  }

  if(typeof setActiveModule==='function'&&!setActiveModule.__cqKegiatanBoundary){
    const originalSetActiveModule=setActiveModule;
    const wrapped=function(id){
      const key=String(id||'').toLowerCase();
      if(isKegiatan()&&BLOCKED_IDS.has(key)){
        try{if(typeof activeModule!=='undefined')activeModule='dashboard'}catch(_){ }
        return originalSetActiveModule('dashboard');
      }
      return originalSetActiveModule.apply(this,arguments);
    };
    wrapped.__cqKegiatanBoundary=true;
    setActiveModule=wrapped;
  }

  if(typeof renderSidebar==='function'&&!renderSidebar.__cqKegiatanSidebarCleanV2){
    const originalRenderSidebar=renderSidebar;
    const wrapped=function(){
      stripKegiatanPermissions();
      const out=originalRenderSidebar.apply(this,arguments);
      stripKegiatanPermissions();
      setTimeout(clean,0);
      return out;
    };
    wrapped.__cqKegiatanSidebarCleanV2=true;
    renderSidebar=wrapped;
  }

  let timer=0;
  function schedule(){clearTimeout(timer);timer=setTimeout(clean,20)}
  const obs=new MutationObserver(schedule);

  document.addEventListener('DOMContentLoaded',function(){
    const sb=sidebar();if(sb)obs.observe(sb,{childList:true,subtree:true});
    clean();
  },{once:true});
  window.addEventListener('load',function(){
    const sb=sidebar();if(sb&&!sb.dataset.cqKegiatanObservedV2){
      sb.dataset.cqKegiatanObservedV2='1';
      obs.observe(sb,{childList:true,subtree:true});
    }
    setTimeout(clean,80);
  },{once:true});

  document.addEventListener('click',function(){if(isKegiatan())setTimeout(clean,20)},true);
  setInterval(function(){if(isKegiatan())clean()},700);
  setTimeout(clean,80);
})();
