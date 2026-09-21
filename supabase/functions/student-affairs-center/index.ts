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

async function reportData(b:any){
  const end=T(b.end_date)||ymd(),start=T(b.start_date)||end.slice(0,8)+"01",classId=T(b.class_id);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(start)||!/^\d{4}-\d{2}-\d{2}$/.test(end)||start>end)throw Error("invalid_date_range");
  const[{data:year},{data:sem},{data:classes,error:ce},{data:students,error:se}]=await Promise.all([
    sb.from("academic_years").select("id").eq("is_active",true).maybeSingle(),
    sb.from("semesters").select("academic_year_id,semester_no").eq("is_active",true).maybeSingle(),
    sb.from("classes").select("id,name,code,grade_level,rombel,gender_group,is_active").eq("is_active",true),
    sb.from("students").select("id,full_name,nis,nisn,status").order("full_name")
  ]);
  if(ce)throw ce;if(se)throw se;if(!year||!sem)throw Error("active_period_missing");
  const{data:enroll,error:ee}=await sb.from("student_enrollments").select("student_id,class_id,is_active").eq("academic_year_id",year.id).eq("semester_no",sem.semester_no).eq("is_active",true);if(ee)throw ee;
  const cm:any=Object.fromEntries((classes||[]).map((x:any)=>[x.id,x]));
  const sm:any=Object.fromEntries((students||[]).filter((x:any)=>activeStatus(x.status)).map((x:any)=>[x.id,x]));
  const scopedEnroll=(enroll||[]).filter((x:any)=>!classId||x.class_id===classId);
  const addClass=(q:any)=>classId?q.eq("class_id",classId):q;
  const[atR,rwR,viR,csR,afR,acR,ukR,lateR]=await Promise.all([
    addClass(sb.from("morning_talk_attendance_history").select("id,student_id,class_id,attendance_date,status,source_name,source_class_name").gte("attendance_date",start).lte("attendance_date",end)).limit(3000),
    addClass(sb.from("student_rewards").select("id,student_id,class_id,reward_date,category,reward_name,points,note,verified_by_account_id,is_verified").eq("is_deleted",false).eq("is_verified",true).gte("reward_date",start).lte("reward_date",end)).limit(2000),
    addClass(sb.from("discipline_incidents").select("id,student_id,class_id,incident_date,category,violation_name,points,note,created_by_account_id,recorded_by_name").eq("is_deleted",false).gte("incident_date",start).lte("incident_date",end)).limit(2000),
    addClass(sb.from("student_case_notes").select("id,student_id,class_id,incident_date,category,attention_level,main_problem,summary,final_suggestion,urgent,needs_parent,needs_student_affairs,needs_uks,evaluation_date,status").eq("is_deleted",false).gte("incident_date",start).lte("incident_date",end)).limit(1000),
    addClass(sb.from("student_affairs_records").select("id,record_type,student_id,class_id,record_date,title,description,follow_up,status,priority,evidence_url,created_by_account_id,updated_at").eq("is_deleted",false).gte("record_date",start).lte("record_date",end)).limit(2000),
    addClass(sb.from("student_achievements").select("id,student_id,class_id,achievement_date,achievement_name,competition_name,level,rank_title,category,organizer,coach_name,certificate_url,photo_url,notes,status").eq("is_deleted",false).gte("achievement_date",start).lte("achievement_date",end)).limit(1000),
    sb.from("uks_duty_reports").select("id,teacher_id,duty_date,weekday,shift_no,scheduled_start,scheduled_end,captured_at,created_at").gte("duty_date",start).lte("duty_date",end).order("duty_date",{ascending:false}).limit(1000),
    addClass(sb.from("attendance_report_finalization").select("class_id,period_start,period_end,present_count,late_count,sick_count,excused_count,unexcused_count").gte("period_start",start).lte("period_end",end)).limit(3000)
  ]);
  for(const x of[atR,rwR,viR,csR,afR,acR,ukR,lateR])if(x.error)throw x.error;
  const tids=[...new Set((ukR.data||[]).map((x:any)=>x.teacher_id).filter(Boolean))],tm:any={};
  if(tids.length){const{data:ts,error}=await sb.from("teachers").select("id,full_name").in("id",tids);if(error)throw error;for(const t of ts||[])tm[t.id]=t.full_name}
  const attendance=enrich(atR.data||[],sm,cm,"attendance_date").map((x:any)=>({...x,note:null}));
  const rewards=enrich(rwR.data||[],sm,cm,"reward_date"),violations=enrich(viR.data||[],sm,cm,"incident_date"),cases=enrich(csR.data||[],sm,cm,"incident_date"),affairs=enrich(afR.data||[],sm,cm,"record_date"),achievements=enrich(acR.data||[],sm,cm,"achievement_date");
  const uks=(ukR.data||[]).map((x:any)=>({...x,date:x.duty_date,teacher_name:tm[x.teacher_id]||"Guru"}));
  const counts:any={hadir:0,sakit:0,izin:0,alpha:0,lainnya:0};
  for(const x of attendance){const s=L(x.status);if(/hadir|present/.test(s))counts.hadir++;else if(/sakit|sick/.test(s))counts.sakit++;else if(/izin|excused/.test(s))counts.izin++;else if(/alpha|alpa|tanpa|unexcused/.test(s))counts.alpha++;else counts.lainnya++}
  const late=(lateR.data||[]).reduce((n:number,x:any)=>n+Number(x.late_count||0),0);
  const openCases=cases.filter((x:any)=>!["selesai","closed","done"].includes(L(x.status))).length;
  const typeCounts:any={};for(const x of affairs)typeCounts[x.record_type]=(typeCounts[x.record_type]||0)+1;
  const roster=scopedEnroll.map((e:any)=>({student_id:e.student_id,class_id:e.class_id,student_name:sm[e.student_id]?.full_name||"-",nis:sm[e.student_id]?.nis||"",nisn:sm[e.student_id]?.nisn||"",class_name:classLabel(cm[e.class_id])})).filter((x:any)=>x.student_name!=="-");
  return{success:true,period:{start_date:start,end_date:end},classes:(classes||[]).map((x:any)=>({id:x.id,name:classLabel(x),grade_level:x.grade_level,rombel:x.rombel,gender_group:x.gender_group})),roster,summary:{students:new Set(roster.map((x:any)=>x.student_id)).size,attendance:counts,late,rewards:rewards.length,violations:violations.length,cases:cases.length,open_cases:openCases,uks_duty_reports:uks.length,achievements:achievements.length,affairs_by_type:typeCounts},attendance,rewards,violations,cases,affairs,achievements,uks}
}

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:CORS});
  if(req.method!=="POST")return J({success:false,error:"method_not_allowed"},405);
  try{
    const a=await me(req);if(!a)return J({success:false,error:"unauthorized"},401);
    const b=await req.json().catch(()=>({})),action=L(b.action);
    const canView=has(a,"kesiswaan","kegiatan","pimpinan","admin"),canAffairs=has(a,"kesiswaan","admin"),canAchievement=has(a,"kesiswaan","kegiatan","admin");
    if(!canView)return J({success:false,error:"forbidden"},403);
    if(action==="bootstrap"){
      const[{data:students,error:se},{data:classes,error:ce}]=await Promise.all([
        sb.from("students").select("id,full_name,nis,nisn,status").ilike("status","aktif").order("full_name"),
        sb.from("classes").select("id,name,code,grade_level,rombel,gender_group").eq("is_active",true).order("grade_level").order("name")
      ]);
      if(se)throw se;if(ce)throw ce;
      return J({success:true,students:students||[],classes:(classes||[]).map((x:any)=>({...x,class_name:classLabel(x)})),permissions:{can_affairs:canAffairs,can_achievement:canAchievement},roles:a.roles})
    }
    if(action==="report"){if(!has(a,"kesiswaan","pimpinan","admin"))return J({success:false,error:"forbidden"},403);return J(await reportData(b))}
    if(action==="list"){
      const type=L(b.kind)==="achievement"?"achievement":"affairs",from=T(b.start_date),to=T(b.end_date);
      if(type==="achievement"){
        let q=sb.from("student_achievements").select("*,students(full_name,nis,nisn),classes(name,code,grade_level,rombel,gender_group)").eq("is_deleted",false).order("achievement_date",{ascending:false}).limit(500);if(from)q=q.gte("achievement_date",from);if(to)q=q.lte("achievement_date",to);const{data,error}=await q;if(error)throw error;return J({success:true,rows:data||[]})
      }
      let q=sb.from("student_affairs_records").select("*,students(full_name,nis,nisn),classes(name,code,grade_level,rombel,gender_group)").eq("is_deleted",false).order("record_date",{ascending:false}).limit(500);if(T(b.record_type))q=q.eq("record_type",L(b.record_type));if(from)q=q.gte("record_date",from);if(to)q=q.lte("record_date",to);const{data,error}=await q;if(error)throw error;return J({success:true,rows:data||[]})
    }
    if(action==="save_affairs"){
      if(!canAffairs)return J({success:false,error:"forbidden"},403);
      const row={record_type:L(b.record_type),student_id:T(b.student_id)||null,class_id:T(b.class_id)||null,record_date:T(b.record_date)||ymd(),title:T(b.title),description:T(b.description)||null,follow_up:T(b.follow_up)||null,status:L(b.status)||"baru",priority:L(b.priority)||"normal",evidence_url:T(b.evidence_url)||null,updated_by_account_id:a.id};
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
