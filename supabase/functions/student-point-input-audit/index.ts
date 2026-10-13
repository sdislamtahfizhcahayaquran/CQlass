import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";
const CORS={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type, x-session-token","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(b:any,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{...CORS,"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}});
const t=(v:any)=>String(v??"").trim(),low=(v:any)=>t(v).toLowerCase();
function serviceKey(){const packed=Deno.env.get("SUPABASE_SECRET_KEYS");if(packed){try{const p=JSON.parse(packed);if(p?.default)return String(p.default)}catch{}}const k=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||Deno.env.get("SUPABASE_SECRET_KEY");if(!k)throw Error("service_key_missing");return k}
function db(){const u=Deno.env.get("SUPABASE_URL");if(!u)throw Error("supabase_url_missing");return createClient(u,serviceKey(),{auth:{persistSession:false,autoRefreshToken:false}})}
async function sha256(s:string){const d=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s));return [...new Uint8Array(d)].map(b=>b.toString(16).padStart(2,"0")).join("")}
function roleFrom(v:any){const x=low(v).replace(/[-\s]+/g,"_").replace(/[^a-z0-9_]/g,"");if(!x)return"";if(x==="admin"||x.includes("administrator"))return"admin";if(x.includes("pimpinan")||x.includes("kepala_sekolah")||x==="kepsek")return"pimpinan";if(x.includes("kabid_kesiswaan")||x==="kesiswaan"||x.includes("student_affair"))return"kesiswaan";return""}
async function auth(s:any,req:Request,body:any){const token=t(req.headers.get("x-session-token")||body.session_token);if(!token)return null;const{data:ss}=await s.from("user_sessions").select("user_account_id,expires_at,revoked_at").eq("token_hash",await sha256(token)).maybeSingle();if(!ss||ss.revoked_at||!ss.expires_at||new Date(ss.expires_at).getTime()<=Date.now())return null;const{data:a}=await s.from("user_accounts").select("id,teacher_id,username,status").eq("id",ss.user_account_id).maybeSingle();if(!a||["nonaktif","inactive","disabled","blocked"].includes(low(a.status)))return null;const roles:string[]=[];if(low(a.username)==="admin")roles.push("admin");const{data:rr}=await s.from("user_account_roles").select("role_code,role,is_active").eq("user_account_id",a.id).eq("is_active",true);for(const r of rr||[]){const q=roleFrom(r.role_code||r.role);if(q)roles.push(q)}if(!roles.some(x=>["kesiswaan","pimpinan","admin"].includes(x)))return null;return a}
function ymdToday(){const f=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Jakarta",year:"numeric",month:"2-digit",day:"2-digit"});return f.format(new Date())}
function schoolDays(start:string,end:string){const out:string[]=[];let d=new Date(start+"T00:00:00Z"),z=new Date(end+"T00:00:00Z");while(d<=z){const day=d.getUTCDay();if(day>=1&&day<=5)out.push(d.toISOString().slice(0,10));d.setUTCDate(d.getUTCDate()+1)}return out}

async function daily(s:any,req:Request,body:any){
 const token=t(req.headers.get("x-session-token")||body.session_token);
 if(!token)return json({success:false,error:"unauthorized"},401);
 const {data:ss,error:se}=await s.from("user_sessions").select("user_account_id,expires_at,revoked_at").eq("token_hash",await sha256(token)).maybeSingle();
 if(se||!ss||ss.revoked_at||!ss.expires_at||new Date(ss.expires_at).getTime()<=Date.now())return json({success:false,error:"unauthorized"},401);
 const {data:account,error:ae}=await s.from("user_accounts").select("id,teacher_id,username,status").eq("id",ss.user_account_id).maybeSingle();
 if(ae||!account||["nonaktif","inactive","disabled","blocked"].includes(low(account.status)))return json({success:false,error:"forbidden"},403);
 const {data:roles,error:re}=await s.from("user_account_roles").select("role_code,role,is_active").eq("user_account_id",account.id).eq("is_active",true);
 if(re)throw re;
 const allowed=(roles||[]).some((r:any)=>["kesiswaan","kabid_kesiswaan","admin","pimpinan"].includes(low(r.role_code||r.role).replace(/[ -]/g,"_")))||low(account.username)==="admin";
 const date=ymdToday();
 const {data:yr,error:ye}=await s.from("academic_years").select("id").eq("is_active",true).maybeSingle();
 const {data:sem,error:sme}=await s.from("semesters").select("semester_no").eq("is_active",true).maybeSingle();
 if(ye||sme||!yr||!sem)throw Error("active_period_missing");
 const {data:assigned,error:assErr}=await s.from("report_class_assignments").select("class_id,homeroom_teacher_id").eq("academic_year_id",yr.id).eq("semester_no",sem.semester_no);
 if(assErr)throw assErr;
 const classIds=[...new Set((assigned||[]).map((x:any)=>x.class_id))];
 async function getCounts(cid:string,d:string){
  const [{count:viol,error:ve},{count:reward,error:rwe},{data:sessions,error:me}]=await Promise.all([
   s.from("discipline_incidents").select("id",{count:"exact",head:true}).eq("class_id",cid).eq("incident_date",d).eq("is_deleted",false),
   s.from("student_rewards").select("id",{count:"exact",head:true}).eq("class_id",cid).eq("reward_date",d).eq("is_deleted",false).eq("is_verified",true),
   s.from("morning_talk_sessions").select("id").eq("class_id",cid).eq("attendance_date",d)]);
  if(ve||rwe||me)throw(ve||rwe||me);
  let late=0;
  if((sessions||[]).length){
   const {count,error}=await s.from("morning_talk_attendance").select("id",{count:"exact",head:true}).in("session_id",(sessions||[]).map((z:any)=>z.id)).in("status",["late","terlambat"]);
   if(error)throw error;late=count||0;
  }
  return {violation:viol||0,reward:reward||0,late};
 }
 if(body.action==="daily_summary"){
  if(!allowed)return json({success:false,error:"forbidden"},403);
  const day=t(body.date)||date;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||day>date)return json({success:false,error:"invalid_date"},400);
  if(!classIds.length)return json({success:true,date:day,rows:[]});
  const [{data:classes,error:ce},{data:checks,error:che},{data:viol,error:vie},{data:rew,error:rwe}]=await Promise.all([
   s.from("classes").select("id,name").in("id",classIds),
   s.from("walas_daily_point_verifications").select("class_id,violation_status,reward_status,confirmed_at").eq("report_date",day),
   s.from("discipline_incidents").select("class_id").in("class_id",classIds).eq("incident_date",day).eq("is_deleted",false),
   s.from("student_rewards").select("class_id").in("class_id",classIds).eq("reward_date",day).eq("is_deleted",false).eq("is_verified",true)]);
  if(ce||che||vie||rwe)throw(ce||che||vie||rwe);
  const names=new Map((classes||[]).map((x:any)=>[x.id,x.name])),confirmed=new Map((checks||[]).map((x:any)=>[x.class_id,x]));
  const violations=new Map(),rewards=new Map();
  for(const x of viol||[])violations.set(x.class_id,(violations.get(x.class_id)||0)+1);
  for(const x of rew||[])rewards.set(x.class_id,(rewards.get(x.class_id)||0)+1);
  return json({success:true,date:day,rows:(assigned||[]).map((x:any)=>{
   const check:any=confirmed.get(x.class_id),v=violations.get(x.class_id)||0,r=rewards.get(x.class_id)||0;
   const mismatch=!!check&&((check.violation_status==="nihil"&&v>0)||(check.reward_status==="nihil"&&r>0)||(check.violation_status==="ada"&&v===0)||(check.reward_status==="ada"&&r===0));
   return {class_id:x.class_id,class_name:names.get(x.class_id)||"-",violation_count:v,reward_count:r,violation_status:check?.violation_status||null,reward_status:check?.reward_status||null,confirmed_at:check?.confirmed_at||null,status:!check?"belum_lapor":mismatch?"perlu_verifikasi":"lengkap"}
  })});
 }
 const mine=(assigned||[]).filter((x:any)=>x.homeroom_teacher_id===account.teacher_id);
 const cid=t(body.class_id)||t(mine[0]?.class_id);
 if(!cid||!mine.some((x:any)=>x.class_id===cid))return json({success:false,error:"not_assigned_homeroom"},403);
 if(body.action==="daily_confirm"){
  if(body.checked!==true)return json({success:false,error:"confirmation_required"},400);
  const vs=t(body.violation_status),rs=t(body.reward_status);
  if(!["nihil","ada"].includes(vs)||!["nihil","ada"].includes(rs))return json({success:false,error:"invalid_status"},400);
  const counts=await getCounts(cid,date);
  if((vs==="nihil"&&(counts.violation>0||counts.late>0))||(vs==="ada"&&counts.violation===0&&counts.late===0)||(rs==="nihil"&&counts.reward>0)||(rs==="ada"&&counts.reward===0))
   return json({success:false,error:"status_conflicts_with_records",counts},409);
  const {error}=await s.from("walas_daily_point_verifications").upsert({class_id:cid,teacher_id:account.teacher_id,report_date:date,violation_status:vs,reward_status:rs,confirmed_by_account_id:account.id,confirmed_at:new Date().toISOString(),updated_at:new Date().toISOString()},{onConflict:"class_id,report_date"});
  if(error)throw error;
  return json({success:true,date,counts,status:"lengkap"});
 }
 const [{data:cl,error:cle},{data:confirmation,error:che}]=await Promise.all([
  s.from("classes").select("name").eq("id",cid).maybeSingle(),
  s.from("walas_daily_point_verifications").select("violation_status,reward_status,confirmed_at").eq("class_id",cid).eq("report_date",date).maybeSingle()]);
 if(cle||che)throw(cle||che);
 const counts=await getCounts(cid,date);
 const {count:expected,error:ee}=await s.from("student_enrollments").select("student_id",{count:"exact",head:true}).eq("class_id",cid);
 if(ee)throw ee;
 const {data:sessions,error:sessErr}=await s.from("morning_talk_sessions").select("id").eq("class_id",cid).eq("attendance_date",date);
 if(sessErr)throw sessErr;
 let marked=0;
 if((sessions||[]).length){
   const {data:marks,error:marksErr}=await s.from("morning_talk_attendance").select("student_id").in("session_id",(sessions||[]).map((x:any)=>x.id));
   if(marksErr)throw marksErr;
   marked=new Set((marks||[]).map((x:any)=>x.student_id)).size;
 }
 const attendance_complete=!!expected&&marked>=expected;
 const bad=confirmation&&((confirmation.violation_status==="nihil"&&(counts.violation>0||counts.late>0))||(confirmation.violation_status==="ada"&&!(counts.violation||counts.late))||(confirmation.reward_status==="nihil"&&counts.reward>0)||(confirmation.reward_status==="ada"&&!counts.reward));
 const discipline_complete=counts.violation>0||counts.late>0||!!(confirmation&&!bad);
 const reward_complete=counts.reward>0||!!(confirmation&&!bad);
 return json({success:true,date,class_id:cid,class_name:cl?.name||"-",classes:mine.map((x:any)=>x.class_id),counts,confirmation:confirmation||null,completion:{attendance:attendance_complete,attendance_marked:marked,attendance_expected:expected||0,discipline:discipline_complete,reward:reward_complete,monitoring:!!(confirmation&&!bad)||(attendance_complete&&(counts.violation>0||counts.late>0)&&counts.reward>0)}});
}

Deno.serve(async req=>{if(req.method==="OPTIONS")return new Response("ok",{headers:CORS});if(req.method!=="POST")return json({success:false,error:"method_not_allowed"},405);let body:any={};try{body=await req.json()}catch{return json({success:false,error:"invalid_json"},400)}try{const s=db();if(['daily_get','daily_confirm','daily_summary'].includes(t(body.action)))return await daily(s,req,body);const me=await auth(s,req,body);if(!me)return json({success:false,error:"forbidden"},403);let start=t(body.start_date),end=t(body.end_date)||ymdToday();if(!start){const d=new Date(end+"T00:00:00Z");d.setUTCDate(d.getUTCDate()-6);start=d.toISOString().slice(0,10)}if(!/^\d{4}-\d{2}-\d{2}$/.test(start)||!/^\d{4}-\d{2}-\d{2}$/.test(end)||start>end||end>ymdToday())return json({success:false,error:"invalid_date_range"},400);const days=schoolDays(start,end);
const[{data:year},{data:sem}]=await Promise.all([s.from("academic_years").select("id").eq("is_active",true).maybeSingle(),s.from("semesters").select("academic_year_id,semester_no").eq("is_active",true).maybeSingle()]);if(!year||!sem)return json({success:false,error:"active_period_missing"},500);
const[{data:walas,error:we},{data:tahfizh,error:te}]=await Promise.all([s.from("report_class_assignments").select("homeroom_teacher_id").eq("academic_year_id",year.id).eq("semester_no",sem.semester_no),s.from("tahfizh_teacher_assignments").select("teacher_id").eq("academic_year_id",year.id).eq("semester_no",sem.semester_no).eq("is_active",true)]);if(we)throw we;if(te)throw te;
const assigned:any={};for(const x of walas||[]){const id=t(x.homeroom_teacher_id);if(id)(assigned[id]??=new Set()).add("walas")}for(const x of tahfizh||[]){const id=t(x.teacher_id);if(id)(assigned[id]??=new Set()).add("tahfizh")};const teacherIds=Object.keys(assigned);if(!teacherIds.length)return json({success:true,start_date:start,end_date:end,school_days:days,rows:[],summary:{teachers:0,never_both:0,total_missing_days:0}});
const[{data:teachers,error:tErr},{data:accounts,error:aErr}]=await Promise.all([s.from("teachers").select("id,full_name,status").in("id",teacherIds),s.from("user_accounts").select("id,teacher_id,username,status").in("teacher_id",teacherIds)]);if(tErr)throw tErr;if(aErr)throw aErr;const tm:any={};for(const x of teachers||[])tm[x.id]=x;const am:any={};for(const a of accounts||[]){if(!["nonaktif","inactive","disabled","blocked"].includes(low(a.status)))am[a.teacher_id]=a}
const accountIds=Object.values(am).map((a:any)=>a.id);const[{data:v,error:ve},{data:r,error:re}]=await Promise.all([accountIds.length?s.from("discipline_incidents").select("incident_date,created_by_account_id").in("created_by_account_id",accountIds).gte("incident_date",start).lte("incident_date",end).eq("is_deleted",false):Promise.resolve({data:[],error:null}),accountIds.length?s.from("student_rewards").select("reward_date,verified_by_account_id").in("verified_by_account_id",accountIds).gte("reward_date",start).lte("reward_date",end).eq("is_deleted",false).eq("is_verified",true):Promise.resolve({data:[],error:null})]);if(ve)throw ve;if(re)throw re;const vm:any={},rm:any={};for(const x of v||[])(vm[t(x.created_by_account_id)]??=new Set()).add(t(x.incident_date));for(const x of r||[])(rm[t(x.verified_by_account_id)]??=new Set()).add(t(x.reward_date));
const classByTeacher:any={};for(const x of walas||[]){const id=t(x.homeroom_teacher_id);if(id)(classByTeacher[id]??=new Set()).add(t(x.class_id))}
const classIds=[...new Set((walas||[]).map((x:any)=>t(x.class_id)).filter(Boolean))];
let checks:any[]=[],inc:any[]=[],rew:any[]=[];
if(classIds.length){const [a,b,c]=await Promise.all([
s.from("walas_daily_point_verifications").select("teacher_id,class_id,report_date,violation_status,reward_status").gte("report_date",start).lte("report_date",end).in("class_id",classIds),
s.from("discipline_incidents").select("class_id,incident_date").gte("incident_date",start).lte("incident_date",end).in("class_id",classIds).eq("is_deleted",false),
s.from("student_rewards").select("class_id,reward_date").gte("reward_date",start).lte("reward_date",end).in("class_id",classIds).eq("is_deleted",false).eq("is_verified",true)]);
if(a.error||b.error||c.error)throw(a.error||b.error||c.error);checks=a.data||[];inc=b.data||[];rew=c.data||[];}
const classV=new Set(inc.map((x:any)=>t(x.class_id)+"|"+t(x.incident_date)));
const classR=new Set(rew.map((x:any)=>t(x.class_id)+"|"+t(x.reward_date)));
const confirmedV:any={},confirmedR:any={};
for(const x of checks){const id=t(x.teacher_id),cid=t(x.class_id),day=t(x.report_date);if(!classByTeacher[id]?.has(cid))continue;
const v=classV.has(cid+"|"+day),r=classR.has(cid+"|"+day);
if((x.violation_status==="nihil"&&!v)||(x.violation_status==="ada"&&v))(confirmedV[id]??=new Set()).add(day);
if((x.reward_status==="nihil"&&!r)||(x.reward_status==="ada"&&r))(confirmedR[id]??=new Set()).add(day);}
const rows=teacherIds.filter(id=>tm[id]&&!["nonaktif","inactive","disabled"].includes(low(tm[id].status))).map(id=>{const a=am[id],aid=t(a?.id),vd=new Set([...(aid?(vm[aid]||new Set()):new Set()),...(confirmedV[id]||new Set())]),rd=new Set([...(aid?(rm[aid]||new Set()):new Set()),...(confirmedR[id]||new Set())]),missingViolation=days.filter(d=>!vd.has(d)),missingReward=days.filter(d=>!rd.has(d)),missingBoth=days.filter(d=>!vd.has(d)&&!rd.has(d));return{account_id:aid||null,teacher_id:id,name:t(tm[id]?.full_name)||t(a?.username)||"-",username:t(a?.username)||"—",roles:[...assigned[id]],account_status:a?"active":"account_missing",confirmed_both_days:days.filter(d=>confirmedV[id]?.has(d)&&confirmedR[id]?.has(d)).length,confirmed_both_dates:days.filter(d=>confirmedV[id]?.has(d)&&confirmedR[id]?.has(d)),violation_input_days:days.length-missingViolation.length,reward_input_days:days.length-missingReward.length,missing_violation_days:missingViolation.length,missing_reward_days:missingReward.length,missing_both_days:missingBoth.length,missing_both_dates:missingBoth,last_violation_date:[...vd].sort().pop()||null,last_reward_date:[...rd].sort().pop()||null}}).sort((a:any,b:any)=>b.missing_both_days-a.missing_both_days||a.name.localeCompare(b.name,"id"));return json({success:true,start_date:start,end_date:end,school_days:days,rows,summary:{teachers:rows.length,never_both:rows.filter((x:any)=>x.missing_both_days===days.length).length,total_missing_days:rows.reduce((n:number,x:any)=>n+x.missing_both_days,0),account_missing:rows.filter((x:any)=>x.account_status==="account_missing").length}})}catch(e){console.error(e);return json({success:false,error:"server_error",message:e instanceof Error?e.message:String(e)},500)}});