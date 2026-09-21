import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

const CORS={
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":"POST, OPTIONS",
  "Content-Type":"application/json; charset=utf-8",
  "Cache-Control":"no-store"
};
const SCHOOL_UNIT_CODE="SD";
const ASSESSMENT_PERIOD="PTS";
const txt=(v:any)=>String(v??"").trim();
const json=(body:any,status=200)=>new Response(JSON.stringify(body),{status,headers:CORS});
const grade=(v:any)=>{const g=txt(v).toUpperCase();return ["A","B","C","D"].includes(g)?g:""};
const activeInternalStatus=(v:any)=>["aktif","active"].includes(txt(v).toLowerCase());
function serviceKey(){
  const packed=Deno.env.get("SUPABASE_SECRET_KEYS");
  if(packed){try{const p=JSON.parse(packed);if(p?.default)return String(p.default)}catch(_){}}
  const k=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||Deno.env.get("SUPABASE_SECRET_KEY");
  if(!k)throw new Error("service_key_missing");
  return k;
}
function db(){
  const url=Deno.env.get("SUPABASE_URL");
  if(!url)throw new Error("supabase_url_missing");
  return createClient(url,serviceKey(),{auth:{persistSession:false,autoRefreshToken:false}});
}
async function currentPeriod(sb:any){
  const {data:unit,error:ue}=await sb.from("school_units").select("id").eq("code",SCHOOL_UNIT_CODE).single();
  if(ue||!unit)throw new Error("school_unit_not_found");
  const {data:year,error:ye}=await sb.from("academic_years").select("id,name").eq("school_unit_id",unit.id).eq("is_active",true).order("created_at",{ascending:false}).limit(1).maybeSingle();
  if(ye||!year)throw new Error("academic_year_not_found");
  const month=new Date().getUTCMonth()+1;
  const semester_no=month>=7?1:2;
  return {school_unit_id:unit.id,academic_year_id:year.id,academic_year:year.name,semester_no};
}
async function classes(sb:any,p:any){
  const {data,error}=await sb.from("classes").select("id,code,name,grade_level,rombel,gender_group")
    .eq("academic_year_id",p.academic_year_id).eq("is_active",true).order("grade_level").order("name");
  if(error)throw error;
  return data||[];
}
async function activeInternalStudentIds(sb:any,p:any,studentIds:string[]){
  const ids=[...new Set((studentIds||[]).filter(Boolean))] as string[];
  if(!ids.length)return new Set<string>();
  const {data,error}=await sb.from("extracurricular_members")
    .select("student_id,status")
    .eq("academic_year_id",p.academic_year_id)
    .in("student_id",ids);
  if(error)throw error;
  return new Set((data||[]).filter((x:any)=>activeInternalStatus(x.status)).map((x:any)=>x.student_id));
}
async function hasActiveInternal(sb:any,p:any,studentId:string){
  const internal=await activeInternalStudentIds(sb,p,[studentId]);
  return internal.has(studentId);
}
async function students(sb:any,p:any,classId:string){
  const {data:e,error:ee}=await sb.from("student_enrollments").select("student_id")
    .eq("class_id",classId).eq("academic_year_id",p.academic_year_id).eq("semester_no",p.semester_no).eq("is_active",true);
  if(ee)throw ee;
  const ids=[...new Set((e||[]).map((x:any)=>x.student_id).filter(Boolean))] as string[];
  if(!ids.length)return [];
  const [internalIds,studentsResult]=await Promise.all([
    activeInternalStudentIds(sb,p,ids),
    sb.from("students").select("id,full_name,status").in("id",ids).order("full_name")
  ]);
  if(studentsResult.error)throw studentsResult.error;
  return (studentsResult.data||[]).filter((x:any)=>
    !internalIds.has(x.id) &&
    !["nonaktif","inactive","keluar","lulus"].includes(txt(x.status).toLowerCase())
  );
}
async function enrolled(sb:any,p:any,classId:string,studentId:string){
  const {data,error}=await sb.from("student_enrollments").select("id").eq("class_id",classId)
    .eq("student_id",studentId).eq("academic_year_id",p.academic_year_id)
    .eq("semester_no",p.semester_no).eq("is_active",true).limit(1);
  if(error)throw error;
  return Boolean(data?.length);
}
async function externalRow(sb:any,p:any,studentId:string,activityName:string){
  const {data:matches,error:me}=await sb.from("extracurricular_external_students").select("*")
    .eq("student_id",studentId).eq("academic_year_id",p.academic_year_id).eq("semester_no",p.semester_no)
    .eq("is_active",true).ilike("activity_name",activityName);
  if(me)throw me;
  if(matches?.length)return matches[0];
  const now=new Date().toISOString();
  const {data,error}=await sb.from("extracurricular_external_students").insert({
    student_id:studentId,
    academic_year_id:p.academic_year_id,
    semester_no:p.semester_no,
    activity_name:activityName,
    is_active:true,
    source_system:"EXTERNAL_PTS_WEB",
    source_ref:"PORTAL_PTS",
    updated_at:now
  }).select("*").single();
  if(error)throw error;
  return data;
}
async function save(sb:any,p:any,body:any){
  const classId=txt(body.class_id),studentId=txt(body.student_id),activityName=txt(body.activity_name).replace(/\s+/g," ");
  const activityGrade=grade(body.activity_grade),skillGrade=grade(body.skill_grade),competitionGrade=grade(body.competition_grade);
  const competitionNote=txt(body.competition_note);
  if(!classId||!studentId)return json({success:false,error:"class_and_student_required"},400);
  if(!activityName||activityName.length>120)return json({success:false,error:"activity_name_invalid"},400);
  if(!activityGrade||!skillGrade||!competitionGrade)return json({success:false,error:"grades_must_be_a_to_d"},400);
  if(competitionNote.length>500)return json({success:false,error:"competition_note_too_long"},400);
  if(!await enrolled(sb,p,classId,studentId))return json({success:false,error:"student_not_in_class"},400);
  if(await hasActiveInternal(sb,p,studentId))return json({success:false,error:"student_is_internal_extracurricular"},409);

  const ext=await externalRow(sb,p,studentId,activityName);
  const now=new Date().toISOString();
  const {error:ue}=await sb.from("extracurricular_external_students").update({
    activity_name:activityName,is_active:true,source_system:"EXTERNAL_PTS_WEB",source_ref:"PORTAL_PTS",updated_at:now
  }).eq("id",ext.id);
  if(ue)throw ue;

  const {error:ae}=await sb.from("extracurricular_external_assessments").upsert({
    external_student_id:ext.id,
    student_id:studentId,
    academic_year_id:p.academic_year_id,
    semester_no:p.semester_no,
    assessment_period:ASSESSMENT_PERIOD,
    activity_grade:activityGrade,
    skill_grade:skillGrade,
    competition_grade:competitionGrade,
    competition_note:competitionNote||null,
    source_system:"EXTERNAL_PTS_WEB",
    updated_at:now
  },{onConflict:"external_student_id,assessment_period"});
  if(ae)throw ae;

  await Promise.all([
    sb.from("extracurricular_nonparticipants").delete().eq("student_id",studentId).eq("academic_year_id",p.academic_year_id).eq("semester_no",p.semester_no),
    sb.from("extracurricular_status_overrides").delete().eq("student_id",studentId).eq("academic_year_id",p.academic_year_id).eq("semester_no",p.semester_no).eq("status","NONE")
  ]);

  return json({success:true,message:"Nilai PTS ekskul eksternal berhasil disimpan.",data:{student_id:studentId,activity_name:activityName,activity_grade:activityGrade,skill_grade:skillGrade,competition_grade:competitionGrade,competition_note:competitionNote||null,assessment_period:ASSESSMENT_PERIOD,academic_year:p.academic_year,semester_no:p.semester_no}});
}

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:CORS});
  if(req.method!=="POST")return json({success:false,error:"method_not_allowed"},405);
  try{
    const sb=db();
    const body=await req.json().catch(()=>({}));
    const p=await currentPeriod(sb);
    const action=txt(body.action).toLowerCase();
    if(action==="bootstrap")return json({success:true,academic_year:p.academic_year,semester_no:p.semester_no,assessment_period:ASSESSMENT_PERIOD,classes:await classes(sb,p)});
    if(action==="students"){
      const classId=txt(body.class_id);
      if(!classId)return json({success:false,error:"class_required"},400);
      return json({success:true,students:await students(sb,p,classId)});
    }
    if(action==="save")return await save(sb,p,body);
    return json({success:false,error:"unknown_action"},400);
  }catch(e){
    console.error("extracurricular-external-pts",e);
    return json({success:false,error:txt((e as any)?.message)||"internal_error"},500);
  }
});
