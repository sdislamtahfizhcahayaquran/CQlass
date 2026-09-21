insert into public.non_teaching_activity_master
  (code,name,category,counts_as_work,requires_note,sort_order,is_active,updated_at)
values
  ('JAGA_UKS','Jaga UKS','duty',true,false,85,true,now())
on conflict (code) do update set
  name=excluded.name,
  category=excluded.category,
  counts_as_work=excluded.counts_as_work,
  requires_note=excluded.requires_note,
  sort_order=excluded.sort_order,
  is_active=true,
  updated_at=now();
