/* CQlass — Kabid Qur'an stable shell: bypass global role wrapper stack */
(function(){
  'use strict';
  if(window.__CQ_TAHFIZH_SHELL_FIX_V11__)return;
  window.__CQ_TAHFIZH_SHELL_FIX_V11__=1;

  const ROLE='kabid_quran';
  const norm=v=>String(v||'').replace(/[\u200B-\u200D\uFEFF]/g,'').trim().toLowerCase().replace(/[\s-]+/g,'_');
  const TOOLS=[
    {id:'tahfizh-pts-kabid',label:'Nilai PTS',url:'tahfizh-pts.html?v=20260924-kabid7'},
    {id:'tahfizh-monthly-report',label:'Laporan Bulanan',url:'tahfizh-monthly.html?v=20260924-kabid7'},
    {id:'tahfizh-ukj-score',label:'UKJ',url:'tahfizh-ukj-score.html?v=20260924-kabid7'}
  ];
  const BLOCKED=new Set(['kesiswaan','kesiswaan-center','kedisiplinan','reward','tahfizh-kedisiplinan','tahfizh-reward']);
  let previousRender=null,previousSetActive=null,stableRender=null,stableSetActive=null;

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
      if(gid==='tahfizh_kesiswaan_group'||gid==='partner_kesiswaan_group'){MODULE_GROUPS.splice(i,1);continue}
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
      if(!Array.isArray(DASHBOARD_MODULE.roles))DASHBOARD_MODULE.roles=[];
      if(!DASHBOARD_MODULE.roles.includes(ROLE))DASHBOARD_MODULE.roles.push(ROLE);
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

  function baseRender(){
    const fn=window.__cqBaseRenderSidebar;
    if(typeof fn==='function')return fn;
    if(typeof previousRender==='function'&&previousRender!==stableRender)return previousRender;
    return null;
  }
  function baseSetActive(){
    const fn=window.__cqBaseSetActiveModule;
    if(typeof fn==='function')return fn;
    if(typeof previousSetActive==='function'&&previousSetActive!==stableSetActive)return previousSetActive;
    return null;
  }

  function installStableFunctions(){
    if(!allowed())return false;
    ensureDashboard();ensureTahfizhGroup();

    if(typeof renderSidebar==='function'&&renderSidebar!==stableRender)previousRender=renderSidebar;
    if(typeof setActiveModule==='function'&&setActiveModule!==stableSetActive)previousSetActive=setActiveModule;

    if(!stableRender){
      stableRender=function(){
        if(!allowed()){
          const fn=previousRender;if(typeof fn==='function'&&fn!==stableRender)return fn.apply(this,arguments);return;
        }
        ensureDashboard();ensureTahfizhGroup();
        const fn=baseRender();
        if(typeof fn==='function')return fn.apply(this,arguments);
      };
      stableRender.__cqKabidTahfizhStableV11=true;
    }

    if(!stableSetActive){
      stableSetActive=function(id){
        if(!allowed()){
          const fn=previousSetActive;if(typeof fn==='function'&&fn!==stableSetActive)return fn.apply(this,arguments);return;
        }
        const key=norm(id),def=byId(id);
        ensureDashboard();ensureTahfizhGroup();
        if(def)return go(def);
        const target=BLOCKED.has(key)?'dashboard':String(id||'dashboard');
        const fn=baseSetActive();
        if(typeof fn==='function')return fn.call(this,target);
      };
      stableSetActive.__cqKabidTahfizhStableV11=true;
    }

    renderSidebar=stableRender;
    setActiveModule=stableSetActive;
    return true;
  }

  function stabilize(forceDashboard=false){
    if(!allowed())return false;
    if(!installStableFunctions())return false;
    const key=norm(typeof activeModule!=='undefined'?activeModule:'');
    const shouldDashboard=forceDashboard||!key||BLOCKED.has(key)||key==='absensi'||key==='attendance'||key==='morning_talk';
    if(shouldDashboard){
      try{activeModule='dashboard'}catch(_){}
      const fn=baseSetActive();
      if(typeof fn==='function')fn.call(window,'dashboard');
      else if(typeof window.renderKabidTahfizhDashboard==='function')window.renderKabidTahfizhDashboard(document.getElementById('content'));
    }else{
      try{stableRender()}catch(e){console.warn('Kabid Qur'an stable sidebar:',e)}
      if(key==='dashboard'&&typeof window.renderKabidTahfizhDashboard==='function'){
        try{window.renderKabidTahfizhDashboard(document.getElementById('content'))}catch(_){}
      }
    }
    setTimeout(()=>{try{window.cqTahfizhLiveEnsure?.()}catch(_){}},100);
    return true;
  }

  window.__CQ_TAHFIZH_KABID_DASH__=true;
  window.cqStabilizeKabidTahfizh=stabilize;

  let n=0;(function boot(){n++;if(stabilize(false)||n>=20)return;setTimeout(boot,180)})();
  [250,800,1800].forEach(ms=>setTimeout(()=>stabilize(false),ms));
  window.addEventListener('load',()=>{stabilize(false);setTimeout(()=>stabilize(false),350)},{once:true});

  if(typeof enterApp==='function'&&!enterApp.__cqTahfizhKabidStableV11){
    const old=enterApp;
    const wrapped=function(){
      if(allowed())ensureDashboard();
      const out=old.apply(this,arguments);
      if(allowed())setTimeout(()=>stabilize(true),0);
      return out;
    };
    wrapped.__cqTahfizhKabidStableV11=true;enterApp=wrapped;
  }
})();
