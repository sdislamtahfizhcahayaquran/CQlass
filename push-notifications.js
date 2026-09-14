/* CQlass — Web Push client
   Meminta izin sekali per perangkat/browser setelah pengguna login.
   Native permission dipicu dari tombol pada prompt agar tidak diblokir browser. */
(function(){
  'use strict';
  if(window.__cqPushInstalled) return;
  window.__cqPushInstalled=true;

  const PUSH_URL=`${SUPABASE_URL}/functions/v1/notifications`;
  const PROMPT_KEY='cqlass_push_permission_prompt_v3';
  const PROMPT_ID='cq-push-permission-prompt';

  function supportsPush(){
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  }
  function isIos(){return /iphone|ipad|ipod/i.test(navigator.userAgent||'');}
  function isStandalone(){return window.matchMedia?.('(display-mode: standalone)')?.matches||window.navigator.standalone===true;}
  function token(){
    try{return typeof getAuthToken==='function'?getAuthToken():(localStorage.getItem('cqlass_session_token')||'')}catch(_){return ''}
  }
  function loggedIn(){
    try{return !!token() && typeof currentUser!=='undefined' && !!currentUser}catch(_){return false}
  }
  function b64ToUint8(base64){
    const padding='='.repeat((4-base64.length%4)%4);
    const safe=(base64+padding).replace(/-/g,'+').replace(/_/g,'/');
    const raw=atob(safe);
    return Uint8Array.from([...raw].map(c=>c.charCodeAt(0)));
  }
  function deviceName(){
    const ua=navigator.userAgent||'';
    if(/android/i.test(ua)) return 'Android';
    if(/iphone/i.test(ua)) return 'iPhone';
    if(/ipad/i.test(ua)) return 'iPad';
    if(/windows/i.test(ua)) return 'Windows';
    if(/macintosh|mac os/i.test(ua)) return 'Mac';
    return navigator.platform||'Perangkat';
  }
  async function api(action,payload={}){
    const t=token();
    if(!t) throw new Error('session_missing');
    const res=await fetch(PUSH_URL,{
      method:'POST',
      headers:{'Content-Type':'application/json','apikey':SUPABASE_PUBLISHABLE_KEY,'x-session-token':t},
      body:JSON.stringify({action,...payload})
    });
    let data={};
    try{data=await res.json();}catch(_){throw new Error('invalid_response');}
    if(!res.ok||data.success===false) throw new Error(data.error||`http_${res.status}`);
    return data;
  }
  async function getRegistration(){
    return navigator.serviceWorker.register('./cqlass-sw.js',{scope:'./'});
  }
  async function ensureSubscription(){
    if(!supportsPush()||Notification.permission!=='granted'||!loggedIn()) return false;
    const status=await api('status');
    if(!status?.configured||!status?.public_key) throw new Error('push_backend_not_configured');
    const registration=await getRegistration();
    let subscription=await registration.pushManager.getSubscription();
    if(!subscription){
      subscription=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64ToUint8(status.public_key)});
    }
    await api('subscribe',{
      subscription:subscription.toJSON(),
      user_agent:navigator.userAgent||'',
      device_name:deviceName()
    });
    return true;
  }

  function markPromptDone(result){
    try{localStorage.setItem(PROMPT_KEY,JSON.stringify({done:true,result:String(result||''),at:new Date().toISOString()}));}catch(_){}
  }
  function wasPrompted(){
    try{return !!localStorage.getItem(PROMPT_KEY);}catch(_){return true;}
  }
  function removePrompt(){document.getElementById(PROMPT_ID)?.remove();}

  function injectStyle(){
    if(document.getElementById('cq-push-permission-style')) return;
    const s=document.createElement('style');
    s.id='cq-push-permission-style';
    s.textContent=`
      .cq-push-permission{position:fixed;inset:0;z-index:120000;background:rgba(7,31,31,.42);backdrop-filter:blur(5px);-webkit-backdrop-filter:blur(5px);display:flex;align-items:flex-end;justify-content:center;padding:18px;animation:cqPushFade .16s ease}
      .cq-push-permission-card{width:min(430px,100%);background:#fff;border:1px solid rgba(18,105,101,.12);border-radius:22px;padding:20px;box-shadow:0 22px 70px rgba(5,45,43,.25);color:#173d3b;animation:cqPushUp .2s ease}
      .cq-push-permission-icon{width:46px;height:46px;border-radius:14px;background:#e8f4f4;color:#0a6e6e;display:grid;place-items:center;margin-bottom:14px}.cq-push-permission-icon svg{width:24px;height:24px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}
      .cq-push-permission-card h3{margin:0 0 7px;font-size:18px}.cq-push-permission-card p{margin:0;color:#667f7d;font-size:13px;line-height:1.55}
      .cq-push-permission-actions{display:flex;gap:9px;margin-top:18px}.cq-push-permission-actions button{flex:1;border:0;border-radius:12px;padding:11px 13px;font:800 13px/1.2 inherit;cursor:pointer}.cq-push-later{background:#edf5f4;color:#4f6c6a}.cq-push-allow{background:#0a6e6e;color:#fff}.cq-push-allow:disabled{opacity:.55;cursor:wait}
      @keyframes cqPushFade{from{opacity:0}to{opacity:1}}@keyframes cqPushUp{from{transform:translateY(14px);opacity:.7}to{transform:none;opacity:1}}
      @media(min-width:700px){.cq-push-permission{align-items:center}}
    `;
    document.head.appendChild(s);
  }

  function showPrompt(){
    if(!supportsPush()||!loggedIn()||wasPrompted()||document.getElementById(PROMPT_ID)) return;
    if(Notification.permission==='granted'){
      markPromptDone('granted-existing');
      ensureSubscription().catch(err=>console.warn('CQlass push sync:',err));
      return;
    }
    if(Notification.permission==='denied'){
      markPromptDone('denied-existing');
      return;
    }

    injectStyle();
    const root=document.createElement('div');
    root.id=PROMPT_ID;
    root.className='cq-push-permission';
    const iosNote=isIos()&&!isStandalone()
      ? 'Di iPhone/iPad, tambahkan CQlass ke Layar Utama terlebih dahulu agar notifikasi dapat aktif.'
      : 'Izinkan agar laporan, perubahan status, dan informasi penting CQlass bisa masuk langsung ke perangkat ini.';
    root.innerHTML=`<div class="cq-push-permission-card" role="dialog" aria-modal="true" aria-labelledby="cq-push-title">
      <div class="cq-push-permission-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"></path><path d="M10 21h4"></path></svg></div>
      <h3 id="cq-push-title">Aktifkan notifikasi CQlass?</h3>
      <p>${iosNote}<br><br>Permintaan ini hanya ditampilkan sekali di perangkat/browser ini.</p>
      <div class="cq-push-permission-actions"><button type="button" class="cq-push-later">Tidak sekarang</button><button type="button" class="cq-push-allow">Izinkan</button></div>
    </div>`;
    document.body.appendChild(root);

    root.querySelector('.cq-push-later').addEventListener('click',()=>{
      markPromptDone('later');
      removePrompt();
    });
    root.querySelector('.cq-push-allow').addEventListener('click',async()=>{
      const btn=root.querySelector('.cq-push-allow');
      btn.disabled=true;btn.textContent='Mengaktifkan...';
      try{
        if(isIos()&&!isStandalone()){
          markPromptDone('ios-needs-home-screen');
          removePrompt();
          if(typeof showToast==='function') showToast('Tambahkan CQlass ke Layar Utama, lalu buka dari ikon CQlass untuk mengaktifkan notifikasi.',true);
          return;
        }
        const permission=await Notification.requestPermission();
        markPromptDone(permission);
        if(permission==='granted'){
          await ensureSubscription();
          if(typeof showToast==='function') showToast('Notifikasi CQlass aktif di perangkat ini.');
        }else if(typeof showToast==='function'){
          showToast('Izin notifikasi tidak diberikan.',true);
        }
      }catch(err){
        console.warn('CQlass push:',err);
        markPromptDone('error');
        if(typeof showToast==='function') showToast('Notifikasi belum dapat diaktifkan di perangkat ini.',true);
      }finally{removePrompt();}
    });
  }

  function installPwaMeta(){
    if(!document.querySelector('link[rel="manifest"]')){
      const link=document.createElement('link');link.rel='manifest';link.href='./manifest.webmanifest';document.head.appendChild(link);
    }
    if(!document.querySelector('link[rel="apple-touch-icon"]')){
      const icon=document.createElement('link');icon.rel='apple-touch-icon';icon.href='./logo_sd.png';document.head.appendChild(icon);
    }
    if(!document.querySelector('meta[name="apple-mobile-web-app-capable"]')){
      const meta=document.createElement('meta');meta.name='apple-mobile-web-app-capable';meta.content='yes';document.head.appendChild(meta);
    }
  }

  function boot(){
    document.getElementById('cq-push-toggle')?.remove();
    if(!supportsPush()) return;
    if(Notification.permission==='granted'){
      markPromptDone('granted-existing');
      ensureSubscription().catch(err=>console.warn('CQlass push sync:',err));
      return;
    }
    if(Notification.permission==='denied'){
      markPromptDone('denied-existing');
      return;
    }
    if(!wasPrompted()&&loggedIn()) setTimeout(showPrompt,700);
  }

  window.CQPush={enable:async()=>{
    try{localStorage.removeItem(PROMPT_KEY);}catch(_){}
    showPrompt();
  },sync:ensureSubscription};

  installPwaMeta();
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true}); else boot();

  let tries=0;
  const timer=setInterval(()=>{
    tries++;
    if(loggedIn()){
      clearInterval(timer);
      boot();
    }else if(tries>90) clearInterval(timer);
  },700);
})();
