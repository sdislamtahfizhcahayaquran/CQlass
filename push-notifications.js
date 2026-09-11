/* CQlass — Web Push client
   Permission is only requested after an explicit user click. */
(function(){
  'use strict';
  if(window.__cqPushInstalled) return;
  window.__cqPushInstalled = true;

  const PUSH_URL = `${SUPABASE_URL}/functions/v1/notifications`;
  const BTN_ID = 'cq-push-toggle';

  function supportsPush(){
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  }
  function isIos(){
    return /iphone|ipad|ipod/i.test(navigator.userAgent || '');
  }
  function isStandalone(){
    return window.matchMedia?.('(display-mode: standalone)')?.matches || window.navigator.standalone === true;
  }
  function b64ToUint8(base64){
    const padding = '='.repeat((4 - base64.length % 4) % 4);
    const safe = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(safe);
    return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
  }
  function deviceName(){
    const ua = navigator.userAgent || '';
    if(/android/i.test(ua)) return 'Android';
    if(/iphone/i.test(ua)) return 'iPhone';
    if(/ipad/i.test(ua)) return 'iPad';
    if(/windows/i.test(ua)) return 'Windows';
    if(/macintosh|mac os/i.test(ua)) return 'Mac';
    return navigator.platform || 'Perangkat';
  }

  async function api(action, payload={}){
    const token = typeof getAuthToken === 'function' ? getAuthToken() : localStorage.getItem('cqlass_session_token');
    if(!token) throw new Error('session_missing');
    const res = await fetch(PUSH_URL, {
      method:'POST',
      headers:{
        'Content-Type':'application/json',
        'apikey':SUPABASE_PUBLISHABLE_KEY,
        'x-session-token':token
      },
      body:JSON.stringify({action, ...payload})
    });
    let data={};
    try{ data=await res.json(); }catch(_){ throw new Error('invalid_response'); }
    if(!res.ok || data.success === false) throw new Error(data.error || `http_${res.status}`);
    return data;
  }

  async function getRegistration(){
    return navigator.serviceWorker.register('./cqlass-sw.js', {scope:'./'});
  }

  function setButtonState(state){
    const btn=document.getElementById(BTN_ID);
    if(!btn) return;
    btn.dataset.state=state;
    if(state==='active'){
      btn.innerHTML='<span aria-hidden="true">✓</span><span>Notif HP</span>';
      btn.title='Notifikasi HP aktif. Klik untuk kirim tes.';
      btn.style.background='rgba(255,255,255,.18)';
    }else if(state==='blocked'){
      btn.innerHTML='<span aria-hidden="true">×</span><span>Notif HP</span>';
      btn.title='Notifikasi diblokir browser';
      btn.style.opacity='.72';
    }else{
      btn.innerHTML='<span aria-hidden="true">◉</span><span>Notif HP</span>';
      btn.title='Aktifkan notifikasi CQlass di HP/laptop';
      btn.style.opacity='1';
    }
  }

  function ensureButton(){
    if(document.getElementById(BTN_ID)) return;
    const wrap=document.getElementById('bell-wrap');
    const app=document.getElementById('app-screen');
    if(!wrap || !app) return;
    const btn=document.createElement('button');
    btn.id=BTN_ID;
    btn.type='button';
    btn.className='account-btn';
    btn.style.cssText='display:inline-flex;align-items:center;gap:6px;white-space:nowrap;padding:7px 10px;font-size:12px;';
    btn.innerHTML='<span aria-hidden="true">◉</span><span>Notif HP</span>';
    btn.title='Aktifkan notifikasi CQlass di HP/laptop';
    btn.addEventListener('click', onButtonClick);
    wrap.insertAdjacentElement('afterend', btn);

    if(!supportsPush()){
      btn.disabled=true;
      btn.title='Browser ini belum mendukung Web Push';
      btn.style.opacity='.55';
      return;
    }
    if(Notification.permission==='denied') setButtonState('blocked');
    syncExistingSubscription().catch(()=>{});
  }

  async function syncExistingSubscription(){
    if(!supportsPush() || Notification.permission!=='granted') return false;
    const registration=await getRegistration();
    const existing=await registration.pushManager.getSubscription();
    if(!existing) return false;
    await api('subscribe', {
      subscription:existing.toJSON(),
      user_agent:navigator.userAgent || '',
      device_name:deviceName()
    });
    setButtonState('active');
    return true;
  }

  async function enablePush(sendTest=true){
    if(!supportsPush()){
      showToast?.('Browser ini belum mendukung notifikasi push.', true);
      return false;
    }
    if(isIos() && !isStandalone()){
      showToast?.('Di iPhone/iPad, tambahkan CQlass ke Layar Utama lalu buka dari ikon CQlass untuk mengaktifkan notifikasi.', true);
      return false;
    }

    const status=await api('status');
    if(!status?.configured || !status?.public_key) throw new Error('push_backend_not_configured');

    let permission=Notification.permission;
    if(permission==='default') permission=await Notification.requestPermission();
    if(permission!=='granted'){
      setButtonState(permission==='denied' ? 'blocked' : 'idle');
      showToast?.('Izin notifikasi belum diberikan.', true);
      return false;
    }

    const registration=await getRegistration();
    let subscription=await registration.pushManager.getSubscription();
    if(!subscription){
      subscription=await registration.pushManager.subscribe({
        userVisibleOnly:true,
        applicationServerKey:b64ToUint8(status.public_key)
      });
    }
    await api('subscribe', {
      subscription:subscription.toJSON(),
      user_agent:navigator.userAgent || '',
      device_name:deviceName()
    });
    setButtonState('active');

    if(sendTest){
      const result=await api('test');
      if(result?.sent>0) showToast?.('Notifikasi HP aktif. Notifikasi tes sudah dikirim.');
      else showToast?.('Notifikasi HP tersimpan, tetapi tes belum terkirim.', true);
    }else{
      showToast?.('Notifikasi HP aktif.');
    }
    return true;
  }

  async function disablePush(){
    if(!supportsPush()) return;
    const registration=await navigator.serviceWorker.getRegistration('./');
    const subscription=await registration?.pushManager?.getSubscription();
    if(subscription){
      try{ await api('unsubscribe',{endpoint:subscription.endpoint}); }catch(_){}
      await subscription.unsubscribe();
    }
    setButtonState('idle');
    showToast?.('Notifikasi HP dinonaktifkan di perangkat ini.');
  }

  async function onButtonClick(){
    const btn=document.getElementById(BTN_ID);
    if(btn?.dataset.state==='blocked'){
      showToast?.('Notifikasi diblokir. Buka pengaturan situs di browser lalu izinkan Notifikasi.', true);
      return;
    }
    try{
      if(btn?.dataset.state==='active'){
        const result=await api('test');
        if(result?.sent>0) showToast?.('Notifikasi tes sudah dikirim ke perangkat ini.');
        else showToast?.('Belum ada subscription aktif untuk perangkat ini.', true);
      }else{
        await enablePush(true);
      }
    }catch(err){
      console.warn('CQlass push:', err);
      const code=String(err?.message || '');
      if(code==='push_backend_not_configured' || code==='vapid_not_configured'){
        showToast?.('Server notifikasi HP belum selesai dikonfigurasi.', true);
      }else if(code==='session_missing' || code==='session_invalid' || code==='session_expired'){
        showToast?.('Sesi login perlu diperbarui. Silakan login ulang.', true);
      }else{
        showToast?.('Notifikasi HP belum dapat diaktifkan. Coba lagi.', true);
      }
    }
  }

  function installPwaMeta(){
    if(!document.querySelector('link[rel="manifest"]')){
      const link=document.createElement('link');
      link.rel='manifest'; link.href='./manifest.webmanifest';
      document.head.appendChild(link);
    }
    if(!document.querySelector('link[rel="apple-touch-icon"]')){
      const icon=document.createElement('link');
      icon.rel='apple-touch-icon'; icon.href='./logo_sd.png';
      document.head.appendChild(icon);
    }
    if(!document.querySelector('meta[name="apple-mobile-web-app-capable"]')){
      const meta=document.createElement('meta');
      meta.name='apple-mobile-web-app-capable'; meta.content='yes';
      document.head.appendChild(meta);
    }
  }

  window.CQPush={enable:()=>enablePush(true), disable:disablePush, test:()=>api('test'), sync:syncExistingSubscription};

  installPwaMeta();
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', ensureButton, {once:true});
  else ensureButton();

  const observer=new MutationObserver(()=>ensureButton());
  observer.observe(document.documentElement,{childList:true,subtree:true});
})();
