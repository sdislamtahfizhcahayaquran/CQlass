// CQlass — Rapor Akhir Semester (route /admin-academic-period/semester-report).
// Walas input: kepribadian, sikap, psikomotorik, komentar per siswa (semester aktif, kelas walas sendiri).
// print_data: nilai akhir + kognitif per TP dihitung dari academic_scores, plus input walas, untuk dicetak.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';
const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-session-token','Access-Control-Allow-Methods':'POST,OPTIONS'};
const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...headers,'Content-Type':'application/json','Cache-Control':'no-store'}});
const text=(v:unknown)=>String(v??'').trim(),low=(v:unknown)=>text(v).toLowerCase();
function key(){const packed=Deno.env.get('SUPABASE_SECRET_KEYS');if(packed){try{const k=JSON.parse(packed).default;if(k)return k}catch{}}return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||Deno.env.get('SUPABASE_SECRET_KEY')!}
const db=createClient(Deno.env.get('SUPABASE_URL')!,key(),{auth:{persistSession:false}});
async function rows(q:any){const r=await q;if(r.error)throw r.error;return r.data}
// PostgREST returns at most 1000 rows per request; read large tables page by page.
async function all(make:()=>any){const out:any[]=[];for(let from=0;;from+=1000){const part=await rows(make().range(from,from+999));out.push(...(part||[]));if(!part||part.length<1000)return out}}
const INACTIVE=['inactive','nonaktif','disabled','blocked','blokir'];
const READ_ALL=['admin','pimpinan','akademik'];
function normRole(v:unknown){const s=low(v).replace(/[-\s]+/g,'_');if(s==='admin'||s.includes('administrator'))return'admin';if(s.includes('pimpinan')||s.includes('kepala_sekolah')||s==='kepsek')return'pimpinan';if(s.includes('kabid_akademik')||s==='akademik'||s.includes('academic'))return'akademik';return s}
async function account(req:Request){const token=text(req.headers.get('x-session-token'));if(!token)return null;const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token));const hash=[...new Uint8Array(digest)].map(n=>n.toString(16).padStart(2,'0')).join('');const session=await rows(db.from('user_sessions').select('user_account_id,expires_at,revoked_at').eq('token_hash',hash).maybeSingle());if(!session||session.revoked_at||!session.expires_at||Date.parse(session.expires_at)<=Date.now())return null;const a=await rows(db.from('user_accounts').select('id,teacher_id,username,status').eq('id',session.user_account_id).maybeSingle());if(!a||INACTIVE.includes(low(a.status)))return null;return a}
async function roles(a:any){const out=new Set<string>();if(low(a.username)==='admin')out.add('admin');if(a.teacher_id){const r=await rows(db.from('user_roles').select('role_code,is_active').eq('teacher_id',a.teacher_id).eq('is_active',true));for(const x of r||[])out.add(normRole(x.role_code))}return out}
async function activePeriod(){const year=await rows(db.from('academic_years').select('id,name').eq('is_active',true).single());const sem=await rows(db.from('semesters').select('semester_no').eq('academic_year_id',year.id).eq('is_active',true).single());return{year,semester_no:Number(sem.semester_no),is_archive:false}}
async function namedPeriod(name:string,semesterNo:number){const year=await rows(db.from('academic_years').select('id,name,is_active').eq('name',name).order('created_at',{ascending:false}).limit(1).maybeSingle());if(!year)return null;const sem=await rows(db.from('semesters').select('semester_no,is_active').eq('academic_year_id',year.id).eq('semester_no',semesterNo).maybeSingle());if(!sem)return null;return{year,semester_no:semesterNo,is_archive:!year.is_active||!sem.is_active}}
async function homeroomClassIds(user:any,yearId:string,semesterNo:number){if(!user.teacher_id)return[];const a=await rows(db.from('report_class_assignments').select('class_id').eq('homeroom_teacher_id',user.teacher_id).eq('academic_year_id',yearId).eq('semester_no',semesterNo));return(a||[]).map((x:any)=>text(x.class_id)).filter(Boolean)}
async function roster(classId:string,p:any){const en=await rows(db.from('student_enrollments').select('student_id').eq('class_id',classId).eq('academic_year_id',p.year.id).eq('semester_no',p.semester_no));const ids=[...new Set((en||[]).map((e:any)=>text(e.student_id)).filter(Boolean))];if(!ids.length)return[];const st=await rows(db.from('students').select('id,nis,nisn,full_name,status').in('id',ids));return(st||[]).filter((s:any)=>p.is_archive||!['nonaktif','inactive','disabled','blokir','blocked','keluar','lulus'].includes(low(s.status))).map((s:any)=>({id:text(s.id),nis:text(s.nis),nisn:text(s.nisn),name:text(s.full_name)})).sort((a:any,b:any)=>a.name.localeCompare(b.name,'id'))}

