-- Rincian siswa untuk Pusat Pengingat (dibuka langsung di kartu, tanpa pindah menu)
-- dan daftar siswa aktif untuk mencocokkan nama pada file wawancara Word.
-- Autentikasi sama dengan kesiswaan_reminders (token sesi CQlass, role kesiswaan/admin).

create or replace function public.kesiswaan_student_detail(p_token text, p_student uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_year_id uuid;
  v_sem_no smallint;
  v_today date := (now() at time zone 'Asia/Jakarta')::date;
  v_period uuid;
  v_result jsonb;
begin
  perform public.kesiswaan_reminder_auth(p_token);
  select s.academic_year_id, s.semester_no into v_year_id, v_sem_no
  from public.semesters s join public.academic_years y on y.id = s.academic_year_id and y.is_active
  where s.is_active limit 1;
  select id into v_period from public.kesiswaan_late_period() limit 1;

  select jsonb_build_object(
    'success', true,
    'late_period_id', v_period,
    'student', (
      select jsonb_build_object('id', st.id, 'name', st.full_name, 'nis', st.nis, 'nisn', st.nisn, 'gender', st.gender,
        'class_id', c.id, 'class_name', c.name, 'walas', coalesce(t.full_name, ''))
      from public.students st
      left join public.student_enrollments e on e.student_id = st.id and e.academic_year_id = v_year_id and e.semester_no = v_sem_no and e.is_active
      left join public.classes c on c.id = e.class_id
      left join public.report_class_assignments r on r.class_id = c.id and r.academic_year_id = v_year_id and r.semester_no = v_sem_no
      left join public.teachers t on t.id = r.homeroom_teacher_id
      where st.id = p_student limit 1),
    'violations', coalesce((
      select jsonb_agg(x order by x->>'date' desc) from (
        select jsonb_build_object('date', d.incident_date, 'name', d.violation_name, 'category', d.category,
          'points', d.points, 'consequence', d.consequence_code, 'note', d.note,
          'by', coalesce(nullif(d.recorded_by_name, ''), tt.full_name, ua.username, '')) as x
        from public.discipline_incidents d
        left join public.user_accounts ua on ua.id = d.created_by_account_id
        left join public.teachers tt on tt.id = ua.teacher_id
        where d.student_id = p_student and not d.is_deleted
        order by d.incident_date desc, d.created_at desc limit 30) q), '[]'::jsonb),
    'violation_total', (select count(*) from public.discipline_incidents d where d.student_id = p_student and not d.is_deleted),
    'rewards_month', (select coalesce(sum(r.points), 0) from public.student_rewards r
      where r.student_id = p_student and not r.is_deleted and r.is_verified and to_char(r.reward_date, 'YYYY-MM') = to_char(v_today, 'YYYY-MM')),
    'rewards_total', (select count(*) from public.student_rewards r where r.student_id = p_student and not r.is_deleted and r.is_verified),
    'attendance', coalesce((
      select jsonb_agg(jsonb_build_object('date', q.attendance_date, 'status', q.status) order by q.attendance_date desc) from (
        select s.attendance_date, ma.status
        from public.morning_talk_attendance ma join public.morning_talk_sessions s on s.id = ma.session_id
        where ma.student_id = p_student and s.attendance_date between v_today - 30 and v_today
        order by s.attendance_date desc limit 25) q), '[]'::jsonb),
    'late_dates', coalesce((
      select r -> 'dates' from public.kesiswaan_late_recap(v_period, p_student) r limit 1), '[]'::jsonb),
    'late_letters', coalesce((
      select jsonb_agg(jsonb_build_object('number', l.number, 'kind', l.kind, 'issued_on', l.issued_on, 'printed_at', l.printed_at) order by l.number)
      from public.kesiswaan_late_letters l where l.student_id = p_student and l.semester_id = v_period), '[]'::jsonb),
    'case_notes', coalesce((
      select jsonb_agg(jsonb_build_object('id', n.id, 'date', n.incident_date, 'category', n.category, 'attention', n.attention_level,
        'main_problem', n.main_problem, 'story', n.story, 'initial_action', n.initial_action, 'summary', n.summary,
        'final_suggestion', n.final_suggestion, 'status', n.status, 'safety_risk', n.safety_risk,
        'needs_parent', n.needs_parent, 'needs_uks', n.needs_uks, 'needs_student_affairs', n.needs_student_affairs,
        'evaluation_date', n.evaluation_date, 'kes_status', n.student_affairs_status, 'kes_follow_up', n.student_affairs_follow_up,
        'reporter', coalesce(tt.full_name, ua.username, '')) order by n.created_at desc)
      from public.student_case_notes n
      left join public.user_accounts ua on ua.id = n.created_by_account_id
      left join public.teachers tt on tt.id = ua.teacher_id
      where n.student_id = p_student and not n.is_deleted), '[]'::jsonb),
    'affairs', coalesce((
      select jsonb_agg(jsonb_build_object('id', a.id, 'type', a.record_type, 'date', a.record_date, 'title', a.title,
        'description', a.description, 'follow_up', a.follow_up, 'status', a.status, 'priority', a.priority) order by a.record_date desc, a.created_at desc)
      from public.student_affairs_records a where a.student_id = p_student and not a.is_deleted), '[]'::jsonb)
  ) into v_result;
  return v_result;
end;
$$;

create or replace function public.kesiswaan_roster(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_year_id uuid;
  v_sem_no smallint;
begin
  perform public.kesiswaan_reminder_auth(p_token);
  select s.academic_year_id, s.semester_no into v_year_id, v_sem_no
  from public.semesters s join public.academic_years y on y.id = s.academic_year_id and y.is_active
  where s.is_active limit 1;
  return jsonb_build_object('success', true, 'students', coalesce((
    select jsonb_agg(jsonb_build_object('id', st.id, 'name', st.full_name, 'nis', st.nis, 'class_id', c.id, 'class_name', c.name) order by c.name, st.full_name)
    from public.student_enrollments e
    join public.students st on st.id = e.student_id
    join public.classes c on c.id = e.class_id
    where e.academic_year_id = v_year_id and e.semester_no = v_sem_no and e.is_active
      and lower(coalesce(st.status, 'aktif')) in ('aktif', 'active')), '[]'::jsonb));
end;
$$;

revoke all on function public.kesiswaan_student_detail(text, uuid) from public;
revoke all on function public.kesiswaan_roster(text) from public;
grant execute on function public.kesiswaan_student_detail(text, uuid) to anon, authenticated;
grant execute on function public.kesiswaan_roster(text) to anon, authenticated;
