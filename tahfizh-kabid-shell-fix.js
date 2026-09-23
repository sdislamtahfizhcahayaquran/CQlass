/* CQlass — Kabid Tahfizh only: stable monthly + UKJ menu, no Kesiswaan */
(function(){
  'use strict';
  if(window.__CQ_TAHFIZH_SHELL_FIX_V8__) return;
  window.__CQ_TAHFIZH_SHELL_FIX_V8__=1;

  const ROLE='kabid_tahfizh';
  const norm=v=>String(v||'').replace(/[\u200B-\u200D\uFEFF]/g,'').trim().toLowerCase().replace(/[\s-]+/g,'_');
  const TOOLS=[
    {id:'tahfizh-monthly-report',label:'Laporan Bulanan',url:'tahfizh-monthly.html?v=20260924-kabid2'},
    {id:'tahfizh-ukj-score',label:'UKJ',url:'tahfizh-ukj-score.html?v=20260924-kabid2'}
  ];
  const KESISWAAN_ITEM_IDS=new Set([
    'kesiswaan-center','kedisiplinan','reward','tahfizh-kedisiplinan','tahfizh-reward'
  ]);

  function role(){
    try{
      const saved=JSON.parse(localStorage.getItem('cqlass_user')||'{}')||{};
      const u=(typeof currentUser!=='undefined'&&currentUser)||saved;
      return norm(u.role||u.primary_role||u.role_code||saved.role||'');
    }catch(_){return''}
  }
  function allowed(){return role()===ROLE}
  function go(def){
    if(!allowed()||!def)return false;
    window.location.href=def.url;
    return true;
  }
  function byId(id){return TOOLS.find(x=>x.id===String(id||''))||null}
  function withoutKabid(arr){
    return Array.isArray(arr)?arr.filter(r=>norm(r)!==ROLE):[];
  }

  function stripKesiswaan(){
    if(!allowed()||typeof MODULE_GROUPS==='undefined'||!Array.isArray(MODULE_GROUPS))return false;
    for(let i=MODULE_GROUPS.length-1;i>=0;i--){
      const g=MODULE_GROUPS[i];
      if(!g)continue;
      const gid=norm(g.id),label=norm(g.label);
      if(gid==='tahfizh_kesiswaan_group'){
        MODULE_GROUPS.splice(i,1);
        continue;
      }
      if(gid==='kesiswaan'||label==='kesiswaan')g.roles=withoutKabid(g.roles);
      if(Array.isArray(g.items)){
        for(const item of g.items){
          if(!item)continue;
          const iid=norm(item.id),ilabel=norm(item.label);
          if(KESISWAAN_ITEM_IDS.has(iid)||ilabel==='kesiswaan'||ilabel==='kedisiplinan'||ilabel==='reward'||ilabel==='reward_siswa'){
            item.roles=withoutKabid(item.roles);
          }
        }
      }
    }
    return true;
  }

  function ensureTools(){
    if(!allowed()||typeof MODULE_GROUPS==='undefined'||!Array.isArray(MODULE_GROUPS))return false;
    stripKesiswaan();
    let group=MODULE_GROUPS.find(g=>g&&(norm(g.id)==='tahfizh'||norm(g.id)==='tahfizh_tools'||norm(g.label)==='tahfizh'));
    if(!group){
      group={id:'tahfizh-tools',label:'Tahfizh',roles:[ROLE],items:[]};
      MODULE_GROUPS.push(group);
    }
    group.label='Tahfizh';
    group.roles=[...new Set([...(Array.isArray(group.roles)?group.roles:[]),ROLE])];
    if(!Array.isArray(group.items))group.items=[];
    for(const d of TOOLS){
      let item=group.items.find(x=>x&&x.id===d.id);
      const render=()=>go(d);
      if(!item){group.items.push({id:d.id,label:d.label,roles:[ROLE],built:true,render});}
      else{item.label=d.label;item.roles=[ROLE];item.built=true;item.render=render;}
    }
    return true;
  }

  function patchNavigation(){
    if(typeof setActiveModule!=='function'||setActiveModule.__cqTahfizhKabidOnlyV8)return;
    const original=setActiveModule;
    const wrapped=function(id){
      const key=norm(id),def=byId(id);
      if(def&&allowed())return go(def);
      if(allowed()&&(KESISWAAN_ITEM_IDS.has(key)||key==='kesiswaan'))return original.call(this,'dashboard');
      return original.apply(this,arguments);
    };
    wrapped.__cqTahfizhKabidOnlyV8=true;
    setActiveModule=wrapped;
  }

  function patchSidebar(){
    if(typeof renderSidebar!=='function'||renderSidebar.__cqTahfizhKabidOnlyV8)return;
    const original=renderSidebar;
    const wrapped=function(){
      if(allowed()){stripKesiswaan();ensureTools();}
      return original.apply(this,arguments);
    };
    wrapped.__cqTahfizhKabidOnlyV8=true;
    renderSidebar=wrapped;
  }

  function install(){
    if(!allowed())return false;
    patchNavigation();
    patchSidebar();
    stripKesiswaan();
    const ok=ensureTools();
    if(ok&&typeof renderSidebar==='function'){
      try{renderSidebar()}catch(e){console.warn('Kabid Tahfizh menu render:',e)}
    }
    return ok;
  }

  let tries=0;
  (function boot(){
    tries++;
    if(install()||tries>=12)return;
    setTimeout(boot,250);
  })();

  if(typeof enterApp==='function'&&!enterApp.__cqTahfizhKabidOnlyV8){
    const originalEnter=enterApp;
    const wrapped=function(){
      const out=originalEnter.apply(this,arguments);
      setTimeout(install,60);
      return out;
    };
    wrapped.__cqTahfizhKabidOnlyV8=true;
    enterApp=wrapped;
  }
})();