const GRADES=new Set(['A','B','C','D']);
const KEY=/^[a-z0-9_]{1,40}$/;
function fail(message:string):never{throw new Error('VALIDATION:'+message)}
function gradeMap(v:any,label:string,max:number){if(v==null)return{};if(typeof v!=='object'||Array.isArray(v))fail(`Format ${label} tidak valid.`);const out:Record<string,string>={};const keys=Object.keys(v);if(keys.length>max)fail(`Isian ${label} terlalu banyak.`);for(const k of keys){if(!KEY.test(k))fail(`Kode ${label} tidak valid.`);const g=text(v[k]).toUpperCase();if(!g)continue;if(!GRADES.has(g))fail(`Nilai ${label} hanya boleh A, B, C, atau D.`);out[k]=g}return out}
// Rapor IKM: kesehatan (TB/BB + kondisi), prestasi (maks. 3), keputusan naik kelas (semester 2).
function measure(v:any,label:string,min:number,max:number){if(v==null||text(v)==='')return'';const n=Number(String(v).replace(',','.'));if(!Number.isFinite(n)||n<min||n>max)fail(`${label} harus angka ${min}–${max}.`);return String(Math.round(n*10)/10)}
function shortText(v:any,label:string,max:number){if(v==null)return'';if(typeof v!=='string'&&typeof v!=='number')fail(`${label} harus berupa teks.`);const s=text(v);if(s.length>max)fail(`${label} maksimal ${max} karakter.`);return s}
export function cleanKesehatan(v:any){if(v==null)return{};if(typeof v!=='object'||Array.isArray(v))fail('Format kesehatan tidak valid.');const out:Record<string,string>={tb:measure(v.tb,'Tinggi badan (cm)',30,250),bb:measure(v.bb,'Berat badan (kg)',5,200),pendengaran:shortText(v.pendengaran,'Pendengaran',80),penglihatan:shortText(v.penglihatan,'Penglihatan',80),gigi:shortText(v.gigi,'Gigi',80)};for(const k of Object.keys(out))if(!out[k])delete out[k];return out}
export function cleanPrestasi(v:any){if(v==null)return[];if(!Array.isArray(v)||v.length>3)fail('Prestasi maksimal 3 baris.');return v.map((p:any)=>{if(!p||typeof p!=='object'||Array.isArray(p))fail('Format prestasi tidak valid.');return{jenis:shortText(p.jenis,'Jenis prestasi',150),keterangan:shortText(p.keterangan,'Keterangan prestasi',250)}}).filter((p:any)=>p.jenis||p.keterangan)}
// Kokurikuler: skor 1-4 untuk dimensi A dan B proyek PjBL jenjang (rubrik ada di semester-report-print.js).
export function cleanKoku(v:any){if(v==null)return{};if(typeof v!=='object'||Array.isArray(v))fail('Format kokurikuler tidak valid.');const out:Record<string,number>={};for(const k of ['a','b']){const s=text(v[k]);if(!s)continue;const n=Number(s);if(!Number.isInteger(n)||n<1||n>4)fail('Skor kokurikuler hanya 1, 2, 3, atau 4.');out[k]=n}return out}
export function cleanEntry(d:any){if(!d||typeof d!=='object'||Array.isArray(d))fail('Format isian tidak valid.');const komentar=typeof d.komentar==='string'||d.komentar==null?text(d.komentar):fail('Komentar harus berupa teks.');if(komentar.length>1500)fail('Komentar maksimal 1500 karakter.');const keputusan=text(d.keputusan);if(keputusan&&!['naik','tinggal'].includes(keputusan))fail('Keputusan hanya naik atau tinggal.');return{kepribadian:gradeMap(d.kepribadian,'kepribadian',10),sikap:gradeMap(d.sikap,'sikap',80),psikomotor:gradeMap(d.psikomotor,'psikomotorik',80),komentar,kesehatan:cleanKesehatan(d.kesehatan),prestasi:cleanPrestasi(d.prestasi),kokurikuler:cleanKoku(d.kokurikuler),...(keputusan?{keputusan}:{})}}

