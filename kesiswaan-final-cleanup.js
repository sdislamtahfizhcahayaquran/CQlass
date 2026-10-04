/* CQlass — Kabid Kesiswaan: isolated final sidebar + route registry */
(function(){
  'use strict';
  if(window.__cqKesiswaanFinalSidebarV7)return;
  window.__cqKesiswaanFinalSidebarV7=true;
  const norm=v=>String(v||'').trim().toLowerCase().replace(/\s+/g,' ');
  function role(){
    try{return norm(currentUser?.role||currentUser?.primary_role||currentUser?.role_code).replace(/[ -]+/g,'_')}
    catch(_){try{return norm(JSON.parse(localStorage.getItem('cqlass_user')||'{}').role).replace(/[ -]+/g,'_')}catch(_2){return''}}
  }
  const KESISWAAN_ROUTE_RENDERERS={
    'kes-laporan-masuk':c=>window.renderStudentAffairsCases?.(c),
    'kes-pendampingan':c=>window.renderStudentAffairsCases?.(c),
    'kes-muhadhoroh':c=>window.renderStudentAffairsType?.(c,'muhadhoroh'),
    'kes-prestasi':c=>window.renderStudentAffairsType?.(c,'prestasi'),
    'kes-kebutuhan':c=>window.renderStudentAffairsType?.(c,'dukungan'),
    'kes-program':c=>window.renderStudentAffairsType?.(c,'kegiatan'),
    'salam-cq-rekap':c=>window.renderKesiswaanSalamRekap?.(c),
    'uks-duty-inbox':c=>window.renderUksKesiswaanInbox?.(c),
    'rekap-input-poin':c=>window.renderPointInputAudit?.(c),
    'laporan-kesiswaan-super':c=>window.renderKesiswaanSuperReport?.(c),
    'kesiswaan-rekapan':c=>window.renderKesiswaanRekapan?.(c)
  };

  function renderKesiswaanSidebarOnly(){
    if(role()!=='kesiswaan')return false;
    const sidebar=document.getElementById('sidebar');if(!sidebar)return true;
    sidebar.innerHTML='';
    const direct=(id,label)=>{
      const el=document.createElement('div');
      el.className='nav-item'+((typeof activeModule!=='undefined'&&activeModule===id)?' active':'');
      el.innerHTML='<span>'+label+'</span>';
      el.onclick=()=>{if(typeof setActiveModule==='function')setActiveModule(id)};
      sidebar.appendChild(el);
    };
    direct('dashboard','Dashboard');
    const groups=[
      {id:'kes-layanan',label:'Layanan',items:[
        ['kesiswaan-input','Layanan Kesiswaan'],
        ['kes-laporan-masuk','Laporan Masuk'],
        ['kes-pendampingan','Pendampingan Siswa'],
        ['salam-cq-rekap','Salam CQ'],
        ['kes-muhadhoroh','Muhadhoroh'],
        ['kes-prestasi','Prestasi Siswa'],
        ['kes-kebutuhan','Kebutuhan Siswa'],
        ['kes-program','Program Kesiswaan / SPARQ'],
        ['uks-duty-inbox','Monitoring UKS'],
        ['rekap-input-poin','Monitoring Input']
      ]},
      {id:'kes-laporan',label:'Laporan',items:[
        ['laporan-kesiswaan-super','Laporan Pendampingan Siswa'],
        ['salam-cq-rekap','Laporan Salam CQ'],
        ['kes-muhadhoroh','Laporan Muhadhoroh'],
        ['kes-prestasi','Laporan Prestasi'],
        ['kes-program','Laporan Program Kesiswaan / SPARQ'],
        ['uks-duty-inbox','Laporan UKS'],
        ['laporan-kesiswaan-super','Laporan Kedisiplinan & Apresiasi'],
        ['laporan-promosi','Promosi Socmed']
      ]},
      {id:'kes-rekap',label:'Rekap',items:[
        ['kesiswaan-rekapan','Rekap Per Kelas'],
        ['kesiswaan-rekapan','Rekap Per Siswa'],
        ['kesiswaan-rekapan','Rekap Kehadiran'],
        ['kesiswaan-rekapan','Rekap Kedisiplinan'],
        ['kesiswaan-rekapan','Rekap Apresiasi'],
        ['laporan-kesiswaan-super','Rekap Pendampingan'],
        ['laporan-kesiswaan-super','Rekap Prestasi'],
        ['kesiswaan-rekapan','Rekap UKS']
      ]}
    ];
    groups.forEach(g=>{
      const active=g.items.some(x=>x[0]===activeModule);
      const isOpen=openGroupId===g.id||active;
      const head=document.createElement('div');
      head.className='nav-group-head'+(isOpen?' open':'');
      head.innerHTML='<span>'+g.label+'</span><svg class="nav-chevron" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>';
      head.onclick=()=>{openGroupId=openGroupId===g.id?null:g.id;renderKesiswaanSidebarOnly()};
      sidebar.appendChild(head);
      if(!isOpen)return;
      const sub=document.createElement('div');sub.className='nav-group-items';
      g.items.forEach(([id,label])=>{
        const el=document.createElement('div');
        el.className='nav-item nav-item-sub'+(activeModule===id?' active':'');
        el.innerHTML='<span>'+label+'</span>';
        el.onclick=()=>{openGroupId=g.id;if(typeof setActiveModule==='function')setActiveModule(id)};
        sub.appendChild(el);
      });
      sidebar.appendChild(sub);
    });
    return true;
  }

  function patchSidebar(){
    if(typeof renderSidebar!=='function'||renderSidebar.__cqKesiswaanSingleNavV5)return;
    const original=renderSidebar;
    const wrapped=function(){
      if(role()==='kesiswaan'){
        consolidateModel();
        enforceKesiswaanFourMenuModel();
        return renderKesiswaanSidebarOnly();
      }
      return original.apply(this,arguments);
    };
    wrapped.__cqKesiswaanSingleNavV5=true;
    renderSidebar=wrapped;
  }

  function patchRoute(){
    if(typeof setActiveModule!=='function'||setActiveModule.__cqKesiswaanSidebarRoutesV6)return;
    const original=setActiveModule;
    const wrapped=function(id){
      const r=role(),key=String(id||'');
      if(r==='kesiswaan'&&KESISWAAN_ROUTE_RENDERERS[key]){
        activeModule=key;
        renderKesiswaanSidebarOnly();
        const content=document.getElementById('content');
        const fn=KESISWAAN_ROUTE_RENDERERS[key];
        if(content&&fn){
          const out=fn(content);
          if(out===undefined&&content.innerHTML.trim()==='')content.innerHTML='<div class="card">Modul Kesiswaan sedang dimuat. Silakan coba lagi.</div>';
        }
        return;
      }
      return original.apply(this,arguments);
    };
    wrapped.__cqKesiswaanSidebarRoutesV6=true;
    setActiveModule=wrapped;
  }

  function apply(){
    if(role()!=='kesiswaan')return;
    patchSidebar();
    patchRoute();
    renderKesiswaanSidebarOnly();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(apply,40),{once:true});else setTimeout(apply,40);
  window.addEventListener('load',()=>setTimeout(apply,0),{once:true});
  setTimeout(apply,500);

  const attachObserver=()=>{
    const sb=document.getElementById('sidebar');if(!sb||sb.__cqKesiswaanFinalObserverV5)return;
    sb.__cqKesiswaanFinalObserverV5=true;
    new MutationObserver(()=>{cleanSidebarDom();cleanKesiswaanQuickAccess()}).observe(sb,{childList:true,subtree:true});
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',attachObserver,{once:true});else attachObserver();
})();
