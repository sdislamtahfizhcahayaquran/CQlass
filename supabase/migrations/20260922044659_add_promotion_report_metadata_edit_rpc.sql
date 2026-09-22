create or replace function public.update_employee_promotion_report(
  p_session_token text,
  p_id uuid,
  p_activity_date date,
  p_title text,
  p_description text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_account_id uuid;
  v_account_status text;
  v_updated public.employee_promotion_reports%rowtype;
begin
  if nullif(btrim(coalesce(p_session_token, '')), '') is null then
    return jsonb_build_object('success', false, 'error', 'session_invalid');
  end if;

  select s.user_account_id, lower(coalesce(a.status, ''))
    into v_account_id, v_account_status
  from public.user_sessions s
  join public.user_accounts a on a.id = s.user_account_id
  where s.token_hash = encode(extensions.digest(p_session_token, 'sha256'), 'hex')
    and s.revoked_at is null
    and s.expires_at > now()
  limit 1;

  if v_account_id is null or v_account_status in ('nonaktif','inactive','disabled','blocked') then
    return jsonb_build_object('success', false, 'error', 'session_invalid');
  end if;

  if p_id is null or p_activity_date is null then
    return jsonb_build_object('success', false, 'error', 'invalid_input');
  end if;

  update public.employee_promotion_reports
  set activity_date = p_activity_date,
      title = coalesce(nullif(btrim(coalesce(p_title, '')), ''), 'Promosi Socmed'),
      description = btrim(coalesce(p_description, '')),
      updated_at = now()
  where id = p_id
    and user_account_id = v_account_id
  returning * into v_updated;

  if not found then
    return jsonb_build_object('success', false, 'error', 'not_found');
  end if;

  return jsonb_build_object(
    'success', true,
    'item', jsonb_build_object(
      'id', v_updated.id,
      'activity_date', v_updated.activity_date,
      'title', v_updated.title,
      'description', v_updated.description,
      'updated_at', v_updated.updated_at
    )
  );
end;
$$;

revoke all on function public.update_employee_promotion_report(text, uuid, date, text, text) from public;
grant execute on function public.update_employee_promotion_report(text, uuid, date, text, text) to anon, authenticated;
