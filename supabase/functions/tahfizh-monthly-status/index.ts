import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS={
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"authorization,x-client-info,apikey,content-type,x-session-token",
  "Access-Control-Allow-Methods":"POST,OPTIONS"
};
const J=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...CORS,"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}});
const T=(v:any)=>String(v??"").trim();
const L=(v:any)=>T(v).toLowerCase();

function serviceKey(){
  const packed=Deno.env.get("SUPABASE_SECRET_KEYS");
  if(packed){try{const p=JSON.parse(packed);if(p?.default)return String(p.default)}catch{}}
  const k=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||Deno.env.get("SUPABASE_SECRET_KEY");
  if(!k)throw Error("service_key_missing");
  return k;
}
async function hash(v:string){
  const d=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(v));
  return [...new Uint8Array(d)].map(x=>x.toString(16).padStart(2,"0")).join("");
}
async function account(sb:any,req:Request,body:any){
  const tok=T(req.headers.get("x-session-token")||body.session_token);
  if(!tok)return null;
  const s=await sb.from("user_sessions").select("user_account_id,expires_at,revoked_at").eq("token_hash",await hash(tok)).maybeSingle();
  if(s.error||!s.data||s.data.revoked_at||!s.data.expires_at||new Date(s.data.expires_at).getTime()<=Date.now())return null;
  const a=await sb.from("user_accounts").select("id,username,teacher_id,status").eq("id",s.data.user_account_id).maybeSingle();
  if(a.error||!a.data||["inactive","nonaktif","disabled","blocked"].includes(L(a.data.status)))return null;
  return a.data;
}
function normRole(v:any){
  const x=L(v).replace(/[-\s]+/g,"_").replace(/[^a-z0-9_]/g,"");
  if(x==="admin")return "admin";
  if(x.includes("pimpinan")||x.includes("kepala_sekolah")||x==="kepsek")return "pimpinan";
  if(x.includes("tahfizh")||x.includes("quran"))return "tahfizh";
  return "guru";
}
async function resolveRole(sb:any,a:any){
  if(L(a.username)==="admin")return "admin";
  if(a.teacher_id){
    const t=await sb.from("teachers").select("position").eq("id",a.teacher_id).maybeSingle();
    const p=normRole(t.data?.position);if(p!=="guru")return p;
    const ur=await sb.from("user_roles").select("role_code").eq("teacher_id",a.teacher_id).eq("is_active",true);
    if(ur.error)throw ur.error;
    for(const r of ur.data||[]){const q=normRole(r.role_code);if(q!=="guru")return q}
  }
  return "guru";
}

const chunks=<TItem,>(arr:TItem[],size=60):TItem[][]=>{const out:TItem[][]=[];for(let i=0;i<arr.length;i+=size)out.push(arr.slice(i,i+size));return out};

async function loadStudents(sb:any,ids:string[]){
  const rows:any[]=[];
  for(const batch of chunks(ids,60)){
    const q=await sb.from("students").select("id,full_name,status").in("id",batch);
    if(q.error)throw q.error;
    rows.push(...(q.data||[]));
  }
  return rows;
}
async function loadReports(sb:any,ids:string[],periodStart:string,periodEnd:string){
  const rows:any[]=[];
  for(const batch of chunks(ids,60)){
    const q=await sb.from("tahfizh_monthly_reports")
      .select("student_id,target_bulan,pencapaian_akhir,juz,tilawah_bbq,updated_at")
      .eq("period_start",periodStart).eq("period_end",periodEnd).in("student_id",batch);
    if(q.error)throw q.error;
    rows.push(...(q.data||[]));
  }
  return rows;
}

