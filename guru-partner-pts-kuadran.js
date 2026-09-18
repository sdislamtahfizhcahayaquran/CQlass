/* CQlass — Guru Partner PTS kuadran material patch */
(function(){
  'use strict';
  const originalFetch=window.fetch.bind(window);
  let kuadranByStudent={};

  function isPartnerTasks(url){return String(url||'').includes('/functions/v1/partner-tasks')}
  function parseAction(init){try{return JSON.parse(init?.body||'{}')?.action||''}catch{return ''}}
  function cleanBase(v){return String(v||'').replace(/^K\d+\s*[·\-:]\s*/i,'').trim()}
  function applyKuadran(root=document){
    root.querySelectorAll?.('#gpt2-body input[data-key="materi_hafalan"]').forEach(input=>{
      const sid=String(input.dataset.student||'');
      const k=String(kuadranByStudent[sid]||'').trim();
      const base=input.dataset.cqBaseMaterial||cleanBase(input.value);
      if(base)input.dataset.cqBaseMaterial=base;
      input.value=k&&base?`${k} · ${base}`:(base||k);
      input.readOnly=true;
      input.tabIndex=-1;
      input.title=k?`Kuadran ${k} · Materi otomatis sesuai jenjang kelas`:'Kuadran belum tersedia · Materi otomatis sesuai jenjang kelas';
    });
  }

  window.fetch=async function(input,init){
    const action=isPartnerTasks(typeof input==='string'?input:input?.url)?String(parseAction(init)).toLowerCase():'';
    const res=await originalFetch(input,init);
    if(action==='roster'){
      try{
        const data=await res.clone().json();
        if(Array.isArray(data?.students)){
          kuadranByStudent={};
          for(const s of data.students){if(s?.id&&s?.kuadran)kuadranByStudent[String(s.id)]=String(s.kuadran).trim()}
          setTimeout(()=>applyKuadran(document),0);
          setTimeout(()=>applyKuadran(document),80);
        }
      }catch{}
    }
    return res;
  };

  const observer=new MutationObserver(muts=>{
    for(const m of muts)for(const n of m.addedNodes)if(n.nodeType===1)applyKuadran(n);
  });
  observer.observe(document.documentElement,{childList:true,subtree:true});
  applyKuadran(document);
})();