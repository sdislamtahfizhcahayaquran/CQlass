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

/* CQlass — restore the original Walas Dashboard V3.
   This is the pre-analytics Wali Kelas dashboard: monthly attendance,
   mandatory-report compliance, class reward leaderboard, class discipline,
   and Kesiswaan escalation. Other roles keep their own current dashboard. */
(function(){
  'use strict';
  if(window.__cqWalasDashboardV3Restore)return;
  window.__cqWalasDashboardV3Restore=true;

  const norm=v=>String(v||'').trim().toLowerCase().replace(/[\s-]+/g,'_');
  function activeRole(){
    try{
      const u=(typeof currentUser!=='undefined'&&currentUser)||JSON.parse(localStorage.getItem('cqlass_user')||'{}')||{};
      return norm(u.role||u.primary_role||u.role_code||'');
    }catch(_){return ''}
  }
  if(typeof DASHBOARD_MODULE==='undefined'||typeof callApi!=='function')return;

  const currentDashboardRender=DASHBOARD_MODULE.render;
  let walasLoadToken=0;
  let wdLastData=null;

  function wdIcon(name){
    const p={
      users:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
      check:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12a9 9 0 1 1-5.3-8.2"/></svg>',
      star:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.1 8.3 22 9.3 17 14.1 18.2 21 12 17.8 5.8 21 7 14.1 2 9.3 8.9 8.3 12 2"/></svg>',
      alert:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.3 2.9 1.8 17a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 2.9a2 2 0 0 0-3.4 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>'
    };return p[name]||'';
  }

  function renderWDAttendanceChart(list){
    if(!list?.length)return '<div class="wd-empty">Belum ada data kehadiran untuk periode ini.</div>';
    const W=760,H=240,padL=44,padR=18,padT=22,padB=38;
    const innerW=W-padL-padR,innerH=H-padT-padB;
    const vals=list.map(x=>Math.max(0,Math.min(100,Number(x.persentaseHadir)||0)));
    const minRaw=Math.min(...vals),maxRaw=Math.max(...vals);
    const yMin=Math.max(0,Math.floor((minRaw-5)/5)*5),yMax=Math.min(100,Math.max(yMin+10,Math.ceil((maxRaw+3)/5)*5));
    const x=i=>padL+(list.length===1?innerW/2:(i/(list.length-1))*innerW);
    const y=v=>padT+innerH-((v-yMin)/(yMax-yMin))*innerH;
    const pts=list.map((d,i)=>`${x(i).toFixed(1)},${y(vals[i]).toFixed(1)}`).join(' ');
    const area=`${padL},${padT+innerH} ${pts} ${padL+innerW},${padT+innerH}`;
    const ticks=[];for(let i=0;i<=4;i++)ticks.push(yMin+(yMax-yMin)*i/4);
    return `<div class="wd-line-chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Grafik tren kehadiran siswa"><defs><linearGradient id="wdAreaGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="currentColor" stop-opacity=".20"/><stop offset="100%" stop-color="currentColor" stop-opacity=".02"/></linearGradient></defs>${ticks.map(t=>`<g><line x1="${padL}" y1="${y(t)}" x2="${W-padR}" y2="${y(t)}" class="wd-gridline"/><text x="${padL-9}" y="${y(t)+4}" text-anchor="end" class="wd-axis-text">${Math.round(t)}%</text></g>`).join('')}<polygon points="${area}" class="wd-area"/><polyline points="${pts}" class="wd-line"/>${list.map((d,i)=>`<g class="wd-point"><circle cx="${x(i)}" cy="${y(vals[i])}" r="5"/><title>${escapeHtml(d.tanggal||'')} — ${vals[i]}% hadir</title></g>`).join('')}${list.map((d,i)=>`<text x="${x(i)}" y="${H-14}" text-anchor="middle" class="wd-axis-text">${String(d.tanggal||'').slice(8,10)}</text>`).join('')}</svg><div class="wd-line-caption"><span>Hari</span><strong>Tren kehadiran 14 hari terakhir</strong></div></div>`;
  }

  function renderWDRankList(list,showClass){
    if(!list?.length)return '<div class="wd-empty">Belum ada data reward.</div>';
    return `<div class="wd-rank-list">${list.slice(0,10).map((s,i)=>`<div class="wd-rank-row"><div class="wd-medal ${i<3?'r'+(i+1):''}">${i+1}</div><div><div class="wd-rank-name">${escapeHtml(s.nama||'-')}</div><div class="wd-rank-meta">${showClass?escapeHtml(s.kelas||''):('NIS '+escapeHtml(s.nis||'-'))}</div></div><div class="wd-rank-score">${s.totalPoin||0} poin</div></div>`).join('')}</div>`;
  }

  function renderWDDisciplineRanking(list){
    if(!list?.length)return '<div class="wd-empty">Belum ada data wajib lapor bulan ini.</div>';
    return list.slice(0,10).map((x,i)=>`<div class="wd-discipline-row"><div class="wd-medal ${i<3?'r'+(i+1):''}">${i+1}</div><div><div class="wd-rank-name">${escapeHtml(x.kelas||'-')}</div><div class="wd-progress"><span style="width:${Math.max(0,Math.min(100,x.persentase||0))}%"></span></div><div class="wd-rank-meta">${x.hariLapor||0}/${x.hariWajib||0} hari lapor${x.dataCukup?'':' · data belum cukup'}</div></div><div class="wd-discipline-pct">${x.persentase||0}%</div></div>`).join('');
  }

  function renderWDEskalasiCards(list){
    if(!list?.length)return '<div class="wd-empty">Alhamdulillah, tidak ada siswa yang perlu dieskalasi saat ini.</div>';
    return list.map(s=>`<div class="wd-esc-card"><div><strong>${escapeHtml(s.nama||'-')}</strong><br><span>${escapeHtml(s.kelas||'')} · NIS ${escapeHtml(s.nis||'-')} · ${s.jumlahKejadian||0} kejadian</span></div><div class="wd-esc-points">${s.totalPoin||0} poin</div></div>`).join('');
  }

  function renderDashboardWalasData(d){
    const root=document.getElementById('wd-root');if(!root)return;
    const k=d.kehadiran||{},wajib=d.wajibLapor||{},esc=d.eskalasi||{count:0,data:[]},rank=d.reward||{kelas:[],sekolah:[]},kelasTertib=d.kelasTertib||[];
    const tanggalText=d.meta?.tanggalLabel||d.meta?.tanggal||'';
    const scope=d.meta?.scopeLabel||((typeof currentUser!=='undefined'&&currentUser?.kelas)||'Sekolah');
    root.innerHTML=`
      <div class="wd-hero"><div class="wd-hero-top"><div><div class="wd-eyebrow">Dashboard Wali Kelas</div><div class="wd-title">${escapeHtml(scope)}</div><div class="wd-sub">Ringkasan penting yang perlu dilihat hari ini — cepat, fokus, dan siap ditindaklanjuti.</div></div><div class="wd-date-pill">${escapeHtml(tanggalText)}</div></div></div>
      <div class="wd-kpis">
        <div class="wd-kpi success"><div class="wd-kpi-icon">${wdIcon('users')}</div><div class="wd-kpi-value">${Number(k.persentaseHadir||0).toFixed(1).replace('.0','')}%</div><div class="wd-kpi-label">Kehadiran bulan ini</div><div class="wd-kpi-note">${k.hadir||0} hadir dari ${k.total||0} catatan</div></div>
        <div class="wd-kpi ${wajib.sudahHariIni?'success':'danger'}"><div class="wd-kpi-icon">${wdIcon('check')}</div><div class="wd-kpi-value">${wajib.sudahHariIni?'Sudah':'Belum'}</div><div class="wd-kpi-label">Wajib lapor hari ini</div><div class="wd-kpi-note">Kepatuhan bulan ini ${wajib.persentase||0}%</div></div>
        <div class="wd-kpi"><div class="wd-kpi-icon">${wdIcon('star')}</div><div class="wd-kpi-value">${rank.kelas?.[0]?.totalPoin||0}</div><div class="wd-kpi-label">Poin reward tertinggi kelas</div><div class="wd-kpi-note">${escapeHtml(rank.kelas?.[0]?.nama||'Belum ada reward')}</div></div>
        <div class="wd-kpi danger clickable" onclick="toggleWDEskalasi()" role="button" tabindex="0"><div class="wd-kpi-icon">${wdIcon('alert')}</div><div class="wd-kpi-value">${esc.count||0}</div><div class="wd-kpi-label">Eskalasi ke Kesiswaan</div><div class="wd-kpi-note">Klik untuk melihat siswa ›</div></div>
      </div>
      <div class="wd-grid-2">
        <div class="wd-card"><div class="wd-card-head"><div><div class="wd-card-title">Kehadiran Siswa</div><div class="wd-card-sub">Persentase hadir per hari, 14 hari sekolah terakhir.</div></div><span class="wd-chip">${escapeHtml(scope)}</span></div><div id="wd-attendance-chart">${renderWDAttendanceChart(k.trend||[])}</div><div class="wd-attendance-legend"><span><b>${k.hadir||0}</b> Hadir</span><span><b>${k.sakit||0}</b> Sakit</span><span><b>${k.izin||0}</b> Izin</span><span><b>${k.alfa||0}</b> Alfa</span></div></div>
        <div class="wd-card"><div class="wd-card-head"><div><div class="wd-card-title">Kepatuhan Wajib Lapor</div><div class="wd-card-sub">Hari kerja yang sudah dicek melalui modul Kedisiplinan.</div></div></div><div class="wd-report-ring" style="--pct:${Math.max(0,Math.min(100,wajib.persentase||0))}"><strong>${wajib.persentase||0}%</strong></div><div class="wd-status-line"><span>Hari kerja berjalan</span><b>${wajib.hariWajib||0} hari</b></div><div class="wd-status-line"><span>Laporan tercatat</span><b>${wajib.hariLapor||0} hari</b></div><div class="wd-status-line"><span>Status hari ini</span><span class="wd-status-pill ${wajib.sudahHariIni?'ok':'no'}">${wajib.sudahHariIni?'TERLAPOR':'BELUM'}</span></div></div>
      </div>
      <div class="wd-leader-grid">
        <div class="wd-card"><div class="wd-card-head"><div><div class="wd-card-title">Leaderboard Reward</div><div class="wd-card-sub">10 siswa dengan poin positif tertinggi.</div></div><div class="wd-tabs"><button class="wd-tab active" id="wd-tab-kelas" onclick="switchWDLeaderboard('kelas')">Kelas Saya</button><button class="wd-tab" id="wd-tab-sekolah" onclick="switchWDLeaderboard('sekolah')">Sekolah</button></div></div><div id="wd-leader-list">${renderWDRankList(rank.kelas||[],false)}</div></div>
        <div class="wd-card"><div class="wd-card-head"><div><div class="wd-card-title">Kelas Paling Tertib</div><div class="wd-card-sub">Berdasarkan kelengkapan wajib lapor — data kosong tidak dianggap tertib.</div></div><span class="wd-chip">Bulan ini</span></div><div>${renderWDDisciplineRanking(kelasTertib)}</div></div>
      </div>
      <div class="wd-card" id="wd-escalation-box"><div class="wd-card-head"><div><div class="wd-card-title">Eskalasi ke Kesiswaan</div><div class="wd-card-sub">Hanya siswa yang sudah mencapai ambang eskalasi ${esc.ambang||50} poin.</div></div><button class="btn btn-sm btn-primary-light" onclick="toggleWDEskalasi()">${esc.count||0} siswa · Lihat detail</button></div><div class="wd-esc-drawer" id="wd-esc-drawer">${renderWDEskalasiCards(esc.data||[])}</div></div>`;
  }

  async function loadDashboardWalasFast(requestToken){
    const root=document.getElementById('wd-root');if(!root)return;
    try{
      const u=(typeof currentUser!=='undefined'&&currentUser)||{};
      const res=await callApi('getDashboardWalas',{username:u.username,kelas:u.kelas||'',role:u.role});
      if(requestToken!==walasLoadToken||activeRole()!=='walas'||(typeof activeModule!=='undefined'&&activeModule!=='dashboard')||!document.getElementById('wd-root'))return;
      if(!res?.success)throw new Error(res?.error||'dashboard_gagal');
      wdLastData=res;
      renderDashboardWalasData(res);
    }catch(err){
      root.innerHTML+=`<div class="card"><div class="empty-state"><div class="icon">—</div>Dashboard belum dapat dimuat.<br><span style="font-size:11px">${escapeHtml(err?.message||'')}</span></div></div>`;
      root.querySelector('.wd-skeleton')?.remove();
    }
  }

  function renderWalasDashboard(content){
    const requestToken=++walasLoadToken;
    const u=(typeof currentUser!=='undefined'&&currentUser)||{};
    const kelasLabel=u.kelas||'Kelas';
    content.innerHTML=`<div id="wd-root" class="wd-shell"><div class="wd-hero"><div class="wd-hero-top"><div><div class="wd-eyebrow">Dashboard Kelas</div><div class="wd-title">Assalamu'alaikum, ${escapeHtml(u.nama||'Wali Kelas')} 👋</div><div class="wd-sub">Pantau ${escapeHtml(kelasLabel)} tanpa perlu membuka banyak menu.</div></div><div class="wd-date-pill" id="wd-date">Hari ini</div></div></div><div class="wd-skeleton"></div></div>`;
    loadDashboardWalasFast(requestToken);
  }

  window.switchWDLeaderboard=function(mode){
    if(!wdLastData)return;
    document.getElementById('wd-tab-kelas')?.classList.toggle('active',mode==='kelas');
    document.getElementById('wd-tab-sekolah')?.classList.toggle('active',mode==='sekolah');
    const el=document.getElementById('wd-leader-list');
    if(el)el.innerHTML=renderWDRankList(wdLastData.reward?.[mode]||[],mode==='sekolah');
  };
  window.toggleWDEskalasi=function(){
    const el=document.getElementById('wd-esc-drawer');if(!el)return;
    el.classList.toggle('open');
    if(el.classList.contains('open'))document.getElementById('wd-escalation-box')?.scrollIntoView({behavior:'smooth',block:'nearest'});
  };

  DASHBOARD_MODULE.render=function(content){
    if(activeRole()==='walas')return renderWalasDashboard(content);
    return currentDashboardRender.apply(this,arguments);
  };
  window.__cqWalasDashboardV3Render=renderWalasDashboard;
})();
