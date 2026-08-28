// ==========================================================
// CQLASS 2 — SUPABASE AUTH CONFIG
// ==========================================================
const SUPABASE_URL = 'https://lmglkxzemtvxcgktiord.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_3HyNVUYXakILMKo2SK-DJw_ka7-Yx93';
const AUTH_URL = `${SUPABASE_URL}/functions/v1/auth-user`;
const DASHBOARD_MASTER_URL = `${SUPABASE_URL}/functions/v1/dashboard-master`;
const ATTENDANCE_URL = `${SUPABASE_URL}/functions/v1/attendance`;
const STUDENT_POINTS_URL = `${SUPABASE_URL}/functions/v1/student-points`;

const AUTH_STORAGE = Object.freeze({
  TOKEN: 'cqlass_session_token',
  EXPIRES: 'cqlass_session_expires_at',
  USER: 'cqlass_user'
});

// ==========================================================
// KONFIGURASI — WAJIB DIISI SESUAI DEPLOYMENT ANDA
// ==========================================================
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzNKFqYZ4M6ceOTTR7KdcCeQ4sCXzjVhth1bcAOr_iWGNXJcvNPipjv1K97V4DM3Z-48g/exec';
const APP_SECRET = 'MUss8dN31aFfnLE1sk81o1pqh1Xtf6L2KTA5JLVU';

const AVATAR_RACE_THEME = Object.freeze({
  1:  { main:'#0A6E6E', dark:'#064A4A', soft:'#E8F4F4' },
  2:  { main:'#2D8F6F', dark:'#1A6A50', soft:'#E6F5EE' },
  3:  { main:'#1A4A6A', dark:'#0E3450', soft:'#E4EEF5' },
  4:  { main:'#C97D88', dark:'#9E5965', soft:'#F4DEE2' },
  5:  { main:'#8C78B5', dark:'#66548C', soft:'#E8E2F2' },
  6:  { main:'#9B7B5B', dark:'#6C523B', soft:'#ECE2D7' },
  7:  { main:'#343840', dark:'#1E2126', soft:'#DFE1E4' },
  8:  { main:'#A28B68', dark:'#6F5D43', soft:'#ECE6DC' },
  9:  { main:'#20375F', dark:'#142541', soft:'#DCE4F0' },
  10: { main:'#496A4E', dark:'#2F4934', soft:'#DEE9E0' },
  11: { main:'#2D4778', dark:'#1B2D50', soft:'#DDE4F1' },
  12: { main:'#5E7C64', dark:'#3D5943', soft:'#DFE9E1' }
});

function getAvatarRaceTheme(avatarId){
  return AVATAR_RACE_THEME[Number(avatarId)] || { main:'#0A6E6E', dark:'#064A4A', soft:'#E8F4F4' };
}

/* ==========================================================
   SUPABASE AUTH CLIENT
   ========================================================== */
function getAuthToken(){ return localStorage.getItem(AUTH_STORAGE.TOKEN) || ''; }
function saveAuthSession(token, expiresAt, user){
  if(token) localStorage.setItem(AUTH_STORAGE.TOKEN, token);
  if(expiresAt) localStorage.setItem(AUTH_STORAGE.EXPIRES, expiresAt);
  if(user) localStorage.setItem(AUTH_STORAGE.USER, JSON.stringify(user));
}
function clearAuthSession(){
  Object.values(AUTH_STORAGE).forEach(k => localStorage.removeItem(k));
  sessionStorage.removeItem('kesiswaan_user');
}
function normalizeAuthUser(user={}){
  const teacher=user.teacher||user.guru||{};
  return {
    ...user,
    nama:user.nama||user.full_name||user.name||teacher.full_name||teacher.nama||user.username||'Pengguna',
    username:user.username||'',
    role:String(user.role||user.primary_role||user.role_code||'guru').toLowerCase(),
    kelas:user.kelas||user.class_name||user.walas_class||'',
    must_change_password:Boolean(user.must_change_password),
    username_change_allowed:user.username_change_allowed!==false
  };
}
async function authRequest(action,payload={},options={}){
  const token=options.token!==undefined?options.token:getAuthToken();
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),options.timeoutMs||25000);
  try{
    const body={action,...payload};
    if(token&&!body.session_token) body.session_token=token;
    const headers={
      'Content-Type':'application/json',
      'apikey':SUPABASE_PUBLISHABLE_KEY,
      'Authorization':`Bearer ${SUPABASE_PUBLISHABLE_KEY}`
    };
    if(token) headers['x-session-token']=token;
    const response=await fetch(AUTH_URL,{method:'POST',headers,body:JSON.stringify(body),signal:controller.signal});
    const raw=await response.text();
    let data={};
    try{ data=raw?JSON.parse(raw):{}; }catch(_){ throw new Error(`Respons auth bukan JSON. HTTP ${response.status}.`); }
    if(!response.ok&&data.success!==false){ data.success=false; data.error=data.error||`http_${response.status}`; }
    return data;
  }catch(err){
    if(err?.name==='AbortError') throw new Error('Server login terlalu lama merespons. Silakan coba lagi.');
    throw err;
  }finally{ clearTimeout(timer); }
}
function authErrorMessage(code){
  const m={
    invalid_credentials:'Username atau password salah.',user_not_found:'Akun tidak ditemukan.',
    account_inactive:'Akun sedang tidak aktif. Hubungi admin.',akun_nonaktif:'Akun sedang tidak aktif. Hubungi admin.',
    account_locked:'Akun dikunci sementara karena terlalu banyak percobaan login. Coba lagi nanti.',
    session_invalid:'Sesi login sudah tidak berlaku. Silakan masuk kembali.',session_expired:'Sesi login telah berakhir. Silakan masuk kembali.',
    password_change_required:'Anda wajib mengganti password awal terlebih dahulu.',old_password_wrong:'Password lama salah.',password_lama_salah:'Password lama salah.',
    password_too_short:'Password baru minimal 8 karakter.',password_same:'Password baru harus berbeda dari password lama.',
    username_not_allowed:'Perubahan username tidak diizinkan untuk akun ini.',username_taken:'Username tersebut sudah digunakan.',
    username_sudah_dipakai:'Username tersebut sudah digunakan.',invalid_username:'Username hanya boleh berisi huruf kecil, angka, titik, dan underscore.'
  };
  return m[String(code||'')]||'Terjadi kendala pada autentikasi. Silakan coba lagi.';
}
async function validateSavedSession(){
  const token=getAuthToken(); if(!token) return false;
  const expires=localStorage.getItem(AUTH_STORAGE.EXPIRES);
  if(expires&&Date.parse(expires)<=Date.now()){ clearAuthSession(); return false; }
  try{
    const res=await authRequest('session',{}, {token,timeoutMs:20000});
    if(!res.success){ clearAuthSession(); return false; }
    currentUser=normalizeAuthUser(res.user||res.account||{});
    if(res.must_change_password!==undefined) currentUser.must_change_password=Boolean(res.must_change_password);
    saveAuthSession(token,res.expires_at||expires||'',currentUser);
    return true;
  }catch(err){ console.warn('Validasi session gagal:',err); return false; }
}
function showLoginScreen(){
  const app=document.getElementById('app-screen'), login=document.getElementById('login-screen');
  if(app) app.style.display='none'; if(login) login.style.display='flex';
}
function forceInitialPasswordChange(){
  if(!currentUser?.must_change_password) return;
  const modal=document.getElementById('account-modal'); if(!modal) return;
  modal.classList.add('open'); modal.dataset.forcePassword='1'; switchAccountTab('pass');
  const err=document.getElementById('pass-error');
  if(err){ err.textContent='Untuk keamanan, ganti password awal sebelum menggunakan CQlass.'; err.style.display='block'; }
}

/* ==========================================================
   UTIL: hashing password (Web Crypto API)
   ========================================================== */
async function sha256(text){
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
}
async function hashPassword(username, password){
  return sha256(username.trim().toLowerCase() + ':' + password);
}

/* ==========================================================
   UTIL: panggil backend
   ========================================================== */
async function callApi(action, params={}){
  const body = JSON.stringify({ action, secret: APP_SECRET, ...params });
  const controller = new AbortController();

  // Action berat memang membutuhkan waktu lebih lama di Apps Script.
  // Jangan timeout 20 detik untuk pembuatan PDF/ZIP/XLSX.
  const timeoutByAction = {
    login: 25000,
    generateRaporPTSSiswa: 120000,
    generateRaporPTSKelasZip: 360000,
    requestLaporanGuruBulanan: 180000
  };
  const timeoutMs = timeoutByAction[action] || 30000;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let res;
  try{
    res = await fetch(APPS_SCRIPT_URL, {
      method:'POST',
      headers:{ 'Content-Type':'text/plain;charset=utf-8' },
      body,
      redirect:'follow',
      signal:controller.signal
    });
  }catch(networkErr){
    if(networkErr?.name === 'AbortError'){
      throw new Error(action === 'login'
        ? 'Server login terlalu lama merespons. Silakan coba sekali lagi.'
        : 'Server terlalu lama merespons. Silakan coba lagi.');
    }
    throw new Error('Tidak dapat terhubung ke backend Google Apps Script. Periksa koneksi dan deployment.');
  } finally {
    clearTimeout(timeoutId);
  }

  const raw = await res.text();
  let data;
  try{
    data = JSON.parse(raw);
  }catch(parseErr){
    const looksHtml = /^\s*<!doctype|^\s*<html/i.test(raw || '');
    if(looksHtml){
      throw new Error('Backend mengembalikan halaman HTML, bukan JSON. Pastikan URL Web App /exec dan deployment aktif.');
    }
    throw new Error('Respons backend bukan JSON yang valid. Status HTTP: ' + res.status + '.');
  }

  if(!data.success && action !== 'login' && action !== 'gantiPassword' && action !== 'gantiUsername'){
    showToast('Terjadi kendala. Silakan hubungi admin.', true);
  }
  return data;
}

function userFriendlyDataMessage(message, fallback='Data belum tersedia. Silakan hubungi admin.'){
  const msg = String(message || '');
  const role = String(currentUser?.role || '').toLowerCase();
  const isTeacher = role === 'walas' || role === 'guru';
  if(!isTeacher) return msg || fallback;

  if(/sheet|spreadsheet|masterkkm|masterkomponen|mastermapel|nilaisiswa|database|SHEET_ID|driveapp/i.test(msg)){
    return fallback;
  }
  return msg || fallback;
}

function showToast(msg, isError=false){
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast' + (isError ? ' error' : '');
  t.style.display = 'block';
  setTimeout(()=> t.style.display='none', 3200);
}

