# Rapor Akhir Semester (tahap 1)

Pengganti sheet cetak `X…` dari file Excel rapor (LEVEL ATAS / LEVEL BAWAH), kecuali XDESK.

## Halaman yang dicetak (A4, Bahasa Indonesia atau English)
1. Nilai Rapor (XNILAI): KKTP, nilai akhir + terbilang, kepribadian, ketidakhadiran, tanda tangan.
2. Penilaian Psikomotorik (XPSIK): PBL, program intra, ekskul & lomba. "Pekan bahasa" kini punya isian sendiri (di Excel ikut nilai Tasmi').
3. Penilaian Kognitif Umum (XKOGU) dan 4. Diniyah (XKOGD): satu baris per TP, centang A–D dari nilai TP.
5. Penilaian Sikap (XSIK): kategori A–F.
6. Komentar Umum (XKOM).

Rapor IKM (XDESK: deskripsi capaian, kokurikuler, ekskul yang diikuti + Pramuka wajib) menyusul sebagai halaman terpisah.

## Sumber data
- Nilai akhir = rumus legger CQlass: Rata Tugas 10% + Rata TP 30% + WWP 10% + ASAS 50%, dibulatkan; kosong bila komponen belum lengkap.
- Centang kognitif per TP: A ≥ 89, B ≥ 82, C ≥ 75, D < 75 (ambang sheet RKU di Excel).
- Kepribadian, sikap, psikomotorik, komentar: diisi walas di menu **Rapor & Penilaian → Input Rapor Semester** (tabel `semester_report_entries`).
- Identitas, kehadiran, tanda tangan: sama dengan rapor PTS (report-preview-v2).

## Komponen
- Migrasi: `supabase/migrations/20261118090000_semester_report_entries.sql`
- Rute: `/admin-academic-period/semester-report` (`bootstrap`, `load`, `save` untuk walas semester aktif; `print_data` untuk walas kelas tsb. atau admin/pimpinan/akademik). Memakai fungsi yang sudah ada karena kuota Edge Function penuh.
- Frontend: `semester-report-walas.js` (input), `semester-report-print.js` (template), cabang Akhir Semester + pilihan bahasa di Cetak Rapor (`app-core.js`).

## Pemeriksaan
`node tests/semester-report.test.cjs`; pratinjau statis di Chrome dengan data contoh: 11 halaman, tanpa teks terpotong (ID & EN).
