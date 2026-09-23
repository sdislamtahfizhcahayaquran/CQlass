alter table public.report_config
  add column if not exists data_start_date date,
  add column if not exists data_end_date date;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.report_config'::regclass
      and conname = 'report_config_data_range_check'
  ) then
    alter table public.report_config
      add constraint report_config_data_range_check
      check (data_start_date is null or data_end_date is null or data_start_date <= data_end_date);
  end if;
end $$;

create index if not exists idx_report_config_period_lookup
  on public.report_config (school_unit_id, academic_year_id, semester_no, report_type)
  where is_active = true;
