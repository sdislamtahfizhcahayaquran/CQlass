import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

const CORS={
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type, x-session-token",
  "Access-Control-Allow-Methods":"POST, OPTIONS",
  "Content-Type":"application/json; charset=utf-8",
  "Cache-Control":"no-store"
};
const txt=(v:any)=>String(v??"").trim();
const reply=(b:any,s=200)=>new Response(JSON.stringify(b),{status:s,headers:CORS});
function serviceKey(){
  const packed=Deno.env.get("SUPABASE_SECRET_KEYS");
  if(packed){try{const p=JSON.parse(packed);if(p?.default)return String(p.default)}catch(_){}}
  const k=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||Deno.env.get("SUPABASE_SECRET_KEY");
  if(!k)throw Error("service_key_missing");
  return k;
}
function db(){
  const url=Deno.env.get("SUPABASE_URL");if(!url)throw Error("supabase_url_missing");
  return createClient(url,serviceKey(),{auth:{persistSession:false,autoRefreshToken:false}});
}
function grade(pct:number|null){if(pct===null)return"-";if(pct>=85)return"A";if(pct>=70)return"B";if(pct>=50)return"C";return"D"}
const yearCache=new Map<string,string>();
async function resolveYearId(s:any,yearName:string){
  if(!yearName)return"";
  if(yearCache.has(yearName))return yearCache.get(yearName)!;
  const {data,error}=await s.from("academic_years").select("id").eq("name",yearName).order("created_at",{ascending:false}).limit(1).maybeSingle();
  if(error)throw error;
  const id=txt(data?.id);yearCache.set(yearName,id);return id;
}

function publicReportType(v:any){const x=txt(v).toUpperCase();return x==="SEMESTER"||x==="PAS"?"PAS":"PTS"}
function storedReportType(v:any){return publicReportType(v)==="PAS"?"SEMESTER":"PTS"}
async function reportPeriodForRequest(s:any,b:any){
  const action=txt(b?.action).toLowerCase();
  if(!["preview","class_reports","bulk"].includes(action))return null;
  const yearName=txt(b?.academic_year),semesterNo=Number(b?.semester_no||0),type=publicReportType(b?.report_type);
  if(!yearName||![1,2].includes(semesterNo))return null;
  const yearId=await resolveYearId(s,yearName);if(!yearId)return null;
  const {data,error}=await s.from("report_config")
    .select("data_start_date,data_end_date,report_date_gregorian,report_date_hijri,updated_at,is_active")
    .eq("academic_year_id",yearId).eq("semester_no",semesterNo).eq("report_type",storedReportType(type)).maybeSingle();
  if(error)throw error;
  const configured=!!(data?.data_start_date&&data?.data_end_date&&data?.report_date_gregorian&&data?.is_active!==false);
  return {
    configured,
    academic_year:yearName,
    academic_year_id:yearId,
    semester_no:semesterNo,
    report_type:type,
    data_start_date:data?.data_start_date||null,
    data_end_date:data?.data_end_date||null,
    report_date_gregorian:data?.report_date_gregorian||null,
    report_date_hijri:data?.report_date_hijri||null,
    updated_at:data?.updated_at||null
  };
}

async function schoolGrades(s:any,reports:any[]){
  const groups=new Map<string,any[]>();
  for(const r of reports||[]){
    const classId=txt(r?.class?.id),semester=Number(r?.semester_no||1),year=txt(r?.academic_year);
    if(!classId)continue;
    const key=`${classId}|${semester}|${year}`;
    if(!groups.has(key))groups.set(key,[]);
    groups.get(key)!.push(r);
  }
  for(const [key,rs] of groups){
    const [classId,semText,yearName]=key.split("|");
    const semesterNo=Number(semText||1);const yearId=await resolveYearId(s,yearName);
    let q=s.from("school_activity_matrix_marks").select("student_id,activity_code,participated").eq("class_id",classId).eq("semester_no",semesterNo);
    if(yearId)q=q.eq("academic_year_id",yearId);
    const {data:marks,error}=await q;if(error)throw error;
    const used=[...new Set((marks||[]).filter((m:any)=>m.participated===true).map((m:any)=>txt(m.activity_code)).filter(Boolean))];
    const byStudent=new Map<string,Set<string>>();
    for(const m of marks||[]){if(!m.participated)continue;const sid=txt(m.student_id),code=txt(m.activity_code);if(!sid||!code)continue;if(!byStudent.has(sid))byStudent.set(sid,new Set());byStudent.get(sid)!.add(code)}
    for(const r of rs){
      const sid=txt(r?.student?.id),got=byStudent.get(sid)||new Set<string>();let checked=0;
      for(const code of used)if(got.has(code))checked++;
      const pct=used.length?Math.round(checked/used.length*100):null;
      if(!r.extracurricular||typeof r.extracurricular!=="object")r.extracurricular={};
      r.extracurricular.school_activity_grade=grade(pct);
      r.extracurricular.school_activity_percentage=pct;
      r.extracurricular.school_activity_checked=checked;
      r.extracurricular.school_activity_total=used.length;
      r.extracurricular.school_activity_source="RAPOR_KEGIATAN_MATRIX";
    }
  }
  return reports;
}

