create table if not exists public.teacher_work_schedule_templates (
  id uuid primary key default gen_random_uuid(),
  school_unit_id uuid not null references public.school_units(id) on delete cascade,
  academic_year_id uuid not null references public.academic_years(id) on delete cascade,
  semester_no smallint not null check (semester_no in (1,2)),
  day_of_week smallint not null check (day_of_week between 1 and 5),
  start_time time not null,
  end_time time not null,
  activity_code text not null check (activity_code in ('briefing','student_welcome_class','student_welcome_gate','administration_eduhub')),
  activity_name text not null,
  applies_to_all boolean not null default false,
  teacher_id uuid references public.teachers(id) on delete cascade,
  assignee_label text,
  team_label text,
  duty_location text,
  source_ref text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (applies_to_all or teacher_id is not null or assignee_label is not null),
  unique (academic_year_id, semester_no, day_of_week, source_ref)
);

alter table public.teacher_work_schedule_templates enable row level security;
revoke all on public.teacher_work_schedule_templates from anon, authenticated;
grant select, insert, update, delete on public.teacher_work_schedule_templates to service_role;

create index if not exists teacher_work_schedule_templates_lookup_idx
  on public.teacher_work_schedule_templates (academic_year_id, semester_no, day_of_week, teacher_id, is_active);

-- Rutinitas semua guru. Senin tidak ada briefing; penyambutan dan administrasi tetap berjalan.
with days(day_no) as (values (1),(2),(3),(4),(5)),
active_year as (
  select id, school_unit_id from public.academic_years
  where name='2026/2027' and is_active=true
)
insert into public.teacher_work_schedule_templates
  (school_unit_id,academic_year_id,semester_no,day_of_week,start_time,end_time,
   activity_code,activity_name,applies_to_all,source_ref)
select ay.school_unit_id,ay.id,1,d.day_no,'07:10'::time,'07:30'::time,
       'student_welcome_class','Menyambut siswa di kelas',true,'ROUTINE:WELCOME_CLASS'
from active_year ay cross join days d
union all
select ay.school_unit_id,ay.id,1,d.day_no,'15:00'::time,'16:00'::time,
       'administration_eduhub','Penginputan Eduhub / administrasi',true,'ROUTINE:EDUHUB'
from active_year ay cross join days d
union all
select ay.school_unit_id,ay.id,1,d.day_no,'07:00'::time,'07:10'::time,
       'briefing','Briefing pagi',true,'ROUTINE:BRIEFING'
from active_year ay cross join days d where d.day_no between 2 and 5
on conflict (academic_year_id,semester_no,day_of_week,source_ref)
do update set start_time=excluded.start_time,end_time=excluded.end_time,
 activity_name=excluded.activity_name,is_active=true,updated_at=now();