// Rubrik kokurikuler hasil upload Akademik untuk periode & jenjang; null = pakai rubrik bawaan di tampilan.
async function kokuRubricFor(p:any,grade:number){if(!grade)return null;try{const r=await db.from('kokurikuler_rubrics').select('data').eq('academic_year_id',p.year.id).eq('semester_no',p.semester_no).eq('grade_level',grade).maybeSingle();return r.error?null:(r.data?.data||null)}catch(_){return null}}
// Guru Partner utama kelas (tanda tangan halaman Komentar). Gagal membaca tidak boleh menggagalkan cetak.
async function partnerOf(classId:string,p:any){
 try{
  const cp=await db.from('class_partner_assignments').select('teacher_id,is_primary').eq('academic_year_id',p.year.id).eq('semester_no',p.semester_no).eq('class_id',classId).eq('is_active',true);
  let tid=text(((cp.data||[]) as any[]).sort((a:any,b:any)=>(b.is_primary?1:0)-(a.is_primary?1:0))[0]?.teacher_id);
  if(!tid){const r=await db.from('report_class_assignments').select('partner_teacher_id').eq('academic_year_id',p.year.id).eq('semester_no',p.semester_no).eq('class_id',classId).maybeSingle();tid=text(r.data?.partner_teacher_id)}
  if(!tid)return null;
  const [t,sg]=await Promise.all([db.from('teachers').select('full_name').eq('id',tid).maybeSingle(),db.from('teacher_signatures').select('storage_path').eq('teacher_id',tid).maybeSingle()]);
  let url='';const path=text(sg.data?.storage_path);if(path){const s=await db.storage.from('teacher-signatures').createSignedUrl(path,3600);url=text(s.data?.signedUrl)}
  return{name:text(t.data?.full_name),signature_url:url};
 }catch(e){console.error('semester-report partner',e);return null}
}

