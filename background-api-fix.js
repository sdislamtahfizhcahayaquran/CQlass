/* CQlass — background request fix
   Request non-kritis tidak boleh memunculkan toast error global.
   Error penting pada aksi pengguna tetap ditangani oleh callApi utama/caller. */
(function(){
  'use strict';
  if(window.__cqBackgroundApiFixInstalled || typeof callApi !== 'function') return;

  const originalCallApi = callApi;
  const silentActions = new Set([
    'logAktivitas',
    'getMyPendingTasks',
    'getKeterlambatanBelumDicatat',
    'getFotoProfil'
  ]);

  async function callBackgroundApi(action, params={}){
    const body = JSON.stringify({ action, secret: APP_SECRET, ...params });
    const controller = new AbortController();
    const timeoutId = setTimeout(()=>controller.abort(),30000);

    let res;
    try{
      res=await fetch(APPS_SCRIPT_URL,{
        method:'POST',
        headers:{'Content-Type':'text/plain;charset=utf-8'},
        body,
        redirect:'follow',
        signal:controller.signal
      });
    }catch(err){
      if(err?.name==='AbortError') throw new Error('Server terlalu lama merespons.');
      throw new Error('Request latar belakang belum dapat diproses.');
    }finally{
      clearTimeout(timeoutId);
    }

    const raw=await res.text();
    let data;
    try{data=JSON.parse(raw)}catch(_){throw new Error('Respons request latar belakang tidak valid.')}
    return data||{};
  }

  callApi=function(action,params={}){
    if(silentActions.has(String(action||''))) return callBackgroundApi(action,params);
    return originalCallApi(action,params);
  };

  window.__cqBackgroundApiFixInstalled=true;
})();

/* Load profile dropdown, push helper, and critical reminder center. */
(function(){
  'use strict';
  if(window.__cqShellEnhancementLoaderInstalled) return;
  window.__cqShellEnhancementLoaderInstalled=true;

  const profile=document.createElement('script');
  profile.src='./profile-dropdown.js?v=20260914-profile1';
  profile.async=false;
  profile.onerror=function(){console.warn('CQlass profile dropdown gagal dimuat.')};
  document.head.appendChild(profile);

  if(!window.__cqPushLoaderInstalled){
    window.__cqPushLoaderInstalled=true;
    const push=document.createElement('script');
    push.src='./push-notifications.js?v=20260914-push3';
    push.async=true;
    push.onerror=function(){console.warn('CQlass push client gagal dimuat.')};
    document.head.appendChild(push);
  }

  if(!window.__cqReminderCenterLoaderInstalled){
    window.__cqReminderCenterLoaderInstalled=true;
    const reminder=document.createElement('script');
    reminder.src='./reminder-center.js?v=20260915-bell-all-role2';
    reminder.async=true;
    reminder.onerror=function(){console.warn('CQlass reminder center gagal dimuat.')};
    document.head.appendChild(reminder);
  }
})();
