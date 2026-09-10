/* CQlass — foto profil pengguna (Supabase Storage + auto resize) */
(function(){
  'use strict';

  const ENDPOINT = (typeof SUPABASE_URL !== 'undefined' ? SUPABASE_URL : 'https://lmglkxzemtvxcgktiord.supabase.co') + '/functions/v1/profile-photo';
  const state = { base64:null, mime:'image/jpeg', previewUrl:'', busy:false };
  let loadedKey = '';
  let loadingPromise = null;
  const legacyUpdateProfilePhotoUI = typeof updateProfilePhotoUI === 'function' ? updateProfilePhotoUI : null;

  function user(){
    try{ return (typeof currentUser !== 'undefined' && currentUser) ? currentUser : null; }
    catch(_){ return null; }
  }
  function token(){
    try{ return typeof getAuthToken === 'function' ? getAuthToken() : (localStorage.getItem('cqlass_session_token') || ''); }
    catch(_){ return ''; }
  }
  function key(){
    const u=user();
    return u ? String(u.id || u.user_account_id || u.username || '') : '';
  }
  function esc(v){
    if(typeof escapeHtml === 'function') return escapeHtml(v);
    return String(v == null ? '' : v).replace(/[&<>"']/g, function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]});
  }
  function initials(){
    const u=user();
    const name=String(u?.nama || u?.full_name || u?.username || '?').trim();
    const parts=name.split(/\s+/).filter(Boolean);
    return (parts.length>1 ? (parts[0][0]+parts[parts.length-1][0]) : name.slice(0,1)).toUpperCase() || '?';
  }
  function saveLocalUser(){
    const u=user(); if(!u) return;
    try{
      localStorage.setItem('cqlass_user', JSON.stringify(u));
      sessionStorage.setItem('kesiswaan_user', JSON.stringify(u));
      if(typeof saveAuthSession === 'function') saveAuthSession(token(), localStorage.getItem('cqlass_session_expires_at') || '', u);
    }catch(_){ }
  }
  function setMessage(type, text){
    const id=type==='error'?'foto-error':'foto-success';
    const other=document.getElementById(type==='error'?'foto-success':'foto-error');
    const el=document.getElementById(id);
    if(other) other.style.display='none';
    if(el){ el.textContent=text||''; el.style.display=text?'block':'none'; }
  }
  function setBusy(busy){
    state.busy=busy;
    const btn=document.getElementById('foto-profil-save-btn');
    const rm=document.getElementById('foto-profil-remove-btn');
    const input=document.getElementById('foto-profil-input');
    if(btn){ btn.disabled=busy; btn.innerHTML=busy?'<span class="spinner"></span>Menyimpan...':'Simpan Foto'; }
    if(rm) rm.disabled=busy;
    if(input) input.disabled=busy;
  }
  function renderSlots(){
    const u=user(); if(!u) return;
    const photo=String(u.fotoProfil || u.foto_profil || u.profile_photo_url || '').trim();
    document.querySelectorAll('.user-photo-slot').forEach(function(el){
      if(photo){
        el.innerHTML='<img src="'+esc(photo)+'" alt="Foto profil">';
      }else{
        el.innerHTML='<span class="foto-profil-fallback">'+esc(initials())+'</span>';
      }
      el.setAttribute('title','Klik untuk mengganti foto profil');
      el.setAttribute('role','button');
      el.setAttribute('tabindex','0');
      el.style.cursor='pointer';
      if(!el.dataset.profilePhotoBound){
        el.dataset.profilePhotoBound='1';
        const open=function(){
          if(typeof openAccountModal==='function') openAccountModal();
          if(typeof switchAccountTab==='function') switchAccountTab('foto');
        };
        el.addEventListener('click',open);
        el.addEventListener('keydown',function(e){ if(e.key==='Enter'||e.key===' '){e.preventDefault();open();} });
      }
    });
  }
  function renderPreview(url){
    const el=document.getElementById('foto-profil-preview');
    if(!el) return;
    if(url) el.innerHTML='<img src="'+esc(url)+'" alt="Foto profil">';
    else el.innerHTML='<span class="foto-profil-fallback foto-profil-fallback-large">'+esc(initials())+'</span>';
  }

  async function request(method, body){
    const t=token();
    if(!t) throw new Error('Sesi login tidak ditemukan. Silakan masuk kembali.');
    const headers={
      'apikey': typeof SUPABASE_PUBLISHABLE_KEY !== 'undefined' ? SUPABASE_PUBLISHABLE_KEY : '',
      'Authorization':'Bearer '+(typeof SUPABASE_PUBLISHABLE_KEY !== 'undefined' ? SUPABASE_PUBLISHABLE_KEY : ''),
      'x-session-token':t
    };
    if(body!==undefined) headers['Content-Type']='application/json';
    const res=await fetch(ENDPOINT,{method:method,headers:headers,body:body===undefined?undefined:JSON.stringify(body)});
    const raw=await res.text();
    let data={};
    try{ data=raw?JSON.parse(raw):{}; }catch(_){ throw new Error('Respons foto profil tidak valid.'); }
    if(!res.ok || data.success===false){
      const code=String(data.error||'');
      const map={session_invalid:'Sesi login berakhir. Silakan masuk kembali.',invalid_image_type:'Format foto tidak didukung.',image_too_large:'Ukuran foto masih terlalu besar.',image_empty:'Foto belum dipilih.'};
      throw new Error(map[code]||'Foto profil belum dapat diproses.');
    }
    return data;
  }

  async function loadProfilePhoto(force){
    const u=user(); const k=key();
    if(!u||!k) return null;
    if(!force && loadedKey===k) return u.fotoProfil || null;
    if(loadingPromise && !force) return loadingPromise;
    loadingPromise=(async function(){
      try{
        const data=await request('GET');
        u.fotoProfil=data.exists && data.url ? data.url : null;
        loadedKey=k;
        saveLocalUser();
        renderSlots();
        return u.fotoProfil;
      }catch(err){
        console.warn('Foto profil:',err);
        loadedKey=k;
        renderSlots();
        return null;
      }finally{ loadingPromise=null; }
    })();
    return loadingPromise;
  }

  function loadImage(file){
    return new Promise(function(resolve,reject){
      const url=URL.createObjectURL(file);
      const img=new Image();
      img.onload=function(){ URL.revokeObjectURL(url); resolve(img); };
      img.onerror=function(){ URL.revokeObjectURL(url); reject(new Error('File gambar tidak dapat dibaca.')); };
      img.src=url;
    });
  }
  function bytesFromDataUrl(dataUrl){
    const base64=String(dataUrl).split(',')[1]||'';
    return Math.ceil(base64.length*3/4);
  }
  async function compressSquare(file){
    if(!/^image\/(jpeg|png|webp)$/i.test(file.type||'')) throw new Error('Gunakan foto JPG, PNG, atau WEBP.');
    if(file.size>30*1024*1024) throw new Error('Foto terlalu besar. Maksimal file asli 30 MB.');
    const img=await loadImage(file);
    const w=img.naturalWidth||img.width, h=img.naturalHeight||img.height;
    if(!w||!h) throw new Error('Ukuran foto tidak valid.');
    const side=Math.min(w,h), sx=(w-side)/2, sy=(h-side)/2;
    let size=640, quality=.86, dataUrl='';
    for(let pass=0;pass<3;pass++){
      const canvas=document.createElement('canvas');
      canvas.width=size; canvas.height=size;
      const ctx=canvas.getContext('2d',{alpha:false});
      ctx.fillStyle='#ffffff'; ctx.fillRect(0,0,size,size);
      ctx.drawImage(img,sx,sy,side,side,0,0,size,size);
      quality=.86;
      do{
        dataUrl=canvas.toDataURL('image/jpeg',quality);
        quality-=.08;
      }while(bytesFromDataUrl(dataUrl)>420*1024 && quality>=.5);
      if(bytesFromDataUrl(dataUrl)<=600*1024) break;
      size=Math.max(420,Math.round(size*.8));
    }
    return {dataUrl:dataUrl,base64:dataUrl.split(',')[1],mime:'image/jpeg'};
  }

  window.handleFotoProfilSelect=async function(event){
    const file=event?.target?.files?.[0];
    if(!file) return;
    setMessage('error',''); setMessage('success','');
    const preview=document.getElementById('foto-profil-preview');
    if(preview) preview.innerHTML='<span class="spinner"></span>';
    try{
      const out=await compressSquare(file);
      state.base64=out.base64; state.mime=out.mime; state.previewUrl=out.dataUrl;
      renderPreview(out.dataUrl);
      setMessage('success','Foto siap disimpan. Sistem sudah menyesuaikan ukuran otomatis.');
    }catch(err){
      state.base64=null; state.previewUrl='';
      renderPreview(user()?.fotoProfil||'');
      setMessage('error',err.message||'Foto tidak dapat diproses.');
      if(event?.target) event.target.value='';
    }
  };

  window.submitFotoProfil=async function(){
    if(state.busy) return;
    if(!state.base64){ setMessage('error','Pilih foto terlebih dahulu.'); return; }
    setBusy(true); setMessage('error',''); setMessage('success','');
    try{
      const data=await request('POST',{base64:state.base64,mime_type:state.mime});
      const u=user();
      if(u) u.fotoProfil=data.url||null;
      loadedKey=key();
      state.base64=null; state.previewUrl='';
      saveLocalUser(); renderSlots(); renderPreview(data.url||'');
      const rm=document.getElementById('foto-profil-remove-btn'); if(rm) rm.style.display=data.url?'inline-flex':'none';
      const input=document.getElementById('foto-profil-input'); if(input) input.value='';
      setMessage('success','Foto profil berhasil diganti.');
      if(typeof showToast==='function') showToast('Foto profil berhasil diganti');
    }catch(err){ setMessage('error',err.message||'Foto profil gagal disimpan.'); }
    finally{ setBusy(false); }
  };

  window.hapusFotoProfilUser=async function(){
    if(state.busy) return;
    setBusy(true); setMessage('error',''); setMessage('success','');
    try{
      await request('DELETE');
      const u=user(); if(u) u.fotoProfil=null;
      loadedKey=key(); state.base64=null; state.previewUrl='';
      saveLocalUser(); renderSlots(); renderPreview('');
      const rm=document.getElementById('foto-profil-remove-btn'); if(rm) rm.style.display='none';
      const input=document.getElementById('foto-profil-input'); if(input) input.value='';
      setMessage('success','Foto profil dihapus.');
      if(typeof showToast==='function') showToast('Foto profil dihapus');
    }catch(err){ setMessage('error',err.message||'Foto profil gagal dihapus.'); }
    finally{ setBusy(false); }
  };

  window.renderFotoProfilTab=async function(){
    state.base64=null; state.previewUrl='';
    setMessage('error',''); setMessage('success','');
    const input=document.getElementById('foto-profil-input'); if(input) input.value='';
    const preview=document.getElementById('foto-profil-preview'); if(preview) preview.innerHTML='<span class="spinner"></span>';
    await loadProfilePhoto(true);
    const u=user(); const url=u?.fotoProfil||'';
    renderPreview(url);
    const rm=document.getElementById('foto-profil-remove-btn'); if(rm) rm.style.display=url?'inline-flex':'none';
    if(typeof renderTeacherSignaturePanel==='function') renderTeacherSignaturePanel();
  };

  window.updateProfilePhotoUI=function(){
    try{ if(legacyUpdateProfilePhotoUI) legacyUpdateProfilePhotoUI(); }catch(_){ }
    renderSlots();
    loadProfilePhoto(false);
  };

  const style=document.createElement('style');
  style.textContent='.user-photo-slot{box-shadow:0 0 0 2px rgba(10,110,110,.10);transition:transform .15s ease,box-shadow .15s ease}.user-photo-slot:hover{transform:scale(1.05);box-shadow:0 0 0 3px rgba(10,110,110,.18)}.foto-profil-fallback-large{font-size:28px}.modal-field input[type=file]{padding:9px;background:#fff}.modal-field input[type=file]::file-selector-button{border:0;border-radius:8px;padding:8px 12px;margin-right:10px;background:#e8f4f4;color:#0a6e6e;font-weight:700;cursor:pointer}';
  document.head.appendChild(style);

  function loadAccountSettingsFix(){
    if(document.querySelector('script[data-cq-account-settings-fix]')) return;
    const script=document.createElement('script');
    script.src='account-settings-fix.js?v=20260910-account1';
    script.dataset.cqAccountSettingsFix='1';
    document.head.appendChild(script);
  }
  loadAccountSettingsFix();

  document.addEventListener('DOMContentLoaded',function(){
    renderSlots();
    setTimeout(function(){ loadProfilePhoto(false); },0);
  });
})();