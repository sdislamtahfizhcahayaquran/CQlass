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
 select coalesce(jsonb_agg(jsonb_build_object('role_code',role_code,'display_name',display_name,'description',description,'is_active',is_active,'is_system',is_system) order by display_name),'[]') into v_rows from public.role_catalog;
 return jsonb_build_object('success',true,'roles',v_rows,'is_admin',v_admin,'reauth_required',not exists(select 1 from public.user_sessions where token_hash=encode(extensions.digest(p_session_token,'sha256'),'hex') and revoked_at is null and expires_at>now()));
end $$;

-- Keep the reserved bootstrap username bound to its existing account while legacy consumers remain.
create or replace function public.cq_reserved_admin_username_v1()
returns trigger language plpgsql set search_path='' as $$
begin
 if lower(new.username) is distinct from lower(old.username) and (lower(old.username)='admin' or lower(new.username)='admin') then raise exception 'reserved_admin_username'; end if;
 return new;
end $$;
create trigger cq_reserved_admin_username before update of username on public.user_accounts
for each row execute function public.cq_reserved_admin_username_v1();
revoke all on function public.cq_reserved_admin_username_v1() from public,anon,authenticated;
