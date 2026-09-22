/* CQlass — final cleanup + single Kesiswaan navigation */
(function(){
  'use strict';
  if(window.__cqKesiswaanFinalCleanupV3)return;
  window.__cqKesiswaanFinalCleanupV3=true;

  const REMOVE=new Set([
    'laporan-unduh',
    'sac-pembinaan','sac-kasus','sac-kedisiplinan','sac-perizinan','sac-kesehatan','sac-komunikasi_orangtua','sac-catatan_siswa'
  ]);
  const POINT_IDS=new Set(['kedisiplinan','reward']);
  const CENTER_ID='kesiswaan-center';
  const CENTER_ROLES=['guru','walas','kesiswaan','tahfizh','pimpinan'];

  function role(){
    try{return String(currentUser?.role||currentUser?.primary_role||currentUser?.role_code||'').toLowerCase()}
    catch(_){return''}
  }

  function injectCss(){
    if(document.getElementById('cq-kesiswaan-center-css'))return;
    const s=document.createElement('style');
    s.id='cq-kesiswaan-center-css';
    s.textContent=`
      .cq-kesiswaan-center{max-width:980px;margin:0 auto;color:#17324d}
      .cq-kesiswaan-center h1{margin:0 0 6px;font-size:25px}
      .cq-kesiswaan-center .sub{margin:0 0 18px;color:#687b8e;font-size:13px}
      .cq-kesiswaan-choice-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
      .cq-kesiswaan-choice{appearance:none;text-align:left;border:1px solid #dce6f0;background:#fff;border-radius:16px;padding:18px;cursor:pointer;box-shadow:0 4px 16px rgba(23,50,77,.06);transition:.16s ease;color:#17324d}
      .cq-kesiswaan-choice:hover{transform:translateY(-1px);border-color:#9eb8cf;box-shadow:0 7px 22px rgba(23,50,77,.10)}
      .cq-kesiswaan-choice b{display:block;font-size:18px;margin-bottom:6px}
      .cq-kesiswaan-choice span{display:block;color:#687b8e;font-size:12px;line-height:1.55}
      .cq-kesiswaan-choice .go{margin-top:14px;font-weight:800;color:#0a6e6e}
      @media(max-width:680px){.cq-kesiswaan-choice-grid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(s);
  }

  function openPoint(kind,content){
    const host=content||document.getElementById('content');
    if(!host)return;
    try{
      if(kind==='reward'&&typeof renderReward==='function')return renderReward(host);
      if(kind==='kedisiplinan'&&typeof renderKedisiplinan==='function')return renderKedisiplinan(host);
      host.innerHTML='<div class="card"><div class="page-title">Kesiswaan</div><div class="page-sub">Modul belum siap dimuat. Silakan muat ulang halaman.</div></div>';
    }catch(e){
      host.innerHTML='<div class="card"><div class="page-title">Kesiswaan</div><div class="page-sub">Modul belum dapat dimuat.</div></div>';
      console.warn('Kesiswaan center:',e);
    }
  }

  function renderCenter(content){
    injectCss();
    content.innerHTML=`
      <div class="cq-kesiswaan-center">
        <h1>Kesiswaan</h1>
        <p class="sub">Pilih data yang akan dicatat. Reward dan Kedisiplinan tidak lagi tampil sebagai menu terpisah di sidebar.</p>
        <div class="cq-kesiswaan-choice-grid">
          <button type="button" class="cq-kesiswaan-choice" id="cq-kesiswaan-reward">
            <b>Reward</b>
            <span>Catat dan kelola reward siswa dari satu pintu Kesiswaan.</span>
            <span class="go">Buka Reward →</span>
          </button>
          <button type="button" class="cq-kesiswaan-choice" id="cq-kesiswaan-discipline">
            <b>Kedisiplinan</b>
            <span>Catat kedisiplinan per siswa atau berdasarkan jenis pelanggaran.</span>
            <span class="go">Buka Kedisiplinan →</span>
          </button>
        </div>
      </div>`;
    document.getElementById('cq-kesiswaan-reward')?.addEventListener('click',()=>openPoint('reward',content));
    document.getElementById('cq-kesiswaan-discipline')?.addEventListener('click',()=>openPoint('kedisiplinan',content));
  }

  function consolidateModel(){
    try{
      if(typeof MODULE_GROUPS==='undefined'||!Array.isArray(MODULE_GROUPS))return false;

      for(const g of MODULE_GROUPS){
        if(!g||!Array.isArray(g.items))continue;
        g.items=g.items.filter(it=>{
          const id=String(it?.id||'');
          return !REMOVE.has(id)&&!POINT_IDS.has(id);
        });
      }

      /* Kabid Kesiswaan tidak lagi memakai grup lama Kesiswaan yang berisi
         menu Reward/Kedisiplinan terpisah. Pusatnya berada di grup Laporan. */
      const oldGroup=MODULE_GROUPS.find(g=>g&&g.id==='kesiswaan');
      if(oldGroup&&Array.isArray(oldGroup.roles)){
        oldGroup.roles=oldGroup.roles.filter(r=>String(r).toLowerCase()!=='kesiswaan');
      }

      let report=MODULE_GROUPS.find(g=>g&&g.id==='laporan');
      if(!report){
        report={id:'laporan',label:'Laporan',roles:[],items:[]};
        MODULE_GROUPS.push(report);
      }
      if(!Array.isArray(report.items))report.items=[];
      report.roles=[...new Set([...(report.roles||[]),...CENTER_ROLES])];

      const center={id:CENTER_ID,label:'Kesiswaan',roles:CENTER_ROLES,built:true,render:renderCenter};
      const existing=report.items.find(x=>x&&x.id===CENTER_ID);
      if(existing)Object.assign(existing,center);
      else report.items.unshift(center);
      return true;
    }catch(e){
      console.warn('Kesiswaan final cleanup:',e);
      return false;
    }
  }

  function patchSidebar(){
    if(typeof renderSidebar!=='function'||renderSidebar.__cqKesiswaanSingleNavV3)return;
    const original=renderSidebar;
    const wrapped=function(){
      consolidateModel();
      return original.apply(this,arguments);
    };
    wrapped.__cqKesiswaanSingleNavV3=true;
    renderSidebar=wrapped;
  }

  function patchRoute(){
    if(typeof setActiveModule!=='function'||setActiveModule.__cqKesiswaanSingleNavV3)return;
    const original=setActiveModule;
    const wrapped=function(id){
      const target=(role()==='kesiswaan'&&POINT_IDS.has(String(id||'')))?CENTER_ID:id;
      return original.call(this,target);
    };
    wrapped.__cqKesiswaanSingleNavV3=true;
    setActiveModule=wrapped;
  }

  function apply(){
    const ok=consolidateModel();
    patchSidebar();
    patchRoute();
    if(ok&&typeof renderSidebar==='function')renderSidebar();
    try{
      if(role()==='kesiswaan'&&typeof activeModule!=='undefined'&&POINT_IDS.has(String(activeModule||''))&&typeof setActiveModule==='function'){
        setTimeout(()=>setActiveModule(CENTER_ID),0);
      }
    }catch(_){ }
    return ok;
  }

  window.renderKesiswaanCenter=renderCenter;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(apply,250));
  else setTimeout(apply,250);
  setTimeout(apply,900);
  setTimeout(apply,2200);
})();
