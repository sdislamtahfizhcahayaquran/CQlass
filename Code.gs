/**
 * ==========================================================
 * SISTEM KESISWAAN SDIT CQ — BACKEND (Google Apps Script)
 * ==========================================================
 */

// ============ KONFIGURASI — WAJIB DIISI ============
const SHEET_ID = '15vrg6I_ut28Z12Q4CD8AVOoO8fFNaAPKd5YVAEPvkjw';
const FOTO_FOLDER_ID = '1ohYzEeXSTawHgy4UHQgz_2x3nDYrbj86';
const APP_SECRET = 'MUss8dN31aFfnLE1sk81o1pqh1Xtf6L2KTA5JLVU';

// ============ V2 PERFORMANCE / RAPOR PTS ============
// Master data disimpan di cache pendek. Sheet log harian TIDAK dibaca full-scan.
const APP_TZ = 'Asia/Jakarta';
const CACHE_TTL_MASTER_SEC = 300;   // 5 menit
const CACHE_TTL_SETTINGS_SEC = 120; // 2 menit
const CACHE_PREFIX_V2 = 'sdcq:v2:';
const LOG_TAIL = Object.freeze({
  Absensi: 3500,
  RekapAbsensi: 800,
  Kedisiplinan: 5000,
  Keterlambatan: 2500,
  LogAktivitas: 3000,
  MoodLog: 1200,
  PjBL_Log: 1200,
  PjBL_NilaiPekanan: 12000,
  PjBL_NilaiSemester: 5000,
  CatatanMasalahSiswa: 800
});


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

const PJBL_FOLDER_ID = {
  1: '1Fg91KeNbfqHbx9y6u6ZyWWxxhLfOZRS-',
  2: '1tYUtSekUmQ25t9qmDXLkhxto2aDqskkK',
  3: '13Z-IQHDlfsUCHzdoOq0qrygI3ibtSOUX',
  4: '1eJWTmjqiknQf9T5cMZhnO5od_MEq56fC',
  5: '1Hsz5aIXuY-lIyTDZ2GhQv4IUJj0P23YF',
  6: '1XY-9KRHSn68FT19S-NYNjOebxlmwSCge'
};

// ============ ENTRY POINT ============
function doGet(e) {
  return handleRequest(e);
}
function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  try {
    let params;
    if (e.postData && e.postData.contents) {
      params = JSON.parse(e.postData.contents);
    } else if (e.parameter && e.parameter.payload) {
      params = JSON.parse(e.parameter.payload);
    } else {
      params = e.parameter || {};
    }

    if (params.secret !== APP_SECRET) {
      return jsonResponse({ success: false, error: 'unauthorized' });
    }

    let result;
    switch (params.action) {
      case 'login':
        result = handleLoginV2(params);
        break;
      case 'gantiPassword':
        result = gantiPassword(params);
        break;
      case 'gantiUsername':
        result = gantiUsername(params);
        break;
      case 'getSiswaByKelas':
        result = getSiswaByKelasV2(params.kelas);
        break;

      // ===== MODUL LEGGER NILAI =====
      case 'getLeggerSetup':
        result = getLeggerSetupV1(params);
        break;
      case 'getLeggerNilai':
        result = getLeggerNilaiV1(params);
        break;
      case 'saveLeggerNilai':
        result = saveLeggerNilaiV1(params);
        break;
      case 'uploadFotoMT':
        result = uploadFotoMT(params);
        break;
      case 'submitAbsensi':
        result = submitAbsensiV2Fast(params);
        break;
      case 'getAbsensiHariIni':
        result = getAbsensiHariIniV2(params.kelas, params.tanggal);
        break;

      // ===== MODUL PjBL =====
      case 'getPekanAktifPjBL':
        result = getPekanAktifPjBL(params.kelas);
        break;
      case 'getPjBLPekan':
        result = getPjBLPekanV2(params.kelas, params.pekan);
        break;
      case 'uploadFotoPjBL':
        result = uploadFotoPjBL(params);
        break;
      case 'submitPjBL':
        result = submitPjBLV2Fast(params);
        break;
      case 'submitNilaiSemesterPjBL':
        result = submitNilaiSemesterPjBL(params);
        break;
      case 'getNilaiSemesterPjBL':
        result = getNilaiSemesterPjBLV2(params.kelas, params.periode);
        break;
      case 'getRaporPjBL':
        result = getRaporPjBLV2(params.kelas);
        break;

      // ===== MODUL KEDISIPLINAN =====
      case 'getMasterPelanggaran':
        result = getMasterPelanggaranV2(params.jenjang);
        break;
      case 'submitPelanggaranBanyakSiswa':
        result = submitPelanggaranBanyakSiswaV2Fast(params);
        break;
      case 'submitPelanggaranSiswa':
        result = submitPelanggaranSiswaV2Fast(params);
        break;
      case 'getRiwayatPelanggaran':
        result = getRiwayatPelanggaranV2(params.kelas, params.tanggal);
        break;
      case 'getRekapPoinKelas':
        result = getRekapPoinKelasV2Fast(params.kelas);
        break;
      case 'hapusPelanggaran':
        result = hapusPelanggaranV2Fast(params);
        break;
      case 'getRekapBulananKelas':
        result = getRekapBulananKelasV2Fast(params.kelas, params.bulan, params.tahun);
        break;

      // ===== MODUL KETERLAMBATAN =====
      case 'getKeterlambatanBelumDicatat':
        result = getKeterlambatanBelumDicatatV2Fast(params.kelas, params.tanggal);
        break;
      case 'konfirmasiKeterlambatanJadiPoin':
        result = konfirmasiKeterlambatanJadiPoinV2Fast(params);
        break;

      // ===== MODUL MOOD & DASHBOARD KERJA =====
      case 'submitMood':
        result = submitMood(params);
        break;
      case 'getMoodHariIni':
        result = getMoodHariIniV2(params.username, params.tanggal);
        break;
      case 'logAktivitas':
        result = logAktivitas(params);
        break;
      case 'getDashboardHariIni':
        result = getDashboardHariIniV2();
        break;
      case 'getAvatarCatalog':
        result = getAvatarCatalogV2();
        break;
      case 'submitAvatar':
        result = submitAvatar(params);
        break;

      // ===== MODUL MASALAH SISWA + AI =====
      case 'analisisMasalahSiswa':
        result = analisisMasalahSiswa(params);
        break;
      case 'submitCatatanMasalahSiswa':
        result = submitCatatanMasalahSiswa(params);
        break;
      case 'getCatatanMasalahSiswa':
        result = getCatatanMasalahSiswaV2(params.kelas, params.limit);
        break;


      // ===== V2 SETUP / HEALTH / RAPOR PTS =====
      case 'setupSistemV2':
        result = setupSistemV2Fast();
        break;
      case 'getSystemV2Health':
        result = getSystemV2HealthFast();
        break;
      case 'getRaporPTSReadiness':
        result = getRaporPTSReadinessV2Fast(params.kelas);
        break;
      case 'getRaporPTSPreview':
        result = getRaporPTSPreviewV2Fast(params.kelas, params.nis, params.periode || 'S1_PTS');
        break;
      case 'getRaporPTSClassPreview':
        result = getRaporPTSClassPreviewV2Fast(params.kelas, params.periode || 'S1_PTS');
        break;
      case 'requestCetakRaporKelas':
        result = requestCetakRaporKelas(params);
        break;
      case 'getRaporPTSRequestStatus':
        result = getRaporPTSRequestStatus(params.requestId);
        break;
      case 'requestLaporanGuruBulanan':
        result = requestLaporanGuruBulanan(params);
        break;
      case 'getLaporanGuruRequestStatus':
        result = getLaporanGuruRequestStatus(params.requestId);
        break;

      // ===== V2 REWARD =====
      case 'getMasterReward':
        result = getMasterRewardV2(params.jenjang);
        break;
      case 'submitRewardBanyakSiswa':
        result = submitRewardBanyakSiswaV2Fast(params);
        break;
      case 'submitRewardSiswa':
        result = submitRewardSiswaV2Fast(params);
        break;
      case 'getRekapRewardKelas':
        result = getRekapRewardKelasV2Fast(params.kelas);
        break;

      // ===== V2 RAPOR INPUT PENDUKUNG =====
      case 'saveAdabPTS':
        result = saveAdabPTSV2(params);
        break;
      case 'saveKomentarWalasPTS':
        result = saveKomentarWalasPTSV2(params);
        break;
      case 'saveKegiatanSiswaPTS':
        result = saveKegiatanSiswaPTSV2(params);
        break;

      // ===== V3 DASHBOARD WALAS — 1 PAYLOAD =====
      case 'getDashboardWalas':
        result = getDashboardWalasV3Fast(params);
        break;

      // ===== V2 DASHBOARD BARU / LONCENG =====
      case 'getMyPendingTasks':
        result = getMyPendingTasksV2Fast(params.username, params.kelas);
        break;
      case 'getEskalasiKedisiplinan':
        result = getEskalasiKedisiplinanV2Fast();
        break;
      case 'getLeaderboardReward':
        result = getLeaderboardRewardV2Fast();
        break;
      case 'getGrafikAbsensi':
        result = getGrafikAbsensiV2Fast();
        break;

      default:
        result = { success: false, error: 'unknown_action: ' + params.action };
    }

    return jsonResponse(result);
  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() });
  }
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSS() {
  return SpreadsheetApp.openById(SHEET_ID);
}

function sheetToObjects(sheetName) {
  const sheet = getSS().getSheetByName(sheetName);
  if (!sheet) throw new Error('Sheet tidak ditemukan: ' + sheetName);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const rows = [];
  for (let i = 1; i < data.length; i++) {
    const obj = {};
    headers.forEach((h, idx) => obj[h] = data[i][idx]);
    rows.push(obj);
  }
  return { sheet, headers, rows };
}


// ============================================================================
// CACHE + GROUPING + TAIL-READ COMPATIBILITY HELPERS
// ============================================================================
const CACHE_TTL_DEFAULT = CACHE_TTL_MASTER_SEC;

function sheetToObjectsCached(sheetName, ttlSeconds) {
  ttlSeconds = ttlSeconds || CACHE_TTL_DEFAULT;
  const cache = CacheService.getScriptCache();
  const cacheKey = 'sheet_' + sheetName;

  try {
    const cached = cache.get(cacheKey);
    if (cached != null) {
      return JSON.parse(cached);
    }
  } catch (err) {
    // Cache gagal dibaca -> fallback ke Spreadsheet.
  }

  const result = sheetToObjects(sheetName);

  try {
    const payload = { headers: result.headers, rows: result.rows };
    const raw = JSON.stringify(payload);
    if (raw.length < 90000) {
      cache.put(cacheKey, raw, ttlSeconds);
    }
  } catch (err) {
    // Data terlalu besar / cache gagal -> tetap return data Spreadsheet.
  }

  return result;
}

function invalidateSheetCache(sheetName) {
  try {
    CacheService.getScriptCache().remove('sheet_' + sheetName);
  } catch (err) {}

  try {
    if (typeof _cacheRemoveV2 === 'function') {
      const compactFields = {
        Walas: [
          ['Nama','Username','Kelas diampu','Role','Status aktif','PasswordHash'],
          ['Nama','Username','Kelas diampu','Role','Status aktif']
        ],
        AvatarPilihan: [
          ['Username','Avatar']
        ],
        Siswa: [
          ['NIS','NISN','Nama','Kelas']
        ],
        MasterPelanggaran: [
          ['Jenjang','Pelanggaran','Kategori','Poin']
        ],
        MasterReward: [
          ['KodeReward','NamaReward','Kategori','Poin','Jenjang','Aktif']
        ],
        MapTahfizhSiswa: [
          ['NIS','NamaTahfizh','KelasTahfizh','StatusMapping']
        ],
        MapKelasTahfizh: [
          ['KelasTahfizh','KelasSistem','SheetTahfizh','Aktif']
        ]
      };

      (compactFields[sheetName] || []).forEach(fields => {
        _cacheRemoveV2('compact:' + sheetName + ':' + fields.join(','));
      });

      if (sheetName === 'Pengaturan') {
        _cacheRemoveV2('settings');
      }
    }
  } catch (err) {}
}

function groupByField(rows, fieldName) {
  const map = {};
  (rows || []).forEach(r => {
    const key = r[fieldName];
    if (key === undefined || key === null || key === '') return;
    const k = key.toString();
    if (!map[k]) map[k] = [];
    map[k].push(r);
  });
  return map;
}

function getRowsFromBottom(sheetName, maxRows) {
  maxRows = maxRows || 3000;
  const sheet = getSS().getSheetByName(sheetName);
  if (!sheet) throw new Error('Sheet tidak ditemukan: ' + sheetName);

  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow < 1 || lastCol < 1) return { sheet, headers: [], rows: [] };

  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  if (lastRow < 2) return { sheet, headers, rows: [] };

  const startRow = Math.max(2, lastRow - maxRows + 1);
  const data = sheet.getRange(startRow, 1, lastRow - startRow + 1, headers.length).getValues();

  const rows = data.map(rowArr => {
    const obj = {};
    headers.forEach((h, idx) => obj[h] = rowArr[idx]);
    return obj;
  });

  return { sheet, headers, rows };
}

function formatTanggalYMD(val) {
  if (val instanceof Date) {
    return Utilities.formatDate(val, 'GMT+7', 'yyyy-MM-dd');
  }
  return (val || '').toString().trim();
}

function getHariIndexGMT7(date) {
  const tglStr = Utilities.formatDate(date, 'GMT+7', 'yyyy-MM-dd');
  const parts = tglStr.split('-').map(Number);
  const localDate = new Date(parts[0], parts[1] - 1, parts[2]);
  return localDate.getDay();
}

// ============ AUTH ============
function sha256Hex(text) {
  const rawHash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, text, Utilities.Charset.UTF_8);
  return rawHash.map(b => {
    const v = (b < 0 ? b + 256 : b).toString(16);
    return v.length === 1 ? '0' + v : v;
  }).join('');
}

function isStatusAktif(value) {
  if (value === true) return true;
  const v = (value || '').toString().trim().toLowerCase();
  return v === 'true' || v === 'aktif' || v === 'ya' || v === '1';
}

function gantiPassword(params) {
  const sheet = getSS().getSheetByName('Walas');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const usernameCol = headers.indexOf('Username');
  const passHashCol = headers.indexOf('PasswordHash');
  const statusCol = headers.indexOf('Status aktif');
  const inputUsername = (params.username || '').toString().trim().toLowerCase();

  for (let i = 1; i < data.length; i++) {
    const rowUsername = (data[i][usernameCol] || '').toString().trim().toLowerCase();
    if (rowUsername !== inputUsername) continue;
    if (statusCol !== -1 && !isStatusAktif(data[i][statusCol])) {
      return { success: false, error: 'akun_nonaktif' };
    }
    if (data[i][passHashCol] !== params.oldPasswordHash) {
      return { success: false, error: 'password_lama_salah' };
    }
    if (!params.newPasswordHash) {
      return { success: false, error: 'password_baru_kosong' };
    }
    sheet.getRange(i + 1, passHashCol + 1).setValue(params.newPasswordHash);
    invalidateSheetCache('Walas');
    return { success: true };
  }
  return { success: false, error: 'user_not_found' };
}

function gantiUsername(params) {
  const sheet = getSS().getSheetByName('Walas');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const usernameCol = headers.indexOf('Username');
  const passHashCol = headers.indexOf('PasswordHash');
  const statusCol = headers.indexOf('Status aktif');
  const oldUsername = (params.oldUsername || '').toString().trim().toLowerCase();
  const newUsername = (params.newUsername || '').toString().trim();
  const newUsernameLower = newUsername.toLowerCase();

  if (!newUsername) return { success: false, error: 'username_baru_kosong' };
  if (!params.newPasswordHash) return { success: false, error: 'newPasswordHash_wajib_dikirim' };

  const dupe = data.some((row, i) => i > 0 &&
    (row[usernameCol] || '').toString().trim().toLowerCase() === newUsernameLower &&
    (row[usernameCol] || '').toString().trim().toLowerCase() !== oldUsername);
  if (dupe) return { success: false, error: 'username_sudah_dipakai' };

  for (let i = 1; i < data.length; i++) {
    const rowUsername = (data[i][usernameCol] || '').toString().trim().toLowerCase();
    if (rowUsername !== oldUsername) continue;
    if (statusCol !== -1 && !isStatusAktif(data[i][statusCol])) {
      return { success: false, error: 'akun_nonaktif' };
    }
    if (data[i][passHashCol] !== params.passwordHash) {
      return { success: false, error: 'password_salah' };
    }
    sheet.getRange(i + 1, usernameCol + 1).setValue(newUsername);
    sheet.getRange(i + 1, passHashCol + 1).setValue(params.newPasswordHash);
    invalidateSheetCache('Walas');
    return { success: true, newUsername: newUsername };
  }
  return { success: false, error: 'user_not_found' };
}

// ============ MODUL: ABSENSI (Morning Talk) — writer lama, dipakai V2Fast wrapper ============
function uploadFotoMT(params) {
  const folder = DriveApp.getFolderById(FOTO_FOLDER_ID);
  const blob = Utilities.newBlob(
    Utilities.base64Decode(params.base64),
    params.mimeType,
    params.filename
  );
  const file = folder.createFile(blob);
  return { success: true, url: file.getUrl(), fileId: file.getId() };
}

function submitAbsensi(params) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const timestamp = new Date();
    const sheetDetail = getSS().getSheetByName('Absensi');
    const rowsToAdd = params.data.map(item => [
      timestamp, item.nis, item.nama, params.kelas, item.status, params.fotoUrl || '', params.dicatatOleh
    ]);
    if (rowsToAdd.length > 0) {
      sheetDetail.getRange(sheetDetail.getLastRow() + 1, 1, rowsToAdd.length, rowsToAdd[0].length).setValues(rowsToAdd);
    }

    const rekap = { Hadir: 0, Sakit: 0, Izin: 0, Alfa: 0 };
    params.data.forEach(item => { if (rekap[item.status] !== undefined) rekap[item.status]++; });

    const sheetRekap = getSS().getSheetByName('RekapAbsensi');
    sheetRekap.appendRow([
      timestamp, params.kelas, params.temaMT || '',
      rekap.Hadir, rekap.Sakit, rekap.Izin, rekap.Alfa,
      params.fotoUrl || '', params.dicatatOleh
    ]);

    return { success: true, count: rowsToAdd.length };
  } finally {
    lock.releaseLock();
  }
}

// ==========================================================
// ============ MODUL: PjBL (Project Based Learning) =======
// ==========================================================

const BULAN_MAP_PJBL = {
  jan: 1, januari: 1,
  feb: 2, februari: 2,
  mar: 3, maret: 3,
  apr: 4, april: 4,
  mei: 5,
  jun: 6, juni: 6,
  jul: 7, juli: 7,
  agu: 8, agt: 8, agst: 8, agustus: 8,
  sep: 9, sept: 9, spt: 9, september: 9,
  okt: 10, oktober: 10,
  nov: 11, november: 11,
  des: 12, desember: 12
};

function parseAkhirTanggalPjBL(str) {
  if (!str) return null;
  const s = str.toString().trim();
  const m = s.match(/(\d{1,2})\s+([A-Za-zéÉ.]+)\s+(\d{4})\s*$/);
  if (!m) return null;
  const hari = parseInt(m[1], 10);
  let bulanKey = m[2].toLowerCase().replace(/\.$/, '');
  let bulan = BULAN_MAP_PJBL[bulanKey];
  if (!bulan) bulan = BULAN_MAP_PJBL[bulanKey.substring(0, 4)] || BULAN_MAP_PJBL[bulanKey.substring(0, 3)];
  if (!bulan) return null;
  const tahun = parseInt(m[3], 10);
  return new Date(tahun, bulan - 1, hari, 23, 59, 59);
}

