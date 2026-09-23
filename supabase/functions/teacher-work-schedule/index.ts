import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

const CORS={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization,apikey,content-type,x-session-token","Access-Control-Allow-Methods":"POST,OPTIONS","Content-Type":"application/json; charset=utf-8"};
const txt=(v:unknown)=>String(v??"").trim();
const low=(v:unknown)=>txt(v).toLowerCase();
const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...CORS,"Cache-Control":"no-store"}});
const url=Deno.env.get("SUPABASE_URL")!;
function secret(){const packed=Deno.env.get("SUPABASE_SECRET_KEYS");if(packed){try{const p=JSON.parse(packed);if(p?.default)return String(p.default)}catch{}}return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||Deno.env.get("SUPABASE_SECRET_KEY")||""}
const sb=createClient(url,secret(),{auth:{persistSession:false,autoRefreshToken:false}});
async function sha(v:string){const d=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(v));return[...new Uint8Array(d)].map(x=>x.toString(16).padStart(2,"0")).join("")}
function normRole(v:unknown){const s=low(v).replace(/[-\s]+/g,"_").replace(/[^a-z0-9_]/g,"");if(!s)return"";if(s==="admin"||s.includes("administrator"))return"admin";if(s.includes("pimpinan")||s.includes("kepala_sekolah")||s==="kepsek")return"pimpinan";if(s.includes("kabid_akademik")||s==="akademik")return"akademik";if(s.includes("kabid_kegiatan")||s==="kegiatan")return"kegiatan";if(s.includes("kabid_kesiswaan")||s==="kesiswaan")return"kesiswaan";if(s.includes("kabid_tahfizh")||s==="tahfizh")return"tahfizh";if(s==="hrd")return"hrd";return s}
async function account(req:Request){const token=txt(req.headers.get("x-session-token"));if(!token)return null;const{data:s}=await sb.from("user_sessions").select("user_account_id,expires_at,revoked_at").eq("token_hash",await sha(token)).maybeSingle();if(!s||s.revoked_at||!s.expires_at||Date.parse(s.expires_at)<=Date.now())return null;const{data:a}=await sb.from("user_accounts").select("id,teacher_id,username,status").eq("id",s.user_account_id).maybeSingle();if(!a||["nonaktif","inactive","disabled","blocked"].includes(low(a.status)))return null;const{data:r}=await sb.from("user_account_roles").select("role_code,role,is_active").eq("user_account_id",a.id).eq("is_active",true);return{...a,roles:(r||[]).map((x:any)=>normRole(x.role_code||x.role)).filter(Boolean)}}
const REVIEW=new Set(["admin","hrd","akademik","pimpinan","kegiatan","kesiswaan"]);
function monthDates(month:string){const [y,m]=month.split("-").map(Number),out:string[]=[];const last=new Date(Date.UTC(y,m,0)).getUTCDate();for(let d=1;d<=last;d++)out.push(`${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`);return out}
const todayJakarta=()=>new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Jakarta",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());

