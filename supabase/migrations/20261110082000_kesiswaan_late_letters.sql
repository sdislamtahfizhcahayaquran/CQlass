create table public.kesiswaan_late_letters (
  number integer primary key check (number >= 206),
  semester_id uuid not null references public.semesters(id),
  student_id uuid not null references public.students(id),
  kind text not null check (kind in ('sp1', 'sp2', 'sp3', 'spo')),
  issued_by uuid not null references public.user_accounts(id),
  issued_on date not null,
  payload jsonb not null,
  unique (semester_id, student_id, kind)
);

create table public.kesiswaan_letter_assets (
  name text primary key,
  png_base64 text not null
);

alter table public.kesiswaan_late_letters enable row level security;
alter table public.kesiswaan_letter_assets enable row level security;
revoke all on public.kesiswaan_late_letters, public.kesiswaan_letter_assets from public, anon, authenticated;
grant select, insert on public.kesiswaan_late_letters to service_role;
grant select on public.kesiswaan_letter_assets to service_role;

-- The current school year has no configured dates. Honor explicit dates when
-- available, otherwise use July–December and January–June of that school year.
create function public.kesiswaan_late_period()
returns table (id uuid, academic_year_id uuid, semester_no smallint, year_name text, start_date date, end_date date, today date)
language sql stable security invoker set search_path = ''
as $$
  with bounds as (
    select s.id, s.academic_year_id, s.semester_no, y.name::text as year_name,
      coalesce(s.start_date, case when y.name ~ '^[1-9][0-9]{3}/[1-9][0-9]{3}$' then
        case s.semester_no when 1 then make_date(left(y.name, 4)::integer, 7, 1)
          when 2 then make_date(right(y.name, 4)::integer, 1, 1) end end) as start_date,
      coalesce(s.end_date, case when y.name ~ '^[1-9][0-9]{3}/[1-9][0-9]{3}$' then
        case s.semester_no when 1 then make_date(left(y.name, 4)::integer, 12, 31)
          when 2 then make_date(right(y.name, 4)::integer, 6, 30) end end) as end_date,
      (now() at time zone 'Asia/Jakarta')::date as today
    from public.semesters s
    join public.academic_years y on y.id = s.academic_year_id
    where s.is_active and y.is_active
  )
  select * from bounds where today between start_date and end_date;
$$;

revoke all on function public.kesiswaan_late_period() from public, anon, authenticated;
grant execute on function public.kesiswaan_late_period() to service_role;

create function public.kesiswaan_late_recap(p_semester uuid, p_student uuid default null)
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
  ), observations as (
    select a.student_id, s.attendance_date, a.status, a.note,
      1 as live, a.updated_at, a.id
    from public.morning_talk_sessions s
    join public.morning_talk_attendance a on a.session_id = s.id
    join roster r on r.student_id = a.student_id
    where s.attendance_date between r.start_date and least(r.end_date, (now() at time zone 'Asia/Jakarta')::date)
    union all
    select h.student_id, h.attendance_date, h.status, null,
      0, h.created_at, h.id
    from public.morning_talk_attendance_history h
    join roster r on r.student_id = h.student_id
    where h.attendance_date between r.start_date and least(r.end_date, (now() at time zone 'Asia/Jakarta')::date)
  ), effective as (
    select distinct on (student_id, attendance_date) *
    from observations
    order by student_id, attendance_date, live desc, updated_at desc nulls last, id desc
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
  join effective e using (student_id)
  where lower(trim(e.status)) = 'terlambat'
  group by r.student_id, r.student_name, r.class_name, r.semester_no, r.year_name
  order by r.class_name, r.student_name, r.student_id;
$$;

create function public.kesiswaan_issue_late_letter(
  p_semester uuid, p_student uuid, p_kind text, p_actor uuid,
  p_meeting_date date default null, p_meeting_time time default null,
  p_meeting_place text default null
) returns public.kesiswaan_late_letters
language plpgsql volatile security invoker set search_path = ''
as $$
declare
  letter public.kesiswaan_late_letters;
  snapshot jsonb;
  threshold integer;
  issue_date date := (now() at time zone 'Asia/Jakarta')::date;
begin
  threshold := case p_kind when 'sp1' then 5 when 'sp2' then 10 when 'sp3' then 15 when 'spo' then 15 end;
  if threshold is null then raise exception 'Jenis surat tidak valid.'; end if;

  perform pg_advisory_xact_lock(206, 1102026);
  select * into letter from public.kesiswaan_late_letters
    where semester_id = p_semester and student_id = p_student and kind = p_kind;
  if found then return letter; end if;

  select r into snapshot from public.kesiswaan_late_recap(p_semester, p_student) as r;
  if snapshot is null or jsonb_array_length(snapshot->'dates') < threshold then
    raise exception 'Jumlah keterlambatan semester ini belum memenuhi ambang surat.';
  end if;

  if p_kind = 'spo' then
    if p_meeting_date is null or p_meeting_date < issue_date or p_meeting_time is null
      or coalesce(length(trim(p_meeting_place)), 0) not between 1 and 160 then
      raise exception 'Lengkapi tanggal, jam, dan tempat pertemuan.';
    end if;
    snapshot := snapshot || jsonb_build_object('meeting_date', p_meeting_date,
      'meeting_time', to_char(p_meeting_time, 'HH24:MI'), 'meeting_place', trim(p_meeting_place));
  end if;

  insert into public.kesiswaan_late_letters (number, semester_id, student_id, kind, issued_by, issued_on, payload)
  select coalesce(max(number), 205) + 1, p_semester, p_student, p_kind, p_actor, issue_date, snapshot
  from public.kesiswaan_late_letters
  returning * into letter;
  return letter;
end;
$$;

revoke all on function public.kesiswaan_late_recap(uuid, uuid) from public, anon, authenticated;
revoke all on function public.kesiswaan_issue_late_letter(uuid, uuid, text, uuid, date, time, text) from public, anon, authenticated;
grant execute on function public.kesiswaan_late_recap(uuid, uuid) to service_role;
grant execute on function public.kesiswaan_issue_late_letter(uuid, uuid, text, uuid, date, time, text) to service_role;
