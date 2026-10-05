-- CQlass: isolated Admin teacher assignments.
-- Intentionally does not modify user_accounts or user_roles.
create table if not exists public.admin_teacher_assignments (
  id uuid primary key default gen_random_uuid(),
  school_unit_id uuid not null references public.school_units(id) on delete restrict,
  academic_year_id uuid not null references public.academic_years(id) on delete restrict,
  semester_no smallint not null check (semester_no in (1,2)),
  teacher_id uuid not null references public.teachers(id) on delete restrict,
  assignment_type text not null check (assignment_type in ('wali_kelas','guru_partner','guru_mapel','tugas_tambahan')),
  class_id uuid null references public.classes(id) on delete restrict,
  subject_id uuid null references public.subjects(id) on delete restrict,
  title text null,
  notes text null,
  is_active boolean not null default true,
  created_by uuid null references public.user_accounts(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_teacher_assignments_scope_check check (
    assignment_type = 'tugas_tambahan' or class_id is not null
  )
);
create index if not exists admin_teacher_assignments_teacher_idx
  on public.admin_teacher_assignments (academic_year_id, semester_no, teacher_id)
  where is_active;
create index if not exists admin_teacher_assignments_class_idx
  on public.admin_teacher_assignments (academic_year_id, semester_no, class_id)
  where is_active;
alter table public.admin_teacher_assignments enable row level security;
revoke all on table public.admin_teacher_assignments from anon, authenticated;
grant select, insert, update, delete on table public.admin_teacher_assignments to service_role;
