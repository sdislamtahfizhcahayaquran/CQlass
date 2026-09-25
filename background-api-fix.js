/* CQlass — core sidebar runtime guard.
   Capture the original app-core navigation before role-specific wrappers are loaded.
   This prevents pre-login sidebar calls from crashing when currentUser is still null. */
(function(){
  'use strict';
  if(window.__cqSidebarCoreGuardInstalled)return;
  window.__cqSidebarCoreGuardInstalled=true;
  if(typeof renderSidebar==='function'){
    const base=renderSidebar;
    window.__cqBaseRenderSidebar=base;
    const safe=function(){
      let u=null;try{u=(typeof currentUser!=='undefined')?currentUser:null}catch(_){u=null}
      if(!u||!u.role){const s=document.getElementById('sidebar');if(s)s.innerHTML='';return null}
      return base.apply(this,arguments);
    };
    safe.__cqCoreSidebarSafe=true;
    renderSidebar=safe;
  }
  if(typeof setActiveModule==='function')window.__cqBaseSetActiveModule=setActiveModule;
})();

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

/* HRD fast path.
   Dashboard HRD tidak lagi menunggu rantai hrd-live-report -> fungsi lain.
   Administrasi dibaca langsung dari hrd-administration, sementara Promosi Socmed
   dibaca dari endpoint ringan dan digabung di browser. */
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
    const action=String(payload.action||'').toLowerCase();
    if(action!=='rpp_file')return null;
    let who='hrd';
    try{who=String((typeof currentUser!=='undefined'&&currentUser?.username)||'hrd').toLowerCase()}catch(_){ }
    return {key:who+'|'+action+'|'+String(payload.start||'')+'|'+String(payload.end||'')+'|'+String(payload.submission_id||''),url,payload,action};
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
  function asResponse(data,status=200,source='hrd-fast'){
    return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','X-CQ-Source':source}});
  }
  function recalcTeacher(t){
    const cats=(t.categories||[]).filter(c=>c&&c.applicable);
    const done=cats.filter(c=>c.status==='present').length;
    const partial=cats.filter(c=>c.status==='partial').length;
    const missing=cats.filter(c=>c.status==='missing').length;
    t.required_count=cats.length;
    t.completed_count=done;
    t.partial_count=partial;
    t.missing_count=missing;
    t.issue_units=missing+partial;
    t.missing_categories=cats.filter(c=>c.status==='missing').map(c=>c.label);
    t.partial_categories=cats.filter(c=>c.status==='partial').map(c=>c.label);
    t.completeness_index=cats.length?Math.round(((done+partial*.5)/cats.length)*100):0;
  }
  function mergePromotion(admin,promo){
    if(!admin||admin.success===false)return admin;
    const by=promo?.by_teacher||{};
    let complete=0,missing=0;
    for(const t of (admin.teachers||[])){
      const p=by[String(t.teacher_id)]||{item_count:0,last_created_at:null};
      const count=Number(p.item_count||0);
      if(count)complete++;else missing++;
      const cat={key:'promotion',label:'Promosi Sekolah',applicable:true,status:count?'present':'missing',item_count:count,last_created_at:p.last_created_at||null,items:[],granularity:'period',lazy_items:true,note:'Minimal 1 foto Promosi Socmed pada periode yang dipilih HRD.'};
      const idx=(t.categories||[]).findIndex(c=>c&&c.key==='promotion');
      if(idx>=0)t.categories[idx]=cat;else (t.categories||(t.categories=[])).push(cat);
      recalcTeacher(t);
    }
    admin.summary=admin.summary||{};
    admin.summary.promotion_complete=complete;
    admin.summary.promotion_missing=missing;
    admin.summary.with_issues=(admin.teachers||[]).filter(t=>Number(t.missing_count||0)>0||Number(t.partial_count||0)>0).length;
    admin.summary.clean=(admin.teachers||[]).length-admin.summary.with_issues;
    admin.fast_path=true;
    return admin;
  }
  async function directHrd(init,info){
    const adminUrl=info.url.replace('/functions/v1/hrd-live-report','/functions/v1/hrd-administration');
    const baseInit={...(init||{})};
    if(info.action==='rpp_file')return nativeFetch(adminUrl,baseInit);

    const promoUrl=info.url.replace('/functions/v1/hrd-live-report','/functions/v1/hrd-promotion-monitor');
    const promoInit={...(init||{}),body:JSON.stringify({action:'summary',start:info.payload.start,end:info.payload.end})};
    const [adminRes,promoRes]=await Promise.all([
      nativeFetch(adminUrl,baseInit),
      nativeFetch(promoUrl,promoInit).catch(()=>null)
    ]);
    const raw=await adminRes.text();let admin={};
    try{admin=raw?JSON.parse(raw):{}}catch(_){return new Response(raw,{status:adminRes.status,headers:{'Content-Type':'text/plain'}})}
    if(!adminRes.ok||admin.success===false)return asResponse(admin,adminRes.status,'hrd-administration');
    let promo={};
    if(promoRes?.ok){try{promo=await promoRes.json()}catch(_){promo={}}}
    return asResponse(mergePromotion(admin,promo),200,'hrd-fast-direct');
  }

  window.fetch=async function(input,init){
    const info=requestInfo(input,init);
    if(!info)return nativeFetch(input,init);

    const hit=cache.get(info.key),age=hit?Date.now()-hit.at:Infinity;
    if(hit&&age<FRESH_MS)return cachedResponse(hit);

    try{
      const response=await directHrd(init,info);
      if(!response.ok&&hit&&age<STALE_MS)return cachedResponse(hit);
      await remember(info.key,response);
      return response;
    }catch(err){
      if(hit&&age<STALE_MS)return cachedResponse(hit);
      if(err?.name==='AbortError')throw err;
      await new Promise(r=>setTimeout(r,180));
      try{
        const retry=await directHrd(init,info);
        await remember(info.key,retry);
        return retry;
      }catch(_){
        return nativeFetch(input,init);
      }
    }
  };
})();

