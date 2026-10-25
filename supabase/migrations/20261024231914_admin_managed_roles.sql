-- Existing grants and operational assignments are intentionally not rewritten.
create or replace function public.cq_role_catalog_guard_v1()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.role_code <> new.role_code then raise exception 'role_code_immutable'; end if;
  if new.role_code = 'admin' and not new.is_active then raise exception 'admin_role_required'; end if;
  if old.is_active and not new.is_active then
    update public.user_roles set is_active=false where role_code=new.role_code and is_active;
  end if;
  return new;
end $$;
create trigger cq_role_catalog_guard before update on public.role_catalog
for each row execute function public.cq_role_catalog_guard_v1();

create or replace function public.cq_user_role_guard_v1()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_when='BEFORE' then
  if new.is_active and not exists(select 1 from public.role_catalog where role_code=new.role_code and is_active) then
    raise exception 'invalid_or_inactive_role';
  end if;
  return new;
  end if;
  if tg_op='UPDATE' and old.is_active is not distinct from new.is_active and old.role_code=new.role_code then return new; end if;
  update public.user_sessions set revoked_at=now()
  where revoked_at is null and user_account_id in (select id from public.user_accounts where teacher_id=new.teacher_id);
  return new;
end $$;
create trigger cq_user_role_guard before insert or update on public.user_roles
for each row execute function public.cq_user_role_guard_v1();
create trigger cq_user_role_session_invalidation after insert or update on public.user_roles
for each row execute function public.cq_user_role_guard_v1();

