(function(){
  function role(){try{var u=JSON.parse(localStorage.getItem('cqlass_user')||'{}');return String(u.role||u.primary_role||u.role_code||'').toLowerCase()}catch(e){return''}}
  function add(){var sb=document.getElementById('sidebar');if(!sb)return;var r=role();if(!r)return;
    var old=document.getElementById('cq-final-tools');if(old)old.remove();
    var box=document.createElement('div');box.id='cq-final-tools';box.style.cssText='margin:12px 10px;padding-top:10px;border-top:1px solid var(--border,#dfe8e6);display:grid;gap:7px';
    var title=document.createElement('div');title.textContent='AKSES CEPAT';title.style.cssText='font-size:9px;font-weight:800;color:var(--muted,#718181);padding:0 8px;letter-spacing:.08em';box.appendChild(title);
    function link(href,label){var a=document.createElement('a');a.href=href;a.textContent=label;a.style.cssText='display:block;text-decoration:none;color:var(--text,#17343a);font-size:11px;font-weight:750;padding:9px 10px;border-radius:9px;background:#f2f7f6;border:1px solid var(--border,#dfe8e6)';box.appendChild(a)}
    if(['tahfizh','admin'].includes(r))link('tahfizh-pts.html','📖 Input PTS Tahfizh');
    if(['tahfizh','pimpinan','admin'].includes(r))link('tahfizh-monthly.html','🗓️ Tahfizh Bulanan');
    if(['kesiswaan','pimpinan','admin'].includes(r))link('mt-report.html','📷 Laporan & Foto MT');
    if(r==='admin'){link('master-data.html','🗂️ Pusat Data & Siswa Baru');link('system-health.html','🩺 CQlass Control Center');}
    if(box.children.length>1)sb.appendChild(box);
  }
  var sb=document.getElementById('sidebar');if(sb)new MutationObserver(function(){clearTimeout(window.__cqFinalTimer);window.__cqFinalTimer=setTimeout(add,50)}).observe(sb,{childList:true,subtree:true});
  document.addEventListener('DOMContentLoaded',function(){setTimeout(add,500)});setTimeout(add,1200);setTimeout(add,2500);
})();