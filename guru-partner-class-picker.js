/* CQlass — Guru Partner: penegasan pemilih kelas input Tahfizh */
(function(){
  function apply(){
    const sel=document.getElementById('gp-class');
    if(!sel)return;
    const field=sel.closest('.gp-field');
    const label=field?.querySelector('label');
    if(label) label.textContent='Pilih Kelas Input';
    sel.setAttribute('aria-label','Pilih Kelas Input Tahfizh');
    [...sel.options].forEach(o=>{
      const raw=String(o.textContent||'').trim();
      const cls=raw.split('·')[0].trim();
      if(cls) o.textContent=cls;
    });
  }
  new MutationObserver(apply).observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener('DOMContentLoaded',apply);
  window.addEventListener('load',apply);
})();