function getJenjangDariKelas(kelasFull) {
  const m = (kelasFull || '').toString().trim().match(/^(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

function getJenjangSDSMP(kelasFull) {
  const angka = getJenjangDariKelas(kelasFull);
  if (!angka) return null;
  return angka <= 6 ? 'SD' : 'SMP';
}

function parseNomorPekanPjBL(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  const text = (value === null || value === undefined) ? '' : value.toString().trim();
  const match = text.match(/\d+/);
  return match ? parseInt(match[0], 10) : null;
}

function normalisasiHeaderTimelinePjBL(value) {
  return (value === null || value === undefined ? '' : value.toString())
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ');
}

function ambilJenjangDariHeaderTimelinePjBL(value) {
  const text = normalisasiHeaderTimelinePjBL(value);
  let match = text.match(/(?:kelas|kls|grade)\s*([1-6])\b/);
  if (match) return parseInt(match[1], 10);
  if (/^[1-6]$/.test(text)) return parseInt(text, 10);
  return null;
}

function getTimelinePjBL(jenjang) {
  const sheet = getSS().getSheetByName('Time Line');
  if (!sheet) throw new Error('Sheet "Time Line" tidak ditemukan.');

  const data = sheet.getDataRange().getDisplayValues();
  if (!data || data.length === 0) return [];

  let headerRow = -1;
  let pekanCol = -1;
  let tanggalCol = -1;
  const batasHeader = Math.min(data.length, 15);

  for (let r = 0; r < batasHeader; r++) {
    let kandidatPekan = -1;
    let kandidatTanggal = -1;
    for (let c = 0; c < data[r].length; c++) {
      const h = normalisasiHeaderTimelinePjBL(data[r][c]);
      if (kandidatPekan === -1 && (h === 'pekan' || h.indexOf('pekan ') === 0 || h === 'minggu')) {
        kandidatPekan = c;
      }
      if (kandidatTanggal === -1 && (h === 'tanggal' || h.indexOf('tanggal ') === 0 || h.indexOf('rentang tanggal') !== -1)) {
        kandidatTanggal = c;
      }
    }
    if (kandidatPekan !== -1 && kandidatTanggal !== -1) {
      headerRow = r;
      pekanCol = kandidatPekan;
      tanggalCol = kandidatTanggal;
      break;
    }
  }

  if (headerRow === -1) {
    headerRow = 2;
    pekanCol = 0;
    tanggalCol = 1;
  }

  let kelasCol = -1;
  let kelasHeaderRow = headerRow;

  const batasHeaderKelas = Math.min(data.length, headerRow + 3);
  for (let r = 0; r < batasHeaderKelas && kelasCol === -1; r++) {
    for (let c = Math.max(0, tanggalCol + 1); c < data[r].length; c++) {
      if (ambilJenjangDariHeaderTimelinePjBL(data[r][c]) === Number(jenjang)) {
        kelasCol = c;
        kelasHeaderRow = r;
        break;
      }
    }
  }

  if (kelasCol === -1) kelasCol = tanggalCol + Number(jenjang);

  const gabungan = {};
  let pekanTerakhir = null;
  const dataMulaiRow = Math.max(headerRow, kelasHeaderRow) + 1;

  for (let r = dataMulaiRow; r < data.length; r++) {
    const row = data[r] || [];
    let pekan = parseNomorPekanPjBL(row[pekanCol]);
    const tanggal = (row[tanggalCol] || '').toString().trim();
    const kegiatan = (row[kelasCol] || '').toString().trim();

    if (pekan === null && pekanTerakhir !== null && (tanggal || kegiatan)) pekan = pekanTerakhir;
    if (pekan === null || pekan < 1) continue;
    pekanTerakhir = pekan;

    if (!gabungan[pekan]) {
      gabungan[pekan] = { pekan: pekan, tanggal: '', kegiatan: '' };
    }

    if (tanggal && !gabungan[pekan].tanggal) gabungan[pekan].tanggal = tanggal;
    if (kegiatan) {
      const sudahAda = gabungan[pekan].kegiatan
        .split('\n')
        .map(s => s.trim())
        .filter(Boolean)
        .includes(kegiatan);
      if (!sudahAda) {
        gabungan[pekan].kegiatan += (gabungan[pekan].kegiatan ? '\n' : '') + kegiatan;
      }
    }
  }

  return Object.keys(gabungan)
    .map(k => gabungan[k])
    .sort((a, b) => a.pekan - b.pekan);
}

function getPekanAktifPjBL(kelasFull) {
  const jenjang = getJenjangDariKelas(kelasFull);
  if (!jenjang) return { success: false, error: 'kelas_tidak_valid' };

  const rows = getTimelinePjBL(jenjang);
  if (rows.length === 0) return { success: false, error: 'timeline_kosong' };

  const pilih = rows.find(r => Number(r.pekan) === 1);
  if (!pilih) {
    return {
      success: false,
      error: 'pekan_1_tidak_ditemukan',
      jenjang: jenjang,
      daftarPekan: rows.map(r => ({ pekan: r.pekan, tanggal: r.tanggal, kegiatan: r.kegiatan }))
    };
  }

  return {
    success: true,
    jenjang: jenjang,
    pekanAktif: 1,
    tanggalAktif: pilih.tanggal,
    kegiatanRencanaAktif: pilih.kegiatan,
    daftarPekan: rows.map(r => ({ pekan: r.pekan, tanggal: r.tanggal, kegiatan: r.kegiatan }))
  };
}

function uploadFotoPjBL(params) {
  const jenjang = getJenjangDariKelas(params.kelas);
  const folderId = PJBL_FOLDER_ID[jenjang];
  if (!folderId) return { success: false, error: 'folder_tidak_ditemukan_untuk_kelas: ' + params.kelas };

  const folder = DriveApp.getFolderById(folderId);
  const blob = Utilities.newBlob(
    Utilities.base64Decode(params.base64),
    params.mimeType,
    params.filename
  );
  const file = folder.createFile(blob);
  return { success: true, url: file.getUrl(), fileId: file.getId() };
}

function submitNilaiSemesterPjBL(params) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = getSS().getSheetByName('PjBL_NilaiSemester');
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const colKelas = headers.indexOf('Kelas');
    const colNis = headers.indexOf('NIS');
    const colPeriode = headers.indexOf('Periode');

    const aspek = [
      Number(params.pemahamanKonsep) || 0,
      Number(params.keterampilanProses) || 0,
      Number(params.kolaborasiSikap) || 0,
      Number(params.presentasiKomunikasi) || 0,
      Number(params.nilaiKarakterIslami) || 0
    ];
    const total = aspek.reduce((a, b) => a + b, 0);

    const rowValues = [
      new Date(), params.kelas, params.nis, params.nama, params.periode,
      aspek[0], aspek[1], aspek[2], aspek[3], aspek[4], total, params.dicatatOleh || ''
    ];

    let rowIndex = -1;
    for (let i = 1; i < data.length; i++) {
      if (data[i][colKelas] === params.kelas && data[i][colNis].toString() === params.nis.toString() &&
          data[i][colPeriode] === params.periode) {
        rowIndex = i + 1;
        break;
      }
    }
    if (rowIndex === -1) {
      sheet.getRange(sheet.getLastRow() + 1, 1, 1, rowValues.length).setValues([rowValues]);
    } else {
      sheet.getRange(rowIndex, 1, 1, rowValues.length).setValues([rowValues]);
    }

    return { success: true, total: total };
  } finally {
    lock.releaseLock();
  }
}

// ==========================================================
// ============ MODUL: KEDISIPLINAN =========================
// ==========================================================

function generateIdKD() {
  return 'KD' + new Date().getTime() + Math.floor(Math.random() * 1000);
}

function submitPelanggaranBanyakSiswa(params) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = getSS().getSheetByName('Kedisiplinan');
    const timestamp = new Date();
    const rows = (params.listSiswa || []).map(s => ([
      generateIdKD(), timestamp, params.tanggal, params.kelas, s.nis, s.nama,
      params.pelanggaran, params.kategori, params.poin, params.dicatatOleh || ''
    ]));
    if (rows.length > 0) {
      sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
    }
    return { success: true, count: rows.length };
  } finally {
    lock.releaseLock();
  }
}

function submitPelanggaranSiswa(params) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = getSS().getSheetByName('Kedisiplinan');
    const timestamp = new Date();
    const rows = (params.listPelanggaran || []).map(p => ([
      generateIdKD(), timestamp, params.tanggal, params.kelas, params.nis, params.nama,
      p.pelanggaran, p.kategori, p.poin, params.dicatatOleh || ''
    ]));
    if (rows.length > 0) {
      sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
    }
    return { success: true, count: rows.length };
  } finally {
    lock.releaseLock();
  }
}

// ==========================================================
// ============ MODUL: KETERLAMBATAN ========================
// ==========================================================

const JAM_MASUK_SEKOLAH_MENIT = 7 * 60 + 30;

// ==========================================================
// ============ MODUL: MOOD & DASHBOARD KERJA ================
// ==========================================================

function submitAvatar(params) {
  const username = (params.username || '').toString().trim();
  const avatar = Number(params.avatar);

  if (!username) return { success: false, error: 'username_wajib_diisi' };
  if (!Number.isInteger(avatar) || !AVATAR_FILE_IDS[avatar]) {
    return { success: false, error: 'avatar_tidak_valid' };
  }

  const sheet = getSS().getSheetByName('AvatarPilihan');
  if (!sheet) throw new Error('Sheet tidak ditemukan: AvatarPilihan');

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const usernameCol = headers.indexOf('Username');
  const avatarCol = headers.indexOf('Avatar');
  if (usernameCol === -1 || avatarCol === -1) {
    throw new Error('Header sheet AvatarPilihan harus: Username | Avatar');
  }

  const uname = username.toLowerCase();
  for (let i = 1; i < data.length; i++) {
    if ((data[i][usernameCol] || '').toString().trim().toLowerCase() === uname) {
      sheet.getRange(i + 1, avatarCol + 1).setValue(avatar);
      invalidateSheetCache('AvatarPilihan');
      return { success: true, avatar: avatar };
    }
  }

  const row = new Array(headers.length).fill('');
  row[usernameCol] = username;
  row[avatarCol] = avatar;
  sheet.appendRow(row);
  invalidateSheetCache('AvatarPilihan');
  return { success: true, avatar: avatar };
}

function submitMood(params) {
  const sheet = getSS().getSheetByName('MoodLog');
  const tanggal = Utilities.formatDate(new Date(), 'GMT+7', 'yyyy-MM-dd');
  sheet.appendRow([new Date(), params.username, params.nama, params.kelas || '', tanggal, params.mood]);
  return { success: true };
}

function logAktivitas(params) {
  const now = new Date();
  const sheet = getSS().getSheetByName('LogAktivitas');
  sheet.appendRow([now, params.username, params.nama, params.kelas || '', params.modul, params.aksi || '']);
  if (_normV2(params.modul) === 'kedisiplinan' && params.kelas) {
    try { _syncDashboardWajibLaporHarianV4(params.kelas, now, params.username || ''); } catch (err) {}
  }
  return { success: true };
}

// ==========================================================
// ============ MODUL: MASALAH SISWA + REKOMENDASI AI ======
// ==========================================================

function analisisMasalahSiswa(params) {
  const cerita = (params.ceritaWalas || '').trim();
  if (cerita.length < 20) {
    return { success: false, error: 'cerita_terlalu_singkat' };
  }

  let masterRows = [];
  try {
    const { rows } = sheetToObjectsCached('MasterMasalah');
    masterRows = rows;
  } catch (err) {
    masterRows = getFallbackMasterMasalah();
  }

  if (!masterRows || masterRows.length === 0) {
    return { success: false, error: 'master_masalah_kosong' };
  }

  const ceritaLower = cerita.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, ' ');
  const kataKunciCerita = ceritaLower.split(/\s+/).filter(w => w.length > 2);

  let bestMatch = null;
  let bestScore = 0;
  let bestMatchedKeywords = [];

  masterRows.forEach(master => {
    const keywords = (master['KataKunci'] || '').toString().split(',').map(k => k.trim().toLowerCase());
    if (keywords.length === 0) return;

    let matchCount = 0;
    let matched = [];
    keywords.forEach(kw => {
      if (kataKunciCerita.some(k => k.includes(kw) || kw.includes(k))) {
        matchCount++;
        matched.push(kw);
      }
    });

    const score = (matchCount / keywords.length) * 100;
    if (score > bestScore) {
      bestScore = score;
      bestMatch = master;
      bestMatchedKeywords = matched;
    }
  });

  if (!bestMatch || bestScore < 10) {
    const defaultRow = masterRows.find(r => (r['Kategori'] || '').toString().toLowerCase() === 'lainnya');
    if (defaultRow) {
      bestMatch = defaultRow;
      bestScore = 10;
      bestMatchedKeywords = [];
    } else {
      return generateFallbackRekomendasi(params, cerita);
    }
  }

  const result = {
    kategori: bestMatch['Kategori'] || 'Lainnya',
    tingkatPerhatian: bestScore >= 80 ? 'Tinggi' : (bestScore >= 50 ? 'Sedang' : 'Rendah'),
    tingkatKecocokan: Math.round(bestScore),
    masalahUtama: bestMatch['MasalahUtama'] || '-',
    ringkasan: generateRingkasan(cerita, bestMatch),
    kemungkinanKebutuhan: parseList(bestMatch['KemungkinanKebutuhan']),
    tujuanPendampingan: parseList(bestMatch['TujuanPendampingan']),
    penangananLangsung: parseList(bestMatch['PenangananLangsung']),
    strategiKelas: parseList(bestMatch['StrategiKelas']),
    kalimatGuru: bestMatch['KalimatGuru'] || '-',
    saranOrangTua: bestMatch['SaranOrangTua'] || '-',
    rencanaPemantauan: parseList(bestMatch['RencanaPemantauan']),
    indikatorPerbaikan: parseList(bestMatch['IndikatorPerbaikan']),
    saranEskalasi: bestMatch['SaranEskalasi'] || '-',
    halDihindari: parseList(bestMatch['HalDihindari']),
    mendesak: bestMatch['Mendesak'] === 'Ya' || bestMatch['Mendesak'] === true,
    tanggalEvaluasi: Utilities.formatDate(new Date(Date.now() + 7 * 86400000), 'GMT+7', 'yyyy-MM-dd'),
    perluOrangTua: bestMatch['PerluOrangTua'] === 'Ya' || bestMatch['PerluOrangTua'] === true,
    perluKesiswaan: bestMatch['PerluKesiswaan'] === 'Ya' || bestMatch['PerluKesiswaan'] === true,
    perluUKS: bestMatch['PerluUKS'] === 'Ya' || bestMatch['PerluUKS'] === true,
    kataKunciCocok: bestMatchedKeywords
  };

  return { success: true, data: result };
}

function parseList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(v => v.trim());
  return value.toString().split('\n').map(s => s.trim()).filter(s => s.length > 0);
}

function generateRingkasan(cerita, master) {
  const maxLength = 150;
  const ringkasan = cerita.length > maxLength ? cerita.substring(0, maxLength) + '...' : cerita;
  return ringkasan;
}

function generateFallbackRekomendasi(params, cerita) {
  const ringkasan = cerita.length > 150 ? cerita.substring(0, 150) + '...' : cerita;
  return {
    success: true,
    data: {
      kategori: 'Lainnya',
      tingkatPerhatian: 'Sedang',
      tingkatKecocokan: 0,
      masalahUtama: 'Belum dapat dikategorikan secara otomatis',
      ringkasan: ringkasan,
      kemungkinanKebutuhan: ['Identifikasi kebutuhan spesifik siswa melalui observasi lebih lanjut'],
      tujuanPendampingan: ['Menciptakan lingkungan belajar yang mendukung', 'Membangun komunikasi positif dengan siswa'],
      penangananLangsung: ['Bicarakan secara pribadi dengan siswa', 'Dokumentasikan perilaku dan kemajuan'],
      strategiKelas: ['Berikan penguatan positif', 'Libatkan siswa dalam aktivitas kelompok'],
      kalimatGuru: 'Aku melihat kamu sedang berusaha, yuk kita cari cara agar lebih nyaman di kelas.',
      saranOrangTua: 'Koordinasi dengan orang tua untuk memahami situasi di rumah.',
      rencanaPemantauan: ['Observasi mingguan', 'Catat perkembangan perilaku'],
      indikatorPerbaikan: ['Mengurangi perilaku yang menjadi perhatian', 'Meningkatkan partisipasi di kelas'],
      saranEskalasi: 'Jika tidak ada perbaikan dalam 2 minggu, konsultasikan dengan tim kesiswaan.',
      halDihindari: ['Menghakimi siswa di depan umum', 'Membandingkan dengan siswa lain'],
      mendesak: params.risikoKeselamatan === 'Ya',
      tanggalEvaluasi: Utilities.formatDate(new Date(Date.now() + 7 * 86400000), 'GMT+7', 'yyyy-MM-dd'),
      perluOrangTua: true,
      perluKesiswaan: params.risikoKeselamatan === 'Ya',
      perluUKS: false,
      kataKunciCocok: []
    }
  };
}

function getFallbackMasterMasalah() {
  return [
    {
      Kategori: 'Perilaku di Kelas',
      KataKunci: 'ribut,ganggu,bicara,berisik,keluar kursi,mainan,tidak fokus',
      MasalahUtama: 'Perilaku mengganggu di dalam kelas',
      KemungkinanKebutuhan: 'Perlu struktur dan rutinitas yang jelas, perhatian individu',
      TujuanPendampingan: 'Membantu siswa mengelola perilaku dan fokus pada pembelajaran',
      PenangananLangsung: 'Berikan instruksi yang jelas dan tegas, pindahkan tempat duduk jika perlu',
      StrategiKelas: 'Gunakan sistem reward, berikan jeda istirahat, libatkan dalam aktivitas',
      KalimatGuru: 'Kita sepakat ya, kalau mau bicara angkat tangan dulu. Ayo kita coba lagi.',
      SaranOrangTua: 'Diskusikan rutinitas belajar di rumah dan konsistensi aturan',
      RencanaPemantauan: 'Catat perilaku per jam pelajaran, evaluasi mingguan',
      IndikatorPerbaikan: 'Mengurangi intensitas gangguan, meningkatkan partisipasi',
      SaranEskalasi: 'Konsultasikan dengan guru BK atau psikolog sekolah jika tidak membaik',
      HalDihindari: 'Menghakimi di depan kelas, membandingkan dengan siswa lain',
      Mendesak: 'Tidak', PerluOrangTua: 'Ya', PerluKesiswaan: 'Tidak', PerluUKS: 'Tidak'
    },
    {
      Kategori: 'Keterlambatan & Disiplin',
      KataKunci: 'telat,terlambat,bolos,keluar,izin,tidak masuk',
      MasalahUtama: 'Keterlambatan atau ketidakhadiran tanpa keterangan',
      KemungkinanKebutuhan: 'Butuh motivasi dan kedisiplinan, mungkin masalah transportasi',
      TujuanPendampingan: 'Meningkatkan kedisiplinan dan tanggung jawab',
      PenangananLangsung: 'Bicarakan alasan keterlambatan, berikan pemahaman dampaknya',
      StrategiKelas: 'Berikan tanggung jawab kecil, apresiasi jika datang tepat waktu',
      KalimatGuru: 'Aku perhatikan kamu sering datang terlambat. Ada yang bisa aku bantu?',
      SaranOrangTua: 'Koordinasi dengan orang tua tentang jam berangkat dan rutinitas pagi',
      RencanaPemantauan: 'Pantau kehadiran setiap hari, beri feedback mingguan',
      IndikatorPerbaikan: 'Frekuensi keterlambatan menurun, kehadiran meningkat',
      SaranEskalasi: 'Jika berlanjut, panggil orang tua ke sekolah',
      HalDihindari: 'Memarahi di depan umum, menghakimi tanpa mendengar alasan',
      Mendesak: 'Tidak', PerluOrangTua: 'Ya', PerluKesiswaan: 'Tidak', PerluUKS: 'Tidak'
    },
    {
      Kategori: 'Emosi & Sosial',
      KataKunci: 'sedih,marah,menangis,emosi,menarik diri,isolasi,cemas',
      MasalahUtama: 'Masalah emosi atau kesulitan sosial',
      KemungkinanKebutuhan: 'Butuh dukungan emosional, keterampilan sosial, rasa aman',
      TujuanPendampingan: 'Membantu siswa mengelola emosi dan membangun hubungan sosial',
      PenangananLangsung: 'Sediakan ruang aman untuk bicara, latihan pernapasan, kegiatan relaksasi',
      StrategiKelas: 'Kelompok kecil, aktivitas kolaboratif, penguatan positif',
      KalimatGuru: 'Aku melihat kamu terlihat sedih. Mau cerita? Kita cari solusi bersama ya.',
      SaranOrangTua: 'Komunikasikan dengan orang tua untuk mendukung di rumah',
      RencanaPemantauan: 'Observasi suasana hati, catatan harian singkat',
      IndikatorPerbaikan: 'Frekuensi episode emosi menurun, lebih terbuka berinteraksi',
      SaranEskalasi: 'Rujuk ke konselor atau psikolog sekolah jika perlu',
      HalDihindari: 'Mengabaikan perasaan, memaksa bicara jika belum siap',
      Mendesak: 'Tidak', PerluOrangTua: 'Ya', PerluKesiswaan: 'Tidak', PerluUKS: 'Tidak'
    },
    {
      Kategori: 'Akademik',
      KataKunci: 'nilai,tugas,PR,tidak mengerjakan,kesulitan belajar,paham',
      MasalahUtama: 'Kesulitan akademik atau rendahnya motivasi belajar',
      KemungkinanKebutuhan: 'Butuh strategi belajar yang sesuai, dukungan tambahan',
      TujuanPendampingan: 'Meningkatkan pemahaman dan motivasi belajar',
      PenangananLangsung: 'Bimbingan belajar, pembagian tugas menjadi bagian kecil',
      StrategiKelas: 'Diferensiasi pembelajaran, tutor sebaya, penguatan progres kecil',
      KalimatGuru: 'Kita kerjakan bersama ya. Kalau ada yang belum paham, tanya aku.',
      SaranOrangTua: 'Bantu membuat jadwal belajar di rumah, sediakan lingkungan belajar',
      RencanaPemantauan: 'Evaluasi mingguan, pantau penyelesaian tugas',
      IndikatorPerbaikan: 'Nilai meningkat, tugas selesai tepat waktu',
      SaranEskalasi: 'Jika tidak membaik, lakukan asesmen belajar lebih lanjut',
      HalDihindari: 'Membandingkan dengan siswa lain, memberi label bodoh/malas',
      Mendesak: 'Tidak', PerluOrangTua: 'Ya', PerluKesiswaan: 'Tidak', PerluUKS: 'Tidak'
    },
    {
      Kategori: 'Lainnya',
      KataKunci: 'lain',
      MasalahUtama: 'Masalah lain yang perlu perhatian',
      KemungkinanKebutuhan: 'Identifikasi kebutuhan spesifik siswa',
      TujuanPendampingan: 'Memberikan dukungan yang tepat sesuai kebutuhan',
      PenangananLangsung: 'Observasi dan komunikasi dengan siswa',
      StrategiKelas: 'Pendekatan individual, fleksibilitas dalam pembelajaran',
      KalimatGuru: 'Aku peduli padamu. Ada yang bisa aku bantu hari ini?',
      SaranOrangTua: 'Komunikasikan dengan orang tua untuk informasi lebih lanjut',
      RencanaPemantauan: 'Pantau perkembangan dan dokumentasikan',
      IndikatorPerbaikan: 'Perilaku atau situasi membaik',
      SaranEskalasi: 'Konsultasikan dengan tim kesiswaan jika diperlukan',
      HalDihindari: 'Mengabaikan atau menunda penanganan',
      Mendesak: 'Tidak', PerluOrangTua: 'Ya', PerluKesiswaan: 'Tidak', PerluUKS: 'Tidak'
    }
  ];
}

function submitCatatanMasalahSiswa(params) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = getSS().getSheetByName('CatatanMasalahSiswa');
    if (!sheet) {
      const newSheet = getSS().insertSheet('CatatanMasalahSiswa');
      newSheet.appendRow([
        'Timestamp', 'Kelas', 'NIS', 'NamaSiswa', 'TanggalKejadian',
        'CeritaWalas', 'TindakanAwal', 'RisikoKeselamatan',
        'Kategori', 'TingkatPerhatian', 'MasalahUtama', 'Ringkasan',
        'KemungkinanKebutuhan', 'TujuanPendampingan', 'PenangananLangsung',
        'StrategiKelas', 'KalimatGuru', 'SaranOrangTua',
        'RencanaPemantauan', 'IndikatorPerbaikan', 'SaranEskalasi',
        'HalDihindari', 'Mendesak', 'TanggalEvaluasi',
        'PerluOrangTua', 'PerluKesiswaan', 'PerluUKS',
        'SaranFinal', 'Status', 'DicatatOleh'
      ]);
      const newSheetData = getSS().getSheetByName('CatatanMasalahSiswa');
      const rowsToAdd = buildMasalahRow(params);
      newSheetData.appendRow(rowsToAdd);
      return { success: true };
    }

    const rowsToAdd = buildMasalahRow(params);
    sheet.appendRow(rowsToAdd);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.toString() };
  } finally {
    lock.releaseLock();
  }
}

function buildMasalahRow(params) {
  const ai = params.rekomendasiSistem || {};
  const timestamp = new Date();
  const nowStr = Utilities.formatDate(timestamp, 'GMT+7', 'yyyy-MM-dd HH:mm:ss');
  return [
    nowStr, params.kelas || '', params.nis || '', params.namaSiswa || '', params.tanggalKejadian || '',
    params.ceritaWalas || '', params.tindakanAwal || '', params.risikoKeselamatan || '',
    ai.kategori || '', ai.tingkatPerhatian || '', ai.masalahUtama || '', ai.ringkasan || '',
    (ai.kemungkinanKebutuhan || []).join('\n'), (ai.tujuanPendampingan || []).join('\n'),
    (ai.penangananLangsung || []).join('\n'), (ai.strategiKelas || []).join('\n'),
    ai.kalimatGuru || '', ai.saranOrangTua || '',
    (ai.rencanaPemantauan || []).join('\n'), (ai.indikatorPerbaikan || []).join('\n'),
    ai.saranEskalasi || '', (ai.halDihindari || []).join('\n'),
    ai.mendesak ? 'Ya' : 'Tidak', ai.tanggalEvaluasi || '',
    ai.perluOrangTua ? 'Ya' : 'Tidak', ai.perluKesiswaan ? 'Ya' : 'Tidak', ai.perluUKS ? 'Ya' : 'Tidak',
    params.saranFinal || '', params.status || 'Baru', params.dicatatOleh || ''
  ];
}

