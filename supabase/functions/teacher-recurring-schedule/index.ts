import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

const CORS={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization,apikey,content-type,x-session-token","Access-Control-Allow-Methods":"POST,OPTIONS","Content-Type":"application/json; charset=utf-8"};
const URL=Deno.env.get("SUPABASE_URL")!;
const txt=(v:unknown)=>String(v??"").trim();
const low=(v:unknown)=>txt(v).toLowerCase();
const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...CORS,"Cache-Control":"no-store"}});
function secret(){const p=Deno.env.get("SUPABASE_SECRET_KEYS");if(p){try{const x=JSON.parse(p);if(x?.default)return String(x.default)}catch{}}return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||Deno.env.get("SUPABASE_SECRET_KEY")||""}
const sb=createClient(URL,secret(),{auth:{persistSession:false,autoRefreshToken:false}});
async function sha(v:string){const d=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(v));return[...new Uint8Array(d)].map(x=>x.toString(16).padStart(2,"0")).join("")}
function normRole(v:unknown){const s=low(v).replace(/[-\s]+/g,"_").replace(/[^a-z0-9_]/g,"");if(!s)return"";if(s==="admin"||s.includes("administrator"))return"admin";if(s.includes("pimpinan")||s.includes("kepala_sekolah")||s==="kepsek")return"pimpinan";if(s.includes("kabid_akademik")||s==="akademik")return"akademik";if(s.includes("kabid_kegiatan")||s==="kegiatan")return"kegiatan";if(s.includes("kabid_kesiswaan")||s==="kesiswaan")return"kesiswaan";if(s.includes("kabid_tahfizh")||s==="tahfizh")return"tahfizh";if(s==="hrd")return"hrd";return s}
async function account(req:Request){const token=txt(req.headers.get("x-session-token"));if(!token)return null;const{data:s}=await sb.from("user_sessions").select("user_account_id,expires_at,revoked_at").eq("token_hash",await sha(token)).maybeSingle();if(!s||s.revoked_at||!s.expires_at||Date.parse(s.expires_at)<=Date.now())return null;const{data:a}=await sb.from("user_accounts").select("id,teacher_id,username,status").eq("id",s.user_account_id).maybeSingle();if(!a||["nonaktif","inactive","disabled","blocked"].includes(low(a.status)))return null;const{data:r}=await sb.from("user_account_roles").select("role_code,role,is_active").eq("user_account_id",a.id).eq("is_active",true);return{...a,roles:(r||[]).map((x:any)=>normRole(x.role_code||x.role)).filter(Boolean)}}
const REVIEW=new Set(["admin","hrd","akademik","pimpinan","kegiatan","kesiswaan"]);
function monthDates(month:string){const[y,m]=month.split("-").map(Number),out:string[]=[];const last=new Date(Date.UTC(y,m,0)).getUTCDate();for(let d=1;d<=last;d++)out.push(`${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`);return out}
const mins=(v:unknown)=>{const s=txt(v);if(!/^\d{2}:\d{2}/.test(s))return null;const[h,m]=s.slice(0,5).split(":").map(Number);return h*60+m};
const tm=(n:number)=>`${String(Math.floor(n/60)).padStart(2,"0")}:${String(n%60).padStart(2,"0")}:00`;
const overlaps=(a1:number,a2:number,b1:number,b2:number)=>a1<b2&&b1<a2;
function subtractBusy(start:any,end:any,busy:any[]){const s=mins(start),e=mins(end);if(s===null||e===null||s>=e)return[];let segs:[number,number][]=[[s,e]];const blocks=busy.map(x=>[mins(x.start_time),mins(x.end_time)] as const).filter(x=>x[0]!==null&&x[1]!==null&&Number(x[0])<Number(x[1])).map(x=>[Number(x[0]),Number(x[1])] as [number,number]).sort((a,b)=>a[0]-b[0]);for(const[b1,b2]of blocks){const next:[number,number][]=[];for(const[a1,a2]of segs){if(!overlaps(a1,a2,b1,b2)){next.push([a1,a2]);continue}if(a1<b1)next.push([a1,Math.min(a2,b1)]);if(b2<a2)next.push([Math.max(a1,b2),a2])}segs=next.filter(x=>x[1]>x[0])}return segs.map(([a,b])=>({start_time:tm(a),end_time:tm(b)}))}

