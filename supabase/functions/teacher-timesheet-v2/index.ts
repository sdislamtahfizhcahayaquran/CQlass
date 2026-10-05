import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

const CORS={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization,x-client-info,apikey,content-type,x-session-token","Access-Control-Allow-Methods":"POST,OPTIONS","Content-Type":"application/json; charset=utf-8"};
const URL=Deno.env.get("SUPABASE_URL")!;
const T=(v:any)=>String(v??"").trim();
const L=(v:any)=>T(v).toLowerCase();
const J=(b:any,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{...CORS,"Cache-Control":"no-store"}});
function secret(){const p=Deno.env.get("SUPABASE_SECRET_KEYS");if(p){try{const x=JSON.parse(p);if(x?.default)return String(x.default)}catch{}}return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||Deno.env.get("SUPABASE_SECRET_KEY")||""}
const sb=createClient(URL,secret(),{auth:{persistSession:false,autoRefreshToken:false}});
async function hash(v:string){const d=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(v));return[...new Uint8Array(d)].map(x=>x.toString(16).padStart(2,"0")).join("")}
const mins=(v:any)=>{const s=T(v);if(!/^\d{2}:\d{2}/.test(s))return null;const[h,m]=s.slice(0,5).split(":").map(Number);return h*60+m};
const overlap=(s1:any,e1:any,s2:any,e2:any)=>{const a=mins(s1),b=mins(e1),c=mins(s2),d=mins(e2);return a!==null&&b!==null&&c!==null&&d!==null&&a<d&&c<b};
const jpFromTimes=(a:any,b:any)=>{const x=mins(a),y=mins(b);if(x===null||y===null||y<=x)return 0;return Math.round(((y-x)/25)*2)/2};
const dow=(date:string)=>{const x=new Date(`${date}T12:00:00Z`).getUTCDay();return x===0?7:x};
async function account(req:Request){const tok=T(req.headers.get("x-session-token"));if(!tok)return null;const{data:s}=await sb.from("user_sessions").select("user_account_id,expires_at,revoked_at").eq("token_hash",await hash(tok)).maybeSingle();if(!s||s.revoked_at||!s.expires_at||Date.parse(s.expires_at)<=Date.now())return null;const{data:a}=await sb.from("user_accounts").select("id,teacher_id,status,username").eq("id",s.user_account_id).maybeSingle();if(!a||["nonaktif","inactive","disabled","blocked"].includes(L(a.status)))return null;const{data:r}=await sb.from("user_account_roles").select("role_code,role,is_active").eq("user_account_id",a.id).eq("is_active",true);return{...a,roles:[...new Set((r||[]).map((x:any)=>L(x.role_code||x.role)).filter(Boolean))]}}
async function legacy(req:Request,body:any){const r=await fetch(`${URL}/functions/v1/teacher-timesheet`,{method:"POST",headers:{"Content-Type":"application/json","apikey":req.headers.get("apikey")||"","Authorization":req.headers.get("Authorization")||"","x-session-token":req.headers.get("x-session-token")||""},body:JSON.stringify(body)});const txt=await r.text();let data:any=null;try{data=txt?JSON.parse(txt):null}catch{}return{r,txt,data}}
async function proxy(req:Request,body:any){const x=await legacy(req,body);return new Response(x.txt,{status:x.r.status,headers:{...CORS,"Cache-Control":"no-store"}})}
function monthBounds(month:string){if(!/^\d{4}-\d{2}$/.test(month))return null;const[y,m]=month.split("-").map(Number);return{start:`${month}-01`,end:new Date(Date.UTC(y,m,0)).toISOString().slice(0,10)}}
async function bootstrapWithTahfizhBadal(req:Request,body:any){
  const x=await legacy(req,body);
  if(!x.r.ok||!x.data||x.data.success===false)return new Response(x.txt,{status:x.r.status,headers:{...CORS,"Cache-Control":"no-store"}});
  const data=x.data,teacherId=T(data.teacher?.id),yearId=T(data.context?.academic_year_id),month=T(data.month||body.month);
  const range=monthBounds(month);
  if(!teacherId||!yearId||!range)return J(data,x.r.status);
  const q=await sb.from("tahfizh_substitution_assignments").select("id,work_date,class_id,substitute_teacher_id,start_time,end_time,reason,status,substitute_name,substitute_type").eq("academic_year_id",yearId).eq("semester_no",1).eq("substitute_teacher_id",teacherId).eq("status","active").gte("work_date",range.start).lte("work_date",range.end).order("work_date").order("start_time");
  if(q.error){console.error("timesheet tahfizh badal",q.error);return J(data,x.r.status)}
  const rows=q.data||[],classIds=[...new Set(rows.map((r:any)=>T(r.class_id)).filter(Boolean))];
  const cq=classIds.length?await sb.from("classes").select("id,name").in("id",classIds):{data:[],error:null};
  if((cq as any).error)console.error("timesheet tahfizh classes",(cq as any).error);
  const cm=new Map((((cq as any).data)||[]).map((c:any)=>[T(c.id),T(c.name)]));
  const current=Array.isArray(data.teaching)?data.teaching:[];
  const existing=new Set(current.map((r:any)=>T(r.id)));
  for(const r of rows){
    const id=`badal-tahfizh:${r.id}`;
    if(existing.has(id))continue;
    current.push({id,work_date:r.work_date,start_time:r.start_time,end_time:r.end_time,subject_id:null,subject_name:"Tahfizh",class_id:r.class_id,class_name:cm.get(T(r.class_id))||"",jp:jpFromTimes(r.start_time,r.end_time),source:"badal",badal_scope:"tahfizh",note:T(r.reason)?`Badal Tahfizh · ${T(r.reason)}`:"Badal Tahfizh",substitution_id:r.id});
  }
  current.sort((a:any,b:any)=>String((a.work_date||"")+(a.start_time||"")).localeCompare(String((b.work_date||"")+(b.start_time||""))));
  data.teaching=current;
  const satRows=Array.isArray(data.saturdays)?data.saturdays:[];
  if(satRows.length){
    const ids=satRows.map((s:any)=>T(s.id)).filter(Boolean);
    const oq=await sb.from("teacher_timesheet_activities").select("id,source_ref,start_time,end_time,activity,note").eq("teacher_id",teacherId).eq("source","saturday_override").in("source_ref",ids);
    if(!oq.error){
      const om=new Map((oq.data||[]).map((r:any)=>[T(r.source_ref),r]));
      data.saturdays=satRows.map((s:any)=>{const o=om.get(T(s.id));return o?{...s,start_time:o.start_time||s.start_time,end_time:o.end_time||s.end_time,activity_name:o.activity||s.activity_name,note:o.note??s.note,override_id:o.id,editable:true}:{...s,editable:true}});
    }
  }
  return J(data,x.r.status);
}
async function validateFreeSlot(req:Request,body:any){
  const me=await account(req);if(!me)return null;
  const teacherId=T(body.teacher_id||me.teacher_id),date=T(body.work_date),start=T(body.start_time),end=T(body.end_time);
  if(!teacherId||!/^\d{4}-\d{2}-\d{2}$/.test(date)||mins(start)===null||mins(end)===null)return null;
  const{data:teacher}=await sb.from("teachers").select("school_unit_id").eq("id",teacherId).maybeSingle();
  let yq=sb.from("academic_years").select("id").lte("start_date",date).gte("end_date",date).order("created_at",{ascending:false}).limit(1);if(teacher?.school_unit_id)yq=yq.eq("school_unit_id",teacher.school_unit_id);const{data:years}=await yq;const year=years?.[0];if(!year)return null;
  const{data:sem}=await sb.from("semesters").select("semester_no").eq("academic_year_id",year.id).eq("is_active",true).maybeSingle();const semesterNo=Number(sem?.semester_no||1),day=dow(date);
  const[{data:asg},{data:hom},{data:tahAsg},{data:partnerRows},{data:classPartners}]=await Promise.all([
    sb.from("teacher_subject_assignments").select("class_id").eq("academic_year_id",year.id).eq("semester_no",semesterNo).eq("teacher_id",teacherId).eq("is_active",true),
    sb.from("report_class_assignments").select("class_id,homeroom_teacher_id,partner_teacher_id").eq("academic_year_id",year.id).eq("semester_no",semesterNo).or(`homeroom_teacher_id.eq.${teacherId},partner_teacher_id.eq.${teacherId}`),
    sb.from("tahfizh_teacher_assignments").select("class_id,team_name").eq("academic_year_id",year.id).eq("semester_no",semesterNo).eq("teacher_id",teacherId).eq("is_active",true),
    sb.from("partner_tahfizh_halaqah_roster").select("class_id").eq("academic_year_id",year.id).eq("semester_no",semesterNo).eq("partner_teacher_id",teacherId).eq("is_active",true),
    sb.from("class_partner_assignments").select("class_id").eq("academic_year_id",year.id).eq("semester_no",semesterNo).eq("teacher_id",teacherId).eq("is_active",true)
  ]);
  // Tahfizh hanya ditentukan dari assignment Tahfizh yang eksplisit.
  // class_partner_assignments adalah partner kelas umum dan tidak boleh
  // mengubah profil guru menjadi Tahfizh.
  const isTahfizh=(tahAsg||[]).length>0||(partnerRows||[]).length>0;
  const classIds=[...new Set([
    ...(asg||[]).map((x:any)=>T(x.class_id)),
    ...(hom||[]).map((x:any)=>T(x.class_id)),
    ...(tahAsg||[]).map((x:any)=>T(x.class_id)),
    ...(partnerRows||[]).map((x:any)=>T(x.class_id)),
    ...(classPartners||[]).map((x:any)=>T(x.class_id))
  ].filter(Boolean))];
  const ownQ=Promise.resolve({data:[],error:null});
  const tahQ=Promise.resolve({data:[],error:null});
  const routineQ=classIds.length?sb.from("class_schedule_entries").select("start_time,end_time,activity_type,subject_name_raw").eq("academic_year_id",year.id).eq("semester_no",semesterNo).eq("day_of_week",day).eq("is_active",true).in("activity_type",["break","school_routine"]).in("class_id",classIds).not("start_time","is",null).not("end_time","is",null):Promise.resolve({data:[],error:null});
  const workQ=sb.from("teacher_work_schedule_templates").select("start_time,end_time,activity_name,activity_code").eq("academic_year_id",year.id).eq("semester_no",semesterNo).eq("day_of_week",day).eq("is_active",true).or(`applies_to_all.eq.true,teacher_id.eq.${teacherId}`);
  const uksQ=isTahfizh?Promise.resolve({data:[],error:null}):sb.from("uks_duty_schedule").select("start_time,end_time,shift_no").eq("teacher_id",teacherId).eq("weekday",day).eq("is_active",true);
  const manualQ=sb.from("teacher_timesheet_activities").select("id,start_time,end_time,activity").eq("teacher_id",teacherId).eq("work_date",date);
  const badalQ=sb.from("teacher_substitution_assignments").select("start_time,end_time,reason").eq("academic_year_id",year.id).eq("semester_no",semesterNo).eq("work_date",date).eq("substitute_teacher_id",teacherId).eq("status","active");
  const tahBadalQ=sb.from("tahfizh_substitution_assignments").select("start_time,end_time,reason").eq("academic_year_id",year.id).eq("semester_no",semesterNo).eq("work_date",date).eq("substitute_teacher_id",teacherId).eq("status","active");
  const [ownR,tahR,routineR,workR,uksR,manualR,badalR,tahBadalR]=await Promise.all([ownQ,tahQ,routineQ,workQ,uksQ,manualQ,badalQ,tahBadalQ]);
  const conflicts:any[]=[];
  for(const x of ownR.data||[])if(overlap(start,end,x.start_time,x.end_time))conflicts.push({label:T(x.subject_name_raw)||"Jadwal mengajar",start:x.start_time,end:x.end_time});
  for(const x of tahR.data||[])if(overlap(start,end,x.start_time,x.end_time))conflicts.push({label:"KBM Tahfizh",start:x.start_time,end:x.end_time});
  for(const x of routineR.data||[])if(overlap(start,end,x.start_time,x.end_time))conflicts.push({label:T(x.subject_name_raw)||"Rutinitas sekolah",start:x.start_time,end:x.end_time});
  for(const x of workR.data||[]){
    if(x.activity_code==="administration_eduhub"&&!isTahfizh)continue;
    const ws=x.activity_code==="administration_eduhub"&&isTahfizh?"14:50:00":x.start_time;
    const we=x.activity_code==="administration_eduhub"&&isTahfizh?"16:00:00":x.end_time;
    if(overlap(start,end,ws,we))conflicts.push({label:x.activity_code==="administration_eduhub"?"Administrasi Eduhub":T(x.activity_name)||"Jadwal kerja rutin",start:ws,end:we});
  }
  for(const x of uksR.data||[])if(overlap(start,end,x.start_time,x.end_time))conflicts.push({label:`Jaga UKS shift ${Number(x.shift_no)||""}`.trim(),start:x.start_time,end:x.end_time});
  for(const x of manualR.data||[])if(T(x.id)!==T(body.id)&&overlap(start,end,x.start_time,x.end_time))conflicts.push({label:T(x.activity)||"Timesheet yang sudah diisi",start:x.start_time,end:x.end_time});
  for(const x of badalR.data||[])if(overlap(start,end,x.start_time,x.end_time))conflicts.push({label:"Badal guru umum",start:x.start_time,end:x.end_time});
  for(const x of tahBadalR.data||[])if(overlap(start,end,x.start_time,x.end_time))conflicts.push({label:"Badal Tahfizh",start:x.start_time,end:x.end_time});
  if(!conflicts.length)return null;
  const c=conflicts[0],range=[T(c.start).slice(0,5),T(c.end).slice(0,5)].filter(Boolean).join("–");
  return `Jam ini bukan Timesheet karena bertabrakan dengan ${c.label}${range?` (${range})`:""}. Pilih waktu di luar mengajar dan rutinitas sekolah.`;
}

