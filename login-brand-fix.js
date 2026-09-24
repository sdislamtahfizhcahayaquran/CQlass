/* CQlass early shell guard + login branding */
(function(){
  'use strict';

  // Legacy HRD compatibility: some cached clients still call the removed -v2 route.
  // Rewrite it before any dashboard script runs so CORS/preflight never reaches a 404 route.
  if(!window.__cqHrdLegacyRouteGuard){
    window.__cqHrdLegacyRouteGuard=true;
    const nativeFetch=window.fetch.bind(window);
    window.fetch=function(input,init){
      try{
        if(typeof input==='string'&&input.includes('/functions/v1/hrd-live-report-v2')){
          input=input.replace('/functions/v1/hrd-live-report-v2','/functions/v1/hrd-live-report');
        }else if(input instanceof Request&&input.url.includes('/functions/v1/hrd-live-report-v2')){
          input=new Request(input.url.replace('/functions/v1/hrd-live-report-v2','/functions/v1/hrd-live-report'),input);
        }
      }catch(_){ }
      return nativeFetch(input,init);
    };
  }

  // renderSidebar is defined later by app-core. Wrap it once it exists and do nothing
  // until authentication has produced currentUser. This prevents all downstream sidebar
  // wrappers from crashing during startup/logout/session restoration.
  let tries=0;
  const sidebarTimer=setInterval(function(){
    tries++;
    try{
      if(typeof window.renderSidebar==='function'&&!window.renderSidebar.__cqNullUserGuard){
        const original=window.renderSidebar;
        const safe=function(){
          if(typeof currentUser==='undefined'||!currentUser){
            const sidebar=document.getElementById('sidebar');
            if(sidebar&&document.getElementById('app-screen')?.style.display==='none')sidebar.innerHTML='';
            return;
          }
          return original.apply(this,arguments);
        };
        safe.__cqNullUserGuard=true;
        window.renderSidebar=safe;
        try{renderSidebar=safe}catch(_){ }
        clearInterval(sidebarTimer);
      }else if(tries>200){
        clearInterval(sidebarTimer);
      }
    }catch(_){
      if(tries>200)clearInterval(sidebarTimer);
    }
  },25);

  const semantic=document.createElement('script');
  semantic.src='hrd-timesheet-semantics.js?v=20260924-hrd-drill3';
  semantic.id='cq-hrd-timesheet-semantics';
  document.head.appendChild(semantic);

  const inbox=document.createElement('script');
  inbox.src='hrd-report-inbox.js?v=20260924-inbox1';
  inbox.id='cq-hrd-report-inbox';
  document.head.appendChild(inbox);

  const brand=document.querySelector('#login-screen .brand-row');
  if(brand){
    brand.innerHTML=`
      <img src="logo_sd.png?v=20260910-opt1" class="brand-school-logo" alt="Logo SDIT Cahaya Qur'an" onerror="this.style.display='none'">
      <div class="brand-wordmark" aria-label="CQlass SDIT Cahaya Qur'an — Ilmu, Akhlak, Generasi Qur'ani">
        <div class="cq-name">CQlass</div>
        <div class="cq-school">SDIT Cahaya Qur'an</div>
        <div class="cq-tagline">Ilmu &nbsp;•&nbsp; Akhlak &nbsp;•&nbsp; Generasi Qur'ani</div>
      </div>`;
  }
})();