-- KKM satuan pendidikan per tahun ajaran (diubah oleh Akademik/Admin lewat academic-master-tp).
-- Dipakai Rapor IKM (judul "Kriteria Ketuntasan Minimal") dan kolom KKTP rapor Nilai bila KKTP per TP kosong.
create table if not exists public.academic_year_settings (
  academic_year_id uuid primary key references public.academic_years(id) on delete cascade,
  kkm smallint not null default 70 check (kkm between 0 and 100),
  updated_by uuid,
  updated_at timestamptz not null default now()
);
alter table public.academic_year_settings enable row level security;
-- Only Edge Functions (service role) read and write this table.
revoke all on public.academic_year_settings from anon, authenticated;
