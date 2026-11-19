// CQlass — Nilai Pramuka (route /admin-academic-period/pramuka).
// Diisi akun ber-role tambahan "pembina_pramuka" (atau Admin) untuk semua kelas, semester aktif saja.
// Nilai dipakai Rapor IKM bagian Ekstrakurikuler (Pramuka selalu baris pertama).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';
const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-session-token','Access-Control-Allow-Methods':'POST,OPTIONS'};
const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...headers,'Content-Type':'application/json','Cache-Control':'no-store'}});
const text=(v:unknown)=>String(v??'').trim(),low=(v:unknown)=>text(v).toLowerCase();
function key(){const packed=Deno.env.get('SUPABASE_SECRET_KEYS');if(packed){try{const k=JSON.parse(packed).default;if(k)return k}catch{}}return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||Deno.env.get('SUPABASE_SECRET_KEY')!}
const db=createClient(Deno.env.get('SUPABASE_URL')!,key(),{auth:{persistSession:false}});
async function rows(q:any){const r=await q;if(r.error)throw r.error;return r.data}
const INACTIVE=['inactive','nonaktif','disabled','blocked','blokir'];
const LEFT=['nonaktif','inactive','disabled','blokir','blocked','keluar','lulus'];
export const PRAMUKA_ROLE='pembina_pramuka';
const GRADES=new Set(['A','B','C','D']);
function fail(message:string):never{throw new Error('VALIDATION:'+message)}

async function account(req:Request){const token=text(req.headers.get('x-session-token'));if(!token)return null;const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token));const hash=[...new Uint8Array(digest)].map(n=>n.toString(16).padStart(2,'0')).join('');const session=await rows(db.from('user_sessions').select('user_account_id,expires_at,revoked_at').eq('token_hash',hash).maybeSingle());if(!session||session.revoked_at||!session.expires_at||Date.parse(session.expires_at)<=Date.now())return null;const a=await rows(db.from('user_accounts').select('id,teacher_id,username,status').eq('id',session.user_account_id).maybeSingle());if(!a||INACTIVE.includes(low(a.status)))return null;return a}
async function allowed(a:any){if(low(a.username)==='admin')return true;if(!a.teacher_id)return false;const r=await rows(db.from('user_roles').select('role_code').eq('teacher_id',a.teacher_id).eq('is_active',true).in('role_code',[PRAMUKA_ROLE,'admin']));return(r||[]).length>0}
async function activePeriod(){const year=await rows(db.from('academic_years').select('id,name').eq('is_active',true).single());const sem=await rows(db.from('semesters').select('semester_no').eq('academic_year_id',year.id).eq('is_active',true).single());return{year,semester_no:Number(sem.semester_no)}}
async function roster(classId:string,p:any){const en=await rows(db.from('student_enrollments').select('student_id').eq('class_id',classId).eq('academic_year_id',p.year.id).eq('semester_no',p.semester_no).eq('is_active',true));const ids=[...new Set((en||[]).map((e:any)=>text(e.student_id)).filter(Boolean))];if(!ids.length)return[];const st=await rows(db.from('students').select('id,nis,full_name,status').in('id',ids));return(st||[]).filter((s:any)=>!LEFT.includes(low(s.status))).map((s:any)=>({id:text(s.id),nis:text(s.nis),name:text(s.full_name)})).sort((a:any,b:any)=>a.name.localeCompare(b.name,'id'))}
export function cleanGrade(v:any){const g=text(v).toUpperCase();if(!g)return null;if(!GRADES.has(g))fail('Nilai Pramuka hanya A, B, C, atau D.');return g}

