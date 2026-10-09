import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

const CORS={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization,apikey,content-type,x-session-token","Access-Control-Allow-Methods":"POST,OPTIONS","Content-Type":"application/json; charset=utf-8"};
const J=(x:any,s=200)=>new Response(JSON.stringify(x),{status:s,headers:{...CORS,"Cache-Control":"no-store"}});
const T=(v:any)=>String(v??"").trim();
const L=(v:any)=>T(v).toLowerCase();
function N(v:any){const x=L(v).replace(/[-\s]+/g,"_").replace(/[^a-z0-9_]/g,"");if(!x)return"";if(x==="admin"||x.includes("administrator"))return"admin";if(x.includes("kabid_kesiswaan")||x==="kesiswaan"||x.includes("student_affair"))return"kesiswaan";if(x.includes("kabid_kegiatan")||x==="kegiatan")return"kegiatan";if(x.includes("pimpinan")||x.includes("kepala_sekolah")||x==="kepsek")return"pimpinan";return x}
function serviceKey(){const p=Deno.env.get("SUPABASE_SECRET_KEYS");if(p){try{const x=JSON.parse(p);if(x?.default)return String(x.default)}catch{}}const k=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||Deno.env.get("SUPABASE_SECRET_KEY");if(!k)throw Error("service_key_missing");return k}
const sb=createClient(Deno.env.get("SUPABASE_URL")!,serviceKey(),{auth:{persistSession:false,autoRefreshToken:false}});
async function sha(v:string){const d=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(v));return[...new Uint8Array(d)].map(x=>x.toString(16).padStart(2,"0")).join("")}
async function me(req:Request){const token=T(req.headers.get("x-session-token"));if(!token)return null;const{data:s}=await sb.from("user_sessions").select("user_account_id,expires_at,revoked_at").eq("token_hash",await sha(token)).maybeSingle();if(!s||s.revoked_at||!s.expires_at||Date.parse(s.expires_at)<=Date.now())return null;const{data:a}=await sb.from("user_accounts").select("id,teacher_id,username,status").eq("id",s.user_account_id).maybeSingle();if(!a||["nonaktif","inactive","disabled","blocked"].includes(L(a.status)))return null;const{data:r}=await sb.from("user_account_roles").select("role_code,role,is_active").eq("user_account_id",a.id).eq("is_active",true);const roles=(r||[]).map((x:any)=>N(x.role_code||x.role)).filter(Boolean);roles.push(N(a.username));return{...a,roles:[...new Set(roles.filter(Boolean))]}}
const has=(a:any,...rs:string[])=>!!a&&(a.roles||[]).some((x:string)=>rs.includes(x));
const ymd=()=>new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Jakarta",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
const classLabel=(c:any)=>T(c?.name)||[c?.grade_level,c?.rombel,c?.gender_group].filter(Boolean).join(" ")||"-";
const activeStatus=(s:any)=>!["nonaktif","inactive","disabled","keluar"].includes(L(s));
function enrich(rows:any[],sm:any,cm:any,dateKey:string){return(rows||[]).map((x:any)=>({...x,date:x[dateKey]||null,student_name:sm[x.student_id]?.full_name||"-",class_name:classLabel(cm[x.class_id])}))}
const minOf=(v:any)=>{const s=T(v);if(!/^\d{2}:\d{2}/.test(s))return null;const[h,m]=s.slice(0,5).split(":").map(Number);return h*60+m};
function fullCovered(start:number,end:number,rows:any[]){const segs=(rows||[]).map(x=>[minOf(x.start_time),minOf(x.end_time)]).filter(x=>x[0]!==null&&x[1]!==null&&Number(x[1])>Number(x[0])).map(x=>[Math.max(start,Number(x[0])),Math.min(end,Number(x[1]))]).filter(x=>x[1]>x[0]).sort((a,b)=>a[0]-b[0]);let cur=start;for(const[s,e]of segs){if(s>cur)return false;if(e>cur)cur=e;if(cur>=end)return true}return cur>=end}
function seqDates(start:string,end:string){const out:string[]=[];let d=new Date(start+"T12:00:00Z"),z=new Date(end+"T12:00:00Z");while(d<=z){out.push(d.toISOString().slice(0,10));d.setUTCDate(d.getUTCDate()+1)}return out}

