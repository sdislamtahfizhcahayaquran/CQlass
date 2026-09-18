import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS={
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type, x-session-token",
  "Access-Control-Allow-Methods":"POST, OPTIONS"
};
const DEFAULT_YEAR="2026/2027";
const SCHOOL_UNIT_CODE="SD";
const READ_ALL_ROLES=["admin","pimpinan","akademik"];

function json(body:unknown,status=200){return new Response(JSON.stringify(body),{status,headers:{...CORS,"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}})}
function t(v:unknown){return String(v??"").trim()}
function low(v:unknown){return t(v).toLowerCase()}
function normalizeRole(v:unknown){const s=low(v).replace(/[-\s]+/g,"_").replace(/[^a-z0-9_]/g,"");if(s==="admin"||s.includes("administrator"))return"admin";if(s.includes("pimpinan")||s.includes("kepala_sekolah")||s==="kepsek")return"pimpinan";if(s.includes("kabid_akademik")||s==="akademik"||s.includes("academic"))return"akademik";if(s.includes("walas")||s.includes("wali_kelas")||s.includes("homeroom"))return"walas";if(s==="guru"||s.includes("teacher")||s.includes("pengajar"))return"guru";return s}
function isActive(v:unknown){return !["nonaktif","inactive","disabled","blokir","blocked","keluar","lulus"].includes(low(v))}
function serviceKey(){const packed=Deno.env.get("SUPABASE_SECRET_KEYS");if(packed){try{const p=JSON.parse(packed);if(p?.default)return String(p.default)}catch(_){}}const k=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||Deno.env.get("SUPABASE_SECRET_KEY");if(!k)throw new Error("service_key_missing");return k}
function db(){const url=Deno.env.get("SUPABASE_URL");if(!url)throw new Error("supabase_url_missing");return createClient(url,serviceKey(),{auth:{persistSession:false,autoRefreshToken:false}})}
async function sha256(input:string){const d=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(input));return Array.from(new Uint8Array(d)).map(b=>b.toString(16).padStart(2,"0")).join("")}
async function auth(s:any,req:Request,body:any){const token=t(req.headers.get("x-session-token")||body?.session_token||body?.sessionToken);if(!token)return{error:json({success:false,error:"session_invalid"},401)};const hash=await sha256(token);const {data:session,error:se}=await s.from("user_sessions").select("id,user_account_id,expires_at,revoked_at").eq("token_hash",hash).maybeSingle();if(se||!session||session.revoked_at)return{error:json({success:false,error:"session_invalid"},401)};if(!session.expires_at||new Date(session.expires_at).getTime()<=Date.now())return{error:json({success:false,error:"session_expired"},401)};const {data:account,error:ae}=await s.from("user_accounts").select("id,teacher_id,username,status").eq("id",session.user_account_id).maybeSingle();if(ae||!account)return{error:json({success:false,error:"account_not_found"},401)};if(!isActive(account.status))return{error:json({success:false,error:"account_inactive"},403)};return{account}}
async function roles(s:any,account:any){const out:string[]=[];if(low(account.username)==="admin")out.push("admin");if(account.teacher_id){const {data}=await s.from("user_roles").select("role_code,is_active").eq("teacher_id",account.teacher_id).eq("is_active",true);for(const r of data||[]){const x=normalizeRole(r.role_code);if(x)out.push(x)}out.push("guru")}return[...new Set(out)]}
async function period(s:any,yearName:string,semesterNo:number){const {data:unit,error:ue}=await s.from("school_units").select("id").eq("code",SCHOOL_UNIT_CODE).single();if(ue||!unit)throw new Error("school_unit_not_found");const {data:year,error:ye}=await s.from("academic_years").select("id,name").eq("school_unit_id",unit.id).eq("name",yearName).single();if(ye||!year)throw new Error("academic_year_not_found");return{unit,year,semesterNo}}
async function allClasses(s:any,p:any){const {data,error}=await s.from("classes").select("id,code,name,grade_level,academic_year_id,is_active").eq("academic_year_id",p.year.id).eq("is_active",true);if(error)throw error;return(data||[]).map((x:any)=>({id:t(x.id),code:t(x.code),name:t(x.name)||t(x.code),grade_level:Number(x.grade_level)||null})).sort((a:any,b:any)=>a.name.localeCompare(b.name,"id",{numeric:true}))}
function teacherMatchesAssignment(row:any,teacherId:string){return ["homeroom_teacher_id","walas_teacher_id","wali_kelas_teacher_id","class_teacher_id","teacher_id"].some(k=>t(row?.[k])===t(teacherId))}
function assignmentClassId(row:any){for(const k of ["class_id","kelas_id","rombel_id"]){const v=t(row?.[k]);if(v)return v}return""}
async function walasClassIds(s:any,account:any,p:any){if(!account.teacher_id)return[];const ids=new Set<string>();try{const {data,error}=await s.from("report_class_assignments").select("*");if(!error)for(const r of data||[]){if(teacherMatchesAssignment(r,t(account.teacher_id))){const cid=assignmentClassId(r);if(cid)ids.add(cid)}}}catch(_){}try{const {data}=await s.from("teacher_assignments").select("class_id,assignment_type,is_active,academic_year_id,semester_no").eq("teacher_id",account.teacher_id).eq("academic_year_id",p.year.id).eq("semester_no",p.semesterNo).eq("is_active",true);for(const r of data||[]){const a=low(r.assignment_type);if(a.includes("walas")||a.includes("wali")||a.includes("homeroom"))ids.add(t(r.class_id))}}catch(_){}return[...ids].filter(Boolean)}
async function accessibleClasses(s:any,account:any,userRoles:string[],p:any){const classes=await allClasses(s,p);if(userRoles.some(r=>READ_ALL_ROLES.includes(r)))return{classes,class_locked:false};const ids=await walasClassIds(s,account,p);return{classes:classes.filter((c:any)=>ids.includes(c.id)),class_locked:true}}
async function roster(s:any,p:any,classId:string){const {data:e,error:ee}=await s.from("student_enrollments").select("student_id,class_id,academic_year_id,semester_no").eq("class_id",classId).eq("academic_year_id",p.year.id).eq("semester_no",p.semesterNo);if(ee)throw ee;const ids=[...new Set((e||[]).map((x:any)=>t(x.student_id)).filter(Boolean))];if(!ids.length)return[];const {data,error}=await s.from("students").select("id,nis,nisn,full_name,gender,status").in("id",ids);if(error)throw error;return(data||[]).filter((x:any)=>isActive(x.status)).map((x:any)=>({id:t(x.id),nis:t(x.nis),nisn:t(x.nisn),name:t(x.full_name),gender:t(x.gender)})).sort((a:any,b:any)=>a.name.localeCompare(b.name,"id"))}
function performance(avg:number|null){if(avg===null)return"-";if(avg>=90)return"Highly Proficient";if(avg>=81)return"Proficient";if(avg>=75)return"Developing";return"Needs Guidance"}
function baseCode(c:any){return t(c).replace(/-\d+$/,'').replace(/[^A-Z0-9]+/gi,'-').toUpperCase()}
async function academic(s:any,p:any,classInfo:any,studentId:string){
  const grade=Number(classInfo.grade_level)||null;if(!grade)return[];
  const {data:subjects,error:se}=await s.from("subjects").select("id,code,name,grade_level,sort_order,is_active").eq("is_active",true).eq("grade_level",grade).order("sort_order",{ascending:true});if(se)throw se;
  const subjectIds=(subjects||[]).map((x:any)=>x.id);let objectives:any[]=[];let scores:any[]=[];
  if(subjectIds.length){const [or,sr]=await Promise.all([
    s.from("learning_objectives").select("id,subject_id,code,description,sort_order,kktp,is_active").eq("academic_year_id",p.year.id).eq("semester_no",p.semesterNo).eq("grade_level",grade).eq("is_active",true).in("subject_id",subjectIds).order("sort_order",{ascending:true}),
    s.from("academic_scores").select("subject_id,learning_objective_id,score,assessment_type,deleted_at").eq("academic_year_id",p.year.id).eq("semester_no",p.semesterNo).eq("class_id",classInfo.id).eq("student_id",studentId).is("deleted_at",null).eq("assessment_type","TP").in("subject_id",subjectIds)
  ]);if(or.error)throw or.error;if(sr.error)throw sr.error;objectives=or.data||[];scores=sr.data||[]}
  const byObj=new Map<string,number>();for(const r of scores){if(t(r.learning_objective_id)&&r.score!==null&&Number.isFinite(Number(r.score)))byObj.set(t(r.learning_objective_id),Number(r.score))}
  const objBySubject:any={};for(const o of objectives)(objBySubject[t(o.subject_id)]??=[]).push(o);
  const rowById=new Map<string,any>();
  for(const sub of subjects||[]){const os=(objBySubject[t(sub.id)]||[]).slice().sort((a:any,b:any)=>(Number(a.sort_order)||0)-(Number(b.sort_order)||0)).slice(0,5);const los=os.map((o:any)=>byObj.has(t(o.id))?byObj.get(t(o.id)):null);while(los.length<5)los.push(null);const filled=los.filter((x:any)=>x!==null&&Number.isFinite(Number(x))) as number[];const avg=filled.length?filled.reduce((a,b)=>a+b,0)/filled.length:null;const ks=os.map((o:any)=>Number(o.kktp)).filter((x:number)=>Number.isFinite(x)&&x>0);const kktp=ks.length?(Math.min(...ks)===Math.max(...ks)?String(Math.min(...ks)):`${Math.min(...ks)}-${Math.max(...ks)}`):"";rowById.set(t(sub.id),{id:t(sub.id),code:t(sub.code),name:t(sub.name),sort_order:Number(sub.sort_order)||999,kktp,lo:los,average:avg===null?null:Math.round(avg*100)/100,remarks:performance(avg),starting_grade_4:false})}
  let mappings:any[]=[];try{const {data,error}=await s.from("report_subject_mappings").select("report_key,grade_level,source_subject_id,display_name,sort_order,is_active").eq("grade_level",grade).eq("is_active",true).order("sort_order",{ascending:true});if(!error)mappings=data||[]}catch(_){}
  const mappedSourceIds=new Set(mappings.map((m:any)=>t(m.source_subject_id)));
  const out:any[]=[];
  for(const m of mappings){const src=rowById.get(t(m.source_subject_id));if(src)out.push({...src,id:`report-${low(m.report_key)}-${grade}`,name:t(m.display_name)||src.name,report_key:t(m.report_key),sort_order:Number(m.sort_order)||src.sort_order,source_subject_id:t(m.source_subject_id)})}
  for(const sub of subjects||[]){if(!mappedSourceIds.has(t(sub.id))){const r=rowById.get(t(sub.id));if(r)out.push(r)}}
  if(grade<=3){try{const {data:g4}=await s.from("subjects").select("id,code,name,sort_order,is_active").eq("is_active",true).eq("grade_level",4).order("sort_order",{ascending:true});const have=new Set(out.map((x:any)=>baseCode(x.code)));const onlyStart4=new Set(["SAI","SOS","SIR","TJW"]);for(const sub of g4||[]){const b=baseCode(sub.code);if(onlyStart4.has(b)&&!have.has(b)){out.push({id:`start4-${b}`,code:t(sub.code),name:t(sub.name),sort_order:Number(sub.sort_order)||999,kktp:"",lo:[null,null,null,null,null],average:null,remarks:"Starting Grade 4",starting_grade_4:true});have.add(b)}}}catch(_){}
  }
  return out.sort((a:any,b:any)=>(a.sort_order||0)-(b.sort_order||0)||t(a.name).localeCompare(t(b.name),"id"));
}
async function tahfizh(s:any,p:any,classInfo:any,studentId:string,periodType:string){
  if(periodType==="PTS"){
    const {data,error}=await s.from("tahfizh_pts_reports").select("guru_halaqah,materi_hafalan,lp_tahfizh,realisasi_saat_ini,prestasi_tahfizh,jumlah_surat,jumlah_baris,jumlah_ayat,jumlah_baris_lp,persentase,mengikuti_kenaikan_juz,source_system,source_ref,updated_at").eq("student_id",studentId).eq("class_id",classInfo.id).eq("academic_year_id",p.year.id).eq("semester_no",p.semesterNo).eq("period_type","PTS").maybeSingle();
    if(error)throw error;if(!data)return null;
    return{
      material:t(data.materi_hafalan)||"-",
      target:t(data.lp_tahfizh)||"-",
      current:t(data.realisasi_saat_ini)||"-",
      achievement:t(data.prestasi_tahfizh)||"-",
      surahs:t(data.jumlah_surat)||"-",
      lines:t(data.jumlah_baris)||"-",
      verses:t(data.jumlah_ayat)||"-",
      percentage:t(data.persentase)||"-",
      juz_assessment:t(data.mengikuti_kenaikan_juz)||"-",
      guru_halaqah:t(data.guru_halaqah),
      jumlah_baris_lp:t(data.jumlah_baris_lp),
      source_system:t(data.source_system),source_ref:t(data.source_ref),updated_at:data.updated_at
    }
  }
  const {data,error}=await s.from("tahfizh_student_progress").select("target_lp,surah_awal,bt,bp,surat_akhir,juz,kuadran,tilawah,hal,ukj,keterangan,source_system,source_ref,updated_at").eq("student_id",studentId).eq("class_id",classInfo.id).eq("academic_year_id",p.year.id).eq("semester_no",p.semesterNo).eq("period_type",periodType).maybeSingle();if(error)throw error;if(!data)return null;
  const material=t(data.kuadran)?(t(data.surah_awal)?`${t(data.kuadran)} (${t(data.surah_awal)})`:t(data.kuadran)):(t(data.surah_awal)||t(data.target_lp));
  return{
    material:material||"-",target:t(data.target_lp)||"-",current:t(data.surah_awal)||"-",achievement:t(data.surat_akhir)||"-",
    surahs:"-",lines:data.bt===null?"-":t(data.bt),verses:"-",percentage:"-",juz_assessment:t(data.ukj)||t(data.juz)||"-",
    bt:data.bt===null?null:Number(data.bt),bp:data.bp===null?null:Number(data.bp),juz:t(data.juz),kuadran:t(data.kuadran),tilawah:t(data.tilawah),hal:t(data.hal),ukj:t(data.ukj),keterangan:t(data.keterangan),source_system:t(data.source_system),source_ref:t(data.source_ref),updated_at:data.updated_at
  }
}
async function attendance(s:any,classId:string,studentId:string,start:string,end:string){let q=s.from("morning_talk_sessions").select("id,attendance_date,class_id").eq("class_id",classId);if(start)q=q.gte("attendance_date",start);if(end)q=q.lte("attendance_date",end);const {data:sessions,error}=await q;if(error)throw error;const ids=(sessions||[]).map((x:any)=>x.id);const out={present:0,sick:0,excused:0,unexcused:0,late:0,total:ids.length,percent:{present:0,sick:0,excused:0,unexcused:0}};if(!ids.length)return out;const {data:rows,error:ae}=await s.from("morning_talk_attendance").select("session_id,student_id,status").eq("student_id",studentId).in("session_id",ids);if(ae)throw ae;for(const r of rows||[]){const st=low(r.status);if(st.includes("hadir")||st==="present")out.present++;else if(st.includes("sakit")||st==="ill"||st==="sick")out.sick++;else if(st.includes("izin")||st.includes("excused"))out.excused++;else if(st.includes("alfa")||st.includes("alpha")||st.includes("unexcused"))out.unexcused++;else if(st.includes("terlambat")||st.includes("late")){out.late++;out.present++}}const denom=Math.max(1,out.total);out.percent={present:Math.round(out.present/denom*100),sick:Math.round(out.sick/denom*100),excused:Math.round(out.excused/denom*100),unexcused:Math.round(out.unexcused/denom*100)};return out}
async function points(s:any,studentId:string,start:string,end:string){let vq=s.from("discipline_incidents").select("category,points,incident_date,is_deleted").eq("student_id",studentId).eq("is_deleted",false);let rq=s.from("student_rewards").select("points,reward_date,is_deleted,is_verified").eq("student_id",studentId).eq("is_deleted",false).eq("is_verified",true);if(start){vq=vq.gte("incident_date",start);rq=rq.gte("reward_date",start)}if(end){vq=vq.lte("incident_date",end);rq=rq.lte("reward_date",end)}const [{data:v,error:ve},{data:r,error:re}]=await Promise.all([vq,rq]);if(ve)throw ve;if(re)throw re;const cats:any={Minor:{incidents:0,points:0},Moderate:{incidents:0,points:0},Severe:{incidents:0,points:0}};for(const x of v||[]){const c=low(x.category);const k=c.includes("ringan")||c.includes("minor")?"Minor":c.includes("sedang")||c.includes("moderate")?"Moderate":"Severe";cats[k].incidents++;cats[k].points+=Number(x.points||0)}const violationTotal=Object.values(cats).reduce((a:any,x:any)=>a+Number(x.points||0),0);const rewardTotal=(r||[]).reduce((a:number,x:any)=>a+Number(x.points||0),0);return{categories:cats,violation_total:violationTotal,reward_total:rewardTotal,final_total:rewardTotal-violationTotal}}
async function extracurricular(s:any,p:any,studentId:string,periodType:string){
  let schoolMember=false;
  try{
    const {data}=await s.from("extracurricular_assignment_members").select("id,is_active").eq("student_id",studentId).eq("is_active",true).limit(1);
    schoolMember=Boolean(data?.length)
  }catch(_){}
  let assessment:any=null;
  try{
    const {data}=await s.from("extracurricular_assessments")
      .select("activity_grade,skill_grade,competition_grade,school_activity_grade,assessment_period,semester_no,academic_year_id,updated_at")
      .eq("student_id",studentId).eq("academic_year_id",p.year.id).eq("semester_no",p.semesterNo)
      .eq("assessment_period",periodType).order("updated_at",{ascending:false}).limit(1);
    assessment=data?.[0]||null
  }catch(_){}
  let external:any=null;
  try{
    const {data}=await s.from("extracurricular_external_students")
      .select("id,student_id,academic_year_id,semester_no,activity_name,is_active,updated_at")
      .eq("student_id",studentId).eq("academic_year_id",p.year.id).eq("semester_no",p.semesterNo)
      .eq("is_active",true).order("updated_at",{ascending:false}).limit(1);
    external=data?.[0]||null
  }catch(_){}
  let externalAssessment:any=null;
  if(external?.id){
    try{
      const {data}=await s.from("extracurricular_external_assessments")
        .select("activity_grade,skill_grade,competition_grade,competition_note,assessment_period,updated_at")
        .eq("external_student_id",external.id).eq("student_id",studentId)
        .eq("academic_year_id",p.year.id).eq("semester_no",p.semesterNo)
        .eq("assessment_period",periodType).order("updated_at",{ascending:false}).limit(1);
      externalAssessment=data?.[0]||null
    }catch(_){}
  }
  if(external&&externalAssessment)return{
    status:"LUAR",
    activity_grade:t(externalAssessment.activity_grade)||"-",
    skill_grade:t(externalAssessment.skill_grade)||"-",
    competition_grade:t(externalAssessment.competition_grade)||"-",
    school_activity_grade:"-",
    external_activity:t(external.activity_name),
    competition_note:t(externalAssessment.competition_note)
  };
  if(schoolMember||assessment)return{
    status:"SEKOLAH",
    activity_grade:t(assessment?.activity_grade)||"-",
    skill_grade:t(assessment?.skill_grade)||"-",
    competition_grade:t(assessment?.competition_grade)||"-",
    school_activity_grade:t(assessment?.school_activity_grade)||"-",
    external_activity:""
  };
  if(external)return{
    status:"LUAR",
    activity_grade:"-",
    skill_grade:"-",
    competition_grade:"-",
    school_activity_grade:"-",
    external_activity:t(external.activity_name),
    competition_note:""
  };
  return{status:"TIDAK_IKUT",activity_grade:"D",skill_grade:"D",competition_grade:"D",school_activity_grade:"D",external_activity:""}
}
async function teachers(s:any,p:any,classInfo:any){let principal="";try{const {data}=await s.from("teachers").select("id,full_name,position,status");const x=(data||[]).find((r:any)=>isActive(r.status)&&(low(r.position).includes("kepala")||low(r.position).includes("principal")));principal=t(x?.full_name)}catch(_){}let homeroom="";let tahfizhNames:string[]=[];let team:string[]=[];try{const {data,error}=await s.from("report_class_assignments").select("*");if(!error){const rows=(data||[]).filter((x:any)=>assignmentClassId(x)===t(classInfo.id));const tids=[...new Set(rows.flatMap((x:any)=>["homeroom_teacher_id","walas_teacher_id","wali_kelas_teacher_id","class_teacher_id","teacher_id"].map(k=>t(x?.[k]))).filter(Boolean))];if(tids.length){const {data:trs}=await s.from("teachers").select("id,full_name").in("id",tids);if(trs?.[0])homeroom=t(trs[0].full_name)}}}catch(_){}try{const {data}=await s.from("teacher_subject_assignments").select("teacher_id").eq("class_id",classInfo.id).eq("academic_year_id",p.year.id).eq("semester_no",p.semesterNo).eq("is_active",true);const tids=[...new Set((data||[]).map((x:any)=>t(x.teacher_id)).filter(Boolean))];if(tids.length){const {data:trs}=await s.from("teachers").select("id,full_name").in("id",tids);team=(trs||[]).map((x:any)=>t(x.full_name)).filter(Boolean).sort((a:string,b:string)=>a.localeCompare(b,"id"))}}catch(_){}try{const {data}=await s.from("tahfizh_teacher_assignments").select("teacher_id").eq("class_id",classInfo.id).eq("academic_year_id",p.year.id).eq("semester_no",p.semesterNo).eq("is_active",true);const tids=[...new Set((data||[]).map((x:any)=>t(x.teacher_id)).filter(Boolean))];if(tids.length){const {data:trs}=await s.from("teachers").select("id,full_name").in("id",tids);tahfizhNames=(trs||[]).map((x:any)=>t(x.full_name)).filter(Boolean)}}catch(_){}return{principal,homeroom,team,tahfizh:tahfizhNames}}
async function buildReport(s:any,p:any,classInfo:any,student:any,start:string,end:string,periodType:string,teacherInfo:any=null){const [acad,att,pts,eks,trs,thf]=await Promise.all([academic(s,p,classInfo,student.id),attendance(s,classInfo.id,student.id,start,end),points(s,student.id,start,end),extracurricular(s,p,student.id,periodType),teacherInfo?Promise.resolve(teacherInfo):teachers(s,p,classInfo),tahfizh(s,p,classInfo,student.id,periodType)]);return{academic_year:p.year.name,semester_no:p.semesterNo,report_type:periodType,class:classInfo,student,academic:acad,attendance:att,points:pts,extracurricular:eks,teachers:trs,tahfizh:thf,date_range:{start,end},generated_at:new Date().toISOString()}}

Deno.serve(async(req)=>{if(req.method==="OPTIONS")return new Response("ok",{headers:CORS});if(req.method!=="POST")return json({success:false,error:"method_not_allowed"},405);let body:any={};try{body=await req.json()}catch(_){return json({success:false,error:"invalid_json"},400)}try{const s=db();const a=await auth(s,req,body);if(a.error)return a.error;const yearName=t(body.academic_year||body.academicYear)||DEFAULT_YEAR;const semesterNo=Number(body.semester_no||body.semester||1);if(![1,2].includes(semesterNo))return json({success:false,error:"semester_invalid"},400);const p=await period(s,yearName,semesterNo);const userRoles=await roles(s,a.account);const ownWalasClasses=await walasClassIds(s,a.account,p);if(ownWalasClasses.length&&!userRoles.includes("walas"))userRoles.push("walas");if(!userRoles.some(r=>[...READ_ALL_ROLES,"walas"].includes(r)))return json({success:false,error:"forbidden"},403);const access=await accessibleClasses(s,a.account,userRoles,p);const action=low(body.action);if(action==="bootstrap"){const defaultId=access.class_locked&&access.classes.length===1?access.classes[0].id:"";return json({success:true,academic_year:yearName,semester_no:semesterNo,classes:access.classes,class_locked:access.class_locked,default_class_id:defaultId})}const classId=t(body.class_id);const classInfo=access.classes.find((x:any)=>x.id===classId);if(!classInfo)return json({success:false,error:"class_forbidden"},403);if(action==="students")return json({success:true,students:await roster(s,p,classId)});if(action==="preview"){const studentId=t(body.student_id);const students=await roster(s,p,classId);const student=students.find((x:any)=>x.id===studentId);if(!student)return json({success:false,error:"student_not_in_class"},400);const start=t(body.start_date),end=t(body.end_date),periodType=low(body.report_type)==="semester"||low(body.assessment_period)==="semester"?"SEMESTER":"PTS";return json({success:true,report:await buildReport(s,p,classInfo,student,start,end,periodType)})}if(action==="class_reports"){const students=await roster(s,p,classId);const start=t(body.start_date),end=t(body.end_date),periodType=low(body.report_type)==="semester"||low(body.assessment_period)==="semester"?"SEMESTER":"PTS";const teacherInfo=await teachers(s,p,classInfo);const reports:any[]=[];const chunkSize=5;for(let i=0;i<students.length;i+=chunkSize){const chunk=students.slice(i,i+chunkSize);const built=await Promise.all(chunk.map((student:any)=>buildReport(s,p,classInfo,student,start,end,periodType,teacherInfo)));reports.push(...built)}return json({success:true,count:reports.length,reports})}return json({success:false,error:"action_not_found"},404)}catch(e){console.error(e);return json({success:false,error:t((e as any)?.message)||"internal_error"},500)}});