-- Jadwal gerbang utama dan saung. Pencocokan memakai nama resmi pada master guru.
with duty(day_no, person_name, display_name, team_label, location, source_ref) as (
 values
 (1,'Agung Efendi','Ust. Agung','Tim 1 Ikhwan','Gerbang Atas/Bawah','GATE:T1I:1A'),
 (2,'Aryobimo Rayana Zidna Fann','Ust. Bimo','Tim 1 Ikhwan','Gerbang Atas/Bawah','GATE:T1I:1A'),
 (3,'Hasan Nurrohman','Ust. Hasan','Tim 1 Ikhwan','Gerbang Atas/Bawah','GATE:T1I:1A'),
 (4,'M. Rifqi Qowi Barru Nasution','Ust. Qowi','Tim 1 Ikhwan','Gerbang Atas/Bawah','GATE:T1I:1A'),
 (5,'Rohman, M.Pd.','Ust. Rohman','Tim 1 Ikhwan','Gerbang Atas/Bawah','GATE:T1I:1A'),
 (1,'M. Dafa Yusya','Ust. Daffa','Tim 1 Ikhwan','Gerbang Atas/Bawah','GATE:T1I:1B'),
 (2,'Muchlissina Lahudin, S.Pd.','Ust. Mukhlis','Tim 1 Ikhwan','Gerbang Atas/Bawah','GATE:T1I:1B'),
 (3,'Arif Hidayat','Ust. Arif','Tim 1 Ikhwan','Gerbang Atas/Bawah','GATE:T1I:1B'),
 (4,'Fika Hilman','Ust. Hilman','Tim 1 Ikhwan','Gerbang Atas/Bawah','GATE:T1I:1B'),
 (5,'Fatih Raihan, S.Pd.','Ust. Fatih','Tim 1 Ikhwan','Gerbang Atas/Bawah','GATE:T1I:1B'),
 (1,'Baharuddin, S.Pd.','Ust. Bahar','Tim 2 Ikhwan','Gerbang Atas/Bawah','GATE:T2I:1A'),
 (2,'M. Luthfi Taufiqurrahman, S.H','Ust. Luthfi','Tim 2 Ikhwan','Gerbang Atas/Bawah','GATE:T2I:1A'),
 (3,'Muhamad Azmi Mujahid Hasan','Ust. Azmi','Tim 2 Ikhwan','Gerbang Atas/Bawah','GATE:T2I:1A'),
 (4,'Sahid Cakra Buana, S.Ag.','Ust. Sahid','Tim 2 Ikhwan','Gerbang Atas/Bawah','GATE:T2I:1A'),
 (5,'Faaruq Ibrahim, S.Pd.','Ust. Faruq','Tim 2 Ikhwan','Gerbang Atas/Bawah','GATE:T2I:1A'),
 (1,'Yazid Abdurrohman, S.Pd.','Ust. Yazid','Tim 2 Ikhwan','Gerbang Atas/Bawah','GATE:T2I:1B'),
 (2,'Qeis Ann Ubaydilla','Ust. Qeis','Tim 2 Ikhwan','Gerbang Atas/Bawah','GATE:T2I:1B'),
 (3,'Muhammad Sa''ad Salim, S.Sos.','Ust. Sa''ad','Tim 2 Ikhwan','Gerbang Atas/Bawah','GATE:T2I:1B'),
 (4,'Ali Rahmatan Lil Alamin, S.Pd.','Ust. Ali','Tim 2 Ikhwan','Gerbang Atas/Bawah','GATE:T2I:1B'),
 (5,'Naufal Ekasukma, S.Pd.','Ust. Naufal','Tim 2 Ikhwan','Gerbang Atas/Bawah','GATE:T2I:1B'),
 (1,'Karina Vega Irawan, S.Pd.','Bu Karina','Tim 1 Akhwat','Gerbang Atas/Bawah','GATE:T1A:1A'),
 (2,'Ai Hilma Nurjamilah','Bu Hilma','Tim 1 Akhwat','Gerbang Atas/Bawah','GATE:T1A:1A'),
 (3,'Dila Nur Azizah, S.Pd.','Bu Dila','Tim 1 Akhwat','Gerbang Atas/Bawah','GATE:T1A:1A'),
 (4,'Nurul Ngaeni, S.Pd.','Bu Nurul','Tim 1 Akhwat','Gerbang Atas/Bawah','GATE:T1A:1A'),
 (5,'Najwa Azka Khairani, S.Pd.','Bu Najwa','Tim 1 Akhwat','Gerbang Atas/Bawah','GATE:T1A:1A'),
 (1,'Malika Luthfi Azzahra','Bu Malikha','Tim 1 Akhwat','Gerbang Atas/Bawah','GATE:T1A:1B'),
 (2,'Hasna','Bu Hasna','Tim 1 Akhwat','Gerbang Atas/Bawah','GATE:T1A:1B'),
 (3,'Dina Anis Faizah','Bu Dina','Tim 1 Akhwat','Gerbang Atas/Bawah','GATE:T1A:1B'),
 (4,'Riska Aiman','Bu Riska','Tim 1 Akhwat','Gerbang Atas/Bawah','GATE:T1A:1B'),
 (5,'Aghista Putri Amelia, S.Pd.','Bu Aghista','Tim 1 Akhwat','Gerbang Atas/Bawah','GATE:T1A:1B'),
 (1,'Salma Khoirunisa, S.Pd.','Bu Salma','Tim 2 Akhwat','Gerbang Atas/Bawah','GATE:T2A:1A'),
 (2,'Devita Irmayani, S.Pd.','Bu Devita','Tim 2 Akhwat','Gerbang Atas/Bawah','GATE:T2A:1A'),
 (3,'Mulya Widianti, S.Hum','Bu Mulya','Tim 2 Akhwat','Gerbang Atas/Bawah','GATE:T2A:1A'),
 (4,'Aniquzzharati','Bu Aniq','Tim 2 Akhwat','Gerbang Atas/Bawah','GATE:T2A:1A'),
 (5,null,'Bu Anis','Tim 2 Akhwat','Gerbang Atas/Bawah','GATE:T2A:1A'),
 (1,'Zeni Hardiyanita, S.Pd.','Bu Zeni','Tim 2 Akhwat','Gerbang Atas/Bawah','GATE:T2A:1B'),
 (2,'Azizah, S.Pd.','Bu Azizah','Tim 2 Akhwat','Gerbang Atas/Bawah','GATE:T2A:1B'),
 (3,'Dianita Priliasari, S.Pd.','Bu Dian','Tim 2 Akhwat','Gerbang Atas/Bawah','GATE:T2A:1B'),
 (4,'Nata Dian Pahira','Bu Nata','Tim 2 Akhwat','Gerbang Atas/Bawah','GATE:T2A:1B'),
 (5,'Muna Hanifah','Bu Muna','Tim 2 Akhwat','Gerbang Atas/Bawah','GATE:T2A:1B'),
 (1,'Dimas Hudda Satriani, S.Pd.','Ust. Dimas','Tim Saung','Gerbang Saung','GATE:SAUNG'),
 (2,'M. Faris Aufarinsan, Lc','Ust. Fariz','Tim Saung','Gerbang Saung','GATE:SAUNG'),
 (3,'Muhammad Ilham, M.Pd.','Ust. Ilham','Tim Saung','Gerbang Saung','GATE:SAUNG'),
 (4,'Hafizh Maulana S., S.Sos','Ust. Hafiz','Tim Saung','Gerbang Saung','GATE:SAUNG'),
 (5,null,'Walas Kelas 1 & 2','Tim Saung','Gerbang Saung','GATE:SAUNG')
), active_year as (
 select id,school_unit_id from public.academic_years where name='2026/2027' and is_active=true
)
insert into public.teacher_work_schedule_templates
 (school_unit_id,academic_year_id,semester_no,day_of_week,start_time,end_time,
  activity_code,activity_name,teacher_id,assignee_label,team_label,duty_location,source_ref)
select ay.school_unit_id,ay.id,1,d.day_no,'07:00'::time,'07:30'::time,
 'student_welcome_gate','Piket penyambutan siswa',t.id,d.display_name,d.team_label,d.location,d.source_ref
from active_year ay cross join duty d
left join public.teachers t on t.full_name=d.person_name
on conflict (academic_year_id,semester_no,day_of_week,source_ref)
do update set teacher_id=excluded.teacher_id,assignee_label=excluded.assignee_label,
 team_label=excluded.team_label,duty_location=excluded.duty_location,is_active=true,updated_at=now();
