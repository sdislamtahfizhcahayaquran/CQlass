-- Pengingat: isi laporan walas lengkap & periode surat telat ikut dikirim,
-- agar laporan bisa langsung dibaca dan surat langsung diterbitkan + dicetak dari daftar.
create or replace function public.kesiswaan_reminders_build()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_year_id uuid;
  v_year_name text;
  v_sem_year uuid;
  v_sem_no smallint;
  v_today date := (now() at time zone 'Asia/Jakarta')::date;
  v_result jsonb;
begin
  select id, name into v_year_id, v_year_name from public.academic_years where is_active order by created_at desc limit 1;
  select academic_year_id, semester_no into v_sem_year, v_sem_no from public.semesters where is_active limit 1;
  if v_year_id is null or v_sem_year is distinct from v_year_id then
    raise exception 'active_period_missing';
  end if;

  with cls as (
    select id, name from public.classes where academic_year_id = v_year_id and is_active
  ), enr as (
    select distinct on (e.student_id) e.student_id, e.class_id
    from public.student_enrollments e join cls on cls.id = e.class_id
    where e.academic_year_id = v_year_id and e.semester_no = v_sem_no and e.is_active
    order by e.student_id, e.class_id
  ), walas as (
    select r.class_id, coalesce(t.full_name, '') as walas
    from public.report_class_assignments r left join public.teachers t on t.id = r.homeroom_teacher_id
    where r.academic_year_id = v_year_id and r.semester_no = v_sem_no
  ), who as (
    select e.student_id, e.class_id, coalesce(s.full_name, '-') as student_name, coalesce(s.nis, '') as nis,
      c.name as class_name, coalesce(w.walas, '') as walas
    from enr e join public.students s on s.id = e.student_id join cls c on c.id = e.class_id
    left join walas w on w.class_id = e.class_id
  ), acks as (
    select reminder_key, acked_at, coalesce(note, '') as note from public.kesiswaan_reminder_acks
  ),
  -- 1. Tidak masuk Morning Talk (Sakit/Izin/Alfa) >= 3 hari sekolah berturut-turut, berakhir <= 14 hari lalu
  ses as (
    select distinct on (class_id, attendance_date) id, class_id, attendance_date
    from public.morning_talk_sessions
    where attendance_date between v_today - 21 and v_today and class_id in (select id from cls)
    order by class_id, attendance_date, id
  ), last_ses as (
    select class_id, max(attendance_date) as d from ses group by class_id
  ), att as (
    select ma.student_id, s.class_id, s.attendance_date as d, ma.status,
      ma.status in ('Sakit', 'Izin', 'Alfa') as ab
    from public.morning_talk_attendance ma join ses s on s.id = ma.session_id
  ), isl as (
    select *, row_number() over (partition by student_id, class_id order by d)
      - row_number() over (partition by student_id, class_id, ab order by d) as grp
    from att
  ), runs as (
    select student_id, class_id, grp, min(d) as st, max(d) as en, count(*)::int as n
    from isl where ab group by student_id, class_id, grp
    having count(*) >= 3 and max(d) >= v_today - 14
  ), absent as (
    select jsonb_build_object(
      'key', k.key, 'student_id', w.student_id, 'student_name', w.student_name, 'nis', w.nis,
      'class_id', w.class_id, 'class_name', w.class_name, 'walas', w.walas,
      'start_date', r.st, 'end_date', r.en, 'days', r.n, 'ongoing', r.en = ls.d,
      'statuses', (select jsonb_object_agg(z.status, z.c) from (
        select i.status, count(*) as c from isl i
        where i.student_id = r.student_id and i.class_id = r.class_id and i.ab and i.grp = r.grp group by i.status) z),
      'acked', a.reminder_key is not null, 'acked_at', a.acked_at, 'ack_note', coalesce(a.note, '')
    ) as j, r.en = ls.d as ongoing, r.n, w.class_name, a.reminder_key is not null as acked
    from runs r
    join who w on w.student_id = r.student_id
    join last_ses ls on ls.class_id = r.class_id
    cross join lateral (select 'absent:' || r.student_id || ':' || r.st as key) k
    left join acks a on a.reminder_key = k.key
  ),
  -- 2 & 3. Saldo poin & tahap pembinaan (sama dengan student-points: reward maks 20/bulan, berat tidak berkurang)
  v as (
    select d.student_id,
      coalesce(sum(d.points) filter (where d.category in ('Ringan', 'Sedang')), 0) as elig,
      coalesce(sum(d.points) filter (where d.category = 'Berat' and coalesce(d.consequence_code, '') <> 'DO'), 0) as heavy,
      count(*) filter (where d.category = 'Berat' and coalesce(d.consequence_code, '') <> 'DO')::int as hc,
      count(*) filter (where d.consequence_code = 'DO')::int as dc
    from public.discipline_incidents d join who on who.student_id = d.student_id
    where not d.is_deleted group by d.student_id
  ), rw as (
    select student_id, sum(least(20, m)) as capped from (
      select r.student_id, to_char(r.reward_date, 'YYYY-MM') as mo, sum(r.points) as m
      from public.student_rewards r join who on who.student_id = r.student_id
      where not r.is_deleted and r.is_verified group by r.student_id, mo) x
    group by student_id
  ), bal as (
    select v.*, (greatest(0, v.elig - least(v.elig, coalesce(rw.capped, 0))) + v.heavy)::int as balance
    from v left join rw on rw.student_id = v.student_id
  ), stg as (
    select b.*, cur.points as cur_pts, cur.stage, cur.action, nx.points as nx_pts, nx.stage as nx_stage,
      lh.incident_date as lh_date, lh.violation_name as lh_name
    from bal b
    left join lateral (select m.points, m.stage, m.action from public.discipline_intervention_master m
      where m.is_active and m.points <= b.balance order by m.points desc limit 1) cur on true
    left join lateral (select m.points, m.stage from public.discipline_intervention_master m
      where m.is_active and m.points > b.balance order by m.points limit 1) nx on true
    left join lateral (select d.incident_date, d.violation_name from public.discipline_incidents d
      where d.student_id = b.student_id and not d.is_deleted and (d.category = 'Berat' or d.consequence_code = 'DO')
      order by d.incident_date desc limit 1) lh on true
  ), pts as (
    select s.*, w.student_name, w.nis, w.class_id, w.class_name, w.walas,
      (s.dc > 0 or s.hc > 0 or s.balance >= 100) as is_kes,
      case when (s.dc > 0 or s.hc > 0 or s.balance >= 100)
        then 'kes:' || s.student_id || ':' || coalesce(s.cur_pts, 0) || ':' || s.hc || ':' || s.dc
        else 'walas:' || s.student_id || ':' || coalesce(s.cur_pts, 0) end as key
    from stg s join who w on w.student_id = s.student_id
    where s.dc > 0 or s.hc > 0 or (s.balance >= 50 and s.cur_pts is not null)
  ), pts_j as (
    select p.is_kes, p.balance, (p.dc > 0 or p.hc > 0) as urgent, a.reminder_key is not null as acked,
      jsonb_build_object(
        'key', p.key, 'student_id', p.student_id, 'student_name', p.student_name, 'nis', p.nis,
        'class_id', p.class_id, 'class_name', p.class_name, 'walas', p.walas,
        'balance', p.balance, 'stage', coalesce(p.stage, ''), 'stage_points', coalesce(p.cur_pts, 0),
        'next_points', p.nx_pts, 'next_stage', coalesce(p.nx_stage, ''),
        'reason', case when p.dc > 0 then 'Pelanggaran kategori DO'
                       when p.hc > 0 then 'Pelanggaran berat (' || p.hc || 'x)'
                       else coalesce(p.stage, '') end,
        'action', case when p.hc > 0 and p.cur_pts is null
                       then 'Pelanggaran berat langsung masuk proses Kesiswaan sejak kejadian pertama.'
                       else coalesce(p.action, '') end,
        'urgent', (p.dc > 0 or p.hc > 0),
        'last_heavy', case when p.lh_date is null then null else jsonb_build_object('date', p.lh_date, 'name', p.lh_name) end,
        'acked', a.reminder_key is not null, 'acked_at', a.acked_at, 'ack_note', coalesce(a.note, '')
      ) as j
    from pts p left join acks a on a.reminder_key = p.key
  ),
  -- 4. Surat keterlambatan yang sudah memenuhi ambang tapi belum terbit
  letters(kind, min_count, label, ord) as (
    values ('sp1', 5, 'SP 1', 1), ('sp2', 10, 'SP 2', 2), ('sp3', 15, 'SP 3', 3), ('spo', 15, 'Pemanggilan Orang Tua', 4)
  ), lr as (
    select r as rec, jsonb_array_length(coalesce(r -> 'dates', '[]'::jsonb)) as cnt
    from public.kesiswaan_late_period() p, public.kesiswaan_late_recap(p.id) r
  ), late as (
    select lr.cnt, jsonb_build_object(
      'key', 'late:' || (lr.rec ->> 'student_id') || ':' || d.kinds,
      'student_id', lr.rec ->> 'student_id',
      'student_name', coalesce(w.student_name, lr.rec ->> 'student_name'), 'nis', coalesce(w.nis, ''),
      'class_id', w.class_id, 'class_name', coalesce(w.class_name, lr.rec ->> 'class_name'), 'walas', coalesce(w.walas, ''),
      'late_count', lr.cnt, 'due', d.due, 'issued', coalesce(lr.rec -> 'issued', '{}'::jsonb),
      'last_late', lr.rec -> 'dates' -> -1 ->> 'date', 'acked', false
    ) as j
    from lr
    cross join lateral (
      select jsonb_agg(jsonb_build_object('kind', l.kind, 'min', l.min_count, 'label', l.label) order by l.ord) as due,
        string_agg(l.kind, '+' order by l.ord) as kinds
      from letters l where lr.cnt >= l.min_count and not (coalesce(lr.rec -> 'issued', '{}'::jsonb) ? l.kind)
    ) d
    left join who w on w.student_id::text = lr.rec ->> 'student_id'
    where d.due is not null
  ),
  -- 5a. Laporan walas (catatan pendampingan) yang belum selesai di Kesiswaan
  notes as (
    select n.* from public.student_case_notes n where not n.is_deleted order by n.created_at desc limit 300
  ), rep as (
    select n.created_at, coalesce(n.urgent, false) as urgent,
      (lower(coalesce(n.status, '')) like '%kesiswaan%' or coalesce(n.needs_student_affairs, false)) as forwarded,
      a.reminder_key is not null as acked,
      jsonb_build_object(
        'key', 'case:' || n.id, 'id', n.id, 'student_id', n.student_id,
        'student_name', coalesce(w.student_name, s.full_name, '-'), 'nis', coalesce(w.nis, s.nis, ''),
        'class_id', coalesce(n.class_id, w.class_id), 'class_name', coalesce(c.name, w.class_name, '-'), 'walas', coalesce(w.walas, ''),
        'date', n.incident_date, 'created_at', n.created_at, 'category', n.category, 'attention', n.attention_level,
        'problem', coalesce(nullif(trim(n.main_problem), ''), nullif(trim(n.summary), ''), left(trim(coalesce(n.story, '')), 160)),
        'status', n.status,
        'forwarded', (lower(coalesce(n.status, '')) like '%kesiswaan%' or coalesce(n.needs_student_affairs, false)),
        'urgent', coalesce(n.urgent, false), 'needs_parent', coalesce(n.needs_parent, false), 'needs_uks', coalesce(n.needs_uks, false),
        'reporter', coalesce(t.full_name, ua.username, ''),
        'main_problem', n.main_problem, 'story', n.story, 'initial_action', n.initial_action, 'summary', n.summary,
        'final_suggestion', n.final_suggestion, 'safety_risk', n.safety_risk, 'evaluation_date', n.evaluation_date,
        'kes_status', n.student_affairs_status, 'kes_follow_up', n.student_affairs_follow_up,
        'acked', a.reminder_key is not null, 'acked_at', a.acked_at, 'ack_note', coalesce(a.note, '')
      ) as j
    from notes n
    left join who w on w.student_id = n.student_id
    left join public.students s on s.id = n.student_id
    left join public.classes c on c.id = coalesce(n.class_id, w.class_id)
    left join public.user_accounts ua on ua.id = n.created_by_account_id
    left join public.teachers t on t.id = ua.teacher_id
    left join acks a on a.reminder_key = 'case:' || n.id
    where lower(coalesce(n.student_affairs_status, '')) <> 'selesai'
  ), rep_f as (
    select * from rep where forwarded or not acked
  ),
  -- 5b. SALAM CQ yang belum selesai
  salam as (
    select m.created_at, jsonb_build_object(
      'key', 'salam:' || m.id, 'id', m.id, 'ticket_code', m.ticket_code, 'message_type', m.message_type,
      'student_name', m.student_name, 'class_name', m.class_name, 'topic', m.topic, 'message', m.message,
      'status', m.status, 'pic', m.pic, 'target_follow_up', m.target_follow_up, 'follow_up_note', m.follow_up_note,
      'created_at', m.created_at, 'acked', false
    ) as j
    from public.salam_cq_messages m where coalesce(m.status, '') <> 'selesai'
    order by m.created_at desc limit 200
  )
  select jsonb_build_object(
    'success', true,
    'generated_at', now(),
    'today', v_today,
    'late_period_id', (select id from public.kesiswaan_late_period() limit 1),
    'period', jsonb_build_object('year', v_year_name, 'semester_no', v_sem_no),
    'rules', jsonb_build_object('absent_days', 3, 'walas_points', 50, 'kesiswaan_points', 100,
      'late_letters', (select jsonb_agg(jsonb_build_object('kind', kind, 'min', min_count, 'label', label) order by ord) from letters)),
    'counts', jsonb_build_object(
      'absent', (select count(*) from absent where not acked),
      'walas_call', (select count(*) from pts_j where not is_kes and not acked),
      'kesiswaan_call', (select count(*) from pts_j where is_kes and not acked),
      'late', (select count(*) from late),
      'walas_reports', (select count(*) from rep_f where not acked),
      'salam', (select count(*) from salam)),
    'absent', coalesce((select jsonb_agg(j order by ongoing desc, n desc, class_name) from absent), '[]'::jsonb),
    'walas_call', coalesce((select jsonb_agg(j order by urgent desc, balance desc) from pts_j where not is_kes), '[]'::jsonb),
    'kesiswaan_call', coalesce((select jsonb_agg(j order by urgent desc, balance desc) from pts_j where is_kes), '[]'::jsonb),
    'late', coalesce((select jsonb_agg(j order by cnt desc) from late), '[]'::jsonb),
    'walas_reports', coalesce((select jsonb_agg(j order by forwarded desc, urgent desc, created_at desc) from rep_f), '[]'::jsonb),
    'salam', coalesce((select jsonb_agg(j order by created_at desc) from salam), '[]'::jsonb)
  ) into v_result;
  return v_result;
end;
$$;