// ============================================================================
// V2 PERFORMANCE CORE + RAPOR PTS
// ============================================================================

function _cacheV2() { return CacheService.getScriptCache(); }
function _cacheKeyV2(name) { return CACHE_PREFIX_V2 + name; }

function _cacheGetJsonV2(key) {
  const raw = _cacheV2().get(_cacheKeyV2(key));
  if (!raw) return null;
  try { return JSON.parse(raw); } catch (err) { return null; }
}

function _cachePutJsonV2(key, value, ttlSec) {
  try {
    const raw = JSON.stringify(value);
    if (raw.length < 90000) {
      _cacheV2().put(_cacheKeyV2(key), raw, ttlSec || CACHE_TTL_MASTER_SEC);
    }
  } catch (err) {}
}

function _cacheRemoveV2(key) {
  try { _cacheV2().remove(_cacheKeyV2(key)); } catch (err) {}
}

function _sheetV2(name) {
  const sh = getSS().getSheetByName(name);
  if (!sh) throw new Error('Sheet tidak ditemukan: ' + name);
  return sh;
}

function _rowsFromValuesV2(headers, values) {
  const out = [];
  for (let r = 0; r < values.length; r++) {
    const row = values[r];
    let hasValue = false;
    for (let c = 0; c < row.length; c++) {
      if (row[c] !== '' && row[c] !== null) { hasValue = true; break; }
    }
    if (!hasValue) continue;
    const obj = {};
    for (let c = 0; c < headers.length; c++) obj[headers[c]] = row[c];
    out.push(obj);
  }
  return out;
}

function _readAllObjectsV2(sheetName) {
  const sh = _sheetV2(sheetName);
  const lastRow = sh.getLastRow();
  const lastCol = sh.getLastColumn();
  if (lastRow < 1 || lastCol < 1) return [];
  const values = sh.getRange(1, 1, lastRow, lastCol).getValues();
  const headers = values[0];
  return _rowsFromValuesV2(headers, values.slice(1));
}

function _readTailObjectsV2(sheetName, maxRows) {
  const sh = _sheetV2(sheetName);
  const lastRow = sh.getLastRow();
  const lastCol = sh.getLastColumn();
  if (lastRow < 2 || lastCol < 1) return [];
  const headers = sh.getRange(1, 1, 1, lastCol).getValues()[0];
  const count = Math.min(Math.max(1, Number(maxRows) || 500), lastRow - 1);
  const start = lastRow - count + 1;
  const values = sh.getRange(start, 1, count, lastCol).getValues();
  return _rowsFromValuesV2(headers, values);
}

function _readCachedCompactV2(sheetName, fields, ttlSec) {
  const cacheKey = 'compact:' + sheetName + ':' + fields.join(',');
  const cached = _cacheGetJsonV2(cacheKey);
  if (cached) return cached;

  const sh = _sheetV2(sheetName);
  const lastRow = sh.getLastRow();
  const lastCol = sh.getLastColumn();
  if (lastRow < 2) return [];
  const values = sh.getRange(1, 1, lastRow, lastCol).getValues();
  const headers = values[0];
  const pos = {};
  fields.forEach(f => pos[f] = headers.indexOf(f));

  const out = [];
  for (let r = 1; r < values.length; r++) {
    const obj = {};
    let has = false;
    fields.forEach(f => {
      const idx = pos[f];
      const v = idx >= 0 ? values[r][idx] : '';
      obj[f] = v;
      if (v !== '' && v !== null) has = true;
    });
    if (has) out.push(obj);
  }
  _cachePutJsonV2(cacheKey, out, ttlSec || CACHE_TTL_MASTER_SEC);
  return out;
}

function _normV2(v) {
  return (v === null || v === undefined ? '' : String(v)).trim().toLowerCase().replace(/\s+/g, ' ');
}

function _normNameV2(v) {
  return _normV2(v).replace(/[.'’`-]/g, ' ').replace(/\s+/g, ' ').trim();
}

function _dateYMDV2(v) {
  if (v instanceof Date && !isNaN(v.getTime())) {
    return Utilities.formatDate(v, APP_TZ, 'yyyy-MM-dd');
  }
  const s = (v || '').toString().trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(v);
  return isNaN(d.getTime()) ? s : Utilities.formatDate(d, APP_TZ, 'yyyy-MM-dd');
}

function _monthKeyV2(v) {
  const d = v instanceof Date ? v : new Date(v);
  return isNaN(d.getTime()) ? '' : Utilities.formatDate(d, APP_TZ, 'yyyy-MM');
}

function _ensureSheetV2(name, headers) {
  const ss = getSS();
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    sh.setFrozenRows(1);
    return sh;
  }
  const existing = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), headers.length)).getValues()[0];
  const missing = headers.filter(h => existing.indexOf(h) === -1);
  if (missing.length) {
    throw new Error('Header sheet ' + name + ' belum sesuai. Kolom belum ada: ' + missing.join(', '));
  }
  return sh;
}

function _upsertByKeyV2(sheetName, headers, key, rowObject) {
  const sh = _ensureSheetV2(sheetName, headers);
  const keyCol = headers.indexOf('Key') + 1;
  const lastRow = sh.getLastRow();
  let rowNumber = -1;
  if (lastRow >= 2) {
    const found = sh.getRange(2, keyCol, lastRow - 1, 1)
      .createTextFinder(String(key)).matchEntireCell(true).findNext();
    if (found) rowNumber = found.getRow();
  }
  const values = headers.map(h => rowObject[h] !== undefined ? rowObject[h] : '');
  if (rowNumber === -1) {
    sh.getRange(sh.getLastRow() + 1, 1, 1, headers.length).setValues([values]);
  } else {
    sh.getRange(rowNumber, 1, 1, headers.length).setValues([values]);
  }
  return rowNumber === -1 ? sh.getLastRow() : rowNumber;
}

function _getSettingsV2() {
  const cached = _cacheGetJsonV2('settings');
  if (cached) return cached;
  const sh = getSS().getSheetByName('Pengaturan');
  if (!sh || sh.getLastRow() < 2) return {};
  const rows = sh.getRange(2, 1, sh.getLastRow() - 1, Math.min(3, sh.getLastColumn())).getValues();
  const out = {};
  rows.forEach(r => {
    const k = (r[0] || '').toString().trim();
    if (k) out[k] = r[1];
  });
  _cachePutJsonV2('settings', out, CACHE_TTL_SETTINGS_SEC);
  return out;
}

function _setSettingIfBlankV2(key, value, note) {
  const sh = _ensureSheetV2('Pengaturan', ['Key','Value','Keterangan']);
  const lastRow = sh.getLastRow();
  if (lastRow >= 2) {
    const found = sh.getRange(2, 1, lastRow - 1, 1).createTextFinder(key).matchEntireCell(true).findNext();
    if (found) {
      const current = sh.getRange(found.getRow(), 2).getValue();
      if (current === '' || current === null) {
        sh.getRange(found.getRow(), 2).setValue(value);
        invalidateSheetCache('Pengaturan');
      }
      return;
    }
  }
  sh.appendRow([key, value, note || '']);
  invalidateSheetCache('Pengaturan');
}

function _activePeriodV2() {
  const s = _getSettingsV2();
  return {
    tahunAjaran: (s.TahunAjaran || '2026/2027').toString(),
    periode: (s.PeriodeRaporAktif || 'S1_PTS').toString()
  };
}

// --------------------------------------------------------------------------
// SETUP
// --------------------------------------------------------------------------
function setupSistemV2() {
  const created = [];
  const defs = {
    Pengaturan: ['Key','Value','Keterangan'],
    MapTahfizhSiswa: ['NIS','NamaSistem','KelasSistem','NamaTahfizh','KelasTahfizh','StatusMapping','Catatan'],
    MapKelasTahfizh: ['KelasTahfizh','KelasSistem','SheetTahfizh','Aktif','Catatan'],
    MapKelasMarketDay: ['KelasMarketDay','KelasSistem','SheetMarketDay','Aktif','Catatan'],
    LaporanGuru_Request: ['RequestID','TimestampRequest','Kelas','Bulan','Tahun','RequestedBy','RequestedByUsername','Status','OutputSpreadsheetId','OutputURL','DikirimKe','PesanError','SelesaiPada'],
    MasterReward: ['KodeReward','NamaReward','Kategori','Poin','Jenjang','Aktif','Keterangan'],
    RewardLog: ['ID','Timestamp','Tanggal','Kelas','NIS','Nama','KodeReward','NamaReward','Kategori','Poin','DicatatOleh'],
    RewardRekap: ['Key','Kelas','NIS','Nama','TotalPoin','JumlahReward','TerakhirUpdate'],
    KedisiplinanRekap: ['Key','Kelas','NIS','Nama','Ringan','Sedang','Berat','TotalPoin','JumlahKejadian','TerakhirUpdate'],
    KedisiplinanRekapBulanan: ['Key','YearMonth','Kelas','NIS','Nama','Ringan','Sedang','Berat','TotalPoin','JumlahKejadian','TanggalTerakhir'],
    AbsensiRaporHarian: ['Key','TahunAjaran','Periode','Tanggal','Kelas','NIS','Nama','Status','TerakhirUpdate'],
    AbsensiRaporRekap: ['Key','TahunAjaran','Periode','Kelas','NIS','Nama','Hadir','Sakit','Izin','Alfa','TotalHari','TerakhirUpdate'],
    AdabPTS: ['Key','TahunAjaran','Periode','Kelas','NIS','Nama','NilaiAdab','Predikat','Catatan','DicatatOleh','Timestamp'],
    KomentarWalasPTS: ['Key','TahunAjaran','Periode','Kelas','NIS','Nama','KomentarWalas','DicatatOleh','Timestamp'],
    KegiatanSiswaPTS: ['Key','TahunAjaran','Periode','Kelas','NIS','Nama','EkskulKeaktifan','EkskulKemampuan','LombaPrestasi','KeaktifanSekolah','Catatan','DicatatOleh','Timestamp'],
    RaporPTS_Request: ['RequestID','TimestampRequest','TahunAjaran','Periode','Kelas','RequestedBy','RequestedByUsername','Status','Progress','OutputFileId','OutputURL','DikirimKe','PesanError','SelesaiPada']
  };

  Object.keys(defs).forEach(name => {
    const before = !!getSS().getSheetByName(name);
    _ensureSheetV2(name, defs[name]);
    if (!before) created.push(name);
  });

  _setSettingIfBlankV2('TahunAjaran', '2026/2027', 'Tahun ajaran aktif');
  _setSettingIfBlankV2('PeriodeRaporAktif', 'S1_PTS', 'Periode pertama yang dibangun');
  _setSettingIfBlankV2('TanggalMulaiPTS', '', 'Tanggal awal rekap PTS, format yyyy-mm-dd');
  _setSettingIfBlankV2('TanggalAkhirPTS', '', 'Tanggal akhir rekap PTS, format yyyy-mm-dd');
  _setSettingIfBlankV2('SpreadsheetTahfizhID', '', 'ID Google Spreadsheet Tahfizh');
  _setSettingIfBlankV2('SpreadsheetMarketDayID', '', 'ID Google Spreadsheet Market Day (per kelas per tab, seperti Tahfizh)');
  _setSettingIfBlankV2('LaporanGuruFolderID', '', 'ID folder Drive untuk simpan hasil Laporan Guru (opsional, default folder otomatis)');
  _setSettingIfBlankV2('RaporPTSTemplateID', '', 'ID template Google Docs untuk PTS (isi tag {{...}} sesuai dokumentasi)');
  _setSettingIfBlankV2('RaporOutputFolderID', '', 'ID folder Drive untuk simpan PDF rapor hasil generate (opsional, default folder otomatis)');
  _setSettingIfBlankV2('LegerSpreadsheetURL', '', 'Link Spreadsheet leger nilai');
  _setSettingIfBlankV2('AmbangEskalasiKedisiplinan', 50, 'Bisa diubah tanpa edit kode');
  _setSettingIfBlankV2('ZonaWaktu', 'Asia/Jakarta', 'Zona waktu sistem');

  _seedMapKelasTahfizhV2();
  _seedMapKelasMarketDayV2();
  _cacheRemoveV2('settings');
  return {
    success: true,
    createdSheets: created,
    message: 'Setup V2 selesai. Rekap historis lama belum dimigrasikan otomatis agar setup tetap cepat.'
  };
}

function _seedMapKelasTahfizhV2() {
  const sh = _ensureSheetV2('MapKelasTahfizh', ['KelasTahfizh','KelasSistem','SheetTahfizh','Aktif','Catatan']);
  if (sh.getLastRow() > 1) return;
  const rows = [];
  for (let grade = 1; grade <= 6; grade++) {
    const suffixes = grade === 6 ? [''] : ['A','B'];
    suffixes.forEach(sfx => {
      const code = String(grade) + sfx;
      rows.push([code + ' T', code + ' Banat', 'Banat ' + code, 'Ya', 'CEK & SESUAIKAN kolom KelasSistem dengan nama kelas asli di sheet Siswa/Walas']);
      rows.push([code + ' N', code + ' Banin', 'Banin ' + code, 'Ya', 'CEK & SESUAIKAN kolom KelasSistem dengan nama kelas asli di sheet Siswa/Walas']);
    });
  }
  sh.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
}

function _seedMapKelasMarketDayV2() {
  const sh = _ensureSheetV2('MapKelasMarketDay', ['KelasMarketDay','KelasSistem','SheetMarketDay','Aktif','Catatan']);
  if (sh.getLastRow() > 1) return;
  const rows = [];
  for (let grade = 1; grade <= 6; grade++) {
    const suffixes = grade === 6 ? [''] : ['A','B'];
    suffixes.forEach(sfx => {
      const code = String(grade) + sfx;
      rows.push([code + ' T', code + ' Banat', 'Banat ' + code, 'Ya', 'CEK & SESUAIKAN dengan nama tab asli di Spreadsheet Market Day']);
      rows.push([code + ' N', code + ' Banin', 'Banin ' + code, 'Ya', 'CEK & SESUAIKAN dengan nama tab asli di Spreadsheet Market Day']);
    });
  }
  sh.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
}

function getSystemV2Health() {
  const required = ['Pengaturan','KedisiplinanRekap','KedisiplinanRekapBulanan','AbsensiRaporHarian','AbsensiRaporRekap','MapTahfizhSiswa','MapKelasTahfizh','MasterReward','RewardLog','RewardRekap','AdabPTS','KomentarWalasPTS','KegiatanSiswaPTS'];
  const ss = getSS();
  const sheets = {};
  required.forEach(n => sheets[n] = !!ss.getSheetByName(n));
  const settings = _getSettingsV2();
  return {
    success: true,
    sheets,
    settings: {
      TahunAjaran: settings.TahunAjaran || '',
      PeriodeRaporAktif: settings.PeriodeRaporAktif || '',
      SpreadsheetTahfizhID: settings.SpreadsheetTahfizhID ? 'configured' : 'missing',
      RaporPTSTemplateID: settings.RaporPTSTemplateID ? 'configured' : 'missing',
      LegerSpreadsheetURL: settings.LegerSpreadsheetURL ? 'configured' : 'missing'
    }
  };
}

// --------------------------------------------------------------------------
// MASTER / LOGIN FAST
// --------------------------------------------------------------------------
function handleLoginV2(params) {
  const rows = _readCachedCompactV2('Walas', ['Nama','Username','Kelas diampu','Role','Status aktif','PasswordHash'], CACHE_TTL_MASTER_SEC);
  const inputUsername = _normV2(params.username);
  const match = rows.find(r => _normV2(r['Username']) === inputUsername && isStatusAktif(r['Status aktif']));
  if (!match || match['PasswordHash'] !== params.passwordHash) {
    return { success: false, error: 'invalid_credentials' };
  }
  return {
    success: true,
    user: {
      nama: match['Nama'], username: match['Username'], kelas: match['Kelas diampu'],
      role: match['Role'], avatar: getAvatarUsernameV2(match['Username'])
    }
  };
}

function getAvatarUsernameV2(username) {
  try {
    const rows = _readCachedCompactV2('AvatarPilihan', ['Username','Avatar'], CACHE_TTL_MASTER_SEC);
    const u = _normV2(username);
    const m = rows.find(r => _normV2(r.Username) === u);
    const avatar = m ? Number(m.Avatar) : null;
    return avatar && AVATAR_FILE_IDS[avatar] ? avatar : null;
  } catch (err) { return null; }
}

function getAvatarCatalogV2() {
  const data = Object.keys(AVATAR_FILE_IDS).map(id => ({
    id: Number(id), fileId: AVATAR_FILE_IDS[id],
    thumbnailUrl: 'https://drive.google.com/thumbnail?id=' + encodeURIComponent(AVATAR_FILE_IDS[id]) + '&sz=w1000',
    viewUrl: 'https://drive.google.com/file/d/' + encodeURIComponent(AVATAR_FILE_IDS[id]) + '/view'
  }));
  return { success: true, data };
}

function getSiswaByKelasV2(kelas) {
  const rows = _readCachedCompactV2('Siswa', ['NIS','NISN','Nama','Kelas'], CACHE_TTL_MASTER_SEC);
  const target = _normV2(kelas);
  const list = rows.filter(r => _normV2(r.Kelas) === target).map(r => ({ nis: r.NIS, nisn: r.NISN || '', nama: r.Nama }));
  return { success: true, data: list };
}

// --------------------------------------------------------------------------
// LEGGER NILAI V1
// MasterMapel + MasterKomponenNilai + MasterKKM + NilaiSiswa
// --------------------------------------------------------------------------
function _legerCachePartV1(v) {
  return _normV2(v).replace(/[^\w.-]+/g, '_').substring(0, 80);
}

function _legerIsActiveV1(v) {
  if (v === '' || v === null || v === undefined) return true;
  return isStatusAktif(v);
}

function _legerSetupCacheKeyV1(kelas, tahunAjaran, semester) {
  return 'leger:setup:v1:' + _legerCachePartV1(kelas) + ':' + _legerCachePartV1(tahunAjaran) + ':' + String(semester);
}

function _legerNilaiCacheKeyV1(kelas, tahunAjaran, semester, mapel) {
  return 'leger:nilai:v1:' + _legerCachePartV1(kelas) + ':' + _legerCachePartV1(tahunAjaran) + ':' + String(semester) + ':' + _legerCachePartV1(mapel);
}

function _buildLeggerSetupV1(params) {
  const kelas = String(params.kelas || '').trim();
  if (!kelas) return { success: false, error: 'kelas_wajib_diisi' };

  const jenjang = getJenjangDariKelas(kelas);
  if (!jenjang) return { success: false, error: 'jenjang_tidak_ditemukan_dari_kelas' };

  const settings = _getSettingsV2();
  const tahunAjaran = String(params.tahunAjaran || settings.TahunAjaran || '2026/2027').trim();
  const semester = Number(params.semester) || 1;
  if (semester !== 1 && semester !== 2) return { success: false, error: 'semester_tidak_valid' };

  const cacheKey = _legerSetupCacheKeyV1(kelas, tahunAjaran, semester);
  const cached = _cacheGetJsonV2(cacheKey);
  if (cached) return cached;

  const mapelRows = _readCachedCompactV2('MasterMapel', ['Mapel','Kelompok','Jenjang','Urutan','Aktif'], CACHE_TTL_MASTER_SEC);
  const komponenRows = _readCachedCompactV2('MasterKomponenNilai', ['Jenjang','Mapel','JenisKomponen','Urutan','Bobot','Aktif'], CACHE_TTL_MASTER_SEC);
  const kkmRows = _readCachedCompactV2('MasterKKM', ['TahunAjaran','Semester','Jenjang','Mapel','KKM','Aktif'], CACHE_TTL_MASTER_SEC);

  const mapel = mapelRows
    .filter(r => Number(r.Jenjang) === Number(jenjang) && _legerIsActiveV1(r.Aktif))
    .map(r => ({
      mapel: String(r.Mapel || '').trim(),
      kelompok: String(r.Kelompok || '').trim(),
      urutan: Number(r.Urutan) || 999
    }))
    .filter(r => r.mapel)
    .sort((a,b) => a.urutan - b.urutan || a.mapel.localeCompare(b.mapel));

  mapel.forEach(m => {
    m.komponen = komponenRows
      .filter(r =>
        Number(r.Jenjang) === Number(jenjang) &&
        _normV2(r.Mapel) === _normV2(m.mapel) &&
        _legerIsActiveV1(r.Aktif)
      )
      .map(r => ({
        jenisKomponen: String(r.JenisKomponen || '').trim(),
        urutan: Number(r.Urutan) || 0,
        bobot: Number(r.Bobot) || 0
      }))
      .filter(r => r.jenisKomponen && r.urutan > 0)
      .sort((a,b) => {
        const order = {Tugas:1, TP:2, WWP:3, ASAS:4};
        return (order[a.jenisKomponen] || 99) - (order[b.jenisKomponen] || 99) || a.urutan - b.urutan;
      });

    const kkm = kkmRows.find(r =>
      String(r.TahunAjaran || '').trim() === tahunAjaran &&
      Number(r.Semester) === semester &&
      Number(r.Jenjang) === Number(jenjang) &&
      _normV2(r.Mapel) === _normV2(m.mapel) &&
      _legerIsActiveV1(r.Aktif)
    );
    m.kkm = kkm ? (Number(kkm.KKM) || null) : null;
  });

  const result = {
    success: true,
    kelas,
    jenjang,
    tahunAjaran,
    semester,
    mapel,
    readMode: 'master-filtered'
  };

  _cachePutJsonV2(cacheKey, result, CACHE_TTL_MASTER_SEC);
  return result;
}

function getLeggerSetupV1(params) {
  return _buildLeggerSetupV1(params || {});
}

function getLeggerNilaiV1(params) {
  params = params || {};
  const kelas = String(params.kelas || '').trim();
  const tahunAjaran = String(params.tahunAjaran || '').trim();
  const semester = Number(params.semester) || 1;
  const mapel = String(params.mapel || '').trim();

  if (!kelas || !tahunAjaran || !mapel) {
    return { success: false, error: 'kelas_tahunajaran_mapel_wajib_diisi' };
  }

  const setup = _buildLeggerSetupV1({ kelas, tahunAjaran, semester });
  if (!setup.success) return setup;

  const mapelMeta = (setup.mapel || []).find(m => _normV2(m.mapel) === _normV2(mapel));
  if (!mapelMeta) return { success: false, error: 'mapel_tidak_aktif_untuk_jenjang_ini' };

  const siswa = (getSiswaByKelasV2(kelas).data || [])
    .slice()
    .sort((a,b) => String(a.nama || '').localeCompare(String(b.nama || ''), 'id'));

  const cacheKey = _legerNilaiCacheKeyV1(kelas, tahunAjaran, semester, mapelMeta.mapel);
  const cached = _cacheGetJsonV2(cacheKey);
  if (cached) {
    return { success: true, siswa, nilai: cached, cached: true };
  }

  const sh = _sheetV2('NilaiSiswa');
  const lastRow = sh.getLastRow();
  const lastCol = sh.getLastColumn();
  const nilai = {};

  if (lastRow >= 2 && lastCol >= 1) {
    const headers = sh.getRange(1,1,1,lastCol).getValues()[0];
    const pos = {};
    ['TahunAjaran','Semester','Kelas','NIS','Mapel','JenisKomponen','Urutan','Nilai'].forEach(h => pos[h] = headers.indexOf(h));

    const missing = Object.keys(pos).filter(h => pos[h] < 0);
    if (missing.length) return { success: false, error: 'header_NilaiSiswa_tidak_lengkap: ' + missing.join(', ') };

    const values = sh.getRange(2,1,lastRow-1,lastCol).getValues();
    values.forEach(row => {
      if (String(row[pos.TahunAjaran] || '').trim() !== tahunAjaran) return;
      if (Number(row[pos.Semester]) !== semester) return;
      if (_normV2(row[pos.Kelas]) !== _normV2(kelas)) return;
      if (_normV2(row[pos.Mapel]) !== _normV2(mapelMeta.mapel)) return;

      const nis = String(row[pos.NIS] || '').trim();
      const jenis = String(row[pos.JenisKomponen] || '').trim();
      const urutan = Number(row[pos.Urutan]) || 0;
      if (!nis || !jenis || !urutan) return;

      const raw = row[pos.Nilai];
      const key = jenis + '|' + urutan;
      if (!nilai[nis]) nilai[nis] = {};
      if (raw === '' || raw === null || raw === undefined) nilai[nis][key] = '';
      else {
        const n = Number(raw);
        nilai[nis][key] = Number.isFinite(n) ? n : '';
      }
    });
  }

  _cachePutJsonV2(cacheKey, nilai, 120);
  return { success: true, siswa, nilai, cached: false };
}

