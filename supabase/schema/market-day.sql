create table public.market_day_reports (
 id uuid primary key default gen_random_uuid(),
 class_id uuid not null references public.classes(id),
 academic_year_id uuid not null references public.academic_years(id),
 semester_no smallint not null check (semester_no in (1,2)),
 data jsonb not null default '{}'::jsonb,
 status text not null check(status in ('draft','submitted')),
 version integer not null default 1 check(version>0),
 updated_by uuid not null references public.user_accounts(id),
 updated_at timestamptz not null default now(),
 unique(class_id,academic_year_id,semester_no)
);
alter table public.market_day_reports enable row level security;
revoke all on public.market_day_reports from public,anon,authenticated;
grant select,insert,update on public.market_day_reports to service_role;
create index market_day_reports_updated_by_idx on public.market_day_reports(updated_by);
create index market_day_reports_year_idx on public.market_day_reports(academic_year_id);
comment on table public.market_day_reports is 'Walas Market Day: accessed only via session-validated market-day Edge Function';
