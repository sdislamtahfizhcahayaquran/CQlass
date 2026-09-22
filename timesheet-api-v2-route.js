// CQlass — Timesheet API route guard
// Semua request browser ke teacher-timesheet diarahkan ke teacher-timesheet-v2.
// Backend v2 tetap mem-proxy API lama, lalu menambahkan validasi jadwal dan badal Tahfizh.
(function(){
  'use strict';
  if(window.__CQ_TIMESHEET_API_V2_ROUTE__)return;
  const nativeFetch=window.fetch.bind(window);
  window.fetch=function(input,init){
    try{
      const url=typeof input==='string'?input:(input instanceof URL?input.href:(input instanceof Request?input.url:''));
      if(url&&url.includes('/functions/v1/teacher-timesheet')&&!url.includes('/functions/v1/teacher-timesheet-v2')){
        const next=url.replace('/functions/v1/teacher-timesheet','/functions/v1/teacher-timesheet-v2');
        if(input instanceof Request)return nativeFetch(new Request(next,input),init);
        return nativeFetch(next,init);
      }
    }catch(e){console.warn('Timesheet route v2:',e)}
    return nativeFetch(input,init);
  };
  window.__CQ_TIMESHEET_API_V2_ROUTE__=true;
})();