// Ekskul per siswa untuk Rapor IKM: anggota aktif + siswa yang sudah dinilai, ekskul luar sekolah juga ikut.
const PERIOD_RANK:Record<string,number>={SEMESTER:3,PAS:3,PTS:1};
async function ekskulByStudent(p:any,ids:string[]){
 const out=new Map<string,any[]>();if(!ids.length)return out;
 const [mem,ass,ext,extAss,pram]=await Promise.all([
  all(()=>db.from('extracurricular_members').select('id,student_id,extracurricular_id,status').eq('academic_year_id',p.year.id).in('student_id',ids).order('id',{ascending:true})),
  all(()=>db.from('extracurricular_assessments').select('id,student_id,extracurricular_id,assessment_period,activity_grade,skill_grade,competition_grade,final_rating,final_remarks').eq('academic_year_id',p.year.id).eq('semester_no',p.semester_no).in('student_id',ids).order('id',{ascending:true})),
  all(()=>db.from('extracurricular_external_students').select('id,student_id,activity_name,institution_name').eq('academic_year_id',p.year.id).eq('semester_no',p.semester_no).eq('is_active',true).in('student_id',ids).order('id',{ascending:true})),
  all(()=>db.from('extracurricular_external_assessments').select('id,student_id,external_student_id,assessment_period,activity_grade,skill_grade,competition_grade').eq('academic_year_id',p.year.id).eq('semester_no',p.semester_no).in('student_id',ids).order('id',{ascending:true})),
  // Pramuka wajib: nilai dari Pembina Pramuka (tabel terpisah, bukan anggota ekskul). Gagal baca = baris Pramuka kosong.
  db.from('pramuka_assessments').select('student_id,grade').eq('academic_year_id',p.year.id).eq('semester_no',p.semester_no).in('student_id',ids).then((r:any)=>r.error?[]:(r.data||[]))]);
 const eids=[...new Set([...mem,...ass].map((x:any)=>text(x.extracurricular_id)).filter(Boolean))];
 const names=new Map<string,string>();if(eids.length){for(const e of await rows(db.from('extracurriculars').select('id,name').in('id',eids)))names.set(text(e.id),text(e.name))}
 const best=new Map<string,any>();const keep=(k:string,a:any)=>{const o=best.get(k);if(!o||(PERIOD_RANK[text(a.assessment_period).toUpperCase()]||0)>=(PERIOD_RANK[text(o.assessment_period).toUpperCase()]||0))best.set(k,a)};
 for(const a of ass)keep(`${a.student_id}|${a.extracurricular_id}`,a);for(const a of extAss)keep(`${a.student_id}|x${a.external_student_id}`,a);
 const push=(sid:string,item:any)=>{if(!out.has(sid))out.set(sid,[]);const list=out.get(sid)!;if(!list.some((x:any)=>x.key===item.key))list.push(item)};
 const grades=(a:any)=>({activity:text(a?.activity_grade).toUpperCase(),skill:text(a?.skill_grade).toUpperCase(),competition:text(a?.competition_grade).toUpperCase(),rating:text(a?.final_rating),remarks:text(a?.final_remarks)});
 for(const r of pram){const g=text(r.grade).toUpperCase();if(g)push(text(r.student_id),{key:'pramuka',name:'Pramuka',external:false,activity:'',skill:'',competition:'',rating:g,remarks:''})}
 for(const m of mem){if(low(m.status)!=='aktif')continue;const k=`${m.student_id}|${m.extracurricular_id}`;push(text(m.student_id),{key:text(m.extracurricular_id),name:names.get(text(m.extracurricular_id))||'Ekstrakurikuler',external:false,...grades(best.get(k))})}
 for(const a of ass){push(text(a.student_id),{key:text(a.extracurricular_id),name:names.get(text(a.extracurricular_id))||'Ekstrakurikuler',external:false,...grades(best.get(`${a.student_id}|${a.extracurricular_id}`))})}
 for(const e of ext){const nm=text(e.activity_name)||'Ekstrakurikuler luar sekolah';push(text(e.student_id),{key:'x'+text(e.id),name:nm,institution:text(e.institution_name),external:true,...grades(best.get(`${e.student_id}|x${e.id}`))})}
 return out;
}

