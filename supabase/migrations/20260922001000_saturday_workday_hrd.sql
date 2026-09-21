-- CQlass: Saturday workday + HRD agenda ownership
alter table public.teacher_work_schedule_templates
  drop constraint if exists teacher_work_schedule_templates_day_of_week_check;
alter table public.teacher_work_schedule_templates
  add constraint teacher_work_schedule_templates_day_of_week_check
  check (day_of_week between 1 and 6);

alter table public.teacher_work_schedule_templates
  drop constraint if exists teacher_work_schedule_templates_activity_code_check;
alter table public.teacher_work_schedule_templates
  add constraint teacher_work_schedule_templates_activity_code_check
  check (activity_code in (
    'briefing','student_welcome_class','student_welcome_gate','administration_eduhub',
    'saturday_work','saturday_role_work','extracurricular_teaching','hrd_saturday_agenda'
  ));

-- Default Saturday work window. Specific assignments/agendas overlay this window in Timesheet.
with active_year as (
  select id, school_unit_id from public.academic_years
  where name='2026/2027' and is_active=true
)
insert into public.teacher_work_schedule_templates
  (school_unit_id,academic_year_id,semester_no,day_of_week,start_time,end_time,
   activity_code,activity_name,applies_to_all,source_ref)
select ay.school_unit_id,ay.id,1,6,'07:30'::time,'12:00'::time,
       'saturday_work','Jam kerja Sabtu',true,'SATURDAY:WORKDAY'
from active_year ay
on conflict (academic_year_id,semester_no,day_of_week,source_ref)
do update set start_time=excluded.start_time,end_time=excluded.end_time,
 activity_code=excluded.activity_code,activity_name=excluded.activity_name,
 applies_to_all=true,is_active=true,updated_at=now();

comment on table public.teacher_work_schedule_templates is
'Automatic teacher work schedule. Saturday is a 07:30-12:00 workday; teaching/extracurricular assignments and HRD agendas take precedence over generic Saturday work slots.';