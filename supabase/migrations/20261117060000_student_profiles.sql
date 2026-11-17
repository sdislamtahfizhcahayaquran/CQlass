-- Full student biodata imported by Admin from the school's master Excel.
-- Read/written only through the student-profiles Edge Function (service role).
create table if not exists public.student_profiles (
  student_id uuid primary key references public.students(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  photo_url text,
  source_file text,
  updated_by uuid,
  updated_at timestamptz not null default now()
);
alter table public.student_profiles enable row level security;
revoke all on table public.student_profiles from anon, authenticated;
