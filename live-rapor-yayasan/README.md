# CQlass Live Rapor — Yayasan (isolated)

Tujuan: viewer read-only untuk yayasan tanpa mengubah role/login CQlass utama.

## UI
- 2 card utama: **REKAPAN** dan **RAPOR**.
- REKAPAN: Kelas, Walas, progress, jumlah siswa belum lengkap, detail per siswa.
- Detail siswa memecah komponen yang benar-benar terkait rapor: identitas, mapel/nilai, Tahfizh, absensi, ekskul/kegiatan, tanggal rapor, tanda tangan walas, tanda tangan kepala sekolah.
- Setiap kekurangan menampilkan penanggung jawab.
- Dari detail siswa tersedia aksi **Lihat Rapor**.
- RAPOR: pilih kelas, preview per siswa atau preview satu kelas.
- Periode mengikuti konfigurasi rapor aktif; tidak meminta pilihan PTS/semester di halaman utama.

## Guardrail keamanan
- Folder ini berdiri sendiri dan tidak di-load oleh `index.html` CQlass utama.
- Tidak ada perubahan pada role, sidebar, autentikasi, permission, atau halaman guru CQlass.
- Tidak ada operasi tulis terhadap nilai/rapor/absensi/siswa.
- Data siswa tidak boleh dibuat menjadi endpoint anonymous tanpa gate server-side.
- Viewer produksi harus menggunakan access key read-only server-side (bukan service-role key di browser) dan `Cache-Control: no-store`.
- Source endpoint harus memakai query SELECT-only; tidak boleh memiliki aksi create/update/delete.

## Status implementasi aman
UI viewer sudah tersedia pada folder ini. Backend live sengaja **belum diaktifkan** sampai gate read-only khusus tersedia. Ini mencegah data rapor siswa menjadi endpoint publik hanya demi menghilangkan login akun.

## Kontrak endpoint yang diharapkan
POST `report-live-viewer` dengan header `x-viewer-key`.

Actions:
- `bootstrap` → periode aktif, summary, daftar kelas.
- `class_detail` → daftar siswa, status komponen, kekurangan + owner.
- `report` → hasil rapor satu siswa.
- `class_reports` → hasil rapor satu kelas.

Semua action bersifat read-only.
