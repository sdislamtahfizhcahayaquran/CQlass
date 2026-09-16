/* CQlass — route report preview/class report to v2 so School Activity uses Rapor Kegiatan matrix */
(function(){
  'use strict';
  if(window.__cqReportPreviewV2Route)return;
  const originalFetch=window.fetch.bind(window);
  window.fetch=function(input,init){
    try{
      if(typeof input==='string'&&input.includes('/functions/v1/report-preview')&&!input.includes('/functions/v1/report-preview-v2')){
        input=input.replace('/functions/v1/report-preview','/functions/v1/report-preview-v2');
      }else if(input instanceof Request){
        const u=input.url;
        if(u.includes('/functions/v1/report-preview')&&!u.includes('/functions/v1/report-preview-v2')){
          input=new Request(u.replace('/functions/v1/report-preview','/functions/v1/report-preview-v2'),input);
        }
      }
    }catch(_){}
    return originalFetch(input,init);
  };
  window.__cqReportPreviewV2Route=true;
})();
