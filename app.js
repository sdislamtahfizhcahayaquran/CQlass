// ==========================================================
// CQLASS 2 — SUPABASE AUTH CONFIG
// ==========================================================
const SUPABASE_URL = 'https://lmglkxzemtvxcgktiord.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_3HyNVUYXakILMKo2SK-DJw_ka7-Yx93';
const AUTH_URL = `${SUPABASE_URL}/functions/v1/auth-user`;
const DASHBOARD_MASTER_URL = `${SUPABASE_URL}/functions/v1/dashboard-master`;
const ATTENDANCE_URL = `${SUPABASE_URL}/functions/v1/attendance`;
const STUDENT_POINTS_URL = `${SUPABASE_URL}/functions/v1/student-points`;
const ROLE_DASHBOARD_URL = `${SUPABASE_URL}/functions/v1/role-dashboard`;
const EXTRACURRICULAR_PUBLIC_URL = `${SUPABASE_URL}/functions/v1/extracurricular-public`;
const STUDENT_CASES_URL = `${SUPABASE_URL}/functions/v1/student-cases`;
const ACADEMIC_SCORES_URL = `${SUPABASE_URL}/functions/v1/academic-scores`;
const REPORT_PREVIEW_URL = `${SUPABASE_URL}/functions/v1/report-preview`;

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

// ==========================================================
// FUNGSI RENDER UNTUK SEMUA MODUL
// ==========================================================

function renderDashboard(content){
  content.innerHTML = `
    <div class="page-title">Dashboard</div>
    <div class="page-sub">Selamat datang di CQlass!</div>
    <div class="card">
      <div style="padding:20px;text-align:center;font-size:16px;color:var(--muted)">
        👤 ${escapeHtml(currentUser?.nama || 'User')}<br>
        📚 ${escapeHtml(currentUser?.kelas || 'Kelas belum diatur')}<br>
        🔑 Role: ${escapeHtml(currentUser?.role || '-')}
      </div>
    </div>
  `;
}

function renderAbsensi(content){
  content.innerHTML = `
    <div class="page-title">Absensi (Morning Talk)</div>
    <div class="page-sub">Modul absensi sedang dalam pengembangan.</div>
    <div class="card"><div class="empty-state"><div class="icon">📋</div>Belum tersedia</div></div>
  `;
}

function renderKedisiplinan(content){
  content.innerHTML = `
    <div class="page-title">Kedisiplinan</div>
    <div class="page-sub">Modul kedisiplinan sedang dalam pengembangan.</div>
    <div class="card"><div class="empty-state"><div class="icon">⚠️</div>Belum tersedia</div></div>
  `;
}

function renderReward(content){
  content.innerHTML = `
    <div class="page-title">Reward Siswa</div>
    <div class="page-sub">Modul reward sedang dalam pengembangan.</div>
    <div class="card"><div class="empty-state"><div class="icon">🎁</div>Belum tersedia</div></div>
  `;
}

function renderMasalahSiswa(content){
  content.innerHTML = `
    <div class="page-title">Masalah Siswa</div>
    <div class="page-sub">Modul masalah siswa sedang dalam pengembangan.</div>
    <div class="card"><div class="empty-state"><div class="icon">📋</div>Belum tersedia</div></div>
  `;
}

function renderLegger(content){
  content.innerHTML = `
    <div class="page-title">Nilai</div>
    <div class="page-sub">Modul nilai sedang dalam pengembangan.</div>
    <div class="card"><div class="empty-state"><div class="icon">📊</div>Belum tersedia</div></div>
  `;
}

function renderVocabularyBulanan(content){
  content.innerHTML = `
    <div class="page-title">Bilingual</div>
    <div class="page-sub">Modul bilingual sedang dalam pengembangan.</div>
    <div class="card"><div class="empty-state"><div class="icon">🌐</div>Belum tersedia</div></div>
  `;
}

function renderPjBL(content){
  content.innerHTML = `
    <div class="page-title">PjBL</div>
    <div class="page-sub">Modul PjBL sedang dalam pengembangan.</div>
    <div class="card"><div class="empty-state"><div class="icon">📋</div>Belum tersedia</div></div>
  `;
}

function renderEkskulRekap(content){
  content.innerHTML = `
    <div class="page-title">Ekskul</div>
    <div class="page-sub">Modul ekstrakurikuler sedang dalam pengembangan.</div>
    <div class="card"><div class="empty-state"><div class="icon">🏆</div>Belum tersedia</div></div>
  `;
}

function renderLaporanGuru(content){
  content.innerHTML = `
    <div class="page-title">Laporan Guru Bulanan</div>
    <div class="page-sub">Modul laporan guru sedang dalam pengembangan.</div>
    <div class="card"><div class="empty-state"><div class="icon">📊</div>Belum tersedia</div></div>
  `;
}

// ==========================================================
// FUNGSI RAPOR — CETAK RAPOR
// ==========================================================

function rpScore(v){
  if(v === null || v === undefined || v === '') return '-';
  const n = Number(v);
  if(!Number.isFinite(n)) return '-';
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, '');
}

function rpGrade(v){
  const s = String(v || '').trim().toUpperCase();
  return ['A','B','C','D'].includes(s) ? s : '-';
}

function rpEkskulLegend(kind){
  const legends={
    activity: 'A = Very Active | B = Active | C = Occasionally Active | D = Not Participating',
    skill: 'A = Skilled | B = Proficient | C = Developing | D = Emerging',
    competition: 'A = Competed and placed | B = Competed without placing | C = Interested but has not competed | D = Not yet interested',
    school: 'A = Very Active | B = Active | C = Fairly Active | D = Not Very Active'
  };
  return legends[kind] || '-';
}

function rpFmtDate(v){
  if(!v) return '-';
  const d = new Date(v + 'T00:00:00');
  if(Number.isNaN(d.getTime())) return v;
  return new Intl.DateTimeFormat('en-GB', {day:'numeric', month:'long', year:'numeric'}).format(d);
}

