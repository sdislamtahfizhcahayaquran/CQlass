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
  const url=Deno.env.get("SUPABASE_URL");
  if(!url)throw Error("supabase_url_missing");
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
      const classIds=(classes||[]).map((x:any)=>x.id);if(!classIds.length)continue;
      const {data:scores,error:sErr}=await s.from("academic_scores").select("student_id,subject_id,score").eq("academic_year_id",yearId).eq("semester_no",semesterNo).eq("assessment_type","TP").is("deleted_at",null).not("score","is",null).in("class_id",classIds);if(sErr)throw sErr;
      const subjects=new Map<string,{sum:number,n:number}>();
      for(const row of scores||[]){const studentId=txt(row.student_id),subjectId=txt(row.subject_id),v=Number(row.score);if(!studentId||!subjectId||!Number.isFinite(v))continue;const k=studentId+"|"+subjectId,a=subjects.get(k)||{sum:0,n:0};a.sum+=v;a.n++;subjects.set(k,a)}
      const students=new Map<string,{sum:number,n:number}>();
      for(const [k,a] of subjects){const studentId=k.split("|")[0],subjectAverage=a.sum/a.n,st=students.get(studentId)||{sum:0,n:0};st.sum+=subjectAverage;st.n++;students.set(studentId,st)}
      ranked=[...students.entries()].map(([student_id,a])=>({student_id,average:a.sum/a.n,subject_count:a.n})).sort((a,b)=>b.average-a.average||a.student_id.localeCompare(b.student_id));
      cache.set(key,ranked);
    }
    const idx=ranked.findIndex((x:any)=>x.student_id===sid);if(idx<0)continue;
    r.academic_summary={...(r.academic_summary||{}),grade_level:gradeLevel,grade_rank:idx+1,grade_cohort_size:ranked.length,is_top10:idx<10,average_subject_pts:Number(ranked[idx].average.toFixed(2)),subject_count:ranked[idx].subject_count,ranking_scope:"GRADE_COHORT_SUBJECT_REPORT_AVERAGES_CURRENT_ENTERED_TP"};
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
  if(!start||!end)return"system";
  const key=`${yearId}|${semesterNo}|${classId}|${start}|${end}`;
  if(sourceCache.has(key))return sourceCache.get(key)!;
  const {data,error}=await s.from("attendance_report_source_selection").select("source_mode").eq("academic_year_id",yearId).eq("semester_no",semesterNo).eq("class_id",classId).eq("period_start",start).eq("period_end",end).maybeSingle();
  if(error)throw error;
  const mode=txt(data?.source_mode)==="editable"?"editable":"system";
  sourceCache.set(key,mode);return mode;
}
async function finalizedRows(s:any,yearId:string,semesterNo:number,classId:string,start:string,end:string){
  const key=`${yearId}|${semesterNo}|${classId}|${start}|${end}`;
  if(finalizationCache.has(key))return finalizationCache.get(key)!;
  const {data,error}=await s.from("attendance_report_finalization").select("student_id,late_count,sick_count,excused_count,unexcused_count").eq("academic_year_id",yearId).eq("semester_no",semesterNo).eq("class_id",classId).eq("period_start",start).eq("period_end",end);
  if(error)throw error;
  const map=new Map<string,any>();for(const row of data||[])map.set(txt(row.student_id),row);
  finalizationCache.set(key,map);return map;
}
async function attendanceFromEffectiveDays(s:any,reports:any[]){
  for(const r of reports||[]){
    const sid=txt(r?.student?.id),classId=txt(r?.class?.id),yearName=txt(r?.academic_year),semesterNo=Number(r?.semester_no||1);
    if(!sid||!classId||!yearName)continue;
    const yearId=await resolveYearId(s,yearName);if(!yearId)continue;
    const assessmentPeriod=txt(r?.report_type).toUpperCase()==="SEMESTER"?"PAS":"PTS";
    const effective=await effectiveDays(s,yearId,semesterNo,assessmentPeriod,classId);
    if(effective===null)continue;

    const base=(r.attendance&&typeof r.attendance==="object")?r.attendance:{};
    let sick=count(base.sick),excused=count(base.excused),unexcused=count(base.unexcused),late=count(base.late);
    const start=txt(r?.date_range?.start),end=txt(r?.date_range?.end);
    const source=await selectedSource(s,yearId,semesterNo,classId,start,end);
    if(source==="editable"){
      const rows=await finalizedRows(s,yearId,semesterNo,classId,start,end);
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

async function enrich(s:any,reports:any[]){
  await attendanceFromEffectiveDays(s,reports);
  await schoolGrades(s,reports);
  await academicStars(s,reports);
  return reports;
}

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:CORS});
  if(req.method!=="POST")return reply({success:false,error:"method_not_allowed"},405);
  try{
    const url=Deno.env.get("SUPABASE_URL");if(!url)throw Error("supabase_url_missing");
    const raw=await req.text();
    const apikey=req.headers.get("apikey")||Deno.env.get("SUPABASE_ANON_KEY")||"";
    const auth=req.headers.get("authorization")||(apikey?`Bearer ${apikey}`:"");
    const token=req.headers.get("x-session-token")||"";
    const upstream=await fetch(`${url}/functions/v1/report-preview`,{
      method:"POST",
      headers:{"Content-Type":"application/json",...(apikey?{apikey}:{}),...(auth?{Authorization:auth}:{}),...(token?{"x-session-token":token}:{})},
      body:raw
    });
    const text=await upstream.text();let out:any;
    try{out=text?JSON.parse(text):{}}catch(_){return new Response(text,{status:upstream.status,headers:CORS})}
    if(!upstream.ok||out?.success===false)return reply(out,upstream.status);
    const s=db();
    if(out?.report)await enrich(s,[out.report]);
    if(Array.isArray(out?.reports))await enrich(s,out.reports);
    return reply(out,upstream.status);
  }catch(e){
    console.error(e);
    return reply({success:false,error:txt((e as any)?.message)||"internal_error"},500);
  }
});
