/* CQlass PjBL router fix — ensure menu uses Supabase renderer */
(function bindPjblRenderer(){
  try{
    if(typeof MODULE_GROUPS==='undefined' || typeof renderPjBL!=='function') return;
    const akademik=MODULE_GROUPS.find(g=>g && g.id==='akademik');
    const item=akademik?.items?.find(i=>i && i.id==='pjbl');
    if(item) item.render=renderPjBL;
  }catch(err){
    console.error('PjBL router fix gagal:',err);
  }
})();
