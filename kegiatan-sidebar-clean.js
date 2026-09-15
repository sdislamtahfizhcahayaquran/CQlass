/* CQlass — clean sidebar khusus Kabid Kegiatan
   - Hilangkan heading/grup KESISWAAN dari role Kegiatan.
   - Pertahankan akses lintas-role Kedisiplinan & Reward melalui grup netral "Pencatatan Siswa".
   - Tidak mengubah permission/backend; hanya penempatan navigasi di sidebar.
*/
(function(){
  'use strict';
  if(window.__cqKegiatanSidebarClean) return;
  window.__cqKegiatanSidebarClean=true;

  function role(){
    try{return String(currentUser?.role||'').toLowerCase()}catch(_){return ''}
  }
  function isKegiatan(){return role()==='kegiatan'}
  function sidebar(){return document.getElementById('sidebar')}
  function text(el){return String(el?.textContent||'').trim()}

  function moduleButton(label,id){
    const b=document.createElement('button');
    b.type='button';
    b.className='nav-item cq-kegiatan-cross-nav';
    b.dataset.module=id;
    b.textContent=label;
    b.addEventListener('click',function(){
      try{if(typeof setActiveModule==='function')setActiveModule(id)}catch(e){console.warn('Navigasi '+id+' gagal',e)}
    });
    return b;
  }

  function findGroupContainer(header){
    if(!header)return null;
    let n=header;
    for(let i=0;i<5&&n&&n.parentElement;i++,n=n.parentElement){
      const p=n.parentElement;
      const t=text(p).toUpperCase();
      const directHeaders=[...p.children].filter(x=>/KESISWAAN|KEGIATAN|LAPORAN|INFO|AKADEMIK|TAHFIZH/.test(text(x).toUpperCase()));
      if(directHeaders.length||p.querySelector?.('.nav-item,.sidebar-item,.menu-item,button')) return p;
    }
    return header.parentElement;
  }

  function hideKesiswaanGroup(sb){
    const candidates=[...sb.querySelectorAll('*')].filter(el=>text(el).toUpperCase()==='KESISWAAN');
    candidates.forEach(h=>{
      let group=h.closest('.nav-group,.sidebar-group,.menu-group,.sidebar-section');
      if(!group)group=findGroupContainer(h);
      if(group&&group!==sb){
        group.style.setProperty('display','none','important');
        group.dataset.cqHiddenForKegiatan='1';
      }else{
        h.style.setProperty('display','none','important');
      }
    });
  }

  function ensureCrossRoleGroup(sb){
    if(sb.querySelector('#cq-kegiatan-pencatatan')) return;

    const wrap=document.createElement('div');
    wrap.id='cq-kegiatan-pencatatan';
    wrap.className='nav-group cq-kegiatan-pencatatan';
    wrap.innerHTML='<div class="nav-group-title cq-kegiatan-pencatatan-title">PENCATATAN SISWA</div><div class="cq-kegiatan-pencatatan-items"></div>';
    const items=wrap.querySelector('.cq-kegiatan-pencatatan-items');
    items.appendChild(moduleButton('Kedisiplinan','kedisiplinan'));
    items.appendChild(moduleButton('Reward Siswa','reward'));

    const kegiatanHeader=[...sb.querySelectorAll('*')].find(el=>text(el).toUpperCase()==='KEGIATAN');
    let kegiatanGroup=kegiatanHeader?.closest('.nav-group,.sidebar-group,.menu-group,.sidebar-section');
    if(!kegiatanGroup&&kegiatanHeader)kegiatanGroup=findGroupContainer(kegiatanHeader);
    if(kegiatanGroup&&kegiatanGroup.parentElement===sb) sb.insertBefore(wrap,kegiatanGroup);
    else sb.appendChild(wrap);
  }

  function injectStyle(){
    if(document.getElementById('cq-kegiatan-sidebar-clean-style'))return;
    const s=document.createElement('style');
    s.id='cq-kegiatan-sidebar-clean-style';
    s.textContent=`
      #sidebar #cq-kegiatan-pencatatan{margin:14px 0 4px}
      #sidebar .cq-kegiatan-pencatatan-title{font-size:11px;font-weight:800;letter-spacing:.04em;color:var(--muted,#6f8583);padding:8px 12px 6px}
      #sidebar .cq-kegiatan-pencatatan-items{display:grid;gap:4px}
      #sidebar .cq-kegiatan-cross-nav{width:100%;text-align:left;border:0;background:transparent;cursor:pointer}
    `;
    document.head.appendChild(s);
  }

  function clean(){
    if(!isKegiatan())return;
    const sb=sidebar();if(!sb)return;
    injectStyle();
    hideKesiswaanGroup(sb);
    ensureCrossRoleGroup(sb);
  }

  let timer=0;
  function schedule(){clearTimeout(timer);timer=setTimeout(clean,20)}

  const obs=new MutationObserver(schedule);
  document.addEventListener('DOMContentLoaded',function(){
    const sb=sidebar();if(sb)obs.observe(sb,{childList:true,subtree:true});
    clean();
  },{once:true});
  window.addEventListener('load',function(){
    const sb=sidebar();if(sb&&!sb.dataset.cqKegiatanObserved){sb.dataset.cqKegiatanObserved='1';obs.observe(sb,{childList:true,subtree:true})}
    setTimeout(clean,80);
  },{once:true});

  document.addEventListener('click',function(){setTimeout(clean,30)},true);
  setInterval(function(){if(isKegiatan())clean()},800);
  setTimeout(clean,100);
})();
