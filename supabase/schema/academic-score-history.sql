create table public.academic_score_history (
 id bigint generated always as identity primary key,
 score_id uuid not null,
 revision integer not null,
 event_type text not null,
 changed_at timestamptz not null default clock_timestamp(),
 old_score numeric,
 new_score numeric,
 snapshot jsonb not null,
 unique(score_id,revision)
);
alter table public.academic_score_history enable row level security;
revoke all on public.academic_score_history from anon, authenticated;
grant select, insert on public.academic_score_history to service_role;
grant usage, select on sequence public.academic_score_history_id_seq to service_role;
create function public.capture_academic_score_history() returns trigger
language plpgsql set search_path = public as $$
declare v_revision integer;
begin
 if TG_OP = 'INSERT' then
   if NEW.score is null then return NEW; end if;
 elsif NEW.score is not distinct from OLD.score and NEW.deleted_at is not distinct from OLD.deleted_at then
   return NEW;
 end if;
 select coalesce(max(revision),0)+1 into v_revision from public.academic_score_history where score_id=NEW.id;
 insert into public.academic_score_history(score_id,revision,event_type,old_score,new_score,snapshot)
 values(NEW.id,v_revision,case when TG_OP='INSERT' or (OLD.score is null and v_revision=1 and NEW.score is not null) then 'input' else 'edit' end,
 case when TG_OP='UPDATE' then OLD.score else null end,NEW.score,to_jsonb(NEW));
 return NEW;
end $$;
revoke all on function public.capture_academic_score_history() from public, anon, authenticated;
create trigger academic_score_history_capture after insert or update on public.academic_scores
for each row execute function public.capture_academic_score_history();
create view public.academic_score_history_report with (security_invoker=true) as
select h.id,h.score_id,h.revision,h.event_type,h.changed_at,h.old_score,h.new_score,
 count(*) filter (where h.event_type='edit') over(partition by h.score_id order by h.revision) as edit_number,
 h.snapshot->>'academic_year_id' as academic_year_id,
 (h.snapshot->>'semester_no')::integer as semester_no,
 c.name as class_name,s.full_name as student_name,s.nis,
 t.full_name as teacher_name,sub.name as subject_name,
 coalesce(lo.code,h.snapshot->>'assessment_type') as component,
 h.snapshot->>'deleted_at' as deleted_at
from public.academic_score_history h
left join public.classes c on c.id=(h.snapshot->>'class_id')::uuid
left join public.students s on s.id=(h.snapshot->>'student_id')::uuid
left join public.teachers t on t.id=(h.snapshot->>'teacher_id')::uuid
left join public.subjects sub on sub.id=(h.snapshot->>'subject_id')::uuid
left join public.learning_objectives lo on lo.id=(h.snapshot->>'learning_objective_id')::uuid;
revoke all on public.academic_score_history_report from anon, authenticated;
grant select on public.academic_score_history_report to service_role;
