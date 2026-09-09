/* CQlass login branding hotfix — no auth/data changes */
(function(){
  'use strict';
  const brand=document.querySelector('#login-screen .brand-row');
  if(brand){
    brand.innerHTML=`
      <img src="logo_sd.png?v=20260910-opt1" class="brand-school-logo" alt="Logo SDIT Cahaya Qur'an" onerror="this.style.display='none'">
      <div class="brand-wordmark" aria-label="CQlass SDIT Cahaya Qur'an — Ilmu, Akhlak, Generasi Qur'ani">
        <div class="cq-name">CQlass</div>
        <div class="cq-school">SDIT Cahaya Qur'an</div>
        <div class="cq-tagline">Ilmu &nbsp;•&nbsp; Akhlak &nbsp;•&nbsp; Generasi Qur'ani</div>
      </div>`;
  }
})();
