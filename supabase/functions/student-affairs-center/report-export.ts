const T=(v:any)=>String(v??"").trim();
const L=(v:any)=>T(v).toLowerCase();
const ymd=()=>new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Jakarta",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
const classLabel=(c:any)=>T(c?.name)||[c?.grade_level,c?.rombel,c?.gender_group].filter(Boolean).join(" ")||"-";
const activeStatus=(s:any)=>!["nonaktif","inactive","disabled","keluar"].includes(L(s));
function enrich(rows:any[],sm:any,cm:any,dateKey:string){return(rows||[]).map((x:any)=>({...x,date:x[dateKey]||null,student_name:sm[x.student_id]?.full_name||x.source_name||"-",class_name:cm[x.class_id]?classLabel(cm[x.class_id]):x.source_class_name||"-"}))}
// Read-only report pagination. An error aborts the entire report, never returns partial rows.
async function allRows(q:any){
  const rows:any[]=[];
  for(let offset=0;;){
    const {data,error}=await q.range(offset,offset+499);
    if(error)throw error;
    if(!data?.length)break;
    rows.push(...data);offset+=data.length;
  }
  return {data:rows,error:null};
}

export async function reportExport(sb:any,b:any){
  const end=T(b.end_date)||ymd(),start=T(b.start_date)||end.slice(0,8)+"01",classId=T(b.class_id);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(start)||!/^\d{4}-\d{2}-\d{2}$/.test(end)||start>end)throw Error("invalid_date_range");
  const validDate=(v:string)=>!Number.isNaN(Date.parse(v+"T00:00:00Z"))&&new Date(v+"T00:00:00Z").toISOString().slice(0,10)===v;
  if(!validDate(start)||!validDate(end)||end>ymd()||(Date.parse(end)-Date.parse(start))/86400000>365)throw Error("invalid_date_range");
  const[{data:year},{data:sem},{data:classes,error:ce},{data:students,error:se}]=await Promise.all([
    sb.from("academic_years").select("id").eq("is_active",true).maybeSingle(),
    sb.from("semesters").select("academic_year_id,semester_no").eq("is_active",true).maybeSingle(),
    allRows(sb.from("classes").select("id,name,code,grade_level,rombel,gender_group,is_active").eq("is_active",true).order("id")),
    allRows(sb.from("students").select("id,full_name,nis,nisn,status").order("full_name").order("id"))
  ]);
  if(ce)throw ce;if(se)throw se;if(!year||!sem)throw Error("active_period_missing");if(T(sem.academic_year_id)!==T(year.id)||![1,2].includes(Number(sem.semester_no)))throw Error("active_period_inconsistent");
  const{data:enroll,error:ee}=await allRows(sb.from("student_enrollments").select("student_id,class_id,is_active").eq("academic_year_id",year.id).eq("semester_no",sem.semester_no).eq("is_active",true).order("id"));if(ee)throw ee;
  const cm:any=Object.fromEntries((classes||[]).map((x:any)=>[x.id,x]));
  const sm:any=Object.fromEntries((students||[]).map((x:any)=>[x.id,x]));
  const scopedEnroll=(enroll||[]).filter((x:any)=>!classId||x.class_id===classId);
  const addClass=(q:any)=>classId?q.eq("class_id",classId):q;

  let sessionQ=sb.from("morning_talk_sessions").select("id,class_id,attendance_date").gte("attendance_date",start).lte("attendance_date",end);
  if(classId)sessionQ=sessionQ.eq("class_id",classId);
  const{data:liveSessions,error:sessionError}=await allRows(sessionQ.order("id"));
  if(sessionError)throw sessionError;
  const sessionIds=(liveSessions||[]).map((x:any)=>x.id);
  let liveAttendanceRows:any[]=[];
  for(let i=0;i<sessionIds.length;i+=100){
    const{data,error}=await allRows(sb.from("morning_talk_attendance").select("id,session_id,student_id,status,note").in("session_id",sessionIds.slice(i,i+100)).order("id"));
    if(error)throw error;
    liveAttendanceRows.push(...(data||[]));
  }

  const[histR,rwR,viR,csR,afR,acR,ukR,lateR]=await Promise.all([
    allRows(addClass(sb.from("morning_talk_attendance_history").select("id,student_id,class_id,attendance_date,status,source_name,source_class_name").gte("attendance_date",start).lte("attendance_date",end)).order("id")),
    allRows(addClass(sb.from("student_rewards").select("id,student_id,class_id,reward_date,category,reward_name,points,note,verified_by_account_id,is_verified").eq("is_deleted",false).eq("is_verified",true).gte("reward_date",start).lte("reward_date",end)).order("id")),
    allRows(addClass(sb.from("discipline_incidents").select("id,student_id,class_id,incident_date,category,violation_name,points,note,created_by_account_id,recorded_by_name").eq("is_deleted",false).gte("incident_date",start).lte("incident_date",end)).order("id")),
    allRows(addClass(sb.from("student_case_notes").select("id,student_id,class_id,incident_date,category,attention_level,main_problem,summary,final_suggestion,urgent,needs_parent,needs_student_affairs,needs_uks,evaluation_date,status,student_affairs_follow_up,student_affairs_status,escalation_to,escalated_at").eq("is_deleted",false).gte("incident_date",start).lte("incident_date",end)).order("id")),
    allRows(addClass(sb.from("student_affairs_records").select("id,record_type,student_id,class_id,record_date,title,description,follow_up,status,priority,evidence_url,escalation_to,escalated_at,created_by_account_id,updated_at").eq("is_deleted",false).gte("record_date",start).lte("record_date",end)).order("id")),
    allRows(addClass(sb.from("student_achievements").select("id,student_id,class_id,achievement_date,achievement_name,competition_name,level,rank_title,category,organizer,coach_name,certificate_url,photo_url,notes,status").eq("is_deleted",false).gte("achievement_date",start).lte("achievement_date",end)).order("id")),
    allRows(sb.from("uks_duty_reports").select("id,teacher_id,duty_date,weekday,shift_no,scheduled_start,scheduled_end,captured_at,created_at").gte("duty_date",start).lte("duty_date",end).order("duty_date",{ascending:false}).order("id")),
    allRows(addClass(sb.from("attendance_report_finalization").select("class_id,period_start,period_end,present_count,late_count,sick_count,excused_count,unexcused_count").gte("period_start",start).lte("period_end",end)).order("id"))
  ]);
  for(const x of[histR,rwR,viR,csR,afR,acR,ukR,lateR])if(x.error)throw x.error;
  const tids=[...new Set((ukR.data||[]).map((x:any)=>x.teacher_id).filter(Boolean))],tm:any={};
  if(tids.length){const{data:ts,error}=await allRows(sb.from("teachers").select("id,full_name").in("id",tids).order("id"));if(error)throw error;for(const t of ts||[])tm[t.id]=t.full_name}
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
  const {data:legacyRecaps,error:legacyRecapError}=await allRows(addClass(sb.from("morning_talk_recap_history").select("class_id,recap_date").gte("recap_date",start).lte("recap_date",end)).order("id"));
  if(legacyRecapError)throw legacyRecapError;
  const attendanceDayMap=new Map<string,{class_id:string,date:string}>();
  for(const x of liveSessions||[]){if(x.class_id&&x.attendance_date)attendanceDayMap.set(x.class_id+"|"+x.attendance_date,{class_id:x.class_id,date:x.attendance_date})}
  for(const x of legacyRecaps||[]){if(x.class_id&&x.recap_date)attendanceDayMap.set(x.class_id+"|"+x.recap_date,{class_id:x.class_id,date:x.recap_date})}
  const attendance_days=[...attendanceDayMap.values()];
  // Reconcile current category confirmations with legacy Walas daily attestations.
  // Both are read-only, deduplicated by class/date/kind; no fake student-level incidents.
  const [{data:pointFlags,error:pointFlagsError},{data:legacyFlags,error:legacyFlagsError}]=await Promise.all([
    allRows(sb.from("teacher_daily_task_status").select("task_date,task_code,scope_ref,status")
      .in("task_code",["kesiswaan_discipline_checked","kesiswaan_reward_checked"])
      .eq("status","done").gte("task_date",start).lte("task_date",end).order("id")),
    allRows(addClass(sb.from("walas_daily_point_verifications")
      .select("class_id,report_date,violation_status,reward_status")
      .gte("report_date",start).lte("report_date",end)).order("id"))
  ]);
  if(pointFlagsError||legacyFlagsError)throw(pointFlagsError||legacyFlagsError);
  const confirmationMap=new Map<string,{class_id:string,date:string,kind:string,source:string}>();
  for(const x of legacyFlags||[]){
    for(const [kind,field] of [["discipline","violation_status"],["reward","reward_status"]]){
      if(x[field]==="nihil"){
        const key=T(x.class_id)+"|"+T(x.report_date)+"|"+kind;
        confirmationMap.set(key,{class_id:T(x.class_id),date:x.report_date,kind,source:"legacy"});
      }
    }
  }
  for(const x of pointFlags||[]){
    if(classId&&T(x.scope_ref)!==classId)continue;
    const kind=x.task_code==="kesiswaan_discipline_checked"?"discipline":"reward";
    const key=T(x.scope_ref)+"|"+T(x.task_date)+"|"+kind;
    confirmationMap.set(key,{class_id:T(x.scope_ref),date:x.task_date,kind,source:"daily"});
  }
  const point_confirmations=[...confirmationMap.values()];

  const rewards=enrich(rwR.data||[],sm,cm,"reward_date"),violations=enrich(viR.data||[],sm,cm,"incident_date"),cases=enrich(csR.data||[],sm,cm,"incident_date"),affairs=enrich(afR.data||[],sm,cm,"record_date"),achievements=enrich(acR.data||[],sm,cm,"achievement_date");
  const uks=(ukR.data||[]).map((x:any)=>({...x,date:x.duty_date,teacher_name:tm[x.teacher_id]||"Guru"}));
  const counts:any={hadir:0,sakit:0,izin:0,alpha:0,lainnya:0};
  for(const x of attendance){const s=L(x.status);if(/hadir|present/.test(s))counts.hadir++;else if(/sakit|sick/.test(s))counts.sakit++;else if(/alpha|alpa|tanpa|unexcused/.test(s))counts.alpha++;else if(/izin|excused/.test(s))counts.izin++;else counts.lainnya++}
  const late=(lateR.data||[]).reduce((n:number,x:any)=>n+Number(x.late_count||0),0);
  const openCases=cases.filter((x:any)=>!["selesai","closed","done"].includes(L(x.status))).length;
  const typeCounts:any={};for(const x of affairs)typeCounts[x.record_type]=(typeCounts[x.record_type]||0)+1;
  const roster=scopedEnroll.map((e:any)=>({student_id:e.student_id,class_id:e.class_id,student_name:sm[e.student_id]?.full_name||"-",nis:sm[e.student_id]?.nis||"",nisn:sm[e.student_id]?.nisn||"",class_name:classLabel(cm[e.class_id])})).filter((x:any)=>x.student_name!=="-"&&activeStatus(sm[x.student_id]?.status));
  return{success:true,complete:true,period:{start_date:start,end_date:end},classes:(classes||[]).map((x:any)=>({id:x.id,name:classLabel(x),grade_level:x.grade_level,rombel:x.rombel,gender_group:x.gender_group})),roster,summary:{students:new Set(roster.map((x:any)=>x.student_id)).size,attendance:counts,late,rewards:rewards.length,violations:violations.length,cases:cases.length,open_cases:openCases,uks_duty_reports:uks.length,achievements:achievements.length,affairs_by_type:typeCounts},attendance,attendance_days,point_confirmations,rewards,violations,cases,affairs,achievements,uks}
}