async function academicStars(s:any,reports:any[]){
  const cache=new Map<string,any>();
  for(const r of reports||[]){
    const sid=txt(r?.student?.id),classId=txt(r?.class?.id),yearName=txt(r?.academic_year),semesterNo=Number(r?.semester_no||1);
    if(!sid||!classId)continue;
    const yearId=await resolveYearId(s,yearName);if(!yearId)continue;
    const {data:cls,error:ce}=await s.from("classes").select("grade_level").eq("id",classId).maybeSingle();if(ce)throw ce;
    const gradeLevel=Number(cls?.grade_level);if(!gradeLevel)continue;
    const key=`${yearId}|${semesterNo}|${gradeLevel}`;let ranked=cache.get(key);
    if(!ranked){
      const {data:classes,error:cErr}=await s.from("classes").select("id").eq("academic_year_id",yearId).eq("grade_level",gradeLevel).eq("is_active",true);if(cErr)throw cErr;
      const classIds=(classes||[]).map((x:any)=>txt(x.id)).filter(Boolean);if(!classIds.length)continue;
      const {data:scores,error:sErr}=await s.from("academic_scores").select("student_id,subject_id,class_id,score").eq("academic_year_id",yearId).eq("semester_no",semesterNo).eq("assessment_type","TP").is("deleted_at",null).not("score","is",null).in("class_id",classIds);if(sErr)throw sErr;

      const subjectsByClass=new Map<string,Set<string>>();
      for(const cid of classIds)subjectsByClass.set(cid,new Set());
      for(const row of scores||[]){const cid=txt(row.class_id),sub=txt(row.subject_id);if(cid&&sub&&subjectsByClass.has(cid))subjectsByClass.get(cid)!.add(sub)}
      let common:string[]=[];
      for(const cid of classIds){const set=subjectsByClass.get(cid)||new Set<string>();common=common.length?common.filter(x=>set.has(x)):[...set]}
      const commonSet=new Set(common);
      const perSubject=new Map<string,{sum:number,n:number}>();
      for(const row of scores||[]){const studentId=txt(row.student_id),subjectId=txt(row.subject_id),v=Number(row.score);if(!studentId||!commonSet.has(subjectId)||!Number.isFinite(v))continue;const k=studentId+"|"+subjectId,a=perSubject.get(k)||{sum:0,n:0};a.sum+=v;a.n++;perSubject.set(k,a)}
      const students=new Map<string,Map<string,number>>();
      for(const [k,a] of perSubject){const cut=k.indexOf("|"),studentId=k.slice(0,cut),subjectId=k.slice(cut+1);if(!students.has(studentId))students.set(studentId,new Map());students.get(studentId)!.set(subjectId,a.sum/a.n)}
      const eligible:any[]=[];
      for(const [student_id,vals] of students){if(!common.length||common.some(sub=>!vals.has(sub)))continue;const average=common.reduce((sum,sub)=>sum+Number(vals.get(sub)),0)/common.length;eligible.push({student_id,average,subject_count:common.length})}
      eligible.sort((x,y)=>y.average-x.average||x.student_id.localeCompare(y.student_id));
      ranked=eligible.map((x:any,index:number)=>({...x,rank:index+1}));
      cache.set(key,ranked);
    }
    const item=ranked.find((x:any)=>x.student_id===sid);
    if(!item){r.academic_summary={...(r.academic_summary||{}),grade_level:gradeLevel,is_top10:false,ranking_eligible:false,ranking_scope:"GRADE_COHORT_COMMON_PTS_SUBJECTS_COMPLETE_ONLY"};continue}
    r.academic_summary={...(r.academic_summary||{}),grade_level:gradeLevel,grade_rank:item.rank,grade_cohort_size:ranked.length,is_top10:item.rank<=10,ranking_eligible:true,average_subject_pts:Number(item.average.toFixed(2)),subject_count:item.subject_count,ranking_scope:"GRADE_COHORT_COMMON_PTS_SUBJECTS_COMPLETE_ONLY"};
  }
  return reports;
}

