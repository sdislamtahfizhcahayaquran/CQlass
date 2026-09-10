/* CQlass shared role theme runtime
   Keeps one lightweight building hero on every role dashboard.
   Does not touch data, permissions, routing, forms, or module contents.
*/
(function(){
  'use strict';
  if(window.__CQ_GLOBAL_ROLE_THEME_V3__) return;

  function norm(v){return String(v||'').trim().toLowerCase().replace(/[\s-]+/g,'_');}
  function esc(v){return String(v||'').replace(/[&<>"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];});}
  function readUser(){
    try{if(typeof currentUser!=='undefined'&&currentUser)return currentUser;}catch(_){ }
    try{return JSON.parse(localStorage.getItem('cqlass_user')||'null')||{};}catch(_){return {};}
  }
  function userName(){
    var u=readUser();
    return u.nama||u.full_name||u.name||u.teacher_name||u.display_name||u.username||'Pengguna CQlass';
  }
  function roleRaw(){
    var u=readUser();
    return u.role_code||u.role||u.primary_role||(Array.isArray(u.roles)&&u.roles[0])||'';
  }
  function roleNorm(){return norm(roleRaw());}
  function isAcademic(){
    var r=roleNorm();
    return r==='akademik'||r==='kabid_akademik'||r==='academic'||r.indexOf('kabid_akademik')>=0;
  }
  function roleLabel(){
    var r=roleNorm();
    var labels={
      akademik:'Kabid Akademik',kabid_akademik:'Kabid Akademik',
      kesiswaan:'Kabid Kesiswaan',kabid_kesiswaan:'Kabid Kesiswaan',
      tahfizh:'Kabid Tahfizh',kabid_tahfizh:'Kabid Tahfizh',
      kegiatan:'Kabid Kegiatan',kabid_kegiatan:'Kabid Kegiatan',
      hrd:'HRD',pimpinan:'Pimpinan',kepsek:'Kepala Sekolah',kepala_sekolah:'Kepala Sekolah',
      admin:'Admin',guru:'Guru',walas:'Wali Kelas',wali_kelas:'Wali Kelas',
      guru_partner:'Guru Partner',partner:'Guru Partner'
    };
    if(labels[r])return labels[r];
    var badge=document.getElementById('user-role');
    if(badge&&badge.textContent.trim())return badge.textContent.trim();
    return String(roleRaw()||'CQlass').replace(/_/g,' ').replace(/\b\w/g,function(c){return c.toUpperCase();});
  }
  function roleSub(){
    var r=roleNorm();
    if(r.indexOf('akademik')>=0)return 'Pantau pembelajaran, guru mata pelajaran, nilai, dan kesiapan rapor dalam satu alur.';
    if(r.indexOf('kesiswaan')>=0)return 'Pantau pembinaan siswa, kedisiplinan, reward, pelanggaran, dan tindak lanjut.';
    if(r.indexOf('tahfizh')>=0)return 'Pantau capaian tahfizh, perkembangan hafalan, dan tindak lanjut pembelajaran Al-Qur’an.';
    if(r.indexOf('kegiatan')>=0)return 'Pantau kegiatan sekolah, ekskul, dokumentasi, dan keterlibatan siswa.';
    if(r==='hrd')return 'Pantau performa guru 360°, kelengkapan laporan, dan perkembangan guru dari data CQlass.';
    if(r==='pimpinan'||r==='kepsek'||r==='kepala_sekolah')return 'Lihat ringkasan sekolah dan informasi penting lintas bidang dalam satu halaman.';
    if(r==='guru'||r==='walas'||r==='wali_kelas'||r==='guru_partner'||r==='partner')return 'Akses tugas, pembelajaran, dan informasi kelas yang menjadi tanggung jawab Anda.';
    if(r==='admin')return 'Kelola akun, master data, dan konfigurasi operasional CQlass.';
    return 'Kelola pekerjaan dan informasi sekolah melalui CQlass.';
  }
  function dashboardActive(){
    try{if(typeof activeModule!=='undefined'&&activeModule!=null)return String(activeModule)==='dashboard';}catch(_){ }
    var sb=document.getElementById('sidebar');
    if(!sb)return false;
    var active=sb.querySelector('.nav-item.active,.active[aria-current="page"],.active');
    return !!(active&&String(active.textContent||'').trim().toLowerCase()==='dashboard');
  }
  function appVisible(){
    var app=document.getElementById('app-screen');
    return !!(app&&getComputedStyle(app).display!=='none');
  }
  function content(){return document.getElementById('content');}
  function fallbackHero(root){return root&&root.querySelector('.cq-role-hero[data-cq-role-theme="1"]');}
  function nativeHeroes(root){
    if(!root)return[];
    return Array.prototype.slice.call(root.querySelectorAll('.ak7-hero,.rd-hero,.hrd-hero,[class*="dashboard-hero"],[class*="dash-hero"]'));
  }
  function hideHero(el){
    if(!el)return;
    if(!el.dataset.cqThemePrevDisplay)el.dataset.cqThemePrevDisplay=el.style.display||'';
    el.dataset.cqThemeHeroHidden='1';
    el.classList.add('cq-theme-hero-hidden');
    el.style.setProperty('display','none','important');
  }
  function showHero(el){
    if(!el)return;
    el.classList.remove('cq-theme-hero-hidden');
    if(el.dataset.cqThemeHeroHidden==='1'){
      el.style.removeProperty('display');
      if(el.dataset.cqThemePrevDisplay)el.style.display=el.dataset.cqThemePrevDisplay;
    }
    delete el.dataset.cqThemeHeroHidden;
    delete el.dataset.cqThemePrevDisplay;
  }
  function buildFallback(root){
    var hero=document.createElement('section');
    hero.className='cq-role-hero';
    hero.setAttribute('data-cq-role-theme','1');
    hero.innerHTML='<div class="cq-role-hero-copy">'
      +'<div class="cq-role-hero-eye">CQlass · '+esc(roleLabel())+'</div>'
      +'<div class="cq-role-hero-title">Selamat Bekerja, '+esc(userName())+'</div>'
      +'<div class="cq-role-hero-sub">'+esc(roleSub())+'</div>'
      +'</div>';
    root.insertBefore(hero,root.firstChild);
    return hero;
  }
  function hideLooseTitle(root){
    var title=root&&root.querySelector(':scope > .page-title');
    var sub=root&&root.querySelector(':scope > .page-sub');
    [title,sub].forEach(function(el){
      if(!el||el.dataset.cqThemeHidden==='1')return;
      el.dataset.cqThemeHidden='1';
      el.dataset.cqThemePrevDisplay=el.style.display||'';
      el.style.setProperty('display','none','important');
    });
  }
  function restoreLooseTitles(){
    document.querySelectorAll('[data-cq-theme-hidden="1"]').forEach(function(el){
      el.style.removeProperty('display');
      if(el.dataset.cqThemePrevDisplay)el.style.display=el.dataset.cqThemePrevDisplay;
      delete el.dataset.cqThemeHidden;
      delete el.dataset.cqThemePrevDisplay;
    });
  }
  function enforceOneHero(){
    var root=content();
    if(!root||!dashboardActive()||!appVisible())return;

    var natives=nativeHeroes(root);
    var akHero=natives.find(function(el){return el.classList.contains('ak7-hero');});

    /* Kabid Akademik already has its intended single hero with controls; preserve it. */
    if(isAcademic()&&akHero){
      var f0=fallbackHero(root);if(f0)f0.remove();
      natives.forEach(function(el){if(el===akHero)showHero(el);else hideHero(el);});
      return;
    }

    /* Every other role uses one shared greeting hero. Native/legacy hero blocks are suppressed. */
    var fallback=fallbackHero(root);
    if(!fallback)fallback=buildFallback(root);
    natives.forEach(hideHero);
    hideLooseTitle(root);
  }
  function restoreOutsideDashboard(){
    var root=content();
    if(root){
      var f=fallbackHero(root);if(f)f.remove();
      nativeHeroes(root).forEach(showHero);
    }
    restoreLooseTitles();
  }
  function sync(){
    if(dashboardActive()&&appVisible())enforceOneHero();
    else restoreOutsideDashboard();
  }

  var timer=0;
  function schedule(){clearTimeout(timer);timer=setTimeout(sync,25);}
  var observer=new MutationObserver(schedule);
  if(document.documentElement)observer.observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener('click',function(){setTimeout(sync,45);},true);
  document.addEventListener('DOMContentLoaded',function(){setTimeout(sync,70);},{once:true});
  window.addEventListener('load',function(){setTimeout(sync,100);},{once:true});
  setInterval(function(){if(dashboardActive()&&appVisible())enforceOneHero();},900);
  setTimeout(sync,70);

  window.__CQ_GLOBAL_ROLE_THEME__=true;
  window.__CQ_GLOBAL_ROLE_THEME_V3__=true;
})();
