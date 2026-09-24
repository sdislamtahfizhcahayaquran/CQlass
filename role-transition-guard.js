/* CQlass — role transition guard: prevent wrong sidebar/content flash before Kabid Tahfizh shell is ready */
(function(){
  'use strict';
  if(window.__cqRoleTransitionGuardV1||typeof enterApp!=='function')return;
  window.__cqRoleTransitionGuardV1=true;
  const norm=v=>String(v||'').trim().toLowerCase().replace(/[\s-]+/g,'_');
  const role=()=>{try{return norm((typeof currentUser!=='undefined'&&currentUser?.role)||JSON.parse(localStorage.getItem('cqlass_user')||'{}').role||'')}catch(_){return''}};
  const old=enterApp;
  enterApp=function(){
    const isKabid=role()==='kabid_tahfizh';
    const sidebar=document.getElementById('sidebar'),content=document.getElementById('content');
    if(isKabid){
      if(sidebar)sidebar.style.visibility='hidden';
      if(content)content.style.visibility='hidden';
    }
    const out=old.apply(this,arguments);
    if(isKabid){
      let tries=0;
      const reveal=()=>{
        tries++;
        const ready=typeof window.cqStabilizeKabidTahfizh==='function';
        if(ready){try{window.cqStabilizeKabidTahfizh(true)}catch(_){}}
        if(ready||tries>=20){
          if(sidebar)sidebar.style.visibility='';
          if(content)content.style.visibility='';
          return;
        }
        setTimeout(reveal,50);
      };
      setTimeout(reveal,0);
    }
    return out;
  };
  enterApp.__cqRoleTransitionGuardV1=true;
})();

/* Walas dashboard restore.
   app.js contains a school-wide analytics dashboard intended for monitoring roles.
   It must not replace the operational Wali Kelas dashboard. Walas is restored to
   the original CQlass dashboard: today's class status, tasks, quick actions,
   attendance trend, behaviour summary, and inspirational student/class panels. */
