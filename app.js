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
    id: 'akademik', label: 'Akademik', roles: ['guru','walas','akademik','pimpinan'],
    items: [
      { id: 'leger',      label: 'Nilai', roles: ['guru','walas','akademik','pimpinan'], built: true,  render: renderLegger },
      { id: 'bilingual',  label: 'Bilingual', roles: ['guru','walas','akademik','pimpinan'], built: true, render: renderVocabularyBulanan },
      { id: 'pjbl',       label: 'PjBL',        roles: ['guru','walas','akademik','pimpinan'], built: true,  render: renderPjBL },
      { id: 'rapor',    label: 'Cetak Rapor', roles: ['walas','akademik','pimpinan'], built: true,  render: renderCetakRapor }
    ]
  },
  {
    id: 'kesiswaan', label: 'Kesiswaan', roles: ['guru','walas','kesiswaan','pimpinan'],
    items: [
      { id: 'absensi',      label: 'Absensi (Morning Talk)', roles: ['walas','kesiswaan','pimpinan'], built: true, render: renderAbsensi },
      { id: 'kedisiplinan', label: 'Kedisiplinan',           roles: ['guru','walas','kesiswaan','pimpinan'], built: true, render: renderKedisiplinan },
      { id: 'reward',       label: 'Reward Siswa',           roles: ['guru','walas','kesiswaan','pimpinan'], built: true, render: renderReward },
      { id: 'masalah',      label: 'Masalah Siswa',          roles: ['walas','kesiswaan','pimpinan'], built: true, render: renderMasalahSiswa }
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
   MODUL: CATATAN MASALAH SISWA — SUPABASE V6
   ========================================================== */
let masalahState = {
  kelasId: '',
  kelas: '',
  classes: [],
  classLocked: false,
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

async function studentCaseRequest(action,payload={},timeoutMs=20000){
  const token=getAuthToken();
  if(!token) throw new Error('Sesi login tidak ditemukan. Silakan masuk kembali.');
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
    const response=await fetch(STUDENT_CASES_URL,{
      method:'POST',
      headers:{
        'Content-Type':'application/json',
        'apikey':SUPABASE_PUBLISHABLE_KEY,
        'Authorization':`Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
        'x-session-token':token
      },
      body:JSON.stringify({action,...payload}),
      signal:controller.signal
    });
    const raw=await response.text();
    let data={};
    try{ data=raw?JSON.parse(raw):{}; }catch(_){ throw new Error(`Respons Masalah Siswa bukan JSON. HTTP ${response.status}.`); }
    if(!response.ok||data.success===false){
      const map={
        session_invalid:'Sesi login sudah tidak berlaku.',session_expired:'Sesi login telah berakhir.',forbidden:'Akun ini tidak memiliki akses Masalah Siswa.',
        class_forbidden:'Kelas tidak berada dalam akses akun ini.',student_not_in_class:'Siswa tidak ditemukan pada kelas aktif.',story_too_short:'Cerita kejadian minimal 20 karakter.',
        invalid_date:'Tanggal kejadian tidak valid.',invalid_risk:'Pilihan risiko keselamatan tidak valid.',final_suggestion_required:'Saran final tidak boleh kosong.'
      };
      throw new Error(map[data.error]||data.error||`HTTP ${response.status}`);
    }
    return data;
  }catch(err){
    if(err?.name==='AbortError') throw new Error('Server Masalah Siswa terlalu lama merespons. Silakan coba lagi.');
    throw err;
  }finally{ clearTimeout(timer); }
}

function injectMasalahV55Styles(){
  if(document.getElementById('ms-v55-style')) return;
  const s=document.createElement('style');s.id='ms-v55-style';
  s.textContent=`
    .ms-v55-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap}
    .ms-v55-chip{display:inline-flex;align-items:center;gap:6px;padding:6px 10px;border-radius:999px;background:#eaf7f6;color:var(--primary);font-size:10px;font-weight:900}
    .ms-v55-picker{position:relative}.ms-v55-trigger{width:100%;display:flex;align-items:center;justify-content:space-between;gap:10px;text-align:left;background:#fff;cursor:pointer}
    .ms-v55-pop{position:absolute;z-index:50;left:0;right:0;top:calc(100% + 6px);background:#fff;border:1px solid var(--border);border-radius:13px;padding:9px;box-shadow:0 14px 34px rgba(20,60,58,.14)}
    .ms-v55-list{max-height:260px;overflow:auto;border:1px solid var(--border);border-radius:10px}.ms-v55-option{width:100%;border:0;border-bottom:1px solid var(--border);background:#fff;padding:10px 12px;text-align:left;cursor:pointer;font:inherit;font-size:11.5px;font-weight:800;color:var(--text)}
    .ms-v55-option:last-child{border-bottom:0}.ms-v55-option:hover{background:#eff9f8}.ms-v55-filters{display:flex;gap:8px;flex-wrap:wrap}.ms-v55-filters input,.ms-v55-filters select{min-width:190px}
    .ms-v55-save{display:flex;justify-content:center;margin-top:16px}.ms-v55-save .btn{min-width:220px;display:inline-flex;align-items:center;justify-content:center;gap:8px}
    @media(max-width:700px){.ms-v55-filters{width:100%}.ms-v55-filters input,.ms-v55-filters select{width:100%;min-width:0}}
  `;
  document.head.appendChild(s);
}
function msV55ToggleStudent(force){
  const box=document.getElementById('ms-v55-student-pop');if(!box)return;
  const open=typeof force==='boolean'?force:box.hidden;box.hidden=!open;
  if(open){const q=document.getElementById('ms-v55-student-search');if(q){q.focus();q.select()}}
}
function msV55FilterStudent(){
  const q=(document.getElementById('ms-v55-student-search')?.value||'').toLowerCase().trim();
  document.querySelectorAll('#ms-v55-student-list .ms-v55-option').forEach(el=>el.style.display=(el.dataset.search||'').includes(q)?'block':'none');
}
function msV55PickStudent(id,nama){
  const hidden=document.getElementById('ms-siswa'),label=document.getElementById('ms-v55-student-label');
  if(hidden)hidden.value=id;if(label)label.innerHTML=`<b>${escapeHtml(nama)}</b>`;msV55ToggleStudent(false);
}

async function renderMasalahSiswa(content){
  injectMasalahV55Styles();
  masalahState={kelasId:'',kelas:'',classes:[],classLocked:false,siswa:[],tab:'baru',analisisAI:null,riwayat:[]};
  content.innerHTML=`
    <div class="page-title">Catatan Masalah Siswa</div>
    <div class="page-sub">Catat kejadian secara faktual dan simpan tindak lanjut langsung ke Supabase.</div>
    <div class="card"><span class="spinner" style="border-top-color:var(--primary);border-color:rgba(10,110,110,.25)"></span>Memuat akses kelas...</div>`;
  try{
    const boot=await studentCaseRequest('bootstrap');
    masalahState.classes=boot.classes||[];masalahState.classLocked=Boolean(boot.class_locked);
    if(boot.default_class_id){masalahState.kelasId=boot.default_class_id;masalahState.kelas=boot.default_class_name||''}
    const options=masalahState.classes.map(c=>`<option value="${escapeHtml(c.id)}" ${c.id===masalahState.kelasId?'selected':''}>${escapeHtml(c.name)}</option>`).join('');
    content.innerHTML=`
      <div class="page-title">Catatan Masalah Siswa</div>
      <div class="page-sub">Catat kejadian secara faktual, susun tindak lanjut, dan simpan riwayat penanganan.</div>
      ${masalahState.classLocked?'':`<div class="card"><div class="card-title">Pilih Kelas</div><select id="ms-kelas-input" class="pv2-control" style="width:100%"><option value="">— Pilih kelas —</option>${options}</select></div>`}
      <div id="ms-body"></div>`;
    if(masalahState.classLocked){await loadMasalahKelas();}
    else{
      const sel=document.getElementById('ms-kelas-input');
      sel?.addEventListener('change',async()=>{const c=masalahState.classes.find(x=>x.id===sel.value);masalahState.kelasId=sel.value;masalahState.kelas=c?.name||'';masalahState.tab='baru';masalahState.analisisAI=null;await loadMasalahKelas();});
    }
  }catch(err){content.innerHTML+=`<div class="empty-state"><div class="icon">—</div>${escapeHtml(err.message||'Gagal memuat Masalah Siswa.')}</div>`}
}

async function loadMasalahKelas(){
  if(!masalahState.kelasId) return;
  const body=document.getElementById('ms-body');if(!body)return;
  body.innerHTML=`<div class="card"><span class="spinner" style="border-top-color:var(--primary);border-color:rgba(10,110,110,.25)"></span>Memuat data siswa...</div>`;
  try{
    const res=await studentCaseRequest('students',{class_id:masalahState.kelasId});
    masalahState.siswa=(res.students||[]).slice().sort((a,b)=>String(a.name).localeCompare(String(b.name),'id'));
    renderMasalahShell();
  }catch(err){body.innerHTML=`<div class="empty-state"><div class="icon">—</div>${escapeHtml(err.message||'Gagal memuat siswa.')}</div>`}
}
function renderMasalahShell(){
  const body=document.getElementById('ms-body');if(!body)return;
  if(!masalahState.siswa.length){body.innerHTML=`<div class="empty-state"><div class="icon">—</div>Belum ada siswa aktif untuk kelas ${escapeHtml(masalahState.kelas||'-')}.</div>`;return}
  body.innerHTML=`<div class="ms-tabs"><button class="ms-tab ${masalahState.tab==='baru'?'active':''}" onclick="switchMasalahTab('baru')">+ Laporan Baru</button><button class="ms-tab ${masalahState.tab==='riwayat'?'active':''}" onclick="switchMasalahTab('riwayat')">Riwayat</button></div><div id="ms-tab-content"></div>`;
  renderMasalahTab();
}
function switchMasalahTab(tab){masalahState.tab=tab;masalahState.analisisAI=null;renderMasalahShell()}
function renderMasalahTab(){if(masalahState.tab==='riwayat')loadRiwayatMasalah();else renderFormMasalah()}
function renderFormMasalah(){
  const area=document.getElementById('ms-tab-content');
  const siswaButtons=masalahState.siswa.map(s=>`<button type="button" class="ms-v55-option" data-search="${escapeHtml(String(s.name||'').toLowerCase())}" onclick="msV55PickStudent('${escapeHtml(s.id)}','${escapeHtml(s.name)}')">${escapeHtml(s.name)}</button>`).join('');
  area.innerHTML=`
    <div class="card">
      <div class="ms-v55-head"><div><div class="card-title" style="margin:0">Laporan Masalah Siswa</div><div class="ms-help">Tuliskan fakta yang terlihat atau terdengar. Hindari label atau diagnosis.</div></div><span class="ms-v55-chip">${escapeHtml(masalahState.kelas||'')}</span></div>
      <div class="ms-grid" style="margin-top:14px">
        <div class="ms-field ms-v55-picker"><label>Nama siswa</label><input type="hidden" id="ms-siswa"><button type="button" class="pv2-control ms-v55-trigger" onclick="msV55ToggleStudent()"><span id="ms-v55-student-label">— Pilih / cari siswa —</span>${pointSvg('down',16)}</button><div class="ms-v55-pop" id="ms-v55-student-pop" hidden><input class="pv2-control" id="ms-v55-student-search" placeholder="Ketik nama siswa..." oninput="msV55FilterStudent()"><div class="ms-v55-list" id="ms-v55-student-list">${siswaButtons}</div></div></div>
        <div class="ms-field"><label>Tanggal kejadian</label><input type="date" id="ms-tanggal" value="${todayStrMasalah()}"></div>
      </div>
      <div class="ms-field"><label>Ceritakan masalah atau kejadian</label><textarea id="ms-cerita" class="ms-story" maxlength="5000" oninput="updateMasalahCount()" placeholder="Contoh: Saat pelajaran Matematika pukul 09.15, siswa meninggalkan kursi beberapa kali dan belum mulai mengerjakan meskipun instruksi sudah diulang..."></textarea><div class="ms-char-count" id="ms-char-count">0 / 5000</div></div>
      <div class="ms-field"><label>Tindakan awal yang sudah dilakukan <span style="font-weight:400;color:var(--muted)">(opsional)</span></label><textarea id="ms-tindakan" placeholder="Contoh: diajak bicara secara pribadi, dipindahkan tempat duduk, diberi waktu menenangkan diri."></textarea></div>
      <div class="ms-field" style="max-width:360px"><label>Apakah ada risiko keselamatan?</label><select id="ms-risiko"><option value="Tidak">Tidak</option><option value="Tidak yakin">Tidak yakin</option><option value="Ya">Ya</option></select></div>
      <div class="ms-actions"><button class="btn" id="ms-ai-btn" onclick="generateSaranMasalahAI()">Susun Saran Penanganan</button><span class="ms-help">Saran dibuat cepat dari cerita dan aturan pendampingan; tetap ditinjau walas sebelum disimpan.</span></div>
    </div><div id="ms-ai-result"></div>`;
}
function updateMasalahCount(){const el=document.getElementById('ms-cerita'),count=document.getElementById('ms-char-count');if(el&&count)count.textContent=`${el.value.length} / 5000`}
function getSelectedSiswaMasalah(){const id=document.getElementById('ms-siswa')?.value||'';return masalahState.siswa.find(s=>String(s.id)===String(id))||null}

async function generateSaranMasalahAI(){
  const siswa=getSelectedSiswaMasalah(),tanggal=document.getElementById('ms-tanggal')?.value||'',cerita=document.getElementById('ms-cerita')?.value.trim()||'',tindakan=document.getElementById('ms-tindakan')?.value.trim()||'',risiko=document.getElementById('ms-risiko')?.value||'Tidak';
  if(!siswa){showToast('Pilih siswa terlebih dahulu.',true);return}if(cerita.length<20){showToast('Cerita kejadian minimal 20 karakter.',true);return}if(!tanggal){showToast('Pilih tanggal kejadian.',true);return}
  const btn=document.getElementById('ms-ai-btn'),result=document.getElementById('ms-ai-result');btn.disabled=true;btn.innerHTML='<span class="spinner"></span>Menyusun...';
  result.innerHTML=`<div class="card"><span class="spinner" style="border-top-color:var(--primary);border-color:rgba(10,110,110,.25)"></span>Menyusun saran penanganan...</div>`;
  try{
    const res=await studentCaseRequest('suggest',{class_id:masalahState.kelasId,student_id:siswa.id,incident_date:tanggal,story:cerita,initial_action:tindakan,safety_risk:risiko});
    masalahState.analisisAI=res.data;renderHasilMasalahAI(siswa,tanggal,cerita,tindakan,risiko);
  }catch(err){result.innerHTML=`<div class="card"><div class="ms-alert"><strong>Saran belum berhasil disusun.</strong><br>${escapeHtml(err.message||'Terjadi kendala.')}</div></div>`}
  finally{btn.disabled=false;btn.textContent='Susun Saran Penanganan'}
}
function renderListMasalah(items){return Array.isArray(items)&&items.length?`<ul>${items.map(x=>`<li>${escapeHtml(x)}</li>`).join('')}</ul>`:'<p>-</p>'}
function formatSaranFinalMasalah(ai){
  const p=[];if(ai.penangananLangsung?.length)p.push('Penanganan langsung:\n- '+ai.penangananLangsung.join('\n- '));if(ai.strategiKelas?.length)p.push('Strategi di kelas:\n- '+ai.strategiKelas.join('\n- '));if(ai.saranOrangTua)p.push('Koordinasi orang tua:\n'+ai.saranOrangTua);if(ai.rencanaPemantauan?.length)p.push('Pemantauan:\n- '+ai.rencanaPemantauan.join('\n- '));if(ai.saranEskalasi)p.push('Eskalasi:\n'+ai.saranEskalasi);return p.join('\n\n')
}
function renderHasilMasalahAI(siswa,tanggal,cerita,tindakan,risiko){
  const ai=masalahState.analisisAI,result=document.getElementById('ms-ai-result');if(!ai||!result)return;
  const urgent=Boolean(ai.mendesak)||risiko==='Ya';const flags=[ai.perluOrangTua?'Orang tua':'',ai.perluKesiswaan?'Kesiswaan':'',ai.perluUKS?'UKS':''].filter(Boolean);const finalText=formatSaranFinalMasalah(ai);
  result.innerHTML=`<div class="card">
    ${urgent?`<div class="ms-alert"><strong>Perlu perhatian segera.</strong><br>Utamakan keselamatan siswa dan teruskan kepada Kesiswaan/Pimpinan sesuai prosedur sekolah.</div>`:''}
    <div class="ms-ai-head"><div><div class="ms-ai-title">Saran Penanganan &amp; Tindak Lanjut</div><div class="ms-badges"><span class="ms-badge">${escapeHtml(ai.kategori||'-')}</span><span class="ms-badge attention">${escapeHtml(ai.tingkatPerhatian||'-')}</span><span class="ms-badge ${urgent?'urgent':'safe'}">${urgent?'Mendesak':'Perlu ditinjau walas'}</span>${flags.map(x=>`<span class="ms-badge">Koordinasi: ${escapeHtml(x)}</span>`).join('')}</div></div><div style="font-size:11.5px;color:var(--muted);text-align:right">Evaluasi: <strong>${escapeHtml(ai.tanggalEvaluasi||'-')}</strong></div></div>
    <div class="ms-ai-section"><h4>Masalah utama</h4><p>${escapeHtml(ai.masalahUtama||'-')}</p></div><div class="ms-ai-section"><h4>Ringkasan situasi</h4><p>${escapeHtml(ai.ringkasan||'-')}</p></div>
    <div class="ms-grid"><div class="ms-ai-section"><h4>Kemungkinan kebutuhan siswa</h4>${renderListMasalah(ai.kemungkinanKebutuhan)}</div><div class="ms-ai-section"><h4>Tujuan pendampingan</h4>${renderListMasalah(ai.tujuanPendampingan)}</div></div>
    <div class="ms-ai-section"><h4>Penanganan langsung</h4>${renderListMasalah(ai.penangananLangsung)}</div><div class="ms-ai-section"><h4>Strategi di kelas</h4>${renderListMasalah(ai.strategiKelas)}</div>
    <div class="ms-ai-section"><h4>Contoh kalimat guru</h4><p>${escapeHtml(ai.kalimatGuru||'-')}</p></div><div class="ms-ai-section"><h4>Koordinasi dengan orang tua</h4><p>${escapeHtml(ai.saranOrangTua||'-')}</p></div>
    <div class="ms-grid"><div class="ms-ai-section"><h4>Rencana pemantauan</h4>${renderListMasalah(ai.rencanaPemantauan)}</div><div class="ms-ai-section"><h4>Indikator perbaikan</h4>${renderListMasalah(ai.indikatorPerbaikan)}</div></div>
    <div class="ms-ai-section"><h4>Kapan perlu diteruskan</h4><p>${escapeHtml(ai.saranEskalasi||'-')}</p></div><div class="ms-ai-section"><h4>Hal yang perlu dihindari</h4>${renderListMasalah(ai.halDihindari)}</div>
    <div class="ms-final-box"><div class="ms-field" style="margin:0"><label>Saran final setelah ditinjau walas</label><textarea id="ms-saran-final" style="min-height:280px">${escapeHtml(finalText)}</textarea><div class="ms-help">Boleh diedit sebelum disimpan.</div></div></div>
    <div class="ms-v55-save"><button class="btn" id="ms-save-btn" onclick="saveCatatanMasalah()">${pointSvg('save',16)} Simpan Laporan</button></div></div>`;
  result.dataset.studentId=siswa.id;result.dataset.tanggal=tanggal;result.dataset.cerita=cerita;result.dataset.tindakan=tindakan;result.dataset.risiko=risiko;result.scrollIntoView({behavior:'smooth',block:'start'});
}
async function saveCatatanMasalah(){
  const result=document.getElementById('ms-ai-result'),btn=document.getElementById('ms-save-btn'),saranFinal=document.getElementById('ms-saran-final')?.value.trim()||'';
  if(!masalahState.analisisAI){showToast('Susun saran penanganan terlebih dahulu.',true);return}if(!saranFinal){showToast('Saran final tidak boleh kosong.',true);return}
  btn.disabled=true;btn.innerHTML='<span class="spinner"></span>Menyimpan...';
  try{
    await studentCaseRequest('save',{class_id:masalahState.kelasId,student_id:result.dataset.studentId,incident_date:result.dataset.tanggal,story:result.dataset.cerita,initial_action:result.dataset.tindakan,safety_risk:result.dataset.risiko,recommendation:masalahState.analisisAI,final_suggestion:saranFinal});
    showToast('Laporan masalah siswa berhasil disimpan ke Supabase.');masalahState.analisisAI=null;masalahState.tab='riwayat';renderMasalahShell();
  }catch(err){showToast(err.message||'Gagal menyimpan laporan.',true)}finally{if(document.getElementById('ms-save-btn')){btn.disabled=false;btn.innerHTML=`${pointSvg('save',16)} Simpan Laporan`}}
}
async function loadRiwayatMasalah(){
  const area=document.getElementById('ms-tab-content');area.innerHTML=`<div class="card"><span class="spinner" style="border-top-color:var(--primary);border-color:rgba(10,110,110,.25)"></span>Memuat riwayat laporan...</div>`;
  try{const res=await studentCaseRequest('history',{class_id:masalahState.kelasId,limit:50});masalahState.riwayat=res.data||[];renderRiwayatMasalah()}catch(err){area.innerHTML=`<div class="empty-state"><div class="icon">—</div>${escapeHtml(err.message||'Gagal memuat riwayat.')}</div>`}
}
function renderRiwayatMasalah(){
  const area=document.getElementById('ms-tab-content');if(!masalahState.riwayat.length){area.innerHTML=`<div class="empty-state"><div class="icon">—</div>Belum ada catatan masalah siswa untuk kelas ini.</div>`;return}
  area.innerHTML=`<div class="card"><div class="ms-history-toolbar"><div><div class="card-title" style="margin:0">Riwayat Catatan</div><div class="ms-help">${masalahState.riwayat.length} laporan terbaru</div></div><div class="ms-v55-filters"><input type="search" id="ms-history-search" placeholder="Cari nama atau masalah..." oninput="filterRiwayatMasalah()" class="pv2-control"><select id="ms-history-status" class="pv2-control" onchange="filterRiwayatMasalah()"><option value="">Semua status</option><option value="baru">Baru</option><option value="diteruskan ke kesiswaan">Diteruskan ke Kesiswaan</option></select></div></div><div class="ms-history-list" id="ms-history-list"></div></div>`;drawRiwayatMasalah(masalahState.riwayat)
}
function filterRiwayatMasalah(){const q=(document.getElementById('ms-history-search')?.value||'').toLowerCase().trim(),status=(document.getElementById('ms-history-status')?.value||'').toLowerCase();drawRiwayatMasalah(masalahState.riwayat.filter(r=>[r.namaSiswa,r.masalahUtama,r.kategori,r.ringkasan,r.status].join(' ').toLowerCase().includes(q)&&(!status||String(r.status||'').toLowerCase()===status)))}
function drawRiwayatMasalah(data){
  const list=document.getElementById('ms-history-list');if(!list)return;if(!data.length){list.innerHTML=`<div class="empty-state" style="padding:30px 10px">Tidak ada laporan yang cocok.</div>`;return}
  list.innerHTML=data.map((r,index)=>{const urgent=Boolean(r.mendesak),flags=[r.perluOrangTua?'Orang tua':'',r.perluKesiswaan?'Kesiswaan':'',r.perluUKS?'UKS':''].filter(Boolean).join(', ');return `<div class="ms-history-card" id="ms-history-${index}"><div class="ms-history-top"><div><div class="ms-history-name">${escapeHtml(r.namaSiswa||'-')}</div><div class="ms-history-meta">${escapeHtml(r.tanggalKejadian||'-')} · ${escapeHtml(r.kategori||'-')} · ${escapeHtml(r.tingkatPerhatian||'-')}</div></div><span class="ms-status" style="${urgent?'background:#FDF0EC;border-color:#E8B8AA;color:var(--danger)':''}">${escapeHtml(r.status||'Baru')}</span></div><div class="ms-history-summary"><strong>${escapeHtml(r.masalahUtama||'-')}</strong><br>${escapeHtml(r.ringkasan||'')}</div><button class="ms-link-btn" onclick="toggleRiwayatMasalah('ms-history-${index}',this)">Lihat detail</button><div class="ms-history-detail"><div class="ms-ai-section"><h4>Cerita walas</h4><p>${escapeHtml(r.ceritaWalas||'-')}</p></div><div class="ms-ai-section"><h4>Tindakan awal</h4><p>${escapeHtml(r.tindakanAwal||'-')}</p></div><div class="ms-ai-section"><h4>Saran final</h4><p>${escapeHtml(r.saranFinal||'-')}</p></div><div class="ms-help">Evaluasi: ${escapeHtml(r.tanggalEvaluasi||'-')} ${flags?'· Koordinasi: '+escapeHtml(flags):''} · Dicatat oleh: ${escapeHtml(r.dicatatOleh||'-')}</div></div></div>`}).join('')
}
function toggleRiwayatMasalah(id,button){const card=document.getElementById(id);if(!card)return;const open=card.classList.toggle('open');button.textContent=open?'Tutup detail':'Lihat detail'}

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
   HELPER: JENJANG DARI KELAS (dipakai lintas modul Legger & CP)
   ========================================================== */
function legerJenjangDariKelas(kelas){
  const m = String(kelas || '').trim().match(/^(\d+)/);
  return m ? Number(m[1]) : null;
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
   MODUL: KEDISIPLINAN & REWARD V2 — SUPABASE
   - Cepat: cache master + cache siswa, snapshot 1 request
   - Walas: kelas otomatis, tidak ditanya ulang
   - 2 mode input: Per Siswa / Per Jenis
   - Edit + soft delete + rekap + eskalasi
   - Hak akses sesuai tupoksi
   - Ikon SVG, tanpa emoji
   ========================================================== */

const POINT_V2 = {
  boot: null,
  bootAt: 0,
  studentCache: new Map(),
  activeKind: 'violation',
  activeMode: { violation:'student', reward:'student' },
  classId: { violation:'', reward:'' },
  studentId: { violation:'', reward:'' },
  snapshot: { violation:null, reward:null },
  edit: null
};

function pointSvg(name, size=18){
  const attrs=`width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"`;
  const p={
    user:`<svg ${attrs}><path d="M20 21a8 8 0 0 0-16 0"/><circle cx="12" cy="7" r="4"/></svg>`,
    users:`<svg ${attrs}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
    alert:`<svg ${attrs}><path d="M10.3 2.9 1.8 17a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 2.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>`,
    gift:`<svg ${attrs}><rect x="3" y="8" width="18" height="13" rx="2"/><path d="M12 8v13"/><path d="M3 12h18"/><path d="M7.5 8C5.6 8 4 6.8 4 5.3S5.2 3 6.7 3C9 3 12 8 12 8"/><path d="M16.5 8C18.4 8 20 6.8 20 5.3S18.8 3 17.3 3C15 3 12 8 12 8"/></svg>`,
    edit:`<svg ${attrs}><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/></svg>`,
    trash:`<svg ${attrs}><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 15H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>`,
    save:`<svg ${attrs}><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z"/><path d="M17 21v-8H7v8"/><path d="M7 3v5h8"/></svg>`,
    list:`<svg ${attrs}><path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M3 6h.01"/><path d="M3 12h.01"/><path d="M3 18h.01"/></svg>`,
    chart:`<svg ${attrs}><path d="M3 3v18h18"/><path d="m7 16 4-5 4 3 4-7"/></svg>`,
    check:`<svg ${attrs}><path d="m20 6-11 11-5-5"/></svg>`,
    search:`<svg ${attrs}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.2-3.2"/></svg>`,
    down:`<svg ${attrs}><path d="m6 9 6 6 6-6"/></svg>`,
    chevron:`<svg ${attrs}><path d="m9 18 6-6-6-6"/></svg>`
  };
  return p[name]||p.check;
}

function injectPointV2Styles(){
  if(document.getElementById('point-v2-style'))return;
  const s=document.createElement('style');s.id='point-v2-style';
  s.textContent=`
  .pv2-toolbar{display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap}
  .pv2-tabs{display:inline-flex;background:#edf4f4;padding:4px;border-radius:12px;gap:4px}
  .pv2-tab{border:0;background:transparent;padding:9px 14px;border-radius:9px;font:inherit;font-size:12px;font-weight:850;color:var(--muted);cursor:pointer;display:inline-flex;align-items:center;gap:7px}
  .pv2-tab.active{background:#fff;color:var(--primary);box-shadow:0 2px 8px rgba(0,0,0,.06)}
  .pv2-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:13px}
  .pv2-grid3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:13px}
  .pv2-label{display:block;font-size:10.5px;font-weight:900;color:var(--muted);text-transform:uppercase;letter-spacing:.04em;margin-bottom:6px}
  .pv2-control{width:100%;padding:11px 12px;border:1.5px solid var(--border);border-radius:10px;background:#fff;color:var(--text);font:inherit;outline:none}
  .pv2-control:focus{border-color:var(--primary);box-shadow:0 0 0 3px rgba(8,126,124,.09)}
  .pv2-lock{display:flex;align-items:center;gap:8px;padding:11px 13px;border:1px solid #cfe5e3;background:#f2fbfa;border-radius:11px;color:#176f69;font-weight:800}
  .pv2-choice-list{max-height:360px;overflow:auto;border:1px solid var(--border);border-radius:12px;background:#fff}
  .pv2-choice{display:flex;align-items:flex-start;gap:10px;padding:10px 12px;border-bottom:1px solid var(--border);cursor:pointer}
  .pv2-choice:last-child{border-bottom:0}.pv2-choice:hover{background:#f8fbfb}
  .pv2-choice input{margin-top:3px;accent-color:var(--primary)}
  .pv2-choice-main{flex:1;min-width:0}.pv2-choice-title{font-size:12px;font-weight:800;line-height:1.4}
  .pv2-choice-meta{display:flex;align-items:center;gap:7px;font-size:10.5px;color:var(--muted);margin-top:5px;flex-wrap:wrap}
  .pv2-meta-tag{display:inline-flex;padding:3px 7px;border-radius:999px;background:#eef7f6;color:#3f6866;font-weight:800}
  .pv2-meta-dot{opacity:.55}.pv2-meta-score{font-weight:800;color:#5c7775}
  .pv2-count{display:inline-flex;align-items:center;gap:5px;background:#e9f7f6;color:var(--primary);padding:5px 9px;border-radius:999px;font-size:10.5px;font-weight:900}
  .pv2-stat-grid{display:grid;grid-template-columns:repeat(5,minmax(105px,1fr));gap:10px}
  .pv2-stat{background:#fff;border:1px solid var(--border);border-radius:13px;padding:13px}
  .pv2-stat strong{display:block;font-size:23px;color:var(--primary);line-height:1.1}.pv2-stat span{font-size:10.5px;color:var(--muted);font-weight:800}
  .pv2-table-wrap{overflow:auto;border:1px solid var(--border);border-radius:12px}
  .pv2-table{width:100%;border-collapse:collapse;min-width:850px}.pv2-table th,.pv2-table td{padding:9px 10px;border-bottom:1px solid var(--border);font-size:11.5px;text-align:left;vertical-align:top}
  .pv2-table th{background:#f4f9f9;color:var(--muted);font-size:10px;text-transform:uppercase}.pv2-table tr:last-child td{border-bottom:0}
  .pv2-pill{display:inline-flex;padding:4px 8px;border-radius:999px;font-size:10px;font-weight:900}.pv2-pill.ringan{background:#eef8f2;color:#397752}.pv2-pill.sedang{background:#fff6de;color:#956800}.pv2-pill.berat{background:#ffe9e4;color:#b54c37}.pv2-pill.reward{background:#e9f7f6;color:#176f69}
  .pv2-alert{padding:12px 13px;border-radius:11px;background:#fff3ef;border:1px solid #f2c8bc;color:#a34835;font-size:11.5px;line-height:1.5}
  .pv2-good{padding:12px 13px;border-radius:11px;background:#edf9f7;border:1px solid #c9e9e4;color:#176f69;font-size:11.5px;line-height:1.5}
  .pv2-actions{display:flex;justify-content:center;gap:8px;align-items:center;flex-wrap:wrap;margin-top:16px}
  .pv2-btn-icon{display:inline-flex;align-items:center;justify-content:center;gap:8px}.pv2-actions .btn{min-width:220px;text-align:center}.pv2-mini{border:1px solid var(--border);background:#fff;border-radius:8px;padding:6px 8px;cursor:pointer;color:var(--text)}
  .pv2-mini:hover{border-color:var(--primary);color:var(--primary)}
  .pv2-escalation{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
  .pv2-escalation-card{border:1px solid var(--border);border-radius:12px;padding:12px;background:#fff}
  .pv2-escalation-card.urgent{border-color:#efc4b8;background:#fff8f5}
  .pv2-escalation-title{font-size:12px;font-weight:900}.pv2-escalation-sub{font-size:10.5px;color:var(--muted);margin-top:4px;line-height:1.4}
  .pv2-empty{text-align:center;color:var(--muted);padding:22px;font-size:12px}
  .pv2-section-head{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:12px}
  .pv2-history-tools{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
  .pv2-history-tools .pv2-control{min-width:190px;padding:8px 10px;font-size:11px}
  .pv2-recap-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:12px}
  .pv2-recap-kpi{background:#fff;border:1px solid var(--border);border-radius:12px;padding:12px}
  .pv2-recap-kpi strong{display:block;font-size:21px;color:var(--primary);line-height:1}
  .pv2-recap-kpi span{display:block;margin-top:5px;font-size:10px;color:var(--muted);font-weight:800}
  .pv2-followup-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px}
  .pv2-followup-status{display:inline-flex;padding:4px 7px;border-radius:999px;font-size:9px;font-weight:900;background:#eef7f6;color:#2e6b68}
  .pv2-modal-card{width:min(700px,100%);max-height:90vh;overflow:auto;margin:0;border-radius:18px}
  .pv2-modal-title{display:flex;align-items:center;gap:8px}
  @media(max-width:900px){.pv2-recap-grid{grid-template-columns:repeat(2,1fr)}}
  .pv2-search{margin-bottom:8px}
  .pv2-type-wrap{position:relative}
  .pv2-type-trigger{display:flex;align-items:center;justify-content:space-between;gap:10px;text-align:left;cursor:pointer;background:#fff}
  .pv2-type-trigger span{display:flex;flex-direction:column;gap:2px;min-width:0}
  .pv2-type-trigger>svg{flex:0 0 auto;color:var(--muted)}
  .pv2-type-trigger small{font-size:10px;color:var(--muted);font-weight:600}
  .pv2-type-picker{position:absolute;z-index:40;left:0;right:0;top:calc(100% + 6px);background:#fff;border:1px solid var(--border);border-radius:13px;padding:9px;box-shadow:0 14px 34px rgba(20,60,58,.14)}
  .pv2-type-list{max-height:260px;overflow:auto;border:1px solid var(--border);border-radius:10px}
  .pv2-type-option{width:100%;display:flex;align-items:center;text-align:left;border:0;border-bottom:1px solid var(--border);background:#fff;padding:10px 12px;cursor:pointer;font:inherit;color:var(--text)}
  .pv2-type-option:last-child{border-bottom:0}.pv2-type-option:hover{background:#eff9f8}
  .pv2-type-option span{display:flex;flex-direction:column;gap:2px}.pv2-type-option b{font-size:11.5px}.pv2-type-option small{font-size:9.8px;color:var(--muted)}

  @media(max-width:900px){.pv2-grid,.pv2-grid3,.pv2-escalation{grid-template-columns:1fr}.pv2-stat-grid{grid-template-columns:repeat(2,1fr)}}
  `;
  document.head.appendChild(s);
}

async function pointsV2Request(action,payload={},timeoutMs=25000){
  const token=getAuthToken();if(!token)throw new Error('Sesi login tidak ditemukan.');
  const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),timeoutMs);
  try{
    const r=await fetch(STUDENT_POINTS_URL,{method:'POST',headers:{
      'Content-Type':'application/json','apikey':SUPABASE_PUBLISHABLE_KEY,
      'Authorization':`Bearer ${SUPABASE_PUBLISHABLE_KEY}`,'x-session-token':token
    },body:JSON.stringify({action,...payload}),signal:ctl.signal});
    const raw=await r.text();let d={};
    try{d=raw?JSON.parse(raw):{}}catch(_){throw new Error(`Respons server poin bukan JSON (HTTP ${r.status}).`)}
    if(!r.ok||d.success===false){
      const m={forbidden:'Menu ini tidak termasuk tupoksi akun Anda.',class_forbidden:'Anda tidak memiliki akses ke kelas tersebut.',
      session_invalid:'Sesi tidak valid. Silakan login ulang.',session_expired:'Sesi berakhir. Silakan login ulang.',
      edit_window_closed:'Data sudah melewati batas edit 7 hari.',future_date_not_allowed:'Tanggal tidak boleh melebihi hari ini.',
      invalid_master:'Jenis pilihan tidak valid.',student_not_in_class:'Siswa tidak terdaftar di kelas tersebut.'};
      throw new Error(m[d.error]||d.message||d.error||`Gagal memproses data (HTTP ${r.status}).`);
    }
    return d;
  }catch(e){if(e?.name==='AbortError')throw new Error('Server terlalu lama merespons.');throw e}
  finally{clearTimeout(timer)}
}

async function pointV2Bootstrap(force=false){
  if(!force&&POINT_V2.boot&&Date.now()-POINT_V2.bootAt<600000)return POINT_V2.boot;
  const d=await pointsV2Request('bootstrap',{},20000);
  POINT_V2.boot=d;POINT_V2.bootAt=Date.now();
  return d;
}
async function pointV2Students(classId){
  if(!classId)return [];
  if(POINT_V2.studentCache.has(classId))return POINT_V2.studentCache.get(classId);
  const d=await pointsV2Request('students',{class_id:classId},20000);
  POINT_V2.studentCache.set(classId,d.students||[]);
  return d.students||[];
}
async function pointV2Snapshot(studentId){
  return pointsV2Request('student_snapshot',{student_id:studentId},20000);
}
function pv2Today(){return typeof jakartaTodayISO==='function'?jakartaTodayISO():new Date().toISOString().slice(0,10)}
function pv2Master(kind,id){
  const arr=kind==='violation'?(POINT_V2.boot?.violation_masters||[]):(POINT_V2.boot?.reward_masters||[]);
  return arr.find(x=>x.id===id);
}
function pv2ClassName(id){return (POINT_V2.boot?.classes||[]).find(x=>x.id===id)?.name||''}

function pv2ClassControl(kind){
  const b=POINT_V2.boot||{},cid=POINT_V2.classId[kind]||b.default_class_id||'';
  if(b.class_locked){
    return `<div><label class="pv2-label">Kelas</label><div class="pv2-lock">${pointSvg('users',17)}<span>${escapeHtml(pv2ClassName(cid)||b.default_class_name||'Kelas Anda')}</span></div></div>`;
  }
  return `<div><label class="pv2-label">Kelas</label><select class="pv2-control" id="pv2-class-${kind}" onchange="pv2ChangeClass('${kind}',this.value)">
    <option value="">— Pilih kelas —</option>${(b.classes||[]).map(c=>`<option value="${escapeHtml(c.id)}" ${cid===c.id?'selected':''}>${escapeHtml(c.name)}</option>`).join('')}
  </select></div>`;
}

async function pv2ChangeClass(kind,classId){
  POINT_V2.classId[kind]=classId;POINT_V2.studentId[kind]='';POINT_V2.snapshot[kind]=null;
  await pv2RenderWorkspace(kind);
}
async function pv2ChooseStudent(kind,studentId){
  POINT_V2.studentId[kind]=studentId;
  if(!studentId){POINT_V2.snapshot[kind]=null;await pv2RenderWorkspace(kind);return}
  const d=await pointV2Snapshot(studentId);POINT_V2.snapshot[kind]=d;await pv2RenderWorkspace(kind);
}
function pv2SetMode(kind,mode){POINT_V2.activeMode[kind]=mode;pv2RenderWorkspace(kind)}

function pv2Summary(s){
  if(!s)return '';
  const cur=s.intervention?.current,next=s.intervention?.next;
  return `<div class="card">
    ${s.has_do_violation?`<div class="pv2-alert"><b>Kasus DO tercatat.</b> Reward tidak menghapus konsekuensi dan kasus harus ditindaklanjuti sesuai kebijakan sekolah.</div>`:''}
    <div class="pv2-stat-grid" style="margin-top:${s.has_do_violation?'11px':'0'}">
      <div class="pv2-stat"><strong>${s.violation_total||0}</strong><span>Total Pelanggaran</span></div>
      <div class="pv2-stat"><strong>${s.eligible_violation_total||0}</strong><span>Ringan + Sedang</span></div>
      <div class="pv2-stat"><strong>${s.heavy_violation_total||0}</strong><span>Pelanggaran Berat</span></div>
      <div class="pv2-stat"><strong>${s.effective_reward_total||0}</strong><span>Reward Berlaku</span></div>
      <div class="pv2-stat"><strong>${s.balance||0}</strong><span>Saldo Poin</span></div>
    </div>
    <div class="${cur?'pv2-alert':'pv2-good'}" style="margin-top:10px">
      ${cur?`<b>${escapeHtml(cur.stage)}</b><br>${escapeHtml(cur.action)}`:'Belum mencapai ambang pembinaan 50 poin.'}
      ${next?`<br><span style="opacity:.8">Ambang berikutnya ${next.points} poin — ${escapeHtml(next.stage)}</span>`:''}
    </div>
  </div>`;
}

function pv2HistoryFilter(kind){
  const q=(document.getElementById(`pv2-history-search-${kind}`)?.value||'').toLowerCase().trim();
  const f=(document.getElementById(`pv2-history-filter-${kind}`)?.value||'').toLowerCase();
  document.querySelectorAll(`#pv2-history-${kind} tbody tr`).forEach(tr=>{
    const text=(tr.dataset.search||'').toLowerCase(),cat=(tr.dataset.category||'').toLowerCase();
    tr.style.display=((!q||text.includes(q))&&(!f||cat===f))?'':'none';
  });
}
function pv2History(kind,snapshot){
  const rows=kind==='violation'?(snapshot?.violations||[]):(snapshot?.rewards||[]);
  if(!rows.length)return `<div class="pv2-empty">Belum ada riwayat pada siswa ini.</div>`;
  const cats=[...new Set(rows.map(r=>String(r.category||'')).filter(Boolean))].sort();
  return `<div class="pv2-section-head">
    <div><div class="card-title" style="margin:0">Riwayat ${kind==='violation'?'Pelanggaran':'Reward'}</div><div class="page-sub" style="margin-top:3px">Cari atau filter tanpa memuat ulang.</div></div>
    <div class="pv2-history-tools">
      <input id="pv2-history-search-${kind}" class="pv2-control" placeholder="Cari riwayat..." oninput="pv2HistoryFilter('${kind}')">
      <select id="pv2-history-filter-${kind}" class="pv2-control" onchange="pv2HistoryFilter('${kind}')"><option value="">Semua kategori</option>${cats.map(c=>`<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('')}</select>
    </div>
  </div>
  <div class="pv2-table-wrap" id="pv2-history-${kind}"><table class="pv2-table"><thead><tr><th>Tanggal</th><th>${kind==='violation'?'Pelanggaran':'Reward'}</th><th>Kategori</th><th>Poin</th><th>Catatan</th><th>Pencatat</th><th>Aksi</th></tr></thead><tbody>
  ${rows.map(r=>`<tr data-category="${escapeHtml(r.category||'')}" data-search="${escapeHtml([r.date,r.name,r.category,r.note,r.recorded_by].join(' ').toLowerCase())}">
    <td>${escapeHtml(r.date)}</td><td><b>${escapeHtml(r.name)}</b></td>
    <td><span class="pv2-pill ${kind==='violation'?String(r.category).toLowerCase():'reward'}">${escapeHtml(r.category)}</span></td>
    <td><b>${r.consequence_code==='DO'?'DO':r.points}</b></td><td>${escapeHtml(r.note||'-')}</td><td>${escapeHtml(r.recorded_by||'-')}</td>
    <td>${r.editable?`<button class="pv2-mini" title="Edit" onclick="pv2OpenEdit('${kind}','${r.id}')">${pointSvg('edit',15)}</button><button class="pv2-mini" title="Hapus" onclick="pv2Delete('${kind}','${r.id}')">${pointSvg('trash',15)}</button>`:'<span class="pv2-pill">Terkunci</span>'}</td>
  </tr>`).join('')}</tbody></table></div>`;
}

function pv2FilterChoices(inputId,listId){
  const q=(document.getElementById(inputId)?.value||'').toLowerCase();
  document.querySelectorAll(`#${listId} .pv2-choice`).forEach(el=>{
    el.style.display=(el.dataset.search||'').includes(q)?'flex':'none';
  });
}
function pv2SelectedCount(listId,badgeId){
  const n=document.querySelectorAll(`#${listId} input[type=checkbox]:checked`).length;
  const b=document.getElementById(badgeId);if(b)b.textContent=`${n} dipilih`;
}

function pv2MasterList(kind,listId,badgeId){
  const arr=kind==='violation'?(POINT_V2.boot?.violation_masters||[]):(POINT_V2.boot?.reward_masters||[]);
  return arr.map(m=>{
    const name=kind==='violation'?m.violation_name:m.reward_name;
    const score=kind==='violation'?(m.consequence_code==='DO'?'DO':`${m.points} poin`):`${m.points} poin`;
    return `<label class="pv2-choice" data-search="${escapeHtml((name+' '+m.category).toLowerCase())}">
      <input type="checkbox" value="${escapeHtml(m.id)}" onchange="pv2SelectedCount('${listId}','${badgeId}')">
      <span class="pv2-choice-main"><span class="pv2-choice-title">${escapeHtml(name)}</span><span class="pv2-choice-meta"><span class="pv2-meta-tag">${escapeHtml(m.category)}</span><span class="pv2-meta-dot">•</span><span class="pv2-meta-score">${escapeHtml(score)}</span></span></span>
    </label>`;
  }).join('');
}
function pv2StudentList(students,listId,badgeId){
  return students.map(s=>`<label class="pv2-choice" data-search="${escapeHtml(String(s.name||'').toLowerCase())}">
    <input type="checkbox" value="${escapeHtml(s.id)}" onchange="pv2SelectedCount('${listId}','${badgeId}')">
    <span class="pv2-choice-main"><span class="pv2-choice-title">${escapeHtml(s.name)}</span></span>
  </label>`).join('');
}

function pv2TypeMasterList(kind){
  const arr=kind==='violation'?(POINT_V2.boot?.violation_masters||[]):(POINT_V2.boot?.reward_masters||[]);
  return arr.map(m=>{
    const name=kind==='violation'?m.violation_name:m.reward_name;
    const score=kind==='violation'?(m.consequence_code==='DO'?'DO':`${m.points} poin`):`${m.points} poin`;
    return `<button type="button" class="pv2-type-option" data-search="${escapeHtml((name+' '+m.category+' '+score).toLowerCase())}" onclick="pv2PickTypeMaster('${kind}','${escapeHtml(m.id)}','${escapeHtml(name)}','${escapeHtml(score)}')">
      <span><b>${escapeHtml(name)}</b><small>${escapeHtml(m.category)} · ${escapeHtml(score)}</small></span>
    </button>`;
  }).join('');
}
function pv2ToggleTypePicker(kind,force){
  const box=document.getElementById(`pv2-type-picker-${kind}`);if(!box)return;
  const open=typeof force==='boolean'?force:box.hidden;
  box.hidden=!open;
  if(open){const input=document.getElementById(`pv2-type-search-${kind}`);if(input){input.focus();input.select()}}
}
function pv2FilterTypeMaster(kind){
  const q=(document.getElementById(`pv2-type-search-${kind}`)?.value||'').toLowerCase().trim();
  document.querySelectorAll(`#pv2-type-list-${kind} .pv2-type-option`).forEach(el=>{
    el.style.display=(el.dataset.search||'').includes(q)?'flex':'none';
  });
}
function pv2PickTypeMaster(kind,id,name,score){
  const hidden=document.getElementById(`pv2-type-master-${kind}`);
  const label=document.getElementById(`pv2-type-label-${kind}`);
  if(hidden)hidden.value=id;
  if(label)label.innerHTML=`<b>${escapeHtml(name)}</b><small>${escapeHtml(score)}</small>`;
  pv2ToggleTypePicker(kind,false);
}

function pv2SingleStudentList(kind,students){
  return students.map(s=>`<button type="button" class="pv2-type-option pv2-student-option" data-search="${escapeHtml(String(s.name||'').toLowerCase())}" onclick="pv2PickSingleStudent('${kind}','${escapeHtml(s.id)}','${escapeHtml(s.name)}')"><span><b>${escapeHtml(s.name)}</b></span></button>`).join('');
}
function pv2ToggleStudentPicker(kind,force){
  const box=document.getElementById(`pv2-student-picker-${kind}`);if(!box)return;
  const open=typeof force==='boolean'?force:box.hidden;box.hidden=!open;
  if(open){const input=document.getElementById(`pv2-student-search-${kind}`);if(input){input.focus();input.select()}}
}
function pv2FilterSingleStudent(kind){
  const q=(document.getElementById(`pv2-student-search-${kind}`)?.value||'').toLowerCase().trim();
  document.querySelectorAll(`#pv2-student-list-${kind} .pv2-student-option`).forEach(el=>{el.style.display=(el.dataset.search||'').includes(q)?'flex':'none'});
}
async function pv2PickSingleStudent(kind,id,name){
  const hidden=document.getElementById(`pv2-student-single-${kind}`),label=document.getElementById(`pv2-student-label-${kind}`);
  if(hidden)hidden.value=id;if(label)label.innerHTML=`<b>${escapeHtml(name)}</b>`;
  pv2ToggleStudentPicker(kind,false);
  await pv2ChooseStudent(kind,id);
}

async function pv2RenderWorkspace(kind){
  const root=document.getElementById(`pv2-root-${kind}`);if(!root)return;
  const b=POINT_V2.boot||{};
  if(!POINT_V2.classId[kind]&&b.default_class_id)POINT_V2.classId[kind]=b.default_class_id;
  const cid=POINT_V2.classId[kind], mode=POINT_V2.activeMode[kind];
  const students=cid?await pointV2Students(cid):[];
  const sid=POINT_V2.studentId[kind],snap=POINT_V2.snapshot[kind];
  const title=kind==='violation'?'Pelanggaran':'Reward';
  const icon=kind==='violation'?'alert':'gift';
  const listId=`pv2-list-${kind}`,badgeId=`pv2-badge-${kind}`;

  root.innerHTML=`
    <div class="card">
      <div class="pv2-toolbar">
        <div><div class="card-title" style="margin:0">${pointSvg(icon,19)} ${title}</div><div style="font-size:11px;color:var(--muted);margin-top:4px">${b.access_label?escapeHtml(b.access_label):''}</div></div>
        <div class="pv2-tabs">
          <button class="pv2-tab ${mode==='student'?'active':''}" onclick="pv2SetMode('${kind}','student')">${pointSvg('user',15)} Per Siswa</button>
          <button class="pv2-tab ${mode==='type'?'active':''}" onclick="pv2SetMode('${kind}','type')">${pointSvg('list',15)} Per ${title}</button>
        </div>
      </div>
      <div class="pv2-grid" style="margin-top:13px">
        ${pv2ClassControl(kind)}
        ${mode==='student'?`<div class="pv2-type-wrap"><label class="pv2-label">Siswa</label>
          <input type="hidden" id="pv2-student-single-${kind}" value="${escapeHtml(sid||'')}">
          <button type="button" class="pv2-control pv2-type-trigger" onclick="pv2ToggleStudentPicker('${kind}')">
            <span id="pv2-student-label-${kind}">${sid?`<b>${escapeHtml(students.find(x=>x.id===sid)?.name||'Pilih siswa')}</b>`:'— Pilih / cari siswa —'}</span>${pointSvg('down',16)}
          </button>
          <div class="pv2-type-picker" id="pv2-student-picker-${kind}" hidden>
            <input class="pv2-control pv2-search" id="pv2-student-search-${kind}" placeholder="Ketik nama siswa..." oninput="pv2FilterSingleStudent('${kind}')">
            <div class="pv2-type-list" id="pv2-student-list-${kind}">${pv2SingleStudentList(kind,students)}</div>
          </div>
        </div>`:`<div class="pv2-type-wrap"><label class="pv2-label">Jenis ${title}</label>
          <input type="hidden" id="pv2-type-master-${kind}" value="">
          <button type="button" class="pv2-control pv2-type-trigger" onclick="pv2ToggleTypePicker('${kind}')">
            <span id="pv2-type-label-${kind}">— Pilih / cari ${title.toLowerCase()} —</span>${pointSvg('down',16)}
          </button>
          <div class="pv2-type-picker" id="pv2-type-picker-${kind}" hidden>
            <input class="pv2-control pv2-search" id="pv2-type-search-${kind}" placeholder="Ketik untuk mencari ${title.toLowerCase()}..." oninput="pv2FilterTypeMaster('${kind}')">
            <div class="pv2-type-list" id="pv2-type-list-${kind}">${pv2TypeMasterList(kind)}</div>
          </div>
        </div>`}
      </div>
    </div>

    ${mode==='student'&&sid&&snap?pv2Summary(snap.summary):''}

    ${cid&&(mode==='type'||sid)?`<div class="card">
      <div class="pv2-grid3">
        <div><label class="pv2-label">Tanggal</label><input id="pv2-date-${kind}" type="date" max="${pv2Today()}" value="${pv2Today()}" class="pv2-control"></div>
        <div style="grid-column:span 2"><label class="pv2-label">Catatan / Kronologi</label><input id="pv2-note-${kind}" class="pv2-control" placeholder="${kind==='violation'?'Tuliskan fakta singkat dan objektif':'Tuliskan bukti/keterangan singkat'}"></div>
      </div>
      ${mode==='student'?`
        <div class="pv2-toolbar" style="margin-top:14px"><b>Pilih banyak ${title.toLowerCase()}</b><span id="${badgeId}" class="pv2-count">0 dipilih</span></div>
        <input class="pv2-control pv2-search" id="pv2-search-${kind}" placeholder="Cari ${title.toLowerCase()}..." oninput="pv2FilterChoices(this.id,'${listId}')" style="margin-top:9px">
        <div class="pv2-choice-list" id="${listId}">${pv2MasterList(kind,listId,badgeId)}</div>
      `:`
        <div class="pv2-toolbar" style="margin-top:14px"><b>Pilih banyak siswa</b><span id="${badgeId}" class="pv2-count">0 dipilih</span></div>
        <input class="pv2-control pv2-search" id="pv2-search-${kind}" placeholder="Cari siswa..." oninput="pv2FilterChoices(this.id,'${listId}')" style="margin-top:9px">
        <div class="pv2-choice-list" id="${listId}">${pv2StudentList(students,listId,badgeId)}</div>
      `}
      <div class="pv2-actions"><button class="btn pv2-btn-icon" id="pv2-save-${kind}" onclick="pv2BulkSave('${kind}')">${pointSvg('save',16)} Simpan ${title}</button></div>
    </div>`:''}

    ${mode==='student'&&sid&&snap?`<div class="card">${pv2History(kind,snap)}</div>`:''}

    ${(kind==='violation'&&(b.can_view_recap||false))?`<div class="card"><div class="pv2-toolbar"><div class="card-title" style="margin:0">${pointSvg('chart',18)} Rekap & Eskalasi</div><button class="btn btn-sm pv2-btn-icon" onclick="pv2LoadRecap()">${pointSvg('chart',15)} Muat Rekap</button></div><div id="pv2-recap"><div class="pv2-empty">Klik Muat Rekap untuk melihat siswa yang perlu penanganan.</div></div></div>`:''}
  `;
}

async function pv2BulkSave(kind){
  const mode=POINT_V2.activeMode[kind],cid=POINT_V2.classId[kind],sid=POINT_V2.studentId[kind];
  const date=document.getElementById(`pv2-date-${kind}`)?.value||pv2Today();
  const note=(document.getElementById(`pv2-note-${kind}`)?.value||'').trim();
  const listId=`pv2-list-${kind}`;
  const selected=[...document.querySelectorAll(`#${listId} input[type=checkbox]:checked`)].map(x=>x.value);
  if(!cid){showToast('Kelas belum tersedia.',true);return}
  let items=[];
  if(mode==='student'){
    if(!sid){showToast('Pilih siswa terlebih dahulu.',true);return}
    if(!selected.length){showToast(`Pilih minimal satu ${kind==='violation'?'pelanggaran':'reward'}.`,true);return}
    items=selected.map(master_id=>({student_id:sid,master_id}));
  }else{
    const masterId=document.getElementById(`pv2-type-master-${kind}`)?.value||'';
    if(!masterId){showToast(`Pilih jenis ${kind==='violation'?'pelanggaran':'reward'}.`,true);return}
    if(!selected.length){showToast('Pilih minimal satu siswa.',true);return}
    items=selected.map(student_id=>({student_id,master_id:masterId}));
  }
  const btn=document.getElementById(`pv2-save-${kind}`);btn.disabled=true;const old=btn.innerHTML;btn.innerHTML='<span class="spinner"></span>Menyimpan...';
  try{
    const action=kind==='violation'?'bulk_save_violations':'bulk_save_rewards';
    const d=await pointsV2Request(action,{class_id:cid,date,note,items},35000);
    showToast(`${d.saved||items.length} data berhasil disimpan`);
    POINT_V2.studentCache.delete(cid);
    if(mode==='student'&&sid){POINT_V2.snapshot[kind]=await pointV2Snapshot(sid)}
    await pv2RenderWorkspace(kind);
  }catch(e){showToast(e.message||'Gagal menyimpan data',true)}
  finally{btn.disabled=false;btn.innerHTML=old}
}

function pv2OpenEdit(kind,id){
  const snap=POINT_V2.snapshot[kind];const arr=kind==='violation'?(snap?.violations||[]):(snap?.rewards||[]);
  const r=arr.find(x=>x.id===id);if(!r)return;
  POINT_V2.edit={kind,id,record:r};
  const masters=kind==='violation'?(POINT_V2.boot?.violation_masters||[]):(POINT_V2.boot?.reward_masters||[]);
  const modal=document.createElement('div');modal.id='pv2-edit-overlay';
  modal.style.cssText='position:fixed;inset:0;background:rgba(11,39,38,.45);z-index:9999;display:flex;align-items:center;justify-content:center;padding:18px';
  const selected=masters.find(m=>m.id===r.master_id),selectedName=selected?(kind==='violation'?selected.violation_name:selected.reward_name):(r.name||'');
  modal.innerHTML=`<div class="card pv2-modal-card">
    <div class="pv2-toolbar"><div class="pv2-modal-title">${pointSvg('edit',18)}<div><div class="card-title" style="margin:0">Edit ${kind==='violation'?'Pelanggaran':'Reward'}</div><div class="page-sub" style="margin-top:2px">Perubahan disimpan ke riwayat yang sama.</div></div></div><button class="pv2-mini" onclick="document.getElementById('pv2-edit-overlay').remove()">×</button></div>
    <div class="pv2-grid" style="margin-top:14px">
      <div><label class="pv2-label">Tanggal</label><input id="pv2-edit-date" type="date" max="${pv2Today()}" value="${escapeHtml(r.date)}" class="pv2-control"></div>
      <div><label class="pv2-label">Jenis</label><input id="pv2-edit-master-search" class="pv2-control" list="pv2-edit-master-options" value="${escapeHtml(selectedName)}" placeholder="Ketik untuk mencari..." autocomplete="off"><datalist id="pv2-edit-master-options">${masters.map(m=>{const n=kind==='violation'?m.violation_name:m.reward_name;return `<option value="${escapeHtml(n)}"></option>`}).join('')}</datalist><input type="hidden" id="pv2-edit-master" value="${escapeHtml(r.master_id||'')}"></div>
    </div>
    <div style="margin-top:12px"><label class="pv2-label">Catatan / Kronologi</label><textarea id="pv2-edit-note" rows="3" class="pv2-control">${escapeHtml(r.note||'')}</textarea></div>
    <div class="pv2-actions"><button class="btn pv2-btn-icon" onclick="pv2SaveEdit()">${pointSvg('save',16)} Simpan Perubahan</button></div>
  </div>`;
  document.body.appendChild(modal);
  const inp=document.getElementById('pv2-edit-master-search');
  inp?.addEventListener('input',()=>{const v=inp.value.trim().toLowerCase();const f=masters.find(m=>String(kind==='violation'?m.violation_name:m.reward_name).trim().toLowerCase()===v);const h=document.getElementById('pv2-edit-master');if(h)h.value=f?.id||''});
}
async function pv2SaveEdit(){
  const e=POINT_V2.edit;if(!e)return;
  try{
    await pointsV2Request('update_record',{record_type:e.kind,record_id:e.id,
      date:document.getElementById('pv2-edit-date').value,master_id:document.getElementById('pv2-edit-master').value,
      note:(document.getElementById('pv2-edit-note').value||'').trim()});
    document.getElementById('pv2-edit-overlay')?.remove();showToast('Data berhasil diperbarui');
    const sid=POINT_V2.studentId[e.kind];POINT_V2.snapshot[e.kind]=await pointV2Snapshot(sid);await pv2RenderWorkspace(e.kind);
  }catch(err){showToast(err.message||'Gagal mengedit data',true)}
}
async function pv2Delete(kind,id){
  if(!confirm('Hapus data ini? Data tetap disimpan sebagai audit (soft delete).'))return;
  try{
    await pointsV2Request('delete_record',{record_type:kind,record_id:id});
    showToast('Data berhasil dihapus');
    const sid=POINT_V2.studentId[kind];POINT_V2.snapshot[kind]=await pointV2Snapshot(sid);await pv2RenderWorkspace(kind);
  }catch(e){showToast(e.message||'Gagal menghapus data',true)}
}

async function pv2LoadRecap(){
  const el=document.getElementById('pv2-recap');if(!el)return;
  el.innerHTML='<div class="pv2-empty"><span class="spinner"></span> Memuat rekap...</div>';
  try{
    const d=await pointsV2Request('recap',{period:'month'},30000),esc=d.escalations||[],absence=d.absence_escalations||[];
    el.innerHTML=`
      <div class="pv2-recap-grid">
        <div class="pv2-recap-kpi"><strong>${d.summary?.students_with_points||0}</strong><span>Siswa Memiliki Poin</span></div>
        <div class="pv2-recap-kpi"><strong>${d.summary?.need_followup||0}</strong><span>Perlu Penanganan</span></div>
        <div class="pv2-recap-kpi"><strong>${d.summary?.heavy_cases||0}</strong><span>Kasus Berat / DO</span></div>
        <div class="pv2-recap-kpi"><strong>${absence.length}</strong><span>Absen 3 Hari Berturut</span></div>
      </div>
      <div class="pv2-section-head"><div><div class="card-title" style="margin:0">Prioritas Penanganan</div><div class="page-sub" style="margin-top:3px">Hanya siswa yang membutuhkan perhatian.</div></div><span class="pv2-count">${esc.length+absence.length} kasus aktif</span></div>
      <div class="pv2-escalation">
        ${esc.slice(0,20).map(x=>`<div class="pv2-escalation-card ${x.urgent?'urgent':''}"><div class="pv2-followup-head"><div class="pv2-escalation-title">${pointSvg('alert',15)} ${escapeHtml(x.student_name)} · ${escapeHtml(x.class_name)}</div><span class="pv2-followup-status">${x.urgent?'PRIORITAS':'PEMBINAAN'}</span></div><div class="pv2-escalation-sub"><b>${x.balance} poin</b><br>${escapeHtml(x.reason)}<br>${escapeHtml(x.action||'Perlu ditindaklanjuti')}</div>${POINT_V2.boot?.can_manage_followup?`<div class="pv2-actions"><button class="pv2-mini" onclick="pv2Followup('${x.student_id}','in_progress')">Proses</button><button class="pv2-mini" onclick="pv2Followup('${x.student_id}','done')">Selesai</button></div>`:''}</div>`).join('')}
        ${absence.slice(0,20).map(x=>`<div class="pv2-escalation-card urgent"><div class="pv2-followup-head"><div class="pv2-escalation-title">${pointSvg('users',15)} ${escapeHtml(x.student_name)} · ${escapeHtml(x.class_name)}</div><span class="pv2-followup-status">ABSENSI</span></div><div class="pv2-escalation-sub"><b>Tidak hadir 3 hari sekolah berturut-turut</b><br>${escapeHtml((x.dates||[]).join(', '))}</div></div>`).join('')}
      </div>
      ${!esc.length&&!absence.length?'<div class="pv2-good">Tidak ada siswa yang perlu penanganan pada periode ini.</div>':''}`;
  }catch(e){el.innerHTML=`<div class="pv2-alert">${escapeHtml(e.message||'Gagal memuat rekap.')}</div>`}
}
async function pv2Followup(studentId,status){
  try{await pointsV2Request('set_followup',{student_id:studentId,status});showToast('Status tindak lanjut diperbarui');await pv2LoadRecap()}
  catch(e){showToast(e.message||'Gagal memperbarui tindak lanjut',true)}
}

async function pv2Render(kind,content){
  injectPointV2Styles();POINT_V2.activeKind=kind;
  content.innerHTML=`<div class="page-title">${kind==='violation'?'Kedisiplinan & Pelanggaran':'Reward Siswa'}</div>
  <div class="page-sub">${kind==='violation'?'Input, edit, rekap, dan eskalasi sesuai Tata Tertib resmi.':'Input reward dan pengurangan poin sesuai Tata Tertib resmi.'}</div>
  <div id="pv2-root-${kind}"><div class="card"><span class="spinner"></span> Memuat data...</div></div>`;
  try{
    const b=await pointV2Bootstrap();
    if(!POINT_V2.classId[kind]&&b.default_class_id)POINT_V2.classId[kind]=b.default_class_id;
    await pv2RenderWorkspace(kind);
  }catch(e){
    document.getElementById(`pv2-root-${kind}`).innerHTML=`<div class="card"><div class="pv2-alert">${escapeHtml(e.message||'Gagal membuka modul.')}</div></div>`;
  }
}
function renderKedisiplinan(content){return pv2Render('violation',content)}
function renderReward(content){return pv2Render('reward',content)}

/* ==========================================================
   MODUL: RAPOR V1 — PREVIEW SUPABASE
   - Preview 2 halaman mengikuti template rapor
   - Data siswa/akademik/absensi/ekskul/poin dari Edge report-preview
   - Tahfizh disiapkan sebagai slot; sumber terpisah disambungkan berikutnya
   ========================================================== */

let raporPreviewState={
  academicYear:'2026/2027',semester:1,reportType:'PTS',classes:[],classLocked:false,
  classId:'',students:[],studentId:'',startDate:'',endDate:'',printDate:'',hijriDate:'',report:null,classReports:[]
};

function rpTodayYmd(){
  const p=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
  const m=Object.fromEntries(p.map(x=>[x.type,x.value]));return `${m.year}-${m.month}-${m.day}`;
}
function rpDefaultStartYmd(){const d=new Date();d.setDate(d.getDate()-30);return d.toISOString().slice(0,10)}
function rpFmtDate(v){if(!v)return'-';const d=new Date(v+'T00:00:00');if(Number.isNaN(d.getTime()))return v;return new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'long',year:'numeric'}).format(d)}
function rpScore(v){if(v===null||v===undefined||v==='')return'-';const n=Number(v);if(!Number.isFinite(n))return'-';return Number.isInteger(n)?String(n):n.toFixed(1).replace(/\.0$/,'')}
function rpGrade(v){const s=String(v||'').trim().toUpperCase();return ['A','B','C','D'].includes(s)?s:(s==='-'?'-':'-')}
function rpEkskulLegend(kind){
  const legends={
    activity:'A = Very Active | B = Active | C = Occasionally Active | D = Not Participating',
    skill:'A = Skilled | B = Proficient | C = Developing | D = Emerging',
    competition:'A = Competed and placed | B = Competed without placing | C = Interested but has not competed | D = Not yet interested',
    school:'A = Very Active | B = Active | C = Fairly Active | D = Not Very Active'
  };
  return legends[kind]||'-';
}
function rpSafeFilename(v){return String(v||'Rapor').replace(/[\\/:*?"<>|]+/g,' ').replace(/\s+/g,' ').trim()}
function rpLoadScript(src,id){return new Promise((resolve,reject)=>{if(window[id])return resolve(window[id]);const old=document.querySelector(`script[data-rp-lib="${id}"]`);if(old){old.addEventListener('load',()=>resolve(window[id]),{once:true});old.addEventListener('error',reject,{once:true});return}const sc=document.createElement('script');sc.src=src;sc.async=true;sc.dataset.rpLib=id;sc.onload=()=>resolve(window[id]);sc.onerror=()=>reject(new Error('Gagal memuat library PDF.'));document.head.appendChild(sc)})}
async function rpEnsurePdfLibs(zip=false){
  await rpLoadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js','html2canvas');
  await rpLoadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js','jspdf');
  if(zip)await rpLoadScript('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js','JSZip');
}
async function rpElementPdfBlob(el){
  await rpEnsurePdfLibs(false);
  const pages=[...el.querySelectorAll('.rpv-paper')];
  if(!pages.length)throw new Error('Halaman rapor tidak ditemukan.');
  const {jsPDF}=window.jspdf||{};
  if(!jsPDF)throw new Error('Library PDF belum siap.');
  const pdf=new jsPDF({orientation:'portrait',unit:'mm',format:'a4',compress:true});
  for(let i=0;i<pages.length;i++){
    const page=pages[i];
    const savedTransform=page.style.transform,savedMargin=page.style.marginBottom;
    page.style.transform='';
    page.style.marginBottom='';
    const canvas=await window.html2canvas(page,{scale:2,useCORS:true,backgroundColor:'#ffffff',logging:false,scrollX:0,scrollY:0,width:page.scrollWidth,height:page.scrollHeight,windowWidth:page.scrollWidth,windowHeight:page.scrollHeight});
    page.style.transform=savedTransform;
    page.style.marginBottom=savedMargin;
    if(i>0)pdf.addPage('a4','portrait');
    pdf.addImage(canvas.toDataURL('image/jpeg',0.96),'JPEG',0,0,210,297,undefined,'FAST');
  }
  return pdf.output('blob');
}
function rpDownloadBlob(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1200)}

async function reportPreviewRequest(action,payload={},timeoutMs=35000){
  const token=getAuthToken();if(!token)throw new Error('Sesi login tidak ditemukan.');
  const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),timeoutMs);
  try{
    const r=await fetch(REPORT_PREVIEW_URL,{method:'POST',headers:{
      'Content-Type':'application/json','apikey':SUPABASE_PUBLISHABLE_KEY,
      'Authorization':`Bearer ${SUPABASE_PUBLISHABLE_KEY}`,'x-session-token':token
    },body:JSON.stringify({action,...payload}),signal:ctl.signal});
    const raw=await r.text();let d={};try{d=raw?JSON.parse(raw):{}}catch(_){throw new Error(`Respons Rapor bukan JSON. HTTP ${r.status}.`)}
    if(!r.ok||d.success===false){const map={session_invalid:'Sesi login tidak valid.',session_expired:'Sesi login telah berakhir.',forbidden:'Akun ini tidak memiliki akses Rapor.',class_forbidden:'Kelas tidak berada dalam akses akun ini.',student_not_in_class:'Siswa tidak ditemukan pada kelas ini.',academic_year_not_found:'Tahun ajaran belum tersedia di Supabase.'};throw new Error(map[d.error]||d.error||`HTTP ${r.status}`)}
    return d;
  }catch(e){if(e?.name==='AbortError')throw new Error('Server Rapor terlalu lama merespons.');throw e}finally{clearTimeout(timer)}
}

function injectRaporPreviewStyles(){
  if(document.getElementById('rapor-v1-style'))return;
  const s=document.createElement('style');s.id='rapor-v1-style';s.textContent=`
    .rpv-toolbar{display:grid;grid-template-columns:repeat(4,minmax(150px,1fr));gap:10px}.rpv-field label{display:block;font-size:10.5px;font-weight:900;color:var(--muted);margin-bottom:5px;text-transform:uppercase}.rpv-control{width:100%;padding:10px 11px;border:1.5px solid var(--border);border-radius:10px;background:#fff;font:inherit;color:var(--text)}
    .rpv-actions{display:flex;gap:9px;flex-wrap:wrap;align-items:center;margin-top:12px}.rpv-paper-wrap{overflow:auto;padding:10px 0 22px}.rpv-paper{position:relative;width:210mm;height:297mm;min-height:297mm;max-height:297mm;margin:0 auto 18px;background:#fff;color:#111;padding:18mm 14mm 15mm 14mm;box-shadow:0 8px 30px rgba(0,0,0,.12);font-family:Tahoma,Verdana,'Segoe UI',sans-serif;font-size:11px;line-height:1.3;box-sizing:border-box;overflow:hidden}.rpv-paper *{box-sizing:border-box}
    .rpv-template-head{width:100%;border-collapse:collapse;border:1.25px solid #111;margin:0}.rpv-template-head td{border:1.25px solid #111;height:7.46mm;padding:2px 4px;vertical-align:middle}.rpv-template-head .head-left{width:50.9%;text-align:center;font-weight:900;font-size:12px}.rpv-template-head .head-right{font-size:11px;display:flex;align-items:center}.hr-label{flex:0 0 33mm}.hr-colon{flex:0 0 3mm}.hr-value{flex:1}.rpv-template-shadow{height:2.1mm;background:#e7e7e7;margin:0 0 5.8mm}
    .rpv-section-plain{font-weight:900;font-size:12px;margin:0 0 3px}.rpv-tahfizh{width:100%;border-collapse:collapse;margin:0 0 4mm;font-size:11px}.rpv-tahfizh td{padding:0 3px;border:0;vertical-align:middle;height:4.94mm}.rpv-tahfizh td:first-child{width:38%}.rpv-tahfizh td:nth-child(2){width:2%}.rpv-tahfizh .sub{padding-left:20px}
    .rpv-table{width:100%;border-collapse:collapse;table-layout:fixed}.rpv-table th,.rpv-table td{border:0.75px solid #444;padding:1px 3px;vertical-align:middle}.rpv-table th{background:#dce7f1;font-weight:900;text-align:center;font-size:11px}.rpv-center{text-align:center}.rpv-left{text-align:left}.rpv-academic{font-size:11px;line-height:1.25}.rpv-academic th,.rpv-academic td{padding:1px 3px}.rpv-academic .no{width:4%}.rpv-academic .subject{width:35%}.rpv-academic .kktp{width:12.5%}.rpv-academic .lo{width:6.7%}.rpv-academic .remarks{width:14.8%}.rpv-academic tbody td{height:6.2mm}.rpv-academic .rpv-sub{padding-left:12px}.rpv-start4{background:#dedede!important}.rpv-group-row td{background:#d9d9d9;font-weight:900}
    .rpv-att-grid{display:grid;grid-template-columns:65% 29%;gap:6%;align-items:start;margin:6px 0 0}.rpv-att-grid .rpv-section-plain{margin-left:0}.rpv-attendance{font-size:11px}.rpv-attendance th,.rpv-attendance td{height:7.5mm}.rpv-score-table{font-size:11px;margin-top:21px}.rpv-score-table th,.rpv-score-table td{height:7.5mm}
    .rpv-p2-section{font-weight:900;font-size:12px;margin:0 0 4px}.rpv-p2-sub{font-weight:400;font-size:11px;margin:8px 0 3px}.rpv-p2-sub b{font-weight:900}.rpv-exkul{font-size:11px}.rpv-exkul th,.rpv-exkul td{height:6.9mm}.rpv-exkul td{padding:2px 5px;line-height:1.22}.rpv-exkul td:last-child{font-size:11px}.rpv-discipline{font-size:11px}.rpv-discipline th{height:8mm}.rpv-discipline td{height:6.9mm}.rpv-merit{font-size:11px}.rpv-merit th{height:6.9mm}.rpv-merit td{height:6.9mm}.rpv-total-line{border:0.75px solid #444;border-top:0;padding:4px 3px;font-size:11px}
    .rpv-date-center{position:absolute;left:50%;transform:translateX(-50%);top:163mm;text-align:center;font-size:11px;line-height:1.5;min-width:45mm}.rpv-signatures{position:absolute;left:14mm;right:14mm;top:181mm;height:37mm;font-size:11px;display:flex;justify-content:space-between}.rpv-signatures>div{width:30%;display:flex;flex-direction:column;align-items:center;text-align:center}.rpv-signatures .name,.rpv-signatures .blank-line{margin-top:31mm}.rpv-signatures .name{text-decoration:underline;font-weight:400;white-space:nowrap}.rpv-signatures .blank-line{border-bottom:1px solid #111;width:60%;height:1px}
    .rpv-team-area{position:absolute;left:14mm;right:14mm;top:223mm;display:grid;grid-template-columns:max-content max-content;column-gap:6mm;font-size:11px}.rpv-team-title{font-weight:400;margin-bottom:4px}.rpv-team-simple{border-collapse:collapse}.rpv-team-simple td{border:0;padding:2px 1px;vertical-align:top}.rpv-team-simple td:first-child{width:14px}.rpv-team-simple td:last-child{white-space:nowrap}.rpv-position-list div{padding:2px 0;white-space:nowrap}
    .rpv-footer{position:absolute;left:14mm;right:14mm;bottom:3.8mm;display:flex;justify-content:space-between;font-size:11px;font-style:italic}.pv2-toolbar{display:flex;justify-content:space-between;align-items:center;gap:10px}.rpv-print-btn{display:inline-flex;align-items:center;gap:7px}
    @media(max-width:900px){.rpv-toolbar{grid-template-columns:1fr 1fr}.rpv-paper-wrap{overflow:auto;display:flex;flex-direction:column;align-items:center}}
    @media print{@page{size:A4 portrait;margin:0}body *{visibility:hidden!important}#rpv-preview,#rpv-preview *{visibility:visible!important}#rpv-preview{position:absolute;left:0;top:0;width:210mm;margin:0;padding:0}.rpv-paper{box-shadow:none;margin:0;width:210mm;height:297mm;page-break-after:always;break-after:page}.rpv-paper:last-child{page-break-after:auto;break-after:auto}}
  `;document.head.appendChild(s);
}
async function renderCetakRapor(content){
  injectRaporPreviewStyles();
  raporPreviewState={academicYear:'2026/2027',semester:1,reportType:'PTS',classes:[],classLocked:false,classId:'',students:[],studentId:'',startDate:rpDefaultStartYmd(),endDate:rpTodayYmd(),printDate:rpTodayYmd(),hijriDate:'',report:null,classReports:[]};
  content.innerHTML=`<div class="page-title">Rapor</div><div class="page-sub">Preview dan cetak rapor siswa sesuai kelas wali.</div><div id="rpv-root"><div class="card"><span class="spinner"></span> Menyiapkan Rapor...</div></div>`;
  try{const b=await reportPreviewRequest('bootstrap',{academic_year:raporPreviewState.academicYear,semester_no:raporPreviewState.semester});raporPreviewState.classes=b.classes||[];raporPreviewState.classLocked=Boolean(b.class_locked);raporPreviewState.classId=b.default_class_id||'';renderRaporControls();if(raporPreviewState.classId)await rpLoadStudents()}catch(e){document.getElementById('rpv-root').innerHTML=`<div class="card"><div class="ms-alert">${escapeHtml(e.message||'Gagal membuka Rapor.')}</div></div>`}
}

function renderRaporControls(){
  const root=document.getElementById('rpv-root');if(!root)return;
  const className=raporPreviewState.classes.find(c=>c.id===raporPreviewState.classId)?.name||'-';
  root.innerHTML=`<div class="card"><div class="card-title">Pengaturan Rapor</div>
    <div class="rpv-status-chip" style="margin-bottom:12px">Kelas Walas: ${escapeHtml(className)}</div>
    <div class="rpv-toolbar">
      <div class="rpv-field"><label>Jenis Rapor</label><select id="rpv-type" class="rpv-control" onchange="raporPreviewState.reportType=this.value;rpUpdatePrintUi()"><option value="PTS" ${raporPreviewState.reportType==='PTS'?'selected':''}>PTS</option><option value="SEMESTER" ${raporPreviewState.reportType==='SEMESTER'?'selected':''}>Akhir Semester</option></select></div>
      <div class="rpv-field"><label>Semester</label><select id="rpv-sem" class="rpv-control" onchange="rpChangeSemester(this.value)"><option value="1" ${Number(raporPreviewState.semester)===1?'selected':''}>Semester 1</option><option value="2" ${Number(raporPreviewState.semester)===2?'selected':''}>Semester 2</option></select></div>
      <div class="rpv-field"><label>Cetak Rapor</label><select id="rpv-mode" class="rpv-control" onchange="rpUpdatePrintUi()"><option value="STUDENT">Per Siswa</option><option value="CLASS">Per Kelas</option></select></div>
      <div class="rpv-field" id="rpv-student-field"><label>Siswa</label><select id="rpv-student" class="rpv-control" onchange="raporPreviewState.studentId=this.value"><option value="">— Pilih siswa —</option></select></div>
      <div class="rpv-field"><label>Data Mulai</label><input id="rpv-start" type="date" class="rpv-control" value="${raporPreviewState.startDate}"></div>
      <div class="rpv-field"><label>Data Selesai</label><input id="rpv-end" type="date" class="rpv-control" value="${raporPreviewState.endDate}"></div>
      <div class="rpv-field"><label>Tanggal Rapor</label><input id="rpv-print-date" type="date" class="rpv-control" value="${raporPreviewState.printDate}"></div>
      <div class="rpv-field"><label>Tanggal Hijriah (Opsional)</label><input id="rpv-hijri" class="rpv-control" value="${escapeHtml(raporPreviewState.hijriDate||'')}" placeholder="8 Muharram 1448 AH"></div>
    </div>
    <div class="rpv-actions"><button class="btn" id="rpv-preview-btn" onclick="rpPreviewByMode()">Preview Rapor</button><button class="btn" id="rpv-print-btn" onclick="rpPrintByMode()">Cetak PDF</button></div>
  </div><div id="rpv-preview-area"></div>`;
  rpUpdatePrintUi();
}
function rpUpdatePrintUi(){
  const mode=document.getElementById('rpv-mode')?.value||'STUDENT';
  const sf=document.getElementById('rpv-student-field');if(sf)sf.style.display=mode==='STUDENT'?'block':'none';
  const pb=document.getElementById('rpv-print-btn');if(pb)pb.textContent=mode==='CLASS'?'Cetak PDF Per Kelas':'Cetak PDF Per Siswa';
}
async function rpPreviewByMode(){
  const mode=document.getElementById('rpv-mode')?.value||'STUDENT';
  return mode==='CLASS'?rpLoadClassPreview(false):rpLoadPreview();
}
async function rpPrintByMode(){
  const mode=document.getElementById('rpv-mode')?.value||'STUDENT';
  return mode==='CLASS'?rpLoadClassPreview(true):rpPrintStudentPdf();
}

async function rpChangeSemester(v){raporPreviewState.semester=Number(v)||1;raporPreviewState.classId='';raporPreviewState.studentId='';raporPreviewState.report=null;try{const b=await reportPreviewRequest('bootstrap',{academic_year:raporPreviewState.academicYear,semester_no:raporPreviewState.semester});raporPreviewState.classes=b.classes||[];raporPreviewState.classLocked=Boolean(b.class_locked);raporPreviewState.classId=b.default_class_id||'';renderRaporControls();const sem=document.getElementById('rpv-sem');if(sem)sem.value=String(raporPreviewState.semester);if(raporPreviewState.classId)await rpLoadStudents()}catch(e){showToast(e.message||'Gagal mengganti semester',true)}}
async function rpChangeClass(id){raporPreviewState.classId=id;raporPreviewState.studentId='';raporPreviewState.report=null;await rpLoadStudents()}
async function rpLoadStudents(){const sel=document.getElementById('rpv-student');if(!sel||!raporPreviewState.classId)return;sel.disabled=true;sel.innerHTML='<option>Memuat siswa...</option>';try{const d=await reportPreviewRequest('students',{academic_year:raporPreviewState.academicYear,semester_no:raporPreviewState.semester,class_id:raporPreviewState.classId});raporPreviewState.students=d.students||[];sel.innerHTML='<option value="">— Pilih siswa —</option>'+raporPreviewState.students.map(s=>`<option value="${escapeHtml(s.id)}">${escapeHtml(s.name)} — ${escapeHtml(s.nis||s.nisn||'')}</option>`).join('')}catch(e){sel.innerHTML='<option value="">Gagal memuat siswa</option>';showToast(e.message||'Gagal memuat siswa',true)}finally{sel.disabled=false}}

async function rpLoadPreview(){
  const classId=raporPreviewState.classId;
  const studentId=document.getElementById('rpv-student')?.value||raporPreviewState.studentId||'';
  if(!classId){showToast('Kelas belum tersedia.',true);return false}
  if(!studentId){showToast('Pilih siswa terlebih dahulu.',true);return false}
  raporPreviewState.studentId=studentId;
  raporPreviewState.reportType=document.getElementById('rpv-type')?.value||'PTS';
  raporPreviewState.startDate=document.getElementById('rpv-start')?.value||'';
  raporPreviewState.endDate=document.getElementById('rpv-end')?.value||'';
  raporPreviewState.printDate=document.getElementById('rpv-print-date')?.value||rpTodayYmd();
  raporPreviewState.hijriDate=(document.getElementById('rpv-hijri')?.value||'').trim();
  const btn=document.getElementById('rpv-preview-btn'),area=document.getElementById('rpv-preview-area');
  if(btn){btn.disabled=true;btn.innerHTML='<span class="spinner"></span>Memuat...'}
  if(area)area.innerHTML='<div class="card"><span class="spinner"></span> Menyusun rapor siswa...</div>';
  try{
    const d=await reportPreviewRequest('preview',{academic_year:raporPreviewState.academicYear,semester_no:raporPreviewState.semester,class_id:classId,student_id:studentId,report_type:raporPreviewState.reportType,start_date:raporPreviewState.startDate,end_date:raporPreviewState.endDate},45000);
    raporPreviewState.report=d.report;renderRaporPreview();return true;
  }catch(e){if(area)area.innerHTML=`<div class="card"><div class="ms-alert">${escapeHtml(e.message||'Preview gagal dimuat.')}</div></div>`;return false}
  finally{if(btn){btn.disabled=false;btn.textContent='Preview Siswa'}}
}

async function rpPrintStudentPdf(){
  const btn=document.getElementById('rpv-print-btn');if(btn){btn.disabled=true;btn.innerHTML='<span class="spinner"></span>Menyiapkan PDF...'}
  try{const ok=await rpLoadPreview();if(!ok)return;const el=document.getElementById('rpv-preview');if(!el)throw new Error('Preview PDF tidak ditemukan.');const blob=await rpElementPdfBlob(el);const name=rpSafeFilename(raporPreviewState.report?.student?.name||'Rapor')+'.pdf';rpDownloadBlob(blob,name);showToast('PDF rapor berhasil dibuat.')}catch(e){showToast(e.message||'Gagal membuat PDF.',true)}finally{if(btn){btn.disabled=false;btn.textContent='Cetak PDF Per Siswa'}}
}

async function rpLoadClassPreview(autoPrint=false){
  const classId=raporPreviewState.classId;if(!classId){showToast('Kelas Walas belum ditemukan.',true);return}
  raporPreviewState.reportType=document.getElementById('rpv-type')?.value||'PTS';raporPreviewState.startDate=document.getElementById('rpv-start')?.value||'';raporPreviewState.endDate=document.getElementById('rpv-end')?.value||'';raporPreviewState.printDate=document.getElementById('rpv-print-date')?.value||rpTodayYmd();raporPreviewState.hijriDate=(document.getElementById('rpv-hijri')?.value||'').trim();
  const btn=autoPrint?document.getElementById('rpv-print-btn'):document.getElementById('rpv-preview-btn'),area=document.getElementById('rpv-preview-area');if(btn){btn.disabled=true;btn.innerHTML='<span class="spinner"></span>Menyiapkan...'}if(area)area.innerHTML='<div class="card"><span class="spinner"></span> Menyusun seluruh rapor kelas. Mohon tunggu...</div>';
  try{const d=await reportPreviewRequest('class_reports',{academic_year:raporPreviewState.academicYear,semester_no:raporPreviewState.semester,class_id:classId,report_type:raporPreviewState.reportType,start_date:raporPreviewState.startDate,end_date:raporPreviewState.endDate},120000);const reports=Array.isArray(d.reports)?d.reports:[];if(!reports.length)throw new Error('Tidak ada siswa aktif pada kelas ini.');raporPreviewState.classReports=reports;
    if(autoPrint){await rpEnsurePdfLibs(true);const zip=new window.JSZip();const original=raporPreviewState.report;for(let i=0;i<reports.length;i++){raporPreviewState.report=reports[i];renderRaporPreview();const el=document.getElementById('rpv-preview');if(!el)continue;if(btn)btn.textContent=`PDF ${i+1}/${reports.length}`;const blob=await rpElementPdfBlob(el);zip.file(rpSafeFilename(reports[i]?.student?.name||`Siswa ${i+1}`)+'.pdf',blob)}raporPreviewState.report=original||reports[0];const cl=reports[0]?.class?.name||'Kelas';const label=raporPreviewState.reportType==='SEMESTER'?'Rapor Akhir Semester':'Rapor PTS';const zblob=await zip.generateAsync({type:'blob',compression:'DEFLATE',compressionOptions:{level:6}});rpDownloadBlob(zblob,`${label} ${rpSafeFilename(cl)}.zip`);showToast('ZIP rapor per kelas berhasil dibuat.');return}
    const first=reports[0];raporPreviewState.report=first;renderRaporPreview();
  }catch(e){if(area)area.innerHTML=`<div class="card"><div class="ms-alert">${escapeHtml(e.message||'Gagal membuat rapor kelas.')}</div></div>`}finally{if(btn){btn.disabled=false;btn.textContent=autoPrint?'Cetak PDF Per Kelas':'Preview Rapor'}}
}

/* Struktur mapel baku sesuai template resmi (grouping Islamic Studies & Local Content
   Subjects). Setiap slot dicocokkan ke r.academic (dari edge function report-preview)
   lewat beberapa alias nama (ID/EN) supaya tetap match walau backend pakai istilah beda. */
const RP_SUBJECT_TEMPLATE=[
  {group:'Islamic Studies'},
  {label:'a. Aqidah (Islamic Creed)',aliases:['aqidah','akidah']},
  {label:'b. Fiqh (Islamic Jurisprudence)',aliases:['fiqh','fikih']},
  {label:'c. Adab (Islamic Manners)',aliases:['adab','akhlak']},
  {label:'d. Hadith',aliases:['hadith','hadits']},
  {no:2,label:'Pancasila Education',aliases:['pancasila']},
  {no:3,label:'Bahasa Indonesia',aliases:['bahasa indonesia']},
  {no:4,label:'Mathematics',aliases:['matematika','mathematics']},
  {no:5,label:'Natural Sciences',aliases:['natural sciences','ipa','sains']},
  {no:6,label:'Social Sciences',aliases:['social sciences','ips','sospan']},
  {no:7,label:'Arts, Culture, and Crafts Education',aliases:['seni budaya','arts','sbdp','prakarya']},
  {no:8,label:'Physical Education, Sports, and Health',aliases:['pjok','physical education','penjas']},
  {group:'Local Content Subjects'},
  {label:'a. Arabic Language',aliases:['bahasa arab','arabic']},
  {label:'b. English',aliases:['bahasa inggris','english']},
  {label:'c. Sundanese Language',aliases:['bahasa sunda','sundanese'],forceSg4:true},
  {label:'d. Seerah (Prophetic Biography)',aliases:['sirah','siroh','seerah']},
  {label:"e. Tajweed (Qur'anic Recitation)",aliases:['tajwid','tajweed']}
];
function rpFindAcademic(list,aliases){
  return list.find(item=>{const nm=String(item?.name||'').toLowerCase();return aliases.some(a=>nm.includes(a));})||null;
}
function rpAcademicRows(rows){
  const list=Array.isArray(rows)?rows:[];
  let groupNo=0,subIndex=0;
  return RP_SUBJECT_TEMPLATE.map(slot=>{
    if(slot.group){groupNo=slot.group==='Islamic Studies'?1:9;subIndex=0;return`<tr class="rpv-group-row"><td class="rpv-center">${groupNo}</td><td colspan="8">${escapeHtml(slot.group)}</td></tr>`;}
    const isSub=!slot.no;const no=slot.no||'';
    const r=rpFindAcademic(list,slot.aliases)||{};
    const sg4=Boolean(r.starting_grade_4)||Boolean(slot.forceSg4);
    const cls=sg4?' class="rpv-center rpv-start4"':' class="rpv-center"';
    const kktp=sg4?'':escapeHtml(r.kktp||'-');
    const los=[0,1,2,3,4].map(x=>`<td${cls}>${sg4?'':rpScore(r.lo?.[x])}</td>`).join('');
    const remarks=sg4?'Starting Grade 4':escapeHtml(r.remarks||'-');
    return`<tr><td class="rpv-center">${no}</td><td${isSub?' class="rpv-sub"':''}>${escapeHtml(slot.label)}</td><td${cls}>${kktp}</td>${los}<td${cls}>${remarks}</td></tr>`;
  }).join('');
}
function rpTahfizhRows(t){
  if(!t)return`<tr><td>Memorization Material</td><td>-</td></tr><tr><td>Tahfizh Learning Target (LP)</td><td>-</td></tr><tr><td>Current Achievement</td><td>-</td></tr><tr><td>Tahfizh Achievement</td><td>-</td></tr><tr><td>&nbsp;&nbsp;a. Number of Surahs</td><td>-</td></tr><tr><td>&nbsp;&nbsp;b. Number of Lines</td><td>-</td></tr><tr><td>&nbsp;&nbsp;c. Number of Verses</td><td>-</td></tr><tr><td>&nbsp;&nbsp;d. Percentage (%)</td><td>-</td></tr><tr><td>Juz Advancement Assessment</td><td>-</td></tr>`;
  return`<tr><td>Memorization Material</td><td>${escapeHtml(t.material||'-')}</td></tr><tr><td>Tahfizh Learning Target (LP)</td><td>${escapeHtml(t.target||'-')}</td></tr><tr><td>Current Achievement</td><td>${escapeHtml(t.current||'-')}</td></tr><tr><td>Tahfizh Achievement</td><td>${escapeHtml(t.achievement||'-')}</td></tr><tr><td>&nbsp;&nbsp;a. Number of Surahs</td><td>${escapeHtml(t.surahs??'-')}</td></tr><tr><td>&nbsp;&nbsp;b. Number of Lines</td><td>${escapeHtml(t.lines??'-')}</td></tr><tr><td>&nbsp;&nbsp;c. Number of Verses</td><td>${escapeHtml(t.verses??'-')}</td></tr><tr><td>&nbsp;&nbsp;d. Percentage (%)</td><td>${escapeHtml(t.percentage??'-')}</td></tr><tr><td>Juz Advancement Assessment</td><td>${escapeHtml(t.juz_assessment||'-')}</td></tr>`;
}
/* Walas (homeroom teacher) sudah ditampilkan sendiri di blok tanda tangan,
   jadi dikecualikan dari daftar "Class Teaching Team" biar tidak dobel.
   Setiap entri team/tahfizh boleh berupa string nama saja (fallback posisi generik:
   "Subject Teacher"/"Tahfizh Teacher"), atau objek {name, position} kalau backend
   sudah mengirim posisi asli per guru (mis. "Diniyyah"). Nama & posisi dibangun dari
   satu array yang sama supaya baris nama dan posisi selalu sejajar 1:1. */
function rpTeamEntryName(entry){
  if(entry && typeof entry==='object')return String(entry.name||entry.nama||'').trim();
  return String(entry||'').trim();
}
function rpTeamEntryPosition(entry,fallback){
  if(entry && typeof entry==='object')return String(entry.position||entry.posisi||entry.subject||entry.mapel||fallback);
  return fallback;
}
function rpBuildTeamList(team,tahfizh,homeroom){
  const hr=String(homeroom||'').trim().toLowerCase();
  const build=(list,fallbackPos)=>(Array.isArray(list)?list:[])
    .map(entry=>({name:rpTeamEntryName(entry),pos:rpTeamEntryPosition(entry,fallbackPos)}))
    .filter(x=>x.name && x.name.toLowerCase()!==hr);
  return [...build(team,'Subject Teacher'),...build(tahfizh,'Tahfizh Teacher')];
}
function rpTeamRows(team,tahfizh,homeroom){
  const arr=rpBuildTeamList(team,tahfizh,homeroom);
  if(!arr.length)return'<tr><td>1</td><td>-</td></tr>';
  return arr.map((x,i)=>`<tr><td>${i+1}</td><td>${escapeHtml(x.name)}</td></tr>`).join('');
}
function rpTeamPositions(team,tahfizh,homeroom){
  const arr=rpBuildTeamList(team,tahfizh,homeroom);
  return arr.length?arr.map(x=>`<div>${escapeHtml(x.pos)}</div>`).join(''):'<div>-</div>';
}

function renderRaporPreview(){
  const area=document.getElementById('rpv-preview-area'),r=raporPreviewState.report;if(!area||!r)return;
  const st=r.student||{},cl=r.class||{},att=r.attendance||{},pts=r.points||{},eks=r.extracurricular||{},trs=r.teachers||{};const p=att.percent||{};const cats=pts.categories||{};
  const reportTitle=raporPreviewState.reportType==='SEMESTER'?'SEMESTER STUDENT PROGRESS REPORT':'MID-SEMESTER STUDENT PROGRESS REPORT';
  const semTxt=Number(r.semester_no)===2?'SEMESTER II':'SEMESTER I';
  const idText=[st.nis,st.nisn].filter(Boolean).join(' / ')||'-';
  const t=r.tahfizh||null;
  const tahRows=t?`
    <tr><td>Memorization Material</td><td>:</td><td>${escapeHtml(t.material||'-')}</td></tr>
    <tr><td>Tahfizh Learning Target (LP)</td><td>:</td><td>${escapeHtml(t.target||'-')}</td></tr>
    <tr><td>Current Achievement</td><td>:</td><td>${escapeHtml(t.current||'-')}</td></tr>
    <tr><td>Tahfizh Achievement</td><td>:</td><td>${escapeHtml(t.achievement||'-')}</td></tr>
    <tr><td class="sub">a. Number of Surahs</td><td>:</td><td>${escapeHtml(t.surahs??'-')}</td></tr>
    <tr><td class="sub">b. Number of Lines</td><td>:</td><td>${escapeHtml(t.lines??'-')}</td></tr>
    <tr><td class="sub">c. Number of Verses</td><td>:</td><td>${escapeHtml(t.verses??'-')}</td></tr>
    <tr><td class="sub">d. Percentage (%)</td><td>:</td><td>${escapeHtml(t.percentage??'-')}</td></tr>
    <tr><td>Juz Advancement Assessment</td><td>:</td><td>${escapeHtml(t.juz_assessment||'-')}</td></tr>`:`
    <tr><td>Memorization Material</td><td>:</td><td>-</td></tr><tr><td>Tahfizh Learning Target (LP)</td><td>:</td><td>-</td></tr><tr><td>Current Achievement</td><td>:</td><td>-</td></tr><tr><td>Tahfizh Achievement</td><td>:</td><td>-</td></tr><tr><td class="sub">a. Number of Surahs</td><td>:</td><td>-</td></tr><tr><td class="sub">b. Number of Lines</td><td>:</td><td>-</td></tr><tr><td class="sub">c. Number of Verses</td><td>:</td><td>-</td></tr><tr><td class="sub">d. Percentage (%)</td><td>:</td><td>-</td></tr><tr><td>Juz Advancement Assessment</td><td>:</td><td>-</td></tr>`;

  area.innerHTML=`<div class="card"><div class="pv2-toolbar"><div><div class="card-title" style="margin:0">Preview Rapor - ${escapeHtml(st.name||'-')}</div><div class="page-sub" style="margin-top:3px">Ukuran final A4, 2 halaman.</div></div><button class="btn btn-sm rpv-print-btn" onclick="rpPrintStudentPdf()">${pointSvg('save',15)} Cetak PDF</button></div></div>
  <div class="rpv-paper-wrap" id="rpv-preview">
    <section class="rpv-paper">
      <table class="rpv-template-head"><tbody>
        <tr><td class="head-left">${reportTitle}</td><td class="head-right"><span class="hr-label">Student Name</span><span class="hr-colon">:</span><span class="hr-value"><b>${escapeHtml(st.name||'-')}</b></span></td></tr>
        <tr><td class="head-left">${semTxt}</td><td class="head-right"><span class="hr-label">Student ID/NISN</span><span class="hr-colon">:</span><span class="hr-value">${escapeHtml(idText)}</span></td></tr>
        <tr><td class="head-left">ACADEMIC YEAR ${escapeHtml(r.academic_year||'2026/2027')}</td><td class="head-right"><span class="hr-label">Class/Phase</span><span class="hr-colon">:</span><span class="hr-value">${escapeHtml(cl.name||'-')}</span></td></tr>
      </tbody></table><div class="rpv-template-shadow"></div>
      <div class="rpv-section-plain">1&nbsp;&nbsp;Tahfizh Achievement Report</div><table class="rpv-tahfizh"><tbody>${tahRows}</tbody></table>
      <div class="rpv-section-plain">2&nbsp;&nbsp;Subject Assessment Report</div>
      <table class="rpv-table rpv-academic"><thead><tr><th rowspan="2" class="no">NO</th><th rowspan="2" class="subject">SUBJECT</th><th rowspan="2" class="kktp">Learning Objective Achievement Criteria (KKTP)</th><th colspan="5">SUMMATIVE ASSESSMENT</th><th rowspan="2" class="remarks">REMARKS</th></tr><tr><th class="lo">LO 1</th><th class="lo">LO 2</th><th class="lo">LO 3</th><th class="lo">LO 4</th><th class="lo">LO 5</th></tr></thead><tbody>${rpAcademicRows(r.academic)}</tbody></table>
      <div class="rpv-att-grid"><div><div class="rpv-section-plain">3&nbsp;&nbsp;Attendance Record</div><table class="rpv-table rpv-attendance"><thead><tr><th style="width:8%">No.</th><th>Attendance Status</th><th style="width:19%">Days</th><th style="width:22%">Percentage</th></tr></thead><tbody><tr><td class="rpv-center">1</td><td>Present</td><td class="rpv-center">${att.present||0}</td><td class="rpv-center">${p.present||0}%</td></tr><tr><td class="rpv-center">2</td><td>Absent Due to Illness</td><td class="rpv-center">${att.sick||0}</td><td class="rpv-center">${p.sick||0}%</td></tr><tr><td class="rpv-center">3</td><td>Excused Absence</td><td class="rpv-center">${att.excused||0}</td><td class="rpv-center">${p.excused||0}%</td></tr><tr><td class="rpv-center">4</td><td>Unexcused Absence</td><td class="rpv-center">${att.unexcused||0}</td><td class="rpv-center">${p.unexcused||0}%</td></tr></tbody></table></div><div><table class="rpv-table rpv-score-table"><thead><tr><th>Score Range</th><th>Performance Level</th></tr></thead><tbody><tr><td class="rpv-center">90-100</td><td>Highly Proficient</td></tr><tr><td class="rpv-center">81-89</td><td>Proficient</td></tr><tr><td class="rpv-center">75-80</td><td>Developing</td></tr><tr><td class="rpv-center">&lt;75</td><td>Needs Guidance</td></tr></tbody></table></div></div>
      <div class="rpv-footer"><span>SD Islam Tahfizh Cahaya Qur'an</span><span>Page 1 of 2</span></div>
    </section>

    <section class="rpv-paper">
      <div class="rpv-p2-section">4&nbsp;&nbsp;Student Activity and Personal Development Report</div>
      <table class="rpv-table rpv-exkul"><thead><tr><th style="width:5%">No.</th><th style="width:50%">Extracurricular &amp; Personal Development</th><th style="width:8%">Rating</th><th>Remarks</th></tr></thead><tbody><tr><td class="rpv-center">1</td><td>Extracurricular Participation</td><td class="rpv-center"><b>${rpGrade(eks.activity_grade)}</b></td><td>${escapeHtml(rpEkskulLegend('activity'))}</td></tr><tr><td class="rpv-center">2</td><td>Extracurricular Skill Development</td><td class="rpv-center"><b>${rpGrade(eks.skill_grade)}</b></td><td>${escapeHtml(rpEkskulLegend('skill'))}</td></tr><tr><td class="rpv-center">3</td><td>Competition Participation and Achievement</td><td class="rpv-center"><b>${rpGrade(eks.competition_grade)}</b></td><td>${escapeHtml(rpEkskulLegend('competition'))}</td></tr><tr><td class="rpv-center">4</td><td>Participation in School Activities</td><td class="rpv-center"><b>${rpGrade(eks.school_activity_grade)}</b></td><td>${escapeHtml(rpEkskulLegend('school'))}</td></tr></tbody></table>
      <div class="rpv-p2-section" style="margin-top:17px">5&nbsp;&nbsp;Student Character and Discipline Report</div>
      <div class="rpv-p2-sub">A. Disciplinary Record Summary</div><table class="rpv-table rpv-discipline"><thead><tr><th style="width:51%">Level</th><th style="width:14%">Number of<br>Incidents</th><th>Remarks</th></tr></thead><tbody><tr><td>Minor</td><td class="rpv-center">${cats.Minor?.incidents||0}</td><td>-</td></tr><tr><td>Moderate</td><td class="rpv-center">${cats.Moderate?.incidents||0}</td><td>-</td></tr><tr><td>Severe</td><td class="rpv-center">${cats.Severe?.incidents||0}</td><td>-</td></tr></tbody></table><div class="rpv-total-line">Total Violation Points: <b>${pts.violation_total||0}</b> Points</div>
      <div class="rpv-p2-sub" style="margin-top:14px">B. Student Merit and Guidance Record</div><table class="rpv-table rpv-merit"><thead><tr><th style="width:51%">Category</th><th style="width:14%">Points</th><th>Remarks</th></tr></thead><tbody><tr><td>Achievement/Role Model Award</td><td class="rpv-center">${pts.reward_total||0}</td><td>-</td></tr><tr><td>Violation Points</td><td class="rpv-center">${pts.violation_total||0}</td><td>-</td></tr></tbody></table><div class="rpv-total-line">Final Total Points: <b>${pts.final_total||0}</b> Points</div>
      <div class="rpv-date-center"><div><u>${escapeHtml(raporPreviewState.hijriDate||'-')}</u></div><div>${escapeHtml(rpFmtDate(raporPreviewState.printDate))} CE</div></div>
      <div class="rpv-signatures"><div>Parent / Guardian<div class="blank-line">&nbsp;</div></div><div>Principal<div class="name">${escapeHtml(trs.principal||'_______________')}</div></div><div>Homeroom Teacher, ${escapeHtml(cl.name||'-')}<div class="name">${escapeHtml(trs.homeroom||'_______________')}</div></div></div>
      <div class="rpv-team-area"><div><div class="rpv-team-title">Class Teaching Team, ${escapeHtml(cl.name||'-')}</div><table class="rpv-team-simple"><tbody>${rpTeamRows(trs.team,trs.tahfizh,trs.homeroom)}</tbody></table></div><div><div class="rpv-team-title">Position</div><div class="rpv-position-list">${rpTeamPositions(trs.team,trs.tahfizh,trs.homeroom)}</div></div></div>
      <div class="rpv-footer"><span>SD Islam Tahfizh Cahaya Qur'an</span><span>Page 2 of 2</span></div>
    </section>
  </div>`;
  document.getElementById('rpv-preview')?.scrollIntoView({behavior:'smooth',block:'start'});
  requestAnimationFrame(rpFitPaperToViewport);
  if(!window.__rpFitBound){
    window.__rpFitBound=true;
    window.addEventListener('resize',()=>requestAnimationFrame(rpFitPaperToViewport));
  }
}

/* Menyusutkan #rpv-preview (A4, 210mm) agar pas 1 layar penuh di HP/layar sempit,
   tanpa mengubah ukuran asli halaman (dipakai lagi apa adanya saat export PDF). */
function rpFitPaperToViewport(){
  const wrap=document.getElementById('rpv-preview');
  if(!wrap) return;
  const pages=[...wrap.querySelectorAll('.rpv-paper')];
  if(!pages.length) return;
  const availableWidth=wrap.clientWidth;
  pages.forEach(page=>{
    page.style.transform='';
    page.style.marginBottom='';
    const naturalWidth=page.offsetWidth;
    if(!availableWidth||!naturalWidth) return;
    if(availableWidth>=naturalWidth) return;
    const scale=Math.max(0.28, availableWidth/naturalWidth);
    page.style.transform=`scale(${scale})`;
    page.style.transformOrigin='top center';
    page.style.marginBottom=`${(page.offsetHeight*(1-scale))*-1}px`;
  });
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
   DASHBOARD ROLE V5 — MOTIVATIF, LIVE, ROLE-AWARE
   - Guru/Walas: tugas harian + grafik + Top 5 siswa kelas
   - Kabid Kesiswaan: monitoring guru + eskalasi + Top 5 sekolah
   - Pimpinan: ringkasan lintas bidang + leaderboard
   - Admin: master/system only
   - Leaderboard hanya memakai data yang benar-benar terisi
   - Semua ikon SVG inline, tanpa emoji
   ========================================================== */
let dashboardLoadToken = 0;
let roleDashboardCache = null;
let roleDashboardCacheAt = 0;

function rdIcon(name,size=18){
  const a=`width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"`;
  const m={
    home:`<svg ${a}><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/></svg>`,
    users:`<svg ${a}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
    check:`<svg ${a}><path d="m20 6-11 11-5-5"/></svg>`,
    clock:`<svg ${a}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>`,
    alert:`<svg ${a}><path d="M10.3 2.9 1.8 17a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 2.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>`,
    gift:`<svg ${a}><rect x="3" y="8" width="18" height="13" rx="2"/><path d="M12 8v13"/><path d="M3 12h18"/><path d="M7.5 8C5.6 8 4 6.8 4 5.3S5.2 3 6.7 3C9 3 12 8 12 8"/><path d="M16.5 8C18.4 8 20 6.8 20 5.3S18.8 3 17.3 3C15 3 12 8 12 8"/></svg>`,
    chart:`<svg ${a}><path d="M3 3v18h18"/><path d="m7 16 4-5 4 3 4-7"/></svg>`,
    book:`<svg ${a}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M4 4v15.5"/><path d="M20 22V6a2 2 0 0 0-2-2H6.5A2.5 2.5 0 0 0 4 6.5"/></svg>`,
    database:`<svg ${a}><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/></svg>`,
    trophy:`<svg ${a}><path d="M8 21h8"/><path d="M12 17v4"/><path d="M7 4h10v5a5 5 0 0 1-10 0Z"/><path d="M7 6H4a2 2 0 0 0 2 4h1"/><path d="M17 6h3a2 2 0 0 1-2 4h-1"/></svg>`,
    star:`<svg ${a}><path d="m12 2 3 6 6.5.9-4.7 4.6 1.1 6.5-5.9-3.1L6.1 20l1.1-6.5L2.5 8.9 9 8Z"/></svg>`,
    arrow:`<svg ${a}><path d="m9 18 6-6-6-6"/></svg>`
  };
  return m[name]||m.check;
}

function injectRoleDashboardStyles(){
  if(document.getElementById('role-dashboard-style')) return;
  const s=document.createElement('style');s.id='role-dashboard-style';
  s.textContent=`
    .rd-shell{max-width:1380px;margin:0 auto}
    .rd-hero{background:linear-gradient(115deg,#075b59,#118783);border-radius:22px;padding:25px 28px;color:#fff;position:relative;overflow:hidden;margin-bottom:16px}
    .rd-hero:after{content:"";position:absolute;width:270px;height:270px;border:44px solid rgba(255,255,255,.06);border-radius:50%;right:-70px;top:-95px}
    .rd-eyebrow{font-size:10.5px;letter-spacing:.13em;font-weight:900;text-transform:uppercase;opacity:.8}.rd-title{font-size:29px;font-weight:900;line-height:1.15;margin-top:7px}.rd-sub{font-size:12.5px;opacity:.86;margin-top:7px}
    .rd-kpis{display:grid;grid-template-columns:repeat(5,minmax(135px,1fr));gap:11px;margin-bottom:14px}.rd-kpi{background:#fff;border:1px solid var(--border);border-radius:15px;padding:14px;min-height:105px}
    .rd-kpi-icon{width:35px;height:35px;border-radius:11px;background:#eaf7f6;color:var(--primary);display:flex;align-items:center;justify-content:center;margin-bottom:8px}.rd-kpi strong{display:block;font-size:24px;line-height:1.05;color:#075b59}.rd-kpi span{font-size:10.5px;font-weight:800;color:var(--muted)}.rd-kpi small{display:block;font-size:10px;color:var(--muted);margin-top:5px}
    .rd-grid2{display:grid;grid-template-columns:1fr 1fr;gap:13px;margin-bottom:13px}.rd-grid3{display:grid;grid-template-columns:1.2fr 1fr .9fr;gap:13px;margin-bottom:13px}
    .rd-card{background:#fff;border:1px solid var(--border);border-radius:16px;padding:16px}.rd-card-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start;margin-bottom:12px}.rd-card-title{font-size:13.5px;font-weight:900}.rd-card-sub{font-size:10.5px;color:var(--muted);margin-top:3px;line-height:1.4}
    .rd-task{display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border)}.rd-task:last-child{border-bottom:0}.rd-task-icon{width:33px;height:33px;border-radius:10px;display:flex;align-items:center;justify-content:center}.rd-task.done .rd-task-icon{background:#eaf8f1;color:#2c7a4b}.rd-task.pending .rd-task-icon{background:#fff1ed;color:#bd543e}.rd-task-main{flex:1;min-width:0}.rd-task-name{font-size:11.7px;font-weight:850}.rd-task-meta{font-size:10.2px;color:var(--muted);margin-top:2px}
    .rd-badge{display:inline-flex;padding:5px 8px;border-radius:999px;font-size:9.2px;font-weight:900}.rd-badge.done{background:#eaf8f1;color:#2c7a4b}.rd-badge.pending{background:#fff1ed;color:#bd543e}
    .rd-list-row{display:grid;grid-template-columns:32px 1fr auto;gap:9px;align-items:center;padding:8px 0;border-bottom:1px solid var(--border)}.rd-list-row:last-child{border-bottom:0}.rd-rank{width:28px;height:28px;border-radius:9px;background:#edf6f6;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:900;color:var(--primary)}.rd-rank.top{background:#fff7dc;color:#946b00}.rd-name{font-size:11.3px;font-weight:850}.rd-meta{font-size:9.8px;color:var(--muted);margin-top:2px}.rd-score{font-size:11.5px;font-weight:900;color:#075b59}
    .rd-alert-row{padding:10px 11px;border:1px solid #f1c8bd;background:#fff8f5;border-radius:11px;margin-bottom:8px}.rd-alert-row:last-child{margin-bottom:0}.rd-alert-title{display:flex;align-items:center;gap:7px;font-size:11.2px;font-weight:900;color:#a44935}.rd-alert-sub{font-size:10.1px;color:#7b5d56;margin-top:4px;line-height:1.45}
    .rd-pending-row{display:flex;justify-content:space-between;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);align-items:center}.rd-pending-row:last-child{border-bottom:0}.rd-pending-name{font-size:11.2px;font-weight:850}.rd-pending-meta{font-size:9.9px;color:var(--muted);margin-top:2px}
    .rd-empty{padding:19px;text-align:center;color:var(--muted);font-size:10.7px}.rd-quick{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.rd-quick button{border:1px solid var(--border);background:#fff;border-radius:11px;padding:10px;font:inherit;font-size:10.3px;font-weight:850;color:var(--text);cursor:pointer;display:flex;gap:7px;align-items:center;justify-content:center}.rd-quick button:hover{border-color:var(--primary);color:var(--primary)}
    .rd-chart{width:100%;height:190px;display:block}.rd-chart-label{font-size:9px;fill:#7a8f8e}.rd-chart-line{fill:none;stroke:#0b7d79;stroke-width:3}.rd-chart-area{fill:rgba(11,125,121,.08)}.rd-chart-dot{fill:#0b7d79}.rd-chart-grid{stroke:#e8efef;stroke-width:1}
    .rd-bar-wrap{display:flex;align-items:end;gap:10px;height:155px;padding:8px 4px 0}.rd-bar-item{flex:1;display:flex;flex-direction:column;justify-content:end;align-items:center;height:100%;gap:5px}.rd-bar{width:min(34px,75%);border-radius:8px 8px 3px 3px;background:#0b7d79;min-height:3px}.rd-bar.alt{background:#d9775d}.rd-bar-label{font-size:9px;color:var(--muted);white-space:nowrap}.rd-bar-value{font-size:9px;font-weight:850;color:var(--text)}
    @media(max-width:1050px){.rd-kpis{grid-template-columns:repeat(3,1fr)}.rd-grid3{grid-template-columns:1fr}.rd-grid2{grid-template-columns:1fr}}
    @media(max-width:650px){.rd-kpis{grid-template-columns:repeat(2,1fr)}.rd-title{font-size:22px}.rd-hero{padding:19px}.rd-quick{grid-template-columns:1fr}.rd-chart{height:160px}}
  `;
  document.head.appendChild(s);
}

async function roleDashboardRequest(action='dashboard',payload={},timeoutMs=22000){
  const token=getAuthToken();if(!token)throw new Error('Sesi login tidak ditemukan.');
  const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),timeoutMs);
  try{
    const r=await fetch(ROLE_DASHBOARD_URL,{method:'POST',headers:{
      'Content-Type':'application/json','apikey':SUPABASE_PUBLISHABLE_KEY,
      'Authorization':`Bearer ${SUPABASE_PUBLISHABLE_KEY}`,'x-session-token':token
    },body:JSON.stringify({action,...payload}),signal:ctl.signal});
    const raw=await r.text();let d={};try{d=raw?JSON.parse(raw):{}}catch(_){throw new Error(`Respons dashboard bukan JSON (HTTP ${r.status}).`)}
    if(!r.ok||d.success===false)throw new Error(d.message||d.error||`Dashboard gagal dimuat (HTTP ${r.status}).`);
    return d;
  }catch(e){if(e?.name==='AbortError')throw new Error('Dashboard terlalu lama merespons.');throw e}
  finally{clearTimeout(timer)}
}

function renderDashboard(content){
  injectRoleDashboardStyles();
  const token=++dashboardLoadToken;
  content.innerHTML=`<div class="rd-shell" id="rd-root"><div class="rd-card"><span class="spinner"></span> Memuat dashboard...</div></div>`;
  loadRoleDashboard(token);
}
async function loadRoleDashboard(requestToken,force=false){
  const root=document.getElementById('rd-root');if(!root)return;
  try{
    let d;
    if(!force&&roleDashboardCache&&Date.now()-roleDashboardCacheAt<45000)d=roleDashboardCache;
    else{d=await roleDashboardRequest('dashboard');roleDashboardCache=d;roleDashboardCacheAt=Date.now()}
    if(requestToken!==dashboardLoadToken||activeModule!=='dashboard')return;
    renderRoleDashboard(d);
  }catch(e){
    root.innerHTML=`<div class="rd-card"><div class="rd-alert-row"><div class="rd-alert-title">${rdIcon('alert',16)} Dashboard belum dapat dimuat</div><div class="rd-alert-sub">${escapeHtml(e.message||'Terjadi kendala')}</div></div></div>`;
  }
}
function rdGreeting(role){
  const map={walas:'Dashboard Wali Kelas',guru:'Dashboard Guru',kesiswaan:'Dashboard Kabid Kesiswaan',pimpinan:'Dashboard Pimpinan',admin:'Dashboard Admin',akademik:'Dashboard Kabid Akademik',tahfizh:'Dashboard Kabid Tahfizh',kegiatan:'Dashboard Kabid Kegiatan'};
  return map[role]||'Dashboard';
}
function rdTasks(tasks=[]){
  if(!tasks.length)return '<div class="rd-empty">Belum ada tugas harian yang terhubung untuk role ini.</div>';
  return tasks.map(x=>`<div class="rd-task ${x.done?'done':'pending'}"><div class="rd-task-icon">${rdIcon(x.done?'check':'clock',16)}</div><div class="rd-task-main"><div class="rd-task-name">${escapeHtml(x.label)}</div><div class="rd-task-meta">${escapeHtml(x.detail||'')}</div></div><span class="rd-badge ${x.done?'done':'pending'}">${x.done?'SELESAI':'BELUM'}</span>${(!x.done&&x.can_mark)?`<button class="btn btn-sm" onclick="rdCompleteTask('${escapeHtml(x.code)}','${escapeHtml(x.scope_ref||'')}')">Tandai Sudah</button>`:''}</div>`).join('');
}
async function rdCompleteTask(code,scopeRef){
  try{await roleDashboardRequest('complete_task',{task_code:code,scope_ref:scopeRef});roleDashboardCache=null;showToast('Tugas ditandai selesai');await loadRoleDashboard(dashboardLoadToken,true)}
  catch(e){showToast(e.message||'Gagal memperbarui tugas',true)}
}
function rdLeaderboard(list=[],empty='Belum ada data yang cukup untuk leaderboard.'){
  if(!list.length)return `<div class="rd-empty">${escapeHtml(empty)}</div>`;
  return list.slice(0,5).map((x,i)=>`<div class="rd-list-row"><div class="rd-rank ${i<3?'top':''}">${i+1}</div><div><div class="rd-name">${escapeHtml(x.name)}</div><div class="rd-meta">${escapeHtml(x.meta||'')}</div></div><div class="rd-score">${Number(x.score||0).toLocaleString('id-ID')}</div></div>`).join('');
}
function rdAlerts(list=[]){
  if(!list.length)return '<div class="rd-empty">Tidak ada eskalasi aktif dari data yang tersedia.</div>';
  return list.slice(0,12).map(x=>`<div class="rd-alert-row"><div class="rd-alert-title">${rdIcon('alert',14)} ${escapeHtml(x.title)}</div><div class="rd-alert-sub">${escapeHtml(x.detail||'')}</div></div>`).join('');
}
function rdPendingTeachers(list=[]){
  if(!list.length)return '<div class="rd-empty">Semua tugas yang sudah terhubung selesai dikerjakan.</div>';
  return list.slice(0,20).map(x=>`<div class="rd-pending-row"><div><div class="rd-pending-name">${escapeHtml(x.teacher_name)}</div><div class="rd-pending-meta">${escapeHtml(x.class_name||'')} · ${escapeHtml((x.pending||[]).join(', '))}</div></div><span class="rd-badge pending">${x.pending?.length||0} belum</span></div>`).join('');
}
function rdLineChart(points=[]){
  if(!points.length)return '<div class="rd-empty">Grafik akan muncul setelah ada data kehadiran.</div>';
  const W=620,H=180,P=28,max=100,min=0;
  const xs=points.map((_,i)=>P+(i*(W-2*P))/Math.max(1,points.length-1));
  const ys=points.map(p=>H-P-((Number(p.value||0)-min)/(max-min))*(H-2*P));
  const line=xs.map((x,i)=>`${i?'L':'M'} ${x.toFixed(1)} ${ys[i].toFixed(1)}`).join(' ');
  const area=`M ${xs[0]} ${H-P} `+xs.map((x,i)=>`L ${x.toFixed(1)} ${ys[i].toFixed(1)}`).join(' ')+` L ${xs[xs.length-1]} ${H-P} Z`;
  return `<svg class="rd-chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
    ${[25,50,75,100].map(v=>{const y=H-P-(v/100)*(H-2*P);return `<line class="rd-chart-grid" x1="${P}" y1="${y}" x2="${W-P}" y2="${y}"/><text class="rd-chart-label" x="2" y="${y+3}">${v}%</text>`}).join('')}
    <path class="rd-chart-area" d="${area}"/><path class="rd-chart-line" d="${line}"/>
    ${xs.map((x,i)=>`<circle class="rd-chart-dot" cx="${x}" cy="${ys[i]}" r="3"/><text class="rd-chart-label" x="${x-11}" y="${H-7}">${escapeHtml(points[i].label||'')}</text>`).join('')}
  </svg>`;
}
function rdPointBars(v=0,r=0){
  const max=Math.max(1,v,r),vh=Math.max(3,Math.round((v/max)*120)),rh=Math.max(3,Math.round((r/max)*120));
  return `<div class="rd-bar-wrap">
    <div class="rd-bar-item"><div class="rd-bar-value">${v}</div><div class="rd-bar alt" style="height:${vh}px"></div><div class="rd-bar-label">Pelanggaran</div></div>
    <div class="rd-bar-item"><div class="rd-bar-value">${r}</div><div class="rd-bar" style="height:${rh}px"></div><div class="rd-bar-label">Reward</div></div>
  </div>`;
}

function renderRoleDashboard(d){
  const root=document.getElementById('rd-root');if(!root)return;
  const role=d.role||currentUser.role||'guru', name=currentUser?.nama||currentUser?.username||'Pengguna';
  const s=d.summary||{},scope=d.scope_label||'',tasks=d.tasks||[];

  if(role==='admin'){
    const c=d.master_counts||{};
    root.innerHTML=`<div class="rd-hero"><div class="rd-eyebrow">Dashboard Admin</div><div class="rd-title">Pengelolaan Sistem CQlass</div><div class="rd-sub">Master data, akun, dan kesehatan sistem.</div></div>
    <div class="rd-kpis">
      <div class="rd-kpi"><div class="rd-kpi-icon">${rdIcon('users')}</div><strong>${c.students||0}</strong><span>Siswa</span><small>Master aktif</small></div>
      <div class="rd-kpi"><div class="rd-kpi-icon">${rdIcon('users')}</div><strong>${c.teachers||0}</strong><span>Guru</span><small>Master guru</small></div>
      <div class="rd-kpi"><div class="rd-kpi-icon">${rdIcon('home')}</div><strong>${c.classes||0}</strong><span>Kelas</span><small>Rombel</small></div>
      <div class="rd-kpi"><div class="rd-kpi-icon">${rdIcon('book')}</div><strong>${c.subjects||0}</strong><span>Mapel</span><small>Master mapel</small></div>
      <div class="rd-kpi"><div class="rd-kpi-icon">${rdIcon('database')}</div><strong>${c.accounts||0}</strong><span>Akun</span><small>Akun login CQlass</small></div>
    </div>`;
    return;
  }

  root.innerHTML=`
    <div class="rd-hero">
      <div class="rd-eyebrow">${escapeHtml(rdGreeting(role))}</div>
      <div class="rd-title">Assalamu'alaikum, ${escapeHtml(name)}</div>
      <div class="rd-sub">${escapeHtml(scope)} · ${escapeHtml(d.date_label||'Hari ini')}</div>
    </div>

    <div class="rd-kpis">
      <div class="rd-kpi"><div class="rd-kpi-icon">${rdIcon('users')}</div><strong>${s.students||0}</strong><span>${role==='walas'?'Siswa Kelas':'Siswa dalam Scope'}</span><small>${escapeHtml(scope)}</small></div>
      <div class="rd-kpi"><div class="rd-kpi-icon">${rdIcon('check')}</div><strong>${s.attendance_pct==null?'-':String(s.attendance_pct).replace('.',',')+'%'}</strong><span>Kehadiran Hari Ini</span><small>${s.attendance_filled?'Sudah ada input':'Belum ada input hari ini'}</small></div>
      <div class="rd-kpi"><div class="rd-kpi-icon">${rdIcon('gift')}</div><strong>${s.reward_points_month||0}</strong><span>Reward Bulan Ini</span><small>Data yang sudah diinput</small></div>
      <div class="rd-kpi"><div class="rd-kpi-icon">${rdIcon('alert')}</div><strong>${s.violation_points_month||0}</strong><span>Pelanggaran Bulan Ini</span><small>Data yang sudah diinput</small></div>
      <div class="rd-kpi"><div class="rd-kpi-icon">${rdIcon('alert')}</div><strong>${s.escalation_count||0}</strong><span>Perlu Penanganan</span><small>Termasuk absen 3 hari berturut</small></div>
    </div>

    <div class="rd-grid2">
      <div class="rd-card"><div class="rd-card-head"><div><div class="rd-card-title">${rdIcon('chart',16)} Tren Kehadiran</div><div class="rd-card-sub">10 hari sekolah terakhir yang sudah mempunyai input Morning Talk.</div></div></div>${rdLineChart(d.attendance_trend||[])}</div>
      <div class="rd-card"><div class="rd-card-head"><div><div class="rd-card-title">${rdIcon('chart',16)} Perilaku Bulan Ini</div><div class="rd-card-sub">Perbandingan poin Reward dan Pelanggaran dari data yang terisi.</div></div></div>${rdPointBars(s.violation_points_month||0,s.reward_points_month||0)}</div>
    </div>

    ${role==='walas'||role==='guru'?`
    <div class="rd-grid2">
      <div class="rd-card"><div class="rd-card-head"><div><div class="rd-card-title">Tugas Hari Ini</div><div class="rd-card-sub">Reminder tetap muncul sampai tugas selesai.</div></div></div>${rdTasks(tasks)}</div>
      <div class="rd-card"><div class="rd-card-head"><div><div class="rd-card-title">Aksi Cepat</div><div class="rd-card-sub">Masuk langsung ke pekerjaan utama.</div></div></div><div class="rd-quick">
        ${role==='walas'?`<button onclick="setActiveModule('absensi')">${rdIcon('check',15)} Morning Talk</button>`:''}
        <button onclick="setActiveModule('kedisiplinan')">${rdIcon('alert',15)} Kedisiplinan</button>
        <button onclick="setActiveModule('reward')">${rdIcon('gift',15)} Reward</button>
      </div></div>
    </div>`:''}

    ${role==='kesiswaan'||role==='pimpinan'?`
    <div class="rd-grid2">
      <div class="rd-card"><div class="rd-card-head"><div><div class="rd-card-title">Guru/Walas Belum Mengerjakan</div><div class="rd-card-sub">Hanya tugas yang sudah terhubung ke CQlass.</div></div><span class="rd-badge pending">${d.pending_teachers?.length||0} guru</span></div>${rdPendingTeachers(d.pending_teachers||[])}</div>
      <div class="rd-card"><div class="rd-card-head"><div><div class="rd-card-title">Info Eskalasi ${role==='kesiswaan'?'Kesiswaan':''}</div><div class="rd-card-sub">Pelanggaran berat/DO, ambang pembinaan, dan tidak hadir 3 hari sekolah berturut-turut.</div></div></div>${rdAlerts(d.escalations||[])}</div>
    </div>`:''}

    <div class="rd-grid3">
      <div class="rd-card"><div class="rd-card-head"><div><div class="rd-card-title">${rdIcon('star',16)} 5 Siswa Inspiratif ${role==='walas'?'di Kelas Saya':'Sekolah'}</div><div class="rd-card-sub">Hanya siswa yang memiliki data input valid pada periode berjalan.</div></div></div>${rdLeaderboard(role==='walas'?(d.class_student_leaderboard||[]):(d.student_leaderboard||[]),'Belum ada input yang cukup untuk menampilkan siswa inspiratif.')}</div>
      <div class="rd-card"><div class="rd-card-head"><div><div class="rd-card-title">${rdIcon('trophy',16)} 5 Kelas Inspiratif</div><div class="rd-card-sub">Kelas tanpa aktivitas input tidak dimasukkan. Skor mempertimbangkan data yang tersedia dan kelengkapan input.</div></div></div>${rdLeaderboard(d.class_leaderboard||[],'Belum ada cukup kelas dengan data input untuk membentuk Top 5.')}</div>
      <div class="rd-card"><div class="rd-card-head"><div><div class="rd-card-title">${rdIcon('star',16)} 5 Siswa Inspiratif Sekolah</div><div class="rd-card-sub">Untuk motivasi positif; tidak menampilkan ranking terbawah.</div></div></div>${rdLeaderboard(d.student_leaderboard||[],'Belum ada data siswa sekolah yang cukup.')}</div>
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
  return `<div class="wd-rank-list">${list.slice(0,10).map((s,i)=>`<div class="wd-rank-row"><div class="wd-medal ${i<3?'r'+(i+1):''}">${i+1}</div><div><div class="wd-rank-name">${escapeHtml(s.nama||'-')}</div><div class="wd-rank-meta">${showClass?escapeHtml(s.kelas||''):''}</div></div><div class="wd-rank-score">${s.totalPoin||0} poin</div></div>`).join('')}</div>`;
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
  return list.map(s=>`<div class="wd-esc-card"><div><strong>${escapeHtml(s.nama||'-')}</strong><br><span>${escapeHtml(s.kelas||'')} · ${s.jumlahKejadian||0} kejadian</span></div><div class="wd-esc-points">${s.totalPoin||0} poin</div></div>`).join('');
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
async function ekskulV6Api(action,payload={}){
  const res=await fetch(EXTRACURRICULAR_PUBLIC_URL,{
    method:'POST',
    headers:{
      'Content-Type':'application/json',
      'apikey':SUPABASE_PUBLISHABLE_KEY,
      'Authorization':'Bearer '+SUPABASE_PUBLISHABLE_KEY
    },
    body:JSON.stringify({action,...payload})
  });
  const data=await res.json().catch(()=>({}));
  if(!res.ok||!data.success)throw new Error(data.error||'Gagal memuat data ekskul.');
  return data;
}
function injectEkskulV56Styles(){
  if(document.getElementById('ek-v56-style')) return;
  const s=document.createElement('style');s.id='ek-v56-style';
  s.textContent=`
    .ek-v56-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:14px}
    .ek-v56-chip{display:inline-flex;padding:6px 10px;border-radius:999px;background:#eaf7f6;color:var(--primary);font-size:10px;font-weight:900}
    .ek-v56-kpis{display:grid;grid-template-columns:repeat(4,minmax(120px,1fr));gap:10px;margin-bottom:14px}
    .ek-v56-kpi{background:#fff;border:1px solid var(--border);border-radius:13px;padding:13px}
    .ek-v56-kpi strong{display:block;font-size:22px;color:var(--primary);line-height:1.05}
    .ek-v56-kpi span{display:block;font-size:10px;color:var(--muted);font-weight:800;margin-top:5px}
    .ek-v56-toolbar{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:12px}
    .ek-v56-filters{display:flex;gap:8px;flex-wrap:wrap}
    .ek-v56-filters .pv2-control{min-width:190px;padding:8px 10px;font-size:11px}
    .ek-v56-card{margin-bottom:12px}
    .ek-v56-card-head{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:10px}
    .ek-v56-progress{height:7px;background:#edf3f3;border-radius:999px;overflow:hidden;min-width:80px}
    .ek-v56-progress span{display:block;height:100%;background:var(--primary);border-radius:999px}
    .ek-v56-grade{display:inline-flex;min-width:30px;justify-content:center;padding:4px 7px;border-radius:8px;background:#eef7f6;color:var(--primary);font-weight:900}
    .ek-v56-table-wrap{overflow:auto;border:1px solid var(--border);border-radius:12px}
    .ek-v56-table{width:100%;border-collapse:collapse;min-width:760px}
    .ek-v56-table th,.ek-v56-table td{padding:9px 10px;border-bottom:1px solid var(--border);font-size:11px;text-align:left;vertical-align:middle}
    .ek-v56-table th{background:#f5f9f9;color:var(--muted);font-size:9.8px;text-transform:uppercase}
    .ek-v56-table tr:last-child td{border-bottom:0}
    .ek-v56-empty{padding:20px;text-align:center;color:var(--muted);font-size:11px}
    @media(max-width:900px){.ek-v56-kpis{grid-template-columns:repeat(2,1fr)}}
    @media(max-width:650px){.ek-v56-filters{width:100%}.ek-v56-filters .pv2-control{width:100%;min-width:0}}
  `;
  document.head.appendChild(s);
}
let ekskulV56Rows=[];
function renderEkskulRekap(content){
  injectEkskulV56Styles();
  const kelas=currentUser.role==='walas'?(currentUser.kelas||''):'';
  content.innerHTML=`
    <div class="ek-v56-head">
      <div><div class="page-title">Rekap Ekstrakurikuler</div><div class="page-sub">Rekap pertemuan, kehadiran, materi, dan nilai ekskul dari Supabase.</div></div>
      ${kelas?`<span class="ek-v56-chip">${escapeHtml(kelas)}</span>`:''}
    </div>
    ${currentUser.role!=='walas'?`
      <div class="card">
        <div class="card-title">Pilih Kelas</div>
        <div style="display:flex;gap:8px;max-width:620px;flex-wrap:wrap">
          <input id="ek-rekap-kelas" class="pv2-control" type="text" placeholder="Ketik kelas, contoh: 5A Banin" style="flex:1;min-width:220px">
          <button class="btn btn-sm" style="width:auto" onclick="loadEkskulRekapAdmin()">Tampilkan</button>
        </div>
      </div>`:''}
    <div id="ek-rekap-body"></div>`;
  if(kelas) loadEkskulRekap(kelas);
}
function loadEkskulRekapAdmin(){
  const kelas=(document.getElementById('ek-rekap-kelas')?.value||'').trim();
  if(!kelas){showToast('Isi kelas terlebih dahulu.',true);return}
  loadEkskulRekap(kelas);
}
function ekV56Predikat(v){
  const x=String(v||'-').trim();return x||'-';
}
function ekV56Filter(){
  const q=(document.getElementById('ek-v56-search')?.value||'').toLowerCase().trim();
  const eks=(document.getElementById('ek-v56-exkul')?.value||'').toLowerCase();
  document.querySelectorAll('.ek-v56-student-row').forEach(tr=>{
    const text=(tr.dataset.search||'').toLowerCase(),e=(tr.dataset.ekskul||'').toLowerCase();
    tr.style.display=((!q||text.includes(q))&&(!eks||e===eks))?'':'none';
  });
  document.querySelectorAll('.ek-v56-card').forEach(card=>{
    const visible=[...card.querySelectorAll('.ek-v56-student-row')].some(r=>r.style.display!=='none');
    card.style.display=visible?'':'none';
  });
}
function ekV56Render(rows,kelas){
  const body=document.getElementById('ek-rekap-body');if(!body)return;
  const grouped={};rows.forEach(r=>{const k=r.namaEkskul||'Ekskul';(grouped[k]??=[]).push(r)});
  const eksNames=Object.keys(grouped).sort((a,b)=>a.localeCompare(b,'id'));
  const totalSiswa=new Set(rows.map(r=>String(r.nama||''))).size;
  const totalHadir=rows.reduce((z,r)=>z+Number(r.hadir||0),0);
  const totalPert=rows.reduce((z,r)=>z+Number(r.totalPertemuan||0),0);
  const avg=totalPert?Math.round(totalHadir*100/totalPert):0;
  body.innerHTML=`
    <div class="ek-v56-kpis">
      <div class="ek-v56-kpi"><strong>${eksNames.length}</strong><span>Ekskul Aktif</span></div>
      <div class="ek-v56-kpi"><strong>${totalSiswa}</strong><span>Siswa Terdata</span></div>
      <div class="ek-v56-kpi"><strong>${avg}%</strong><span>Rata-rata Kehadiran</span></div>
      <div class="ek-v56-kpi"><strong>${rows.length}</strong><span>Keikutsertaan Ekskul</span></div>
    </div>
    <div class="card">
      <div class="ek-v56-toolbar">
        <div><div class="card-title" style="margin:0">Data Ekskul ${escapeHtml(kelas)}</div><div class="page-sub" style="margin-top:3px">Pencarian dan filter dilakukan langsung di browser.</div></div>
        <div class="ek-v56-filters">
          <input id="ek-v56-search" class="pv2-control" placeholder="Cari nama siswa..." oninput="ekV56Filter()">
          <select id="ek-v56-exkul" class="pv2-control" onchange="ekV56Filter()"><option value="">Semua ekskul</option>${eksNames.map(n=>`<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`).join('')}</select>
        </div>
      </div>
    </div>
    ${eksNames.map(nama=>{
      const list=grouped[nama];
      const h=list.reduce((z,r)=>z+Number(r.hadir||0),0),t=list.reduce((z,r)=>z+Number(r.totalPertemuan||0),0),pct=t?Math.round(h*100/t):0;
      return `<div class="card ek-v56-card" data-ekskul-card="${escapeHtml(nama.toLowerCase())}">
        <div class="ek-v56-card-head"><div><div class="card-title" style="margin:0">${escapeHtml(nama)}</div><div class="page-sub" style="margin-top:3px">${list.length} siswa · Kehadiran rata-rata ${pct}%</div></div><span class="ek-v56-chip">${pct}% hadir</span></div>
        <div class="ek-v56-table-wrap"><table class="ek-v56-table"><thead><tr>
          <th>No</th><th>Nama Siswa</th><th>Kelas</th><th>Kehadiran</th><th>Keikutsertaan</th><th>Kemampuan</th><th>Deskripsi</th>
        </tr></thead><tbody>${list.map((r,i)=>{
          const p=r.totalPertemuan?Math.round(Number(r.hadir||0)*100/Number(r.totalPertemuan||0)):0;
          return `<tr class="ek-v56-student-row" data-ekskul="${escapeHtml(nama)}" data-search="${escapeHtml([r.nama,r.kelas,nama,r.predikatKeikutsertaan,r.predikatKemampuan,r.deskripsi].join(' ').toLowerCase())}">
            <td>${i+1}</td>
            <td><strong>${escapeHtml(r.nama||'-')}</strong></td>
            <td>${escapeHtml(r.kelas||'-')}</td>
            <td><div style="display:flex;align-items:center;gap:8px"><span style="min-width:34px;font-weight:800">${p}%</span><div class="ek-v56-progress"><span style="width:${Math.max(0,Math.min(100,p))}%"></span></div></div><div style="font-size:9px;color:var(--muted);margin-top:3px">${Number(r.hadir||0)} / ${Number(r.totalPertemuan||0)} pertemuan</div></td>
            <td><span class="ek-v56-grade">${escapeHtml(ekV56Predikat(r.predikatKeikutsertaan||r.nilaiKeikutsertaan))}</span></td>
            <td><span class="ek-v56-grade">${escapeHtml(ekV56Predikat(r.predikatKemampuan||r.nilaiKemampuan))}</span></td>
            <td>${escapeHtml(r.deskripsi||'-')}</td>
          </tr>`;
        }).join('')}</tbody></table></div>
      </div>`;
    }).join('')}`;
}
async function loadEkskulRekap(kelas){
  const body=document.getElementById('ek-rekap-body');if(!body)return;
  body.innerHTML=`<div class="card"><span class="spinner"></span> Memuat rekap ekskul...</div>`;
  try{
    const res=await ekskulV6Api('recap',{class_name:kelas});
    ekskulV56Rows=res.rows||[];
    if(!ekskulV56Rows.length){body.innerHTML=`<div class="empty-state"><div class="icon">—</div>Belum ada data pertemuan ekskul untuk kelas ${escapeHtml(kelas)}.</div>`;return}
    // Adapter V6 agar renderer V5.6 tetap ringan.
    ekskulV56Rows=ekskulV56Rows.map(r=>({
      ...r,
      predikatKeikutsertaan:r.rataNilai==null?'-':String(r.rataNilai),
      predikatKemampuan:r.rataNilai==null?'-':String(r.rataNilai),
      nilaiKeikutsertaan:r.rataNilai,
      nilaiKemampuan:r.rataNilai
    }));
    ekV56Render(ekskulV56Rows,kelas);
  }catch(e){
    body.innerHTML=`<div class="empty-state"><div class="icon">—</div>${escapeHtml(e.message||'Terjadi kendala saat memuat data ekskul.')}</div>`;
  }
}

/* ==========================================================
   AKADEMIK V7.2 — INPUT NILAI AKADEMIK SUPABASE
   - Backend: bootstrap / load / save_component / save_tp
   - Tugas 1-5 + TP dinamis + WWP + ASAS
   - Navigasi seperti Excel
   - Paste dari Excel
   - Drag/fill nilai ke bawah
   ========================================================== */

const academicGridState = {
  assignments: [],
  assignmentId: '',
  academicYear: '2026/2027',
  semester: 1,
  assignment: null,
  objectives: [],
  students: [],
  canEdit: false,
  dirty: new Map(),
  loadToken: 0,
  pickerOpen: false,
  fill: { active:false, startInput:null, lastInput:null }
};

async function academicGridRequest(action, payload = {}, timeoutMs = 30000){
  const token = getAuthToken();
  if(!token) throw new Error('Sesi login tidak ditemukan. Silakan login kembali.');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try{
    const response = await fetch(ACADEMIC_SCORES_URL, {
      method:'POST', signal:controller.signal,
      headers:{
        'Content-Type':'application/json',
        'apikey':SUPABASE_PUBLISHABLE_KEY,
        'Authorization':`Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
        'x-session-token':token
      },
      body:JSON.stringify({ action, ...payload })
    });
    const raw = await response.text();
    let data = {};
    try{ data = raw ? JSON.parse(raw) : {}; }
    catch(_){ throw new Error(`Respons akademik bukan JSON. HTTP ${response.status}`); }
    if(!response.ok || data.success === false){
      const messages = {
        unknown_action:'Versi halaman nilai tidak sesuai dengan backend Academic V7.2.',
        session_invalid:'Sesi login sudah tidak berlaku.',
        session_expired:'Sesi login telah berakhir.',
        assignment_not_found:'Penugasan guru tidak ditemukan.',
        assignment_forbidden:'Anda tidak memiliki akses ke pembelajaran ini.',
        read_only:'Nilai hanya dapat diubah oleh guru pengampu.',
        scores_empty:'Tidak ada nilai yang dikirim.',
        assessment_type_invalid:'Komponen nilai tidak valid.',
        learning_objective_required:'Tujuan Pembelajaran belum dipilih.',
        learning_objective_forbidden:'TP tidak sesuai dengan mata pelajaran ini.'
      };
      throw new Error(messages[data.error] || data.detail || data.message || data.error || `HTTP ${response.status}`);
    }
    return data;
  }catch(err){
    if(err?.name === 'AbortError') throw new Error('Server akademik terlalu lama merespons.');
    throw err;
  }finally{ clearTimeout(timer); }
}

function injectAcademicGridStyles(){
  if(document.getElementById('academic-grid-v72-style')) return;
  const style = document.createElement('style');
  style.id = 'academic-grid-v72-style';
  style.textContent = `
    .ag-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;flex-wrap:wrap}
    .ag-filter-card{padding:22px 26px}.ag-filter-title{font-size:18px;font-weight:800;color:var(--text);margin-bottom:18px}
    .ag-filter-grid{display:grid;grid-template-columns:minmax(300px,2.1fr) minmax(170px,.9fr) minmax(160px,.8fr);gap:16px;align-items:end}
    .ag-field label{display:block;margin-bottom:7px;font-size:11px;font-weight:800;color:var(--muted);text-transform:uppercase;letter-spacing:.035em}
    .ag-readonly{min-height:48px;display:flex;align-items:center;padding:0 15px;border:1.5px solid #d9e6e6;border-radius:12px;background:#f3f8f8;color:#075f5d;font-weight:800;font-size:14px}
    .ag-select{width:100%;height:48px;padding:0 42px 0 14px;border:1.5px solid #d5e3e3;border-radius:12px;background:linear-gradient(45deg,transparent 50%,#567170 50%) calc(100% - 18px) 20px/5px 5px no-repeat,linear-gradient(135deg,#567170 50%,transparent 50%) calc(100% - 13px) 20px/5px 5px no-repeat,#fff;appearance:none;-webkit-appearance:none;font:inherit;font-weight:700;color:var(--text);outline:none;cursor:pointer}
    .ag-select:focus{border-color:var(--primary);box-shadow:0 0 0 3px rgba(10,110,110,.10)}
    .ag-picker{position:relative}.ag-picker-button{width:100%;min-height:52px;border:1.5px solid #d5e3e3;border-radius:12px;background:#fff;padding:9px 14px;display:flex;align-items:center;justify-content:space-between;gap:12px;text-align:left;cursor:pointer;font:inherit;color:var(--text);transition:.15s}
    .ag-picker-button:hover{border-color:#a9cecc}.ag-picker-button.open,.ag-picker-button:focus{border-color:var(--primary);box-shadow:0 0 0 3px rgba(10,110,110,.10);outline:none}
    .ag-picker-main{display:flex;flex-direction:column;min-width:0;line-height:1.25}.ag-picker-class{font-size:13.5px;font-weight:850;color:#153f3e}.ag-picker-subject{font-size:11.5px;font-weight:600;color:var(--muted);margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .ag-picker-chevron{width:18px;height:18px;flex:0 0 auto;color:#567170;transition:.15s}.ag-picker-button.open .ag-picker-chevron{transform:rotate(180deg)}
    .ag-picker-menu{position:absolute;top:calc(100% + 7px);left:0;right:0;z-index:80;background:#fff;border:1px solid #d7e5e4;border-radius:14px;box-shadow:0 18px 42px rgba(25,70,68,.15);overflow:hidden}
    .ag-picker-search-wrap{padding:10px;border-bottom:1px solid var(--border);background:#f8fbfb}.ag-picker-search{width:100%;height:39px;padding:0 12px;border:1px solid var(--border);border-radius:9px;font:inherit;outline:none}.ag-picker-search:focus{border-color:var(--primary)}
    .ag-picker-options{max-height:290px;overflow:auto;padding:5px}.ag-picker-option{width:100%;border:0;background:#fff;border-radius:9px;padding:10px 11px;display:flex;align-items:center;justify-content:space-between;gap:12px;cursor:pointer;text-align:left;font:inherit}.ag-picker-option:hover{background:#eef8f7}.ag-picker-option.active{background:#e4f4f2}
    .ag-picker-option-left{min-width:0;display:flex;flex-direction:column}.ag-picker-option-class{font-size:12.5px;font-weight:850}.ag-picker-option-subject{font-size:11px;color:var(--muted);margin-top:3px}.ag-view-badge{font-size:9px;padding:4px 7px;border-radius:999px;background:#f0f3f3;color:#758583;font-weight:800;white-space:nowrap}
    .ag-meta{display:flex;gap:7px;flex-wrap:wrap;margin:12px 0}.ag-chip{display:inline-flex;align-items:center;height:30px;padding:0 11px;border-radius:999px;background:#e8f5f3;color:#116c67;font-size:10.5px;font-weight:850}.ag-chip.gray{background:#f0f3f3;color:#617472}.ag-chip.warn{background:#fff2de;color:#8e6500}
    .ag-table-card{padding:0;overflow:hidden}.ag-table-toolbar{padding:17px 18px 13px;display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap;border-bottom:1px solid var(--border)}.ag-toolbar-title{font-size:15px;font-weight:850}.ag-toolbar-sub{margin-top:3px;font-size:10.5px;color:var(--muted)}.ag-toolbar-actions{display:flex;align-items:center;gap:9px;flex-wrap:wrap}
    .ag-save-state{font-size:10.5px;font-weight:750;color:#71817f}.ag-save-state.dirty{color:#a46b00}
    .ag-table-scroll{width:100%;overflow:auto;overscroll-behavior:contain;max-height:calc(100vh - 315px);min-height:330px}.ag-table{border-collapse:separate;border-spacing:0;width:max-content;min-width:100%;font-size:11px}
    .ag-table th{position:sticky;top:0;z-index:5;height:43px;padding:7px 8px;background:#edf6f5;border-right:1px solid #dce9e8;border-bottom:1px solid #cddfdd;color:#456664;font-size:10px;font-weight:850;text-align:center;white-space:nowrap}.ag-table td{height:42px;padding:0;background:#fff;border-right:1px solid #e1ebea;border-bottom:1px solid #e4ecec;position:relative}.ag-table tbody tr:hover td{background:#fbfdfd}
    .ag-no{min-width:48px;width:48px;text-align:center;position:sticky!important;left:0;z-index:4;background:#fff!important}th.ag-no{z-index:8;background:#edf6f5!important}.ag-name{min-width:215px;width:215px;position:sticky!important;left:48px;z-index:4;padding:7px 11px!important;background:#fff!important;box-shadow:3px 0 5px rgba(34,74,72,.04)}th.ag-name{z-index:8;background:#edf6f5!important}.ag-student-name{font-size:11px;font-weight:800;line-height:1.25;color:#183e3c}.ag-student-nis{font-size:9px;color:#879895;margin-top:2px}
    .ag-score-cell{width:64px;min-width:64px}.ag-score-input{width:100%;height:41px;border:0;outline:none;text-align:center;background:transparent;color:#173f3d;font:inherit;font-size:11px;font-weight:750;padding:0 5px;border-radius:0;-moz-appearance:textfield}.ag-score-input:focus{background:#fff;box-shadow:inset 0 0 0 2px var(--primary);position:relative;z-index:3}.ag-score-cell.dirty{background:#fff9e8!important}.ag-score-input.invalid{background:#fff0ec;color:#b04433;box-shadow:inset 0 0 0 2px #db7463}.ag-score-input[disabled]{background:#f6f8f8;color:#788785}
    .ag-fill-handle{width:8px;height:8px;position:absolute;right:0;bottom:0;background:var(--primary);cursor:crosshair;display:none;z-index:7}.ag-score-cell:focus-within .ag-fill-handle{display:block}.ag-fill-preview{background:#eaf7f5!important;box-shadow:inset 0 0 0 1px #4ca9a3}
    .ag-calc{min-width:72px;padding:0 8px!important;text-align:center;font-weight:800;color:#335d5a;background:#f7faf9!important}.ag-na{min-width:76px;font-size:11.5px;color:#075f5d}.ag-predicate{min-width:62px;font-weight:900;font-size:12px}.ag-status{min-width:82px;padding:0 8px!important;text-align:center;background:#f7faf9!important}.ag-status-pill{display:inline-flex;padding:4px 8px;border-radius:999px;font-size:9px;font-weight:850}.ag-status-pill.ok{background:#e8f7ef;color:#357352}.ag-status-pill.bad{background:#fff0ec;color:#ad4c39}.ag-tp-head{cursor:help}
    .ag-footer{padding:11px 18px;display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:center;background:#fbfdfd;border-top:1px solid var(--border);color:#758683;font-size:10px}.ag-loading{display:flex;align-items:center;gap:9px}
    @media(max-width:850px){.ag-filter-grid{grid-template-columns:1fr}.ag-table-scroll{max-height:calc(100vh - 380px)}.ag-name{min-width:170px;width:170px}}
  `;
  document.head.appendChild(style);
}

function renderLegger(content){
  injectAcademicGridStyles();
  academicGridState.assignments=[]; academicGridState.assignmentId=''; academicGridState.assignment=null;
  academicGridState.objectives=[]; academicGridState.students=[]; academicGridState.canEdit=false;
  academicGridState.dirty=new Map(); academicGridState.pickerOpen=false; academicGridState.loadToken++;
  content.innerHTML=`
    <div class="ag-head"><div><div class="page-title">Nilai</div><div class="page-sub">Pilih kelas dan mata pelajaran yang Anda ajar, lalu isi Tugas, TP, WWP, dan ASAS.</div></div></div>
    <div id="academic-grid-root"><div class="card"><div class="ag-loading"><span class="spinner" style="border-top-color:var(--primary);border-color:rgba(10,110,110,.25)"></span>Menyiapkan pembelajaran...</div></div></div>`;
  academicGridBootstrap();
}

async function academicGridBootstrap(){
  const root=document.getElementById('academic-grid-root'); if(!root)return;
  const token=++academicGridState.loadToken;
  try{
    const result=await academicGridRequest('bootstrap',{academic_year:academicGridState.academicYear,semester_no:academicGridState.semester});
    if(token!==academicGridState.loadToken)return;
    academicGridState.assignments=Array.isArray(result.assignments)?result.assignments:[];
    academicGridState.academicYear=result.academic_year||academicGridState.academicYear;
    academicGridState.semester=Number(result.semester_no??result.semester)||academicGridState.semester;
    if(!academicGridState.assignments.length){root.innerHTML='<div class="empty-state"><div class="icon">—</div>Belum ada penugasan kelas/mapel pada periode ini.</div>';return;}
    const oldId=academicGridState.assignmentId;
    academicGridState.assignmentId=academicGridState.assignments.some(a=>String(a.id)===String(oldId))?oldId:academicGridState.assignments[0].id;
    renderAcademicGridFilters();
    await academicGridLoad();
  }catch(err){if(token!==academicGridState.loadToken)return;root.innerHTML=`<div class="empty-state"><div class="icon">—</div>${escapeHtml(err.message||'Gagal memuat data akademik.')}</div>`;}
}

function academicSelectedAssignment(){return academicGridState.assignments.find(a=>String(a.id)===String(academicGridState.assignmentId))||null;}

function renderAcademicGridFilters(){
  const root=document.getElementById('academic-grid-root'); if(!root)return;
  const selected=academicSelectedAssignment();
  root.innerHTML=`
    <div class="card ag-filter-card"><div class="ag-filter-title">Pilih Pembelajaran</div><div class="ag-filter-grid">
      <div class="ag-field"><label>Kelas & Mata Pelajaran</label><div class="ag-picker">
        <button type="button" class="ag-picker-button" id="ag-picker-button" onclick="academicToggleAssignmentPicker(event)"><span class="ag-picker-main"><span class="ag-picker-class">${escapeHtml(selected?.class_name||'Pilih kelas')}</span><span class="ag-picker-subject">${escapeHtml(selected?.subject_name||'Pilih mata pelajaran')}</span></span><svg class="ag-picker-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg></button>
        <div id="ag-picker-menu" class="ag-picker-menu" style="display:none"><div class="ag-picker-search-wrap"><input id="ag-picker-search" class="ag-picker-search" placeholder="Cari kelas atau mata pelajaran..." oninput="academicFilterAssignmentOptions()" autocomplete="off"></div><div class="ag-picker-options" id="ag-picker-options">
          ${academicGridState.assignments.map(a=>`<button type="button" class="ag-picker-option ${String(a.id)===String(academicGridState.assignmentId)?'active':''}" data-search="${escapeHtml(`${a.class_name||''} ${a.subject_name||''}`.toLowerCase())}" onclick="academicChooseAssignment('${escapeHtml(a.id)}')"><span class="ag-picker-option-left"><span class="ag-picker-option-class">${escapeHtml(a.class_name||'-')}</span><span class="ag-picker-option-subject">${escapeHtml(a.subject_name||'-')}</span></span>${a.can_edit===false?'<span class="ag-view-badge">LIHAT</span>':''}</button>`).join('')}
        </div></div></div></div>
      <div class="ag-field"><label>Tahun Ajaran</label><div class="ag-readonly">${escapeHtml(academicGridState.academicYear)}</div></div>
      <div class="ag-field"><label>Semester</label><select id="ag-semester" class="ag-select" onchange="academicSemesterChanged(this.value)"><option value="1" ${academicGridState.semester===1?'selected':''}>Semester 1</option><option value="2" ${academicGridState.semester===2?'selected':''}>Semester 2</option></select></div>
    </div></div><div id="academic-grid-table-area"></div>`;
}

function academicToggleAssignmentPicker(event){event?.stopPropagation();const menu=document.getElementById('ag-picker-menu'),button=document.getElementById('ag-picker-button');if(!menu||!button)return;academicGridState.pickerOpen=!academicGridState.pickerOpen;menu.style.display=academicGridState.pickerOpen?'block':'none';button.classList.toggle('open',academicGridState.pickerOpen);if(academicGridState.pickerOpen)setTimeout(()=>document.getElementById('ag-picker-search')?.focus(),0);}
function academicCloseAssignmentPicker(){academicGridState.pickerOpen=false;const menu=document.getElementById('ag-picker-menu'),button=document.getElementById('ag-picker-button');if(menu)menu.style.display='none';button?.classList.remove('open');}
function academicFilterAssignmentOptions(){const q=(document.getElementById('ag-picker-search')?.value||'').trim().toLowerCase();document.querySelectorAll('#ag-picker-options .ag-picker-option').forEach(o=>o.style.display=!q||(o.dataset.search||'').includes(q)?'flex':'none');}
async function academicChooseAssignment(id){academicCloseAssignmentPicker();if(String(id)===String(academicGridState.assignmentId))return;if(academicGridState.dirty.size&&!confirm('Ada perubahan nilai yang belum disimpan. Pindah pembelajaran tanpa menyimpan?'))return;academicGridState.assignmentId=id;academicGridState.dirty=new Map();renderAcademicGridFilters();await academicGridLoad();}
async function academicSemesterChanged(value){const next=Number(value)||1;if(next===academicGridState.semester)return;if(academicGridState.dirty.size&&!confirm('Ada perubahan nilai yang belum disimpan. Ganti semester tanpa menyimpan?')){const el=document.getElementById('ag-semester');if(el)el.value=String(academicGridState.semester);return;}academicGridState.semester=next;academicGridState.assignmentId='';academicGridState.dirty=new Map();await academicGridBootstrap();}

async function academicGridLoad(){
  const area=document.getElementById('academic-grid-table-area');if(!area||!academicGridState.assignmentId)return;
  const token=++academicGridState.loadToken;area.innerHTML='<div class="card"><div class="ag-loading"><span class="spinner" style="border-top-color:var(--primary);border-color:rgba(10,110,110,.25)"></span>Memuat siswa dan nilai...</div></div>';
  try{
    const result=await academicGridRequest('load',{assignment_id:academicGridState.assignmentId,academic_year:academicGridState.academicYear,semester_no:academicGridState.semester});
    if(token!==academicGridState.loadToken)return;
    const loadedAssignment=result.assignment||{};
    academicGridState.assignment={
      id:academicGridState.assignmentId,
      ...loadedAssignment,
      class_name:loadedAssignment.class_name||result.class_name||academicSelectedAssignment()?.class_name||'',
      subject_name:loadedAssignment.subject_name||result.subject_name||academicSelectedAssignment()?.subject_name||''
    };
    const loadedObjectives=Array.isArray(result.objectives)
      ? result.objectives
      : (Array.isArray(result.components?.tp) ? result.components.tp : []);
    academicGridState.objectives=loadedObjectives;
    academicGridState.students=Array.isArray(result.students)?result.students:[];
    academicGridState.canEdit=result.can_edit!==false;academicGridState.dirty=new Map();renderAcademicGridTable();
  }catch(err){if(token!==academicGridState.loadToken)return;area.innerHTML=`<div class="empty-state"><div class="icon">—</div>${escapeHtml(err.message||'Gagal memuat nilai akademik.')}</div>`;}
}

const ACADEMIC_COMPONENTS=['TUGAS_1','TUGAS_2','TUGAS_3','TUGAS_4','TUGAS_5'];
function academicNumeric(value){if(value===''||value===null||value===undefined)return null;const n=Number(value);return Number.isFinite(n)?n:null;}
function academicComponentScore(student,type){return academicNumeric(student?.components?.[type]?.score);}
function academicTPScore(student,objectiveId){const row=(student?.tp||[]).find(x=>String(x.learning_objective_id)===String(objectiveId));return academicNumeric(row?.score);}
function academicSetComponentScore(student,type,value){if(!student.components)student.components={};if(!student.components[type])student.components[type]={score:null,notes:null};student.components[type].score=value;}
function academicSetTPScore(student,objectiveId,value){if(!Array.isArray(student.tp))student.tp=[];let row=student.tp.find(x=>String(x.learning_objective_id)===String(objectiveId));if(!row){const o=academicGridState.objectives.find(x=>String(x.id)===String(objectiveId));row={learning_objective_id:objectiveId,code:o?.code||'',score:null,notes:null};student.tp.push(row);}row.score=value;}
function academicAverage(values){const valid=values.filter(v=>v!==null);return valid.length?valid.reduce((a,b)=>a+b,0)/valid.length:null;}
function academicTaskAverage(student){return academicAverage(ACADEMIC_COMPONENTS.map(t=>academicComponentScore(student,t)));}
function academicTPAverage(student){return academicAverage(academicGridState.objectives.map(o=>academicTPScore(student,o.id)));}
function academicStudentComplete(student){return ACADEMIC_COMPONENTS.every(t=>academicComponentScore(student,t)!==null)&&academicGridState.objectives.length>0&&academicGridState.objectives.every(o=>academicTPScore(student,o.id)!==null)&&academicComponentScore(student,'WWP')!==null&&academicComponentScore(student,'ASAS')!==null;}
function academicFinalScore(student){if(!academicStudentComplete(student))return null;return academicTaskAverage(student)*.10+academicTPAverage(student)*.30+academicComponentScore(student,'WWP')*.10+academicComponentScore(student,'ASAS')*.50;}
function academicPredicate(score){if(score===null)return'—';if(score>=89)return'A';if(score>=82)return'B';if(score>=75)return'C';return'D';}
function academicFormatScore(value){if(value===null||value===undefined)return'—';const n=Math.round(Number(value)*100)/100;return Number.isInteger(n)?String(n):n.toFixed(2).replace(/0+$/,'').replace(/\.$/,'');}

function renderAcademicGridTable(){
  const area=document.getElementById('academic-grid-table-area');if(!area)return;const students=academicGridState.students,objectives=academicGridState.objectives;
  if(!students.length){area.innerHTML='<div class="empty-state"><div class="icon">—</div>Belum ada siswa aktif pada kelas ini.</div>';return;}
  const assignment=academicSelectedAssignment();
  area.innerHTML=`<div class="ag-meta"><span class="ag-chip">${students.length} siswa</span><span class="ag-chip">${escapeHtml(assignment?.class_name||academicGridState.assignment?.class_name||'')}</span><span class="ag-chip">${escapeHtml(assignment?.subject_name||academicGridState.assignment?.subject_name||'')}</span><span class="ag-chip gray">${objectives.length} TP</span>${academicGridState.canEdit?'':'<span class="ag-chip warn">Mode Lihat</span>'}</div>
    <div class="card ag-table-card"><div class="ag-table-toolbar"><div><div class="ag-toolbar-title">Nilai Siswa</div><div class="ag-toolbar-sub">← → pindah kolom · Enter / ↓ turun · Shift+Enter / ↑ naik · Ctrl+V tempel dari Excel · tarik titik pojok sel untuk mengisi ke bawah.</div></div><div class="ag-toolbar-actions"><span class="ag-save-state" id="ag-save-state">Semua perubahan tersimpan</span>${academicGridState.canEdit?'<button class="btn btn-sm" id="ag-save-button" onclick="academicGridSave()" disabled>Simpan Perubahan</button>':''}</div></div>
    <div class="ag-table-scroll"><table class="ag-table" id="academic-score-table"><thead><tr><th class="ag-no">No</th><th class="ag-name">Nama Siswa</th>${ACADEMIC_COMPONENTS.map((_,i)=>`<th title="Tugas ${i+1}">T${i+1}</th>`).join('')}<th>RT</th>${objectives.map((o,i)=>`<th class="ag-tp-head" title="${escapeHtml(`${o.code||`TP${i+1}`} — ${o.topic||o.description||''}`)}">${escapeHtml(o.code||`TP${i+1}`)}</th>`).join('')}<th>RTP</th><th>WWP</th><th>ASAS</th><th>NA</th><th>Pred.</th><th>Status</th></tr></thead><tbody>
    ${students.map((student,rowIndex)=>{const taskAvg=academicTaskAverage(student),tpAvg=academicTPAverage(student),finalScore=academicFinalScore(student),predicate=academicPredicate(finalScore),status=finalScore===null?'—':finalScore>=75?'Tuntas':'Belum';return `<tr data-student-id="${escapeHtml(student.id)}" data-row="${rowIndex}"><td class="ag-no">${rowIndex+1}</td><td class="ag-name"><div class="ag-student-name">${escapeHtml(student.name)}</div><div class="ag-student-nis">${escapeHtml(student.nis||student.nisn||'')}</div></td>${ACADEMIC_COMPONENTS.map((type,colIndex)=>academicGridInputCell(student,rowIndex,colIndex,{kind:'component',type},academicComponentScore(student,type))).join('')}<td class="ag-calc" data-calc="task-average">${academicFormatScore(taskAvg)}</td>${objectives.map((objective,index)=>academicGridInputCell(student,rowIndex,ACADEMIC_COMPONENTS.length+index,{kind:'tp',objectiveId:objective.id},academicTPScore(student,objective.id))).join('')}<td class="ag-calc" data-calc="tp-average">${academicFormatScore(tpAvg)}</td>${academicGridInputCell(student,rowIndex,ACADEMIC_COMPONENTS.length+objectives.length,{kind:'component',type:'WWP'},academicComponentScore(student,'WWP'))}${academicGridInputCell(student,rowIndex,ACADEMIC_COMPONENTS.length+objectives.length+1,{kind:'component',type:'ASAS'},academicComponentScore(student,'ASAS'))}<td class="ag-calc ag-na" data-calc="final">${academicFormatScore(finalScore)}</td><td class="ag-calc ag-predicate" data-calc="predicate">${predicate}</td><td class="ag-status" data-calc="status">${status==='—'?'—':`<span class="ag-status-pill ${status==='Tuntas'?'ok':'bad'}">${status}</span>`}</td></tr>`;}).join('')}</tbody></table></div><div class="ag-footer"><span>Nilai Akhir = Rata Tugas 10% + Rata TP 30% + WWP 10% + ASAS 50%.</span><span>Nilai Akhir tampil setelah seluruh komponen siswa terisi.</span></div></div>`;
  academicUpdateSaveState();
}

function academicGridInputCell(student,rowIndex,colIndex,config,value){
  const disabled=academicGridState.canEdit?'':'disabled';let dataset=config.kind==='component'?`data-kind="component" data-component="${escapeHtml(config.type)}"`:`data-kind="tp" data-objective-id="${escapeHtml(config.objectiveId)}"`;
  return `<td class="ag-score-cell" data-row="${rowIndex}" data-col="${colIndex}"><input class="ag-score-input" type="text" inputmode="decimal" autocomplete="off" value="${value===null?'':escapeHtml(academicFormatScore(value))}" data-student-id="${escapeHtml(student.id)}" data-row="${rowIndex}" data-col="${colIndex}" ${dataset} ${disabled} onfocus="this.select()" oninput="academicGridInputChanged(this)" onkeydown="academicGridKeydown(event,this)" onpaste="academicGridPaste(event,this)">${academicGridState.canEdit?'<span class="ag-fill-handle" title="Tarik ke bawah" onpointerdown="academicFillStart(event,this)"></span>':''}</td>`;
}

function academicParseInput(input){const raw=String(input.value||'').trim().replace(',','.');if(raw===''){input.classList.remove('invalid');return null;}if(!/^(?:\d{1,3})(?:\.\d{0,2})?$/.test(raw)){input.classList.add('invalid');return undefined;}const value=Number(raw);if(!Number.isFinite(value)||value<0||value>100){input.classList.add('invalid');return undefined;}input.classList.remove('invalid');return value;}
function academicGridInputChanged(input){const value=academicParseInput(input);if(value===undefined)return;academicApplyInputValue(input,value,true);}
function academicApplyInputValue(input,value,markDirty=true){const studentId=input.dataset.studentId,student=academicGridState.students.find(s=>String(s.id)===String(studentId));if(!student)return;if(input.dataset.kind==='tp'){const objectiveId=input.dataset.objectiveId;academicSetTPScore(student,objectiveId,value);if(markDirty)academicGridState.dirty.set(`${studentId}|TP|${objectiveId}`,{kind:'tp',student_id:studentId,learning_objective_id:objectiveId,score:value});}else{const type=input.dataset.component;academicSetComponentScore(student,type,value);if(markDirty)academicGridState.dirty.set(`${studentId}|${type}`,{kind:'component',student_id:studentId,assessment_type:type,score:value});}input.closest('.ag-score-cell')?.classList.toggle('dirty',markDirty);academicRefreshStudentRow(studentId);academicUpdateSaveState();}
function academicRefreshStudentRow(studentId){const row=document.querySelector(`#academic-score-table tbody tr[data-student-id="${CSS.escape(String(studentId))}"]`),student=academicGridState.students.find(s=>String(s.id)===String(studentId));if(!row||!student)return;const taskAvg=academicTaskAverage(student),tpAvg=academicTPAverage(student),finalScore=academicFinalScore(student),status=finalScore===null?'—':finalScore>=75?'Tuntas':'Belum';const set=(k,v)=>{const el=row.querySelector(`[data-calc="${k}"]`);if(el)el.innerHTML=v;};set('task-average',academicFormatScore(taskAvg));set('tp-average',academicFormatScore(tpAvg));set('final',academicFormatScore(finalScore));set('predicate',academicPredicate(finalScore));set('status',status==='—'?'—':`<span class="ag-status-pill ${status==='Tuntas'?'ok':'bad'}">${status}</span>`);}
function academicInputAt(row,col){return document.querySelector(`#academic-score-table .ag-score-input[data-row="${row}"][data-col="${col}"]`);}
function academicGridKeydown(event,input){if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Enter'].includes(event.key))return;event.preventDefault();const row=Number(input.dataset.row),col=Number(input.dataset.col);let nr=row,nc=col;if(event.key==='ArrowLeft')nc--;else if(event.key==='ArrowRight')nc++;else if(event.key==='ArrowUp'||(event.key==='Enter'&&event.shiftKey))nr--;else nr++;const target=academicInputAt(nr,nc);if(target){target.focus();target.select();}}
function academicGridPaste(event,input){if(!academicGridState.canEdit)return;const text=event.clipboardData?.getData('text/plain');if(!text)return;event.preventDefault();const rows=text.replace(/\r/g,'').split('\n').filter((r,i,a)=>!(i===a.length-1&&r==='')).map(r=>r.split('\t'));const startRow=Number(input.dataset.row),startCol=Number(input.dataset.col);let changed=0;rows.forEach((vals,r)=>vals.forEach((raw,c)=>{const target=academicInputAt(startRow+r,startCol+c);if(!target)return;const normalized=String(raw).trim().replace(',','.');if(normalized===''||(/^(?:\d{1,3})(?:\.\d{0,2})?$/.test(normalized)&&Number(normalized)>=0&&Number(normalized)<=100)){target.value=normalized;target.classList.remove('invalid');academicApplyInputValue(target,normalized===''?null:Number(normalized),true);changed++;}}));if(changed)showToast(`${changed} nilai ditempel dari clipboard.`);}

function academicClearFillPreview(){document.querySelectorAll('#academic-score-table .ag-fill-preview').forEach(el=>el.classList.remove('ag-fill-preview'));}
function academicFillStart(event,handle){if(!academicGridState.canEdit)return;event.preventDefault();event.stopPropagation();const input=handle.parentElement?.querySelector('.ag-score-input');if(!input)return;academicGridState.fill={active:true,startInput:input,lastInput:input};handle.setPointerCapture?.(event.pointerId);document.addEventListener('pointermove',academicFillMove);document.addEventListener('pointerup',academicFillEnd,{once:true});}
function academicFillMove(event){if(!academicGridState.fill.active)return;const el=document.elementFromPoint(event.clientX,event.clientY)?.closest?.('.ag-score-cell')?.querySelector?.('.ag-score-input');const start=academicGridState.fill.startInput;if(!el||!start||el.dataset.col!==start.dataset.col)return;academicGridState.fill.lastInput=el;academicClearFillPreview();const a=Number(start.dataset.row),b=Number(el.dataset.row),col=Number(start.dataset.col);for(let r=Math.min(a,b);r<=Math.max(a,b);r++)academicInputAt(r,col)?.closest('.ag-score-cell')?.classList.add('ag-fill-preview');}
function academicFillEnd(){document.removeEventListener('pointermove',academicFillMove);const {startInput:start,lastInput:end}=academicGridState.fill;academicGridState.fill={active:false,startInput:null,lastInput:null};academicClearFillPreview();if(!start||!end)return;const parsed=academicParseInput(start);if(parsed===undefined)return;const startRow=Number(start.dataset.row),endRow=Number(end.dataset.row),col=Number(start.dataset.col);let count=0;for(let row=Math.min(startRow,endRow);row<=Math.max(startRow,endRow);row++){const target=academicInputAt(row,col);if(!target)continue;target.value=parsed===null?'':academicFormatScore(parsed);target.classList.remove('invalid');academicApplyInputValue(target,parsed,true);count++;}if(count>1)showToast(`${count} sel diisi dengan nilai yang sama.`);}

function academicUpdateSaveState(){const count=academicGridState.dirty.size,button=document.getElementById('ag-save-button'),state=document.getElementById('ag-save-state');if(button){button.disabled=count===0;button.textContent=count?`Simpan Perubahan (${count})`:'Simpan Perubahan';}if(state){state.textContent=count?`${count} nilai belum disimpan`:'Semua perubahan tersimpan';state.classList.toggle('dirty',count>0);}}

async function academicGridSave(){
  if(!academicGridState.canEdit||!academicGridState.dirty.size)return;const invalid=document.querySelector('#academic-score-table .ag-score-input.invalid');if(invalid){showToast('Masih ada nilai yang tidak valid. Gunakan angka 0–100.',true);invalid.focus();return;}
  const button=document.getElementById('ag-save-button'),changes=[...academicGridState.dirty.values()];if(button){button.disabled=true;button.innerHTML='<span class="spinner"></span>Menyimpan...';}
  try{
    const componentGroups=new Map(),tpGroups=new Map();changes.filter(x=>x.kind==='component').forEach(ch=>{if(!componentGroups.has(ch.assessment_type))componentGroups.set(ch.assessment_type,[]);componentGroups.get(ch.assessment_type).push({student_id:ch.student_id,score:ch.score});});changes.filter(x=>x.kind==='tp').forEach(ch=>{if(!tpGroups.has(ch.learning_objective_id))tpGroups.set(ch.learning_objective_id,[]);tpGroups.get(ch.learning_objective_id).push({student_id:ch.student_id,score:ch.score});});let saved=0;
    for(const [assessmentType,scores] of componentGroups.entries()){const result=await academicGridRequest('save_component',{assignment_id:academicGridState.assignmentId,academic_year:academicGridState.academicYear,semester_no:academicGridState.semester,assessment_type:assessmentType,scores},45000);saved+=Number(result.saved)||0;}
    for(const [objectiveId,scores] of tpGroups.entries()){const result=await academicGridRequest('save_tp',{assignment_id:academicGridState.assignmentId,academic_year:academicGridState.academicYear,semester_no:academicGridState.semester,learning_objective_id:objectiveId,scores},45000);saved+=Number(result.saved)||0;}
    academicGridState.dirty=new Map();document.querySelectorAll('#academic-score-table .ag-score-cell.dirty').forEach(c=>c.classList.remove('dirty'));academicUpdateSaveState();showToast(`${saved||changes.length} nilai berhasil disimpan.`);await academicGridLoad();
  }catch(err){showToast(err.message||'Nilai belum berhasil disimpan.',true);academicUpdateSaveState();}
  finally{const b=document.getElementById('ag-save-button');if(b){b.disabled=academicGridState.dirty.size===0;b.textContent=academicGridState.dirty.size?`Simpan Perubahan (${academicGridState.dirty.size})`:'Simpan Perubahan';}}
}

document.addEventListener('click',event=>{if(academicGridState.pickerOpen&&!event.target.closest('.ag-picker'))academicCloseAssignmentPicker();});

/* Sidebar tetap modul lama; hanya label/render Input Nilai yang diarahkan ke Academic V7.2. */
const academicMenuItem = MODULE_GROUPS.find(group=>group.id==='akademik')?.items?.find(item=>item.id==='leger');
if(academicMenuItem){academicMenuItem.render=renderLegger;academicMenuItem.label='Nilai';}
