alter table public.kesiswaan_late_letters
  add column printed_at timestamptz,
  add column printed_by uuid references public.user_accounts(id),
  add constraint kesiswaan_late_letters_print_pair
    check ((printed_at is null) = (printed_by is null));

grant update (printed_at, printed_by) on public.kesiswaan_late_letters to service_role;