function rpSafeFilename(v){
  return String(v || 'Rapor').replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function rpLoadScript(src, id){
  return new Promise((resolve, reject) => {
    if(window[id]) return resolve(window[id]);
    const old = document.querySelector(`script[data-rp-lib="${id}"]`);
    if(old){
      old.addEventListener('load', () => resolve(window[id]), {once: true});
      old.addEventListener('error', reject, {once: true});
      return;
    }
    const sc = document.createElement('script');
    sc.src = src;
    sc.async = true;
    sc.dataset.rpLib = id;
    sc.onload = () => resolve(window[id]);
    sc.onerror = () => reject(new Error('Gagal memuat library PDF.'));
    document.head.appendChild(sc);
  });
}

async function rpEnsurePdfLibs(zip=false){
  await rpLoadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js', 'html2canvas');
  await rpLoadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js', 'jspdf');
  if(zip) await rpLoadScript('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js', 'JSZip');
}

async function rpElementPdfBlob(el){
  await rpEnsurePdfLibs(false);
  const pages = [...el.querySelectorAll('.rpv-paper')];
  if(!pages.length) throw new Error('Halaman rapor tidak ditemukan.');
  const {jsPDF} = window.jspdf || {};
  if(!jsPDF) throw new Error('Library PDF belum siap.');
  const pdf = new jsPDF({orientation:'portrait', unit:'mm', format:'a4', compress:true});
  for(let i=0; i<pages.length; i++){
    const page = pages[i];
    const savedTransform = page.style.transform;
    const savedMargin = page.style.marginBottom;
    page.style.transform = '';
    page.style.marginBottom = '';
    const canvas = await window.html2canvas(page, {
      scale: 2.5,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      scrollX: 0,
      scrollY: 0,
      width: page.scrollWidth,
      height: page.scrollHeight,
      windowWidth: page.scrollWidth,
      windowHeight: page.scrollHeight
    });
    page.style.transform = savedTransform;
    page.style.marginBottom = savedMargin;
    if(i > 0) pdf.addPage('a4', 'portrait');
    pdf.addImage(canvas.toDataURL('image/jpeg', 0.96), 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
  }
  return pdf.output('blob');
}

function rpDownloadBlob(blob, name){
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 1200);
}

let raporPreviewState = {
  academicYear: '2026/2027',
  semester: 1,
  reportType: 'PTS',
  classes: [],
  classLocked: false,
  classId: '',
  students: [],
  studentId: '',
  startDate: '',
  endDate: '',
  printDate: '',
  hijriDate: '',
  report: null,
  classReports: []
};

function rpTodayYmd(){
  const p = new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Jakarta', year:'numeric', month:'2-digit', day:'2-digit'}).formatToParts(new Date());
  const m = Object.fromEntries(p.map(x => [x.type, x.value]));
  return `${m.year}-${m.month}-${m.day}`;
}

function rpDefaultStartYmd(){
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0,10);
}