function escapeHtml(value){
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function closeDashboardAvatarCards(exceptButton=null){
  document.querySelectorAll('.dash-path-avatar-button.open').forEach(btn => {
    if(btn !== exceptButton){
      btn.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
    }
  });
}

function toggleDashboardAvatar(event, button){
  event.stopPropagation();
  const willOpen = !button.classList.contains('open');
  closeDashboardAvatarCards(button);
  button.classList.toggle('open', willOpen);
  button.setAttribute('aria-expanded', String(willOpen));
}

document.addEventListener('click', () => closeDashboardAvatarCards());
document.addEventListener('keydown', (event) => {
  if(event.key === 'Escape') closeDashboardAvatarCards();
});

/* ==========================================================
   TAMPIL/SEMBUNYIKAN KATA SANDI (login)
   ========================================================== */
function toggleLoginPassword(){
  const input = document.getElementById('login-password');
  const btn = document.getElementById('toggle-pass');
  const icon = document.getElementById('toggle-pass-icon');
  if(!input || !btn || !icon) return;

  const show = input.type === 'password';
  input.type = show ? 'text' : 'password';
  btn.setAttribute('aria-label', show ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi');
  btn.setAttribute('aria-pressed', String(show));

  icon.innerHTML = show
    ? '<path d="M3 3l18 18"/><path d="M10.6 10.6a2 2 0 0 0 2.8 2.8"/><path d="M9.9 4.2A10.5 10.5 0 0 1 12 4c7 0 10 8 10 8a15 15 0 0 1-2.1 3.1"/><path d="M6.6 6.6C3.8 8.5 2 12 2 12s3 8 10 8a9.8 9.8 0 0 0 5.4-1.6"/>'
    : '<path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z"/><circle cx="12" cy="12" r="3"/>';
}
document.getElementById('toggle-pass')?.addEventListener('click', toggleLoginPassword);

/* ==========================================================
   AUTH & SESSION — SUPABASE
   ========================================================== */
let currentUser = null;

document.getElementById('login-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const username=document.getElementById('login-username').value.trim().toLowerCase();
  const password=document.getElementById('login-password').value;
  const errEl=document.getElementById('login-error');
  const btn=document.getElementById('login-btn');
  if(errEl) errEl.style.display='none';
  if(!username||!password){ if(errEl){errEl.textContent='Username dan password wajib diisi.';errEl.style.display='block';} return; }
  btn.disabled=true; btn.innerHTML='<span class="spinner"></span>Memeriksa...';
  try{
    const res=await authRequest('login',{username,password},{token:'',timeoutMs:25000});
    if(!res.success){ if(errEl){errEl.textContent=authErrorMessage(res.error);errEl.style.display='block';} return; }
    const token=res.session_token||res.token||''; if(!token) throw new Error('Server tidak mengirim session token.');
    currentUser=normalizeAuthUser(res.user||res.account||{});
    if(res.must_change_password!==undefined) currentUser.must_change_password=Boolean(res.must_change_password);
    saveAuthSession(token,res.expires_at||'',currentUser);
    enterApp();
    if(currentUser.must_change_password) setTimeout(forceInitialPasswordChange,150);
  }catch(err){ if(errEl){errEl.textContent=err?.message||'Gagal terhubung ke server login.';errEl.style.display='block';} }
  finally{ btn.disabled=false; btn.textContent='Masuk'; }
});

async function logout(){
  if(bellIntervalId){clearInterval(bellIntervalId);bellIntervalId=null;}
  const token=getAuthToken();
  try{ if(token) await authRequest('logout',{}, {token,timeoutMs:10000}); }
  catch(err){ console.warn('Logout server gagal; session lokal tetap dibersihkan.'); }
  finally{ clearAuthSession();currentUser=null;showLoginScreen();document.getElementById('login-form')?.reset(); }
}

window.addEventListener('load', async () => {
  showLoginScreen();
  const ok=await validateSavedSession();
  if(ok){ enterApp(); if(currentUser.must_change_password) setTimeout(forceInitialPasswordChange,150); }
});

/* ==========================================================
   LONCENG NOTIFIKASI (V2)
   ========================================================== */
async function refreshBellNotif(){
  if(!currentUser || currentUser.role !== 'walas' || !currentUser.kelas) return;
  try{
    const res = await callApi('getMyPendingTasks', { username: currentUser.username, kelas: currentUser.kelas });
    const badge = document.getElementById('bell-badge');
    const panel = document.getElementById('bell-panel');
    if(!badge || !panel) return;
    if(res.count > 0){
      badge.textContent = res.count;
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
    panel.innerHTML = res.count > 0
      ? res.tasks.map(t => `<div class="bell-item" onclick="setActiveModule('${t.modul}')" style="cursor:pointer">${escapeHtml(t.label)}</div>`).join('')
      : `<div class="bell-empty">Semua tugas hari ini sudah lengkap.</div>`;
  } catch(err){ /* diamkan, non-kritis */ }
}

function toggleBellPanel(e){
  e.stopPropagation();
  document.getElementById('bell-panel').classList.toggle('open');
}
document.addEventListener('click', () => document.getElementById('bell-panel')?.classList.remove('open'));

/* ==========================================================
   MODAL: UBAH AKUN
   ========================================================== */
function openAccountModal(){
  document.getElementById('account-modal').classList.add('open');
  switchAccountTab('pass');
  document.getElementById('form-pass').reset();
  document.getElementById('form-user').reset();
  hideModalMsgs();
}
function closeAccountModal(){
  const modal=document.getElementById('account-modal');
  if(modal?.dataset.forcePassword==='1'){ showToast('Ganti password awal terlebih dahulu.',true); return; }
  modal?.classList.remove('open');
}
document.getElementById('account-modal').addEventListener('click', (e) => {
  if(e.target.id === 'account-modal') closeAccountModal();
});

function switchAccountTab(tab){
  document.getElementById('tab-btn-pass').classList.toggle('active', tab === 'pass');
  document.getElementById('tab-btn-user').classList.toggle('active', tab === 'user');
  document.getElementById('tab-btn-foto').classList.toggle('active', tab === 'foto');
  document.getElementById('pane-pass').classList.toggle('active', tab === 'pass');
  document.getElementById('pane-user').classList.toggle('active', tab === 'user');
  document.getElementById('pane-foto').classList.toggle('active', tab === 'foto');
  hideModalMsgs();
  if(tab === 'foto') renderFotoProfilTab();
}
function hideModalMsgs(){
  ['pass-error','pass-success','user-error','user-success','foto-error','foto-success'].forEach(id => {
    document.getElementById(id).style.display = 'none';
  });
}

let fotoProfilState = { base64: null, mime: null };

async function renderFotoProfilTab(){
  const preview = document.getElementById('foto-profil-preview');
  const removeBtn = document.getElementById('foto-profil-remove-btn');
  if(!preview) return;
  preview.innerHTML = '<span class="spinner"></span>';
  fotoProfilState = { base64: null, mime: null };
  try{
    const res = await callApi('getFotoProfil', { username: currentUser.username });
    if(res.success && res.url){
      preview.innerHTML = `<img src="${res.url}" alt="Foto profil" referrerpolicy="no-referrer">`;
      if(removeBtn) removeBtn.style.display = 'inline-flex';
    } else {
      const initial = String(currentUser.nama || '?').trim().charAt(0).toUpperCase() || '?';
      preview.innerHTML = `<span class="foto-profil-fallback">${escapeHtml(initial)}</span>`;
      if(removeBtn) removeBtn.style.display = 'none';
    }
  } catch(err){
    preview.innerHTML = `<span class="foto-profil-fallback">?</span>`;
  }
}

function handleFotoProfilSelect(e){
  const file = e.target.files[0];
  if(!file) return;
  fotoProfilState.mime = file.type;
  const reader = new FileReader();
  reader.onload = () => {
    fotoProfilState.base64 = reader.result.split(',')[1];
    document.getElementById('foto-profil-preview').innerHTML = `<img src="${reader.result}" alt="Pratinjau foto">`;
  };
  reader.readAsDataURL(file);
}

async function submitFotoProfil(){
  const errEl = document.getElementById('foto-error');
  const okEl = document.getElementById('foto-success');
  errEl.style.display = 'none'; okEl.style.display = 'none';
  if(!fotoProfilState.base64){
    errEl.textContent = 'Pilih foto terlebih dahulu.';
    errEl.style.display = 'block';
    return;
  }
  const btn = document.getElementById('foto-profil-save-btn');
  if(btn){ btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>Menyimpan...'; }
  try{
    const res = await callApi('uploadFotoProfil', {
      username: currentUser.username,
      base64: fotoProfilState.base64,
      mimeType: fotoProfilState.mime,
      filename: `profil_${currentUser.username}_${Date.now()}.jpg`
    });
    if(res.success){
      currentUser.fotoProfil = res.url;
      sessionStorage.setItem('kesiswaan_user', JSON.stringify(currentUser));
      updateProfilePhotoUI();
      renderFotoProfilTab();
      okEl.textContent = 'Foto profil berhasil disimpan.';
      okEl.style.display = 'block';
      showToast('Foto profil berhasil disimpan');
    } else {
      errEl.textContent = 'Gagal menyimpan foto profil.';
      errEl.style.display = 'block';
    }
  } catch(err){
    errEl.textContent = 'Gagal terhubung ke server.';
    errEl.style.display = 'block';
  } finally {
    if(btn){ btn.disabled = false; btn.textContent = 'Simpan Foto'; }
  }
}

async function hapusFotoProfilUser(){
  const errEl = document.getElementById('foto-error');
  const okEl = document.getElementById('foto-success');
  errEl.style.display = 'none'; okEl.style.display = 'none';
  try{
    const res = await callApi('hapusFotoProfil', { username: currentUser.username });
    if(res.success){
      currentUser.fotoProfil = null;
      sessionStorage.setItem('kesiswaan_user', JSON.stringify(currentUser));
      updateProfilePhotoUI();
      renderFotoProfilTab();
      okEl.textContent = 'Foto profil dihapus.';
      okEl.style.display = 'block';
      showToast('Foto profil dihapus');
    } else {
      errEl.textContent = 'Gagal menghapus foto profil.';
      errEl.style.display = 'block';
    }
  } catch(err){
    errEl.textContent = 'Gagal terhubung ke server.';
    errEl.style.display = 'block';
  }
}

function updateProfilePhotoUI(){
  // Perbarui semua elemen yang menampilkan foto profil di header/menu, jika ada.
  document.querySelectorAll('.user-photo-slot').forEach(el => {
    if(currentUser.fotoProfil){
      el.innerHTML = `<img src="${currentUser.fotoProfil}" alt="Foto profil" referrerpolicy="no-referrer">`;
    } else {
      const initial = String(currentUser.nama || '?').trim().charAt(0).toUpperCase() || '?';
      el.innerHTML = `<span class="foto-profil-fallback">${escapeHtml(initial)}</span>`;
    }
  });
}

async function submitGantiPassword(e){
  e.preventDefault();
  const errEl=document.getElementById('pass-error'), okEl=document.getElementById('pass-success'), btn=document.getElementById('pass-submit-btn');
  if(errEl) errEl.style.display='none'; if(okEl) okEl.style.display='none';
  const oldPass=document.getElementById('pass-old').value, newPass=document.getElementById('pass-new').value, confirm=document.getElementById('pass-new-confirm').value;
  if(!oldPass||!newPass||!confirm){errEl.textContent='Semua kolom password wajib diisi.';errEl.style.display='block';return false;}
  if(newPass!==confirm){errEl.textContent='Password baru dan konfirmasi tidak sama.';errEl.style.display='block';return false;}
  if(newPass.length<8){errEl.textContent='Password baru minimal 8 karakter.';errEl.style.display='block';return false;}
  if(newPass===oldPass){errEl.textContent='Password baru harus berbeda dari password lama.';errEl.style.display='block';return false;}
  btn.disabled=true;btn.innerHTML='<span class="spinner"></span>Menyimpan...';
  try{
    const res=await authRequest('change_password',{old_password:oldPass,new_password:newPass});
    if(!res.success){errEl.textContent=authErrorMessage(res.error);errEl.style.display='block';return false;}
    currentUser.must_change_password=false;
    saveAuthSession(getAuthToken(),localStorage.getItem(AUTH_STORAGE.EXPIRES)||'',currentUser);
    const modal=document.getElementById('account-modal');if(modal) delete modal.dataset.forcePassword;
    document.getElementById('form-pass')?.reset();if(okEl){okEl.textContent='Password berhasil diubah.';okEl.style.display='block';}
    showToast('Password berhasil diubah');if(modal)setTimeout(()=>modal.classList.remove('open'),650);
  }catch(err){errEl.textContent=err?.message||'Gagal terhubung ke server.';errEl.style.display='block';}
  finally{btn.disabled=false;btn.textContent='Simpan Password Baru';}
  return false;
}

async function submitGantiUsername(e){
  e.preventDefault();
  const errEl=document.getElementById('user-error'),okEl=document.getElementById('user-success'),btn=document.getElementById('user-submit-btn');
  if(errEl)errEl.style.display='none';if(okEl)okEl.style.display='none';
  const newUsername=document.getElementById('user-new').value.trim().toLowerCase();
  if(currentUser?.must_change_password){errEl.textContent='Ganti password awal terlebih dahulu.';errEl.style.display='block';return false;}
  if(!newUsername){errEl.textContent='Username baru tidak boleh kosong.';errEl.style.display='block';return false;}
  if(newUsername.length<4){errEl.textContent='Username baru minimal 4 karakter.';errEl.style.display='block';return false;}
  if(!/^[a-z0-9._]+$/.test(newUsername)){errEl.textContent='Gunakan huruf kecil, angka, titik, atau underscore tanpa spasi.';errEl.style.display='block';return false;}
  if(newUsername===String(currentUser.username||'').toLowerCase()){errEl.textContent='Username baru sama dengan username sekarang.';errEl.style.display='block';return false;}
  btn.disabled=true;btn.innerHTML='<span class="spinner"></span>Menyimpan...';
  try{
    const res=await authRequest('change_username',{new_username:newUsername});
    if(!res.success){errEl.textContent=authErrorMessage(res.error);errEl.style.display='block';return false;}
    currentUser.username=res.new_username||res.newUsername||res.username||newUsername;
    saveAuthSession(getAuthToken(),localStorage.getItem(AUTH_STORAGE.EXPIRES)||'',currentUser);
    document.getElementById('form-user')?.reset();if(okEl){okEl.textContent=`Username berhasil diubah menjadi "${currentUser.username}".`;okEl.style.display='block';}
    showToast('Username berhasil diubah');
  }catch(err){errEl.textContent=err?.message||'Gagal terhubung ke server.';errEl.style.display='block';}
  finally{btn.disabled=false;btn.textContent='Simpan Username Baru';}
  return false;
}

/* ==========================================================
   NAVIGASI MODUL (V2 — dropdown berkelompok)
   ========================================================== */
const MODULE_GROUPS = [
  {
    id: 'akademik', label: 'Akademik', roles: ['walas','kesiswaan','pimpinan'],
    items: [
      { id: 'leger',      label: 'Legger Nilai', roles: ['walas','kesiswaan','pimpinan'], built: true,  render: renderLegger },
      { id: 'cp',         label: 'Capaian Pembelajaran', roles: ['walas','kesiswaan','pimpinan'], built: true, render: renderCPBulanan },
      { id: 'bilingual',  label: 'Bilingual', roles: ['walas','kesiswaan','pimpinan'], built: true, render: renderVocabularyBulanan },
      { id: 'pjbl',       label: 'PjBL',        roles: ['walas','kesiswaan','pimpinan'], built: true,  render: renderPjBL },
      { id: 'rapor',    label: 'Cetak Rapor', roles: ['walas','kesiswaan','pimpinan'], built: true,  render: renderCetakRapor }
    ]
  },
  {
    id: 'kesiswaan', label: 'Kesiswaan', roles: ['walas','kesiswaan','pimpinan'],
    items: [
      { id: 'absensi',      label: 'Absensi (Morning Talk)', roles: ['walas','kesiswaan','pimpinan'], built: true, render: renderAbsensi },
      { id: 'kedisiplinan', label: 'Kedisiplinan',           roles: ['walas','kesiswaan','pimpinan'], built: true, render: renderKedisiplinan },
      { id: 'reward',       label: 'Reward Siswa',           roles: ['walas','kesiswaan','pimpinan'], built: true, render: renderReward },
      { id: 'masalah',      label: 'Masalah Siswa',          roles: ['walas','kesiswaan','pimpinan'], built: true, render: renderMasalahSiswa }
    ]
  },
  {
    id: 'info', label: 'Info', roles: ['walas','kesiswaan','pimpinan'],
    items: [
      { id: 'ekskul', label: 'Ekskul', roles: ['walas','kesiswaan','pimpinan'], built: true, render: renderEkskulRekap }
    ]
  },
  {
    id: 'laporan', label: 'Laporan', roles: ['walas','kesiswaan','pimpinan'],
    items: [
      { id: 'laporan-guru',   label: 'Laporan Guru Bulanan', roles: ['walas','kesiswaan','pimpinan'], built: true,  render: renderLaporanGuru },
      { id: 'laporan-unduh',  label: 'Unduh Rekap',          roles: ['kesiswaan','pimpinan'],         built: false }
    ]
  }
];

// Dashboard utama untuk Walas, Kesiswaan, dan Pimpinan.
const DASHBOARD_MODULE = { id: 'dashboard', label: 'Dashboard', roles: ['walas','kesiswaan','pimpinan'], built: true, render: renderDashboard };

function findModuleByIdV2(id) {
  if (id === 'dashboard') return DASHBOARD_MODULE;
  for (const g of MODULE_GROUPS) {
    const found = g.items.find(m => m.id === id);
    if (found) return found;
  }
  return null;
}

let activeModule = 'dashboard';
let pendingKeterlambatanCount = 0;
let openGroupId = null;

let bellIntervalId = null;

function enterApp(){
  if(currentUser) saveAuthSession(getAuthToken(),localStorage.getItem(AUTH_STORAGE.EXPIRES)||'',currentUser);
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app-screen').style.display = 'block';
  document.getElementById('user-name').textContent = currentUser.nama;
  document.getElementById('user-role').textContent = currentUser.role.toUpperCase();
  updateProfilePhotoUI();

  activeModule = DASHBOARD_MODULE.roles.includes(currentUser.role) ? 'dashboard' : 'absensi';
  renderSidebar();
  setActiveModule(activeModule);

  // UI tampil dahulu; request non-kritis ditunda agar login terasa cepat.
  if(currentUser.role === 'walas'){
    setTimeout(() => {
      if(currentUser?.role === 'walas') refreshBellNotif();
    }, 900);

    if(!bellIntervalId){
      bellIntervalId = setInterval(() => {
        if(currentUser?.role === 'walas') refreshBellNotif();
      }, 300000);
    }
  }

  // Mood popup dinonaktifkan sesuai permintaan.
  setTimeout(() => {
    if(!currentUser) return;
    callApi('logAktivitas', {
      username: currentUser.username,
      nama: currentUser.nama,
      kelas: currentUser.kelas || '',
      modul: 'Login',
      aksi: 'login'
    }).catch(()=>{});
  }, 2200);
}

async function refreshPendingKeterlambatanBadge(){
  if(!currentUser || currentUser.role !== 'walas') return;
  try{
    const res = await callApi('getKeterlambatanBelumDicatat', { kelas: currentUser.kelas });
    const list = res.data || [];
    pendingKeterlambatanCount = list.filter(r => !r.sudahDicatat).length;
  } catch(err){
    pendingKeterlambatanCount = 0;
  }
  renderSidebar();
}

function renderSidebar(){
  const sidebar = document.getElementById('sidebar');
  sidebar.innerHTML = '';

  if (DASHBOARD_MODULE.roles.includes(currentUser.role)) {
    const dashItem = document.createElement('div');
    dashItem.className = 'nav-item' + (activeModule === 'dashboard' ? ' active' : '');
    dashItem.innerHTML = `<span>${DASHBOARD_MODULE.label}</span>`;
    dashItem.onclick = () => setActiveModule('dashboard');
    sidebar.appendChild(dashItem);
  }

  MODULE_GROUPS.filter(g => g.roles.includes(currentUser.role)).forEach(group => {
    const visibleItems = group.items.filter(m => m.roles.includes(currentUser.role));
    if (!visibleItems.length) return;

    const isOpen = openGroupId === group.id || visibleItems.some(m => m.id === activeModule);
    const groupHead = document.createElement('div');
    groupHead.className = 'nav-group-head' + (isOpen ? ' open' : '');
    groupHead.innerHTML = `
      <span>${group.label}</span>
      <svg class="nav-chevron" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
    `;
    groupHead.onclick = () => { openGroupId = (openGroupId === group.id) ? null : group.id; renderSidebar(); };
    sidebar.appendChild(groupHead);

    if (isOpen) {
      const sub = document.createElement('div');
      sub.className = 'nav-group-items';
      visibleItems.forEach(m => {
        const div = document.createElement('div');
        div.className = 'nav-item nav-item-sub' + (m.id === activeModule ? ' active' : '') + (!m.built ? ' disabled' : '');
        let badge = !m.built ? '<span class="nav-badge">segera</span>' : '';
        if (m.id === 'kedisiplinan' && pendingKeterlambatanCount > 0) {
          badge = `<span class="nav-badge alert">${pendingKeterlambatanCount} telat</span>`;
        }
        div.innerHTML = `<span>${m.label}</span>` + badge;
        if (m.built) div.onclick = () => setActiveModule(m.id);
        sub.appendChild(div);
      });
      sidebar.appendChild(sub);
    }
  });
}

function setActiveModule(id){
  activeModule = id;
  const mod = findModuleByIdV2(id);
  if (mod) {
    const parentGroup = MODULE_GROUPS.find(g => g.items.some(i => i.id === id));
    if (parentGroup) openGroupId = parentGroup.id;
  }
  renderSidebar();
  const content = document.getElementById('content');
  if (mod && mod.built && mod.render) {
    mod.render(content);
  } else {
    content.innerHTML = `<div class="empty-state"><div class="icon">—</div>Modul ini belum dibangun.</div>`;
  }
}

/* ==========================================================
   MODUL: CATATAN MASALAH SISWA + REKOMENDASI SISTEM (AI)
   ========================================================== */
let masalahState = {
  kelas: null,
  siswa: [],
  tab: 'baru',
  analisisAI: null,
  riwayat: []
};

function todayStrMasalah(){
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth()+1).padStart(2,'0');
  const d = String(now.getDate()).padStart(2,'0');
  return `${y}-${m}-${d}`;
}

function renderMasalahSiswa(content){
  const isWalas = currentUser.role === 'walas';
  masalahState.analisisAI = null;
  content.innerHTML = `
    <div class="page-title">Catatan Masalah Siswa</div>
    <div class="page-sub">Pilih siswa, ceritakan kejadian secara faktual, lalu sistem akan memberikan rekomendasi penanganan berbasis data.</div>

    ${!isWalas ? `
      <div class="card">
        <div class="card-title">Pilih Kelas</div>
        <input type="text" id="ms-kelas-input" placeholder="Ketik nama kelas persis, contoh: 3A Banat"
          style="width:100%;padding:11px 14px;border:2px solid var(--border);border-radius:10px;font-family:inherit;font-size:14px;">
      </div>` : ''}
    <div id="ms-body"></div>
  `;

  if(isWalas){
    masalahState.kelas = currentUser.kelas;
    loadMasalahKelas();
  } else {
    const input = document.getElementById('ms-kelas-input');
    input.addEventListener('change', () => {
      masalahState.kelas = input.value.trim();
      loadMasalahKelas();
    });
  }
}

async function loadMasalahKelas(){
  if(!masalahState.kelas) return;
  const body = document.getElementById('ms-body');
  body.innerHTML = `<div class="card"><span class="spinner" style="border-top-color:var(--primary);border-color:rgba(10,110,110,0.25)"></span>Memuat data siswa...</div>`;
  const res = await callApi('getSiswaByKelas', { kelas: masalahState.kelas });
  masalahState.siswa = (res.data || []).slice().sort((a,b) => String(a.nama).localeCompare(String(b.nama), 'id'));
  renderMasalahShell();
}

function renderMasalahShell(){
  const body = document.getElementById('ms-body');
  if(!body) return;
  if(!masalahState.siswa.length){
    body.innerHTML = `<div class="empty-state"><div class="icon">—</div>Belum ada data siswa untuk kelas ${escapeHtml(masalahState.kelas || '-')}.</div>`;
    return;
  }

  body.innerHTML = `
    <div class="ms-tabs">
      <button class="ms-tab ${masalahState.tab==='baru'?'active':''}" onclick="switchMasalahTab('baru')">+ Laporan Baru</button>
      <button class="ms-tab ${masalahState.tab==='riwayat'?'active':''}" onclick="switchMasalahTab('riwayat')">Riwayat</button>
    </div>
    <div id="ms-tab-content"></div>
  `;
  renderMasalahTab();
}

function switchMasalahTab(tab){
  masalahState.tab = tab;
  masalahState.analisisAI = null;
  renderMasalahShell();
}

function renderMasalahTab(){
  if(masalahState.tab === 'riwayat') loadRiwayatMasalah();
  else renderFormMasalah();
}

function renderFormMasalah(){
  const area = document.getElementById('ms-tab-content');
  const siswaOptions = masalahState.siswa.map(s => `<option value="${escapeHtml(s.nis)}">${escapeHtml(s.nama)} — ${escapeHtml(s.nis)}</option>`).join('');
  area.innerHTML = `
    <div class="card">
      <div class="card-title">Laporan Naratif Walas</div>
      <div class="ms-grid">
        <div class="ms-field">
          <label>Nama siswa</label>
          <select id="ms-siswa"><option value="">— pilih siswa —</option>${siswaOptions}</select>
        </div>
        <div class="ms-field">
          <label>Tanggal kejadian</label>
          <input type="date" id="ms-tanggal" value="${todayStrMasalah()}">
        </div>
      </div>

      <div class="ms-field">
        <label>Ceritakan masalah atau kejadian</label>
        <textarea id="ms-cerita" class="ms-story" maxlength="5000" oninput="updateMasalahCount()" placeholder="Contoh: Saat pelajaran Matematika pukul 09.15, siswa meninggalkan kursi beberapa kali, berbicara kepada teman, dan belum mulai mengerjakan meskipun instruksi sudah diulang. Setelah tugas dibagi menjadi tiga bagian dan duduk dekat guru, siswa mulai mengerjakan..."></textarea>
        <div class="ms-char-count" id="ms-char-count">0 / 5000</div>
        <div class="ms-help">Tuliskan fakta yang terlihat atau terdengar: situasi, perilaku, pihak terlibat, frekuensi, dan dampaknya. Hindari label seperti "nakal", "malas", atau diagnosis.</div>
      </div>

      <div class="ms-field">
        <label>Tindakan awal yang sudah dilakukan <span style="font-weight:400;color:var(--muted)">(opsional)</span></label>
        <textarea id="ms-tindakan" placeholder="Contoh: Sudah diajak bicara secara pribadi, dipindahkan tempat duduk, atau diberi waktu menenangkan diri."></textarea>
      </div>

      <div class="ms-field" style="max-width:360px">
        <label>Apakah ada risiko keselamatan?</label>
        <select id="ms-risiko">
          <option value="Tidak">Tidak</option>
          <option value="Tidak yakin">Tidak yakin</option>
          <option value="Ya">Ya</option>
        </select>
        <div class="ms-help">Pilih "Ya" untuk kekerasan, ancaman, pelecehan, menyakiti diri/orang lain, benda berbahaya, atau siswa merasa tidak aman.</div>
      </div>

      <div class="ms-actions">
        <button class="btn" id="ms-ai-btn" onclick="generateSaranMasalahAI()">Analisis & Buat Saran Penanganan</button>
        <span class="ms-help">Rekomendasi sistem berbasis data master masalah dan cocok dengan cerita yang Anda tulis.</span>
      </div>
    </div>
    <div id="ms-ai-result"></div>
  `;
}

function updateMasalahCount(){
  const el = document.getElementById('ms-cerita');
  const count = document.getElementById('ms-char-count');
  if(el && count) count.textContent = `${el.value.length} / 5000`;
}

function getSelectedSiswaMasalah(){
  const nis = document.getElementById('ms-siswa')?.value || '';
  return masalahState.siswa.find(s => String(s.nis) === String(nis)) || null;
}

async function generateSaranMasalahAI(){
  const siswa = getSelectedSiswaMasalah();
  const tanggal = document.getElementById('ms-tanggal').value;
  const cerita = document.getElementById('ms-cerita').value.trim();
  const tindakan = document.getElementById('ms-tindakan').value.trim();
  const risiko = document.getElementById('ms-risiko').value;
  const btn = document.getElementById('ms-ai-btn');
  const result = document.getElementById('ms-ai-result');

  if(!siswa){ showToast('Pilih nama siswa terlebih dahulu.', true); return; }
  if(!tanggal){ showToast('Tanggal kejadian wajib diisi.', true); return; }
  if(cerita.length < 20){ showToast('Cerita kejadian masih terlalu singkat.', true); return; }

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>Sistem sedang menyusun saran...';
  result.innerHTML = `<div class="card"><span class="spinner" style="border-top-color:var(--primary);border-color:rgba(10,110,110,0.25)"></span>Mencocokkan cerita dengan kata kunci dan master masalah...</div>`;

  try{
    const res = await callApi('analisisMasalahSiswa', {
      kelas: masalahState.kelas,
      nis: siswa.nis,
      namaSiswa: siswa.nama,
      tanggalKejadian: tanggal,
      ceritaWalas: cerita,
      tindakanAwal: tindakan,
      risikoKeselamatan: risiko
    });
    if(!res.success){
      const pesan = {
        cerita_terlalu_singkat: 'Cerita kejadian masih terlalu singkat.',
      };
      throw new Error(pesan[res.error] || res.error || 'Analisis sistem gagal.');
    }
    masalahState.analisisAI = res.data;
    renderHasilMasalahAI(siswa, tanggal, cerita, tindakan, risiko);
  }catch(err){
    result.innerHTML = `<div class="card"><div class="ms-alert"><strong>Analisis belum berhasil.</strong><br>${escapeHtml(err.message || 'Gagal membaca master masalah di Spreadsheet.')}</div></div>`;
  }finally{
    btn.disabled = false;
    btn.textContent = 'Analisis Ulang';
  }
}

function renderListMasalah(items){
  const arr = Array.isArray(items) ? items : [];
  if(!arr.length) return '<p style="color:var(--muted)">Belum ada saran.</p>';
  return `<ul class="ms-ai-list">${arr.map(x => `<li>${escapeHtml(x)}</li>`).join('')}</ul>`;
}

function formatSaranFinalMasalah(ai){
  const list = (title, values) => {
    const arr = Array.isArray(values) ? values : [];
    return arr.length ? `\n${title}\n${arr.map(x => '- ' + x).join('\n')}` : '';
  };
  return [
    `RINGKASAN SITUASI\n${ai.ringkasan || '-'}`,
    list('KEMUNGKINAN KEBUTUHAN SISWA', ai.kemungkinanKebutuhan),
    list('TUJUAN PENDAMPINGAN', ai.tujuanPendampingan),
    list('PENANGANAN LANGSUNG', ai.penangananLangsung),
    list('STRATEGI DI KELAS', ai.strategiKelas),
    ai.kalimatGuru ? `\nCONTOH KALIMAT GURU\n${ai.kalimatGuru}` : '',
    ai.saranOrangTua ? `\nKOORDINASI ORANG TUA\n${ai.saranOrangTua}` : '',
    list('RENCANA PEMANTAUAN', ai.rencanaPemantauan),
    list('INDIKATOR PERBAIKAN', ai.indikatorPerbaikan),
    ai.saranEskalasi ? `\nKAPAN PERLU DITERUSKAN\n${ai.saranEskalasi}` : '',
    list('HAL YANG PERLU DIHINDARI', ai.halDihindari)
  ].filter(Boolean).join('\n').replace(/\n{3,}/g,'\n\n').trim();
}

function renderHasilMasalahAI(siswa, tanggal, cerita, tindakan, risiko){
  const ai = masalahState.analisisAI;
  const result = document.getElementById('ms-ai-result');
  const urgent = Boolean(ai.mendesak) || risiko === 'Ya';
  const flags = [
    ai.perluOrangTua ? 'Orang tua' : '',
    ai.perluKesiswaan ? 'Kesiswaan' : '',
    ai.perluUKS ? 'UKS' : ''
  ].filter(Boolean);
  const finalText = formatSaranFinalMasalah(ai);

  result.innerHTML = `
    <div class="card">
      ${urgent ? `<div class="ms-alert"><strong>Perlu perhatian segera.</strong><br>Utamakan keselamatan siswa dan teruskan kepada kesiswaan/pimpinan sekolah sesuai prosedur perlindungan anak. Rekomendasi sistem tidak menggantikan penanganan resmi sekolah.</div>` : ''}
      <div class="ms-ai-head">
        <div>
          <div class="ms-ai-title">Hasil Analisis &amp; Rekomendasi Sistem</div>
          <div class="ms-badges">
            <span class="ms-badge">${escapeHtml(ai.kategori || '-')}</span>
            <span class="ms-badge attention">${escapeHtml(ai.tingkatPerhatian || '-')}</span>
            ${typeof ai.tingkatKecocokan === 'number' ? `<span class="ms-badge">Kecocokan ${escapeHtml(String(ai.tingkatKecocokan))}%</span>` : ''}
            <span class="ms-badge ${urgent?'urgent':'safe'}">${urgent?'Mendesak':'Perlu ditinjau walas'}</span>
            ${flags.map(x => `<span class="ms-badge">Koordinasi: ${escapeHtml(x)}</span>`).join('')}
          </div>
        </div>
        <div style="font-size:11.5px;color:var(--muted);text-align:right">Evaluasi: <strong>${escapeHtml(ai.tanggalEvaluasi || '-')}</strong></div>
      </div>

      <div class="ms-ai-section"><h4>Masalah utama</h4><p>${escapeHtml(ai.masalahUtama || '-')}</p></div>
      <div class="ms-ai-section"><h4>Ringkasan situasi</h4><p>${escapeHtml(ai.ringkasan || '-')}</p></div>
      <div class="ms-grid">
        <div class="ms-ai-section"><h4>Kemungkinan kebutuhan siswa</h4>${renderListMasalah(ai.kemungkinanKebutuhan)}</div>
        <div class="ms-ai-section"><h4>Tujuan pendampingan</h4>${renderListMasalah(ai.tujuanPendampingan)}</div>
      </div>
      <div class="ms-ai-section"><h4>Penanganan langsung</h4>${renderListMasalah(ai.penangananLangsung)}</div>
      <div class="ms-ai-section"><h4>Strategi di kelas</h4>${renderListMasalah(ai.strategiKelas)}</div>
      <div class="ms-ai-section"><h4>Contoh kalimat guru</h4><p>${escapeHtml(ai.kalimatGuru || '-')}</p></div>
      <div class="ms-ai-section"><h4>Koordinasi dengan orang tua</h4><p>${escapeHtml(ai.saranOrangTua || '-')}</p></div>
      <div class="ms-grid">
        <div class="ms-ai-section"><h4>Rencana pemantauan</h4>${renderListMasalah(ai.rencanaPemantauan)}</div>
        <div class="ms-ai-section"><h4>Indikator perbaikan</h4>${renderListMasalah(ai.indikatorPerbaikan)}</div>
      </div>
      <div class="ms-ai-section"><h4>Kapan perlu diteruskan</h4><p>${escapeHtml(ai.saranEskalasi || '-')}</p></div>
      <div class="ms-ai-section"><h4>Hal yang perlu dihindari</h4>${renderListMasalah(ai.halDihindari)}</div>

      <div class="ms-final-box">
        <div class="ms-field" style="margin:0">
          <label>Saran final setelah ditinjau walas</label>
          <textarea id="ms-saran-final" style="min-height:320px">${escapeHtml(finalText)}</textarea>
          <div class="ms-help">Boleh diedit sebelum disimpan. Rekomendasi sistem adalah bahan bantu, bukan keputusan otomatis.</div>
        </div>
      </div>

      <div class="ms-actions">
        <button class="btn" id="ms-save-btn" onclick="saveCatatanMasalah()">Simpan Laporan</button>
        <button class="btn btn-outline" onclick="document.getElementById('ms-ai-btn').scrollIntoView({behavior:'smooth'})">Perbaiki Cerita / Buat Ulang</button>
      </div>
    </div>
  `;

  result.dataset.nis = siswa.nis;
  result.dataset.nama = siswa.nama;
  result.dataset.tanggal = tanggal;
  result.dataset.cerita = cerita;
  result.dataset.tindakan = tindakan;
  result.dataset.risiko = risiko;
  result.scrollIntoView({behavior:'smooth', block:'start'});
}

async function saveCatatanMasalah(){
  const result = document.getElementById('ms-ai-result');
  const btn = document.getElementById('ms-save-btn');
  const saranFinal = document.getElementById('ms-saran-final').value.trim();
  if(!masalahState.analisisAI){ showToast('Buat analisis terlebih dahulu.', true); return; }
  if(!saranFinal){ showToast('Saran final tidak boleh kosong.', true); return; }

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>Menyimpan...';
  try{
    const res = await callApi('submitCatatanMasalahSiswa', {
      kelas: masalahState.kelas,
      nis: result.dataset.nis,
      namaSiswa: result.dataset.nama,
      tanggalKejadian: result.dataset.tanggal,
      ceritaWalas: result.dataset.cerita,
      tindakanAwal: result.dataset.tindakan,
      risikoKeselamatan: result.dataset.risiko,
      rekomendasiSistem: masalahState.analisisAI,
      saranFinal,
      status: masalahState.analisisAI.mendesak ? 'Diteruskan ke Kesiswaan' : 'Baru',
      dicatatOleh: currentUser.nama
    });
    if(!res.success) throw new Error(res.error || 'Gagal menyimpan laporan.');
    showToast('Laporan masalah siswa berhasil disimpan.');
    masalahState.analisisAI = null;
    masalahState.tab = 'riwayat';
    renderMasalahShell();
  }catch(err){
    showToast(err.message || 'Gagal menyimpan laporan.', true);
  }finally{
    if(document.getElementById('ms-save-btn')){
      btn.disabled = false;
      btn.textContent = 'Simpan Laporan';
    }
  }
}

async function loadRiwayatMasalah(){
  const area = document.getElementById('ms-tab-content');
  area.innerHTML = `<div class="card"><span class="spinner" style="border-top-color:var(--primary);border-color:rgba(10,110,110,0.25)"></span>Memuat riwayat laporan...</div>`;
  const res = await callApi('getCatatanMasalahSiswa', { kelas: masalahState.kelas, limit: 100 });
  masalahState.riwayat = res.data || [];
  renderRiwayatMasalah();
}

function renderRiwayatMasalah(){
  const area = document.getElementById('ms-tab-content');
  if(!masalahState.riwayat.length){
    area.innerHTML = `<div class="empty-state"><div class="icon">—</div>Belum ada catatan masalah siswa untuk kelas ini.</div>`;
    return;
  }
  area.innerHTML = `
    <div class="card">
      <div class="ms-history-toolbar">
        <div><div class="card-title" style="margin:0">Riwayat Catatan</div><div class="ms-help">${masalahState.riwayat.length} laporan terbaru</div></div>
        <input type="search" id="ms-history-search" placeholder="Cari nama atau masalah..." oninput="filterRiwayatMasalah()" style="max-width:280px;padding:10px 14px;border:2px solid var(--border);border-radius:10px;font-family:inherit;">
      </div>
      <div class="ms-history-list" id="ms-history-list"></div>
    </div>
  `;
  drawRiwayatMasalah(masalahState.riwayat);
}

function filterRiwayatMasalah(){
  const q = (document.getElementById('ms-history-search').value || '').toLowerCase().trim();
  const list = masalahState.riwayat.filter(r => [r.namaSiswa,r.masalahUtama,r.kategori,r.ringkasan,r.status].join(' ').toLowerCase().includes(q));
  drawRiwayatMasalah(list);
}

function drawRiwayatMasalah(data){
  const list = document.getElementById('ms-history-list');
  if(!list) return;
  if(!data.length){ list.innerHTML = `<div class="empty-state" style="padding:30px 10px">Tidak ada laporan yang cocok.</div>`; return; }
  list.innerHTML = data.map((r,index) => {
    const urgent = Boolean(r.mendesak);
    const flags = [r.perluOrangTua?'Orang tua':'',r.perluKesiswaan?'Kesiswaan':'',r.perluUKS?'UKS':''].filter(Boolean).join(', ');
    return `
      <div class="ms-history-card" id="ms-history-${index}">
        <div class="ms-history-top">
          <div>
            <div class="ms-history-name">${escapeHtml(r.namaSiswa || '-')}</div>
            <div class="ms-history-meta">${escapeHtml(r.tanggalKejadian || '-')} · ${escapeHtml(r.kategori || '-')} · ${escapeHtml(r.tingkatPerhatian || '-')}</div>
          </div>
          <span class="ms-status" style="${urgent?'background:#FDF0EC;border-color:#E8B8AA;color:var(--danger)':''}">${escapeHtml(r.status || 'Baru')}</span>
        </div>
        <div class="ms-history-summary"><strong>${escapeHtml(r.masalahUtama || '-')}</strong><br>${escapeHtml(r.ringkasan || '')}</div>
        <button class="ms-link-btn" onclick="toggleRiwayatMasalah('ms-history-${index}',this)">Lihat detail</button>
        <div class="ms-history-detail">
          <div class="ms-ai-section"><h4>Cerita walas</h4><p>${escapeHtml(r.ceritaWalas || '-')}</p></div>
          <div class="ms-ai-section"><h4>Tindakan awal</h4><p>${escapeHtml(r.tindakanAwal || '-')}</p></div>
          <div class="ms-ai-section"><h4>Saran final</h4><p>${escapeHtml(r.saranFinal || '-')}</p></div>
          <div class="ms-help">Evaluasi: ${escapeHtml(r.tanggalEvaluasi || '-')} ${flags ? '· Koordinasi: '+escapeHtml(flags) : ''} · Dicatat oleh: ${escapeHtml(r.dicatatOleh || '-')}</div>
        </div>
      </div>`;
  }).join('');
}

function toggleRiwayatMasalah(id,button){
  const card = document.getElementById(id);
  if(!card) return;
  const open = card.classList.toggle('open');
  button.textContent = open ? 'Tutup detail' : 'Lihat detail';
}

/* ==========================================================
   MODUL: ABSENSI / MORNING TALK — SUPABASE
   ========================================================== */
const ABSENSI_STATUS = ['Hadir','Sakit','Izin','Alfa','Terlambat'];

let absensiState = {
  kelasId: '',
  kelasNama: '',
  tanggal: '',
  classes: [],
  siswa: [],
  status: {},
  catatan: {},
  tema: '',
  fotoBase64: null,
  fotoMime: null,
  fotoName: '',
  fotoUrl: '',
  existing: false,
  loading: false
};

function jakartaTodayISO(){
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(new Date());
  const map = Object.fromEntries(parts.map(p => [p.type, p.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

function injectAbsensiSupabaseStyles(){
  if(document.getElementById('absensi-supabase-style')) return;
  const style = document.createElement('style');
  style.id = 'absensi-supabase-style';
  style.textContent = `
    .abs-top-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(180px,.35fr);gap:14px}
    .abs-field label{display:block;font-size:12px;font-weight:800;color:var(--muted);margin-bottom:7px}
    .abs-control{width:100%;padding:11px 13px;border:1.5px solid var(--border);border-radius:11px;background:#fff;font:inherit;color:var(--text);outline:none}
    .abs-control:focus{border-color:var(--primary);box-shadow:0 0 0 3px rgba(8,126,124,.10)}
    .abs-summary{display:grid;grid-template-columns:repeat(5,minmax(92px,1fr));gap:10px;margin:14px 0}
    .abs-summary-item{padding:13px;border:1px solid var(--border);border-radius:13px;background:#fff;text-align:center}
    .abs-summary-item strong{display:block;font-size:22px;color:var(--primary)}
    .abs-summary-item span{font-size:11.5px;color:var(--muted);font-weight:700}
    .abs-student-row{display:grid;grid-template-columns:minmax(190px,1fr) minmax(360px,1.6fr);gap:12px;align-items:center;padding:12px 0;border-bottom:1px solid var(--border)}
    .abs-student-row:last-child{border-bottom:0}
    .abs-student-name{font-weight:800;color:var(--text)}
    .abs-student-meta{font-size:11.5px;color:var(--muted);margin-top:2px}
    .abs-statuses{display:flex;gap:6px;justify-content:flex-end;flex-wrap:wrap}
    .abs-status-btn{border:1px solid var(--border);background:#fff;border-radius:999px;padding:7px 10px;font:inherit;font-size:11.5px;font-weight:800;cursor:pointer;color:var(--muted);transition:.15s}
    .abs-status-btn:hover{transform:translateY(-1px)}
    .abs-status-btn.selected{background:var(--primary);border-color:var(--primary);color:#fff}
    .abs-actions{display:flex;gap:10px;justify-content:flex-end;align-items:center;margin-top:14px;flex-wrap:wrap}
    .abs-save-btn{min-width:190px}
    .abs-badge{display:inline-flex;align-items:center;padding:5px 9px;border-radius:999px;font-size:10.5px;font-weight:900;background:#e9f7f6;color:var(--primary)}
    .abs-photo-box{border:1.5px dashed var(--border);border-radius:13px;padding:16px;text-align:center;cursor:pointer;background:#fbfdfd}
    .abs-photo-box:hover{border-color:var(--primary)}
    .abs-photo-preview{display:none;max-width:100%;max-height:220px;border-radius:12px;margin-top:10px;object-fit:cover}
    .abs-empty{padding:30px 15px;text-align:center;color:var(--muted)}
    .abs-note{margin-top:7px;width:100%;border:1px solid var(--border);border-radius:8px;padding:7px 9px;font:inherit;font-size:11.5px;display:none}
    .abs-note.show{display:block}
    @media(max-width:800px){
      .abs-top-grid{grid-template-columns:1fr}
      .abs-summary{grid-template-columns:repeat(2,1fr)}
      .abs-student-row{grid-template-columns:1fr}
      .abs-statuses{justify-content:flex-start}
    }
  `;
  document.head.appendChild(style);
}

async function attendanceRequest(action, payload={}, options={}){
  const token = getAuthToken();
  if(!token) throw new Error('Sesi login tidak ditemukan.');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs || 30000);

  try{
    const response = await fetch(ATTENDANCE_URL, {
      method: 'POST',
      headers: {
        'Content-Type':'application/json',
        'apikey': SUPABASE_PUBLISHABLE_KEY,
        'Authorization': `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
        'x-session-token': token
      },
      body: JSON.stringify({ action, ...payload }),
      signal: controller.signal
    });

    const raw = await response.text();
    let data = {};
    try{ data = raw ? JSON.parse(raw) : {}; }
    catch(_){ throw new Error(`Respons Absensi bukan JSON. HTTP ${response.status}.`); }

    if(!response.ok || data.success === false){
      const map = {
        session_invalid:'Sesi login tidak valid. Silakan login ulang.',
        session_expired:'Sesi login telah berakhir. Silakan login ulang.',
        forbidden:'Akun ini tidak memiliki akses ke Absensi.',
        class_forbidden:'Anda tidak memiliki akses ke kelas tersebut.',
        class_not_found:'Kelas tidak ditemukan.',
        edit_window_closed:'Absensi tanggal tersebut sudah melewati batas waktu koreksi.',
        future_date_not_allowed:'Tanggal absensi tidak boleh melebihi hari ini.',
        invalid_status:'Terdapat status kehadiran yang tidak valid.',
        theme_required:'Tema Morning Talk wajib diisi.',
        photo_too_large:'Ukuran foto terlalu besar. Maksimal 4 MB.',
        photo_type_not_allowed:'Format foto harus JPG, PNG, atau WEBP.'
      };
      throw new Error(map[data.error] || data.message || data.error || `Gagal memproses Absensi (HTTP ${response.status}).`);
    }
    return data;
  }catch(err){
    if(err?.name === 'AbortError') throw new Error('Server Absensi terlalu lama merespons.');
    throw err;
  }finally{
    clearTimeout(timeoutId);
  }
}

function renderAbsensi(content){
  injectAbsensiSupabaseStyles();
  absensiState = {
    kelasId: '',
    kelasNama: '',
    tanggal: jakartaTodayISO(),
    classes: [],
    siswa: [],
    status: {},
    catatan: {},
    tema: '',
    fotoBase64: null,
    fotoMime: null,
    fotoName: '',
    fotoUrl: '',
    existing: false,
    loading: false
  };

  content.innerHTML = `
    <div class="page-title">Absensi — Morning Talk</div>
    <div class="page-sub">Kehadiran siswa tersimpan langsung ke Supabase.</div>

    <div class="card">
      <div class="abs-top-grid">
        <div class="abs-field">
          <label>KELAS</label>
          <select id="absensi-kelas-select" class="abs-control" onchange="absensiPilihKelas(this.value)">
            <option value="">Memuat daftar kelas...</option>
          </select>
        </div>
        <div class="abs-field">
          <label>TANGGAL</label>
          <input id="absensi-tanggal" class="abs-control" type="date" value="${absensiState.tanggal}" max="${absensiState.tanggal}" onchange="absensiUbahTanggal(this.value)">
        </div>
      </div>
    </div>

    <div id="absensi-body">
      <div class="card"><span class="spinner"></span> Memuat akses dan daftar kelas...</div>
    </div>
  `;

  bootstrapAbsensi();
}

async function bootstrapAbsensi(){
  const body = document.getElementById('absensi-body');
  try{
    const res = await attendanceRequest('bootstrap');
    absensiState.classes = res.classes || [];

    const select = document.getElementById('absensi-kelas-select');
    if(!select) return;

    select.innerHTML = `<option value="">— Pilih kelas —</option>` +
      absensiState.classes.map(k => `<option value="${escapeHtml(k.id)}">${escapeHtml(k.name)}</option>`).join('');

    const preferredId = res.default_class_id || '';
    if(preferredId && absensiState.classes.some(k => k.id === preferredId)){
      select.value = preferredId;
      absensiPilihKelas(preferredId);
    } else if(absensiState.classes.length === 1){
      select.value = absensiState.classes[0].id;
      absensiPilihKelas(absensiState.classes[0].id);
    } else {
      body.innerHTML = `<div class="card"><div class="abs-empty">Pilih kelas untuk mulai mengisi Absensi Morning Talk.</div></div>`;
    }
  }catch(err){
    body.innerHTML = `<div class="card"><div class="abs-empty">${escapeHtml(err.message || 'Gagal memuat Absensi.')}</div></div>`;
    showToast(err.message || 'Gagal memuat Absensi', true);
  }
}

function absensiPilihKelas(classId){
  absensiState.kelasId = classId || '';
  const c = absensiState.classes.find(x => x.id === classId);
  absensiState.kelasNama = c?.name || '';
  if(classId) loadAbsensiSupabase();
  else document.getElementById('absensi-body').innerHTML = `<div class="card"><div class="abs-empty">Pilih kelas terlebih dahulu.</div></div>`;
}

function absensiUbahTanggal(value){
  absensiState.tanggal = value || jakartaTodayISO();
  if(absensiState.kelasId) loadAbsensiSupabase();
}

async function loadAbsensiSupabase(){
  if(!absensiState.kelasId) return;
  const body = document.getElementById('absensi-body');
  body.innerHTML = `<div class="card"><span class="spinner"></span> Memuat siswa dan absensi...</div>`;

  try{
    const res = await attendanceRequest('load', {
      class_id: absensiState.kelasId,
      date: absensiState.tanggal
    });

    absensiState.siswa = res.students || [];
    absensiState.existing = Boolean(res.session);
    absensiState.tema = res.session?.theme || '';
    absensiState.fotoUrl = res.session?.photo_url || '';
    absensiState.fotoBase64 = null;
    absensiState.fotoMime = null;
    absensiState.fotoName = '';
    absensiState.status = {};
    absensiState.catatan = {};

    const existingByStudent = {};
    (res.records || []).forEach(r => existingByStudent[r.student_id] = r);

    absensiState.siswa.forEach(s => {
      const old = existingByStudent[s.id];
      absensiState.status[s.id] = old?.status || 'Hadir';
      absensiState.catatan[s.id] = old?.note || '';
    });

    renderAbsensiSupabaseForm(res);
  }catch(err){
    body.innerHTML = `<div class="card"><div class="abs-empty">${escapeHtml(err.message || 'Gagal memuat data.')}</div></div>`;
    showToast(err.message || 'Gagal memuat Absensi', true);
  }
}

function rekapAbsensiState(){
  const out = Object.fromEntries(ABSENSI_STATUS.map(s => [s,0]));
  Object.values(absensiState.status).forEach(s => {
    if(out[s] !== undefined) out[s]++;
  });
  return out;
}

function renderAbsensiSupabaseForm(res){
  const body = document.getElementById('absensi-body');
  if(!absensiState.siswa.length){
    body.innerHTML = `<div class="card"><div class="abs-empty">Tidak ada siswa aktif yang ditemukan untuk kelas ini.</div></div>`;
    return;
  }

  const editable = res.editable !== false;
  const rekap = rekapAbsensiState();

  body.innerHTML = `
    <div class="card">
      <div style="display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap">
        <div>
          <div class="card-title" style="margin-bottom:3px">Morning Talk — ${escapeHtml(absensiState.kelasNama)}</div>
          <div style="font-size:12px;color:var(--muted)">${escapeHtml(absensiState.tanggal)} · ${absensiState.siswa.length} siswa</div>
        </div>
        <span class="abs-badge">${absensiState.existing ? 'SUDAH TERSIMPAN · BISA DIPERBARUI' : 'BELUM TERSIMPAN'}</span>
      </div>

      <div class="abs-summary" id="absensi-summary">
        ${ABSENSI_STATUS.map(st => `<div class="abs-summary-item"><strong data-abs-count="${st}">${rekap[st]}</strong><span>${st}</span></div>`).join('')}
      </div>
    </div>

    <div class="card">
      <div class="card-title">Tema Morning Talk</div>
      <input type="text" id="tema-input" class="abs-control" placeholder="Contoh: Adab kepada orang tua" value="${escapeHtml(absensiState.tema)}" ${editable?'':'disabled'}
        oninput="absensiState.tema=this.value">
    </div>

    <div class="card">
      <div class="card-title">Foto Kondisi Kelas <span style="font-size:11px;color:var(--muted);font-weight:600">(opsional)</span></div>
      <div class="abs-photo-box" onclick="${editable ? "document.getElementById('foto-input').click()" : "void(0)"}">
        <div id="foto-upload-box">${absensiState.fotoUrl ? 'Klik untuk mengganti foto Morning Talk' : 'Klik untuk memilih 1 foto suasana Morning Talk'}</div>
      </div>
      <input type="file" id="foto-input" accept="image/jpeg,image/png,image/webp" style="display:none" ${editable?'':'disabled'} onchange="handleFotoSelect(event)">
      <img id="foto-preview" class="abs-photo-preview" ${absensiState.fotoUrl ? `src="${escapeHtml(absensiState.fotoUrl)}" style="display:block"` : ''}>
    </div>

    <div class="card">
      <div class="card-title">Kehadiran Siswa</div>
      <div id="siswa-list">
        ${absensiState.siswa.map(s => {
          const nis = s.nis || s.nisn || '-';
          const current = absensiState.status[s.id] || 'Hadir';
          return `
            <div class="abs-student-row">
              <div>
                <div class="abs-student-name">${escapeHtml(s.name)}</div>
                <div class="abs-student-meta">NIS ${escapeHtml(nis)}</div>
                <input class="abs-note ${current==='Terlambat'?'show':''}" id="abs-note-${escapeHtml(s.id)}"
                  value="${escapeHtml(absensiState.catatan[s.id] || '')}" placeholder="Catatan, mis. terlambat 10 menit"
                  ${editable?'':'disabled'} oninput="absensiState.catatan['${escapeHtml(s.id)}']=this.value">
              </div>
              <div class="abs-statuses" data-student="${escapeHtml(s.id)}">
                ${ABSENSI_STATUS.map(st => `
                  <button type="button" class="abs-status-btn ${current===st?'selected':''}"
                    ${editable?'':'disabled'}
                    onclick="setStatusSupabase('${escapeHtml(s.id)}','${st}',this)">${st}</button>
                `).join('')}
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <div class="abs-actions">
        ${!editable ? `<span style="font-size:12px;color:var(--danger);font-weight:700">${escapeHtml(res.edit_message || 'Data sudah tidak dapat diedit.')}</span>` : ''}
        ${editable ? `<button class="btn abs-save-btn" id="submit-absensi-btn" onclick="submitAbsensiSupabase()">💾 ${absensiState.existing?'Perbarui':'Simpan'} Absensi</button>` : ''}
      </div>
    </div>
  `;
}

function setStatusSupabase(studentId, status){
  if(!ABSENSI_STATUS.includes(status)) return;
  absensiState.status[studentId] = status;

  document.querySelectorAll(`.abs-statuses[data-student="${CSS.escape(studentId)}"] .abs-status-btn`).forEach(btn => {
    btn.classList.toggle('selected', btn.textContent.trim() === status);
  });

  const note = document.getElementById(`abs-note-${studentId}`);
  if(note) note.classList.toggle('show', status === 'Terlambat');

  const rekap = rekapAbsensiState();
  ABSENSI_STATUS.forEach(st => {
    const el = document.querySelector(`[data-abs-count="${st}"]`);
    if(el) el.textContent = String(rekap[st] || 0);
  });
}

function handleFotoSelect(e){
  const file = e.target.files?.[0];
  if(!file) return;

  const allowed = ['image/jpeg','image/png','image/webp'];
  if(!allowed.includes(file.type)){
    showToast('Foto harus JPG, PNG, atau WEBP', true);
    e.target.value = '';
    return;
  }

  if(file.size > 4 * 1024 * 1024){
    showToast('Ukuran foto maksimal 4 MB', true);
    e.target.value = '';
    return;
  }

  absensiState.fotoMime = file.type;
  absensiState.fotoName = file.name;

  const reader = new FileReader();
  reader.onload = () => {
    const result = String(reader.result || '');
    absensiState.fotoBase64 = result.split(',')[1] || '';
    const box = document.getElementById('foto-upload-box');
    if(box) box.textContent = `Foto dipilih: ${file.name}`;
    const preview = document.getElementById('foto-preview');
    if(preview){
      preview.src = result;
      preview.style.display = 'block';
    }
  };
  reader.readAsDataURL(file);
}

async function uploadFotoAbsensiJikaAda(){
  if(!absensiState.fotoBase64) return absensiState.fotoUrl || '';

  const res = await attendanceRequest('upload_photo', {
    class_id: absensiState.kelasId,
    date: absensiState.tanggal,
    base64: absensiState.fotoBase64,
    mime_type: absensiState.fotoMime,
    filename: absensiState.fotoName || 'morning-talk.jpg'
  }, { timeoutMs: 45000 });

  return res.photo_path || '';
}

async function submitAbsensiSupabase(){
  const btn = document.getElementById('submit-absensi-btn');
  const temaInput = document.getElementById('tema-input');
  absensiState.tema = (temaInput?.value || absensiState.tema || '').trim();

  if(!absensiState.tema){
    showToast('Isi tema Morning Talk terlebih dahulu.', true);
    temaInput?.focus();
    return;
  }

  if(!absensiState.siswa.length){
    showToast('Daftar siswa kosong.', true);
    return;
  }

  btn.disabled = true;
  const original = btn.innerHTML;
  btn.innerHTML = '<span class="spinner"></span>Menyimpan ke Supabase...';

  try{
    const photoPath = await uploadFotoAbsensiJikaAda();

    const records = absensiState.siswa.map(s => ({
      student_id: s.id,
      status: absensiState.status[s.id] || 'Hadir',
      note: (absensiState.catatan[s.id] || '').trim()
    }));

    await attendanceRequest('save', {
      class_id: absensiState.kelasId,
      date: absensiState.tanggal,
      theme: absensiState.tema,
      photo_path: photoPath,
      records
    }, { timeoutMs: 45000 });

    showToast(absensiState.existing ? 'Absensi berhasil diperbarui' : 'Absensi berhasil disimpan');
    await loadAbsensiSupabase();
  }catch(err){
    showToast(err.message || 'Gagal menyimpan Absensi', true);
  }finally{
    btn.disabled = false;
    btn.innerHTML = original;
  }
}


/* ==========================================================
   MODUL: LEGGER NILAI — INPUT DINAMIS
   ========================================================== */
let legerState = {
  kelas: null,
  tahunAjaran: '2026/2027',
  semester: 1,
  jenjang: null,
  mapelList: [],
  mapel: '',
  komponen: [],
  kkm: null,
  siswa: [],
  nilai: {},
  dirty: {},
  loadingToken: 0
};

function legerJenjangDariKelas(kelas){
  const m = String(kelas || '').trim().match(/^(\d+)/);
  return m ? Number(m[1]) : null;
}

function legerKey(jenis, urutan){
  return `${jenis}|${Number(urutan)}`;
}

function legerValue(nis, jenis, urutan){
  const byStudent = legerState.nilai[String(nis)] || {};
  const value = byStudent[legerKey(jenis, urutan)];
  if(value === '' || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function legerComponents(jenis){
  return legerState.komponen
    .filter(k => String(k.jenisKomponen) === jenis)
    .sort((a,b) => Number(a.urutan) - Number(b.urutan));
}

function legerAverage(nis, jenis){
  const vals = legerComponents(jenis)
    .map(k => legerValue(nis, jenis, k.urutan))
    .filter(v => v !== null);
  if(!vals.length) return null;
  return vals.reduce((a,b) => a+b, 0) / vals.length;
}

function legerGroupWeight(jenis){
  const first = legerComponents(jenis)[0];
  return first ? Number(first.bobot) || 0 : 0;
}

function legerFinalScore(nis){
  const groups = ['Tugas','TP','WWP','ASAS'];
  const values = {};
  for(const g of groups){
    const avg = legerAverage(nis, g);
    if(avg === null) return null;
    values[g] = avg;
  }
  const totalWeight = groups.reduce((sum,g) => sum + legerGroupWeight(g), 0);
  if(!totalWeight) return null;
  return groups.reduce((sum,g) => sum + values[g] * legerGroupWeight(g) / 100, 0);
}

function legerPredikat(na){
  if(na === null) return '-';
  if(na >= 89) return 'A';
  if(na >= 82) return 'B';
  if(na >= Number(legerState.kkm || 75)) return 'C';
  return 'D';
}

function legerFmt(v){
  if(v === null || v === undefined || Number.isNaN(Number(v))) return '—';
  const n = Math.round(Number(v) * 100) / 100;
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0+$/,'').replace(/\.$/,'');
}

function renderLegger(content){
  const isWalas = currentUser.role === 'walas';
  legerState = {
    kelas: isWalas ? currentUser.kelas : null,
    tahunAjaran: '2026/2027',
    semester: 1,
    jenjang: isWalas ? legerJenjangDariKelas(currentUser.kelas) : null,
    mapelList: [],
    mapel: '',
    komponen: [],
    kkm: null,
    siswa: [],
    nilai: {},
    dirty: {},
    loadingToken: legerState.loadingToken || 0
  };

  content.innerHTML = `
    <div class="page-title">Legger Nilai</div>
    <div class="page-sub">Input dan perbarui nilai siswa sesuai mata pelajaran.</div>

    ${!isWalas ? `
      <div class="card">
        <div class="card-title">Pilih Kelas</div>
        <div class="lg-filter-grid lg-filter-grid-admin">
          <div class="lg-field">
            <label>Kelas</label>
            <input type="text" id="lg-kelas" placeholder="Contoh: 3A Banat">
          </div>
          <button class="btn btn-sm lg-load-class-btn" onclick="legerLoadClassAdmin()">Tampilkan Kelas</button>
        </div>
      </div>` : ''}

    <div id="lg-main"></div>
  `;

  if(isWalas && legerState.kelas){
    loadLeggerSetup();
  }
}

function legerLoadClassAdmin(){
  const input = document.getElementById('lg-kelas');
  const kelas = (input?.value || '').trim();
  if(!kelas){
    showToast('Isi nama kelas terlebih dahulu.', true);
    return;
  }
  legerState.kelas = kelas;
  legerState.jenjang = legerJenjangDariKelas(kelas);
  loadLeggerSetup();
}

async function loadLeggerSetup(){
  if(!legerState.kelas) return;
  const token = ++legerState.loadingToken;
  const main = document.getElementById('lg-main');
  if(!main) return;

  main.innerHTML = `<div class="card lg-loading"><span class="spinner" style="border-top-color:var(--primary);border-color:rgba(10,110,110,.25)"></span>Menyiapkan Legger Nilai...</div>`;

  try{
    const res = await callApi('getLeggerSetup', {
      kelas: legerState.kelas,
      tahunAjaran: legerState.tahunAjaran,
      semester: legerState.semester
    });
    if(token !== legerState.loadingToken || activeModule !== 'leger') return;
    if(!res.success) throw new Error(res.error || 'Setup Legger tidak dapat dibaca.');

    legerState.tahunAjaran = res.tahunAjaran || legerState.tahunAjaran;
    legerState.semester = Number(res.semester) || 1;
    legerState.jenjang = Number(res.jenjang) || legerJenjangDariKelas(legerState.kelas);
    legerState.mapelList = Array.isArray(res.mapel) ? res.mapel : [];
    legerState.mapel = legerState.mapelList[0]?.mapel || '';
    legerState.dirty = {};

    renderLeggerShell();

    if(legerState.mapel){
      await loadLeggerMapel(legerState.mapel);
    }
  }catch(err){
    if(token !== legerState.loadingToken || activeModule !== 'leger') return;
    const rawMsg = String(err.message || 'Gagal memuat Legger Nilai.');
    const msg = userFriendlyDataMessage(rawMsg, 'Data Legger belum siap. Silakan hubungi admin.');
    main.innerHTML = `<div class="empty-state"><div class="icon">—</div>${escapeHtml(msg)}</div>`;
  }
}

function renderLeggerShell(){
  const main = document.getElementById('lg-main');
  if(!main) return;

  const options = legerState.mapelList
    .map(m => `<option value="${escapeHtml(m.mapel)}" ${m.mapel===legerState.mapel?'selected':''}>${escapeHtml(m.mapel)}</option>`)
    .join('');

  main.innerHTML = `
    <div class="card lg-toolbar-card">
      <div class="lg-filter-grid">
        <div class="lg-field">
          <label>Kelas</label>
          <div class="lg-static">${escapeHtml(legerState.kelas || '-')}</div>
        </div>
        <div class="lg-field">
          <label>Tahun Ajaran</label>
          <input id="lg-ta" value="${escapeHtml(legerState.tahunAjaran)}" onchange="legerPeriodChanged()">
        </div>
        <div class="lg-field">
          <label>Semester</label>
          <select id="lg-semester" onchange="legerPeriodChanged()">
            <option value="1" ${Number(legerState.semester)===1?'selected':''}>Semester 1</option>
            <option value="2" ${Number(legerState.semester)===2?'selected':''}>Semester 2</option>
          </select>
        </div>
        <div class="lg-field lg-field-mapel">
          <label>Mata Pelajaran</label>
          <select id="lg-mapel" onchange="legerMapelChanged(this.value)">
            ${options || '<option value="">Belum ada mapel</option>'}
          </select>
        </div>
      </div>
      <div class="lg-toolbar-meta">
        <span class="lg-chip">Jenjang ${escapeHtml(legerState.jenjang || '-')}</span>
        <span class="lg-chip" id="lg-kkm-chip">KKM —</span>
        <span class="lg-save-state" id="lg-save-state">Tidak ada perubahan</span>
      </div>
    </div>
    <div id="lg-table-area"></div>
  `;
}

function legerPeriodChanged(){
  if(Object.keys(legerState.dirty).length && !confirm('Ada perubahan nilai yang belum disimpan. Tetap ganti periode?')) return;
  legerState.tahunAjaran = (document.getElementById('lg-ta')?.value || '').trim() || '2026/2027';
  legerState.semester = Number(document.getElementById('lg-semester')?.value) || 1;
  loadLeggerSetup();
}

async function legerMapelChanged(mapel){
  if(Object.keys(legerState.dirty).length){
    const lanjut = confirm('Ada perubahan nilai yang belum disimpan. Pindah mapel tanpa menyimpan?');
    if(!lanjut){
      const sel = document.getElementById('lg-mapel');
      if(sel) sel.value = legerState.mapel;
      return;
    }
  }
  await loadLeggerMapel(mapel);
}

async function loadLeggerMapel(mapel){
  if(!mapel) return;
  const token = ++legerState.loadingToken;
  legerState.mapel = mapel;
  legerState.dirty = {};

  const meta = legerState.mapelList.find(m => m.mapel === mapel) || {};
  legerState.komponen = Array.isArray(meta.komponen) ? meta.komponen : [];
  legerState.kkm = meta.kkm === null || meta.kkm === undefined || meta.kkm === '' ? null : Number(meta.kkm);

  const chip = document.getElementById('lg-kkm-chip');
  if(chip) chip.textContent = legerState.kkm === null ? 'KKM —' : `KKM ${legerState.kkm}`;

  const area = document.getElementById('lg-table-area');
  if(!area) return;
  area.innerHTML = `<div class="card lg-loading"><span class="spinner" style="border-top-color:var(--primary);border-color:rgba(10,110,110,.25)"></span>Memuat nilai ${escapeHtml(mapel)}...</div>`;

  try{
    const res = await callApi('getLeggerNilai', {
      kelas: legerState.kelas,
      tahunAjaran: legerState.tahunAjaran,
      semester: legerState.semester,
      mapel
    });
    if(token !== legerState.loadingToken || activeModule !== 'leger') return;
    if(!res.success) throw new Error(res.error || 'Nilai tidak dapat dibaca.');

    legerState.siswa = Array.isArray(res.siswa) ? res.siswa : [];
    legerState.nilai = res.nilai || {};
    renderLeggerTable();
  }catch(err){
    if(token !== legerState.loadingToken || activeModule !== 'leger') return;
    const rawMsg = String(err.message || 'Gagal membaca nilai.');
    const msg = userFriendlyDataMessage(rawMsg, 'Data nilai belum siap. Silakan hubungi admin.');
    area.innerHTML = `<div class="empty-state"><div class="icon">—</div>${escapeHtml(msg)}</div>`;
  }
}

function renderLeggerTable(){
  const area = document.getElementById('lg-table-area');
  if(!area) return;

  if(!legerState.mapel){
    area.innerHTML = `<div class="empty-state"><div class="icon">—</div>Belum ada mata pelajaran untuk jenjang ini.</div>`;
    return;
  }
  if(!legerState.siswa.length){
    area.innerHTML = `<div class="empty-state"><div class="icon">—</div>Belum ada siswa pada kelas ${escapeHtml(legerState.kelas)}.</div>`;
    return;
  }
  if(!legerState.komponen.length){
    area.innerHTML = `<div class="empty-state"><div class="icon">—</div>Komponen nilai untuk mata pelajaran ini belum tersedia. Silakan hubungi admin.</div>`;
    return;
  }

  const tugas = legerComponents('Tugas');
  const tp = legerComponents('TP');
  const wwp = legerComponents('WWP');
  const asas = legerComponents('ASAS');

  const compTh = (arr, prefix) => arr.map(k => `<th class="lg-col-score">${escapeHtml(prefix)}${Number(k.urutan)}</th>`).join('');
  const inputCell = (s, k) => {
    const v = legerValue(s.nis, k.jenisKomponen, k.urutan);
    return `<td class="lg-score-cell"><input class="lg-score-input" type="number" min="0" max="100" step="0.01"
      value="${v === null ? '' : escapeHtml(v)}"
      data-nis="${escapeHtml(s.nis)}"
      data-nama="${escapeHtml(s.nama)}"
      data-jenis="${escapeHtml(k.jenisKomponen)}"
      data-urutan="${Number(k.urutan)}"
      oninput="legerInputChanged(this)"
      onkeydown="legerInputKeydown(event,this)"></td>`;
  };

  area.innerHTML = `
    <div class="card lg-table-card">
      <div class="lg-table-head">
        <div>
          <div class="card-title" style="margin-bottom:3px">${escapeHtml(legerState.mapel)}</div>
          <div class="lg-note">Rata-rata dan Nilai Akhir dihitung otomatis.</div>
        </div>
        <button class="btn btn-sm lg-save-btn" id="lg-save-btn" onclick="saveLeggerChanges()" disabled>Simpan Perubahan</button>
      </div>

      ${legerState.kkm === null ? `<div class="lg-warning">KKM mata pelajaran belum diatur. Nilai tetap dapat diinput, namun status ketuntasan belum tersedia.</div>` : ''}

      <div class="lg-table-scroll">
        <table class="lg-table">
          <thead>
            <tr>
              <th class="lg-sticky-no">No</th>
              <th class="lg-sticky-name">Nama Siswa</th>
              ${compTh(tugas,'T')}
              <th class="lg-calc-head">RT</th>
              ${compTh(tp,'TP')}
              <th class="lg-calc-head">RTP</th>
              ${wwp.map(() => '<th class="lg-col-score">WWP</th>').join('')}
              ${asas.map(() => '<th class="lg-col-score">ASAS</th>').join('')}
              <th class="lg-calc-head">NA</th>
              <th class="lg-calc-head">Pred.</th>
              <th class="lg-calc-head">Status</th>
            </tr>
          </thead>
          <tbody>
            ${legerState.siswa.map((s,idx) => {
              const rt = legerAverage(s.nis,'Tugas');
              const rtp = legerAverage(s.nis,'TP');
              const na = legerFinalScore(s.nis);
              const status = legerState.kkm === null || na === null ? '—' : (na >= legerState.kkm ? 'Tuntas' : 'Belum');
              return `<tr data-row-nis="${escapeHtml(s.nis)}">
                <td class="lg-sticky-no">${idx+1}</td>
                <td class="lg-sticky-name">
                  <div class="lg-student-name">${escapeHtml(s.nama)}</div>
                  <div class="lg-student-nis">NIS ${escapeHtml(s.nis)}</div>
                </td>
                ${tugas.map(k => inputCell(s,k)).join('')}
                <td class="lg-calc" data-calc="rt">${legerFmt(rt)}</td>
                ${tp.map(k => inputCell(s,k)).join('')}
                <td class="lg-calc" data-calc="rtp">${legerFmt(rtp)}</td>
                ${wwp.map(k => inputCell(s,k)).join('')}
                ${asas.map(k => inputCell(s,k)).join('')}
                <td class="lg-calc lg-na" data-calc="na">${legerFmt(na)}</td>
                <td class="lg-calc" data-calc="predikat">${legerPredikat(na)}</td>
                <td class="lg-calc" data-calc="status"><span class="lg-status ${status==='Tuntas'?'ok':status==='Belum'?'bad':''}">${status}</span></td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>

      <div class="lg-footer-note">
        Formula: Rata Tugas × ${legerGroupWeight('Tugas')}% + Rata TP × ${legerGroupWeight('TP')}% + WWP × ${legerGroupWeight('WWP')}% + ASAS × ${legerGroupWeight('ASAS')}%.
      </div>
    </div>
  `;
  updateLeggerSaveState();
}

function legerInputChanged(input){
  const raw = input.value.trim();
  if(raw !== ''){
    const n = Number(raw);
    if(!Number.isFinite(n) || n < 0 || n > 100){
      input.classList.add('invalid');
      return;
    }
  }
  input.classList.remove('invalid');

  const nis = String(input.dataset.nis);
  const nama = input.dataset.nama || '';
  const jenis = input.dataset.jenis;
  const urutan = Number(input.dataset.urutan);
  const key = legerKey(jenis, urutan);

  if(!legerState.nilai[nis]) legerState.nilai[nis] = {};
  legerState.nilai[nis][key] = raw === '' ? '' : Number(raw);

  const dirtyKey = `${nis}|${key}`;
  legerState.dirty[dirtyKey] = {
    nis, nama, jenisKomponen: jenis, urutan,
    nilai: raw === '' ? '' : Number(raw)
  };

  updateLeggerRow(nis);
  updateLeggerSaveState();
}

function updateLeggerRow(nis){
  const row = document.querySelector(`tr[data-row-nis="${CSS.escape(String(nis))}"]`);
  if(!row) return;

  const rt = legerAverage(nis,'Tugas');
  const rtp = legerAverage(nis,'TP');
  const na = legerFinalScore(nis);
  const status = legerState.kkm === null || na === null ? '—' : (na >= legerState.kkm ? 'Tuntas' : 'Belum');

  const set = (name, html) => {
    const el = row.querySelector(`[data-calc="${name}"]`);
    if(el) el.innerHTML = html;
  };
  set('rt', legerFmt(rt));
  set('rtp', legerFmt(rtp));
  set('na', legerFmt(na));
  set('predikat', legerPredikat(na));
  set('status', `<span class="lg-status ${status==='Tuntas'?'ok':status==='Belum'?'bad':''}">${status}</span>`);
}

function updateLeggerSaveState(){
  const count = Object.keys(legerState.dirty).length;
  const btn = document.getElementById('lg-save-btn');
  const state = document.getElementById('lg-save-state');
  if(btn){
    btn.disabled = count === 0;
    btn.textContent = count ? `Simpan Perubahan (${count})` : 'Simpan Perubahan';
  }
  if(state){
    state.textContent = count ? `${count} nilai belum disimpan` : 'Semua perubahan tersimpan';
    state.classList.toggle('dirty', count > 0);
  }
}


function legerInputKeydown(event, input){
  const key = event.key;
  const navigable = ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Enter'];
  if(!navigable.includes(key)) return;

  const row = input.closest('tr');
  if(!row) return;

  const currentInput = input;
  const currentCell = currentInput.closest('td');
  const table = currentInput.closest('table');
  if(!currentCell || !table) return;

  const rows = [...table.querySelectorAll('tbody tr')];
  const currentRowIdx = rows.indexOf(row);
  const inputsInRow = [...row.querySelectorAll('.lg-score-input')];
  const currentColIdx = inputsInRow.indexOf(currentInput);
  if(currentColIdx < 0) return;

  let target = null;

  if(key === 'ArrowLeft'){
    event.preventDefault();
    target = inputsInRow[currentColIdx - 1] || null;
  } else if(key === 'ArrowRight'){
    event.preventDefault();
    target = inputsInRow[currentColIdx + 1] || null;
  } else if(key === 'ArrowUp' || key === 'ArrowDown' || key === 'Enter'){
    event.preventDefault();
    const delta = (key === 'ArrowUp') ? -1 : 1;
    const nextRow = rows[currentRowIdx + delta];
    if(nextRow){
      const nextInputs = [...nextRow.querySelectorAll('.lg-score-input')];
      target = nextInputs[currentColIdx] || null;
    }
  }

  if(target){
    target.focus();
    target.select?.();
  }
}

async function saveLeggerChanges(){
  const changes = Object.values(legerState.dirty);
  if(!changes.length){
    showToast('Tidak ada perubahan nilai.');
    return;
  }
  if(document.querySelector('.lg-score-input.invalid')){
    showToast('Masih ada nilai di luar rentang 0–100.', true);
    return;
  }

  const btn = document.getElementById('lg-save-btn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>Menyimpan...';

  try{
    const res = await callApi('saveLeggerNilai', {
      kelas: legerState.kelas,
      tahunAjaran: legerState.tahunAjaran,
      semester: legerState.semester,
      mapel: legerState.mapel,
      dicatatOleh: currentUser.nama,
      username: currentUser.username,
      changes
    });
    if(!res.success) throw new Error(res.error || 'Gagal menyimpan nilai.');

    legerState.dirty = {};
    updateLeggerSaveState();
    showToast(`${res.saved || changes.length} perubahan nilai berhasil disimpan.`);
  }catch(err){
    const rawMsg = String(err.message || 'Gagal menyimpan nilai.');
    const msg = userFriendlyDataMessage(rawMsg, 'Nilai belum dapat disimpan. Silakan hubungi admin.');
    showToast(msg, true);
    updateLeggerSaveState();
  }finally{
    const b = document.getElementById('lg-save-btn');
    if(b && Object.keys(legerState.dirty).length){
      b.disabled = false;
      b.textContent = `Simpan Perubahan (${Object.keys(legerState.dirty).length})`;
    }
  }
}



/* ==========================================================
   MODUL: CAPAIAN PEMBELAJARAN BULANAN
   ========================================================== */
const CP_BULAN_SEMESTER = Object.freeze({
  1: ['Juli','Agustus','September','Oktober','November','Desember'],
  2: ['Januari','Februari','Maret','April','Mei','Juni']
});

let cpState = {
  kelas:null,
  jenjang:null,
  tahunAjaran:'2026/2027',
  semester:1,
  bulan:'',
  mapel:'',
  mapelList:[],
  cpByMapel:{},
  savedByMapel:{},
  dirty:false,
  loadToken:0
};

function cpDefaultBulan(semester){
  const nama = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  const current = nama[new Date().getMonth()];
  const list = CP_BULAN_SEMESTER[Number(semester)] || [];
  return list.includes(current) ? current : (list[0] || '');
}

function renderCPBulanan(content){
  const isWalas = currentUser.role === 'walas';
  cpState = {
    kelas: isWalas ? currentUser.kelas : null,
    jenjang: isWalas ? legerJenjangDariKelas(currentUser.kelas) : null,
    tahunAjaran:'2026/2027',
    semester:1,
    bulan:cpDefaultBulan(1),
    mapel:'',
    mapelList:[],
    cpByMapel:{},
    savedByMapel:{},
    dirty:false,
    loadToken:cpState.loadToken || 0
  };

  content.innerHTML = `
    <div class="page-title">Capaian Pembelajaran</div>
    <div class="page-sub">Pilih capaian yang sudah diajarkan pada bulan yang dipilih.</div>

    ${!isWalas ? `
      <div class="card cp-admin-class-card">
        <div class="card-title">Pilih Kelas</div>
        <div class="cp-admin-class-row">
          <input id="cp-kelas-admin" type="text" placeholder="Contoh: 3A Banat">
          <button class="btn btn-sm" onclick="cpLoadClassAdmin()">Tampilkan</button>
        </div>
      </div>` : ''}

    <div id="cp-main"></div>
  `;

  if(isWalas && cpState.kelas) loadCPBulanan();
}

function cpLoadClassAdmin(){
  const kelas = (document.getElementById('cp-kelas-admin')?.value || '').trim();
  if(!kelas){
    showToast('Isi nama kelas terlebih dahulu.', true);
    return;
  }
  cpState.kelas = kelas;
  cpState.jenjang = legerJenjangDariKelas(kelas);
  loadCPBulanan();
}

async function loadCPBulanan(preferredMapel=''){
  if(!cpState.kelas) return;
  const token = ++cpState.loadToken;
  const main = document.getElementById('cp-main');
  if(!main) return;

  main.innerHTML = `<div class="card cp-loading"><span class="spinner" style="border-top-color:var(--primary);border-color:rgba(10,110,110,.25)"></span>Memuat capaian pembelajaran...</div>`;

  try{
    const res = await callApi('getCPBulanan', {
      kelas:cpState.kelas,
      tahunAjaran:cpState.tahunAjaran,
      semester:cpState.semester,
      bulan:cpState.bulan
    });
    if(token !== cpState.loadToken || activeModule !== 'cp') return;
    if(!res.success) throw new Error(res.error || 'Data capaian pembelajaran belum dapat dibaca.');

    cpState.jenjang = Number(res.jenjang) || legerJenjangDariKelas(cpState.kelas);
    cpState.tahunAjaran = res.tahunAjaran || cpState.tahunAjaran;
    cpState.semester = Number(res.semester) || cpState.semester;
    cpState.bulan = res.bulan || cpState.bulan;
    cpState.mapelList = Array.isArray(res.mapel) ? res.mapel : [];
    cpState.cpByMapel = res.cpByMapel || {};
    cpState.savedByMapel = res.savedByMapel || {};

    const availableNames = cpState.mapelList.map(m => m.mapel);
    cpState.mapel = availableNames.includes(preferredMapel)
      ? preferredMapel
      : (availableNames.includes(cpState.mapel) ? cpState.mapel : (availableNames[0] || ''));
    cpState.dirty = false;

    renderCPShell();
    renderCPList();
  }catch(err){
    if(token !== cpState.loadToken || activeModule !== 'cp') return;
    const msg = userFriendlyDataMessage(err.message, 'Capaian pembelajaran belum tersedia. Silakan hubungi admin.');
    main.innerHTML = `<div class="empty-state"><div class="icon">—</div>${escapeHtml(msg)}</div>`;
  }
}

function renderCPShell(){
  const main = document.getElementById('cp-main');
  if(!main) return;

  const bulanOptions = (CP_BULAN_SEMESTER[Number(cpState.semester)] || [])
    .map(b => `<option value="${escapeHtml(b)}" ${b===cpState.bulan?'selected':''}>${escapeHtml(b)}</option>`)
    .join('');

  const mapelOptions = cpState.mapelList
    .map(m => `<option value="${escapeHtml(m.mapel)}" ${m.mapel===cpState.mapel?'selected':''}>${escapeHtml(m.mapel)}</option>`)
    .join('');

  main.innerHTML = `
    <div class="card cp-toolbar-card">
      <div class="cp-filter-grid">
        <div class="cp-field">
          <label>Kelas</label>
          <div class="cp-static">${escapeHtml(cpState.kelas || '-')}</div>
        </div>
        <div class="cp-field">
          <label>Tahun Ajaran</label>
          <input id="cp-ta" value="${escapeHtml(cpState.tahunAjaran)}" onchange="cpPeriodChanged()">
        </div>
        <div class="cp-field">
          <label>Semester</label>
          <select id="cp-semester" onchange="cpSemesterChanged()">
            <option value="1" ${Number(cpState.semester)===1?'selected':''}>Semester 1</option>
            <option value="2" ${Number(cpState.semester)===2?'selected':''}>Semester 2</option>
          </select>
        </div>
        <div class="cp-field">
          <label>Bulan</label>
          <select id="cp-bulan" onchange="cpBulanChanged(this.value)">${bulanOptions}</select>
        </div>
        <div class="cp-field cp-field-mapel">
          <label>Mata Pelajaran</label>
          <select id="cp-mapel" onchange="cpMapelChanged(this.value)">
            ${mapelOptions || '<option value="">Belum tersedia</option>'}
          </select>
        </div>
      </div>
      <div class="cp-toolbar-meta">
        <span class="cp-chip">Jenjang ${escapeHtml(cpState.jenjang || '-')}</span>
        <span class="cp-save-state" id="cp-save-state">Tersimpan</span>
      </div>
    </div>
    <div id="cp-list-area"></div>
  `;
}

function cpPeriodChanged(){
  if(cpState.dirty && !confirm('Ada pilihan yang belum disimpan. Tetap ganti tahun ajaran?')) return;
  cpState.tahunAjaran = (document.getElementById('cp-ta')?.value || '').trim() || '2026/2027';
  loadCPBulanan(cpState.mapel);
}

function cpSemesterChanged(){
  if(cpState.dirty && !confirm('Ada pilihan yang belum disimpan. Tetap ganti semester?')){
    const el = document.getElementById('cp-semester');
    if(el) el.value = String(cpState.semester);
    return;
  }
  cpState.semester = Number(document.getElementById('cp-semester')?.value) || 1;
  cpState.bulan = cpDefaultBulan(cpState.semester);
  loadCPBulanan(cpState.mapel);
}

function cpBulanChanged(bulan){
  if(cpState.dirty && !confirm('Ada pilihan yang belum disimpan. Tetap ganti bulan?')){
    const el = document.getElementById('cp-bulan');
    if(el) el.value = cpState.bulan;
    return;
  }
  cpState.bulan = bulan;
  loadCPBulanan(cpState.mapel);
}

function cpMapelChanged(mapel){
  if(cpState.dirty && !confirm('Ada pilihan yang belum disimpan. Tetap pindah mata pelajaran?')){
    const el = document.getElementById('cp-mapel');
    if(el) el.value = cpState.mapel;
    return;
  }
  cpState.mapel = mapel;
  cpState.dirty = false;
  renderCPList();
}

function cpSelectedSet(mapel){
  const arr = cpState.savedByMapel?.[mapel] || [];
  return new Set(arr.map(String));
}

function renderCPList(){
  const area = document.getElementById('cp-list-area');
  if(!area) return;

  if(!cpState.mapel){
    area.innerHTML = `<div class="empty-state"><div class="icon">—</div>Belum ada capaian pembelajaran untuk periode ini.</div>`;
    return;
  }

  const list = Array.isArray(cpState.cpByMapel?.[cpState.mapel]) ? cpState.cpByMapel[cpState.mapel] : [];
  if(!list.length){
    area.innerHTML = `<div class="empty-state"><div class="icon">—</div>Belum ada capaian pembelajaran untuk mata pelajaran ini.</div>`;
    return;
  }

  const selected = cpSelectedSet(cpState.mapel);

  area.innerHTML = `
    <div class="card cp-list-card">
      <div class="cp-list-head">
        <div>
          <div class="card-title" style="margin-bottom:3px">${escapeHtml(cpState.mapel)}</div>
          <div class="cp-list-sub">${escapeHtml(cpState.bulan)} · pilih capaian yang sudah dilaksanakan.</div>
        </div>
        <div class="cp-head-actions">
          <span class="cp-count" id="cp-count">${selected.size} dipilih</span>
          <button class="btn btn-sm cp-save-btn" id="cp-save-btn" onclick="saveCPBulanan()" disabled>Simpan</button>
        </div>
      </div>

      <div class="cp-items">
        ${list.map((cp,idx) => {
          const checked = selected.has(String(cp.kodeCP));
          return `
            <label class="cp-item ${checked?'selected':''}" data-cp-code="${escapeHtml(cp.kodeCP)}">
              <input type="checkbox"
                value="${escapeHtml(cp.kodeCP)}"
                ${checked?'checked':''}
                onchange="cpToggleItem(this)">
              <div class="cp-item-body">
                <div class="cp-item-top">
                  <span class="cp-number">${idx+1}</span>
                  ${cp.topikMateri ? `<span class="cp-topic">${escapeHtml(cp.topikMateri)}</span>` : ''}
                </div>
                <div class="cp-text">${escapeHtml(cp.capaianPembelajaran)}</div>
              </div>
            </label>`;
        }).join('')}
      </div>
    </div>
  `;
  cpUpdateSaveState();
}

function cpToggleItem(input){
  const item = input.closest('.cp-item');
  item?.classList.toggle('selected', input.checked);
  cpState.dirty = true;
  cpUpdateSaveState();
}

function cpCurrentSelectedCodes(){
  return [...document.querySelectorAll('#cp-list-area .cp-item input[type="checkbox"]:checked')]
    .map(el => el.value);
}

function cpUpdateSaveState(){
  const selectedCount = cpCurrentSelectedCodes().length;
  const count = document.getElementById('cp-count');
  const btn = document.getElementById('cp-save-btn');
  const state = document.getElementById('cp-save-state');

  if(count) count.textContent = `${selectedCount} dipilih`;
  if(btn) btn.disabled = !cpState.dirty;
  if(state){
    state.textContent = cpState.dirty ? 'Belum disimpan' : 'Tersimpan';
    state.classList.toggle('dirty', cpState.dirty);
  }
}

async function saveCPBulanan(){
  if(!cpState.mapel) return;
  const btn = document.getElementById('cp-save-btn');
  const selectedCodes = cpCurrentSelectedCodes();

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>Menyimpan...';

  try{
    const res = await callApi('saveCPBulanan', {
      kelas:cpState.kelas,
      tahunAjaran:cpState.tahunAjaran,
      semester:cpState.semester,
      bulan:cpState.bulan,
      mapel:cpState.mapel,
      selectedCodes,
      dicatatOleh:currentUser.nama,
      username:currentUser.username
    });
    if(!res.success) throw new Error(res.error || 'Capaian pembelajaran belum dapat disimpan.');

    if(!cpState.savedByMapel) cpState.savedByMapel = {};
    cpState.savedByMapel[cpState.mapel] = selectedCodes.slice();
    cpState.dirty = false;
    cpUpdateSaveState();
    showToast('Capaian pembelajaran berhasil disimpan.');
  }catch(err){
    const msg = userFriendlyDataMessage(err.message, 'Capaian pembelajaran belum dapat disimpan. Silakan hubungi admin.');
    showToast(msg, true);
    cpUpdateSaveState();
  }finally{
    const b = document.getElementById('cp-save-btn');
    if(b){
      b.textContent = 'Simpan';
      b.disabled = !cpState.dirty;
    }
  }
}



/* ==========================================================
   MODUL: BILINGUAL — HAFALAN VOCABULARY
   Data awal dari laporan lama otomatis menjadi nilai awal.
   ========================================================== */
let vocabState = {
  kelas:null,
  tahunAjaran:'2026/2027',
  semester:1,
  bulan:'',
  categories:[],
  students:[],
  values:{},
  dirty:{},
  loadToken:0
};

function renderVocabularyBulanan(content){
  const isWalas = currentUser.role === 'walas';
  vocabState = {
    kelas:isWalas ? currentUser.kelas : null,
    tahunAjaran:'2026/2027',
    semester:1,
    bulan:cpDefaultBulan(1),
    categories:[], students:[], values:{}, dirty:{},
    loadToken:vocabState.loadToken || 0
  };

  content.innerHTML = `
    <div class="page-title">Bilingual</div>
    <div class="page-sub">Hafalan Vocabulary siswa.</div>
    ${!isWalas ? `
      <div class="card vc-admin-card">
        <div class="card-title">Pilih Kelas</div>
        <div class="vc-admin-row">
          <input id="vc-kelas-admin" type="text" placeholder="Contoh: 3A Banat">
          <button class="btn btn-sm" onclick="vocabLoadClassAdmin()">Tampilkan</button>
        </div>
      </div>` : ''}
    <div id="vc-main"></div>`;

  if(isWalas && vocabState.kelas) loadVocabularyBulanan();
}

function vocabLoadClassAdmin(){
  const kelas=(document.getElementById('vc-kelas-admin')?.value||'').trim();
  if(!kelas){ showToast('Isi nama kelas terlebih dahulu.', true); return; }
  vocabState.kelas=kelas;
  loadVocabularyBulanan();
}

async function loadVocabularyBulanan(){
  if(!vocabState.kelas) return;
  const token=++vocabState.loadToken;
  const main=document.getElementById('vc-main');
  if(!main) return;
  main.innerHTML=`<div class="card vc-loading"><span class="spinner" style="border-top-color:var(--primary);border-color:rgba(10,110,110,.25)"></span>Memuat data vocabulary...</div>`;

  try{
    const res=await callApi('getVocabularyBulanan',{
      kelas:vocabState.kelas,
      tahunAjaran:vocabState.tahunAjaran,
      semester:vocabState.semester,
      bulan:vocabState.bulan
    });
    if(token!==vocabState.loadToken || activeModule!=='bilingual') return;
    if(!res.success) throw new Error(res.error || 'Data vocabulary belum dapat dibaca.');

    vocabState.tahunAjaran=res.tahunAjaran || vocabState.tahunAjaran;
    vocabState.semester=Number(res.semester)||1;
    vocabState.bulan=res.bulan || vocabState.bulan;
    vocabState.categories=Array.isArray(res.categories)?res.categories:[];
    vocabState.students=Array.isArray(res.students)?res.students:[];
    vocabState.values=res.values||{};
    vocabState.dirty={};
    renderVocabularyTable();
  }catch(err){
    if(token!==vocabState.loadToken || activeModule!=='bilingual') return;
    const msg=userFriendlyDataMessage(err.message,'Data vocabulary belum tersedia. Silakan hubungi admin.');
    main.innerHTML=`<div class="empty-state"><div class="icon">—</div>${escapeHtml(msg)}</div>`;
  }
}

function renderVocabularyTable(){
  const main=document.getElementById('vc-main');
  if(!main) return;
  const months=CP_BULAN_SEMESTER[Number(vocabState.semester)]||[];
  const monthOptions=months.map(b=>`<option value="${escapeHtml(b)}" ${b===vocabState.bulan?'selected':''}>${escapeHtml(b)}</option>`).join('');
  const totalTarget=vocabState.categories.reduce((s,c)=>s+(Number(c.target)||0),0);

  const headers=vocabState.categories.map(c=>`
    <th class="vc-cat-head">
      <div>${escapeHtml(c.label)}</div>
      <small>Target ${Number(c.target)||0}</small>
    </th>`).join('');

  const rows=vocabState.students.map((s,idx)=>{
    const cells=vocabState.categories.map(c=>{
      const key=`${String(s.nis)}|${Number(c.urutan)}`;
      const raw=Object.prototype.hasOwnProperty.call(vocabState.values,key)?vocabState.values[key]:'';
      const value=(raw===null||raw===undefined)?'':raw;
      return `<td class="vc-score-cell"><input class="vc-score-input" type="number" min="0" max="${Number(c.target)||0}" step="1"
        value="${escapeHtml(String(value))}"
        data-nis="${escapeHtml(String(s.nis))}"
        data-nama="${escapeHtml(s.nama)}"
        data-urutan="${Number(c.urutan)}"
        data-target="${Number(c.target)||0}"
        oninput="vocabInputChanged(this)"
        onkeydown="vocabInputKeydown(event,this)"></td>`;
    }).join('');
    return `<tr data-nis="${escapeHtml(String(s.nis))}">
      <td class="vc-no">${idx+1}</td>
      <td class="vc-name">${escapeHtml(s.nama)}</td>
      ${cells}
      <td class="vc-total" data-vc-total>0</td>
      <td class="vc-percent" data-vc-percent>0%</td>
    </tr>`;
  }).join('');

  main.innerHTML=`
    <div class="card vc-toolbar-card">
      <div class="vc-filter-grid">
        <div class="vc-field"><label>Kelas</label><div class="vc-static">${escapeHtml(vocabState.kelas||'-')}</div></div>
        <div class="vc-field"><label>Tahun Ajaran</label><input id="vc-ta" value="${escapeHtml(vocabState.tahunAjaran)}" onchange="vocabPeriodChanged()"></div>
        <div class="vc-field"><label>Semester</label><select id="vc-semester" onchange="vocabSemesterChanged()"><option value="1" ${vocabState.semester===1?'selected':''}>Semester 1</option><option value="2" ${vocabState.semester===2?'selected':''}>Semester 2</option></select></div>
        <div class="vc-field"><label>Bulan</label><select id="vc-bulan" onchange="vocabBulanChanged(this.value)">${monthOptions}</select></div>
      </div>
      <div class="vc-meta"><span>${vocabState.students.length} siswa</span><span>Target ${totalTarget} kosakata</span><span id="vc-save-state">Tersimpan</span></div>
    </div>

    ${!vocabState.categories.length ? `<div class="empty-state"><div class="icon">—</div>Vocabulary untuk kelas ini belum tersedia. Silakan hubungi admin.</div>` : `
    <div class="card vc-table-card">
      <div class="vc-table-scroll">
        <table class="vc-table">
          <thead><tr><th class="vc-sticky-no">No</th><th class="vc-sticky-name">Nama Siswa</th>${headers}<th>Total</th><th>Capaian</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <div class="vc-footer"><button class="btn vc-save-btn" id="vc-save-btn" onclick="saveVocabularyChanges()" disabled>Simpan Perubahan</button></div>
    </div>`}`;

  document.querySelectorAll('.vc-table tbody tr').forEach(vocabRecalcRow);
}

function vocabPeriodChanged(){
  if(Object.keys(vocabState.dirty).length && !confirm('Ada perubahan yang belum disimpan. Tetap ganti tahun ajaran?')) return;
  vocabState.tahunAjaran=(document.getElementById('vc-ta')?.value||'').trim()||'2026/2027';
  loadVocabularyBulanan();
}
function vocabSemesterChanged(){
  const el=document.getElementById('vc-semester');
  const next=Number(el?.value)||1;
  if(Object.keys(vocabState.dirty).length && !confirm('Ada perubahan yang belum disimpan. Tetap ganti semester?')){ if(el)el.value=String(vocabState.semester); return; }
  vocabState.semester=next;
  vocabState.bulan=cpDefaultBulan(next);
  loadVocabularyBulanan();
}
function vocabBulanChanged(bulan){
  const el=document.getElementById('vc-bulan');
  if(Object.keys(vocabState.dirty).length && !confirm('Ada perubahan yang belum disimpan. Tetap ganti bulan?')){ if(el)el.value=vocabState.bulan; return; }
  vocabState.bulan=bulan;
  loadVocabularyBulanan();
}

function vocabInputChanged(input){
  const target=Number(input.dataset.target)||0;
  const raw=input.value.trim();
  const n=raw===''?null:Number(raw);
  const invalid=n!==null && (!Number.isFinite(n)||n<0||n>target);
  input.classList.toggle('invalid',invalid);
  const key=`${input.dataset.nis}|${input.dataset.urutan}`;
  vocabState.dirty[key]={nis:input.dataset.nis,nama:input.dataset.nama,urutan:Number(input.dataset.urutan),capaian:n};
  vocabRecalcRow(input.closest('tr'));
  vocabUpdateSaveState();
}

function vocabRecalcRow(row){
  if(!row) return;
  let total=0, target=0;
  row.querySelectorAll('.vc-score-input').forEach(inp=>{
    const v=inp.value.trim()===''?0:Number(inp.value)||0;
    total+=v;
    target+=Number(inp.dataset.target)||0;
  });
  const t=row.querySelector('[data-vc-total]');
  const p=row.querySelector('[data-vc-percent]');
  if(t)t.textContent=String(total);
  if(p)p.textContent=target?`${(total/target*100).toFixed(1).replace('.0','')}%`:'0%';
}

function vocabUpdateSaveState(){
  const count=Object.keys(vocabState.dirty).length;
  const btn=document.getElementById('vc-save-btn');
  const state=document.getElementById('vc-save-state');
  if(btn)btn.disabled=!count;
  if(state){ state.textContent=count?'Belum disimpan':'Tersimpan'; state.classList.toggle('dirty',!!count); }
}

function vocabInputKeydown(event,input){
  const keys=['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Enter'];
  if(!keys.includes(event.key))return;
  const row=input.closest('tr'), table=input.closest('table');
  if(!row||!table)return;
  const rows=[...table.querySelectorAll('tbody tr')];
  const ri=rows.indexOf(row);
  const inputs=[...row.querySelectorAll('.vc-score-input')];
  const ci=inputs.indexOf(input);
  let target=null;
  if(event.key==='ArrowLeft'){event.preventDefault();target=inputs[ci-1]||null;}
  else if(event.key==='ArrowRight'){event.preventDefault();target=inputs[ci+1]||null;}
  else{
    event.preventDefault();
    const delta=event.key==='ArrowUp'?-1:1;
    const next=rows[ri+delta];
    if(next)target=[...next.querySelectorAll('.vc-score-input')][ci]||null;
  }
  if(target){target.focus();target.select?.();}
}

async function saveVocabularyChanges(){
  const changes=Object.values(vocabState.dirty);
  if(!changes.length){showToast('Tidak ada perubahan.');return;}
  if(document.querySelector('.vc-score-input.invalid')){showToast('Masih ada angka yang melebihi target.',true);return;}
  const btn=document.getElementById('vc-save-btn');
  if(btn){btn.disabled=true;btn.innerHTML='<span class="spinner"></span>Menyimpan...';}
  try{
    const res=await callApi('saveVocabularyBulanan',{
      kelas:vocabState.kelas,tahunAjaran:vocabState.tahunAjaran,semester:vocabState.semester,bulan:vocabState.bulan,
      changes,dicatatOleh:currentUser.nama,username:currentUser.username
    });
    if(!res.success)throw new Error(res.error||'Data vocabulary belum dapat disimpan.');
    changes.forEach(ch=>{vocabState.values[`${ch.nis}|${ch.urutan}`]=ch.capaian;});
    vocabState.dirty={};
    vocabUpdateSaveState();
    showToast('Vocabulary berhasil disimpan.');
  }catch(err){
    showToast(userFriendlyDataMessage(err.message,'Data vocabulary belum dapat disimpan. Silakan hubungi admin.'),true);
  }finally{
    const b=document.getElementById('vc-save-btn');
    if(b){b.textContent='Simpan Perubahan';b.disabled=!Object.keys(vocabState.dirty).length;}
  }
}


/* ==========================================================
   MODUL: PjBL
   ========================================================== */
let pjblState = {
  kelas:null, jenjang:null, pekan:null, daftarPekan:[], kegiatanRencana:'', tanggalRencana:'',
  siswa:[], nilai:{}, realita:'', kendala:'', masukan:'',
  fotoBase64:null, fotoMime:null, fotoUrlLama:''
};

function renderPjBL(content){
  const isWalas = currentUser.role === 'walas';
  content.innerHTML = `
    <div class="page-title">PjBL — Project Based Learning</div>
    <div class="page-sub">PjBL dimulai dari Pekan 1 sesuai timeline pada Spreadsheet. Pilih pekan lain melalui daftar pekan bila diperlukan.</div>

    ${!isWalas ? `
    <div class="card">
      <div class="card-title">Pilih Kelas</div>
      <input type="text" id="pjbl-kelas-input" placeholder="Ketik nama kelas persis, contoh: 1 Banin A"
        style="width:100%;padding:11px 14px;border:2px solid var(--border);border-radius:10px;font-family:inherit;font-size:14px;">
    </div>` : ''}

    <div id="pjbl-body"></div>
  `;

  if(isWalas){
    pjblState.kelas = currentUser.kelas;
    loadPjBLPekanAktif();
  } else {
    document.getElementById('pjbl-kelas-input').addEventListener('change', (e) => {
      pjblState.kelas = e.target.value.trim();
      loadPjBLPekanAktif();
    });
  }
}

let pjblLoadToken = 0;

async function loadPjBLPekanAktif(){
  if(!pjblState.kelas) return;
  const requestToken = ++pjblLoadToken;
  const body = document.getElementById('pjbl-body');
  if(!body) return;
  body.innerHTML = `<div class="card"><span class="spinner" style="border-top-color:var(--primary);border-color:rgba(10,110,110,0.25)"></span>Memuat timeline PjBL...</div>`;

  let info;
  try{
    info = await callApi('getPekanAktifPjBL', { kelas: pjblState.kelas });
  }catch(err){
    if(requestToken !== pjblLoadToken || activeModule !== 'pjbl') return;
    body.innerHTML = `<div class="empty-state"><div class="icon">—</div>Gagal mengambil timeline dari Spreadsheet: ${escapeHtml(err.message || 'koneksi backend bermasalah')}</div>`;
    return;
  }

  if(requestToken !== pjblLoadToken || activeModule !== 'pjbl' || !document.getElementById('pjbl-body')) return;

  if(!info.success){
    const pesanMap = {
      pekan_1_tidak_ditemukan: 'Pekan 1 tidak ditemukan pada sheet "Time Line". Pastikan kolom Pekan berisi 1 atau Pekan 1.',
      timeline_kosong: 'Tidak ada timeline yang berhasil dibaca dari sheet "Time Line".',
      kelas_tidak_valid: 'Nama kelas tidak valid. Nama kelas harus diawali angka jenjang, misalnya 1 Banin A.'
    };
    const pesan = pesanMap[info.error] || `Timeline tidak bisa dibaca (${info.error || 'kesalahan tidak diketahui'}).`;
    body.innerHTML = `<div class="empty-state"><div class="icon">—</div>${escapeHtml(pesan)}</div>`;
    return;
  }

  pjblState.jenjang = info.jenjang;
  pjblState.daftarPekan = Array.isArray(info.daftarPekan)
    ? info.daftarPekan
        .map(p => ({
          pekan: Number(p.pekan),
          tanggal: String(p.tanggal || '').trim(),
          kegiatan: String(p.kegiatan || '').trim()
        }))
        .filter(p => Number.isFinite(p.pekan) && p.pekan >= 1)
        .sort((a,b) => a.pekan - b.pekan)
    : [];

  const pekanSatu = pjblState.daftarPekan.find(p => p.pekan === 1);
  if(!pekanSatu){
    body.innerHTML = `<div class="empty-state"><div class="icon">—</div>Pekan 1 tidak ditemukan pada respons timeline. Periksa struktur sheet "Time Line".</div>`;
    return;
  }

  pjblState.pekan = 1;
  pjblState.tanggalRencana = pekanSatu.tanggal || info.tanggalAktif || '';
  pjblState.kegiatanRencana = pekanSatu.kegiatan || info.kegiatanRencanaAktif || '';

  const siswaRes = await callApi('getSiswaByKelas', { kelas: pjblState.kelas });
  if(requestToken !== pjblLoadToken || activeModule !== 'pjbl' || !document.getElementById('pjbl-body')) return;
  pjblState.siswa = siswaRes.data || [];

  await loadPjBLForPekan(1, requestToken);
}

async function loadPjBLForPekan(pekan, existingToken=null){
  const requestToken = existingToken === null ? ++pjblLoadToken : existingToken;
  pjblState.pekan = Number(pekan);
  const pekanInfo = pjblState.daftarPekan.find(p => Number(p.pekan) === Number(pekan));
  pjblState.tanggalRencana = pekanInfo ? String(pekanInfo.tanggal || '') : '';
  pjblState.kegiatanRencana = pekanInfo ? String(pekanInfo.kegiatan || '') : '';

  const body = document.getElementById('pjbl-body');
  if(!body || activeModule !== 'pjbl') return;

  let existing;
  try{
    existing = await callApi('getPjBLPekan', { kelas: pjblState.kelas, pekan: pjblState.pekan });
  }catch(err){
    if(requestToken !== pjblLoadToken || activeModule !== 'pjbl') return;
    body.innerHTML = `<div class="empty-state"><div class="icon">—</div>Gagal mengambil data PjBL Pekan ${escapeHtml(pjblState.pekan)}: ${escapeHtml(err.message || 'koneksi backend bermasalah')}</div>`;
    return;
  }

  if(requestToken !== pjblLoadToken || activeModule !== 'pjbl' || !document.getElementById('pjbl-body')) return;
  if(!existing || !existing.success){
    body.innerHTML = `<div class="empty-state"><div class="icon">—</div>Data PjBL Pekan ${escapeHtml(pjblState.pekan)} tidak dapat dibaca.</div>`;
    return;
  }

  pjblState.nilai = {};
  pjblState.siswa.forEach(s => { pjblState.nilai[s.nis] = existing.nilai ? (existing.nilai[s.nis] || '') : ''; });

  if(existing.log){
    pjblState.realita = existing.log.realita || '';
    pjblState.kendala = existing.log.kendala || '';
    pjblState.masukan = existing.log.masukan || '';
    pjblState.fotoUrlLama = existing.log.fotoUrl || '';
  } else {
    pjblState.realita = ''; pjblState.kendala = ''; pjblState.masukan = ''; pjblState.fotoUrlLama = '';
  }
  pjblState.fotoBase64 = null; pjblState.fotoMime = null;

  renderPjBLForm(existing.sudahAda);
}

function renderPjBLForm(sudahAda){
  const body = document.getElementById('pjbl-body');
  if(!body || activeModule !== 'pjbl') return;

  if(pjblState.siswa.length === 0){
    body.innerHTML = `<div class="empty-state"><div class="icon">—</div>Belum ada data siswa untuk kelas ini di sheet Siswa.</div>`;
    return;
  }

  const opsiPekan = pjblState.daftarPekan.map(p =>
    `<option value="${p.pekan}" ${p.pekan.toString()===pjblState.pekan.toString()?'selected':''}>Pekan ${p.pekan} — ${p.tanggal}</option>`
  ).join('');

  body.innerHTML = `
    <div class="card">
      <div class="card-title">
        Pekan PjBL
        <select class="pekan-select" id="pekan-select" onchange="loadPjBLForPekan(this.value)">${opsiPekan}</select>
        ${sudahAda ? '<span class="pekan-badge">Sudah ada data — mode edit</span>' : ''}
      </div>
      <div style="font-size:13px;color:var(--muted);line-height:1.7">
        <div><strong style="color:var(--text)">Tanggal:</strong> ${escapeHtml(pjblState.tanggalRencana || 'Belum diisi di sheet Time Line')}</div>
        <div><strong style="color:var(--text)">Kegiatan:</strong> ${pjblState.kegiatanRencana ? escapeHtml(pjblState.kegiatanRencana).replace(/\n/g,'<br>') : '<span style="color:var(--danger)">Kolom kegiatan untuk kelas ini masih kosong atau belum terbaca.</span>'}</div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">Timeline Pekan Ini</div>
      <div style="margin-bottom:12px;">
        <label style="display:block;font-size:12px;font-weight:600;margin-bottom:5px;">Realita / Kejadian</label>
        <textarea class="textarea-field" id="realita-input" placeholder="Apa yang benar-benar terjadi/dikerjakan pekan ini...">${escapeHtml(pjblState.realita)}</textarea>
      </div>
      <div style="margin-bottom:12px;">
        <label style="display:block;font-size:12px;font-weight:600;margin-bottom:5px;">Kendala</label>
        <textarea class="textarea-field" id="kendala-input" placeholder="Hambatan yang ditemui...">${escapeHtml(pjblState.kendala)}</textarea>
      </div>
      <div>
        <label style="display:block;font-size:12px;font-weight:600;margin-bottom:5px;">Masukan</label>
        <textarea class="textarea-field" id="masukan-input" placeholder="Catatan/saran untuk pekan berikutnya...">${escapeHtml(pjblState.masukan)}</textarea>
      </div>
    </div>

    <div class="card">
      <div class="card-title">Foto Kegiatan</div>
      <div class="foto-upload ${pjblState.fotoUrlLama ? 'has-file' : ''}" id="pjbl-foto-upload-box" onclick="document.getElementById('pjbl-foto-input').click()">
        ${pjblState.fotoUrlLama ? 'Sudah ada foto tersimpan — klik untuk ganti' : 'Klik untuk unggah 1 foto kegiatan PjBL pekan ini'}
      </div>
      <input type="file" id="pjbl-foto-input" accept="image/*" style="display:none" onchange="handlePjBLFotoSelect(event)">
      <img id="pjbl-foto-preview" style="max-width:100%;max-height:160px;border-radius:8px;margin-top:10px;display:none;">
    </div>

    <div class="card">
      <div class="card-title">Nilai Keaktifan Pekan Ini (${pjblState.siswa.length} siswa)</div>
      <div class="legend-skala">
        <span><b>1</b> = Perlu Bimbingan Khusus</span>
        <span><b>2</b> = Cukup / Perlu Diingatkan</span>
        <span><b>3</b> = Aktif</span>
        <span><b>4</b> = Sangat Aktif</span>
      </div>
      <div id="pjbl-nilai-list"></div>
      <div style="font-size:11px;color:var(--muted);margin-top:10px;">Tips: ketik angka lalu tekan <b>Enter</b> atau panah <b>↓/↑</b> untuk pindah ke siswa berikutnya/sebelumnya.</div>
    </div>

    <button class="btn" id="submit-pjbl-btn" onclick="submitPjBLForm()">Simpan Pekan Ini</button>
  `;

  const list = document.getElementById('pjbl-nilai-list');
  pjblState.siswa.forEach((s, idx) => {
    const row = document.createElement('div');
    row.className = 'nilai-row';
    const nilaiAwal = pjblState.nilai[s.nis] || '';
    row.innerHTML = `
      <div><div class="siswa-name">${escapeHtml(s.nama)}</div><div class="siswa-nis">NIS ${escapeHtml(s.nis)}</div></div>
      <input type="text" inputmode="numeric" maxlength="1" class="nilai-input ${nilaiAwal ? 'terisi' : ''}"
        id="nilai-input-${idx}" data-nis="${escapeHtml(s.nis)}" value="${escapeHtml(nilaiAwal)}" placeholder="-">
    `;
    list.appendChild(row);
  });

  pjblState.siswa.forEach((s, idx) => {
    const input = document.getElementById(`nilai-input-${idx}`);
    input.addEventListener('input', () => {
      let v = input.value.replace(/[^1-4]/g, '').slice(0,1);
      input.value = v;
      pjblState.nilai[s.nis] = v;
      input.classList.toggle('terisi', !!v);
    });
    input.addEventListener('keydown', (e) => {
      if(e.key === 'Enter' || e.key === 'ArrowDown'){
        e.preventDefault();
        const next = document.getElementById(`nilai-input-${idx+1}`);
        if(next){ next.focus(); next.select(); }
      } else if(e.key === 'ArrowUp'){
        e.preventDefault();
        const prev = document.getElementById(`nilai-input-${idx-1}`);
        if(prev){ prev.focus(); prev.select(); }
      }
    });
  });
}

function handlePjBLFotoSelect(e){
  const file = e.target.files[0];
  if(!file) return;
  pjblState.fotoMime = file.type;
  const reader = new FileReader();
  reader.onload = () => {
    pjblState.fotoBase64 = reader.result.split(',')[1];
    document.getElementById('pjbl-foto-upload-box').textContent = 'Foto dipilih: ' + file.name;
    document.getElementById('pjbl-foto-upload-box').classList.add('has-file');
    const preview = document.getElementById('pjbl-foto-preview');
    preview.src = reader.result;
    preview.style.display = 'block';
  };
  reader.readAsDataURL(file);
}

async function submitPjBLForm(){
  const btn = document.getElementById('submit-pjbl-btn');

  pjblState.realita = document.getElementById('realita-input').value.trim();
  pjblState.kendala = document.getElementById('kendala-input').value.trim();
  pjblState.masukan = document.getElementById('masukan-input').value.trim();

  const nilaiKosong = pjblState.siswa.filter(s => !pjblState.nilai[s.nis]);
  if(nilaiKosong.length > 0){
    showToast(`${nilaiKosong.length} siswa belum diisi, otomatis disimpan sebagai 0 (bisa diedit nanti)`);
  }

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>Menyimpan...';

  try{
    let fotoUrl = '';
    if(pjblState.fotoBase64){
      const uploadRes = await callApi('uploadFotoPjBL', {
        kelas: pjblState.kelas,
        base64: pjblState.fotoBase64,
        mimeType: pjblState.fotoMime,
        filename: `PjBL_${pjblState.kelas}_P${pjblState.pekan}.jpg`
      });
      if(uploadRes.success) fotoUrl = uploadRes.url;
    }

    const nilaiArr = pjblState.siswa.map(s => ({ nis: s.nis, nama: s.nama, skor: Number(pjblState.nilai[s.nis]) || 0 }));

    const res = await callApi('submitPjBL', {
      kelas: pjblState.kelas,
      pekan: pjblState.pekan,
      kegiatanRencana: pjblState.kegiatanRencana,
      realita: pjblState.realita,
      kendala: pjblState.kendala,
      masukan: pjblState.masukan,
      fotoUrl,
      dicatatOleh: currentUser.nama,
      nilai: nilaiArr
    });

    if(res.success){
      showToast('Data PjBL pekan ini berhasil disimpan');
      loadPjBLForPekan(pjblState.pekan);
    }
  } finally {
    btn.disabled = false;
    btn.textContent = 'Simpan Pekan Ini';
  }
}

/* ==========================================================
   MODUL: KEDISIPLINAN & REWARD — SUPABASE
   Berdasarkan Tata Tertib Siswa & Orang Tua/Wali CQ
   ========================================================== */

const POINT_STATUS = {
  violationClassId: '',
  rewardClassId: '',
  violationStudentId: '',
  rewardStudentId: '',
  violationMasters: [],
  rewardMasters: [],
  classes: [],
  violationStudents: [],
  rewardStudents: []
};

function injectStudentPointStyles(){
  if(document.getElementById('student-point-style')) return;
  const s = document.createElement('style');
  s.id = 'student-point-style';
  s.textContent = `
    .pt-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
    .pt-grid-3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}
    .pt-control{width:100%;padding:11px 13px;border:1.5px solid var(--border);border-radius:11px;background:#fff;font:inherit;color:var(--text);outline:none}
    .pt-control:focus{border-color:var(--primary);box-shadow:0 0 0 3px rgba(8,126,124,.10)}
    .pt-label{display:block;font-size:11px;font-weight:900;color:var(--muted);margin:0 0 6px;text-transform:uppercase;letter-spacing:.03em}
    .pt-stat-grid{display:grid;grid-template-columns:repeat(5,minmax(110px,1fr));gap:10px;margin:14px 0}
    .pt-stat{border:1px solid var(--border);background:#fff;border-radius:14px;padding:14px}
    .pt-stat strong{display:block;font-size:24px;color:var(--primary);line-height:1.1}
    .pt-stat span{font-size:11px;color:var(--muted);font-weight:800}
    .pt-pill{display:inline-flex;padding:5px 9px;border-radius:999px;font-size:10.5px;font-weight:900;align-items:center;gap:5px}
    .pt-pill.ringan{background:#eef8f2;color:#397752}.pt-pill.sedang{background:#fff6de;color:#9a6c00}.pt-pill.berat{background:#ffe9e4;color:#b54c37}
    .pt-pill.reward{background:#e9f7f6;color:var(--primary)}
    .pt-rule-box{padding:12px;border-radius:12px;background:#f7fbfb;border:1px solid var(--border);font-size:12px;line-height:1.55}
    .pt-table-wrap{overflow:auto;border:1px solid var(--border);border-radius:12px}
    .pt-table{width:100%;border-collapse:collapse;min-width:760px}
    .pt-table th,.pt-table td{padding:10px 11px;border-bottom:1px solid var(--border);text-align:left;font-size:12px;vertical-align:top}
    .pt-table th{background:#f5fafa;font-size:10.5px;text-transform:uppercase;color:var(--muted);letter-spacing:.03em}
    .pt-table tr:last-child td{border-bottom:0}
    .pt-action-row{display:flex;gap:9px;justify-content:flex-end;align-items:center;flex-wrap:wrap;margin-top:14px}
    .pt-danger{color:#b54c37;font-weight:800}.pt-muted{color:var(--muted)}
    .pt-alert{padding:12px 14px;border-radius:12px;background:#fff5f1;border:1px solid #f4c8bc;color:#a44935;font-size:12px;line-height:1.5}
    .pt-good{padding:12px 14px;border-radius:12px;background:#edf9f7;border:1px solid #c8e9e4;color:#176f69;font-size:12px;line-height:1.5}
    .pt-master-meta{font-size:11px;color:var(--muted);margin-top:5px}
    @media(max-width:900px){
      .pt-grid,.pt-grid-3{grid-template-columns:1fr}
      .pt-stat-grid{grid-template-columns:repeat(2,1fr)}
    }
  `;
  document.head.appendChild(s);
}

async function studentPointsRequest(action, payload={}, timeoutMs=30000){
  const token = getAuthToken();
  if(!token) throw new Error('Sesi login tidak ditemukan.');
  const c = new AbortController();
  const timer = setTimeout(()=>c.abort(), timeoutMs);
  try{
    const r = await fetch(STUDENT_POINTS_URL,{
      method:'POST',
      headers:{
        'Content-Type':'application/json',
        'apikey':SUPABASE_PUBLISHABLE_KEY,
        'Authorization':`Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
        'x-session-token':token
      },
      body:JSON.stringify({action,...payload}),
      signal:c.signal
    });
    const raw = await r.text();
    let data={};
    try{data=raw?JSON.parse(raw):{}}catch(_){throw new Error(`Respons server poin bukan JSON (HTTP ${r.status}).`)}
    if(!r.ok || data.success===false){
      const msgs={
        session_invalid:'Sesi login tidak valid. Silakan login kembali.',
        session_expired:'Sesi login berakhir. Silakan login kembali.',
        edit_window_closed:'Data sudah melewati batas edit 7 hari.',
        future_date_not_allowed:'Tanggal kejadian tidak boleh melebihi hari ini.',
        student_not_in_class:'Siswa tidak terdaftar pada kelas tersebut.',
        invalid_master:'Jenis pelanggaran/reward tidak valid.',
        do_violation:'Pelanggaran berkategori DO harus ditangani sesuai kebijakan sekolah.',
      };
      throw new Error(msgs[data.error] || data.message || data.error || `Gagal memproses data poin (HTTP ${r.status}).`);
    }
    return data;
  }catch(e){
    if(e?.name==='AbortError') throw new Error('Server poin terlalu lama merespons.');
    throw e;
  }finally{clearTimeout(timer)}
}

function pointToday(){
  return jakartaTodayISO ? jakartaTodayISO() : new Date().toISOString().slice(0,10);
}

async function loadPointBootstrap(){
  const res = await studentPointsRequest('bootstrap');
  POINT_STATUS.classes = res.classes || [];
  POINT_STATUS.violationMasters = res.violation_masters || [];
  POINT_STATUS.rewardMasters = res.reward_masters || [];
  return res;
}

function pointClassOptions(selected=''){
  return `<option value="">— Pilih kelas —</option>` + POINT_STATUS.classes.map(c =>
    `<option value="${escapeHtml(c.id)}" ${c.id===selected?'selected':''}>${escapeHtml(c.name)}</option>`
  ).join('');
}

function pointStudentOptions(students, selected=''){
  return `<option value="">— Pilih siswa —</option>` + students.map(s =>
    `<option value="${escapeHtml(s.id)}" ${s.id===selected?'selected':''}>${escapeHtml(s.name)}</option>`
  ).join('');
}

function violationMasterOptions(){
  const groups = ['Ringan','Sedang','Berat'];
  return `<option value="">— Pilih jenis pelanggaran —</option>` +
    groups.map(cat=>{
      const list=POINT_STATUS.violationMasters.filter(x=>x.category===cat);
      if(!list.length)return '';
      return `<optgroup label="${cat}">${list.map(x=>{
        const p=x.consequence_code==='DO'?'DO':`${x.points} poin`;
        return `<option value="${escapeHtml(x.id)}">${escapeHtml(x.violation_name)} — ${p}</option>`;
      }).join('')}</optgroup>`;
    }).join('');
}

function rewardMasterOptions(){
  const groups = ['Kebaikan Kecil','Kebaikan Sedang','Kebaikan Besar'];
  return `<option value="">— Pilih bentuk penghargaan —</option>` +
    groups.map(cat=>{
      const list=POINT_STATUS.rewardMasters.filter(x=>x.category===cat);
      if(!list.length)return '';
      return `<optgroup label="${cat}">${list.map(x=>
        `<option value="${escapeHtml(x.id)}">${escapeHtml(x.reward_name)} — ${x.points} poin reward</option>`
      ).join('')}</optgroup>`;
    }).join('');
}

function pointSummaryHtml(s){
  const next = s?.intervention?.next || null;
  const current = s?.intervention?.current || null;
  const hasDO = Boolean(s?.has_do_violation);
  return `
    ${hasDO?`<div class="pt-alert"><b>PERINGATAN:</b> terdapat pelanggaran berkategori <b>DO</b>. Konsekuensi tidak dapat dihapus oleh poin reward dan harus diproses sesuai kebijakan sekolah.</div>`:''}
    <div class="pt-stat-grid">
      <div class="pt-stat"><strong>${s?.violation_total||0}</strong><span>Total Poin Pelanggaran</span></div>
      <div class="pt-stat"><strong>${s?.eligible_violation_total||0}</strong><span>Ringan + Sedang</span></div>
      <div class="pt-stat"><strong>${s?.heavy_violation_total||0}</strong><span>Pelanggaran Berat</span></div>
      <div class="pt-stat"><strong>${s?.effective_reward_total||0}</strong><span>Reward Berlaku</span></div>
      <div class="pt-stat"><strong>${s?.balance||0}</strong><span>Saldo Poin</span></div>
    </div>
    <div class="${current?'pt-alert':'pt-good'}">
      ${current
        ? `<b>Status Pembinaan:</b> ${escapeHtml(current.stage)} — ${escapeHtml(current.action)}`
        : `<b>Status Pembinaan:</b> Belum mencapai ambang panggilan 50 poin.`
      }
      ${next?`<br><span class="pt-muted">Ambang berikutnya: ${next.points} poin — ${escapeHtml(next.stage)}.</span>`:''}
    </div>
  `;
}

async function pointLoadStudents(classId, kind){
  if(!classId) return;
  const res=await studentPointsRequest('students',{class_id:classId});
  if(kind==='violation'){
    POINT_STATUS.violationStudents=res.students||[];
    document.getElementById('kd-student').innerHTML=pointStudentOptions(POINT_STATUS.violationStudents);
    document.getElementById('kd-student-area').style.display='block';
  }else{
    POINT_STATUS.rewardStudents=res.students||[];
    document.getElementById('rw-student').innerHTML=pointStudentOptions(POINT_STATUS.rewardStudents);
    document.getElementById('rw-student-area').style.display='block';
  }
}

async function pointLoadProfile(studentId, kind){
  if(!studentId) return;
  const res=await studentPointsRequest('profile',{student_id:studentId});
  const target=document.getElementById(kind==='violation'?'kd-profile':'rw-profile');
  if(target) target.innerHTML=pointSummaryHtml(res.summary);
}

async function pointLoadHistory(studentId, kind){
  if(!studentId) return;
  const res=await studentPointsRequest('history',{student_id:studentId});
  const el=document.getElementById(kind==='violation'?'kd-history':'rw-history');
  if(!el)return;
  const rows = kind==='violation' ? (res.violations||[]) : (res.rewards||[]);
  if(!rows.length){
    el.innerHTML=`<div class="pt-muted" style="padding:18px;text-align:center">Belum ada riwayat.</div>`;
    return;
  }
  el.innerHTML=`
    <div class="pt-table-wrap"><table class="pt-table">
      <thead><tr>
        <th>Tanggal</th><th>${kind==='violation'?'Pelanggaran':'Penghargaan'}</th><th>Kategori</th><th>Poin</th><th>Catatan</th><th>Pencatat</th><th>Aksi</th>
      </tr></thead>
      <tbody>
      ${rows.map(r=>`
        <tr>
          <td>${escapeHtml(r.date)}</td>
          <td>${escapeHtml(r.name)}</td>
          <td><span class="pt-pill ${kind==='violation'?String(r.category).toLowerCase():'reward'}">${escapeHtml(r.category)}</span></td>
          <td><b>${r.consequence_code==='DO'?'DO':r.points}</b></td>
          <td>${escapeHtml(r.note||'-')}</td>
          <td>${escapeHtml(r.recorded_by||'-')}</td>
          <td>${r.editable?`<button class="btn btn-sm" onclick="deletePointRecord('${kind}','${r.id}','${studentId}')">Hapus</button>`:'<span class="pt-muted">Terkunci</span>'}</td>
        </tr>`).join('')}
      </tbody>
    </table></div>`;
}

async function deletePointRecord(kind,id,studentId){
  if(!confirm('Hapus data ini? Data tetap tersimpan sebagai audit (soft delete).')) return;
  try{
    await studentPointsRequest('delete_record',{record_type:kind,record_id:id});
    showToast('Data berhasil dihapus');
    await pointLoadProfile(studentId,kind);
    await pointLoadHistory(studentId,kind);
  }catch(e){showToast(e.message||'Gagal menghapus data',true)}
}

/* ======================== KEDISIPLINAN ======================== */
async function renderKedisiplinan(content){
  injectStudentPointStyles();
  content.innerHTML=`
    <div class="page-title">Kedisiplinan & Poin Pelanggaran</div>
    <div class="page-sub">Pencatatan sesuai BAB VIII Tata Tertib Siswa Cahaya Qur'an.</div>
    <div id="kd-loading" class="card"><span class="spinner"></span> Memuat master tata tertib...</div>
  `;
  try{
    await loadPointBootstrap();
    content.innerHTML=`
      <div class="page-title">Kedisiplinan & Poin Pelanggaran</div>
      <div class="page-sub">Poin otomatis mengikuti jenis pelanggaran resmi sekolah.</div>

      <div class="card">
        <div class="pt-grid">
          <div><label class="pt-label">Kelas</label><select id="kd-class" class="pt-control" onchange="POINT_STATUS.violationClassId=this.value;pointLoadStudents(this.value,'violation')">${pointClassOptions()}</select></div>
          <div id="kd-student-area" style="display:none"><label class="pt-label">Siswa</label><select id="kd-student" class="pt-control" onchange="POINT_STATUS.violationStudentId=this.value;pointLoadProfile(this.value,'violation');pointLoadHistory(this.value,'violation')"></select></div>
        </div>
      </div>

      <div id="kd-profile"></div>

      <div class="card">
        <div class="card-title">Catat Pelanggaran</div>
        <div class="pt-grid-3">
          <div><label class="pt-label">Tanggal Kejadian</label><input id="kd-date" type="date" max="${pointToday()}" value="${pointToday()}" class="pt-control"></div>
          <div style="grid-column:span 2"><label class="pt-label">Jenis Pelanggaran</label><select id="kd-master" class="pt-control" onchange="showViolationMasterInfo(this.value)">${violationMasterOptions()}</select></div>
        </div>
        <div id="kd-master-info" style="margin-top:12px"></div>
        <div style="margin-top:12px"><label class="pt-label">Catatan / Kronologi Singkat</label><textarea id="kd-note" class="pt-control" rows="3" placeholder="Tuliskan fakta kejadian secara singkat dan objektif."></textarea></div>
        <div class="pt-action-row"><button id="kd-save" class="btn" onclick="saveViolation()">Simpan Pelanggaran</button></div>
      </div>

      <div class="card">
        <div class="card-title">Riwayat Pelanggaran Siswa</div>
        <div id="kd-history"><div class="pt-muted">Pilih siswa untuk melihat riwayat.</div></div>
      </div>
    `;
  }catch(e){
    content.innerHTML += `<div class="card pt-alert">${escapeHtml(e.message||'Gagal memuat modul kedisiplinan.')}</div>`;
  }
}

function showViolationMasterInfo(id){
  const m=POINT_STATUS.violationMasters.find(x=>x.id===id);
  const el=document.getElementById('kd-master-info');
  if(!m){el.innerHTML='';return}
  const p=m.consequence_code==='DO'?'DO':`${m.points} poin`;
  el.innerHTML=`<div class="pt-rule-box"><span class="pt-pill ${String(m.category).toLowerCase()}">${escapeHtml(m.category)}</span> &nbsp;<b>${escapeHtml(p)}</b><div class="pt-master-meta">${escapeHtml(m.violation_name)}</div>${m.consequence_code==='DO'?'<div class="pt-alert" style="margin-top:8px">Pelanggaran ini berkategori DO. Reward tidak menghapus konsekuensinya.</div>':''}</div>`;
}

async function saveViolation(){
  const studentId=POINT_STATUS.violationStudentId;
  const masterId=document.getElementById('kd-master')?.value||'';
  const date=document.getElementById('kd-date')?.value||'';
  const note=(document.getElementById('kd-note')?.value||'').trim();
  if(!POINT_STATUS.violationClassId||!studentId||!masterId){showToast('Pilih kelas, siswa, dan jenis pelanggaran.',true);return}
  const btn=document.getElementById('kd-save');btn.disabled=true;const old=btn.innerHTML;btn.innerHTML='<span class="spinner"></span>Menyimpan...';
  try{
    const res=await studentPointsRequest('save_violation',{
      class_id:POINT_STATUS.violationClassId,student_id:studentId,master_id:masterId,date,note
    });
    showToast(res.message||'Pelanggaran berhasil disimpan');
    document.getElementById('kd-note').value='';
    document.getElementById('kd-master').value='';
    document.getElementById('kd-master-info').innerHTML='';
    await pointLoadProfile(studentId,'violation');
    await pointLoadHistory(studentId,'violation');
  }catch(e){showToast(e.message||'Gagal menyimpan pelanggaran',true)}
  finally{btn.disabled=false;btn.innerHTML=old}
}

/* =========================== REWARD =========================== */
async function renderReward(content){
  injectStudentPointStyles();
  content.innerHTML=`
    <div class="page-title">Reward Siswa</div>
    <div class="page-sub">Penghargaan sesuai BAB IX Tata Tertib Siswa Cahaya Qur'an.</div>
    <div class="card"><span class="spinner"></span> Memuat master reward...</div>
  `;
  try{
    if(!POINT_STATUS.classes.length) await loadPointBootstrap();
    content.innerHTML=`
      <div class="page-title">Reward Siswa</div>
      <div class="page-sub">Reward diverifikasi guru dan otomatis dihitung sesuai batas pengurangan poin sekolah.</div>

      <div class="card">
        <div class="pt-grid">
          <div><label class="pt-label">Kelas</label><select id="rw-class" class="pt-control" onchange="POINT_STATUS.rewardClassId=this.value;pointLoadStudents(this.value,'reward')">${pointClassOptions()}</select></div>
          <div id="rw-student-area" style="display:none"><label class="pt-label">Siswa</label><select id="rw-student" class="pt-control" onchange="POINT_STATUS.rewardStudentId=this.value;pointLoadProfile(this.value,'reward');pointLoadHistory(this.value,'reward')"></select></div>
        </div>
      </div>

      <div id="rw-profile"></div>

      <div class="card">
        <div class="pt-rule-box">
          <b>Aturan Reward:</b> maksimal pengurangan yang berlaku <b>20 poin per siswa per bulan</b>, tidak ditabung ke bulan berikutnya, saldo tidak boleh negatif, dan reward hanya mengurangi pelanggaran <b>Ringan & Sedang</b>. Pelanggaran Berat/DO tetap memiliki konsekuensi.
        </div>
      </div>

      <div class="card">
        <div class="card-title">Catat Penghargaan</div>
        <div class="pt-grid-3">
          <div><label class="pt-label">Tanggal</label><input id="rw-date" type="date" max="${pointToday()}" value="${pointToday()}" class="pt-control"></div>
          <div style="grid-column:span 2"><label class="pt-label">Bentuk Penghargaan</label><select id="rw-master" class="pt-control" onchange="showRewardMasterInfo(this.value)">${rewardMasterOptions()}</select></div>
        </div>
        <div id="rw-master-info" style="margin-top:12px"></div>
        <div style="margin-top:12px"><label class="pt-label">Catatan / Bukti Singkat</label><textarea id="rw-note" class="pt-control" rows="3" placeholder="Tuliskan keterangan singkat."></textarea></div>
        <div class="pt-action-row"><button id="rw-save" class="btn" onclick="saveRewardSupabase()">Simpan Reward</button></div>
      </div>

      <div class="card">
        <div class="card-title">Riwayat Reward Siswa</div>
        <div id="rw-history"><div class="pt-muted">Pilih siswa untuk melihat riwayat.</div></div>
      </div>
    `;
  }catch(e){
    content.innerHTML += `<div class="card pt-alert">${escapeHtml(e.message||'Gagal memuat modul reward.')}</div>`;
  }
}

function showRewardMasterInfo(id){
  const m=POINT_STATUS.rewardMasters.find(x=>x.id===id);
  const el=document.getElementById('rw-master-info');
  if(!m){el.innerHTML='';return}
  el.innerHTML=`<div class="pt-rule-box"><span class="pt-pill reward">${escapeHtml(m.category)}</span> &nbsp;<b>${m.points} poin reward</b><div class="pt-master-meta">${escapeHtml(m.reward_name)}</div></div>`;
}

async function saveRewardSupabase(){
  const studentId=POINT_STATUS.rewardStudentId;
  const masterId=document.getElementById('rw-master')?.value||'';
  const date=document.getElementById('rw-date')?.value||'';
  const note=(document.getElementById('rw-note')?.value||'').trim();
  if(!POINT_STATUS.rewardClassId||!studentId||!masterId){showToast('Pilih kelas, siswa, dan bentuk penghargaan.',true);return}
  const btn=document.getElementById('rw-save');btn.disabled=true;const old=btn.innerHTML;btn.innerHTML='<span class="spinner"></span>Menyimpan...';
  try{
    const res=await studentPointsRequest('save_reward',{
      class_id:POINT_STATUS.rewardClassId,student_id:studentId,master_id:masterId,date,note
    });
    showToast(res.message||'Reward berhasil disimpan');
    document.getElementById('rw-note').value='';
    document.getElementById('rw-master').value='';
    document.getElementById('rw-master-info').innerHTML='';
    await pointLoadProfile(studentId,'reward');
    await pointLoadHistory(studentId,'reward');
  }catch(e){showToast(e.message||'Gagal menyimpan reward',true)}
  finally{btn.disabled=false;btn.innerHTML=old}
}

/* ==========================================================
   MODUL: CETAK RAPOR (AKADEMIK) — FINAL
   - Range data custom: Absensi + Reward + Kedisiplinan
   - Tanggal cetak custom
   - Tanggal Hijriah opsional
   - Per siswa / seluruh kelas
   ========================================================== */

function rpTodayYmd(){
  const d = new Date();
  const pad = n => String(n).padStart(2,'0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}

function rpDefaultStartYmd(){
  const d = new Date();
  d.setDate(d.getDate() - 30);
  const pad = n => String(n).padStart(2,'0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}

let raporState = {
  kelas:null,
  semester:'1',
  jenisPeriode:'PTS',
  mode:'kelas',
  siswa:[],
  selectedNis:'',
  tanggalMulai:rpDefaultStartYmd(),
  tanggalSelesai:rpTodayYmd(),
  tanggalCetak:rpTodayYmd(),
  tanggalCetakHijri:''
};

function renderCetakRapor(content){
  const isWalas = currentUser.role === 'walas';

  raporState = {
    kelas:isWalas ? (currentUser.kelas||'') : null,
    semester:'1',
    jenisPeriode:'PTS',
    mode:'kelas',
    siswa:[],
    selectedNis:'',
    tanggalMulai:raporState.tanggalMulai || rpDefaultStartYmd(),
    tanggalSelesai:raporState.tanggalSelesai || rpTodayYmd(),
    tanggalCetak:raporState.tanggalCetak || rpTodayYmd(),
    tanggalCetakHijri:raporState.tanggalCetakHijri || ''
  };

  content.innerHTML = `
    <div class="page-title">Cetak Rapor</div>
    <div class="page-sub">Atur periode data, tanggal cetak, lalu download rapor per siswa atau seluruh kelas.</div>

    ${!isWalas ? `
    <div class="card">
      <div class="card-title">Pilih Kelas</div>
      <input type="text" id="rp-kelas-input" placeholder="Ketik nama kelas persis, contoh: 3A Banat"
        style="width:100%;padding:11px 14px;border:2px solid var(--border);border-radius:10px;font-family:inherit;font-size:14px;">
    </div>` : ''}

    <div class="card">
      <div class="card-title">Periode Rapor</div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        <select id="rp-semester" class="pekan-select" onchange="raporState.semester=this.value">
          <option value="1" ${raporState.semester==='1'?'selected':''}>Semester 1</option>
          <option value="2" ${raporState.semester==='2'?'selected':''}>Semester 2</option>
        </select>
        <select id="rp-jenis" class="pekan-select" onchange="raporState.jenisPeriode=this.value">
          <option value="PTS" ${raporState.jenisPeriode==='PTS'?'selected':''}>Tengah Semester (PTS)</option>
          <option value="PAS" ${raporState.jenisPeriode==='PAS'?'selected':''}>Akhir Semester (PAS)</option>
        </select>
      </div>
    </div>

    <div class="card">
      <div class="card-title">Rentang Data Rapor</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px;">
        <div>
          <label style="display:block;font-size:12px;font-weight:700;margin-bottom:5px;">Tanggal Mulai</label>
          <input type="date" id="rp-tanggal-mulai" class="pekan-select" style="width:100%" value="${escapeHtml(raporState.tanggalMulai)}">
        </div>
        <div>
          <label style="display:block;font-size:12px;font-weight:700;margin-bottom:5px;">Tanggal Selesai</label>
          <input type="date" id="rp-tanggal-selesai" class="pekan-select" style="width:100%" value="${escapeHtml(raporState.tanggalSelesai)}">
        </div>
        <div>
          <label style="display:block;font-size:12px;font-weight:700;margin-bottom:5px;">Tanggal Cetak Rapor</label>
          <input type="date" id="rp-tanggal-cetak" class="pekan-select" style="width:100%" value="${escapeHtml(raporState.tanggalCetak)}">
        </div>
        <div>
          <label style="display:block;font-size:12px;font-weight:700;margin-bottom:5px;">Tanggal Hijriah <span style="font-weight:400;color:var(--muted)">(opsional)</span></label>
          <input type="text" id="rp-tanggal-hijri" placeholder="Contoh: 12 Rabiul Awal 1448 AH"
            style="width:100%;padding:10px 12px;border:2px solid var(--border);border-radius:10px;font-family:inherit;"
            value="${escapeHtml(raporState.tanggalCetakHijri)}">
        </div>
      </div>
      <div style="font-size:12px;color:var(--muted);margin-top:9px;">
        Rentang tanggal digunakan untuk Absensi, Reward, dan Kedisiplinan. Nilai akademik dan Tahfizh mengikuti data PTS/PAS yang tersimpan.
      </div>
    </div>

    <div class="card">
      <div class="card-title">Pilih Jenis Download</div>
      <div class="kd-mode-toggle" style="margin-bottom:0">
        <button type="button" id="rp-mode-kelas" class="kd-mode-btn active" onclick="setRaporMode('kelas')">
          Seluruh Kelas<br><span style="font-size:11px;font-weight:400">Download semua siswa dalam ZIP</span>
        </button>
        <button type="button" id="rp-mode-siswa" class="kd-mode-btn" onclick="setRaporMode('siswa')">
          Per Siswa<br><span style="font-size:11px;font-weight:400">Pilih satu siswa lalu download PDF</span>
        </button>
      </div>
    </div>

    <div class="card" id="rp-siswa-card" style="display:none">
      <div class="card-title">Pilih Siswa</div>
      <select id="rp-siswa-select" class="pekan-select" style="width:100%;max-width:620px">
        <option value="">— pilih siswa —</option>
      </select>
    </div>

    <div class="card">
      <button class="btn" id="rp-mulai-btn" onclick="mulaiCetakRapor()">Download Semua Rapor (ZIP)</button>
      <div id="rp-status-area" style="margin-top:16px;"></div>
    </div>
  `;

  if(!isWalas){
    const kelasInput = document.getElementById('rp-kelas-input');
    kelasInput?.addEventListener('change', async e => {
      raporState.kelas = e.target.value.trim();
      await checkRaporReadiness();
      if(raporState.mode === 'siswa') await loadRaporSiswa();
    });
  }

  checkRaporReadiness();
}

function periodeKodeRapor(){
  const semester = document.getElementById('rp-semester')?.value || raporState.semester || '1';
  const jenis = document.getElementById('rp-jenis')?.value || raporState.jenisPeriode || 'PTS';
  return 'S' + semester + '_' + jenis;
}

function syncRaporDateState(){
  raporState.tanggalMulai = document.getElementById('rp-tanggal-mulai')?.value || '';
  raporState.tanggalSelesai = document.getElementById('rp-tanggal-selesai')?.value || '';
  raporState.tanggalCetak = document.getElementById('rp-tanggal-cetak')?.value || '';
  raporState.tanggalCetakHijri = document.getElementById('rp-tanggal-hijri')?.value.trim() || '';
}

function validateRaporDates(){
  syncRaporDateState();
  if(!raporState.tanggalMulai || !raporState.tanggalSelesai){
    showToast('Tanggal mulai dan tanggal selesai wajib dipilih.', true);
    return false;
  }
  if(raporState.tanggalMulai > raporState.tanggalSelesai){
    showToast('Tanggal mulai tidak boleh setelah tanggal selesai.', true);
    return false;
  }
  if(!raporState.tanggalCetak){
    showToast('Tanggal cetak rapor wajib dipilih.', true);
    return false;
  }
  return true;
}

async function setRaporMode(mode){
  raporState.mode = mode;
  document.getElementById('rp-mode-kelas')?.classList.toggle('active', mode === 'kelas');
  document.getElementById('rp-mode-siswa')?.classList.toggle('active', mode === 'siswa');

  const card = document.getElementById('rp-siswa-card');
  if(card) card.style.display = mode === 'siswa' ? 'block' : 'none';

  const btn = document.getElementById('rp-mulai-btn');
  if(btn) btn.textContent = mode === 'siswa' ? 'Download Rapor Siswa (PDF)' : 'Download Semua Rapor (ZIP)';

  if(mode === 'siswa') await loadRaporSiswa();
}

async function loadRaporSiswa(){
  const select = document.getElementById('rp-siswa-select');
  if(!select) return;

  if(!raporState.kelas){
    select.innerHTML = '<option value="">Pilih kelas terlebih dahulu</option>';
    return;
  }

  select.disabled = true;
  select.innerHTML = '<option value="">Memuat siswa...</option>';

  try{
    // Sumber ini ringan dan sama dengan daftar siswa aplikasi.
    const res = await callApi('getRaporPTSStudents', { kelas:raporState.kelas });
    if(!res.success) throw new Error(res.error || 'Gagal memuat siswa.');

    raporState.siswa = (res.data || []).slice().sort((a,b) =>
      String(a.nama||'').localeCompare(String(b.nama||''),'id')
    );

    select.innerHTML = '<option value="">— pilih siswa —</option>' +
      raporState.siswa.map(s =>
        `<option value="${escapeHtml(String(s.nis))}">${escapeHtml(s.nama)} — ${escapeHtml(String(s.nis))}</option>`
      ).join('');
  }catch(err){
    select.innerHTML = '<option value="">Data siswa belum tersedia</option>';
    showToast(err.message || 'Gagal memuat siswa.', true);
  }finally{
    select.disabled = false;
  }
}

async function checkRaporReadiness(){
  const area = document.getElementById('rp-status-area');
  if(!area || !raporState.kelas) return;

  try{
    const res = await callApi('getRaporPTSReadiness',{kelas:raporState.kelas});
    if(res.success && !res.ready){
      area.innerHTML = `
        <div style="background:#FFF8E5;border:1px solid #E8D69B;border-radius:10px;padding:13px 15px;font-size:12.5px;color:#7F681A;">
          Template Rapor belum siap. Silakan hubungi admin.
        </div>`;
    }else{
      area.innerHTML = '';
    }
  }catch(e){
    // readiness non-kritis, tombol download tetap dapat dicoba
  }
}

async function mulaiCetakRapor(){
  const btn = document.getElementById('rp-mulai-btn');
  const statusArea = document.getElementById('rp-status-area');

  if(!raporState.kelas){
    showToast('Pilih kelas terlebih dahulu.', true);
    return;
  }
  if(!validateRaporDates()) return;

  let nis = '';
  if(raporState.mode === 'siswa'){
    nis = document.getElementById('rp-siswa-select')?.value || '';
    if(!nis){
      showToast('Pilih siswa terlebih dahulu.', true);
      return;
    }
  }

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>Membuat rapor...';

  const loadingText = raporState.mode === 'siswa'
    ? 'Menyiapkan PDF siswa. Mohon tunggu...'
    : 'Membuat seluruh PDF dan ZIP. Proses kelas memang lebih lama, jangan tutup halaman ini.';

  statusArea.innerHTML = `
    <div style="font-size:13px;color:var(--muted)">
      <span class="spinner" style="border-top-color:var(--primary);border-color:rgba(10,110,110,0.25)"></span>
      ${loadingText}
    </div>`;

  try{
    const readiness = await callApi('getRaporPTSReadiness',{kelas:raporState.kelas});
    if(!readiness.success || !readiness.ready){
      statusArea.innerHTML = `<div class="ms-alert">Template Rapor belum siap. Silakan hubungi admin.</div>`;
      return;
    }

    const action = raporState.mode === 'siswa'
      ? 'generateRaporPTSSiswa'
      : 'generateRaporPTSKelasZip';

    const params = {
      kelas: raporState.kelas,
      periode: periodeKodeRapor(),

      // Range yang dibaca backend untuk absensi/reward/kedisiplinan
      tanggalMulai: raporState.tanggalMulai,
      tanggalSelesai: raporState.tanggalSelesai,

      // Tanggal yang dicetak pada halaman 2
      tanggalCetak: raporState.tanggalCetak,
      tanggalCetakHijri: raporState.tanggalCetakHijri,

      requestedBy: currentUser.nama,
      requestedByUsername: currentUser.username
    };

    if(raporState.mode === 'siswa') params.nis = nis;

    const res = await callApi(action, params);
    if(!res.success){
      const msg = res.error || 'Terjadi kendala saat membuat rapor.';
      statusArea.innerHTML = `<div class="ms-alert"><strong>Gagal membuat rapor.</strong><br>${escapeHtml(msg)}</div>`;
      return;
    }

    const label = raporState.mode === 'siswa'
      ? `Rapor berhasil dibuat: ${escapeHtml(res.fileName || '')}`
      : `${Number(res.count || 0)} rapor siswa berhasil dibuat dalam ZIP.`;

    statusArea.innerHTML = `
      <div style="background:#EAF5F0;border:1px solid #C8E6D6;border-radius:10px;padding:14px 16px;font-size:13px;color:var(--success);">
        ${label}<br>
        <span style="font-size:12px;color:var(--muted)">
          Data: ${escapeHtml(raporState.tanggalMulai)} s.d. ${escapeHtml(raporState.tanggalSelesai)}
          · Tanggal cetak: ${escapeHtml(raporState.tanggalCetak)}
        </span>
      </div>
      <a href="${escapeHtml(res.downloadUrl)}" target="_blank" rel="noopener" class="btn"
         style="display:inline-block;text-decoration:none;text-align:center;margin-top:12px;width:auto;padding:12px 24px;">
         ${raporState.mode === 'siswa' ? 'Download PDF' : 'Download ZIP'}
      </a>`;
  }catch(err){
    statusArea.innerHTML = `
      <div class="ms-alert"><strong>Gagal.</strong><br>
      ${escapeHtml(err.message || String(err))}
      </div>`;
  }finally{
    btn.disabled = false;
    btn.textContent = raporState.mode === 'siswa'
      ? 'Download Rapor Siswa (PDF)'
      : 'Download Semua Rapor (ZIP)';
  }
}

/* ==========================================================
   MODUL: LAPORAN GURU BULANAN
   ========================================================== */
function _lgDefaultTanggalMulai(){
  const d = new Date(); d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0,10);
}
function _lgDefaultTanggalSelesai(){
  return new Date().toISOString().slice(0,10);
}

let laporanGuruState = { kelas:null, tanggalMulai:_lgDefaultTanggalMulai(), tanggalSelesai:_lgDefaultTanggalSelesai() };

function renderLaporanGuru(content){
  const isWalas = currentUser.role === 'walas';
  content.innerHTML = `
    <div class="page-title">Laporan Guru Bulanan</div>
    <div class="page-sub">Buat laporan kelas (format Excel) dari data yang sudah diinput di sistem, untuk rentang tanggal yang dipilih.</div>
    ${!isWalas ? `<div class="card"><div class="card-title">Pilih Kelas</div><input type="text" id="lg-kelas-input" placeholder="Ketik nama kelas persis" style="width:100%;padding:11px 14px;border:2px solid var(--border);border-radius:10px;font-family:inherit;font-size:14px;"></div>` : ''}
    <div class="card">
      <div class="card-title">Pilih Rentang Tanggal</div>
      <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
        <input type="date" id="lg-tanggal-mulai" class="pekan-select" value="${laporanGuruState.tanggalMulai}">
        <span style="color:var(--muted);font-size:13px;">s.d.</span>
        <input type="date" id="lg-tanggal-selesai" class="pekan-select" value="${laporanGuruState.tanggalSelesai}">
      </div>
      <div style="font-size:12px;color:var(--muted);margin-top:8px;">Contoh: 24 Juli s.d. 25 Agustus.</div>
    </div>
    <div class="card">
      <button class="btn" id="lg-mulai-btn" onclick="mulaiLaporanGuru()">Buat &amp; Unduh Laporan (Excel)</button>
      <div id="lg-status-area" style="margin-top:16px;"></div>
    </div>
  `;

  if(isWalas){ laporanGuruState.kelas = currentUser.kelas; }
  else { document.getElementById('lg-kelas-input').addEventListener('change', e => { laporanGuruState.kelas = e.target.value.trim(); }); }
}

function _lgUnduhBase64Xlsx(filename, base64, mimeType){
  const byteChars = atob(base64);
  const byteNumbers = new Array(byteChars.length);
  for(let i=0;i<byteChars.length;i++) byteNumbers[i] = byteChars.charCodeAt(i);
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: mimeType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename || 'Laporan Guru.xlsx';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

async function mulaiLaporanGuru(){
  const btn = document.getElementById('lg-mulai-btn');
  const statusArea = document.getElementById('lg-status-area');
  if(!laporanGuruState.kelas){ showToast('Pilih kelas terlebih dahulu', true); return; }

  laporanGuruState.tanggalMulai = document.getElementById('lg-tanggal-mulai').value;
  laporanGuruState.tanggalSelesai = document.getElementById('lg-tanggal-selesai').value;
  if(!laporanGuruState.tanggalMulai || !laporanGuruState.tanggalSelesai){ showToast('Pilih tanggal mulai dan selesai', true); return; }
  if(laporanGuruState.tanggalMulai > laporanGuruState.tanggalSelesai){ showToast('Tanggal mulai harus sebelum tanggal selesai', true); return; }

  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>Sedang diproses...';
  statusArea.innerHTML = `<div style="font-size:13px;color:var(--muted)"><span class="spinner" style="border-top-color:var(--primary);border-color:rgba(10,110,110,0.25)"></span>Sedang membuat laporan, mohon tunggu...</div>`;
  try{
    const res = await callApi('requestLaporanGuruBulanan', {
      kelas: laporanGuruState.kelas,
      tanggalMulai: laporanGuruState.tanggalMulai,
      tanggalSelesai: laporanGuruState.tanggalSelesai,
      requestedBy: currentUser.nama, requestedByUsername: currentUser.username
    });
    if(!res.success){ statusArea.innerHTML = `<div class="ms-alert"><strong>Gagal.</strong><br>${escapeHtml(res.error || 'Gagal membuat laporan.')}</div>`; return; }

    _lgUnduhBase64Xlsx(res.filename, res.base64, res.mimeType);
    statusArea.innerHTML = `<div style="background:#EAF5F0;border:1px solid #C8E6D6;border-radius:10px;padding:14px 16px;font-size:13px;color:var(--success);">Laporan berhasil dibuat dan sedang diunduh: ${escapeHtml(res.filename||'')}</div>`;
  } catch(err){
    statusArea.innerHTML = `<div class="ms-alert"><strong>Gagal.</strong><br>${escapeHtml(err.message || String(err))}</div>`;
  } finally {
    btn.disabled = false; btn.textContent = 'Buat & Unduh Laporan (Excel)';
  }
}

/* ==========================================================
   MODUL: MOOD CHECK-IN (V2 — tanpa emoji, pakai ikon SVG)
   ========================================================== */
const MOOD_OPTIONS = [
  { value:'Semangat', label:'Semangat', icon:'<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>' },
  { value:'Biasa',    label:'Biasa Saja', icon:'<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>' },
  { value:'Capek',    label:'Capek', icon:'<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12l7 7 7-7"/></svg>' },
  { value:'Sedih',    label:'Kurang Baik', icon:'<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8 15s1.5-2 4-2 4 2 4 2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>' }
];

let moodModalShownThisSession = false;

async function checkAndShowMoodModal(){
  return;
}

function openMoodModal(){
  const grid = document.getElementById('mood-grid');
  grid.innerHTML = '';
  MOOD_OPTIONS.forEach(m => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'mood-option';
    btn.innerHTML = `<span class="mood-emoji">${m.icon}</span><span>${m.label}</span>`;
    btn.onclick = () => submitMoodPilih(m.value);
    grid.appendChild(btn);
  });
  document.getElementById('mood-modal').classList.add('open');
}

function closeMoodModal(){
  document.getElementById('mood-modal').classList.remove('open');
}

async function submitMoodPilih(mood){
  closeMoodModal();
  try{
    await callApi('submitMood', {
      username: currentUser.username, nama: currentUser.nama,
      kelas: currentUser.kelas || '', mood
    });
    showToast('Makasih sudah berbagi, semoga harinya makin baik!');
  } catch(err){ /* diamkan */ }
}

/* ==========================================================
   MODUL: DASHBOARD WALAS V3 — 1 REQUEST, RINGAN, RESPONSIF
   ========================================================== */
let dashboardLoadToken = 0;
let wdLastData = null;

function renderDashboard(content){
  const requestToken = ++dashboardLoadToken;
  const nama = escapeHtml(currentUser?.nama || currentUser?.username || 'Pengguna');
  content.innerHTML = `
    <div id="wd-root" class="wd-shell">
      <div class="wd-hero">
        <div class="wd-hero-top">
          <div>
            <div class="wd-eyebrow">CQlass 2 · Supabase</div>
            <div class="wd-title">Assalamu'alaikum, ${nama} 👋</div>
            <div class="wd-sub">Ringkasan data master sekolah yang sudah tersimpan di database.</div>
          </div>
          <div class="wd-date-pill" id="wd-date">Memuat...</div>
        </div>
      </div>
      <div id="master-dashboard-body">
        <div class="wd-skeleton"></div>
      </div>
    </div>`;
  loadSupabaseMasterDashboard(requestToken);
}

async function callDashboardMaster(){
  const token = getAuthToken();
  if(!token) return { success:false, error:'session_invalid' };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);
  try{
    const response = await fetch(DASHBOARD_MASTER_URL, {
      method:'POST',
      headers:{
        'Content-Type':'application/json',
        'apikey': SUPABASE_PUBLISHABLE_KEY,
        'Authorization': `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
        'x-session-token': token
      },
      body: JSON.stringify({ action:'summary' }),
      signal: controller.signal
    });
    const raw = await response.text();
    let data = {};
    try{ data = raw ? JSON.parse(raw) : {}; }
    catch(_){ return { success:false, error:`invalid_json_http_${response.status}` }; }
    if(!response.ok && data.success !== false){
      data.success = false;
      data.error = data.error || `http_${response.status}`;
    }
    return data;
  }catch(err){
    if(err?.name === 'AbortError') return {success:false,error:'timeout'};
    return {success:false,error:err?.message || 'network_error'};
  }finally{
    clearTimeout(timeoutId);
  }
}

async function loadSupabaseMasterDashboard(requestToken){
  const body = document.getElementById('master-dashboard-body');
  if(!body) return;

  const res = await callDashboardMaster();
  if(requestToken !== dashboardLoadToken || activeModule !== 'dashboard') return;

  if(!res.success){
    if(['session_invalid','session_expired','unauthorized'].includes(String(res.error||''))){
      clearAuthSession();
      currentUser = null;
      showLoginScreen();
      return;
    }
    body.innerHTML = `
      <div class="wd-card">
        <div class="empty-state">
          <div class="icon">—</div>
          Dashboard Supabase belum dapat dimuat.<br>
          <span style="font-size:11px">${escapeHtml(authErrorMessage(res.error) || res.error || 'unknown_error')}</span>
        </div>
      </div>`;
    return;
  }

  renderSupabaseMasterDashboard(res);
}

function renderSupabaseMasterDashboard(res){
  const body = document.getElementById('master-dashboard-body');
  if(!body) return;

  const c = res.counts || {};
  const dateLabel = res.generated_at
    ? new Intl.DateTimeFormat('id-ID',{day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit',timeZone:'Asia/Jakarta'}).format(new Date(res.generated_at))
    : 'Data terbaru';
  const dateEl = document.getElementById('wd-date');
  if(dateEl) dateEl.textContent = dateLabel;

  const cards = [
    ['Siswa', c.students, 'users', 'Data siswa aktif/master'],
    ['Guru', c.teachers, 'users', 'Master guru'],
    ['Kelas', c.classes, 'check', 'Rombel SD'],
    ['Mata Pelajaran', c.subjects, 'star', 'Master mapel'],
    ['LP / TP', c.learning_objectives, 'check', 'Tujuan pembelajaran'],
    ['Penugasan Guru', c.teacher_assignments, 'users', 'Penugasan mapel/kelas'],
    ['Ekskul', c.extracurriculars, 'star', 'Master kegiatan ekskul'],
    ['Peserta Ekskul', c.extracurricular_members, 'users', 'Keanggotaan ekskul'],
    ['Penugasan Rapor', c.report_class_assignments, 'check', 'Walas/partner/tahfizh'],
    ['Akun Login', c.user_accounts, 'users', 'Akun guru CQlass'],
  ];

  const tahfizh = Number(c.tahfizh_teacher_assignments || 0);
  const config = Number(c.report_config || 0);

  body.innerHTML = `
    <div class="wd-kpis" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr));">
      ${cards.map(([label,val,icon,note])=>`
        <div class="wd-kpi">
          <div class="wd-kpi-icon">${wdIcon(icon)}</div>
          <div class="wd-kpi-value">${Number(val || 0).toLocaleString('id-ID')}</div>
          <div class="wd-kpi-label">${escapeHtml(label)}</div>
          <div class="wd-kpi-note">${escapeHtml(note)}</div>
        </div>`).join('')}
    </div>

    <div class="wd-grid-2">
      <div class="wd-card">
        <div class="wd-card-head">
          <div>
            <div class="wd-card-title">Status Sinkronisasi Master</div>
            <div class="wd-card-sub">Ringkasan tabel utama yang dibaca langsung dari Supabase.</div>
          </div>
          <span class="wd-chip">LIVE</span>
        </div>
        <div class="wd-status-line"><span>Siswa</span><b>${Number(c.students||0).toLocaleString('id-ID')}</b></div>
        <div class="wd-status-line"><span>Guru</span><b>${Number(c.teachers||0).toLocaleString('id-ID')}</b></div>
        <div class="wd-status-line"><span>Kelas</span><b>${Number(c.classes||0).toLocaleString('id-ID')}</b></div>
        <div class="wd-status-line"><span>Mapel</span><b>${Number(c.subjects||0).toLocaleString('id-ID')}</b></div>
        <div class="wd-status-line"><span>LP/TP</span><b>${Number(c.learning_objectives||0).toLocaleString('id-ID')}</b></div>
        <div class="wd-status-line"><span>Konfigurasi Rapor</span><b>${config.toLocaleString('id-ID')}</b></div>
      </div>

      <div class="wd-card">
        <div class="wd-card-head">
          <div>
            <div class="wd-card-title">Pemeriksaan Tahfizh</div>
            <div class="wd-card-sub">Jumlah assignment ditampilkan, tetapi integritas datanya tetap perlu diverifikasi.</div>
          </div>
          <span class="wd-chip">CHECK</span>
        </div>
        <div style="display:flex;align-items:flex-end;gap:12px;margin:14px 0 8px;">
          <div style="font-size:40px;font-weight:800;line-height:1;">${tahfizh.toLocaleString('id-ID')}</div>
          <div style="font-size:12px;color:var(--text-muted);padding-bottom:4px;">assignment guru Tahfizh</div>
        </div>
        <div class="wd-status-line"><span>Status</span><span class="wd-status-pill no">PERLU VERIFIKASI</span></div>
        <div style="font-size:12px;line-height:1.6;color:var(--text-muted);margin-top:10px;">Angka ini tidak otomatis dianggap salah. Kita akan cek duplikasi <code>source_ref</code> dan kesesuaian dengan sheet Tahfizh pada tahap berikutnya.</div>
      </div>
    </div>

    <div class="wd-card">
      <div class="wd-card-head">
        <div>
          <div class="wd-card-title">Database CQlass Siap</div>
          <div class="wd-card-sub">Dashboard ini hanya membaca data master. Data transaksi seperti absensi, reward, kedisiplinan, nilai, dan PjBL akan kita hubungkan berikutnya.</div>
        </div>
      </div>
    </div>`;
}

async function loadDashboardWalasFast(requestToken){
  const root = document.getElementById('wd-root');
  if(!root) return;
  try{
    const res = await callApi('getDashboardWalas', {
      username: currentUser.username, kelas: currentUser.kelas || '', role: currentUser.role
    });
    if(requestToken !== dashboardLoadToken || activeModule !== 'dashboard' || !document.getElementById('wd-root')) return;
    if(!res.success) throw new Error(res.error || 'dashboard_gagal');
    wdLastData = res;
    renderDashboardWalasData(res);
  }catch(err){
    root.innerHTML += `<div class="card"><div class="empty-state"><div class="icon">—</div>Dashboard belum dapat dimuat.<br><span style="font-size:11px">${escapeHtml(err.message || '')}</span></div></div>`;
    root.querySelector('.wd-skeleton')?.remove();
  }
}

function renderDashboardWalasData(d){
  const root = document.getElementById('wd-root');
  if(!root) return;
  const k = d.kehadiran || {};
  const wajib = d.wajibLapor || {};
  const esc = d.eskalasi || {count:0,data:[]};
  const rank = d.reward || {kelas:[],sekolah:[]};
  const kelasTertib = d.kelasTertib || [];
  const tanggalText = d.meta?.tanggalLabel || d.meta?.tanggal || '';
  const scope = d.meta?.scopeLabel || (currentUser.kelas || 'Sekolah');

  root.innerHTML = `
    <div class="wd-hero">
      <div class="wd-hero-top">
        <div>
          <div class="wd-eyebrow">${currentUser.role === 'walas' ? 'Dashboard Wali Kelas' : 'Dashboard Sekolah'}</div>
          <div class="wd-title">${escapeHtml(scope)}</div>
          <div class="wd-sub">Ringkasan penting yang perlu dilihat hari ini — cepat, fokus, dan siap ditindaklanjuti.</div>
        </div>
        <div class="wd-date-pill">${escapeHtml(tanggalText)}</div>
      </div>
    </div>

    <div class="wd-kpis">
      <div class="wd-kpi success">
        <div class="wd-kpi-icon">${wdIcon('users')}</div>
        <div class="wd-kpi-value">${Number(k.persentaseHadir || 0).toFixed(1).replace('.0','')}%</div>
        <div class="wd-kpi-label">Kehadiran bulan ini</div>
        <div class="wd-kpi-note">${k.hadir || 0} hadir dari ${k.total || 0} catatan</div>
      </div>
      <div class="wd-kpi ${wajib.sudahHariIni ? 'success' : 'danger'}">
        <div class="wd-kpi-icon">${wdIcon('check')}</div>
        <div class="wd-kpi-value">${wajib.sudahHariIni ? 'Sudah' : 'Belum'}</div>
        <div class="wd-kpi-label">Wajib lapor hari ini</div>
        <div class="wd-kpi-note">Kepatuhan bulan ini ${wajib.persentase || 0}%</div>
      </div>
      <div class="wd-kpi">
        <div class="wd-kpi-icon">${wdIcon('star')}</div>
        <div class="wd-kpi-value">${rank.kelas?.[0]?.totalPoin || 0}</div>
        <div class="wd-kpi-label">Poin reward tertinggi kelas</div>
        <div class="wd-kpi-note">${escapeHtml(rank.kelas?.[0]?.nama || 'Belum ada reward')}</div>
      </div>
      <div class="wd-kpi danger clickable" onclick="toggleWDEskalasi()" role="button" tabindex="0">
        <div class="wd-kpi-icon">${wdIcon('alert')}</div>
        <div class="wd-kpi-value">${esc.count || 0}</div>
        <div class="wd-kpi-label">Eskalasi ke Kesiswaan</div>
        <div class="wd-kpi-note">Klik untuk melihat siswa ›</div>
      </div>
    </div>

    <div class="wd-grid-2">
      <div class="wd-card">
        <div class="wd-card-head"><div><div class="wd-card-title">Kehadiran Siswa</div><div class="wd-card-sub">Persentase hadir per hari, 14 hari sekolah terakhir.</div></div><span class="wd-chip">${escapeHtml(scope)}</span></div>
        <div id="wd-attendance-chart">${renderWDAttendanceChart(k.trend || [])}</div>
        <div class="wd-attendance-legend"><span><b>${k.hadir||0}</b> Hadir</span><span><b>${k.sakit||0}</b> Sakit</span><span><b>${k.izin||0}</b> Izin</span><span><b>${k.alfa||0}</b> Alfa</span></div>
      </div>
      <div class="wd-card">
        <div class="wd-card-head"><div><div class="wd-card-title">Kepatuhan Wajib Lapor</div><div class="wd-card-sub">Hari kerja yang sudah dicek melalui modul Kedisiplinan.</div></div></div>
        <div class="wd-report-ring" style="--pct:${Math.max(0,Math.min(100,wajib.persentase||0))}"><strong>${wajib.persentase||0}%</strong></div>
        <div class="wd-status-line"><span>Hari kerja berjalan</span><b>${wajib.hariWajib || 0} hari</b></div>
        <div class="wd-status-line"><span>Laporan tercatat</span><b>${wajib.hariLapor || 0} hari</b></div>
        <div class="wd-status-line"><span>Status hari ini</span><span class="wd-status-pill ${wajib.sudahHariIni?'ok':'no'}">${wajib.sudahHariIni?'TERLAPOR':'BELUM'}</span></div>
      </div>
    </div>

    <div class="wd-leader-grid">
      <div class="wd-card">
        <div class="wd-card-head"><div><div class="wd-card-title">Leaderboard Reward</div><div class="wd-card-sub">10 siswa dengan poin positif tertinggi.</div></div>
          <div class="wd-tabs"><button class="wd-tab active" id="wd-tab-kelas" onclick="switchWDLeaderboard('kelas')">Kelas Saya</button><button class="wd-tab" id="wd-tab-sekolah" onclick="switchWDLeaderboard('sekolah')">Sekolah</button></div>
        </div>
        <div id="wd-leader-list">${renderWDRankList(rank.kelas || [], false)}</div>
      </div>
      <div class="wd-card">
        <div class="wd-card-head"><div><div class="wd-card-title">Kelas Paling Tertib</div><div class="wd-card-sub">Berdasarkan kelengkapan wajib lapor — data kosong tidak dianggap tertib.</div></div><span class="wd-chip">Bulan ini</span></div>
        <div>${renderWDDisciplineRanking(kelasTertib)}</div>
      </div>
    </div>

    <div class="wd-card" id="wd-escalation-box">
      <div class="wd-card-head">
        <div><div class="wd-card-title">Eskalasi ke Kesiswaan</div><div class="wd-card-sub">Hanya siswa yang sudah mencapai ambang eskalasi ${esc.ambang || 50} poin.</div></div>
        <button class="btn btn-sm btn-primary-light" onclick="toggleWDEskalasi()">${esc.count || 0} siswa · Lihat detail</button>
      </div>
      <div class="wd-esc-drawer" id="wd-esc-drawer">${renderWDEskalasiCards(esc.data || [])}</div>
    </div>
  `;
}

function wdIcon(name){
  const p={
    users:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    check:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12a9 9 0 1 1-5.3-8.2"/></svg>',
    star:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.1 8.3 22 9.3 17 14.1 18.2 21 12 17.8 5.8 21 7 14.1 2 9.3 8.9 8.3 12 2"/></svg>',
    alert:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.3 2.9 1.8 17a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 2.9a2 2 0 0 0-3.4 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>'
  }; return p[name]||'';
}

function renderWDAttendanceChart(list){
  if(!list?.length) return '<div class="wd-empty">Belum ada data kehadiran untuk periode ini.</div>';
  const W=760,H=240,padL=44,padR=18,padT=22,padB=38;
  const innerW=W-padL-padR, innerH=H-padT-padB;
  const vals=list.map(x=>Math.max(0,Math.min(100,Number(x.persentaseHadir)||0)));
  const minRaw=Math.min(...vals), maxRaw=Math.max(...vals);
  const yMin=Math.max(0,Math.floor((minRaw-5)/5)*5), yMax=Math.min(100,Math.max(yMin+10,Math.ceil((maxRaw+3)/5)*5));
  const x=i=>padL+(list.length===1?innerW/2:(i/(list.length-1))*innerW);
  const y=v=>padT+innerH-((v-yMin)/(yMax-yMin))*innerH;
  const pts=list.map((d,i)=>`${x(i).toFixed(1)},${y(vals[i]).toFixed(1)}`).join(' ');
  const area=`${padL},${padT+innerH} ${pts} ${padL+innerW},${padT+innerH}`;
  const ticks=[]; for(let i=0;i<=4;i++) ticks.push(yMin+(yMax-yMin)*i/4);
  return `<div class="wd-line-chart">
    <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Grafik tren kehadiran siswa">
      <defs><linearGradient id="wdAreaGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="currentColor" stop-opacity=".20"/><stop offset="100%" stop-color="currentColor" stop-opacity=".02"/></linearGradient></defs>
      ${ticks.map(t=>`<g><line x1="${padL}" y1="${y(t)}" x2="${W-padR}" y2="${y(t)}" class="wd-gridline"/><text x="${padL-9}" y="${y(t)+4}" text-anchor="end" class="wd-axis-text">${Math.round(t)}%</text></g>`).join('')}
      <polygon points="${area}" class="wd-area"/>
      <polyline points="${pts}" class="wd-line"/>
      ${list.map((d,i)=>`<g class="wd-point"><circle cx="${x(i)}" cy="${y(vals[i])}" r="5"/><title>${escapeHtml(d.tanggal||'')} — ${vals[i]}% hadir</title></g>`).join('')}
      ${list.map((d,i)=>`<text x="${x(i)}" y="${H-14}" text-anchor="middle" class="wd-axis-text">${String(d.tanggal||'').slice(8,10)}</text>`).join('')}
    </svg>
    <div class="wd-line-caption"><span>Hari</span><strong>Tren kehadiran 14 hari terakhir</strong></div>
  </div>`;
}

function renderWDRankList(list, showClass){
  if(!list?.length) return '<div class="wd-empty">Belum ada data reward.</div>';
  return `<div class="wd-rank-list">${list.slice(0,10).map((s,i)=>`<div class="wd-rank-row"><div class="wd-medal ${i<3?'r'+(i+1):''}">${i+1}</div><div><div class="wd-rank-name">${escapeHtml(s.nama||'-')}</div><div class="wd-rank-meta">${showClass?escapeHtml(s.kelas||''):('NIS '+escapeHtml(s.nis||'-'))}</div></div><div class="wd-rank-score">${s.totalPoin||0} poin</div></div>`).join('')}</div>`;
}

function switchWDLeaderboard(mode){
  if(!wdLastData) return;
  document.getElementById('wd-tab-kelas')?.classList.toggle('active',mode==='kelas');
  document.getElementById('wd-tab-sekolah')?.classList.toggle('active',mode==='sekolah');
  const el=document.getElementById('wd-leader-list');
  if(el) el.innerHTML=renderWDRankList(wdLastData.reward?.[mode]||[],mode==='sekolah');
}

function renderWDDisciplineRanking(list){
  if(!list?.length) return '<div class="wd-empty">Belum ada data wajib lapor bulan ini.</div>';
  return list.slice(0,10).map((x,i)=>`<div class="wd-discipline-row"><div class="wd-medal ${i<3?'r'+(i+1):''}">${i+1}</div><div><div class="wd-rank-name">${escapeHtml(x.kelas||'-')}</div><div class="wd-progress"><span style="width:${Math.max(0,Math.min(100,x.persentase||0))}%"></span></div><div class="wd-rank-meta">${x.hariLapor||0}/${x.hariWajib||0} hari lapor${x.dataCukup?'':' · data belum cukup'}</div></div><div class="wd-discipline-pct">${x.persentase||0}%</div></div>`).join('');
}

function toggleWDEskalasi(){
  const el=document.getElementById('wd-esc-drawer');
  if(!el) return;
  el.classList.toggle('open');
  if(el.classList.contains('open')) document.getElementById('wd-escalation-box')?.scrollIntoView({behavior:'smooth',block:'nearest'});
}

function renderWDEskalasiCards(list){
  if(!list?.length) return '<div class="wd-empty">Alhamdulillah, tidak ada siswa yang perlu dieskalasi saat ini.</div>';
  return list.map(s=>`<div class="wd-esc-card"><div><strong>${escapeHtml(s.nama||'-')}</strong><br><span>${escapeHtml(s.kelas||'')} · NIS ${escapeHtml(s.nis||'-')} · ${s.jumlahKejadian||0} kejadian</span></div><div class="wd-esc-points">${s.totalPoin||0} poin</div></div>`).join('');
}

function formatTanggalDashboard(tanggalYmd){
  try{
    return new Intl.DateTimeFormat('id-ID', {
      weekday:'long', day:'numeric', month:'long', year:'numeric',
      timeZone:'Asia/Jakarta'
    }).format(new Date(tanggalYmd + 'T12:00:00+07:00'));
  } catch(err){
    return tanggalYmd;
  }
}

async function loadDashboard(requestToken){
  const body = document.getElementById('dash-body');
  if(!body) return;
  const res = await callApi('getDashboardHariIni', {});
  if(requestToken !== dashboardLoadToken || activeModule !== 'dashboard' || !document.getElementById('dash-body')) return;
  if(!res.success){
    body.innerHTML = `<div class="empty-state"><div class="icon">—</div>Gagal memuat data dashboard.</div>`;
    return;
  }

  if(!res.isHariKerja){
    body.innerHTML = `
      <div class="dash-day-note">
        <div><strong>${escapeHtml(formatTanggalDashboard(res.tanggal))}</strong><span>Sabtu dan Minggu tidak memiliki laporan wajib. Data hari kerja sebelumnya tetap tersimpan di spreadsheet.</span></div>
        <div class="dash-day-count">0 laporan</div>
      </div>
      <div class="empty-state"><div class="icon">—</div>Tidak ada perlombaan laporan hari ini.</div>
    `;
    return;
  }

  const data = (res.data || []).slice().sort((a, b) => {
    if(Boolean(a.sudahLogin) !== Boolean(b.sudahLogin)) return a.sudahLogin ? -1 : 1;
    if(Number(a.persentase) !== Number(b.persentase)) return Number(b.persentase) - Number(a.persentase);
    return String(a.nama || '').localeCompare(String(b.nama || ''), 'id');
  });

  const jumlahLaporanHariIni = res.isJumat ? 3 : 2;
  const sudahLoginCount = data.filter(d => d.sudahLogin).length;
  const selesai100Count = data.filter(d => d.sudahLogin && Number(d.persentase) >= 100).length;
  const belumLoginCount = data.filter(d => !d.sudahLogin).length;
  const laporanText = res.isJumat
    ? 'Hari Jumat memiliki 3 laporan wajib: Absensi, Kedisiplinan, dan PjBL.'
    : 'Senin sampai Kamis memiliki 2 laporan wajib: Absensi dan Kedisiplinan.';

  body.innerHTML = `
    <div class="dash-day-note">
      <div>
        <strong>${escapeHtml(formatTanggalDashboard(res.tanggal))}</strong>
        <span>${laporanText} Avatar dan bar berwarna akan bergerak seperti balapan setiap laporan selesai.</span>
      </div>
      <div class="dash-day-count">${jumlahLaporanHariIni} laporan</div>
    </div>
    <div class="dash-summary">
      <div class="dash-summary-box"><div class="num">${sudahLoginCount}/${data.length}</div><div class="lbl">Sudah Login Hari Ini</div></div>
      <div class="dash-summary-box"><div class="num" style="color:var(--success)">${selesai100Count}</div><div class="lbl">Login + Semua Selesai</div></div>
      <div class="dash-summary-box"><div class="num" style="color:var(--danger)">${belumLoginCount}</div><div class="lbl">Belum Login Hari Ini</div></div>
    </div>
    <div class="card dash-list-card">
      <div class="dash-race-caption"><span><b>Balapan laporan harian</b> · klik karakter untuk melihat nama</span><span>Start → Finish</span></div>
      <div id="dash-list"></div>
    </div>
  `;

  const list = document.getElementById('dash-list');
  if(!list || requestToken !== dashboardLoadToken || activeModule !== 'dashboard') return;
  if(data.length === 0){
    list.innerHTML = `<div class="empty-state"><div class="icon">—</div>Belum ada data walas aktif.</div>`;
    return;
  }

  data.forEach((d, index) => {
    const tugas = Array.isArray(d.tugas) ? d.tugas : [];
    const totalTugas = Number(d.totalTugas ?? tugas.length);
    const selesaiCount = Number(d.selesaiCount ?? tugas.filter(t => t.selesai).length);
    const persentase = Math.max(0, Math.min(100, Number(d.persentase) || 0));

    const avatarPos = 4 + (persentase * 0.92);
    const fillWidth = avatarPos;
    const avatarEdgeClass = avatarPos < 17 ? 'edge-start' : (avatarPos > 83 ? 'edge-end' : '');
    const avatarSrc = d.fotoProfil || null;
    const initial = String(d.nama || '?').trim().charAt(0).toUpperCase() || '?';
    const isComplete = Boolean(d.sudahLogin) && persentase >= 100;
    const theme = getAvatarRaceTheme(d.avatar);
    const rankClass = index < 3 ? ` rank-${index + 1}` : '';

    const checkpointHtml = tugas.map((t, taskIndex) => {
      const ratio = totalTugas > 0 ? ((taskIndex + 1) / totalTugas) : 0;
      const pos = 4 + (ratio * 92);
      const edgeClass = taskIndex === tugas.length - 1 ? 'edge-end' : '';
      return `
        <span class="dash-checkpoint ${t.selesai ? 'done' : ''} ${edgeClass}" style="left:${pos}%">
          <span class="dash-checkpoint-dot"></span>
          <span class="dash-checkpoint-label">${escapeHtml(t.nama)}</span>
        </span>`;
    }).join('');

    const popoverTaskHtml = tugas.map(t => `
      <span class="dash-pop-task ${t.selesai ? 'done' : 'pending'}">
        <span>${escapeHtml(t.nama)}</span>
        <b>${t.selesai ? 'Selesai' : 'Belum'}</b>
      </span>`).join('');

    const row = document.createElement('div');
    row.className = 'dash-row' + (isComplete ? ' is-complete' : '') + (!d.sudahLogin ? ' is-offline' : '');
    row.style.setProperty('--runner-color', theme.main);
    row.style.setProperty('--runner-dark', theme.dark);
    row.style.setProperty('--runner-soft', theme.soft);
    row.innerHTML = `
      <div class="dash-row-top">
        <div class="dash-lane-left">
          <span class="dash-order${rankClass}">${index + 1}</span>
          <span class="dash-login-badge ${d.sudahLogin ? 'ya' : 'belum'}">${d.sudahLogin ? 'Sudah login' : 'Belum login'}</span>
        </div>
        <div class="dash-lane-progress">${selesaiCount}/${totalTugas} laporan · ${persentase}%</div>
      </div>
      <div class="dash-path-track">
        <div class="dash-path-guide"></div>
        <div class="dash-path-line-fill" style="width:${fillWidth}%"></div>
        <div class="dash-path-start" aria-hidden="true"></div>
        <div class="dash-path-finish-box" aria-hidden="true">
          <svg class="dash-path-finish" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M5 21V3"/><path d="M6 4h11v9H6z"/><path d="M6 4l11 9M17 4 6 13"/><path d="M11.5 4v9M6 8.5h11"/>
          </svg>
        </div>
        ${checkpointHtml}
        <button type="button" class="dash-path-avatar-button ${avatarEdgeClass}" style="left:${avatarPos}%" aria-expanded="false" aria-label="Lihat nama walas" onclick="toggleDashboardAvatar(event, this)">
          <span class="dash-speed-lines" aria-hidden="true"><span></span><span></span><span></span></span>
          ${avatarSrc
            ? `<img class="dash-path-avatar" src="${avatarSrc}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'dash-avatar-fallback',textContent:'${escapeHtml(initial)}'}))">`
            : `<span class="dash-avatar-fallback">${escapeHtml(initial)}</span>`
          }
          <span class="dash-avatar-popover" onclick="event.stopPropagation()">
            <span class="dash-pop-name">${escapeHtml(d.nama || '-')}</span>
            <span class="dash-pop-class">${escapeHtml(d.kelas || '-')}</span>
            <span class="dash-pop-status">
              <span>${d.sudahLogin ? 'Sudah login hari ini' : 'Belum login hari ini'}</span>
              <b>${selesaiCount}/${totalTugas}</b>
            </span>
            ${popoverTaskHtml}
          </span>
        </button>
      </div>
    `;
    list.appendChild(row);
  });
}


/* ==========================================================
   CQLASS — REKAP EKSKUL WALAS (READ ONLY)
   Tampilan memakai komponen CSS yang sudah ada.
   ========================================================== */
async function renderEkskulRekap(content){
  const kelas = currentUser.role === 'walas' ? (currentUser.kelas || '') : '';
  content.innerHTML = `
    <div class="page-title">Rekap Ekskul</div>
    <div class="page-sub">Rekap peserta, kehadiran, dan nilai ekstrakurikuler siswa.</div>
    ${currentUser.role !== 'walas' ? `
      <div class="card">
        <div class="card-title">Pilih Kelas</div>
        <div style="display:flex;gap:10px;max-width:620px;">
          <input id="ek-rekap-kelas" type="text" placeholder="Contoh: 5A Banin"
            style="flex:1;padding:11px 14px;border:2px solid var(--border);border-radius:10px;font-family:inherit;font-size:14px;">
          <button class="btn btn-sm" style="width:auto;" onclick="loadEkskulRekapAdmin()">Tampilkan</button>
        </div>
      </div>` : ''}
    <div id="ek-rekap-body"></div>`;
  if(kelas) loadEkskulRekap(kelas);
}

function loadEkskulRekapAdmin(){
  const kelas=(document.getElementById('ek-rekap-kelas')?.value||'').trim();
  if(!kelas){ showToast('Isi kelas terlebih dahulu.',true); return; }
  loadEkskulRekap(kelas);
}

async function loadEkskulRekap(kelas){
  const body=document.getElementById('ek-rekap-body');
  if(!body)return;
  body.innerHTML=`<div class="card"><span class="spinner" style="border-top-color:var(--primary);border-color:rgba(10,110,110,.25)"></span>Memuat rekap ekskul...</div>`;
  try{
    const res=await callApi('getRekapEkskulWalas',{kelas});
    if(!res.success) throw new Error();
    const rows=res.data||[];
    if(!rows.length){
      body.innerHTML=`<div class="empty-state"><div class="icon">—</div>Belum ada data ekskul untuk kelas ${escapeHtml(kelas)}.</div>`;
      return;
    }

    const grouped={};
    rows.forEach(r=>{
      const k=r.namaEkskul||'Ekskul';
      if(!grouped[k]) grouped[k]=[];
      grouped[k].push(r);
    });

    body.innerHTML=Object.keys(grouped).sort((a,b)=>a.localeCompare(b,'id')).map(nama=>{
      const list=grouped[nama];
      return `<div class="card">
        <div class="card-title">${escapeHtml(nama)} <span style="font-size:11px;color:var(--muted);font-weight:500">(${list.length} siswa)</span></div>
        <div style="overflow:auto">
          <table class="lg-table" style="min-width:760px">
            <thead><tr>
              <th>No</th><th style="text-align:left;min-width:210px">Nama Siswa</th><th>Kelas</th>
              <th>Hadir</th><th>Total</th><th>Kehadiran</th>
              <th>Keikutsertaan</th><th>Kemampuan</th><th style="text-align:left;min-width:220px">Deskripsi</th>
            </tr></thead>
            <tbody>
              ${list.map((r,i)=>{
                const pct=r.totalPertemuan?Math.round((r.hadir||0)*100/r.totalPertemuan):0;
                return `<tr>
                  <td>${i+1}</td>
                  <td style="text-align:left"><strong>${escapeHtml(r.nama||'-')}</strong><div class="siswa-nis">NIS ${escapeHtml(r.nis||'-')}</div></td>
                  <td>${escapeHtml(r.kelas||'-')}</td>
                  <td>${Number(r.hadir||0)}</td>
                  <td>${Number(r.totalPertemuan||0)}</td>
                  <td>${pct}%</td>
                  <td>${escapeHtml(r.predikatKeikutsertaan||r.nilaiKeikutsertaan||'-')}</td>
                  <td>${escapeHtml(r.predikatKemampuan||r.nilaiKemampuan||'-')}</td>
                  <td style="text-align:left">${escapeHtml(r.deskripsi||'-')}</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
    }).join('');
  }catch(e){
    body.innerHTML=`<div class="empty-state"><div class="icon">—</div>Terjadi kendala. Silakan hubungi admin.</div>`;
  }
}
