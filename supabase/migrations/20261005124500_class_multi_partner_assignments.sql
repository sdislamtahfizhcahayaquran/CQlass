create table if not exists public.class_partner_assignments (
  id uuid primary key default gen_random_uuid(),
  school_unit_id uuid not null references public.school_units(id) on delete cascade,
  academic_year_id uuid not null references public.academic_years(id) on delete cascade,
  semester_no smallint not null check (semester_no in (1,2)),
  class_id uuid not null references public.classes(id) on delete cascade,
  teacher_id uuid not null references public.teachers(id) on delete cascade,
  is_primary boolean not null default false,
  is_active boolean not null default true,
  created_by uuid null references public.user_accounts(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (academic_year_id, semester_no, class_id, teacher_id)
);

create index if not exists class_partner_assignments_teacher_idx
  on public.class_partner_assignments (academic_year_id, semester_no, teacher_id, is_active);

create index if not exists class_partner_assignments_class_idx
  on public.class_partner_assignments (academic_year_id, semester_no, class_id, is_active);

alter table public.class_partner_assignments enable row level security;

insert into public.class_partner_assignments
  (school_unit_id, academic_year_id, semester_no, class_id, teacher_id, is_primary, is_active)
select c.school_unit_id, r.academic_year_id, r.semester_no, r.class_id, r.partner_teacher_id, true, true
from public.report_class_assignments r
join public.classes c on c.id=r.class_id
where r.partner_teacher_id is not null
on conflict (academic_year_id, semester_no, class_id, teacher_id)
do update set is_primary=true, is_active=true, updated_at=now();
