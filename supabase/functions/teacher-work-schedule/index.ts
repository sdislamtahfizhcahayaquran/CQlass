import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

const CORS={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization,apikey,content-type,x-session-token","Access-Control-Allow-Methods":"POST,OPTIONS","Content-Type":"application/json; charset=utf-8"};
const txt=(v:unknown)=>String(v??"").trim();
const low=(v:unknown)=>txt(v).toLowerCase();
const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...CORS,"Cache-Control":"no-store"}});
const url=Deno.env.get("SUPABASE_URL")!;
function secret(){const packed=Deno.env.get("SUPABASE_SECRET_KEYS");if(packed){try{const p=JSON.parse(packed);if(p?.default)return String(p.default)}catch{}}return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||Deno.env.get("SUPABASE_SECRET_KEY")||""}
const sb=createClient(url,secret(),{auth:{persistSession:false,autoRefreshToken:false}});
async function sha(v:string){const d=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(v));return[...new Uint8Array(d)].map(x=>x.toString(16).padStart(2,"0")).join("")}
function normRole(v:unknown){const s=low(v).replace(/[-\s]+/g,"_").replace(/[^a-z0-9_]/g,"");if(!s)return"";if(s==="admin"||s.includes("administrator"))return"admin";if(s.includes("pimpinan")||s.includes("kepala_sekolah")||s==="kepsek")return"pimpinan";if(s.includes("kabid_akademik")||s==="akademik")return"akademik";if(s.includes("kabid_kegiatan")||s==="kegiatan")return"kegiatan";if(s.includes("kabid_kesiswaan")||s==="kesiswaan")return"kesiswaan";if(s.includes("kabid_quran")||s==="tahfizh")return"tahfizh";if(s==="hrd")return"hrd";return s}
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
  if(!teacherId)return reply({success:true,items:[],unresolved:[],profile:null});
  const dates=monthDates(month),monthStart=dates[0],monthEnd=dates[dates.length-1],today=todayJakarta();
  const{data:teacher,error:teacherError}=await sb.from("teachers").select("school_unit_id").eq("id",teacherId).maybeSingle();if(teacherError)throw teacherError;
  const yearQuery=sb.from("academic_years").select("id,start_date,end_date").eq("is_active",true).lte("start_date",monthEnd).gte("end_date",monthStart);if(teacher?.school_unit_id)yearQuery.eq("school_unit_id",teacher.school_unit_id);const{data:years,error:yearError}=await yearQuery.limit(1);if(yearError)throw yearError;const year=years?.[0];if(!year)return reply({success:true,items:[],unresolved:[],profile:null});
  const{data:sem}=await sb.from("semesters").select("semester_no").eq("academic_year_id",year.id).eq("is_active",true).maybeSingle();const semesterNo=Number(sem?.semester_no||0);if(![1,2].includes(semesterNo))throw Error("active_semester_not_found");

  const[asgRes,homRes,tahRes,classPartnerRes]=await Promise.all([
    sb.from("teacher_subject_assignments").select("class_id").eq("academic_year_id",year.id).eq("semester_no",semesterNo).eq("teacher_id",teacherId).eq("is_active",true),
    sb.from("report_class_assignments").select("class_id").eq("academic_year_id",year.id).eq("semester_no",semesterNo).or(`homeroom_teacher_id.eq.${teacherId},partner_teacher_id.eq.${teacherId}`),
    sb.from("tahfizh_teacher_assignments").select("class_id,team_name").eq("academic_year_id",year.id).eq("semester_no",semesterNo).eq("teacher_id",teacherId).eq("is_active",true),
    sb.from("class_partner_assignments").select("class_id").eq("academic_year_id",year.id).eq("semester_no",semesterNo).eq("teacher_id",teacherId).eq("is_active",true)
  ]);
  for(const r of[asgRes,homRes,tahRes,classPartnerRes])if(r.error)throw r.error;
  const isTahfizh=(tahRes.data||[]).length>0;
  const partnerClassIds=[...new Set((classPartnerRes.data||[]).map((x:any)=>txt(x.class_id)).filter(Boolean))];
  const classIds=partnerClassIds.length&&isTahfizh?partnerClassIds:[...new Set([...(asgRes.data||[]),...(homRes.data||[]),...(tahRes.data||[])].map((x:any)=>txt(x.class_id)).filter(Boolean))];
  const{data:classes,error:classErr}=classIds.length?await sb.from("classes").select("id,name,grade_level").in("id",classIds):{data:[],error:null};if(classErr)throw classErr;
  const grades=[...new Set((classes||[]).map((x:any)=>Number(x.grade_level)).filter(Boolean))];
  const upper=grades.some((g:number)=>g>=4);
  const lateSnack=(classes||[]).some((x:any)=>Number(x.grade_level)===1||/banin/i.test(txt(x.name)));

  const routinePromise=classIds.length?sb.from("class_schedule_entries").select("day_of_week,start_time,end_time,activity_type,subject_name_raw").eq("academic_year_id",year.id).eq("semester_no",semesterNo).eq("is_active",true).in("class_id",classIds).in("activity_type",["break","school_routine"]).not("start_time","is",null).not("end_time","is",null):Promise.resolve({data:[],error:null});
  const tahSchedulePromise=isTahfizh&&classIds.length?sb.from("tahfizh_kbm_schedules").select("day_of_week,start_time,end_time,class_id,team_name").eq("academic_year_id",year.id).eq("semester_no",semesterNo).eq("is_active",true).in("class_id",classIds):Promise.resolve({data:[],error:null});
  const[tplRes,uksRes,reportRes,routineRes,tahScheduleRes]=await Promise.all([
    sb.from("teacher_work_schedule_templates").select("*").eq("academic_year_id",year.id).eq("semester_no",semesterNo).eq("is_active",true).or(`applies_to_all.eq.true,teacher_id.eq.${teacherId}`).order("day_of_week").order("start_time"),
    isTahfizh?Promise.resolve({data:[],error:null}):sb.from("uks_duty_schedule").select("id,teacher_id,weekday,shift_no,start_time,end_time,is_active").eq("teacher_id",teacherId).eq("is_active",true).order("weekday").order("shift_no"),
    isTahfizh?Promise.resolve({data:[],error:null}):sb.from("uks_duty_reports").select("id,duty_date,shift_no,captured_at,created_at").eq("teacher_id",teacherId).gte("duty_date",monthStart).lte("duty_date",monthEnd),
    routinePromise,
    tahSchedulePromise
  ]);
  for(const r of[tplRes,uksRes,reportRes,routineRes,tahScheduleRes])if((r as any).error)throw (r as any).error;
  const rows=tplRes.data||[],uksRows=uksRes.data||[],reportKeys=new Set((reportRes.data||[]).map((r:any)=>`${r.duty_date}:${Number(r.shift_no)}`));
  const ownGateDays=new Set(rows.filter((r:any)=>r.teacher_id===teacherId&&r.activity_code==="student_welcome_gate").map((r:any)=>Number(r.day_of_week)));
  const templates=rows.filter((r:any)=>{
    const d=Number(r.day_of_week);
    if(ownGateDays.has(d)&&["student_welcome_class","briefing"].includes(txt(r.activity_code)))return false;
    if(r.activity_code==="administration_eduhub"&&!isTahfizh)return false;
    return true;
  });
  const items:any[]=[];
  for(const date of dates){
    const dow=new Date(`${date}T12:00:00Z`).getUTCDay();if(dow<1||dow>6)continue;
    for(const r of templates){if(Number(r.day_of_week)!==dow)continue;const edu=r.activity_code==="administration_eduhub"&&isTahfizh;items.push({id:`${r.id}:${date}`,template_id:r.id,work_date:date,start_time:edu?"14:50:00":r.start_time,end_time:edu?"16:00:00":r.end_time,activity_code:r.activity_code,activity:edu?"Administrasi Eduhub":r.activity_name,note:r.duty_location?[r.duty_location,r.team_label].filter(Boolean).join(" · "):"",source:"jadwal-kerja",automatic:true,display:!["timesheet_teaching","ishoma"].includes(txt(r.activity_code))})}
    const seen=new Set<string>();
    for(const r of routineRes.data||[]){if(Number(r.day_of_week)!==dow)continue;const k=`${r.start_time}|${r.end_time}|${r.subject_name_raw}`;if(seen.has(k))continue;seen.add(k);items.push({id:`routine:${date}:${k}`,template_id:null,work_date:date,start_time:r.start_time,end_time:r.end_time,activity_code:"routine_block",activity:r.subject_name_raw||"Rutinitas sekolah",note:"",source:"jadwal-kerja",automatic:true,display:false})}
    for(const r of tahScheduleRes.data||[]){if(Number(r.day_of_week)!==dow)continue;const k=`${r.start_time}|${r.end_time}|${r.class_id}`;items.push({id:`tahfizh:${date}:${k}`,template_id:null,work_date:date,start_time:r.start_time,end_time:r.end_time,activity_code:"tahfizh_kbm",activity:"KBM Tahfizh",note:r.team_name||"",source:"jadwal-kerja",automatic:true,display:false})}
    if(dow>=1&&dow<=4&&lateSnack)items.push({id:`snack:${date}`,template_id:null,work_date:date,start_time:"09:40:00",end_time:"10:10:00",activity_code:"snack_time",activity:"Snack Time",note:"Banin / seluruh kelas 1",source:"jadwal-kerja",automatic:true,display:false});
    if(dow===5)items.push({id:`friday:${date}`,template_id:null,work_date:date,start_time:"08:00:00",end_time:upper?"12:30:00":"10:40:00",activity_code:"friday_activity",activity:"Kegiatan Jumat",note:upper?"Level 4–6":"Level 1–3",source:"jadwal-kerja",automatic:true,display:false});
    for(const u of uksRows){if(Number(u.weekday)!==dow)continue;const reported=reportKeys.has(`${date}:${Number(u.shift_no)}`);const status=reported?"Laporan foto terkirim":date>today?"Terjadwal":"Belum ada laporan foto";items.push({id:`uks:${u.id}:${date}`,template_id:null,work_date:date,start_time:u.start_time,end_time:u.end_time,activity_code:"uks_duty",activity:"Jaga UKS",note:`Shift ${Number(u.shift_no)} · ${status}`,source:"jadwal-kerja",automatic:true,uks_shift_no:Number(u.shift_no),uks_reported:reported,display:true})}
  }
  items.sort((a,b)=>String(a.work_date+" "+a.start_time+" "+a.activity).localeCompare(String(b.work_date+" "+b.start_time+" "+b.activity)));
  const{data:unresolved}=await sb.from("teacher_work_schedule_templates").select("day_of_week,assignee_label,team_label,duty_location").eq("academic_year_id",year.id).eq("is_active",true).eq("activity_code","student_welcome_gate").is("teacher_id",null);
  return reply({success:true,teacher_id:teacherId,month,semester_no:semesterNo,profile:isTahfizh?"tahfizh":"mapel",grades,items,unresolved:canReview?(unresolved||[]):[]});
}catch(e){console.error(e);return reply({success:false,error:"server_error",message:txt((e as any)?.message)||"internal_error"},500)}});