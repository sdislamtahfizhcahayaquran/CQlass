-- Nilai Pramuka (wajib semua siswa, hanya Rapor IKM akhir semester). Diisi akun yang punya role tambahan
-- "Pembina Pramuka" (dibagikan Admin di Guru & Pengguna). Role ini tidak menggeser role utama saat login.
insert into public.role_catalog(role_code,display_name,description,is_active,updated_at)
values('pembina_pramuka','Pembina Pramuka','Role tambahan: mengisi nilai Pramuka semua kelas untuk Rapor IKM. Role utama akun (Guru/Walas) tetap.',true,now())
on conflict(role_code) do nothing;

create table if not exists public.pramuka_assessments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  class_id uuid references public.classes(id) on delete set null,
  academic_year_id uuid not null references public.academic_years(id) on delete cascade,
  semester_no smallint not null check (semester_no in (1,2)),
  grade text check (grade in ('A','B','C','D')),
  version integer not null default 1,
  updated_by uuid,
  updated_at timestamptz not null default now(),
  unique (student_id, academic_year_id, semester_no)
);
alter table public.pramuka_assessments enable row level security;
-- Only Edge Functions (service role) read and write this table.
revoke all on public.pramuka_assessments from anon, authenticated;
