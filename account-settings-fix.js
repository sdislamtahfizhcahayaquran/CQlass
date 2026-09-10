/* CQlass — account/profile UX fix: full name + username + global password eye + walas signature access */
(function(){
  'use strict';

  function user(){
    try { return (typeof currentUser !== 'undefined' && currentUser) ? currentUser : null; }
    catch(_){ return null; }
  }
  function esc(v){
    if(typeof escapeHtml === 'function') return escapeHtml(v);
    return String(v == null ? '' : v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#039;'}[c]||c});
  }
  function eyeSvg(hidden){
    return hidden
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z"/><circle cx="12" cy="12" r="3"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3l18 18"/><path d="M10.6 10.6a2 2 0 0 0 2.8 2.8"/><path d="M9.9 4.2A10.5 10.5 0 0 1 12 4c7 0 10 8 10 8a15 15 0 0 1-2.1 3.1"/><path d="M6.6 6.6C3.8 8.5 2 12 2 12s3 8 10 8a9.8 9.8 0 0 0 5.4-1.6"/></svg>';
  }
  function enhancePasswordInput(input){
    if(!input || input.dataset.cqEyeReady === '1') return;
    if(input.id === 'login-password' && input.parentElement?.querySelector('.toggle-pass')){
      input.dataset.cqEyeReady='1';
      return;
    }
    if(input.parentElement?.classList?.contains('cq-password-wrap')){
      input.dataset.cqEyeReady='1';
      return;
    }
    const parent=input.parentNode;
    if(!parent) return;
    const wrap=document.createElement('div');
    wrap.className='cq-password-wrap';
    parent.insertBefore(wrap,input);
    wrap.appendChild(input);
    const btn=document.createElement('button');
    btn.type='button';
    btn.className='cq-password-eye';
    btn.setAttribute('aria-label','Tampilkan password');
    btn.setAttribute('aria-pressed','false');
    btn.innerHTML=eyeSvg(true);
    btn.addEventListener('click',function(){
      const hidden=input.type === 'password';
      input.type=hidden?'text':'password';
      btn.setAttribute('aria-label',hidden?'Sembunyikan password':'Tampilkan password');
      btn.setAttribute('aria-pressed',String(hidden));
      btn.innerHTML=eyeSvg(!hidden);
      input.focus({preventScroll:true});
      try{ input.setSelectionRange(input.value.length,input.value.length); }catch(_){ }
    });
    wrap.appendChild(btn);
    input.dataset.cqEyeReady='1';
  }
  function enhancePasswordInputs(root){
    const scope=root && root.querySelectorAll ? root : document;
    scope.querySelectorAll('input[type="password"]').forEach(enhancePasswordInput);
  }

  function saveUserLocal(){
    const u=user(); if(!u) return;
    try{
      localStorage.setItem('cqlass_user',JSON.stringify(u));
      sessionStorage.setItem('kesiswaan_user',JSON.stringify(u));
      if(typeof saveAuthSession === 'function'){
        saveAuthSession(typeof getAuthToken==='function'?getAuthToken():'',localStorage.getItem('cqlass_session_expires_at')||'',u);
      }
    }catch(_){ }
  }
  function refreshUserLabels(){
    const u=user(); if(!u) return;
    const nameEl=document.getElementById('user-name');
    if(nameEl) nameEl.textContent=u.nama||u.full_name||u.username||'Pengguna';
    document.querySelectorAll('[data-cq-user-name]').forEach(function(el){el.textContent=u.nama||u.full_name||u.username||'Pengguna';});
    try{ if(typeof updateProfilePhotoUI==='function') updateProfilePhotoUI(); }catch(_){ }
  }

  function ensureAccountIdentityUI(prefill){
    const form=document.getElementById('form-user');
    if(!form) return;
    const tab=document.getElementById('tab-btn-user');
    if(tab) tab.textContent='Data Akun';

    const username=document.getElementById('user-new');
    if(username){
      username.autocomplete='username';
      const label=username.closest('.modal-field')?.querySelector('label');
      if(label) label.textContent='Username';
    }

    if(!document.getElementById('user-name-new')){
      const field=document.createElement('div');
      field.className='modal-field';
      field.innerHTML='<label for="user-name-new">Nama Lengkap</label><input type="text" id="user-name-new" autocomplete="name" maxlength="120" required>';
      const usernameField=username?.closest('.modal-field');
      if(usernameField) form.insertBefore(field,usernameField);
      else form.insertBefore(field,form.firstChild);
    }

    const verify=document.getElementById('user-pass-verify');
    if(verify){
      verify.autocomplete='current-password';
      const label=verify.closest('.modal-field')?.querySelector('label');
      if(label) label.textContent='Password Saat Ini (verifikasi)';
    }
    const btn=document.getElementById('user-submit-btn');
    if(btn) btn.textContent='Simpan Data Akun';

    const u=user();
    const nameInput=document.getElementById('user-name-new');
    if(u && (prefill || !nameInput?.value)) nameInput.value=String(u.nama||u.full_name||'').trim();
    if(u && username && (prefill || !username.value)) username.value=String(u.username||'').trim().toLowerCase();
    if(prefill && verify) verify.value='';
    enhancePasswordInputs(form);
  }

  function profileError(code){
    const map={
      current_password_required:'Password saat ini wajib diisi.',
      current_password_wrong:'Password saat ini salah.',
      invalid_username:'Username minimal 4 karakter dan hanya boleh memakai huruf kecil, angka, titik, atau underscore.',
      username_taken:'Username tersebut sudah dipakai akun lain.',
      name_required:'Nama lengkap wajib diisi.',
      name_too_long:'Nama lengkap terlalu panjang.',
      teacher_not_linked:'Akun ini belum terhubung ke data guru.',
      session_invalid:'Sesi login sudah tidak berlaku. Silakan masuk kembali.',
      session_expired:'Sesi login telah berakhir. Silakan masuk kembali.'
    };
    return map[String(code||'')] || (typeof authErrorMessage==='function'?authErrorMessage(code):'Data akun belum dapat disimpan.');
  }

  window.submitGantiUsername=async function(e){
    e?.preventDefault?.();
    const errEl=document.getElementById('user-error');
    const okEl=document.getElementById('user-success');
    const btn=document.getElementById('user-submit-btn');
    if(errEl) errEl.style.display='none';
    if(okEl) okEl.style.display='none';
    ensureAccountIdentityUI(false);

    const u=user();
    const currentPassword=document.getElementById('user-pass-verify')?.value||'';
    const newUsername=(document.getElementById('user-new')?.value||'').trim().toLowerCase();
    const newFullName=(document.getElementById('user-name-new')?.value||'').trim().replace(/\s+/g,' ');
    const fail=function(message){if(errEl){errEl.textContent=message;errEl.style.display='block';}return false;};

    if(!currentPassword) return fail('Password saat ini wajib diisi untuk menyimpan perubahan.');
    if(!newFullName) return fail('Nama lengkap wajib diisi.');
    if(newFullName.length>120) return fail('Nama lengkap terlalu panjang.');
    if(newUsername.length<4 || !/^[a-z0-9._]+$/.test(newUsername)) return fail('Username minimal 4 karakter; gunakan huruf kecil, angka, titik, atau underscore.');
    if(u && newUsername===String(u.username||'').toLowerCase() && newFullName===String(u.nama||u.full_name||'').trim().replace(/\s+/g,' ')) return fail('Belum ada perubahan pada nama atau username.');

    if(btn){btn.disabled=true;btn.innerHTML='<span class="spinner"></span>Menyimpan...';}
    try{
      if(typeof authRequest!=='function') throw new Error('Layanan akun belum tersedia.');
      const res=await authRequest('change_profile',{current_password:currentPassword,new_username:newUsername,new_full_name:newFullName});
      if(!res.success) return fail(profileError(res.error));

      if(u){
        const fresh=res.user && typeof normalizeAuthUser==='function' ? normalizeAuthUser(res.user) : (res.user||{});
        Object.assign(u,fresh,{username:res.new_username||res.username||newUsername,nama:res.full_name||fresh.nama||newFullName});
      }
      saveUserLocal();
      refreshUserLabels();
      ensureAccountIdentityUI(true);
      if(okEl){okEl.textContent='Nama lengkap dan username berhasil disimpan.';okEl.style.display='block';}
      if(typeof showToast==='function') showToast('Data akun berhasil diperbarui');
    }catch(err){
      fail(err?.message||'Gagal terhubung ke server.');
    }finally{
      if(btn){btn.disabled=false;btn.textContent='Simpan Data Akun';}
    }
    return false;
  };

  const legacyOpen=typeof openAccountModal==='function'?openAccountModal:null;
  if(legacyOpen){
    window.openAccountModal=function(){
      const out=legacyOpen.apply(this,arguments);
      setTimeout(function(){ensureAccountIdentityUI(true);enhancePasswordInputs(document.getElementById('account-modal')||document);},0);
      return out;
    };
  }
  const legacySwitch=typeof switchAccountTab==='function'?switchAccountTab:null;
  if(legacySwitch){
    window.switchAccountTab=function(tab){
      const out=legacySwitch.apply(this,arguments);
      if(tab==='user') setTimeout(function(){ensureAccountIdentityUI(false);},0);
      else setTimeout(function(){enhancePasswordInputs(document.getElementById('account-modal')||document);},0);
      return out;
    };
  }

  window.signatureRoleAllowed=function(){
    const u=user(); if(!u) return false;
    const role=String(u.role||'').toLowerCase();
    const roles=Array.isArray(u.roles)?u.roles.map(function(x){return String(x||'').toLowerCase();}):[];
    return role==='walas'||role==='pimpinan'||role==='admin'||u.is_walas===true||roles.includes('walas');
  };

  const css=document.createElement('style');
  css.id='cq-account-settings-fix-css';
  css.textContent='.cq-password-wrap{position:relative;width:100%;display:block}.cq-password-wrap>input{padding-right:46px!important;box-sizing:border-box}.cq-password-eye{position:absolute;right:7px;top:50%;transform:translateY(-50%);width:34px;height:34px;border:0;border-radius:8px;background:transparent;color:var(--muted,#70817f);display:flex;align-items:center;justify-content:center;cursor:pointer;padding:0;z-index:3}.cq-password-eye:hover{background:rgba(10,110,110,.08);color:var(--primary,#0A6E6E)}.cq-password-eye:focus-visible{outline:2px solid var(--primary,#0A6E6E);outline-offset:1px}.cq-password-eye svg{width:18px;height:18px;display:block}.av2table .cq-password-wrap{min-width:120px}.av2table .cq-password-eye{right:3px;width:30px;height:30px}';
  document.head.appendChild(css);

  function start(){
    ensureAccountIdentityUI(false);
    enhancePasswordInputs(document);
    if(document.body){
      const observer=new MutationObserver(function(mutations){
        for(const m of mutations){
          for(const n of m.addedNodes){
            if(n.nodeType!==1) continue;
            if(n.matches?.('input[type="password"]')) enhancePasswordInput(n);
            enhancePasswordInputs(n);
          }
        }
      });
      observer.observe(document.body,{childList:true,subtree:true});
    }
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
