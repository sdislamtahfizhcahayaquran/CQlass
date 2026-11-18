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
export function cleanEntry(d:any){if(!d||typeof d!=='object'||Array.isArray(d))fail('Format isian tidak valid.');const komentar=typeof d.komentar==='string'||d.komentar==null?text(d.komentar):fail('Komentar harus berupa teks.');if(komentar.length>1500)fail('Komentar maksimal 1500 karakter.');return{kepribadian:gradeMap(d.kepribadian,'kepribadian',10),sikap:gradeMap(d.sikap,'sikap',80),psikomotor:gradeMap(d.psikomotor,'psikomotorik',80),komentar}}

const num=(v:any)=>{if(v===null||v===undefined||text(v)==='')return null;const n=Number(v);return Number.isFinite(n)?n:null};
const avg=(a:number[])=>a.reduce((x,y)=>x+y,0)/a.length;
const TASKS=['TUGAS_1','TUGAS_2','TUGAS_3','TUGAS_4','TUGAS_5'];
// Same rule as the CQlass legger: final score only when Tugas 1-5, every TP, WWP and ASAS are filled.
export function finalScore(tasks:(number|null)[],tps:(number|null)[],wwp:number|null,asas:number|null){if(!tps.length||tasks.some(x=>x===null)||tps.some(x=>x===null)||wwp===null||asas===null)return null;return Math.round(avg(tasks as number[])*.10+avg(tps as number[])*.30+wwp*.10+asas*.50)}
async function academic(cls:any,p:any,studentIds:string[]){
 const grade=Number(cls.grade_level)||null;if(!grade||!studentIds.length)return{subjects:[],byStudent:new Map()};
 const subjects=await rows(db.from('subjects').select('id,code,name,sort_order').eq('is_active',true).eq('grade_level',grade).order('sort_order',{ascending:true}));
 const sids=(subjects||[]).map((s:any)=>s.id);if(!sids.length)return{subjects:[],byStudent:new Map()};
 const [objectives,scores]=await Promise.all([
  all(()=>db.from('learning_objectives').select('id,subject_id,description,sort_order,kktp').eq('academic_year_id',p.year.id).eq('semester_no',p.semester_no).eq('grade_level',grade).eq('is_active',true).in('subject_id',sids).order('sort_order',{ascending:true})),
  all(()=>db.from('academic_scores').select('student_id,subject_id,learning_objective_id,score,assessment_type').eq('academic_year_id',p.year.id).eq('semester_no',p.semester_no).eq('class_id',cls.id).is('deleted_at',null).in('subject_id',sids).order('id',{ascending:true}))]);
 const objBy=new Map<string,any[]>();for(const o of objectives){const k=text(o.subject_id);if(!objBy.has(k))objBy.set(k,[]);objBy.get(k)!.push(o)}
 const outSubjects=(subjects||[]).map((s:any)=>{const os=(objBy.get(text(s.id))||[]).sort((a:any,b:any)=>(Number(a.sort_order)||0)-(Number(b.sort_order)||0));const ks=os.map((o:any)=>Number(o.kktp)).filter((x:number)=>Number.isFinite(x)&&x>0);return{id:text(s.id),code:text(s.code),name:text(s.name),sort_order:Number(s.sort_order)||999,kktp_min:ks.length?Math.min(...ks):null,kktp_max:ks.length?Math.max(...ks):null,objectives:os.map((o:any)=>({id:text(o.id),description:text(o.description),kktp:num(o.kktp)}))}});
 const sc=new Map<string,number|null>();for(const r of scores){const type=text(r.assessment_type).toUpperCase();const k=type==='TP'?`${r.student_id}|${r.subject_id}|TP|${r.learning_objective_id}`:`${r.student_id}|${r.subject_id}|${type}`;sc.set(k,num(r.score))}
 const get=(k:string)=>sc.has(k)?sc.get(k)!:null;
 const byStudent=new Map<string,any>();
 for(const sid of studentIds){const per:Record<string,any>={};for(const s of outSubjects){const tasks=TASKS.map(t=>get(`${sid}|${s.id}|${t}`)),tp=s.objectives.map((o:any)=>get(`${sid}|${s.id}|TP|${o.id}`)),wwp=get(`${sid}|${s.id}|WWP`),asas=get(`${sid}|${s.id}|ASAS`);const missing=tasks.filter(x=>x===null).length+tp.filter((x:any)=>x===null).length+(wwp===null?1:0)+(asas===null?1:0);per[s.id]={final:finalScore(tasks,tp,wwp,asas),missing,tp}}byStudent.set(sid,per)}
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
  const [acad,entries]=await Promise.all([academic(cls,p,ids),ids.length?rows(db.from('semester_report_entries').select('student_id,data,version,updated_at').eq('academic_year_id',p.year.id).eq('semester_no',p.semester_no).in('student_id',ids)):Promise.resolve([])]);
  const em=new Map((entries||[]).map((e:any)=>[text(e.student_id),e]));
  return reply({success:true,academic_year:p.year.name,semester_no:p.semester_no,class:{id:text(cls.id),name:text(cls.name),grade_level:Number(cls.grade_level)||null},subjects:acad.subjects,students:students.map((s:any)=>({...s,entry:em.get(s.id)||null,academic:acad.byStudent.get(s.id)||{}}))});
 }
 // Input walas: hanya semester aktif dan kelas walas sendiri.
 const p=await activePeriod();const ids=await homeroomClassIds(user,p.year.id,p.semester_no);
 if(!ids.length)return reply({success:false,error:'Akses khusus wali kelas semester aktif.'},403);
 const classes=await rows(db.from('classes').select('id,name').in('id',ids).eq('academic_year_id',p.year.id).eq('is_active',true));
 if(action==='bootstrap')return reply({success:true,classes,academic_year:p.year.name,academic_year_id:p.year.id,semester_no:p.semester_no});
 const classId=text(b.class_id);if(!classes.some((c:any)=>c.id===classId))return reply({success:false,error:'Kelas di luar penugasan walas.'},403);
 const students=await roster(classId,p);const allowed=new Set(students.map((s:any)=>s.id));
 const load=async()=>allowed.size?await rows(db.from('semester_report_entries').select('student_id,data,version,updated_at').eq('academic_year_id',p.year.id).eq('semester_no',p.semester_no).in('student_id',[...allowed])):[];
 if(action==='load')return reply({success:true,students,entries:await load()});
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
