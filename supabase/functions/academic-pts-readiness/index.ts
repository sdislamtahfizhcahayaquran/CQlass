import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

const CORS={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization,x-client-info,apikey,content-type,x-session-token","Access-Control-Allow-Methods":"POST,OPTIONS"};
const J=(body:any,status=200)=>new Response(JSON.stringify(body),{status,headers:{...CORS,"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}});
const T=(v:any)=>String(v??"").trim();
const L=(v:any)=>T(v).toLowerCase();
const U=(v:any)=>T(v).toUpperCase();
const ACTIVE_BAD=new Set(["nonaktif","inactive","disabled","blocked","blokir","keluar","lulus"]);
const TAH_CORE=["materi_hafalan","lp_tahfizh","realisasi_saat_ini","jumlah_surat","jumlah_baris","jumlah_ayat","jumlah_baris_lp"];
const MANAGEMENT_ROLES=new Set(["admin","hrd","pimpinan","sapras","kabid_akademik","kabid_kesiswaan","kabid_kegiatan","kabid_tahfizh"]);

function serviceKey(){const packed=Deno.env.get("SUPABASE_SECRET_KEYS");if(packed){try{const p=JSON.parse(packed);if(p?.default)return String(p.default)}catch{}}const k=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||Deno.env.get("SUPABASE_SECRET_KEY");if(!k)throw Error("service_key_missing");return k}
function db(){const url=Deno.env.get("SUPABASE_URL");if(!url)throw Error("supabase_url_missing");return createClient(url,serviceKey(),{auth:{persistSession:false,autoRefreshToken:false}})}
async function hash(v:string){const d=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(v));return[...new Uint8Array(d)].map(x=>x.toString(16).padStart(2,"0")).join("")}
function nr(v:any){const x=L(v).replace(/[-\s]+/g,"_").replace(/[^a-z0-9_]/g,"");if(x==="admin"||x.includes("administrator"))return"admin";if(x.includes("pimpinan")||x.includes("kepala_sekolah")||x==="kepsek")return"pimpinan";if(x.includes("kabid_akademik")||x==="akademik"||x.includes("academic"))return"akademik";return x}
async function auth(s:any,req:Request,b:any){const tok=T(req.headers.get("x-session-token")||b.session_token);if(!tok)return null;const {data:ss}=await s.from("user_sessions").select("user_account_id,expires_at,revoked_at").eq("token_hash",await hash(tok)).maybeSingle();if(!ss||ss.revoked_at||!ss.expires_at||new Date(ss.expires_at).getTime()<=Date.now())return null;const {data:a}=await s.from("user_accounts").select("id,teacher_id,username,status").eq("id",ss.user_account_id).maybeSingle();if(!a||ACTIVE_BAD.has(L(a.status)))return null;const roles=new Set<string>();if(L(a.username)==="admin")roles.add("admin");const {data:ar}=await s.from("user_account_roles").select("role_code,role,is_active").eq("user_account_id",a.id).eq("is_active",true);for(const r of ar||[]){const x=nr(r.role_code||r.role);if(x)roles.add(x)}if(a.teacher_id){const {data:ur}=await s.from("user_roles").select("role_code,is_active").eq("teacher_id",a.teacher_id).eq("is_active",true);for(const r of ur||[]){const x=nr(r.role_code);if(x)roles.add(x)}}if(![...roles].some(x=>["admin","pimpinan","akademik"].includes(x)))return{forbidden:true};return{...a,roles:[...roles]}}
function jakartaToday(){const f=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Jakarta",year:"numeric",month:"2-digit",day:"2-digit"});const p=Object.fromEntries(f.formatToParts(new Date()).map(x=>[x.type,x.value]));return`${p.year}-${p.month}-${p.day}`}
function activeStatus(v:any){return !ACTIVE_BAD.has(L(v||"aktif"))}
function tahComplete(r:any){return!!r&&TAH_CORE.every(k=>T(r[k])!=="")}
function gradeComplete(r:any){return!!r&&["activity_grade","skill_grade","competition_grade"].every(k=>T(r[k])!=="")}
function latest(a:string|null,b:any){const x=T(b);return!x?a:(a&&a>=x?a:x)}
async function paged(factory:()=>any){const out:any[]=[];const size=1000;for(let from=0;;from+=size){const {data,error}=await factory().range(from,from+size-1);if(error)throw error;out.push(...(data||[]));if(!data||data.length<size)break}return out}
function newer(a:any,b:any){return T(a?.selected_at)>=T(b?.selected_at)?a:b}

Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:CORS});
 if(req.method!=="POST")return J({success:false,error:"method_not_allowed"},405);
 let b:any={};try{b=await req.json()}catch{return J({success:false,error:"invalid_json"},400)}
 try{
  const s=db(),a=await auth(s,req,b);if(!a)return J({success:false,error:"session_invalid"},401);if(a.forbidden)return J({success:false,error:"forbidden"},403);
  const semesterNo=Number(b.semester_no||1);if(![1,2].includes(semesterNo))return J({success:false,error:"semester_invalid"},400);
  const today=jakartaToday(),attendanceEnd=T(b.attendance_end)||today,attendanceStart=T(b.attendance_start)||attendanceEnd.slice(0,7)+"-01",pointsStart=T(b.points_start)||attendanceStart,pointsEnd=T(b.points_end)||attendanceEnd;
  const {data:unit,error:ue}=await s.from("school_units").select("id").eq("code","SD").maybeSingle();if(ue||!unit)throw Error("school_unit_not_found");
  let yq=s.from("academic_years").select("id,name,is_active").eq("school_unit_id",unit.id);if(T(b.academic_year))yq=yq.eq("name",T(b.academic_year));else yq=yq.eq("is_active",true);const {data:yr,error:ye}=await yq.order("created_at",{ascending:false}).limit(1).maybeSingle();if(ye||!yr)throw Error("academic_year_not_found");
  const yearId=yr.id;

  const [cq,eq,taq,raq,teachersAll,studentsAll]=await Promise.all([
   s.from("classes").select("id,name,code,grade_level").eq("academic_year_id",yearId).eq("is_active",true),
   s.from("student_enrollments").select("student_id,class_id").eq("academic_year_id",yearId).eq("semester_no",semesterNo).eq("is_active",true),
   s.from("teacher_subject_assignments").select("id,teacher_id,class_id,subject_id").eq("academic_year_id",yearId).eq("semester_no",semesterNo).eq("is_active",true),
   s.from("report_class_assignments").select("class_id,homeroom_teacher_id,partner_teacher_id,homeroom_signature_path").eq("academic_year_id",yearId).eq("semester_no",semesterNo),
   paged(()=>s.from("teachers").select("id,full_name,status")),
   paged(()=>s.from("students").select("id,full_name,status"))
  ]);for(const q of[cq,eq,taq,raq])if(q.error)throw q.error;

  const classes=(cq.data||[]).sort((x:any,y:any)=>Number(x.grade_level)-Number(y.grade_level)||T(x.name).localeCompare(T(y.name),"id",{numeric:true}));
  const classIds=classes.map((x:any)=>x.id),classMap=new Map(classes.map((x:any)=>[T(x.id),x]));
  const enrolledSet=new Set((eq.data||[]).map((x:any)=>T(x.student_id)).filter(Boolean));
  const studentMap=new Map((studentsAll||[]).filter((x:any)=>enrolledSet.has(T(x.id))&&activeStatus(x.status)).map((x:any)=>[T(x.id),x]));
  const teacherName=new Map((teachersAll||[]).filter((x:any)=>activeStatus(x.status)).map((x:any)=>[T(x.id),T(x.full_name)||"Tanpa Nama"]));
  const roster=new Map<string,Set<string>>();for(const e of eq.data||[]){const sid=T(e.student_id),cid=T(e.class_id);if(!studentMap.has(sid))continue;if(!roster.has(cid))roster.set(cid,new Set());roster.get(cid)!.add(sid)}

  const subjectIds=[...new Set((taq.data||[]).map((x:any)=>T(x.subject_id)).filter(Boolean))];
  const [subjectsQ,objQ]=await Promise.all([
   subjectIds.length?s.from("subjects").select("id,name,code").in("id",subjectIds):Promise.resolve({data:[],error:null}),
   subjectIds.length?s.from("learning_objectives").select("id,subject_id,grade_level,code").eq("academic_year_id",yearId).eq("semester_no",semesterNo).eq("is_active",true).in("subject_id",subjectIds):Promise.resolve({data:[],error:null})
  ]);for(const q of[subjectsQ,objQ])if(q.error)throw q.error;
  const subjectName=new Map((subjectsQ.data||[]).map((x:any)=>[T(x.id),T(x.name)||T(x.code)]));
  const objectives=new Map<string,string[]>();for(const o of objQ.data||[]){const k=`${T(o.subject_id)}|${Number(o.grade_level)||0}`;(objectives.get(k)||objectives.set(k,[]).get(k)!).push(T(o.id))}

  const scores=classIds.length?await paged(()=>s.from("academic_scores").select("student_id,class_id,subject_id,learning_objective_id,teacher_id,assessment_type,score,updated_at").eq("academic_year_id",yearId).eq("semester_no",semesterNo).eq("assessment_type","TP").is("deleted_at",null).not("score","is",null).in("class_id",classIds)):[];
  const scoreStudents=new Map<string,Set<string>>(),scoreLast=new Map<string,string>();for(const sc of scores){const sid=T(sc.student_id),cid=T(sc.class_id),sub=T(sc.subject_id),oid=T(sc.learning_objective_id);if(!roster.get(cid)?.has(sid)||!oid)continue;const k=`${cid}|${sub}|${oid}`;if(!scoreStudents.has(k))scoreStudents.set(k,new Set());scoreStudents.get(k)!.add(sid);const ak=`${cid}|${sub}`;scoreLast.set(ak,latest(scoreLast.get(ak)||null,sc.updated_at)||"")}
  const uniqAssign=new Map<string,any>();for(const x of taq.data||[]){const k=`${T(x.teacher_id)}|${T(x.class_id)}|${T(x.subject_id)}`;if(!uniqAssign.has(k))uniqAssign.set(k,x)}
  const academicAssignments:any[]=[];for(const as of uniqAssign.values()){const cid=T(as.class_id),sub=T(as.subject_id),tid=T(as.teacher_id),cl:any=classMap.get(cid)||{},rs=roster.get(cid)||new Set<string>(),oids=objectives.get(`${sub}|${Number(cl.grade_level)||0}`)||[];let completed=0,started=0;for(const oid of oids){const n=scoreStudents.get(`${cid}|${sub}|${oid}`)?.size||0;if(n>0)started++;if(rs.size>0&&n>=rs.size)completed++}academicAssignments.push({teacher_id:tid,teacher_name:teacherName.get(tid)||"Tanpa Guru",class_id:cid,class_name:T(cl.name)||T(cl.code),subject_id:sub,subject_name:subjectName.get(sub)||"Mapel",students:rs.size,configured_tp:oids.length,started_tp:started,complete_tp:completed,required_tp:2,done:completed>=2,last_update:scoreLast.get(`${cid}|${sub}`)||null})}
  const ag=new Map<string,any>();for(const x of academicAssignments){if(!ag.has(x.teacher_id))ag.set(x.teacher_id,{teacher_id:x.teacher_id,teacher_name:x.teacher_name,total_assignments:0,ready_assignments:0,last_update:null,assignments:[]});const g=ag.get(x.teacher_id);g.total_assignments++;if(x.done)g.ready_assignments++;g.last_update=latest(g.last_update,x.last_update);g.assignments.push(x)}
  const academicTeachers=[...ag.values()].map((g:any)=>({...g,status:g.total_assignments>0&&g.ready_assignments===g.total_assignments?"selesai":g.ready_assignments>0?"sebagian":"belum",missing_assignments:g.assignments.filter((x:any)=>!x.done).map((x:any)=>`${x.class_name} · ${x.subject_name} (${x.complete_tp}/2 TP)`)})).sort((x:any,y:any)=>x.status.localeCompare(y.status)||x.teacher_name.localeCompare(y.teacher_name,"id"));
  const academicByClass=new Map<string,any[]>();for(const x of academicAssignments){if(!academicByClass.has(x.class_id))academicByClass.set(x.class_id,[]);academicByClass.get(x.class_id)!.push(x)}

  const [rewardRows,disciplineRows,activityQ,selectionQ,attendanceQ,hRosterQ,tahQ,intMembersQ,intAssessQ,extStudentsQ,extAssessQ,signatureQ,accountsQ,accountRolesQ,teacherRolesQ]=await Promise.all([
   classIds.length?paged(()=>s.from("student_rewards").select("class_id,updated_at").in("class_id",classIds).gte("reward_date",pointsStart).lte("reward_date",pointsEnd).eq("is_deleted",false).eq("is_verified",true)):[],
   classIds.length?paged(()=>s.from("discipline_incidents").select("class_id,updated_at").in("class_id",classIds).gte("incident_date",pointsStart).lte("incident_date",pointsEnd).eq("is_deleted",false)):[],
   classIds.length?s.from("school_activity_matrix_marks").select("class_id,student_id,activity_code,participated,updated_at").eq("academic_year_id",yearId).eq("semester_no",semesterNo).in("class_id",classIds):Promise.resolve({data:[],error:null}),
   classIds.length?s.from("attendance_report_source_selection").select("class_id,source_mode,period_start,period_end,selected_at").eq("academic_year_id",yearId).eq("semester_no",semesterNo).in("class_id",classIds):Promise.resolve({data:[],error:null}),
   classIds.length?s.from("attendance_report_finalization").select("class_id,student_id,period_start,period_end,validation_status,validated_at,updated_at").eq("academic_year_id",yearId).eq("semester_no",semesterNo).in("class_id",classIds):Promise.resolve({data:[],error:null}),
   s.from("partner_tahfizh_halaqah_roster").select("student_id,class_id,partner_teacher_id,source_teacher_label").eq("academic_year_id",yearId).eq("semester_no",semesterNo).eq("is_active",true).not("student_id","is",null),
   s.from("tahfizh_pts_reports").select("student_id,class_id,guru_halaqah,materi_hafalan,lp_tahfizh,realisasi_saat_ini,jumlah_surat,jumlah_baris,jumlah_ayat,jumlah_baris_lp,updated_at").eq("academic_year_id",yearId).eq("semester_no",semesterNo).eq("period_type","PTS"),
   s.from("extracurricular_members").select("extracurricular_id,student_id,status,updated_at").eq("academic_year_id",yearId),
   s.from("extracurricular_assessments").select("extracurricular_id,student_id,activity_grade,skill_grade,competition_grade,assessment_period,updated_at").eq("academic_year_id",yearId).eq("semester_no",semesterNo),
   s.from("extracurricular_external_students").select("id,student_id,is_active,updated_at").eq("academic_year_id",yearId).eq("semester_no",semesterNo).eq("is_active",true),
   s.from("extracurricular_external_assessments").select("external_student_id,student_id,activity_grade,skill_grade,competition_grade,assessment_period,updated_at").eq("academic_year_id",yearId).eq("semester_no",semesterNo),
   s.from("teacher_signatures").select("teacher_id,updated_at"),
   s.from("user_accounts").select("id,teacher_id,username,status"),
   s.from("user_account_roles").select("user_account_id,role_code,role,is_active").eq("is_active",true),
   s.from("user_roles").select("teacher_id,role_code,is_active").eq("is_active",true)
  ]);
  for(const q of[activityQ,selectionQ,attendanceQ,hRosterQ,tahQ,intMembersQ,intAssessQ,extStudentsQ,extAssessQ,signatureQ,accountsQ,accountRolesQ,teacherRolesQ])if((q as any).error)throw (q as any).error;

  const rewardCount=new Map<string,number>(),rewardLast=new Map<string,string>(),disciplineCount=new Map<string,number>(),disciplineLast=new Map<string,string>();for(const x of rewardRows){const c=T(x.class_id);rewardCount.set(c,(rewardCount.get(c)||0)+1);rewardLast.set(c,latest(rewardLast.get(c)||null,x.updated_at)||"")}for(const x of disciplineRows){const c=T(x.class_id);disciplineCount.set(c,(disciplineCount.get(c)||0)+1);disciplineLast.set(c,latest(disciplineLast.get(c)||null,x.updated_at)||"")}

  // Kegiatan: requirement Kabid Akademik = minimal 1 kegiatan tercatat untuk kelas.
  const actUsed=new Map<string,Set<string>>(),actLast=new Map<string,string>();for(const m of activityQ.data||[]){const c=T(m.class_id),sid=T(m.student_id),code=U(m.activity_code);if(!roster.get(c)?.has(sid)||!code)continue;if(m.participated===true){if(!actUsed.has(c))actUsed.set(c,new Set());actUsed.get(c)!.add(code)}actLast.set(c,latest(actLast.get(c)||null,m.updated_at)||"")}

  // Absensi: sama dengan rapor. Default adalah Sistem. Hanya jika walas memilih Rekap Editable,
  // seluruh siswa pada periode editable terpilih wajib sudah divalidasi.
  const latestSelection=new Map<string,any>();for(const x of selectionQ.data||[]){const cid=T(x.class_id),old=latestSelection.get(cid);latestSelection.set(cid,old?newer(x,old):x)}
  const attGroups=new Map<string,{students:Set<string>,last:string|null}>();for(const r of attendanceQ.data||[]){const cid=T(r.class_id),sid=T(r.student_id);if(!roster.get(cid)?.has(sid)||L(r.validation_status)!=="validated")continue;const key=`${cid}|${T(r.period_start)}|${T(r.period_end)}`;if(!attGroups.has(key))attGroups.set(key,{students:new Set<string>(),last:null});const g=attGroups.get(key)!;g.students.add(sid);g.last=latest(g.last,r.validated_at||r.updated_at)}

  const tahReport=new Map((tahQ.data||[]).map((x:any)=>[T(x.student_id),x]));const tahByClass=new Map<string,{total:number,complete:number,last:string|null}>(),tahGroups=new Map<string,any>();for(const r of hRosterQ.data||[]){const sid=T(r.student_id),cid=T(r.class_id);if(!studentMap.has(sid)||!classMap.has(cid))continue;const rep=tahReport.get(sid),ok=tahComplete(rep),stat=tahByClass.get(cid)||{total:0,complete:0,last:null};stat.total++;if(ok)stat.complete++;stat.last=latest(stat.last,rep?.updated_at);tahByClass.set(cid,stat);const tid=T(r.partner_teacher_id),label=T(r.source_teacher_label),key=tid?`id:${tid}`:`label:${label||"Tanpa Guru"}`;if(!tahGroups.has(key))tahGroups.set(key,{teacher_id:tid||null,teacher_name:teacherName.get(tid)||label||"Tanpa Guru Halaqah",total_students:0,complete_students:0,last_update:null,classes:new Set<string>()});const g=tahGroups.get(key);g.total_students++;if(ok)g.complete_students++;g.last_update=latest(g.last_update,rep?.updated_at);g.classes.add(T((classMap.get(cid) as any)?.name)||(classMap.get(cid) as any)?.code||cid)}const tahfizhTeachers=[...tahGroups.values()].map((g:any)=>({...g,classes:[...g.classes],status:g.total_students>0&&g.complete_students===g.total_students?"selesai":g.complete_students>0?"sebagian":"belum"})).sort((x:any,y:any)=>x.status.localeCompare(y.status)||x.teacher_name.localeCompare(y.teacher_name,"id"));

  // Ekskul: denominator hanya siswa yang benar-benar ikut ekskul internal dan/atau eksternal.
  const intMembers=new Map<string,any[]>();for(const m of intMembersQ.data||[]){if(!activeStatus(m.status))continue;const sid=T(m.student_id);if(!studentMap.has(sid))continue;if(!intMembers.has(sid))intMembers.set(sid,[]);intMembers.get(sid)!.push(m)}
  const intAssess=new Map<string,any>();for(const r of intAssessQ.data||[]){if(U(r.assessment_period)!=="PTS")continue;intAssess.set(`${T(r.student_id)}|${T(r.extracurricular_id)}`,r)}
  const extStudents=new Map<string,any[]>();for(const r of extStudentsQ.data||[]){const sid=T(r.student_id);if(!studentMap.has(sid))continue;if(!extStudents.has(sid))extStudents.set(sid,[]);extStudents.get(sid)!.push(r)}
  const extAssess=new Map<string,any>();for(const r of extAssessQ.data||[]){if(U(r.assessment_period)!=="PTS")continue;const k=T(r.external_student_id)||`student:${T(r.student_id)}`;extAssess.set(k,r)}
  const extraByClass=new Map<string,{total:number,complete:number,last:string|null}>();for(const [cid,set] of roster.entries()){const stat={total:0,complete:0,last:null as string|null};for(const sid of set){const im=intMembers.get(sid)||[],ex=extStudents.get(sid)||[];if(!im.length&&!ex.length)continue;stat.total++;let ok=true,last:string|null=null;for(const m of im){const r=intAssess.get(`${sid}|${T(m.extracurricular_id)}`);if(!gradeComplete(r))ok=false;last=latest(last,r?.updated_at||m.updated_at)}for(const x of ex){const r=extAssess.get(T(x.id))||extAssess.get(`student:${sid}`);if(!gradeComplete(r))ok=false;last=latest(last,r?.updated_at||x.updated_at)}if(ok)stat.complete++;stat.last=latest(stat.last,last)}extraByClass.set(cid,stat)}

  const signatureTeachers=new Set((signatureQ.data||[]).map((x:any)=>T(x.teacher_id)).filter(Boolean));
  const signatureLast=new Map((signatureQ.data||[]).map((x:any)=>[T(x.teacher_id),T(x.updated_at)||null]));
  const walasMap=new Map((raq.data||[]).map((x:any)=>[T(x.class_id),x]));
  const classRows:any[]=[];
  for(const cl of classes){
    const cid=T(cl.id),rs=roster.get(cid)||new Set<string>(),as=academicByClass.get(cid)||[],academicDone=as.length>0&&as.every(x=>x.done),rc=rewardCount.get(cid)||0,dc=disciplineCount.get(cid)||0;
    const used=[...(actUsed.get(cid)||new Set<string>())],activityDone=used.length>=1;
    const sel:any=latestSelection.get(cid),source=L(sel?.source_mode)==="editable"?"editable":"system";
    let validated=rs.size,attendanceDone=true,attendanceLast:T(sel?.selected_at)||null;
    if(source==="editable"){
      const g=attGroups.get(`${cid}|${T(sel?.period_start)}|${T(sel?.period_end)}`);validated=g?.students.size||0;attendanceDone=rs.size>0&&validated>=rs.size;attendanceLast=latest(attendanceLast,g?.last)||attendanceLast;
    }
    const th=tahByClass.get(cid)||{total:0,complete:0,last:null},tahDone=th.total>0&&th.complete===th.total;
    const ex=extraByClass.get(cid)||{total:0,complete:0,last:null},extraDone=ex.total===0||ex.complete===ex.total;
    const w:any=walasMap.get(cid)||{},walasId=T(w.homeroom_teacher_id),signatureDone=!!walasId&&(signatureTeachers.has(walasId)||!!T(w.homeroom_signature_path));
    const components={academic:academicDone,reward:rc>0,discipline:dc>0,activity:activityDone,attendance:attendanceDone,tahfizh:tahDone,extracurricular:extraDone,signature:signatureDone},missing:string[]=[];
    if(!academicDone)missing.push("Nilai minimal 2 TP");if(rc===0)missing.push("Reward belum terdeteksi / perlu konfirmasi nihil");if(dc===0)missing.push("Kedisiplinan belum terdeteksi / perlu konfirmasi nihil");if(!activityDone)missing.push("Minimal 1 kegiatan");if(!attendanceDone)missing.push("Absensi Rekap Editable belum lengkap");if(!tahDone)missing.push("Tahfizh");if(!extraDone)missing.push("Ekskul PTS peserta");if(!signatureDone)missing.push("TTD wali kelas");
    classRows.push({class_id:cid,class_name:T(cl.name)||T(cl.code),grade_level:Number(cl.grade_level)||0,students:rs.size,homeroom_teacher_id:walasId||null,homeroom_teacher:teacherName.get(walasId)||"Belum ditetapkan",partner_teacher:teacherName.get(T(w.partner_teacher_id))||null,components,status:missing.length?"belum_siap":"siap",missing,academic:{ready_assignments:as.filter(x=>x.done).length,total_assignments:as.length,last_update:as.reduce((z:any,x:any)=>latest(z,x.last_update),null)},reward:{count:rc,last_update:rewardLast.get(cid)||null},discipline:{count:dc,last_update:disciplineLast.get(cid)||null},activity:{used_codes:used.length,last_update:actLast.get(cid)||null},attendance:{source_mode:source,source_label:source==="editable"?"Rekap Editable":"Sistem",validated_students:validated,total_students:rs.size,period_start:T(sel?.period_start)||attendanceStart,period_end:T(sel?.period_end)||attendanceEnd,last_update:attendanceLast},tahfizh:{complete_students:th.complete,total_students:th.total,last_update:th.last},extracurricular:{complete_students:ex.complete,total_students:ex.total,last_update:ex.last},signature:{done:signatureDone,last_update:signatureLast.get(walasId)||null}})
  }

  const walas=classRows.map(r=>{const own=[r.components.reward,r.components.discipline,r.components.activity,r.components.attendance,r.components.extracurricular,r.components.signature],done=own.filter(Boolean).length;return{teacher_id:r.homeroom_teacher_id,teacher_name:r.homeroom_teacher,class_id:r.class_id,class_name:r.class_name,done_components:done,total_components:own.length,status:done===own.length?"selesai":done>0?"sebagian":"belum",components:{reward:r.components.reward,discipline:r.components.discipline,activity:r.components.activity,attendance:r.components.attendance,extracurricular:r.components.extracurricular,signature:r.components.signature}}});

  // Jangan biarkan akun aktif hilang diam-diam dari monitoring. Tampilkan akun guru yang tidak punya
  // penugasan mapel, walas/partner, atau halaqah. Akun manajerial murni tidak dihitung sebagai gap.
  const represented=new Set<string>();for(const x of taq.data||[])if(T(x.teacher_id))represented.add(T(x.teacher_id));for(const x of raq.data||[]){if(T(x.homeroom_teacher_id))represented.add(T(x.homeroom_teacher_id));if(T(x.partner_teacher_id))represented.add(T(x.partner_teacher_id))}for(const x of hRosterQ.data||[])if(T(x.partner_teacher_id))represented.add(T(x.partner_teacher_id));
  const rolesByAccount=new Map<string,Set<string>>(),rolesByTeacher=new Map<string,Set<string>>();for(const r of accountRolesQ.data||[]){const id=T(r.user_account_id),role=nr(r.role_code||r.role);if(!id||!role)continue;if(!rolesByAccount.has(id))rolesByAccount.set(id,new Set());rolesByAccount.get(id)!.add(role)}for(const r of teacherRolesQ.data||[]){const id=T(r.teacher_id),role=nr(r.role_code);if(!id||!role)continue;if(!rolesByTeacher.has(id))rolesByTeacher.set(id,new Set());rolesByTeacher.get(id)!.add(role)}
  const unmappedAccounts:any[]=[];for(const ua of accountsQ.data||[]){const tid=T(ua.teacher_id),aid=T(ua.id);if(!tid||!activeStatus(ua.status)||represented.has(tid)||L(ua.username)==="admin")continue;const roles=new Set<string>([...(rolesByAccount.get(aid)||[]),...(rolesByTeacher.get(tid)||[])]);const roleList=[...roles];const managementOnly=roleList.length>0&&roleList.every(r=>MANAGEMENT_ROLES.has(r));if(managementOnly)continue;unmappedAccounts.push({account_id:aid,teacher_id:tid,username:T(ua.username),teacher_name:teacherName.get(tid)||T(ua.username)||"Tanpa Nama",roles:roleList})}unmappedAccounts.sort((x,y)=>x.teacher_name.localeCompare(y.teacher_name,"id"));

  const summary={classes:classRows.length,classes_ready:classRows.filter(x=>x.status==="siap").length,academic_teachers:academicTeachers.length,academic_teachers_done:academicTeachers.filter(x=>x.status==="selesai").length,walas:walas.length,walas_done:walas.filter(x=>x.status==="selesai").length,tahfizh_teachers:tahfizhTeachers.length,tahfizh_teachers_done:tahfizhTeachers.filter(x=>x.status==="selesai").length,unmapped_accounts:unmappedAccounts.length};
  return J({success:true,academic_year:yr.name,semester_no:semesterNo,generated_at:new Date().toISOString(),attendance_period:{start:attendanceStart,end:attendanceEnd},points_period:{start:pointsStart,end:pointsEnd},summary,classes:classRows,academic_teachers:academicTeachers,walas,tahfizh_teachers:tahfizhTeachers,unmapped_accounts:unmappedAccounts,rules:{academic:"minimal_2_tp_full_class",activity:"minimal_1_activity_per_class",attendance:"system_default_editable_if_selected",extracurricular:"participants_only_internal_external",signature:"homeroom_signature_required"},note:"Reward dan kedisiplinan tanpa baris pada periode tetap perlu cek/konfirmasi nihil."});
 }catch(e){console.error("academic-pts-readiness",e);return J({success:false,error:T((e as any)?.message)||"server_error"},500)}
});
