import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

const CORS={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization,apikey,content-type,x-session-token","Access-Control-Allow-Methods":"POST,OPTIONS","Content-Type":"application/json; charset=utf-8"};
const J=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...CORS,"Cache-Control":"no-store"}});
const T=(v:unknown)=>String(v??"").trim(), L=(v:unknown)=>T(v).toLowerCase();
const URL=Deno.env.get("SUPABASE_URL")!;
function secret(){const p=Deno.env.get("SUPABASE_SECRET_KEYS");if(p){try{const x=JSON.parse(p);if(x?.default)return String(x.default)}catch{}}return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||Deno.env.get("SUPABASE_SECRET_KEY")||""}
const sb=createClient(URL,secret(),{auth:{persistSession:false,autoRefreshToken:false}});
async function sha(v:string){const d=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(v));return[...new Uint8Array(d)].map(x=>x.toString(16).padStart(2,"0")).join("")}
async function me(req:Request){const token=T(req.headers.get("x-session-token"));if(!token)return null;const{data:s}=await sb.from("user_sessions").select("user_account_id,expires_at,revoked_at").eq("token_hash",await sha(token)).maybeSingle();if(!s||s.revoked_at||!s.expires_at||Date.parse(s.expires_at)<=Date.now())return null;const{data:a}=await sb.from("user_accounts").select("id,teacher_id,username,status").eq("id",s.user_account_id).maybeSingle();if(!a||["nonaktif","inactive","disabled","blocked"].includes(L(a.status)))return null;const{data:r}=await sb.from("user_account_roles").select("role_code,role,is_active").eq("user_account_id",a.id).eq("is_active",true);return{...a,roles:(r||[]).map((x:any)=>L(x.role_code||x.role)).filter(Boolean)}}
const isHRD=(a:any)=>a&&(["hrd","admin"].includes(L(a.username))||a.roles.some((x:string)=>["hrd","admin"].includes(x)));
function bytes(data:string){const raw=data.replace(/^data:image\/[\w.+-]+;base64,/,"");const bin=atob(raw),out=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)out[i]=bin.charCodeAt(i);return out}
async function signed(row:any,ttl=3600){const{data}=await sb.storage.from(row.storage_bucket||"promotion-evidence").createSignedUrl(row.storage_path,ttl);return{...row,photo_url:data?.signedUrl||""}}
async function forward(req:Request,b:any){const r=await fetch(`${URL}/functions/v1/hrd-administration`,{method:"POST",headers:{"Content-Type":"application/json","apikey":req.headers.get("apikey")||"","Authorization":req.headers.get("Authorization")||"","x-session-token":req.headers.get("x-session-token")||""},body:JSON.stringify(b)});const d=await r.json().catch(()=>({success:false,error:"invalid_upstream"}));return{status:r.status,data:d}}
const lastCreated=(items:any[])=>items.map((i:any)=>T(i?.created_at)).filter(Boolean).sort().pop()||null;
const jpFrom=(items:any[])=>Math.round(items.reduce((n:number,i:any)=>{const m=T(i?.description).match(/([0-9]+(?:[.,][0-9]+)?)\s*JP/i);return n+(m?Number(m[1].replace(",","."))||0:0)},0)*10)/10;
const catLabel=(v:any)=>({reward:"Reward",discipline:"Kedisiplinan",pelanggaran:"Kedisiplinan"}[L(v)]||T(v)||"Laporan Kesiswaan");
const confirmationLabel=(v:any)=>({has_data:"Ada Data",ada_data:"Ada Data",data:"Ada Data",nihil:"Nihil",none:"Nihil",not_required:"Tidak Wajib",tidak_wajib:"Tidak Wajib",complete:"Selesai",completed:"Selesai"}[L(v)]||T(v)||"Sudah Konfirmasi");