-- Service-only transaction: profile, account, roles and session invalidation succeed together.
create or replace function public.cq_admin_save_user_v1(
  p_actor_id uuid, p_user_id uuid, p_teacher_id uuid, p_name text,
  p_username text, p_email text, p_status text, p_password_hash text, p_roles text[]
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user public.user_accounts%rowtype;
  v_teacher uuid;
  v_unit uuid;
  v_code text;
  v_id uuid;
  v_roles text[];
  v_old_roles text[];
begin
  -- Serialize management transactions, including teacher-code allocation and last-admin checks.
  perform pg_advisory_xact_lock(hashtextextended('cqlass.admin.users',0));
  if not exists(select 1 from public.user_accounts a join public.user_roles r on r.teacher_id=a.teacher_id
    join public.role_catalog c using(role_code)
    where a.id=p_actor_id and r.role_code='admin' and r.is_active and c.is_active
    and lower(a.status) not in ('inactive','nonaktif','disabled','blocked','blokir')) then raise exception 'admin_only'; end if;
  if nullif(btrim(p_name),'') is null then raise exception 'name_required'; end if;
  if p_username is null or length(p_username)<4 or p_username !~ '^[a-z0-9._]+$' then raise exception 'invalid_username'; end if;
  if p_status is null or p_status not in ('AKTIF','NONAKTIF') then raise exception 'invalid_status'; end if;
  select array_agg(distinct r order by r) into v_roles from unnest(p_roles) r;
  if coalesce(cardinality(v_roles),0)=0 then raise exception 'role_required'; end if;
  perform 1 from public.role_catalog where role_code=any(v_roles) order by role_code for share;
  if exists(select 1 from unnest(v_roles) r where not exists(select 1 from public.role_catalog c where c.role_code=r and c.is_active)) then raise exception 'invalid_or_inactive_role'; end if;
  if p_username='admin' and (not ('admin'=any(v_roles)) or p_status<>'AKTIF') then raise exception 'admin_account_required'; end if;
  if p_user_id=p_actor_id and (p_status<>'AKTIF' or not ('admin'=any(v_roles))) then raise exception 'cannot_remove_own_admin'; end if;
  if exists(select 1 from public.user_accounts where lower(username)=p_username and (p_user_id is null or id<>p_user_id)) then raise exception 'username_taken'; end if;
  if p_user_id is not null then
    select * into v_user from public.user_accounts where id=p_user_id for update;
    if not found then raise exception 'user_not_found'; end if;
    v_teacher:=v_user.teacher_id;
  else
    if p_password_hash is null then raise exception 'password_required'; end if;
    v_teacher:=p_teacher_id;
    if v_teacher is not null and exists(select 1 from public.user_accounts where teacher_id=v_teacher) then raise exception 'teacher_already_has_account'; end if;
  end if;
  if v_teacher is null then
    select id into v_unit from public.school_units order by (code='SD') desc,id limit 1;
    if v_unit is null then raise exception 'school_unit_missing'; end if;
    select 'GR'||lpad((coalesce(max(substring(teacher_code from 3)::integer),0)+1)::text,3,'0') into v_code
      from public.teachers where school_unit_id=v_unit and teacher_code ~ '^GR[0-9]+$';
    insert into public.teachers(school_unit_id,teacher_code,full_name,status,source_system)
      values(v_unit,v_code,btrim(p_name),p_status,'CQlass') returning id into v_teacher;
  else
    perform 1 from public.teachers where id=v_teacher for update;
    if not found then raise exception 'teacher_not_found'; end if;
    update public.teachers set full_name=btrim(p_name),status=p_status where id=v_teacher;
  end if;
  select coalesce(array_agg(role_code order by role_code),'{}') into v_old_roles from public.user_roles where teacher_id=v_teacher and is_active;
  if p_user_id is null then
    insert into public.user_accounts(teacher_id,username,email,status,password_hash,must_change_password,username_change_allowed,failed_login_attempts)
      values(v_teacher,p_username,nullif(p_email,''),p_status,p_password_hash,false,true,0) returning id into v_id;
  else
    v_id:=p_user_id;
    update public.user_accounts set teacher_id=v_teacher,username=p_username,status=p_status,
      password_hash=coalesce(p_password_hash,password_hash),
      password_changed_at=case when p_password_hash is not null then now() else password_changed_at end,
      failed_login_attempts=0,locked_until=null,updated_at=now() where id=v_id;
  end if;
  update public.user_roles set is_active=false where teacher_id=v_teacher and is_active and not(role_code=any(v_roles));
  insert into public.user_roles(teacher_id,role_code,is_active)
    select v_teacher,r,true from unnest(v_roles) r
    on conflict(teacher_id,role_code) do update set is_active=true where not user_roles.is_active;
  if p_status<>'AKTIF' or p_password_hash is not null or v_old_roles is distinct from v_roles then
    update public.user_sessions set revoked_at=now() where user_account_id in
      (select id from public.user_accounts where teacher_id=v_teacher) and revoked_at is null;
  end if;
  return jsonb_build_object('success',true,'user_id',v_id,'roles',v_roles,'reauth_required',v_id=p_actor_id and (v_old_roles is distinct from v_roles or p_password_hash is not null));
end $$;

revoke all on function public.cq_role_catalog_guard_v1(),public.cq_user_role_guard_v1() from public,anon,authenticated;
revoke all on function public.cq_admin_save_user_v1(uuid,uuid,uuid,text,text,text,text,text,text[]) from public,anon,authenticated;
grant execute on function public.cq_admin_save_user_v1(uuid,uuid,uuid,text,text,text,text,text,text[]) to service_role;

create or replace function public.role_catalog_manage(p_session_token text,p_action text,p_role_code text default null,p_display_name text default null,p_description text default null,p_is_active boolean default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_account uuid; v_admin boolean; v_code text; v_rows jsonb;
begin
 select a.id into v_account from public.user_sessions s join public.user_accounts a on a.id=s.user_account_id
 where s.token_hash=encode(extensions.digest(coalesce(p_session_token,''),'sha256'),'hex')
 and s.revoked_at is null and s.expires_at>now() and lower(coalesce(a.status,'')) not in ('inactive','nonaktif','disabled','blocked','blokir');
 if v_account is null then return jsonb_build_object('success',false,'error','session_invalid'); end if;
 select exists(select 1 from public.user_accounts a join public.user_roles r on r.teacher_id=a.teacher_id
 join public.role_catalog c using(role_code) where a.id=v_account and r.role_code='admin' and r.is_active and c.is_active) into v_admin;
 if lower(p_action)='list' then
   select coalesce(jsonb_agg(jsonb_build_object('role_code',role_code,'display_name',display_name,'description',description,'is_active',is_active,'is_system',is_system) order by display_name),'[]') into v_rows from public.role_catalog where is_active or v_admin;
   return jsonb_build_object('success',true,'roles',v_rows,'is_admin',v_admin);
 end if;
 if not v_admin then return jsonb_build_object('success',false,'error','admin_only'); end if;
 v_code:=lower(regexp_replace(btrim(coalesce(p_role_code,'')),'[^a-zA-Z0-9]+','_','g'));
 if v_code='' then return jsonb_build_object('success',false,'error','invalid_role_code'); end if;
 if v_code='admin' and p_is_active=false then return jsonb_build_object('success',false,'error','admin_role_required'); end if;
 if lower(p_action)='upsert' then
   insert into public.role_catalog(role_code,display_name,description,is_active,updated_at)
   values(v_code,coalesce(nullif(btrim(p_display_name),''),initcap(replace(v_code,'_',' '))),p_description,coalesce(p_is_active,true),now())
   on conflict(role_code) do update set display_name=excluded.display_name,description=excluded.description,is_active=excluded.is_active,updated_at=now();
 elsif lower(p_action)='toggle' then
   update public.role_catalog set is_active=coalesce(p_is_active,is_active),updated_at=now() where role_code=v_code;
 else return jsonb_build_object('success',false,'error','invalid_action'); end if;
 return public.role_catalog_manage(p_session_token,'list');
end $$;

-- One transaction per teacher submission. Operational rows and history cannot diverge.
create or replace function public.cq_admin_assignments_v1(p_actor_id uuid,p_year_id uuid,p_semester integer,p_teacher_id uuid,p_items jsonb,p_deactivate_id uuid default null,p_legacy_table text default null,p_legacy_id uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 v_unit uuid; v_item jsonb; v_type text; v_class uuid; v_subject uuid; v_title text; v_notes text; v_team text;
 v_id uuid; v_op uuid; v_table text; v_old_teacher uuid; v_saved jsonb:='[]'; v_row public.admin_teacher_assignments%rowtype;
begin
 perform pg_advisory_xact_lock(hashtextextended('cqlass.admin.assignments',0));
 if not exists(select 1 from public.user_accounts a join public.user_roles r on a.teacher_id=r.teacher_id where a.id=p_actor_id and r.role_code='admin' and r.is_active and lower(a.status) not in ('inactive','nonaktif','disabled','blocked','blokir')) then raise exception 'admin_only'; end if;
 select school_unit_id into v_unit from public.academic_years where id=p_year_id and is_active for share;
 if not found then raise exception 'period_changed_reload'; end if;
 perform 1 from public.semesters where academic_year_id=p_year_id and semester_no=p_semester and is_active for share;
 if not found then raise exception 'period_changed_reload'; end if;
 if p_legacy_table is not null then
   if p_legacy_id is null or p_teacher_id is null or p_deactivate_id is not null then raise exception 'assignment_invalid'; end if;
   select * into v_row from public.admin_teacher_assignments where academic_year_id=p_year_id and semester_no=p_semester and operational_table=p_legacy_table and operational_id=p_legacy_id and teacher_id=p_teacher_id and is_active order by created_at desc limit 1;
   if found then p_deactivate_id:=v_row.id;
   else
     v_type:=null; v_old_teacher:=null;
     if p_legacy_table='teacher_subject_assignments' then
       select teacher_id,class_id,subject_id into v_old_teacher,v_class,v_subject from public.teacher_subject_assignments where id=p_legacy_id and academic_year_id=p_year_id and semester_no=p_semester and is_active;
       v_type:='guru_mapel';
     elsif p_legacy_table='class_partner_assignments' then
       select teacher_id,class_id into v_old_teacher,v_class from public.class_partner_assignments where id=p_legacy_id and academic_year_id=p_year_id and semester_no=p_semester and is_active;
       v_type:='guru_partner';
     elsif p_legacy_table='tahfizh_teacher_assignments' then
       select teacher_id,class_id,team_name into v_old_teacher,v_class,v_team from public.tahfizh_teacher_assignments where id=p_legacy_id and academic_year_id=p_year_id and semester_no=p_semester and is_active;
       v_type:='guru_tahfizh';
     elsif p_legacy_table='report_class_assignments' then
       select homeroom_teacher_id,class_id into v_old_teacher,v_class from public.report_class_assignments where id=p_legacy_id and academic_year_id=p_year_id and semester_no=p_semester;
       v_type:='wali_kelas';
     end if;
     if v_type is null or v_old_teacher is null or v_old_teacher<>p_teacher_id then raise exception 'assignment_not_found'; end if;
     insert into public.admin_teacher_assignments(school_unit_id,academic_year_id,semester_no,teacher_id,assignment_type,class_id,subject_id,team_name,is_active,operational_table,operational_id,created_by)
       values(v_unit,p_year_id,p_semester,v_old_teacher,v_type,v_class,v_subject,v_team,true,p_legacy_table,p_legacy_id,p_actor_id) returning id into p_deactivate_id;
   end if;
 end if;
 if p_deactivate_id is not null then
   select * into v_row from public.admin_teacher_assignments where id=p_deactivate_id and academic_year_id=p_year_id and semester_no=p_semester for update;
   if not found then raise exception 'assignment_not_found'; end if;
   if not v_row.is_active then return jsonb_build_object('success',true); end if;
   if v_row.operational_table='report_class_assignments' then
     update public.report_class_assignments set homeroom_teacher_id=null,homeroom_signature_path=null,updated_at=now() where id=v_row.operational_id and homeroom_teacher_id=v_row.teacher_id;
   elsif v_row.operational_table='class_partner_assignments' then
     update public.class_partner_assignments set is_active=false,is_primary=false,updated_at=now() where id=v_row.operational_id and teacher_id=v_row.teacher_id;
     update public.report_class_assignments set partner_teacher_id=null,partner_signature_path=null,updated_at=now() where academic_year_id=p_year_id and semester_no=p_semester and class_id=v_row.class_id and partner_teacher_id=v_row.teacher_id;
   elsif v_row.operational_table='teacher_subject_assignments' then
     update public.teacher_subject_assignments set is_active=false,updated_at=now() where id=v_row.operational_id and teacher_id=v_row.teacher_id;
   elsif v_row.operational_table='tahfizh_teacher_assignments' then
     update public.tahfizh_teacher_assignments set is_active=false where id=v_row.operational_id and teacher_id=v_row.teacher_id;
   end if;
   update public.admin_teacher_assignments set is_active=false,updated_at=now()
   where id=v_row.id or (academic_year_id=p_year_id and semester_no=p_semester and teacher_id=v_row.teacher_id and operational_table=v_row.operational_table and operational_id=v_row.operational_id and is_active);
   return jsonb_build_object('success',true);
 end if;
 if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items)=0 or jsonb_array_length(p_items)>500 then raise exception 'assignment_required'; end if;
 perform 1 from public.teachers where id=p_teacher_id and upper(status)='AKTIF' for share;
 if not found then raise exception 'teacher_not_active'; end if;
 for v_item in select value from jsonb_array_elements(p_items) loop
   v_type:=v_item->>'assignment_type'; v_class:=nullif(v_item->>'class_id','')::uuid; v_subject:=nullif(v_item->>'subject_id','')::uuid;
   v_title:=nullif(left(btrim(v_item->>'title'),160),''); v_notes:=nullif(left(btrim(v_item->>'notes'),1000),''); v_team:=nullif(left(btrim(v_item->>'team_name'),120),'');
   if v_type is null or v_type not in ('wali_kelas','guru_partner','guru_mapel','guru_tahfizh','tugas_tambahan') then raise exception 'assignment_type_invalid'; end if;
   if v_type<>'tugas_tambahan' then
     perform 1 from public.classes where id=v_class and academic_year_id=p_year_id and school_unit_id=v_unit and is_active for share;
     if not found then raise exception 'class_invalid'; end if;
   else
     v_class:=null;
     if v_title is null then raise exception 'title_required'; end if;
   end if;
   if v_type='guru_mapel' then
     perform 1 from public.subjects where id=v_subject and school_unit_id=v_unit and is_active for share;
     if not found then raise exception 'subject_invalid'; end if;
   else v_subject:=null; end if;
   if v_type<>'tugas_tambahan' then v_title:=null; end if;
   if v_type<>'guru_tahfizh' then v_team:=null; end if;
   v_id:=null; v_op:=null; v_table:=null;
   select id into v_id from public.admin_teacher_assignments where academic_year_id=p_year_id and semester_no=p_semester and teacher_id=p_teacher_id and assignment_type=v_type and class_id is not distinct from v_class and subject_id is not distinct from v_subject and title is not distinct from v_title and is_active order by created_at limit 1;
   if v_id is null then
     insert into public.admin_teacher_assignments(school_unit_id,academic_year_id,semester_no,teacher_id,assignment_type,class_id,subject_id,title,notes,team_name,is_active,created_by)
       values(v_unit,p_year_id,p_semester,p_teacher_id,v_type,v_class,v_subject,v_title,v_notes,v_team,true,p_actor_id) returning id into v_id;
   end if;
   if v_type='guru_mapel' then
     v_table:='teacher_subject_assignments';
     select id into v_op from public.teacher_subject_assignments where academic_year_id=p_year_id and semester_no=p_semester and teacher_id=p_teacher_id and class_id=v_class and subject_id=v_subject order by is_active desc,created_at limit 1;
     if v_op is null then
       insert into public.teacher_subject_assignments(teacher_id,class_id,subject_id,academic_year_id,semester_no,is_active,source_system,source_ref,notes) values(p_teacher_id,v_class,v_subject,p_year_id,p_semester,true,'CQlass Admin','admin_assignment:'||v_id,v_notes) returning id into v_op;
     else update public.teacher_subject_assignments set is_active=true,updated_at=now() where id=v_op; end if;
   elsif v_type='guru_tahfizh' then
     v_table:='tahfizh_teacher_assignments';
     select id into v_op from public.tahfizh_teacher_assignments where academic_year_id=p_year_id and semester_no=p_semester and teacher_id=p_teacher_id and class_id=v_class order by is_active desc,created_at limit 1;
     if v_op is null then
       insert into public.tahfizh_teacher_assignments(teacher_id,class_id,academic_year_id,semester_no,team_name,is_active,source_ref) values(p_teacher_id,v_class,p_year_id,p_semester,v_team,true,'admin_assignment:'||v_id) returning id into v_op;
     else update public.tahfizh_teacher_assignments set is_active=true,team_name=coalesce(v_team,team_name) where id=v_op; end if;
   elsif v_type='guru_partner' then
     v_table:='class_partner_assignments';
     select id into v_op from public.class_partner_assignments where academic_year_id=p_year_id and semester_no=p_semester and teacher_id=p_teacher_id and class_id=v_class;
     if not exists(select 1 from public.class_partner_assignments where id=v_op and is_active) and (select count(*) from public.class_partner_assignments where academic_year_id=p_year_id and semester_no=p_semester and class_id=v_class and is_active)>=3 then raise exception 'maksimal_tiga_partner'; end if;
     if v_op is null then
       insert into public.class_partner_assignments(school_unit_id,academic_year_id,semester_no,class_id,teacher_id,is_primary,is_active,created_by) values(v_unit,p_year_id,p_semester,v_class,p_teacher_id,false,true,p_actor_id) returning id into v_op;
     else update public.class_partner_assignments set is_active=true,updated_at=now() where id=v_op; end if;
     update public.report_class_assignments set partner_teacher_id=p_teacher_id,updated_at=now() where academic_year_id=p_year_id and semester_no=p_semester and class_id=v_class and partner_teacher_id is null;
   elsif v_type='wali_kelas' then
     v_table:='report_class_assignments';
     select id,homeroom_teacher_id into v_op,v_old_teacher from public.report_class_assignments where academic_year_id=p_year_id and semester_no=p_semester and class_id=v_class for update;
     if v_op is null then
       insert into public.report_class_assignments(class_id,academic_year_id,semester_no,homeroom_teacher_id) values(v_class,p_year_id,p_semester,p_teacher_id) returning id into v_op;
     elsif v_old_teacher is distinct from p_teacher_id then
       if v_old_teacher is not null and not exists(select 1 from public.admin_teacher_assignments where operational_table=v_table and operational_id=v_op and teacher_id=v_old_teacher) then
         insert into public.admin_teacher_assignments(school_unit_id,academic_year_id,semester_no,teacher_id,assignment_type,class_id,is_active,operational_table,operational_id,created_by,notes) values(v_unit,p_year_id,p_semester,v_old_teacher,'wali_kelas',v_class,false,v_table,v_op,p_actor_id,'Penugasan sebelum pergantian wali kelas');
       end if;
       update public.admin_teacher_assignments set is_active=false,updated_at=now() where academic_year_id=p_year_id and semester_no=p_semester and assignment_type='wali_kelas' and class_id=v_class and teacher_id<>p_teacher_id and is_active;
       update public.report_class_assignments set homeroom_teacher_id=p_teacher_id,homeroom_signature_path=null,updated_at=now() where id=v_op;
     end if;
   end if;
   update public.admin_teacher_assignments set operational_table=v_table,operational_id=v_op,notes=coalesce(v_notes,notes),team_name=coalesce(v_team,team_name),updated_at=now() where id=v_id;
   v_saved:=v_saved||jsonb_build_array(jsonb_build_object('id',v_id,'type',v_type,'operational_table',v_table,'operational_id',v_op));
 end loop;
 return jsonb_build_object('success',true,'saved',v_saved);
end $$;
revoke all on function public.cq_admin_assignments_v1(uuid,uuid,integer,uuid,jsonb,uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.cq_admin_assignments_v1(uuid,uuid,integer,uuid,jsonb,uuid,text,uuid) to service_role;
