-- Penanda "sudah ditangani" untuk Pusat Pengingat Kabid Kesiswaan.
-- Hanya menyimpan kunci pengingat + siapa/kapan; data siswa tetap dibaca dari tabel sumber.
-- Kunci memuat tahap/tanggal, sehingga tahap poin baru atau rangkaian absen baru muncul lagi otomatis.
create table if not exists public.kesiswaan_reminder_acks (
  reminder_key text primary key check (length(reminder_key) between 5 and 120),
  kind text not null check (kind in ('absent', 'walas', 'kes', 'case')),
  student_id uuid,
  note text check (note is null or length(note) <= 300),
  acked_by uuid references public.user_accounts(id) on delete set null,
  acked_at timestamptz not null default now()
);

create index if not exists kesiswaan_reminder_acks_student_idx on public.kesiswaan_reminder_acks (student_id);

-- Hanya diakses Edge Function (service role).
alter table public.kesiswaan_reminder_acks enable row level security;
revoke all on public.kesiswaan_reminder_acks from anon, authenticated;
