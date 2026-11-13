create or replace function public.kesiswaan_late_recap(p_semester uuid, p_student uuid default null)
returns setof jsonb
language sql stable security invoker set search_path = ''
as $$
  with period as (
    select * from public.kesiswaan_late_period() where id = p_semester
  ), roster as (
    select distinct on (e.student_id) e.student_id, st.full_name as student_name,
      c.name as class_name, p.start_date, p.end_date, p.semester_no, p.year_name
    from period p
    join public.student_enrollments e on e.academic_year_id = p.academic_year_id
      and e.semester_no = p.semester_no and e.is_active
    join public.students st on st.id = e.student_id
    join public.classes c on c.id = e.class_id
    where (p_student is null or e.student_id = p_student)
    order by e.student_id, e.updated_at desc nulls last, e.id
  ), unique_late_days as (
    select distinct on (d.student_id, d.incident_date)
      d.student_id, d.incident_date as attendance_date, d.note
    from public.discipline_incidents d
    join roster r on r.student_id = d.student_id
    where d.incident_date between r.start_date and least(r.end_date, (now() at time zone 'Asia/Jakarta')::date)
      and not coalesce(d.is_deleted, false)
      and lower(trim(d.violation_name)) = 'telat'
    order by d.student_id, d.incident_date, (nullif(trim(d.note), '') is not null) desc,
      d.updated_at desc nulls last, d.id desc
  )
  select jsonb_build_object(
    'student_id', r.student_id, 'student_name', r.student_name, 'class_name', r.class_name,
    'semester_no', r.semester_no, 'year_name', r.year_name,
    'issued', coalesce((select jsonb_object_agg(l.kind, l.number)
      from public.kesiswaan_late_letters l
      where l.semester_id = p_semester and l.student_id = r.student_id), '{}'::jsonb),
    'dates', jsonb_agg(jsonb_build_object('date', e.attendance_date, 'note', e.note) order by e.attendance_date)
  )
  from roster r
  join unique_late_days e using (student_id)
  group by r.student_id, r.student_name, r.class_name, r.semester_no, r.year_name
  order by r.class_name, r.student_name, r.student_id;
$$;

