/* CQlass — Kabid Tahfizh: stable monthly + UKJ menu (no render loop) */
(function(){
  'use strict';
  if(window.__CQ_TAHFIZH_SHELL_FIX_V6__) return;
  window.__CQ_TAHFIZH_SHELL_FIX_V6__=1;

  const ROLES=['tahfizh','kabid_tahfizh'];
  const norm=v=>String(v||'').replace(/[\u200B-\u200D\uFEFF]/g,'').trim().toLowerCase().replace(/[\s-]+/g,'_');
  const TOOLS=[
    {id:'tahfizh-monthly-report',label:'Laporan Bulanan',url:'tahfizh-monthly.html?v=20260924-stable1'},
    {id:'tahfizh-ukj-score',label:'UKJ',url:'tahfizh-ukj-score.html?v=20260924-stable1'}
  ];

  function role(){
    try{
      const saved=JSON.parse(localStorage.getItem('cqlass_user')||'{}')||{};
      const u=(typeof currentUser!=='undefined'&&currentUser)||saved;
      return norm(u.role||u.primary_role||u.role_code||saved.role||'');
    }catch(_){return''}
  }
  function allowed(){
    const r=role();
    return ROLES.includes(r)||(r.includes('kabid')&&(r.includes('tahfizh')||r.includes('quran')));
  }
  function go(def){
    if(!allowed()||!def)return false;
    window.location.href=def.url;
    return true;
  }
  function byId(id){return TOOLS.find(x=>x.id===String(id||''))||null}

  function ensureTools(){
    if(!allowed()||typeof MODULE_GROUPS==='undefined'||!Array.isArray(MODULE_GROUPS))return false;
    let group=MODULE_GROUPS.find(g=>g&&(norm(g.id)==='tahfizh'||norm(g.id)==='tahfizh_tools'||norm(g.label)==='tahfizh'));
    if(!group){
      group={id:'tahfizh-tools',label:'Tahfizh',roles:[...ROLES],items:[]};
      MODULE_GROUPS.push(group);
    }
    group.label='Tahfizh';
    group.roles=[...new Set([...(Array.isArray(group.roles)?group.roles:[]),...ROLES])];
    if(!Array.isArray(group.items))group.items=[];
    for(const d of TOOLS){
      let item=group.items.find(x=>x&&x.id===d.id);
      const render=()=>go(d);
      if(!item){group.items.push({id:d.id,label:d.label,roles:[...ROLES],built:true,render});}
      else{item.label=d.label;item.roles=[...new Set([...(Array.isArray(item.roles)?item.roles:[]),...ROLES])];item.built=true;item.render=render;}
    }
    return true;
  }

  function patchNavigation(){
    if(typeof setActiveModule!=='function'||setActiveModule.__cqTahfizhStableV6)return;
    const original=setActiveModule;
    const wrapped=function(id){
      const def=byId(id);
      if(def&&allowed())return go(def);
      return original.apply(this,arguments);
    };
    wrapped.__cqTahfizhStableV6=true;
    setActiveModule=wrapped;
  }

  function patchSidebar(){
    if(typeof renderSidebar!=='function'||renderSidebar.__cqTahfizhStableV6)return;
    const original=renderSidebar;
    const wrapped=function(){
      if(allowed())ensureTools();
      return original.apply(this,arguments);
    };
    wrapped.__cqTahfizhStableV6=true;
    renderSidebar=wrapped;
  }

  function install(){
    if(!allowed())return false;
    patchNavigation();
    patchSidebar();
    const ok=ensureTools();
    if(ok&&typeof renderSidebar==='function'){
      try{renderSidebar()}catch(e){console.warn('Tahfizh menu render:',e)}
    }
    return ok;
  }

  // Retry only during initial boot. No MutationObserver and no recurring interval.
  let tries=0;
  (function boot(){
    tries++;
    if(install()||tries>=12)return;
    setTimeout(boot,250);
  })();

  if(typeof enterApp==='function'&&!enterApp.__cqTahfizhStableV6){
    const originalEnter=enterApp;
    const wrapped=function(){
      const out=originalEnter.apply(this,arguments);
      setTimeout(install,60);
      return out;
    };
    wrapped.__cqTahfizhStableV6=true;
    enterApp=wrapped;
  }
})();
