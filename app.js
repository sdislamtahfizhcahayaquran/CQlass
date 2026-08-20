// ==========================================================
// KONFIGURASI — WAJIB DIISI SESUAI DEPLOYMENT ANDA
// ==========================================================
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzNKFqYZ4M6ceOTTR7KdcCeQ4sCXzjVhth1bcAOr_iWGNXJcvNPipjv1K97V4DM3Z-48g/exec';
const APP_SECRET = 'MUss8dN31aFfnLE1sk81o1pqh1Xtf6L2KTA5JLVU';

const AVATAR_FILE_IDS = Object.freeze({
  1: '1tgINi8MBBS-R5ipMJqF7vkgQNQYYA4Dz',
  2: '15msnk6ZsL0fRPkeotASeHHll-JP_Yxly',
  3: '1JNOHARq1ZQITgLsS1kmoxsoLA1uK3SID',
  4: '18gThlrlo8sRaMrcDnlQyLfE9k3OXSfH9',
  5: '1PdW5oHLo8UoxIPTvzzmLcglFibdNL6Bv',
  6: '1J594hTY9k6MmUMao4ZCLekKg5YqpOrET',
  7: '1vMoeqmXgbRRtCE8zrCI31rgnk1LD_fjm',
  8: '1AWCMCUq-L4bc76qVqQ_6PQERGQe1X5_g',
  9: '1TGNAiTOZ_QhSQcdLT9DEB6FsDQj8Ta9Z',
  10: '13PkSMo6XvyPs1Pk0JUzxYo3GotejuwJK',
  11: '1M3k1rRYQ9fC82Jet7ckfv4VqrH658QUD',
  12: '1F3NTZJrcE9fMBzL_bCIMatNe16ZbwVsI',
});

function driveAvatarThumbnail(fileId){
  return `https://drive.google.com/thumbnail?id=${encodeURIComponent(fileId)}&sz=w1000`;
}

function driveAvatarFallback(fileId){
  return `https://drive.google.com/uc?export=view&id=${encodeURIComponent(fileId)}`;
}

const AVATAR_DATA = Object.freeze(
  Object.fromEntries(
    Object.entries(AVATAR_FILE_IDS).map(([id, fileId]) => [id, driveAvatarThumbnail(fileId)])
  )
);

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

function avatarImageError(img, avatarId){
  if(!img || img.dataset.fallbackUsed === '1') return;
  const fileId = AVATAR_FILE_IDS[avatarId];
  if(!fileId) return;
  img.dataset.fallbackUsed = '1';
  img.src = driveAvatarFallback(fileId);
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
  const timeoutMs = action === 'login' ? 12000 : 20000;
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
    showToast(data.error || 'Terjadi kesalahan', true);
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
   AUTH & SESSION
   ========================================================== */
let currentUser = null;

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;
  const errEl = document.getElementById('login-error');
  const btn = document.getElementById('login-btn');

  errEl.style.display = 'none';
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>Memeriksa...';

  try{
    const passwordHash = await hashPassword(username, password);
    const res = await callApi('login', { username, passwordHash });
    if(res.success){
      currentUser = res.user;
      sessionStorage.setItem('kesiswaan_user', JSON.stringify(currentUser));
      enterApp();
    } else {
      errEl.textContent = 'Username atau password salah.';
      errEl.style.display = 'block';
    }
  } catch(err){
    errEl.textContent = err?.message || 'Gagal terhubung ke server. Cek koneksi internet.';
    errEl.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Masuk';
  }
});

function logout(){
  if(bellIntervalId){
    clearInterval(bellIntervalId);
    bellIntervalId = null;
  }
  sessionStorage.removeItem('kesiswaan_user');
  currentUser = null;
  document.getElementById('app-screen').style.display = 'none';
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('login-form').reset();
}

