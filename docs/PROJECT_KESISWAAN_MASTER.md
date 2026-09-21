# MASTER PROJECT KABID KESISWAAN — CQlass

**Sekolah:** SD Islam Tahfizh Cahaya Qur'an  
**Tahun Ajaran:** 2026/2027  
**Status acuan:** 21 September 2026  
**Tujuan file:** menjadi source of truth project Kesiswaan agar keputusan tidak bergantung pada riwayat chat.

---

## 1. Prinsip Final

1. Kabid Kesiswaan adalah pusat monitoring, tindak lanjut, dan laporan siswa; bukan tempat input ulang data yang sudah dicatat petugas lain.
2. Wali kelas/guru tidak dibebani form laporan tambahan hanya demi kebutuhan Kabid.
3. Aktivitas dicatat oleh pelaksana atau otomatis dari sistem; laporan menarik dari database yang sama.
4. Tidak boleh ada database duplikat untuk data yang sama.
5. Prestasi siswa adalah satu database bersama Kesiswaan dan Kabid Kegiatan.
6. UKS: guru piket yang mengirim bukti jaga; Kabid Kesiswaan memantau.
7. Reward dan pelanggaran tidak boleh terduplikasi untuk kejadian yang sama.
8. Request/Laporan Kesiswaan tidak dibebankan kepada Guru/Walas.
9. Semua laporan utama harus live dari CQlass dan dapat difilter per periode/kelas/siswa.
10. Status “sudah fix” harus dibuktikan terhadap schema/database aktif, bukan hanya tampilan frontend.

---

## 2. Hak Akses dan Alur Input

### Kabid Kesiswaan / Admin
Dapat mengelola catatan operasional Kesiswaan:
- pembinaan;
- kasus dan tindak lanjut;
- kedisiplinan/karakter;
- perizinan/kepulangan;
- kesehatan siswa;
- komunikasi orang tua;
- catatan siswa;
- prestasi siswa sesuai hak akses.

### Kabid Kegiatan
- berbagi satu database Prestasi Siswa dengan Kesiswaan;
- tidak mendapatkan seluruh menu Kesiswaan.

### Pimpinan
- akses laporan/read-only sesuai backend;
- tidak menjadi petugas input operasional Kesiswaan.

### Guru/Walas/Guru Tahfizh
- melakukan input aktivitas yang memang menjadi tugasnya;
- tidak mengisi laporan rekap Kesiswaan kedua kali.

Role database `kabid_kesiswaan` dinormalisasi oleh autentikasi menjadi `kesiswaan` sehingga menu/hak akses frontend menggunakan role konsisten.

---

## 3. Modul Laporan Kesiswaan

Laporan live Kesiswaan memiliki area:
- Ringkasan;
- Kehadiran;
- Reward & Pelanggaran;
- Pembinaan & Kasus;
- Layanan Siswa;
- Prestasi;
- Jaga UKS;
- Monitoring Input;
- Profil Siswa.

Filter utama:
- pencarian;
- kelas;
- tanggal mulai;
- tanggal akhir.

Output:
- tampilan live;
- Cetak/PDF melalui print view;
- XLSX native multi-sheet.

Workbook XLSX berisi sheet:
- Ringkasan;
- Kehadiran;
- Reward;
- Pelanggaran;
- Kasus;
- Layanan Kesiswaan;
- Prestasi;
- Jaga UKS;
- Monitoring Input;
- Profil Siswa.

---

## 4. Sumber Data Laporan

Backend `student-affairs-center` membaca langsung:
- `students`;
- `classes`;
- `student_enrollments`;
- `morning_talk_attendance_history`;
- `attendance_report_finalization`;
- `student_rewards`;
- `discipline_incidents`;
- `student_case_notes`;
- `student_affairs_records`;
- `student_achievements`;
- `uks_duty_reports`.

Nama kelas dibentuk dari kolom schema nyata (`name`, `grade_level`, `rombel`, `gender_group`) dan tidak lagi bergantung pada kolom database `class_name` yang tidak ada.

Bug fatal yang pernah ada: query Morning Talk membaca kolom `note` yang tidak tersedia di `morning_talk_attendance_history`. Bug tersebut telah dihapus pada backend v4; respons tetap mengembalikan `note: null` agar frontend konsisten.

---

## 5. Status Backend Kesiswaan

Edge Function: `student-affairs-center`  
Status: **ACTIVE**  
Versi: **4**

Source backend juga disimpan di repo:
`supabase/functions/student-affairs-center/index.ts`

Commit sinkronisasi source live:
`c9b379e1b83130508af890018ab0336e453b5147`

Permission utama:
- report: Kesiswaan / Pimpinan / Admin;
- affairs input: Kesiswaan / Admin;
- achievement input: Kesiswaan / Kegiatan / Admin;
- Pimpinan tidak menjadi editor operasional.

---

## 6. Verifikasi Data Live 1–21 September 2026