(function(){
  'use strict';
  if(window.__cqWalasDashboardLegacyRestoreV1)return;
  window.__cqWalasDashboardLegacyRestoreV1=true;

  const norm=v=>String(v||'').trim().toLowerCase().replace(/[\s-]+/g,'_');
  function activeRole(){
    try{
      const u=(typeof currentUser!=='undefined'&&currentUser)||JSON.parse(localStorage.getItem('cqlass_user')||'{}')||{};
      return norm(u.role||u.primary_role||u.role_code||'');
    }catch(_){return ''}
  }

  if(typeof loadRoleDashboard!=='function'||typeof roleDashboardRequest!=='function')return;
  const analyticsLoadRoleDashboard=loadRoleDashboard;

  function renderWalasLegacy(d){
    const root=document.getElementById('rd-root');if(!root)return;
    const role='walas';
    const name=(typeof currentUser!=='undefined'&&(currentUser?.nama||currentUser?.username))||'Pengguna';
    const s=d?.summary||{},scope=d?.scope_label||'',tasks=d?.tasks||[];

    root.innerHTML=`
      <div class="rd-hero">
        <div class="rd-eyebrow">${escapeHtml(typeof rdGreeting==='function'?rdGreeting(role):'Wali Kelas')}</div>
        <div class="rd-title">Assalamu'alaikum, ${escapeHtml(name)}</div>
        <div class="rd-sub">${escapeHtml(scope)} · ${escapeHtml(d?.date_label||'Hari ini')}</div>
      </div>

      <div class="rd-kpis">
        <div class="rd-kpi"><div class="rd-kpi-icon">${rdIcon('users')}</div><strong>${s.students||0}</strong><span>Siswa Kelas</span><small>${escapeHtml(scope)}</small></div>
        <div class="rd-kpi"><div class="rd-kpi-icon">${rdIcon('check')}</div><strong>${s.attendance_pct==null?'-':String(s.attendance_pct).replace('.',',')+'%'}</strong><span>Kehadiran Hari Ini</span><small>${s.attendance_filled?'Sudah ada input':'Belum ada input hari ini'}</small></div>
        <div class="rd-kpi"><div class="rd-kpi-icon">${rdIcon('gift')}</div><strong>${s.reward_points_month||0}</strong><span>Reward Bulan Ini</span><small>Data yang sudah diinput</small></div>
        <div class="rd-kpi"><div class="rd-kpi-icon">${rdIcon('alert')}</div><strong>${s.violation_points_month||0}</strong><span>Pelanggaran Bulan Ini</span><small>Data yang sudah diinput</small></div>
        <div class="rd-kpi"><div class="rd-kpi-icon">${rdIcon('alert')}</div><strong>${s.escalation_count||0}</strong><span>Perlu Penanganan</span><small>Termasuk absen 3 hari berturut</small></div>
      </div>

      <div class="rd-grid2">
        <div class="rd-card"><div class="rd-card-head"><div><div class="rd-card-title">${rdIcon('chart',16)} Tren Kehadiran</div><div class="rd-card-sub">10 hari sekolah terakhir yang sudah mempunyai input Morning Talk.</div></div></div>${rdLineChart(d?.attendance_trend||[])}</div>
        <div class="rd-card"><div class="rd-card-head"><div><div class="rd-card-title">${rdIcon('chart',16)} Perilaku Bulan Ini</div><div class="rd-card-sub">Perbandingan poin Reward dan Pelanggaran dari data yang terisi.</div></div></div>${rdPointBars(s.violation_points_month||0,s.reward_points_month||0)}</div>
      </div>

      <div class="rd-grid2">
        <div class="rd-card"><div class="rd-card-head"><div><div class="rd-card-title">Tugas Hari Ini</div><div class="rd-card-sub">Reminder tetap muncul sampai tugas selesai.</div></div></div>${rdTasks(tasks)}</div>
        <div class="rd-card"><div class="rd-card-head"><div><div class="rd-card-title">Aksi Cepat</div><div class="rd-card-sub">Masuk langsung ke pekerjaan utama.</div></div></div><div class="rd-quick">
          <button onclick="setActiveModule('absensi')">${rdIcon('check',15)} Morning Talk</button>
          <button onclick="setActiveModule('kedisiplinan')">${rdIcon('alert',15)} Kedisiplinan</button>
          <button onclick="setActiveModule('reward')">${rdIcon('gift',15)} Reward</button>
        </div></div>
      </div>

      <div class="rd-grid3">
        <div class="rd-card"><div class="rd-card-head"><div><div class="rd-card-title">${rdIcon('star',16)} 5 Siswa Inspiratif di Kelas Saya</div><div class="rd-card-sub">Hanya siswa yang memiliki data input valid pada periode berjalan.</div></div></div>${rdLeaderboard(d?.class_student_leaderboard||[],'Belum ada input yang cukup untuk menampilkan siswa inspiratif.')}</div>
        <div class="rd-card"><div class="rd-card-head"><div><div class="rd-card-title">${rdIcon('trophy',16)} 5 Kelas Inspiratif</div><div class="rd-card-sub">Kelas tanpa aktivitas input tidak dimasukkan. Skor mempertimbangkan data yang tersedia dan kelengkapan input.</div></div></div>${rdLeaderboard(d?.class_leaderboard||[],'Belum ada cukup kelas dengan data input untuk membentuk Top 5.')}</div>
        <div class="rd-card"><div class="rd-card-head"><div><div class="rd-card-title">${rdIcon('star',16)} 5 Siswa Inspiratif Sekolah</div><div class="rd-card-sub">Untuk motivasi positif; tidak menampilkan ranking terbawah.</div></div></div>${rdLeaderboard(d?.student_leaderboard||[],'Belum ada data siswa sekolah yang cukup.')}</div>
      </div>
    `;
  }

  loadRoleDashboard=async function(requestToken,force=false){
    if(activeRole()!=='walas')return analyticsLoadRoleDashboard.apply(this,arguments);
    const root=document.getElementById('rd-root');if(!root)return;
    try{
      let d;
      if(!force&&typeof roleDashboardCache!=='undefined'&&roleDashboardCache&&typeof roleDashboardCacheAt!=='undefined'&&Date.now()-roleDashboardCacheAt<45000){
        d=roleDashboardCache;
      }else{
        d=await roleDashboardRequest('dashboard');
        if(typeof roleDashboardCache!=='undefined')roleDashboardCache=d;
        if(typeof roleDashboardCacheAt!=='undefined')roleDashboardCacheAt=Date.now();
      }
      if(typeof dashboardLoadToken!=='undefined'&&requestToken!==dashboardLoadToken)return;
      if(typeof activeModule!=='undefined'&&activeModule!=='dashboard')return;
      renderWalasLegacy(d);
    }catch(e){
      root.innerHTML=`<div class="rd-card"><div class="rd-alert-row"><div class="rd-alert-title">${rdIcon('alert',16)} Dashboard belum dapat dimuat</div><div class="rd-alert-sub">${escapeHtml(e?.message||'Terjadi kendala')}</div></div></div>`;
    }
  };
  loadRoleDashboard.__cqWalasDashboardLegacyRestoreV1=true;
})();