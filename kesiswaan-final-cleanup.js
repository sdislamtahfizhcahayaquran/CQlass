/* CQlass — single Kesiswaan navigation, final deterministic cleanup */
(function(){
  'use strict';
  if(window.__cqKesiswaanFinalCleanupV5)return;
  window.__cqKesiswaanFinalCleanupV5=true;

  const REMOVE=new Set([
    'laporan-unduh',
    'sac-pembinaan','sac-kasus','sac-kedisiplinan','sac-perizinan','sac-kesehatan','sac-komunikasi_orangtua','sac-catatan_siswa'
  ]);
  const POINT_IDS=new Set(['kedisiplinan','reward']);
  const POINT_LABELS=new Set(['kedisiplinan','reward','reward siswa']);
  const CENTER_ID='kesiswaan-center';
  const CENTER_GROUP_ID='kesiswaan-input-center';
  const CENTER_ROLES=[]; // Walas/Guru sidebar is authoritative in teacher-walas-sidebar-clean.js

  const norm=v=>String(v||'').trim().toLowerCase().replace(/\s+/g,' ');
  function role(){
    try{return norm(currentUser?.role||currentUser?.primary_role||currentUser?.role_code).replace(/[ -]+/g,'_')}
    catch(_){try{return norm(JSON.parse(localStorage.getItem('cqlass_user')||'{}').role).replace(/[ -]+/g,'_')}catch(_2){return''}}
  }
  function usesDedicatedKesiswaan(r=role()){
    return r==='partner'||r==='tahfizh'||r==='kabid_tahfizh'||(r.includes('kabid')&&(r.includes('tahfizh')||r.includes('quran')));
  }

  function injectCss(){
    if(document.getElementById('cq-kesiswaan-center-css'))return;
    const s=document.createElement('style');s.id='cq-kesiswaan-center-css';s.textContent=`
      .cq-kesiswaan-center{max-width:980px;margin:0 auto;color:#17324d}
      .cq-kesiswaan-center h1{margin:0 0 6px;font-size:25px}.cq-kesiswaan-center .sub{margin:0 0 18px;color:#687b8e;font-size:13px}
      .cq-kesiswaan-choice-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
      .cq-kesiswaan-choice{appearance:none;text-align:left;border:1px solid #dce6f0;background:#fff;border-radius:16px;padding:18px;cursor:pointer;box-shadow:0 4px 16px rgba(23,50,77,.06);transition:.16s ease;color:#17324d}
      .cq-kesiswaan-choice:hover{transform:translateY(-1px);border-color:#9eb8cf;box-shadow:0 7px 22px rgba(23,50,77,.10)}
      .cq-kesiswaan-choice b{display:block;font-size:18px;margin-bottom:6px}.cq-kesiswaan-choice span{display:block;color:#687b8e;font-size:12px;line-height:1.55}.cq-kesiswaan-choice .go{margin-top:14px;font-weight:800;color:#0a6e6e}
      @media(max-width:680px){.cq-kesiswaan-choice-grid{grid-template-columns:1fr}}
    `;document.head.appendChild(s);
  }

  function openPoint(kind,content){
    const host=content||document.getElementById('content');if(!host)return;
    try{
      if(kind==='reward'&&typeof renderReward==='function')return renderReward(host);
      if(kind==='kedisiplinan'&&typeof renderKedisiplinan==='function')return renderKedisiplinan(host);
      host.innerHTML='<div class="card"><div class="page-title">Kesiswaan</div><div class="page-sub">Modul belum siap dimuat. Silakan muat ulang halaman.</div></div>';
    }catch(e){
      console.warn('Kesiswaan center:',e);
      host.innerHTML='<div class="card"><div class="page-title">Kesiswaan</div><div class="page-sub">Modul belum dapat dimuat.</div></div>';
    }
  }

  function renderCenter(content){
    injectCss();
    content.innerHTML=`<div class="cq-kesiswaan-center"><h1>Kesiswaan</h1><p class="sub">Reward dan Kedisiplinan berada dalam satu menu Kesiswaan.</p><div class="cq-kesiswaan-choice-grid"><button type="button" class="cq-kesiswaan-choice" id="cq-kesiswaan-reward"><b>Reward</b><span>Catat dan kelola reward siswa.</span><span class="go">Buka Reward →</span></button><button type="button" class="cq-kesiswaan-choice" id="cq-kesiswaan-discipline"><b>Kedisiplinan</b><span>Catat kedisiplinan per siswa atau berdasarkan jenis pelanggaran.</span><span class="go">Buka Kedisiplinan →</span></button></div></div>`;
    document.getElementById('cq-kesiswaan-reward')?.addEventListener('click',()=>openPoint('reward',content));
    document.getElementById('cq-kesiswaan-discipline')?.addEventListener('click',()=>openPoint('kedisiplinan',content));
  }

  function consolidateModel(){
    try{
      const r=role();
      if(usesDedicatedKesiswaan(r))return false;
      if(typeof MODULE_GROUPS==='undefined'||!Array.isArray(MODULE_GROUPS))return false;

      // Walas/Guru memakai SATU grup Kesiswaan bawaan. Jangan membuat grup Kesiswaan kedua.
      const oldGroup=MODULE_GROUPS.find(g=>g&&norm(g.id)==='kesiswaan');
      if(!oldGroup)return false;
      oldGroup.roles=[...new Set([...(oldGroup.roles||[]),...CENTER_ROLES])];
      const base=Array.isArray(oldGroup.items)?oldGroup.items:[];
      const absensi=base.find(x=>x&&x.id==='absensi');
      const masalah=base.find(x=>x&&x.id==='masalah');
      const items=[];
      if(absensi)items.push({...absensi,roles:[...new Set([...(absensi.roles||[]),...CENTER_ROLES])]});
      items.push(
        {id:'kedisiplinan',label:'Kedisiplinan',roles:[...CENTER_ROLES],built:true,render:c=>openPoint('kedisiplinan',c)},
        {id:'reward',label:'Reward',roles:[...CENTER_ROLES],built:true,render:c=>openPoint('reward',c)}
      );
      if(masalah)items.push({...masalah,roles:[...new Set([...(masalah.roles||[]),...CENTER_ROLES])]});
      oldGroup.items=items;

      // Hapus patch/grup Kesiswaan lama yang sempat dibuat terpisah.
      for(let i=MODULE_GROUPS.length-1;i>=0;i--){
        const g=MODULE_GROUPS[i];
        if(!g)continue;
        if(g.id===CENTER_GROUP_ID){MODULE_GROUPS.splice(i,1);continue}
        if(Array.isArray(g.items))g.items=g.items.filter(x=>x&&x.id!==CENTER_ID);
      }

      // Untuk Walas/Guru, Laporan hanya Timesheet, Promosi Socmed, Saran & Masukan.
      const report=MODULE_GROUPS.find(g=>g&&norm(g.id)==='laporan');
      if(report&&Array.isArray(report.items)){
        const keep=new Set(['timesheet','laporan-promosi','internal-feedback']);
        for(const it of report.items){
          if(!it||!Array.isArray(it.roles))continue;
          if(!keep.has(String(it.id||'')))it.roles=it.roles.filter(x=>!CENTER_ROLES.includes(norm(x)));
        }
        const order=['timesheet','laporan-promosi','internal-feedback'];
        report.items.sort((a,b)=>{const ai=order.indexOf(String(a?.id||'')),bi=order.indexOf(String(b?.id||''));return(ai<0?99:ai)-(bi<0?99:bi)});
      }
      return true;
    }catch(e){console.warn('Kesiswaan final cleanup:',e);return false}
  }

  function cleanSidebarDom(){
    const r=role();
    if(usesDedicatedKesiswaan(r)||!CENTER_ROLES.includes(r))return;
    const sb=document.getElementById('sidebar');if(!sb)return;
    const heads=[...sb.querySelectorAll('.nav-group-head')];
    let seenK=false;
    for(const head of heads){
      const label=norm(head.querySelector('span')?.textContent||head.textContent);
      const body=head.nextElementSibling;
      if(label==='kesiswaan'){
        if(seenK){if(body?.classList?.contains('nav-group-items'))body.remove();head.remove();continue}
        seenK=true;
      }
      if(label==='laporan'&&body?.classList?.contains('nav-group-items')){
        [...body.querySelectorAll('.nav-item')].forEach(el=>{
          const txt=norm(el.textContent);
          if(txt==='absensi (morning talk)'||txt==='absensi'||txt==='kesiswaan'||txt==='kedisiplinan'||txt==='reward'||txt==='reward siswa'||txt==='masalah siswa')el.remove();
        });
      }
    }
  }

  function patchSidebar(){
    if(typeof renderSidebar!=='function'||renderSidebar.__cqKesiswaanSingleNavV5)return;
    const original=renderSidebar;
    const wrapped=function(){
      consolidateModel();
      const out=original.apply(this,arguments);
      requestAnimationFrame(cleanSidebarDom);
      return out;
    };
    wrapped.__cqKesiswaanSingleNavV5=true;
    renderSidebar=wrapped;
  }

  function patchRoute(){
    if(typeof setActiveModule!=='function'||setActiveModule.__cqKesiswaanSingleNavV5)return;
    const original=setActiveModule;
    const wrapped=function(id){
      const key=norm(id),r=role();
      if(!usesDedicatedKesiswaan(r)&&CENTER_ROLES.includes(r)&&key===CENTER_ID)return original.call(this,'kedisiplinan');
      return original.apply(this,arguments);
    };
    wrapped.__cqKesiswaanSingleNavV5=true;
    setActiveModule=wrapped;
  }

  function apply(){
    const ok=consolidateModel();patchSidebar();patchRoute();
    if(ok&&typeof renderSidebar==='function')renderSidebar();
    try{
      const r=role(),key=norm(typeof activeModule!=='undefined'?activeModule:'');
      if(!usesDedicatedKesiswaan(r)&&CENTER_ROLES.includes(r)&&key===CENTER_ID&&typeof setActiveModule==='function')setActiveModule('kedisiplinan');
    }catch(_){ }
    cleanSidebarDom();
  }

  window.renderKesiswaanCenter=renderCenter;
  patchSidebar();patchRoute();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(apply,40),{once:true});else setTimeout(apply,40);
  window.addEventListener('load',()=>setTimeout(apply,0),{once:true});
  setTimeout(apply,500);

  const attachObserver=()=>{
    const sb=document.getElementById('sidebar');if(!sb||sb.__cqKesiswaanFinalObserverV5)return;
    sb.__cqKesiswaanFinalObserverV5=true;
    new MutationObserver(()=>cleanSidebarDom()).observe(sb,{childList:true,subtree:true});
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',attachObserver,{once:true});else attachObserver();
})();
