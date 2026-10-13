-- Allow teacher-managed weekly Saturday activities in the existing recurring Timesheet.
-- Existing patterns and all weekday constraints remain unchanged.
alter table public.teacher_recurring_activities
  drop constraint if exists teacher_recurring_days_valid;
alter table public.teacher_recurring_activities
  add constraint teacher_recurring_days_valid
  check (days_of_week <@ array[1,2,3,4,5,6]::smallint[]);

comment on table public.teacher_recurring_activities is
  'Weekly teacher Timesheet patterns Monday-Saturday; Saturday 07:30-12:00, managed by the teacher and monitored by HRD.';