const effectiveCache=new Map<string,number|null>();
const sourceCache=new Map<string,string>();
const finalizationCache=new Map<string,Map<string,any>>();
const count=(v:any)=>Math.max(0,Number.isFinite(Number(v))?Math.trunc(Number(v)):0);

async function effectiveDays(s:any,yearId:string,semesterNo:number,assessmentPeriod:string,classId:string){
  const key=`${yearId}|${semesterNo}|${assessmentPeriod}|${classId}`;
  if(effectiveCache.has(key))return effectiveCache.get(key)!;
  const {data,error}=await s.from("class_effective_days").select("effective_days").eq("academic_year_id",yearId).eq("semester_no",semesterNo).eq("assessment_period",assessmentPeriod).eq("class_id",classId).maybeSingle();
  if(error)throw error;
  const n=data?.effective_days==null?null:Number(data.effective_days);
  const value=n!==null&&Number.isFinite(n)&&n>=0?Math.trunc(n):null;
  effectiveCache.set(key,value);return value;
}
async function selectedSource(s:any,yearId:string,semesterNo:number,classId:string,start:string,end:string){
  const key=`${yearId}|${semesterNo}|${classId}|${start}|${end}`;
  if(sourceCache.has(key))return sourceCache.get(key)!;
  let q=s.from("attendance_report_source_selection").select("source_mode,period_start,period_end,selected_at").eq("academic_year_id",yearId).eq("semester_no",semesterNo).eq("class_id",classId).eq("source_mode","editable");
  if(end)q=q.lte("period_start",end);
  const {data,error}=await q.order("selected_at",{ascending:false}).limit(1).maybeSingle();
  if(error)throw error;
  const mode=txt(data?.source_mode)==="editable"?"editable":"system";
  const value=mode==="editable"?`editable|${txt(data?.period_start)}|${txt(data?.period_end)}`:"system";
  sourceCache.set(key,value);return value;
}
async function finalizedRows(s:any,yearId:string,semesterNo:number,classId:string,start:string,end:string){
  const key=`${yearId}|${semesterNo}|${classId}|${start}|${end}`;
  if(finalizationCache.has(key))return finalizationCache.get(key)!;
  const {data,error}=await s.from("attendance_report_finalization").select("student_id,late_count,sick_count,excused_count,unexcused_count").eq("academic_year_id",yearId).eq("semester_no",semesterNo).eq("class_id",classId).eq("period_start",start).eq("period_end",end).eq("validation_status","validated");
  if(error)throw error;
  const map=new Map<string,any>();for(const row of data||[])map.set(txt(row.student_id),row);
  finalizationCache.set(key,map);return map;
}
async function attendanceFromEffectiveDays(s:any,reports:any[],requestedType:any=""){
  for(const r of reports||[]){
    const sid=txt(r?.student?.id),classId=txt(r?.class?.id),yearName=txt(r?.academic_year),semesterNo=Number(r?.semester_no||1);
    if(!sid||!classId||!yearName)continue;
    const yearId=await resolveYearId(s,yearName);if(!yearId)continue;
    const requestedPublic=publicReportType(requestedType||r?.report_type);
    const assessmentPeriod=requestedPublic==="PAS"?"PAS":"PTS";
    let effective=await effectiveDays(s,yearId,semesterNo,assessmentPeriod,classId);
    if(effective===null){
      const {data:fallback,error:fe}=await s.from("class_effective_days")
        .select("effective_days")
        .eq("class_id",classId).eq("semester_no",semesterNo).eq("assessment_period",assessmentPeriod)
        .order("updated_at",{ascending:false}).limit(1).maybeSingle();
      if(fe)throw fe;
      const fv=fallback?.effective_days==null?null:Number(fallback.effective_days);
      effective=fv!==null&&Number.isFinite(fv)&&fv>=0?Math.trunc(fv):null;
    }
    if(effective===null)throw Error(`Hari efektif ${assessmentPeriod} belum ditetapkan Admin untuk kelas ${txt(r?.class?.name)||classId}.`);

    const base=(r.attendance&&typeof r.attendance==="object")?r.attendance:{};
    let sick=count(base.sick),excused=count(base.excused),unexcused=count(base.unexcused),late=count(base.late);
    const start=txt(r?.date_range?.start),end=txt(r?.date_range?.end);
    const sourceInfo=await selectedSource(s,yearId,semesterNo,classId,start,end);
    const sourceParts=sourceInfo.split("|"),source=sourceParts[0];
    if(source==="editable"){
      const rows=await finalizedRows(s,yearId,semesterNo,classId,sourceParts[1],sourceParts[2]);
      const row=rows.get(sid);
      if(row){sick=count(row.sick_count);excused=count(row.excused_count);unexcused=count(row.unexcused_count);late=count(row.late_count)}
    }

    const present=Math.max(0,effective-sick-excused-unexcused);
    const denom=Math.max(1,effective);
    r.attendance={
      ...base,
      present,
      sick,
      excused,
      unexcused,
      late,
      total:effective,
      effective_days:effective,
      source_mode:source,
      present_formula:"effective_days_minus_sick_excused_unexcused",
      effective_source:"admin_class_effective_days",
      requested_report_type:requestedPublic,
      percent:{
        ...(base.percent||{}),
        present:Math.round(present/denom*100),
        sick:Math.round(sick/denom*100),
        excused:Math.round(excused/denom*100),
        unexcused:Math.round(unexcused/denom*100)
      }
    };
  }
  return reports;
}

