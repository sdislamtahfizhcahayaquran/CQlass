/* CQlass — Kabid Tahfizh shell + reliable Tahfizh tools menu/click routing */
(function(){
  'use strict';
  if(window.__CQ_TAHFIZH_SHELL_FIX_V5__) return;
  window.__CQ_TAHFIZH_SHELL_FIX_V5__=1;

  const ROLES=['tahfizh','kabid_tahfizh'];
  const BASE=(typeof SUPABASE_URL!=='undefined'?SUPABASE_URL:'https://lmglkxzemtvxcgktiord.supabase.co');
  const API=BASE+'/functions/v1/tahfizh-input-status';
  const norm=v=>String(v||'').replace(/[\u200B-\u200D\uFEFF]/g,'').trim().toLowerCase().replace(/[\s-]+/g,'_');
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

  function role(){
    try{
      const u=(typeof currentUser!=='undefined'&&currentUser)||JSON.parse(localStorage.getItem('cqlass_user')||'{}')||{};
      return norm(u.role||u.primary_role||u.role_code||'');
    }catch(_){return ''}
  }
  function isTahfizh(){
    const r=role();
    return ROLES.includes(r)||(r.includes('kabid')&&(r.includes('tahfizh')||r.includes('quran')));
  }
  function token(){
    try{return typeof getAuthToken==='function'?getAuthToken():(localStorage.getItem('cqlass_session_token')||'')}
    catch(_){return localStorage.getItem('cqlass_session_token')||''}
  }

  const TOOL_DEFS=[
    {id:'tahfizh-monthly-report',label:'Laporan Bulanan',url:'tahfizh-monthly.html?v=20260923-a4-v3'},
    {id:'tahfizh-ukj-score',label:'UKJ',url:'tahfizh-ukj-score.html?v=20260923-a4-v3'}
  ];
  const toolById=id=>TOOL_DEFS.find(x=>x.id===String(id||''));
  const toolByLabel=label=>{
    const t=String(label||'').replace(/[\u200B-\u200D\uFEFF]/g,'').trim().toLowerCase();
    return TOOL_DEFS.find(x=>x.label.toLowerCase()===t);
  };
  function go(def){
    if(!def||!isTahfizh())return false;
    window.location.assign(def.url);
    return true;
  }
  function openPage(def){
    return function(content){
      if(content)content.innerHTML=`<div class="card"><span class="spinner"></span> Membuka ${esc(def.label)}...</div>`;
      go(def);
    };
  }

  function ensureTools(){
    if(!isTahfizh()||typeof MODULE_GROUPS==='undefined'||!Array.isArray(MODULE_GROUPS))return false;
    let group=MODULE_GROUPS.find(g=>g&&(norm(g.id)==='tahfizh'||norm(g.id)==='tahfizh_tools'||norm(g.label)==='tahfizh'));
    if(!group){
      group={id:'tahfizh-tools',label:'Tahfizh',roles:[...ROLES],items:[]};
      MODULE_GROUPS.splice(1,0,group);
    }
    group.label='Tahfizh';
    group.roles=[...new Set([...(Array.isArray(group.roles)?group.roles:[]),...ROLES])];
    if(!Array.isArray(group.items))group.items=[];
    for(const d of TOOL_DEFS){
      let item=group.items.find(x=>x&&x.id===d.id);
      if(!item){item={id:d.id,label:d.label,roles:[...ROLES],built:true,render:openPage(d)};group.items.push(item)}
      else{item.label=d.label;item.roles=[...new Set([...(Array.isArray(item.roles)?item.roles:[]),...ROLES])];item.built=true;item.render=openPage(d)}
    }
    return true;
  }

  function patchNavigation(){
    if(typeof setActiveModule==='function'&&!setActiveModule.__cqTahfizhToolsV5){
      const old=setActiveModule;
      const wrapped=function(id){
        const d=toolById(id);
        if(isTahfizh()&&d){
          try{if(typeof activeModule!=='undefined')activeModule=d.id}catch(_){}
          return go(d);
        }
        return old.apply(this,arguments);
      };
      wrapped.__cqTahfizhToolsV5=true;
      setActiveModule=wrapped;
    }
  }

  function patchRender(){
    if(typeof renderSidebar==='function'&&!renderSidebar.__cqTahfizhToolsV5){
      const old=renderSidebar;
      const wrapped=function(){if(isTahfizh())ensureTools();const out=old.apply(this,arguments);setTimeout(bindDomFallback,0);return out};
      wrapped.__cqTahfizhToolsV5=true;
      renderSidebar=wrapped;
    }
  }

  function bindDomFallback(){
    if(!isTahfizh())return;
    const sb=document.getElementById('sidebar');if(!sb)return;
    sb.querySelectorAll('button,a,.nav-item,.sidebar-item,.menu-item,[data-module]').forEach(el=>{
      const d=toolById(el.dataset?.module||el.getAttribute?.('data-module'))||toolByLabel(el.textContent);
      if(!d)return;
      el.style.cursor='pointer';
      if(el.dataset.cqTahfizhClick==='1')return;
      el.dataset.cqTahfizhClick='1';
      el.addEventListener('click',ev=>{ev.preventDefault();ev.stopImmediatePropagation();go(d)},true);
    });
  }

  function hasDomMenu(){
    const sb=document.getElementById('sidebar');if(!sb)return false;
    const tx=String(sb.textContent||'').replace(/[\u200B-\u200D\uFEFF]/g,'').toLowerCase();
    return tx.includes('laporan bulanan')&&tx.includes('ukj');
  }
  let rendering=false;
  function rebuildSidebar(){
    if(!isTahfizh()||rendering||!ensureTools())return;
    if(typeof renderSidebar==='function'){
      try{rendering=true;renderSidebar()}catch(e){console.warn('Tahfizh sidebar rebuild:',e)}finally{rendering=false}
    }
    bindDomFallback();
  }

  function dashboardActive(){
    try{if(typeof activeModule!=='undefined')return String(activeModule||'')==='dashboard'}catch(_){}
    return false;
  }
  let live=null,loading=false,lastFetch=0;
  function installCss(){
    if(document.getElementById('cq-tahfizh-live-css'))return;
    const s=document.createElement('style');s.id='cq-tahfizh-live-css';s.textContent=`#cq-tahfizh-live{background:#fff;border:1px solid #d8e7e3;border-radius:16px;padding:18px 20px;margin:16px 0}.cqtl-title{font-size:18px;font-weight:900;color:#173f63}.cqtl-sub{font-size:12px;color:#6f7f8e;margin-top:4px}.cqtl-wrap{overflow:auto;margin-top:12px}.cqtl-table{width:100%;border-collapse:collapse;min-width:720px}.cqtl-table th,.cqtl-table td{padding:9px;border-bottom:1px solid #edf1f5;text-align:left;font-size:12px}.cqtl-table th{background:#f7f9fc;color:#526a7e}`;document.head.appendChild(s);
  }
  function renderLive(){
    if(!isTahfizh()||!dashboardActive())return;
    const c=document.getElementById('content');if(!c)return;installCss();
    let box=document.getElementById('cq-tahfizh-live');if(!box){box=document.createElement('section');box.id='cq-tahfizh-live';c.prepend(box)}
    if(!live){box.innerHTML='<div class="cqtl-title">Live Report Input PTS Tahfizh</div><div class="cqtl-sub">Memuat progres...</div>';return}
    const rows=live.teachers||[];
    box.innerHTML=`<div class="cqtl-title">Live Report Input PTS Tahfizh</div><div class="cqtl-sub">Monitoring guru halaqah</div><div class="cqtl-wrap"><table class="cqtl-table"><thead><tr><th>Guru</th><th>Kelas</th><th>Progres</th><th>Status</th></tr></thead><tbody>${rows.map(x=>`<tr><td><b>${esc(x.teacher_name||'—')}</b></td><td>${esc((x.classes||[]).join(', ')||'—')}</td><td>${esc(x.complete_students||0)} / ${esc(x.total_students||0)}</td><td>${esc(x.status||'—')}</td></tr>`).join('')||'<tr><td colspan="4">Belum ada data.</td></tr>'}</tbody></table></div>`;
  }
  async function loadLive(force=false){
    if(!isTahfizh()||!dashboardActive()||loading)return;
    if(!force&&Date.now()-lastFetch<15000)return;
    loading=true;renderLive();
    try{
      const key=typeof SUPABASE_PUBLISHABLE_KEY!=='undefined'?SUPABASE_PUBLISHABLE_KEY:'sb_publishable_3HyNVUYXakILMKo2SK-DJw_ka7-Yx93';
      const r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json','apikey':key,'Authorization':'Bearer '+key,'x-session-token':token()},body:'{}'});
      const d=await r.json().catch(()=>({}));if(!r.ok||d.success===false)throw Error(d.error||'Gagal memuat live report');live=d;lastFetch=Date.now();renderLive();
    }catch(e){console.warn('Tahfizh live:',e)}finally{loading=false}
  }
  window.cqTahfizhLiveRefresh=()=>loadLive(true);

  function apply(force=false){
    if(!isTahfizh())return;
    ensureTools();patchNavigation();patchRender();
    if(force||!hasDomMenu())rebuildSidebar();
    else bindDomFallback();
    loadLive(false);
  }

  let tries=0;
  const timer=setInterval(()=>{tries++;apply(tries===1);if((hasDomMenu()&&tries>=4)||tries>=30)clearInterval(timer)},300);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>apply(true),50),{once:true});else setTimeout(()=>apply(true),50);
  window.addEventListener('load',()=>setTimeout(()=>apply(true),50),{once:true});
  new MutationObserver(()=>{if(isTahfizh()){patchNavigation();patchRender();bindDomFallback();if(!hasDomMenu())rebuildSidebar()}}).observe(document.documentElement,{childList:true,subtree:true});
  setInterval(()=>{if(isTahfizh()){apply(false);loadLive(false)}},5000);
})();
