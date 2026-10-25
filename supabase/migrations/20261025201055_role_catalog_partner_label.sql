-- Label only: preserve role codes, active grants and teacher assignments.
UPDATE public.role_catalog
SET display_name = 'Guru Partner',
    description = 'Pendamping kelas sesuai Penugasan Guru. Tugas Tahfizh ditetapkan terpisah dan dapat dirangkap.'
WHERE role_code = 'guru_partner' AND display_name = 'Guru Partner / Tahfizh';
