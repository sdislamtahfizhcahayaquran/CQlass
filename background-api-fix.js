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

/* HRD Live Report fast path.
   - cache memori singkat agar bolak-balik tab tidak fetch ulang
   - stale-while-revalidate agar halaman terbuka instan
   - satu retry otomatis untuk gangguan network sesaat
   Cache hanya hidup selama tab aktif dan tidak menyimpan token/session. */
(function(){
  'use strict';
  if(window.__cqHrdFastFetchInstalled || typeof window.fetch!=='function') return;
  window.__cqHrdFastFetchInstalled=true;

  const nativeFetch=window.fetch.bind(window);
  const cache=new Map();
  const FRESH_MS=120000;
  const STALE_MS=600000;

  function requestInfo(input,init){
    const url=typeof input==='string'?input:(input&&input.url)||'';
    if(!/\/functions\/v1\/hrd-live-report(?:\?|$)/.test(url))return null;
    let payload={};
    try{payload=typeof init?.body==='string'?JSON.parse(init.body):{}}catch(_){return null}
    if(String(payload.action||'').toLowerCase()!=='administration')return null;
    let who='hrd';
    try{who=String((typeof currentUser!=='undefined'&&currentUser?.username)||'hrd').toLowerCase()}catch(_){ }
    return {key:who+'|'+String(payload.start||'')+'|'+String(payload.end||''),url};
  }
  function cachedResponse(entry){
    return new Response(entry.body,{status:200,headers:{'Content-Type':'application/json; charset=utf-8','X-CQ-Cache':'hrd-memory'}});
  }
  async function remember(key,response){
    try{
      if(!response?.ok)return;
      const text=await response.clone().text();
      const data=JSON.parse(text||'{}');
      if(data&&data.success!==false)cache.set(key,{body:text,at:Date.now()});
    }catch(_){ }
  }
  function refreshSilently(input,init,key){
    const next={...(init||{})};delete next.signal;
    nativeFetch(input,next).then(r=>remember(key,r)).catch(()=>{});
  }

  window.fetch=async function(input,init){
    const info=requestInfo(input,init);
    if(!info)return nativeFetch(input,init);

    const hit=cache.get(info.key),age=hit?Date.now()-hit.at:Infinity;
    if(hit&&age<FRESH_MS){refreshSilently(input,init,info.key);return cachedResponse(hit)}
    try{
      const response=await nativeFetch(input,init);
      if(!response.ok&&hit&&age<STALE_MS)return cachedResponse(hit);
      await remember(info.key,response);return response;
    }catch(err){
      if(hit&&age<STALE_MS)return cachedResponse(hit);
      if(err?.name==='AbortError')throw err;
      await new Promise(r=>setTimeout(r,220));
      return nativeFetch(input,init);
    }
  };
})();

/* Load shell enhancements and only the scripts needed by the active role. */
(function(){
  'use strict';
  if(window.__cqShellEnhancementLoaderInstalled) return;
  window.__cqShellEnhancementLoaderInstalled=true;

  function add(src,key,async=true){
    if(window[key])return;
    window[key]=true;
    const s=document.createElement('script');s.src=src;s.async=async;
    s.onerror=()=>console.warn('CQlass script gagal dimuat:',src);
    document.head.appendChild(s);
  }
  function role(){
    try{
      const u=(typeof currentUser!=='undefined'&&currentUser)||JSON.parse(localStorage.getItem('cqlass_user')||'{}')||{};
      return String(u.role||u.primary_role||u.role_code||'').trim().toLowerCase();
    }catch(_){return ''}
  }

  function loadForRole(){
    const r=role();
    if(r==='kegiatan'){
      add('./kegiatan-role-polish.js?v=20260915-kegiatan-polish1','__cqKegiatanPolishLoaderInstalled',true);
      add('./kegiatan-sidebar-clean.js?v=20260916-kegiatan-sidebar2','__cqKegiatanSidebarCleanLoaderInstalled',true);
      add('./kegiatan-live-report.js?v=20260921-live3','__cqKegiatanLiveReportLoaderV3Installed',false);
      add('./kegiatan-live-report-coaches-only.js?v=20260921-coaches1','__cqKegiatanLiveReportCoachesOnlyLoaderInstalled',false);
      add('./kegiatan-exkul-settings.js?v=20260921-target1','__cqKegiatanExkulSettingsLoaderV1Installed',false);
    }
    if(r==='partner'){
      add('./guru-partner-tahfizh-menu.js?v=20260922-sidebarfix2','__cqPartnerTahfizhMenuFreshV2',false);
    }
    if(r==='tahfizh'||r==='kabid_tahfizh'){
      add('./tahfizh-kabid-shell-fix.js?v=20260922-shell4','__cqTahfizhKabidShellFixLoaderInstalled',false);
      add('./tahfizh-kesiswaan-sidebar-clean.js?v=20260922-single3','__cqTahfizhKesiswaanSidebarCleanLoaderInstalled',false);
    }
  }

  add('./profile-dropdown.js?v=20260914-profile1','__cqProfileDropdownLoader',false);
  add('./push-notifications.js?v=20260914-push3','__cqPushLoaderInstalled',true);
  add('./reminder-center.js?v=20260915-bell-all-role2','__cqReminderCenterLoaderInstalled',true);

  loadForRole();

  // Pada login baru currentUser belum ada saat file ini dieksekusi. Muat modul
  // role tepat setelah enterApp supaya tidak membebani halaman login.
  if(typeof enterApp==='function'&&!enterApp.__cqRoleLazyLoader){
    const oldEnter=enterApp;
    const wrapped=function(){const out=oldEnter.apply(this,arguments);setTimeout(loadForRole,0);return out};
    wrapped.__cqRoleLazyLoader=true;
    enterApp=wrapped;
  }
})();
