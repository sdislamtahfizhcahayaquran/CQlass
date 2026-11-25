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

  /* Navigasi Kesiswaan: 6 menu utama, tiap menu = kumpulan halaman yang tampil sebagai tab.
     Modul lama tidak diubah; baris tab dipasang di atas konten dan dipasang ulang otomatis
     bila modul menggambar ulang #content. Rute lama yang disembunyikan tetap terdaftar. */
  const HUBS=[
    {id:'beranda',label:'Beranda',icon:'bell',badge:true,tabs:[['kes-pengingat','Pengingat']]},
    {id:'kasus',label:'Kasus Siswa',icon:'heartHand',tabs:[['kes-pendampingan','Kasus & Pendampingan'],['kes-kebutuhan','Kebutuhan Khusus'],['kes-masalah-kelas','Masalah Kelas'],['kes-rekap-masalah','Rekap Masalah']]},
    {id:'salam',label:'SALAM CQ',icon:'chat',tabs:[['kes-salam-cq','Pesan Masuk'],['kes-salam-rekap','Rekap']]},
    {id:'surat',label:'Surat & Dokumen',icon:'mailClock',tabs:[['kes-rekap-keterlambatan','Keterlambatan & SP'],['kes-cover-rapor','Cover Rapor']]},
    {id:'monitor',label:'Monitoring Walas',icon:'monitor',tabs:[['rekap-input-poin','Input Poin'],['kes-pemantauan-harian','Pemantauan Harian'],['kesiswaan-rekapan','Rekap per Kelas']]},
    {id:'laporan',label:'Laporan',icon:'report',tabs:[['laporan-kesiswaan-super','Laporan Lengkap'],['dashboard','Statistik'],['laporan-promosi','Promosi Socmed']]}
  ];
  const HOME='kes-pengingat';
  window.__cqKesHubs=HUBS;
  const hubOf=id=>HUBS.find(h=>h.tabs.some(t=>t[0]===id))||null;
  const ic=n=>typeof window.cqKesIcon==='function'?window.cqKesIcon(n,18):'';
  const curModule=()=>typeof activeModule!=='undefined'?activeModule:'';

  function subnavEl(){
    const hub=hubOf(curModule());
    if(!hub||hub.tabs.length<2)return null;
    const nav=document.createElement('nav');nav.className='cqk-subnav';nav.setAttribute('aria-label',hub.label);nav.dataset.hub=hub.id;
    nav.innerHTML='<span class="cqk-subnav-title">'+ic(hub.icon)+'<b>'+hub.label+'</b></span><div class="cqk-subnav-tabs" role="tablist">'+
      hub.tabs.map(([id,label])=>'<button type="button" role="tab" class="cqk-subtab'+(id===curModule()?' active':'')+'" aria-selected="'+(id===curModule())+'" data-kes-route="'+id+'">'+label+'</button>').join('')+'</div>';
    nav.querySelectorAll('[data-kes-route]').forEach(b=>b.onclick=()=>{if(b.dataset.kesRoute!==curModule()&&typeof setActiveModule==='function')setActiveModule(b.dataset.kesRoute)});
    return nav;
  }
  function ensureSubnav(){
    if(!['kesiswaan','kabid_kesiswaan'].includes(role()))return;
    const content=document.getElementById('content');if(!content)return;
    const want=subnavEl(),have=content.querySelector(':scope > .cqk-subnav');
    if(!want){if(have)have.remove();return}
    if(have&&have.dataset.hub===want.dataset.hub&&have.querySelector('.cqk-subtab.active')?.dataset.kesRoute===curModule()&&content.firstElementChild===have)return;
    if(have)have.remove();
    content.insertBefore(want,content.firstChild);
  }
  let subnavObserver=null;
  function watchContent(){
    const content=document.getElementById('content');if(!content||subnavObserver)return;
    subnavObserver=new MutationObserver(()=>{if(['kesiswaan','kabid_kesiswaan'].includes(role()))ensureSubnav()});
    subnavObserver.observe(content,{childList:true});
  }

  function renderKesiswaanSidebarOnly(){
    if(!['kesiswaan','kabid_kesiswaan'].includes(role()))return false;
    const sidebar=document.getElementById('sidebar');if(!sidebar)return true;
    if(typeof window.cqKesReminderCss==='function')window.cqKesReminderCss();
    const activeHub=hubOf(curModule());
    sidebar.innerHTML='<nav class="cqk-side" aria-label="Menu Kesiswaan">'+HUBS.map(h=>
      '<button type="button" class="cqk-nav'+(activeHub&&activeHub.id===h.id?' active':'')+'" data-kes-hub="'+h.id+'" title="'+h.label+'">'+ic(h.icon)+'<span>'+h.label+'</span>'+(h.badge?'<b class="cqk-badge" data-cqk-badge hidden></b>':'')+'</button>').join('')+'</nav>';
    sidebar.querySelectorAll('[data-kes-hub]').forEach(el=>el.onclick=()=>{
      const h=HUBS.find(x=>x.id===el.dataset.kesHub);
      const target=(activeHub&&activeHub.id===h.id)?curModule():h.tabs[0][0];
      if(typeof setActiveModule==='function')setActiveModule(target);
    });
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
          if(typeof window.renderKesiswaanDashboardV1==='function'){const out=window.renderKesiswaanDashboardV1({role:'kesiswaan'});ensureSubnav();return out}
          if(content)content.innerHTML='<div class="empty-state">Dashboard Kesiswaan belum dapat dimuat.</div>';
          return;
        }
        if(KESISWAAN_ROUTE_RENDERERS[key]){
          activeModule=key;renderKesiswaanSidebarOnly();
          const content=document.getElementById('content'),fn=KESISWAAN_ROUTE_RENDERERS[key];
          if(content&&fn){const out=fn(content);if(out===undefined&&content.innerHTML.trim()==='')content.innerHTML='<div class="card">Modul Kesiswaan sedang dimuat. Silakan coba lagi.</div>'}
          ensureSubnav();
          return;
        }
      }
      const out=typeof baseSet==='function'?baseSet.apply(this,arguments):undefined;
      if(['kesiswaan','kabid_kesiswaan'].includes(r)){renderKesiswaanSidebarOnly();ensureSubnav();}
      return out;
    };
    setActiveModule.__cqKesiswaanCanonicalOwner=true;
    watchContent();
  }

  function apply(){
    if(!['kesiswaan','kabid_kesiswaan'].includes(role()))return;
    installCanonicalNavigation();
    renderKesiswaanSidebarOnly();
    if((typeof activeModule==='undefined'||!activeModule||activeModule==='dashboard')&&typeof setActiveModule==='function')setActiveModule(HOME);
  }


  const previousEnterApp=typeof enterApp==='function'?enterApp:null;
  if(previousEnterApp&&!previousEnterApp.__cqKesiswaanCanonicalEntry){
    const wrappedEnterApp=function(){
      const out=previousEnterApp.apply(this,arguments);
      if(['kesiswaan','kabid_kesiswaan'].includes(role())){
        installCanonicalNavigation();
        renderKesiswaanSidebarOnly();
        setActiveModule(HOME);
      }
      return out;
    };
    wrappedEnterApp.__cqKesiswaanCanonicalEntry=true;
    enterApp=wrappedEnterApp;
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});else apply();

})();
