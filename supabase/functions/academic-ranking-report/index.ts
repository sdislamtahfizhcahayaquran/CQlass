// CQlass — Rekapan Nilai & Ranking (semester aktif).
// Akses: admin/pimpinan/akademik melihat semua siswa; walas hanya kelas perwaliannya; selain itu 403.
// Data diambil dari RPC academic_ranking_report_final (SECURITY DEFINER, hanya service_role).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';
const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-session-token','Access-Control-Allow-Methods':'POST,OPTIONS'};
const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...headers,'Content-Type':'application/json','Cache-Control':'no-store'}});
const text=(v:unknown)=>String(v??'').trim(),low=(v:unknown)=>text(v).toLowerCase();
function key(){const packed=Deno.env.get('SUPABASE_SECRET_KEYS');if(packed){try{const k=JSON.parse(packed).default;if(k)return k}catch{}}return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||Deno.env.get('SUPABASE_SECRET_KEY')!}
const db=createClient(Deno.env.get('SUPABASE_URL')!,key(),{auth:{persistSession:false}});
async function rows(q:any){const r=await q;if(r.error)throw r.error;return r.data}
const INACTIVE=['inactive','nonaktif','disabled','blocked','blokir'];
const READ_ALL=['admin','pimpinan','akademik'];
function normRole(v:unknown){const s=low(v).replace(/[-\s]+/g,'_');if(s==='admin'||s.includes('administrator'))return'admin';if(s.includes('pimpinan')||s.includes('kepala_sekolah')||s==='kepsek')return'pimpinan';if(s.includes('kabid_akademik')||s==='akademik'||s.includes('academic'))return'akademik';return s}
async function account(req:Request){const token=text(req.headers.get('x-session-token'));if(!token)return null;const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token));const hash=[...new Uint8Array(digest)].map(n=>n.toString(16).padStart(2,'0')).join('');const session=await rows(db.from('user_sessions').select('user_account_id,expires_at,revoked_at').eq('token_hash',hash).maybeSingle());if(!session||session.revoked_at||!session.expires_at||Date.parse(session.expires_at)<=Date.now())return null;const a=await rows(db.from('user_accounts').select('id,teacher_id,username,status').eq('id',session.user_account_id).maybeSingle());if(!a||INACTIVE.includes(low(a.status)))return null;return a}
async function roles(a:any){const out=new Set<string>();if(low(a.username)==='admin')out.add('admin');if(a.teacher_id){const r=await rows(db.from('user_roles').select('role_code,is_active').eq('teacher_id',a.teacher_id).eq('is_active',true));for(const x of r||[])out.add(normRole(x.role_code))}return out}
async function homeroomClassIds(user:any){if(!user.teacher_id)return[];const year=await rows(db.from('academic_years').select('id').eq('is_active',true).order('created_at',{ascending:false}).limit(1).maybeSingle());if(!year)return[];const sem=await rows(db.from('semesters').select('semester_no').eq('academic_year_id',year.id).eq('is_active',true).limit(1).maybeSingle());if(!sem)return[];const a=await rows(db.from('report_class_assignments').select('class_id').eq('homeroom_teacher_id',user.teacher_id).eq('academic_year_id',year.id).eq('semester_no',Number(sem.semester_no)));return(a||[]).map((x:any)=>text(x.class_id)).filter(Boolean)}

export async function handleRankingReport(req:Request){if(req.method==='OPTIONS')return new Response('ok',{headers});if(req.method!=='POST')return reply({success:false,error:'method_not_allowed'},405);try{
 const user=await account(req);if(!user)return reply({success:false,error:'Sesi login tidak valid.'},401);
 const r=await roles(user);const all=READ_ALL.some(x=>r.has(x));
 const own=all?[]:await homeroomClassIds(user);
 if(!all&&!own.length)return reply({success:false,error:'Akses khusus Admin, Pimpinan, Akademik, atau wali kelas.'},403);
 const data=await rows(db.rpc('academic_ranking_report_final'));
 if(all)return reply(data);
 const ids=new Set(own);
 // Walas: hanya kelas perwalian. Rank angkatan tetap dihitung dari seluruh angkatan.
 return reply({...data,scope:'homeroom',classes:(data?.classes||[]).filter((c:any)=>ids.has(text(c.id))),rows:(data?.rows||[]).filter((x:any)=>ids.has(text(x.class_id)))});
 }catch(e){console.error('academic-ranking-report',e);return reply({success:false,error:'Tidak dapat memuat rekapan nilai. Silakan coba kembali.'},500)}}

Deno.serve(handleRankingReport);
