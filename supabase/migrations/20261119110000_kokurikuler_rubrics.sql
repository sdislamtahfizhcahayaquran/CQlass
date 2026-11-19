-- Rubrik kokurikuler (PjBL) per tahun ajaran, semester, dan jenjang. Diunggah Akademik/Admin lewat academic-master-tp.
-- Dipakai input walas (tab Kokurikuler) dan Rapor IKM bagian B. Rubrik periode lama tidak berubah saat periode baru diunggah.
create table if not exists public.kokurikuler_rubrics (
  id uuid primary key default gen_random_uuid(),
  academic_year_id uuid not null references public.academic_years(id) on delete cascade,
  semester_no smallint not null check (semester_no in (1,2)),
  grade_level smallint not null check (grade_level between 1 and 6),
  data jsonb not null,
  source_file text,
  updated_by uuid,
  updated_at timestamptz not null default now(),
  unique (academic_year_id, semester_no, grade_level)
);
alter table public.kokurikuler_rubrics enable row level security;
-- Only Edge Functions (service role) read and write this table.
revoke all on public.kokurikuler_rubrics from anon, authenticated;
