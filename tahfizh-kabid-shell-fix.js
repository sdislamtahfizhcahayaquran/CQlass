/* CQlass — Kabid Tahfizh: focused role shell, no Kesiswaan/Badal in Tahfizh group */
(function(){
  'use strict';
  if(window.__CQ_TAHFIZH_SHELL_FIX_V10__)return;
  window.__CQ_TAHFIZH_SHELL_FIX_V10__=1;

  const ROLE='kabid_tahfizh';
  const norm=v=>String(v||'').replace(/[\u200B-\u200D\uFEFF]/g,'').trim().toLowerCase().replace(/[\s-]+/g,'_');
  const TOOLS=[
    {id:'tahfizh-pts-kabid',label:'Nilai PTS',url:'tahfizh-pts.html?v=20260924-kabid6'},
    {id:'tahfizh-monthly-report',label:'Laporan Bulanan',url:'tahfizh-monthly.html?v=20260924-kabid6'},
    {id:'tahfizh-ukj-score',label:'UKJ',url:'tahfizh-ukj-score.html?v=20260924-kabid6'}
  ];
  const BLOCKED=new Set(['kesiswaan','kesiswaan-center','kedisiplinan','reward','tahfizh-kedisiplinan','tahfizh-reward']);

  function role(){
    try{
      const saved=JSON.parse(localStorage.getItem('cqlass_user')||'{}')||{};
      const u=(typeof currentUser!=='undefined'&&currentUser)||saved;
      return norm(u.role||u.primary_role||u.role_code||saved.role||'');
    }catch(_){return''}
  }
  function allowed(){return role()===ROLE}
  function withoutRole(arr){return Array.isArray(arr)?arr.filter(r=>norm(r)!==ROLE):[]}
  function byId(id){return TOOLS.find(x=>x.id===String(id||''))||null}
  function go(def){if(!allowed()||!def)return false;window.location.href=def.url;return true}
  function isTahfizhGroup(g){return !!(g&&(norm(g.id)==='tahfizh'||norm(g.id)==='tahfizh_tools'||norm(g.id)==='partner_tasks'||norm(g.label)==='tahfizh'))}

  function stripWrongScope(){
    if(!allowed()||typeof MODULE_GROUPS==='undefined'||!Array.isArray(MODULE_GROUPS))return false;
    for(let i=MODULE_GROUPS.length-1;i>=0;i--){
      const g=MODULE_GROUPS[i];if(!g)continue;
      const gid=norm(g.id),label=norm(g.label);
      if(gid==='tahfizh_kesiswaan_group'){MODULE_GROUPS.splice(i,1);continue}
      if(gid==='kesiswaan'||label==='kesiswaan')g.roles=withoutRole(g.roles);
      if(Array.isArray(g.items))for(const item of g.items){
        if(!item)continue;
        const iid=norm(item.id),ilabel=norm(item.label);
        if(BLOCKED.has(iid)||BLOCKED.has(ilabel)||ilabel==='reward_siswa')item.roles=withoutRole(item.roles);
      }
    }
    return true;
  }

  function ensureDashboard(){
    try{
      if(typeof DASHBOARD_MODULE==='undefined')return false;
      if(Array.isArray(DASHBOARD_MODULE.roles)&&!DASHBOARD_MODULE.roles.includes(ROLE))DASHBOARD_MODULE.roles.push(ROLE);
      if(typeof window.renderKabidTahfizhDashboard==='function')DASHBOARD_MODULE.render=window.renderKabidTahfizhDashboard;
      return true;
    }catch(_){return false}
  }

  function ensureTahfizhGroup(){
    if(!allowed()||typeof MODULE_GROUPS==='undefined'||!Array.isArray(MODULE_GROUPS))return false;
    stripWrongScope();
    const groups=MODULE_GROUPS.filter(isTahfizhGroup);
    let group=groups.find(g=>norm(g.id)==='tahfizh')||groups[0];
    if(!group){
      group={id:'tahfizh-tools',label:'Tahfizh',roles:[ROLE],items:[]};
      MODULE_GROUPS.unshift(group);
    }
    for(const g of groups){
      if(g===group)continue;
      g.roles=withoutRole(g.roles);
      if(Array.isArray(g.items))g.items.forEach(it=>{if(it)it.roles=withoutRole(it.roles)});
    }
    group.label='Tahfizh';
    group.roles=[ROLE];
    group.items=TOOLS.map(d=>({id:d.id,label:d.label,roles:[ROLE],built:true,render:()=>go(d)}));
    return true;
  }

  function patchNavigation(){
    if(typeof setActiveModule!=='function'||setActiveModule.__cqTahfizhKabidOnlyV10)return;
    const original=setActiveModule;
    const wrapped=function(id){
      const key=norm(id),def=byId(id);
      if(def&&allowed())return go(def);
      if(allowed()&&BLOCKED.has(key))return original.call(this,'dashboard');
      if(allowed()&&key==='dashboard')ensureDashboard();
      const out=original.apply(this,arguments);
      if(allowed()&&key==='dashboard')setTimeout(()=>{try{window.cqTahfizhLiveEnsure?.()}catch(_){}},120);
      return out;
    };
    wrapped.__cqTahfizhKabidOnlyV10=true;setActiveModule=wrapped;
  }

  function patchSidebar(){
    if(typeof renderSidebar!=='function'||renderSidebar.__cqTahfizhKabidOnlyV10)return;
    const original=renderSidebar;
    const wrapped=function(){if(allowed()){ensureDashboard();ensureTahfizhGroup()}return original.apply(this,arguments)};
    wrapped.__cqTahfizhKabidOnlyV10=true;renderSidebar=wrapped;
  }

  function install(){
    if(!allowed())return false;
    ensureDashboard();patchNavigation();patchSidebar();stripWrongScope();
    const ok=ensureTahfizhGroup();
    if(ok&&typeof renderSidebar==='function')try{renderSidebar()}catch(e){console.warn('Kabid Tahfizh sidebar:',e)}
    if(typeof activeModule!=='undefined'&&activeModule==='dashboard'&&typeof window.renderKabidTahfizhDashboard==='function'){
      try{window.renderKabidTahfizhDashboard(document.getElementById('content'))}catch(_){ }
    }
    setTimeout(()=>{try{window.cqTahfizhLiveEnsure?.()}catch(_){}},180);
    return ok;
  }

  let n=0;(function boot(){n++;if(install()||n>=20)return;setTimeout(boot,200)})();
  if(typeof enterApp==='function'&&!enterApp.__cqTahfizhKabidOnlyV10){
    const old=enterApp;
    const wrapped=function(){ensureDashboard();const out=old.apply(this,arguments);setTimeout(install,80);return out};
    wrapped.__cqTahfizhKabidOnlyV10=true;enterApp=wrapped;
  }
})();
