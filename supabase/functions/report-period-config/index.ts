import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const H={
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type, x-session-token",
  "Access-Control-Allow-Methods":"POST, OPTIONS"
};
const J=(b:any,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{...H,"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}});
const T=(v:any)=>String(v??"").trim();
const L=(v:any)=>T(v).toLowerCase();

function serviceKey(){
  const packed=Deno.env.get("SUPABASE_SECRET_KEYS");
  if(packed){try{const x=JSON.parse(packed);if(x?.default)return String(x.default)}catch{}}
  const k=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||Deno.env.get("SUPABASE_SECRET_KEY");
  if(!k)throw Error("service_key_missing");
  return k;
}
const sb=createClient(Deno.env.get("SUPABASE_URL")!,serviceKey(),{auth:{persistSession:false,autoRefreshToken:false}});

async function hash(s:string){
  const d=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map(b=>b.toString(16).padStart(2,"0")).join("");
}
async function auth(req:Request){
  const token=T(req.headers.get("x-session-token"));
  if(!token)return null;
  const {data:ss,error:se}=await sb.from("user_sessions").select("user_account_id,expires_at,revoked_at").eq("token_hash",await hash(token)).maybeSingle();
  if(se)throw se;
  if(!ss||ss.revoked_at||!ss.expires_at||Date.parse(ss.expires_at)<=Date.now())return null;
  const {data:a,error:ae}=await sb.from("user_accounts").select("id,username,status").eq("id",ss.user_account_id).maybeSingle();
  if(ae)throw ae;
  if(!a||["nonaktif","inactive","disabled","blocked"].includes(L(a.status)))return null;
  const {data:roles,error:re}=await sb.from("user_account_roles").select("role_code,role").eq("user_account_id",a.id).eq("is_active",true);
  if(re)throw re;
  const roleCodes=(roles||[]).map((x:any)=>L(x.role_code||x.role)).filter(Boolean);
  return {...a,roles:roleCodes,is_admin:L(a.username)==="admin"||roleCodes.includes("admin")};
}
async function unit(){
  const {data,error}=await sb.from("school_units").select("id,name,code").order("created_at",{ascending:true}).limit(1).maybeSingle();
  if(error)throw error;
  if(!data)throw Error("school_unit_missing");
  return data;
}
function publicType(v:any){return T(v).toUpperCase()==="SEMESTER"||T(v).toUpperCase()==="PAS"?"PAS":"PTS"}
function storageType(v:any){return publicType(v)==="PAS"?"SEMESTER":"PTS"}
function validDate(v:string){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(v))return false;
  const [y,m,d]=v.split("-").map(Number),x=new Date(Date.UTC(y,m-1,d));
  return x.getUTCFullYear()===y&&x.getUTCMonth()===m-1&&x.getUTCDate()===d;
}
async function resolveYear(b:any,u:any){
  const id=T(b.academic_year_id),name=T(b.academic_year);
  if(id){
    const {data,error}=await sb.from("academic_years").select("id,name,is_active").eq("id",id).eq("school_unit_id",u.id).maybeSingle();
    if(error)throw error;
    return data||null;
  }
  if(name){
    const {data,error}=await sb.from("academic_years").select("id,name,is_active").eq("school_unit_id",u.id).eq("name",name).order("created_at",{ascending:false}).limit(1).maybeSingle();
    if(error)throw error;
    return data||null;
  }
  const {data,error}=await sb.from("academic_years").select("id,name,is_active").eq("school_unit_id",u.id).eq("is_active",true).order("created_at",{ascending:false}).limit(1).maybeSingle();
  if(error)throw error;
  return data||null;
}
async function resolveSemester(yearId:string,v:any){
  const requested=Number(v||0);
  if([1,2].includes(requested))return requested;
  const {data,error}=await sb.from("semesters").select("semester_no").eq("academic_year_id",yearId).eq("is_active",true).limit(1).maybeSingle();
  if(error)throw error;
  return [1,2].includes(Number(data?.semester_no))?Number(data.semester_no):1;
}
function serialize(row:any,year:any,semesterNo:number,requestedType:any){
  const configured=!!(row?.data_start_date&&row?.data_end_date&&row?.report_date_gregorian);
  return {
    configured,
    id:row?.id||null,
    academic_year_id:year?.id||null,
    academic_year:year?.name||null,
    semester_no:semesterNo,
    report_type:publicType(requestedType||row?.report_type),
    data_start_date:row?.data_start_date||null,
    data_end_date:row?.data_end_date||null,
    report_date_gregorian:row?.report_date_gregorian||null,
    report_date_hijri:row?.report_date_hijri||null,
    updated_at:row?.updated_at||null
  };
}
async function getConfig(b:any){
  const u=await unit(),year=await resolveYear(b,u);
  if(!year)return J({success:false,error:"academic_year_not_found"},404);
  const semesterNo=await resolveSemester(year.id,b.semester_no);
  const requested=publicType(b.report_type),stored=storageType(requested);
  const {data,error}=await sb.from("report_config")
    .select("id,report_type,data_start_date,data_end_date,report_date_gregorian,report_date_hijri,updated_at,is_active")
    .eq("school_unit_id",u.id).eq("academic_year_id",year.id).eq("semester_no",semesterNo).eq("report_type",stored).maybeSingle();
  if(error)throw error;
  return J({success:true,config:serialize(data,year,semesterNo,requested)});
}
async function listYears(){
  const u=await unit();
  const {data:years,error}=await sb.from("academic_years").select("id,name,is_active,created_at").eq("school_unit_id",u.id).order("created_at",{ascending:false});
  if(error)throw error;
  const ids=(years||[]).map((x:any)=>x.id);let semesters:any[]=[];
  if(ids.length){
    const q=await sb.from("semesters").select("academic_year_id,semester_no,is_active").in("academic_year_id",ids).order("semester_no");
    if(q.error)throw q.error;semesters=q.data||[];
  }
  return J({success:true,years:(years||[]).map((y:any)=>({...y,semesters:semesters.filter((s:any)=>s.academic_year_id===y.id)}))});
}
async function saveConfig(b:any){
  const u=await unit(),year=await resolveYear(b,u);
  if(!year)return J({success:false,error:"academic_year_not_found"},404);
  const semesterNo=Number(b.semester_no),requested=publicType(b.report_type),stored=storageType(requested);
  const start=T(b.data_start_date),end=T(b.data_end_date),greg=T(b.report_date_gregorian),hijri=T(b.report_date_hijri);
  if(![1,2].includes(semesterNo))return J({success:false,error:"semester_invalid"},400);
  if(!validDate(start)||!validDate(end)||!validDate(greg))return J({success:false,error:"date_invalid"},400);
  if(start>end)return J({success:false,error:"date_range_invalid"},400);
  const keys={school_unit_id:u.id,academic_year_id:year.id,semester_no:semesterNo,report_type:stored};
  const {data:existing,error:xe}=await sb.from("report_config").select("id").match(keys).maybeSingle();
  if(xe)throw xe;
  let row:any;
  const patch={data_start_date:start,data_end_date:end,report_date_gregorian:greg,report_date_hijri:hijri||null,is_active:true,updated_at:new Date().toISOString()};
  if(existing?.id){
    const q=await sb.from("report_config").update(patch).eq("id",existing.id).select("id,report_type,data_start_date,data_end_date,report_date_gregorian,report_date_hijri,updated_at,is_active").single();
    if(q.error)throw q.error;row=q.data;
  }else{
    const q=await sb.from("report_config").insert({...keys,...patch}).select("id,report_type,data_start_date,data_end_date,report_date_gregorian,report_date_hijri,updated_at,is_active").single();
    if(q.error)throw q.error;row=q.data;
  }
  return J({success:true,config:serialize(row,year,semesterNo,requested)});
}

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:H});
  if(req.method!=="POST")return J({success:false,error:"method_not_allowed"},405);
  try{
    const user=await auth(req);if(!user)return J({success:false,error:"unauthorized"},401);
    const b=await req.json().catch(()=>({})),action=L(b.action||"get");
    if(action==="get")return await getConfig(b);
    if(action==="years"){if(!user.is_admin)return J({success:false,error:"forbidden"},403);return await listYears()}
    if(action==="save"){if(!user.is_admin)return J({success:false,error:"forbidden"},403);return await saveConfig(b)}
    return J({success:false,error:"unknown_action"},400);
  }catch(e){
    console.error("report-period-config",e);
    return J({success:false,error:T((e as any)?.message)||"internal_error"},500);
  }
});
