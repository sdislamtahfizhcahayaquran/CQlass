/* CQlass shared role theme runtime
   Adds only a fallback dashboard hero when a role dashboard has no native hero.
   Does not touch data, permissions, routing, forms, or module contents.
*/
(function(){
  'use strict';
  if(window.__CQ_GLOBAL_ROLE_THEME__) return;

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
  function hasHero(content){
    return !!content.querySelector('.ak7-hero,.rd-hero,.hrd-hero,.cq-role-hero,[class*="dashboard-hero"],[class*="dash-hero"]');
  }
  function addFallbackHero(){
    var app=document.getElementById('app-screen');
    var content=document.getElementById('content');
    if(!app||!content||getComputedStyle(app).display==='none'||!dashboardActive()||hasHero(content))return;
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
  }
  function sync(){
    if(dashboardActive()) addFallbackHero();
    else{
      document.querySelectorAll('.cq-role-hero[data-cq-role-theme="1"]').forEach(function(el){el.remove();});
      restoreHidden();
    }
  }

  var timer=0;
  function schedule(){clearTimeout(timer);timer=setTimeout(sync,40);}
  var observer=new MutationObserver(schedule);
  if(document.documentElement)observer.observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener('click',function(){setTimeout(sync,80);},true);
  document.addEventListener('DOMContentLoaded',function(){setTimeout(sync,120);},{once:true});
  window.addEventListener('load',function(){setTimeout(sync,180);},{once:true});
  setTimeout(sync,120);
  window.__CQ_GLOBAL_ROLE_THEME__=true;
})();