const REVIEW_ROLES=new Set(["admin","hrd","akademik","pimpinan"]);
function mayTarget(me:any,target:string){return !!target&&(T(me.teacher_id)===target||(me.roles||[]).some((r:string)=>REVIEW_ROLES.has(L(r))))}
async function updateActivity(req:Request,b:any){
  const me=await account(req);if(!me)return J({success:false,error:"session_expired"},401);
  const id=T(b.id),date=T(b.work_date),start=T(b.start_time),end=T(b.end_time),activity=T(b.activity),note=T(b.note);
  if(!id||!/^\d{4}-\d{2}-\d{2}$/.test(date)||mins(start)===null||mins(end)===null||Number(mins(end))<=Number(mins(start))||!activity)return J({success:false,error:"invalid_input"},400);
  const{data:row}=await sb.from("teacher_timesheet_activities").select("id,teacher_id,source").eq("id",id).maybeSingle();
  if(!row||!mayTarget(me,T(row.teacher_id)))return J({success:false,error:"forbidden"},403);
  const d=dow(date),sm=Number(mins(start)),em=Number(mins(end)),minStart=d===6?450:420,maxEnd=d===6?720:960;
  if(d===7||sm<minStart||em>maxEnd)return J({success:false,error:"outside_work_hours"},400);
  const conflict=await validateFreeSlot(req,{...b,teacher_id:row.teacher_id,id});if(conflict)return J({success:false,error:conflict},400);
  const{error}=await sb.from("teacher_timesheet_activities").update({work_date:date,start_time:start,end_time:end,activity,note:note||null,updated_at:new Date().toISOString()}).eq("id",id).eq("teacher_id",row.teacher_id);
  if(error)throw error;return J({success:true});
}
async function saveSaturdayOverride(req:Request,b:any){
  const me=await account(req);if(!me)return J({success:false,error:"session_expired"},401);
  const scheduleId=T(b.saturday_schedule_id),teacherId=T(b.teacher_id||me.teacher_id),date=T(b.work_date),start=T(b.start_time),end=T(b.end_time),activity=T(b.activity),note=T(b.note);
  if(!scheduleId||!teacherId||!mayTarget(me,teacherId)||dow(date)!==6||mins(start)===null||mins(end)===null||Number(mins(start))<450||Number(mins(end))>720||Number(mins(end))<=Number(mins(start))||!activity)return J({success:false,error:"invalid_input"},400);
  const{data:existing}=await sb.from("teacher_timesheet_activities").select("id").eq("teacher_id",teacherId).eq("source","saturday_override").eq("source_ref",scheduleId).maybeSingle();
  const payload={teacher_id:teacherId,work_date:date,start_time:start,end_time:end,activity,note:note||null,source:"saturday_override",source_ref:scheduleId,created_by_account_id:me.id,updated_at:new Date().toISOString()};
  if(existing?.id){const{error}=await sb.from("teacher_timesheet_activities").update(payload).eq("id",existing.id);if(error)throw error;return J({success:true,id:existing.id})}
  const{data,error}=await sb.from("teacher_timesheet_activities").insert(payload).select("id").single();if(error)throw error;return J({success:true,id:data.id});
}
Deno.serve(async(req)=>{if(req.method==="OPTIONS")return new Response("ok",{headers:CORS});if(req.method!=="POST")return J({success:false,error:"method_not_allowed"},405);const body=await req.json().catch(()=>({}));const action=T(body.action);if(action==="bootstrap"){try{return await bootstrapWithTahfizhBadal(req,body)}catch(e){console.error("timesheet bootstrap v2",e);return J({success:false,error:"Timesheet belum dapat dimuat. Coba muat ulang."},400)}}if(action==="update_activity"){try{return await updateActivity(req,body)}catch(e){console.error("update activity",e);return J({success:false,error:"update_failed"},400)}}if(action==="save_saturday_override"){try{return await saveSaturdayOverride(req,body)}catch(e){console.error("saturday override",e);return J({success:false,error:"update_failed"},400)}}if(action==="save_activity"){try{const conflict=await validateFreeSlot(req,body);if(conflict)return J({success:false,error:conflict},400)}catch(e){console.error("free-slot validation",e);return J({success:false,error:"Jadwal Timesheet belum dapat divalidasi. Coba muat ulang Timesheet."},400)}}return proxy(req,body)});