Deno.serve(async req=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:CORS});
  if(req.method!=="POST")return J({success:false,error:"method_not_allowed"},405);
  let body:any={};try{body=await req.json()}catch{return J({success:false,error:"invalid_json"},400)}
  try{
    const sb=createClient(Deno.env.get("SUPABASE_URL")!,serviceKey(),{auth:{persistSession:false,autoRefreshToken:false}});
    const a=await account(sb,req,body);if(!a)return J({success:false,error:"session_invalid"},401);
    const role=await resolveRole(sb,a);if(!["admin","pimpinan","tahfizh"].includes(role))return J({success:false,error:"forbidden"},403);
    const action=L(body.action)||"monthly";
    if(action==="daily"){
      const date=/^\\d{4}-\\d{2}-\\d{2}$/.test(T(body.work_date))?T(body.work_date):new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Jakarta"}).format(new Date());
      const yr=await sb.from("academic_years").select("id,name").eq("is_active",true).order("start_date",{ascending:false}).limit(1).maybeSingle();if(yr.error)throw yr.error;if(!yr.data)return J({success:false,error:"active_academic_year_not_found"},404);
      const sq=await sb.from("semesters").select("semester_no").eq("academic_year_id",yr.data.id).eq("is_active",true).limit(1).maybeSingle();if(sq.error)throw sq.error;const sn=Number(sq.data?.semester_no||1);
      const [rr,tq,aq,bq]=await Promise.all([
        sb.from("partner_tahfizh_halaqah_roster").select("partner_teacher_id,student_id").eq("academic_year_id",yr.data.id).eq("semester_no",sn).eq("is_active",true).not("student_id","is",null),
        sb.from("teachers").select("id,full_name,status"),
        sb.from("teacher_timesheet_activities").select("id,teacher_id,work_date,start_time,end_time,activity,note,source,updated_at").eq("work_date",date).order("start_time"),
        sb.from("tahfizh_substitution_assignments").select("id,original_teacher_id,substitute_teacher_id,substitute_name,class_id,start_time,end_time,reason,status").eq("work_date",date).eq("status","active")
      ]);for(const q of [rr,tq,aq,bq])if(q.error)throw q.error;
      const roster=rr.data||[], tids=[...new Set(roster.map((x:any)=>T(x.partner_teacher_id)).filter(Boolean))], tm=new Map((tq.data||[]).map((x:any)=>[T(x.id),x]));
      const teachers=tids.map((id:any)=>{const acts=(aq.data||[]).filter((x:any)=>T(x.teacher_id)===id),bi=(bq.data||[]).filter((x:any)=>T(x.substitute_teacher_id)===id),bo=(bq.data||[]).filter((x:any)=>T(x.original_teacher_id)===id);return{teacher_id:id,teacher_name:T(tm.get(id)?.full_name)||"Guru Tahfizh",student_count:new Set(roster.filter((x:any)=>T(x.partner_teacher_id)===id).map((x:any)=>T(x.student_id))).size,status:acts.length?"sudah_lapor":"belum_lapor",activity_count:acts.length,activities:acts,badal_menggantikan:bi.length,badal_digantikan:bo.length}}).sort((a:any,b:any)=>(a.status===b.status?0:a.status==="belum_lapor"?-1:1)||a.teacher_name.localeCompare(b.teacher_name,"id"));
      return J({success:true,role,work_date:date,academic_year:yr.data.name,semester_no:sn,summary:{teachers:teachers.length,sudah_lapor:teachers.filter((x:any)=>x.status==="sudah_lapor").length,belum_lapor:teachers.filter((x:any)=>x.status==="belum_lapor").length,activities:teachers.reduce((n:number,x:any)=>n+x.activity_count,0)},teachers});
    }
    const semesterNo=Number(body.semester_no||1);if(![1,2].includes(semesterNo))return J({success:false,error:"semester_invalid"},400);
    const yr=await sb.from("academic_years").select("id,name").eq("is_active",true).order("start_date",{ascending:false}).limit(1).maybeSingle();
    if(yr.error)throw yr.error;if(!yr.data)return J({success:false,error:"active_academic_year_not_found"},404);
    const yearId=yr.data.id;

    const latest=await sb.from("tahfizh_monthly_reports").select("period_start,period_end").order("period_end",{ascending:false}).limit(1).maybeSingle();
    if(latest.error)throw latest.error;
    const periodStart=latest.data?.period_start||null,periodEnd=latest.data?.period_end||null;

    const hq=await sb.from("partner_tahfizh_halaqah_roster")
      .select("student_id,class_id,partner_teacher_id,source_teacher_label")
      .eq("academic_year_id",yearId).eq("semester_no",semesterNo).eq("is_active",true).not("student_id","is",null);
    if(hq.error)throw hq.error;
    const roster=hq.data||[];
    if(!roster.length||!periodStart)return J({success:true,role,academic_year:yr.data.name,semester_no:semesterNo,period_start:periodStart,period_end:periodEnd,generated_at:new Date().toISOString(),summary:{teachers:0,done:0,in_progress:0,not_started:0,students:0,complete_students:0},teachers:[]});

    const studentIds=[...new Set(roster.map((x:any)=>String(x.student_id||"")).filter(Boolean))];
    const classIds=[...new Set(roster.map((x:any)=>String(x.class_id||"")).filter(Boolean))];
    const teacherIds=[...new Set(roster.map((x:any)=>String(x.partner_teacher_id||"")).filter(Boolean))];

    const [students,reports,cq,tq]=await Promise.all([
      loadStudents(sb,studentIds),
      loadReports(sb,studentIds,periodStart,periodEnd),
      classIds.length?sb.from("classes").select("id,name,grade_level").in("id",classIds):Promise.resolve({data:[],error:null}),
      teacherIds.length?sb.from("teachers").select("id,full_name").in("id",teacherIds):Promise.resolve({data:[],error:null})
    ]);
    if(cq.error)throw cq.error;if(tq.error)throw tq.error;

    const activeStudents=new Map((students||[]).filter((x:any)=>!["NONAKTIF","INACTIVE"].includes(T(x.status||"AKTIF").toUpperCase())).map((x:any)=>[String(x.id),x]));
    const reportMap=new Map((reports||[]).map((x:any)=>[String(x.student_id),x]));
    const classes=new Map((cq.data||[]).map((x:any)=>[String(x.id),x]));
    const teacherNames=new Map((tq.data||[]).map((x:any)=>[String(x.id),T(x.full_name)]));

    const hasAny=(r:any)=>!!r&&(T(r.target_bulan)!==""||T(r.pencapaian_akhir)!==""||T(r.juz)!==""||T(r.tilawah_bbq)!=="");
    const isComplete=(r:any)=>!!r&&T(r.target_bulan)!==""&&T(r.pencapaian_akhir)!==""&&T(r.juz)!=="";

    const groups=new Map<string,any>();
    for(const row of roster){
      const sid=String(row.student_id||"");if(!activeStudents.has(sid))continue;
      const tid=T(row.partner_teacher_id),label=T(row.source_teacher_label);
      const key=tid?`id:${tid}`:`label:${label||"Tanpa Guru"}`;
      if(!groups.has(key))groups.set(key,{teacher_id:tid||null,teacher_name:teacherNames.get(tid)||label||"Tanpa Guru Halaqah",student_ids:new Set<string>(),class_ids:new Set<string>()});
      const g=groups.get(key);g.student_ids.add(sid);if(row.class_id)g.class_ids.add(String(row.class_id));
    }

    const out:any[]=[];
    for(const g of groups.values()){
      const ids=[...g.student_ids];let started=0,complete=0,last="";const missing:string[]=[];
      for(const sid of ids){
        const r=reportMap.get(String(sid));
        if(hasAny(r))started++;
        if(isComplete(r))complete++;else missing.push(T(activeStudents.get(String(sid))?.full_name)||"Siswa");
        const u=T(r?.updated_at);if(u&&(!last||u>last))last=u;
      }
      const total=ids.length;
      const status=total>0&&complete===total?"selesai":started>0?"sedang_input":"belum_mulai";
      const classList=[...g.class_ids].map((id:any)=>classes.get(String(id))).filter(Boolean).sort((a:any,b:any)=>Number(a.grade_level)-Number(b.grade_level)||T(a.name).localeCompare(T(b.name),"id",{numeric:true})).map((x:any)=>T(x.name));
      out.push({teacher_id:g.teacher_id,teacher_name:g.teacher_name,classes:classList,total_students:total,started_students:started,complete_students:complete,progress_percent:total?Math.round(complete/total*100):0,status,last_update:last||null,missing_students:missing.sort((a,b)=>a.localeCompare(b,"id"))});
    }
    const order:any={belum_mulai:0,sedang_input:1,selesai:2};
    out.sort((a,b)=>(order[a.status]-order[b.status])||a.teacher_name.localeCompare(b.teacher_name,"id"));
    const summary={teachers:out.length,done:out.filter(x=>x.status==="selesai").length,in_progress:out.filter(x=>x.status==="sedang_input").length,not_started:out.filter(x=>x.status==="belum_mulai").length,students:out.reduce((n,x)=>n+x.total_students,0),complete_students:out.reduce((n,x)=>n+x.complete_students,0)};
    return J({success:true,role,academic_year:yr.data.name,semester_no:semesterNo,period_start:periodStart,period_end:periodEnd,generated_at:new Date().toISOString(),summary,teachers:out});
  }catch(e){console.error("tahfizh-monthly-status",e);return J({success:false,error:T((e as any)?.message)||"server_error"},500)}
});
