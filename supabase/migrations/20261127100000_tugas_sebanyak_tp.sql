-- Kolom Tugas di input nilai mengikuti jumlah TP (maksimal 10): simpan Tugas 1-10, bukan hanya Tugas 1-5.
-- Isi fungsi sama dengan sebelumnya; hanya daftar assessment_type komponen yang diperluas.
CREATE OR REPLACE FUNCTION public.save_academic_scores_batch_v1(p_academic_year_id uuid, p_semester_no smallint, p_class_id uuid, p_subject_id uuid, p_teacher_id uuid, p_items jsonb)
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_tp integer := 0;
  v_component integer := 0;
begin
  if p_academic_year_id is null or p_class_id is null or p_subject_id is null or p_teacher_id is null then
    raise exception 'required_context_missing';
  end if;
  if p_semester_no not in (1,2) then
    raise exception 'semester_invalid';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'items_invalid';
  end if;
  if jsonb_array_length(p_items) > 5000 then
    raise exception 'items_too_many';
  end if;

  with input as (
    select
      (x->>'student_id')::uuid as student_id,
      nullif(x->>'learning_objective_id','')::uuid as learning_objective_id,
      upper(coalesce(x->>'assessment_type','')) as assessment_type,
      case
        when not (x ? 'score') or x->'score' = 'null'::jsonb or nullif(x->>'score','') is null then null::numeric
        else (x->>'score')::numeric
      end as score
    from jsonb_array_elements(p_items) x
  )
  insert into public.academic_scores(
    student_id,class_id,subject_id,learning_objective_id,teacher_id,
    academic_year_id,semester_no,score,predicate,assessment_type,
    assessment_date,notes,updated_at,deleted_at
  )
  select
    i.student_id,p_class_id,p_subject_id,i.learning_objective_id,p_teacher_id,
    p_academic_year_id,p_semester_no,i.score,null,'TP',null,null,now(),null
  from input i
  where i.learning_objective_id is not null
    and i.assessment_type = 'TP'
  on conflict (academic_year_id, semester_no, student_id, class_id, subject_id, learning_objective_id)
    where deleted_at is null and learning_objective_id is not null
  do update set
    teacher_id = excluded.teacher_id,
    score = excluded.score,
    predicate = null,
    assessment_type = 'TP',
    assessment_date = excluded.assessment_date,
    notes = excluded.notes,
    deleted_at = null,
    updated_at = now();
  get diagnostics v_tp = row_count;

  with input as (
    select
      (x->>'student_id')::uuid as student_id,
      upper(coalesce(x->>'assessment_type','')) as assessment_type,
      case
        when not (x ? 'score') or x->'score' = 'null'::jsonb or nullif(x->>'score','') is null then null::numeric
        else (x->>'score')::numeric
      end as score
    from jsonb_array_elements(p_items) x
  )
  insert into public.academic_scores(
    student_id,class_id,subject_id,learning_objective_id,teacher_id,
    academic_year_id,semester_no,score,predicate,assessment_type,
    assessment_date,notes,updated_at,deleted_at
  )
  select
    i.student_id,p_class_id,p_subject_id,null,p_teacher_id,
    p_academic_year_id,p_semester_no,i.score,null,i.assessment_type,null,null,now(),null
  from input i
  where i.assessment_type in ('TUGAS_1','TUGAS_2','TUGAS_3','TUGAS_4','TUGAS_5','TUGAS_6','TUGAS_7','TUGAS_8','TUGAS_9','TUGAS_10','WWP','ASAS')
  on conflict (academic_year_id, semester_no, student_id, class_id, subject_id, assessment_type)
    where deleted_at is null and learning_objective_id is null and assessment_type is not null
  do update set
    teacher_id = excluded.teacher_id,
    score = excluded.score,
    predicate = null,
    learning_objective_id = null,
    assessment_date = excluded.assessment_date,
    notes = excluded.notes,
    deleted_at = null,
    updated_at = now();
  get diagnostics v_component = row_count;

  return coalesce(v_tp,0) + coalesce(v_component,0);
end;
$function$;
