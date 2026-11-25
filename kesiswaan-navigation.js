/* CQlass — Kabid Kesiswaan: canonical sidebar + route registry */
(function(){
  'use strict';
  if(window.__cqKesiswaanFinalSidebarV7)return;
  window.__cqKesiswaanFinalSidebarV7=true;
  const norm=v=>String(v||'').trim().toLowerCase().replace(/\s+/g,' ');
  function role(){
    let live='';
    try{live=currentUser?.role||currentUser?.primary_role||currentUser?.role_code||''}catch(_){}
    if(!live)try{const u=JSON.parse(localStorage.getItem('cqlass_user')||'{}');live=u.role||u.primary_role||u.role_code||''}catch(_){}
    return norm(live).replace(/[ -]+/g,'_');
  }
  const KESISWAAN_ROUTE_RENDERERS={
    'kes-laporan-masuk':c=>window.renderStudentAffairsCases?.(c),
    'kes-pendampingan':c=>window.renderStudentAffairsCases?.(c),
    'kes-masalah-kelas':c=>window.renderKesiswaanClassIssueInput?.(c),
    'kes-muhadhoroh':c=>window.renderStudentAffairsType?.(c,'muhadhoroh'),
    'kes-controlling-mt':c=>renderControllingMt(c),
    'kes-prestasi':c=>window.renderStudentAffairsType?.(c,'prestasi'),
    'kes-kebutuhan':c=>window.renderStudentAffairsType?.(c,'dukungan'),
    'kes-salam-cq':c=>window.renderSalamCQ?.(c),
    'kes-salam-rekap':c=>window.renderSalamCQRecap?.(c),
    'kes-perizinan':c=>window.renderStudentAffairsType?.(c,'perizinan'),
    'kes-program':c=>window.renderStudentAffairsType?.(c,'kegiatan'),
    'uks-duty-inbox':c=>window.renderUksKesiswaanInbox?.(c),
    'rekap-input-poin':c=>window.renderPointInputAudit?.(c),
    'kes-pemantauan-harian':c=>window.renderKesiswaanDailyMonitoring?.(c),
    'laporan-kesiswaan-super':c=>window.renderKesiswaanSuperReport?.(c),
    'kes-rekap-keterlambatan':c=>window.renderKesiswaanLateLetters?.(c),
    'kesiswaan-rekapan':c=>window.renderKesiswaanRekapan?.(c),
    'kes-rekap-masalah':c=>window.renderKesiswaanProblemRecap?.(c),
    'kes-laporan-kelas':c=>window.renderKesiswaanProblemRecap?.(c),
    'kes-cover-rapor':c=>window.renderKesiswaanCoverRapor?.(c),
    'kes-pengingat':c=>window.renderKesiswaanReminders?.(c)
  };

  function renderControllingMt(content){
    if(!content)return;
    content.innerHTML='<div class="card" style="max-width:1100px;margin:auto"><div style="font-size:12px;font-weight:800;color:#58718a;margin-bottom:6px">LAYANAN KESISWAAN</div><h1 style="margin:0 0 8px;font-size:24px">Controlling MT</h1><p style="margin:0 0 16px;color:#687b8e">Monitoring pelaksanaan Morning Talk oleh Kabid Kesiswaan. Target minimal 1 kali setiap pekan.</p><div style="padding:14px;border:1px solid #dce6f0;border-radius:12px;background:#f8fbfd"><strong>Standar controlling</strong><div style="margin-top:7px;color:#58718a;font-size:13px;line-height:1.6">Tanggal pelaksanaan · kelas · wali kelas/guru · status pelaksanaan MT · catatan/temuan · tindak lanjut · foto opsional.</div></div></div>';
  }

  /* Sidebar bergaya admin: ikon SVG, judul seksi, menu jarang dipakai di "Lainnya".
     Rute lama (kes-laporan-kelas, kes-controlling-mt, uks-duty-inbox, kes-laporan-masuk) tetap terdaftar. */
  const MENU=[
    {items:[['dashboard','Dashboard','dashboard'],['kes-pengingat','Pengingat','bell',true]]},
    {title:'Layanan Siswa',items:[
      ['kes-pendampingan','Pendampingan Siswa','heartHand'],
      ['kes-salam-cq','SALAM CQ','chat'],
      ['kes-salam-rekap','Rekap SALAM CQ','inbox'],
      ['kes-kebutuhan','Kebutuhan Siswa','users'],
      ['kes-masalah-kelas','Masalah Umum Kelas','grid']
    ]},
    {title:'Administrasi',items:[
      ['kes-rekap-keterlambatan','Keterlambatan & Surat','mailClock'],
      ['kes-cover-rapor','Cover Rapor','idCard']
    ]},
    {title:'Laporan',items:[
      ['laporan-kesiswaan-super','Laporan Kesiswaan','report'],
      ['kes-rekap-masalah','Rekapan Masalah Kelas & Siswa','alertList'],
      ['kesiswaan-rekapan','Rekap Kesiswaan','table'],
      ['rekap-input-poin','Monitoring Input','monitor'],
      ['kes-pemantauan-harian','Pemantauan Harian','eye'],
      ['laporan-promosi','Promosi Socmed','megaphone']
    ]}
  ];
  const MORE=[
    ['kes-perizinan','Perizinan & Kepulangan','door'],
    ['kes-muhadhoroh','Petugas Muhadhoroh','mic'],
    ['kes-program','Program Kesiswaan / SPARQ','flag'],
    ['kes-prestasi','Prestasi Siswa','trophy']
  ];
  function moreOpen(){try{return localStorage.getItem('cq_kes_more')==='1'}catch(_){return false}}
  function renderKesiswaanSidebarOnly(){
    if(!['kesiswaan','kabid_kesiswaan'].includes(role()))return false;
    const sidebar=document.getElementById('sidebar');if(!sidebar)return true;
    if(typeof window.cqKesReminderCss==='function')window.cqKesReminderCss();
    const ic=(n)=>typeof window.cqKesIcon==='function'?window.cqKesIcon(n,18):'';
    const cur=typeof activeModule!=='undefined'?activeModule:'';
    const btn=([id,label,i,badge])=>'<button type="button" class="cqk-nav'+(cur===id?' active':'')+'" data-kes-nav="'+id+'" title="'+label+'">'+ic(i)+'<span>'+label+'</span>'+(badge?'<b class="cqk-badge" data-cqk-badge hidden></b>':'')+'</button>';
    const open=moreOpen()||MORE.some(x=>x[0]===cur);
    sidebar.innerHTML='<nav class="cqk-side" aria-label="Menu Kesiswaan">'+
      MENU.map(g=>(g.title?'<div class="cqk-sec">'+g.title+'</div>':'')+g.items.map(btn).join('')).join('')+
      '<button type="button" class="cqk-more'+(open?' open':'')+'" data-kes-more="1"><span>Lainnya</span><small>'+(open?'':'4 menu')+'</small>'+(typeof window.cqKesIcon==='function'?window.cqKesIcon('chevron',14):'')+'</button>'+
      (open?MORE.map(btn).join(''):'')+
    '</nav>';
    sidebar.querySelectorAll('[data-kes-nav]').forEach(el=>el.onclick=()=>{if(typeof setActiveModule==='function')setActiveModule(el.dataset.kesNav)});
    const more=sidebar.querySelector('[data-kes-more]');
    if(more)more.onclick=()=>{try{localStorage.setItem('cq_kes_more',moreOpen()?'0':'1')}catch(_){}renderKesiswaanSidebarOnly()};
    if(typeof window.cqKesUpdateBadges==='function')window.cqKesUpdateBadges();
    if(typeof window.cqKesReminderLoad==='function')window.cqKesReminderLoad(false).catch(()=>{});
    return true;
  }

  function installCanonicalNavigation(){
    if(typeof renderSidebar==='function'&&!window.__cqNonKesiswaanRenderSidebar)window.__cqNonKesiswaanRenderSidebar=renderSidebar;
    if(typeof setActiveModule==='function'&&!window.__cqNonKesiswaanSetActiveModule)window.__cqNonKesiswaanSetActiveModule=setActiveModule;
    const baseRender=window.__cqNonKesiswaanRenderSidebar;
    const baseSet=window.__cqNonKesiswaanSetActiveModule;
    renderSidebar=function(){
      if(['kesiswaan','kabid_kesiswaan'].includes(role()))return renderKesiswaanSidebarOnly();
      return typeof baseRender==='function'?baseRender.apply(this,arguments):undefined;
    };
    renderSidebar.__cqKesiswaanCanonicalOwner=true;
    setActiveModule=function(id){
      const r=role(),key=String(id||'');
      if(['kesiswaan','kabid_kesiswaan'].includes(r)){
        if(key==='dashboard'){
          activeModule='dashboard';renderKesiswaanSidebarOnly();
          const content=document.getElementById('content');
          if(content)content.innerHTML='<div class="rd-shell" id="rd-root"><div class="rd-card"><span class="spinner"></span> Memuat dashboard...</div></div>';
          if(typeof window.renderKesiswaanDashboardV1==='function'){const out=window.renderKesiswaanDashboardV1({role:'kesiswaan'});if(content&&typeof window.cqKesReminderStrip==='function')window.cqKesReminderStrip(content);return out}
          if(content)content.innerHTML='<div class="empty-state">Dashboard Kesiswaan belum dapat dimuat.</div>';
          return;
        }
        if(KESISWAAN_ROUTE_RENDERERS[key]){
          activeModule=key;renderKesiswaanSidebarOnly();
          const content=document.getElementById('content'),fn=KESISWAAN_ROUTE_RENDERERS[key];
          if(content&&fn){const out=fn(content);if(out===undefined&&content.innerHTML.trim()==='')content.innerHTML='<div class="card">Modul Kesiswaan sedang dimuat. Silakan coba lagi.</div>'}
          return;
        }
      }
      return typeof baseSet==='function'?baseSet.apply(this,arguments):undefined;
    };
    setActiveModule.__cqKesiswaanCanonicalOwner=true;
  }

  function apply(){
    if(!['kesiswaan','kabid_kesiswaan'].includes(role()))return;
    installCanonicalNavigation();
    renderKesiswaanSidebarOnly();
    if((typeof activeModule==='undefined'||!activeModule||activeModule==='dashboard')&&typeof setActiveModule==='function')setActiveModule('dashboard');
  }


  const previousEnterApp=typeof enterApp==='function'?enterApp:null;
  if(previousEnterApp&&!previousEnterApp.__cqKesiswaanCanonicalEntry){
    const wrappedEnterApp=function(){
      const out=previousEnterApp.apply(this,arguments);
      if(['kesiswaan','kabid_kesiswaan'].includes(role())){
        installCanonicalNavigation();
        renderKesiswaanSidebarOnly();
        setActiveModule('dashboard');
      }
      return out;
    };
    wrappedEnterApp.__cqKesiswaanCanonicalEntry=true;
    enterApp=wrappedEnterApp;
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});else apply();

})();