function saveLeggerNilaiV1(params) {
  params = params || {};
  const kelas = String(params.kelas || '').trim();
  const tahunAjaran = String(params.tahunAjaran || '').trim();
  const semester = Number(params.semester) || 1;
  const mapel = String(params.mapel || '').trim();
  const dicatatOleh = String(params.dicatatOleh || params.username || '').trim();
  const changes = Array.isArray(params.changes) ? params.changes : [];

  if (!kelas || !tahunAjaran || !mapel) return { success: false, error: 'kelas_tahunajaran_mapel_wajib_diisi' };
  if (!changes.length) return { success: true, saved: 0 };

  const setup = _buildLeggerSetupV1({ kelas, tahunAjaran, semester });
  if (!setup.success) return setup;
  const mapelMeta = (setup.mapel || []).find(m => _normV2(m.mapel) === _normV2(mapel));
  if (!mapelMeta) return { success: false, error: 'mapel_tidak_aktif_untuk_jenjang_ini' };

  const validKomponen = {};
  (mapelMeta.komponen || []).forEach(k => {
    validKomponen[String(k.jenisKomponen) + '|' + Number(k.urutan)] = true;
  });

  const siswaList = getSiswaByKelasV2(kelas).data || [];
  const siswaMap = {};
  siswaList.forEach(s => siswaMap[String(s.nis)] = s);

  const normalized = [];
  for (let i = 0; i < changes.length; i++) {
    const c = changes[i] || {};
    const nis = String(c.nis || '').trim();
    const jenis = String(c.jenisKomponen || '').trim();
    const urutan = Number(c.urutan) || 0;
    if (!nis || !siswaMap[nis]) return { success: false, error: 'nis_tidak_valid_untuk_kelas: ' + nis };
    if (!validKomponen[jenis + '|' + urutan]) return { success: false, error: 'komponen_nilai_tidak_valid: ' + jenis + ' ' + urutan };

    let nilai = '';
    if (c.nilai !== '' && c.nilai !== null && c.nilai !== undefined) {
      nilai = Number(c.nilai);
      if (!Number.isFinite(nilai) || nilai < 0 || nilai > 100) {
        return { success: false, error: 'nilai_harus_0_sampai_100' };
      }
      nilai = Math.round(nilai * 100) / 100;
    }

    normalized.push({
      nis,
      nama: String(siswaMap[nis].nama || c.nama || '').trim(),
      jenisKomponen: jenis,
      urutan,
      nilai
    });
  }

  const headersExpected = ['Key','TahunAjaran','Semester','Kelas','NIS','Nama','Mapel','JenisKomponen','Urutan','Nilai','DicatatOleh','UpdatedAt'];
  const sh = _ensureSheetV2('NilaiSiswa', headersExpected);

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const lastCol = sh.getLastColumn();
    const headers = sh.getRange(1,1,1,lastCol).getValues()[0];
    const keyCol = headers.indexOf('Key');
    if (keyCol < 0) throw new Error('Kolom Key tidak ditemukan pada NilaiSiswa.');

    const lastRow = sh.getLastRow();
    const existingKeyRows = {};
    if (lastRow >= 2) {
      const keys = sh.getRange(2,keyCol+1,lastRow-1,1).getValues();
      keys.forEach((r,idx) => {
        const key = String(r[0] || '').trim();
        if (key) existingKeyRows[key] = idx + 2;
      });
    }

    const now = new Date();
    const updates = [];
    const appends = [];

    normalized.forEach(c => {
      const key = [tahunAjaran, semester, kelas, c.nis, mapelMeta.mapel, c.jenisKomponen, c.urutan].join('|');

      // Jangan membuat baris baru kalau user hanya mengosongkan nilai yang sebelumnya memang belum ada.
      if (!existingKeyRows[key] && c.nilai === '') return;

      const obj = {
        Key: key,
        TahunAjaran: tahunAjaran,
        Semester: semester,
        Kelas: kelas,
        NIS: c.nis,
        Nama: c.nama,
        Mapel: mapelMeta.mapel,
        JenisKomponen: c.jenisKomponen,
        Urutan: c.urutan,
        Nilai: c.nilai,
        DicatatOleh: dicatatOleh,
        UpdatedAt: now
      };
      const rowValues = headers.map(h => obj[h] !== undefined ? obj[h] : '');

      if (existingKeyRows[key]) updates.push({ row: existingKeyRows[key], values: rowValues });
      else appends.push(rowValues);
    });

    // Update existing rows in contiguous blocks to reduce Spreadsheet calls.
    updates.sort((a,b) => a.row - b.row);
    let i = 0;
    while (i < updates.length) {
      let j = i + 1;
      while (j < updates.length && updates[j].row === updates[j-1].row + 1) j++;
      const block = updates.slice(i,j);
      sh.getRange(block[0].row,1,block.length,headers.length).setValues(block.map(x => x.values));
      i = j;
    }

    if (appends.length) {
      sh.getRange(sh.getLastRow()+1,1,appends.length,headers.length).setValues(appends);
    }

    SpreadsheetApp.flush();
    invalidateSheetCache('NilaiSiswa');
    _cacheRemoveV2(_legerNilaiCacheKeyV1(kelas, tahunAjaran, semester, mapelMeta.mapel));

    return {
      success: true,
      saved: updates.length + appends.length,
      updated: updates.length,
      inserted: appends.length
    };
  } finally {
    lock.releaseLock();
  }
}


function getMasterPelanggaranV2(jenjang) {
  const rows = _readCachedCompactV2('MasterPelanggaran', ['Jenjang','Pelanggaran','Kategori','Poin'], CACHE_TTL_MASTER_SEC);
  const j = _normV2(jenjang);
  return {
    success: true,
    data: rows.filter(r => _normV2(r.Jenjang) === j).map(r => ({ pelanggaran: r.Pelanggaran, kategori: r.Kategori, poin: Number(r.Poin) || 0 }))
  };
}

// --------------------------------------------------------------------------
// ABSENSI
// --------------------------------------------------------------------------
function submitAbsensiV2Fast(params) {
  const res = submitAbsensi(params);
  if (res && res.success) {
    try { _syncAbsensiRaporFastV2(params); }
    catch (err) { res.warning = 'absensi_tersimpan_tapi_summary_pts_gagal: ' + err.message; }
    try { _syncDashboardAbsensiHarianV4(params); }
    catch (err) { res.dashboardWarning = 'summary_dashboard_absensi_gagal: ' + err.message; }
  }
  return res;
}

function getAbsensiHariIniV2(kelas, tanggal) {
  const targetDate = tanggal || Utilities.formatDate(new Date(), APP_TZ, 'yyyy-MM-dd');
  const rows = _readTailObjectsV2('Absensi', LOG_TAIL.Absensi);
  const targetClass = _normV2(kelas);
  const latestByNis = {};
  rows.forEach(r => {
    if (_normV2(r.Kelas) !== targetClass) return;
    if (_dateYMDV2(r.Timestamp) !== targetDate) return;
    latestByNis[String(r.NIS)] = r;
  });
  const filtered = Object.keys(latestByNis).map(k => latestByNis[k]);
  const rekap = { Hadir:0, Sakit:0, Izin:0, Alfa:0 };
  filtered.forEach(r => { if (rekap[r.Status] !== undefined) rekap[r.Status]++; });

  let temaMT = '';
  const rekapRows = _readTailObjectsV2('RekapAbsensi', LOG_TAIL.RekapAbsensi);
  for (let i = rekapRows.length - 1; i >= 0; i--) {
    const r = rekapRows[i];
    if (_normV2(r.Kelas) === targetClass && _dateYMDV2(r.Timestamp) === targetDate) {
      temaMT = r.TemaMT || '';
      break;
    }
  }
  return {
    success: true, sudahAbsen: filtered.length > 0, rekap, total: filtered.length, temaMT,
    fotoUrl: filtered.length ? filtered[0].FotoMT_URL || null : null,
    detail: filtered.map(r => ({ nis:r.NIS, nama:r.Nama, status:r.Status })),
    readMode: 'tail'
  };
}

function _syncAbsensiRaporFastV2(params) {
  _ensureFastBucketSheetsV2();
  const active = _activePeriodV2();
  const tanggal = (params.tanggal || Utilities.formatDate(new Date(), APP_TZ, 'yyyy-MM-dd')).toString();
  const key = [active.tahunAjaran, active.periode, tanggal, params.kelas].join('|');
  const headers = ['Key','TahunAjaran','Periode','Tanggal','Kelas','DataJSON','UpdatedAt'];
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sh = _sheetV2('V2_AbsensiPTS_HariKelas');
    const rowNo = _findBucketRowV2(sh, key);
    let data = {};
    if (rowNo !== -1) data = _readJsonSafeV2(sh.getRange(rowNo,6).getValue());
    (params.data || []).forEach(s => { data[String(s.nis)] = { nama:s.nama || '', status:s.status || '' }; });
    _writeBucketRowV2(sh, headers, rowNo, [key,active.tahunAjaran,active.periode,tanggal,params.kelas,JSON.stringify(data),new Date()]);
  } finally { lock.releaseLock(); }
}

function _loadAbsensiPTSClassFastV2(kelas, tahunAjaran, periode) {
  const sh = getSS().getSheetByName('V2_AbsensiPTS_HariKelas');
  const out = {};
  if (!sh || sh.getLastRow() < 2) return out;
  const rows = sh.getRange(2,1,sh.getLastRow()-1,7).getValues();
  const target = _normV2(kelas);
  rows.forEach(r => {
    if (String(r[1]) !== String(tahunAjaran) || String(r[2]) !== String(periode) || _normV2(r[4]) !== target) return;
    const daily = _readJsonSafeV2(r[5]);
    Object.keys(daily).forEach(nis => {
      if (!out[nis]) out[nis] = {Hadir:0,Sakit:0,Izin:0,Alfa:0,TotalHari:0};
      const status = daily[nis] && daily[nis].status;
      if (out[nis][status] !== undefined) out[nis][status]++;
    });
  });
  Object.keys(out).forEach(nis => { const a=out[nis]; a.TotalHari=a.Hadir+a.Sakit+a.Izin+a.Alfa; });
  return out;
}

// --------------------------------------------------------------------------
// KEDISIPLINAN
// --------------------------------------------------------------------------
function getRiwayatPelanggaranV2(kelas, tanggal) {
  const targetClass = _normV2(kelas);
  const rows = _readTailObjectsV2('Kedisiplinan', LOG_TAIL.Kedisiplinan);
  let filtered = rows.filter(r => _normV2(r.Kelas) === targetClass);
  if (tanggal) filtered = filtered.filter(r => _dateYMDV2(r.Tanggal) === tanggal);
  filtered.sort((a,b) => new Date(b.Timestamp) - new Date(a.Timestamp));
  return {
    success:true,
    data: filtered.map(r => ({id:r.ID,tanggal:_dateYMDV2(r.Tanggal),nis:r.NIS,nama:r.Nama,pelanggaran:r.Pelanggaran,kategori:r.Kategori,poin:r.Poin,dicatatOleh:r.DicatatOleh})),
    readMode:'tail', truncated: rows.length >= LOG_TAIL.Kedisiplinan
  };
}

function getKeterlambatanBelumDicatatV2Fast(kelas, tanggal) {
  const targetDate = tanggal || Utilities.formatDate(new Date(), APP_TZ, 'yyyy-MM-dd');
  const targetClass = _normV2(kelas);
  const sh = _sheetV2('Keterlambatan');
  const last = sh.getLastRow(), lastCol = sh.getLastColumn();
  const count = last>0 ? Math.min(LOG_TAIL.Keterlambatan, last) : 0;
  const rows = count ? sh.getRange(last-count+1,1,count,lastCol).getValues() : [];
  const filtered = [];
  rows.forEach(row => {
    if (_normV2(row[3]) !== targetClass) return;
    const t = _dateYMDV2(row[1]);
    if (t !== targetDate) return;
    const jam = row[2];
    let m = 0;
    if (jam instanceof Date) m = jam.getHours()*60+jam.getMinutes();
    else { const p=String(jam||'').split(':'); m=(parseInt(p[0],10)||0)*60+(parseInt(p[1],10)||0); }
    const telat = m - JAM_MASUK_SEKOLAH_MENIT;
    if (telat >= 15) filtered.push({nis:String(row[4]||''),nama:row[5],tanggal:t,menitTerlambat:telat});
  });
  const kd = _readTailObjectsV2('Kedisiplinan', LOG_TAIL.Kedisiplinan);
  const done = {};
  kd.forEach(r => {
    if (_normV2(r.Kelas)===targetClass && r.Pelanggaran==='Terlambat lebih dari 15 menit' && _dateYMDV2(r.Tanggal)===targetDate) {
      done[targetDate+'|'+String(r.NIS)] = true;
    }
  });
  return { success:true, data: filtered.map(r=>Object.assign({},r,{sudahDicatat:!!done[r.tanggal+'|'+r.nis]})), readMode:'raw-tail' };
}

// --------------------------------------------------------------------------
// PjBL read optimization
// --------------------------------------------------------------------------
function getPjBLPekanV2(kelas, pekan) {
  const p = String(pekan);
  const logRows = _readTailObjectsV2('PjBL_Log', LOG_TAIL.PjBL_Log);
  let logMatch = null;
  for (let i=logRows.length-1;i>=0;i--) {
    const r=logRows[i];
    if(_normV2(r.Kelas)===_normV2(kelas) && String(r.Pekan)===p){logMatch=r;break;}
  }
  const nilaiRows = _readTailObjectsV2('PjBL_NilaiPekanan', LOG_TAIL.PjBL_NilaiPekanan);
  const nilaiMap={}; let count=0;
  nilaiRows.forEach(r=>{
    if(_normV2(r.Kelas)===_normV2(kelas) && String(r.Pekan)===p){nilaiMap[String(r.NIS)]=r.Skor;count++;}
  });
  return {success:true,sudahAda:!!logMatch||count>0,log:logMatch?{
    kegiatanRencana:logMatch.KegiatanRencana||'',realita:logMatch.Realita||'',kendala:logMatch.Kendala||'',masukan:logMatch.Masukan||'',fotoUrl:logMatch.FotoURL||''
  }:null,nilai:nilaiMap,readMode:'tail'};
}

// Fungsi upsert PjBL yang dioptimasi -- baca dari ekor sheet, bukan getDataRange() penuh.
// Asumsi aman: PjBL cuma nambah ~1 baris per kelas per pekan, tail 1200 baris
// mencakup lebih dari 2 semester histori.
function submitPjBLV2Fast(params) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const timestamp = new Date();
    const pekanStr = params.pekan.toString();

    const sheetLog = _sheetV2('PjBL_Log');
    const lastRow = sheetLog.getLastRow();
    const lastCol = sheetLog.getLastColumn();
    const headersLog = lastRow > 0 ? sheetLog.getRange(1,1,1,lastCol).getValues()[0] : [];
    const colKelasLog = headersLog.indexOf('Kelas');
    const colPekanLog = headersLog.indexOf('Pekan');
    const colFotoLog = headersLog.indexOf('FotoURL');

    const tailCount = Math.min(LOG_TAIL.PjBL_Log, Math.max(0, lastRow - 1));
    const startRow = Math.max(2, lastRow - tailCount + 1);
    let logRowIndex = -1;
    let fotoLama = '';
    if (lastRow >= 2 && tailCount > 0) {
      const tailVals = sheetLog.getRange(startRow, 1, lastRow - startRow + 1, lastCol).getValues();
      for (let i = tailVals.length - 1; i >= 0; i--) {
        if (tailVals[i][colKelasLog] === params.kelas && tailVals[i][colPekanLog].toString() === pekanStr) {
          logRowIndex = startRow + i;
          fotoLama = tailVals[i][colFotoLog];
          break;
        }
      }
    }

    const logRowValues = [
      timestamp, params.kelas, params.pekan, params.kegiatanRencana || '',
      params.realita || '', params.kendala || '', params.masukan || '',
      params.fotoUrl || '', params.dicatatOleh || ''
    ];
    if (logRowIndex === -1) {
      sheetLog.getRange(sheetLog.getLastRow() + 1, 1, 1, logRowValues.length).setValues([logRowValues]);
    } else {
      if (!params.fotoUrl) logRowValues[7] = fotoLama || '';
      sheetLog.getRange(logRowIndex, 1, 1, logRowValues.length).setValues([logRowValues]);
    }

    const sheetNilai = _sheetV2('PjBL_NilaiPekanan');
    const lastRowNilai = sheetNilai.getLastRow();
    const lastColNilai = sheetNilai.getLastColumn();
    const headersNilai = lastRowNilai > 0 ? sheetNilai.getRange(1,1,1,lastColNilai).getValues()[0] : [];
    const colKelasNilai = headersNilai.indexOf('Kelas');
    const colPekanNilai = headersNilai.indexOf('Pekan');
    const colNisNilai = headersNilai.indexOf('NIS');

    const tailCountNilai = Math.min(LOG_TAIL.PjBL_NilaiPekanan, Math.max(0, lastRowNilai - 1));
    const startRowNilai = Math.max(2, lastRowNilai - tailCountNilai + 1);
    const existingIndex = {};
    if (lastRowNilai >= 2 && tailCountNilai > 0) {
      const tailValsNilai = sheetNilai.getRange(startRowNilai, 1, lastRowNilai - startRowNilai + 1, lastColNilai).getValues();
      tailValsNilai.forEach((row, i) => {
        if (row[colKelasNilai] === params.kelas && row[colPekanNilai].toString() === pekanStr) {
          existingIndex[row[colNisNilai].toString()] = startRowNilai + i;
        }
      });
    }

    const rowsBaru = [];
    (params.nilai || []).forEach(item => {
      const rowValues = [timestamp, params.kelas, params.pekan, item.nis, item.nama, item.skor, params.dicatatOleh || ''];
      const nisKey = item.nis.toString();
      if (existingIndex[nisKey]) {
        sheetNilai.getRange(existingIndex[nisKey], 1, 1, rowValues.length).setValues([rowValues]);
      } else {
        rowsBaru.push(rowValues);
      }
    });
    if (rowsBaru.length > 0) {
      sheetNilai.getRange(sheetNilai.getLastRow() + 1, 1, rowsBaru.length, rowsBaru[0].length).setValues(rowsBaru);
    }

    return { success: true, readMode: 'tail' };
  } finally {
    lock.releaseLock();
  }
}

function getNilaiSemesterPjBLV2(kelas, periode) {
  const rows=_readTailObjectsV2('PjBL_NilaiSemester',LOG_TAIL.PjBL_NilaiSemester);
  const map={};
  rows.forEach(r=>{
    if(_normV2(r.Kelas)!==_normV2(kelas)||String(r.Periode)!==String(periode))return;
    map[String(r.NIS)]={pemahamanKonsep:r.PemahamanKonsep,keterampilanProses:r.KeterampilanProses,kolaborasiSikap:r.KolaborasiSikap,presentasiKomunikasi:r.PresentasiKomunikasi,nilaiKarakterIslami:r.NilaiKarakterIslami,total:r.Total};
  });
  return {success:true,data:map,readMode:'tail'};
}

function getRaporPjBLV2(kelas) {
  const siswa=getSiswaByKelasV2(kelas).data||[];
  const pekanRows=_readTailObjectsV2('PjBL_NilaiPekanan',LOG_TAIL.PjBL_NilaiPekanan);
  const semesterRows=_readTailObjectsV2('PjBL_NilaiSemester',LOG_TAIL.PjBL_NilaiSemester);
  const sums={};
  pekanRows.forEach(r=>{
    if(_normV2(r.Kelas)!==_normV2(kelas))return;
    const k=String(r.NIS); if(!sums[k]) sums[k]={sum:0,count:0};
    sums[k].sum += Number(r.Skor)||0; sums[k].count++;
  });
  const sem={};
  semesterRows.forEach(r=>{
    if(_normV2(r.Kelas)!==_normV2(kelas))return;
    const k=String(r.NIS); if(!sem[k])sem[k]={}; sem[k][String(r.Periode)]=Number(r.Total)||0;
  });
  const hasil=siswa.map(s=>{
    const k=String(s.nis), p=sums[k]||{sum:0,count:0};
    const rata=p.count?p.sum/p.count:0, skorPekanan=rata*5;
    const tengah=sem[k]&&sem[k]['Tengah Semester']||0, akhir=sem[k]&&sem[k]['Akhir Semester']||0;
    const nilai=(skorPekanan*.2)+(tengah*.4)+(akhir*.4);
    let pred='-'; if(nilai>=17)pred='A (Sangat Baik)';else if(nilai>=13)pred='B (Baik)';else if(nilai>=9)pred='C (Cukup)';else if(nilai>0)pred='D (Perlu Bimbingan)';
    return {nis:s.nis,nama:s.nama,rataPekanan:Math.round(rata*100)/100,jumlahPekanTerisi:p.count,skorTengahSemester:tengah,skorAkhirSemester:akhir,nilaiAkhir:Math.round(nilai*100)/100,predikat:pred};
  });
  return {success:true,data:hasil,readMode:'indexed_in_memory'};
}

// --------------------------------------------------------------------------
// MOOD / DASHBOARD / MASALAH
// --------------------------------------------------------------------------
function getMoodHariIniV2(username,tanggal){
  const target=tanggal||Utilities.formatDate(new Date(),APP_TZ,'yyyy-MM-dd');
  const rows=_readTailObjectsV2('MoodLog',LOG_TAIL.MoodLog);
  const u=_normV2(username); let match=null;
  for(let i=rows.length-1;i>=0;i--){const r=rows[i];if(_normV2(r.Username)===u&&_dateYMDV2(r.Tanggal)===target){match=r;break;}}
  return {success:true,sudahIsi:!!match,mood:match?match.Mood:null,readMode:'tail'};
}

