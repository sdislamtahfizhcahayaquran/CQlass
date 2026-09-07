/* CQlass — Guru Partner: pemilih kelas + cache bootstrap */
(function(){
  const originalFetch=window.fetch.bind(window);
  let cachedBootstrap=null,cachedToken='';

  function isPartnerTasks(url){return String(url||'').includes('/functions/v1/partner-tasks')}
  function header(headers,name){
    if(!headers)return'';
    if(headers instanceof Headers)return headers.get(name)||'';
    const k=Object.keys(headers).find(x=>x.toLowerCase()===name.toLowerCase());
    return k?String(headers[k]||''):'';
  }
  function actionOf(init){
    try{return String(JSON.parse(typeof init?.body==='string'?init.body:'{}')?.action||'').toLowerCase()}catch{return''}
  }
  function cachedResponse(data){return new Response(JSON.stringify(data),{status:200,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}})}

  window.fetch=async function(input,init){
    const url=typeof input==='string'?input:(input?.url||'');
    if(!isPartnerTasks(url))return originalFetch(input,init);
    const action=actionOf(init),token=header(init?.headers,'x-session-token');
    if(token&&cachedToken&&token!==cachedToken){cachedBootstrap=null;cachedToken='';}
    if(action==='bootstrap'&&cachedBootstrap&&(!token||token===cachedToken))return cachedResponse(cachedBootstrap);
    const res=await originalFetch(input,init);
    if(action==='bootstrap'&&res.ok){
      try{
        const data=await res.clone().json();
        if(data?.success&&data?.role==='partner'){
          cachedBootstrap=data;cachedToken=token||cachedToken;window.__CQ_PARTNER_BOOTSTRAP__=data;
        }
      }catch{}
    }
    return res;
  };

  function apply(){
    const sel=document.getElementById('gp-class');
    if(!sel)return;
    const field=sel.closest('.gp-field');
    const label=field?.querySelector('label');
    if(label)label.textContent='Pilih Kelas Input';
    sel.setAttribute('aria-label','Pilih Kelas Input Tahfizh');
    [...sel.options].forEach(o=>{
      const raw=String(o.textContent||'').trim();
      const cls=raw.split('·')[0].trim();
      if(cls)o.textContent=cls;
    });
  }
  new MutationObserver(apply).observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener('DOMContentLoaded',apply);
  window.addEventListener('load',apply);
})();