Deno.serve(async(req)=>{if(req.method==="OPTIONS")return new Response("ok",{headers:CORS});if(req.method!=="POST")return reply({success:false,error:"method_not_allowed"},405);try{
  const me=await account(req);if(!me)return reply({success:false,error:"session_expired"},401);
  const body=await req.json().catch(()=>({}));const action=txt(body.action)||"bootstrap",month=txt(body.month),requested=txt(body.teacher_id);
  if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))return reply({success:false,error:"invalid_month"},400);
  const canReview=me.roles.some((r:string)=>REVIEW.has(r))||REVIEW.has(normRole(me.username));
  const teacherId=requested&&canReview?requested:txt(me.teacher_id);if(!teacherId)return reply({success:true,patterns:[],items:[],editable:false});
  const editable=teacherId===txt(me.teacher_id);
  const dates=monthDates(month),monthStart=dates[0],monthEnd=dates[dates.length-1];
  const{data:teacher,error:teacherError}=await sb.from("teachers").select("id,school_unit_id,full_name").eq("id",teacherId).maybeSingle();if(teacherError)throw teacherError;if(!teacher)return reply({success:false,error:"teacher_not_found"},404);
  let yq=sb.from("academic_years").select("id,school_unit_id,start_date,end_date").eq("is_active",true).lte("start_date",monthEnd).gte("end_date",monthStart).order("created_at",{ascending:false}).limit(1);if(teacher.school_unit_id)yq=yq.eq("school_unit_id",teacher.school_unit_id);const{data:years,error:yearError}=await yq;if(yearError)throw yearError;const year=years?.[0];if(!year)return reply({success:true,teacher,patterns:[],items:[],editable});
  const{data:sem}=await sb.from("semesters").select("semester_no").eq("academic_year_id",year.id).eq("is_active",true).maybeSingle();const semesterNo=Number(sem?.semester_no||1);

  if(action==="save"){
    if(!editable)return reply({success:false,error:"forbidden"},403);
    const id=txt(body.id),name=txt(body.activity_name),note=txt(body.note),start=txt(body.start_time),end=txt(body.end_time);const rawDays=Array.isArray(body.days_of_week)?body.days_of_week:[];const days=[...new Set(rawDays.map((x:any)=>Number(x)).filter((x:number)=>x>=1&&x<=5))].sort((a,b)=>a-b);
    const s=mins(start),e=mins(end);if(!name||name.length>160||!days.length||s===null||e===null||s>=e)return reply({success:false,error:"invalid_input"},400);
    const{data:existing,error:existingError}=await sb.from("teacher_recurring_activities").select("id,days_of_week,start_time,end_time").eq("academic_year_id",year.id).eq("semester_no",semesterNo).eq("teacher_id",teacherId).eq("is_active",true);if(existingError)throw existingError;
    const conflict=(existing||[]).find((x:any)=>txt(x.id)!==id&&(x.days_of_week||[]).some((d:any)=>days.includes(Number(d)))&&overlaps(s,e,Number(mins(x.start_time)),Number(mins(x.end_time))));if(conflict)return reply({success:false,error:"pattern_overlap"},409);
    const payload={school_unit_id:teacher.school_unit_id,academic_year_id:year.id,semester_no:semesterNo,teacher_id:teacherId,activity_name:name,days_of_week:days,start_time:start,end_time:end,note:note||null,is_active:true,updated_at:new Date().toISOString()};
    if(id){const{data:row,error}=await sb.from("teacher_recurring_activities").update(payload).eq("id",id).eq("teacher_id",teacherId).select("*").maybeSingle();if(error)throw error;if(!row)return reply({success:false,error:"not_found"},404);return reply({success:true,pattern:row})}
    const{data:row,error}=await sb.from("teacher_recurring_activities").insert({...payload,created_by_account_id:me.id}).select("*").single();if(error)throw error;return reply({success:true,pattern:row});
  }
  if(action==="delete"){
    if(!editable)return reply({success:false,error:"forbidden"},403);const id=txt(body.id);if(!id)return reply({success:false,error:"invalid_input"},400);const{error}=await sb.from("teacher_recurring_activities").update({is_active:false,updated_at:new Date().toISOString()}).eq("id",id).eq("teacher_id",teacherId);if(error)throw error;return reply({success:true});
  }
  if(action!=="bootstrap")return reply({success:false,error:"invalid_action"},400);

  const[{data:patterns,error:patternError},{data:asg},{data:hom}]=await Promise.all([
    sb.from("teacher_recurring_activities").select("id,activity_name,days_of_week,start_time,end_time,note,is_active").eq("academic_year_id",year.id).eq("semester_no",semesterNo).eq("teacher_id",teacherId).eq("is_active",true).order("start_time"),
    sb.from("teacher_subject_assignments").select("class_id").eq("academic_year_id",year.id).eq("semester_no",semesterNo).eq("teacher_id",teacherId).eq("is_active",true),
    sb.from("report_class_assignments").select("class_id,homeroom_teacher_id,partner_teacher_id").eq("academic_year_id",year.id).eq("semester_no",semesterNo).or(`homeroom_teacher_id.eq.${teacherId},partner_teacher_id.eq.${teacherId}`)
  ]);if(patternError)throw patternError;
  const classIds=[...new Set([...(asg||[]).map((x:any)=>txt(x.class_id)),...(hom||[]).map((x:any)=>txt(x.class_id))].filter(Boolean))];
  const ownQ=sb.from("class_schedule_entries").select("day_of_week,start_time,end_time,activity_type,subject_name_raw").eq("academic_year_id",year.id).eq("semester_no",semesterNo).eq("teacher_id",teacherId).eq("is_active",true).not("start_time","is",null).not("end_time","is",null);
  const routineQ=classIds.length?sb.from("class_schedule_entries").select("day_of_week,start_time,end_time,activity_type,subject_name_raw").eq("academic_year_id",year.id).eq("semester_no",semesterNo).eq("is_active",true).in("activity_type",["break","school_routine"]).in("class_id",classIds).not("start_time","is",null).not("end_time","is",null):Promise.resolve({data:[],error:null});
  const workQ=sb.from("teacher_work_schedule_templates").select("day_of_week,start_time,end_time,activity_name,activity_code").eq("academic_year_id",year.id).eq("semester_no",semesterNo).eq("is_active",true).or(`applies_to_all.eq.true,teacher_id.eq.${teacherId}`);
  const uksQ=sb.from("uks_duty_schedule").select("weekday,start_time,end_time,shift_no").eq("teacher_id",teacherId).eq("is_active",true);
  const manualQ=sb.from("teacher_timesheet_activities").select("work_date,start_time,end_time,activity").eq("teacher_id",teacherId).gte("work_date",monthStart).lte("work_date",monthEnd);
  const badalQ=sb.from("teacher_substitution_assignments").select("work_date,start_time,end_time,reason").eq("academic_year_id",year.id).eq("semester_no",semesterNo).eq("substitute_teacher_id",teacherId).eq("status","active").gte("work_date",monthStart).lte("work_date",monthEnd);
  const[ownR,routineR,workR,uksR,manualR,badalR]=await Promise.all([ownQ,routineQ,workQ,uksQ,manualQ,badalQ]);for(const r of[ownR,routineR,workR,uksR,manualR,badalR])if((r as any).error)throw (r as any).error;

  const items:any[]=[];
  for(const p of patterns||[]){const pDays=new Set((p.days_of_week||[]).map((x:any)=>Number(x)));for(const date of dates){const day=new Date(`${date}T12:00:00Z`).getUTCDay();if(!pDays.has(day))continue;const busy:any[]=[];for(const x of ownR.data||[])if(Number(x.day_of_week)===day)busy.push(x);for(const x of routineR.data||[])if(Number(x.day_of_week)===day)busy.push(x);for(const x of workR.data||[])if(Number(x.day_of_week)===day)busy.push(x);for(const x of uksR.data||[])if(Number(x.weekday)===day)busy.push(x);for(const x of manualR.data||[])if(txt(x.work_date)===date)busy.push(x);for(const x of badalR.data||[])if(txt(x.work_date)===date)busy.push(x);const segs=subtractBusy(p.start_time,p.end_time,busy);for(let i=0;i<segs.length;i++)items.push({id:`rec:${p.id}:${date}:${i}`,pattern_id:p.id,work_date:date,start_time:segs[i].start_time,end_time:segs[i].end_time,activity:p.activity_name,note:p.note||"",source:"recurring",automatic:true})}}
  items.sort((a,b)=>String(a.work_date+" "+a.start_time+" "+a.activity).localeCompare(String(b.work_date+" "+b.start_time+" "+b.activity)));
  return reply({success:true,teacher,month,semester_no:semesterNo,patterns:patterns||[],items,editable});
}catch(e){console.error("teacher-recurring-schedule",e);return reply({success:false,error:"server_error",message:txt((e as any)?.message)||"internal_error"},500)}});
