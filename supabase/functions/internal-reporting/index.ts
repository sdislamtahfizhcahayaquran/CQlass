import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

const CORS={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type, x-session-token","Access-Control-Allow-Methods":"POST, OPTIONS"};
const BUCKET="internal-report-photos";
const MAX_BYTES=4*1024*1024;
const ALLOWED=new Set(["image/jpeg","image/png","image/webp"]);
const j=(body:any,status=200)=>new Response(JSON.stringify(body),{status,headers:{...CORS,"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}});
const t=(v:any)=>String(v??"").trim();
const lo=(v:any)=>t(v).toLowerCase();
function nr(v:any){
  const s=lo(v).replace(/[-\s]+/g,"_").replace(/[^a-z0-9_]/g,"");
  if(!s)return"";
  if(s==="admin"||s.includes("administrator"))return"admin";
  if(s.includes("pimpinan")||s.includes("kepala_sekolah")||s==="kepsek")return"pimpinan";
  if(s==="hrd"||s.includes("human_resource"))return"hrd";
  if(s.includes("kabid_kesiswaan")||s==="kesiswaan"||s.includes("student_affair"))return"kesiswaan";
  if(s.includes("kabid_akademik")||s==="akademik")return"akademik";
  if(s.includes("kabid_tahfizh")||s==="tahfizh")return"tahfizh";
  if(s.includes("kabid_kegiatan")||s==="kegiatan")return"kegiatan";
  if(s.includes("walas")||s.includes("wali_kelas")||s.includes("homeroom"))return"walas";
  if(s==="guru"||s.includes("teacher")||s.includes("pengajar"))return"guru";
  return s;
}
function serviceKey(){const packed=Deno.env.get("SUPABASE_SECRET_KEYS");if(packed){try{const x=JSON.parse(packed);if(x?.default)return String(x.default)}catch{}}const k=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||Deno.env.get("SUPABASE_SECRET_KEY");if(!k)throw new Error("service_key_missing");return k}
function db(){const u=Deno.env.get("SUPABASE_URL");if(!u)throw new Error("supabase_url_missing");return createClient(u,serviceKey(),{auth:{persistSession:false,autoRefreshToken:false}})}
async function sha256(s:string){const d=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s));return [...new Uint8Array(d)].map(b=>b.toString(16).padStart(2,"0")).join("")}
async function auth(s:any,req:Request,b:any){const token=t(req.headers.get("x-session-token")||b?.session_token||b?.sessionToken);if(!token)return null;const{data:ss}=await s.from("user_sessions").select("*").eq("token_hash",await sha256(token)).maybeSingle();if(!ss||ss.revoked_at||!ss.expires_at||new Date(ss.expires_at).getTime()<=Date.now())return null;const{data:account}=await s.from("user_accounts").select("*").eq("id",ss.user_account_id).maybeSingle();if(!account||["nonaktif","inactive","disabled","blocked","blokir"].includes(lo(account.status)))return null;return{account,session:ss}}
async function rolesFor(s:any,account:any){const roles:string[]=[];if(lo(account?.username)==="admin")roles.push("admin");const{data:rows,error}=await s.from("user_account_roles").select("role_code,role,is_active").eq("user_account_id",account.id).eq("is_active",true);if(error)throw error;for(const r of rows||[]){const n=nr(r.role_code||r.role);if(n)roles.push(n)}if(account.teacher_id){roles.push("guru");const{data:wa,error:we}=await s.from("report_class_assignments").select("class_id").eq("homeroom_teacher_id",account.teacher_id).order("updated_at",{ascending:false}).limit(1);if(we)throw we;if(wa?.length)roles.push("walas")}return[...new Set(roles.filter(Boolean))]}
async function reporterMeta(s:any,account:any){let name=t(account.username)||"Pengguna",kelas="";if(account.teacher_id){const[{data:teacher,error:te},{data:wa,error:we}]=await Promise.all([s.from("teachers").select("full_name").eq("id",account.teacher_id).maybeSingle(),s.from("report_class_assignments").select("class_id").eq("homeroom_teacher_id",account.teacher_id).order("updated_at",{ascending:false}).limit(1)]);if(te)throw te;if(we)throw we;if(teacher?.full_name)name=t(teacher.full_name);const classId=wa?.[0]?.class_id;if(classId){const{data:c,error:ce}=await s.from("classes").select("name,code").eq("id",classId).maybeSingle();if(ce)throw ce;kelas=t(c?.name||c?.code)}}return{name,kelas}}
function decodeBase64(v:string){const raw=atob(v),bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);return bytes}
async function uploadPhoto(s:any,accountId:string,b64:string,mime:string){const bytes=decodeBase64(b64);if(bytes.byteLength>MAX_BYTES)throw new Error("photo_too_large");if(!ALLOWED.has(mime))throw new Error("photo_type_invalid");const ext=mime==="image/png"?"png":mime==="image/webp"?"webp":"jpg",now=new Date(),folder=`${now.getUTCFullYear()}-${String(now.getUTCMonth()+1).padStart(2,"0")}`,path=`${accountId}/${folder}/${crypto.randomUUID()}.${ext}`;const{error}=await s.storage.from(BUCKET).upload(path,bytes,{contentType:mime,upsert:false,cacheControl:"3600"});if(error)throw error;return path}
async function signedPhoto(s:any,path:any){const p=t(path);if(!p)return"";const{data,error}=await s.storage.from(BUCKET).createSignedUrl(p,3600);if(error)return"";return data?.signedUrl||""}
async function addSignedPhotos(s:any,rows:any[]){return await Promise.all((rows||[]).map(async r=>({...r,photo_signed_url:await signedPhoto(s,r.photo_url)})))}
function canHandle(roles:string[],type:string){if(roles.includes("admin")||roles.includes("pimpinan"))return true;if(type==="SAPRAS")return roles.includes("sapras");if(type==="SARAN_MASUKAN")return roles.includes("kesiswaan");return false}
function ticketPrefix(type:string){return type==="SAPRAS"?"SPR":"SMN"}
function makeTicket(type:string){const d=new Date(),y=String(d.getUTCFullYear()),m=String(d.getUTCMonth()+1).padStart(2,"0"),day=String(d.getUTCDate()).padStart(2,"0"),tail=crypto.randomUUID().replace(/-/g,"").slice(0,5).toUpperCase();return`${ticketPrefix(type)}-${y}${m}${day}-${tail}`}
async function notify(payload:any){try{const u=Deno.env.get("SUPABASE_URL");if(!u)return{success:false,error:"supabase_url_missing"};const r=await fetch(`${u}/functions/v1/notifications`,{method:"POST",headers:{"Content-Type":"application/json","apikey":serviceKey()},body:JSON.stringify(payload)});const d=await r.json().catch(()=>({}));if(!r.ok||d?.success===false)console.warn("internal-report notification failed",r.status,d?.error||"");return d}catch(e){console.warn("internal-report notification error",e instanceof Error?e.message:String(e));return{success:false,error:"notification_failed"}}}
function reportPreview(description:string,max=105){const clean=t(description).replace(/\s+/g," ");return clean.length>max?clean.slice(0,max-1)+"…":clean}

Deno.serve(async req=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:CORS});
  if(req.method!=="POST")return j({success:false,error:"method_not_allowed"},405);
  let b:any={};try{b=await req.json()}catch{return j({success:false,error:"invalid_json"},400)}
  try{
    const s=db(),me=await auth(s,req,b);if(!me)return j({success:false,error:"forbidden"},403);
    const roles=await rolesFor(s,me.account),action=lo(b.action||"mine");
    if(action==="create"){
      // Tombol CS (cs-whatsapp.js): semua user yang login boleh mengirim laporan/masukan.
      const type=String(b.report_type||b.reportType||"").toUpperCase();if(!["SAPRAS","SARAN_MASUKAN"].includes(type))return j({success:false,error:"invalid_report_type"},400);
      const description=t(b.description).slice(0,4000),requested=t(b.requested_action||b.requestedAction).slice(0,2000);if(description.length<5)return j({success:false,error:"description_required"},400);
      const photoBase64=t(b.photo_base64||b.photoBase64),photoMime=lo(b.photo_mime||b.photoMime||"image/jpeg");
      let photoPath:string|null=null;if(photoBase64)photoPath=await uploadPhoto(s,me.account.id,photoBase64,photoMime);const meta=await reporterMeta(s,me.account);
      const location=t(b.location).slice(0,200)||meta.kelas||null;
      const row={ticket_no:makeTicket(type),report_type:type,reporter_account_id:me.account.id,location,description,requested_action:requested,photo_url:photoPath,status:"DILAPORKAN",handler_account_id:null,created_at:new Date().toISOString(),updated_at:new Date().toISOString()};
      const{data,error}=await s.from("internal_reports").insert(row).select("*").single();if(error){if(photoPath)await s.storage.from(BUCKET).remove([photoPath]);throw error}
      const targetRole=type==="SAPRAS"?"sapras":"kesiswaan",title=type==="SAPRAS"?"Laporan Sapras Baru":"Saran & Masukan Baru",who=`${meta.name}${meta.kelas?` · ${meta.kelas}`:""}`;
      await notify({action:"send_to_role",role:targetRole,title,body:`${who}: ${reportPreview(description)}`,type:type==="SAPRAS"?"internal_report_sapras":"internal_report_feedback",priority:"high",target_url:"./",reference_type:"internal_report",reference_id:data.id});
      return j({success:true,report:{...data,reporter_name:meta.name,photo_signed_url:await signedPhoto(s,data.photo_url)}});
    }
    if(action==="mine"){
      const{data,error}=await s.from("internal_reports").select("*").eq("reporter_account_id",me.account.id).order("created_at",{ascending:false}).limit(100);if(error)throw error;return j({success:true,reports:await addSignedPhotos(s,data||[])});
    }
    if(action==="inbox"){
      const allowedTypes:string[]=[];if(roles.includes("sapras")||roles.includes("admin")||roles.includes("pimpinan"))allowedTypes.push("SAPRAS");if(roles.includes("kesiswaan")||roles.includes("admin")||roles.includes("pimpinan"))allowedTypes.push("SARAN_MASUKAN");if(!allowedTypes.length)return j({success:false,error:"forbidden",roles},403);
      const requestedType=String(b.report_type||b.reportType||"").toUpperCase(),types=requestedType&&allowedTypes.includes(requestedType)?[requestedType]:allowedTypes;
      const limit=Math.min(Math.max(Number(b.limit)||200,1),1000);
      let q=s.from("internal_reports").select("*").in("report_type",types);const start=t(b.start),end=t(b.end);if(/^\d{4}-\d{2}-\d{2}$/.test(start))q=q.gte("created_at",`${start}T00:00:00+07:00`);if(/^\d{4}-\d{2}-\d{2}$/.test(end))q=q.lte("created_at",`${end}T23:59:59.999+07:00`);
      const{data,error}=await q.order("created_at",{ascending:false}).limit(limit);if(error)throw error;const rows=data||[],ids=[...new Set(rows.map((r:any)=>r.reporter_account_id).filter(Boolean))],reporters:any={};
      if(ids.length){const{data:accounts,error:ae}=await s.from("user_accounts").select("id,username,teacher_id").in("id",ids);if(ae)throw ae;const tids=[...new Set((accounts||[]).map((a:any)=>a.teacher_id).filter(Boolean))],teachers:any={};if(tids.length){const{data:ts,error:te}=await s.from("teachers").select("id,full_name").in("id",tids);if(te)throw te;for(const x of ts||[])teachers[x.id]=x.full_name}for(const a of accounts||[])reporters[a.id]={name:t(teachers[a.teacher_id]||a.username)||"Pengguna",username:a.username}}
      const signed=await addSignedPhotos(s,rows);return j({success:true,roles,report_types:types,reports:signed.map((r:any)=>({...r,reporter_name:reporters[r.reporter_account_id]?.name||"Pengguna",reporter_username:reporters[r.reporter_account_id]?.username||""}))});
    }
    if(action==="update_status"){
      const id=t(b.id||b.report_id||b.reportId),status=String(b.status||"").toUpperCase();if(!id||!["DIPROSES","SELESAI"].includes(status))return j({success:false,error:"invalid_parameter"},400);
      const{data:row,error:readErr}=await s.from("internal_reports").select("*").eq("id",id).maybeSingle();if(readErr||!row)return j({success:false,error:"not_found"},404);if(!canHandle(roles,row.report_type))return j({success:false,error:"forbidden",roles},403);const current=String(row.status||"").toUpperCase();if(current==="SELESAI"&&status!=="SELESAI")return j({success:false,error:"already_resolved"},409);
      const patch:any={status,handler_account_id:me.account.id,updated_at:new Date().toISOString()};if(status==="SELESAI"){patch.resolved_at=new Date().toISOString();const note=t(b.resolution_note||b.resolutionNote);if(note)patch.resolution_note=note}
      const{data,error}=await s.from("internal_reports").update(patch).eq("id",id).select("*").single();if(error)throw error;const statusText=status==="SELESAI"?"selesai ditangani":"sedang diproses",title=status==="SELESAI"?"Laporan Selesai":"Laporan Diproses",note=t(data.resolution_note);
      await notify({action:"send_to_accounts",account_ids:[row.reporter_account_id],title,body:`${data.ticket_no}: laporan Anda ${statusText}.${note?` ${reportPreview(note,90)}`:""}`,type:"internal_report_status",priority:"normal",target_url:"./",reference_type:"internal_report",reference_id:data.id});
      return j({success:true,report:data});
    }
    return j({success:false,error:"unknown_action"},400);
  }catch(e){console.error("internal-reporting",e);const msg=e instanceof Error?e.message:String(e);if(msg==="photo_too_large")return j({success:false,error:msg},413);if(msg==="photo_type_invalid")return j({success:false,error:msg},400);return j({success:false,error:"server_error",message:msg},500)}
});
