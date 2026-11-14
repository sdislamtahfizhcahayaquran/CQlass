insert into public.role_catalog (role_code, display_name, description, is_active, is_system)
values ('yayasan', 'Yayasan', 'Akses baca untuk Morning Talk, laporan Sapras, capaian TP, dan nilai akademik.', true, true)
on conflict (role_code) do nothing;
