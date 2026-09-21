import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

const CORS={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization,apikey,content-type,x-session-token","Access-Control-Allow-Methods":"POST,OPTIONS","Content-Type":"application/json; charset=utf-8"};
const J=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...CORS,"Cache-Control":"no-store"}});
const T=(v:unknown)=>String(v??"").trim();
const L=(v:unknown)=>T(v).toLowerCase();
const URL=Deno.env.get("SUPABASE_URL")!;
function secret(){const p=Deno.env.get("SUPABASE_SECRET_KEYS");if(p){try{const x=JSON.parse(p);if(x?.default)return String(x.default)}catch{}}return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||Deno.env.get("SUPABASE_SECRET_KEY")||""}
const sb=createClient(URL,secret(),{auth:{persistSession:false,autoRefreshToken:false}});

function weekdaysInRange(start:string,end:string){
  const out=new Set<number>();
  const a=new Date(`${start}T00:00:00Z`),z=new Date(`${end}T00:00:00Z`);
  if(!Number.isFinite(a.getTime())||!Number.isFinite(z.getTime())||a>z)return out;
  for(let d=new Date(a),i=0;d<=z&&i<7;i++,d.setUTCDate(d.getUTCDate()+1)){
    const js=d.getUTCDay();out.add(js===0?7:js);
  }
  return out;
}
const dayName=(n:number)=>({1:"Senin",2:"Selasa",3:"Rabu",4:"Kamis",5:"Jumat",6:"Sabtu",7:"Ahad"}[n]||`Hari ${n}`);
const hhmm=(v:any)=>T(v).slice(0,5);
const uniq=(a:any[])=>[...new Set(a.filter(Boolean))];
const lastOf=(a:any[])=>a.map(x=>T(x.updated_at||x.created_at)).filter(Boolean).sort().pop()||null;

const DISPLAY_NOTES:Record<string,string>={
  rpp:"RPP ditampilkan sesuai target pembelajaran yang menjadi tanggung jawab guru pada periode terpilih.",
  timesheet:"Menampilkan catatan mengajar dan jumlah JP yang sudah tersimpan di CQlass.",
  academic:"Menampilkan tujuan pembelajaran yang sudah memiliki nilai siswa pada semester aktif.",
  tahfizh:"Menampilkan laporan Tahfizh pada kelas/halaqah yang menjadi tanggung jawab guru.",
  bilingual:"Menampilkan progres Bilingual pada kelas yang menjadi tanggung jawab guru.",
  pjbl:"Menampilkan kegiatan PBL/Market Day yang sudah dicatat untuk kelas yang menjadi tanggung jawab wali kelas.",
  work_activity:"Menampilkan aktivitas kerja yang sudah tercatat pada periode terpilih.",
  promotion:"Menampilkan bukti promosi sekolah yang sudah tercatat.",
  principal_work:"Menampilkan jurnal dan rencana kerja Kepala Sekolah yang sudah tercatat.",
  attendance:"Kehadiran kegiatan ditampilkan sebagai informasi operasional dan tidak mengubah kelengkapan administrasi.",
  badal:"Menampilkan riwayat menggantikan atau digantikan pada periode terpilih.",
  student_affairs_reporting:"Menampilkan status laporan Reward & Kedisiplinan untuk wali kelas pada periode permintaan laporan.",
  workload:"Ringkasan beban kerja periode berdasarkan data yang sudah tersimpan di CQlass."
};
function cleanCategoryNotes(t:any){
  for(const c of [...(t.categories||[]),...(t.context_categories||[])]){
    if(DISPLAY_NOTES[c?.key])c.note=DISPLAY_NOTES[c.key];
  }
}

async function enrichPhotos(teachers:any[]){
  try{
    const teacherIds=uniq(teachers.map(t=>T(t.teacher_id)));
    if(!teacherIds.length)return;
    const {data:accounts,error:ae}=await sb.from("user_accounts").select("id,teacher_id").in("teacher_id",teacherIds);
    if(ae)throw ae;
    const accountIds=uniq((accounts||[]).map((a:any)=>T(a.id)));
    if(!accountIds.length)return;
    const {data:photos,error:pe}=await sb.from("user_profile_photos").select("user_account_id,storage_path,updated_at").in("user_account_id",accountIds);
    if(pe)throw pe;
    const paths=uniq((photos||[]).map((p:any)=>T(p.storage_path)));
    const signedByPath=new Map<string,string>();
    if(paths.length){
      const {data:signed,error:se}=await sb.storage.from("profile-photos").createSignedUrls(paths,60*60*6);
      if(!se)for(const x of signed||[])if(x?.path&&x?.signedUrl)signedByPath.set(T(x.path),T(x.signedUrl));
    }
    const accountByTeacher=new Map<string,string>((accounts||[]).map((a:any)=>[T(a.teacher_id),T(a.id)]));
    const photoByAccount=new Map<string,any>((photos||[]).map((p:any)=>[T(p.user_account_id),p]));
    for(const t of teachers){
      const aid=accountByTeacher.get(T(t.teacher_id)),p=aid?photoByAccount.get(aid):null;
      t.profile_photo_url=p?signedByPath.get(T(p.storage_path))||null:null;
      t.profile_photo_updated_at=p?.updated_at||null;
    }
  }catch(e){console.error("hrd-live-report-v2 photo enrichment",e)}
}