/* Load shell enhancements only after the active role is known. */
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
      return String(u.role||u.primary_role||u.role_code||'').trim().toLowerCase().replace(/[\s-]+/g,'_');
    }catch(_){return ''}
  }

  function primeDashboardRole(r){
    try{
      if(r==='kabid_quran'&&typeof DASHBOARD_MODULE!=='undefined'){
        if(!Array.isArray(DASHBOARD_MODULE.roles))DASHBOARD_MODULE.roles=[];
        if(!DASHBOARD_MODULE.roles.includes('kabid_quran'))DASHBOARD_MODULE.roles.push('kabid_quran');
      }
    }catch(_){ }
  }

  function loadForRole(){
    const r=role();
    if(!r)return;
    primeDashboardRole(r);

    if(['guru','walas','partner','guru_partner','pengabdian','akademik','pimpinan'].includes(r)){
      add('./academic-sidebar-order.js?v=20260924-rolelazy1','__cqAcademicSidebarOrderRoleLazy',false);
    }
    if(['akademik','pimpinan','admin'].includes(r)){
      add('./academic-teacher-report.js?v=20260924-rolelazy1','__cqAcademicTeacherReportRoleLazy',false);
    }
    if(['admin','akademik','kegiatan'].includes(r)){
      add('./kabid-role-scope-fix.js?v=20260924-special1','__cqKabidRoleScopeRoleLazy',false);
    }

    if(r==='akademik'){
      add('./academic-kabid-cleanup.js?v=20260924-rolelazy1','__cqAcademicKabidCleanupRoleLazy',false);
      add('./academic-kabid-ui-v2.js?v=20260924-rolelazy1','__cqAcademicKabidUiV2RoleLazy',false);
      add('./academic-teacher-report-v3.js?v=20260924-rolelazy1','__cqAcademicTeacherReportV3RoleLazy',false);
      add('./academic-dashboard-standalone-v7.js?v=20260924-rolelazy1','__cqAcademicDashboardV7RoleLazy',false);
      add('./academic-header-shell-v8.js?v=20260924-rolelazy1','__cqAcademicHeaderV8RoleLazy',false);
    }
    if(r==='kegiatan'){
      add('./kegiatan-role-polish.js?v=20260915-kegiatan-polish1','__cqKegiatanPolishLoaderInstalled',true);
      add('./kegiatan-sidebar-clean.js?v=20260916-kegiatan-sidebar2','__cqKegiatanSidebarCleanLoaderInstalled',true);
      add('./kegiatan-live-report.js?v=20260921-live3','__cqKegiatanLiveReportLoaderV3Installed',false);
      add('./kegiatan-live-report-coaches-only.js?v=20260921-coaches1','__cqKegiatanLiveReportCoachesOnlyLoaderInstalled',false);
      add('./kegiatan-exkul-settings.js?v=20260921-target1','__cqKegiatanExkulSettingsLoaderV1Installed',false);
    }
    if(r==='partner'){
      add('./guru-partner-tahfizh-menu.js?v=20260924-rolelazy1','__cqPartnerTahfizhMenuRoleLazy',false);
    }
    if(r==='kabid_quran'){
      add('./tahfizh-kabid-dashboard-layout.js?v=20260924-kabid7','__cqTahfizhKabidDashboardLayoutV1',false);
      add('./tahfizh-kabid-shell-fix.js?v=20260924-kabid7','__cqTahfizhKabidShellFixLoaderInstalled',false);
      add('./tahfizh-kabid-input-live.js?v=20260924-kabid7','__cqTahfizhKabidInputLiveLoaderInstalled',false);
    }
    if(r==='tahfizh'){
      add('./tahfizh-kesiswaan-sidebar-clean.js?v=20260924-rolelazy1','__cqTahfizhKesiswaanSidebarRoleLazy',false);
    }
    if(r==='kesiswaan'){
      add('./uks-duty-kesiswaan.js?v=20260924-rolelazy1','__cqUksDutyKesiswaanRoleLazy',false);
    }
  }

  add('./tahfizh-report-preview-polish.js?v=20260924-previewhd1','__cqTahfizhReportPreviewPolishV1',false);
  add('./profile-dropdown.js?v=20260914-profile1','__cqProfileDropdownLoader',false);
  add('./push-notifications.js?v=20260914-push3','__cqPushLoaderInstalled',true);
  add('./reminder-center.js?v=20260915-bell-all-role2','__cqReminderCenterLoaderInstalled',true);

  loadForRole();

  if(typeof enterApp==='function'&&!enterApp.__cqRoleLazyLoaderV2){
    const oldEnter=enterApp;
    const wrapped=function(){
      const r=role();
      primeDashboardRole(r);
      loadForRole();
      const out=oldEnter.apply(this,arguments);
      setTimeout(loadForRole,0);
      if(r==='kabid_quran')setTimeout(()=>{try{window.cqStabilizeKabidTahfizh?.(true)}catch(_){}},80);
      return out;
    };
    wrapped.__cqRoleLazyLoaderV2=true;
    enterApp=wrapped;
  }
})();
