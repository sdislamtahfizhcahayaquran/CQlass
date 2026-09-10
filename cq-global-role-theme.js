/* CQlass shared role theme runtime
   Keeps one lightweight building hero on role dashboards.
   Does not touch data, permissions, routing, forms, or module contents.
*/
(function(){
  'use strict';
  if(window.__CQ_GLOBAL_ROLE_THEME__) return;

  function norm(v){return String(v||'').trim().toLowerCase().replace(/[\s-]+/g,'_');}
  function esc(v){return String(v||'').replace(/[&<>"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[m];});}
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
  function roleLabel(){
    var r=norm(roleRaw());
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
    var r=norm(roleRaw());
    if(r.indexOf('akademik')>=0)return 'Pantau pembelajaran, guru mata pelajaran, nilai, dan kesiapan rapor dalam satu alur.';
    if(r.indexOf('kesiswaan')>=0)return 'Pantau pembinaan siswa, kedisiplinan, reward, pelanggaran, dan tindak lanjut.';
    if(r.indexOf('tahfizh')>=0)return 'Pantau capaian tahfizh, perkembangan hafalan, dan tindak lanjut pembelajaran Al-Qur’an.';
    if(r.indexOf('kegiatan')>=0)return 'Pantau kegiatan sekolah, ekskul, dokumentasi, dan keterlibatan siswa.';
    if(r==='hrd')return 'Pantau data dan perkembangan guru dari laporan CQlass yang tersedia.';
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
  function nativeHeroes(content){
    return Array.prototype.slice.call(content.querySelectorAll('.ak7-hero,.rd-hero,.hrd-hero,[class*="dashboard-hero"],[class*="dash-hero"]'));
  }
  function fallbackHero(content){return content.querySelector('.cq-role-hero[data-cq-role-theme="1"]');}
  function addFallbackHero(){
    var app=document.getElementById('app-screen');
    var content=document.getElementById('content');
    if(!app||!content||getComputedStyle(app).display==='none'||!dashboardActive())return;
    if(fallbackHero(content)||nativeHeroes(content).length)return;
    if(!String(content.textContent||'').trim())return;

    var title=content.querySelector(':scope > .page-title');
    var sub=content.querySelector(':scope > .page-sub');
    var hero=document.createElement('section');
    hero.className='cq-role-hero';
    hero.setAttribute('data-cq-role-theme','1');
    hero.innerHTML='<div class="cq-role-hero-copy">'
      +'<div class="cq-role-hero-eye">CQlass · '+esc(roleLabel())+'</div>'
      +'<div class="cq-role-hero-title">Selamat Bekerja, '+esc(userName())+'</div>'
      +'<div class="cq-role-hero-sub">'+esc(roleSub())+'</div>'
      +'</div>';
    content.insertBefore(hero,content.firstChild);
    if(title){title.dataset.cqThemeHidden='1';title.style.display='none';}
    if(sub){sub.dataset.cqThemeHidden='1';sub.style.display='none';}
  }
  function restoreHidden(){
    document.querySelectorAll('[data-cq-theme-hidden="1"]').forEach(function(el){el.style.display='';delete el.dataset.cqThemeHidden;});
    document.querySelectorAll('.cq-theme-hero-hidden').forEach(function(el){el.classList.remove('cq-theme-hero-hidden');delete el.dataset.cqThemeHeroHidden;});
  }
  function dedupeHeroes(){
    var content=document.getElementById('content');
    if(!content)return;
    var fallback=fallbackHero(content);
    var natives=nativeHeroes(content);

    if(fallback){
      /* The global hero was already first on screen: keep it and suppress any late legacy/native hero. */
      natives.forEach(function(el){el.classList.add('cq-theme-hero-hidden');el.dataset.cqThemeHeroHidden='1';});
      return;
    }

    /* No global hero: keep the first native hero and hide accidental duplicates only. */
    natives.forEach(function(el,i){
      if(i===0){el.classList.remove('cq-theme-hero-hidden');delete el.dataset.cqThemeHeroHidden;}
      else{el.classList.add('cq-theme-hero-hidden');el.dataset.cqThemeHeroHidden='1';}
    });
  }
  function sync(){
    if(dashboardActive()){
      addFallbackHero();
      dedupeHeroes();
    }else{
      document.querySelectorAll('.cq-role-hero[data-cq-role-theme="1"]').forEach(function(el){el.remove();});
      restoreHidden();
    }
  }

  var timer=0;
  function schedule(){clearTimeout(timer);timer=setTimeout(sync,35);}
  var observer=new MutationObserver(schedule);
  if(document.documentElement)observer.observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener('click',function(){setTimeout(sync,70);},true);
  document.addEventListener('DOMContentLoaded',function(){setTimeout(sync,100);},{once:true});
  window.addEventListener('load',function(){setTimeout(sync,150);},{once:true});
  setTimeout(sync,100);
  window.__CQ_GLOBAL_ROLE_THEME__=true;
})();
