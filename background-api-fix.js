/* CQlass — background request fix
   Request non-kritis tidak boleh memunculkan toast error global.
   Error penting pada aksi pengguna tetap ditangani oleh callApi utama/caller. */
(function(){
  'use strict';
  if(window.__cqBackgroundApiFixInstalled || typeof callApi !== 'function') return;

  const originalCallApi = callApi;
  const silentActions = new Set(['logAktivitas','getMyPendingTasks','getKeterlambatanBelumDicatat','getFotoProfil']);

  async function callBackgroundApi(action, params={}){
    const body = JSON.stringify({ action, secret: APP_SECRET, ...params });
    const controller=new AbortController();
    const timeoutId=setTimeout(()=>controller.abort(),30000);
    let res;
    try{
      res=await fetch(APPS_SCRIPT_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body,redirect:'follow',signal:controller.signal});
    }catch(err){
      if(err?.name==='AbortError') throw new Error('Server terlalu lama merespons.');
      throw new Error('Request latar belakang belum dapat diproses.');
    }finally{clearTimeout(timeoutId)}
    const raw=await res.text();let data;
    try{data=JSON.parse(raw)}catch(_){throw new Error('Respons request latar belakang tidak valid.')}
    return data||{};
  }
  callApi=function(action,params={}){if(silentActions.has(String(action||''))) return callBackgroundApi(action,params);return originalCallApi(action,params)};
  window.__cqBackgroundApiFixInstalled=true;
})();

/* Load shell enhancements and role-specific dashboards. */
(function(){
  'use strict';
  if(window.__cqShellEnhancementLoaderInstalled) return;
  window.__cqShellEnhancementLoaderInstalled=true;
  function add(src,key,async=true){if(window[key])return;window[key]=true;const s=document.createElement('script');s.src=src;s.async=async;s.onerror=()=>console.warn('CQlass script gagal dimuat:',src);document.head.appendChild(s)}
  add('./profile-dropdown.js?v=20260914-profile1','__cqProfileDropdownLoader',false);
  add('./push-notifications.js?v=20260914-push3','__cqPushLoaderInstalled',true);
  add('./reminder-center.js?v=20260915-bell-all-role2','__cqReminderCenterLoaderInstalled',true);
  add('./kegiatan-role-polish.js?v=20260915-kegiatan-polish1','__cqKegiatanPolishLoaderInstalled',true);
  add('./kegiatan-sidebar-clean.js?v=20260916-kegiatan-sidebar2','__cqKegiatanSidebarCleanLoaderInstalled',true);
  add('./kegiatan-live-report.js?v=20260921-live3','__cqKegiatanLiveReportLoaderV3Installed',false);
  add('./kegiatan-live-report-coaches-only.js?v=20260921-coaches1','__cqKegiatanLiveReportCoachesOnlyLoaderInstalled',false);
  add('./kegiatan-exkul-settings.js?v=20260921-target1','__cqKegiatanExkulSettingsLoaderV1Installed',false);
  /* Live Readiness PTS Akademik dimuat langsung dari index.html agar tidak tertahan cache loader. */
  /* Kabid Tahfizh/Qur'an: bersihkan scope sidebar + tampilkan live progres input PTS. */
  add('./tahfizh-kabid-shell-fix.js?v=20260918-shell3','__cqTahfizhKabidShellFixLoaderInstalled',false);
})();