Deno.serve(async(req)=>{if(req.method==="OPTIONS")return new Response("ok",{headers:CORS});if(req.method!=="POST")return reply({success:false,error:"method_not_allowed"},405);try{
  const me=await account(req);if(!me)return reply({success:false,error:"session_expired"},401);
  const body=await req.json().catch(()=>({})),month=txt(body.month),requested=txt(body.teacher_id);
  if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))return reply({success:false,error:"invalid_month"},400);
  const canReview=me.roles.some((r:string)=>REVIEW.has(r))||REVIEW.has(normRole(me.username));
  const teacherId=requested&&canReview?requested:txt(me.teacher_id);
  if(!teacherId)return reply({success:true,items:[],unresolved:[]});
  const dates=monthDates(month),monthStart=dates[0],monthEnd=dates[dates.length-1],today=todayJakarta();
  const{data:teacher,error:teacherError}=await sb.from("teachers").select("school_unit_id").eq("id",teacherId).maybeSingle();if(teacherError)throw teacherError;
  const yearQuery=sb.from("academic_years").select("id,start_date,end_date").eq("is_active",true).lte("start_date",monthEnd).gte("end_date",monthStart);if(teacher?.school_unit_id)yearQuery.eq("school_unit_id",teacher.school_unit_id);const{data:years,error:yearError}=await yearQuery.limit(1);if(yearError)throw yearError;const year=years?.[0];if(!year)return reply({success:true,items:[],unresolved:[]});
  const{data:sem}=await sb.from("semesters").select("semester_no").eq("academic_year_id",year.id).eq("is_active",true).maybeSingle();const semesterNo=Number(sem?.semester_no||0);if(![1,2].includes(semesterNo))throw Error("active_semester_not_found");
  const[tplRes,uksRes,reportRes]=await Promise.all([
    sb.from("teacher_work_schedule_templates").select("*").eq("academic_year_id",year.id).eq("semester_no",semesterNo).eq("is_active",true).or(`applies_to_all.eq.true,teacher_id.eq.${teacherId}`).order("day_of_week").order("start_time"),
    sb.from("uks_duty_schedule").select("id,teacher_id,weekday,shift_no,start_time,end_time,is_active").eq("teacher_id",teacherId).eq("is_active",true).order("weekday").order("shift_no"),
    sb.from("uks_duty_reports").select("id,duty_date,shift_no,captured_at,created_at").eq("teacher_id",teacherId).gte("duty_date",monthStart).lte("duty_date",monthEnd)
  ]);
  if(tplRes.error)throw tplRes.error;if(uksRes.error)throw uksRes.error;if(reportRes.error)throw reportRes.error;
  const rows=tplRes.data||[],uksRows=uksRes.data||[],reportKeys=new Set((reportRes.data||[]).map((r:any)=>`${r.duty_date}:${Number(r.shift_no)}`));
  const ownGateDays=new Set(rows.filter((r:any)=>r.teacher_id===teacherId&&r.activity_code==="student_welcome_gate").map((r:any)=>Number(r.day_of_week)));
  const templates=rows.filter((r:any)=>!(r.activity_code==="student_welcome_class"&&ownGateDays.has(Number(r.day_of_week))));
  const items:any[]=[];
  for(const date of dates){
    const dow=new Date(`${date}T12:00:00Z`).getUTCDay();if(dow<1||dow>6)continue;
    for(const r of templates){if(Number(r.day_of_week)!==dow)continue;items.push({id:`${r.id}:${date}`,template_id:r.id,work_date:date,start_time:r.start_time,end_time:r.end_time,activity_code:r.activity_code,activity:r.activity_name,note:r.duty_location?[r.duty_location,r.team_label].filter(Boolean).join(" · "):"",source:"jadwal-kerja",automatic:true})}
    for(const u of uksRows){if(Number(u.weekday)!==dow)continue;const reported=reportKeys.has(`${date}:${Number(u.shift_no)}`);const status=reported?"Laporan foto terkirim":date>today?"Terjadwal":"Belum ada laporan foto";items.push({id:`uks:${u.id}:${date}`,template_id:null,work_date:date,start_time:u.start_time,end_time:u.end_time,activity_code:"uks_duty",activity:"Jaga UKS",note:`Shift ${Number(u.shift_no)} · ${status}`,source:"jadwal-kerja",automatic:true,uks_shift_no:Number(u.shift_no),uks_reported:reported})}
  }
  items.sort((a,b)=>String(a.work_date+" "+a.start_time+" "+a.activity).localeCompare(String(b.work_date+" "+b.start_time+" "+b.activity)));
  const{data:unresolved}=await sb.from("teacher_work_schedule_templates").select("day_of_week,assignee_label,team_label,duty_location").eq("academic_year_id",year.id).eq("is_active",true).eq("activity_code","student_welcome_gate").is("teacher_id",null);
  return reply({success:true,teacher_id:teacherId,month,semester_no:semesterNo,items,unresolved:canReview?(unresolved||[]):[]});
}catch(e){console.error(e);return reply({success:false,error:"server_error",message:txt((e as any)?.message)||"internal_error"},500)}});
