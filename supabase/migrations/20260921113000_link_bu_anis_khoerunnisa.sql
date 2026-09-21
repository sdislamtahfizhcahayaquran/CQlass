update public.teacher_work_schedule_templates s
set teacher_id = t.id,
    assignee_label = 'Bu Anis (Khoerunnisa)',
    updated_at = now()
from public.teachers t
where s.academic_year_id in (
        select id from public.academic_years
        where name = '2026/2027' and is_active = true
      )
  and s.semester_no = 1
  and s.day_of_week = 5
  and s.source_ref = 'GATE:T2A:1A'
  and s.activity_code = 'student_welcome_gate'
  and t.full_name = 'Khoerunnisa, S.Kom.';
