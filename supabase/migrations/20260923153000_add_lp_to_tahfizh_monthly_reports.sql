-- CQlass: tambah kolom LP pada Laporan Bulanan Tahfizh.
alter table public.tahfizh_monthly_reports
  add column if not exists lp text;
