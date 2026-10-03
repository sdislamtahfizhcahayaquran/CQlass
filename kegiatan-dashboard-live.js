/* CQlass — Kabid Kegiatan dashboard khusus monitoring kegiatan/ekskul.
   Menggantikan dashboard generik/rapor hanya untuk role kegiatan. */
(function(){
  'use strict';
  if(window.__cqKegiatanDashboardLiveV1)return;
  window.__cqKegiatanDashboardLiveV1=true;

  const norm=v=>String(v||'').trim().toLowerCase().replace(/[\s-]+/g,'_');
  function role(){try{return norm(currentUser?.role||JSON.parse(localStorage.getItem('cqlass_user')||'{}')?.role)}catch(_){return''}}
  function allowed(){return role()==='kegiatan'||role()==='kabid_kegiatan'}

  function css(){
    if(document.getElementById('cq-kegiatan-dashboard-live-style'))return;
    const s=document.createElement('style');s.id='cq-kegiatan-dashboard-live-style';s.textContent=`
      #kv2-root.kegiatan-live-dashboard{max-width:1240px;margin:0 auto}
      .kvd-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;margin-bottom:13px}
      .kvd-title{font-size:24px;font-weight:900;letter-spacing:-.025em;color:var(--text,#173f3e)}
      .kvd-sub{font-size:11px;color:var(--muted,#718181);margin-top:4px;line-height:1.5}
      .kvd-meta{display:flex;gap:7px;flex-wrap:wrap}.kvd-chip{padding:6px 9px;border:1px solid var(--border,#dce7e7);border-radius:999px;background:#fff;font-size:9px;font-weight:850;color:#45605f}
      .kvd-strip{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;margin-bottom:12px}
      .kvd-card{border:1px solid var(--border,#dce7e7);border-radius:13px;padding:12px;background:#fff}.kvd-card b{display:block;font-size:11px;color:#173f3e}.kvd-card span{font-size:8.5px;color:#718181;line-height:1.45}
      @media(max-width:760px){.kvd-title{font-size:20px}.kvd-strip{grid-template-columns:1fr}}
    `;document.head.appendChild(s);
  }
  function render(container){
    if(!allowed())return false;
    const c=container||document.getElementById('content');if(!c)return false;css();
    c.innerHTML=`<div id="kv2-root" class="kv2 kegiatan-live-dashboard">
      <div class="kvd-head"><div><div class="kvd-title">Dashboard Kabid Kegiatan</div><div class="kvd-sub">Monitoring pelatih ekskul, absensi pertemuan, materi, dokumentasi, dan kelengkapan nilai secara live.</div></div><div class="kvd-meta"><span class="kvd-chip">Ekskul Internal</span><span class="kvd-chip">Live Monitoring</span></div></div>
      <div class="kv2-kpis kvd-strip">
        <div class="kvd-card"><b>Absensi Ekskul</b><span>Lihat kelompok yang sudah, sebagian, atau belum mengisi absensi.</span></div>
        <div class="kvd-card"><b>Materi Pertemuan</b><span>Materi yang diinput pelatih langsung terbaca pada laporan live.</span></div>
        <div class="kvd-card"><b>Dokumentasi</b><span>Foto bersifat opsional dan tidak menentukan status absensi.</span></div>
      </div>
    </div>`;
    setTimeout(()=>{try{window.kglrRefresh?.()}catch(_){}
      try{window.kxattRefresh?.()}catch(_){}
    },80);
    return true;
  }

  function install(){
    if(!allowed()||typeof DASHBOARD_MODULE==='undefined')return false;
    if(!Array.isArray(DASHBOARD_MODULE.roles))DASHBOARD_MODULE.roles=[];
    for(const r of ['kegiatan','kabid_kegiatan'])if(!DASHBOARD_MODULE.roles.includes(r))DASHBOARD_MODULE.roles.push(r);
    const legacy=DASHBOARD_MODULE.render;
    if(!DASHBOARD_MODULE.render?.__cqKegiatanDashboardLive){
      const wrapped=function(c){if(allowed())return render(c);return typeof legacy==='function'?legacy.apply(this,arguments):undefined};
      wrapped.__cqKegiatanDashboardLive=true;DASHBOARD_MODULE.render=wrapped;
    }
    if(typeof renderDashboard==='function'&&!renderDashboard.__cqKegiatanDashboardLive){
      const old=renderDashboard;
      const w=function(c){if(allowed())return render(c);return old.apply(this,arguments)};
      w.__cqKegiatanDashboardLive=true;renderDashboard=w;
    }
    return true;
  }
  window.renderKegiatanLiveDashboard=render;
  function boot(){install();if(allowed()){try{if(typeof activeModule!=='undefined'&&activeModule==='dashboard')render(document.getElementById('content'))}catch(_){}}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,50));else setTimeout(boot,0);
  setTimeout(boot,300);setTimeout(boot,1000);
})();