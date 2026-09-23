-- CQlass: Laporan Bulanan Tahfizh (Kabid) + Nilai UKJ (Kabid)
-- Jalankan di Supabase SQL editor, atau via `supabase db push` bila memakai CLI.

create extension if not exists pgcrypto;

-- 1) Laporan bulanan progres tahfizh per siswa, per rentang periode (tanggal - tanggal)
create table if not exists tahfizh_monthly_reports (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  class_id uuid not null references classes(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  target_bulan text,
  pencapaian_akhir text,
  juz text,
  tilawah_bbq text,
  created_by_account_id uuid references user_accounts(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tahfizh_monthly_reports_period_valid check (period_end >= period_start)
);

create index if not exists idx_tahfizh_monthly_reports_student on tahfizh_monthly_reports(student_id);
create index if not exists idx_tahfizh_monthly_reports_class on tahfizh_monthly_reports(class_id);
create index if not exists idx_tahfizh_monthly_reports_period on tahfizh_monthly_reports(period_start, period_end);

-- Satu siswa hanya boleh punya satu laporan aktif per rentang periode yang identik
-- (edit ulang periode yang sama akan meng-update baris ini, bukan bikin duplikat)
create unique index if not exists uq_tahfizh_monthly_reports_student_period
  on tahfizh_monthly_reports(student_id, period_start, period_end);

-- 2) Nilai UKJ (hasil ujian kenaikan juz), dicatat oleh Kabid Tahfizh
create table if not exists tahfizh_ukj_scores (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  class_id uuid not null references classes(id) on delete cascade,
  juz text not null,
  nilai_kelancaran numeric(5,2),
  nilai_makhraj numeric(5,2),
  nilai_mad numeric(5,2),
  nilai_ghunnah numeric(5,2),
  catatan text,
  tanggal date not null default current_date,
  created_by_account_id uuid references user_accounts(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_tahfizh_ukj_scores_student on tahfizh_ukj_scores(student_id);
create index if not exists idx_tahfizh_ukj_scores_class on tahfizh_ukj_scores(class_id);
create index if not exists idx_tahfizh_ukj_scores_tanggal on tahfizh_ukj_scores(tanggal);

-- RLS: akses hanya lewat service role di edge function (pola yang sama dgn tabel lain di app ini)
alter table tahfizh_monthly_reports enable row level security;
alter table tahfizh_ukj_scores enable row level security;