const num=(v:any)=>{if(v===null||v===undefined||text(v)==='')return null;const n=Number(v);return Number.isFinite(n)?n:null};
const avg=(a:number[])=>a.reduce((x,y)=>x+y,0)/a.length;
const TASKS=['TUGAS_1','TUGAS_2','TUGAS_3','TUGAS_4','TUGAS_5'];
// Sistem penilaian (sama dengan cq-scoring.js): nilai murni = Tugas 10% + rata-rata TP 30% + WWP 20% + ASAS 40%,
// hanya bila minimal 1 Tugas (rata-rata tugas yang terisi), semua TP, WWP dan ASAS terisi. Nilai rapor = dibulatkan, akhiran 4/9 naik 1, minimal 77, maksimal 96.
const r2=(n:number)=>Math.round(n*100)/100;
export function rawScore(tasks:(number|null)[],tps:(number|null)[],wwp:number|null,asas:number|null){const t=tasks.filter(x=>x!==null) as number[];if(!tps.length||!t.length||tps.some(x=>x===null)||wwp===null||asas===null)return null;return r2(avg(t)*.10+avg(tps as number[])*.30+wwp*.20+asas*.40)}
export function raporScore(raw:number|null){if(raw===null||raw===undefined)return null;let n=Math.round(raw);if(n%10===4||n%10===9)n+=1;return Math.max(77,Math.min(96,n))}
export function finalScore(tasks:(number|null)[],tps:(number|null)[],wwp:number|null,asas:number|null){return raporScore(rawScore(tasks,tps,wwp,asas))}
async function academic(cls:any,p:any,studentIds:string[]){
 const grade=Number(cls.grade_level)||null;if(!grade||!studentIds.length)return{subjects:[],byStudent:new Map()};
 const subjects=await rows(db.from('subjects').select('id,code,name,sort_order').eq('is_active',true).eq('grade_level',grade).order('sort_order',{ascending:true}));
 const sids=(subjects||[]).map((s:any)=>s.id);if(!sids.length)return{subjects:[],byStudent:new Map()};
 const [objectives,scores]=await Promise.all([
  all(()=>db.from('learning_objectives').select('id,subject_id,description,description_en,sort_order,kktp').eq('academic_year_id',p.year.id).eq('semester_no',p.semester_no).eq('grade_level',grade).eq('is_active',true).in('subject_id',sids).order('sort_order',{ascending:true})),
  all(()=>db.from('academic_scores').select('student_id,subject_id,learning_objective_id,score,assessment_type').eq('academic_year_id',p.year.id).eq('semester_no',p.semester_no).eq('class_id',cls.id).is('deleted_at',null).in('subject_id',sids).order('id',{ascending:true}))]);
 const objBy=new Map<string,any[]>();for(const o of objectives){const k=text(o.subject_id);if(!objBy.has(k))objBy.set(k,[]);objBy.get(k)!.push(o)}
 const outSubjects=(subjects||[]).map((s:any)=>{const os=(objBy.get(text(s.id))||[]).sort((a:any,b:any)=>(Number(a.sort_order)||0)-(Number(b.sort_order)||0));const ks=os.map((o:any)=>Number(o.kktp)).filter((x:number)=>Number.isFinite(x)&&x>0);return{id:text(s.id),code:text(s.code),name:text(s.name),sort_order:Number(s.sort_order)||999,kktp_min:ks.length?Math.min(...ks):null,kktp_max:ks.length?Math.max(...ks):null,objectives:os.map((o:any)=>({id:text(o.id),description:text(o.description),description_en:text(o.description_en),kktp:num(o.kktp)}))}});
 const sc=new Map<string,number|null>();for(const r of scores){const type=text(r.assessment_type).toUpperCase();const k=type==='TP'?`${r.student_id}|${r.subject_id}|TP|${r.learning_objective_id}`:`${r.student_id}|${r.subject_id}|${type}`;sc.set(k,num(r.score))}
 const get=(k:string)=>sc.has(k)?sc.get(k)!:null;
 const byStudent=new Map<string,any>();
 for(const sid of studentIds){const per:Record<string,any>={};for(const s of outSubjects){const tasks=TASKS.map(t=>get(`${sid}|${s.id}|${t}`)),tp=s.objectives.map((o:any)=>get(`${sid}|${s.id}|TP|${o.id}`)),wwp=get(`${sid}|${s.id}|WWP`),asas=get(`${sid}|${s.id}|ASAS`);const missing=tasks.filter(x=>x===null).length+tp.filter((x:any)=>x===null).length+(wwp===null?1:0)+(asas===null?1:0);const raw=rawScore(tasks,tp,wwp,asas);per[s.id]={final:raporScore(raw),raw,missing,tp,tasks,wwp,asas}}byStudent.set(sid,per)}
 // Kelas 1-3 tidak punya mapel Pendidikan Pancasila: di rapor nilainya diambil dari Adab/Akhlak.
 if(grade<=3&&!outSubjects.some((s:any)=>/pancasila|\bpkn\b|kewarganegaraan/i.test(s.name))){const adab=outSubjects.find((s:any)=>/adab|akhlak/i.test(s.name));
  if(adab){const v={...adab,id:'pkn-from-adab',code:'PKN',name:'Pendidikan Pancasila',virtual_from:adab.id};outSubjects.push(v);for(const per of byStudent.values())if(per[adab.id])per[v.id]={...per[adab.id],from:adab.id}}}
 return{subjects:outSubjects,byStudent};
}