function getDashboardHariIniV2(){
  const now=new Date(), today=Utilities.formatDate(now,APP_TZ,'yyyy-MM-dd');
  const idx=getHariIndexGMT7(now), isJumat=idx===5, isHariKerja=idx>=1&&idx<=5;
  const walas=_readCachedCompactV2('Walas',['Nama','Username','Kelas diampu','Role','Status aktif'],CACHE_TTL_MASTER_SEC)
    .filter(r=>_normV2(r.Role)==='walas'&&isStatusAktif(r['Status aktif']));
  const rekap=_readTailObjectsV2('RekapAbsensi',LOG_TAIL.RekapAbsensi);
  const logs=_readTailObjectsV2('LogAktivitas',LOG_TAIL.LogAktivitas);
  const pjbl=_readTailObjectsV2('PjBL_Log',LOG_TAIL.PjBL_Log);
  const moods=_readTailObjectsV2('MoodLog',LOG_TAIL.MoodLog);
  let avatars=[];try{avatars=_readCachedCompactV2('AvatarPilihan',['Username','Avatar'],CACHE_TTL_MASTER_SEC);}catch(e){}
  const loginSet={},absenSet={},kdSet={},pjblSet={},moodMap={},avatarMap={};
  rekap.forEach(r=>{if(_dateYMDV2(r.Timestamp)===today)absenSet[_normV2(r.Kelas)]=true;});
  logs.forEach(r=>{if(_dateYMDV2(r.Timestamp)!==today)return;const u=_normV2(r.Username);if(r.Modul==='Login')loginSet[u]=true;if(r.Modul==='Kedisiplinan')kdSet[_normV2(r.Kelas)]=true;});
  pjbl.forEach(r=>{if(_dateYMDV2(r.Timestamp)===today)pjblSet[_normV2(r.Kelas)]=true;});
  moods.forEach(r=>{if(_dateYMDV2(r.Tanggal)===today)moodMap[_normV2(r.Username)]=r.Mood;});
  avatars.forEach(r=>avatarMap[_normV2(r.Username)]=r.Avatar);
  const data=walas.map(w=>{
    const u=_normV2(w.Username),k=_normV2(w['Kelas diampu']);
    const tugas=[];if(isHariKerja){tugas.push({nama:'Absensi',selesai:!!absenSet[k]});tugas.push({nama:'Kedisiplinan',selesai:!!kdSet[k]});}if(isJumat)tugas.push({nama:'PjBL',selesai:!!pjblSet[k]});
    const selesai=tugas.filter(t=>t.selesai).length,pct=tugas.length?Math.round(selesai/tugas.length*100):100;
    return {username:w.Username,nama:w.Nama,kelas:w['Kelas diampu'],sudahLogin:!!loginSet[u],tugas,persentase:pct,mood:moodMap[u]||null,avatar:avatarMap[u]||null};
  });
  data.sort((a,b)=>a.persentase-b.persentase);
  return {success:true,tanggal:today,isJumat,isHariKerja,data,readMode:'tail+cache'};
}

function getCatatanMasalahSiswaV2(kelas,limit){
  const rows=_readTailObjectsV2('CatatanMasalahSiswa',Math.max(Number(limit)||100,LOG_TAIL.CatatanMasalahSiswa));
  const target=_normV2(kelas);
  const filtered=rows.filter(r=>_normV2(r.Kelas)===target).sort((a,b)=>String(b.Timestamp||'').localeCompare(String(a.Timestamp||''))).slice(0,Number(limit)||100);
  const data=filtered.map(r=>({timestamp:r.Timestamp,kelas:r.Kelas,nis:r.NIS,namaSiswa:r.NamaSiswa,tanggalKejadian:r.TanggalKejadian,ceritaWalas:r.CeritaWalas,tindakanAwal:r.TindakanAwal,risikoKeselamatan:r.RisikoKeselamatan,kategori:r.Kategori,tingkatPerhatian:r.TingkatPerhatian,masalahUtama:r.MasalahUtama,ringkasan:r.Ringkasan,kemungkinanKebutuhan:String(r.KemungkinanKebutuhan||'').split('\n').filter(Boolean),tujuanPendampingan:String(r.TujuanPendampingan||'').split('\n').filter(Boolean),penangananLangsung:String(r.PenangananLangsung||'').split('\n').filter(Boolean),strategiKelas:String(r.StrategiKelas||'').split('\n').filter(Boolean),kalimatGuru:r.KalimatGuru,saranOrangTua:r.SaranOrangTua,rencanaPemantauan:String(r.RencanaPemantauan||'').split('\n').filter(Boolean),indikatorPerbaikan:String(r.IndikatorPerbaikan||'').split('\n').filter(Boolean),saranEskalasi:r.SaranEskalasi,halDihindari:String(r.HalDihindari||'').split('\n').filter(Boolean),mendesak:r.Mendesak==='Ya',tanggalEvaluasi:r.TanggalEvaluasi,perluOrangTua:r.PerluOrangTua==='Ya',perluKesiswaan:r.PerluKesiswaan==='Ya',perluUKS:r.PerluUKS==='Ya',saranFinal:r.SaranFinal,status:r.Status,dicatatOleh:r.DicatatOleh}));
  return {success:true,data,readMode:'tail',truncated:rows.length>=Math.max(Number(limit)||100,LOG_TAIL.CatatanMasalahSiswa)};
}

// --------------------------------------------------------------------------
// INPUT PENDUKUNG RAPOR
// --------------------------------------------------------------------------
function _savePeriodRowV2(sheetName,headers,params,extra){
  const active=_activePeriodV2(),ta=(params.tahunAjaran||active.tahunAjaran).toString(),periode=(params.periode||active.periode).toString();
  const key=[ta,periode,params.kelas,params.nis].join('|');
  const obj={Key:key,TahunAjaran:ta,Periode:periode,Kelas:params.kelas,NIS:params.nis,Nama:params.nama||'',DicatatOleh:params.dicatatOleh||'',Timestamp:new Date()};
  Object.keys(extra||{}).forEach(k=>obj[k]=extra[k]);
  const lock=LockService.getScriptLock();lock.waitLock(10000);try{_upsertByKeyV2(sheetName,headers,key,obj);}finally{lock.releaseLock();}
  return {success:true,key};
}

function saveAdabPTSV2(params){return _savePeriodRowV2('AdabPTS',['Key','TahunAjaran','Periode','Kelas','NIS','Nama','NilaiAdab','Predikat','Catatan','DicatatOleh','Timestamp'],params,{NilaiAdab:params.nilaiAdab||'',Predikat:params.predikat||'',Catatan:params.catatan||''});}
function saveKomentarWalasPTSV2(params){return _savePeriodRowV2('KomentarWalasPTS',['Key','TahunAjaran','Periode','Kelas','NIS','Nama','KomentarWalas','DicatatOleh','Timestamp'],params,{KomentarWalas:params.komentar||params.komentarWalas||''});}
function saveKegiatanSiswaPTSV2(params){return _savePeriodRowV2('KegiatanSiswaPTS',['Key','TahunAjaran','Periode','Kelas','NIS','Nama','EkskulKeaktifan','EkskulKemampuan','LombaPrestasi','KeaktifanSekolah','Catatan','DicatatOleh','Timestamp'],params,{EkskulKeaktifan:params.ekskulKeaktifan||'',EkskulKemampuan:params.ekskulKemampuan||'',LombaPrestasi:params.lombaPrestasi||'',KeaktifanSekolah:params.keaktifanSekolah||'',Catatan:params.catatan||''});}

// --------------------------------------------------------------------------
// TAHFIZH FAST ADAPTER
// --------------------------------------------------------------------------
// Mapping kelas -> nama sheet Tahfizh dibaca dari sheet MapKelasTahfizh (BUKAN
// tebakan regex). Kalau formatmu beda, tinggal edit di Spreadsheet, tidak
// perlu ubah kode ini sama sekali. WAJIB dicek/disesuaikan sebelum dipakai --
// lihat catatan di _seedMapKelasTahfizhV2().
function _tahfizhSheetNameForClassV2(kelasSistem) {
  const map = _readCachedCompactV2('MapKelasTahfizh', ['KelasTahfizh','KelasSistem','SheetTahfizh','Aktif'], CACHE_TTL_MASTER_SEC);
  const target = _normV2(kelasSistem);
  const match = map.find(r =>
    _normV2(r.KelasSistem) === target &&
    (_normV2(r.Aktif) === '' || ['ya','aktif','true','1'].indexOf(_normV2(r.Aktif)) >= 0)
  );
  return match ? match.SheetTahfizh : null;
}

function _readTahfizhClassV2(kelas, spreadsheetId){
  if(!spreadsheetId)return {rows:[],warning:'SpreadsheetTahfizhID belum diisi di Pengaturan'};
  const sheetName=_tahfizhSheetNameForClassV2(kelas);
  if(!sheetName)return {rows:[],warning:'Kelas belum dipetakan di sheet MapKelasTahfizh: '+kelas};
  const ss=SpreadsheetApp.openById(spreadsheetId);
  const sh=ss.getSheetByName(sheetName);
  if(!sh)return {rows:[],warning:'Sheet Tahfizh tidak ditemukan: '+sheetName};
  const last=sh.getLastRow();if(last<7)return {rows:[],warning:'Data Tahfizh kosong: '+sheetName};
  const vals=sh.getRange(7,1,last-6,12).getDisplayValues();
  const rows=[];
  vals.forEach(r=>{
    if(!r[1]||_normNameV2(r[1]).indexOf('contoh')===0)return;
    rows.push({
      nama:r[1],targetLP:r[2],surahAwal:r[3],totalBaris:r[4],barisPerPekan:r[5],pencapaian:r[6],juz:r[7],kuadran:r[8],tilawah:r[9],halSurah:r[10],ukj:r[11]
    });
  });
  return {rows,sheetName};
}

function _getTahfizhNameMapV2(){
  const sh=getSS().getSheetByName('MapTahfizhSiswa');if(!sh||sh.getLastRow()<2)return {};
  const rows=_readCachedCompactV2('MapTahfizhSiswa',['NIS','NamaTahfizh','KelasTahfizh','StatusMapping'],CACHE_TTL_MASTER_SEC),map={};
  rows.forEach(r=>{if(r.NIS)map[String(r.NIS)]={nama:r.NamaTahfizh,kelas:r.KelasTahfizh,status:r.StatusMapping};});
  return map;
}

// --------------------------------------------------------------------------
// MARKET DAY FAST ADAPTER (pola sama seperti Tahfizh)
// --------------------------------------------------------------------------
function _marketDaySheetNameForClassV2(kelasSistem) {
  const map = _readCachedCompactV2('MapKelasMarketDay', ['KelasMarketDay','KelasSistem','SheetMarketDay','Aktif'], CACHE_TTL_MASTER_SEC);
  const target = _normV2(kelasSistem);
  const match = map.find(r =>
    _normV2(r.KelasSistem) === target &&
    (_normV2(r.Aktif) === '' || ['ya','aktif','true','1'].indexOf(_normV2(r.Aktif)) >= 0)
  );
  return match ? match.SheetMarketDay : null;
}

// Header Market Day dicari otomatis (bukan hardcode nomor kolom), supaya tetap jalan
// walau template aslinya sedikit berbeda posisi kolomnya.
function _readMarketDayClassV2(kelas, spreadsheetId) {
  if (!spreadsheetId) return { rows: [], warning: 'SpreadsheetMarketDayID belum diisi di Pengaturan' };
  const sheetName = _marketDaySheetNameForClassV2(kelas);
  if (!sheetName) return { rows: [], warning: 'Kelas belum dipetakan di sheet MapKelasMarketDay: ' + kelas };

  const ss = SpreadsheetApp.openById(spreadsheetId);
  const sh = ss.getSheetByName(sheetName);
  if (!sh) return { rows: [], warning: 'Sheet Market Day tidak ditemukan: ' + sheetName };

  const lastRow = sh.getLastRow();
  const lastCol = sh.getLastColumn();
  if (lastRow < 12) return { rows: [], warning: 'Data Market Day kosong: ' + sheetName };

  const values = sh.getRange(1, 1, Math.min(lastRow, 40), lastCol).getDisplayValues();

  let headerRow = -1, namaCol = -1, rataCol = -1, kategoriCol = -1, catatanCol = -1, produkCol = -1, dokCol = -1;
  for (let r = 0; r < values.length; r++) {
    for (let c = 0; c < values[r].length; c++) {
      const norm = _normV2(values[r][c]);
      if (norm.indexOf('nama siswa') === 0) { headerRow = r; namaCol = c; }
      if (norm.indexOf('rata') === 0) rataCol = c;
      if (norm === 'kategori') kategoriCol = c;
      if (norm === 'catatan') catatanCol = c;
      if (norm.indexOf('produk') === 0) produkCol = c;
      if (norm.indexOf('dokumentasi') === 0) dokCol = c;
    }
    if (headerRow !== -1 && rataCol !== -1) break;
  }
  if (headerRow === -1 || namaCol === -1 || rataCol === -1) {
    return { rows: [], warning: 'Header Market Day tidak dikenali di sheet: ' + sheetName };
  }

  const dataStartRow = headerRow + 3;
  const rows = [];
  for (let r = dataStartRow; r < values.length; r++) {
    const nama = (values[r][namaCol] || '').toString().trim();
    if (!nama || nama === '#REF!' || nama === '0') continue;
    const skorList = [];
    for (let c = namaCol + 1; c < rataCol; c++) {
      const v = parseFloat(values[r][c]);
      if (!isNaN(v)) skorList.push(v);
    }
    rows.push({
      nama,
      rataRata: values[r][rataCol] || '',
      kategori: kategoriCol !== -1 ? (values[r][kategoriCol] || '') : '',
      catatan: catatanCol !== -1 ? (values[r][catatanCol] || '') : '',
      produk: produkCol !== -1 ? (values[r][produkCol] || '') : '',
      dokumentasi: dokCol !== -1 ? (values[r][dokCol] || '') : '',
      skorList
    });
  }
  return { rows, sheetName };
}

// --------------------------------------------------------------------------
// EMAIL STAFF / SHARING HELPER
// --------------------------------------------------------------------------
// Dipakai supaya file hasil generate (Rapor PDF, Laporan Guru) di-share langsung
// ke email Google guru pemilik kelas, bukan "siapapun yang punya link".
// WAJIB: tambahkan kolom "Email Google" di sheet Walas dan isi manual per guru.
function _getWalasEmailMapV2() {
  try {
    return _readCachedCompactV2('Walas', ['Nama','Username','Kelas diampu','Role','Email Google'], CACHE_TTL_MASTER_SEC);
  } catch (err) {
    return [];
  }
}

function _getEmailByUsernameV2(username) {
  if (!username) return '';
  const rows = _getWalasEmailMapV2();
  const u = _normV2(username);
  const match = rows.find(r => _normV2(r.Username) === u);
  return match ? String(match['Email Google'] || '').trim() : '';
}

function _getEmailByKelasV2(kelas) {
  if (!kelas) return '';
  const rows = _getWalasEmailMapV2();
  const target = _normV2(kelas);
  const match = rows.find(r => _normV2(r['Kelas diampu']) === target);
  return match ? String(match['Email Google'] || '').trim() : '';
}

function _isValidEmailV2(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}

function _shareFileToStaffV2(file, kelas, requestedByUsername) {
  const emails = new Set();
  const emailKelas = _getEmailByKelasV2(kelas);
  if (_isValidEmailV2(emailKelas)) emails.add(emailKelas.trim());
  const emailRequester = _getEmailByUsernameV2(requestedByUsername);
  if (_isValidEmailV2(emailRequester)) emails.add(emailRequester.trim());

  if (emails.size === 0) {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.EDIT);
    return { sharedWith: [], usedFallback: true };
  }

  const shared = [];
  emails.forEach(email => {
    try {
      file.addEditor(email);
      shared.push(email);
    } catch (err) {
      // Email tidak valid/tidak dikenali Google -- lewati, jangan gagalkan proses.
    }
  });

  if (shared.length === 0) {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.EDIT);
    return { sharedWith: [], usedFallback: true };
  }

  return { sharedWith: shared, usedFallback: false };
}

// --------------------------------------------------------------------------
// RAPOR PTS CLASS PREVIEW
// --------------------------------------------------------------------------
function _periodMapForClassV2(sheetName,kelas,tahunAjaran,periode){
  const sh=getSS().getSheetByName(sheetName);if(!sh)return {};
  const rows=_readAllObjectsV2(sheetName),target=_normV2(kelas),map={};
  rows.forEach(r=>{
    if(_normV2(r.Kelas)!==target)return;
    if(String(r.TahunAjaran)!==String(tahunAjaran)||String(r.Periode)!==String(periode))return;
    map[String(r.NIS)]=r;
  });
  return map;
}

function getRaporPTSReadinessV2(kelas){
  const settings=_getSettingsV2(),requiredSheets=['Siswa','AbsensiRaporRekap','KedisiplinanRekap','RewardRekap','AdabPTS','KomentarWalasPTS','KegiatanSiswaPTS'];
  const missingSheets=requiredSheets.filter(n=>!getSS().getSheetByName(n));
  const missingConfig=[];
  if(!settings.TahunAjaran)missingConfig.push('TahunAjaran');
  if(!settings.SpreadsheetTahfizhID)missingConfig.push('SpreadsheetTahfizhID');
  if(!settings.RaporPTSTemplateID)missingConfig.push('RaporPTSTemplateID');
  if(!settings.LegerSpreadsheetURL)missingConfig.push('LegerSpreadsheetURL');
  const warnings=[];
  if(kelas&&!_tahfizhSheetNameForClassV2(kelas))warnings.push('Kelas belum dipetakan di MapKelasTahfizh: '+kelas);
  return {success:true,readyForPreview:missingSheets.length===0,readyForPdf:missingSheets.length===0&&missingConfig.length===0,missingSheets,missingConfig,warnings};
}

// ============================================================================
// V2 FAST BUCKET LAYER
// ============================================================================
function _ensureFastBucketSheetsV2() {
  _ensureSheetV2('V2_AbsensiPTS_HariKelas', ['Key','TahunAjaran','Periode','Tanggal','Kelas','DataJSON','UpdatedAt']);
  _ensureSheetV2('V2_Kedisiplinan_Kelas', ['Key','Kelas','DataJSON','UpdatedAt']);
  _ensureSheetV2('V2_Kedisiplinan_BulanKelas', ['Key','YearMonth','Kelas','DataJSON','UpdatedAt']);
  _ensureSheetV2('V2_Reward_Kelas', ['Key','Kelas','DataJSON','UpdatedAt']);
}

function setupSistemV2Fast() {
  const base = setupSistemV2();
  _ensureFastBucketSheetsV2();
  return {
    success: true,
    createdSheets: base.createdSheets || [],
    message: 'Setup V2 FAST selesai. Jalankan rebuildFastSummaryV2() satu kali untuk memasukkan histori lama (opsional).'
  };
}

function getSystemV2HealthFast() {
  const base = getSystemV2Health();
  const ss = getSS();
  base.fastBuckets = {
    absensiPTS: !!ss.getSheetByName('V2_AbsensiPTS_HariKelas'),
    kedisiplinanKelas: !!ss.getSheetByName('V2_Kedisiplinan_Kelas'),
    kedisiplinanBulanan: !!ss.getSheetByName('V2_Kedisiplinan_BulanKelas'),
    rewardKelas: !!ss.getSheetByName('V2_Reward_Kelas')
  };
  return base;
}

function _findBucketRowV2(sh, key) {
  if (sh.getLastRow() < 2) return -1;
  const found = sh.getRange(2,1,sh.getLastRow()-1,1)
    .createTextFinder(String(key)).matchEntireCell(true).findNext();
  return found ? found.getRow() : -1;
}

function _readJsonSafeV2(value) {
  if (!value) return {};
  try { return JSON.parse(String(value)); } catch (err) { return {}; }
}

function _writeBucketRowV2(sh, headers, rowNo, values) {
  if (rowNo === -1) {
    sh.getRange(sh.getLastRow()+1,1,1,headers.length).setValues([values]);
  } else {
    sh.getRange(rowNo,1,1,headers.length).setValues([values]);
  }
}

// ---------- KEDISIPLINAN FAST ----------
function _applyKdEntryToDataFastV2(data, entry) {
  const nis = String(entry.nis);
  if (!data[nis]) data[nis] = {nama:entry.nama||'',Ringan:0,Sedang:0,Berat:0,TotalPoin:0,JumlahKejadian:0,TanggalTerakhir:''};
  const x = data[nis], d = entry.direction >= 0 ? 1 : -1;
  if (['Ringan','Sedang','Berat'].indexOf(entry.kategori) >= 0) x[entry.kategori] = Math.max(0,Number(x[entry.kategori]||0)+d);
  x.TotalPoin = Math.max(0,Number(x.TotalPoin||0)+d*(Number(entry.poin)||0));
  x.JumlahKejadian = Math.max(0,Number(x.JumlahKejadian||0)+d);
  x.nama = entry.nama || x.nama || '';
  if (entry.direction >= 0) x.TanggalTerakhir = _dateYMDV2(entry.tanggal || new Date());
}

function _applyKedisiplinanBatchFastV2(kelas, entries) {
  if (!entries || !entries.length) return;
  _ensureFastBucketSheetsV2();
  const lock = LockService.getScriptLock();lock.waitLock(10000);
  try {
    const shAll = _sheetV2('V2_Kedisiplinan_Kelas');
    const hAll = ['Key','Kelas','DataJSON','UpdatedAt'];
    const keyAll = String(kelas);
    const rowAll = _findBucketRowV2(shAll,keyAll);
    let dataAll = rowAll === -1 ? {} : _readJsonSafeV2(shAll.getRange(rowAll,3).getValue());
    entries.forEach(e => _applyKdEntryToDataFastV2(dataAll,e));
    _writeBucketRowV2(shAll,hAll,rowAll,[keyAll,kelas,JSON.stringify(dataAll),new Date()]);

    const byMonth = {};
    entries.forEach(e => {
      const ym = _monthKeyV2(e.tanggal || new Date());
      if (!byMonth[ym]) byMonth[ym] = [];
      byMonth[ym].push(e);
    });
    const shM = _sheetV2('V2_Kedisiplinan_BulanKelas');
    const hM = ['Key','YearMonth','Kelas','DataJSON','UpdatedAt'];
    Object.keys(byMonth).forEach(ym => {
      const key = ym + '|' + kelas;
      const row = _findBucketRowV2(shM,key);
      let data = row === -1 ? {} : _readJsonSafeV2(shM.getRange(row,4).getValue());
      byMonth[ym].forEach(e => _applyKdEntryToDataFastV2(data,e));
      _writeBucketRowV2(shM,hM,row,[key,ym,kelas,JSON.stringify(data),new Date()]);
    });
  } finally { lock.releaseLock(); }
}

function submitPelanggaranBanyakSiswaV2Fast(params) {
  const res = submitPelanggaranBanyakSiswa(params);
  if (res && res.success) {
    try {
      const entries=(params.listSiswa||[]).map(s=>({tanggal:params.tanggal,nis:s.nis,nama:s.nama,kategori:params.kategori,poin:params.poin,direction:1}));
      _applyKedisiplinanBatchFastV2(params.kelas,entries);
    } catch(err){res.warning='pelanggaran_tersimpan_tapi_summary_gagal: '+err.message;}
  }
  return res;
}

