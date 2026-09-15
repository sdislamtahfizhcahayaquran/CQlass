# Rapor PTS SMP Tahfizhpreneur Cahaya Qur'an

Web terpisah untuk pengumpulan nilai PTS SMP dengan pola **download template → isi Excel → upload → cetak PDF**.

## Konsep data

Tidak menggunakan Supabase CQlass SD. Penyimpanan file khusus SMP menggunakan akun Google Drive:

- Akun: `sditcqdepok@gmail.com`
- Root folder: **Rapor SMP Tahfizhpreneur**
- `00_MASTER` — file master/template
- `01_UPLOAD_GURU/<kelas>/<mapel>` — upload guru mapel dan tahfizh
- `02_UPLOAD_WALAS/<kelas>` — upload wali kelas
- `03_PDF_RAPOR/<kelas>` — PDF rapor hasil cetak

**Catatan keamanan:** tidak ada lagi fallback ke folder Drive akun kurikulum. Backend Apps Script hanya membaca root folder dari Script Property `ROOT_FOLDER_ID`. Jika properti itu belum diisi, upload ke Drive akan ditolak agar file tidak pernah tersimpan ke akun yang salah.

## Tiga format input

1. **Guru Mapel**: TP 1–TP 5 dan catatan guru untuk satu mata pelajaran.
2. **Guru Tahfizh**: materi hafalan, LP, realisasi, jumlah surat/baris/ayat, persentase, ujian kenaikan juz.
3. **Wali Kelas**: absensi, ekstrakurikuler, prestasi/kegiatan, pembinaan dan pelanggaran.

## Menjalankan web

Buka `index.html` melalui static hosting. Semua fungsi download template, import, validasi, preview, dan PDF bisa dicoba tanpa backend. Data percobaan tersimpan di `localStorage` browser.

## Menghubungkan Google Drive SMP

1. Login ke akun `sditcqdepok@gmail.com`.
2. Buat / gunakan folder **Rapor SMP Tahfizhpreneur**.
3. Catat ID folder tersebut.
4. Buat project Google Apps Script dari akun yang sama.
5. Salin isi `apps-script/Code.gs`.
6. Buka **Project Settings → Script Properties** lalu buat `ROOT_FOLDER_ID` dengan nilai ID folder SMP.
7. Deploy → **New deployment** → Web app.
8. Execute as: pemilik akun Drive SMP.
9. Who has access: akun yang akan menggunakan aplikasi / sesuai kebijakan sekolah.
10. Salin URL `/exec` ke menu **Pengaturan → Apps Script Web App URL** di web.

Setelah URL terisi, upload Excel akan tetap digabung ke browser untuk proses rapor sekaligus dikirim ke Google Drive SMP.

## Format rapor

Output mengikuti struktur file `Master Raport PTS SMP 26-27.xlsx`:

- identitas siswa,
- laporan prestasi Tahfizh,
- penilaian mapel TP 1–TP 5 + KKTP,
- ketidakhadiran,
- kegiatan siswa,
- pembinaan akhlak dan kedisiplinan,
- tanda tangan,
- tim guru kelas.

Menu **Cetak Rapor** menyediakan PDF satu siswa dan satu kelas.