export async function handleSemesterReport(req:Request){if(req.method==='OPTIONS')return new Response('ok',{headers});if(req.method!=='POST')return reply({success:false,error:'method_not_allowed'},405);try{
 const user=await account(req);if(!user)return reply({success:false,error:'Sesi login tidak valid.'},401);
 const b=await req.json().catch(()=>({}));const action=text(b.action)||'bootstrap';
 if(!['bootstrap','load','save','print_data'].includes(action))return reply({success:false,error:'Aksi tidak dikenal.'},400);
 if(action==='print_data'){
  const p=await namedPeriod(text(b.academic_year),Number(b.semester_no));if(!p)return reply({success:false,error:'Periode rapor tidak ditemukan.'},404);
  const classId=text(b.class_id);const r=await roles(user);
  if(!READ_ALL.some(x=>r.has(x))&&!(await homeroomClassIds(user,p.year.id,p.semester_no)).includes(classId))return reply({success:false,error:'Kelas di luar akses akun ini.'},403);
  const cls=await rows(db.from('classes').select('id,name,grade_level').eq('id',classId).eq('academic_year_id',p.year.id).maybeSingle());if(!cls)return reply({success:false,error:'Kelas tidak ditemukan.'},404);
  const students=await roster(cls.id,p);const ids=students.map((s:any)=>s.id);
  const [acad,entries,eks,prev]=await Promise.all([academic(cls,p,ids),ids.length?rows(db.from('semester_report_entries').select('student_id,data,version,updated_at').eq('academic_year_id',p.year.id).eq('semester_no',p.semester_no).in('student_id',ids)):Promise.resolve([]),ekskulByStudent(p,ids),
   // Semester 2 rapor IKM also shows the semester 1 height/weight.
   p.semester_no===2&&ids.length?rows(db.from('semester_report_entries').select('student_id,data').eq('academic_year_id',p.year.id).eq('semester_no',1).in('student_id',ids)):Promise.resolve([])]);
  const em=new Map((entries||[]).map((e:any)=>[text(e.student_id),e]));const pm=new Map((prev||[]).map((e:any)=>[text(e.student_id),e.data?.kesehatan||{}]));
  // KKM satuan pendidikan diatur Akademik per tahun ajaran; 70 bila belum diatur.
  const kk=await db.from('academic_year_settings').select('kkm').eq('academic_year_id',p.year.id).maybeSingle();const kkm=!kk.error&&kk.data&&Number.isFinite(Number(kk.data.kkm))?Number(kk.data.kkm):70;
  const [partner,kokurikuler_rubric]=await Promise.all([partnerOf(cls.id,p),kokuRubricFor(p,Number(cls.grade_level)||0)]);
  return reply({success:true,academic_year:p.year.name,semester_no:p.semester_no,kkm,partner,kokurikuler_rubric,class:{id:text(cls.id),name:text(cls.name),grade_level:Number(cls.grade_level)||null},subjects:acad.subjects,students:students.map((s:any)=>({...s,entry:em.get(s.id)||null,academic:acad.byStudent.get(s.id)||{},ekskul:eks.get(s.id)||[],kesehatan_s1:pm.get(s.id)||null}))});
 }
 // Input walas: hanya semester aktif dan kelas walas sendiri.
 const p=await activePeriod();const ids=await homeroomClassIds(user,p.year.id,p.semester_no);
 if(!ids.length)return reply({success:false,error:'Akses khusus wali kelas semester aktif.'},403);
 const classes=await rows(db.from('classes').select('id,name').in('id',ids).eq('academic_year_id',p.year.id).eq('is_active',true));
 if(action==='bootstrap')return reply({success:true,classes,academic_year:p.year.name,academic_year_id:p.year.id,semester_no:p.semester_no});
 const classId=text(b.class_id);if(!classes.some((c:any)=>c.id===classId))return reply({success:false,error:'Kelas di luar penugasan walas.'},403);
 const students=await roster(classId,p);const allowed=new Set(students.map((s:any)=>s.id));
 const load=async()=>allowed.size?await rows(db.from('semester_report_entries').select('student_id,data,version,updated_at').eq('academic_year_id',p.year.id).eq('semester_no',p.semester_no).in('student_id',[...allowed])):[];
 if(action==='load'){const cg=await rows(db.from('classes').select('grade_level').eq('id',classId).maybeSingle());return reply({success:true,students,entries:await load(),kokurikuler_rubric:await kokuRubricFor(p,Number(cg?.grade_level)||0)})}
 if(b.academic_year_id!==p.year.id||Number(b.semester_no)!==p.semester_no)return reply({success:false,error:'Periode berubah. Muat ulang halaman.'},409);
 const list=Array.isArray(b.entries)?b.entries:fail('Format isian tidak valid.');if(list.length>100)fail('Isian terlalu banyak.');
 const seen=new Set<string>();const clean=list.map((e:any)=>{const sid=text(e?.student_id);if(!allowed.has(sid)||seen.has(sid))fail('Siswa tidak valid atau berulang.');seen.add(sid);return{student_id:sid,version:Number(e.version)||0,data:cleanEntry(e.data)}});
 const existing=await load();const ex=new Map((existing||[]).map((e:any)=>[text(e.student_id),e]));
 const stale=clean.filter((e:any)=>Number(ex.get(e.student_id)?.version||0)!==e.version);
 if(stale.length)return reply({success:false,error:'Data sudah diubah di perangkat lain. Muat ulang sebelum menyimpan.',stale:stale.map((e:any)=>e.student_id)},409);
 const now=new Date().toISOString();let saved=0;
 for(const e of clean){const prev=ex.get(e.student_id);const record={student_id:e.student_id,class_id:classId,academic_year_id:p.year.id,semester_no:p.semester_no,data:e.data,version:e.version+1,updated_by:user.id,updated_at:now};
  if(prev){const u=await rows(db.from('semester_report_entries').update(record).eq('student_id',e.student_id).eq('academic_year_id',p.year.id).eq('semester_no',p.semester_no).eq('version',e.version).select('student_id').maybeSingle());if(!u)return reply({success:false,error:'Data berubah saat disimpan. Muat ulang.',saved},409)}
  else{const r=await db.from('semester_report_entries').insert(record).select('student_id').single();if(r.error?.code==='23505')return reply({success:false,error:'Data sudah dibuat di perangkat lain. Muat ulang.',saved},409);if(r.error)throw r.error}
  saved++}
 return reply({success:true,saved,entries:await load()});
 }catch(e){const msg=text((e as any)?.message);if(msg.startsWith('VALIDATION:'))return reply({success:false,error:msg.slice(11)},400);console.error('semester-report',e);return reply({success:false,error:'Tidak dapat memproses Rapor Semester. Silakan muat ulang atau coba kembali.'},500)}}
