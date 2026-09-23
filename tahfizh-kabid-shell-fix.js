/* CQlass — Kabid Tahfizh only: Nilai PTS + Laporan Bulanan + UKJ, no Kesiswaan/Badal */
(function(){
  'use strict';
  if(window.__CQ_TAHFIZH_SHELL_FIX_V9__) return;
  window.__CQ_TAHFIZH_SHELL_FIX_V9__=1;

  const ROLE='kabid_tahfizh';
  const norm=v=>String(v||'').replace(/[\u200B-\u200D\uFEFF]/g,'').trim().toLowerCase().replace(/[\s-]+/g,'_');
  const TOOLS=[
    {id:'tahfizh-pts-kabid',label:'Nilai PTS',url:'tahfizh-pts.html?v=20260924-kabid3'},
    {id:'tahfizh-monthly-report',label:'Laporan Bulanan',url:'tahfizh-monthly.html?v=20260924-kabid3'},
    {id:'tahfizh-ukj-score',label:'UKJ',url:'tahfizh-ukj-score.html?v=20260924-kabid3'}
  ];
  const KESISWAAN_ITEM_IDS=new Set(['kesiswaan-center','kedisiplinan','reward','tahfizh-kedisiplinan','tahfizh-reward']);

  function role(){
    try{
      const saved=JSON.parse(localStorage.getItem('cqlass_user')||'{}')||{};
      const u=(typeof currentUser!=='undefined'&&currentUser)||saved;
      return norm(u.role||u.primary_role||u.role_code||saved.role||'');
    }catch(_){return''}
  }
  function allowed(){return role()===ROLE}
  function go(def){if(!allowed()||!def)return false;window.location.href=def.url;return true}
  function byId(id){return TOOLS.find(x=>x.id===String(id||''))||null}
  function withoutKabid(arr){return Array.isArray(arr)?arr.filter(r=>norm(r)!==ROLE):[]}
  function isTahfizhGroup(g){return !!(g&&(norm(g.id)==='tahfizh'||norm(g.id)==='tahfizh_tools'||norm(g.id)==='partner_tasks'||norm(g.label)==='tahfizh'))}

  function stripKesiswaan(){
    if(!allowed()||typeof MODULE_GROUPS==='undefined'||!Array.isArray(MODULE_GROUPS))return false;
    for(let i=MODULE_GROUPS.length-1;i>=0;i--){
      const g=MODULE_GROUPS[i];if(!g)continue;
      const gid=norm(g.id),label=norm(g.label);
      if(gid==='tahfizh_kesiswaan_group'){MODULE_GROUPS.splice(i,1);continue}
      if(gid==='kesiswaan'||label==='kesiswaan')g.roles=withoutKabid(g.roles);
      if(Array.isArray(g.items))for(const item of g.items){
        if(!item)continue;
        const iid=norm(item.id),ilabel=norm(item.label);
        if(KESISWAAN_ITEM_IDS.has(iid)||ilabel==='kesiswaan'||ilabel==='kedisiplinan'||ilabel==='reward'||ilabel==='reward_siswa')item.roles=withoutKabid(item.roles);
      }
    }
    return true;
  }

  function ensureTahfizhGroup(){
    if(!allowed()||typeof MODULE_GROUPS==='undefined'||!Array.isArray(MODULE_GROUPS))return false;
    stripKesiswaan();
    const groups=MODULE_GROUPS.filter(isTahfizhGroup);
    let group=groups.find(g=>norm(g.id)==='tahfizh')||groups[0];
    if(!group){
      group={id:'tahfizh-tools',label:'Tahfizh',roles:[ROLE],items:[]};
      const dashIndex=MODULE_GROUPS.findIndex(g=>g&&norm(g.id)==='dashboard');
      MODULE_GROUPS.splice(dashIndex>=0?dashIndex+1:0,0,group);
    }

    for(const g of groups){
      if(g===group)continue;
      g.roles=withoutKabid(g.roles);
      if(Array.isArray(g.items))g.items.forEach(it=>{if(it)it.roles=withoutKabid(it.roles)});
    }

    group.label='Tahfizh';
    group.roles=[ROLE];
    group.items=TOOLS.map(d=>({id:d.id,label:d.label,roles:[ROLE],built:true,render:()=>go(d)}));
    return true;
  }

  function patchNavigation(){
    if(typeof setActiveModule!=='function'||setActiveModule.__cqTahfizhKabidOnlyV9)return;
    const original=setActiveModule;
    const wrapped=function(id){
      const key=norm(id),def=byId(id);
      if(def&&allowed())return go(def);
      if(allowed()&&(KESISWAAN_ITEM_IDS.has(key)||key==='kesiswaan'))return original.call(this,'dashboard');
      const out=original.apply(this,arguments);
      if(allowed()&&String(id||'')==='dashboard')setTimeout(()=>{try{window.cqTahfizhLiveEnsure?.()}catch(_){}},150);
      return out;
    };
    wrapped.__cqTahfizhKabidOnlyV9=true;
    setActiveModule=wrapped;
  }

  function patchSidebar(){
    if(typeof renderSidebar!=='function'||renderSidebar.__cqTahfizhKabidOnlyV9)return;
    const original=renderSidebar;
    const wrapped=function(){if(allowed())ensureTahfizhGroup();return original.apply(this,arguments)};
    wrapped.__cqTahfizhKabidOnlyV9=true;
    renderSidebar=wrapped;
  }

  function install(){
    if(!allowed())return false;
    patchNavigation();patchSidebar();
    const ok=ensureTahfizhGroup();
    if(ok&&typeof renderSidebar==='function'){
      try{renderSidebar()}catch(e){console.warn('Kabid Tahfizh menu render:',e)}
    }
    setTimeout(()=>{try{window.cqTahfizhLiveEnsure?.()}catch(_){}},250);
    return ok;
  }

  let tries=0;
  (function boot(){tries++;if(install()||tries>=12)return;setTimeout(boot,250)})();

  if(typeof enterApp==='function'&&!enterApp.__cqTahfizhKabidOnlyV9){
    const originalEnter=enterApp;
    const wrapped=function(){const out=originalEnter.apply(this,arguments);setTimeout(install,80);return out};
    wrapped.__cqTahfizhKabidOnlyV9=true;
    enterApp=wrapped;
  }
})();
