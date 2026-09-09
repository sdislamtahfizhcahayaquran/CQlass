/* CQlass production login: supplied visual DOM + existing CQlass authentication. */
(function(){
  'use strict';

  const css=[...document.querySelectorAll('link[rel="stylesheet"]')].find(x=>/login-redesign\.css/i.test(x.getAttribute('href')||''));
  if(css) css.href='login-redesign.css?v=20260909-exact3';

  const login=document.getElementById('login-screen');
  if(login){
    login.innerHTML=`
      <div class="pattern-overlay"></div>
      <div class="scene">
        <header></header>
        <main>
          <div class="left">
            <div class="brand-row">
              <img src="logo_sd.png" alt="Logo SDIT Cahaya Qur'an" class="logo-sd-img" onerror="this.style.display='none'">
              <div class="wordmark-img" role="img" aria-label="CQlass SDIT Cahaya Qur'an"></div>
            </div>
            <h1>Selamat Datang<br>di <span class="accent">CQlass</span></h1>
            <p class="lead">Kelola data akademik, kesiswaan, tahfizh, dan kegiatan sekolah dalam satu sistem yang terintegrasi, mudah, dan terpercaya.</p>
            <div class="features">
              <div class="feature-card"><div class="icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg></div><div><strong>Akademik</strong><span>Kelola pembelajaran dan penilaian</span></div></div>
              <div class="feature-card"><div class="icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg></div><div><strong>Kesiswaan</strong><span>Data siswa, absensi, dan perkembangan</span></div></div>
              <div class="feature-card"><div class="icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg></div><div><strong>Tahfizh &amp; Kegiatan</strong><span>Pantau capaian tahfizh dan aktivitas sekolah</span></div></div>
            </div>
            <blockquote class="quote">"Pendidikan hari ini, cahaya untuk masa depan yang lebih baik."<cite>— SDIT Cahaya Qur'an</cite></blockquote>
          </div>

          <div class="login-wrap">
            <div class="login-card">
              <div class="login-logo"><img src="logo_sd.png" alt="Logo" class="login-logo-img" onerror="this.style.display='none'"></div>
              <h2>Masuk ke Akun Anda</h2>
              <p class="sub">Silakan login untuk melanjutkan.</p>
              <form id="login-form" novalidate>
                <div id="login-error" class="login-error"></div>
                <div class="field" id="userField">
                  <svg class="icon-left" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>
                  <input type="text" id="login-username" name="username" placeholder="Username" autocomplete="username">
                  <div class="field-msg">Username tidak boleh kosong.</div>
                </div>
                <div class="field" id="passField">
                  <svg class="icon-left" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10V7a4 4 0 018 0v3"/></svg>
                  <input type="password" id="login-password" name="password" placeholder="Kata Sandi" autocomplete="current-password">
                  <button type="button" class="icon-right toggle-pass" id="toggle-pass" aria-label="Tampilkan kata sandi"><svg id="toggle-pass-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg></button>
                  <div class="field-msg">Kata sandi tidak boleh kosong.</div>
                </div>
                <div class="row-between"><label class="remember"><input type="checkbox" id="login-remember"> Ingat saya</label><a href="#" id="forgot-password-link">Lupa password?</a></div>
                <button type="submit" class="btn-submit" id="login-btn">Masuk<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button>
              </form>
              <hr class="divider">
              <div class="contact-line"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 18v-6a9 9 0 0118 0v6"/><path d="M21 19a2 2 0 01-2 2h-1a2 2 0 01-2-2v-3a2 2 0 012-2h3zM3 19a2 2 0 002 2h1a2 2 0 002-2v-3a2 2 0 00-2-2H3z"/></svg>Hubungi admin sekolah jika mengalami kendala login.</div>
              <div class="mosque-footer"><svg viewBox="0 0 200 90" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 90V55c0-8 6-14 14-14s14 6 14 14v35"/><path d="M152 90V55c0-8 6-14 14-14s14 6 14 14v35"/><path d="M70 90V40c0-16 12-28 30-28s30 12 30 28v50"/><circle cx="100" cy="8" r="3"/><path d="M100 4V-2" transform="translate(0,4)"/></svg><p>TEKNOLOGI UNTUK PENDIDIKAN<br>YANG LEBIH BAIK</p></div>
            </div>
          </div>
        </main>
      </div>`;

    const form=document.getElementById('login-form');
    const user=document.getElementById('login-username');
    const pass=document.getElementById('login-password');
    form?.addEventListener('submit',()=>{
      document.getElementById('userField')?.classList.toggle('error',!user?.value.trim());
      document.getElementById('passField')?.classList.toggle('error',!pass?.value.trim());
    });
    document.getElementById('forgot-password-link')?.addEventListener('click',e=>e.preventDefault());

    const loginBtn=document.getElementById('login-btn');
    const normalButton=`Masuk<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M5 12h14M13 6l6 6-6 6"/></svg>`;
    if(loginBtn){
      new MutationObserver(()=>{
        if(!loginBtn.disabled && loginBtn.textContent.trim()==='Masuk' && !loginBtn.querySelector('svg')) loginBtn.innerHTML=normalButton;
      }).observe(loginBtn,{childList:true,subtree:true});
    }
  }

  const BASE='https://cdn.jsdelivr.net/gh/sdislamtahfizhcahayaquran/CQlass@login-redesign-preview/preview-assets/';
  const load=async(names)=>{
    const parts=await Promise.all(names.map(async name=>{
      const r=await fetch(BASE+name+'?v=20260909-exact3',{cache:'force-cache'});
      if(!r.ok) throw new Error('asset '+name+' '+r.status);
      return (await r.text()).trim();
    }));
    return parts.join('');
  };
  Promise.all([load(['bg1.txt','bg2.txt','bg3.txt','bg4.txt']),load(['wm1.txt','wm2.txt','wm3.txt','wm4.txt'])]).then(([bg,wm])=>{
    const root=document.documentElement;
    root.style.setProperty('--cq-login-bg','url("data:image/webp;base64,'+bg+'")');
    root.style.setProperty('--cq-login-wordmark','url("data:image/webp;base64,'+wm+'")');
    root.classList.add('login-assets-ready');
  }).catch(err=>{console.warn('CQlass login assets fallback:',err);document.documentElement.classList.add('login-assets-fallback')});
})();
