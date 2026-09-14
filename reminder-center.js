/* CQlass — Reminder Penting fallback di bell */
(function(){
  'use strict';
  if(window.__cqReminderCenterInstalled) return;
  window.__cqReminderCenterInstalled=true;

  const BASE=(typeof SUPABASE_URL!=='undefined'?SUPABASE_URL:'https://lmglkxzemtvxcgktiord.supabase.co');
  const KEY=(typeof SUPABASE_PUBLISHABLE_KEY!=='undefined'?SUPABASE_PUBLISHABLE_KEY:'');
  const API=BASE+'/functions/v1/notifications';
  let cache=[];
  let loading=false;

  function token(){
    try{return typeof getAuthToken==='function'?getAuthToken():(localStorage.getItem('cqlass_session_token')||'')}catch(_){return ''}
  }
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]||c))}
  function fmt(v){
    try{return new Intl.DateTimeFormat('id-ID',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'Asia/Jakarta'}).format(new Date(v)).replace('.',':')+' WIB'}catch(_){return ''}
  }
  async function api(action,payload={}){
    const t=token(); if(!t) throw new Error('session_missing');
    const r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json','apikey':KEY,'x-session-token':t},body:JSON.stringify({action,...payload})});
    const d=await r.json().catch(()=>({}));
    if(!r.ok||d.success===false) throw new Error(d.error||'request_failed');
    return d;
  }
  function important(items){
    return (items||[]).filter(n=>n&&n.type!=='system_test').slice(0,20);
  }
  function unreadCount(){return cache.filter(n=>!n.read_at).length}
  function ensureDot(){
    const wrap=document.getElementById('bell-wrap'); if(!wrap) return null;
    let dot=wrap.querySelector('.cq-reminder-dot');
    if(!dot){
      dot=document.createElement('span'); dot.className='cq-reminder-dot';
      dot.setAttribute('aria-hidden','true'); wrap.appendChild(dot);
    }
    dot.style.display=unreadCount()>0?'block':'none';
    return dot;
  }
  function icon(type){
    if(type==='uks_reminder') return '🏥';
    if(type==='badal_assignment') return '🔄';
    if(type==='internal_report_new') return '📩';
    if(type==='internal_report_status') return '✅';
    return '🔔';
  }
  function renderPanel(){
    const panel=document.getElementById('bell-panel'); if(!panel) return;
    let section=panel.querySelector('#cq-reminder-section');
    if(!section){
      section=document.createElement('div'); section.id='cq-reminder-section'; section.className='cq-reminder-section'; panel.appendChild(section);
    }
    if(!cache.length){
      section.innerHTML='<div class="cq-reminder-head"><strong>Reminder Penting</strong></div><div class="cq-reminder-empty">Belum ada reminder penting.</div>';
      return;
    }
    section.innerHTML='<div class="cq-reminder-head"><strong>Reminder Penting</strong><span>'+unreadCount()+' belum dibaca</span></div>'+cache.map(n=>{
      const unread=!n.read_at;
      return '<button type="button" class="cq-reminder-item'+(unread?' unread':'')+'" data-reminder-id="'+esc(n.id)+'" data-reminder-url="'+esc(n.target_url||'')+'">'+
        '<span class="cq-reminder-icon">'+icon(n.type)+'</span><span class="cq-reminder-copy"><strong>'+esc(n.title||'Reminder')+'</strong><small>'+esc(n.body||'')+'</small><em>'+esc(fmt(n.created_at))+'</em></span></button>';
    }).join('');
    section.querySelectorAll('[data-reminder-id]').forEach(btn=>{
      btn.addEventListener('click',async()=>{
        const id=btn.dataset.reminderId; const url=btn.dataset.reminderUrl;
        try{await api('mark_read',{id});}catch(_){}
        const item=cache.find(x=>String(x.id)===String(id)); if(item)item.read_at=new Date().toISOString();
        ensureDot(); renderPanel();
        if(url&&url!=='./'){
          try{location.href=new URL(url,location.href).href}catch(_){}
        }
      });
    });
  }
  async function refresh(render){
    if(loading||!token()) return;
    loading=true;
    try{
      const d=await api('list',{limit:30});
      cache=important(d.notifications||[]);
      ensureDot();
      if(render) renderPanel();
    }catch(e){console.warn('CQlass reminder center:',e)}
    finally{loading=false}
  }
  function bindBell(){
    const wrap=document.getElementById('bell-wrap'); if(!wrap||wrap.dataset.cqReminderBound==='1') return;
    wrap.dataset.cqReminderBound='1';
    wrap.addEventListener('click',()=>setTimeout(()=>refresh(true),80));
  }
  function decorate(){bindBell();ensureDot()}

  const css=document.createElement('style');
  css.id='cq-reminder-center-css';
  css.textContent=`
    #bell-wrap{position:relative}.cq-reminder-dot{position:absolute;right:-2px;top:-1px;width:8px;height:8px;border-radius:50%;background:#e65045;box-shadow:0 0 0 2px #fff;z-index:5}
    .cq-reminder-section{border-top:1px solid rgba(18,105,101,.12);margin-top:7px;padding-top:7px}.cq-reminder-head{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:8px 11px;color:#244a49}.cq-reminder-head strong{font-size:12px}.cq-reminder-head span{font-size:10px;color:#78908e}
    .cq-reminder-item{width:100%;border:0;background:transparent;display:flex;align-items:flex-start;gap:9px;text-align:left;padding:10px 11px;border-radius:10px;cursor:pointer;color:#244a49}.cq-reminder-item:hover{background:#f1f8f7}.cq-reminder-item.unread{background:#edf8f6}.cq-reminder-icon{width:28px;height:28px;border-radius:9px;background:#fff;display:grid;place-items:center;flex:0 0 auto;font-size:14px;box-shadow:0 0 0 1px rgba(18,105,101,.08)}.cq-reminder-copy{display:flex;flex-direction:column;gap:2px;min-width:0}.cq-reminder-copy strong{font-size:11.5px;line-height:1.3}.cq-reminder-copy small{font-size:10.5px;line-height:1.35;color:#617a78}.cq-reminder-copy em{font-size:9.5px;color:#91a09f;font-style:normal;margin-top:2px}.cq-reminder-empty{padding:14px 11px;font-size:11px;color:#809390}
  `;
  document.head.appendChild(css);

  const observer=new MutationObserver(decorate);
  observer.observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>{decorate();setTimeout(()=>refresh(false),500)},{once:true});
  else{decorate();setTimeout(()=>refresh(false),500)}
  setInterval(()=>refresh(false),60000);
})();
