/* CQlass — Universal Bell / Reminder Center
   - Bell aktif di semua role.
   - Notifikasi Supabase tampil untuk semua user sesuai session backend.
   - Pending task khusus Walas tetap dipertahankan dari app-core.
   - Tahan terhadap header yang dirender ulang (Kabid/role shell lain). */
(function(){
  'use strict';
  if(window.__cqReminderCenterInstalled) return;
  window.__cqReminderCenterInstalled=true;

  const BASE=(typeof SUPABASE_URL!=='undefined'?SUPABASE_URL:'https://lmglkxzemtvxcgktiord.supabase.co');
  const KEY=(typeof SUPABASE_PUBLISHABLE_KEY!=='undefined'?SUPABASE_PUBLISHABLE_KEY:'');
  const API=BASE+'/functions/v1/notifications';
  const originalRefreshBell=(typeof window.refreshBellNotif==='function')?window.refreshBellNotif:null;

  let cache=[];
  let loading=false;
  let lastToken='';
  let renderQueued=false;

  function token(){
    try{return typeof getAuthToken==='function'?getAuthToken():(localStorage.getItem('cqlass_session_token')||'')}catch(_){return ''}
  }
  function role(){
    try{
      if(typeof currentUser!=='undefined'&&currentUser?.role) return String(currentUser.role).toLowerCase();
      const u=JSON.parse(localStorage.getItem('cqlass_user')||'{}');
      return String(u.role||u.primary_role||u.role_code||'').toLowerCase();
    }catch(_){return ''}
  }
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]||c))}
  function fmt(v){
    try{return new Intl.DateTimeFormat('id-ID',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'Asia/Jakarta'}).format(new Date(v)).replace('.',':')+' WIB'}catch(_){return ''}
  }
  async function api(action,payload={}){
    const t=token();
    if(!t) throw new Error('session_missing');
    const r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json','apikey':KEY,'x-session-token':t},body:JSON.stringify({action,...payload})});
    const d=await r.json().catch(()=>({}));
    if(!r.ok||d.success===false) throw new Error(d.error||'request_failed');
    return d;
  }
  function important(items){
    return (items||[]).filter(n=>n&&n.type!=='system_test').slice(0,30);
  }
  function unreadCount(){return cache.filter(n=>!n.read_at).length}
  function wraps(){return Array.from(document.querySelectorAll('#bell-wrap,.bell-wrap,[data-cq-bell-wrap]'))}
  function panelForWrap(wrap){
    return wrap?.querySelector('#bell-panel,.bell-panel,[data-cq-bell-panel]')||document.getElementById('bell-panel')||document.querySelector('.bell-panel');
  }
  function allPanels(){
    const list=[];
    wraps().forEach(w=>{const p=panelForWrap(w);if(p&&!list.includes(p))list.push(p)});
    document.querySelectorAll('#bell-panel,.bell-panel,[data-cq-bell-panel]').forEach(p=>{if(!list.includes(p))list.push(p)});
    return list;
  }
  function icon(type){
    if(type==='uks_reminder') return '🏥';
    if(type==='badal_assignment') return '🔄';
    if(type==='internal_report_new') return '📩';
    if(type==='internal_report_status') return '✅';
    if(type==='student_case') return '📋';
    if(type==='student_reward') return '⭐';
    if(type==='academic') return '📚';
    return '🔔';
  }
  function ensureIndicator(wrap){
    if(!wrap) return;
    wrap.style.position=wrap.style.position||'relative';
    let dot=wrap.querySelector('.cq-reminder-dot');
    if(!dot){
      dot=document.createElement('span');
      dot.className='cq-reminder-dot';
      dot.setAttribute('aria-hidden','true');
      wrap.appendChild(dot);
    }
    dot.style.display=unreadCount()>0?'block':'none';

    const btn=wrap.querySelector('.bell-btn,button[aria-label*="Notifikasi"],button[aria-label*="notifikasi"]');
    if(btn){
      const count=unreadCount();
      btn.setAttribute('aria-label',count?`Notifikasi, ${count} belum dibaca`:'Notifikasi');
    }

    /* Badge angka untuk role non-Walas. Pada Walas badge tetap milik pending task app-core,
       sedangkan reminder baru ditandai dot merah agar kedua fungsi tidak saling menimpa. */
    if(role()!=='walas'){
      const badge=wrap.querySelector('#bell-badge,.bell-badge');
      if(badge){
        const count=unreadCount();
        badge.textContent=String(count);
        badge.style.display=count>0?'flex':'none';
      }
    }
  }
  function syncIndicators(){wraps().forEach(ensureIndicator)}

  function sectionFor(panel){
    if(!panel) return null;
    let section=panel.querySelector('.cq-reminder-section[data-cq-reminder-section="1"]');
    if(!section){
      section=document.createElement('div');
      section.className='cq-reminder-section';
      section.dataset.cqReminderSection='1';
      panel.appendChild(section);
    }
    return section;
  }
  function renderPanel(panel){
    const section=sectionFor(panel); if(!section) return;
    if(!cache.length){
      section.innerHTML='<div class="cq-reminder-head"><strong>Notifikasi</strong><span>0 belum dibaca</span></div><div class="cq-reminder-empty">Belum ada notifikasi baru.</div>';
      return;
    }
    section.innerHTML='<div class="cq-reminder-head"><strong>Notifikasi</strong><span>'+unreadCount()+' belum dibaca</span></div>'+cache.map(n=>{
      const unread=!n.read_at;
      return '<button type="button" class="cq-reminder-item'+(unread?' unread':'')+'" data-reminder-id="'+esc(n.id)+'" data-reminder-url="'+esc(n.target_url||'')+'">'+
        '<span class="cq-reminder-icon">'+icon(n.type)+'</span><span class="cq-reminder-copy"><strong>'+esc(n.title||'Notifikasi')+'</strong><small>'+esc(n.body||'')+'</small><em>'+esc(fmt(n.created_at))+'</em></span></button>';
    }).join('');

    section.querySelectorAll('[data-reminder-id]').forEach(btn=>{
      btn.addEventListener('click',async(ev)=>{
        ev.stopPropagation();
        const id=btn.dataset.reminderId;
        const url=btn.dataset.reminderUrl;
        btn.disabled=true;
        try{await api('mark_read',{id});}catch(_){}
        const item=cache.find(x=>String(x.id)===String(id));
        if(item)item.read_at=new Date().toISOString();
        syncIndicators();
        renderAll();
        if(url&&url!=='./'){
          try{location.href=new URL(url,location.href).href}catch(_){}
        }
      });
    });
  }
  function renderAll(){
    allPanels().forEach(renderPanel);
    syncIndicators();
  }
  function queueRender(){
    if(renderQueued) return;
    renderQueued=true;
    requestAnimationFrame(()=>{renderQueued=false;decorate(false)});
  }

  async function refresh(render=true){
    const t=token();
    if(!t){
      cache=[];lastToken='';syncIndicators();
      return;
    }
    if(loading) return;
    loading=true;
    try{
      const d=await api('list',{limit:40});
      cache=important(d.notifications||[]);
      lastToken=t;
      syncIndicators();
      if(render) renderAll();
    }catch(e){
      console.warn('CQlass bell center:',e);
    }finally{loading=false}
  }

  function closeOtherPanels(except){
    allPanels().forEach(p=>{if(p!==except)p.classList.remove('open')});
  }
  function togglePanel(event){
    event?.stopPropagation?.();
    const target=event?.currentTarget||event?.target;
    const btn=target?.closest?.('.bell-btn,button[aria-label*="Notifikasi"],button[aria-label*="notifikasi"]')||target;
    const wrap=btn?.closest?.('#bell-wrap,.bell-wrap,[data-cq-bell-wrap]')||wraps()[0];
    const panel=panelForWrap(wrap);
    if(!panel) return;
    const willOpen=!panel.classList.contains('open');
    closeOtherPanels(panel);
    panel.classList.toggle('open',willOpen);
    if(willOpen) refresh(true);
  }

  function bindBell(wrap){
    if(!wrap||wrap.dataset.cqReminderBound==='1') return;
    wrap.dataset.cqReminderBound='1';
    const btn=wrap.querySelector('.bell-btn,button[aria-label*="Notifikasi"],button[aria-label*="notifikasi"]');
    if(btn){
      btn.setAttribute('type',btn.getAttribute('type')||'button');
      btn.addEventListener('click',()=>setTimeout(()=>refresh(true),40));
      btn.addEventListener('keydown',ev=>{
        if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();togglePanel(ev)}
      });
    }
  }
  function decorate(shouldRender=true){
    wraps().forEach(bindBell);
    syncIndicators();
    if(shouldRender&&cache.length) renderAll();
  }

  /* Perbaiki handler global yang dipakai inline oleh seluruh header role. */
  window.toggleBellPanel=togglePanel;
  try{toggleBellPanel=togglePanel}catch(_){}

  /* Pertahankan pending-task Walas, lalu selalu sinkronkan reminder universal. */
  if(originalRefreshBell){
    const patchedRefresh=async function(){
      let result;
      if(role()==='walas'){
        try{result=await originalRefreshBell.apply(this,arguments)}catch(_){}
      }
      await refresh(false);
      renderAll();
      return result;
    };
    window.refreshBellNotif=patchedRefresh;
    try{refreshBellNotif=patchedRefresh}catch(_){}
  }

  if(!document.getElementById('cq-reminder-center-css')){
    const css=document.createElement('style');
    css.id='cq-reminder-center-css';
    css.textContent=`
      #bell-wrap,.bell-wrap,[data-cq-bell-wrap]{position:relative}
      .cq-reminder-dot{position:absolute;right:0;top:1px;width:5px;height:5px;border-radius:50%;background:#e65045;box-shadow:0 0 0 1px #fff;z-index:6;pointer-events:none}
      .cq-reminder-section{border-top:1px solid rgba(18,105,101,.12);margin-top:7px;padding-top:7px;max-height:360px;overflow:auto}
      .cq-reminder-head{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:8px 11px;color:#244a49;position:sticky;top:0;background:#fff;z-index:1}
      .cq-reminder-head strong{font-size:12px}.cq-reminder-head span{font-size:10px;color:#78908e}
      .cq-reminder-item{width:100%;border:0;background:transparent;display:flex;align-items:flex-start;gap:9px;text-align:left;padding:10px 11px;border-radius:10px;cursor:pointer;color:#244a49;font:inherit}
      .cq-reminder-item:hover{background:#f1f8f7}.cq-reminder-item:focus-visible{outline:2px solid #0a6e6e;outline-offset:-2px}.cq-reminder-item.unread{background:#edf8f6}.cq-reminder-item:disabled{opacity:.7;cursor:wait}
      .cq-reminder-icon{width:28px;height:28px;border-radius:9px;background:#fff;display:grid;place-items:center;flex:0 0 auto;font-size:14px;box-shadow:0 0 0 1px rgba(18,105,101,.08)}
      .cq-reminder-copy{display:flex;flex-direction:column;gap:2px;min-width:0}.cq-reminder-copy strong{font-size:11.5px;line-height:1.3}.cq-reminder-copy small{font-size:10.5px;line-height:1.35;color:#617a78;white-space:normal}.cq-reminder-copy em{font-size:9.5px;color:#91a09f;font-style:normal;margin-top:2px}.cq-reminder-empty{padding:14px 11px;font-size:11px;color:#809390}
    `;
    document.head.appendChild(css);
  }

  const observer=new MutationObserver(queueRender);
  observer.observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener('click',ev=>{
    if(!ev.target?.closest?.('#bell-wrap,.bell-wrap,[data-cq-bell-wrap]')) allPanels().forEach(p=>p.classList.remove('open'));
  });
  document.addEventListener('keydown',ev=>{
    if(ev.key==='Escape') allPanels().forEach(p=>p.classList.remove('open'));
  });

  function boot(){
    decorate(false);
    setTimeout(()=>refresh(false),450);
    setTimeout(()=>refresh(true),1200);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true}); else boot();

  /* Session/user dapat berubah tanpa reload. Deteksi token baru agar role mana pun langsung aktif. */
  setInterval(()=>{
    const t=token();
    if(t&&t!==lastToken){cache=[];refresh(true)}
    else if(!t&&lastToken){cache=[];lastToken='';syncIndicators()}
  },2000);
  setInterval(()=>{if(token())refresh(false)},60000);

  window.CQBellCenter={refresh:()=>refresh(true),render:renderAll,unread:unreadCount};
})();
