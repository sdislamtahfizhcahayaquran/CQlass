-- Prepare a semester by copying setup data (members, assignments, schedules)
-- from another semester of the SAME academic year. Scores, attendance, reports
-- and any other records are never copied. One transaction; a part whose target
-- already has active rows is skipped, so running it twice never duplicates.
create or replace function public.cq_prepare_semester_v1(
  p_school_unit_id uuid, p_year_id uuid, p_from_no int, p_to_no int, p_parts text[]
) returns jsonb language plpgsql security invoker
set search_path = public, pg_temp
as $$
declare
  v_to public.semesters%rowtype;
  v_result jsonb := '{}'::jsonb;
  v_n int;
  v_tag text := 'semcopy:'||p_from_no||'>'||p_to_no||':';
  part text;
begin
  perform 1 from public.school_units where id=p_school_unit_id for update;
  if not found then raise exception 'school_unit_missing'; end if;
  perform 1 from public.academic_years where id=p_year_id and school_unit_id=p_school_unit_id;
  if not found then raise exception 'academic_year_not_found'; end if;
  if p_from_no not in (1,2) or p_to_no not in (1,2) or p_from_no=p_to_no then raise exception 'period_invalid'; end if;
  select * into v_to from public.semesters where academic_year_id=p_year_id and semester_no=p_to_no;
  if not found then raise exception 'semester_not_found'; end if;
  if v_to.is_active and exists(select 1 from public.academic_years where id=p_year_id and is_active) then
    raise exception 'target_semester_active';
  end if;

  foreach part in array coalesce(p_parts,'{}') loop
    if part='students' then
      if exists(select 1 from student_enrollments where academic_year_id=p_year_id and semester_no=p_to_no and is_active) then v_n:=-1; else
        insert into student_enrollments(student_id,class_id,academic_year_id,semester_no,is_active,start_date,source_system,source_ref)
        select e.student_id,e.class_id,p_year_id,p_to_no,true,v_to.start_date,'cqlass_semester_copy',v_tag||e.id
        from student_enrollments e join students s on s.id=e.student_id
        where e.academic_year_id=p_year_id and e.semester_no=p_from_no and e.is_active and upper(coalesce(s.status,'AKTIF'))='AKTIF'
        on conflict (student_id,academic_year_id,semester_no) do nothing;
        get diagnostics v_n = row_count; end if;
    elsif part='walas' then
      if exists(select 1 from report_class_assignments where academic_year_id=p_year_id and semester_no=p_to_no) then v_n:=-1; else
        insert into report_class_assignments(class_id,academic_year_id,semester_no,homeroom_teacher_id,partner_teacher_id,homeroom_signature_path,partner_signature_path)
        select class_id,p_year_id,p_to_no,homeroom_teacher_id,partner_teacher_id,homeroom_signature_path,partner_signature_path
        from report_class_assignments where academic_year_id=p_year_id and semester_no=p_from_no
        on conflict (class_id,academic_year_id,semester_no) do nothing;
        get diagnostics v_n = row_count; end if;
    elsif part='mapel' then
      if exists(select 1 from teacher_subject_assignments where academic_year_id=p_year_id and semester_no=p_to_no and is_active) then v_n:=-1; else
        insert into teacher_subject_assignments(teacher_id,class_id,subject_id,academic_year_id,semester_no,is_active,source_system,source_ref,notes)
        select teacher_id,class_id,subject_id,p_year_id,p_to_no,true,'cqlass_semester_copy',v_tag||id,notes
        from teacher_subject_assignments where academic_year_id=p_year_id and semester_no=p_from_no and is_active
        on conflict do nothing;
        get diagnostics v_n = row_count; end if;
    elsif part='tahfizh' then
      if exists(select 1 from tahfizh_teacher_assignments where academic_year_id=p_year_id and semester_no=p_to_no and is_active) then v_n:=-1; else
        insert into tahfizh_teacher_assignments(teacher_id,class_id,academic_year_id,semester_no,team_name,is_active,source_ref)
        select teacher_id,class_id,p_year_id,p_to_no,team_name,true,v_tag||id
        from tahfizh_teacher_assignments where academic_year_id=p_year_id and semester_no=p_from_no and is_active
        on conflict do nothing;
        get diagnostics v_n = row_count; end if;
    elsif part='tugas' then
      if exists(select 1 from teacher_assignments where academic_year_id=p_year_id and semester_no=p_to_no and is_active) then v_n:=-1; else
        insert into teacher_assignments(teacher_id,academic_year_id,semester_no,assignment_type,class_id,subject_id,is_active,notes,source_ref)
        select teacher_id,p_year_id,p_to_no,assignment_type,class_id,subject_id,true,notes,v_tag||id
        from teacher_assignments where academic_year_id=p_year_id and semester_no=p_from_no and is_active
        on conflict do nothing;
        get diagnostics v_n = row_count; end if;
    elsif part='partner' then
      if exists(select 1 from class_partner_assignments where academic_year_id=p_year_id and semester_no=p_to_no and is_active) then v_n:=-1; else
        insert into class_partner_assignments(school_unit_id,academic_year_id,semester_no,class_id,teacher_id,is_primary,is_active)
        select school_unit_id,p_year_id,p_to_no,class_id,teacher_id,is_primary,true
        from class_partner_assignments where academic_year_id=p_year_id and semester_no=p_from_no and is_active
        on conflict do nothing;
        get diagnostics v_n = row_count; end if;
    elsif part='jadwal' then
      if exists(select 1 from class_schedule_entries where academic_year_id=p_year_id and semester_no=p_to_no and is_active)
         or exists(select 1 from tahfizh_kbm_schedules where academic_year_id=p_year_id and semester_no=p_to_no and is_active) then v_n:=-1; else
        insert into class_schedule_entries(school_unit_id,academic_year_id,semester_no,class_id,day_of_week,start_time,end_time,subject_id,subject_name_raw,teacher_id,teacher_name_raw,activity_type,slot_label,notes,is_active)
        select school_unit_id,p_year_id,p_to_no,class_id,day_of_week,start_time,end_time,subject_id,subject_name_raw,teacher_id,teacher_name_raw,activity_type,slot_label,notes,true
        from class_schedule_entries where academic_year_id=p_year_id and semester_no=p_from_no and is_active;
        get diagnostics v_n = row_count;
        insert into tahfizh_kbm_schedules(school_unit_id,academic_year_id,semester_no,day_of_week,session_no,start_time,end_time,class_id,team_name,is_active)
        select school_unit_id,p_year_id,p_to_no,day_of_week,session_no,start_time,end_time,class_id,team_name,true
        from tahfizh_kbm_schedules where academic_year_id=p_year_id and semester_no=p_from_no and is_active
        on conflict do nothing;
      end if;
    elsif part='halaqah' then
      if exists(select 1 from partner_tahfizh_halaqah_roster where academic_year_id=p_year_id and semester_no=p_to_no and is_active) then v_n:=-1; else
        insert into partner_tahfizh_halaqah_roster(academic_year_id,semester_no,class_id,partner_teacher_id,student_id,source_teacher_label,source_student_name,source_sheet,source_row,match_score,match_status,is_active)
        select p_year_id,p_to_no,class_id,partner_teacher_id,student_id,source_teacher_label,source_student_name,source_sheet,source_row,match_score,match_status,true
        from partner_tahfizh_halaqah_roster where academic_year_id=p_year_id and semester_no=p_from_no and is_active
        on conflict do nothing;
        get diagnostics v_n = row_count; end if;
    else
      raise exception 'unknown_part';
    end if;
    v_result := v_result || jsonb_build_object(part, v_n);
  end loop;
  return v_result;
end;
$$;

revoke all on function public.cq_prepare_semester_v1(uuid,uuid,int,int,text[]) from public,anon,authenticated;
grant execute on function public.cq_prepare_semester_v1(uuid,uuid,int,int,text[]) to service_role;
