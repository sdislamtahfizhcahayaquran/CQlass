-- Rapor Akhir Semester: walas input per student (kepribadian, sikap, psikomotorik, komentar).
-- Academic values (nilai, kognitif) are computed from academic_scores, not stored here.
-- Read/written only through the /admin-academic-period/semester-report route (service role).
create table if not exists public.semester_report_entries (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  class_id uuid not null references public.classes(id),
  academic_year_id uuid not null references public.academic_years(id),
  semester_no smallint not null check (semester_no in (1,2)),
  data jsonb not null default '{}'::jsonb,
  version integer not null default 1 check (version > 0),
  updated_by uuid not null references public.user_accounts(id),
  updated_at timestamptz not null default now(),
  unique (student_id, academic_year_id, semester_no)
);
alter table public.semester_report_entries enable row level security;
revoke all on public.semester_report_entries from public, anon, authenticated;
grant select, insert, update on public.semester_report_entries to service_role;
create index if not exists semester_report_entries_class_idx on public.semester_report_entries(class_id, academic_year_id, semester_no);
create index if not exists semester_report_entries_updated_by_idx on public.semester_report_entries(updated_by);
comment on table public.semester_report_entries is 'Rapor Akhir Semester walas input; accessed only via session-validated semester-report route';