function submitPelanggaranSiswaV2Fast(params) {
  const res = submitPelanggaranSiswa(params);
  if (res && res.success) {
    try {
      const entries=(params.listPelanggaran||[]).map(p=>({tanggal:params.tanggal,nis:params.nis,nama:params.nama,kategori:p.kategori,poin:p.poin,direction:1}));
      _applyKedisiplinanBatchFastV2(params.kelas,entries);
    } catch(err){res.warning='pelanggaran_tersimpan_tapi_summary_gagal: '+err.message;}
  }
  return res;
}

function _loadKdClassFastV2(kelas) {
  const sh=getSS().getSheetByName('V2_Kedisiplinan_Kelas');if(!sh)return {};
  const row=_findBucketRowV2(sh,String(kelas));
  return row===-1?{}:_readJsonSafeV2(sh.getRange(row,3).getValue());
}

function _loadKdMonthClassFastV2(kelas, ym) {
  const sh=getSS().getSheetByName('V2_Kedisiplinan_BulanKelas');if(!sh)return {};
  const row=_findBucketRowV2(sh,ym+'|'+kelas);
  return row===-1?{}:_readJsonSafeV2(sh.getRange(row,4).getValue());
}

function getRekapPoinKelasV2Fast(kelas) {
  const siswa=getSiswaByKelasV2(kelas).data||[],map=_loadKdClassFastV2(kelas);
  const data=siswa.map(s=>{const r=map[String(s.nis)]||{};return {nis:s.nis,nama:s.nama,totalPoin:Number(r.TotalPoin)||0,jumlahPelanggaran:Number(r.JumlahKejadian)||0};}).sort((a,b)=>b.totalPoin-a.totalPoin);
  return {success:true,data,readMode:'single-class-json'};
}

function getRekapBulananKelasV2Fast(kelas,bulan,tahun) {
  const ym=String(tahun)+'-'+String(bulan).padStart(2,'0'),siswa=getSiswaByKelasV2(kelas).data||[],map=_loadKdMonthClassFastV2(kelas,ym);
  const data=siswa.map(s=>{const r=map[String(s.nis)]||{};return {nis:s.nis,nama:s.nama,ringan:Number(r.Ringan)||0,sedang:Number(r.Sedang)||0,berat:Number(r.Berat)||0,totalPoin:Number(r.TotalPoin)||0,jumlahKejadian:Number(r.JumlahKejadian)||0,tanggalTerakhir:r.TanggalTerakhir||null};});
  const totalPoinKelas=data.reduce((a,s)=>a+s.totalPoin,0),totalKejadianKelas=data.reduce((a,s)=>a+s.jumlahKejadian,0),jumlahSiswa=data.length;
  return {success:true,kelas,bulan,tahun,data,ringkasan:{totalPoinKelas,totalKejadianKelas,jumlahSiswa,rataPoinSiswa:jumlahSiswa?Math.round(totalPoinKelas/jumlahSiswa*100)/100:0,rataKejadianSiswa:jumlahSiswa?Math.round(totalKejadianKelas/jumlahSiswa*100)/100:0},readMode:'single-month-class-json'};
}

// Rekomputasi TanggalTerakhir untuk bucket bulanan setelah ada penghapusan pelanggaran,
// supaya tanggal yang ditampilkan tidak "nyangkut" ke pelanggaran yang sudah dihapus.
function _fixTanggalTerakhirBulananV2(kelas, nis, ym) {
  const rows = _readTailObjectsV2('Kedisiplinan', LOG_TAIL.Kedisiplinan)
    .filter(r => _normV2(r.Kelas) === _normV2(kelas) && String(r.NIS) === String(nis) && _monthKeyV2(r.Tanggal) === ym);
  let latest = '';
  rows.forEach(r => { const t = _dateYMDV2(r.Tanggal); if (!latest || t > latest) latest = t; });
  const sh = getSS().getSheetByName('V2_Kedisiplinan_BulanKelas');
  if (!sh) return;
  const row = _findBucketRowV2(sh, ym + '|' + kelas);
  if (row === -1) return;
  const data = _readJsonSafeV2(sh.getRange(row, 4).getValue());
  if (data[String(nis)]) {
    data[String(nis)].TanggalTerakhir = latest;
    sh.getRange(row, 4).setValue(JSON.stringify(data));
    sh.getRange(row, 5).setValue(new Date());
  }
}

function hapusPelanggaranV2Fast(params) {
  const sh=_sheetV2('Kedisiplinan'),last=sh.getLastRow();if(last<2)return {success:false,error:'id_tidak_ditemukan'};
  const headers=sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0],idCol=headers.indexOf('ID')+1;
  const found=sh.getRange(2,idCol,last-1,1).createTextFinder(String(params.id)).matchEntireCell(true).findNext();if(!found)return {success:false,error:'id_tidak_ditemukan'};
  const vals=sh.getRange(found.getRow(),1,1,headers.length).getValues()[0],r={};headers.forEach((h,i)=>r[h]=vals[i]);
  sh.deleteRow(found.getRow());
  try{
    _applyKedisiplinanBatchFastV2(r.Kelas,[{tanggal:r.Tanggal,nis:r.NIS,nama:r.Nama,kategori:r.Kategori,poin:r.Poin,direction:-1}]);
    _fixTanggalTerakhirBulananV2(r.Kelas, r.NIS, _monthKeyV2(r.Tanggal));
  }catch(err){return {success:true,warning:'row_terhapus_tapi_summary_gagal: '+err.message};}
  return {success:true};
}

function konfirmasiKeterlambatanJadiPoinV2Fast(params) {
  const master=getMasterPelanggaranV2(getJenjangSDSMP(params.kelas)),m=(master.data||[]).find(r=>r.pelanggaran==='Terlambat lebih dari 15 menit');
  if(!m)return {success:false,error:'master_pelanggaran_tidak_ditemukan'};
  const grup={};(params.listSiswa||[]).forEach(s=>{if(!grup[s.tanggal])grup[s.tanggal]=[];grup[s.tanggal].push({nis:s.nis,nama:s.nama});});
  let total=0;const warnings=[];Object.keys(grup).forEach(tgl=>{const r=submitPelanggaranBanyakSiswaV2Fast({kelas:params.kelas,tanggal:tgl,pelanggaran:m.pelanggaran,kategori:m.kategori,poin:m.poin,dicatatOleh:params.dicatatOleh,listSiswa:grup[tgl]});if(r.success)total+=r.count||0;if(r.warning)warnings.push(r.warning);});
  return {success:true,count:total,warnings};
}

// ---------- REWARD FAST ----------
function _rewardIdV2(){return 'RW'+new Date().getTime()+Math.floor(Math.random()*1000);}

function getMasterRewardV2(jenjang){
  const sh=getSS().getSheetByName('MasterReward');if(!sh)return {success:false,error:'v2_belum_setup'};
  const rows=_readCachedCompactV2('MasterReward',['KodeReward','NamaReward','Kategori','Poin','Jenjang','Aktif'],CACHE_TTL_MASTER_SEC);
  const j=_normV2(jenjang);
  return {success:true,data:rows.filter(r=>(!j||_normV2(r.Jenjang)===j)&&(_normV2(r.Aktif)===''||['ya','aktif','true','1'].indexOf(_normV2(r.Aktif))>=0)).map(r=>({kode:r.KodeReward,nama:r.NamaReward,kategori:r.Kategori,poin:Number(r.Poin)||0}))};
}

function _applyRewardBatchFastV2(kelas,entries){
  if(!entries||!entries.length)return;_ensureFastBucketSheetsV2();const sh=_sheetV2('V2_Reward_Kelas'),headers=['Key','Kelas','DataJSON','UpdatedAt'],key=String(kelas);
  const lock=LockService.getScriptLock();lock.waitLock(10000);try{const row=_findBucketRowV2(sh,key);let data=row===-1?{}:_readJsonSafeV2(sh.getRange(row,3).getValue());entries.forEach(e=>{const nis=String(e.nis);if(!data[nis])data[nis]={nama:e.nama||'',TotalPoin:0,JumlahReward:0};const d=e.direction>=0?1:-1;data[nis].TotalPoin=Math.max(0,Number(data[nis].TotalPoin||0)+d*(Number(e.poin)||0));data[nis].JumlahReward=Math.max(0,Number(data[nis].JumlahReward||0)+d);data[nis].nama=e.nama||data[nis].nama;});_writeBucketRowV2(sh,headers,row,[key,kelas,JSON.stringify(data),new Date()]);}finally{lock.releaseLock();}
}

function submitRewardBanyakSiswaV2Fast(params){
  const sh=_ensureSheetV2('RewardLog',['ID','Timestamp','Tanggal','Kelas','NIS','Nama','KodeReward','NamaReward','Kategori','Poin','DicatatOleh']);
  const rows=(params.listSiswa||[]).map(s=>[_rewardIdV2(),new Date(),params.tanggal||Utilities.formatDate(new Date(),APP_TZ,'yyyy-MM-dd'),params.kelas,s.nis,s.nama,params.kodeReward||'',params.namaReward||'',params.kategori||'',Number(params.poin)||0,params.dicatatOleh||'']);if(!rows.length)return {success:false,error:'siswa_kosong'};
  const lock=LockService.getScriptLock();lock.waitLock(10000);try{sh.getRange(sh.getLastRow()+1,1,rows.length,rows[0].length).setValues(rows);}finally{lock.releaseLock();}
  try{_applyRewardBatchFastV2(params.kelas,rows.map(r=>({nis:r[4],nama:r[5],poin:r[9],direction:1})));}catch(err){return {success:true,count:rows.length,warning:'reward_tersimpan_tapi_summary_gagal: '+err.message};}
  return {success:true,count:rows.length};
}

function submitRewardSiswaV2Fast(params){
  const list=params.listReward||[];if(!list.length)return {success:false,error:'reward_kosong'};const sh=_ensureSheetV2('RewardLog',['ID','Timestamp','Tanggal','Kelas','NIS','Nama','KodeReward','NamaReward','Kategori','Poin','DicatatOleh']);
  const rows=list.map(r=>[_rewardIdV2(),new Date(),params.tanggal||Utilities.formatDate(new Date(),APP_TZ,'yyyy-MM-dd'),params.kelas,params.nis,params.nama,r.kode||r.kodeReward||'',r.nama||r.namaReward||'',r.kategori||'',Number(r.poin)||0,params.dicatatOleh||'']);
  const lock=LockService.getScriptLock();lock.waitLock(10000);try{sh.getRange(sh.getLastRow()+1,1,rows.length,rows[0].length).setValues(rows);}finally{lock.releaseLock();}
  try{_applyRewardBatchFastV2(params.kelas,rows.map(r=>({nis:r[4],nama:r[5],poin:r[9],direction:1})));}catch(err){return {success:true,count:rows.length,warning:'reward_tersimpan_tapi_summary_gagal: '+err.message};}
  return {success:true,count:rows.length};
}

function _loadRewardClassFastV2(kelas){const sh=getSS().getSheetByName('V2_Reward_Kelas');if(!sh)return {};const row=_findBucketRowV2(sh,String(kelas));return row===-1?{}:_readJsonSafeV2(sh.getRange(row,3).getValue());}
function getRekapRewardKelasV2Fast(kelas){const siswa=getSiswaByKelasV2(kelas).data||[],map=_loadRewardClassFastV2(kelas);const data=siswa.map(s=>{const r=map[String(s.nis)]||{};return {nis:s.nis,nama:s.nama,totalPoin:Number(r.TotalPoin)||0,jumlahReward:Number(r.JumlahReward)||0};}).sort((a,b)=>b.totalPoin-a.totalPoin);return {success:true,data,readMode:'single-class-json'};}

// ---------- RAPOR FAST ----------
function getRaporPTSReadinessV2Fast(kelas){
  const base=getRaporPTSReadinessV2(kelas),ss=getSS();
  const fastMissing=['V2_AbsensiPTS_HariKelas','V2_Kedisiplinan_Kelas','V2_Reward_Kelas'].filter(n=>!ss.getSheetByName(n));
  base.fastMissingSheets=fastMissing;base.readyForPreview=base.readyForPreview&&fastMissing.length===0;base.readyForPdf=base.readyForPdf&&fastMissing.length===0;return base;
}

function getRaporPTSClassPreviewV2Fast(kelas,periode){
  const t0=new Date().getTime(),setup=getRaporPTSReadinessV2Fast(kelas);if(!setup.readyForPreview)return {success:false,error:'rapor_v2_belum_setup',details:setup};
  const active=_activePeriodV2(),ta=active.tahunAjaran,per=periode||active.periode,siswa=getSiswaByKelasV2(kelas).data||[];if(!siswa.length)return {success:false,error:'siswa_kelas_kosong'};
  const abs=_loadAbsensiPTSClassFastV2(kelas,ta,per),kd=_loadKdClassFastV2(kelas),rw=_loadRewardClassFastV2(kelas),adab=_periodMapForClassV2('AdabPTS',kelas,ta,per),komentar=_periodMapForClassV2('KomentarWalasPTS',kelas,ta,per),kegiatan=_periodMapForClassV2('KegiatanSiswaPTS',kelas,ta,per);
  const settings=_getSettingsV2(),tah=_readTahfizhClassV2(kelas,settings.SpreadsheetTahfizhID),tahByName={};(tah.rows||[]).forEach(r=>tahByName[_normNameV2(r.nama)]=r);const mapping=_getTahfizhNameMapV2();
  const rows=siswa.map(s=>{const nis=String(s.nis),mapTah=mapping[nis],lookup=mapTah&&mapTah.nama?mapTah.nama:s.nama,th=tahByName[_normNameV2(lookup)]||null,a=abs[nis]||{},k=kd[nis]||{},r=rw[nis]||{},d=adab[nis]||{},c=komentar[nis]||{},kg=kegiatan[nis]||{},missing=[];if(!th)missing.push('Tahfizh');missing.push('Leger Nilai TP1-TP5');if(!c.KomentarWalas)missing.push('Komentar Walas');return {identitas:{nis:s.nis,nisn:s.nisn||'',nama:s.nama,kelas},tahfizh:th?{materiHafalan:th.targetLP||'',lpTahfizh:th.targetLP||'',realisasiSaatIni:th.pencapaian||'',juz:th.juz||'',kuadran:th.kuadran||'',tilawah:th.tilawah||'',halSurah:th.halSurah||'',ukj:th.ukj||'',sumberRaw:{surahAwal:th.surahAwal,totalBarisTarget:th.totalBaris,barisPerPekan:th.barisPerPekan},prestasi:{jumlahSurat:null,jumlahBaris:null,jumlahAyat:null,persentase:null}}:{},mataPelajaran:[],ketidakhadiran:{hadir:Number(a.Hadir)||0,sakit:Number(a.Sakit)||0,izin:Number(a.Izin)||0,tanpaKeterangan:Number(a.Alfa)||0,totalHari:Number(a.TotalHari)||0},kegiatan:{ekskulKeaktifan:kg.EkskulKeaktifan||'',ekskulKemampuan:kg.EkskulKemampuan||'',lombaPrestasi:kg.LombaPrestasi||'',keaktifanSekolah:kg.KeaktifanSekolah||'',catatan:kg.Catatan||''},akhlakKedisiplinan:{rewardPoin:Number(r.TotalPoin)||0,rewardJumlah:Number(r.JumlahReward)||0,pelanggaran:{ringan:Number(k.Ringan)||0,sedang:Number(k.Sedang)||0,berat:Number(k.Berat)||0,totalPoin:Number(k.TotalPoin)||0,jumlahKejadian:Number(k.JumlahKejadian)||0},adab:{nilai:d.NilaiAdab||'',predikat:d.Predikat||'',catatan:d.Catatan||''}},komentarWalas:c.KomentarWalas||'',completeness:{missing}};});
  return {success:true,tahunAjaran:ta,periode:per,kelas,count:rows.length,data:rows,warnings:[tah.warning].filter(Boolean).concat(setup.missingConfig.map(x=>'Config belum diisi: '+x)),performance:{mode:'cache+tail+single-row-class-buckets+single-class-tahfizh',elapsedMs:new Date().getTime()-t0}};
}

function getRaporPTSPreviewV2Fast(kelas,nis,periode){const res=getRaporPTSClassPreviewV2Fast(kelas,periode);if(!res.success)return res;const row=(res.data||[]).find(r=>String(r.identitas.nis)===String(nis));if(!row)return {success:false,error:'siswa_tidak_ditemukan_di_kelas'};return {success:true,tahunAjaran:res.tahunAjaran,periode:res.periode,kelas,data:row,warnings:res.warnings,performance:res.performance};}

// ---------- ONE-TIME FAST REBUILD (jalankan manual dari editor, opsional) ----------
function rebuildFastSummaryV2(){
  setupSistemV2Fast();
  const ss=getSS();['V2_AbsensiPTS_HariKelas','V2_Kedisiplinan_Kelas','V2_Kedisiplinan_BulanKelas','V2_Reward_Kelas'].forEach(n=>{const sh=ss.getSheetByName(n);if(sh&&sh.getLastRow()>1)sh.getRange(2,1,sh.getLastRow()-1,sh.getLastColumn()).clearContent();});
  const settings=_getSettingsV2(),start=String(settings.TanggalMulaiPTS||''),end=String(settings.TanggalAkhirPTS||''),active=_activePeriodV2();
  if(start&&end){
    const absRows=_readAllObjectsV2('Absensi'),byDayClass={};absRows.forEach(r=>{const t=_dateYMDV2(r.Timestamp);if(t<start||t>end)return;const key=t+'|'+r.Kelas;if(!byDayClass[key])byDayClass[key]={tanggal:t,kelas:r.Kelas,data:{}};byDayClass[key].data[String(r.NIS)]={nama:r.Nama||'',status:r.Status||''};});
    const sh=_sheetV2('V2_AbsensiPTS_HariKelas'),headers=['Key','TahunAjaran','Periode','Tanggal','Kelas','DataJSON','UpdatedAt'],rows=Object.keys(byDayClass).map(k=>{const x=byDayClass[k],key=[active.tahunAjaran,active.periode,x.tanggal,x.kelas].join('|');return [key,active.tahunAjaran,active.periode,x.tanggal,x.kelas,JSON.stringify(x.data),new Date()];});if(rows.length)sh.getRange(2,1,rows.length,headers.length).setValues(rows);
  }
  const kdRows=_readAllObjectsV2('Kedisiplinan'),all={},months={};kdRows.forEach(r=>{const cls=String(r.Kelas),e={tanggal:r.Tanggal,nis:r.NIS,nama:r.Nama,kategori:r.Kategori,poin:r.Poin,direction:1};if(!all[cls])all[cls]={};_applyKdEntryToDataFastV2(all[cls],e);const ym=_monthKeyV2(r.Tanggal),mk=ym+'|'+cls;if(!months[mk])months[mk]={ym,cls,data:{}};_applyKdEntryToDataFastV2(months[mk].data,e);});
  let sh=_sheetV2('V2_Kedisiplinan_Kelas'),rows=Object.keys(all).map(cls=>[cls,cls,JSON.stringify(all[cls]),new Date()]);if(rows.length)sh.getRange(2,1,rows.length,4).setValues(rows);
  sh=_sheetV2('V2_Kedisiplinan_BulanKelas');rows=Object.keys(months).map(k=>[k,months[k].ym,months[k].cls,JSON.stringify(months[k].data),new Date()]);if(rows.length)sh.getRange(2,1,rows.length,5).setValues(rows);
  const rwSh=ss.getSheetByName('RewardLog');if(rwSh&&rwSh.getLastRow()>1){const rwRows=_readAllObjectsV2('RewardLog'),grp={};rwRows.forEach(r=>{const cls=String(r.Kelas),nis=String(r.NIS);if(!grp[cls])grp[cls]={};if(!grp[cls][nis])grp[cls][nis]={nama:r.Nama||'',TotalPoin:0,JumlahReward:0};grp[cls][nis].TotalPoin+=Number(r.Poin)||0;grp[cls][nis].JumlahReward++;});sh=_sheetV2('V2_Reward_Kelas');rows=Object.keys(grp).map(cls=>[cls,cls,JSON.stringify(grp[cls]),new Date()]);if(rows.length)sh.getRange(2,1,rows.length,4).setValues(rows);}
  return {success:true,absensiPeriodeConfigured:!!(start&&end),kedisiplinanEvents:kdRows.length};
}

// ============================================================================
// V2 RAPOR PDF GENERATOR
// ============================================================================
// PENTING sebelum fitur ini bisa dipakai:
// 1. Buat template Google Docs rapor per siswa, isi placeholder {{TAG}} sesuai
//    daftar di _buildRaporPlaceholderMapV2 di bawah.
// 2. Isi ID template ke Pengaturan > RaporPTSTemplateID.
// 3. Jalankan SEKALI secara manual dari Apps Script editor: _grantDriveDocsAuthV2()
//    -- ini memicu dialog izin akses Drive & Docs.
// Nilai mapel (Leger/TP-KD) BELUM ada tag-nya karena struktur sheet Leger
// belum tersedia -- akan menyusul.

function _grantDriveDocsAuthV2() {
  // Jalankan SEKALI dari Apps Script editor (klik Run), bukan dari web.
  const f = DriveApp.getRootFolder();
  Logger.log('OK, akses Drive & Docs berhasil diizinkan: ' + f.getName());
}

function requestCetakRaporKelas(params) {
  const kelas = params.kelas;
  const active = _activePeriodV2();
  const periode = params.periode || active.periode;

  const readiness = getRaporPTSReadinessV2Fast(kelas);
  if (!readiness.readyForPdf) {
    return { success: false, error: 'belum_siap_generate_pdf', details: readiness };
  }
  const settings = _getSettingsV2();
  if (!settings.RaporPTSTemplateID) {
    return { success: false, error: 'template_belum_diisi', pesan: 'Isi RaporPTSTemplateID di sheet Pengaturan dulu.' };
  }

  const headers = ['RequestID','TimestampRequest','TahunAjaran','Periode','Kelas','RequestedBy','RequestedByUsername','Status','Progress','OutputFileId','OutputURL','DikirimKe','PesanError','SelesaiPada'];
  const sh = _ensureSheetV2('RaporPTS_Request', headers);
  const requestId = 'RPT' + new Date().getTime() + Math.floor(Math.random() * 1000);
  sh.appendRow([requestId, new Date(), active.tahunAjaran, periode, kelas, params.requestedBy || '', params.requestedByUsername || '', 'Menunggu', '', '', '', '', '', '']);

  _scheduleRaporGeneratorTickV2();
  return { success: true, requestId, status: 'Menunggu' };
}

function getRaporPTSRequestStatus(requestId) {
  const sh = getSS().getSheetByName('RaporPTS_Request');
  if (!sh) return { success: false, error: 'belum_ada_request' };
  const rows = _readAllObjectsV2('RaporPTS_Request');
  const row = rows.find(r => r.RequestID === requestId);
  if (!row) return { success: false, error: 'request_tidak_ditemukan' };
  return { success: true, data: row };
}

function _scheduleRaporGeneratorTickV2() {
  const already = ScriptApp.getProjectTriggers().some(t => t.getHandlerFunction() === '_raporGeneratorTickV2');
  if (already) return;
  ScriptApp.newTrigger('_raporGeneratorTickV2').timeBased().after(2000).create();
}

