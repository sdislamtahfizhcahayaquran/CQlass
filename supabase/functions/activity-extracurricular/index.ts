import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

const url=Deno.env.get("SUPABASE_URL")!;
const key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||Deno.env.get("SUPABASE_SECRET_KEY")!;
const sb=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
const H={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"content-type, apikey, authorization, x-session-token","Access-Control-Allow-Methods":"POST,OPTIONS","Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"};
const reply=(b:any,s=200)=>new Response(JSON.stringify(b),{status:s,headers:H});
const txt=(v:any)=>String(v??"").trim(); const low=(v:any)=>txt(v).toLowerCase();
async function hash(v:string){const d=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(v));return[...new Uint8Array(d)].map(x=>x.toString(16).padStart(2,"0")).join("")}
async function auth(req:Request){const raw=txt(req.headers.get("x-session-token"));if(!raw)return null;const {data:s}=await sb.from("user_sessions").select("user_account_id,expires_at,revoked_at").eq("token_hash",await hash(raw)).maybeSingle();if(!s||s.revoked_at||!s.expires_at||new Date(s.expires_at).getTime()<=Date.now())return null;const {data:a}=await sb.from("user_accounts").select("id,teacher_id,username,status").eq("id",s.user_account_id).maybeSingle();if(!a)return null;const roles:string[]=[];const {data:ar}=await sb.from("user_account_roles").select("role_code,role,is_active").eq("user_account_id",a.id).eq("is_active",true);for(const r of ar||[])roles.push(low(r.role_code||r.role));if(a.teacher_id){const {data:tr}=await sb.from("user_roles").select("role_code,is_active").eq("teacher_id",a.teacher_id).eq("is_active",true);for(const r of tr||[])roles.push(low(r.role_code));}if(low(a.username)==="admin")roles.push("admin");return {...a,roles:[...new Set(roles)]}}
const canView=(a:any)=>a?.roles?.some((r:string)=>["kabid_kegiatan","kegiatan","pimpinan","admin"].includes(r));
const canEdit=(a:any)=>a?.roles?.some((r:string)=>["kabid_kegiatan","kegiatan"].includes(r));
async function period(){const {data:y}=await sb.from("academic_years").select("id,name").eq("is_active",true).order("created_at",{ascending:false}).limit(1).maybeSingle();if(!y)throw Error("academic_year_missing");const {data:s}=await sb.from("semesters").select("semester_no").eq("academic_year_id",y.id).eq("is_active",true).limit(1).maybeSingle();return{academic_year_id:y.id,academic_year:y.name,semester_no:(()=>{const n=Number(s?.semester_no||0);if(![1,2].includes(n))throw Error("active_semester_not_found");return n})()}}
async function fetchInBatches(table:string,select:string,column:string,ids:string[],batchSize=70){const out:any[]=[];const uniq=[...new Set(ids.filter(Boolean))];for(let i=0;i<uniq.length;i+=batchSize){const {data,error}=await sb.from(table).select(select).in(column,uniq.slice(i,i+batchSize));if(error)throw error;out.push(...(data||[]));}return out}
async function roster(p:any){const {data:e,error}=await sb.from("student_enrollments").select("student_id,class_id").eq("academic_year_id",p.academic_year_id).eq("semester_no",p.semester_no).eq("is_active",true);if(error)throw error;const sids=[...new Set((e||[]).map((x:any)=>x.student_id))] as string[];const cids=[...new Set((e||[]).map((x:any)=>x.class_id))] as string[];const [students,classes]=await Promise.all([fetchInBatches("students","id,full_name,nis,nisn,status","id",sids,70),fetchInBatches("classes","id,name,code","id",cids,70)]);const sm=new Map(students.map((x:any)=>[x.id,x]));const cm=new Map(classes.map((x:any)=>[x.id,x]));return(e||[]).map((x:any)=>{const s=sm.get(x.student_id)||{},c=cm.get(x.class_id)||{};return{student_id:x.student_id,name:s.full_name||"-",nis:s.nis||s.nisn||"",class_id:x.class_id,class_name:c.name||c.code||"-"}}).sort((a:any,b:any)=>a.class_name.localeCompare(b.class_name,"id",{numeric:true})||a.name.localeCompare(b.name,"id"))}
async function catalog(p:any){const [eq,aq,mq]=await Promise.all([sb.from("extracurriculars").select("id,name,code,quota,day_text,time_text,is_active").eq("is_active",true).order("name"),sb.from("extracurricular_coach_assignments").select("id,extracurricular_id,class_id,coach_name,assignment_label,is_active,sort_order").eq("is_active",true).order("sort_order"),sb.from("extracurricular_members").select("id,student_id,extracurricular_id,status").eq("academic_year_id",p.academic_year_id)]);for(const q of[eq,aq,mq])if(q.error)throw q.error;const count=new Map<string,Set<string>>();for(const m of mq.data||[]){if(low(m.status)!=="aktif"&&low(m.status)!=="active")continue;if(!count.has(m.extracurricular_id))count.set(m.extracurricular_id,new Set());count.get(m.extracurricular_id)!.add(m.student_id)}const extracurriculars=(eq.data||[]).map((e:any)=>{const active=count.get(e.id)?.size||0,quota=Number(e.quota||0);return{...e,active_students:active,over_quota:quota>0&&active>quota,available_slots:quota>0?quota-active:null}});return{extracurriculars,assignments:aq.data||[]}}
async function externalAssessmentRows(p:any,sids:string[]){
  const out:any[]=[];
  const uniq=[...new Set(sids.filter(Boolean))];
  for(let i=0;i<uniq.length;i+=70){
    const {data,error}=await sb.from("extracurricular_external_assessments")
      .select("external_student_id,student_id,activity_grade,skill_grade,competition_grade,competition_note,assessment_period,updated_at")
      .eq("academic_year_id",p.academic_year_id)
      .eq("semester_no",p.semester_no)
      .eq("assessment_period","PTS")
      .in("student_id",uniq.slice(i,i+70));
    if(error)throw error;
    out.push(...(data||[]));
  }
  return out;
}
async function model(p:any){
  const students=await roster(p);
  const sids=students.map((x:any)=>x.student_id) as string[];
  const assignmentMembersPromise=sids.length?fetchInBatches("extracurricular_assignment_members","id,assignment_id,student_id,is_active","student_id",sids,70):Promise.resolve([]);
  const [im,em,np,amRows,cat,externalAssessments]=await Promise.all([
    sb.from("extracurricular_members").select("id,student_id,extracurricular_id,status,participant_type,notes,updated_at").eq("academic_year_id",p.academic_year_id),
    sb.from("extracurricular_external_students").select("id,student_id,activity_name,institution_name,notes,is_active,updated_at").eq("academic_year_id",p.academic_year_id).eq("semester_no",p.semester_no),
    sb.from("extracurricular_nonparticipants").select("id,student_id,notes,updated_at").eq("academic_year_id",p.academic_year_id).eq("semester_no",p.semester_no),
    assignmentMembersPromise,
    catalog(p),
    sids.length?externalAssessmentRows(p,sids):Promise.resolve([])
  ]);
  for(const q of[im,em,np])if(q.error)throw q.error;
  const ename=new Map(cat.extracurriculars.map((x:any)=>[x.id,x.name]));
  const amap=new Map(cat.assignments.map((x:any)=>[x.id,x]));
  const externalAssessmentMap=new Map<string,any>();
  for(const a of externalAssessments||[]){
    const old=externalAssessmentMap.get(a.external_student_id);
    if(!old||String(a.updated_at||"")>String(old.updated_at||""))externalAssessmentMap.set(a.external_student_id,a);
  }
  const linksByStudent=new Map<string,any[]>();
  for(const x of amRows||[]){
    if(!x.is_active)continue;
    if(!linksByStudent.has(x.student_id))linksByStudent.set(x.student_id,[]);
    linksByStudent.get(x.student_id)!.push(x);
  }
  const byS=new Map<string,any>();
  for(const s of students)byS.set(s.student_id,{...s,internal:[],external:[],none:null});
  for(const m of im.data||[]){
    if(!byS.has(m.student_id)||!["aktif","active"].includes(low(m.status)))continue;
    const links=(linksByStudent.get(m.student_id)||[]).filter((x:any)=>amap.get(x.assignment_id)?.extracurricular_id===m.extracurricular_id);
    const a=links.length?amap.get(links[0].assignment_id):null;
    byS.get(m.student_id).internal.push({
      id:m.id,extracurricular_id:m.extracurricular_id,extracurricular_name:ename.get(m.extracurricular_id)||"Ekskul",
      assignment_id:a?.id||"",group_label:a?.assignment_label||"",coach_name:a?.coach_name||"",notes:m.notes||""
    });
  }
  for(const e of em.data||[]){
    if(!byS.has(e.student_id)||!e.is_active)continue;
    const a=externalAssessmentMap.get(e.id)||{};
    byS.get(e.student_id).external.push({
      id:e.id,activity_name:e.activity_name||"Ekskul Eksternal",institution_name:e.institution_name||"",notes:e.notes||"",
      activity_grade:a.activity_grade||"",skill_grade:a.skill_grade||"",competition_grade:a.competition_grade||"",
      competition_note:a.competition_note||"",assessment_period:a.assessment_period||"",assessment_updated_at:a.updated_at||null
    });
  }
  for(const n of np.data||[]){if(byS.has(n.student_id))byS.get(n.student_id).none={id:n.id,notes:n.notes||""}}
  const rows=[...byS.values()].map((s:any)=>{
    const n=s.internal.length+s.external.length;
    const state=n?"active":s.none?"none":"unknown";
    return{...s,state,activity_count:n}
  });
  const summary={
    total:rows.length,
    internal:rows.filter((x:any)=>x.internal.length).length,
    external:rows.filter((x:any)=>x.external.length).length,
    none:rows.filter((x:any)=>x.state==="none").length,
    unknown:rows.filter((x:any)=>x.state==="unknown").length,
    multi:rows.filter((x:any)=>x.activity_count>1).length,
    over_quota:cat.extracurriculars.filter((x:any)=>x.over_quota).length
  };
  return{rows,summary,...cat}
}
async function attendanceGaps(p:any){
  const {data:sessions,error:se}=await sb.from("extracurricular_sessions").select("id,assignment_id,extracurricular_id,session_date").order("session_date");
  if(se)throw se;
  const assignmentIds=[...new Set((sessions||[]).map((x:any)=>x.assignment_id).filter(Boolean))] as string[];
  const sessionIds=(sessions||[]).map((x:any)=>x.id) as string[];
  const [members,marks,exs,students]=await Promise.all([
    assignmentIds.length?fetchInBatches("extracurricular_assignment_members","assignment_id,student_id,is_active","assignment_id",assignmentIds,70):Promise.resolve([]),
    sessionIds.length?fetchInBatches("extracurricular_session_students","session_id,student_id,attendance_status","session_id",sessionIds,70):Promise.resolve([]),
    sb.from("extracurriculars").select("id,name"),
    sb.from("students").select("id,full_name")
  ]);
  if((exs as any).error)throw (exs as any).error;if((students as any).error)throw (students as any).error;
  const exName=new Map(((exs as any).data||[]).map((x:any)=>[x.id,x.name]));
  const studentName=new Map(((students as any).data||[]).map((x:any)=>[x.id,x.full_name]));
  const activeByAssignment=new Map<string,string[]>();
  for(const m of members as any[]){if(!m.is_active)continue;if(!activeByAssignment.has(m.assignment_id))activeByAssignment.set(m.assignment_id,[]);activeByAssignment.get(m.assignment_id)!.push(m.student_id)}
  const marked=new Set((marks as any[]).map((x:any)=>x.session_id+"|"+x.student_id));
  const rows:any[]=[];
  for(const s of sessions||[]){
    const expected=activeByAssignment.get(s.assignment_id)||[];
    const missing=expected.filter((sid:string)=>!marked.has(s.id+"|"+sid));
    if(missing.length)rows.push({session_id:s.id,extracurricular_id:s.extracurricular_id,extracurricular_name:exName.get(s.extracurricular_id)||"Ekskul",session_date:s.session_date,missing_count:missing.length,missing_students:missing.map((sid:string)=>({student_id:sid,name:studentName.get(sid)||"-"}))});
  }
  return rows;
}
async function enrolled(p:any,sid:string){const {data}=await sb.from("student_enrollments").select("id").eq("academic_year_id",p.academic_year_id).eq("semester_no",p.semester_no).eq("student_id",sid).eq("is_active",true).limit(1);return Boolean(data?.length)}
async function clearNone(p:any,sid:string){await Promise.all([sb.from("extracurricular_nonparticipants").delete().eq("student_id",sid).eq("academic_year_id",p.academic_year_id).eq("semester_no",p.semester_no),sb.from("extracurricular_status_overrides").delete().eq("student_id",sid).eq("academic_year_id",p.academic_year_id).eq("semester_no",p.semester_no)])}
async function deactivateGroupsForExkul(sid:string,exid:string){const {data:as}=await sb.from("extracurricular_coach_assignments").select("id").eq("extracurricular_id",exid);const ids=(as||[]).map((x:any)=>x.id);if(ids.length)await sb.from("extracurricular_assignment_members").update({is_active:false,updated_at:new Date().toISOString()}).eq("student_id",sid).in("assignment_id",ids)}
async function activateGroup(sid:string,exid:string,assignmentId:string){const {data:as}=await sb.from("extracurricular_coach_assignments").select("id,extracurricular_id,is_active").eq("extracurricular_id",exid).eq("is_active",true).order("sort_order");let chosen=txt(assignmentId);if(chosen&&!as?.some((x:any)=>x.id===chosen))throw Error("group_invalid");if(!chosen&&(as||[]).length===1)chosen=as![0].id;await deactivateGroupsForExkul(sid,exid);if(chosen){const {error}=await sb.from("extracurricular_assignment_members").upsert({assignment_id:chosen,student_id:sid,source_ref:"KABID_KEGIATAN",is_active:true,updated_at:new Date().toISOString()},{onConflict:"assignment_id,student_id"});if(error)throw error}return chosen}
async function saveEntry(a:any,p:any,b:any){const sid=txt(b.student_id),target=low(b.target_kind),source=low(b.source_kind||"new"),sourceId=txt(b.source_id);if(!sid||!await enrolled(p,sid))return reply({success:false,error:"student_not_enrolled"},404);if(!["internal","external","none"].includes(target))return reply({success:false,error:"invalid_target"},400);if(target==="none"){const {data:ims}=await sb.from("extracurricular_members").select("id,extracurricular_id").eq("student_id",sid).eq("academic_year_id",p.academic_year_id).in("status",["AKTIF","ACTIVE"]);for(const m of ims||[])await deactivateGroupsForExkul(sid,m.extracurricular_id);await sb.from("extracurricular_members").update({status:"NONAKTIF",updated_at:new Date().toISOString()}).eq("student_id",sid).eq("academic_year_id",p.academic_year_id).in("status",["AKTIF","ACTIVE"]);await sb.from("extracurricular_external_students").update({is_active:false,updated_at:new Date().toISOString()}).eq("student_id",sid).eq("academic_year_id",p.academic_year_id).eq("semester_no",p.semester_no).eq("is_active",true);const {error}=await sb.from("extracurricular_nonparticipants").upsert({student_id:sid,academic_year_id:p.academic_year_id,semester_no:p.semester_no,notes:txt(b.notes)||null,recorded_by_account_id:a.id,updated_at:new Date().toISOString()},{onConflict:"student_id,academic_year_id,semester_no"});if(error)throw error;await sb.from("extracurricular_status_overrides").upsert({student_id:sid,academic_year_id:p.academic_year_id,semester_no:p.semester_no,status:"NONE",activity_name:null,notes:txt(b.notes)||null,recorded_by_account_id:a.id,updated_at:new Date().toISOString()},{onConflict:"student_id,academic_year_id,semester_no"});return reply({success:true,model:await model(p)})}if(target==="internal"){const exid=txt(b.extracurricular_id);if(!exid)return reply({success:false,error:"extracurricular_required"},400);const {data:ex}=await sb.from("extracurriculars").select("id,name,quota,is_active").eq("id",exid).eq("is_active",true).maybeSingle();if(!ex)return reply({success:false,error:"extracurricular_not_found"},404);const {data:row,error}=await sb.from("extracurricular_members").upsert({extracurricular_id:exid,student_id:sid,academic_year_id:p.academic_year_id,participant_type:"Kabid Kegiatan",status:"AKTIF",notes:txt(b.notes)||null,updated_at:new Date().toISOString()},{onConflict:"extracurricular_id,student_id,academic_year_id"}).select("id").single();if(error)throw error;await activateGroup(sid,exid,txt(b.assignment_id));await clearNone(p,sid);if(source==="internal"&&sourceId&&sourceId!==row.id){const {data:old}=await sb.from("extracurricular_members").select("extracurricular_id").eq("id",sourceId).eq("student_id",sid).maybeSingle();if(old){await deactivateGroupsForExkul(sid,old.extracurricular_id);await sb.from("extracurricular_members").update({status:"NONAKTIF",updated_at:new Date().toISOString()}).eq("id",sourceId)}}if(source==="external"&&sourceId)await sb.from("extracurricular_external_students").update({is_active:false,updated_at:new Date().toISOString()}).eq("id",sourceId).eq("student_id",sid);return reply({success:true,warning:Number(ex.quota||0)>0?"quota_is_warning_only":null,model:await model(p)})}const activity=txt(b.activity_name);if(!activity)return reply({success:false,error:"external_name_required"},400);let extId=source==="external"?sourceId:"";if(extId){const {error}=await sb.from("extracurricular_external_students").update({activity_name:activity,institution_name:txt(b.institution_name)||null,notes:txt(b.notes)||null,is_active:true,updated_at:new Date().toISOString()}).eq("id",extId).eq("student_id",sid);if(error)throw error}else{const {data:e,error}=await sb.from("extracurricular_external_students").insert({student_id:sid,academic_year_id:p.academic_year_id,semester_no:p.semester_no,activity_name:activity,institution_name:txt(b.institution_name)||null,notes:txt(b.notes)||null,is_active:true,source_system:"CQLASS_KABID",source_ref:"KABID_KEGIATAN"}).select("id").single();if(error)throw error;extId=e.id}await clearNone(p,sid);if(source==="internal"&&sourceId){const {data:old}=await sb.from("extracurricular_members").select("extracurricular_id").eq("id",sourceId).eq("student_id",sid).maybeSingle();if(old){await deactivateGroupsForExkul(sid,old.extracurricular_id);await sb.from("extracurricular_members").update({status:"NONAKTIF",updated_at:new Date().toISOString()}).eq("id",sourceId)}}return reply({success:true,model:await model(p)})}
async function removeEntry(p:any,b:any){const sid=txt(b.student_id),kind=low(b.kind),id=txt(b.id);if(!sid||!id)return reply({success:false,error:"invalid_entry"},400);if(kind==="internal"){const {data:m}=await sb.from("extracurricular_members").select("extracurricular_id").eq("id",id).eq("student_id",sid).maybeSingle();if(m){await deactivateGroupsForExkul(sid,m.extracurricular_id);await sb.from("extracurricular_members").update({status:"NONAKTIF",updated_at:new Date().toISOString()}).eq("id",id)}}else if(kind==="external")await sb.from("extracurricular_external_students").update({is_active:false,updated_at:new Date().toISOString()}).eq("id",id).eq("student_id",sid);else return reply({success:false,error:"invalid_entry_kind"},400);return reply({success:true,model:await model(p)})}
Deno.serve(async(req:Request)=>{if(req.method==="OPTIONS")return new Response("ok",{headers:H});try{const a=await auth(req);if(!a)return reply({success:false,error:"session_invalid"},401);if(!canView(a))return reply({success:false,error:"forbidden"},403);const b=await req.json().catch(()=>({}));const action=low(b.action),p=await period();if(action==="attendance_gaps")return reply({success:true,academic_year:p.academic_year,semester_no:p.semester_no,rows:await attendanceGaps(p)});if(action==="bootstrap"||action==="summary"||action==="list")return reply({success:true,academic_year:p.academic_year,semester_no:p.semester_no,...await model(p),can_edit:canEdit(a)});if(!canEdit(a))return reply({success:false,error:"readonly"},403);if(action==="save_entry")return await saveEntry(a,p,b);if(action==="remove_entry")return await removeEntry(p,b);return reply({success:false,error:"unknown_action"},400)}catch(e){console.error(e);return reply({success:false,error:txt((e as any)?.message)||"internal_error"},500)}});