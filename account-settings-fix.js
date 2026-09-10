/* CQlass — account/profile + password eye + reliable signature upload */
(function(){
  'use strict';

  function user(){
    try { return (typeof currentUser !== 'undefined' && currentUser) ? currentUser : null; }
    catch(_){ return null; }
  }
  function esc(v){
    if(typeof escapeHtml === 'function') return escapeHtml(v);
    return String(v == null ? '' : v).replace(/[&<>"']/g,function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c] || c;
    });
  }

  /* ---------- Password eye: all roles / all dynamic fields ---------- */
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
      const show=input.type === 'password';
      input.type=show ? 'text' : 'password';
      btn.setAttribute('aria-label',show?'Sembunyikan password':'Tampilkan password');
      btn.setAttribute('aria-pressed',String(show));
      btn.innerHTML=eyeSvg(!show);
      input.focus({preventScroll:true});
      try{ input.setSelectionRange(input.value.length,input.value.length); }catch(_){}
    });
    wrap.appendChild(btn);
    input.dataset.cqEyeReady='1';
  }
  function enhancePasswordInputs(root){
    const scope=root && root.querySelectorAll ? root : document;
    scope.querySelectorAll('input[type="password"]').forEach(enhancePasswordInput);
  }

  /* ---------- Account data: full name + username ---------- */
  function saveUserLocal(){
    const u=user(); if(!u) return;
    try{
      localStorage.setItem('cqlass_user',JSON.stringify(u));
      sessionStorage.setItem('kesiswaan_user',JSON.stringify(u));
      if(typeof saveAuthSession === 'function'){
        saveAuthSession(typeof getAuthToken==='function'?getAuthToken():'',localStorage.getItem('cqlass_session_expires_at')||'',u);
      }
    }catch(_){}
  }
  function refreshUserLabels(){
    const u=user(); if(!u) return;
    const nameEl=document.getElementById('user-name');
    if(nameEl) nameEl.textContent=u.nama||u.full_name||u.username||'Pengguna';
    document.querySelectorAll('[data-cq-user-name]').forEach(function(el){
      el.textContent=u.nama||u.full_name||u.username||'Pengguna';
    });
    try{ if(typeof updateProfilePhotoUI==='function') updateProfilePhotoUI(); }catch(_){}
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

    const u=user(), nameInput=document.getElementById('user-name-new');
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
    const errEl=document.getElementById('user-error'), okEl=document.getElementById('user-success'), btn=document.getElementById('user-submit-btn');
    if(errEl) errEl.style.display='none';
    if(okEl) okEl.style.display='none';
    ensureAccountIdentityUI(false);

    const u=user();
    const currentPassword=document.getElementById('user-pass-verify')?.value||'';
    const newUsername=(document.getElementById('user-new')?.value||'').trim().toLowerCase();
    const newFullName=(document.getElementById('user-name-new')?.value||'').trim().replace(/\s+/g,' ');
    const fail=function(message){
      if(errEl){errEl.textContent=message;errEl.style.display='block';}
      return false;
    };
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

  /* ---------- Walas signature access ---------- */
  window.signatureRoleAllowed=function(){
    const u=user(); if(!u) return false;
    const role=String(u.role||'').toLowerCase();
    const roles=Array.isArray(u.roles)?u.roles.map(function(x){return String(x||'').toLowerCase();}):[];
    return role==='walas'||role==='pimpinan'||role==='admin'||u.is_walas===true||roles.includes('walas');
  };

  /* ---------- Reliable signature image processing ---------- */
  function signatureMsg(text,isError){
    const msg=document.getElementById('teacher-signature-msg');
    if(msg){
      msg.textContent=text||'';
      msg.style.color=isError?'#b44535':'var(--muted,#70817f)';
      msg.style.fontWeight=isError?'700':'400';
    }
  }
  function signaturePreview(html){
    const preview=document.getElementById('teacher-signature-preview');
    if(preview) preview.innerHTML=html;
  }
  function setSignatureSaveEnabled(enabled){
    const btn=document.getElementById('teacher-signature-save');
    if(btn) btn.disabled=!enabled;
  }
  function dataUrlBytes(url){
    const b64=String(url||'').split(',')[1]||'';
    return Math.ceil(b64.length*3/4);
  }
  function loadFileImage(file){
    return new Promise(function(resolve,reject){
      const objectUrl=URL.createObjectURL(file);
      const img=new Image();
      img.onload=function(){ URL.revokeObjectURL(objectUrl); resolve(img); };
      img.onerror=function(){ URL.revokeObjectURL(objectUrl); reject(new Error('Foto tidak dapat dibaca browser. Gunakan JPG, PNG, atau WEBP.')); };
      img.src=objectUrl;
    });
  }
  function median(values){
    values.sort(function(a,b){return a-b;});
    return values[Math.floor(values.length/2)]||255;
  }
  function removeSignatureBackground(img){
    const iw=img.naturalWidth||img.width, ih=img.naturalHeight||img.height;
    if(!iw||!ih) throw new Error('Ukuran foto tidak valid.');

    const maxDim=1200;
    const scale=Math.min(1,maxDim/Math.max(iw,ih));
    const w=Math.max(1,Math.round(iw*scale)), h=Math.max(1,Math.round(ih*scale));
    const canvas=document.createElement('canvas');
    canvas.width=w; canvas.height=h;
    const ctx=canvas.getContext('2d',{willReadFrequently:true});
    ctx.drawImage(img,0,0,w,h);

    const image=ctx.getImageData(0,0,w,h), p=image.data;
    const rs=[],gs=[],bs=[];
    const step=Math.max(1,Math.floor(Math.min(w,h)/90));
    function sample(x,y){
      const i=(y*w+x)*4;
      if(p[i+3]>10){rs.push(p[i]);gs.push(p[i+1]);bs.push(p[i+2]);}
    }
    for(let x=0;x<w;x+=step){sample(x,0);sample(x,h-1);}
    for(let y=0;y<h;y+=step){sample(0,y);sample(w-1,y);}
    if(!rs.length) throw new Error('Background foto tidak dapat dideteksi.');

    const bgR=median(rs),bgG=median(gs),bgB=median(bs);
    const bgLum=.299*bgR+.587*bgG+.114*bgB;
    let minX=w,minY=h,maxX=-1,maxY=-1,fg=0;

    for(let y=0;y<h;y++){
      for(let x=0;x<w;x++){
        const i=(y*w+x)*4;
        if(p[i+3]===0) continue;
        const r=p[i],g=p[i+1],b=p[i+2];
        const dr=r-bgR,dg=g-bgG,db=b-bgB;
        const dist=Math.sqrt(dr*dr+dg*dg+db*db);
        const lum=.299*r+.587*g+.114*b;
        const lumDist=Math.abs(lum-bgLum);
        const chroma=Math.max(r,g,b)-Math.min(r,g,b);
        const metric=Math.max(dist,lumDist*1.45,chroma*.5);
        let alpha=0;
        if(metric<=18) alpha=0;
        else if(metric<70) alpha=Math.round(255*((metric-18)/52));
        else alpha=255;
        p[i+3]=Math.min(alpha,p[i+3]);
        if(p[i+3]>50){
          if(x<minX)minX=x;if(x>maxX)maxX=x;if(y<minY)minY=y;if(y>maxY)maxY=y;fg++;
        }
      }
    }
    if(maxX<0 || fg<15) throw new Error('Coretan tanda tangan tidak terdeteksi. Pastikan tanda tangan cukup gelap dan foto tidak blur.');
    ctx.putImageData(image,0,0);

    const pad=Math.max(10,Math.round(Math.max(w,h)*.02));
    minX=Math.max(0,minX-pad); minY=Math.max(0,minY-pad);
    maxX=Math.min(w-1,maxX+pad); maxY=Math.min(h-1,maxY+pad);
    const cw=maxX-minX+1, ch=maxY-minY+1;

    let targetW=Math.min(900,cw);
    let out=document.createElement('canvas');
    let ratio=targetW/cw;
    out.width=Math.max(1,Math.round(cw*ratio));
    out.height=Math.max(1,Math.round(ch*ratio));
    out.getContext('2d').drawImage(canvas,minX,minY,cw,ch,0,0,out.width,out.height);

    let url=out.toDataURL('image/png');
    while(dataUrlBytes(url)>900*1024 && out.width>420){
      const next=document.createElement('canvas');
      next.width=Math.max(420,Math.round(out.width*.78));
      next.height=Math.max(1,Math.round(out.height*(next.width/out.width)));
      next.getContext('2d').drawImage(out,0,0,next.width,next.height);
      out=next;
      url=out.toDataURL('image/png');
    }
    if(dataUrlBytes(url)>1024*1024) throw new Error('Hasil foto masih terlalu besar. Coba foto lebih dekat pada area tanda tangan.');
    return url;
  }

  window.processTeacherSignatureImage=async function(file){
    if(!file) throw new Error('Pilih foto tanda tangan.');
    if(!String(file.type||'').startsWith('image/')) throw new Error('File yang dipilih bukan gambar.');
    if(file.size>30*1024*1024) throw new Error('Foto terlalu besar. Maksimal file asli 30 MB.');
    const img=await loadFileImage(file);
    return removeSignatureBackground(img);
  };

  window.handleTeacherSignatureSelect=async function(event){
    const input=event?.target, file=input?.files?.[0];
    if(!file) return;
    try{
      if(typeof teacherSignatureState!=='undefined') teacherSignatureState.pngDataUrl='';
      setSignatureSaveEnabled(false);
      signatureMsg('Membaca '+file.name+' dan menghapus background…',false);
      signaturePreview('<div style="text-align:center;color:var(--muted,#70817f);font-size:12px"><span class="spinner"></span><div style="margin-top:8px">Memproses foto…</div></div>');
      const png=await window.processTeacherSignatureImage(file);
      if(typeof teacherSignatureState!=='undefined') teacherSignatureState.pngDataUrl=png;
      signaturePreview('<img src="'+png+'" alt="Preview tanda tangan" style="max-width:95%;max-height:125px;object-fit:contain">');
      setSignatureSaveEnabled(true);
      signatureMsg('Foto berhasil dibaca dan background sudah dihapus. Klik “Simpan Tanda Tangan”.',false);
    }catch(err){
      if(typeof teacherSignatureState!=='undefined') teacherSignatureState.pngDataUrl='';
      setSignatureSaveEnabled(false);
      signaturePreview('<div style="padding:18px;text-align:center;color:#b44535;font-size:12px;font-weight:700">Foto belum berhasil diproses.</div>');
      signatureMsg(err?.message||'Foto tidak dapat diproses.',true);
      if(typeof showToast==='function') showToast(err?.message||'Foto tidak dapat diproses.',true);
    }
  };

  function prepareSignatureInput(){
    const input=document.getElementById('teacher-signature-file');
    if(!input) return;
    input.accept='image/jpeg,image/png,image/webp,image/*';
    if(input.dataset.cqSignatureReady==='1') return;
    input.dataset.cqSignatureReady='1';
    input.addEventListener('click',function(){ input.value=''; });
    input.addEventListener('change',function(e){
      e.stopImmediatePropagation();
      window.handleTeacherSignatureSelect(e);
    },true);
  }

  const legacyRenderSignature=typeof renderTeacherSignaturePanel==='function'?renderTeacherSignaturePanel:null;
  if(legacyRenderSignature){
    window.renderTeacherSignaturePanel=function(){
      const out=legacyRenderSignature.apply(this,arguments);
      setTimeout(prepareSignatureInput,0);
      return out;
    };
  }

  /* ---------- Modal hooks ---------- */
  const legacyOpen=typeof openAccountModal==='function'?openAccountModal:null;
  if(legacyOpen){
    window.openAccountModal=function(){
      const out=legacyOpen.apply(this,arguments);
      setTimeout(function(){
        ensureAccountIdentityUI(true);
        enhancePasswordInputs(document.getElementById('account-modal')||document);
        prepareSignatureInput();
      },0);
      return out;
    };
  }
  const legacySwitch=typeof switchAccountTab==='function'?switchAccountTab:null;
  if(legacySwitch){
    window.switchAccountTab=function(tab){
      const out=legacySwitch.apply(this,arguments);
      setTimeout(function(){
        if(tab==='user') ensureAccountIdentityUI(false);
        enhancePasswordInputs(document.getElementById('account-modal')||document);
        if(tab==='foto') prepareSignatureInput();
      },0);
      return out;
    };
  }

  const css=document.createElement('style');
  css.id='cq-account-settings-fix-css';
  css.textContent='.cq-password-wrap{position:relative;width:100%;display:block}.cq-password-wrap>input{padding-right:46px!important;box-sizing:border-box}.cq-password-eye{position:absolute;right:7px;top:50%;transform:translateY(-50%);width:34px;height:34px;border:0;border-radius:8px;background:transparent;color:var(--muted,#70817f);display:flex;align-items:center;justify-content:center;cursor:pointer;padding:0;z-index:3}.cq-password-eye:hover{background:rgba(10,110,110,.08);color:var(--primary,#0A6E6E)}.cq-password-eye:focus-visible{outline:2px solid var(--primary,#0A6E6E);outline-offset:1px}.cq-password-eye svg{width:18px;height:18px;display:block}.av2table .cq-password-wrap{min-width:120px}.av2table .cq-password-eye{right:3px;width:30px;height:30px}';
  document.head.appendChild(css);

  function start(){
    ensureAccountIdentityUI(false);
    enhancePasswordInputs(document);
    prepareSignatureInput();
    if(document.body){
      const observer=new MutationObserver(function(mutations){
        for(const m of mutations){
          for(const n of m.addedNodes){
            if(n.nodeType!==1) continue;
            if(n.matches?.('input[type="password"]')) enhancePasswordInput(n);
            enhancePasswordInputs(n);
            if(n.id==='teacher-signature-panel' || n.querySelector?.('#teacher-signature-file')) setTimeout(prepareSignatureInput,0);
          }
        }
      });
      observer.observe(document.body,{childList:true,subtree:true});
    }
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
