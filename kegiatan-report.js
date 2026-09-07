/* CQlass — Kabid Kegiatan V2: single source of truth untuk dashboard, laporan rinci, dan ekskul */
(function(){
  'use strict';

  const ACTIVITY_URL = SUPABASE_URL + '/functions/v1/activity-report';
  const EXKUL_URL = SUPABASE_URL + '/functions/v1/activity-extracurricular';
  const CATEGORY = {
    MD:'Market Day', NATIVE:'Native Teacher', JUMSIH:'Jumsih', EKSKUL:'Ekskul',
    JUMAT_BERBAGI:"Jum'at Berbagi", PEKAN_BAHASA:'Pekan Bahasa', TASMI:"Tasmi' Syahriyyah",
    BUNDAKU_GURUKU:'Bundaku Guruku', LAINNYA:'Kegiatan Lainnya'
  };
  const STATUS = {
    TERJADWAL:'Terjadwal', TERLAKSANA:'Terlaksana', DITUNDA:'Ditunda',
    DIJADWALKAN_ULANG:'Dijadwalkan Ulang', BATAL:'Batal'
  };
  const PROGRAMS = [
    {key:'MD',label:'Market Day',cats:['MD']},
    {key:'NATIVE',label:'Native Teacher',cats:['NATIVE']},
    {key:'JUMSIH',label:'Jumsih',cats:['JUMSIH']},
    {key:'EKSKUL',label:'Ekskul',cats:['EKSKUL']},
    {key:'JUMAT_BERBAGI',label:"Jum'at Berbagi",cats:['JUMAT_BERBAGI']},
    {key:'PEKAN_BAHASA',label:'Pekan Bahasa',cats:['PEKAN_BAHASA']},
    {key:'LAINNYA',label:'Kegiatan Lainnya',cats:['TASMI','BUNDAKU_GURUKU','LAINNYA']}
  ];

  const KR = {
    boot:null, bootAt:0, month:'', detail:null, exkul:null, exkulRows:[], exkulState:'unknown',
    filter:{month:'',program:'ALL',status:'ALL',scope:'ALL'}, languageStats:new Map()
  };

  function esc(v){ return escapeHtml(String(v == null ? '' : v)); }
  function role(){ return String(currentUser?.role||'').toLowerCase(); }
  function username(){ return String(currentUser?.username||'').toLowerCase(); }
  function isKabid(){ return role()==='kegiatan'; }
  function isPimpinan(){ return role()==='pimpinan'; }
  function isLanguagePIC(){ return ['dila','saad'].includes(username()); }
  function isTasmiPIC(){ return username()==='fatih' || role()==='tahfizh'; }
  function canUseModule(){ return isKabid() || isPimpinan() || isLanguagePIC() || isTasmiPIC(); }
  function canSeeExkul(){ return isKabid() || isPimpinan(); }
  function canEditExkul(){ return isKabid(); }
  function jakartaToday(){ return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()); }
  function currentYM(){ return jakartaToday().slice(0,7); }
  function fmtDate(v){ if(!v)return'—'; try{return new Intl.DateTimeFormat('id-ID',{weekday:'short',day:'numeric',month:'short',year:'numeric'}).format(new Date(v+'T12:00:00+07:00'));}catch(_){return v;} }
  function monthLabel(ym){ if(!ym)return''; const [y,m]=ym.split('-').map(Number); return new Intl.DateTimeFormat('id-ID',{month:'long',year:'numeric'}).format(new Date(y,m-1,1)); }
  function stateOf(e){
    if(e.status==='TERLAKSANA')return{key:'TERLAKSANA',label:'Terlaksana',cls:'done'};
    if(e.status==='DITUNDA')return{key:'DITUNDA',label:'Ditunda',cls:'warn'};
    if(e.status==='DIJADWALKAN_ULANG')return{key:'DIJADWALKAN_ULANG',label:'Dijadwalkan Ulang',cls:'warn'};
    if(e.status==='BATAL')return{key:'BATAL',label:'Batal',cls:'muted'};
    if(!e.report_filled_at && String(e.planned_date||'') < jakartaToday()) return{key:'BELUM_DILAPORKAN',label:'Belum Dilaporkan',cls:'late'};
    return{key:'TERJADWAL',label:'Terjadwal',cls:'scheduled'};
  }
  function programOf(cat){ return PROGRAMS.find(p=>p.cats.includes(cat))?.key || 'LAINNYA'; }
  function programLabel(key){ return PROGRAMS.find(p=>p.key===key)?.label || key; }

  async function request(url,action,payload={}){
    const token=getAuthToken(); if(!token)throw new Error('Sesi login tidak ditemukan.');
    const ctl=new AbortController(), timer=setTimeout(()=>ctl.abort(),35000);
    try{
      const r=await fetch(url,{method:'POST',signal:ctl.signal,headers:{
        'Content-Type':'application/json','apikey':SUPABASE_PUBLISHABLE_KEY,
        'Authorization':'Bearer '+SUPABASE_PUBLISHABLE_KEY,'x-session-token':token
      },body:JSON.stringify({action,...payload})});
      const raw=await r.text(); let d={}; try{d=raw?JSON.parse(raw):{}}catch(_){throw new Error('Respons sistem kegiatan tidak valid.');}
      if(!r.ok||d.success===false){
        const map={forbidden:'Akun ini tidak memiliki akses ke data tersebut.',session_invalid:'Sesi login sudah berakhir.',photo_limit:'Maksimal 10 foto per kegiatan.',image_too_large:'Foto masih terlalu besar setelah diproses.',readonly:'Data hanya dapat diubah Kabid Kegiatan.',student_internal:'Siswa sudah tercatat sebagai peserta ekskul internal.',invalid_status:'Status kegiatan tidak valid.'};
        throw new Error(map[d.error]||d.error||'Data belum berhasil diproses.');
      }
      return d;
    }catch(e){ if(e?.name==='AbortError')throw new Error('Server terlalu lama merespons.'); throw e; }
    finally{clearTimeout(timer);}
  }
  const act=(a,p)=>request(ACTIVITY_URL,a,p);
  const exk=(a,p)=>request(EXKUL_URL,a,p);

  function injectStyle(){
    if(document.getElementById('kegiatan-v2-style'))return;
    const s=document.createElement('style'); s.id='kegiatan-v2-style';
    s.textContent=`
    .kv2{max-width:1400px;margin:0 auto}.kv2-head{display:flex;justify-content:space-between;align-items:flex-start;gap:14px;flex-wrap:wrap;margin-bottom:16px}.kv2-head h2{margin:0;font-size:24px;color:var(--text)}.kv2-head p{margin:5px 0 0;font-size:11px;color:var(--muted)}
    .kv2-actions,.kv2-filters{display:flex;gap:7px;align-items:center;flex-wrap:wrap}.kv2-select,.kv2-input,.kv2-textarea{border:1px solid var(--border);background:#fff;border-radius:10px;padding:9px 10px;font:inherit;font-size:11px;color:var(--text);outline:none}.kv2-select:focus,.kv2-input:focus,.kv2-textarea:focus{border-color:var(--primary);box-shadow:0 0 0 3px rgba(10,110,110,.08)}
    .kv2-btn{border:0;border-radius:9px;background:var(--primary);color:#fff;padding:9px 11px;font:inherit;font-size:10px;font-weight:850;cursor:pointer}.kv2-btn.secondary{background:#eaf4f3;color:#1f6662}.kv2-btn.ghost{background:#fff;color:var(--text);border:1px solid var(--border)}.kv2-btn:disabled{opacity:.55;cursor:not-allowed}
    .kv2-kpis{display:grid;grid-template-columns:repeat(4,minmax(130px,1fr));gap:10px;margin-bottom:14px}.kv2-kpi{background:#fff;border:1px solid var(--border);border-radius:14px;padding:14px}.kv2-kpi strong{display:block;font-size:25px;line-height:1;color:#075b59}.kv2-kpi span{display:block;font-size:10px;font-weight:850;color:var(--muted);margin-top:7px}.kv2-kpi small{display:block;font-size:9px;color:var(--muted);margin-top:3px}
    .kv2-grid2{display:grid;grid-template-columns:1.2fr .8fr;gap:12px;margin-bottom:12px}.kv2-card{background:#fff;border:1px solid var(--border);border-radius:15px;padding:15px}.kv2-title{font-size:13px;font-weight:900;margin-bottom:3px}.kv2-sub{font-size:9.5px;color:var(--muted);margin-bottom:11px;line-height:1.45}
    .kv2-programs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.kv2-program{border:1px solid var(--border);background:#fff;border-radius:12px;padding:11px;text-align:left;cursor:pointer}.kv2-program:hover{border-color:#9fc8c5;background:#f8fbfb}.kv2-program b{display:block;font-size:11px}.kv2-program strong{display:block;font-size:19px;color:#075b59;margin-top:6px}.kv2-program span{font-size:9px;color:var(--muted)}
    .kv2-follow{display:grid;gap:7px}.kv2-follow-item{border:1px solid var(--border);border-radius:10px;padding:9px 10px;display:flex;justify-content:space-between;gap:10px;align-items:center}.kv2-follow-item b{font-size:10.5px}.kv2-follow-item span{font-size:9px;color:var(--muted)}.kv2-dot{width:8px;height:8px;border-radius:50%;background:#d45b49;flex:none}.kv2-follow-main{display:flex;align-items:flex-start;gap:8px;min-width:0}.kv2-empty{text-align:center;padding:22px;color:var(--muted);font-size:11px}
    .kv2-exgrid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.kv2-exstat{border:1px solid var(--border);background:#fff;border-radius:11px;padding:11px;text-align:left;cursor:pointer}.kv2-exstat strong{display:block;font-size:21px;color:#075b59}.kv2-exstat span{font-size:9px;font-weight:850;color:var(--muted)}
    .kv2-upcoming{display:grid;gap:6px}.kv2-up{display:grid;grid-template-columns:92px 1fr auto;gap:10px;align-items:center;padding:8px 0;border-bottom:1px solid var(--border)}.kv2-up:last-child{border-bottom:0}.kv2-up time{font-size:9.5px;font-weight:850;color:#176d68}.kv2-up b{font-size:10.5px}.kv2-up span{font-size:9px;color:var(--muted)}
    .kv2-tablewrap{overflow:auto;border:1px solid var(--border);border-radius:12px;background:#fff}.kv2-table{width:100%;border-collapse:collapse;min-width:980px}.kv2-table th,.kv2-table td{padding:9px 10px;border-bottom:1px solid var(--border);text-align:left;vertical-align:top;font-size:10.5px}.kv2-table th{position:sticky;top:0;z-index:2;background:#f4f8f8;font-size:9px;color:var(--muted);text-transform:uppercase}.kv2-table tr:last-child td{border-bottom:0}.kv2-table tr:hover td{background:#fafcfc}
    .kv2-badge{display:inline-flex;padding:5px 8px;border-radius:999px;font-size:9px;font-weight:900;background:#edf3f3;color:#5d7070}.kv2-badge.done{background:#e8f7ef;color:#357352}.kv2-badge.warn{background:#fff2de;color:#936500}.kv2-badge.late{background:#fff0ec;color:#ad4c39}.kv2-badge.scheduled{background:#eef6fb;color:#456c87}.kv2-badge.muted{background:#eee;color:#777}
    .kv2-overlay{position:fixed;inset:0;background:rgba(13,39,38,.46);z-index:99990;display:none;align-items:center;justify-content:center;padding:18px}.kv2-overlay.open{display:flex}.kv2-modal{width:min(1020px,96vw);max-height:92vh;overflow:auto;background:#fff;border-radius:18px;box-shadow:0 24px 70px rgba(0,0,0,.22)}.kv2-mhead{position:sticky;top:0;z-index:4;background:#fff;border-bottom:1px solid var(--border);padding:15px 17px;display:flex;justify-content:space-between;gap:12px}.kv2-mtitle{font-size:16px;font-weight:900}.kv2-close{border:0;background:#eef4f4;width:32px;height:32px;border-radius:10px;font-size:20px;cursor:pointer}.kv2-mbody{padding:16px}.kv2-form{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.kv2-field label{display:block;font-size:9px;font-weight:850;text-transform:uppercase;color:var(--muted);margin-bottom:5px}.kv2-field .kv2-input,.kv2-field .kv2-select,.kv2-field .kv2-textarea{width:100%;box-sizing:border-box}.kv2-span3{grid-column:1/-1}.kv2-read{min-height:37px;display:flex;align-items:center;padding:0 10px;border:1px solid var(--border);background:#f7f9f9;border-radius:9px;font-size:10.5px;font-weight:700}.kv2-textarea{min-height:78px;resize:vertical}
    .kv2-att{display:flex;gap:10px;align-items:center;flex-wrap:wrap;border-radius:10px;background:#f3f9f8;padding:10px}.kv2-att b{font-size:11px}.kv2-att span{font-size:9.5px;color:var(--muted)}.kv2-photos{display:grid;grid-template-columns:repeat(5,1fr);gap:7px;margin:8px 0}.kv2-photo{aspect-ratio:1.2;border-radius:9px;overflow:hidden;background:#edf3f3}.kv2-photo img{width:100%;height:100%;display:block;object-fit:cover}.kv2-upload{border:1px dashed #9cc8c4;border-radius:10px;padding:11px;background:#f8fbfb}.kv2-upload input{width:100%;font-size:10px}.kv2-note{font-size:9px;color:var(--muted);margin-top:5px}
    .kv2-langwrap{max-height:340px;overflow:auto;border:1px solid var(--border);border-radius:10px}.kv2-lang{width:100%;border-collapse:collapse;min-width:720px}.kv2-lang th,.kv2-lang td{padding:7px;border-bottom:1px solid var(--border);font-size:9.5px}.kv2-lang th{position:sticky;top:0;background:#f3f8f8;z-index:1;color:var(--muted);font-size:8.8px}.kv2-lang input[type=text],.kv2-lang select{width:100%;box-sizing:border-box;border:1px solid var(--border);border-radius:7px;padding:6px;font:inherit;font-size:9px}
    .kv2-tabs{display:flex;gap:5px;flex-wrap:wrap;margin-bottom:10px}.kv2-tab{border:1px solid var(--border);background:#fff;border-radius:999px;padding:7px 10px;font:inherit;font-size:9.5px;font-weight:850;color:var(--muted);cursor:pointer}.kv2-tab.active{background:var(--primary);border-color:var(--primary);color:#fff}.kv2-student-action{display:flex;gap:5px;align-items:center;flex-wrap:wrap}.kv2-student-action input{min-width:145px}
    @media(max-width:980px){.kv2-grid2{grid-template-columns:1fr}.kv2-programs{grid-template-columns:repeat(2,1fr)}.kv2-kpis,.kv2-exgrid{grid-template-columns:repeat(2,1fr)}.kv2-form{grid-template-columns:1fr 1fr}.kv2-span3{grid-column:1/-1}}
    @media(max-width:640px){.kv2-kpis,.kv2-exgrid,.kv2-programs{grid-template-columns:1fr 1fr}.kv2-form{grid-template-columns:1fr}.kv2-span3{grid-column:auto}.kv2-photos{grid-template-columns:repeat(2,1fr)}.kv2-up{grid-template-columns:1fr}.kv2-head h2{font-size:21px}}
    @media print{body.kv2-printing .topbar,body.kv2-printing .sidebar,body.kv2-printing .kv2-actions,body.kv2-printing .kv2-filters{display:none!important}body.kv2-printing .layout{display:block!important}body.kv2-printing .content{padding:0!important;margin:0!important;width:100%!important}.kv2-card,.kv2-kpi{break-inside:avoid}}
    `;
    document.head.appendChild(s);
  }

  function ensureModal(){
    if(document.getElementById('kv2-overlay'))return;
    const o=document.createElement('div');o.id='kv2-overlay';o.className='kv2-overlay';
    o.innerHTML='<div class="kv2-modal" id="kv2-modal"></div>';
    o.addEventListener('click',e=>{if(e.target===o)kv2CloseModal();});document.body.appendChild(o);
  }

  async function bootstrap(force=false){
    if(!force&&KR.boot&&Date.now()-KR.bootAt<30000)return KR.boot;
    KR.boot=await act('bootstrap'); KR.bootAt=Date.now();
    const months=[...new Set((KR.boot.events||[]).map(e=>String(e.planned_date||'').slice(0,7)).filter(Boolean))].sort();
    if(!KR.month)KR.month=months.includes(currentYM())?currentYM():(months[0]||currentYM());
    if(!KR.filter.month)KR.filter.month=KR.month;
    return KR.boot;
  }
  async function loadExkul(force=false){
    if(!canSeeExkul())return null;
    if(KR.exkul&&!force)return KR.exkul;
    const d=await exk('summary'); KR.exkul=d.summary||null; return KR.exkul;
  }

  function removeDuplicateInfoForKegiatan(){
    try{
      const info=MODULE_GROUPS.find(g=>g.id==='info'); if(!info)return;
      info.roles=(info.roles||[]).filter(r=>r!=='kegiatan');
      (info.items||[]).forEach(it=>{it.roles=(it.roles||[]).filter(r=>r!=='kegiatan');});
    }catch(_){ }
  }
  function installCleanMenu(){
    try{
      for(let i=MODULE_GROUPS.length-1;i>=0;i--){if(['kegiatan_report','kegiatan-v2','kegiatan'].includes(MODULE_GROUPS[i]?.id))MODULE_GROUPS.splice(i,1);}
      if(!currentUser||!canUseModule())return;
      let items=[];
      if(isKabid()) items=[
        {id:'kegiatan-rinci',label:'Laporan Rinci',roles:['kegiatan'],built:true,render:renderKegiatanRinci},
        {id:'kegiatan-ekskul',label:'Data Ekskul',roles:['kegiatan'],built:true,render:renderKegiatanEkskul}
      ];
      else if(isPimpinan()) items=[
        {id:'kegiatan-rinci',label:'Laporan Rinci',roles:['pimpinan'],built:true,render:renderKegiatanRinci},
        {id:'kegiatan-ekskul',label:'Data Ekskul',roles:['pimpinan'],built:true,render:renderKegiatanEkskul}
      ];
      else if(isLanguagePIC()) items=[{id:'kegiatan-rinci',label:'Pekan Bahasa',roles:[role()],built:true,render:renderKegiatanRinci}];
      else if(isTasmiPIC()) items=[{id:'kegiatan-rinci',label:"Tasmi' Syahriyyah",roles:[role()],built:true,render:renderKegiatanRinci}];
      if(items.length)MODULE_GROUPS.push({id:'kegiatan-v2',label:'Kegiatan',roles:[role()],items});
    }catch(e){console.error('Kegiatan menu:',e);}
  }

  const originalDashboardRender=(typeof DASHBOARD_MODULE!=='undefined')?DASHBOARD_MODULE.render:null;
  function syncNavigation(){
    try{
      removeDuplicateInfoForKegiatan();
      if(typeof DASHBOARD_MODULE!=='undefined'&&Array.isArray(DASHBOARD_MODULE.roles)&&!DASHBOARD_MODULE.roles.includes('kegiatan'))DASHBOARD_MODULE.roles.push('kegiatan');
      installCleanMenu();
      if(typeof DASHBOARD_MODULE!=='undefined')DASHBOARD_MODULE.render=isKabid()?renderKegiatanDashboard:(originalDashboardRender||DASHBOARD_MODULE.render);
    }catch(e){console.error('Kegiatan navigation:',e);}
  }

  if(typeof renderSidebar==='function'&&!window.__kv2SidebarPatched){
    window.__kv2SidebarPatched=true;
    const original=renderSidebar;
    renderSidebar=function(){syncNavigation();return original.apply(this,arguments);};
  }
  removeDuplicateInfoForKegiatan();
  try{if(typeof DASHBOARD_MODULE!=='undefined'&&Array.isArray(DASHBOARD_MODULE.roles)&&!DASHBOARD_MODULE.roles.includes('kegiatan'))DASHBOARD_MODULE.roles.push('kegiatan');}catch(_){ }

  window.renderKegiatanDashboard=function(content){
    injectStyle();ensureModal();
    content.innerHTML='<div class="kv2" id="kv2-root"><div class="kv2-card"><span class="spinner"></span> Memuat dashboard kegiatan...</div></div>';
    (async()=>{try{await Promise.all([bootstrap(),loadExkul()]);renderDashboardBody();}catch(e){document.getElementById('kv2-root').innerHTML='<div class="kv2-card kv2-empty">'+esc(e.message)+'</div>';}})();
  };

  function monthOptions(events,selected){
    const months=[...new Set(events.map(e=>String(e.planned_date||'').slice(0,7)).filter(Boolean))].sort();
    return months.map(m=>`<option value="${esc(m)}" ${m===selected?'selected':''}>${esc(monthLabel(m))}</option>`).join('');
  }
  window.kv2DashboardMonth=function(v){KR.month=v;renderDashboardBody();};
  window.kv2GoRinci=function(program='ALL'){
    KR.filter.month=KR.month||currentYM();KR.filter.program=program||'ALL';KR.filter.status='ALL';KR.filter.scope='ALL';
    if(typeof setActiveModule==='function')setActiveModule('kegiatan-rinci');
  };
  window.kv2Print=function(){document.body.classList.add('kv2-printing');window.print();setTimeout(()=>document.body.classList.remove('kv2-printing'),300);};

  function renderDashboardBody(){
    const root=document.getElementById('kv2-root');if(!root||!KR.boot)return;
    const events=KR.boot.events||[], rows=events.filter(e=>String(e.planned_date||'').startsWith(KR.month));
    const done=rows.filter(e=>e.status==='TERLAKSANA').length;
    const late=rows.filter(e=>stateOf(e).key==='BELUM_DILAPORKAN').length;
    const future=rows.filter(e=>stateOf(e).key==='TERJADWAL').length;
    const follow=rows.filter(e=>['BELUM_DILAPORKAN','DITUNDA','DIJADWALKAN_ULANG'].includes(stateOf(e).key)).slice(0,8);
    const up=events.filter(e=>String(e.planned_date||'')>=jakartaToday()&&e.status!=='BATAL').slice(0,6);
    const pb=rows.filter(e=>e.category==='PEKAN_BAHASA');
    const x=KR.exkul||{internal:0,external:0,none:0,unknown:0};
    root.innerHTML=`
      <div class="kv2-head"><div><h2>Dashboard Kabid Kegiatan</h2><p>Ringkasan target, realisasi, dokumentasi, dan tindak lanjut kegiatan sekolah.</p></div><div class="kv2-actions"><select class="kv2-select" onchange="kv2DashboardMonth(this.value)">${monthOptions(events,KR.month)}</select><button class="kv2-btn secondary" onclick="kv2GoRinci()">Laporan Rinci</button><button class="kv2-btn ghost" onclick="kv2Print()">Cetak Laporan</button></div></div>
      <div class="kv2-kpis">
        <div class="kv2-kpi"><strong>${rows.length}</strong><span>Target Kegiatan</span><small>${esc(monthLabel(KR.month))}</small></div>
        <div class="kv2-kpi"><strong>${done}</strong><span>Terlaksana</span><small>Sudah direalisasikan</small></div>
        <div class="kv2-kpi"><strong>${late}</strong><span>Belum Dilaporkan</span><small>Jadwal sudah lewat</small></div>
        <div class="kv2-kpi"><strong>${future}</strong><span>Masih Terjadwal</span><small>Belum jatuh tempo</small></div>
      </div>
      <div class="kv2-grid2">
        <div class="kv2-card"><div class="kv2-title">Capaian Per Jenis Kegiatan</div><div class="kv2-sub">Klik program untuk membuka laporan rinci yang sudah difilter.</div><div class="kv2-programs">${PROGRAMS.map(p=>{const a=rows.filter(e=>p.cats.includes(e.category)),d=a.filter(e=>e.status==='TERLAKSANA').length;return`<button class="kv2-program" onclick="kv2GoRinci('${p.key}')"><b>${esc(p.label)}</b><strong>${d} / ${a.length}</strong><span>terlaksana / target</span></button>`}).join('')}</div></div>
        <div class="kv2-card"><div class="kv2-title">Perlu Tindak Lanjut</div><div class="kv2-sub">Hanya kegiatan yang membutuhkan perhatian.</div><div class="kv2-follow">${follow.length?follow.map(e=>`<div class="kv2-follow-item"><div class="kv2-follow-main"><i class="kv2-dot"></i><div><b>${esc(e.title)}</b><br><span>${esc(fmtDate(e.planned_date))} · ${esc(stateOf(e).label)}</span></div></div><button class="kv2-btn ghost" onclick="kv2OpenEvent('${esc(e.id)}')">Buka</button></div>`).join(''):'<div class="kv2-empty">Tidak ada tindak lanjut mendesak.</div>'}</div></div>
      </div>
      ${canSeeExkul()?`<div class="kv2-card" style="margin-bottom:12px"><div class="kv2-title">Status Ekskul Siswa</div><div class="kv2-sub">Data internal dibaca dari sistem. Kabid hanya melengkapi siswa yang belum memiliki status.</div><div class="kv2-exgrid"><button class="kv2-exstat" onclick="kv2OpenExkulFromDashboard('internal')"><strong>${x.internal||0}</strong><span>Ekskul Internal</span></button><button class="kv2-exstat" onclick="kv2OpenExkulFromDashboard('external')"><strong>${x.external||0}</strong><span>Ekskul di Luar</span></button><button class="kv2-exstat" onclick="kv2OpenExkulFromDashboard('none')"><strong>${x.none||0}</strong><span>Tidak Ikut Ekskul</span></button><button class="kv2-exstat" onclick="kv2OpenExkulFromDashboard('unknown')"><strong>${x.unknown||0}</strong><span>Belum Ada Status</span></button></div></div>`:''}
      <div class="kv2-grid2">
        <div class="kv2-card"><div class="kv2-title">Pekan Bahasa</div><div class="kv2-sub">Peserta dan pemenang dihitung per pelaksanaan, bukan akumulasi antar-Jumat.</div>${pb.length?pb.map(e=>`<div class="kv2-follow-item"><div><b>${esc(e.title)}</b><br><span>${esc(fmtDate(e.planned_date))} · ${esc(stateOf(e).label)}</span></div><button class="kv2-btn secondary" onclick="kv2OpenEvent('${esc(e.id)}')">Lihat</button></div>`).join(''):'<div class="kv2-empty">Tidak ada jadwal Pekan Bahasa bulan ini.</div>'}</div>
        <div class="kv2-card"><div class="kv2-title">Kegiatan Berikutnya</div><div class="kv2-sub">Agenda terdekat berdasarkan timeline sekolah.</div><div class="kv2-upcoming">${up.length?up.map(e=>`<div class="kv2-up"><time>${esc(fmtDate(e.planned_date))}</time><div><b>${esc(e.title)}</b><br><span>${esc(e.scope_label||'')}</span></div><span>${esc(CATEGORY[e.category]||e.category)}</span></div>`).join(''):'<div class="kv2-empty">Belum ada agenda berikutnya.</div>'}</div></div>
      </div>`;
  }

  window.renderKegiatanRinci=function(content){
    injectStyle();ensureModal();
    content.innerHTML='<div class="kv2" id="kv2-rinci"><div class="kv2-card"><span class="spinner"></span> Memuat laporan rinci...</div></div>';
    (async()=>{try{await bootstrap();if(isLanguagePIC())KR.filter.program='PEKAN_BAHASA';if(isTasmiPIC()&&!isKabid())KR.filter.program='LAINNYA';renderRinciBody();}catch(e){document.getElementById('kv2-rinci').innerHTML='<div class="kv2-card kv2-empty">'+esc(e.message)+'</div>';}})();
  };
  function filteredEvents(){
    const ev=KR.boot?.events||[];return ev.filter(e=>{
      if(KR.filter.month&&String(e.planned_date||'').slice(0,7)!==KR.filter.month)return false;
      if(KR.filter.program!=='ALL'){
        const p=PROGRAMS.find(x=>x.key===KR.filter.program);if(p&&!p.cats.includes(e.category))return false;
      }
      if(KR.filter.status!=='ALL'&&stateOf(e).key!==KR.filter.status)return false;
      if(KR.filter.scope!=='ALL'&&String(e.scope_label||'')!==KR.filter.scope)return false;
      return true;
    });
  }
  window.kv2Filter=function(k,v){KR.filter[k]=v;renderRinciBody();};
  function renderRinciBody(){
    const root=document.getElementById('kv2-rinci');if(!root||!KR.boot)return;
    const events=KR.boot.events||[],rows=filteredEvents();
    const scopes=[...new Set(events.map(e=>String(e.scope_label||'')).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'id',{numeric:true}));
    root.innerHTML=`<div class="kv2-head"><div><h2>${isLanguagePIC()?'Pekan Bahasa':isTasmiPIC()&&!isKabid()?"Tasmi' Syahriyyah":'Laporan Rinci Kegiatan'}</h2><p>Satu kegiatan hanya memiliki satu record. Setelah diisi, pengguna lain hanya dapat melihat atau mengedit record yang sama.</p></div>${isKabid()?'<div class="kv2-actions"><button class="kv2-btn ghost" onclick="setActiveModule(\'dashboard\')">Kembali ke Dashboard</button></div>':''}</div>
    <div class="kv2-card" style="margin-bottom:12px"><div class="kv2-filters">
      <select class="kv2-select" onchange="kv2Filter('month',this.value)">${monthOptions(events,KR.filter.month)}</select>
      ${isKabid()||isPimpinan()?`<select class="kv2-select" onchange="kv2Filter('program',this.value)"><option value="ALL">Semua Kegiatan</option>${PROGRAMS.map(p=>`<option value="${p.key}" ${KR.filter.program===p.key?'selected':''}>${esc(p.label)}</option>`).join('')}</select>`:''}
      <select class="kv2-select" onchange="kv2Filter('status',this.value)"><option value="ALL">Semua Status</option><option value="TERLAKSANA" ${KR.filter.status==='TERLAKSANA'?'selected':''}>Terlaksana</option><option value="BELUM_DILAPORKAN" ${KR.filter.status==='BELUM_DILAPORKAN'?'selected':''}>Belum Dilaporkan</option><option value="TERJADWAL" ${KR.filter.status==='TERJADWAL'?'selected':''}>Terjadwal</option><option value="DITUNDA" ${KR.filter.status==='DITUNDA'?'selected':''}>Ditunda</option><option value="DIJADWALKAN_ULANG" ${KR.filter.status==='DIJADWALKAN_ULANG'?'selected':''}>Dijadwalkan Ulang</option><option value="BATAL" ${KR.filter.status==='BATAL'?'selected':''}>Batal</option></select>
      <select class="kv2-select" onchange="kv2Filter('scope',this.value)"><option value="ALL">Semua Kelas/Sasaran</option>${scopes.map(s=>`<option value="${esc(s)}" ${KR.filter.scope===s?'selected':''}>${esc(s)}</option>`).join('')}</select>
      <span class="kv2-badge">${rows.length} kegiatan</span>
    </div></div>
    <div class="kv2-tablewrap"><table class="kv2-table"><thead><tr><th>Tanggal</th><th>Kegiatan</th><th>Kelas/Sasaran</th><th>PIC</th><th>Status</th><th>Peserta</th><th>Aksi</th></tr></thead><tbody>${rows.length?rows.map(e=>{const st=stateOf(e),p=e.permission||{},count=e.manual_participant_count!=null?e.manual_participant_count:'—';return`<tr><td><b>${esc(fmtDate(e.planned_date))}</b>${e.actual_date&&e.actual_date!==e.planned_date?`<div class="kv2-note">Realisasi: ${esc(fmtDate(e.actual_date))}</div>`:''}</td><td><b>${esc(e.title)}</b><div class="kv2-note">${esc(CATEGORY[e.category]||e.category)}</div></td><td>${esc(e.scope_label||'—')}</td><td>${esc(e.pic_text||'—')}</td><td><span class="kv2-badge ${st.cls}">${esc(st.label)}</span></td><td>${esc(count)}</td><td><button class="kv2-btn ${e.report_filled_at?'secondary':''}" onclick="kv2OpenEvent('${esc(e.id)}')">${e.report_filled_at?(p.edit?'Lihat / Edit':'Lihat'):(p.edit?'Isi Laporan':'Lihat')}</button></td></tr>`}).join(''):'<tr><td colspan="7"><div class="kv2-empty">Tidak ada kegiatan sesuai filter.</div></td></tr>'}</tbody></table></div>`;
  }

  window.kv2OpenEvent=async function(id){
    ensureModal();const o=document.getElementById('kv2-overlay'),m=document.getElementById('kv2-modal');o.classList.add('open');m.innerHTML='<div class="kv2-mbody"><span class="spinner"></span> Memuat detail kegiatan...</div>';
    try{KR.detail=await act('detail',{event_id:id});renderEventModal();}catch(e){m.innerHTML='<div class="kv2-mbody kv2-empty">'+esc(e.message)+'</div>';}
  };
  window.kv2CloseModal=function(){document.getElementById('kv2-overlay')?.classList.remove('open');KR.detail=null;};

  function renderEventModal(){
    const d=KR.detail,e=d.event,a=d.attendance||{},edit=!!e.permission?.edit;
    const selected=new Map((d.participants||[]).map(x=>[String(x.student_id),x]));
    const opts=['TERJADWAL','TERLAKSANA','DITUNDA','DIJADWALKAN_ULANG','BATAL'];
    document.getElementById('kv2-modal').innerHTML=`<div class="kv2-mhead"><div><div class="kv2-mtitle">${esc(e.title)}</div><div class="kv2-note">${e.report_filled_at?'Data sudah pernah diisi. Perubahan berikutnya adalah Edit pada record yang sama.':'Belum ada realisasi. Penyimpanan pertama akan mengisi record kegiatan ini.'}</div></div><button class="kv2-close" onclick="kv2CloseModal()">×</button></div><div class="kv2-mbody">
      <div class="kv2-form">
        <div class="kv2-field"><label>Jadwal Target</label><div class="kv2-read">${esc(fmtDate(e.planned_date))}</div></div>
        <div class="kv2-field"><label>Tanggal Realisasi</label><input id="kv2-actual" class="kv2-input" type="date" value="${esc(e.actual_date||'')}" ${edit?'':'disabled'}></div>
        <div class="kv2-field"><label>Status</label><select id="kv2-status" class="kv2-select" ${edit?'':'disabled'}>${opts.map(s=>`<option value="${s}" ${s===e.status?'selected':''}>${esc(STATUS[s])}</option>`).join('')}</select></div>
        <div class="kv2-field"><label>Kelas / Sasaran</label><div class="kv2-read">${esc(e.scope_label||'—')}</div></div>
        <div class="kv2-field"><label>PIC Jadwal</label><div class="kv2-read">${esc(e.pic_text||'—')}</div></div>
        <div class="kv2-field"><label>Tanggal Absensi</label><input id="kv2-attdate" class="kv2-input" type="date" value="${esc(e.attendance_date||e.actual_date||e.planned_date)}" ${edit?'':'disabled'}></div>
        <div class="kv2-field kv2-span3"><label>Absensi Peserta</label>${a.available?`<div class="kv2-att"><b>${a.present||0} hadir / ${a.total||0} siswa</b><span>Diambil otomatis dari absensi ${esc((a.classes||[]).join(', '))} tanggal ${esc(fmtDate(a.date))}. Ubah Tanggal Absensi jika pelaksanaan berbeda.</span></div>`:`<div class="kv2-att"><b>Absensi belum tersedia</b><span>Sistem belum menemukan absensi pada tanggal yang dipilih. Input manual hanya muncul sebagai cadangan.</span></div>`}</div>
        ${!a.available?`<div class="kv2-field"><label>Jumlah Peserta Hadir</label><input id="kv2-manual" class="kv2-input" type="number" min="0" value="${e.manual_participant_count??''}" ${edit?'':'disabled'}></div>`:''}
        <div class="kv2-field kv2-span3"><label>Catatan Singkat</label><textarea id="kv2-notes" class="kv2-textarea" ${edit?'':'disabled'} placeholder="Hasil kegiatan, kendala, atau evaluasi singkat...">${esc(e.notes||'')}</textarea></div>
      </div>
      ${e.category==='PEKAN_BAHASA'?renderLanguage(d.roster||[],selected,edit):''}
      <div class="kv2-card" style="margin-top:12px"><div class="kv2-title">Dokumentasi Foto</div><div class="kv2-sub">Foto asli dari kamera boleh langsung dipilih. Sistem otomatis mengecilkan foto sebelum disimpan.</div>${renderPhotos(d.photos||[])}${edit?`<div class="kv2-upload"><input type="file" accept="image/*" multiple onchange="kv2UploadPhotos(event)"><div class="kv2-note">Maksimal 10 foto per kegiatan.</div></div>`:''}</div>
      <div class="kv2-actions" style="justify-content:flex-end;margin-top:13px"><button class="kv2-btn ghost" onclick="kv2CloseModal()">Tutup</button>${edit?'<button class="kv2-btn" id="kv2-save" onclick="kv2SaveEvent()">Simpan</button>':''}</div>
    </div>`;
  }
  function renderPhotos(rows){return rows.length?`<div class="kv2-photos">${rows.map(p=>`<a class="kv2-photo" href="${esc(p.url)}" target="_blank" rel="noopener"><img src="${esc(p.url)}" loading="lazy" alt="Dokumentasi kegiatan"></a>`).join('')}</div>`:'<div class="kv2-empty">Belum ada foto dokumentasi.</div>';}
  function renderLanguage(roster,selected,edit){
    return `<div class="kv2-card" style="margin-top:12px"><div class="kv2-title">Peserta & Pemenang Pekan Bahasa</div><div class="kv2-sub">Pemenang berlaku hanya untuk pelaksanaan ini dan tidak diakumulasi dengan Jumat sebelumnya.</div><input id="kv2-langsearch" class="kv2-input" placeholder="Cari nama / kelas..." oninput="kv2FilterLanguage()" style="margin-bottom:8px"><div class="kv2-langwrap"><table class="kv2-lang"><thead><tr><th>Ikut</th><th>Nama</th><th>Kelas</th><th>Penampilan / Kategori</th><th>Hasil</th></tr></thead><tbody>${roster.map(r=>{const old=selected.get(String(r.id));return`<tr class="kv2-langrow" data-search="${esc((r.name+' '+r.class_name).toLowerCase())}"><td><input class="kv2-langcheck" data-student-id="${esc(r.id)}" type="checkbox" ${old?'checked':''} ${edit?'':'disabled'}></td><td><b>${esc(r.name)}</b></td><td>${esc(r.class_name)}</td><td><input class="kv2-langcat" type="text" value="${esc(old?.performance_category||'')}" ${edit?'':'disabled'}></td><td><select class="kv2-langplace" ${edit?'':'disabled'}><option value="">Tidak Juara</option>${[1,2,3].map(n=>`<option value="${n}" ${Number(old?.placement)===n?'selected':''}>Juara ${n}</option>`).join('')}</select></td></tr>`}).join('')}</tbody></table></div></div>`;
  }
  window.kv2FilterLanguage=function(){const q=(document.getElementById('kv2-langsearch')?.value||'').toLowerCase().trim();document.querySelectorAll('.kv2-langrow').forEach(r=>r.style.display=!q||(r.dataset.search||'').includes(q)?'':'none');};

  window.kv2SaveEvent=async function(){
    const e=KR.detail?.event;if(!e)return;const b=document.getElementById('kv2-save');if(b){b.disabled=true;b.innerHTML='<span class="spinner"></span>Menyimpan...';}
    try{
      await act('save_event',{event_id:e.id,status:document.getElementById('kv2-status')?.value||e.status,actual_date:document.getElementById('kv2-actual')?.value||'',attendance_date:document.getElementById('kv2-attdate')?.value||'',manual_participant_count:document.getElementById('kv2-manual')?.value??null,notes:document.getElementById('kv2-notes')?.value||''});
      if(e.category==='PEKAN_BAHASA'){
        const participants=[];document.querySelectorAll('.kv2-langrow').forEach(row=>{const ck=row.querySelector('.kv2-langcheck');if(!ck?.checked)return;participants.push({student_id:ck.dataset.studentId,performance_category:row.querySelector('.kv2-langcat')?.value||'',placement:row.querySelector('.kv2-langplace')?.value||null});});
        await act('save_language_participants',{event_id:e.id,participants});
      }
      showToast('Laporan kegiatan berhasil disimpan.');KR.boot=null;await bootstrap(true);KR.detail=await act('detail',{event_id:e.id});renderEventModal();refreshVisiblePage();
    }catch(err){showToast(err.message||'Data belum tersimpan.',true);}finally{const x=document.getElementById('kv2-save');if(x){x.disabled=false;x.textContent='Simpan';}}
  };

  async function compressPhoto(file){
    const url=URL.createObjectURL(file);try{
      const img=await new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=()=>rej(new Error('Foto tidak dapat dibaca oleh browser.'));i.src=url;});
      const max=1600,ratio=Math.min(1,max/Math.max(img.naturalWidth,img.naturalHeight)),w=Math.max(1,Math.round(img.naturalWidth*ratio)),h=Math.max(1,Math.round(img.naturalHeight*ratio));
      const c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(img,0,0,w,h);
      let q=.80,blob=await new Promise(r=>c.toBlob(r,'image/jpeg',q));while(blob&&blob.size>1800000&&q>.5){q-=.07;blob=await new Promise(r=>c.toBlob(r,'image/jpeg',q));}
      if(!blob)throw new Error('Foto tidak dapat diproses.');
      return await new Promise((res,rej)=>{const fr=new FileReader();fr.onload=()=>res({base64:fr.result,mime_type:'image/jpeg'});fr.onerror=rej;fr.readAsDataURL(blob);});
    }finally{URL.revokeObjectURL(url);}
  }
  window.kv2UploadPhotos=async function(ev){
    const files=[...(ev.target.files||[])];if(!files.length||!KR.detail?.event)return;ev.target.disabled=true;showToast('Foto sedang dikecilkan otomatis...');
    try{for(const f of files){const p=await compressPhoto(f);await act('upload_photo',{event_id:KR.detail.event.id,...p});}showToast(files.length+' foto berhasil disimpan.');KR.detail=await act('detail',{event_id:KR.detail.event.id});renderEventModal();}
    catch(e){showToast(e.message||'Foto belum berhasil disimpan.',true);}finally{if(ev.target)ev.target.disabled=false;}
  };

  function refreshVisiblePage(){
    if(typeof activeModule==='undefined')return;
    if(activeModule==='dashboard'&&isKabid())renderDashboardBody();
    if(activeModule==='kegiatan-rinci')renderRinciBody();
  }

  window.renderKegiatanEkskul=function(content){
    injectStyle();ensureModal();
    content.innerHTML='<div class="kv2" id="kv2-exkul"><div class="kv2-card"><span class="spinner"></span> Memuat data ekskul...</div></div>';
    (async()=>{try{await loadExkul(true);await loadExkulRows(KR.exkulState||'unknown');renderExkulBody();}catch(e){document.getElementById('kv2-exkul').innerHTML='<div class="kv2-card kv2-empty">'+esc(e.message)+'</div>';}})();
  };
  async function loadExkulRows(state){KR.exkulState=state;const d=await exk('list',{state});KR.exkulRows=d.rows||[];}
  window.kv2ExkulTab=async function(state){const root=document.getElementById('kv2-exkul');if(root)root.innerHTML='<div class="kv2-card"><span class="spinner"></span> Memuat siswa...</div>';try{await loadExkulRows(state);renderExkulBody();}catch(e){root.innerHTML='<div class="kv2-card kv2-empty">'+esc(e.message)+'</div>';}};
  window.kv2OpenExkulFromDashboard=function(state){KR.exkulState=state;if(typeof setActiveModule==='function')setActiveModule('kegiatan-ekskul');};
  function exLabel(s){return{internal:'Ekskul Internal',external:'Ekskul di Luar',none:'Tidak Ikut Ekskul',unknown:'Belum Ada Status'}[s]||s;}
  function renderExkulBody(){
    const root=document.getElementById('kv2-exkul');if(!root)return;const x=KR.exkul||{},s=KR.exkulState,edit=canEditExkul();
    root.innerHTML=`<div class="kv2-head"><div><h2>Data Ekskul Siswa</h2><p>Data ekskul internal tidak perlu diinput ulang. Kabid hanya melengkapi siswa yang memang belum memiliki status.</p></div><div class="kv2-actions"><button class="kv2-btn ghost" onclick="setActiveModule('dashboard')">Kembali ke Dashboard</button></div></div>
      <div class="kv2-kpis"><div class="kv2-kpi"><strong>${x.internal||0}</strong><span>Ekskul Internal</span></div><div class="kv2-kpi"><strong>${x.external||0}</strong><span>Ekskul di Luar</span></div><div class="kv2-kpi"><strong>${x.none||0}</strong><span>Tidak Ikut Ekskul</span></div><div class="kv2-kpi"><strong>${x.unknown||0}</strong><span>Belum Ada Status</span></div></div>
      <div class="kv2-card"><div class="kv2-tabs">${['internal','external','none','unknown'].map(k=>`<button class="kv2-tab ${s===k?'active':''}" onclick="kv2ExkulTab('${k}')">${esc(exLabel(k))}</button>`).join('')}</div><div class="kv2-filters"><input id="kv2-exsearch" class="kv2-input" placeholder="Cari siswa / kelas..." oninput="kv2FilterExkul()"><span class="kv2-badge">${KR.exkulRows.length} siswa</span></div><div style="height:9px"></div><div class="kv2-tablewrap"><table class="kv2-table" style="min-width:760px"><thead><tr><th>Nama</th><th>Kelas</th><th>Keterangan</th>${edit&&s==='unknown'?'<th>Tetapkan Status</th>':''}</tr></thead><tbody>${KR.exkulRows.length?KR.exkulRows.map(r=>`<tr class="kv2-exrow" data-search="${esc((r.name+' '+r.class_name).toLowerCase())}"><td><b>${esc(r.name)}</b><div class="kv2-note">${esc(r.nis||'')}</div></td><td>${esc(r.class_name)}</td><td>${esc(r.activity_name||r.notes||'—')}</td>${edit&&s==='unknown'?`<td><div class="kv2-student-action"><input id="kv2-act-${esc(r.student_id)}" class="kv2-input" placeholder="Nama ekskul luar"><button class="kv2-btn secondary" onclick="kv2SetExkul('${esc(r.student_id)}','external')">Ekskul Luar</button><button class="kv2-btn ghost" onclick="kv2SetExkul('${esc(r.student_id)}','none')">Tidak Ikut</button></div></td>`:''}</tr>`).join(''):'<tr><td colspan="4"><div class="kv2-empty">Tidak ada siswa pada status ini.</div></td></tr>'}</tbody></table></div></div>`;
  }
  window.kv2FilterExkul=function(){const q=(document.getElementById('kv2-exsearch')?.value||'').toLowerCase().trim();document.querySelectorAll('.kv2-exrow').forEach(r=>r.style.display=!q||(r.dataset.search||'').includes(q)?'':'none');};
  window.kv2SetExkul=async function(studentId,state){
    try{const activity=document.getElementById('kv2-act-'+studentId)?.value||'';if(state==='external'&&!activity.trim()){showToast('Isi nama ekskul luar terlebih dahulu.',true);return;}const d=await exk('set',{student_id:studentId,state,activity_name:activity});KR.exkul=d.summary||KR.exkul;showToast('Status ekskul berhasil disimpan.');await loadExkulRows(KR.exkulState);renderExkulBody();}
    catch(e){showToast(e.message||'Status belum tersimpan.',true);}
  };

  injectStyle();ensureModal();syncNavigation();
  if(currentUser){try{renderSidebar();if(isKabid()&&typeof activeModule!=='undefined'&&activeModule==='absensi')setActiveModule('dashboard');}catch(_){}}
})();