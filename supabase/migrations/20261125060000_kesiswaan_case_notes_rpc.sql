-- Daftar laporan kasus dari walas untuk halaman Kasus & Pendampingan Kesiswaan.
-- Menggantikan pemakaian aksi 'report' (yang ikut memuat semua sesi Morning Talk dan gagal
-- "Bad Request" untuk rentang panjang karena daftar ID sesi melebihi batas panjang URL).
create or replace function public.kesiswaan_case_notes(p_token text, p_from date, p_to date)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform public.kesiswaan_reminder_auth(p_token);
  return jsonb_build_object('success', true, 'cases', coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', n.id, 'student_id', n.student_id, 'class_id', n.class_id,
      'incident_date', n.incident_date, 'date', n.incident_date,
      'student_name', coalesce(s.full_name, '-'), 'class_name', coalesce(c.name, '-'),
      'category', n.category, 'attention_level', n.attention_level, 'main_problem', n.main_problem,
      'summary', n.summary, 'story', n.story, 'final_suggestion', n.final_suggestion,
      'urgent', n.urgent, 'needs_parent', n.needs_parent, 'needs_student_affairs', n.needs_student_affairs, 'needs_uks', n.needs_uks,
      'evaluation_date', n.evaluation_date, 'status', n.status,
      'student_affairs_follow_up', n.student_affairs_follow_up, 'student_affairs_status', n.student_affairs_status,
      'escalation_to', n.escalation_to, 'escalated_at', n.escalated_at) order by n.incident_date desc nulls last, n.created_at desc)
    from public.student_case_notes n
    left join public.students s on s.id = n.student_id
    left join public.classes c on c.id = n.class_id
    where not n.is_deleted
      and (p_from is null or n.incident_date >= p_from)
      and (p_to is null or n.incident_date <= p_to)), '[]'::jsonb));
end;
$$;

revoke all on function public.kesiswaan_case_notes(text, date, date) from public;
grant execute on function public.kesiswaan_case_notes(text, date, date) to anon, authenticated;