Pada audit terakhir database live:
- roster/enrollment aktif: **555 siswa**;
- histori kehadiran Morning Talk: **173 baris**;
- reward terverifikasi: **851 baris**;
- pelanggaran: **511 baris**;
- kasus siswa: **5 baris**;
- laporan jaga UKS: **6 baris**;
- finalisasi absensi dalam rentang audit: **91 baris**;
- `student_affairs_records`: **0** pada saat audit;
- `student_achievements`: **0** pada saat audit.

Nilai 0 pada affairs/achievements berarti belum ada record baru pada tabel tersebut saat audit, bukan error bootstrap.

---

## 7. Reward & Pelanggaran

Rekap Kesiswaan membaca data live dari tabel sumber, tidak membuat salinan baru.

Monitoring kelengkapan input memakai Edge Function `student-point-input-audit`.

Target monitoring final:
- Wali Kelas: **22 guru**;
- Guru Tahfizh: **24 guru**;
- unik setelah digabung: **46 guru**;
- seluruh target memiliki akun terhubung pada audit terakhir.

Hari yang dihitung untuk monitoring:
**Senin–Jumat**.

Output monitoring:
- hari tanpa input reward dan pelanggaran;
- hari belum input pelanggaran;
- hari belum input reward;
- tanggal kosong;
- input pelanggaran terakhir;
- input reward terakhir.

Kabid/Pimpinan/Admin tidak dihitung sebagai pihak yang “belum input” dalam rekap Walas/Guru Tahfizh.

---

## 8. UKS

### Jadwal
Jadwal disimpan di `uks_duty_schedule` dan dapat mempunyai lebih dari satu guru per shift.

### Bukti Jaga
Guru piket:
- membuka kamera realtime melalui `getUserMedia`;
- mengambil foto langsung;
- tidak menggunakan galeri/file picker sebagai jalur bukti;
- hanya dapat mengirim sesuai assignment/jadwal yang valid;
- satu laporan per guru/shift/hari.

Laporan disimpan di `uks_duty_reports` dan foto pada bucket UKS terkait.

### Inbox Kesiswaan
Menu `Laporan Jaga UKS` menampilkan:
- foto;
- guru;
- hari/tanggal;
- shift;
- jam terjadwal;
- waktu pengambilan/pengiriman.

Kabid Kesiswaan tidak mengisi laporan UKS atas nama guru.

---

## 9. UKS ↔ Timesheet

Edge Function `teacher-work-schedule` telah diperbarui ke **version 2**.

Perubahan final:
- role Kabid dinormalisasi dengan benar untuk mode review;
- semester memakai semester aktif, tidak lagi bergantung penuh pada hardcode semester 1 pada fungsi ini;
- jadwal UKS otomatis dibaca dari `uks_duty_schedule`;
- setiap tanggal sesuai weekday menghasilkan aktivitas otomatis `Jaga UKS` di jadwal kerja/Timesheet;
- status menampilkan:
  - `Laporan foto terkirim` jika bukti sudah ada;
  - `Belum ada laporan foto` untuk jadwal yang sudah lewat tanpa bukti;
  - `Terjadwal` untuk jadwal masa depan.

Source tersimpan di:
`supabase/functions/teacher-work-schedule/index.ts`

Commit:
`adacf47cb42dbacf031d62d35d4f5953200fe603`

Verifikasi jadwal UKS aktif pada saat audit:
- 12 slot assignment aktif;
- 12 guru berbeda;
- jadwal September 2026 menghasilkan 53 baris aktivitas UKS otomatis bila diekspansi berdasarkan weekday.

---

## 10. Timesheet — Aturan Kerja yang Dipertahankan

Konsep: **1 guru = 1 timesheet**.

Aktivitas otomatis yang menjadi sumber Timesheet:
- jadwal mengajar;
- badal/digantikan;
- jadwal kerja rutin;
- briefing;
- penyambutan siswa;
- administrasi/Eduhub;
- kegiatan Sabtu yang terjadwal;
- jaga UKS dari jadwal UKS.

Aktivitas manual hanya untuk pekerjaan non-mengajar yang memang belum memiliki sumber jadwal sistem.

Jadwal kerja yang pernah diputuskan:
- Briefing Selasa–Jumat: **07.00–07.10**;
- Piket gerbang: **07.00–07.30**;
- Penyambutan siswa di kelas bagi yang tidak piket gerbang: **07.10–07.30**;
- Administrasi/Eduhub Senin–Jumat: **15.00–16.00**.

Identitas yang harus konsisten:
**Anis = Khoerunnisa, S.Kom.**

---

## 11. Prestasi Siswa

Prestasi memakai satu tabel `student_achievements`.

Editor sesuai backend:
- Kesiswaan;
- Kabid Kegiatan;
- Admin.

Pimpinan melihat sebagai laporan.

Wali kelas tidak perlu membuat record prestasi kedua hanya untuk kebutuhan laporan Kesiswaan.

---

## 12. Placeholder Lama yang Dihapus