async function enrichAcademicTP(teachers:any[]){
  try{
    const [{data:year,error:ye},{data:sem,error:se}]=await Promise.all([
      sb.from("academic_years").select("id,name").eq("is_active",true).maybeSingle(),
      sb.from("semesters").select("id,academic_year_id,semester_no").eq("is_active",true).maybeSingle()
    ]);
    if(ye||se||!year||!sem)return;
    const semNo=Number(sem.semester_no)||1,teacherIds=uniq(teachers.map(t=>T(t.teacher_id)));
    if(!teacherIds.length)return;
    const [asgR,classR,subR,objR,scoreR]=await Promise.all([
      sb.from("teacher_subject_assignments").select("teacher_id,class_id,subject_id,is_active").eq("academic_year_id",year.id).eq("semester_no",semNo).eq("is_active",true).in("teacher_id",teacherIds),
      sb.from("classes").select("id,name,grade_level,is_active"),
      sb.from("subjects").select("id,name,code,is_active"),
      sb.from("learning_objectives").select("id,code,objective_type,description,topic,sort_order,kktp,grade_level,subject_id,is_active").eq("academic_year_id",year.id).eq("semester_no",semNo).eq("is_active",true),
      sb.from("academic_scores").select("teacher_id,class_id,subject_id,student_id,learning_objective_id,score,assessment_type,assessment_date,created_at,updated_at").eq("academic_year_id",year.id).eq("semester_no",semNo).is("deleted_at",null).in("teacher_id",teacherIds)
    ]);
    for(const r of [asgR,classR,subR,objR,scoreR])if(r.error)throw r.error;
    const assignments=asgR.data||[],classes=classR.data||[],subjects=subR.data||[],objectives=objR.data||[],scores=scoreR.data||[];
    const cm=new Map<string,any>(classes.map((x:any)=>[T(x.id),x])),sm=new Map<string,any>(subjects.map((x:any)=>[T(x.id),x]));
    const objByScope=new Map<string,any[]>();
    for(const o of objectives){
      if(o.objective_type&&L(o.objective_type)!=="tp")continue;
      const key=`${T(o.subject_id)}|${Number(o.grade_level)||0}`;
      if(!objByScope.has(key))objByScope.set(key,[]);objByScope.get(key)!.push(o);
    }
    for(const arr of objByScope.values())arr.sort((a,b)=>Number(a.sort_order||0)-Number(b.sort_order||0)||T(a.code).localeCompare(T(b.code),"id"));
    const scoresByTeacher=new Map<string,any[]>();
    for(const s of scores){const id=T(s.teacher_id);if(!scoresByTeacher.has(id))scoresByTeacher.set(id,[]);scoresByTeacher.get(id)!.push(s)}

    for(const t of teachers){
      const tid=T(t.teacher_id),teacherAssignments=assignments.filter((a:any)=>T(a.teacher_id)===tid),teacherScores=scoresByTeacher.get(tid)||[];
      const detail:any[]=[];
      for(const a of teacherAssignments){
        const cid=T(a.class_id),sid=T(a.subject_id),cl=cm.get(cid),sub=sm.get(sid),grade=Number(cl?.grade_level)||0;
        let scopeObjectives=(objByScope.get(`${sid}|${grade}`)||[]).slice();
        const scopeScores=teacherScores.filter((x:any)=>T(x.class_id)===cid&&T(x.subject_id)===sid&&T(x.learning_objective_id));
        if(!scopeObjectives.length&&scopeScores.length){
          const ids=uniq(scopeScores.map((x:any)=>T(x.learning_objective_id)));
          scopeObjectives=objectives.filter((o:any)=>ids.includes(T(o.id))).sort((a,b)=>Number(a.sort_order||0)-Number(b.sort_order||0));
        }
        const tp=scopeObjectives.map((o:any,idx:number)=>{
          const rows=scopeScores.filter((x:any)=>T(x.learning_objective_id)===T(o.id));
          const students=uniq(rows.map((x:any)=>T(x.student_id))).length;
          const vals=rows.map((x:any)=>Number(x.score)).filter((x:number)=>Number.isFinite(x));
          const avg=vals.length?Math.round((vals.reduce((z:number,v:number)=>z+v,0)/vals.length)*10)/10:null;
          const raw=T(o.code),display=/^tp\s*\d+/i.test(raw)?raw.toUpperCase().replace(/\s+/g,""):`TP${idx+1}`;
          return {id:o.id,code:display,source_code:raw||null,description:T(o.description)||T(o.topic)||"Tujuan pembelajaran",topic:T(o.topic)||null,kktp:o.kktp??null,scored_students:students,score_rows:rows.length,average_score:avg,last_updated_at:lastOf(rows),status:students>0?"entered":"missing"};
        });
        const legacyRows=scopeScores.filter((x:any)=>!scopeObjectives.some((o:any)=>T(o.id)===T(x.learning_objective_id)));
        detail.push({class_id:cid,class_name:T(cl?.name)||"Kelas",grade_level:grade,subject_id:sid,subject_name:T(sub?.name)||T(sub?.code)||"Mapel",tp,entered_tp:tp.filter((x:any)=>x.status==="entered").length,total_tp:tp.length,students_scored:uniq(scopeScores.map((x:any)=>T(x.student_id))).length,score_rows:scopeScores.length,unmapped_score_rows:legacyRows.length,last_updated_at:lastOf(scopeScores)});
      }
      t.academic_tp_detail=detail.sort((a,b)=>a.class_name.localeCompare(b.class_name,"id")||a.subject_name.localeCompare(b.subject_name,"id"));
      t.academic_tp_summary={assignments:detail.length,entered_tp:detail.reduce((z,x)=>z+Number(x.entered_tp||0),0),total_tp:detail.reduce((z,x)=>z+Number(x.total_tp||0),0),students_scored:uniq(teacherScores.filter((x:any)=>T(x.learning_objective_id)).map((x:any)=>T(x.student_id))).length,score_rows:teacherScores.filter((x:any)=>T(x.learning_objective_id)).length};
    }
  }catch(e){console.error("hrd-live-report-v2 academic TP enrichment",e)}
}

