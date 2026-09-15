# Rapor PTS SMP Tahfizhpreneur Cahaya Qur'an

Web terpisah untuk pengumpulan nilai PTS SMP dengan pola **download template → isi Excel → upload → cetak PDF**.

## Konsep data

Tidak menggunakan Supabase CQlass SD. Penyimpanan file diarahkan ke Google Drive root:

- Root folder ID: `18ot3_A8wgHJ0KUOTW6mlfdeyVV42k4JG`
- `00_MASTER` — file master/template
- `01_UPLOAD_GURU/<kelas>/<mapel>` — upload guru mapel dan tahfizh
- `02_UPLOAD_WALAS/<kelas>` — upload wali kelas
- `03_PDF_RAPOR/<kelas>` — PDF rapor hasil cetak

Folder yang belum ada dibuat otomatis oleh Apps Script saat pertama dipakai.

## Tiga format input

1. **Guru Mapel**: TP 1–TP 5 dan catatan guru untuk satu mata pelajaran.
2. **Guru Tahfizh**: materi hafalan, LP, realisasi, jumlah surat/baris/ayat, persentase, ujian kenaikan juz.
3. **Wali Kelas**: absensi, ekstrakurikuler, prestasi/kegiatan, pembinaan dan pelanggaran.

## Menjalankan web

Buka `index.html` melalui static hosting. Semua fungsi download template, import, validasi, preview, dan PDF bisa dicoba tanpa backend. Data percobaan tersimpan di `localStorage` browser.

## Menghubungkan Google Drive

1. Buat project baru di Google Apps Script.
2. Salin isi `apps-script/Code.gs`.
3. Deploy → **New deployment** → Web app.
4. Execute as: pemilik akun Drive.
5. Who has access: akun yang akan menggunakan aplikasi / sesuai kebijakan sekolah.
6. Salin URL `/exec` ke menu **Pengaturan → Apps Script Web App URL** di web.

Setelah URL terisi, upload Excel akan tetap digabung ke browser untuk proses rapor sekaligus dikirim ke Google Drive.

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
