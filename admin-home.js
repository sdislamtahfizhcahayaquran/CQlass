/* CQlass — Beranda Admin: daftar tugas admin dan pintasan. Hanya untuk role admin. */
(function(){
'use strict';
if(window.__cqAdminHome)return;window.__cqAdminHome=true;
const BASE=typeof SUPABASE_URL!=='undefined'?SUPABASE_URL:'https://lmglkxzemtvxcgktiord.supabase.co';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const P={
 calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
 check:'<path d="m5 12.5 4.5 4.5L19 7.5"/>',
 alert:'<path d="M12 3 2.8 19a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3L12 3Z"/><path d="M12 9v5M12 18h.01"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
 users:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5a6.5 6.5 0 0 1 3.5 5.5"/>',
 student:'<path d="m3 9 9-5 9 5-9 5-9-5Z"/><path d="M7 11.5V16c0 1.5 2.2 3 5 3s5-1.5 5-3v-4.5"/>',
 school:'<path d="M3 21h18M5 21V8l7-5 7 5v13"/><path d="M9 21v-6h6v6"/>',
 book:'<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v17H6.5A2.5 2.5 0 0 0 4 22V5.5Z"/><path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13v17h4.5A2.5 2.5 0 0 1 20 22V5.5Z"/>',
 key:'<circle cx="8" cy="15" r="4"/><path d="m11 12 9-9M17 6l3 3"/>',
 report:'<path d="M6 3h9l3 3v15H6z"/><path d="M15 3v4h4M9 11h6M9 15h6"/>',
 task:'<path d="M9 5h10M9 12h10M9 19h10"/><path d="m4 5 1 1 2-2M4 12l1 1 2-2M4 19l1 1 2-2"/>',
 grid:'<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 9.5h17M9 9.5V20"/>',
 lock:'<rect x="5" y="10" width="14" height="10" rx="2.5"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
 layers:'<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 13 9 5 9-5"/>',
 arrow:'<path d="M5 12h14M13 6l6 6-6 6"/>',
 refresh:'<path d="M20 11a8 8 0 0 0-14.9-3.5M4 4v4h4"/><path d="M4 13a8 8 0 0 0 14.9 3.5M20 20v-4h-4"/>'
};
const ic=(n,s=18)=>`<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex:none">${P[n]||''}</svg>`;
function isAdmin(){try{return String(currentUser?.role||'').toLowerCase()==='admin'}catch(_){return false}}
function token(){try{return typeof getAuthToken==='function'?getAuthToken():(localStorage.getItem('cqlass_session_token')||'')}catch(_){return''}}
async function call(fn,action,p={}){const k=typeof SUPABASE_PUBLISHABLE_KEY!=='undefined'?SUPABASE_PUBLISHABLE_KEY:'';const r=await fetch(`${BASE}/functions/v1/${fn}`,{method:'POST',headers:{'Content-Type':'application/json',apikey:k,Authorization:'Bearer '+k,'x-session-token':token()},body:JSON.stringify({action,...p})});const d=await r.json().catch(()=>({}));if(!r.ok||d.success===false)throw Error(d.message||d.error||'Gagal memuat');return d}
const safe=p=>p.then(v=>({ok:true,v}),e=>({ok:false,e}));
function greet(){const h=Number(new Intl.DateTimeFormat('en-GB',{hour:'numeric',hour12:false,timeZone:'Asia/Jakarta'}).format(new Date()));return h<11?'Selamat pagi':h<15?'Selamat siang':h<18?'Selamat sore':'Selamat malam'}
function todayLabel(){try{return new Intl.DateTimeFormat('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:'Asia/Jakarta'}).format(new Date())}catch(_){return''}}
function userName(){try{return String(currentUser?.nama||currentUser?.username||'Admin')}catch(_){return'Admin'}}

let seq=0;
const S={data:null};
async function gather(){
 const period=await call('admin-academic-period','list');
 const years=period.years||[],year=years.find(y=>y.is_active),sem=year?.semesters?.find(s=>s.is_active);
 const no=sem?.semester_no;
 let next=null;if(year){if(no===1)next={year,no:2};else{const st=Number(String(year.name).split('/')[0]);const ny=years.find(y=>Number(String(y.name).split('/')[0])===st+1);next=ny?{year:ny,no:1}:{year:null,name:`${st+1}/${st+2}`}}}
 const jobs=await Promise.all([
  safe(call('role-dashboard','dashboard')),
  safe(call('admin-schedule-editor','list_conflicts')),
  year&&no?safe(call('admin-academic-period','effective_days',{academic_year_id:year.id,semester_no:no,assessment_period:'PTS'})):Promise.resolve({ok:false}),
  year&&no?safe(call('admin-academic-period','effective_days',{academic_year_id:year.id,semester_no:no,assessment_period:'PAS'})):Promise.resolve({ok:false}),
  year&&no?safe(call('admin-academic-period','report_config_get',{academic_year_id:year.id,semester_no:no,report_type:'PTS'})):Promise.resolve({ok:false}),
  year&&no?safe(call('admin-academic-period','report_config_get',{academic_year_id:year.id,semester_no:no,report_type:'PAS'})):Promise.resolve({ok:false}),
  next?.year?safe(call('admin-academic-period','preview_activation',{academic_year_id:next.year.id,semester_no:next.no})):Promise.resolve({ok:false}),
  safe(call('admin-academic-period','admin_health')),
  safe(call('admin-users','summary')),
  safe(call('admin-academic-period/student-profiles','summary')),
  safe(call('admin-users','list_photos'))
 ]);
 return {years,year,sem,next,dash:jobs[0],conf:jobs[1],ePTS:jobs[2],ePAS:jobs[3],rPTS:jobs[4],rPAS:jobs[5],ready:jobs[6],health:jobs[7],acct:jobs[8],bio:jobs[9],photos:jobs[10]};
}
function missingDays(r){if(!r.ok)return null;const cs=r.v.classes||[];return {total:cs.length,missing:cs.filter(c=>c.effective_days==null).length}}
function tasks(d){
 const out=[];const add=(o)=>out.push(o);
 const y=d.year,s=d.sem;
 if(!y||!s){add({level:'bad',icon:'calendar',title:'Belum ada periode aktif',text:'Tetapkan tahun ajaran dan semester aktif agar semua menu bisa dipakai.',go:"cqAdminGo('academic-period','ringkasan')",cta:'Atur periode'});return out}
 const s1=y.semesters?.find(x=>x.semester_no===1),s2=y.semesters?.find(x=>x.semester_no===2);
 const datesOk=!!(y.start_date&&y.end_date&&s1?.start_date&&s1?.end_date&&s2?.start_date&&s2?.end_date);
 add(datesOk?{level:'ok',icon:'calendar',title:'Tanggal tahun ajaran & semester',text:'Sudah diisi.'}:{level:'warn',icon:'calendar',title:'Tanggal tahun ajaran & semester belum diisi',text:`Isi tanggal mulai dan selesai ${esc(y.name)} beserta Semester 1 dan 2.`,go:"cqAdminGo('academic-period','tanggal')",cta:'Isi tanggal'});
 const a=missingDays(d.ePTS),b=missingDays(d.ePAS);
 if(a&&b){const miss=[a.missing?`STS/PTS: ${a.missing} kelas`:'',b.missing?`SAS/PAS: ${b.missing} kelas`:''].filter(Boolean);add(miss.length?{level:'warn',icon:'clock',title:`Hari efektif Semester ${s.semester_no} belum lengkap`,text:`Belum diisi — ${miss.join(' · ')}.`,go:"cqAdminGo('academic-period','hari')",cta:'Isi hari efektif'}:{level:'ok',icon:'clock',title:`Hari efektif Semester ${s.semester_no}`,text:`Lengkap untuk ${a.total} kelas.`})}
 const rp=[['STS/PTS',d.rPTS],['SAS/PAS',d.rPAS]].filter(([,r])=>r.ok);
 if(rp.length){const notSet=rp.filter(([,r])=>!r.v.config?.configured).map(([l])=>l);add(notSet.length?{level:'warn',icon:'report',title:`Pengaturan rapor ${notSet.join(' & ')} belum diatur`,text:'Tentukan periode data dan tanggal cetak rapor agar walas bisa mencetak.',go:"openCleanAdminReportPeriod()",cta:'Atur rapor'}:{level:'ok',icon:'report',title:`Pengaturan rapor Semester ${s.semester_no}`,text:'STS/PTS dan SAS/PAS sudah diatur.'})}
 if(d.health?.ok&&d.health.v.ready){const h=d.health.v,miss=h.tp_missing||[];
  add(miss.length?{level:'warn',icon:'book',title:`${miss.length} mapel belum punya TP Semester ${h.semester_no}`,text:`${miss.slice(0,6).map(x=>esc(x.subject)+' kelas '+x.grade_level).join(', ')}${miss.length>6?', …':''}. Deskripsi rapor mapel ini akan kosong.`,go:"openCleanAdminMasterTP()",cta:'Lengkapi TP'}:{level:'ok',icon:'book',title:`TP Semester ${h.semester_no}`,text:'Semua mapel yang diajarkan sudah punya TP.'});
  if(h.tp_next_semester===0)add({level:'info',icon:'book',title:'TP Semester 2 belum diimpor',text:'Impor TP Semester 2 di Master TP sebelum semester baru dimulai.',go:"openCleanAdminMasterTP()",cta:'Buka Master TP'});
  if(!h.kaldik_days)add({level:'warn',icon:'calendar',title:`Kaldik Semester ${h.semester_no} belum diupload`,text:'Kaldik dipakai untuk hari efektif, presensi, dan timesheet guru.',go:"openCleanAdminMaster()",cta:'Upload Kaldik'});}
 if(d.conf.ok){const n=Number(d.conf.v.summary?.teacher_conflicts||0)+Number(d.conf.v.summary?.class_conflicts||0);add(n?{level:'bad',icon:'alert',title:`${n} bentrok jadwal mengajar`,text:'Ada guru atau kelas yang terjadwal dua kali pada jam yang sama.',go:"openCleanAdminSchedule()",cta:'Perbaiki jadwal'}:{level:'ok',icon:'grid',title:'Jadwal mengajar',text:'Tidak ada bentrok.'})}
 if(d.next){if(!d.next.year)add({level:'info',icon:'layers',title:`Tahun ajaran ${esc(d.next.name)} belum dibuat`,text:'Siapkan sebelum tahun ajaran baru dimulai.',go:"cqAdminGo('academic-period','baru')",cta:'Buat tahun ajaran'});
  else if(d.ready.ok){const c=d.ready.v.counts||{},sem=d.next.year.semesters?.find(x=>x.semester_no===d.next.no),parts=[!(sem?.start_date&&sem?.end_date)&&'tanggal',!c.students&&'anggota siswa',!c.mapel&&'penugasan mapel',!c.tahfizh&&'penugasan Tahfizh'].filter(Boolean);add(parts.length?{level:'info',icon:'layers',title:`Persiapan ${esc(d.next.year.name)} · Semester ${d.next.no}`,text:`Belum ada: ${parts.join(', ')}.`,go:"cqAdminGo('academic-period','ringkasan')",cta:'Lihat kesiapan'}:{level:'ok',icon:'layers',title:`${esc(d.next.year.name)} · Semester ${d.next.no}`,text:'Siap diaktifkan.'})}}
 const rank={bad:0,warn:1,info:2,ok:3};return out.sort((x,y)=>rank[x.level]-rank[y.level]);
}
const num=v=>v==null||!Number.isFinite(Number(v))?'—':Number(v).toLocaleString('id-ID');
function kpis(d){const m=d.dash.ok?d.dash.v.master_counts||{}:null;const a=d.acct?.ok?d.acct.v.summary||{}:null;const b=d.bio?.ok?d.bio.v:null;
 const k=[['student','Siswa aktif',m?.students,b&&b.with_photo!=null?`${num(b.with_photo)} punya pas foto`:'','openCleanAdminStudents()'],
  ['users','Guru',m?.teachers,'','openCleanAdminUsers()'],
  ['school','Kelas',m?.classes,'','openCleanAdminAssignments()'],
  ['book','Mapel',m?.subjects,'','openCleanAdminMasterTP()'],
  ['key','Akun',m?.accounts,a&&a.logged_today!=null?`${num(a.logged_today)} login hari ini`:'','openCleanAdminUsers()']];
 return `<div class="adh-kpis">${k.map(([i,l,v,sub,go])=>`<button type="button" class="adh-kpi" onclick="${go}"><span class="adh-kpi-ic">${ic(i,18)}</span><div><b>${num(v)}</b><small>${l}</small>${sub?`<em>${esc(sub)}</em>`:''}</div></button>`).join('')}</div>`}
/* Kemajuan semester: hari ke-berapa dan sisa hari */
function semProgress(s){if(!s?.start_date||!s?.end_date)return null;const day=86400e3,today=new Date(new Date().toLocaleString('en-US',{timeZone:'Asia/Jakarta'}));today.setHours(0,0,0,0);const a=new Date(s.start_date+'T00:00:00'),b=new Date(s.end_date+'T00:00:00');const total=Math.round((b-a)/day)+1,done=Math.min(total,Math.max(0,Math.round((today-a)/day)+1));return{total,done,left:Math.max(0,Math.round((b-today)/day)),pct:Math.round(done/total*100),end:b}}
const fmtDate=d=>{try{return new Intl.DateTimeFormat('id-ID',{day:'numeric',month:'long',year:'numeric'}).format(d)}catch(_){return''}};
/* Kelengkapan data yang dikelola admin */
function meters(d){const b=d.bio?.ok?d.bio.v:null,a=d.acct?.ok?d.acct.v.summary||{}:null,ph=d.photos?.ok?Object.keys(d.photos.v.photos||{}).length:null;const out=[];
 const add=(icon,label,val,total,go,note,soft)=>{if(val==null||!total)return;const p=Math.round(val/total*100);out.push({icon,label,val,total,p,go,note,soft})};
 if(b){const act=b.active_students;if(b.empty_profiles!=null)add('student','Biodata siswa terisi',b.profiles-b.empty_profiles,act,'openCleanAdminStudents()','Dari upload Excel master siswa');else add('student','Biodata siswa terisi',b.profiles,act,'openCleanAdminStudents()','Dari upload Excel master siswa');
  if(b.no_nisn!=null)add('report','NISN siswa terisi',act-b.no_nisn,act,'openCleanAdminStudents()','Dibutuhkan untuk rapor');
  add('student','Pas foto siswa (Cover Rapor)',b.with_photo,act,'openCleanAdminStudents()','Kolom FOTO SISWA RESMI di Excel')}
 if(ph!=null&&a)add('users','Foto profil guru & pengguna',ph,a.total,'openCleanAdminUsers()','Diunggah sendiri oleh tiap pengguna',true);
 if(a)add('key','Login hari ini',a.logged_today,a.active,'openCleanAdminUsers()',`${num(a.active)} akun aktif${a.inactive?` · ${num(a.inactive)} nonaktif`:''}${a.locked?` · ${num(a.locked)} terkunci`:''}`,true);
 if(!out.length)return'';
 const tone=p=>p>=90?'ok':p>=60?'mid':'low';
 return `<section class="adh-card"><div class="adh-card-head"><div><div class="adh-card-title">Kelengkapan Data</div><div class="adh-card-sub">Klik untuk membuka menu terkait</div></div></div><div class="adh-meters">${out.map(m=>`<button type="button" class="adh-meter ${m.soft?'soft':tone(m.p)}" onclick="${m.go}"><span class="adh-meter-ic">${ic(m.icon,16)}</span><span class="adh-meter-body"><span class="adh-meter-top"><b>${esc(m.label)}</b><strong>${m.p}%</strong></span><span class="adh-bar"><i style="width:${m.p}%"></i></span><small>${num(m.val)} dari ${num(m.total)} · ${esc(m.note)}</small></span></button>`).join('')}</div></section>`}
const LINKS=[
 ['users','Guru & Pengguna','Tambah guru, buat akun, atur role','openCleanAdminUsers()'],
 ['student','Data Siswa','Daftar siswa, kelas, dan biodata','openCleanAdminStudents()'],
 ['task','Penugasan Guru','Walas, mapel, Tahfizh, partner','openCleanAdminAssignments()'],
 ['grid','Jadwal Mengajar','Atur hari dan jam pelajaran','openCleanAdminSchedule()'],
 ['calendar','Kalender Akademik','Kaldik dan aktivitas non-mengajar','openCleanAdminMaster()'],
 ['lock','Kunci Input Nilai','Buka/tutup periode input guru','openCleanAdminInputAccess()'],
 ['report','Laporan Nilai Rapor','Pantau kelengkapan nilai','openCleanAdminRaporReadiness()']
];
function view(d){
 const ts=tasks(d),todo=ts.filter(t=>t.level!=='ok'),done=ts.filter(t=>t.level==='ok');
 const y=d.year,s=d.sem,pg=semProgress(s);
 return `<div class="adh">
 <section class="cq-role-hero adh-hero" data-cq-role-theme="1"><div class="cq-role-hero-copy adh-hero-copy"><div class="cq-role-hero-eye adh-eye">${esc(todayLabel())}</div><div class="cq-role-hero-title adh-title">${greet()}, ${esc(userName())}</div><div class="cq-role-hero-sub adh-sub">${y?`<span class="adh-chip">${esc(y.name)} · Semester ${esc(s?.semester_no||'—')}</span>`:'Periode aktif belum ditetapkan'}</div>
  ${pg?`<div class="adh-prog"><div class="adh-prog-top"><span>Hari ke-${num(pg.done)} dari ${num(pg.total)}</span><span>${pg.left?`${num(pg.left)} hari lagi · selesai ${esc(fmtDate(pg.end))}`:'Semester berakhir hari ini'}</span></div><div class="adh-prog-bar"><i style="width:${pg.pct}%"></i></div></div>`:''}</div>
  <div class="adh-hero-stat ${todo.length?'':'good'}"><b>${todo.length}</b><span>${todo.length?'perlu dikerjakan':'semua beres'}</span></div></section>
 ${kpis(d)}
 <div class="adh-grid">
  <section class="adh-card adh-span"><div class="adh-card-head"><div><div class="adh-card-title">Perlu dikerjakan</div><div class="adh-card-sub">Diurutkan dari yang paling penting</div></div><button class="adh-icon-btn" onclick="renderAdminDashboard(document.getElementById('content'),true)" title="Muat ulang">${ic('refresh',16)}</button></div>
   ${todo.length?`<div class="adh-tasks">${todo.map(t=>`<div class="adh-task ${t.level}"><span class="adh-task-ic">${ic(t.icon,17)}</span><div class="adh-task-body"><b>${t.title}</b><small>${t.text}</small></div>${t.go?`<button class="adh-btn" onclick="${t.go}">${esc(t.cta)} ${ic('arrow',15)}</button>`:''}</div>`).join('')}</div>`:`<div class="adh-allgood">${ic('check',22)}<div><b>Semua beres</b><small>Tidak ada pekerjaan admin yang tertunda.</small></div></div>`}
   ${done.length?`<details class="adh-done"><summary>${ic('check',15)} ${done.length} sudah beres</summary>${done.map(t=>`<div class="adh-done-row">${ic('check',14)}<span><b>${t.title}</b> — ${t.text}</span></div>`).join('')}</details>`:''}
  </section>
  <div class="adh-side">
  ${meters(d)}
  <section class="adh-card"><div class="adh-card-head"><div><div class="adh-card-title">Pintasan</div><div class="adh-card-sub">Pekerjaan yang paling sering dilakukan</div></div></div><div class="adh-tiles">${LINKS.map(([i,t,s,go])=>`<button class="adh-tile" onclick="${go}" title="${esc(s)}"><span class="adh-link-ic">${ic(i,18)}</span><b>${t}</b></button>`).join('')}</div></section>
  </div>
 </div></div>`;
}
window.cqAdminGo=function(page,tab){if(page==='academic-period'){window.__cqAYTab=tab||'ringkasan';return window.openCleanAdminAcademicPeriod?.()}};
window.renderAdminDashboard=async function(c,force){
 if(!c||!isAdmin())return;css();const my=++seq;
 if(!S.data||force)c.innerHTML=`<div class="adh"><section class="cq-role-hero adh-hero" data-cq-role-theme="1"><div class="cq-role-hero-copy adh-hero-copy"><div class="cq-role-hero-eye adh-eye">${esc(todayLabel())}</div><div class="cq-role-hero-title adh-title">${greet()}, ${esc(userName())}</div><div class="cq-role-hero-sub adh-sub">Memeriksa pekerjaan admin…</div></div></section><div class="adh-card adh-loading"><span class="adh-spin"></span> Memuat beranda…</div></div>`;
 else c.innerHTML=view(S.data);
 try{const d=await gather();if(my!==seq||!document.body.contains(c))return;S.data=d;if(window.__cqAdminActive&&window.__cqAdminActive!=='dashboard')return;c.innerHTML=view(d)}
 catch(e){if(my!==seq)return;if(!S.data)c.innerHTML=`<div class="adh"><div class="adh-card"><b>Beranda belum dapat dimuat.</b><p class="adh-card-sub">${esc(e.message)}</p><button class="adh-btn" onclick="renderAdminDashboard(document.getElementById('content'),true)">Coba lagi</button></div></div>`}
};
function css(){if(document.getElementById('adh-css'))return;const s=document.createElement('style');s.id='adh-css';s.textContent=`
.adh{max-width:1180px;margin:0 auto;color:#123634}.adh *{box-sizing:border-box}
.adh-hero{position:relative;overflow:hidden;display:flex;align-items:center;justify-content:space-between;gap:20px;padding:26px 28px;border-radius:22px;color:#fff;margin-bottom:16px;background:linear-gradient(100deg,rgba(4,72,67,.96) 0%,rgba(8,117,104,.9) 50%,rgba(15,133,111,.7) 100%),url('login-bg.webp?v=20260910-opt1') center 48%/cover no-repeat;box-shadow:0 18px 40px rgba(7,59,56,.14)}
.adh-eye{font-size:11px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;opacity:.85}.adh-title{margin-top:6px;font-size:clamp(22px,3vw,30px);font-weight:800;letter-spacing:-.02em;line-height:1.15}.adh-sub{margin-top:6px;font-size:13px;opacity:.92}
.adh-hero-stat{position:relative;z-index:1;flex:none;min-width:120px;padding:16px 18px;border-radius:20px;text-align:center;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.35);backdrop-filter:blur(6px)}.adh-hero-stat b{display:block;font-size:40px;line-height:1;font-weight:800}.adh-hero-stat span{display:block;margin-top:5px;font-size:11px;font-weight:700;opacity:.9}
.adh-kpis{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px;margin-bottom:16px}.adh-kpi{display:flex;align-items:center;gap:12px;padding:15px 16px;background:#fff;border:1px solid #dbe8e6;border-radius:16px}.adh-kpi-ic{width:40px;height:40px;border-radius:12px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#e3f4f1,#d2ece8);color:#0a6e6e;flex:none}.adh-kpi b{display:block;font-size:21px;font-weight:800;line-height:1.1}.adh-kpi small{font-size:11.5px;color:#5f7775;font-weight:600}
.adh-grid{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(0,1fr);gap:16px;align-items:start}
.adh-card{background:#fff;border:1px solid #dbe8e6;border-radius:20px;padding:20px 22px;box-shadow:0 6px 22px rgba(10,80,76,.05)}.adh-card-head{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:14px}.adh-card-title{font-size:16px;font-weight:800}.adh-card-sub{font-size:12px;color:#5f7775;margin-top:2px}
.adh-icon-btn{width:34px;height:34px;border-radius:10px;border:1px solid #d3e3e1;background:#fff;color:#4c6664;display:flex;align-items:center;justify-content:center;cursor:pointer}.adh-icon-btn:hover{background:#f1f8f7}
.adh-tasks{display:flex;flex-direction:column;gap:10px}.adh-task{display:flex;align-items:center;gap:13px;padding:14px;border-radius:15px;border:1px solid #e5eeed;background:#fafcfc}.adh-task.bad{background:#fff6f5;border-color:#f3d2ce}.adh-task.warn{background:#fffaf1;border-color:#f1e0bb}.adh-task.info{background:#f3f9fb;border-color:#d4e8ee}
.adh-task-ic{flex:none;width:36px;height:36px;border-radius:11px;display:flex;align-items:center;justify-content:center;background:#fff}.adh-task.bad .adh-task-ic{color:#b2453a;border:1px solid #f0c9c4}.adh-task.warn .adh-task-ic{color:#a86a12;border:1px solid #efd59f}.adh-task.info .adh-task-ic{color:#2a6f86;border:1px solid #c7e0e8}
.adh-task-body{flex:1;min-width:0}.adh-task-body b{display:block;font-size:13.5px}.adh-task-body small{display:block;font-size:12px;color:#5f7775;margin-top:2px;line-height:1.45}
.adh-btn{flex:none;display:inline-flex;align-items:center;gap:6px;min-height:36px;padding:0 13px;border-radius:11px;border:1px solid #0a6e6e;background:#0a6e6e;color:#fff;font:inherit;font-size:12.5px!important;font-weight:700;cursor:pointer;white-space:nowrap}.adh-btn:hover{filter:brightness(1.08)}
.adh-allgood{display:flex;align-items:center;gap:12px;padding:18px;border-radius:15px;background:#eef9f4;color:#1f8a63}.adh-allgood b{display:block;color:#155f45}.adh-allgood small{color:#4b7a68}
.adh-done{margin-top:12px;border-top:1px solid #e8efee;padding-top:10px}.adh-done summary{display:flex;align-items:center;gap:7px;cursor:pointer;font-size:12.5px;font-weight:700;color:#1f8a63;list-style:none}.adh-done summary::-webkit-details-marker{display:none}.adh-done-row{display:flex;align-items:flex-start;gap:8px;margin-top:8px;font-size:12px;color:#5f7775}.adh-done-row svg{color:#1f8a63;margin-top:2px}
.adh-links{display:flex;flex-direction:column;gap:8px}.adh-link{display:flex;align-items:center;gap:12px;width:100%;padding:12px;border-radius:14px;border:1px solid #e3ecea;background:#fff;color:#123634;font:inherit;text-align:left;cursor:pointer;transition:background .12s,border-color .12s}.adh-link:hover{background:#f1f8f7;border-color:#bfdcd7}.adh-link>svg{color:#8aa3a0}
.adh-link-ic{flex:none;width:38px;height:38px;border-radius:11px;display:flex;align-items:center;justify-content:center;background:#eef6f5;color:#0a6e6e}.adh-link-t{flex:1;min-width:0}.adh-link-t b{display:block;font-size:13.5px}.adh-link-t small{display:block;font-size:11.5px;color:#5f7775;margin-top:1px}
.adh-loading{display:flex;align-items:center;gap:10px;color:#5f7775}.adh-spin{width:18px;height:18px;border-radius:50%;border:2.5px solid #d4e6e3;border-top-color:#0a6e6e;animation:adhspin .8s linear infinite}@keyframes adhspin{to{transform:rotate(360deg)}}
.adh-chip{display:inline-flex;align-items:center;padding:5px 12px;border-radius:999px;background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.35);font-weight:700;font-size:12.5px}
.adh-prog{margin-top:14px;max-width:460px}.adh-prog-top{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;font-size:11.5px;font-weight:700;opacity:.92;margin-bottom:6px}.adh-prog-bar{height:8px;border-radius:99px;background:rgba(255,255,255,.22);overflow:hidden}.adh-prog-bar i{display:block;height:100%;border-radius:99px;background:linear-gradient(90deg,#b8f0dd,#fff)}
.adh-hero-stat.good{background:rgba(184,240,221,.22)}
button.adh-kpi{font:inherit;text-align:left;color:inherit;cursor:pointer;transition:border-color .15s,box-shadow .15s,transform .15s}button.adh-kpi:hover{border-color:#9fd3c9;box-shadow:0 8px 20px rgba(10,80,76,.08);transform:translateY(-1px)}.adh-kpi em{display:block;font-style:normal;font-size:11px;color:#0a6e6e;font-weight:700;margin-top:2px}
.adh-grid{grid-template-columns:minmax(0,1.35fr) minmax(0,1fr)}.adh-side{display:flex;flex-direction:column;gap:16px;min-width:0}
.adh-meters{display:flex;flex-direction:column;gap:6px}.adh-meter{display:flex;gap:12px;align-items:flex-start;width:100%;padding:10px;border:1px solid transparent;border-radius:14px;background:transparent;font:inherit;color:inherit;text-align:left;cursor:pointer}.adh-meter:hover{background:#f6fbfa;border-color:#e1eceb}
.adh-meter-ic{flex:none;width:34px;height:34px;border-radius:10px;display:flex;align-items:center;justify-content:center;background:#eef6f5;color:#0a6e6e}.adh-meter-body{flex:1;min-width:0;display:block}.adh-meter-top{display:flex;justify-content:space-between;gap:8px;align-items:baseline}.adh-meter-top b{font-size:13px}.adh-meter-top strong{font-size:14px;font-weight:800}
.adh-bar{display:block;height:7px;border-radius:99px;background:#edf3f2;margin:6px 0 5px;overflow:hidden}.adh-bar i{display:block;height:100%;border-radius:99px}
.adh-meter small{display:block;font-size:11.5px;color:#5f7775}
.adh-meter.ok .adh-bar i{background:linear-gradient(90deg,#2ab394,#0a6e6e)}.adh-meter.ok strong{color:#1f8a63}
.adh-meter.mid .adh-bar i{background:linear-gradient(90deg,#f2c46b,#d9902a)}.adh-meter.mid strong{color:#a86a12}
.adh-meter.soft .adh-bar i{background:linear-gradient(90deg,#7cc3e0,#2a6f86)}.adh-meter.soft strong{color:#2a6f86}
.adh-meter.low .adh-bar i{background:linear-gradient(90deg,#f0a39a,#c9564a)}.adh-meter.low strong{color:#b2453a}
.adh-tiles{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.adh-tile{display:flex;align-items:center;gap:10px;padding:11px;border-radius:14px;border:1px solid #e3ecea;background:#fff;color:#123634;font:inherit;text-align:left;cursor:pointer;transition:background .12s,border-color .12s}.adh-tile:hover{background:#f1f8f7;border-color:#bfdcd7}.adh-tile b{font-size:12.5px;line-height:1.3}
@media(max-width:1000px){.adh-kpis{grid-template-columns:repeat(3,minmax(0,1fr))}.adh-grid{grid-template-columns:1fr}}
@media(max-width:640px){.adh-hero{padding:20px;border-radius:18px}.adh-hero-stat{min-width:0;padding:12px}.adh-hero-stat b{font-size:30px}.adh-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.adh-card{padding:16px}.adh-task{flex-wrap:wrap}.adh-task .adh-btn{width:100%;justify-content:center}}
`;document.head.appendChild(s)}
})();