Deno.serve(async(req)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:CORS});
  if(req.method!=="POST")return J({success:false,error:"method_not_allowed"},405);
  try{
    const body=await req.json().catch(()=>({}));
    const upstream=await fetch(`${URL}/functions/v1/hrd-live-report`,{
      method:"POST",
      headers:{"Content-Type":"application/json","apikey":req.headers.get("apikey")||"","Authorization":req.headers.get("Authorization")||"","x-session-token":req.headers.get("x-session-token")||""},
      body:JSON.stringify(body)
    });
    const data=await upstream.json().catch(()=>({success:false,error:"invalid_upstream"}));
    if(!upstream.ok||data?.success===false)return J(data,upstream.status);
    if(T(body?.action).toLowerCase()!=="administration")return J(data,upstream.status);

    const start=T(body.start),end=T(body.end),periodDays=weekdaysInRange(start,end);
    const {data:schedule,error}=await sb.from("uks_duty_schedule").select("teacher_id,weekday,shift_no,start_time,end_time,is_active").eq("is_active",true).order("weekday").order("shift_no");
    if(error)throw error;

    const activeRows=(schedule||[]).filter((r:any)=>periodDays.has(Number(r.weekday)));
    const byTeacher=new Map<string,any[]>();
    for(const row of activeRows){const id=T(row.teacher_id);if(!id)continue;if(!byTeacher.has(id))byTeacher.set(id,[]);byTeacher.get(id)!.push(row)}

    const teachers=data.teachers||[];
    for(const t of teachers){
      cleanCategoryNotes(t);
      const slots=byTeacher.get(T(t.teacher_id))||[];
      const ctx=Array.isArray(t.context_categories)?t.context_categories:[];
      const uks=ctx.find((c:any)=>c?.key==="uks_duty");
      const workload=ctx.find((c:any)=>c?.key==="workload");
      if(!slots.length){
        t.context_categories=ctx.filter((c:any)=>c?.key!=="uks_duty");
        if(workload){
          workload.items=(workload.items||[]).filter((i:any)=>!/^Jaga UKS$/i.test(T(i?.title)));
          workload.note=DISPLAY_NOTES.workload;
          if(uks)workload.item_count=Math.max(0,Number(workload.item_count||0)-Number(uks.item_count||0));
        }
      }else if(uks){
        uks.applicable=true;
        uks.scheduled_slots=slots.length;
        uks.schedule=slots.map((r:any)=>({weekday:Number(r.weekday),day:dayName(Number(r.weekday)),shift_no:Number(r.shift_no),start_time:hhmm(r.start_time),end_time:hhmm(r.end_time)}));
        uks.note=`Jadwal UKS: ${uks.schedule.map((r:any)=>`${r.day}, shift ${r.shift_no} (${r.start_time}–${r.end_time})`).join("; ")}.`;
      }
      t.last_activity_at=[...(t.categories||[]).map((c:any)=>c?.last_created_at).filter(Boolean),...(t.context_categories||[]).map((c:any)=>c?.last_created_at).filter(Boolean)].sort().pop()||null;
    }

    await Promise.all([enrichPhotos(teachers),enrichAcademicTP(teachers)]);
    data.detail_version=2;
    data.summary={...(data.summary||{}),uks_scheduled_teachers:byTeacher.size,uks_active_slots:activeRows.length};
    return J(data,upstream.status);
  }catch(e){console.error(e);return J({success:false,error:"server_error",message:T((e as any)?.message)||"internal_error"},500)}
});
