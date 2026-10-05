alter table public.admin_teacher_assignments
  drop constraint if exists admin_teacher_assignments_assignment_type_check;
alter table public.admin_teacher_assignments
  add constraint admin_teacher_assignments_assignment_type_check
  check (assignment_type = any(array['wali_kelas','guru_partner','guru_mapel','guru_tahfizh','tugas_tambahan']::text[]));

alter table public.admin_teacher_assignments
  add column if not exists operational_table text null,
  add column if not exists operational_id uuid null,
  add column if not exists team_name text null;

create index if not exists admin_teacher_assignments_operational_idx
  on public.admin_teacher_assignments (operational_table, operational_id)
  where operational_id is not null;