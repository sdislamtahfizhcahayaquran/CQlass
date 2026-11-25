-- Surat Kesiswaan (Keterangan Siswa Aktif, Surat Keterangan Siswa, Dispensasi, Teguran Ekskul).
-- Nomor otomatis per jenis surat per tahun (sesuai format surat manual sekolah: 050/SK/SDCQ/VIII/2026,
-- 018/SK-K/SDCQ/III/2026, 001/DSP/SDIT-CQ/X/2026, 051/STG/SDITCQ/VIII/2026).
-- Nomor awal bisa diatur saat menerbitkan agar melanjutkan nomor surat manual yang sudah ada.

create table if not exists public.kesiswaan_letters (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('aktif', 'skkb', 'dispensasi', 'teguran_ekskul')),
  year integer not null check (year between 2020 and 2100),
  seq integer not null check (seq between 1 and 9999),
  number_label text not null,
  student_id uuid references public.students(id) on delete set null,
  issued_on date not null,
  payload jsonb not null default '{}'::jsonb,
  issued_by uuid references public.user_accounts(id) on delete set null,
  created_at timestamptz not null default now(),
  printed_at timestamptz,
  unique (kind, year, seq)
);
create index if not exists kesiswaan_letters_student_idx on public.kesiswaan_letters (student_id);
alter table public.kesiswaan_letters enable row level security;
revoke all on public.kesiswaan_letters from anon, authenticated;

create or replace function public.kesiswaan_letter_label(p_kind text, p_seq integer, p_date date)
returns text
language sql
immutable
set search_path = public
as $$
  select lpad(p_seq::text, 3, '0') || '/' ||
    case p_kind when 'aktif' then 'SK/SDCQ' when 'skkb' then 'SK-K/SDCQ' when 'dispensasi' then 'DSP/SDIT-CQ' else 'STG/SDITCQ' end
    || '/' || (array['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'])[extract(month from p_date)::int]
    || '/' || extract(year from p_date)::int;
$$;

-- Nomor berikutnya per jenis (tahun dari tanggal surat).
create or replace function public.kesiswaan_letter_next(p_token text, p_kind text, p_date date)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare v_next integer;
begin
  perform public.kesiswaan_reminder_auth(p_token);
  select coalesce(max(seq), 0) + 1 into v_next from public.kesiswaan_letters
  where kind = p_kind and year = extract(year from coalesce(p_date, current_date))::int;
  return jsonb_build_object('success', true, 'next', v_next,
    'label', public.kesiswaan_letter_label(p_kind, v_next, coalesce(p_date, current_date)));
end;
$$;

-- Terbitkan satu atau beberapa surat sekaligus (nomor berurutan). p_items: [{student_id, payload}]
create or replace function public.kesiswaan_letter_issue(p_token text, p_kind text, p_date date, p_items jsonb, p_start integer default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account uuid := public.kesiswaan_reminder_auth(p_token);
  v_year integer := extract(year from p_date)::int;
  v_min integer;
  v_seq integer;
  v_item jsonb;
  v_out jsonb := '[]'::jsonb;
  v_row public.kesiswaan_letters;
begin
  if p_kind not in ('aktif', 'skkb', 'dispensasi', 'teguran_ekskul') then raise exception 'Jenis surat tidak dikenal.'; end if;
  if p_date is null then raise exception 'Tanggal surat wajib diisi.'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 60 then
    raise exception 'Pilih 1 sampai 60 siswa.';
  end if;
  perform pg_advisory_xact_lock(hashtext('kesiswaan_letters:' || p_kind || ':' || v_year));
  select coalesce(max(seq), 0) + 1 into v_min from public.kesiswaan_letters where kind = p_kind and year = v_year;
  if p_start is not null and p_start < v_min then
    raise exception 'Nomor % sudah terpakai. Nomor paling kecil yang bisa dipakai: %.', p_start, v_min;
  end if;
  v_seq := coalesce(p_start, v_min);
  for v_item in select * from jsonb_array_elements(p_items) loop
    insert into public.kesiswaan_letters (kind, year, seq, number_label, student_id, issued_on, payload, issued_by)
    values (p_kind, v_year, v_seq, public.kesiswaan_letter_label(p_kind, v_seq, p_date),
            nullif(v_item ->> 'student_id', '')::uuid, p_date, coalesce(v_item -> 'payload', '{}'::jsonb), v_account)
    returning * into v_row;
    v_out := v_out || jsonb_build_object('id', v_row.id, 'number_label', v_row.number_label, 'student_id', v_row.student_id,
      'kind', v_row.kind, 'issued_on', v_row.issued_on, 'payload', v_row.payload);
    v_seq := v_seq + 1;
  end loop;
  return jsonb_build_object('success', true, 'letters', v_out);
end;
$$;

create or replace function public.kesiswaan_letter_list(p_token text, p_limit integer default 100)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform public.kesiswaan_reminder_auth(p_token);
  return jsonb_build_object('success', true, 'letters', coalesce((
    select jsonb_agg(jsonb_build_object('id', l.id, 'kind', l.kind, 'number_label', l.number_label, 'student_id', l.student_id,
      'issued_on', l.issued_on, 'payload', l.payload, 'printed_at', l.printed_at, 'created_at', l.created_at)
      order by l.created_at desc)
    from (select * from public.kesiswaan_letters order by created_at desc limit least(greatest(coalesce(p_limit, 100), 1), 500)) l), '[]'::jsonb));
end;
$$;

create or replace function public.kesiswaan_letter_printed(p_token text, p_ids uuid[])
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.kesiswaan_reminder_auth(p_token);
  update public.kesiswaan_letters set printed_at = now() where id = any(p_ids) and printed_at is null;
  return jsonb_build_object('success', true);
end;
$$;

revoke all on function public.kesiswaan_letter_label(text, integer, date) from public, anon, authenticated;
revoke all on function public.kesiswaan_letter_next(text, text, date) from public;
revoke all on function public.kesiswaan_letter_issue(text, text, date, jsonb, integer) from public;
revoke all on function public.kesiswaan_letter_list(text, integer) from public;
revoke all on function public.kesiswaan_letter_printed(text, uuid[]) from public;
grant execute on function public.kesiswaan_letter_next(text, text, date) to anon, authenticated;
grant execute on function public.kesiswaan_letter_issue(text, text, date, jsonb, integer) to anon, authenticated;
grant execute on function public.kesiswaan_letter_list(text, integer) to anon, authenticated;
grant execute on function public.kesiswaan_letter_printed(text, uuid[]) to anon, authenticated;
