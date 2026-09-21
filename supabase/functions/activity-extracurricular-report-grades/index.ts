import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

const url=Deno.env.get("SUPABASE_URL")!;
const key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||Deno.env.get("SUPABASE_SECRET_KEY")!;
const sb=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
const H={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"content-type, apikey, authorization, x-session-token","Access-Control-Allow-Methods":"POST,OPTIONS","Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"};
const reply=(b:any,s=200)=>new Response(JSON.stringify(b),{status:s,headers:H});
const txt=(v:any)=>String(v??"").trim();
const low=(v:any)=>txt(v).toLowerCase();
const validGrade=(v:any)=>["A","B","C","D"].includes(txt(v).toUpperCase())?txt(v).toUpperCase():"";
const activityGrade=(pct:number|null)=>pct===null?"-":pct>=85?"A":pct>=70?"B":pct>=50?"C":"D";

async function hash(v:string){const d=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(v));return[...new Uint8Array(d)].map(x=>x.toString(16).padStart(2,"0")).join("")}
async function auth(req:Request){
  const raw=txt(req.headers.get("x-session-token"));if(!raw)return null;
  const {data:s}=await sb.from("user_sessions").select("user_account_id,expires_at,revoked_at").eq("token_hash",await hash(raw)).maybeSingle();
  if(!s||s.revoked_at||!s.expires_at||new Date(s.expires_at).getTime()<=Date.now())return null;
  const {data:a}=await sb.from("user_accounts").select("id,teacher_id,username,status").eq("id",s.user_account_id).maybeSingle();if(!a)return null;
  const roles:string[]=[];
  const {data:ar}=await sb.from("user_account_roles").select("role_code,role,is_active").eq("user_account_id",a.id).eq("is_active",true);
  for(const r of ar||[])roles.push(low(r.role_code||r.role));
  if(a.teacher_id){const {data:tr}=await sb.from("user_roles").select("role_code,is_active").eq("teacher_id",a.teacher_id).eq("is_active",true);for(const r of tr||[])roles.push(low(r.role_code));}
  if(low(a.username)==="admin")roles.push("admin");
  return {...a,roles:[...new Set(roles)]};
}
const canView=(a:any)=>a?.roles?.some((r:string)=>["kabid_kegiatan","kegiatan","pimpinan","admin"].includes(r));
async function period(){
  const {data:y}=await sb.from("academic_years").select("id,name").eq("is_active",true).order("created_at",{ascending:false}).limit(1).maybeSingle();
  if(!y)throw Error("academic_year_missing");
  const {data:s}=await sb.from("semesters").select("semester_no").eq("academic_year_id",y.id).eq("is_active",true).limit(1).maybeSingle();
  return{academic_year_id:y.id,academic_year:y.name,semester_no:Number(s?.semester_no||1)};
}
async function fetchInBatches(table:string,select:string,column:string,ids:string[],batch=70){
  const out:any[]=[];const uniq=[...new Set(ids.filter(Boolean))];
  for(let i=0;i<uniq.length;i+=batch){const {data,error}=await sb.from(table).select(select).in(column,uniq.slice(i,i+batch));if(error)throw error;out.push(...(data||[]));}
  return out;
}
async function build(){
  const p=await period();
  const [{data:enr,error:enErr},{data:classes,error:cErr},{data:ex,error:xErr},{data:members,error:mErr},{data:intAssess,error:iaErr},{data:external,error:eErr},{data:extAssess,error:eaErr},{data:marks,error:mkErr}]=await Promise.all([
    sb.from("student_enrollments").select("student_id,class_id").eq("academic_year_id",p.academic_year_id).eq("semester_no",p.semester_no).eq("is_active",true),
    sb.from("classes").select("id,name,code,grade_level").eq("academic_year_id",p.academic_year_id).eq("is_active",true),
    sb.from("extracurriculars").select("id,name,code,is_active").eq("is_active",true).order("name"),
    sb.from("extracurricular_members").select("id,student_id,extracurricular_id,status").eq("academic_year_id",p.academic_year_id),
    sb.from("extracurricular_assessments").select("id,student_id,extracurricular_id,semester_no,activity_grade,skill_grade,competition_grade,final_score,final_rating,final_remarks,description,assessment_period,updated_at").eq("academic_year_id",p.academic_year_id).eq("assessment_period","PTS"),
    sb.from("extracurricular_external_students").select("id,student_id,activity_name,institution_name,is_active,updated_at").eq("academic_year_id",p.academic_year_id).eq("semester_no",p.semester_no).eq("is_active",true),
    sb.from("extracurricular_external_assessments").select("id,external_student_id,student_id,activity_grade,skill_grade,competition_grade,competition_note,assessment_period,updated_at").eq("academic_year_id",p.academic_year_id).eq("semester_no",p.semester_no).eq("assessment_period","PTS"),
    sb.from("school_activity_matrix_marks").select("class_id,student_id,activity_code,participated").eq("academic_year_id",p.academic_year_id).eq("semester_no",p.semester_no)
  ]);
  for(const q of[{error:enErr},{error:cErr},{error:xErr},{error:mErr},{error:iaErr},{error:eErr},{error:eaErr},{error:mkErr}])if(q.error)throw q.error;
  const sids=[...new Set((enr||[]).map((x:any)=>x.student_id).filter(Boolean))] as string[];
  const students=await fetchInBatches("students","id,full_name,nis,nisn,status","id",sids,70);
  const sm=new Map(students.map((s:any)=>[s.id,s]));
  const cm=new Map((classes||[]).map((c:any)=>[c.id,c]));
  const em=new Map((enr||[]).map((e:any)=>[e.student_id,e.class_id]));
  const xm=new Map((ex||[]).map((x:any)=>[x.id,x]));

  const activeMembers=(members||[]).filter((m:any)=>["aktif","active"].includes(low(m.status))&&em.has(m.student_id));
  const internalStudentIds=new Set(activeMembers.map((m:any)=>m.student_id));
  const iaMap=new Map<string,any>();
  for(const a of intAssess||[]){
    if(a.semester_no!==null&&Number(a.semester_no)!==p.semester_no)continue;
    const k=`${a.student_id}|${a.extracurricular_id}`,old=iaMap.get(k);
    if(!old||String(a.updated_at||"")>String(old.updated_at||""))iaMap.set(k,a);
  }
  const eaMap=new Map<string,any>();
  for(const a of extAssess||[]){const old=eaMap.get(a.external_student_id);if(!old||String(a.updated_at||"")>String(old.updated_at||""))eaMap.set(a.external_student_id,a);}

  const classUsed=new Map<string,Set<string>>();
  const studentMarks=new Map<string,Set<string>>();
  for(const m of marks||[]){
    if(!m.participated)continue;
    if(!classUsed.has(m.class_id))classUsed.set(m.class_id,new Set());classUsed.get(m.class_id)!.add(txt(m.activity_code));
    const k=`${m.class_id}|${m.student_id}`;if(!studentMarks.has(k))studentMarks.set(k,new Set());studentMarks.get(k)!.add(txt(m.activity_code));
  }
  const schoolActivity=(classId:string,studentId:string)=>{
    const used=classUsed.get(classId)||new Set<string>(),got=studentMarks.get(`${classId}|${studentId}`)||new Set<string>();
    if(!used.size)return{grade:"-",percentage:null,checked:0,total:0};
    let checked=0;for(const code of used)if(got.has(code))checked++;
    const pct=Math.round(checked/used.size*100);return{grade:activityGrade(pct),percentage:pct,checked,total:used.size};
  };

  const rows:any[]=[];
  for(const m of activeMembers){
    const st=sm.get(m.student_id)||{},classId=em.get(m.student_id),cl=cm.get(classId)||{},activity=xm.get(m.extracurricular_id)||{},a=iaMap.get(`${m.student_id}|${m.extracurricular_id}`)||{},sa=schoolActivity(classId,m.student_id);
    const g1=validGrade(a.activity_grade),g2=validGrade(a.skill_grade),g3=validGrade(a.competition_grade);
    rows.push({source:"internal",student_id:m.student_id,student_name:st.full_name||"-",nis:st.nis||"",nisn:st.nisn||"",class_id:classId,class_name:cl.name||cl.code||"-",grade_level:Number(cl.grade_level)||null,activity_id:m.extracurricular_id,activity_name:activity.name||activity.code||"Ekskul",activity_grade:g1||"-",skill_grade:g2||"-",competition_grade:g3||"-",school_activity_grade:sa.grade,school_activity_percentage:sa.percentage,final_score:a.final_score??null,final_rating:txt(a.final_rating),remarks:txt(a.final_remarks||a.description),competition_note:"",assessment_id:a.id||null,assessment_status:g1&&g2&&g3?"complete":"pending",updated_at:a.updated_at||null});
  }
  for(const e of external||[]){
    if(!em.has(e.student_id)||internalStudentIds.has(e.student_id))continue;
    const st=sm.get(e.student_id)||{},classId=em.get(e.student_id),cl=cm.get(classId)||{},a=eaMap.get(e.id)||{},sa=schoolActivity(classId,e.student_id);
    const g1=validGrade(a.activity_grade),g2=validGrade(a.skill_grade),g3=validGrade(a.competition_grade);
    rows.push({source:"external",student_id:e.student_id,student_name:st.full_name||"-",nis:st.nis||"",nisn:st.nisn||"",class_id:classId,class_name:cl.name||cl.code||"-",grade_level:Number(cl.grade_level)||null,activity_id:e.id,activity_name:e.activity_name||"Ekskul Eksternal",institution_name:e.institution_name||"",activity_grade:g1||"-",skill_grade:g2||"-",competition_grade:g3||"-",school_activity_grade:sa.grade,school_activity_percentage:sa.percentage,final_score:null,final_rating:"",remarks:"",competition_note:txt(a.competition_note),assessment_id:a.id||null,assessment_status:g1&&g2&&g3?"complete":"pending",updated_at:a.updated_at||null});
  }
  rows.sort((a,b)=>a.class_name.localeCompare(b.class_name,"id",{numeric:true})||a.activity_name.localeCompare(b.activity_name,"id")||a.student_name.localeCompare(b.student_name,"id"));
  const classesOut=[...new Map(rows.map(r=>[r.class_id,{id:r.class_id,name:r.class_name,grade_level:r.grade_level}])).values()].sort((a:any,b:any)=>a.name.localeCompare(b.name,"id",{numeric:true}));
  const activities={
    internal:[...new Map(rows.filter(r=>r.source==="internal").map(r=>[r.activity_id,{id:r.activity_id,name:r.activity_name}])).values()].sort((a:any,b:any)=>a.name.localeCompare(b.name,"id")),
    external:[...new Map(rows.filter(r=>r.source==="external").map(r=>[r.activity_name.toLowerCase(),{id:r.activity_name,name:r.activity_name}])).values()].sort((a:any,b:any)=>a.name.localeCompare(b.name,"id"))
  };
  return{academic_year:p.academic_year,semester_no:p.semester_no,assessment_period:"PTS",rows,classes:classesOut,activities,summary:{records:rows.length,internal:rows.filter(r=>r.source==="internal").length,external:rows.filter(r=>r.source==="external").length,complete:rows.filter(r=>r.assessment_status==="complete").length,pending:rows.filter(r=>r.assessment_status==="pending").length}};
}

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:H});
  if(req.method!=="POST")return reply({success:false,error:"method_not_allowed"},405);
  try{
    const a=await auth(req);if(!a)return reply({success:false,error:"session_invalid"},401);if(!canView(a))return reply({success:false,error:"forbidden"},403);
    const b=await req.json().catch(()=>({}));const action=low(b.action||"list");
    if(action!=="list"&&action!=="bootstrap")return reply({success:false,error:"unknown_action"},400);
    return reply({success:true,...await build()});
  }catch(e){console.error(e);return reply({success:false,error:txt((e as any)?.message)||"internal_error"},500)}
});
