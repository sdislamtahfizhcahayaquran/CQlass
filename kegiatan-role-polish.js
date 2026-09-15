/* CQlass — Kabid Kegiatan UI polish
   Menjaga menu dan istilah Kabid Kegiatan tetap ringkas tanpa mengubah hak akses/data. */
(function(){
  'use strict';
  if(window.__cqKegiatanRolePolishV1) return;
  window.__cqKegiatanRolePolishV1=true;

  function getUser(){
    try{if(typeof currentUser!=='undefined'&&currentUser)return currentUser;}catch(_){ }
    try{return JSON.parse(localStorage.getItem('cqlass_user')||'null')||{};}catch(_){return{};}
  }
  function isKegiatan(){return String(getUser()?.role||'').toLowerCase()==='kegiatan';}

  function injectStyle(){
    if(document.getElementById('cq-kegiatan-polish-style'))return;
    const s=document.createElement('style');
    s.id='cq-kegiatan-polish-style';
    s.textContent=`
      body.cq-role-kegiatan #content{padding-top:28px}
      body.cq-role-kegiatan .kv2{max-width:1240px}
      body.cq-role-kegiatan .kv2-head{margin-bottom:13px}
      body.cq-role-kegiatan .kv2-head h2{letter-spacing:-.025em}
      body.cq-role-kegiatan .kv2-kpis{gap:9px;margin-bottom:12px}
      body.cq-role-kegiatan .kv2-kpi{padding:13px;border-radius:13px}
      body.cq-role-kegiatan .kv2-card{border-radius:14px}
      body.cq-role-kegiatan #sidebar .nav-item,
      body.cq-role-kegiatan #sidebar button{transition:background .15s ease,color .15s ease,border-color .15s ease}
      @media(max-width:760px){body.cq-role-kegiatan #content{padding-top:18px}}
    `;
    document.head.appendChild(s);
  }

  function polishModel(){
    if(!isKegiatan())return;
    try{
      if(typeof MODULE_GROUPS==='undefined'||!Array.isArray(MODULE_GROUPS))return;
      for(const group of MODULE_GROUPS){
        if(group?.id==='kegiatan-v2'||String(group?.label||'').toLowerCase()==='kegiatan'){
          group.label='Kegiatan';
          for(const item of (group.items||[])){
            if(item?.id==='kegiatan-rinci')item.label='Laporan Kegiatan';
            if(item?.id==='kegiatan-ekskul')item.label='Data Ekskul';
          }
        }
      }
    }catch(e){console.warn('Kegiatan polish model:',e);}
  }

  function replaceExactText(root,from,to){
    if(!root)return;
    root.querySelectorAll('button,a,.nav-item,.menu-item,h1,h2,h3,.page-title,.kv2-title').forEach(el=>{
      if(String(el.textContent||'').trim()===from)el.textContent=to;
    });
  }

  function polishDom(){
    if(!isKegiatan())return;
    injectStyle();
    document.body.classList.add('cq-role-kegiatan');
    const sidebar=document.getElementById('sidebar');
    const content=document.getElementById('content');
    replaceExactText(sidebar,'Laporan Rinci','Laporan Kegiatan');
    replaceExactText(content,'Laporan Rinci Kegiatan','Laporan Kegiatan');
    replaceExactText(content,'Laporan Rinci','Laporan Kegiatan');

    if(content){
      content.querySelectorAll('.kv2-head p').forEach(p=>{
        if(/satu kegiatan hanya memiliki satu record/i.test(p.textContent||'')){
          p.textContent='Pantau agenda, realisasi, dokumentasi, dan tindak lanjut kegiatan dalam satu data yang sama.';
        }
      });
      content.querySelectorAll('.kv2-btn').forEach(btn=>{
        if(String(btn.textContent||'').trim()==='Laporan Rinci')btn.textContent='Laporan Kegiatan';
      });
    }
  }

  function patchSidebar(){
    if(typeof renderSidebar!=='function'||renderSidebar.__cqKegiatanPolish)return;
    const original=renderSidebar;
    const wrapped=function(){
      polishModel();
      const out=original.apply(this,arguments);
      setTimeout(polishDom,0);
      return out;
    };
    wrapped.__cqKegiatanPolish=true;
    renderSidebar=wrapped;
  }

  function sync(){
    if(!isKegiatan()){
      document.body.classList.remove('cq-role-kegiatan');
      return;
    }
    polishModel();patchSidebar();polishDom();
  }

  const observer=new MutationObserver(()=>{if(isKegiatan())requestAnimationFrame(polishDom);});
  document.addEventListener('DOMContentLoaded',()=>{
    observer.observe(document.documentElement,{childList:true,subtree:true});
    setTimeout(sync,80);
    setTimeout(sync,450);
    setTimeout(sync,1200);
  },{once:true});
  window.addEventListener('load',()=>setTimeout(sync,120),{once:true});
  setInterval(()=>{if(isKegiatan())sync();},1500);
  setTimeout(sync,60);
})();
