/* CQlass production login visual assets. Does not touch auth or application data. */
(function(){
  'use strict';
  const BASE='https://cdn.jsdelivr.net/gh/sdislamtahfizhcahayaquran/CQlass@login-redesign-preview/preview-assets/';
  const load=async(names)=>{
    const parts=await Promise.all(names.map(async name=>{
      const r=await fetch(BASE+name+'?v=20260909-login1',{cache:'force-cache'});
      if(!r.ok) throw new Error('asset '+name+' '+r.status);
      return (await r.text()).trim();
    }));
    return parts.join('');
  };
  Promise.all([
    load(['bg1.txt','bg2.txt','bg3.txt','bg4.txt']),
    load(['wm1.txt','wm2.txt','wm3.txt','wm4.txt'])
  ]).then(([bg,wm])=>{
    const root=document.documentElement;
    root.style.setProperty('--cq-login-bg','url("data:image/webp;base64,'+bg+'")');
    root.style.setProperty('--cq-login-wordmark','url("data:image/webp;base64,'+wm+'")');
    root.classList.add('login-assets-ready');
  }).catch(err=>{
    console.warn('CQlass login assets fallback:',err);
    document.documentElement.classList.add('login-assets-fallback');
  });
})();
