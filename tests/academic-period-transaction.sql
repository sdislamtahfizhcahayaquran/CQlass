-- Execute inside BEGIN/ROLLBACK, after loading the migration in that transaction.
-- Test changes must never be committed.
do $$
declare
 u uuid; y uuid; created uuid; rev timestamptz; snap jsonb; result jsonb;
 before_years bigint; active_before jsonb; failure text;
begin
 select school_unit_id,id into u,y from public.academic_years where is_active limit 1;
 if u is null then raise exception 'test needs an active school'; end if;
 select count(*) into before_years from public.academic_years;
 result:=public.cq_manage_academic_period_v1(u,'create_year','{"name":"2098/2099"}'::jsonb);
 created:=(result->>'academic_year_id')::uuid;
 if (select count(*) from public.semesters where academic_year_id=created)<>2 then raise exception 'FAIL missing semesters'; end if;
 if exists(select 1 from public.academic_years where id=created and is_active) then raise exception 'FAIL new year activated'; end if;
 begin
   perform public.cq_manage_academic_period_v1(u,'create_year','{"name":"2098/2099"}');
   raise exception 'FAIL duplicate accepted';
 exception when others then if sqlerrm<>'academic_year_exists' then raise; end if; end;
 begin
   perform public.cq_manage_academic_period_v1(u,'create_year','{"name":"2098/2100"}');
   raise exception 'FAIL invalid name accepted';
 exception when others then if sqlerrm<>'academic_year_invalid' then raise; end if; end;
 select updated_at into rev from public.academic_years where id=created;
 begin
   perform public.cq_manage_academic_period_v1(u,'save_dates',jsonb_build_object('academic_year_id',created,'expected_updated_at',rev,
   'start_date','2098-07-01','end_date','2099-06-30','semester1_start','2098-07-01','semester1_end','2099-02-01','semester2_start','2099-01-01','semester2_end','2099-06-30'));
   raise exception 'FAIL overlapping dates accepted';
 exception when others then if sqlerrm<>'period_dates_invalid' then raise; end if; end;
 if (select start_date from public.academic_years where id=created) is not null then raise exception 'FAIL partial dates update'; end if;
 perform public.cq_manage_academic_period_v1(u,'save_dates',jsonb_build_object('academic_year_id',created,'expected_updated_at',rev,
   'start_date','2098-07-01','end_date','2099-06-30','semester1_start','2098-07-01','semester1_end','2098-12-31','semester2_start','2099-01-01','semester2_end','2099-06-30'));
 begin
   perform public.cq_manage_academic_period_v1(u,'save_dates',jsonb_build_object('academic_year_id',created,'expected_updated_at',rev));
   raise exception 'FAIL stale dates accepted';
 exception when others then if sqlerrm<>'period_changed' then raise; end if; end;
 select coalesce(jsonb_agg(jsonb_build_object('year_id',a.id,'semester_no',s.semester_no,'year_revision',a.updated_at,'semester_revision',s.updated_at) order by a.id,s.semester_no),'[]') into snap
   from academic_years a left join semesters s on s.academic_year_id=a.id and s.is_active where a.school_unit_id=u and a.is_active;
 active_before:=snap;
 begin
   perform public.cq_manage_academic_period_v1(u,'activate_period',jsonb_build_object('academic_year_id',created,'semester_no',1,'expected_active',snap));
   raise exception 'FAIL empty year activated';
 exception when others then if sqlerrm<>'period_not_ready' then raise; end if; end;
 begin
   perform public.cq_manage_academic_period_v1(u,'activate_period',jsonb_build_object('academic_year_id',created,'semester_no',1,'expected_active','[]'::jsonb));
   raise exception 'FAIL stale activation accepted';
 exception when others then if sqlerrm<>'period_changed' then raise; end if; end;
 if not exists(select 1 from academic_years where id=y and is_active) then raise exception 'FAIL active year lost on failed activation'; end if;
 -- Exercise a successful semester transition using one temporary enrollment,
 -- still in this outer rollback-only transaction.
 select updated_at into rev from public.academic_years where id=y;
 perform public.cq_manage_academic_period_v1(u,'save_dates',jsonb_build_object('academic_year_id',y,'expected_updated_at',rev,
   'start_date','2026-07-01','end_date','2027-06-30','semester1_start','2026-07-01','semester1_end','2026-12-31','semester2_start','2027-01-01','semester2_end','2027-06-30'));
 insert into public.student_enrollments(student_id,class_id,academic_year_id,semester_no,is_active)
 select e.student_id,e.class_id,e.academic_year_id,2,true from public.student_enrollments e
 where e.academic_year_id=y and e.semester_no=1 and e.is_active limit 1
 on conflict do nothing;
 select coalesce(jsonb_agg(jsonb_build_object('year_id',a.id,'semester_no',s.semester_no,'year_revision',a.updated_at,'semester_revision',s.updated_at) order by a.id,s.semester_no),'[]') into snap
   from academic_years a left join semesters s on s.academic_year_id=a.id and s.is_active where a.school_unit_id=u and a.is_active;
 perform public.cq_manage_academic_period_v1(u,'activate_period',jsonb_build_object('academic_year_id',y,'semester_no',2,'expected_active',snap));
 if (select count(*) from public.semesters s join public.academic_years a on a.id=s.academic_year_id where a.school_unit_id=u and s.is_active)<>1 then raise exception 'FAIL multiple active semesters'; end if;
 if not exists(select 1 from public.semesters where academic_year_id=y and semester_no=2 and is_active) then raise exception 'FAIL semester 2 not active'; end if;
 if has_function_privilege('anon','public.cq_manage_academic_period_v1(uuid,text,jsonb)','execute') or has_function_privilege('authenticated','public.cq_manage_academic_period_v1(uuid,text,jsonb)','execute') then raise exception 'FAIL RPC publicly callable'; end if;
end $$;
