import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

const CORS={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization,apikey,content-type,x-session-token","Access-Control-Allow-Methods":"POST,OPTIONS","Content-Type":"application/json; charset=utf-8"};
const J=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...CORS,"Cache-Control":"no-store"}});
const T=(v:unknown)=>String(v??"").trim();
const L=(v:unknown)=>T(v).toLowerCase();
const URL=Deno.env.get("SUPABASE_URL")!;
function secret(){const p=Deno.env.get("SUPABASE_SECRET_KEYS");if(p){try{const x=JSON.parse(p);if(x?.default)return String(x.default)}catch{}}return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||Deno.env.get("SUPABASE_SECRET_KEY")||""}
const sb=createClient(URL,secret(),{auth:{persistSession:false,autoRefreshToken:false}});
async function sha(s:string){const d=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s));return[...new Uint8Array(d)].map(b=>b.toString(16).padStart(2,"0")).join("")}
async function auth(req:Request,b:any){const tok=T(req.headers.get("x-session-token")||b.session_token);if(!tok)return null;const{data:ss}=await sb.from("user_sessions").select("user_account_id,expires_at,revoked_at").eq("token_hash",await sha(tok)).maybeSingle();if(!ss||ss.revoked_at||!ss.expires_at||new Date(ss.expires_at).getTime()<=Date.now())return null;const{data:a}=await sb.from("user_accounts").select("id,teacher_id,username,status").eq("id",ss.user_account_id).maybeSingle();if(!a||["nonaktif","inactive","disabled","blocked"].includes(L(a.status)))return null;let ok=["hrd","admin"].includes(L(a.username));if(!ok){const{data:r}=await sb.from("user_account_roles").select("role_code,role,is_active").eq("user_account_id",a.id).eq("is_active",true);ok=(r||[]).some((x:any)=>["hrd","admin"].includes(L(x.role_code||x.role)))}return ok?a:null}
const overlap=(a1:string,a2:string,b1:string,b2:string)=>!!a1&&!!a2&&a1<=b2&&a2>=b1;
const validDate=(v:string)=>/^\d{4}-\d{2}-\d{2}$/.test(v);

async function rppDetail(teacherId:string,start:string,end:string){
  const [{data:year,error:ye},{data:sem,error:se},{data:assign,error:ae},{data:classes,error:ce},{data:subjects,error:sue}]=await Promise.all([
    sb.from("academic_years").select("id,name").eq("is_active",true).maybeSingle(),
    sb.from("semesters").select("id,academic_year_id,semester_no").eq("is_active",true).maybeSingle(),
    sb.from("teacher_subject_assignments").select("teacher_id,class_id,subject_id,is_active,academic_year_id,semester_no").eq("teacher_id",teacherId).eq("is_active",true),
    sb.from("classes").select("id,name,grade_level,is_active"),
    sb.from("subjects").select("id,name,code,is_active")
  ]);
  if(ye||se||ae||ce||sue)throw ye||se||ae||ce||sue;if(!year||!sem)return{expected:[],submitted:[],missing:[]};
  const semNo=Number(sem.semester_no||0);if(![1,2].includes(semNo))throw Error("active_semester_not_found");
  const assignments=(assign||[]).filter((a:any)=>T(a.academic_year_id)===T(year.id)&&Number(a.semester_no)===semNo);
  const classMap=new Map((classes||[]).map((x:any)=>[T(x.id),x])),subjectMap=new Map((subjects||[]).map((x:any)=>[T(x.id),x]));
  const [{data:targets,error:te},{data:tracking,error:tre},{data:subs,error:re}]=await Promise.all([
    sb.from("school_lp_targets").select("id,grade_level,subject_id,week_no,period_label,period_start,period_end,target_text,require_rpp,is_active").eq("academic_year_id",year.id).eq("semester_no",semNo).eq("is_active",true).eq("require_rpp",true),
    sb.from("lp_teacher_tracking").select("lp_target_id,teacher_id,class_id,subject_id,execution_status,updated_at").eq("teacher_id",teacherId),
    sb.from("rpp_submissions").select("id,lp_target_id,teacher_id,class_id,subject_id,original_filename,file_size,content_status,upload_status,uploaded_at,created_at,updated_at").eq("teacher_id",teacherId).eq("upload_status","uploaded")
  ]);
  if(te||tre||re)throw te||tre||re;
  const trackMap=new Map((tracking||[]).map((x:any)=>[`${T(x.lp_target_id)}|${T(x.class_id)}|${T(x.subject_id)}`,x]));
  const submittedRows=subs||[];
  const expected:any[]=[];
  for(const a of assignments){
    const cl:any=classMap.get(T(a.class_id)),sub:any=subjectMap.get(T(a.subject_id)),grade=Number(cl?.grade_level)||0;
    for(const tg of targets||[]){
      if(T(tg.subject_id)!==T(a.subject_id)||Number(tg.grade_level)!==grade||!overlap(T(tg.period_start),T(tg.period_end),start,end))continue;
      const tr=trackMap.get(`${T(tg.id)}|${T(a.class_id)}|${T(a.subject_id)}`);
      if(tr&&["no_meeting","postponed"].includes(L(tr.execution_status)))continue;
      const matches=submittedRows.filter((x:any)=>T(x.lp_target_id)===T(tg.id)&&T(x.class_id)===T(a.class_id)&&T(x.subject_id)===T(a.subject_id)).sort((x:any,y:any)=>T(y.uploaded_at||y.updated_at||y.created_at).localeCompare(T(x.uploaded_at||x.updated_at||x.created_at)));
      const hit=matches[0]||null;
      expected.push({lp_target_id:tg.id,subject_name:T(sub?.name)||T(sub?.code)||"Mapel",class_name:T(cl?.name)||"Kelas",target_text:T(tg.target_text)||`Target LP${tg.week_no?` Pekan ${tg.week_no}`:""}`,period_label:T(tg.period_label)||null,period_start:T(tg.period_start)||null,period_end:T(tg.period_end)||null,week_no:tg.week_no||null,status:hit?"submitted":"missing",submission:hit?{id:hit.id,filename:T(hit.original_filename)||"RPP",uploaded_at:hit.uploaded_at||hit.created_at||null,file_size:Number(hit.file_size)||0,content_status:T(hit.content_status)||null}:null});
    }
  }
  expected.sort((a,b)=>a.class_name.localeCompare(b.class_name,"id")||a.subject_name.localeCompare(b.subject_name,"id")||T(a.period_start).localeCompare(T(b.period_start)));
  const submitted=expected.filter(x=>x.status==="submitted"),missing=expected.filter(x=>x.status==="missing");
  return{academic_year:year.name,semester_no:semNo,expected_count:expected.length,submitted_count:submitted.length,missing_count:missing.length,expected,submitted,missing};
}

Deno.serve(async(req)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:CORS});
  if(req.method!=="POST")return J({success:false,error:"method_not_allowed"},405);
  try{
    const b=await req.json().catch(()=>({}));const me=await auth(req,b);if(!me)return J({success:false,error:"forbidden"},403);
    const teacherId=T(b.teacher_id),key=L(b.key),start=T(b.start),end=T(b.end);
    if(!teacherId)return J({success:false,error:"teacher_id_required"},400);
    if(!validDate(start)||!validDate(end)||start>end)return J({success:false,error:"invalid_date_range"},400);
    if(key==="rpp")return J({success:true,key:"rpp",detail:await rppDetail(teacherId,start,end)});
    return J({success:false,error:"unsupported_category"},400);
  }catch(e){console.error(e);return J({success:false,error:"server_error",message:T((e as any)?.message)||"internal_error"},500)}
});