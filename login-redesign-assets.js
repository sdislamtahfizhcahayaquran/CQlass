/* CQlass production login polish — DOM only; authentication stays in app-core.js. */
(function(){
  'use strict';

  const css=[...document.querySelectorAll('link[rel="stylesheet"]')].find(x=>/login-redesign\.css/i.test(x.getAttribute('href')||''));
  if(css) css.href='login-redesign.css?v=20260909-polish1';

  const root=document.documentElement;
  root.style.setProperty('--cq-login-bg',"url('login-bg.webp?v=20260909-upload1')");
  root.classList.add('login-assets-ready');

  const login=document.getElementById('login-screen');
  if(!login) return;

  login.innerHTML=`
    <div class="pattern-overlay"></div>
    <div class="scene">
      <header></header>
      <main>
        <section class="left" aria-label="Tentang CQlass">
          <div class="brand-row">
            <img src="cqlass-wordmark.webp?v=20260909-polish1" class="wordmark-img" alt="CQlass — SDIT Cahaya Qur'an · Ilmu · Akhlak · Generasi Qur'ani">
          </div>
          <h1>Selamat Datang<br>di <span class="accent">CQlass</span></h1>
          <p class="lead">Kelola data akademik, kesiswaan, tahfizh, dan kegiatan sekolah dalam satu sistem yang terintegrasi, mudah, dan terpercaya.</p>
          <div class="features" aria-label="Fitur utama CQlass">
            <article class="feature-card">
              <div class="icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg></div>
              <div><strong>Akademik</strong><span>Pembelajaran dan penilaian dalam satu alur.</span></div>
            </article>
            <article class="feature-card">
              <div class="icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg></div>
              <div><strong>Kesiswaan</strong><span>Absensi, pembinaan, dan perkembangan siswa.</span></div>
            </article>
            <article class="feature-card">
              <div class="icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg></div>
              <div><strong>Tahfizh &amp; Kegiatan</strong><span>Capaian tahfizh dan aktivitas sekolah.</span></div>
            </article>
          </div>
          <blockquote class="quote">“Pendidikan hari ini, cahaya untuk masa depan yang lebih baik.”<cite>— SDIT Cahaya Qur'an</cite></blockquote>
        </section>

        <section class="login-wrap" aria-label="Masuk ke CQlass">
          <div class="login-card">
            <div class="login-logo"><img src="logo_sd.png" alt="Logo SDIT Cahaya Qur'an" class="login-logo-img" onerror="this.style.display='none'"></div>
            <h2>Masuk ke Akun Anda</h2>
            <p class="sub">Silakan login untuk melanjutkan ke CQlass.</p>
            <form id="login-form" novalidate>
              <div id="login-error" class="login-error" role="alert" aria-live="polite"></div>
              <div class="field" id="userField">
                <svg class="icon-left" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>
                <input type="text" id="login-username" name="username" placeholder="Username" autocomplete="username" aria-label="Username">
                <div class="field-msg">Username tidak boleh kosong.</div>
              </div>
              <div class="field" id="passField">
                <svg class="icon-left" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>
                <input type="password" id="login-password" name="password" placeholder="Kata Sandi" autocomplete="current-password" aria-label="Kata Sandi">
                <button type="button" class="icon-right toggle-pass" id="toggle-pass" aria-label="Tampilkan kata sandi"><svg id="toggle-pass-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg></button>
                <div class="field-msg">Kata sandi tidak boleh kosong.</div>
              </div>
              <div class="row-between">
                <label class="remember"><input type="checkbox" id="login-remember"> Ingat username</label>
                <a href="#" id="forgot-password-link">Lupa password?</a>
              </div>
              <button type="submit" class="btn-submit" id="login-btn">Masuk<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button>
            </form>
            <hr class="divider">
            <div class="contact-line"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>Hubungi admin sekolah jika mengalami kendala login.</div>
            <div class="mosque-footer"><svg viewBox="0 0 200 90" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 90V55c0-8 6-14 14-14s14 6 14 14v35"/><path d="M152 90V55c0-8 6-14 14-14s14 6 14 14v35"/><path d="M70 90V40c0-16 12-28 30-28s30 12 30 28v50"/><circle cx="100" cy="8" r="3"/><path d="M100 4V-2" transform="translate(0,4)"/></svg><p>TEKNOLOGI UNTUK PENDIDIKAN<br>YANG LEBIH BAIK</p></div>
          </div>
        </section>
      </main>
    </div>`;

  const form=document.getElementById('login-form');
  const user=document.getElementById('login-username');
  const pass=document.getElementById('login-password');
  const remember=document.getElementById('login-remember');
  const err=document.getElementById('login-error');
  const userField=document.getElementById('userField');
  const passField=document.getElementById('passField');
  const STORAGE_KEY='cqlass_remembered_username';

  try{
    const saved=localStorage.getItem(STORAGE_KEY)||'';
    if(saved && user){ user.value=saved; if(remember) remember.checked=true; }
  }catch(_){ }

  function clearInfo(){
    if(err && err.classList.contains('info')){ err.textContent=''; err.classList.remove('info'); }
  }
  user?.addEventListener('input',()=>{ userField?.classList.remove('error'); clearInfo(); });
  pass?.addEventListener('input',()=>{ passField?.classList.remove('error'); clearInfo(); });

  form?.addEventListener('submit',()=>{
    const noUser=!user?.value.trim();
    const noPass=!pass?.value.trim();
    userField?.classList.toggle('error',noUser);
    passField?.classList.toggle('error',noPass);
    try{
      if(remember?.checked && user?.value.trim()) localStorage.setItem(STORAGE_KEY,user.value.trim());
      else localStorage.removeItem(STORAGE_KEY);
    }catch(_){ }
  });

  document.getElementById('forgot-password-link')?.addEventListener('click',e=>{
    e.preventDefault();
    if(err){
      err.classList.add('info');
      err.textContent='Untuk reset kata sandi, silakan hubungi admin sekolah.';
    }
  });

  const loginBtn=document.getElementById('login-btn');
  const normalButton=`Masuk<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M5 12h14M13 6l6 6-6 6"/></svg>`;
  if(loginBtn){
    new MutationObserver(()=>{
      if(!loginBtn.disabled && loginBtn.textContent.trim()==='Masuk' && !loginBtn.querySelector('svg')) loginBtn.innerHTML=normalButton;
    }).observe(loginBtn,{childList:true,subtree:true});
  }
})();
