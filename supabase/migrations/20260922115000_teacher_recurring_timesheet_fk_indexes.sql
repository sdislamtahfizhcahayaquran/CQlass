create index if not exists teacher_recurring_activities_teacher_idx
  on public.teacher_recurring_activities (teacher_id);

create index if not exists teacher_recurring_activities_school_unit_idx
  on public.teacher_recurring_activities (school_unit_id);

create index if not exists teacher_recurring_activities_creator_idx
  on public.teacher_recurring_activities (created_by_account_id)
  where created_by_account_id is not null;