Menu lama `Laporan > Unduh Rekap` pernah masih `built:false`.

Karena Laporan Kesiswaan baru sudah memiliki output PDF dan XLSX, placeholder lama tersebut dihapus pada runtime sidebar melalui:
`kesiswaan-final-cleanup.js`

Commit terkait:
- `a1cc11e778429e1d0172cc67e33dcde850c3e7da`
- `3256667f3e9908181a14a1330dac9aa98edcf405`

---

## 13. XLSX Native

Tombol `Unduh Excel` sebelumnya hanya membuat CSV dengan ekstensi `.csv`.

Sekarang tersedia patch:
`kesiswaan-excel-xlsx.js`

yang menghasilkan workbook `.xlsx` asli memakai SheetJS dan mengambil data report langsung dari Edge Function aktif.

Commit:
- `8598ad0f990fe8dd0e7e78363bc1f55333c418f3`
- loader: `7c3fc7cd2f61c80a1cef8523fd0ba870278dafe0`

---

## 14. Keamanan Kesiswaan yang Sudah Diperbaiki

### Trigger nihil confirmation
Fungsi trigger `public.enforce_student_affairs_nihil_owner()` adalah SECURITY DEFINER dan tidak perlu dieksekusi langsung oleh publik.

Migration:
`restrict_student_affairs_nihil_trigger_function`

Tindakan:
- mencabut EXECUTE dari `public`, `anon`, dan `authenticated`;
- fungsi tetap dapat bekerja sebagai trigger internal.

### Attendance source
Dua tabel sumber laporan Kesiswaan sebelumnya terekspos di schema public tanpa RLS:
- `morning_talk_attendance_history`;
- `attendance_report_finalization`.

Migration:
`protect_kesiswaan_attendance_sources`

Tindakan:
- mengaktifkan RLS pada kedua tabel;
- query service-role Edge Function tetap terverifikasi bekerja.

Catatan: masih terdapat security advisor findings lain pada project CQlass secara keseluruhan yang tidak khusus Kesiswaan. Jangan menganggap seluruh project bebas warning hanya karena area Kesiswaan ini sudah diperketat.

---

## 15. Request Laporan / Saran & Masukan

Keputusan final:
- Request/Laporan Kesiswaan tidak diberikan sebagai beban input Walas/Guru;
- logic sidebar yang ada membersihkan Request Laporan dari Walas;
- jalur Saran & Masukan tetap dipakai untuk kebutuhan laporan internal sesuai kategori.

SAPRAS dan non-SAPRAS tetap mengikuti routing role yang telah dirancang pada modul internal report center.

---

## 16. Checklist Saat Melanjutkan Project

Sebelum perubahan baru:
1. baca file master ini;
2. cek schema database aktif sebelum menulis query;
3. cek Edge Function yang benar-benar ACTIVE;
4. cek role yang dikirim auth, jangan mengandalkan nama role mentah;
5. jangan membuat tabel rekap duplikat bila data sumber sudah ada;
6. jika mengubah backend live, sinkronkan source yang sama ke `supabase/functions/...` di repo;
7. validasi dengan data nyata setelah deploy;
8. jangan mengklaim “100% fix” hanya karena frontend tampil.

---

## 17. Source of Truth Teknis

File utama yang harus diperiksa bila ada bug Kesiswaan:
- `student-affairs-center.js` — UI input operasional Kesiswaan;
- `kesiswaan-super-report.js` — UI laporan super;
- `kesiswaan-excel-xlsx.js` — XLSX native;
- `kesiswaan-point-input-audit.js` — UI monitoring input;
- `uks-duty.js` — kamera/laporan guru piket;
- `uks-duty-kesiswaan.js` — inbox Kesiswaan;
- `teacher-timesheet-v2.js` — UI Timesheet;
- `supabase/functions/student-affairs-center/index.ts` — backend laporan/input Kesiswaan;
- `supabase/functions/teacher-work-schedule/index.ts` — jadwal kerja + UKS otomatis;
- Edge Function `student-point-input-audit` — monitoring reward/pelanggaran;
- Edge Function `uks-duty` — jadwal/pelaporan UKS.

---

## 18. Definisi Selesai

Project Kesiswaan dianggap sehat jika:
- Kabid dapat melihat report tanpa error schema;
- data siswa berasal dari enrollment aktif;
- kehadiran/reward/pelanggaran/kasus/UKS tampil dari data live;
- input affairs dan prestasi tersimpan di tabel sumber yang benar;
- monitoring hanya membebankan Walas/Guru Tahfizh yang relevan;
- UKS kamera-only tetap berjalan;
- jaga UKS muncul otomatis di Timesheet dari jadwal;
- output PDF dan XLSX dapat digunakan;
- role tidak bocor ke pihak yang tidak berwenang;
- source backend live tersimpan di repo agar tidak ada drift deploy-vs-code.

File ini menggantikan ketergantungan pada percakapan lama sebagai acuan teknis Project Kabid Kesiswaan.
