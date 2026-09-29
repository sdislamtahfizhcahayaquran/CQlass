/* CQlass — Kabid Qur'an stable shell: bypass global role wrapper stack */
(function(){
  'use strict';
  if(window.__CQ_TAHFIZH_SHELL_FIX_V12__)return;
  window.__CQ_TAHFIZH_SHELL_FIX_V12__=1;

  const ROLE='kabid_quran';
  const norm=v=>String(v||'').replace(/[\u200B-\u200D\uFEFF]/g,'').trim().toLowerCase().replace(/[\s-]+/g,'_');
  const TOOLS=[
    {id:'tahfizh-daily-report',label:'Laporan Harian',section:'Monitoring Guru',url:'tahfizh-daily-report.html?v=20260929-quran2'},
    {id:'tahfizh-badal',label:'Badal Tahfizh',section:'Monitoring Guru',url:'tahfizh-badal.html?v=20260929-quran2'},
    {id:'tahfizh-pts-kabid',label:'Nilai PTS',section:'Penilaian',url:'tahfizh-pts.html?v=20260929-quran2'},
    {id:'tahfizh-ukj-score',label:'UKJ',section:'Penilaian',url:'tahfizh-ukj-score.html?v=20260929-quran2'},
    {id:'tahfizh-monthly-report',label:'Laporan Bulanan',section:'Laporan',url:'tahfizh-monthly.html?v=20260929-quran2'}
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
    const sections=['Monitoring Guru','Penilaian','Laporan'];
    group.items=sections.map((section,idx)=>({
      id:'tahfizh-section-'+norm(section),label:section,roles:[ROLE],built:true,
      items:TOOLS.filter(d=>d.section===section).map(d=>({id:d.id,label:d.label,roles:[ROLE],built:true,render:()=>go(d)}))
    }));
    return true;
  }

  function renderKabidSidebar(){
    if(!allowed())return false;
    const sidebar=document.getElementById('sidebar');if(!sidebar)return false;
    const active=norm(typeof activeModule!=='undefined'?activeModule:'dashboard');
    const sectionFor=id=>TOOLS.find(x=>x.id===id)?.section||'';
    const activeSection=sectionFor(active);
    const state=window.__cqQuranSidebarOpen||(window.__cqQuranSidebarOpen={Tahfizh:true,'Monitoring Guru':activeSection==='Monitoring Guru','Penilaian':activeSection==='Penilaian','Laporan':activeSection==='Laporan'});
    const chevron=open=>'<svg class="nav-chevron" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>';
    sidebar.innerHTML='';
    const dash=document.createElement('div');dash.className='nav-item'+(active==='dashboard'?' active':'');dash.innerHTML='<span>Dashboard</span>';dash.onclick=()=>stableSetActive('dashboard');sidebar.appendChild(dash);
    const head=document.createElement('div');head.className='nav-group-head'+(state.Tahfizh?' open':'');head.innerHTML='<span>Tahfizh</span>'+chevron(state.Tahfizh);head.onclick=()=>{state.Tahfizh=!state.Tahfizh;renderKabidSidebar()};sidebar.appendChild(head);
    if(state.Tahfizh){
      const wrap=document.createElement('div');wrap.className='nav-group-items cq-quran-nested';
      ['Monitoring Guru','Penilaian','Laporan'].forEach(section=>{
        const items=TOOLS.filter(x=>x.section===section),open=!!state[section]||section===activeSection;
        const sh=document.createElement('div');sh.className='nav-item nav-item-sub cq-quran-section'+(open?' open':'');sh.innerHTML='<span>'+section+'</span>'+chevron(open);sh.onclick=()=>{state[section]=!open;renderKabidSidebar()};wrap.appendChild(sh);
        if(open){const sub=document.createElement('div');sub.className='cq-quran-subitems';items.forEach(d=>{const el=document.createElement('div');el.className='nav-item nav-item-sub cq-quran-leaf'+(active===norm(d.id)?' active':'');el.innerHTML='<span>'+d.label+'</span>';el.onclick=()=>stableSetActive(d.id);sub.appendChild(el)});wrap.appendChild(sub)}
      });
      sidebar.appendChild(wrap);
    }
    if(!document.getElementById('cq-quran-sidebar-css')){const st=document.createElement('style');st.id='cq-quran-sidebar-css';st.textContent='.cq-quran-section{font-weight:800!important;padding-left:26px!important}.cq-quran-section .nav-chevron{margin-left:auto}.cq-quran-subitems{border-left:1px solid rgba(10,110,110,.14);margin-left:27px}.cq-quran-leaf{padding-left:22px!important;font-size:11px!important}.cq-quran-leaf.active{font-weight:900}.cq-quran-nested>.nav-item{display:flex;align-items:center;justify-content:space-between}';document.head.appendChild(st)}
    return true;
  }

  function baseRender(){
    if(allowed())return renderKabidSidebar;
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
      stableRender.__cqKabidTahfizhStableV12=true;
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

  if(typeof enterApp==='function'&&!enterApp.__cqTahfizhKabidStableV12){
    const old=enterApp;
    const wrapped=function(){
      if(allowed())ensureDashboard();
      const out=old.apply(this,arguments);
      if(allowed())setTimeout(()=>stabilize(true),0);
      return out;
    };
    wrapped.__cqTahfizhKabidStableV12=true;enterApp=wrapped;
  }
})();
