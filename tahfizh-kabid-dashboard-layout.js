/* CQlass — focused dashboard for Kabid Tahfizh */
(function(){
  'use strict';
  if(window.__CQ_TAHFIZH_KABID_DASH_V1__)return;
  window.__CQ_TAHFIZH_KABID_DASH_V1__=1;
  const ROLE='kabid_tahfizh';
  const norm=v=>String(v||'').trim().toLowerCase().replace(/[\s-]+/g,'_');
  function role(){
    try{
      const saved=JSON.parse(localStorage.getItem('cqlass_user')||'{}')||{};
      const u=(typeof currentUser!=='undefined'&&currentUser)||saved;
      return norm(u.role||u.primary_role||u.role_code||saved.role||'');
    }catch(_){return''}
  }
  function allowed(){return role()===ROLE}
  function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
  function css(){
    if(document.getElementById('cq-kabid-tahfizh-dashboard-css'))return;
    const s=document.createElement('style');s.id='cq-kabid-tahfizh-dashboard-css';s.textContent=`
      .ktd{max-width:1180px;margin:0 auto;color:#17324d}
      .ktd-hero{position:relative;overflow:hidden;border-radius:22px;padding:24px 26px;background:linear-gradient(135deg,#173f63 0%,#0f6173 58%,#0a7777 100%);color:#fff;box-shadow:0 13px 34px rgba(23,63,99,.16)}
      .ktd-hero:after{content:'';position:absolute;width:230px;height:230px;border-radius:50%;right:-70px;top:-110px;background:rgba(255,255,255,.08)}
      .ktd-kicker{font-size:11px;font-weight:800;letter-spacing:.11em;text-transform:uppercase;opacity:.78}.ktd-title{font-size:26px;font-weight:900;line-height:1.1;margin-top:7px}.ktd-sub{font-size:12px;line-height:1.6;opacity:.86;margin-top:7px;max-width:700px}
      .ktd-quick{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:14px}.ktd-card{border:1px solid #dce8ee;background:#fff;border-radius:17px;padding:17px;box-shadow:0 5px 18px rgba(23,50,77,.05)}
      .ktd-action{appearance:none;width:100%;text-align:left;cursor:pointer;transition:.16s ease;color:#17324d}.ktd-action:hover{transform:translateY(-1px);border-color:#9eb8cf;box-shadow:0 8px 24px rgba(23,50,77,.09)}
      .ktd-action-top{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.ktd-icon{width:38px;height:38px;border-radius:12px;background:#edf6f7;display:grid;place-items:center;font-size:17px;font-weight:900;color:#0a6e6e}.ktd-arrow{font-size:18px;color:#6d8495}.ktd-card b{display:block;font-size:15px;margin-top:13px}.ktd-card p{margin:5px 0 0;color:#687d8d;font-size:11px;line-height:1.55}
      .ktd-section{margin-top:14px}.ktd-section-head{display:flex;align-items:end;justify-content:space-between;gap:10px;margin-bottom:8px}.ktd-section-head b{font-size:15px}.ktd-section-head span{font-size:10px;color:#75899a}.ktd-note{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}.ktd-note>div{border:1px solid #e2ebf0;border-radius:14px;padding:12px 13px;background:#f9fbfc}.ktd-note strong{font-size:11px;display:block}.ktd-note span{display:block;color:#748797;font-size:10px;line-height:1.5;margin-top:4px}
      @media(max-width:850px){.ktd-quick,.ktd-note{grid-template-columns:1fr}.ktd-title{font-size:22px}.ktd-hero{padding:20px}.ktd{padding-bottom:14px}}
    `;document.head.appendChild(s);
  }
  function go(id){if(typeof setActiveModule==='function')setActiveModule(id)}
  function render(content){
    if(!allowed()||!content)return;
    css();
    let name='';try{name=currentUser?.nama||currentUser?.name||currentUser?.username||''}catch(_){}
    content.innerHTML=`<div class="ktd">
      <section class="ktd-hero">
        <div class="ktd-kicker">CQlass · Tahfizh</div>
        <div class="ktd-title">Dashboard Kabid Tahfizh</div>
        <div class="ktd-sub">Pusat monitoring nilai PTS, laporan bulanan, dan UKJ${name?` · ${esc(name)}`:''}. Live Report di bawah ini membaca progres guru halaqah langsung dari data CQlass.</div>
      </section>
      <section class="ktd-section">
        <div class="ktd-section-head"><b>Akses Utama</b><span>Tiga modul kerja Kabid Tahfizh</span></div>
        <div class="ktd-quick">
          <button type="button" class="ktd-card ktd-action" onclick="setActiveModule('tahfizh-pts-kabid')"><div class="ktd-action-top"><div class="ktd-icon">PTS</div><div class="ktd-arrow">→</div></div><b>Nilai PTS</b><p>Lihat dan kelola data nilai Tahfizh PTS seluruh kelas dalam satu jalur.</p></button>
          <button type="button" class="ktd-card ktd-action" onclick="setActiveModule('tahfizh-monthly-report')"><div class="ktd-action-top"><div class="ktd-icon">BLN</div><div class="ktd-arrow">→</div></div><b>Laporan Bulanan</b><p>LP, target bulan, pencapaian akhir bulan, juz, dan Tilawah/BBQ.</p></button>
          <button type="button" class="ktd-card ktd-action" onclick="setActiveModule('tahfizh-ukj-score')"><div class="ktd-action-top"><div class="ktd-icon">UKJ</div><div class="ktd-arrow">→</div></div><b>UKJ</b><p>Kelancaran, makhraj, mad, ghunnah, catatan, nilai akhir, dan cetak A4.</p></button>
        </div>
      </section>
      <div class="ktd-live-slot"></div>
      <section class="ktd-section">
        <div class="ktd-section-head"><b>Alur Kerja</b><span>Tanpa input ulang dan tanpa menu Kesiswaan</span></div>
        <div class="ktd-note"><div><strong>1. Pantau</strong><span>Cek progres guru halaqah melalui Live Report.</span></div><div><strong>2. Lengkapi</strong><span>Buka modul PTS, Bulanan, atau UKJ sesuai kebutuhan.</span></div><div><strong>3. Cetak</strong><span>Gunakan preview A4 yang sama dengan sumber PDF agar hasil konsisten.</span></div></div>
      </section>
    </div>`;
    setTimeout(()=>{try{window.cqTahfizhLiveEnsure?.()}catch(_){}},80);
  }
  window.renderKabidTahfizhDashboard=render;

  function install(){
    if(!allowed()||typeof DASHBOARD_MODULE==='undefined')return false;
    if(Array.isArray(DASHBOARD_MODULE.roles)&&!DASHBOARD_MODULE.roles.includes(ROLE))DASHBOARD_MODULE.roles.push(ROLE);
    DASHBOARD_MODULE.render=render;
    return true;
  }
  let n=0;(function boot(){n++;if(install()||n>=30)return;setTimeout(boot,200)})();
  if(typeof enterApp==='function'&&!enterApp.__cqKabidTahfizhDashV1){
    const old=enterApp;
    const wrapped=function(){install();const out=old.apply(this,arguments);if(allowed())setTimeout(()=>{try{if(typeof activeModule!=='undefined'&&activeModule==='dashboard')render(document.getElementById('content'))}catch(_){}},120);return out};
    wrapped.__cqKabidTahfizhDashV1=true;enterApp=wrapped;
  }
})();
