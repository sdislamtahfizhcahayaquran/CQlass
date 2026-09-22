-- CQlass: recurring weekly teacher activities for Timesheet
create table if not exists public.teacher_recurring_activities (
  id uuid primary key default gen_random_uuid(),
  school_unit_id uuid not null references public.school_units(id) on delete cascade,
  academic_year_id uuid not null references public.academic_years(id) on delete cascade,
  semester_no smallint not null check (semester_no in (1,2)),
  teacher_id uuid not null references public.teachers(id) on delete cascade,
  activity_name text not null check (length(btrim(activity_name)) between 1 and 160),
  days_of_week smallint[] not null,
  start_time time without time zone not null,
  end_time time without time zone not null,
  note text,
  is_active boolean not null default true,
  created_by_account_id uuid references public.user_accounts(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint teacher_recurring_days_not_empty check (cardinality(days_of_week) > 0),
  constraint teacher_recurring_days_valid check (days_of_week <@ array[1,2,3,4,5]::smallint[]),
  constraint teacher_recurring_time_valid check (start_time < end_time)
);

create index if not exists teacher_recurring_activities_lookup_idx
  on public.teacher_recurring_activities (academic_year_id, semester_no, teacher_id, is_active);

alter table public.teacher_recurring_activities enable row level security;
revoke all on table public.teacher_recurring_activities from anon, authenticated;

comment on table public.teacher_recurring_activities is
  'Weekly teacher Timesheet patterns projected into daily Timesheet; accessed only through authenticated Edge Functions.';