function _raporGeneratorTickV2() {
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === '_raporGeneratorTickV2') ScriptApp.deleteTrigger(t);
  });

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(3000)) { _scheduleRaporGeneratorTickV2(); return; }
  try {
    const sh = getSS().getSheetByName('RaporPTS_Request');
    if (!sh || sh.getLastRow() < 2) return;
    const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    const statusCol = headers.indexOf('Status') + 1;
    const values = sh.getRange(2, 1, sh.getLastRow() - 1, headers.length).getValues();

    let targetRowNum = -1, targetRow = null;
    for (let i = 0; i < values.length; i++) {
      if (values[i][statusCol - 1] === 'Menunggu') { targetRowNum = i + 2; targetRow = values[i]; break; }
    }
    if (targetRowNum === -1) return;

    const obj = {}; headers.forEach((h, i) => obj[h] = targetRow[i]);
    sh.getRange(targetRowNum, statusCol).setValue('Diproses');
    SpreadsheetApp.flush();

    try {
      const result = _generateRaporKelasPdfV2(obj.Kelas, obj.Periode, obj.RequestedByUsername);
      const dikirimKe = (result.sharedWith || []).join(', ') || (result.usedFallback ? 'Link publik (email tidak ditemukan)' : '');
      sh.getRange(targetRowNum, 1, 1, headers.length).setValues([[
        obj.RequestID, obj.TimestampRequest, obj.TahunAjaran, obj.Periode, obj.Kelas, obj.RequestedBy, obj.RequestedByUsername,
        'Selesai', result.progress, result.fileId, result.url, dikirimKe, '', new Date()
      ]]);
    } catch (err) {
      sh.getRange(targetRowNum, 1, 1, headers.length).setValues([[
        obj.RequestID, obj.TimestampRequest, obj.TahunAjaran, obj.Periode, obj.Kelas, obj.RequestedBy, obj.RequestedByUsername,
        'Gagal', obj.Progress || '', '', '', '', err.message, new Date()
      ]]);
    }
  } finally {
    lock.releaseLock();
  }

  const sh2 = getSS().getSheetByName('RaporPTS_Request');
  if (sh2 && sh2.getLastRow() >= 2) {
    const h2 = sh2.getRange(1, 1, 1, sh2.getLastColumn()).getValues()[0];
    const statusColIdx = h2.indexOf('Status') + 1;
    const statusValues = sh2.getRange(2, statusColIdx, sh2.getLastRow() - 1, 1).getValues();
    if (statusValues.some(r => r[0] === 'Menunggu')) _scheduleRaporGeneratorTickV2();
  }
}

function _generateRaporKelasPdfV2(kelas, periode, requestedByUsername) {
  const settings = _getSettingsV2();
  const templateId = settings.RaporPTSTemplateID;
  if (!templateId) throw new Error('RaporPTSTemplateID belum diisi di sheet Pengaturan');

  const preview = getRaporPTSClassPreviewV2Fast(kelas, periode);
  if (!preview.success) throw new Error('Gagal ambil data rapor: ' + (preview.error || ''));
  const siswaList = preview.data || [];
  if (!siswaList.length) throw new Error('Tidak ada siswa di kelas ini');

  const folder = _getOrCreateRaporFolderV2();
  const masterDoc = DocumentApp.create('Rapor_' + kelas + '_' + periode + '_' + new Date().getTime());
  const masterBody = masterDoc.getBody();
  masterBody.clear();

  const tempIds = [];
  try {
    siswaList.forEach((row, idx) => {
      const tempId = _generateSiswaDocFromTemplateV2(templateId, row, preview.tahunAjaran, preview.periode);
      tempIds.push(tempId);
      const tempDoc = DocumentApp.openById(tempId);
      _mergeDocBodyIntoV2(masterBody, tempDoc.getBody());
      if (idx < siswaList.length - 1) masterBody.appendPageBreak();
    });
    masterDoc.saveAndClose();

    const pdfBlob = DriveApp.getFileById(masterDoc.getId()).getAs('application/pdf');
    pdfBlob.setName('Rapor_' + kelas.replace(/\s+/g, '_') + '_' + periode + '.pdf');
    const pdfFile = folder.createFile(pdfBlob);

    DriveApp.getFileById(masterDoc.getId()).setTrashed(true);

    const shareResult = _shareFileToStaffV2(pdfFile, kelas, requestedByUsername);

    return {
      progress: siswaList.length + '/' + siswaList.length, fileId: pdfFile.getId(), url: pdfFile.getUrl(),
      sharedWith: shareResult.sharedWith, usedFallback: shareResult.usedFallback
    };
  } finally {
    tempIds.forEach(id => { try { DriveApp.getFileById(id).setTrashed(true); } catch (e) {} });
  }
}

function _generateSiswaDocFromTemplateV2(templateId, dataRow, tahunAjaran, periode) {
  const copy = DriveApp.getFileById(templateId).makeCopy('__temp_rapor_' + dataRow.identitas.nis + '__');
  const doc = DocumentApp.openById(copy.getId());
  const body = doc.getBody();
  const tags = _buildRaporPlaceholderMapV2(dataRow, tahunAjaran, periode);
  Object.keys(tags).forEach(tag => body.replaceText(tag, tags[tag]));
  doc.saveAndClose();
  return copy.getId();
}

function _buildRaporPlaceholderMapV2(row, tahunAjaran, periode) {
  const t = row.tahfizh || {};
  const abs = row.ketidakhadiran || {};
  const ak = row.akhlakKedisiplinan || {};
  const kg = row.kegiatan || {};
  const p = ak.pelanggaran || {};
  const adab = ak.adab || {};
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const map = {};
  map[esc('{{NAMA}}')] = String(row.identitas.nama || '');
  map[esc('{{NIS}}')] = String(row.identitas.nis || '');
  map[esc('{{NISN}}')] = String(row.identitas.nisn || '');
  map[esc('{{KELAS}}')] = String(row.identitas.kelas || '');
  map[esc('{{TAHUN_AJARAN}}')] = String(tahunAjaran || '');
  map[esc('{{PERIODE}}')] = String(periode || '');
  map[esc('{{HADIR}}')] = String(abs.hadir || 0);
  map[esc('{{SAKIT}}')] = String(abs.sakit || 0);
  map[esc('{{IZIN}}')] = String(abs.izin || 0);
  map[esc('{{ALFA}}')] = String(abs.tanpaKeterangan || 0);
  map[esc('{{TOTAL_HARI}}')] = String(abs.totalHari || 0);
  map[esc('{{TAHFIZH_TARGET}}')] = String(t.materiHafalan || '-');
  map[esc('{{TAHFIZH_PENCAPAIAN}}')] = String(t.realisasiSaatIni || '-');
  map[esc('{{TAHFIZH_JUZ}}')] = String(t.juz || '-');
  map[esc('{{TAHFIZH_TILAWAH}}')] = String(t.tilawah || '-');
  map[esc('{{REWARD_POIN}}')] = String(ak.rewardPoin || 0);
  map[esc('{{REWARD_JUMLAH}}')] = String(ak.rewardJumlah || 0);
  map[esc('{{PELANGGARAN_RINGAN}}')] = String(p.ringan || 0);
  map[esc('{{PELANGGARAN_SEDANG}}')] = String(p.sedang || 0);
  map[esc('{{PELANGGARAN_BERAT}}')] = String(p.berat || 0);
  map[esc('{{PELANGGARAN_TOTAL_POIN}}')] = String(p.totalPoin || 0);
  map[esc('{{ADAB_NILAI}}')] = String(adab.nilai || '-');
  map[esc('{{ADAB_PREDIKAT}}')] = String(adab.predikat || '-');
  map[esc('{{EKSKUL_KEAKTIFAN}}')] = String(kg.ekskulKeaktifan || '-');
  map[esc('{{EKSKUL_KEMAMPUAN}}')] = String(kg.ekskulKemampuan || '-');
  map[esc('{{LOMBA_PRESTASI}}')] = String(kg.lombaPrestasi || '-');
  map[esc('{{KEAKTIFAN_SEKOLAH}}')] = String(kg.keaktifanSekolah || '-');
  map[esc('{{KOMENTAR_WALAS}}')] = String(row.komentarWalas || '-');
  return map;
}

function _mergeDocBodyIntoV2(masterBody, sourceBody) {
  const total = sourceBody.getNumChildren();
  for (let i = 0; i < total; i++) {
    const el = sourceBody.getChild(i);
    const type = el.getType();
    switch (type) {
      case DocumentApp.ElementType.PARAGRAPH:
        masterBody.appendParagraph(el.copy());
        break;
      case DocumentApp.ElementType.TABLE:
        masterBody.appendTable(el.copy());
        break;
      case DocumentApp.ElementType.LIST_ITEM:
        masterBody.appendListItem(el.copy());
        break;
      case DocumentApp.ElementType.INLINE_IMAGE:
        masterBody.appendImage(el.copy());
        break;
      case DocumentApp.ElementType.PAGE_BREAK:
        masterBody.appendPageBreak();
        break;
      case DocumentApp.ElementType.HORIZONTAL_RULE:
        masterBody.appendHorizontalRule();
        break;
      default:
        break; // tipe elemen tidak didukung penyalinan otomatis -- dilewati.
    }
  }
}

function _getOrCreateRaporFolderV2() {
  const settings = _getSettingsV2();
  if (settings.RaporOutputFolderID) {
    try { return DriveApp.getFolderById(settings.RaporOutputFolderID); } catch (e) {}
  }
  const root = DriveApp.getRootFolder();
  const it = root.getFoldersByName('Rapor PTS - Output');
  if (it.hasNext()) return it.next();
  return root.createFolder('Rapor PTS - Output');
}

// ============================================================================
// V2 DASHBOARD BARU / LONCENG NOTIFIKASI
// ============================================================================

function _hariKerjaBulanBerjalanV3(now) {
  const y = Number(Utilities.formatDate(now, APP_TZ, 'yyyy'));
  const m = Number(Utilities.formatDate(now, APP_TZ, 'M'));
  const d = Number(Utilities.formatDate(now, APP_TZ, 'd'));
  const out = [];
  for (let day = 1; day <= d; day++) {
    const dt = new Date(y, m - 1, day, 12, 0, 0);
    const idx = dt.getDay();
    if (idx >= 1 && idx <= 5) out.push(Utilities.formatDate(dt, APP_TZ, 'yyyy-MM-dd'));
  }
  return out;
}

// ============================================================================
// DASHBOARD WALAS V4 — materialized daily bucket (tidak scan log besar saat buka)
// ============================================================================
function _ensureDashboardDailyV4() {
  return _ensureSheetV2('V2_Dashboard_Harian', [
    'Key','Tanggal','YearMonth','Kelas','Hadir','Sakit','Izin','Alfa',
    'WajibLapor','LaporOleh','UpdatedAt'
  ]);
}

function _dashboardDailyKeyV4(tanggal, kelas) {
  return String(tanggal) + '|' + String(kelas || '').trim();
}

function _syncDashboardAbsensiHarianV4(params) {
  const tanggal = String(params.tanggal || Utilities.formatDate(new Date(), APP_TZ, 'yyyy-MM-dd'));
  const kelas = String(params.kelas || '').trim();
  if (!kelas) return;
  const sh = _ensureDashboardDailyV4();
  const key = _dashboardDailyKeyV4(tanggal, kelas);
  const row = _findBucketRowV2(sh, key);
  let wajib = '', laporOleh = '';
  if (row !== -1) {
    wajib = sh.getRange(row, 9).getValue();
    laporOleh = sh.getRange(row, 10).getValue();
  }
  const rekap = {Hadir:0,Sakit:0,Izin:0,Alfa:0};
  (params.data || []).forEach(x => { if (rekap[x.status] !== undefined) rekap[x.status]++; });
  _writeBucketRowV2(sh, ['Key','Tanggal','YearMonth','Kelas','Hadir','Sakit','Izin','Alfa','WajibLapor','LaporOleh','UpdatedAt'], row, [
    key, tanggal, tanggal.slice(0,7), kelas,
    rekap.Hadir, rekap.Sakit, rekap.Izin, rekap.Alfa,
    wajib, laporOleh, new Date()
  ]);
  _invalidateDashboardCacheV4(kelas, tanggal);
}

function _syncDashboardWajibLaporHarianV4(kelas, dateValue, username) {
  kelas = String(kelas || '').trim();
  if (!kelas) return;
  const tanggal = _dateYMDV2(dateValue || new Date());
  const sh = _ensureDashboardDailyV4();
  const key = _dashboardDailyKeyV4(tanggal, kelas);
  const row = _findBucketRowV2(sh, key);
  let vals = [0,0,0,0];
  if (row !== -1) vals = sh.getRange(row,5,1,4).getValues()[0];
  _writeBucketRowV2(sh, ['Key','Tanggal','YearMonth','Kelas','Hadir','Sakit','Izin','Alfa','WajibLapor','LaporOleh','UpdatedAt'], row, [
    key, tanggal, tanggal.slice(0,7), kelas,
    Number(vals[0])||0, Number(vals[1])||0, Number(vals[2])||0, Number(vals[3])||0,
    'Ya', username || '', new Date()
  ]);
  _invalidateDashboardCacheV4(kelas, tanggal);
}

function _invalidateDashboardCacheV4(kelas, tanggal) {
  try {
    const roleKeys = ['walas','kesiswaan','pimpinan'];
    roleKeys.forEach(role => {
      _cacheRemoveV2('dashwalas:v4:' + role + ':' + _normV2(kelas) + ':' + tanggal);
      _cacheRemoveV2('dashwalas:v4:' + role + '::' + tanggal);
    });
  } catch (err) {}
}

function _readDashboardDailyMonthV4(ym) {
  const sh = _ensureDashboardDailyV4();
  if (sh.getLastRow() < 2) return [];
  const values = sh.getRange(2,1,sh.getLastRow()-1,11).getValues();
  return values.filter(r => String(r[2]) === String(ym)).map(r => ({
    Key:r[0], Tanggal:String(r[1]||''), YearMonth:String(r[2]||''), Kelas:String(r[3]||''),
    Hadir:Number(r[4])||0, Sakit:Number(r[5])||0, Izin:Number(r[6])||0, Alfa:Number(r[7])||0,
    WajibLapor:String(r[8]||''), LaporOleh:String(r[9]||'')
  }));
}

function _backfillDashboardDailyCurrentMonthV4(now) {
  const ym = Utilities.formatDate(now, APP_TZ, 'yyyy-MM');
  const sh = _ensureDashboardDailyV4();
  if (sh.getLastRow() > 1) return; // backfill hanya sekali saat pertama upgrade

  const map = {};
  const absRows = _readTailObjectsV2('RekapAbsensi', LOG_TAIL.RekapAbsensi);
  absRows.forEach(r => {
    const t = _dateYMDV2(r.Timestamp);
    if (t.indexOf(ym) !== 0) return;
    const kelas = String(r.Kelas || '').trim(); if (!kelas) return;
    const key = _dashboardDailyKeyV4(t, kelas);
    if (!map[key]) map[key] = {tanggal:t,kelas,Hadir:0,Sakit:0,Izin:0,Alfa:0,wajib:'',oleh:''};
    map[key].Hadir += Number(r.Hadir)||0; map[key].Sakit += Number(r.Sakit)||0;
    map[key].Izin += Number(r.Izin)||0; map[key].Alfa += Number(r.Alfa)||0;
  });
  const logs = _readTailObjectsV2('LogAktivitas', LOG_TAIL.LogAktivitas);
  logs.forEach(r => {
    if (_normV2(r.Modul) !== 'kedisiplinan') return;
    const t = _dateYMDV2(r.Timestamp); if (t.indexOf(ym) !== 0) return;
    const kelas = String(r.Kelas || '').trim(); if (!kelas) return;
    const key = _dashboardDailyKeyV4(t, kelas);
    if (!map[key]) map[key] = {tanggal:t,kelas,Hadir:0,Sakit:0,Izin:0,Alfa:0,wajib:'',oleh:''};
    map[key].wajib = 'Ya'; map[key].oleh = String(r.Username || '');
  });
  const rows = Object.keys(map).sort().map(key => { const x=map[key]; return [key,x.tanggal,ym,x.kelas,x.Hadir,x.Sakit,x.Izin,x.Alfa,x.wajib,x.oleh,new Date()]; });
  if (rows.length) sh.getRange(2,1,rows.length,11).setValues(rows);
}

function getDashboardWalasV3Fast(params) {
  const now = new Date();
  const today = Utilities.formatDate(now, APP_TZ, 'yyyy-MM-dd');
  const ym = Utilities.formatDate(now, APP_TZ, 'yyyy-MM');
  const role = _normV2(params.role || 'walas');
  const targetClass = (params.kelas || '').toString().trim();
  const targetNorm = _normV2(targetClass);
  const isWalas = role === 'walas' && !!targetClass;
  const cacheKey = 'dashwalas:v4:' + role + ':' + targetNorm + ':' + today;
  const cached = _cacheGetJsonV2(cacheKey);
  if (cached) return cached;

  // Satu kali migrasi ringan dari log lama. Sesudah itu dashboard membaca bucket kecil saja.
  _backfillDashboardDailyCurrentMonthV4(now);
  const daily = _readDashboardDailyMonthV4(ym);

  const byDate = {};
  let hadir=0,sakit=0,izin=0,alfa=0;
  const laporanByClass = {};
  daily.forEach(r => {
    const clsNorm = _normV2(r.Kelas);
    if (!isWalas || clsNorm === targetNorm) {
      hadir += r.Hadir; sakit += r.Sakit; izin += r.Izin; alfa += r.Alfa;
      if (!byDate[r.Tanggal]) byDate[r.Tanggal] = {Hadir:0,Sakit:0,Izin:0,Alfa:0};
      byDate[r.Tanggal].Hadir += r.Hadir; byDate[r.Tanggal].Sakit += r.Sakit;
      byDate[r.Tanggal].Izin += r.Izin; byDate[r.Tanggal].Alfa += r.Alfa;
    }
    if (_normV2(r.WajibLapor) === 'ya') {
      if (!laporanByClass[r.Kelas]) laporanByClass[r.Kelas] = {};
      laporanByClass[r.Kelas][r.Tanggal] = true;
    }
  });

  const attendanceDates = Object.keys(byDate).sort().slice(-14);
  const trend = attendanceDates.map(t => {
    const x=byDate[t], total=x.Hadir+x.Sakit+x.Izin+x.Alfa;
    return {tanggal:t,persentaseHadir:total?Math.round(x.Hadir/total*1000)/10:0,total};
  });
  const totalAbs=hadir+sakit+izin+alfa;

  const hariWajibList = _hariKerjaBulanBerjalanV3(now), hariWajib = hariWajibList.length;
  const walasRows = _readCachedCompactV2('Walas',['Kelas diampu','Role','Status aktif'],CACHE_TTL_MASTER_SEC)
    .filter(r=>_normV2(r.Role)==='walas'&&isStatusAktif(r['Status aktif'])&&String(r['Kelas diampu']||'').trim());
  const classSet={}; walasRows.forEach(r=>classSet[String(r['Kelas diampu']).trim()]=true);
  Object.keys(laporanByClass).forEach(k=>classSet[k]=true);
  const kelasTertib=Object.keys(classSet).map(kelas=>{
    const hariLapor=Object.keys(laporanByClass[kelas]||{}).filter(t=>hariWajibList.indexOf(t)>=0).length;
    const pct=hariWajib?Math.round(hariLapor/hariWajib*1000)/10:0;
    return {kelas,hariLapor,hariWajib,persentase:pct,dataCukup:hariWajib>0&&hariLapor/hariWajib>=.5};
  }).sort((a,b)=>b.persentase-a.persentase||b.hariLapor-a.hariLapor||a.kelas.localeCompare(b.kelas));
  const ownHariLapor=isWalas?Object.keys(laporanByClass[targetClass]||{}).filter(t=>hariWajibList.indexOf(t)>=0).length:0;
  const ownPct=isWalas&&hariWajib?Math.round(ownHariLapor/hariWajib*1000)/10:0;
  const sudahHariIni=isWalas?!!(laporanByClass[targetClass]&&laporanByClass[targetClass][today]):true;

  // Reward bucket: hanya satu baris per kelas.
  const rewardSh=getSS().getSheetByName('V2_Reward_Kelas');
  const topSekolah=[],perKelas={};
  if(rewardSh&&rewardSh.getLastRow()>=2){
    const rows=rewardSh.getRange(2,1,rewardSh.getLastRow()-1,4).getValues();
    rows.forEach(row=>{
      const kelas=String(row[1]||'').trim(),data=_readJsonSafeV2(row[2]);
      const list=Object.keys(data).map(nis=>({nis,nama:data[nis].nama||'',kelas,totalPoin:Number(data[nis].TotalPoin)||0}))
        .sort((a,b)=>b.totalPoin-a.totalPoin||String(a.nama).localeCompare(String(b.nama),'id'));
      perKelas[kelas]=list.slice(0,10); topSekolah.push.apply(topSekolah,list);
    });
  }
  topSekolah.sort((a,b)=>b.totalPoin-a.totalPoin||String(a.nama).localeCompare(String(b.nama),'id'));

  // Eskalasi dari bucket kedisiplinan, bukan sheet log.
  const ambang=Number(_getSettingsV2().AmbangEskalasiKedisiplinan)||50;
  const kdSh=getSS().getSheetByName('V2_Kedisiplinan_Kelas');
  const escData=[];
  if(kdSh&&kdSh.getLastRow()>=2){
    const rows=kdSh.getRange(2,1,kdSh.getLastRow()-1,4).getValues();
    rows.forEach(row=>{
      const kelas=String(row[1]||'').trim(); if(isWalas&&_normV2(kelas)!==targetNorm)return;
      const data=_readJsonSafeV2(row[2]);
      Object.keys(data).forEach(nis=>{const x=data[nis]||{},p=Number(x.TotalPoin)||0;if(p>=ambang)escData.push({nis,nama:x.nama||'',kelas,totalPoin:p,jumlahKejadian:Number(x.JumlahKejadian)||0,tanggalTerakhir:x.TanggalTerakhir||''});});
    });
  }
  escData.sort((a,b)=>b.totalPoin-a.totalPoin||String(a.nama).localeCompare(String(b.nama),'id'));

  const result={success:true,meta:{tanggal:today,tanggalLabel:Utilities.formatDate(now,APP_TZ,'EEEE, d MMMM yyyy'),scopeLabel:isWalas?targetClass:'Seluruh Sekolah',role,readMode:'v4-materialized-daily+bucket+cache'},
    kehadiran:{hadir,sakit,izin,alfa,total:totalAbs,persentaseHadir:totalAbs?Math.round(hadir/totalAbs*1000)/10:0,trend},
    wajibLapor:{sudahHariIni,hariWajib,hariLapor:isWalas?ownHariLapor:0,persentase:isWalas?ownPct:0},
    reward:{kelas:isWalas?(perKelas[targetClass]||[]):topSekolah.slice(0,10),sekolah:topSekolah.slice(0,10)},
    kelasTertib:kelasTertib.slice(0,10),eskalasi:{count:escData.length,ambang,data:escData}};
  _cachePutJsonV2(cacheKey,result,300);
  return result;
}