Deno.serve(async(req)=>{if(req.method==="OPTIONS")return new Response("ok",{headers:CORS});if(req.method!=="POST")return J({success:false,error:"method_not_allowed"},405);try{const account=await me(req);if(!account)return J({success:false,error:"session_invalid"},401);const b=await req.json().catch(()=>({})),action=L(b.action||"my");
  if(action==="upload"){
    if(isHRD(account))return J({success:false,error:"forbidden"},403);
    const date=T(b.activity_date),mime=L(b.mime_type||"image/jpeg"),encoded=T(b.base64);if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return J({success:false,error:"invalid_activity_date"},400);if(!["image/jpeg","image/png","image/webp"].includes(mime)||!encoded)return J({success:false,error:"invalid_image"},400);const data=bytes(encoded);if(!data.length||data.length>2097152)return J({success:false,error:"image_too_large"},400);const ext=mime==="image/png"?"png":mime==="image/webp"?"webp":"jpg",id=crypto.randomUUID(),path=`${account.id}/${date}/${id}.${ext}`;const{error:up}=await sb.storage.from("promotion-evidence").upload(path,data,{contentType:mime,upsert:false,cacheControl:"0"});if(up)throw up;const row={id,user_account_id:account.id,teacher_id:account.teacher_id||null,activity_date:date,title:T(b.title)||"Promosi Sekolah",description:T(b.description),storage_bucket:"promotion-evidence",storage_path:path,mime_type:mime,file_size:data.length};const{data:saved,error}=await sb.from("employee_promotion_reports").insert(row).select("*").single();if(error){await sb.storage.from("promotion-evidence").remove([path]);throw error}return J({success:true,item:await signed(saved)})
  }
  if(action==="delete"){
    const q=sb.from("employee_promotion_reports").select("*").eq("id",T(b.id));if(!isHRD(account))q.eq("user_account_id",account.id);const{data:row}=await q.maybeSingle();if(!row)return J({success:false,error:"not_found"},404);await sb.storage.from(row.storage_bucket).remove([row.storage_path]);const del=sb.from("employee_promotion_reports").delete().eq("id",row.id);if(!isHRD(account))del.eq("user_account_id",account.id);const{error}=await del;if(error)throw error;return J({success:true})
  }
  if(action==="my"){
    const start=T(b.start)||"2000-01-01",end=T(b.end)||"2099-12-31";const{data,error}=await sb.from("employee_promotion_reports").select("*").eq("user_account_id",account.id).gte("activity_date",start).lte("activity_date",end).order("activity_date",{ascending:false});if(error)throw error;return J({success:true,items:await Promise.all((data||[]).map(x=>signed(x,86400))),minimum:1,fulfilled:(data||[]).length>=1})
  }
  if(action==="rpp_file"){const x=await forward(req,b);return J(x.data,x.status)}
  if(action!=="administration"||!isHRD(account))return J({success:false,error:"forbidden"},403);

  const x=await forward(req,b);if(!x.data?.success)return J(x.data,x.status);const start=T(b.start),end=T(b.end);
  const[promos,acts,tasks,journals,plans,accounts,badalAcademic,badalTahfizh,uks,classes,subjects,activeYear,reportAssignments,reportRequests,reportConfirmations]=await Promise.all([
    sb.from("employee_promotion_reports").select("*").gte("activity_date",start).lte("activity_date",end).order("activity_date",{ascending:false}),
    sb.from("teacher_timesheet_activities").select("*").gte("work_date",start).lte("work_date",end).order("work_date",{ascending:false}),
    sb.from("teacher_daily_task_status").select("*").gte("task_date",start).lte("task_date",end).order("task_date",{ascending:false}),
    sb.from("principal_journal_entries").select("*").gte("entry_date",start).lte("entry_date",end).order("entry_date",{ascending:false}),
    sb.from("principal_daily_plans").select("*").gte("plan_date",start).lte("plan_date",end).order("plan_date",{ascending:false}),
    sb.from("user_accounts").select("id,teacher_id"),
    sb.from("teacher_substitution_assignments").select("*").eq("status","active").gte("work_date",start).lte("work_date",end).order("work_date",{ascending:false}),
    sb.from("tahfizh_substitution_assignments").select("*").eq("status","active").gte("work_date",start).lte("work_date",end).order("work_date",{ascending:false}),
    sb.from("uks_duty_reports").select("*").gte("duty_date",start).lte("duty_date",end).order("duty_date",{ascending:false}),
    sb.from("classes").select("id,name"),
    sb.from("subjects").select("id,name,code"),
    sb.from("academic_years").select("id").eq("is_active",true).maybeSingle(),
    sb.from("report_class_assignments").select("academic_year_id,semester_no,class_id,homeroom_teacher_id,partner_teacher_id"),
    sb.from("student_affairs_report_requests").select("id,period_start,period_end,categories,title,note,status,created_at,updated_at").lte("period_start",end).gte("period_end",start).order("period_start",{ascending:false}),
    sb.from("student_affairs_report_confirmations").select("id,request_id,class_id,teacher_id,category,confirmation_status,note,confirmed_at,updated_at")
  ]);
  for(const q of[promos,acts,tasks,journals,plans,accounts,badalAcademic,badalTahfizh,uks,classes,subjects,activeYear,reportAssignments,reportRequests,reportConfirmations])if(q.error)throw q.error;

  const byTeacher=new Map<string,any[]>();for(const r of promos.data||[]){if(!r.teacher_id)continue;if(!byTeacher.has(r.teacher_id))byTeacher.set(r.teacher_id,[]);byTeacher.get(r.teacher_id)!.push(r)}
  const accountByTeacher=new Map((accounts.data||[]).filter((a:any)=>a.teacher_id).map((a:any)=>[a.teacher_id,a.id]));
  const classMap=new Map((classes.data||[]).map((c:any)=>[c.id,c.name]));
  const subjectMap=new Map((subjects.data||[]).map((s:any)=>[s.id,s.name||s.code||"Mapel"]));
  const activeYearId=T(activeYear.data?.id),semNo=Number(x.data?.source_period?.semester_no||1);
  const homeroomByTeacher=new Map<string,string[]>();for(const r of reportAssignments.data||[]){if(activeYearId&&T(r.academic_year_id)!==activeYearId)continue;if(Number(r.semester_no||semNo)!==semNo)continue;if(!r.homeroom_teacher_id)continue;if(!homeroomByTeacher.has(r.homeroom_teacher_id))homeroomByTeacher.set(r.homeroom_teacher_id,[]);homeroomByTeacher.get(r.homeroom_teacher_id)!.push(r.class_id)}
  const reqs=(reportRequests.data||[]).filter((r:any)=>!["cancelled","canceled","draft"].includes(L(r.status))&&(r.categories||[]).some((c:any)=>["reward","discipline","pelanggaran"].includes(L(c))));
  const confs=reportConfirmations.data||[];

  for(const t of x.data.teachers||[]){
    const raw=byTeacher.get(t.teacher_id)||[];
    const items=await Promise.all(raw.map(async r=>({id:r.id,title:r.title,description:r.description,period_start:r.activity_date,period_end:r.activity_date,created_at:r.created_at,photo_url:(await signed(r)).photo_url,has_photo:true})));
    const workItems=(acts.data||[]).filter((r:any)=>r.teacher_id===t.teacher_id).map((r:any)=>({id:r.id,title:r.activity||"Aktivitas kerja",description:r.note||r.source||"",period_start:r.work_date,period_end:r.work_date,created_at:r.created_at||r.updated_at}));
    const accountId=accountByTeacher.get(t.teacher_id);
    const taskItems=(tasks.data||[]).filter((r:any)=>r.user_account_id===accountId).map((r:any)=>({id:r.id,title:r.task_code||"Tugas harian",description:r.status||"",period_start:r.task_date,period_end:r.task_date,created_at:r.completed_at||r.updated_at||r.created_at}));
    const isPrincipal=/kepala sekolah/i.test(T(t.position));
    const principalItems=isPrincipal?[...(journals.data||[]).filter((r:any)=>r.created_by_teacher_id===t.teacher_id).map((r:any)=>({id:r.id,title:r.title||r.activity_type||"Jurnal Kepala Sekolah",description:r.result||r.description||"",period_start:r.entry_date,period_end:r.entry_date,created_at:r.created_at||r.updated_at})),...(plans.data||[]).filter((r:any)=>r.created_by_teacher_id===t.teacher_id).map((r:any)=>({id:r.id,title:r.title||"Rencana Kerja Kepala Sekolah",description:r.status||r.notes||"",period_start:r.plan_date,period_end:r.plan_date,created_at:r.created_at||r.updated_at}))]:[];
    const promo={key:"promotion",label:"Promosi Sekolah",applicable:true,status:items.length?"present":"missing",item_count:items.length,last_created_at:items[0]?.created_at||null,items,granularity:"period",note:"Minimal 1 foto promosi pada periode yang dipilih HRD."};
    const work={key:"work_activity",label:"Aktivitas Kerja",applicable:true,status:(workItems.length||taskItems.length)?"present":"missing",item_count:workItems.length+taskItems.length,last_created_at:lastCreated([...workItems,...taskItems]),items:[...workItems,...taskItems],granularity:"daily",note:"Dibaca langsung dari timesheet aktivitas dan tugas harian CQlass."};
    const principal={key:"principal_work",label:"Administrasi Kepala Sekolah",applicable:isPrincipal,status:principalItems.length?"present":"missing",item_count:principalItems.length,last_created_at:lastCreated(principalItems),items:principalItems,granularity:"daily",note:"Jurnal dan rencana kerja Kepala Sekolah pada periode terpilih."};
    t.categories=[...(t.categories||[]),work,...(isPrincipal?[principal]:[]),promo];
    for(const c of[work,...(isPrincipal?[principal]:[]),promo])if(c.applicable&&c.status==="missing"){t.missing_count=Number(t.missing_count||0)+1;t.issue_units=Number(t.issue_units||0)+1;t.missing_categories=[...(t.missing_categories||[]),c.label]}

    const academicIn=(badalAcademic.data||[]).filter((r:any)=>r.substitute_teacher_id===t.teacher_id).map((r:any)=>({id:`acad-in-${r.id}`,title:"Badal Akademik — Menggantikan",description:[classMap.get(r.class_id),subjectMap.get(r.subject_id),r.reason].filter(Boolean).join(" · "),period_start:r.work_date,period_end:r.work_date,created_at:r.created_at||r.updated_at}));
    const academicOut=(badalAcademic.data||[]).filter((r:any)=>r.original_teacher_id===t.teacher_id).map((r:any)=>({id:`acad-out-${r.id}`,title:"Badal Akademik — Digantikan",description:[classMap.get(r.class_id),subjectMap.get(r.subject_id),r.reason].filter(Boolean).join(" · "),period_start:r.work_date,period_end:r.work_date,created_at:r.created_at||r.updated_at}));
    const tahfizhIn=(badalTahfizh.data||[]).filter((r:any)=>r.substitute_teacher_id===t.teacher_id).map((r:any)=>({id:`tah-in-${r.id}`,title:"Badal Tahfizh — Menggantikan",description:[classMap.get(r.class_id),r.reason].filter(Boolean).join(" · "),period_start:r.work_date,period_end:r.work_date,created_at:r.created_at||r.updated_at}));
    const tahfizhOut=(badalTahfizh.data||[]).filter((r:any)=>r.original_teacher_id===t.teacher_id).map((r:any)=>({id:`tah-out-${r.id}`,title:"Badal Tahfizh — Digantikan",description:[classMap.get(r.class_id),r.reason].filter(Boolean).join(" · "),period_start:r.work_date,period_end:r.work_date,created_at:r.created_at||r.updated_at}));
    const badalItems=[...academicIn,...academicOut,...tahfizhIn,...tahfizhOut].sort((a:any,b:any)=>T(b.period_start).localeCompare(T(a.period_start)));
    const badal={key:"badal",label:"Badal Mengajar",applicable:true,status:"separate",item_count:badalItems.length,last_created_at:lastCreated(badalItems),items:badalItems,granularity:"daily",excluded_from_performance:true,excluded_from_missing:true,note:`Masuk ${academicIn.length+tahfizhIn.length} · Digantikan ${academicOut.length+tahfizhOut.length}. Data otomatis dari badal Akademik dan Tahfizh.`};

    const uksItems=(uks.data||[]).filter((r:any)=>r.teacher_id===t.teacher_id).map((r:any)=>({id:r.id,title:`Jaga UKS${r.shift_no?` — Shift ${r.shift_no}`:""}`,description:[r.scheduled_start&&r.scheduled_end?`${String(r.scheduled_start).slice(0,5)}–${String(r.scheduled_end).slice(0,5)}`:"",r.photo_path?"Bukti foto tersedia":""].filter(Boolean).join(" · "),period_start:r.duty_date,period_end:r.duty_date,created_at:r.captured_at||r.created_at}));
    const uksCat={key:"uks_duty",label:"Jaga UKS",applicable:true,status:"separate",item_count:uksItems.length,last_created_at:lastCreated(uksItems),items:uksItems,granularity:"daily",excluded_from_performance:true,excluded_from_missing:true,note:"Laporan jaga UKS dibaca otomatis; HRD hanya melihat, bukan menginput."};

    const timesheet=(t.categories||[]).find((c:any)=>c.key==="timesheet");
    const teachItems=timesheet?.items||[],teachJp=jpFrom(teachItems),workloadItems=[
      {id:`load-teach-${t.teacher_id}`,title:"Mengajar / JP",description:`${teachItems.length} entry · ${teachJp} JP`,period_start:start,period_end:end,created_at:timesheet?.last_created_at||null},
      {id:`load-work-${t.teacher_id}`,title:"Aktivitas Kerja",description:`${workItems.length} aktivitas · ${taskItems.length} tugas harian`,period_start:start,period_end:end,created_at:lastCreated([...workItems,...taskItems])},
      {id:`load-badal-${t.teacher_id}`,title:"Badal",description:`${academicIn.length+tahfizhIn.length} kali menggantikan · ${academicOut.length+tahfizhOut.length} kali digantikan`,period_start:start,period_end:end,created_at:lastCreated(badalItems)},
      {id:`load-uks-${t.teacher_id}`,title:"Jaga UKS",description:`${uksItems.length} laporan jaga`,period_start:start,period_end:end,created_at:lastCreated(uksItems)}
    ];
    const workload={key:"workload",label:"Beban Kerja",applicable:true,status:"separate",item_count:teachItems.length+workItems.length+taskItems.length+badalItems.length+uksItems.length,last_created_at:lastCreated(workloadItems),items:workloadItems,granularity:"period",excluded_from_performance:true,excluded_from_missing:true,note:"Ringkasan beban kerja periode: mengajar, aktivitas/tugas, badal, dan jaga UKS. Tidak menjadi skor Performance."};

    const homeClasses=homeroomByTeacher.get(t.teacher_id)||[];
    const saUnits:any[]=[];let saDone=0;
    if(homeClasses.length){for(const r of reqs){for(const rawCat of r.categories||[]){const k=L(rawCat);if(!["reward","discipline","pelanggaran"].includes(k))continue;const c=confs.find((z:any)=>z.request_id===r.id&&z.teacher_id===t.teacher_id&&[k,k==="pelanggaran"?"discipline":""].includes(L(z.category)));if(c)saDone++;saUnits.push({id:c?.id||`missing-${r.id}-${k}-${t.teacher_id}`,title:`${catLabel(k)} — ${c?confirmationLabel(c.confirmation_status):"Belum Lapor"}`,description:c?.note||r.note||r.title||"",period_start:r.period_start,period_end:r.period_end,created_at:c?.confirmed_at||c?.updated_at||r.created_at||r.updated_at,missing:!c})}}}
    const saStatus=!homeClasses.length||!saUnits.length?"na":saDone===saUnits.length?"present":saDone===0?"missing":"partial";
    const saCat={key:"student_affairs_reporting",label:"Reward & Kedisiplinan",applicable:homeClasses.length>0,status:saStatus,item_count:saUnits.length,last_created_at:lastCreated(saUnits.filter((i:any)=>!i.missing)),items:saUnits,granularity:"period",excluded_from_performance:true,excluded_from_missing:true,note:"Status pelaporan wali kelas untuk request Reward/Kedisiplinan: Ada Data, Nihil, Tidak Wajib, atau Belum Lapor. Tidak dibebankan kepada guru non-wali kelas."};

    t.context_categories=[...(t.context_categories||[]),badal,uksCat,workload,...(homeClasses.length?[saCat]:[])];
    const applicable=t.categories.filter((c:any)=>c.applicable),done=applicable.filter((c:any)=>c.status==="present").length;t.completeness_index=applicable.length?Math.round(done/applicable.length*100):0;t.completed_count=done;t.required_count=applicable.length;t.last_activity_at=[...t.categories.map((c:any)=>c.last_created_at).filter(Boolean),...(t.context_categories||[]).map((c:any)=>c.last_created_at).filter(Boolean)].sort().pop()||null
  }

  const all=x.data.teachers||[];x.data.summary.with_issues=all.filter((t:any)=>t.missing_count>0||t.partial_count>0).length;x.data.summary.clean=all.length-x.data.summary.with_issues;x.data.summary.missing_category_units=all.reduce((n:number,t:any)=>n+Number(t.missing_count||0),0);x.data.summary.promotion_complete=all.filter((t:any)=>(t.categories||[]).find((c:any)=>c.key==="promotion")?.status==="present").length;x.data.summary.promotion_missing=all.length-x.data.summary.promotion_complete;
  x.data.summary.academic_badal=(badalAcademic.data||[]).length;x.data.summary.tahfizh_badal=(badalTahfizh.data||[]).length;x.data.summary.uks_duty_reports=(uks.data||[]).length;x.data.summary.student_affairs_requests=reqs.length;x.data.live=true;return J(x.data)
}catch(e){console.error(e);return J({success:false,error:"server_error",message:T((e as any)?.message)||"internal_error"},500)}});