async function reportData(b:any){
  const end=T(b.end_date)||ymd(),start=T(b.start_date)||end.slice(0,8)+"01",classId=T(b.class_id);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(start)||!/^\d{4}-\d{2}-\d{2}$/.test(end)||start>end)throw Error("invalid_date_range");
  const[{data:year},{data:sem},{data:classes,error:ce},{data:students,error:se}]=await Promise.all([
    sb.from("academic_years").select("id").eq("is_active",true).maybeSingle(),
    sb.from("semesters").select("academic_year_id,semester_no").eq("is_active",true).maybeSingle(),
    sb.from("classes").select("id,name,code,grade_level,rombel,gender_group,is_active").eq("is_active",true),
    sb.from("students").select("id,full_name,nis,nisn,status").order("full_name")
  ]);
  if(ce)throw ce;if(se)throw se;if(!year||!sem)throw Error("active_period_missing");if(T(sem.academic_year_id)!==T(year.id)||![1,2].includes(Number(sem.semester_no)))throw Error("active_period_inconsistent");
  const{data:enroll,error:ee}=await sb.from("student_enrollments").select("student_id,class_id,is_active").eq("academic_year_id",year.id).eq("semester_no",sem.semester_no).eq("is_active",true);if(ee)throw ee;
  const cm:any=Object.fromEntries((classes||[]).map((x:any)=>[x.id,x]));
  const sm:any=Object.fromEntries((students||[]).filter((x:any)=>activeStatus(x.status)).map((x:any)=>[x.id,x]));
  const scopedEnroll=(enroll||[]).filter((x:any)=>!classId||x.class_id===classId);
  const addClass=(q:any)=>classId?q.eq("class_id",classId):q;

  let sessionQ=sb.from("morning_talk_sessions").select("id,class_id,attendance_date").gte("attendance_date",start).lte("attendance_date",end).limit(2000);
  if(classId)sessionQ=sessionQ.eq("class_id",classId);
  const{data:liveSessions,error:sessionError}=await sessionQ;
  if(sessionError)throw sessionError;
  const sessionIds=(liveSessions||[]).map((x:any)=>x.id);
  let liveAttendanceRows:any[]=[];
  if(sessionIds.length){
    const{data,error}=await sb.from("morning_talk_attendance").select("id,session_id,student_id,status,note").in("session_id",sessionIds).limit(10000);
    if(error)throw error;
    liveAttendanceRows=data||[];
  }

  const[histR,rwR,viR,csR,afR,acR,ukR,lateR]=await Promise.all([
    addClass(sb.from("morning_talk_attendance_history").select("id,student_id,class_id,attendance_date,status,source_name,source_class_name").gte("attendance_date",start).lte("attendance_date",end)).limit(10000),
    addClass(sb.from("student_rewards").select("id,student_id,class_id,reward_date,category,reward_name,points,note,verified_by_account_id,is_verified").eq("is_deleted",false).eq("is_verified",true).gte("reward_date",start).lte("reward_date",end)).limit(2000),
    addClass(sb.from("discipline_incidents").select("id,student_id,class_id,incident_date,category,violation_name,points,note,created_by_account_id,recorded_by_name").eq("is_deleted",false).gte("incident_date",start).lte("incident_date",end)).limit(2000),
    addClass(sb.from("student_case_notes").select("id,student_id,class_id,incident_date,category,attention_level,main_problem,summary,final_suggestion,urgent,needs_parent,needs_student_affairs,needs_uks,evaluation_date,status,student_affairs_follow_up,student_affairs_status,escalation_to,escalated_at").eq("is_deleted",false).gte("incident_date",start).lte("incident_date",end)).limit(1000),
    addClass(sb.from("student_affairs_records").select("id,record_type,student_id,class_id,record_date,title,description,follow_up,status,priority,evidence_url,escalation_to,escalated_at,created_by_account_id,updated_at").eq("is_deleted",false).gte("record_date",start).lte("record_date",end)).limit(2000),
    addClass(sb.from("student_achievements").select("id,student_id,class_id,achievement_date,achievement_name,competition_name,level,rank_title,category,organizer,coach_name,certificate_url,photo_url,notes,status").eq("is_deleted",false).gte("achievement_date",start).lte("achievement_date",end)).limit(1000),
    sb.from("uks_duty_reports").select("id,teacher_id,duty_date,weekday,shift_no,scheduled_start,scheduled_end,captured_at,created_at").gte("duty_date",start).lte("duty_date",end).order("duty_date",{ascending:false}).limit(1000),
    addClass(sb.from("attendance_report_finalization").select("class_id,period_start,period_end,present_count,late_count,sick_count,excused_count,unexcused_count").gte("period_start",start).lte("period_end",end)).limit(3000)
  ]);
  for(const x of[histR,rwR,viR,csR,afR,acR,ukR,lateR])if(x.error)throw x.error;
  const tids=[...new Set((ukR.data||[]).map((x:any)=>x.teacher_id).filter(Boolean))],tm:any={};
  if(tids.length){const{data:ts,error}=await sb.from("teachers").select("id,full_name").in("id",tids);if(error)throw error;for(const t of ts||[])tm[t.id]=t.full_name}
  const sessionMap:any=Object.fromEntries((liveSessions||[]).map((x:any)=>[x.id,x]));
  const historicalAttendance=enrich(histR.data||[],sm,cm,"attendance_date").map((x:any)=>({...x,note:null,source:"history"}));
  const liveAttendance=(liveAttendanceRows||[]).map((x:any)=>{
    const s=sessionMap[x.session_id]||{};
    return{...x,class_id:s.class_id||null,attendance_date:s.attendance_date||null,date:s.attendance_date||null,student_name:sm[x.student_id]?.full_name||"-",class_name:classLabel(cm[s.class_id]),source:"live"};
  }).filter((x:any)=>x.class_id&&x.attendance_date);
  const attendanceMap=new Map<string,any>();
  for(const x of historicalAttendance)attendanceMap.set([x.class_id,x.attendance_date,x.student_id].join("|"),x);
  for(const x of liveAttendance)attendanceMap.set([x.class_id,x.attendance_date,x.student_id].join("|"),x);
  const attendance=[...attendanceMap.values()];
  // A submitted Morning Talk session is one completed attendance day per class.
  // Include archived daily recaps for legacy attendance entries.
  const {data:legacyRecaps,error:legacyRecapError}=await addClass(sb.from("morning_talk_recap_history").select("class_id,recap_date").gte("recap_date",start).lte("recap_date",end)).limit(2000);
  if(legacyRecapError)throw legacyRecapError;
  const attendanceDayMap=new Map<string,{class_id:string,date:string}>();
  for(const x of liveSessions||[]){if(x.class_id&&x.attendance_date)attendanceDayMap.set(x.class_id+"|"+x.attendance_date,{class_id:x.class_id,date:x.attendance_date})}
  for(const x of legacyRecaps||[]){if(x.class_id&&x.recap_date)attendanceDayMap.set(x.class_id+"|"+x.recap_date,{class_id:x.class_id,date:x.recap_date})}
  const attendance_days=[...attendanceDayMap.values()];
  // Explicit teacher confirmations, including valid zero-incident / zero-reward days.
  const {data:pointFlags,error:pointFlagsError}=await sb.from("teacher_daily_task_status")
    .select("task_date,task_code,scope_ref")
    .in("task_code",["kesiswaan_discipline_checked","kesiswaan_reward_checked"])
    .gte("task_date",start).lte("task_date",end).limit(5000);
  if(pointFlagsError)throw pointFlagsError;
  const point_confirmations=(pointFlags||[]).filter((x:any)=>!classId||T(x.scope_ref)===classId)
    .map((x:any)=>({class_id:T(x.scope_ref),date:x.task_date,kind:x.task_code==="kesiswaan_discipline_checked"?"discipline":"reward"}));

  const rewards=enrich(rwR.data||[],sm,cm,"reward_date"),violations=enrich(viR.data||[],sm,cm,"incident_date"),cases=enrich(csR.data||[],sm,cm,"incident_date"),affairs=enrich(afR.data||[],sm,cm,"record_date"),achievements=enrich(acR.data||[],sm,cm,"achievement_date");
  const uks=(ukR.data||[]).map((x:any)=>({...x,date:x.duty_date,teacher_name:tm[x.teacher_id]||"Guru"}));
  const counts:any={hadir:0,sakit:0,izin:0,alpha:0,lainnya:0};
  for(const x of attendance){const s=L(x.status);if(/hadir|present/.test(s))counts.hadir++;else if(/sakit|sick/.test(s))counts.sakit++;else if(/izin|excused/.test(s))counts.izin++;else if(/alpha|alpa|tanpa|unexcused/.test(s))counts.alpha++;else counts.lainnya++}
  const late=(lateR.data||[]).reduce((n:number,x:any)=>n+Number(x.late_count||0),0);
  const openCases=cases.filter((x:any)=>!["selesai","closed","done"].includes(L(x.status))).length;
  const typeCounts:any={};for(const x of affairs)typeCounts[x.record_type]=(typeCounts[x.record_type]||0)+1;
  const roster=scopedEnroll.map((e:any)=>({student_id:e.student_id,class_id:e.class_id,student_name:sm[e.student_id]?.full_name||"-",nis:sm[e.student_id]?.nis||"",nisn:sm[e.student_id]?.nisn||"",class_name:classLabel(cm[e.class_id])})).filter((x:any)=>x.student_name!=="-");
  return{success:true,period:{start_date:start,end_date:end},classes:(classes||[]).map((x:any)=>({id:x.id,name:classLabel(x),grade_level:x.grade_level,rombel:x.rombel,gender_group:x.gender_group})),roster,summary:{students:new Set(roster.map((x:any)=>x.student_id)).size,attendance:counts,late,rewards:rewards.length,violations:violations.length,cases:cases.length,open_cases:openCases,uks_duty_reports:uks.length,achievements:achievements.length,affairs_by_type:typeCounts},attendance,attendance_days,point_confirmations,rewards,violations,cases,affairs,achievements,uks}
}

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:CORS});
  if(req.method!=="POST")return J({success:false,error:"method_not_allowed"},405);
  try{
    const b=await req.json().catch(()=>({})),action=L(b.action);
    if(action==="public_roster"){
      const className=T(b.class_name);
      const[{data:year},{data:sem}]=await Promise.all([sb.from("academic_years").select("id").eq("is_active",true).order("created_at",{ascending:false}).limit(1).maybeSingle(),sb.from("semesters").select("academic_year_id,semester_no").eq("is_active",true).limit(1).maybeSingle()]);
      if(!year||!sem||T(sem.academic_year_id)!==T(year.id))throw Error("active_period_missing");
      const{data:classes,error:ce}=await sb.from("classes").select("id,name,grade_level").eq("academic_year_id",year.id).eq("is_active",true).order("grade_level").order("name");if(ce)throw ce;
      if(!className)return J({success:true,classes:(classes||[]).map((x:any)=>({name:T(x.name)}))});
      const cl=(classes||[]).find((x:any)=>L(x.name)===L(className));if(!cl)return J({success:false,error:"class_not_found"},404);
      const{data:en,error:ee}=await sb.from("student_enrollments").select("student_id").eq("class_id",cl.id).eq("academic_year_id",year.id).eq("semester_no",sem.semester_no).eq("is_active",true);if(ee)throw ee;
      const ids=(en||[]).map((x:any)=>x.student_id).filter(Boolean);if(!ids.length)return J({success:true,class_name:cl.name,students:[]});
      const{data:stud,error:se}=await sb.from("students").select("id,full_name,status").in("id",ids).order("full_name");if(se)throw se;
      return J({success:true,class_name:cl.name,students:(stud||[]).filter((x:any)=>["aktif","active"].includes(L(x.status))).map((x:any)=>({id:x.id,name:T(x.full_name)}))});
    }
    if(action==="public_salam_submit"){
      const studentId=T(b.student_id),className=T(b.class_name),studentName=T(b.student_name),wa=T(b.parent_whatsapp).replace(/\D/g,""),topic=T(b.topic),message=T(b.message),messageType=T(b.message_type);
      if(!studentId||!className||!studentName||wa.length<9||!topic||message.length<5||!["Saran & Masukan","Keluhan & Kendala","Apresiasi"].includes(messageType))return J({success:false,error:"invalid_submission"},400);
      const{data:student,error:sv}=await sb.from("students").select("id,full_name,status").eq("id",studentId).maybeSingle();if(sv)throw sv;
      if(!student||T(student.full_name)!==studentName||!["aktif","active"].includes(L(student.status)))return J({success:false,error:"student_not_valid"},400);
      const ticket="SALAM-"+Date.now().toString(36).toUpperCase()+"-"+crypto.randomUUID().slice(0,4).toUpperCase();
      const{data,error}=await sb.from("salam_cq_messages").insert({ticket_code:ticket,message_type:messageType,student_id:studentId,class_name:className,student_name:studentName,parent_whatsapp:wa,topic,message,attachment_name:T(b.attachment_name)||null,status:"diterima"}).select("ticket_code,status,created_at").single();if(error)throw error;
      return J({success:true,ticket:data.ticket_code,status:data.status,created_at:data.created_at});
    }
    if(action==="public_salam_status"){
      const wa=T(b.parent_whatsapp).replace(/\D/g,"");if(wa.length<9)return J({success:false,error:"invalid_whatsapp"},400);
      const{data,error}=await sb.from("salam_cq_messages").select("ticket_code,status").eq("parent_whatsapp",wa).order("created_at",{ascending:false}).limit(20);if(error)throw error;
      return J({success:true,rows:data||[]});
    }
    const a=await me(req);if(!a)return J({success:false,error:"unauthorized"},401);
    const canView=has(a,"kesiswaan","kegiatan","pimpinan","admin"),canAffairs=has(a,"kesiswaan","admin"),canAchievement=has(a,"kesiswaan","kegiatan","admin");
    if(!canView)return J({success:false,error:"forbidden"},403);
    if(action==="salam_list"){
      if(!has(a,"kesiswaan","admin"))return J({success:false,error:"forbidden"},403);
      let q=sb.from("salam_cq_messages").select("*").order("created_at",{ascending:false}).limit(500);
      if(T(b.status))q=q.eq("status",L(b.status));if(T(b.start_date))q=q.gte("created_at",T(b.start_date)+"T00:00:00+07:00");if(T(b.end_date))q=q.lte("created_at",T(b.end_date)+"T23:59:59+07:00");
      const{data,error}=await q;if(error)throw error;return J({success:true,rows:data||[]});
    }
    if(action==="salam_delete"){
      if(!has(a,"kesiswaan","admin"))return J({success:false,error:"forbidden"},403);
      const id=T(b.id);if(!id)return J({success:false,error:"invalid_id"},400);
      const{error}=await sb.from("salam_cq_messages").delete().eq("id",id);if(error)throw error;return J({success:true});
    }
    if(action==="salam_followup"){
      if(!has(a,"kesiswaan","admin"))return J({success:false,error:"forbidden"},403);
      const id=T(b.id),status=L(b.status);if(!id||!["diterima","diproses","butuh_koordinasi","selesai"].includes(status))return J({success:false,error:"invalid_followup"},400);
      const row={status,pic:T(b.pic)||null,target_follow_up:T(b.target_follow_up)||null,follow_up_note:T(b.follow_up_note)||null,updated_at:new Date().toISOString(),updated_by_account_id:a.id};
      const{data,error}=await sb.from("salam_cq_messages").update(row).eq("id",id).select().single();if(error)throw error;return J({success:true,row:data});
    }
    if(action==="bootstrap"){
      const[{data:students,error:se},{data:classes,error:ce}]=await Promise.all([
        sb.from("students").select("id,full_name,nis,nisn,status").ilike("status","aktif").order("full_name"),
        sb.from("classes").select("id,name,code,grade_level,rombel,gender_group").eq("is_active",true).order("grade_level").order("name")
      ]);
      if(se)throw se;if(ce)throw ce;
      return J({success:true,students:students||[],classes:(classes||[]).map((x:any)=>({...x,class_name:classLabel(x)})),permissions:{can_affairs:canAffairs,can_achievement:canAchievement},roles:a.roles})
    }
    if(action==="timesheet_recap"){
      if(!has(a,"kesiswaan","admin"))return J({success:false,error:"forbidden"},403);
      const start=T(b.start_date)||ymd().slice(0,8)+"01",end=T(b.end_date)||ymd();
      if(!/^\d{4}-\d{2}-\d{2}$/.test(start)||!/^\d{4}-\d{2}-\d{2}$/.test(end)||start>end)return J({success:false,error:"invalid_date_range"},400);
      const[{data:year},{data:sem}]=await Promise.all([
        sb.from("academic_years").select("id").eq("is_active",true).limit(1).maybeSingle(),
        sb.from("semesters").select("academic_year_id,semester_no").eq("is_active",true).limit(1).maybeSingle()
      ]);
      if(!year||!sem||T(sem.academic_year_id)!==T(year.id))throw Error("active_period_missing");

      const{data:asg,error:ae}=await sb.from("report_class_assignments").select("class_id,homeroom_teacher_id").eq("academic_year_id",year.id).eq("semester_no",sem.semester_no);
      if(ae)throw ae;
      const tids=[...new Set((asg||[]).map((x:any)=>x.homeroom_teacher_id).filter(Boolean))],classIds=[...new Set((asg||[]).map((x:any)=>x.class_id).filter(Boolean))];
      const[
        {data:teachers,error:te},{data:classes,error:ce},{data:acts,error:xe},{data:patterns,error:pe},
        {data:own,error:oe},{data:routines,error:re},{data:templates,error:tpe},{data:uks,error:ue},
        {data:sat,error:se}
      ]=await Promise.all([
        tids.length?sb.from("teachers").select("id,full_name").in("id",tids):Promise.resolve({data:[],error:null}),
        classIds.length?sb.from("classes").select("id,grade_level").in("id",classIds):Promise.resolve({data:[],error:null}),
        tids.length?sb.from("teacher_timesheet_activities").select("id,teacher_id,work_date,start_time,end_time,activity,source").in("teacher_id",tids).gte("work_date",start).lte("work_date",end):Promise.resolve({data:[],error:null}),
        tids.length?sb.from("teacher_recurring_activities").select("id,teacher_id,days_of_week,start_time,end_time,activity_name").eq("academic_year_id",year.id).eq("semester_no",sem.semester_no).eq("is_active",true).in("teacher_id",tids):Promise.resolve({data:[],error:null}),
        tids.length?sb.from("class_schedule_entries").select("teacher_id,class_id,day_of_week,start_time,end_time,activity_type").eq("academic_year_id",year.id).eq("semester_no",sem.semester_no).eq("is_active",true).in("teacher_id",tids).not("start_time","is",null).not("end_time","is",null):Promise.resolve({data:[],error:null}),
        classIds.length?sb.from("class_schedule_entries").select("class_id,day_of_week,start_time,end_time,activity_type").eq("academic_year_id",year.id).eq("semester_no",sem.semester_no).eq("is_active",true).in("class_id",classIds).in("activity_type",["break","school_routine"]).not("start_time","is",null).not("end_time","is",null):Promise.resolve({data:[],error:null}),
        sb.from("teacher_work_schedule_templates").select("teacher_id,applies_to_all,day_of_week,start_time,end_time,activity_code").eq("academic_year_id",year.id).eq("semester_no",sem.semester_no).eq("is_active",true).not("start_time","is",null).not("end_time","is",null),
        tids.length?sb.from("uks_duty_schedule").select("teacher_id,weekday,start_time,end_time").eq("is_active",true).in("teacher_id",tids):Promise.resolve({data:[],error:null}),
        sb.from("teacher_saturday_schedule").select("id,event_date,start_time,end_time,is_active,audience_mode").eq("academic_year_id",year.id).eq("semester_no",sem.semester_no).eq("is_active",true).gte("event_date",start).lte("event_date",end)
      ]);
      for(const e of[te,ce,xe,pe,oe,re,tpe,ue,se])if(e)throw e;

      const tm:any=Object.fromEntries((teachers||[]).map((x:any)=>[x.id,x.full_name]));
      const cm:any=Object.fromEntries((classes||[]).map((x:any)=>[x.id,x]));
      const teacherClasses:any={};for(const x of asg||[]){if(!x.homeroom_teacher_id)continue;(teacherClasses[x.homeroom_teacher_id]??=[]).push(x.class_id)}
      const dates=seqDates(start,end).filter(d=>new Date(d+"T12:00:00Z").getUTCDay()!==0);
      const completeByTeacher:any={};

      for(const tid of tids){
        const cids=teacherClasses[tid]||[],grades=cids.map((id:string)=>Number(cm[id]?.grade_level)).filter(Boolean),fridayEnd=grades.some((g:number)=>g>=4)?750:640;
        const complete:string[]=[];
        for(const date of dates){
          const dow=new Date(date+"T12:00:00Z").getUTCDay(),ws=dow===6?450:420,we=dow===6?720:960,busy:any[]=[];
          if(dow>=1&&dow<=4){
            busy.push({start_time:"07:00",end_time:"08:00"},{start_time:"09:40",end_time:"10:10"},{start_time:"11:50",end_time:"13:10"});
          }
          if(dow===5)busy.push({start_time:"08:00",end_time:`${String(Math.floor(fridayEnd/60)).padStart(2,"0")}:${String(fridayEnd%60).padStart(2,"0")}`});
          for(const x of own||[])if(T(x.teacher_id)===T(tid)&&Number(x.day_of_week)===dow)busy.push(x);
          for(const x of routines||[])if(cids.includes(x.class_id)&&Number(x.day_of_week)===dow)busy.push(x);
          for(const x of templates||[])if(Number(x.day_of_week)===dow&&(x.applies_to_all||T(x.teacher_id)===T(tid)))busy.push(x);
          for(const x of uks||[])if(T(x.teacher_id)===T(tid)&&Number(x.weekday)===dow)busy.push(x);
          for(const x of acts||[])if(T(x.teacher_id)===T(tid)&&T(x.work_date)===date)busy.push(x);
          for(const x of patterns||[])if(T(x.teacher_id)===T(tid)&&(x.days_of_week||[]).map(Number).includes(dow))busy.push(x);
          if(dow===6)for(const x of sat||[])if(T(x.event_date)===date)busy.push(x);
          if(fullCovered(ws,we,busy))complete.push(date);
        }
        completeByTeacher[tid]=complete;
      }

      const rows=(asg||[]).map((x:any)=>{
        const items=(acts||[]).filter((z:any)=>T(z.teacher_id)===T(x.homeroom_teacher_id));
        const complete=completeByTeacher[x.homeroom_teacher_id]||[];
        return{class_id:x.class_id,teacher_id:x.homeroom_teacher_id,teacher_name:tm[x.homeroom_teacher_id]||"Wali Kelas",entry_count:items.length,days_filled:complete.length,complete_days:complete,last_entry:complete.at(-1)||null,is_complete:complete.length>0};
      });
      return J({success:true,period:{start_date:start,end_date:end},rows});
    }
    if(action==="point_daily_confirm"){
      const cid=T(b.class_id),kind=L(b.kind),date=T(b.date);
      if(!a.teacher_id||!["discipline","reward"].includes(kind)||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(date)||date>ymd()||!cid)return J({success:false,error:"invalid_confirmation"},400);
      const dow=new Date(date+"T12:00:00Z").getUTCDay();
      if(dow===0||dow===6)return J({success:false,error:"weekday_only"},400);
      const [homeroom,partner]=await Promise.all([
        sb.from("report_class_assignments").select("class_id,homeroom_teacher_id,partner_teacher_id").eq("class_id",cid),
        sb.from("class_partner_assignments").select("class_id,teacher_id,is_active").eq("class_id",cid).eq("teacher_id",a.teacher_id).eq("is_active",true)
      ]);
      if(homeroom.error||partner.error)throw homeroom.error||partner.error;
      const allowed=(homeroom.data||[]).some((x:any)=>x.homeroom_teacher_id===a.teacher_id||x.partner_teacher_id===a.teacher_id)||(partner.data||[]).length>0;
      if(!allowed&&!has(a,"admin","kesiswaan"))return J({success:false,error:"class_forbidden"},403);
      const code=kind==="discipline"?"kesiswaan_discipline_checked":"kesiswaan_reward_checked";
      const exists=await sb.from("teacher_daily_task_status").select("id").eq("user_account_id",a.id).eq("task_code",code).eq("scope_ref",cid).eq("task_date",date).limit(1);
      if(exists.error)throw exists.error;
      if(!(exists.data||[]).length){
        const inserted=await sb.from("teacher_daily_task_status").insert({user_account_id:a.id,task_code:code,scope_ref:cid,task_date:date,status:"done"});
        if(inserted.error)throw inserted.error;
      }
      return J({success:true,confirmed:true,date,kind,class_id:cid});
    }
    if(action==="report"){if(!has(a,"kesiswaan","pimpinan","admin"))return J({success:false,error:"forbidden"},403);return J(await reportData(b))}
    if(action==="list"){
      const type=L(b.kind)==="achievement"?"achievement":"affairs",from=T(b.start_date),to=T(b.end_date);
      if(type==="achievement"){
        let q=sb.from("student_achievements").select("*,students(full_name,nis,nisn),classes(name,code,grade_level,rombel,gender_group)").eq("is_deleted",false).order("achievement_date",{ascending:false}).limit(500);if(from)q=q.gte("achievement_date",from);if(to)q=q.lte("achievement_date",to);const{data,error}=await q;if(error)throw error;return J({success:true,rows:data||[]})
      }
      let q=sb.from("student_affairs_records").select("*,students(full_name,nis,nisn),classes(name,code,grade_level,rombel,gender_group)").eq("is_deleted",false).order("record_date",{ascending:false}).limit(500);if(T(b.record_type))q=q.eq("record_type",L(b.record_type));if(from)q=q.gte("record_date",from);if(to)q=q.lte("record_date",to);const{data,error}=await q;if(error)throw error;return J({success:true,rows:data||[]})
    }
    if(action==="case_followup"){
      if(!canAffairs)return J({success:false,error:"forbidden"},403);
      const id=T(b.id),source=L(b.source),status=L(b.status),follow=T(b.follow_up),escalation=T(b.escalation_to);
      if(!id||!["walas","kesiswaan"].includes(source))return J({success:false,error:"invalid_case_source"},400);
      if(!["belum_ditangani","dalam_penanganan","eskalasi","selesai"].includes(status))return J({success:false,error:"invalid_case_status"},400);
      if(status==="eskalasi"&&!["kepala sekolah","konselor"].includes(L(escalation)))return J({success:false,error:"invalid_escalation_target"},400);
      const esc=status==="eskalasi"?escalation:null,escAt=status==="eskalasi"?new Date().toISOString():null;
      if(source==="walas"){
        const row={student_affairs_status:status,student_affairs_follow_up:follow||null,escalation_to:esc,escalated_at:escAt,updated_by_account_id:a.id,updated_at:new Date().toISOString()};
        const{data,error}=await sb.from("student_case_notes").update(row).eq("id",id).eq("is_deleted",false).select().single();if(error)throw error;return J({success:true,row:data});
      }
      const row={status,follow_up:follow||null,escalation_to:esc,escalated_at:escAt,updated_by_account_id:a.id,updated_at:new Date().toISOString()};
      const{data,error}=await sb.from("student_affairs_records").update(row).eq("id",id).eq("record_type","kasus").eq("is_deleted",false).select().single();if(error)throw error;return J({success:true,row:data});
    }
    if(action==="bulk_support"){
      if(!canAffairs)return J({success:false,error:"forbidden"},403);
      const items=Array.isArray(b.items)?b.items:[];if(!items.length||items.length>100)return J({success:false,error:"invalid_items"},400);
      const[{data:year},{data:sem},{data:students,error:se},{data:classes,error:ce}]=await Promise.all([
        sb.from("academic_years").select("id").eq("is_active",true).limit(1).maybeSingle(),
        sb.from("semesters").select("academic_year_id,semester_no").eq("is_active",true).limit(1).maybeSingle(),
        sb.from("students").select("id,full_name,status"),
        sb.from("classes").select("id,name,grade_level,rombel,gender_group").eq("is_active",true)
      ]);if(se)throw se;if(ce)throw ce;if(!year||!sem||T(sem.academic_year_id)!==T(year.id))throw Error("active_period_missing");
      const{data:en,error:ee}=await sb.from("student_enrollments").select("student_id,class_id").eq("academic_year_id",year.id).eq("semester_no",sem.semester_no).eq("is_active",true);if(ee)throw ee;
      const norm=(v:any)=>L(v).replace(/[^a-z0-9]/g,""),cm:any=Object.fromEntries((classes||[]).map((x:any)=>[x.id,x])),em:any={};for(const x of en||[]){(em[x.student_id]??=[]).push(x.class_id)}
      const rows:any[]=[],errors:any[]=[];
      for(const it of items){
        const name=T(it.name),grade=Number(it.grade),gender=L(it.gender),kind=L(it.type);
        const matches=(students||[]).filter((s:any)=>activeStatus(s.status)&&norm(s.full_name)===norm(name));
        if(matches.length!==1){errors.push({name,error:matches.length?"student_ambiguous":"student_not_found"});continue}
        const s=matches[0],classIds=(em[s.id]||[]).filter((id:string)=>{const cl=cm[id];return cl&&Number(cl.grade_level)===grade&&L(cl.gender_group).includes(gender)});
        if(classIds.length!==1){errors.push({name,error:classIds.length?"class_ambiguous":"class_not_found"});continue}
        const category=kind==="yatim"?"Kondisi Keluarga":"Sosial/Ekonomi",type=kind==="yatim"?"Yatim":"Dhuafa";
        const{data:dup,error:de}=await sb.from("student_affairs_records").select("id").eq("student_id",s.id).eq("record_type","dukungan").eq("support_type",type).eq("is_deleted",false).limit(1);if(de)throw de;
        if((dup||[]).length){errors.push({name,error:"already_exists"});continue}
        rows.push({record_type:"dukungan",student_id:s.id,class_id:classIds[0],record_date:T(b.record_date)||ymd(),title:type,status:"aktif",priority:"normal",support_category:category,support_type:type,support_form:"Monitoring berkala",support_pic:"Kesiswaan",created_by_account_id:a.id,updated_by_account_id:a.id});
      }
      if(errors.length)return J({success:false,error:"bulk_validation_failed",errors,ready:rows.length},400);
      const{data,error}=await sb.from("student_affairs_records").insert(rows).select("id,student_id,class_id,support_type");if(error)throw error;return J({success:true,inserted:(data||[]).length,rows:data||[]});
    }
    if(action==="save_affairs"){
      if(!canAffairs)return J({success:false,error:"forbidden"},403);
      const row={record_type:L(b.record_type),student_id:T(b.student_id)||null,class_id:T(b.class_id)||null,record_date:T(b.record_date)||ymd(),title:T(b.title),description:T(b.description)||null,follow_up:T(b.follow_up)||null,status:L(b.status)||"baru",priority:L(b.priority)||"normal",evidence_url:T(b.evidence_url)||null,support_category:L(b.record_type)==="dukungan"?(T(b.support_category)||null):null,support_type:L(b.record_type)==="dukungan"?(T(b.support_type)||null):null,support_form:L(b.record_type)==="dukungan"?(T(b.support_form)||null):null,support_pic:L(b.record_type)==="dukungan"?(T(b.support_pic)||null):null,updated_by_account_id:a.id};
      if(!row.title)return J({success:false,error:"title_required"},400);
      if(T(b.id)){const{data,error}=await sb.from("student_affairs_records").update({...row,updated_at:new Date().toISOString()}).eq("id",T(b.id)).eq("is_deleted",false).select().single();if(error)throw error;return J({success:true,row:data})}
      const{data,error}=await sb.from("student_affairs_records").insert({...row,created_by_account_id:a.id}).select().single();if(error)throw error;return J({success:true,row:data})
    }
    if(action==="save_achievement"){
      if(!canAchievement)return J({success:false,error:"forbidden"},403);
      const row={student_id:T(b.student_id)||null,class_id:T(b.class_id)||null,achievement_date:T(b.achievement_date)||ymd(),achievement_name:T(b.achievement_name),competition_name:T(b.competition_name)||null,level:T(b.level)||null,rank_title:T(b.rank_title)||null,category:T(b.category)||null,organizer:T(b.organizer)||null,coach_name:T(b.coach_name)||null,certificate_url:T(b.certificate_url)||null,photo_url:T(b.photo_url)||null,notes:T(b.notes)||null,status:L(b.status)||"terverifikasi",updated_by_account_id:a.id};
      if(!row.achievement_name)return J({success:false,error:"achievement_name_required"},400);
      if(T(b.id)){const{data,error}=await sb.from("student_achievements").update({...row,updated_at:new Date().toISOString()}).eq("id",T(b.id)).eq("is_deleted",false).select().single();if(error)throw error;return J({success:true,row:data})}
      const{data,error}=await sb.from("student_achievements").insert({...row,created_by_account_id:a.id}).select().single();if(error)throw error;return J({success:true,row:data})
    }
    if(action==="delete"){
      const kind=L(b.kind),table=kind==="achievement"?"student_achievements":"student_affairs_records";
      if((kind==="achievement"&&!canAchievement)||(kind!=="achievement"&&!canAffairs))return J({success:false,error:"forbidden"},403);
      const{error}=await sb.from(table).update({is_deleted:true,updated_by_account_id:a.id,updated_at:new Date().toISOString()}).eq("id",T(b.id));if(error)throw error;return J({success:true})
    }
    return J({success:false,error:"unknown_action"},400)
  }catch(e){console.error(e);return J({success:false,error:T((e as any)?.message)||"internal_error"},500)}
});
