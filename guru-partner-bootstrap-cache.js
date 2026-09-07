/* CQlass — cache bootstrap Guru Partner agar Nilai Tahfizh tidak memuat tanpa akhir */
(function(){
  const originalFetch = window.fetch.bind(window);
  let cachedBootstrap = null;
  let cachedToken = '';

  function isPartnerTasks(url){
    return String(url||'').includes('/functions/v1/partner-tasks');
  }
  function getHeader(headers,name){
    if(!headers) return '';
    if(headers instanceof Headers) return headers.get(name)||'';
    const key=Object.keys(headers).find(k=>k.toLowerCase()===name.toLowerCase());
    return key ? String(headers[key]||'') : '';
  }
  function parseAction(init){
    try{
      const b=typeof init?.body==='string' ? JSON.parse(init.body) : null;
      return String(b?.action||'').toLowerCase();
    }catch{return '';}
  }
  function makeResponse(data){
    return new Response(JSON.stringify(data),{
      status:200,
      headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}
    });
  }

  window.fetch = async function(input,init){
    const url=typeof input==='string' ? input : (input?.url||'');
    if(!isPartnerTasks(url)) return originalFetch(input,init);

    const action=parseAction(init);
    const token=getHeader(init?.headers,'x-session-token');
    if(token && cachedToken && token!==cachedToken){cachedBootstrap=null;cachedToken='';}

    if(action==='bootstrap' && cachedBootstrap && (!token || token===cachedToken)){
      return makeResponse(cachedBootstrap);
    }

    const res=await originalFetch(input,init);
    if(action==='bootstrap' && res.ok){
      try{
        const data=await res.clone().json();
        if(data?.success && data?.role==='partner'){
          cachedBootstrap=data;
          cachedToken=token||cachedToken;
          window.__CQ_PARTNER_BOOTSTRAP__=data;
        }
      }catch{}
    }
    return res;
  };

  window.addEventListener('storage',e=>{
    if(e.key && /session|auth|token/i.test(e.key)){cachedBootstrap=null;cachedToken='';}
  });
})();
