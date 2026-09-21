import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

const CORS={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization,x-client-info,apikey,content-type,x-session-token","Access-Control-Allow-Methods":"POST,OPTIONS"};
const J=(body:any,status=200)=>new Response(JSON.stringify(body),{status,headers:{...CORS,"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}});
const T=(v:any)=>String(v??"").trim();
const L=(v:any)=>T(v).toLowerCase();
const ACTIVE_BAD=new Set(["nonaktif","inactive","disabled","blocked","blokir","keluar","lulus"]);
function serviceKey(){const packed=Deno.env.get("SUPABASE_SECRET_KEYS");if(packed){try{const p=JSON.parse(packed);if(p?.default)return String(p.default)}catch{}}const k=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||Deno.env.get("SUPABASE_SECRET_KEY");if(!k)throw Error("service_key_missing");return k}
function db(){const url=Deno.env.get("SUPABASE_URL");if(!url)throw Error("supabase_url_missing");return createClient(url,serviceKey(),{auth:{persistSession:false,autoRefreshToken:false}})}
async function hash(v:string){const d=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(v));return[...new Uint8Array(d)].map(x=>x.toString(16).padStart(2,"0")).join("")}
function nr(v:any){const x=L(v).replace(/[-\s]+/g,"_").replace(/[^a-z0-9_]/g,"");if(x==="admin"||x.includes("administrator"))return"admin";if(x.includes("pimpinan")||x.includes("kepala_sekolah")||x==="kepsek")return"pimpinan";if(x.includes("kabid_akademik")||x==="akademik"||x.includes("academic"))return"akademik";return x}
async function auth(s:any,req:Request,b:any){const tok=T(req.headers.get("x-session-token")||b.session_token);if(!tok)return null;const {data:ss}=await s.from("user_sessions").select("user_account_id,expires_at,revoked_at").eq("token_hash",await hash(tok)).maybeSingle();if(!ss||ss.revoked_at||!ss.expires_at||new Date(ss.expires_at).getTime()<=Date.now())return null;const {data:a}=await s.from("user_accounts").select("id,teacher_id,username,status").eq("id",ss.user_account_id).maybeSingle();if(!a||ACTIVE_BAD.has(L(a.status)))return null;const roles=new Set<string>();if(L(a.username)==="admin")roles.add("admin");const {data:ar}=await s.from("user_account_roles").select("role_code,role,is_active").eq("user_account_id",a.id).eq("is_active",true);for(const r of ar||[]){const x=nr(r.role_code||r.role);if(x)roles.add(x)}if(a.teacher_id){const {data:ur}=await s.from("user_roles").select("role_code,is_active").eq("teacher_id",a.teacher_id).eq("is_active",true);for(const r of ur||[]){const x=nr(r.role_code);if(x)roles.add(x)}}if(![...roles].some(x=>["admin","pimpinan","akademik"].includes(x)))return{forbidden:true};return{...a,roles:[...roles]}}
function latest(a:string|null,b:any){const x=T(b);return!x?a:(a&&a>=x?a:x)}

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:CORS});
  if(req.method!=="POST")return J({success:false,error:"method_not_allowed"},405);
  let b:any={};try{b=await req.json()}catch{return J({success:false,error:"invalid_json"},400)}
  try{
    const s=db(),a=await auth(s,req,b);if(!a)return J({success:false,error:"session_invalid"},401);if(a.forbidden)return J({success:false,error:"forbidden"},403);
    const semesterNo=Number(b.semester_no||1);if(![1,2].includes(semesterNo))return J({success:false,error:"semester_invalid"},400);
    const {data:unit,error:ue}=await s.from("school_units").select("id").eq("code","SD").maybeSingle();if(ue||!unit)throw Error("school_unit_not_found");
    let yq=s.from("academic_years").select("id,name,is_active").eq("school_unit_id",unit.id);if(T(b.academic_year))yq=yq.eq("name",T(b.academic_year));else yq=yq.eq("is_active",true);const {data:yr,error:ye}=await yq.order("created_at",{ascending:false}).limit(1).maybeSingle();if(ye||!yr)throw Error("academic_year_not_found");
    const yearId=yr.id;
    const [cq,eq]=await Promise.all([
      s.from("classes").select("id,name,code,grade_level").eq("academic_year_id",yearId).eq("is_active",true),
      s.from("student_enrollments").select("student_id,class_id").eq("academic_year_id",yearId).eq("semester_no",semesterNo).eq("is_active",true)
    ]);if(cq.error)throw cq.error;if(eq.error)throw eq.error;
    const classes=(cq.data||[]).sort((x:any,y:any)=>Number(x.grade_level)-Number(y.grade_level)||T(x.name).localeCompare(T(y.name),"id",{numeric:true}));
    const classIds=classes.map((x:any)=>T(x.id)).filter(Boolean);
    const roster=new Map<string,Set<string>>();for(const e of eq.data||[]){const cid=T(e.class_id),sid=T(e.student_id);if(!cid||!sid)continue;if(!roster.has(cid))roster.set(cid,new Set());roster.get(cid)!.add(sid)}
    let rows:any[]=[];if(classIds.length){const {data,error}=await s.from("attendance_report_finalization").select("class_id,student_id,period_start,period_end,validation_status,validated_at,updated_at").eq("academic_year_id",yearId).eq("semester_no",semesterNo).in("class_id",classIds);if(error)throw error;rows=data||[]}
    const groups=new Map<string,any>();for(const r of rows){const cid=T(r.class_id),sid=T(r.student_id);if(!roster.get(cid)?.has(sid)||L(r.validation_status)!=="validated")continue;const ps=T(r.period_start),pe=T(r.period_end),k=`${cid}|${ps}|${pe}`;if(!groups.has(k))groups.set(k,{class_id:cid,period_start:ps,period_end:pe,students:new Set<string>(),last_update:null});const g=groups.get(k);g.students.add(sid);g.last_update=latest(g.last_update,r.updated_at||r.validated_at)}
    const latestByClass=new Map<string,any>();for(const g of groups.values()){const old=latestByClass.get(g.class_id);const stamp=T(g.last_update)||`${g.period_end}T23:59:59`;const oldStamp=old?(T(old.last_update)||`${old.period_end}T23:59:59`):"";if(!old||stamp>oldStamp)latestByClass.set(g.class_id,g)}
    const out=classes.map((cl:any)=>{const cid=T(cl.id),total=roster.get(cid)?.size||0,g=latestByClass.get(cid),completeStudents=g?.students?.size||0,complete=total>0&&completeStudents>=total;return{class_id:cid,class_name:T(cl.name)||T(cl.code),total_students:total,complete_students:completeStudents,complete,status:complete?"lengkap":completeStudents>0?"sebagian":"belum_diisi",period_start:g?.period_start||null,period_end:g?.period_end||null,last_update:g?.last_update||null,source_mode:"editable"}});
    return J({success:true,academic_year:yr.name,semester_no:semesterNo,generated_at:new Date().toISOString(),classes:out,summary:{classes:out.length,complete_classes:out.filter((x:any)=>x.complete).length}});
  }catch(e){console.error("academic-attendance-readiness",e);return J({success:false,error:T((e as any)?.message)||"server_error"},500)}
});
