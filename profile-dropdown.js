/* CQlass — dropdown akun dari foto profil */
(function(){
  'use strict';
  if(window.__cqProfileDropdownInstalled) return;
  window.__cqProfileDropdownInstalled=true;
  window.__cqProfileMenuOwnsHeaderPhoto=true;

  const MENU_CLASS='cq-profile-menu';

  function user(){
    try{return (typeof currentUser!=='undefined'&&currentUser)?currentUser:null}catch(_){return null}
  }
  function esc(v){
    return String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]||c));
  }
  function displayName(){
    const u=user()||{};
    return u.nama||u.full_name||u.name||u.username||'Pengguna';
  }
  function username(){return (user()||{}).username||'';}
  function roleLabel(){
    const u=user()||{};
    const raw=String(u.role||u.primary_role||'').replace(/_/g,' ').trim();
    return raw?raw.replace(/\b\w/g,m=>m.toUpperCase()):'';
  }

  function hideLegacyHeaderButtons(){
    document.querySelectorAll('button').forEach(btn=>{
      if(btn.closest('.'+MENU_CLASS)||btn.classList.contains('cq-profile-trigger')) return;
      const onclick=String(btn.getAttribute('onclick')||'').toLowerCase();
      const text=String(btn.textContent||'').trim().toLowerCase();
      if(onclick.includes('openaccountmodal') || (onclick.includes('logout')&&text.includes('keluar'))){
        btn.style.display='none';
        btn.dataset.cqHiddenByProfileMenu='1';
      }
    });
    document.getElementById('cq-push-toggle')?.remove();
  }

  function closeAll(except){
    document.querySelectorAll('.'+MENU_CLASS+'.open').forEach(menu=>{
      if(menu!==except){menu.classList.remove('open');menu.setAttribute('aria-hidden','true');}
    });
    document.querySelectorAll('.cq-profile-trigger[aria-expanded="true"]').forEach(btn=>btn.setAttribute('aria-expanded','false'));
  }

  function prepareProfileModal(){
    setTimeout(()=>{
      const title=document.querySelector('#account-modal .modal-title, #account-modal h2, #account-modal h3');
      if(title && /akun|password|profil/i.test(title.textContent||'')) title.textContent='Profil';
      const pass=document.getElementById('tab-btn-pass');
      const usr=document.getElementById('tab-btn-user');
      const foto=document.getElementById('tab-btn-foto');
      if(pass) pass.textContent='Password';
      if(usr) usr.textContent='Data Diri';
      if(foto) foto.textContent='Foto & Tanda Tangan';
    },0);
  }

  function openProfile(){
    closeAll();
    if(typeof openAccountModal==='function') openAccountModal();
    if(typeof switchAccountTab==='function') switchAccountTab('user');
    prepareProfileModal();
  }
  async function doLogout(){
    closeAll();
    if(typeof logout==='function') return logout();
    try{localStorage.removeItem('cqlass_session_token')}catch(_){}
    location.reload();
  }

  function buildMenu(){
    const menu=document.createElement('div');
    menu.className=MENU_CLASS;
    menu.setAttribute('aria-hidden','true');
    menu.innerHTML=`
      <div class="cq-profile-menu-head">
        <div class="cq-profile-menu-name" data-cq-user-name>${esc(displayName())}</div>
        <div class="cq-profile-menu-meta">${username()?'@'+esc(username()):''}${roleLabel()?` · ${esc(roleLabel())}`:''}</div>
      </div>
      <button type="button" class="cq-profile-menu-item" data-cq-profile-action="profile">
        <span class="cq-profile-menu-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M20 21a8 8 0 0 0-16 0"></path><circle cx="12" cy="7" r="4"></circle></svg></span>
        <span><strong>Profil</strong><small>Nama, username, password, foto & tanda tangan</small></span>
      </button>
      <div class="cq-profile-menu-sep"></div>
      <button type="button" class="cq-profile-menu-item danger" data-cq-profile-action="logout">
        <span class="cq-profile-menu-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><path d="m16 17 5-5-5-5"></path><path d="M21 12H9"></path></svg></span>
        <span><strong>Keluar</strong><small>Keluar dari akun CQlass</small></span>
      </button>`;
    menu.querySelector('[data-cq-profile-action="profile"]').addEventListener('click',openProfile);
    menu.querySelector('[data-cq-profile-action="logout"]').addEventListener('click',doLogout);
    return menu;
  }

  function alignMenu(anchor,menu){
    const r=anchor.getBoundingClientRect();
    if(r.left<220){menu.style.left='0';menu.style.right='auto';menu.style.transformOrigin='top left';}
    else{menu.style.right='0';menu.style.left='auto';menu.style.transformOrigin='top right';}
  }

  function refreshAnchor(anchor){
    const slot=anchor.querySelector(':scope > .user-photo-slot');
    const trigger=anchor.querySelector(':scope > .cq-profile-trigger');
    if(slot){
      slot.setAttribute('tabindex','-1');
      slot.removeAttribute('role');
      slot.removeAttribute('aria-label');
      slot.title='';
      slot.style.cursor='default';
    }
    if(trigger){
      trigger.setAttribute('aria-label','Buka menu profil');
      trigger.title='Profil';
    }
  }

  function decorateSlot(slot){
    if(!slot) return;
    let anchor=slot.parentElement;
    if(!anchor?.classList.contains('cq-profile-menu-anchor')){
      anchor=document.createElement('div');
      anchor.className='cq-profile-menu-anchor';
      slot.parentNode.insertBefore(anchor,slot);
      anchor.appendChild(slot);
    }

    if(!anchor.querySelector(':scope > .cq-profile-trigger')){
      const trigger=document.createElement('button');
      trigger.type='button';
      trigger.className='cq-profile-trigger';
      trigger.setAttribute('aria-haspopup','menu');
      trigger.setAttribute('aria-expanded','false');
      trigger.setAttribute('aria-label','Buka menu profil');
      anchor.appendChild(trigger);

      const menu=buildMenu();
      anchor.appendChild(menu);

      const toggle=e=>{
        e?.preventDefault?.();e?.stopPropagation?.();
        const willOpen=!menu.classList.contains('open');
        closeAll(menu);
        if(willOpen){
          menu.querySelector('.cq-profile-menu-name').textContent=displayName();
          const meta=menu.querySelector('.cq-profile-menu-meta');
          if(meta) meta.textContent=(username()?'@'+username():'')+(roleLabel()?' · '+roleLabel():'');
          alignMenu(anchor,menu);
        }
        menu.classList.toggle('open',willOpen);
        menu.setAttribute('aria-hidden',String(!willOpen));
        trigger.setAttribute('aria-expanded',String(willOpen));
      };
      trigger.addEventListener('click',toggle);
      trigger.addEventListener('keydown',e=>{if(e.key==='Escape'){closeAll();trigger.focus();}});
    }
    refreshAnchor(anchor);
    slot.dataset.cqProfileMenuReady='1';
  }

  function decorate(){
    hideLegacyHeaderButtons();
    document.querySelectorAll('.user-photo-slot').forEach(decorateSlot);
    document.querySelectorAll('.cq-profile-menu-anchor').forEach(refreshAnchor);
  }

  const style=document.createElement('style');
  style.id='cq-profile-dropdown-css';
  style.textContent=`
    .cq-profile-menu-anchor{position:relative;display:inline-flex;align-items:center;flex:0 0 auto;z-index:1200}
    .cq-profile-menu-anchor>.user-photo-slot{pointer-events:none!important;box-shadow:0 0 0 2px rgba(255,255,255,.18),0 0 0 3px rgba(10,110,110,.08)!important;transform:none!important}
    .cq-profile-trigger{position:absolute;inset:-4px;border:0;border-radius:50%;background:transparent;cursor:pointer;z-index:3;padding:0}.cq-profile-trigger:hover{box-shadow:0 0 0 3px rgba(255,255,255,.14)}.cq-profile-trigger:focus-visible{outline:3px solid rgba(255,255,255,.75);outline-offset:2px}
    .cq-profile-menu{position:absolute;top:calc(100% + 10px);width:min(300px,calc(100vw - 24px));background:#fff;border:1px solid rgba(18,105,101,.12);border-radius:16px;padding:8px;box-shadow:0 18px 50px rgba(8,56,54,.18);opacity:0;visibility:hidden;transform:translateY(-6px) scale(.98);transition:opacity .15s ease,transform .15s ease,visibility .15s ease;z-index:100000;color:#173d3b}
    .cq-profile-menu.open{opacity:1;visibility:visible;transform:translateY(0) scale(1)}
    .cq-profile-menu-head{padding:10px 11px 9px}.cq-profile-menu-name{font-size:14px;font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.cq-profile-menu-meta{margin-top:2px;font-size:11px;color:#718987;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .cq-profile-menu-item{width:100%;border:0;background:transparent;border-radius:11px;padding:10px;display:flex;align-items:center;gap:10px;text-align:left;color:#244a49;cursor:pointer;font:inherit}.cq-profile-menu-item:hover{background:#eef8f6}.cq-profile-menu-item>span:last-child{display:flex;flex-direction:column;gap:2px;min-width:0}.cq-profile-menu-item strong{font-size:13px}.cq-profile-menu-item small{font-size:10.5px;color:#78908e;white-space:normal;line-height:1.3}
    .cq-profile-menu-icon{width:34px;height:34px;border-radius:10px;background:#e8f4f4;color:#0a6e6e;display:grid;place-items:center;flex:0 0 auto}.cq-profile-menu-icon svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}
    .cq-profile-menu-sep{height:1px;background:#edf3f2;margin:5px 4px}.cq-profile-menu-item.danger{color:#b14b43}.cq-profile-menu-item.danger:hover{background:#fff2f1}.cq-profile-menu-item.danger .cq-profile-menu-icon{background:#fff0ee;color:#b14b43}
    @media(max-width:600px){.cq-profile-menu{top:calc(100% + 8px);width:min(286px,calc(100vw - 18px));border-radius:14px}.cq-profile-menu-item{padding:11px 10px}}
  `;
  document.head.appendChild(style);

  document.addEventListener('click',e=>{if(!e.target.closest?.('.cq-profile-menu-anchor'))closeAll();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeAll();});

  const observer=new MutationObserver(decorate);
  observer.observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',decorate,{once:true});else decorate();
})();