export async function handlePramuka(req:Request){if(req.method==='OPTIONS')return new Response('ok',{headers});if(req.method!=='POST')return reply({success:false,error:'method_not_allowed'},405);try{
 const user=await account(req);if(!user)return reply({success:false,error:'Sesi login tidak valid.'},401);
 if(!(await allowed(user)))return reply({success:false,error:'Akses khusus Pembina Pramuka.'},403);
 const b=await req.json().catch(()=>({}));const action=text(b.action)||'bootstrap';
 if(!['bootstrap','load','save'].includes(action))return reply({success:false,error:'Aksi tidak dikenal.'},400);
 const p=await activePeriod();
 if(action==='bootstrap'){
  const classes=await rows(db.from('classes').select('id,name,grade_level').eq('academic_year_id',p.year.id).eq('is_active',true).order('grade_level').order('name'));
  // Progres per kelas: siswa aktif yang sudah dinilai.
  const [en,done]=await Promise.all([rows(db.from('student_enrollments').select('class_id,student_id').eq('academic_year_id',p.year.id).eq('semester_no',p.semester_no).eq('is_active',true)),rows(db.from('pramuka_assessments').select('student_id').eq('academic_year_id',p.year.id).eq('semester_no',p.semester_no).not('grade','is',null))]);
  const graded=new Set((done||[]).map((x:any)=>text(x.student_id)));const prog:Record<string,{total:number,done:number}>={};
  for(const e of en||[]){const c=text(e.class_id);prog[c]=prog[c]||{total:0,done:0};prog[c].total++;if(graded.has(text(e.student_id)))prog[c].done++}
  return reply({success:true,academic_year:p.year.name,academic_year_id:p.year.id,semester_no:p.semester_no,classes:(classes||[]).map((c:any)=>({id:text(c.id),name:text(c.name),grade_level:Number(c.grade_level)||null,...(prog[text(c.id)]||{total:0,done:0})}))});
 }
 const classId=text(b.class_id);const cls=await rows(db.from('classes').select('id').eq('id',classId).eq('academic_year_id',p.year.id).eq('is_active',true).maybeSingle());if(!cls)return reply({success:false,error:'Kelas tidak ditemukan pada tahun ajaran aktif.'},404);
 const students=await roster(classId,p);const allow=new Set(students.map((s:any)=>s.id));
 const load=async()=>allow.size?await rows(db.from('pramuka_assessments').select('student_id,grade,version,updated_at').eq('academic_year_id',p.year.id).eq('semester_no',p.semester_no).in('student_id',[...allow])):[];
 if(action==='load')return reply({success:true,students,entries:await load()});
 if(b.academic_year_id!==p.year.id||Number(b.semester_no)!==p.semester_no)return reply({success:false,error:'Periode berubah. Muat ulang halaman.'},409);
 const list=Array.isArray(b.entries)?b.entries:fail('Format isian tidak valid.');if(list.length>100)fail('Isian terlalu banyak.');
 const seen=new Set<string>();const clean=list.map((e:any)=>{const sid=text(e?.student_id);if(!allow.has(sid)||seen.has(sid))fail('Siswa tidak valid atau berulang.');seen.add(sid);return{student_id:sid,version:Number(e.version)||0,grade:cleanGrade(e.grade)}});
 const ex=new Map(((await load())||[]).map((e:any)=>[text(e.student_id),e]));
 const stale=clean.filter((e:any)=>Number(ex.get(e.student_id)?.version||0)!==e.version);
 if(stale.length)return reply({success:false,error:'Nilai sudah diubah oleh pembina lain. Muat ulang sebelum menyimpan.',stale:stale.map((e:any)=>e.student_id)},409);
 const now=new Date().toISOString();let saved=0;
 for(const e of clean){const record={student_id:e.student_id,class_id:classId,academic_year_id:p.year.id,semester_no:p.semester_no,grade:e.grade,version:e.version+1,updated_by:user.id,updated_at:now};
  if(ex.has(e.student_id)){const u=await rows(db.from('pramuka_assessments').update(record).eq('student_id',e.student_id).eq('academic_year_id',p.year.id).eq('semester_no',p.semester_no).eq('version',e.version).select('student_id').maybeSingle());if(!u)return reply({success:false,error:'Nilai berubah saat disimpan. Muat ulang.',saved},409)}
  else{const r=await db.from('pramuka_assessments').insert(record).select('student_id').single();if(r.error?.code==='23505')return reply({success:false,error:'Nilai sudah dibuat pembina lain. Muat ulang.',saved},409);if(r.error)throw r.error}
  saved++}
 return reply({success:true,saved,entries:await load()});
 }catch(e){const msg=text((e as any)?.message);if(msg.startsWith('VALIDATION:'))return reply({success:false,error:msg.slice(11)},400);console.error('pramuka',e);return reply({success:false,error:'Tidak dapat memproses Nilai Pramuka. Silakan muat ulang atau coba kembali.'},500)}}
