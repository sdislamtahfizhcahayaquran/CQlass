/* CQlass — Kabid Tahfizh/Qur'an clean shell + live PTS input report */
(function(){
  'use strict';
  if(window.__CQ_TAHFIZH_SHELL_FIX_V3__) return;
  window.__CQ_TAHFIZH_SHELL_FIX_V3__=1;

  const API=(typeof SUPABASE_URL!=='undefined'?SUPABASE_URL:'https://lmglkxzemtvxcgktiord.supabase.co')+'/functions/v1/tahfizh-input-status';
  const REFRESH_MS=30000;
  let live=null,loading=false,filter='all',lastFetch=0;
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  function role(){try{return String(currentUser?.role||'').toLowerCase().replace(/[\s-]+/g,'_')}catch(_){try{return String(JSON.parse(localStorage.getItem('cqlass_user')||'{}').role||'').toLowerCase().replace(/[\s-]+/g,'_')}catch(_2){return''}}}
  function isTahfizh(){const r=role();return r==='tahfizh'||r==='kabid_tahfizh'||(r.includes('kabid')&&(r.includes('tahfizh')||r.includes('quran')))}
  function token(){try{return typeof getAuthToken==='function'?getAuthToken():(localStorage.getItem('cqlass_session_token')||'')}catch(_){return localStorage.getItem('cqlass_session_token')||''}}
  function dashboardActive(){try{if(typeof activeModule!=='undefined')return String(activeModule||'')==='dashboard'}catch(_){}const sb=document.getElementById('sidebar');const a=sb?.querySelector('.nav-item.active,.active');return !!(a&&String(a.textContent||'').trim().toLowerCase()==='dashboard')}

  function removeRole(arr){return Array.isArray(arr)?arr.filter(x=>!['tahfizh','kabid_tahfizh'].includes(String(x||'').toLowerCase())):arr}
  function stripModel(){
    if(!isTahfizh())return;
    try{
      if(typeof MODULE_GROUPS==='undefined'||!Array.isArray(MODULE_GROUPS))return;
      for(const g of MODULE_GROUPS){
        const key=String(g?.id||'').toLowerCase(),label=String(g?.label||'').trim().toLowerCase();
        if(key==='akademik'||key==='kesiswaan'||key==='kegiatan'||key==='kegiatan-v2'||label==='akademik'||label==='kesiswaan'||label==='kegiatan'){
          g.roles=removeRole(g.roles);
          for(const it of (g.items||[]))it.roles=removeRole(it.roles);
        }
      }
    }catch(e){console.warn('Tahfizh scope model:',e)}
  }
  function cleanSidebar(){
    if(!isTahfizh())return;
    const sb=document.getElementById('sidebar');if(!sb)return;
    [...sb.querySelectorAll('.nav-group-head')].forEach(h=>{
      const label=String(h.querySelector('span')?.textContent||h.textContent||'').trim().toLowerCase();
      if(label==='akademik'||label==='kesiswaan'||label==='kegiatan'){
        const n=h.nextElementSibling;
        if(n?.classList?.contains('nav-group-items'))n.remove();
        h.remove();
      }
    });
  }
  function cleanDashboardCrossDomain(){
    if(!isTahfizh()||!dashboardActive())return;
    const c=document.getElementById('content');if(!c)return;
    c.querySelectorAll('tbody tr').forEach(tr=>{
      const first=String(tr.children?.[0]?.textContent||'').trim().toLowerCase();
      if(first==='kesiswaan'||first==='akademik'||first==='kegiatan')tr.remove();
    });
  }

  function css(){if(document.getElementById('cq-tahfizh-live-css'))return;const s=document.createElement('style');s.id='cq-tahfizh-live-css';s.textContent=`
    #cq-tahfizh-live{background:#fff;border:1px solid #d8e7e3;border-radius:16px;padding:18px 20px;margin:16px 0;box-shadow:0 8px 28px rgba(15,83,77,.06)}
    .cqtl-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap}.cqtl-title{font-size:18px;font-weight:900;color:#0c4f4b}.cqtl-sub{font-size:12px;color:#6f8581;margin-top:4px}.cqtl-btn{border:1px solid #cce0db;background:#f8fbfa;color:#08746f;border-radius:10px;padding:8px 11px;font-weight:800;cursor:pointer}
    .cqtl-sums{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;margin:14px 0}.cqtl-sum{border:1px solid #dceae6;background:#f8fbfa;border-radius:12px;padding:11px 12px;text-align:left;cursor:pointer}.cqtl-sum.on{outline:2px solid #0b8b7e;outline-offset:-2px}.cqtl-sum b{display:block;font-size:22px;color:#083f3c}.cqtl-sum span{font-size:11px;color:#71837f}
    .cqtl-wrap{overflow:auto}.cqtl-table{width:100%;border-collapse:collapse;min-width:900px}.cqtl-table th,.cqtl-table td{padding:10px 9px;border-bottom:1px solid #edf2f0;text-align:left;font-size:12px;vertical-align:top}.cqtl-table th{font-size:11px;color:#56706c;background:#f8fbfa}.cqtl-teacher{font-weight:900;color:#193b38}.cqtl-class{color:#647b77}.cqtl-bar{height:7px;background:#e8efed;border-radius:99px;overflow:hidden;margin-top:5px;min-width:150px}.cqtl-bar i{display:block;height:100%;background:#0b8b7e;border-radius:99px}.cqtl-status{display:inline-block;padding:5px 9px;border-radius:99px;font-size:10px;font-weight:900;white-space:nowrap}.cqtl-done{background:#e4f7ee;color:#116b4c}.cqtl-run{background:#fff3d6;color:#835d00}.cqtl-none{background:#ffeaea;color:#a13939}.cqtl-miss{max-width:260px;color:#657b77;line-height:1.4}.cqtl-error{padding:12px;border-radius:10px;background:#fff0f0;color:#963b3b;margin-top:10px}
    @media(max-width:900px){.cqtl-sums{grid-template-columns:repeat(2,1fr)}#cq-tahfizh-live{padding:14px}}
  `;document.head.appendChild(s)}
  function fmt(v){if(!v)return'—';try{return new Intl.DateTimeFormat('id-ID',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(v))}catch(_){return String(v)}}
  function sLabel(s){return s==='selesai'?'Selesai':s==='sedang_input'?'Sedang Input':'Belum Mulai'}
  function sClass(s){return s==='selesai'?'cqtl-done':s==='sedang_input'?'cqtl-run':'cqtl-none'}
  function rows(){const a=(live?.teachers||[]).filter(x=>filter==='all'||x.status===filter);if(!a.length)return'<tr><td colspan="6">Tidak ada guru pada status ini.</td></tr>';return a.map(x=>{const miss=x.missing_students||[],show=miss.slice(0,5),more=Math.max(0,miss.length-show.length),p=Math.max(0,Math.min(100,Number(x.progress_percent)||0));return `<tr><td><div class="cqtl-teacher">${esc(x.teacher_name||'Tanpa Guru')}</div></td><td class="cqtl-class">${esc((x.classes||[]).join(', ')||'—')}</td><td><b>${esc(x.complete_students)} / ${esc(x.total_students)} siswa lengkap</b><div class="cqtl-bar"><i style="width:${p}%"></i></div><div style="margin-top:4px;color:#6f8581">${p}%</div></td><td><span class="cqtl-status ${sClass(x.status)}">${sLabel(x.status)}</span></td><td>${fmt(x.last_update)}</td><td class="cqtl-miss">${miss.length?esc(show.join(', '))+(more?` <b>+${more}</b>`:''):'—'}</td></tr>`}).join('')}
  function renderLive(error=''){
    if(!isTahfizh()||!dashboardActive())return;
    css();const c=document.getElementById('content');if(!c)return;
    let box=document.getElementById('cq-tahfizh-live');if(!box){box=document.createElement('section');box.id='cq-tahfizh-live';const hero=c.querySelector('.cq-role-hero,[data-cq-role-theme="1"],.rd-hero,.dashboard-hero');if(hero)hero.insertAdjacentElement('afterend',box);else c.prepend(box)}
    if(error){box.innerHTML=`<div class="cqtl-head"><div><div class="cqtl-title">Live Report Input PTS Tahfizh</div><div class="cqtl-sub">Kabid Qur’an · monitoring input guru halaqah</div></div><button class="cqtl-btn" onclick="cqTahfizhLiveRefresh()">Perbarui</button></div><div class="cqtl-error">${esc(error)}</div>`;return}
    if(!live){box.innerHTML='<div class="cqtl-title">Live Report Input PTS Tahfizh</div><div class="cqtl-sub">Memuat progres guru halaqah...</div>';return}
    const s=live.summary||{};box.innerHTML=`<div class="cqtl-head"><div><div class="cqtl-title">Live Report Input PTS Tahfizh</div><div class="cqtl-sub">Kabid Qur’an · otomatis diperbarui setiap 30 detik · sinkron ${fmt(live.generated_at)}</div></div><button class="cqtl-btn" onclick="cqTahfizhLiveRefresh()">↻ Perbarui</button></div><div class="cqtl-sums"><button class="cqtl-sum ${filter==='all'?'on':''}" onclick="cqTahfizhLiveFilter('all')"><b>${esc(s.teachers||0)}</b><span>Guru halaqah</span></button><button class="cqtl-sum ${filter==='selesai'?'on':''}" onclick="cqTahfizhLiveFilter('selesai')"><b>${esc(s.done||0)}</b><span>Selesai</span></button><button class="cqtl-sum ${filter==='sedang_input'?'on':''}" onclick="cqTahfizhLiveFilter('sedang_input')"><b>${esc(s.in_progress||0)}</b><span>Sedang input</span></button><button class="cqtl-sum ${filter==='belum_mulai'?'on':''}" onclick="cqTahfizhLiveFilter('belum_mulai')"><b>${esc(s.not_started||0)}</b><span>Belum mulai</span></button></div><div class="cqtl-wrap"><table class="cqtl-table"><thead><tr><th>Guru Halaqah</th><th>Kelas</th><th>Progres Input</th><th>Status</th><th>Update Terakhir</th><th>Siswa Belum Lengkap</th></tr></thead><tbody>${rows()}</tbody></table></div>`;
  }
  async function load(force=false){
    if(!isTahfizh()||loading)return;
    if(!force&&Date.now()-lastFetch<5000)return;
    loading=true;
    if(!document.getElementById('cq-tahfizh-live'))renderLive();
    try{
      const key=typeof SUPABASE_PUBLISHABLE_KEY!=='undefined'?SUPABASE_PUBLISHABLE_KEY:'';
      const r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json','apikey':key,'Authorization':'Bearer '+key,'x-session-token':token()},body:JSON.stringify({})});
      const d=await r.json().catch(()=>({}));
      if(!r.ok||d.success===false)throw Error(d.error||'Gagal memuat live report Tahfizh');
      live=d;lastFetch=Date.now();renderLive();
    }catch(e){renderLive(e.message)}finally{loading=false}
  }
  window.cqTahfizhLiveRefresh=()=>load(true);
  window.cqTahfizhLiveFilter=f=>{filter=f;renderLive()};

  function apply(){
    if(!isTahfizh())return;
    stripModel();cleanSidebar();cleanDashboardCrossDomain();
    if(dashboardActive()){
      if(!document.getElementById('cq-tahfizh-live'))renderLive();
      load(false);
    }
  }
  function patchFunctions(){
    if(typeof renderSidebar==='function'&&!renderSidebar.__cqTahfizhClean){const old=renderSidebar;const wrapped=function(){stripModel();const out=old.apply(this,arguments);setTimeout(cleanSidebar,0);return out};wrapped.__cqTahfizhClean=true;renderSidebar=wrapped}
    if(typeof enterApp==='function'&&!enterApp.__cqTahfizhClean){const old=enterApp;const wrapped=function(){stripModel();const out=old.apply(this,arguments);setTimeout(apply,80);return out};wrapped.__cqTahfizhClean=true;enterApp=wrapped}
  }
  patchFunctions();
  const ob=new MutationObserver(()=>{
    if(!isTahfizh())return;
    cleanSidebar();cleanDashboardCrossDomain();
    if(dashboardActive()&&!document.getElementById('cq-tahfizh-live')){renderLive();load(false)}
  });
  ob.observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>{patchFunctions();apply()},120));
  setTimeout(()=>{patchFunctions();apply()},120);
  setInterval(()=>{if(isTahfizh()){cleanSidebar();cleanDashboardCrossDomain();if(dashboardActive()&&!document.getElementById('cq-tahfizh-live')){renderLive();load(false)}}},3000);
  setInterval(()=>{if(isTahfizh()&&dashboardActive())load(true)},REFRESH_MS);
})();