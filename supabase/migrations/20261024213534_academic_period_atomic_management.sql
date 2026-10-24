-- Period management is one transaction, callable only by the authenticated
-- admin Edge Function's service client. No values/scores are copied or removed.
insert into public.semesters (academic_year_id, semester_no, is_active)
select y.id, n, false from public.academic_years y cross join generate_series(1,2) n
on conflict (academic_year_id, semester_no) do nothing;

-- A revision must change even for two updates within one transaction.
-- Scope this trigger to periods; leave other tables' timestamp behavior intact.
create or replace function public.cq_period_updated_at_v1()
returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
  new.updated_at := greatest(clock_timestamp(), old.updated_at + interval '1 microsecond');
  return new;
end;
$$;
drop trigger if exists trg_academic_years_updated on public.academic_years;
create trigger trg_academic_years_updated before update on public.academic_years
for each row execute function public.cq_period_updated_at_v1();
create trigger trg_semesters_period_updated before update on public.semesters
for each row execute function public.cq_period_updated_at_v1();

create or replace function public.cq_manage_academic_period_v1(
  p_school_unit_id uuid, p_action text, p_payload jsonb
) returns jsonb language plpgsql security invoker
set search_path = public, pg_temp
as $$
declare
  v_year public.academic_years%rowtype;
  v_sem public.semesters%rowtype;
  v_name text := trim(p_payload->>'name');
  v_year_id uuid;
  v_no integer;
  v_start date; v_end date;
  v_s1 date; v_e1 date; v_s2 date; v_e2 date;
  v_current jsonb;
begin
  -- Serialize all changes for the same school. Failed writes roll back in full.
  perform 1 from public.school_units where id=p_school_unit_id for update;
  if not found then raise exception 'school_unit_missing'; end if;

  if p_action='create_year' then
    if v_name is null or v_name !~ '^[0-9]{4}/[0-9]{4}$' then
      raise exception 'academic_year_invalid';
    end if;
    if split_part(v_name,'/',1)::integer < 1900 or
       split_part(v_name,'/',2)::integer <> split_part(v_name,'/',1)::integer+1 then
      raise exception 'academic_year_invalid';
    end if;
    if exists(select 1 from public.academic_years where school_unit_id=p_school_unit_id and name=v_name) then
      raise exception 'academic_year_exists';
    end if;
    insert into public.academic_years(school_unit_id,name,is_active)
      values(p_school_unit_id,v_name,false) returning id into v_year_id;
    insert into public.semesters(academic_year_id,semester_no,is_active)
      values(v_year_id,1,false),(v_year_id,2,false);
    return jsonb_build_object('success',true,'academic_year_id',v_year_id);
  end if;

  v_year_id := (p_payload->>'academic_year_id')::uuid;
  select * into v_year from public.academic_years
    where id=v_year_id and school_unit_id=p_school_unit_id for update;
  if not found then raise exception 'academic_year_not_found'; end if;

  if p_action='save_dates' then
    if not (p_payload ? 'expected_updated_at') or
       (p_payload->>'expected_updated_at')::timestamptz is distinct from v_year.updated_at then
      raise exception 'period_changed';
    end if;
    v_start:=(p_payload->>'start_date')::date;
    v_end:=(p_payload->>'end_date')::date;
    v_s1:=(p_payload->>'semester1_start')::date;
    v_e1:=(p_payload->>'semester1_end')::date;
    v_s2:=(p_payload->>'semester2_start')::date;
    v_e2:=(p_payload->>'semester2_end')::date;
    if v_start is null or v_end is null or v_s1 is null or v_e1 is null or v_s2 is null or v_e2 is null then
      raise exception 'period_dates_required';
    end if;
    if not (v_start<=v_s1 and v_s1<=v_e1 and v_e1<v_s2 and v_s2<=v_e2 and v_e2<=v_end) then
      raise exception 'period_dates_invalid';
    end if;
    update public.academic_years set start_date=v_start,end_date=v_end,updated_at=clock_timestamp() where id=v_year_id;
    insert into public.semesters(academic_year_id,semester_no,start_date,end_date,is_active)
      values(v_year_id,1,v_s1,v_e1,false),(v_year_id,2,v_s2,v_e2,false)
      on conflict(academic_year_id,semester_no) do update
      set start_date=excluded.start_date,end_date=excluded.end_date,updated_at=clock_timestamp();
    return jsonb_build_object('success',true);
  end if;

  if p_action='activate_period' then
    v_no:=(p_payload->>'semester_no')::integer;
    if v_no is null or v_no not in (1,2) then raise exception 'period_invalid'; end if;
    select * into v_sem from public.semesters where academic_year_id=v_year_id and semester_no=v_no for update;
    if not found then raise exception 'semester_not_found'; end if;
    select coalesce(jsonb_agg(jsonb_build_object('year_id',y.id,'semester_no',s.semester_no,
      'year_revision',y.updated_at,'semester_revision',s.updated_at) order by y.id,s.semester_no),'[]'::jsonb)
      into v_current from public.academic_years y left join public.semesters s
      on s.academic_year_id=y.id and s.is_active
      where y.school_unit_id=p_school_unit_id and y.is_active;
    if not (p_payload ? 'expected_active') or p_payload->'expected_active' is distinct from v_current then
      raise exception 'period_changed';
    end if;
    if v_year.is_active and v_sem.is_active then return jsonb_build_object('success',true,'unchanged',true); end if;
    if v_year.start_date is null or v_year.end_date is null or v_sem.start_date is null or v_sem.end_date is null then
      raise exception 'period_dates_required';
    end if;
    if not exists(select 1 from public.student_enrollments e join public.classes c on c.id=e.class_id
      where e.academic_year_id=v_year_id and e.semester_no=v_no and e.is_active
      and c.academic_year_id=v_year_id and c.school_unit_id=p_school_unit_id and c.is_active) then
      raise exception 'period_not_ready';
    end if;
    update public.semesters s set is_active=false,updated_at=clock_timestamp()
      from public.academic_years y where s.academic_year_id=y.id and y.school_unit_id=p_school_unit_id and s.is_active;
    update public.academic_years set is_active=false,updated_at=clock_timestamp()
      where school_unit_id=p_school_unit_id and is_active;
    update public.academic_years set is_active=true,updated_at=clock_timestamp() where id=v_year_id;
    update public.semesters set is_active=true,updated_at=clock_timestamp() where id=v_sem.id;
    return jsonb_build_object('success',true);
  end if;
  raise exception 'unknown_action';
end;
$$;

revoke all on function public.cq_manage_academic_period_v1(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.cq_manage_academic_period_v1(uuid,text,jsonb) to service_role;