function getMyPendingTasksV2Fast(username, kelas) {
  const now = new Date();
  const today = Utilities.formatDate(now, APP_TZ, 'yyyy-MM-dd');
  const hariIdx = getHariIndexGMT7(now);
  const isJumat = hariIdx === 5;
  const isHariKerja = hariIdx >= 1 && hariIdx <= 5;

  const tasks = [];
  if (isHariKerja) {
    const absRes = getAbsensiHariIniV2(kelas, today);
    if (!absRes.sudahAbsen) tasks.push({ modul: 'absensi', label: 'Absensi Morning Talk hari ini belum diisi' });

    const logs = _readTailObjectsV2('LogAktivitas', LOG_TAIL.LogAktivitas);
    const sudahKD = logs.some(r => r.Modul === 'Kedisiplinan' && _normV2(r.Kelas) === _normV2(kelas) && _dateYMDV2(r.Timestamp) === today);
    if (!sudahKD) tasks.push({ modul: 'kedisiplinan', label: 'Kedisiplinan hari ini belum dicek/diisi' });
  }

  if (isJumat) {
    const pekanInfo = getPekanAktifPjBL(kelas);
    if (pekanInfo.success) {
      const pjblRows = _readTailObjectsV2('PjBL_Log', LOG_TAIL.PjBL_Log);
      const sudahPjBL = pjblRows.some(r => _normV2(r.Kelas) === _normV2(kelas) && _dateYMDV2(r.Timestamp) === today);
      if (!sudahPjBL) tasks.push({ modul: 'pjbl', label: 'PjBL pekan ini belum diisi' });
    }
  }

  const keterlambatan = getKeterlambatanBelumDicatatV2Fast(kelas, today);
  const pendingTelat = (keterlambatan.data || []).filter(r => !r.sudahDicatat).length;
  if (pendingTelat > 0) tasks.push({ modul: 'kedisiplinan', label: pendingTelat + ' keterlambatan belum dikonfirmasi jadi poin' });

  return { success: true, tanggal: today, count: tasks.length, tasks };
}

function getEskalasiKedisiplinanV2Fast() {
  const settings = _getSettingsV2();
  const ambang = Number(settings.AmbangEskalasiKedisiplinan) || 50;
  const sh = getSS().getSheetByName('V2_Kedisiplinan_Kelas');
  if (!sh || sh.getLastRow() < 2) return { success: true, ambang, data: [] };

  const rows = sh.getRange(2, 1, sh.getLastRow() - 1, 4).getValues();
  const hasil = [];
  rows.forEach(row => {
    const kelas = row[1];
    const data = _readJsonSafeV2(row[2]);
    Object.keys(data).forEach(nis => {
      const s = data[nis];
      const total = Number(s.TotalPoin) || 0;
      if (total >= ambang) {
        hasil.push({ kelas, nis, nama: s.nama || '', totalPoin: total, jumlahKejadian: Number(s.JumlahKejadian) || 0 });
      }
    });
  });
  hasil.sort((a, b) => b.totalPoin - a.totalPoin);
  return { success: true, ambang, data: hasil };
}

function getLeaderboardRewardV2Fast() {
  const sh = getSS().getSheetByName('V2_Reward_Kelas');
  const siswaAll = _readCachedCompactV2('Siswa', ['NIS','Nama','Kelas'], CACHE_TTL_MASTER_SEC);
  const jumlahSiswaPerKelas = {};
  siswaAll.forEach(s => { jumlahSiswaPerKelas[s.Kelas] = (jumlahSiswaPerKelas[s.Kelas] || 0) + 1; });

  if (!sh || sh.getLastRow() < 2) {
    return { success: true, terbaikSekolah: null, perKelas: {}, kelasTerbaik: null };
  }

  const rows = sh.getRange(2, 1, sh.getLastRow() - 1, 4).getValues();
  let terbaikSekolah = null;
  const perKelas = {};
  const totalPoinKelas = {};

  rows.forEach(row => {
    const kelas = row[1];
    const data = _readJsonSafeV2(row[2]);
    const list = Object.keys(data).map(nis => ({
      nis, nama: data[nis].nama || '', totalPoin: Number(data[nis].TotalPoin) || 0
    })).sort((a, b) => b.totalPoin - a.totalPoin);

    perKelas[kelas] = list.slice(0, 5);
    const totalKelas = list.reduce((a, s) => a + s.totalPoin, 0);
    totalPoinKelas[kelas] = totalKelas;

    list.forEach(s => {
      if (!terbaikSekolah || s.totalPoin > terbaikSekolah.totalPoin) {
        terbaikSekolah = { nis: s.nis, nama: s.nama, totalPoin: s.totalPoin, kelas };
      }
    });
  });

  // Kelas terbaik dihitung dari RATA-RATA poin per siswa, supaya kelas dengan
  // siswa lebih sedikit tidak dirugikan dibanding kelas dengan siswa lebih banyak.
  let kelasTerbaik = null;
  Object.keys(totalPoinKelas).forEach(kelas => {
    const jumlahSiswa = jumlahSiswaPerKelas[kelas] || 1;
    const rata = totalPoinKelas[kelas] / jumlahSiswa;
    if (!kelasTerbaik || rata > kelasTerbaik.rataPoin) {
      kelasTerbaik = { kelas, rataPoin: Math.round(rata * 100) / 100 };
    }
  });

  return { success: true, terbaikSekolah, perKelas, kelasTerbaik };
}

function getGrafikAbsensiV2Fast() {
  const rows = _readTailObjectsV2('RekapAbsensi', LOG_TAIL.RekapAbsensi);
  const byDate = {};
  rows.forEach(r => {
    const t = _dateYMDV2(r.Timestamp);
    if (!byDate[t]) byDate[t] = { Hadir: 0, Sakit: 0, Izin: 0, Alfa: 0 };
    byDate[t].Hadir += Number(r.Hadir) || 0;
    byDate[t].Sakit += Number(r.Sakit) || 0;
    byDate[t].Izin += Number(r.Izin) || 0;
    byDate[t].Alfa += Number(r.Alfa) || 0;
  });

  const tanggalList = Object.keys(byDate).sort().slice(-14);
  const data = tanggalList.map(t => {
    const d = byDate[t];
    const total = d.Hadir + d.Sakit + d.Izin + d.Alfa;
    const persentaseHadir = total > 0 ? Math.round((d.Hadir / total) * 1000) / 10 : 0;
    return { tanggal: t, persentaseHadir, total };
  });

  return { success: true, data };
}

// ============================================================================
// V2 LAPORAN GURU BULANAN (auto-fill dari data sistem + Tahfizh/Market Day)
// ============================================================================
// Menghasilkan 1 Google Sheets per kelas per bulan. Tab yang auto-terisi:
// Kehadiran Siswa, Dinamika Siswa (Afektif), PjBL, Tahfizh, Market Day.
// Tab Bilingual/Capaian Pembelajaran/Timesheet/Kehadiran Guru dibuat kosong
// dengan catatan -- masih perlu diisi manual atau menyusul modulnya.

const NAMA_BULAN_ID_V2 = ['','Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

function _jumlahHariDalamBulanV2(bulan, tahun) {
  return new Date(Number(tahun), Number(bulan), 0).getDate();
}

// Kembalikan { nis: { hari: 'S'|'I'|'A' } }. Blank/tidak ada entri = dianggap Hadir.
function _buildKehadiranBulananV2(kelas, bulan, tahun) {
  const target = _normV2(kelas);
  const rows = _readTailObjectsV2('Absensi', LOG_TAIL.Absensi);
  const kodeStatus = { Sakit: 'S', Izin: 'I', Alfa: 'A', Hadir: '' };
  const matrix = {};
  const latestPerNisHari = {};

  rows.forEach(r => {
    if (_normV2(r.Kelas) !== target) return;
    const tgl = r.Timestamp instanceof Date ? r.Timestamp : new Date(r.Timestamp);
    if (isNaN(tgl.getTime())) return;
    if ((tgl.getMonth() + 1) !== Number(bulan) || tgl.getFullYear() !== Number(tahun)) return;
    const hari = tgl.getDate();
    const nis = String(r.NIS);
    const key = nis + '|' + hari;
    latestPerNisHari[key] = kodeStatus[r.Status] !== undefined ? kodeStatus[r.Status] : '';
  });

  Object.keys(latestPerNisHari).forEach(key => {
    const [nis, hariStr] = key.split('|');
    if (!matrix[nis]) matrix[nis] = {};
    matrix[nis][hariStr] = latestPerNisHari[key];
  });

  return matrix;
}

function _buildPjBLBulananV2(kelas, bulan, tahun) {
  const target = _normV2(kelas);
  const logRows = _readTailObjectsV2('PjBL_Log', LOG_TAIL.PjBL_Log).filter(r => {
    if (_normV2(r.Kelas) !== target) return false;
    const t = r.Timestamp instanceof Date ? r.Timestamp : new Date(r.Timestamp);
    return !isNaN(t.getTime()) && (t.getMonth() + 1) === Number(bulan) && t.getFullYear() === Number(tahun);
  }).sort((a, b) => Number(a.Pekan) - Number(b.Pekan));

  const nilaiRows = _readTailObjectsV2('PjBL_NilaiPekanan', LOG_TAIL.PjBL_NilaiPekanan).filter(r => {
    if (_normV2(r.Kelas) !== target) return false;
    const t = r.Timestamp instanceof Date ? r.Timestamp : new Date(r.Timestamp);
    return !isNaN(t.getTime()) && (t.getMonth() + 1) === Number(bulan) && t.getFullYear() === Number(tahun);
  });

  const pekanList = [...new Set(logRows.map(r => Number(r.Pekan)))].sort((a, b) => a - b);
  const nilaiByNisPekan = {};
  nilaiRows.forEach(r => {
    const nis = String(r.NIS);
    if (!nilaiByNisPekan[nis]) nilaiByNisPekan[nis] = {};
    nilaiByNisPekan[nis][Number(r.Pekan)] = Number(r.Skor) || 0;
    nilaiByNisPekan[nis]._nama = r.Nama;
  });

  return { logRows, pekanList, nilaiByNisPekan };
}

function _getOrCreateLaporanGuruFolderV2() {
  const settings = _getSettingsV2();
  if (settings.LaporanGuruFolderID) {
    try { return DriveApp.getFolderById(settings.LaporanGuruFolderID); } catch (e) {}
  }
  const root = DriveApp.getRootFolder();
  const it = root.getFoldersByName('Laporan Guru - Output');
  if (it.hasNext()) return it.next();
  return root.createFolder('Laporan Guru - Output');
}

function _tulisHeaderBoldV2(sheet, row, values, startCol) {
  startCol = startCol || 1;
  sheet.getRange(row, startCol, 1, values.length).setValues([values]);
  sheet.getRange(row, startCol, 1, values.length).setFontWeight('bold');
}

function generateLaporanGuruBulananV2(kelas, bulan, tahun, requestedBy, requestedByUsername) {
  const siswa = getSiswaByKelasV2(kelas).data || [];
  if (!siswa.length) throw new Error('Tidak ada siswa di kelas ini');

  const namaBulan = NAMA_BULAN_ID_V2[Number(bulan)];
  const ss = SpreadsheetApp.create('Laporan Guru - ' + kelas + ' - ' + namaBulan + ' ' + tahun);
  const settings = _getSettingsV2();

  // ---------- TAB 1: KEHADIRAN SISWA ----------
  const shHadir = ss.getSheets()[0];
  shHadir.setName('Kehadiran Siswa');
  shHadir.getRange(1, 1).setValue('DAFTAR KEHADIRAN SISWA').setFontWeight('bold');
  shHadir.getRange(2, 1).setValue("SD ISLAM TAHFIZH CAHAYA QUR'AN").setFontWeight('bold');
  shHadir.getRange(3, 1).setValue('Kelas: ' + kelas + '  |  Bulan: ' + namaBulan + ' ' + tahun);

  const jumlahHari = _jumlahHariDalamBulanV2(bulan, tahun);
  const headerHadir = ['No', 'NIS', 'NISN', 'Nama'];
  for (let d = 1; d <= jumlahHari; d++) headerHadir.push(String(d));
  headerHadir.push('H', 'S', 'I', 'A');
  _tulisHeaderBoldV2(shHadir, 5, headerHadir);

  const matrixHadir = _buildKehadiranBulananV2(kelas, bulan, tahun);
  const dataHadir = siswa.map((s, idx) => {
    const perHari = matrixHadir[String(s.nis)] || {};
    const row = [idx + 1, s.nis, s.nisn || '', s.nama];
    let s_ = 0, i_ = 0, a_ = 0;
    for (let d = 1; d <= jumlahHari; d++) {
      const kode = perHari[String(d)] || '';
      row.push(kode);
      if (kode === 'S') s_++; else if (kode === 'I') i_++; else if (kode === 'A') a_++;
    }
    const h_ = jumlahHari - s_ - i_ - a_;
    row.push(h_, s_, i_, a_);
    return row;
  });
  if (dataHadir.length) shHadir.getRange(6, 1, dataHadir.length, headerHadir.length).setValues(dataHadir);
  shHadir.setFrozenRows(5);
  shHadir.setFrozenColumns(4);

  // ---------- TAB 2: DINAMIKA SISWA (AFEKTIF) ----------
  const shDinamika = ss.insertSheet('Dinamika Siswa (Afektif)');
  shDinamika.getRange(1, 1).setValue('LAPORAN DINAMIKA SISWA — ' + kelas + ' — ' + namaBulan + ' ' + tahun).setFontWeight('bold');
  const headerDinamika = ['No', 'Nama Siswa', 'Kelas', 'Ringan', 'Sedang', 'Berat', 'Total Poin Pelanggaran', 'Jumlah Kejadian'];
  _tulisHeaderBoldV2(shDinamika, 3, headerDinamika);

  const ym = String(tahun) + '-' + String(bulan).padStart(2, '0');
  const kdMap = _loadKdMonthClassFastV2(kelas, ym);
  const dataDinamika = siswa.map((s, idx) => {
    const r = kdMap[String(s.nis)] || {};
    return [idx + 1, s.nama, kelas, Number(r.Ringan) || 0, Number(r.Sedang) || 0, Number(r.Berat) || 0, Number(r.TotalPoin) || 0, Number(r.JumlahKejadian) || 0];
  });
  if (dataDinamika.length) shDinamika.getRange(4, 1, dataDinamika.length, headerDinamika.length).setValues(dataDinamika);
  shDinamika.setFrozenRows(3);

  // ---------- TAB 3: PjBL ----------
  const shPjBL = ss.insertSheet('PjBL');
  shPjBL.getRange(1, 1).setValue('LAPORAN PjBL — ' + kelas + ' — ' + namaBulan + ' ' + tahun).setFontWeight('bold');
  const pjbl = _buildPjBLBulananV2(kelas, bulan, tahun);

  _tulisHeaderBoldV2(shPjBL, 3, ['Pekan', 'Tanggal', 'Kegiatan Rencana', 'Realita', 'Kendala', 'Masukan']);
  const dataLogPjBL = pjbl.logRows.map(r => [r.Pekan, formatTanggalYMD(r.Tanggal), r.KegiatanRencana || '', r.Realita || '', r.Kendala || '', r.Masukan || '']);
  if (dataLogPjBL.length) shPjBL.getRange(4, 1, dataLogPjBL.length, 6).setValues(dataLogPjBL);

  const startNilaiRow = 4 + dataLogPjBL.length + 2;
  const headerNilai = ['No', 'Nama Siswa'].concat(pjbl.pekanList.map(p => 'Pekan ' + p));
  _tulisHeaderBoldV2(shPjBL, startNilaiRow, headerNilai);
  const dataNilaiPjBL = siswa.map((s, idx) => {
    const row = [idx + 1, s.nama];
    pjbl.pekanList.forEach(p => {
      const rec = pjbl.nilaiByNisPekan[String(s.nis)];
      row.push(rec && rec[p] !== undefined ? rec[p] : '');
    });
    return row;
  });
  if (dataNilaiPjBL.length) shPjBL.getRange(startNilaiRow + 1, 1, dataNilaiPjBL.length, headerNilai.length).setValues(dataNilaiPjBL);

  // ---------- TAB 4: TAHFIZH (tarik dari Spreadsheet eksternal) ----------
  const shTahfizh = ss.insertSheet('Tahfizh');
  const tah = _readTahfizhClassV2(kelas, settings.SpreadsheetTahfizhID);
  if (tah.warning) {
    shTahfizh.getRange(1, 1).setValue('Catatan: ' + tah.warning);
  } else {
    _tulisHeaderBoldV2(shTahfizh, 1, ['Nama', 'Target LP', 'Pencapaian', 'Juz', 'Kuadran', 'Tilawah', 'Hal/Surah', 'UKJ']);
    const dataTahfizh = tah.rows.map(r => [r.nama, r.targetLP, r.pencapaian, r.juz, r.kuadran, r.tilawah, r.halSurah, r.ukj]);
    if (dataTahfizh.length) shTahfizh.getRange(2, 1, dataTahfizh.length, 8).setValues(dataTahfizh);
  }

  // ---------- TAB 5: MARKET DAY (tarik dari Spreadsheet eksternal) ----------
  const shMarket = ss.insertSheet('Market Day');
  const md = _readMarketDayClassV2(kelas, settings.SpreadsheetMarketDayID);
  if (md.warning) {
    shMarket.getRange(1, 1).setValue('Catatan: ' + md.warning);
  } else {
    _tulisHeaderBoldV2(shMarket, 1, ['Nama', 'Rata-Rata', 'Kategori', 'Catatan', 'Produk', 'Dokumentasi']);
    const dataMarket = md.rows.map(r => [r.nama, r.rataRata, r.kategori, r.catatan, r.produk, r.dokumentasi]);
    if (dataMarket.length) shMarket.getRange(2, 1, dataMarket.length, 6).setValues(dataMarket);
  }

  // ---------- TAB PLACEHOLDER: yang masih perlu diisi manual/menyusul ----------
  ['Bilingual (Mufrodat)', 'Capaian Pembelajaran (Nilai)'].forEach(nama => {
    const sh = ss.insertSheet(nama);
    sh.getRange(1, 1).setValue('Modul ini belum otomatis -- isi manual dulu, akan disambungkan setelah struktur datanya siap.').setFontStyle('italic');
  });
  ['Timesheet Guru', 'Kehadiran Guru'].forEach(nama => {
    const sh = ss.insertSheet(nama);
    sh.getRange(1, 1).setValue('Data pribadi guru -- di luar cakupan sistem kesiswaan, tetap diisi manual seperti biasa.').setFontStyle('italic');
  });

  // Pindahkan ke folder khusus + share langsung ke email guru pemilik kelas.
  const folder = _getOrCreateLaporanGuruFolderV2();
  const file = DriveApp.getFileById(ss.getId());
  folder.addFile(file);
  DriveApp.getRootFolder().removeFile(file);

  const shareResult = _shareFileToStaffV2(file, kelas, requestedByUsername);

  return { spreadsheetId: ss.getId(), url: ss.getUrl(), sharedWith: shareResult.sharedWith, usedFallback: shareResult.usedFallback };
}

function requestLaporanGuruBulanan(params) {
  const kelas = params.kelas, bulan = Number(params.bulan), tahun = Number(params.tahun);
  if (!kelas || !bulan || !tahun) return { success: false, error: 'parameter_tidak_lengkap' };

  const headers = ['RequestID','TimestampRequest','Kelas','Bulan','Tahun','RequestedBy','RequestedByUsername','Status','OutputSpreadsheetId','OutputURL','DikirimKe','PesanError','SelesaiPada'];
  const sh = _ensureSheetV2('LaporanGuru_Request', headers);
  const requestId = 'LG' + new Date().getTime() + Math.floor(Math.random() * 1000);
  sh.appendRow([requestId, new Date(), kelas, bulan, tahun, params.requestedBy || '', params.requestedByUsername || '', 'Menunggu', '', '', '', '', '']);

  _scheduleLaporanGuruTickV2();
  return { success: true, requestId, status: 'Menunggu' };
}

function getLaporanGuruRequestStatus(requestId) {
  const sh = getSS().getSheetByName('LaporanGuru_Request');
  if (!sh) return { success: false, error: 'belum_ada_request' };
  const rows = _readAllObjectsV2('LaporanGuru_Request');
  const row = rows.find(r => r.RequestID === requestId);
  if (!row) return { success: false, error: 'request_tidak_ditemukan' };
  return { success: true, data: row };
}

function _scheduleLaporanGuruTickV2() {
  const already = ScriptApp.getProjectTriggers().some(t => t.getHandlerFunction() === '_laporanGuruTickV2');
  if (already) return;
  ScriptApp.newTrigger('_laporanGuruTickV2').timeBased().after(2000).create();
}

function _laporanGuruTickV2() {
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === '_laporanGuruTickV2') ScriptApp.deleteTrigger(t);
  });

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(3000)) { _scheduleLaporanGuruTickV2(); return; }
  try {
    const sh = getSS().getSheetByName('LaporanGuru_Request');
    if (!sh || sh.getLastRow() < 2) return;
    const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    const statusCol = headers.indexOf('Status') + 1;
    const values = sh.getRange(2, 1, sh.getLastRow() - 1, headers.length).getValues();

    let targetRowNum = -1, targetRow = null;
    for (let i = 0; i < values.length; i++) {
      if (values[i][statusCol - 1] === 'Menunggu') { targetRowNum = i + 2; targetRow = values[i]; break; }
    }
    if (targetRowNum === -1) return;

    const obj = {}; headers.forEach((h, i) => obj[h] = targetRow[i]);
    sh.getRange(targetRowNum, statusCol).setValue('Diproses');
    SpreadsheetApp.flush();

    try {
      const result = generateLaporanGuruBulananV2(obj.Kelas, obj.Bulan, obj.Tahun, obj.RequestedBy, obj.RequestedByUsername);
      const dikirimKe = (result.sharedWith || []).join(', ') || (result.usedFallback ? 'Link publik (email tidak ditemukan)' : '');
      sh.getRange(targetRowNum, 1, 1, headers.length).setValues([[
        obj.RequestID, obj.TimestampRequest, obj.Kelas, obj.Bulan, obj.Tahun, obj.RequestedBy, obj.RequestedByUsername,
        'Selesai', result.spreadsheetId, result.url, dikirimKe, '', new Date()
      ]]);
    } catch (err) {
      sh.getRange(targetRowNum, 1, 1, headers.length).setValues([[
        obj.RequestID, obj.TimestampRequest, obj.Kelas, obj.Bulan, obj.Tahun, obj.RequestedBy, obj.RequestedByUsername,
        'Gagal', '', '', '', err.message, new Date()
      ]]);
    }
  } finally {
    lock.releaseLock();
  }

  const sh2 = getSS().getSheetByName('LaporanGuru_Request');
  if (sh2 && sh2.getLastRow() >= 2) {
    const h2 = sh2.getRange(1, 1, 1, sh2.getLastColumn()).getValues()[0];
    const statusColIdx = h2.indexOf('Status') + 1;
    const statusValues = sh2.getRange(2, statusColIdx, sh2.getLastRow() - 1, 1).getValues();
    if (statusValues.some(r => r[0] === 'Menunggu')) _scheduleLaporanGuruTickV2();
  }
}

// ============================================================================
// TO BE CONTINUED -- placeholder aman, belum diimplementasikan penuh:
// - Nilai mapel (Leger/TP-KD) di rapor: menunggu struktur sheet Leger.
// - Mufrodat: menunggu struktur data.
// - Input Adab per pekan/semester: menunggu keputusan format penilaian.
// Fungsi saveAdabPTSV2 di atas SUDAH bisa dipakai untuk simpan nilai Adab per
// periode PTS/PAS -- yang belum ada baru form frontend-nya.
// ============================================================================