// CQlass — Academic sidebar order guard
// Cetak Rapor harus selalu menjadi menu paling akhir di grup Akademik.
(function(){
  function fixAcademicOrder(){
    try{
      if(typeof MODULE_GROUPS==='undefined') return false;
      const group=MODULE_GROUPS.find(g=>g&&g.id==='akademik');
      if(!group||!Array.isArray(group.items)) return false;
      const idx=group.items.findIndex(item=>item&&item.id==='rapor');
      if(idx<0) return false;
      if(idx!==group.items.length-1){
        const [rapor]=group.items.splice(idx,1);
        group.items.push(rapor);
      }
      return true;
    }catch(err){
      console.warn('Academic sidebar order gagal',err);
      return false;
    }
  }

  function install(){
    fixAcademicOrder();
    if(typeof renderSidebar==='function'&&!renderSidebar.__cqlassRaporLast){
      const original=renderSidebar;
      const wrapped=function(){
        fixAcademicOrder();
        return original.apply(this,arguments);
      };
      wrapped.__cqlassRaporLast=true;
      renderSidebar=wrapped;
    }
    try{
      if(typeof currentUser!=='undefined'&&currentUser&&typeof renderSidebar==='function') renderSidebar();
    }catch(_){}
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',install);
  else install();
})();
