(function(){
  window.__CQ_ATTENDANCE_RECAP_MODE_LEGACY_DISABLED__=true;
  // MT V9 owns Input Morning Talk, Leaderboard Siswa, and Rekap. Never replace it.
  if(!document.querySelector('script[data-cq-mt-v9]') && !window.__CQMTV9){
    var mt=document.createElement('script');
    mt.src='mt-v7.js?v=20260923-dualrecap1';
    mt.dataset.cqMtV9='1';
    document.head.appendChild(mt);
  }
  // Add Hari Efektif only inside Rekap Editable; this script does not alter tabs/panels.
  if(!document.querySelector('script[data-cq-mt-effective-safe]')){
    var he=document.createElement('script');
    he.src='mt-effective-days-safe.js?v=20260917-safe1';
    he.dataset.cqMtEffectiveSafe='1';
    document.head.appendChild(he);
  }
  if(!document.querySelector('script[data-cq-raw-exkul]')){
    var s=document.createElement('script');
    s.src='extracurricular-raw-ui.js?v=20260916-raw2';
    s.dataset.cqRawEkskul='1';
    document.head.appendChild(s);
  }
  // Kabid Akademik: status Absensi Live Readiness follows the latest saved Rekap Editable.
  if(!document.querySelector('script[data-cq-akpts-attendance-fix]')){
    var af=document.createElement('script');
    af.src='academic-pts-attendance-fix.js?v=20260921-absedit1';
    af.dataset.cqAkptsAttendanceFix='1';
    document.head.appendChild(af);
  }

  /*
   * Walas must always have TWO recap modes:
   * 1. Rekap Asli
   * 2. Rekap Editable
   *
   * Some attendance re-renders keep #mt9-tabs but remove/replace its recap panel.
   * mt-v7 setup intentionally returns when #mt9-tabs already exists, which made
   * Rekap Editable disappear until a hard reload.  Repair the whole MT shell
   * whenever its structure becomes incomplete so a later renderer cannot leave
   * Walas with only one recap.
   */
  var repairing=false,repairTimer=0;
  function dualRecapComplete(){
    var body=document.getElementById('absensi-body');
    if(!body)return true;
    var tabs=document.getElementById('mt9-tabs');
    var recap=document.getElementById('mt9-recap');
    if(!tabs||!recap)return false;
    // Before the Rekap tab is opened there are no mode buttons yet; that is valid.
    var start=document.getElementById('mt9-start');
    if(!start)return true;
    return !!(
      recap.querySelector('.mt9-mode[data-mode="system"]') &&
      recap.querySelector('.mt9-mode[data-mode="editable"]')
    );
  }
  function rebuildMtShell(){
    if(repairing||dualRecapComplete())return;
    repairing=true;
    try{
      ['mt9-tabs','mt9-leaderboard','mt9-recap'].forEach(function(id){
        var el=document.getElementById(id);if(el)el.remove();
      });
      window.__CQMTV9=false;
      document.querySelectorAll('script[data-cq-mt-v9-repair]').forEach(function(x){x.remove()});
      var r=document.createElement('script');
      r.src='mt-v7.js?v=20260923-dualrecap-repair1';
      r.dataset.cqMtV9Repair='1';
      r.onload=function(){repairing=false};
      r.onerror=function(){repairing=false};
      document.head.appendChild(r);
    }catch(_){repairing=false}
  }
  function scheduleDualRecapRepair(){
    clearTimeout(repairTimer);
    repairTimer=setTimeout(function(){
      if(!dualRecapComplete())rebuildMtShell();
    },180);
  }
  var recapObserver=new MutationObserver(scheduleDualRecapRepair);
  function startRecapObserver(){
    if(!document.body)return setTimeout(startRecapObserver,100);
    recapObserver.observe(document.body,{childList:true,subtree:true});
    scheduleDualRecapRepair();
  }
  startRecapObserver();
  document.addEventListener('click',function(e){
    if(e.target&&e.target.closest&&e.target.closest('.mt9-tab[data-tab="recap"]')){
      setTimeout(scheduleDualRecapRepair,250);
    }
  });
  setTimeout(scheduleDualRecapRepair,900);
  setTimeout(scheduleDualRecapRepair,1800);

  function isAdmin(){try{return String(currentUser?.role||'').toLowerCase()==='admin'}catch(_){return false}}
  window.openCleanAdminRawEkskul=function(){
    if(!isAdmin())return;
    window.__cqAdminActive='raw-ekskul';
    var c=document.getElementById('content');
    if(!c)return;
    if(typeof window.renderAdminRawEkskul==='function')return window.renderAdminRawEkskul(c);
    c.innerHTML='<div class="card">Memuat Raw Ekskul...</div>';
    var n=0,t=setInterval(function(){
      if(typeof window.renderAdminRawEkskul==='function'){clearInterval(t);window.renderAdminRawEkskul(c)}
      else if(++n>40){clearInterval(t);c.innerHTML='<div class="card">Raw Ekskul belum dapat dimuat. Silakan muat ulang halaman.</div>'}
    },100);
  };
  function addAdminButton(){
    if(!isAdmin())return;
    var side=document.querySelector('.cq-admin-side');
    if(!side||side.querySelector('[data-admin-nav="raw-ekskul"]'))return;
    var ref=side.querySelector('[data-admin-nav="data-master"]');
    if(!ref)return;
    var b=document.createElement('button');
    b.type='button';b.className='cq-admin-nav'+(window.__cqAdminActive==='raw-ekskul'?' active':'');b.dataset.adminNav='raw-ekskul';
    b.innerHTML='<svg viewBox="0 0 24 24"><path d="M4 5h16v14H4z"/><path d="M8 9h8M8 13h8M8 17h5"/></svg><span>Raw Ekskul</span>';
    b.onclick=window.openCleanAdminRawEkskul;
    ref.insertAdjacentElement('afterend',b);
  }
  var mo=new MutationObserver(function(){setTimeout(addAdminButton,0)});
  document.addEventListener('DOMContentLoaded',function(){mo.observe(document.body,{childList:true,subtree:true});setTimeout(addAdminButton,400)});
  setTimeout(addAdminButton,1200);
})();
