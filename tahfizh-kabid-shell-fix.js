/* CQlass — Kabid Tahfizh shell + reliable Tahfizh tools menu */
(function(){
  'use strict';
  if(window.__CQ_TAHFIZH_SHELL_FIX_V4__) return;
  window.__CQ_TAHFIZH_SHELL_FIX_V4__=1;

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
  function openPage(url,label){
    return function(content){
      if(content) content.innerHTML=`<div class="card"><span class="spinner"></span> Membuka ${esc(label)}...</div>`;
      setTimeout(()=>{window.location.href=url},20);
    };
  }

  const TOOL_DEFS=[
    {id:'tahfizh-monthly-report',label:'Laporan Bulanan',url:'tahfizh-monthly.html?v=20260923-a4-v2'},
    {id:'tahfizh-ukj-score',label:'UKJ',url:'tahfizh-ukj-score.html?v=20260923-a4-v2'}
  ];

  function ensureTools(){
    if(!isTahfizh()||typeof MODULE_GROUPS==='undefined'||!Array.isArray(MODULE_GROUPS)) return false;

    let group=MODULE_GROUPS.find(g=>g&&(
      norm(g.id)==='tahfizh' || norm(g.id)==='tahfizh_tools' || norm(g.label)==='tahfizh'
    ));
    if(!group){
      group={id:'tahfizh-tools',label:'Tahfizh',roles:[...ROLES],items:[]};
      const dashIndex=MODULE_GROUPS.findIndex(g=>g&&norm(g.id)==='dashboard');
      MODULE_GROUPS.splice(dashIndex>=0?dashIndex+1:0,0,group);
    }

    group.label='Tahfizh';
    group.roles=[...new Set([...(Array.isArray(group.roles)?group.roles:[]),...ROLES])];
    if(!Array.isArray(group.items)) group.items=[];

    for(const d of TOOL_DEFS){
      let item=group.items.find(x=>x&&x.id===d.id);
      if(!item){
        item={id:d.id,label:d.label,roles:[...ROLES],built:true,render:openPage(d.url,d.label)};
        group.items.push(item);
      }else{
        item.label=d.label;
        item.roles=[...new Set([...(Array.isArray(item.roles)?item.roles:[]),...ROLES])];
        item.built=true;
        item.render=openPage(d.url,d.label);
      }
    }
    return true;
  }

  function hasDomMenu(){
    const sb=document.getElementById('sidebar');
    if(!sb)return false;
    const text=String(sb.textContent||'').replace(/[\u200B-\u200D\uFEFF]/g,'').toLowerCase();
    return text.includes('laporan bulanan')&&text.includes('ukj');
  }

  let rendering=false;
  function rebuildSidebar(){
    if(!isTahfizh()||rendering)return false;
    const ok=ensureTools();
    if(!ok)return false;
    if(typeof renderSidebar==='function'){
      try{rendering=true;renderSidebar()}catch(e){console.warn('Tahfizh sidebar rebuild:',e)}finally{rendering=false}
    }
    return true;
  }

  function patchRender(){
    if(typeof renderSidebar!=='function'||renderSidebar.__cqTahfizhToolsV4)return;
    const old=renderSidebar;
    const wrapped=function(){
      if(isTahfizh())ensureTools();
      return old.apply(this,arguments);
    };
    wrapped.__cqTahfizhToolsV4=true;
    renderSidebar=wrapped;
  }

  function dashboardActive(){
    try{if(typeof activeModule!=='undefined')return String(activeModule||'')==='dashboard'}catch(_){}
    const sb=document.getElementById('sidebar');
    const a=sb?.querySelector('.nav-item.active,.active');
    return !!(a&&String(a.textContent||'').trim().toLowerCase()==='dashboard');
  }

  let live=null,loading=false,lastFetch=0;
  function installCss(){
    if(document.getElementById('cq-tahfizh-live-css'))return;
    const s=document.createElement('style');s.id='cq-tahfizh-live-css';s.textContent=`
      #cq-tahfizh-live{background:#fff;border:1px solid #d8e7e3;border-radius:16px;padding:18px 20px;margin:16px 0;box-shadow:0 8px 28px rgba(15,83,77,.06)}
      .cqtl-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap}.cqtl-title{font-size:18px;font-weight:900;color:#173f63}.cqtl-sub{font-size:12px;color:#6f7f8e;margin-top:4px}.cqtl-btn{border:1px solid #cddae6;background:#f7f9fc;color:#173f63;border-radius:10px;padding:8px 11px;font-weight:800;cursor:pointer}.cqtl-wrap{overflow:auto;margin-top:12px}.cqtl-table{width:100%;border-collapse:collapse;min-width:760px}.cqtl-table th,.cqtl-table td{padding:9px;border-bottom:1px solid #edf1f5;text-align:left;font-size:12px}.cqtl-table th{font-size:11px;color:#526a7e;background:#f7f9fc}.cqtl-status{font-weight:800}.cqtl-error{padding:10px;border-radius:8px;background:#fff0f0;color:#963b3b;margin-top:10px}
    `;document.head.appendChild(s);
  }
  function fmt(v){if(!v)return'—';try{return new Intl.DateTimeFormat('id-ID',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(v))}catch(_){return String(v)}}
  function liveRows(){
    const rows=live?.teachers||[];
    if(!rows.length)return '<tr><td colspan="5">Belum ada data guru halaqah.</td></tr>';
    return rows.map(x=>`<tr><td><b>${esc(x.teacher_name||'Tanpa Guru')}</b></td><td>${esc((x.classes||[]).join(', ')||'—')}</td><td>${esc(x.complete_students||0)} / ${esc(x.total_students||0)}</td><td class="cqtl-status">${esc(x.status==='selesai'?'Selesai':x.status==='sedang_input'?'Sedang Input':'Belum Mulai')}</td><td>${fmt(x.last_update)}</td></tr>`).join('');
  }
  function renderLive(error=''){
    if(!isTahfizh()||!dashboardActive())return;
    installCss();
    const c=document.getElementById('content');if(!c)return;
    let box=document.getElementById('cq-tahfizh-live');
    if(!box){box=document.createElement('section');box.id='cq-tahfizh-live';const hero=c.querySelector('.cq-role-hero,[data-cq-role-theme="1"],.rd-hero,.dashboard-hero');if(hero)hero.insertAdjacentElement('afterend',box);else c.prepend(box)}
    if(error){box.innerHTML=`<div class="cqtl-head"><div><div class="cqtl-title">Live Report Input PTS Tahfizh</div><div class="cqtl-sub">Monitoring input guru halaqah</div></div><button class="cqtl-btn" onclick="cqTahfizhLiveRefresh()">Perbarui</button></div><div class="cqtl-error">${esc(error)}</div>`;return}
    if(!live){box.innerHTML='<div class="cqtl-title">Live Report Input PTS Tahfizh</div><div class="cqtl-sub">Memuat progres guru halaqah...</div>';return}
    box.innerHTML=`<div class="cqtl-head"><div><div class="cqtl-title">Live Report Input PTS Tahfizh</div><div class="cqtl-sub">Sinkron ${fmt(live.generated_at)}</div></div><button class="cqtl-btn" onclick="cqTahfizhLiveRefresh()">↻ Perbarui</button></div><div class="cqtl-wrap"><table class="cqtl-table"><thead><tr><th>Guru Halaqah</th><th>Kelas</th><th>Progres</th><th>Status</th><th>Update</th></tr></thead><tbody>${liveRows()}</tbody></table></div>`;
  }
  async function loadLive(force=false){
    if(!isTahfizh()||!dashboardActive()||loading)return;
    if(!force&&Date.now()-lastFetch<5000)return;
    loading=true;renderLive();
    try{
      const key=typeof SUPABASE_PUBLISHABLE_KEY!=='undefined'?SUPABASE_PUBLISHABLE_KEY:'sb_publishable_3HyNVUYXakILMKo2SK-DJw_ka7-Yx93';
      const r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json','apikey':key,'Authorization':'Bearer '+key,'x-session-token':token()},body:'{}'});
      const d=await r.json().catch(()=>({}));
      if(!r.ok||d.success===false)throw Error(d.error||'Gagal memuat live report Tahfizh');
      live=d;lastFetch=Date.now();renderLive();
    }catch(e){renderLive(e.message)}finally{loading=false}
  }
  window.cqTahfizhLiveRefresh=()=>loadLive(true);

  function apply(forceRender=false){
    if(!isTahfizh())return;
    patchRender();
    const ok=ensureTools();
    if(ok&&(forceRender||!hasDomMenu()))rebuildSidebar();
    if(dashboardActive())loadLive(false);
  }

  let tries=0;
  const bootTimer=setInterval(()=>{
    tries++;
    apply(tries===1);
    if((hasDomMenu()&&tries>=3)||tries>=30)clearInterval(bootTimer);
  },300);

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>apply(true),50),{once:true});
  else setTimeout(()=>apply(true),50);
  window.addEventListener('load',()=>setTimeout(()=>apply(true),50),{once:true});

  const observer=new MutationObserver(()=>{
    if(!isTahfizh())return;
    patchRender();
    if(!hasDomMenu()){
      ensureTools();
      setTimeout(()=>{if(!hasDomMenu())rebuildSidebar()},30);
    }
    if(dashboardActive()&&!document.getElementById('cq-tahfizh-live'))loadLive(false);
  });
  observer.observe(document.documentElement,{childList:true,subtree:true});

  setInterval(()=>{if(isTahfizh()){apply(false);if(dashboardActive())loadLive(false)}},5000);
})();
