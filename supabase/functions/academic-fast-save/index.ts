import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type, x-session-token","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}});
const txt=(v:unknown)=>String(v??"").trim();
const low=(v:unknown)=>txt(v).toLowerCase();
const upper=(v:unknown)=>txt(v).toUpperCase();
const allowedComponents=new Set(["TUGAS_1","TUGAS_2","TUGAS_3","TUGAS_4","TUGAS_5","WWP","ASAS"]);

function serviceKey(){
  const packed=Deno.env.get("SUPABASE_SECRET_KEYS");
  if(packed){try{const p=JSON.parse(packed);if(p?.default)return String(p.default)}catch{}}
  const k=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||Deno.env.get("SUPABASE_SECRET_KEY");
  if(!k)throw new Error("service_key_missing");
  return k;
}
function db(){const u=Deno.env.get("SUPABASE_URL");if(!u)throw new Error("supabase_url_missing");return createClient(u,serviceKey(),{auth:{persistSession:false,autoRefreshToken:false}})}
async function sha256(s:string){const d=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s));return Array.from(new Uint8Array(d)).map(b=>b.toString(16).padStart(2,"0")).join("")}
function active(v:unknown){return !["nonaktif","inactive","disabled","blocked","blokir","keluar","lulus"].includes(low(v))}
async function session(sb:any,req:Request,body:any){
  const token=txt(req.headers.get("x-session-token")||body?.session_token||body?.sessionToken);if(!token)return null;
  const {data:s}=await sb.from("user_sessions").select("id,user_account_id,expires_at,revoked_at").eq("token_hash",await sha256(token)).maybeSingle();
  if(!s||s.revoked_at||!s.expires_at||new Date(s.expires_at).getTime()<=Date.now())return null;
  const {data:a}=await sb.from("user_accounts").select("id,teacher_id,username,status").eq("id",s.user_account_id).maybeSingle();
  if(!a||!active(a.status))return null;
  return a;
}
async function inputAccess(sb:any,userId:string){const {data,error}=await sb.rpc("check_input_access_v1",{p_module_key:"academic_scores",p_user_account_id:userId});if(error)throw error;return data||{allowed:true}}
function scoreValue(v:any){if(v===null||v===undefined||txt(v)==="")return null;const n=Number(v);if(!Number.isFinite(n)||n<0||n>100)throw new Error("score_invalid");return n}

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
  if(req.method!=="POST")return json({success:false,error:"method_not_allowed"},405);
  try{
    const body=await req.json().catch(()=>({}));
    if(low(body.action)!=="save_batch")return json({success:false,error:"unknown_action"},400);
    const sb=db();const account=await session(sb,req,body);if(!account)return json({success:false,error:"session_invalid"},401);
    const access=await inputAccess(sb,account.id);if(access?.allowed===false)return json({success:false,error:"input_closed",message:"Penginputan nilai sedang ditutup oleh Admin.",access},423);
    const teacherId=txt(account.teacher_id);if(!teacherId)return json({success:false,error:"teacher_required"},403);
    const assignmentId=txt(body.assignment_id);if(!assignmentId)return json({success:false,error:"assignment_required"},400);
    const yearName=txt(body.academic_year)||"2026/2027";const sem=Number(body.semester_no??body.semester??1);if(![1,2].includes(sem))return json({success:false,error:"semester_invalid"},400);
    const raw=Array.isArray(body.items)?body.items:[];if(!raw.length)return json({success:false,error:"items_empty"},400);if(raw.length>5000)return json({success:false,error:"items_too_many"},400);

    const {data:unit,error:ue}=await sb.from("school_units").select("id").eq("code","SD").single();if(ue||!unit)throw ue||new Error("school_unit_not_found");
    const {data:year,error:ye}=await sb.from("academic_years").select("id,name,is_active").eq("school_unit_id",unit.id).eq("name",yearName).single();if(ye||!year)throw ye||new Error("academic_year_not_found");
    const {data:periodSemester,error:periodError}=await sb.from("semesters").select("is_active").eq("academic_year_id",year.id).eq("semester_no",sem).maybeSingle();
    if(periodError)throw periodError;
    if(!year.is_active||!periodSemester?.is_active)return json({success:false,error:"archive_read_only",message:"Periode ini tidak aktif. Muat ulang halaman; arsip hanya dapat dilihat."},409);
    const {data:asg,error:ae}=await sb.from("teacher_subject_assignments").select("id,teacher_id,class_id,subject_id,academic_year_id,semester_no,is_active").eq("id",assignmentId).eq("academic_year_id",year.id).eq("semester_no",sem).eq("is_active",true).maybeSingle();
    if(ae)throw ae;if(!asg||txt(asg.teacher_id)!==teacherId)return json({success:false,error:"assignment_forbidden"},403);
    const {data:cls,error:ce}=await sb.from("classes").select("id,grade_level").eq("id",asg.class_id).single();if(ce||!cls)throw ce||new Error("class_not_found");

    const {data:enr,error:ee}=await sb.from("student_enrollments").select("student_id").eq("class_id",asg.class_id).eq("academic_year_id",year.id).eq("semester_no",sem);if(ee)throw ee;
    const allowedStudents=new Set((enr||[]).map((x:any)=>txt(x.student_id)).filter(Boolean));
    const tpIds=[...new Set(raw.filter((x:any)=>upper(x.assessment_type)==="TP").map((x:any)=>txt(x.learning_objective_id)).filter(Boolean))];
    let allowedObjectives=new Set<string>();
    if(tpIds.length){
      const {data:los,error:le}=await sb.from("learning_objectives").select("id").eq("academic_year_id",year.id).eq("semester_no",sem).eq("subject_id",asg.subject_id).eq("grade_level",cls.grade_level).eq("is_active",true).in("id",tpIds);if(le)throw le;
      allowedObjectives=new Set((los||[]).map((x:any)=>txt(x.id)));
    }

    const items=raw.map((x:any)=>{
      const studentId=txt(x.student_id);if(!studentId||!allowedStudents.has(studentId))throw new Error("student_forbidden");
      const type=upper(x.assessment_type);const score=scoreValue(x.score);
      if(type==="TP"){
        const objectiveId=txt(x.learning_objective_id);if(!objectiveId||!allowedObjectives.has(objectiveId))throw new Error("learning_objective_forbidden");
        return {student_id:studentId,assessment_type:"TP",learning_objective_id:objectiveId,score};
      }
      if(!allowedComponents.has(type))throw new Error("assessment_type_invalid");
      return {student_id:studentId,assessment_type:type,learning_objective_id:null,score};
    });

    const {data:saved,error:se}=await sb.rpc("save_academic_scores_batch_v1",{p_academic_year_id:year.id,p_semester_no:sem,p_class_id:asg.class_id,p_subject_id:asg.subject_id,p_teacher_id:teacherId,p_items:items});
    if(se)throw se;
    return json({success:true,saved:Number(saved)||items.length,queued_for_legger:true});
  }catch(e){console.error("academic-fast-save",e);const msg=e instanceof Error?e.message:String(e);const bad=["score_invalid","student_forbidden","learning_objective_forbidden","assessment_type_invalid"].includes(msg);return json({success:false,error:bad?msg:"server_error",detail:bad?undefined:msg},bad?400:500)}
});
