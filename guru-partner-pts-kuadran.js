/* CQlass — Guru Partner PTS material display cleanup */
(function(){
  'use strict';
  function cleanBase(v){return String(v||'').replace(/^K\d+\s*[·\-:]\s*/i,'').trim()}
  function applyMaterial(root=document){
    root.querySelectorAll?.('#gpt2-body input[data-key="materi_hafalan"]').forEach(input=>{
      const base=cleanBase(input.dataset.cqBaseMaterial||input.value);
      if(base)input.dataset.cqBaseMaterial=base;
      input.value=base;
      input.readOnly=true;
      input.tabIndex=-1;
      input.title='Materi otomatis sesuai jenjang kelas';
    });
  }
  const observer=new MutationObserver(muts=>{
    for(const m of muts)for(const n of m.addedNodes)if(n.nodeType===1)applyMaterial(n);
  });
  observer.observe(document.documentElement,{childList:true,subtree:true});
  applyMaterial(document);
})();