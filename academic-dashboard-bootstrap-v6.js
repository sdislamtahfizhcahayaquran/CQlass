/* CQlass — Kabid Akademik bootstrap V6
   Bypasses the generic role dashboard for role akademik and guarantees
   the app shell + academic dashboard are painted even if an older sidebar/
   dashboard patch throws during enterApp(). */
(function(){
  'use strict';
  if(window.__CQ_AK_BOOT_V6__) return;

  function norm(v){return String(v||'').trim().toLowerCase().replace(/[\s-]+/g,'_');}
  function getUser(){try{return (typeof currentUser!=='undefined'&&currentUser)?currentUser:null;}catch(_){return null;}}
  function academic(){
    const u=getUser()||{};
    const vals=[u.role,u.role_code,u.primary_role].concat(Array.isArray(u.roles)?u.roles:[]).map(norm).filter(Boolean);
    return vals.some(function(r){return r==='akademik'||r==='kabid_akademik'||r==='academic'||r.includes('kabid_akademik')||r.includes('academic');});
  }
  function isDashboard(){try{return typeof activeModule==='undefined'||String(activeModule)==='dashboard';}catch(_){return true;}}
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];});}

  function showShell(){
    const u=getUser()||{};
    const login=document.getElementById('login-screen');
    const app=document.getElementById('app-screen');
    if(login) login.style.display='none';
    if(app) app.style.display='block';
    const nm=document.getElementById('user-name');
    const rb=document.getElementById('user-role');
    if(nm) nm.textContent=u.nama||u.full_name||u.name||u.username||'Kabid Akademik';
    if(rb) rb.textContent='AKADEMIK';
    try{if(typeof updateProfilePhotoUI==='function')updateProfilePhotoUI();}catch(e){console.warn('Foto profil:',e);}
    document.body.classList.add('cq-ak-final');
  }

  function fallbackSidebar(){
    const sb=document.getElementById('sidebar');
    if(!sb) return;
    const role='akademik';
    let html='<button class="nav-item active" onclick="setActiveModule(\'dashboard\')">Dashboard</button>';
    try{
      if(typeof MODULE_GROUPS!=='undefined'&&Array.isArray(MODULE_GROUPS)){
        MODULE_GROUPS.forEach(function(g){
          if(!g||!Array.isArray(g.roles)||!g.roles.includes(role))return;
          const items=(Array.isArray(g.items)?g.items:[]).filter(function(m){return m&&Array.isArray(m.roles)&&m.roles.includes(role);});
          if(!items.length)return;
          html+='<div style="margin:18px 12px 7px;font-size:12px;font-weight:800;color:#607a75;text-transform:uppercase;letter-spacing:.04em">'+esc(g.label||g.id||'Menu')+'</div>';
          items.forEach(function(m){html+='<button class="nav-item" onclick="setActiveModule(\''+esc(m.id)+'\')">'+esc(m.label||m.id)+'</button>';});
        });
      }
    }catch(e){console.warn('Fallback sidebar:',e);}
    sb.innerHTML=html;
  }

  function safeSidebar(){
    try{
      if(typeof renderSidebar==='function')renderSidebar();
      const sb=document.getElementById('sidebar');
      if(sb&&String(sb.innerHTML||'').trim())return;
    }catch(e){console.error('Sidebar akademik gagal:',e);}
    fallbackSidebar();
  }

  let painting=false;
  function paintDashboard(force){
    if(!academic())return false;
    const c=document.getElementById('content');
    if(!c)return false;
    if(painting)return true;

    c.innerHTML='<div style="margin:20px;padding:18px;border:1px solid #dcece7;border-radius:16px;background:#fff;color:#52716a;font:600 13px Plus Jakarta Sans,Arial">Memuat dashboard akademik...</div>';

    const fn=window.renderAcademicKabidDashboardFinal;
    if(typeof fn!=='function'){
      c.innerHTML='<div style="margin:20px;padding:18px;border:1px solid #f0d7d7;border-radius:16px;background:#fff5f5;color:#98434a;font:600 13px Plus Jakarta Sans,Arial"><b>Dashboard akademik belum siap.</b><br>Renderer akademik tidak termuat.</div>';
      return false;
    }

    const u=getUser();
    const snap=u?{role:u.role,role_code:u.role_code,primary_role:u.primary_role,roles:u.roles}:null;
    if(u){u.role='akademik';u.role_code='';u.primary_role='';u.roles=[];}
    painting=true;
    try{
      const out=fn(c,force!==false);
      Promise.resolve(out).catch(function(err){
        console.error('Dashboard akademik:',err);
        c.innerHTML='<div style="margin:20px;padding:18px;border:1px solid #f0d7d7;border-radius:16px;background:#fff5f5;color:#98434a;font:600 13px Plus Jakarta Sans,Arial"><b>Dashboard akademik gagal dimuat.</b><br>'+esc(err&&err.message?err.message:'Terjadi kendala saat memuat data.')+'</div>';
      }).finally(function(){
        if(u&&snap){u.role=snap.role;u.role_code=snap.role_code;u.primary_role=snap.primary_role;u.roles=snap.roles;}
        painting=false;
      });
      return true;
    }catch(err){
      if(u&&snap){u.role=snap.role;u.role_code=snap.role_code;u.primary_role=snap.primary_role;u.roles=snap.roles;}
      painting=false;
      console.error('Dashboard akademik:',err);
      c.innerHTML='<div style="margin:20px;padding:18px;border:1px solid #f0d7d7;border-radius:16px;background:#fff5f5;color:#98434a;font:600 13px Plus Jakarta Sans,Arial"><b>Dashboard akademik gagal dimuat.</b><br>'+esc(err&&err.message?err.message:'Terjadi kendala saat memuat halaman.')+'</div>';
      return false;
    }
  }

  function enterAcademic(){
    showShell();
    try{if(typeof activeModule!=='undefined')activeModule='dashboard';}catch(_){ }
    safeSidebar();
    paintDashboard(true);
    setTimeout(function(){
      const c=document.getElementById('content');
      if(academic()&&isDashboard()&&c&&!c.querySelector('.akf'))paintDashboard(true);
    },1200);
  }

  /* Replace enterApp for academic only. This is the important part: we never
     start the generic Kesiswaan/role-dashboard request for Kabid Akademik. */
  try{
    if(typeof enterApp==='function'&&!enterApp.__cqAkBootV6){
      const legacyEnter=enterApp;
      enterApp=function(){
        if(academic())return enterAcademic();
        return legacyEnter.apply(this,arguments);
      };
      enterApp.__cqAkBootV6=true;
    }
  }catch(e){console.error('Bootstrap enterApp:',e);}

  try{
    if(typeof setActiveModule==='function'&&!setActiveModule.__cqAkBootV6){
      const legacySet=setActiveModule;
      setActiveModule=function(id){
        if(academic()&&String(id)==='dashboard'){
          try{if(typeof activeModule!=='undefined')activeModule='dashboard';}catch(_){ }
          safeSidebar();
          paintDashboard(true);
          return;
        }
        return legacySet.apply(this,arguments);
      };
      setActiveModule.__cqAkBootV6=true;
    }
  }catch(e){console.error('Bootstrap navigation:',e);}

  try{
    if(typeof renderDashboard==='function'&&!renderDashboard.__cqAkBootV6){
      const legacyRender=renderDashboard;
      renderDashboard=function(c){if(academic()){paintDashboard(true);return;}return legacyRender.apply(this,arguments);};
      renderDashboard.__cqAkBootV6=true;
    }
  }catch(e){console.error('Bootstrap renderDashboard:',e);}

  try{
    if(typeof renderRoleDashboard==='function'&&!renderRoleDashboard.__cqAkBootV6){
      const legacyRole=renderRoleDashboard;
      renderRoleDashboard=function(d){
        const r=norm(d&&d.role);
        if(academic()||r==='akademik'||r==='kabid_akademik'){paintDashboard(true);return;}
        return legacyRole.apply(this,arguments);
      };
      renderRoleDashboard.__cqAkBootV6=true;
    }
  }catch(e){console.error('Bootstrap role dashboard:',e);}

  function repair(){
    if(!academic()||!isDashboard())return;
    showShell();
    const c=document.getElementById('content');
    if(!c)return;
    const txt=String(c.textContent||'');
    if(!String(c.innerHTML||'').trim()||/Reward Bulan Ini|Pelanggaran Bulan Ini|Perilaku Bulan Ini|Siswa dalam Scope|5 Siswa Inspiratif|5 Kelas Inspiratif/i.test(txt)){
      safeSidebar();
      paintDashboard(true);
    }
  }

  window.addEventListener('load',function(){setTimeout(repair,200);setTimeout(repair,1200);});
  document.addEventListener('click',function(e){
    const el=e.target&&e.target.closest?e.target.closest('#sidebar button,#sidebar a'):null;
    if(el&&academic()&&String(el.textContent||'').trim()==='Dashboard')setTimeout(repair,0);
  },true);

  window.__CQ_AK_BOOT_V6__=true;
})();