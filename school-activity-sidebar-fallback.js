/* CQlass — fallback menu Rapor Kegiatan untuk Walas + akun Pramuka */
(function(){
  'use strict';
  if(window.__cqSchoolActivitySidebarFallback)return;
  const SPECIAL=['luthfi','aryobimo'];
  function user(){try{return currentUser||null}catch(_){return null}}
  function openReport(btn){
    try{if(typeof activeModule!=='undefined')activeModule='rapor-kegiatan'}catch(_){}
    document.querySelectorAll('#sidebar .nav-item').forEach(x=>x.classList.remove('active'));
    btn?.classList.add('active');
    const c=document.getElementById('content');
    if(c&&typeof window.renderSchoolActivityReport==='function')window.renderSchoolActivityReport(c);
    else if(c)c.innerHTML='<div class="kv2"><div class="kv2-card"><span class="spinner"></span> Memuat Rapor Kegiatan...</div></div>';
  }
  function makeItem(){const d=document.createElement('div');d.className='nav-item nav-item-sub';d.dataset.sarMenu='1';d.innerHTML='<span>Rapor Kegiatan</span>';d.onclick=()=>openReport(d);return d}
  function inject(){
    const u=user(),sb=document.getElementById('sidebar');if(!u||!sb)return;
    const role=String(u.role||'').toLowerCase(),username=String(u.username||'').toLowerCase();
    if(role!=='walas'&&!SPECIAL.includes(username))return;
    if(sb.querySelector('[data-sar-menu="1"]')||[...sb.querySelectorAll('.nav-item')].some(x=>String(x.textContent||'').trim()==='Rapor Kegiatan'))return;
    const heads=[...sb.querySelectorAll('.nav-group-head')];
    const academic=heads.find(h=>String(h.querySelector('span')?.textContent||h.textContent||'').trim()==='Akademik');
    if(academic){
      const sub=academic.nextElementSibling;
      if(sub&&sub.classList.contains('nav-group-items')){
        const item=makeItem();const cetak=[...sub.querySelectorAll('.nav-item')].find(x=>String(x.textContent||'').trim()==='Cetak Rapor');
        if(cetak)sub.insertBefore(item,cetak);else sub.appendChild(item);return;
      }
      // Grup masih tertutup; saat dibuka renderSidebar akan memicu observer dan injeksi ulang.
      return;
    }
    if(SPECIAL.includes(username)){
      const head=document.createElement('div');head.className='nav-group-head open';head.dataset.sarGroup='1';head.innerHTML='<span>Akademik</span><svg class="nav-chevron" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>';
      const sub=document.createElement('div');sub.className='nav-group-items';sub.dataset.sarGroupItems='1';sub.appendChild(makeItem());
      head.onclick=function(){const open=head.classList.toggle('open');sub.style.display=open?'':'none'};
      sb.appendChild(head);sb.appendChild(sub);
    }
  }
  const obs=new MutationObserver(()=>setTimeout(inject,0));
  document.addEventListener('DOMContentLoaded',()=>{const sb=document.getElementById('sidebar');if(sb)obs.observe(sb,{childList:true,subtree:true});setTimeout(inject,100)});
  if(document.readyState!=='loading'){const sb=document.getElementById('sidebar');if(sb)obs.observe(sb,{childList:true,subtree:true});setTimeout(inject,100)}
  setInterval(inject,1200);
  window.__cqSchoolActivitySidebarFallback=true;
})();