-- Signature (with or without stamp) used only on Cover Rapor, drawn or uploaded
-- in the Cover Rapor page. Falls back to the teacher's report signature.
create table if not exists public.cover_signatures (
  teacher_id uuid primary key references public.teachers(id) on delete cascade,
  storage_path text not null,
  updated_by uuid,
  updated_at timestamptz not null default now()
);
alter table public.cover_signatures enable row level security;
revoke all on table public.cover_signatures from anon, authenticated;
