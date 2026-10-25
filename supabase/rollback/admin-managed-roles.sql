-- Emergency rollback only; deploy baseline Edge functions and frontend together.
-- Does not restore role grants intentionally changed by an Admin after deployment.
begin;
drop trigger if exists cq_reserved_admin_username on public.user_accounts;
drop function if exists public.cq_reserved_admin_username_v1();
drop trigger if exists cq_role_catalog_guard on public.role_catalog;
drop trigger if exists cq_user_role_guard on public.user_roles;
drop trigger if exists cq_user_role_session_invalidation on public.user_roles;
drop function if exists public.cq_admin_save_user_v1(uuid,uuid,uuid,text,text,text,text,text,text[]);
drop function if exists public.cq_admin_assignments_v1(uuid,uuid,integer,uuid,jsonb,uuid,text,uuid);
drop function if exists public.cq_role_catalog_guard_v1();
drop function if exists public.cq_user_role_guard_v1();
CREATE OR REPLACE FUNCTION public.role_catalog_manage(p_session_token text, p_action text, p_role_code text DEFAULT NULL::text, p_display_name text DEFAULT NULL::text, p_description text DEFAULT NULL::text, p_is_active boolean DEFAULT NULL::boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'pg_temp'
AS $function$
declare v_account_id uuid; v_teacher_id uuid; v_username text; v_is_admin boolean:=false; v_code text; v_rows jsonb;
begin
 select us.user_account_id into v_account_id from public.user_sessions us where us.token_hash=encode(extensions.digest(coalesce(p_session_token,''),'sha256'),'hex') and us.revoked_at is null and us.expires_at>now() limit 1;
 if v_account_id is null then return jsonb_build_object('success',false,'error','session_invalid'); end if;
 select ua.teacher_id,ua.username into v_teacher_id,v_username from public.user_accounts ua where ua.id=v_account_id and lower(coalesce(ua.status,'aktif')) not in ('inactive','nonaktif','disabled','blocked') limit 1;
 v_is_admin:=lower(coalesce(v_username,''))='admin';
 if not v_is_admin and v_teacher_id is not null then select exists(select 1 from public.user_roles ur where ur.teacher_id=v_teacher_id and ur.is_active and lower(ur.role_code)='admin') into v_is_admin; end if;
 if lower(coalesce(p_action,''))='list' then
   select coalesce(jsonb_agg(jsonb_build_object('role_code',role_code,'display_name',display_name,'description',description,'is_active',is_active,'is_system',is_system) order by display_name),'[]'::jsonb) into v_rows from public.role_catalog where is_active or v_is_admin;
   return jsonb_build_object('success',true,'roles',v_rows,'is_admin',v_is_admin);
 end if;
 if not v_is_admin then return jsonb_build_object('success',false,'error','admin_only'); end if;
 v_code:=lower(regexp_replace(trim(coalesce(p_role_code,'')),'[^a-zA-Z0-9]+','_','g'));
 if v_code='' then return jsonb_build_object('success',false,'error','invalid_role_code'); end if;
 if lower(p_action)='upsert' then
   insert into public.role_catalog(role_code,display_name,description,is_active,updated_at)
   values(v_code,coalesce(nullif(trim(p_display_name),''),initcap(replace(v_code,'_',' '))),p_description,coalesce(p_is_active,true),now())
   on conflict(role_code) do update set display_name=excluded.display_name,description=excluded.description,is_active=excluded.is_active,updated_at=now();
 elsif lower(p_action)='toggle' then
   if v_code='admin' and coalesce(p_is_active,false)=false then return jsonb_build_object('success',false,'error','admin_role_required'); end if;
   update public.role_catalog set is_active=coalesce(p_is_active,is_active),updated_at=now() where role_code=v_code;
 else return jsonb_build_object('success',false,'error','invalid_action'); end if;
 return public.role_catalog_manage(p_session_token,'list',null,null,null,null);
end $function$
;
commit;