async function enrich(s:any,reports:any[],requestedType:any=""){
  await attendanceFromEffectiveDays(s,reports,requestedType);
  await schoolGrades(s,reports);
  await academicStars(s,reports);
  return reports;
}

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:CORS});
  if(req.method!=="POST")return reply({success:false,error:"method_not_allowed"},405);
  try{
    const url=Deno.env.get("SUPABASE_URL");if(!url)throw Error("supabase_url_missing");
    const raw=await req.text();let body:any={};try{body=raw?JSON.parse(raw):{}}catch(_){body={}}
    const s=db();
    const reportPeriod=await reportPeriodForRequest(s,body);
    const forwarded=reportPeriod?.configured?{...body,start_date:reportPeriod.data_start_date,end_date:reportPeriod.data_end_date}:body;
    const apikey=req.headers.get("apikey")||Deno.env.get("SUPABASE_ANON_KEY")||"";
    const auth=req.headers.get("authorization")||(apikey?`Bearer ${apikey}`:"");
    const token=req.headers.get("x-session-token")||"";
    const upstream=await fetch(`${url}/functions/v1/report-preview`,{
      method:"POST",
      headers:{"Content-Type":"application/json",...(apikey?{apikey}:{}),...(auth?{Authorization:auth}:{}),...(token?{"x-session-token":token}:{})},
      body:JSON.stringify(forwarded)
    });
    const text=await upstream.text();let out:any;
    try{out=text?JSON.parse(text):{}}catch(_){return new Response(text,{status:upstream.status,headers:CORS})}
    if(!upstream.ok||out?.success===false)return reply(out,upstream.status);
    const requestedType=publicReportType(body?.report_type||body?.assessment_period);
    if(out?.report)await enrich(s,[out.report],requestedType);
    if(Array.isArray(out?.reports))await enrich(s,out.reports,requestedType);
    if(reportPeriod){
      out.report_period=reportPeriod;
      if(out?.report&&typeof out.report==="object")out.report.report_period=reportPeriod;
      if(Array.isArray(out?.reports))for(const r of out.reports)if(r&&typeof r==="object")r.report_period=reportPeriod;
    }
    return reply(out,upstream.status);
  }catch(e){
    console.error(e);
    return reply({success:false,error:txt((e as any)?.message)||"internal_error"},500);
  }
});