async function reportPreviewRequest(action, payload={}, timeoutMs=35000){
  const token = getAuthToken();
  if(!token) throw new Error('Sesi login tidak ditemukan.');
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try{
    const r = await fetch(REPORT_PREVIEW_URL, {
      method:'POST',
      headers:{
        'Content-Type':'application/json',
        'apikey': SUPABASE_PUBLISHABLE_KEY,
        'Authorization': `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
        'x-session-token': token
      },
      body: JSON.stringify({action, ...payload}),
      signal: ctl.signal
    });
    const raw = await r.text();
    let d = {};
    try{ d = raw ? JSON.parse(raw) : {}; } catch(_){ throw new Error(`Respons Rapor bukan JSON. HTTP ${r.status}.`); }
    if(!r.ok || d.success === false){
      const map = {
        session_invalid: 'Sesi login tidak valid.',
        session_expired: 'Sesi login telah berakhir.',
        forbidden: 'Akun ini tidak memiliki akses Rapor.',
        class_forbidden: 'Kelas tidak berada dalam akses akun ini.',
        student_not_in_class: 'Siswa tidak ditemukan pada kelas ini.',
        academic_year_not_found: 'Tahun ajaran belum tersedia di Supabase.'
      };
      throw new Error(map[d.error] || d.error || `HTTP ${r.status}`);
    }
    return d;
  } catch(e){
    if(e?.name === 'AbortError') throw new Error('Server Rapor terlalu lama merespons.');
    throw e;
  } finally { clearTimeout(timer); }
}

function injectRaporPreviewStyles(){
  if(document.getElementById('rapor-v1-style')) return;
  const s = document.createElement('style');
  s.id = 'rapor-v1-style';
  s.textContent = `
    .rpv-paper-wrap{overflow:auto;padding:10px 0 22px;background:#f5f7f7}
    .rpv-paper{
      position:relative;
      width:210mm;
      height:297mm;
      min-height:297mm;
      max-height:297mm;
      margin:0 auto 18px;
      background:#fff;
      color:#000;
      padding:4.2mm 7mm 5.5mm;
      box-shadow:0 8px 30px rgba(0,0,0,.12);
      font-family:Tahoma, Geneva, sans-serif !important;
      font-size:10px;
      line-height:1.4;
      box-sizing:border-box;
      overflow:hidden
    }
    .rpv-paper *{box-sizing:border-box;font-family:Tahoma, Geneva, sans-serif !important}
    .rpv-template-head{width:100%;border-collapse:collapse;border:2px solid #111;margin:0}
    .rpv-template-head td{border:2px solid #111;height:25px;padding:2px 4px;vertical-align:middle}
    .rpv-template-head .head-left{width:50.9%;text-align:center;font-weight:900;font-size:11px}
    .rpv-template-head .head-right{font-size:10px}
    .rpv-template-shadow{height:6px;background:#e7e7e7;margin:0 1px 10px}
    .rpv-section-plain{font-weight:900;font-size:11px;margin:7px 0 4px}
    .rpv-tahfizh{width:100%;border-collapse:collapse;margin:0 0 7px;font-size:10px}
    .rpv-tahfizh td{padding:2px 3px;border:0;vertical-align:top}
    .rpv-tahfizh td:first-child{width:38%}
    .rpv-tahfizh td:nth-child(2){width:2%;text-align:center}
    .rpv-tahfizh .sub{padding-left:20px}
    .rpv-table{width:100%;border-collapse:collapse;table-layout:fixed}
    .rpv-table th,.rpv-table td{border:1px solid #111;padding:3px 4px;vertical-align:middle}
    .rpv-table th{background:#dce7f1;font-weight:900;text-align:center;font-size:9.5px}
    .rpv-center{text-align:center}
    .rpv-left{text-align:left}
    .rpv-academic{font-size:10px;line-height:1.2}
    .rpv-academic th,.rpv-academic td{padding:2px 3px}
    .rpv-academic thead th{font-size:9px}
    .rpv-academic .no{width:4%}
    .rpv-academic .subject{width:35%}
    .rpv-academic .kktp{width:12.5%}
    .rpv-academic .lo{width:6.7%}
    .rpv-academic .remarks{width:14.8%}
    .rpv-academic tbody td{height:16px}
    .rpv-start4{background:#d9d9d9!important;color:#333}
    .rpv-group-row td{background:#d9d9d9;font-weight:900}
    .rpv-att-grid{display:grid;grid-template-columns:65% 29%;gap:6%;align-items:start;margin:8px 0 0}
    .rpv-att-grid .rpv-section-plain{margin-left:0}
    .rpv-attendance{font-size:10px}
    .rpv-attendance th,.rpv-attendance td{height:20px;padding:2px 4px}
    .rpv-score-table{font-size:10px;margin-top:21px}
    .rpv-score-table th,.rpv-score-table td{height:20px;padding:2px 4px}
    .rpv-p2-section{font-weight:900;font-size:11px;margin:0 0 4px}
    .rpv-p2-sub{font-weight:400;font-size:10px;margin:8px 0 4px}
    .rpv-p2-sub b{font-weight:900}
    .rpv-exkul{font-size:10px}
    .rpv-exkul th,.rpv-exkul td{height:26px;padding:3px 5px;line-height:1.3}
    .rpv-exkul td:last-child{font-size:8px}
    .rpv-discipline{font-size:10px}
    .rpv-discipline th{height:44px;padding:3px 4px}
    .rpv-discipline td{height:22px;padding:3px 4px}
    .rpv-merit{font-size:10px}
    .rpv-merit th{height:28px;padding:3px 4px}
    .rpv-merit td{height:22px;padding:3px 4px}
    .rpv-total-line{border:1px solid #111;border-top:0;padding:5px 4px;font-size:10px}
    .rpv-date-center{position:absolute;left:50%;transform:translateX(-50%);top:165mm;text-align:center;font-size:10px;line-height:1.6;min-width:45mm}
    .rpv-signatures{position:absolute;left:7mm;right:7mm;top:190mm;height:37mm;text-align:center;font-size:10px}
    .rpv-signatures>div{position:absolute;top:0;width:30%}
    .rpv-signatures>div:nth-child(1){left:0}
    .rpv-signatures>div:nth-child(2){left:50%;transform:translateX(-50%)}
    .rpv-signatures>div:nth-child(3){right:0}
    .rpv-signatures .name{margin-top:31mm;text-decoration:none;font-weight:400;white-space:nowrap;border-bottom:1px dashed #999;padding-bottom:2px;display:inline-block;min-width:80px}
    .rpv-signatures .principal-name{margin-top:31mm;font-weight:700;white-space:nowrap;display:inline-block;min-width:80px}
    .rpv-team-area{position:absolute;left:7mm;right:7mm;top:252mm;display:grid;grid-template-columns:54% 46%;font-size:10px;gap:4px}
    .rpv-team-title{font-weight:400;margin-bottom:5px}
    .rpv-team-simple{width:100%;border-collapse:collapse}
    .rpv-team-simple td{border:0;padding:2px 1px;vertical-align:top}
    .rpv-team-simple td:first-child{width:7%}
    .rpv-position-list{padding-top:18px}
    .rpv-position-list div{padding:3px 0}
    .rpv-footer{position:absolute;left:7mm;right:7mm;bottom:4mm;display:flex;justify-content:space-between;font-size:9px;font-style:italic}
    @media(max-width:900px){.rpv-paper{width:100%;height:auto;min-height:auto;max-height:none;padding:12px;transform:scale(1)!important}.rpv-paper-wrap{overflow:auto;display:flex;flex-direction:column;align-items:center}}
    @media print{@page{size:A4 portrait;margin:0}body *{visibility:hidden!important}#rpv-preview,#rpv-preview *{visibility:visible!important}#rpv-preview{position:absolute;left:0;top:0;width:210mm;margin:0;padding:0}.rpv-paper{box-shadow:none;margin:0;width:210mm;height:297mm;page-break-after:always;break-after:page}.rpv-paper:last-child{page-break-after:auto;break-after:auto}}
  `;
  document.head.appendChild(s);
}

function rpAcademicRows(rows){
  const list = Array.isArray(rows) ? rows : [];
  if(!list.length) return `<tr><td colspan="9" class="rpv-center">Belum ada data akademik.</td></tr>`;
  
  let html = '';
  let no = 1;
  
  list.forEach((r) => {
    const isStartingGrade4 = Boolean(r.starting_grade_4);
    const isGroupRow = Boolean(r.is_group_row);
    const isSub = Boolean(r.is_subject);
    
    const rowClass = isStartingGrade4 ? ' class="rpv-start4"' : (isGroupRow ? ' class="rpv-group-row"' : '');
    
    const kktp = (isStartingGrade4 || isGroupRow) ? '' : escapeHtml(r.kktp || '-');
    
    const los = [0,1,2,3,4].map(x => 
      `<td${rowClass}>${(isStartingGrade4 || isGroupRow) ? '' : rpScore(r.lo?.[x])}</td>`
    ).join('');
    
    const remarks = isStartingGrade4 ? 'Starting Grade 4' : (isGroupRow ? '' : escapeHtml(r.remarks || '-'));
    
    const nameDisplay = isSub ? `&nbsp;&nbsp;&nbsp;${escapeHtml(r.name || '-')}` : escapeHtml(r.name || '-');
    
    html += `<tr>
      <td class="rpv-center">${isGroupRow ? '' : no}</td>
      <td${rowClass}>${nameDisplay}</td>
      <td${rowClass}>${kktp}</td>
      ${los}
      <td${rowClass}>${remarks}</td>
    </tr>`;
    
    if(!isGroupRow) no++;
  });
  
  return html;
}

function rpTahfizhRows(t){
  if(!t) return `<tr><td>Memorization Material</td><td>:</td><td>-</td></tr>
    <tr><td>Tahfizh Learning Target (LP)</td><td>:</td><td>-</td></tr>
    <tr><td>Current Achievement</td><td>:</td><td>-</td></tr>
    <tr><td>Tahfizh Achievement</td><td>:</td><td>-</td></tr>
    <tr><td class="sub">a. Number of Surahs</td><td>:</td><td>-</td></tr>
    <tr><td class="sub">b. Number of Lines</td><td>:</td><td>-</td></tr>
    <tr><td class="sub">c. Number of Verses</td><td>:</td><td>-</td></tr>
    <tr><td class="sub">d. Percentage (%)</td><td>:</td><td>-</td></tr>
    <tr><td>Juz Advancement Assessment</td><td>:</td><td>-</td></tr>`;
  return `<tr><td>Memorization Material</td><td>:</td><td>${escapeHtml(t.material || '-')}</td></tr>
    <tr><td>Tahfizh Learning Target (LP)</td><td>:</td><td>${escapeHtml(t.target || '-')}</td></tr>
    <tr><td>Current Achievement</td><td>:</td><td>${escapeHtml(t.current || '-')}</td></tr>
    <tr><td>Tahfizh Achievement</td><td>:</td><td>${escapeHtml(t.achievement || '-')}</td></tr>
    <tr><td class="sub">a. Number of Surahs</td><td>:</td><td>${escapeHtml(t.surahs ?? '-')}</td></tr>
    <tr><td class="sub">b. Number of Lines</td><td>:</td><td>${escapeHtml(t.lines ?? '-')}</td></tr>
    <tr><td class="sub">c. Number of Verses</td><td>:</td><td>${escapeHtml(t.verses ?? '-')}</td></tr>
    <tr><td class="sub">d. Percentage (%)</td><td>:</td><td>${escapeHtml(t.percentage ?? '-')}</td></tr>
    <tr><td>Juz Advancement Assessment</td><td>:</td><td>${escapeHtml(t.juz_assessment || '-')}</td></tr>`;
}

function rpTeamRows(team, tahfizh, walasName){
  const arr = [];
  
  for(const n of team || []) {
    if(String(n || '').trim().toLowerCase() !== String(walasName || '').trim().toLowerCase()) {
      arr.push({name: n, pos: 'Subject Teacher'});
    }
  }
  
  for(const n of tahfizh || []) {
    if(String(n || '').trim().toLowerCase() !== String(walasName || '').trim().toLowerCase()) {
      arr.push({name: n, pos: 'Tahfizh Teacher'});
    }
  }
  
  if(!arr.length) return '<tr><td>1</td><td>-</td></tr>';
  return arr.map((x, i) => `<tr><td>${i+1}</td><td>${escapeHtml(x.name)}</td></tr>`).join('');
}

function rpTeamPositions(team, tahfizh, walasName){
  const arr = [];
  
  for(const n of team || []) {
    if(String(n || '').trim().toLowerCase() !== String(walasName || '').trim().toLowerCase()) {
      arr.push({name: n, pos: 'Subject Teacher'});
    }
  }
  
  for(const n of tahfizh || []) {
    if(String(n || '').trim().toLowerCase() !== String(walasName || '').trim().toLowerCase()) {
      arr.push({name: n, pos: 'Tahfizh Teacher'});
    }
  }
  
  if(!arr.length) return '<div>-</div>';
  return arr.map(x => `<div>${x.pos}</div>`).join('');
}

function renderRaporPreview(){
  const area = document.getElementById('rpv-preview-area');
  const r = raporPreviewState.report;
  if(!area || !r) return;
  
  const st = r.student || {};
  const cl = r.class || {};
  const att = r.attendance || {};
  const pts = r.points || {};
  const eks = r.extracurricular || {};
  const trs = r.teachers || {};
  const p = att.percent || {};
  const cats = pts.categories || {};
  const t = r.tahfizh || null;
  
  const walasName = trs.homeroom || '';
  const principalName = trs.principal || '';
  
  const reportTitle = raporPreviewState.reportType === 'SEMESTER' 
    ? 'SEMESTER STUDENT PROGRESS REPORT' 
    : 'MID-SEMESTER STUDENT PROGRESS REPORT';
  const semTxt = Number(r.semester_no) === 2 ? 'SEMESTER II' : 'SEMESTER I';
  const idText = [st.nis, st.nisn].filter(Boolean).join(' / ') || '-';

  area.innerHTML = `
    <div class="card">
      <div class="pv2-toolbar">
        <div>
          <div class="card-title" style="margin:0">Preview Rapor - ${escapeHtml(st.name || '-')}</div>
          <div class="page-sub" style="margin-top:3px">Ukuran final A4, 2 halaman. Font Tahoma. Sesuai template.</div>
        </div>
        <button class="btn btn-sm rpv-print-btn" onclick="rpPrintStudentPdf()">🖨️ Cetak PDF</button>
      </div>
    </div>
    <div class="rpv-paper-wrap" id="rpv-preview">
      <!-- HALAMAN 1 -->
      <section class="rpv-paper">
        <table class="rpv-template-head"><tbody>
          <tr><td class="head-left">${reportTitle}</td><td class="head-right">Student Name&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: &nbsp;<b>${escapeHtml(st.name || '-')}</b></td></tr>
          <tr><td class="head-left">${semTxt}</td><td class="head-right">Student ID/NISN&nbsp;&nbsp;&nbsp;&nbsp;: &nbsp;${escapeHtml(idText)}</td></tr>
          <tr><td class="head-left">ACADEMIC YEAR ${escapeHtml(r.academic_year || '2026/2027')}</td><td class="head-right">Class/Phase&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: &nbsp;${escapeHtml(cl.name || '-')}</td></tr>
        </tbody></table>
        <div class="rpv-template-shadow"></div>

        <!-- 1 Tahfizh Achievement Report -->
        <div class="rpv-section-plain">1&nbsp;&nbsp;Tahfizh Achievement Report</div>
        <table class="rpv-tahfizh"><tbody>${rpTahfizhRows(t)}</tbody></table>

        <!-- 2 Subject Assessment Report -->
        <div class="rpv-section-plain">2&nbsp;&nbsp;Subject Assessment Report</div>
        <table class="rpv-table rpv-academic">
          <thead>
            <tr>
              <th rowspan="2" class="no">NO</th>
              <th rowspan="2" class="subject">SUBJECT</th>
              <th rowspan="2" class="kktp">Learning Objective Achievement Criteria (KKTP)</th>
              <th colspan="5">SUMMATIVE ASSESSMENT</th>
              <th rowspan="2" class="remarks">REMARKS</th>
            </tr>
            <tr><th class="lo">LO 1</th><th class="lo">LO 2</th><th class="lo">LO 3</th><th class="lo">LO 4</th><th class="lo">LO 5</th></tr>
          </thead>
          <tbody>${rpAcademicRows(r.academic)}</tbody>
        </table>

        <!-- 3 Attendance Record + Score Table -->
        <div class="rpv-att-grid">
          <div>
            <div class="rpv-section-plain">3&nbsp;&nbsp;Attendance Record</div>
            <table class="rpv-table rpv-attendance">
              <thead><tr><th style="width:8%">No.</th><th>Attendance Status</th><th style="width:19%">Days</th><th style="width:22%">Percentage</th></tr></thead>
              <tbody>
                <tr><td class="rpv-center">1</td><td>Present</td><td class="rpv-center">${att.present || 0}</td><td class="rpv-center">${p.present || 0}%</td></tr>
                <tr><td class="rpv-center">2</td><td>Absent Due to Illness</td><td class="rpv-center">${att.sick || 0}</td><td class="rpv-center">${p.sick || 0}%</td></tr>
                <tr><td class="rpv-center">3</td><td>Excused Absence</td><td class="rpv-center">${att.excused || 0}</td><td class="rpv-center">${p.excused || 0}%</td></tr>
                <tr><td class="rpv-center">4</td><td>Unexcused Absence</td><td class="rpv-center">${att.unexcused || 0}</td><td class="rpv-center">${p.unexcused || 0}%</td></tr>
              </tbody>
            </table>
          </div>
          <div>
            <table class="rpv-table rpv-score-table">
              <thead><tr><th>Score Range</th><th>Performance Level</th></tr></thead>
              <tbody>
                <tr><td class="rpv-center">90-100</td><td>Highly Proficient</td></tr>
                <tr><td class="rpv-center">81-89</td><td>Proficient</td></tr>
                <tr><td class="rpv-center">75-80</td><td>Developing</td></tr>
                <tr><td class="rpv-center">&lt;75</td><td>Needs Guidance</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="rpv-footer"><span>SD Islam Tahfizh Cahaya Qur'an</span><span>Page 1 of 2</span></div>
      </section>

      <!-- HALAMAN 2 -->
      <section class="rpv-paper">
        <div class="rpv-p2-section">4&nbsp;&nbsp;Student Activity and Personal Development Report</div>
        <table class="rpv-table rpv-exkul">
          <thead><tr><th style="width:5%">No.</th><th style="width:50%">Extracurricular &amp; Personal Development</th><th style="width:8%">Rating</th><th>Remarks</th></tr></thead>
          <tbody>
            <tr><td class="rpv-center">1</td><td>Extracurricular Participation</td><td class="rpv-center"><b>${rpGrade(eks.activity_grade)}</b></td><td>${escapeHtml(rpEkskulLegend('activity'))}</td></tr>
            <tr><td class="rpv-center">2</td><td>Extracurricular Skill Development</td><td class="rpv-center"><b>${rpGrade(eks.skill_grade)}</b></td><td>${escapeHtml(rpEkskulLegend('skill'))}</td></tr>
            <tr><td class="rpv-center">3</td><td>Competition Participation and Achievement</td><td class="rpv-center"><b>${rpGrade(eks.competition_grade)}</b></td><td>${escapeHtml(rpEkskulLegend('competition'))}</td></tr>
            <tr><td class="rpv-center">4</td><td>Participation in School Activities</td><td class="rpv-center"><b>${rpGrade(eks.school_activity_grade)}</b></td><td>${escapeHtml(rpEkskulLegend('school'))}</td></tr>
          </tbody>
        </table>

        <div class="rpv-p2-section" style="margin-top:17px">5&nbsp;&nbsp;Student Character and Discipline Report</div>

        <div class="rpv-p2-sub">A. Disciplinary Record Summary</div>
        <table class="rpv-table rpv-discipline">
          <thead><tr><th style="width:51%">Level</th><th style="width:14%">Number of<br>Incidents</th><th>Remarks</th></tr></thead>
          <tbody>
            <tr><td>Minor</td><td class="rpv-center">${cats.Minor?.incidents || 0}</td><td>-</td></tr>
            <tr><td>Moderate</td><td class="rpv-center">${cats.Moderate?.incidents || 0}</td><td>-</td></tr>
            <tr><td>Severe</td><td class="rpv-center">${cats.Severe?.incidents || 0}</td><td>-</td></tr>
          </tbody>
        </table>
        <div class="rpv-total-line">Total Violation Points: <b>${pts.violation_total || 0}</b> Points</div>

        <div class="rpv-p2-sub" style="margin-top:14px">B. Student Merit and Guidance Record</div>
        <table class="rpv-table rpv-merit">
          <thead><tr><th style="width:51%">Category</th><th style="width:14%">Points</th><th>Remarks</th></tr></thead>
          <tbody>
            <tr><td>Achievement/Role Model Award</td><td class="rpv-center">${pts.reward_total || 0}</td><td>-</td></tr>
            <tr><td>Violation Points</td><td class="rpv-center">${pts.violation_total || 0}</td><td>-</td></tr>
          </tbody>
        </table>
        <div class="rpv-total-line">Final Total Points: <b>${pts.final_total || 0}</b> Points</div>

        <!-- Tanggal -->
        <div class="rpv-date-center">
          <div><u>${escapeHtml(raporPreviewState.hijriDate || '-')}</u></div>
          <div>${escapeHtml(rpFmtDate(raporPreviewState.printDate))} CE</div>
        </div>

        <!-- Tanda Tangan -->
        <div class="rpv-signatures">
          <div>Parent / Guardian<div class="name">&nbsp;</div></div>
          <div>Principal<div class="principal-name">${escapeHtml(principalName || '_______________')}</div></div>
          <div>Homeroom Teacher, ${escapeHtml(cl.name || '-')}<div class="name">${escapeHtml(walasName || '_______________')}</div></div>
        </div>

        <!-- Team Area -->
        <div class="rpv-team-area">
          <div>
            <div class="rpv-team-title">Class Teaching Team, ${escapeHtml(cl.name || '-')}</div>
            <table class="rpv-team-simple"><tbody>${rpTeamRows(trs.team, trs.tahfizh, walasName)}</tbody></table>
          </div>
          <div>
            <div class="rpv-team-title">Position</div>
            <div class="rpv-position-list">${rpTeamPositions(trs.team, trs.tahfizh, walasName)}</div>
          </div>
        </div>

        <div class="rpv-footer"><span>SD Islam Tahfizh Cahaya Qur'an</span><span>Page 2 of 2</span></div>
      </section>
    </div>
  `;
  
  document.getElementById('rpv-preview')?.scrollIntoView({behavior:'smooth', block:'start'});
  requestAnimationFrame(rpFitPaperToViewport);
}

function rpFitPaperToViewport(){
  const wrap = document.getElementById('rpv-preview');
  if(!wrap) return;
  const pages = [...wrap.querySelectorAll('.rpv-paper')];
  if(!pages.length) return;
  const availableWidth = wrap.clientWidth;
  pages.forEach(page => {
    page.style.transform = '';
    page.style.marginBottom = '';
    const naturalWidth = page.offsetWidth;
    if(!availableWidth || !naturalWidth) return;
    if(availableWidth >= naturalWidth) return;
    const scale = Math.max(0.28, availableWidth / naturalWidth);
    page.style.transform = `scale(${scale})`;
    page.style.transformOrigin = 'top center';
    page.style.marginBottom = `${(page.offsetHeight * (1 - scale)) * -1}px`;
  });
}

function renderCetakRapor(content){
  console.log('renderCetakRapor dipanggil!');
  
  injectRaporPreviewStyles();
  
  raporPreviewState = {
    academicYear: '2026/2027',
    semester: 1,
    reportType: 'PTS',
    classes: [],
    classLocked: false,
    classId: '',
    students: [],
    studentId: '',
    startDate: rpDefaultStartYmd(),
    endDate: rpTodayYmd(),
    printDate: rpTodayYmd(),
    hijriDate: '',
    report: null,
    classReports: []
  };
  
  content.innerHTML = `
    <div class="page-title">Cetak Rapor</div>
    <div class="page-sub">Preview dan cetak rapor siswa sesuai kelas wali. Format mengikuti template resmi.</div>
    <div id="rpv-root"><div class="card"><span class="spinner"></span> Menyiapkan Rapor...</div></div>
  `;
  
  try{
    console.log('Memanggil reportPreviewRequest bootstrap...');
    reportPreviewRequest('bootstrap', {
      academic_year: raporPreviewState.academicYear,
      semester_no: raporPreviewState.semester
    }).then(b => {
      console.log('Bootstrap berhasil:', b);
      raporPreviewState.classes = b.classes || [];
      raporPreviewState.classLocked = Boolean(b.class_locked);
      raporPreviewState.classId = b.default_class_id || '';
      renderRaporControls();
      if(raporPreviewState.classId) rpLoadStudents();
    }).catch(e => {
      console.error('Error bootstrap:', e);
      document.getElementById('rpv-root').innerHTML = `<div class="card"><div class="ms-alert">${escapeHtml(e.message || 'Gagal membuka Rapor.')}</div></div>`;
    });
  } catch(e){
    console.error('Error di renderCetakRapor:', e);
    document.getElementById('rpv-root').innerHTML = `<div class="card"><div class="ms-alert">${escapeHtml(e.message || 'Gagal membuka Rapor.')}</div></div>`;
  }
}

function renderRaporControls(){
  const root = document.getElementById('rpv-root');
  if(!root) return;
  const className = raporPreviewState.classes.find(c => c.id === raporPreviewState.classId)?.name || '-';
  
  root.innerHTML = `
    <div class="card">
      <div class="card-title">Pengaturan Rapor</div>
      <div class="rpv-status-chip" style="margin-bottom:12px">Kelas Walas: ${escapeHtml(className)}</div>
      <div class="rpv-toolbar">
        <div class="rpv-field"><label>Jenis Rapor</label><select id="rpv-type" class="rpv-control" onchange="raporPreviewState.reportType=this.value;rpUpdatePrintUi()"><option value="PTS" ${raporPreviewState.reportType === 'PTS' ? 'selected' : ''}>PTS</option><option value="SEMESTER" ${raporPreviewState.reportType === 'SEMESTER' ? 'selected' : ''}>Akhir Semester</option></select></div>
        <div class="rpv-field"><label>Semester</label><select id="rpv-sem" class="rpv-control" onchange="rpChangeSemester(this.value)"><option value="1" ${Number(raporPreviewState.semester) === 1 ? 'selected' : ''}>Semester 1</option><option value="2" ${Number(raporPreviewState.semester) === 2 ? 'selected' : ''}>Semester 2</option></select></div>
        <div class="rpv-field"><label>Cetak Rapor</label><select id="rpv-mode" class="rpv-control" onchange="rpUpdatePrintUi()"><option value="STUDENT">Per Siswa</option><option value="CLASS">Per Kelas (ZIP)</option></select></div>
        <div class="rpv-field" id="rpv-student-field"><label>Siswa</label><select id="rpv-student" class="rpv-control" onchange="raporPreviewState.studentId=this.value"><option value="">— Pilih siswa —</option></select></div>
        <div class="rpv-field"><label>Data Mulai</label><input id="rpv-start" type="date" class="rpv-control" value="${raporPreviewState.startDate}"></div>
        <div class="rpv-field"><label>Data Selesai</label><input id="rpv-end" type="date" class="rpv-control" value="${raporPreviewState.endDate}"></div>
        <div class="rpv-field"><label>Tanggal Rapor</label><input id="rpv-print-date" type="date" class="rpv-control" value="${raporPreviewState.printDate}"></div>
        <div class="rpv-field"><label>Tanggal Hijriah (Opsional)</label><input id="rpv-hijri" class="rpv-control" value="${escapeHtml(raporPreviewState.hijriDate || '')}" placeholder="8 Muharram 1448 AH"></div>
      </div>
      <div class="rpv-actions">
        <button class="btn" id="rpv-preview-btn" onclick="rpPreviewByMode()">Preview Rapor</button>
        <button class="btn" id="rpv-print-btn" onclick="rpPrintByMode()">Cetak PDF</button>
      </div>
    </div>
    <div id="rpv-preview-area"></div>
  `;
  rpUpdatePrintUi();
}

function rpUpdatePrintUi(){
  const mode = document.getElementById('rpv-mode')?.value || 'STUDENT';
  const sf = document.getElementById('rpv-student-field');
  if(sf) sf.style.display = mode === 'STUDENT' ? 'block' : 'none';
  const pb = document.getElementById('rpv-print-btn');
  if(pb) pb.textContent = mode === 'CLASS' ? 'Cetak PDF Per Kelas (ZIP)' : 'Cetak PDF Per Siswa';
}

function rpPreviewByMode(){
  const mode = document.getElementById('rpv-mode')?.value || 'STUDENT';
  return mode === 'CLASS' ? rpLoadClassPreview(false) : rpLoadPreview();
}

function rpPrintByMode(){
  const mode = document.getElementById('rpv-mode')?.value || 'STUDENT';
  return mode === 'CLASS' ? rpLoadClassPreview(true) : rpPrintStudentPdf();
}

function rpChangeSemester(v){
  raporPreviewState.semester = Number(v) || 1;
  raporPreviewState.classId = '';
  raporPreviewState.studentId = '';
  raporPreviewState.report = null;
  
  reportPreviewRequest('bootstrap', {
    academic_year: raporPreviewState.academicYear,
    semester_no: raporPreviewState.semester
  }).then(b => {
    raporPreviewState.classes = b.classes || [];
    raporPreviewState.classLocked = Boolean(b.class_locked);
    raporPreviewState.classId = b.default_class_id || '';
    renderRaporControls();
    const sem = document.getElementById('rpv-sem');
    if(sem) sem.value = String(raporPreviewState.semester);
    if(raporPreviewState.classId) rpLoadStudents();
  }).catch(e => {
    showToast(e.message || 'Gagal mengganti semester', true);
  });
}

function rpLoadStudents(){
  const sel = document.getElementById('rpv-student');
  if(!sel || !raporPreviewState.classId) return;
  sel.disabled = true;
  sel.innerHTML = '<option>Memuat siswa...</option>';
  
  reportPreviewRequest('students', {
    academic_year: raporPreviewState.academicYear,
    semester_no: raporPreviewState.semester,
    class_id: raporPreviewState.classId
  }).then(d => {
    raporPreviewState.students = d.students || [];
    sel.innerHTML = '<option value="">— Pilih siswa —</option>' + 
      raporPreviewState.students.map(s => `<option value="${escapeHtml(s.id)}">${escapeHtml(s.name)} — ${escapeHtml(s.nis || s.nisn || '')}</option>`).join('');
    sel.disabled = false;
  }).catch(e => {
    sel.innerHTML = '<option value="">Gagal memuat siswa</option>';
    showToast(e.message || 'Gagal memuat siswa', true);
    sel.disabled = false;
  });
}

function rpLoadPreview(){
  const classId = raporPreviewState.classId;
  const studentId = document.getElementById('rpv-student')?.value || raporPreviewState.studentId || '';
  if(!classId){ showToast('Kelas belum tersedia.', true); return false; }
  if(!studentId){ showToast('Pilih siswa terlebih dahulu.', true); return false; }
  
  raporPreviewState.studentId = studentId;
  raporPreviewState.reportType = document.getElementById('rpv-type')?.value || 'PTS';
  raporPreviewState.startDate = document.getElementById('rpv-start')?.value || '';
  raporPreviewState.endDate = document.getElementById('rpv-end')?.value || '';
  raporPreviewState.printDate = document.getElementById('rpv-print-date')?.value || rpTodayYmd();
  raporPreviewState.hijriDate = (document.getElementById('rpv-hijri')?.value || '').trim();
  
  const btn = document.getElementById('rpv-preview-btn');
  const area = document.getElementById('rpv-preview-area');
  if(btn){ btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>Memuat...'; }
  if(area) area.innerHTML = '<div class="card"><span class="spinner"></span> Menyusun rapor siswa...</div>';
  
  reportPreviewRequest('preview', {
    academic_year: raporPreviewState.academicYear,
    semester_no: raporPreviewState.semester,
    class_id: classId,
    student_id: studentId,
    report_type: raporPreviewState.reportType,
    start_date: raporPreviewState.startDate,
    end_date: raporPreviewState.endDate
  }, 45000).then(d => {
    raporPreviewState.report = d.report;
    renderRaporPreview();
    if(btn){ btn.disabled = false; btn.textContent = 'Preview Siswa'; }
    return true;
  }).catch(e => {
    if(area) area.innerHTML = `<div class="card"><div class="ms-alert">${escapeHtml(e.message || 'Preview gagal dimuat.')}</div></div>`;
    if(btn){ btn.disabled = false; btn.textContent = 'Preview Siswa'; }
    return false;
  });
}

function rpPrintStudentPdf(){
  const btn = document.getElementById('rpv-print-btn');
  if(btn){ btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>Menyiapkan PDF...'; }
  
  const ok = rpLoadPreview();
  if(!ok) {
    if(btn){ btn.disabled = false; btn.textContent = 'Cetak PDF Per Siswa'; }
    return;
  }
  
  setTimeout(() => {
    const el = document.getElementById('rpv-preview');
    if(!el){ 
      showToast('Preview PDF tidak ditemukan.', true);
      if(btn){ btn.disabled = false; btn.textContent = 'Cetak PDF Per Siswa'; }
      return; 
    }
    
    rpElementPdfBlob(el).then(blob => {
      const name = rpSafeFilename(raporPreviewState.report?.student?.name || 'Rapor') + '.pdf';
      rpDownloadBlob(blob, name);
      showToast('PDF rapor berhasil dibuat.');
      if(btn){ btn.disabled = false; btn.textContent = 'Cetak PDF Per Siswa'; }
    }).catch(e => {
      showToast(e.message || 'Gagal membuat PDF.', true);
      if(btn){ btn.disabled = false; btn.textContent = 'Cetak PDF Per Siswa'; }
    });
  }, 1500);
}

function rpLoadClassPreview(autoPrint = false){
  const classId = raporPreviewState.classId;
  if(!classId){ showToast('Kelas Walas belum ditemukan.', true); return; }
  
  raporPreviewState.reportType = document.getElementById('rpv-type')?.value || 'PTS';
  raporPreviewState.startDate = document.getElementById('rpv-start')?.value || '';
  raporPreviewState.endDate = document.getElementById('rpv-end')?.value || '';
  raporPreviewState.printDate = document.getElementById('rpv-print-date')?.value || rpTodayYmd();
  raporPreviewState.hijriDate = (document.getElementById('rpv-hijri')?.value || '').trim();
  
  const btn = autoPrint ? document.getElementById('rpv-print-btn') : document.getElementById('rpv-preview-btn');
  const area = document.getElementById('rpv-preview-area');
  if(btn){ btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>Menyiapkan...'; }
  if(area) area.innerHTML = '<div class="card"><span class="spinner"></span> Menyusun seluruh rapor kelas. Mohon tunggu...</div>';
  
  reportPreviewRequest('class_reports', {
    academic_year: raporPreviewState.academicYear,
    semester_no: raporPreviewState.semester,
    class_id: classId,
    report_type: raporPreviewState.reportType,
    start_date: raporPreviewState.startDate,
    end_date: raporPreviewState.endDate
  }, 120000).then(d => {
    const reports = Array.isArray(d.reports) ? d.reports : [];
    if(!reports.length) throw new Error('Tidak ada siswa aktif pada kelas ini.');
    raporPreviewState.classReports = reports;
    
    if(autoPrint){
      rpEnsurePdfLibs(true).then(() => {
        const zip = new window.JSZip();
        const original = raporPreviewState.report;
        let completed = 0;
        
        reports.forEach((report, i) => {
          raporPreviewState.report = report;
          renderRaporPreview();
          const el = document.getElementById('rpv-preview');
          if(!el) { completed++; return; }
          if(btn) btn.textContent = `PDF ${i+1}/${reports.length}`;
          
          rpElementPdfBlob(el).then(blob => {
            zip.file(rpSafeFilename(report?.student?.name || `Siswa ${i+1}`) + '.pdf', blob);
            completed++;
            if(completed === reports.length) {
              raporPreviewState.report = original || reports[0];
              const cl = reports[0]?.class?.name || 'Kelas';
              const label = raporPreviewState.reportType === 'SEMESTER' ? 'Rapor Akhir Semester' : 'Rapor PTS';
              zip.generateAsync({type:'blob', compression:'DEFLATE', compressionOptions:{level:6}}).then(zblob => {
                rpDownloadBlob(zblob, `${label} ${rpSafeFilename(cl)}.zip`);
                showToast('ZIP rapor per kelas berhasil dibuat.');
                if(btn){ btn.disabled = false; btn.textContent = autoPrint ? 'Cetak PDF Per Kelas (ZIP)' : 'Preview Rapor'; }
              });
            }
          }).catch(e => {
            completed++;
            if(completed === reports.length) {
              raporPreviewState.report = original || reports[0];
              if(btn){ btn.disabled = false; btn.textContent = autoPrint ? 'Cetak PDF Per Kelas (ZIP)' : 'Preview Rapor'; }
            }
          });
        });
      });
      return;
    }
    
    const first = reports[0];
    raporPreviewState.report = first;
    renderRaporPreview();
    if(btn){ btn.disabled = false; btn.textContent = 'Preview Rapor'; }
  }).catch(e => {
    if(area) area.innerHTML = `<div class="card"><div class="ms-alert">${escapeHtml(e.message || 'Gagal membuat rapor kelas.')}</div></div>`;
    if(btn){ btn.disabled = false; btn.textContent = autoPrint ? 'Cetak PDF Per Kelas (ZIP)' : 'Preview Rapor'; }
  });
}

// ==========================================================
// MODULE_GROUPS & DASHBOARD_MODULE (SETELAH SEMUA FUNGSI RENDER)
// ==========================================================

const MODULE_GROUPS = [
  {
    id: 'akademik', label: 'Akademik', roles: ['guru','walas','akademik','pimpinan'],
    items: [
      { id: 'leger', label: 'Nilai', roles: ['guru','walas','akademik','pimpinan'], built: true, render: renderLegger },
      { id: 'bilingual', label: 'Bilingual', roles: ['guru','walas','akademik','pimpinan'], built: true, render: renderVocabularyBulanan },
      { id: 'pjbl', label: 'PjBL', roles: ['guru','walas','akademik','pimpinan'], built: true, render: renderPjBL },
      { id: 'rapor', label: 'Cetak Rapor', roles: ['walas','akademik','pimpinan'], built: true, render: renderCetakRapor }
    ]
  },
  {
    id: 'kesiswaan', label: 'Kesiswaan', roles: ['guru','walas','kesiswaan','pimpinan'],
    items: [
      { id: 'absensi', label: 'Absensi (Morning Talk)', roles: ['walas','kesiswaan','pimpinan'], built: true, render: renderAbsensi },
      { id: 'kedisiplinan', label: 'Kedisiplinan', roles: ['guru','walas','kesiswaan','pimpinan'], built: true, render: renderKedisiplinan },
      { id: 'reward', label: 'Reward Siswa', roles: ['guru','walas','kesiswaan','pimpinan'], built: true, render: renderReward },
      { id: 'masalah', label: 'Masalah Siswa', roles: ['walas','kesiswaan','pimpinan'], built: true, render: renderMasalahSiswa }
    ]
  },
  {
    id: 'info', label: 'Info', roles: ['walas','kesiswaan','kegiatan','pimpinan'],
    items: [
      { id: 'ekskul', label: 'Ekskul', roles: ['walas','kesiswaan','kegiatan','pimpinan'], built: true, render: renderEkskulRekap }
    ]
  },
  {
    id: 'laporan', label: 'Laporan', roles: ['walas','kesiswaan','pimpinan'],
    items: [
      { id: 'laporan-guru', label: 'Laporan Guru Bulanan', roles: ['walas','kesiswaan','pimpinan'], built: true, render: renderLaporanGuru },
      { id: 'laporan-unduh', label: 'Unduh Rekap', roles: ['kesiswaan','pimpinan'], built: false }
    ]
  }
];

const DASHBOARD_MODULE = { 
  id: 'dashboard', 
  label: 'Dashboard', 
  roles: ['walas','kesiswaan','pimpinan'], 
  built: true, 
  render: renderDashboard 
};

// ==========================================================
// FUNGSI NAVIGASI (SETELAH MODULE_GROUPS)
// ==========================================================

function findModuleByIdV2(id) {
  if (id === 'dashboard') return DASHBOARD_MODULE;
  for (const g of MODULE_GROUPS) {
    const found = g.items.find(m => m.id === id);
    if (found) return found;
  }
  return null;
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