window.addEventListener('load', () => {
  const saved = sessionStorage.getItem('kesiswaan_user');
  if(saved){
    currentUser = JSON.parse(saved);
    enterApp();
  }
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
  document.getElementById('account-modal').classList.remove('open');
}
document.getElementById('account-modal').addEventListener('click', (e) => {
  if(e.target.id === 'account-modal') closeAccountModal();
});

function switchAccountTab(tab){
  document.getElementById('tab-btn-pass').classList.toggle('active', tab === 'pass');
  document.getElementById('tab-btn-user').classList.toggle('active', tab === 'user');
  document.getElementById('tab-btn-avatar').classList.toggle('active', tab === 'avatar');
  document.getElementById('pane-pass').classList.toggle('active', tab === 'pass');
  document.getElementById('pane-user').classList.toggle('active', tab === 'user');
  document.getElementById('pane-avatar').classList.toggle('active', tab === 'avatar');
  hideModalMsgs();
  if(tab === 'avatar') renderAvatarGrid();
}
function hideModalMsgs(){
  ['pass-error','pass-success','user-error','user-success','avatar-error','avatar-success'].forEach(id => {
    document.getElementById(id).style.display = 'none';
  });
}

function renderAvatarGrid(){
  const grid = document.getElementById('avatar-grid');
  grid.innerHTML = '';
  Object.keys(AVATAR_DATA).forEach(id => {
    const btn = document.createElement('div');
    btn.className = 'avatar-option' + (String(currentUser.avatar) === String(id) ? ' selected' : '');
    btn.innerHTML = `<img src="${AVATAR_DATA[id]}" alt="Avatar ${id}" loading="lazy" referrerpolicy="no-referrer" onerror="avatarImageError(this, '${id}')">`;
    btn.onclick = () => submitAvatarPilih(id);
    grid.appendChild(btn);
  });
}

async function submitAvatarPilih(avatarId){
  const errEl = document.getElementById('avatar-error');
  const okEl = document.getElementById('avatar-success');
  errEl.style.display = 'none'; okEl.style.display = 'none';
  try{
    const res = await callApi('submitAvatar', { username: currentUser.username, avatar: avatarId });
    if(res.success){
      currentUser.avatar = avatarId;
      sessionStorage.setItem('kesiswaan_user', JSON.stringify(currentUser));
      renderAvatarGrid();
      okEl.textContent = 'Avatar berhasil disimpan.';
      okEl.style.display = 'block';
      showToast('Avatar berhasil disimpan');
    } else {
      errEl.textContent = 'Gagal menyimpan avatar.';
      errEl.style.display = 'block';
    }
  } catch(err){
    errEl.textContent = 'Gagal terhubung ke server.';
    errEl.style.display = 'block';
  }
}

async function submitGantiPassword(e){
  e.preventDefault();
  const errEl = document.getElementById('pass-error');
  const okEl = document.getElementById('pass-success');
  const btn = document.getElementById('pass-submit-btn');
  errEl.style.display = 'none'; okEl.style.display = 'none';

  const oldPass = document.getElementById('pass-old').value;
  const newPass = document.getElementById('pass-new').value;
  const newPassConfirm = document.getElementById('pass-new-confirm').value;

  if(newPass !== newPassConfirm){
    errEl.textContent = 'Password baru dan konfirmasi tidak sama.';
    errEl.style.display = 'block';
    return false;
  }
  if(newPass.length < 4){
    errEl.textContent = 'Password baru minimal 4 karakter.';
    errEl.style.display = 'block';
    return false;
  }

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>Menyimpan...';

  try{
    const oldHash = await hashPassword(currentUser.username, oldPass);
    const newHash = await hashPassword(currentUser.username, newPass);
    const res = await callApi('gantiPassword', {
      username: currentUser.username,
      oldPasswordHash: oldHash,
      newPasswordHash: newHash
    });

    if(res.success){
      okEl.textContent = 'Password berhasil diubah.';
      okEl.style.display = 'block';
      document.getElementById('form-pass').reset();
      showToast('Password berhasil diubah');
    } else {
      const pesan = {
        password_lama_salah: 'Password lama salah.',
        akun_nonaktif: 'Akun sedang tidak aktif. Hubungi admin.',
        password_baru_kosong: 'Password baru tidak boleh kosong.',
        user_not_found: 'Akun tidak ditemukan.'
      };
      errEl.textContent = pesan[res.error] || 'Gagal mengubah password.';
      errEl.style.display = 'block';
    }
  } catch(err){
    errEl.textContent = 'Gagal terhubung ke server.';
    errEl.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Simpan Password Baru';
  }
  return false;
}

async function submitGantiUsername(e){
  e.preventDefault();
  const errEl = document.getElementById('user-error');
  const okEl = document.getElementById('user-success');
  const btn = document.getElementById('user-submit-btn');
  errEl.style.display = 'none'; okEl.style.display = 'none';

  const currentPass = document.getElementById('user-pass-verify').value;
  const newUsername = document.getElementById('user-new').value.trim();

  if(!newUsername){
    errEl.textContent = 'Username baru tidak boleh kosong.';
    errEl.style.display = 'block';
    return false;
  }
  if(newUsername.toLowerCase() === currentUser.username.toLowerCase()){
    errEl.textContent = 'Username baru sama dengan username sekarang.';
    errEl.style.display = 'block';
    return false;
  }

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>Menyimpan...';

  try{
    const passwordHash = await hashPassword(currentUser.username, currentPass);
    const newPasswordHash = await hashPassword(newUsername, currentPass);

    const res = await callApi('gantiUsername', {
      oldUsername: currentUser.username,
      passwordHash,
      newUsername,
      newPasswordHash
    });

    if(res.success){
      currentUser.username = res.newUsername;
      sessionStorage.setItem('kesiswaan_user', JSON.stringify(currentUser));
      okEl.textContent = 'Username berhasil diubah menjadi "' + res.newUsername + '".';
      okEl.style.display = 'block';
      document.getElementById('form-user').reset();
      showToast('Username berhasil diubah');
    } else {
      const pesan = {
        password_salah: 'Password yang Anda masukkan salah.',
        akun_nonaktif: 'Akun sedang tidak aktif. Hubungi admin.',
        username_baru_kosong: 'Username baru tidak boleh kosong.',
        username_sudah_dipakai: 'Username itu sudah dipakai orang lain.',
        newPasswordHash_wajib_dikirim: 'Terjadi kesalahan sistem, coba lagi.',
        user_not_found: 'Akun tidak ditemukan.'
      };
      errEl.textContent = pesan[res.error] || 'Gagal mengubah username.';
      errEl.style.display = 'block';
    }
  } catch(err){
    errEl.textContent = 'Gagal terhubung ke server.';
    errEl.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Simpan Username Baru';
  }
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
      { id: 'ekskul', label: 'Ekskul', roles: ['walas','kesiswaan','pimpinan'], built: false }
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
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app-screen').style.display = 'block';
  document.getElementById('user-name').textContent = currentUser.nama;
  document.getElementById('user-role').textContent = currentUser.role.toUpperCase();

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
   MODUL: ABSENSI (Morning Talk)
   ========================================================== */
let absensiState = { kelas:null, siswa:[], status:{}, tema:'', fotoBase64:null, fotoMime:null };

function renderAbsensi(content){
  const isWalas = currentUser.role === 'walas';
  content.innerHTML = `
    <div class="page-title">Absensi — Morning Talk</div>
    <div class="page-sub">Catat kehadiran siswa saat Morning Talk hari ini.</div>

    ${!isWalas ? `
    <div class="card">
      <div class="card-title">Pilih Kelas</div>
      <input type="text" id="absensi-kelas-input" placeholder="Ketik nama kelas persis, contoh: 1 Banin A"
        style="width:100%;padding:11px 14px;border:2px solid var(--border);border-radius:10px;font-family:inherit;font-size:14px;">
    </div>` : ''}

    <div id="absensi-body"></div>
  `;

  if(isWalas){
    absensiState.kelas = currentUser.kelas;
    loadAbsensiForKelas();
  } else {
    document.getElementById('absensi-kelas-input').addEventListener('change', (e) => {
      absensiState.kelas = e.target.value.trim();
      loadAbsensiForKelas();
    });
  }
}

async function loadAbsensiForKelas(){
  if(!absensiState.kelas) return;
  const body = document.getElementById('absensi-body');
  body.innerHTML = `<div class="card"><span class="spinner" style="border-top-color:var(--primary);border-color:rgba(10,110,110,0.25)"></span>Memuat data...</div>`;

  const [cek, siswaRes] = await Promise.all([
    callApi('getAbsensiHariIni', { kelas: absensiState.kelas }),
    callApi('getSiswaByKelas', { kelas: absensiState.kelas })
  ]);

  if(cek.sudahAbsen){
    renderAbsensiSudahDiisi(cek);
    return;
  }

  absensiState.siswa = siswaRes.data || [];
  absensiState.status = {};
  absensiState.tema = '';
  absensiState.siswa.forEach(s => absensiState.status[s.nis] = 'Hadir');
  renderAbsensiForm();
}

function renderAbsensiSudahDiisi(cek){
  const body = document.getElementById('absensi-body');
  body.innerHTML = `
    <div class="card">
      <div class="card-title">Sudah diisi hari ini</div>
      ${cek.temaMT ? `<div style="font-size:13.5px; margin-bottom:14px;"><strong>Tema Morning Talk:</strong> ${escapeHtml(cek.temaMT)}</div>` : `<div style="font-size:12.5px; color:var(--muted); margin-bottom:14px;">Tema Morning Talk belum diisi.</div>`}
      <div class="rekap-grid">
        <div class="rekap-box"><div class="num" style="color:var(--success)">${cek.rekap.Hadir}</div><div class="lbl">Hadir</div></div>
        <div class="rekap-box"><div class="num" style="color:var(--warn)">${cek.rekap.Sakit}</div><div class="lbl">Sakit</div></div>
        <div class="rekap-box"><div class="num" style="color:#6A8FA6">${cek.rekap.Izin}</div><div class="lbl">Izin</div></div>
        <div class="rekap-box"><div class="num" style="color:var(--danger)">${cek.rekap.Alfa}</div><div class="lbl">Alfa</div></div>
      </div>
      <div style="font-size:12.5px;color:var(--muted)">Total tercatat: ${cek.total} siswa</div>
    </div>
  `;
}

function renderAbsensiForm(){
  const body = document.getElementById('absensi-body');
  if(absensiState.siswa.length === 0){
    body.innerHTML = `<div class="empty-state"><div class="icon">—</div>Belum ada data siswa untuk kelas ini di sheet Siswa.</div>`;
    return;
  }

  body.innerHTML = `
    <div class="card">
      <div class="card-title">Tema Morning Talk</div>
      <input type="text" id="tema-input" placeholder="Contoh: Adab kepada orang tua" value="${escapeHtml(absensiState.tema || '')}"
        style="width:100%;padding:11px 14px;border:2px solid var(--border);border-radius:10px;font-family:inherit;font-size:14px;"
        oninput="absensiState.tema = this.value">
    </div>

    <div class="card">
      <div class="card-title">Foto Kondisi Kelas</div>
      <div class="foto-upload" id="foto-upload-box" onclick="document.getElementById('foto-input').click()">
        Klik untuk unggah 1 foto suasana Morning Talk
      </div>
      <input type="file" id="foto-input" accept="image/*" style="display:none" onchange="handleFotoSelect(event)">
      <img id="foto-preview" style="max-width:100%;max-height:160px;border-radius:8px;margin-top:10px;display:none;">
    </div>

    <div class="card">
      <div class="card-title">Kehadiran Siswa (${absensiState.siswa.length} siswa)</div>
      <div id="siswa-list"></div>
    </div>

    <button class="btn" id="submit-absensi-btn" onclick="submitAbsensiForm()">Simpan Absensi</button>
  `;

  const list = document.getElementById('siswa-list');
  absensiState.siswa.forEach(s => {
    const row = document.createElement('div');
    row.className = 'siswa-row';
    row.innerHTML = `
      <div><div class="siswa-name">${escapeHtml(s.nama)}</div><div class="siswa-nis">NIS ${escapeHtml(s.nis)}</div></div>
      <div class="status-btns" data-nis="${escapeHtml(s.nis)}">
        ${['Hadir','Sakit','Izin','Alfa'].map(st => `<button type="button" class="status-btn sel-${st} ${absensiState.status[s.nis]===st?'selected':''}" onclick="setStatus('${escapeHtml(s.nis)}','${st}')">${st}</button>`).join('')}
      </div>
    `;
    list.appendChild(row);
  });
}

function setStatus(nis, status){
  absensiState.status[nis] = status;
  document.querySelectorAll(`.status-btns[data-nis="${nis}"] .status-btn`).forEach(btn => {
    btn.classList.toggle('selected', btn.classList.contains('sel-' + status));
  });
}

function handleFotoSelect(e){
  const file = e.target.files[0];
  if(!file) return;
  absensiState.fotoMime = file.type;
  const reader = new FileReader();
  reader.onload = () => {
    absensiState.fotoBase64 = reader.result.split(',')[1];
    document.getElementById('foto-upload-box').textContent = 'Foto dipilih: ' + file.name;
    document.getElementById('foto-upload-box').classList.add('has-file');
    const preview = document.getElementById('foto-preview');
    preview.src = reader.result;
    preview.style.display = 'block';
  };
  reader.readAsDataURL(file);
}

async function submitAbsensiForm(){
  const btn = document.getElementById('submit-absensi-btn');
  const temaInput = document.getElementById('tema-input');
  if(temaInput) absensiState.tema = temaInput.value.trim();

  if(!absensiState.tema){
    showToast('Isi dulu tema Morning Talk hari ini', true);
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>Menyimpan...';

  try{
    let fotoUrl = '';
    if(absensiState.fotoBase64){
      const uploadRes = await callApi('uploadFotoMT', {
        base64: absensiState.fotoBase64,
        mimeType: absensiState.fotoMime,
        filename: `MT_${absensiState.kelas}_${new Date().toISOString().slice(0,10)}.jpg`
      });
      if(uploadRes.success) fotoUrl = uploadRes.url;
    }

    const data = absensiState.siswa.map(s => ({ nis: s.nis, nama: s.nama, status: absensiState.status[s.nis] }));
    const res = await callApi('submitAbsensi', {
      kelas: absensiState.kelas,
      temaMT: absensiState.tema,
      dicatatOleh: currentUser.nama,
      fotoUrl,
      data
    });

    if(res.success){
      showToast('Absensi berhasil disimpan');
      loadAbsensiForKelas();
    }
  } finally {
    btn.disabled = false;
    btn.textContent = 'Simpan Absensi';
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
   MODUL: KEDISIPLINAN
   ========================================================== */
let kdState = {
  kelas:null, jenjang:null, tab:'riwayat', inputMode:'pelanggaran',
  tanggal:'', siswa:[], masterList:[],
  pelanggaranTerpilih:null, siswaTerpilihIds:{},
  siswaTerpilih:null, pelanggaranTerpilihMap:{},
  keterlambatanPending:[], keterlambatanTerpilih:{}
};

function todayStrKD(){
  const d = new Date();
  const pad = n => n.toString().padStart(2,'0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}

function getJenjangSDSMPClient(kelasFull){
  const m = (kelasFull || '').toString().trim().match(/^(\d+)/);
  if(!m) return null;
  const angka = parseInt(m[1], 10);
  return angka <= 6 ? 'SD' : 'SMP';
}

function renderKedisiplinan(content){
  const isWalas = currentUser.role === 'walas';
  kdState.tanggal = kdState.tanggal || todayStrKD();

  content.innerHTML = `
    <div class="page-title">Kedisiplinan &amp; Poin Pelanggaran</div>
    <div class="page-sub">Catat pelanggaran siswa dan pantau akumulasi poin per kelas.</div>

    ${!isWalas ? `
    <div class="card">
      <div class="card-title">Pilih Kelas</div>
      <input type="text" id="kd-kelas-input" placeholder="Ketik nama kelas persis, contoh: 1 Banin A"
        style="width:100%;padding:11px 14px;border:2px solid var(--border);border-radius:10px;font-family:inherit;font-size:14px;">
    </div>` : ''}

    <div id="kd-body"></div>
  `;

  if(isWalas){
    kdState.kelas = currentUser.kelas;
    loadKedisiplinanKelas();
  } else {
    document.getElementById('kd-kelas-input').addEventListener('change', (e) => {
      kdState.kelas = e.target.value.trim();
      loadKedisiplinanKelas();
    });
  }
}

async function loadKedisiplinanKelas(){
  if(!kdState.kelas) return;
  kdState.jenjang = getJenjangSDSMPClient(kdState.kelas);

  const body = document.getElementById('kd-body');
  body.innerHTML = `<div class="card"><span class="spinner" style="border-top-color:var(--primary);border-color:rgba(10,110,110,0.25)"></span>Memuat data...</div>`;

  const [siswaRes, masterRes] = await Promise.all([
    callApi('getSiswaByKelas', { kelas: kdState.kelas }),
    callApi('getMasterPelanggaran', { jenjang: kdState.jenjang })
  ]);
  kdState.siswa = siswaRes.data || [];
  kdState.masterList = masterRes.data || [];

  await loadKdKeterlambatanPending();

  renderKedisiplinanShell();

  if(currentUser.role === 'walas' && kdState.kelas === currentUser.kelas){
    const logKey = 'log_kedisiplinan_' + todayStrKD() + '_' + currentUser.username;
    if(!sessionStorage.getItem(logKey)){
      callApi('logAktivitas', {
        username: currentUser.username, nama: currentUser.nama,
        kelas: currentUser.kelas, modul: 'Kedisiplinan', aksi: 'buka'
      });
      sessionStorage.setItem(logKey, '1');
    }
  }
}

async function loadKdKeterlambatanPending(){
  const res = await callApi('getKeterlambatanBelumDicatat', { kelas: kdState.kelas });
  const list = res.data || [];
  kdState.keterlambatanPending = list.filter(r => !r.sudahDicatat)
    .sort((a,b) => (a.tanggal||'').localeCompare(b.tanggal||''));
  kdState.keterlambatanTerpilih = {};
  kdState.keterlambatanPending.forEach(r => { kdState.keterlambatanTerpilih[r.tanggal + '|' + r.nis] = true; });
}

function renderKedisiplinanShell(){
  const body = document.getElementById('kd-body');

  if(kdState.siswa.length === 0){
    body.innerHTML = `<div class="empty-state"><div class="icon">—</div>Belum ada data siswa untuk kelas ini di sheet Siswa.</div>`;
    return;
  }
  if(kdState.masterList.length === 0){
    body.innerHTML = `<div class="empty-state"><div class="icon">—</div>Sheet "MasterPelanggaran" belum terisi untuk jenjang ${kdState.jenjang || '-'}. Import master_pelanggaran.csv dulu.</div>`;
    return;
  }

  body.innerHTML = `
    <div id="kd-notif-area"></div>
    <div class="kd-tabs">
      <button class="kd-tab ${kdState.tab==='riwayat'?'active':''}" onclick="switchKdTab('riwayat')">Riwayat &amp; Rekap Poin</button>
      <button class="kd-tab ${kdState.tab==='input'?'active':''}" onclick="switchKdTab('input')">+ Input Pelanggaran</button>
      <button class="kd-tab ${kdState.tab==='bulanan'?'active':''}" onclick="switchKdTab('bulanan')">Rekap Bulanan</button>
    </div>
    <div id="kd-tab-content"></div>
  `;
  renderKdNotifKeterlambatan();
  renderKdTabContent();
}

function renderKdNotifKeterlambatan(){
  const area = document.getElementById('kd-notif-area');
  if(!area) return;

  if(!kdState.keterlambatanPending || kdState.keterlambatanPending.length === 0){
    area.innerHTML = '';
    return;
  }

  const jumlah = kdState.keterlambatanPending.length;
  area.innerHTML = `
    <div class="kd-notif-card">
      <div class="kd-notif-title"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>Keterlambatan Belum Dikonfirmasi — ${jumlah} siswa</div>
      <div id="kd-notif-list"></div>
      <button class="btn" id="kd-notif-konfirmasi-btn" style="margin-top:12px;background:var(--danger);"
        onclick="submitKonfirmasiKeterlambatan()">Konfirmasi Terpilih Jadi Poin</button>
    </div>
  `;

  const list = document.getElementById('kd-notif-list');
  kdState.keterlambatanPending.forEach(r => {
    const key = r.tanggal + '|' + r.nis;
    const row = document.createElement('label');
    row.className = 'kd-notif-row';
    row.innerHTML = `
      <input type="checkbox" ${kdState.keterlambatanTerpilih[key] ? 'checked' : ''} onchange="kdState.keterlambatanTerpilih['${key}'] = this.checked">
      <div><div class="siswa-name">${escapeHtml(r.nama)}</div><div class="siswa-nis">NIS ${escapeHtml(r.nis)} • ${formatTanggalIndo(r.tanggal)}</div></div>
      <span class="menit">telat ${r.menitTerlambat} menit</span>
    `;
    list.appendChild(row);
  });
}

function formatTanggalIndo(tglStr){
  if(!tglStr) return '-';
  const [y, m, d] = tglStr.split('-').map(Number);
  const nama = ['','Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
  return `${d} ${nama[m] || ''} ${y}`;
}

async function submitKonfirmasiKeterlambatan(){
  const btn = document.getElementById('kd-notif-konfirmasi-btn');
  const listSiswa = kdState.keterlambatanPending.filter(r => kdState.keterlambatanTerpilih[r.tanggal + '|' + r.nis]);
  if(listSiswa.length === 0){
    showToast('Pilih minimal 1 siswa', true);
    return;
  }
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>Menyimpan...';
  try{
    const res = await callApi('konfirmasiKeterlambatanJadiPoin', {
      kelas: kdState.kelas,
      dicatatOleh: currentUser.nama,
      listSiswa: listSiswa.map(r => ({ nis: r.nis, nama: r.nama, tanggal: r.tanggal }))
    });
    if(res.success){
      showToast(`Keterlambatan ${listSiswa.length} siswa berhasil dijadikan poin`);
      await loadKdKeterlambatanPending();
      renderKdNotifKeterlambatan();
      if(kdState.tab === 'riwayat') renderKdRiwayat();
      if(currentUser.role === 'walas') refreshPendingKeterlambatanBadge();
    }
  } finally {
    btn.disabled = false;
    btn.textContent = 'Konfirmasi Terpilih Jadi Poin';
  }
}

function switchKdTab(tab){
  kdState.tab = tab;
  renderKedisiplinanShell();
}

function renderKdTabContent(){
  if(kdState.tab === 'riwayat') renderKdRiwayat();
  else if(kdState.tab === 'bulanan') renderKdBulanan();
  else renderKdInput();
}

async function renderKdRiwayat(){
  const c = document.getElementById('kd-tab-content');
  c.innerHTML = `<div class="card"><span class="spinner" style="border-top-color:var(--primary);border-color:rgba(10,110,110,0.25)"></span>Memuat rekap...</div>`;

  const [rekapRes, riwayatRes] = await Promise.all([
    callApi('getRekapPoinKelas', { kelas: kdState.kelas }),
    callApi('getRiwayatPelanggaran', { kelas: kdState.kelas })
  ]);
  const rekap = rekapRes.data || [];
  const riwayat = riwayatRes.data || [];

  c.innerHTML = `
    <div class="card">
      <div class="card-title">Rekap Total Poin — ${escapeHtml(kdState.kelas)}</div>
      ${rekap.length === 0 ? '<div class="empty-state"><div class="icon">—</div>Belum ada data siswa.</div>' : '<div id="kd-rekap-list"></div>'}
    </div>
    <div class="card">
      <div class="card-title">Riwayat Pelanggaran (terbaru dulu)</div>
      ${riwayat.length === 0 ? '<div class="empty-state"><div class="icon">—</div>Belum ada pelanggaran tercatat untuk kelas ini.</div>' : '<div id="kd-riwayat-list"></div>'}
    </div>
  `;

  if(rekap.length > 0){
    const rekapList = document.getElementById('kd-rekap-list');
    rekap.forEach(s => {
      const cls = s.totalPoin >= 100 ? 'tinggi' : (s.totalPoin >= 50 ? 'sedang' : 'aman');
      const row = document.createElement('div');
      row.className = 'kd-rekap-row';
      row.innerHTML = `
        <div><div class="siswa-name">${escapeHtml(s.nama)}</div><div class="siswa-nis">NIS ${escapeHtml(s.nis)} • ${s.jumlahPelanggaran} pelanggaran</div></div>
        <div class="kd-rekap-total ${cls}">${s.totalPoin} poin</div>
      `;
      rekapList.appendChild(row);
    });
  }

  if(riwayat.length > 0){
    const riwayatList = document.getElementById('kd-riwayat-list');
    riwayat.forEach(r => {
      const kategoriClass = r.kategori === 'Berat' ? 'kd-poin-berat' : (r.kategori === 'Sedang' ? 'kd-poin-sedang' : 'kd-poin-ringan');
      const row = document.createElement('div');
      row.className = 'kd-riwayat-row';
      row.innerHTML = `
        <div class="kd-riwayat-head">
          <div>
            <div class="siswa-name">${escapeHtml(r.nama)} <span class="siswa-nis">(NIS ${escapeHtml(r.nis)})</span></div>
            <div style="font-size:12.5px;margin-top:2px;">${escapeHtml(r.pelanggaran)}</div>
            <div style="font-size:11px;color:var(--muted);margin-top:4px;">${escapeHtml(r.tanggal)} • dicatat oleh ${escapeHtml(r.dicatatOleh || '-')}</div>
          </div>
          <div style="text-align:right;flex-shrink:0;">
            <span class="kd-poin-badge ${kategoriClass}">${r.poin} poin</span><br>
            <button class="kd-riwayat-del" onclick="hapusRiwayatKd('${escapeHtml(r.id)}')">Hapus</button>
          </div>
        </div>
      `;
      riwayatList.appendChild(row);
    });
  }
}

async function hapusRiwayatKd(id){
  if(!confirm('Hapus catatan pelanggaran ini?')) return;
  const res = await callApi('hapusPelanggaran', { id });
  if(res.success){
    showToast('Catatan berhasil dihapus');
    renderKdRiwayat();
  }
}

function renderKdInput(){
  const c = document.getElementById('kd-tab-content');
  c.innerHTML = `
    <div class="card">
      <div class="card-title">Tanggal Kejadian</div>
      <input type="date" id="kd-tanggal-input" value="${kdState.tanggal}"
        style="padding:10px 14px;border:2px solid var(--border);border-radius:10px;font-family:inherit;font-size:14px;"
        onchange="kdState.tanggal = this.value">
    </div>

    <div class="kd-mode-toggle">
      <button class="kd-mode-btn ${kdState.inputMode==='pelanggaran'?'active':''}" onclick="setKdInputMode('pelanggaran')">
        1 Pelanggaran → Banyak Siswa<br><span style="font-weight:400;font-size:11px;">Pilih jenis pelanggaran dulu, lalu centang siswanya</span>
      </button>
      <button class="kd-mode-btn ${kdState.inputMode==='siswa'?'active':''}" onclick="setKdInputMode('siswa')">
        1 Siswa → Banyak Pelanggaran<br><span style="font-weight:400;font-size:11px;">Cari siswa dulu, lalu tambahkan pelanggarannya</span>
      </button>
    </div>

    <div id="kd-input-body"></div>
  `;
  if(kdState.inputMode === 'pelanggaran') renderKdModePelanggaran();
  else renderKdModeSiswa();
}

function setKdInputMode(mode){
  kdState.inputMode = mode;
  kdState.pelanggaranTerpilih = null;
  kdState.siswaTerpilihIds = {};
  kdState.siswaTerpilih = null;
  kdState.pelanggaranTerpilihMap = {};
  renderKdInput();
}

function renderKdModePelanggaran(){
  const body = document.getElementById('kd-input-body');

  if(!kdState.pelanggaranTerpilih){
    body.innerHTML = `
      <div class="card">
        <div class="card-title">Langkah 1: Cari Jenis Pelanggaran</div>
        <input type="text" class="kd-search-input" id="kd-cari-pelanggaran" placeholder="Ketik minimal 1 huruf, contoh: terlambat"
          oninput="filterKdPelanggaran(this.value)" autocomplete="off">
        <div class="kd-search-results" id="kd-hasil-pelanggaran"></div>
      </div>
    `;
    return;
  }

  const p = kdState.pelanggaranTerpilih;
  const kategoriClass = p.kategori === 'Berat' ? 'kd-poin-berat' : (p.kategori === 'Sedang' ? 'kd-poin-sedang' : 'kd-poin-ringan');
  const terpilihCount = Object.keys(kdState.siswaTerpilihIds).filter(k => kdState.siswaTerpilihIds[k]).length;

  body.innerHTML = `
    <div class="card">
      <div class="card-title">Pelanggaran Terpilih</div>
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;">
        <div><strong>${escapeHtml(p.pelanggaran)}</strong> <span class="kd-poin-badge ${kategoriClass}">${p.poin} poin</span></div>
        <button class="btn btn-outline btn-sm" onclick="kdState.pelanggaranTerpilih=null; renderKdModePelanggaran();">Ganti</button>
      </div>
    </div>

    <div class="card">
      <div class="card-title">Langkah 2: Centang Siswa yang Melakukan Pelanggaran Ini (${terpilihCount} dipilih)</div>
      <div id="kd-daftar-siswa-check"></div>
      <button class="btn" id="kd-submit-pelanggaran-btn" style="margin-top:14px;" onclick="submitKdModePelanggaran()">Simpan Pelanggaran</button>
    </div>
  `;

  const list = document.getElementById('kd-daftar-siswa-check');
  kdState.siswa.forEach(s => {
    const row = document.createElement('label');
    row.className = 'kd-siswa-checkrow';
    row.innerHTML = `
      <input type="checkbox" ${kdState.siswaTerpilihIds[s.nis] ? 'checked' : ''} onchange="toggleKdSiswa('${escapeHtml(s.nis)}', this.checked)">
      <div><div class="siswa-name">${escapeHtml(s.nama)}</div><div class="siswa-nis">NIS ${escapeHtml(s.nis)}</div></div>
    `;
    list.appendChild(row);
  });
}

function filterKdPelanggaran(query){
  const hasil = document.getElementById('kd-hasil-pelanggaran');
  const q = query.trim().toLowerCase();
  if(q.length < 1){ hasil.innerHTML = ''; return; }

  const matches = kdState.masterList.filter(p => p.pelanggaran.toLowerCase().includes(q));
  if(matches.length === 0){
    hasil.innerHTML = `<div class="kd-search-item">Tidak ditemukan</div>`;
    return;
  }
  hasil.innerHTML = '';
  matches.slice(0, 30).forEach(p => {
    const item = document.createElement('div');
    item.className = 'kd-search-item';
    item.innerHTML = `<span>${escapeHtml(p.pelanggaran)}</span><span class="kd-item-sub">${escapeHtml(p.kategori)} • ${p.poin} poin</span>`;
    item.onclick = () => { kdState.pelanggaranTerpilih = p; renderKdModePelanggaran(); };
    hasil.appendChild(item);
  });
}

function toggleKdSiswa(nis, checked){
  kdState.siswaTerpilihIds[nis] = checked;
}

async function submitKdModePelanggaran(){
  const btn = document.getElementById('kd-submit-pelanggaran-btn');
  const listSiswa = kdState.siswa.filter(s => kdState.siswaTerpilihIds[s.nis]);
  if(listSiswa.length === 0){
    showToast('Pilih minimal 1 siswa', true);
    return;
  }
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>Menyimpan...';
  try{
    const res = await callApi('submitPelanggaranBanyakSiswa', {
      kelas: kdState.kelas,
      tanggal: kdState.tanggal,
      pelanggaran: kdState.pelanggaranTerpilih.pelanggaran,
      kategori: kdState.pelanggaranTerpilih.kategori,
      poin: kdState.pelanggaranTerpilih.poin,
      dicatatOleh: currentUser.nama,
      listSiswa
    });
    if(res.success){
      showToast(`Pelanggaran dicatat untuk ${res.count} siswa`);
      kdState.pelanggaranTerpilih = null;
      kdState.siswaTerpilihIds = {};
      kdState.tab = 'riwayat';
      renderKedisiplinanShell();
    }
  } finally {
    btn.disabled = false;
    btn.textContent = 'Simpan Pelanggaran';
  }
}

function renderKdModeSiswa(){
  const body = document.getElementById('kd-input-body');

  if(!kdState.siswaTerpilih){
    body.innerHTML = `
      <div class="card">
        <div class="card-title">Langkah 1: Cari Siswa</div>
        <input type="text" class="kd-search-input" id="kd-cari-siswa" placeholder="Ketik minimal 1 huruf nama siswa"
          oninput="filterKdSiswa(this.value)" autocomplete="off">
        <div class="kd-search-results" id="kd-hasil-siswa"></div>
      </div>
    `;
    return;
  }

  const s = kdState.siswaTerpilih;
  const daftar = Object.values(kdState.pelanggaranTerpilihMap);

  body.innerHTML = `
    <div class="card">
      <div class="card-title">Siswa Terpilih</div>
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;">
        <div><strong>${escapeHtml(s.nama)}</strong> <span class="siswa-nis">NIS ${escapeHtml(s.nis)}</span></div>
        <button class="btn btn-outline btn-sm" onclick="kdState.siswaTerpilih=null; renderKdModeSiswa();">Ganti</button>
      </div>
    </div>

    <div class="card">
      <div class="card-title">Langkah 2: Tambahkan Jenis Pelanggaran</div>
      <input type="text" class="kd-search-input" id="kd-cari-pelanggaran2" placeholder="Ketik minimal 1 huruf, contoh: seragam"
        oninput="filterKdPelanggaran2(this.value)" autocomplete="off">
      <div class="kd-search-results" id="kd-hasil-pelanggaran2"></div>

      <div style="margin-top:10px;">
        ${daftar.length === 0 ? '<div style="font-size:12.5px;color:var(--muted)">Belum ada pelanggaran ditambahkan.</div>' : ''}
        <div id="kd-chip-list"></div>
      </div>

      <button class="btn" id="kd-submit-siswa-btn" style="margin-top:14px;" onclick="submitKdModeSiswa()" ${daftar.length===0?'disabled':''}>Simpan Pelanggaran</button>
    </div>
  `;

  const chipList = document.getElementById('kd-chip-list');
  daftar.forEach((p, idx) => {
    const chip = document.createElement('span');
    chip.className = 'kd-chip';
    chip.innerHTML = `${escapeHtml(p.pelanggaran)} (${p.poin} poin) <button onclick="hapusKdChip(${idx})">&times;</button>`;
    chipList.appendChild(chip);
  });
}

function filterKdSiswa(query){
  const hasil = document.getElementById('kd-hasil-siswa');
  const q = query.trim().toLowerCase();
  if(q.length < 1){ hasil.innerHTML = ''; return; }

  const matches = kdState.siswa.filter(s => s.nama.toLowerCase().includes(q));
  if(matches.length === 0){
    hasil.innerHTML = `<div class="kd-search-item">Tidak ditemukan</div>`;
    return;
  }
  hasil.innerHTML = '';
  matches.slice(0, 30).forEach(s => {
    const item = document.createElement('div');
    item.className = 'kd-search-item';
    item.innerHTML = `<span>${escapeHtml(s.nama)}</span><span class="kd-item-sub">NIS ${escapeHtml(s.nis)}</span>`;
    item.onclick = () => { kdState.siswaTerpilih = s; renderKdModeSiswa(); };
    hasil.appendChild(item);
  });
}

function filterKdPelanggaran2(query){
  const hasil = document.getElementById('kd-hasil-pelanggaran2');
  const q = query.trim().toLowerCase();
  if(q.length < 1){ hasil.innerHTML = ''; return; }

  const matches = kdState.masterList.filter(p => p.pelanggaran.toLowerCase().includes(q));
  if(matches.length === 0){
    hasil.innerHTML = `<div class="kd-search-item">Tidak ditemukan</div>`;
    return;
  }
  hasil.innerHTML = '';
  matches.slice(0, 30).forEach((p) => {
    const item = document.createElement('div');
    item.className = 'kd-search-item';
    item.innerHTML = `<span>${escapeHtml(p.pelanggaran)}</span><span class="kd-item-sub">${escapeHtml(p.kategori)} • ${p.poin} poin</span>`;
    item.onclick = () => {
      kdState.pelanggaranTerpilihMap[p.pelanggaran] = p;
      renderKdModeSiswa();
    };
    hasil.appendChild(item);
  });
}

function hapusKdChip(idx){
  const keys = Object.keys(kdState.pelanggaranTerpilihMap);
  delete kdState.pelanggaranTerpilihMap[keys[idx]];
  renderKdModeSiswa();
}

async function submitKdModeSiswa(){
  const btn = document.getElementById('kd-submit-siswa-btn');
  const listPelanggaran = Object.values(kdState.pelanggaranTerpilihMap);
  if(listPelanggaran.length === 0){
    showToast('Tambahkan minimal 1 pelanggaran', true);
    return;
  }
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>Menyimpan...';
  try{
    const res = await callApi('submitPelanggaranSiswa', {
      kelas: kdState.kelas,
      tanggal: kdState.tanggal,
      nis: kdState.siswaTerpilih.nis,
      nama: kdState.siswaTerpilih.nama,
      dicatatOleh: currentUser.nama,
      listPelanggaran
    });
    if(res.success){
      showToast(`${res.count} pelanggaran dicatat untuk ${kdState.siswaTerpilih.nama}`);
      kdState.siswaTerpilih = null;
      kdState.pelanggaranTerpilihMap = {};
      kdState.tab = 'riwayat';
      renderKedisiplinanShell();
    }
  } finally {
    btn.disabled = false;
    btn.textContent = 'Simpan Pelanggaran';
  }
}

/* ---------- TAB: REKAP BULANAN ---------- */
const NAMA_BULAN = ['','Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

let kdBulananState = { bulan: new Date().getMonth()+1, tahun: new Date().getFullYear(), sort:'nama', data:[], ringkasan:null };

async function renderKdBulanan(){
  const c = document.getElementById('kd-tab-content');
  c.innerHTML = `
    <div class="card">
      <div class="card-title">Pilih Periode</div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
        <select id="kd-bulan-select" class="pekan-select"></select>
        <select id="kd-tahun-select" class="pekan-select"></select>
        <select id="kd-sort-select" class="pekan-select">
          <option value="nama">Nama (A-Z)</option>
          <option value="poin-desc">Poin Terbanyak</option>
          <option value="poin-asc">Poin Terendah</option>
          <option value="terbaru">Pelanggaran Terbaru</option>
          <option value="terlama">Pelanggaran Terlama</option>
        </select>
        <button class="btn btn-sm" id="kd-muat-btn" style="width:auto;">Muat Data</button>
      </div>
    </div>
    <div id="kd-bulanan-body"></div>
  `;

  const bulanSelect = document.getElementById('kd-bulan-select');
  NAMA_BULAN.forEach((nm, i) => { if(i>0) bulanSelect.innerHTML += `<option value="${i}" ${i===kdBulananState.bulan?'selected':''}>${nm}</option>`; });

  const tahunSelect = document.getElementById('kd-tahun-select');
  const tahunSekarang = new Date().getFullYear();
  for(let t = tahunSekarang - 1; t <= tahunSekarang + 1; t++){
    tahunSelect.innerHTML += `<option value="${t}" ${t===kdBulananState.tahun?'selected':''}>${t}</option>`;
  }
  document.getElementById('kd-sort-select').value = kdBulananState.sort;

  document.getElementById('kd-muat-btn').onclick = loadKdBulanan;
  loadKdBulanan();
}

async function loadKdBulanan(){
  kdBulananState.bulan = Number(document.getElementById('kd-bulan-select').value);
  kdBulananState.tahun = Number(document.getElementById('kd-tahun-select').value);
  kdBulananState.sort = document.getElementById('kd-sort-select').value;

  const body = document.getElementById('kd-bulanan-body');
  body.innerHTML = `<div class="card"><span class="spinner" style="border-top-color:var(--primary);border-color:rgba(10,110,110,0.25)"></span>Memuat data...</div>`;

  const res = await callApi('getRekapBulananKelas', { kelas: kdState.kelas, bulan: kdBulananState.bulan, tahun: kdBulananState.tahun });
  if(!res.success){ body.innerHTML = `<div class="empty-state"><div class="icon">—</div>Gagal memuat data.</div>`; return; }

  kdBulananState.data = res.data;
  kdBulananState.ringkasan = res.ringkasan;
  renderKdBulananTable();
}

function sortKdBulananData(data, sortMode){
  const arr = [...data];
  if(sortMode === 'nama') arr.sort((a,b) => a.nama.localeCompare(b.nama));
  else if(sortMode === 'poin-desc') arr.sort((a,b) => b.totalPoin - a.totalPoin);
  else if(sortMode === 'poin-asc') arr.sort((a,b) => a.totalPoin - b.totalPoin);
  else if(sortMode === 'terbaru') arr.sort((a,b) => (b.tanggalTerakhir||'').localeCompare(a.tanggalTerakhir||''));
  else if(sortMode === 'terlama') arr.sort((a,b) => (a.tanggalTerakhir||'').localeCompare(b.tanggalTerakhir||''));
  return arr;
}

function renderKdBulananTable(){
  const body = document.getElementById('kd-bulanan-body');
  const sorted = sortKdBulananData(kdBulananState.data, kdBulananState.sort);
  const r = kdBulananState.ringkasan;

  body.innerHTML = `
    <div class="card">
      <div class="card-title">${escapeHtml(kdState.kelas)} — ${NAMA_BULAN[kdBulananState.bulan]} ${kdBulananState.tahun}</div>
      <div id="kd-bulanan-list"></div>
      <div style="margin-top:16px;padding-top:14px;border-top:2px solid var(--border);font-size:13.5px;">
        <div style="display:flex;justify-content:space-between;padding:5px 0;"><span>Total Poin Kelas</span><strong>${r.totalPoinKelas}</strong></div>
        <div style="display:flex;justify-content:space-between;padding:5px 0;"><span>Rata-rata Poin per Siswa</span><strong>${r.rataPoinSiswa}</strong></div>
        <div style="display:flex;justify-content:space-between;padding:5px 0;"><span>Rata-rata Jumlah Pelanggaran per Siswa</span><strong>${r.rataKejadianSiswa}</strong></div>
      </div>
      <button class="btn" style="margin-top:16px;" onclick="downloadKdBulananExcel()">Download Excel</button>
    </div>
  `;

  const list = document.getElementById('kd-bulanan-list');
  if(sorted.length === 0){
    list.innerHTML = `<div class="empty-state"><div class="icon">—</div>Belum ada data siswa.</div>`;
    return;
  }
  sorted.forEach(s => {
    const row = document.createElement('div');
    row.className = 'kd-rekap-row';
    row.innerHTML = `
      <div><div class="siswa-name">${escapeHtml(s.nama)}</div><div class="siswa-nis">Ringan ${s.ringan} • Sedang ${s.sedang} • Berat ${s.berat}</div></div>
      <div class="kd-rekap-total ${s.totalPoin>=100?'tinggi':(s.totalPoin>=50?'sedang':'aman')}">${s.totalPoin} poin</div>
    `;
    list.appendChild(row);
  });
}

function downloadKdBulananExcel(){
  const r = kdBulananState.ringkasan;
  const dataAlfabetis = sortKdBulananData(kdBulananState.data, 'nama');

  const rows = [
    ["SD Islam Tahfizh Cahaya Qur'an"],
    ['Laporan Kedisiplinan Bulanan'],
    [`Kelas: ${kdState.kelas}`],
    [`Periode: ${NAMA_BULAN[kdBulananState.bulan]} ${kdBulananState.tahun}`],
    [],
    ['Nama Siswa', 'Ringan', 'Sedang', 'Berat', 'Total Poin']
  ];
  dataAlfabetis.forEach(s => rows.push([s.nama, s.ringan, s.sedang, s.berat, s.totalPoin]));
  rows.push([]);
  rows.push(['Total Poin Kelas', '', '', '', r.totalPoinKelas]);
  rows.push(['Rata-rata Poin per Siswa', '', '', '', r.rataPoinSiswa]);
  rows.push(['Rata-rata Jumlah Pelanggaran per Siswa', '', '', '', r.rataKejadianSiswa]);

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{wch:28},{wch:8},{wch:8},{wch:8},{wch:12}];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Rekap');
  XLSX.writeFile(wb, `Rekap_Kedisiplinan_${kdState.kelas.replace(/\s+/g,'_')}_${kdBulananState.bulan}-${kdBulananState.tahun}.xlsx`);
}

/* ==========================================================
   MODUL: REWARD SISWA
   ========================================================== */
let rwState = {
  kelas:null, jenjang:null, inputMode:'reward',
  tanggal:'', siswa:[], masterList:[],
  rewardTerpilih:null, siswaTerpilihIds:{},
  siswaTerpilih:null, rewardTerpilihMap:{}
};

function renderReward(content){
  const isWalas = currentUser.role === 'walas';
  rwState.tanggal = rwState.tanggal || todayStrKD();

  content.innerHTML = `
    <div class="page-title">Reward Siswa</div>
    <div class="page-sub">Catat penghargaan/poin positif untuk siswa.</div>

    ${!isWalas ? `
    <div class="card">
      <div class="card-title">Pilih Kelas</div>
      <input type="text" id="rw-kelas-input" placeholder="Ketik nama kelas persis"
        style="width:100%;padding:11px 14px;border:2px solid var(--border);border-radius:10px;font-family:inherit;font-size:14px;">
    </div>` : ''}

    <div id="rw-body"></div>
  `;

  if(isWalas){
    rwState.kelas = currentUser.kelas;
    loadRewardKelas();
  } else {
    document.getElementById('rw-kelas-input').addEventListener('change', (e) => {
      rwState.kelas = e.target.value.trim();
      loadRewardKelas();
    });
  }
}

async function loadRewardKelas(){
  if(!rwState.kelas) return;
  rwState.jenjang = getJenjangSDSMPClient(rwState.kelas);
  const body = document.getElementById('rw-body');
  body.innerHTML = `<div class="card"><span class="spinner" style="border-top-color:var(--primary);border-color:rgba(10,110,110,0.25)"></span>Memuat data...</div>`;

  const [siswaRes, masterRes] = await Promise.all([
    callApi('getSiswaByKelas', { kelas: rwState.kelas }),
    callApi('getMasterReward', { jenjang: rwState.jenjang })
  ]);
  rwState.siswa = siswaRes.data || [];
  rwState.masterList = masterRes.data || [];
  renderRewardShell();
}

function renderRewardShell(){
  const body = document.getElementById('rw-body');
  if(rwState.siswa.length === 0){
    body.innerHTML = `<div class="empty-state"><div class="icon">—</div>Belum ada data siswa untuk kelas ini.</div>`;
    return;
  }
  if(rwState.masterList.length === 0){
    body.innerHTML = `<div class="empty-state"><div class="icon">—</div>Sheet "MasterReward" belum terisi untuk jenjang ${escapeHtml(rwState.jenjang || '-')}.</div>`;
    return;
  }

  body.innerHTML = `
    <div class="card">
      <div class="card-title">Tanggal</div>
      <input type="date" id="rw-tanggal-input" value="${rwState.tanggal}"
        style="padding:10px 14px;border:2px solid var(--border);border-radius:10px;font-family:inherit;font-size:14px;"
        onchange="rwState.tanggal = this.value">
    </div>

    <div class="kd-mode-toggle">
      <button class="kd-mode-btn ${rwState.inputMode==='reward'?'active':''}" onclick="setRwInputMode('reward')">
        1 Reward → Banyak Siswa<br><span style="font-weight:400;font-size:11px;">Pilih jenis reward dulu, lalu centang siswanya</span>
      </button>
      <button class="kd-mode-btn ${rwState.inputMode==='siswa'?'active':''}" onclick="setRwInputMode('siswa')">
        1 Siswa → Banyak Reward<br><span style="font-weight:400;font-size:11px;">Cari siswa dulu, lalu tambahkan rewardnya</span>
      </button>
    </div>

    <div id="rw-input-body"></div>
    <div class="card" style="margin-top:20px;">
      <div class="card-title">Rekap Poin Reward — ${escapeHtml(rwState.kelas)}</div>
      <div id="rw-rekap-list"></div>
    </div>
  `;
  if(rwState.inputMode === 'reward') renderRwModeReward();
  else renderRwModeSiswa();
  loadRwRekap();
}

function setRwInputMode(mode){
  rwState.inputMode = mode;
  rwState.rewardTerpilih = null;
  rwState.siswaTerpilihIds = {};
  rwState.siswaTerpilih = null;
  rwState.rewardTerpilihMap = {};
  renderRewardShell();
}

function renderRwModeReward(){
  const body = document.getElementById('rw-input-body');
  if(!rwState.rewardTerpilih){
    body.innerHTML = `
      <div class="card">
        <div class="card-title">Langkah 1: Cari Jenis Reward</div>
        <input type="text" class="kd-search-input" id="rw-cari-reward" placeholder="Ketik minimal 1 huruf"
          oninput="filterRwReward(this.value)" autocomplete="off">
        <div class="kd-search-results" id="rw-hasil-reward"></div>
      </div>
    `;
    return;
  }
  const r = rwState.rewardTerpilih;
  const terpilihCount = Object.keys(rwState.siswaTerpilihIds).filter(k => rwState.siswaTerpilihIds[k]).length;
  body.innerHTML = `
    <div class="card">
      <div class="card-title">Reward Terpilih</div>
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;">
        <div><strong>${escapeHtml(r.nama)}</strong> <span class="kd-poin-badge" style="background:var(--success)">${r.poin} poin</span></div>
        <button class="btn btn-outline btn-sm" onclick="rwState.rewardTerpilih=null; renderRwModeReward();">Ganti</button>
      </div>
    </div>
    <div class="card">
      <div class="card-title">Langkah 2: Centang Siswa Penerima (${terpilihCount} dipilih)</div>
      <div id="rw-daftar-siswa-check"></div>
      <button class="btn" id="rw-submit-reward-btn" style="margin-top:14px;" onclick="submitRwModeReward()">Simpan Reward</button>
    </div>
  `;
  const list = document.getElementById('rw-daftar-siswa-check');
  rwState.siswa.forEach(s => {
    const row = document.createElement('label');
    row.className = 'kd-siswa-checkrow';
    row.innerHTML = `
      <input type="checkbox" ${rwState.siswaTerpilihIds[s.nis] ? 'checked' : ''} onchange="rwState.siswaTerpilihIds['${escapeHtml(s.nis)}'] = this.checked">
      <div><div class="siswa-name">${escapeHtml(s.nama)}</div><div class="siswa-nis">NIS ${escapeHtml(s.nis)}</div></div>
    `;
    list.appendChild(row);
  });
}

function filterRwReward(query){
  const hasil = document.getElementById('rw-hasil-reward');
  const q = query.trim().toLowerCase();
  if(q.length < 1){ hasil.innerHTML = ''; return; }
  const matches = rwState.masterList.filter(r => r.nama.toLowerCase().includes(q));
  hasil.innerHTML = matches.length === 0 ? `<div class="kd-search-item">Tidak ditemukan</div>` : '';
  matches.slice(0, 30).forEach(r => {
    const item = document.createElement('div');
    item.className = 'kd-search-item';
    item.innerHTML = `<span>${escapeHtml(r.nama)}</span><span class="kd-item-sub">${escapeHtml(r.kategori)} • ${r.poin} poin</span>`;
    item.onclick = () => { rwState.rewardTerpilih = r; renderRwModeReward(); };
    hasil.appendChild(item);
  });
}

async function submitRwModeReward(){
  const btn = document.getElementById('rw-submit-reward-btn');
  const listSiswa = rwState.siswa.filter(s => rwState.siswaTerpilihIds[s.nis]);
  if(listSiswa.length === 0){ showToast('Pilih minimal 1 siswa', true); return; }
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>Menyimpan...';
  try{
    const res = await callApi('submitRewardBanyakSiswa', {
      kelas: rwState.kelas, tanggal: rwState.tanggal,
      kodeReward: rwState.rewardTerpilih.kode, namaReward: rwState.rewardTerpilih.nama,
      kategori: rwState.rewardTerpilih.kategori, poin: rwState.rewardTerpilih.poin,
      dicatatOleh: currentUser.nama, listSiswa
    });
    if(res.success){
      showToast(`Reward dicatat untuk ${res.count} siswa`);
      rwState.rewardTerpilih = null;
      rwState.siswaTerpilihIds = {};
      renderRewardShell();
    }
  } finally {
    btn.disabled = false;
    btn.textContent = 'Simpan Reward';
  }
}

function renderRwModeSiswa(){
  const body = document.getElementById('rw-input-body');
  if(!rwState.siswaTerpilih){
    body.innerHTML = `
      <div class="card">
        <div class="card-title">Langkah 1: Cari Siswa</div>
        <input type="text" class="kd-search-input" id="rw-cari-siswa" placeholder="Ketik minimal 1 huruf nama siswa"
          oninput="filterRwSiswa(this.value)" autocomplete="off">
        <div class="kd-search-results" id="rw-hasil-siswa"></div>
      </div>
    `;
    return;
  }
  const s = rwState.siswaTerpilih;
  const daftar = Object.values(rwState.rewardTerpilihMap);
  body.innerHTML = `
    <div class="card">
      <div class="card-title">Siswa Terpilih</div>
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;">
        <div><strong>${escapeHtml(s.nama)}</strong> <span class="siswa-nis">NIS ${escapeHtml(s.nis)}</span></div>
        <button class="btn btn-outline btn-sm" onclick="rwState.siswaTerpilih=null; renderRwModeSiswa();">Ganti</button>
      </div>
    </div>
    <div class="card">
      <div class="card-title">Langkah 2: Tambahkan Jenis Reward</div>
      <input type="text" class="kd-search-input" id="rw-cari-reward2" placeholder="Ketik minimal 1 huruf"
        oninput="filterRwReward2(this.value)" autocomplete="off">
      <div class="kd-search-results" id="rw-hasil-reward2"></div>
      <div style="margin-top:10px;">
        ${daftar.length === 0 ? '<div style="font-size:12.5px;color:var(--muted)">Belum ada reward ditambahkan.</div>' : ''}
        <div id="rw-chip-list"></div>
      </div>
      <button class="btn" id="rw-submit-siswa-btn" style="margin-top:14px;" onclick="submitRwModeSiswa()" ${daftar.length===0?'disabled':''}>Simpan Reward</button>
    </div>
  `;
  const chipList = document.getElementById('rw-chip-list');
  daftar.forEach((r, idx) => {
    const chip = document.createElement('span');
    chip.className = 'kd-chip';
    chip.innerHTML = `${escapeHtml(r.nama)} (${r.poin} poin) <button onclick="hapusRwChip(${idx})">&times;</button>`;
    chipList.appendChild(chip);
  });
}

function filterRwSiswa(query){
  const hasil = document.getElementById('rw-hasil-siswa');
  const q = query.trim().toLowerCase();
  if(q.length < 1){ hasil.innerHTML = ''; return; }
  const matches = rwState.siswa.filter(s => s.nama.toLowerCase().includes(q));
  hasil.innerHTML = matches.length === 0 ? `<div class="kd-search-item">Tidak ditemukan</div>` : '';
  matches.slice(0, 30).forEach(s => {
    const item = document.createElement('div');
    item.className = 'kd-search-item';
    item.innerHTML = `<span>${escapeHtml(s.nama)}</span><span class="kd-item-sub">NIS ${escapeHtml(s.nis)}</span>`;
    item.onclick = () => { rwState.siswaTerpilih = s; renderRwModeSiswa(); };
    hasil.appendChild(item);
  });
}

function filterRwReward2(query){
  const hasil = document.getElementById('rw-hasil-reward2');
  const q = query.trim().toLowerCase();
  if(q.length < 1){ hasil.innerHTML = ''; return; }
  const matches = rwState.masterList.filter(r => r.nama.toLowerCase().includes(q));
  hasil.innerHTML = matches.length === 0 ? `<div class="kd-search-item">Tidak ditemukan</div>` : '';
  matches.slice(0, 30).forEach(r => {
    const item = document.createElement('div');
    item.className = 'kd-search-item';
    item.innerHTML = `<span>${escapeHtml(r.nama)}</span><span class="kd-item-sub">${escapeHtml(r.kategori)} • ${r.poin} poin</span>`;
    item.onclick = () => { rwState.rewardTerpilihMap[r.nama] = r; renderRwModeSiswa(); };
    hasil.appendChild(item);
  });
}

function hapusRwChip(idx){
  const keys = Object.keys(rwState.rewardTerpilihMap);
  delete rwState.rewardTerpilihMap[keys[idx]];
  renderRwModeSiswa();
}

async function submitRwModeSiswa(){
  const btn = document.getElementById('rw-submit-siswa-btn');
  const listReward = Object.values(rwState.rewardTerpilihMap);
  if(listReward.length === 0){ showToast('Tambahkan minimal 1 reward', true); return; }
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>Menyimpan...';
  try{
    const res = await callApi('submitRewardSiswa', {
      kelas: rwState.kelas, tanggal: rwState.tanggal,
      nis: rwState.siswaTerpilih.nis, nama: rwState.siswaTerpilih.nama,
      dicatatOleh: currentUser.nama,
      listReward: listReward.map(r => ({ kode:r.kode, nama:r.nama, kategori:r.kategori, poin:r.poin }))
    });
    if(res.success){
      showToast(`${res.count} reward dicatat untuk ${rwState.siswaTerpilih.nama}`);
      rwState.siswaTerpilih = null;
      rwState.rewardTerpilihMap = {};
      renderRewardShell();
    }
  } finally {
    btn.disabled = false;
    btn.textContent = 'Simpan Reward';
  }
}

async function loadRwRekap(){
  const res = await callApi('getRekapRewardKelas', { kelas: rwState.kelas });
  const list = document.getElementById('rw-rekap-list');
  if(!list) return;
  const data = res.data || [];
  if(data.length === 0){ list.innerHTML = `<div class="empty-state"><div class="icon">—</div>Belum ada data.</div>`; return; }
  list.innerHTML = '';
  data.forEach(s => {
    const row = document.createElement('div');
    row.className = 'kd-rekap-row';
    row.innerHTML = `
      <div><div class="siswa-name">${escapeHtml(s.nama)}</div><div class="siswa-nis">NIS ${escapeHtml(s.nis)} • ${s.jumlahReward} reward</div></div>
      <div class="kd-rekap-total aman">${s.totalPoin} poin</div>
    `;
    list.appendChild(row);
  });
}

/* ==========================================================
   MODUL: CETAK RAPOR (AKADEMIK)
   ========================================================== */
let raporState = { kelas:null, semester:'1', jenisPeriode:'PTS', requestId:null, polling:false };

function renderCetakRapor(content){
  const isWalas = currentUser.role === 'walas';
  content.innerHTML = `
    <div class="page-title">Cetak Rapor</div>
    <div class="page-sub">Generate rapor 1 kelas sekaligus jadi 1 file PDF siap cetak.</div>

    ${!isWalas ? `
    <div class="card">
      <div class="card-title">Pilih Kelas</div>
      <input type="text" id="rp-kelas-input" placeholder="Ketik nama kelas persis"
        style="width:100%;padding:11px 14px;border:2px solid var(--border);border-radius:10px;font-family:inherit;font-size:14px;">
    </div>` : ''}

    <div class="card">
      <div class="card-title">Pilih Periode</div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        <select id="rp-semester" class="pekan-select">
          <option value="1">Semester 1</option>
          <option value="2">Semester 2</option>
        </select>
        <select id="rp-jenis" class="pekan-select">
          <option value="PTS">Tengah Semester</option>
          <option value="PAS">Akhir Semester</option>
        </select>
      </div>
    </div>

    <div class="card">
      <button class="btn" id="rp-mulai-btn" onclick="mulaiCetakRapor()">Mulai Cetak Rapor Kelas</button>
      <div id="rp-status-area" style="margin-top:16px;"></div>
    </div>
  `;

  if(isWalas){
    raporState.kelas = currentUser.kelas;
  } else {
    document.getElementById('rp-kelas-input').addEventListener('change', e => { raporState.kelas = e.target.value.trim(); });
  }
}

function periodeKodeRapor(){
  const semester = document.getElementById('rp-semester').value;
  const jenis = document.getElementById('rp-jenis').value;
  return 'S' + semester + '_' + jenis;
}

async function mulaiCetakRapor(){
  const btn = document.getElementById('rp-mulai-btn');
  const statusArea = document.getElementById('rp-status-area');
  if(!raporState.kelas){ showToast('Pilih kelas terlebih dahulu', true); return; }

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>Memulai...';
  statusArea.innerHTML = '';

  try{
    const res = await callApi('requestCetakRaporKelas', {
      kelas: raporState.kelas, periode: periodeKodeRapor(), requestedBy: currentUser.nama, requestedByUsername: currentUser.username
    });
    if(!res.success){
      const pesanMap = {
        belum_siap_generate_pdf: 'Sistem rapor belum lengkap disiapkan (ada sheet/pengaturan yang belum diisi admin).',
        template_belum_diisi: 'Template rapor belum diatur oleh admin.'
      };
      statusArea.innerHTML = `<div class="ms-alert">${escapeHtml(pesanMap[res.error] || res.error)}</div>`;
      return;
    }
    raporState.requestId = res.requestId;
    statusArea.innerHTML = `<div style="font-size:13px;color:var(--muted)"><span class="spinner" style="border-top-color:var(--primary);border-color:rgba(10,110,110,0.25)"></span>Sedang diproses, mohon tunggu (biasanya 1-3 menit tergantung jumlah siswa)...</div>`;
    pollCetakRaporStatus();
  } finally {
    btn.disabled = false;
    btn.textContent = 'Mulai Cetak Rapor Kelas';
  }
}

async function pollCetakRaporStatus(){
  if(!raporState.requestId) return;
  const statusArea = document.getElementById('rp-status-area');
  if(!statusArea) return; // user sudah pindah modul, hentikan polling.

  const res = await callApi('getRaporPTSRequestStatus', { requestId: raporState.requestId });
  if(!res.success){
    statusArea.innerHTML = `<div class="ms-alert">Gagal mengecek status: ${escapeHtml(res.error || '')}</div>`;
    return;
  }
  const status = res.data.Status;
  if(status === 'Selesai'){
    const dikirimKe = res.data.DikirimKe || '';
    const infoKirim = dikirimKe && dikirimKe.indexOf('Link publik') === -1
      ? `<div style="font-size:12px;color:var(--muted);margin-top:8px;">Sudah dikirim ke: ${escapeHtml(dikirimKe)} — cek folder "Shared with me" di Drive.</div>`
      : `<div style="font-size:12px;color:var(--warn);margin-top:8px;">Email guru tidak ditemukan di sheet Walas — file pakai link publik biasa. Lengkapi kolom "Email Google" supaya lain kali langsung terkirim.</div>`;
    statusArea.innerHTML = `
      <div style="background:#EAF5F0;border:1px solid #C8E6D6;border-radius:10px;padding:14px 16px;font-size:13px;color:var(--success);">
        Rapor kelas berhasil dibuat.
      </div>
      <a href="${escapeHtml(res.data.OutputURL)}" target="_blank" class="btn" style="display:inline-block;text-decoration:none;text-align:center;margin-top:12px;width:auto;padding:12px 24px;">Buka / Download PDF</a>
      ${infoKirim}
    `;
  } else if(status === 'Gagal'){
    statusArea.innerHTML = `<div class="ms-alert"><strong>Gagal membuat rapor.</strong><br>${escapeHtml(res.data.PesanError || 'Kesalahan tidak diketahui.')}</div>`;
  } else {
    setTimeout(pollCetakRaporStatus, 3000);
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
  const kelasLabel = currentUser.role === 'walas' ? (currentUser.kelas || 'Kelas') : 'Seluruh Sekolah';
  content.innerHTML = `
    <div id="wd-root" class="wd-shell">
      <div class="wd-hero">
        <div class="wd-hero-top">
          <div>
            <div class="wd-eyebrow">Dashboard Kelas</div>
            <div class="wd-title">Assalamu'alaikum, ${escapeHtml(currentUser.nama || 'Wali Kelas')} 👋</div>
            <div class="wd-sub">Pantau ${escapeHtml(kelasLabel)} tanpa perlu membuka banyak menu.</div>
          </div>
          <div class="wd-date-pill" id="wd-date">Hari ini</div>
        </div>
      </div>
      <div class="wd-skeleton"></div>
    </div>`;
  loadDashboardWalasFast(requestToken);
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
    const avatarSrc = (d.avatar && AVATAR_DATA[d.avatar]) ? AVATAR_DATA[d.avatar] : null;
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
            ? `<img class="dash-path-avatar" src="${avatarSrc}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="avatarImageError(this, '${escapeHtml(d.avatar)}')">`
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
