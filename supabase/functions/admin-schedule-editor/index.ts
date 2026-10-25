import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS={
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"authorization,apikey,content-type,x-session-token",
  "Access-Control-Allow-Methods":"POST,OPTIONS"
};
const J=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...CORS,"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}});
const T=(v:unknown)=>String(v??'').trim();
const L=(v:unknown)=>T(v).toLowerCase();
const now=()=>new Date().toISOString();

function key(){
  const packed=Deno.env.get('SUPABASE_SECRET_KEYS');
  if(packed){try{const x=JSON.parse(packed);if(x?.default)return String(x.default)}catch{}}
  const k=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||Deno.env.get('SUPABASE_SECRET_KEY');
  if(!k)throw new Error('service_key_missing');
  return k;
}
function db(){return createClient(Deno.env.get('SUPABASE_URL')!,key(),{auth:{persistSession:false,autoRefreshToken:false}})}
async function sha(value:string){const d=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));return [...new Uint8Array(d)].map(b=>b.toString(16).padStart(2,'0')).join('')}
function active(v:unknown){return !['inactive','nonaktif','disabled','blocked','blokir','keluar'].includes(L(v))}

async function authAdmin(s:any,req:Request,b:any){
  const token=T(req.headers.get('x-session-token')||b.session_token);
  if(!token)return null;
  const {data:ss}=await s.from('user_sessions').select('user_account_id,expires_at,revoked_at').eq('token_hash',await sha(token)).maybeSingle();
  if(!ss||ss.revoked_at||!ss.expires_at||new Date(ss.expires_at).getTime()<=Date.now())return null;
  const {data:a}=await s.from('user_accounts').select('id,teacher_id,username,status').eq('id',ss.user_account_id).maybeSingle();
  if(!a||!active(a.status))return null;
  const roles=await s.from('user_account_roles').select('role_code,is_active').eq('user_account_id',a.id).eq('is_active',true);
  if(roles.error)return null;
  const ok=(roles.data||[]).some((x:any)=>['admin','akademik','kabid_akademik'].includes(L(x.role_code)));
  return ok?a:null;
}
async function context(s:any){
  const unit=await s.from('school_units').select('id,code,name').eq('code','SD').maybeSingle();
  const year=await s.from('academic_years').select('id,name').eq('is_active',true).maybeSingle();
  if(unit.error||year.error||!unit.data||!year.data)throw new Error('active_context_not_found');
  const sem=await s.from('semesters').select('semester_no').eq('academic_year_id',year.data.id).eq('is_active',true).maybeSingle();
  if(sem.error||![1,2].includes(Number(sem.data?.semester_no)))throw new Error('active_context_not_found');
  return {unitId:unit.data.id,yearId:year.data.id,yearName:year.data.name,semesterNo:Number(sem.data.semester_no)};
}

function minutes(v:unknown){const x=T(v).slice(0,5);if(!/^\d{2}:\d{2}$/.test(x))return null;const [h,m]=x.split(':').map(Number);return h*60+m}
function overlap(a1:unknown,a2:unknown,b1:unknown,b2:unknown){const x1=minutes(a1),x2=minutes(a2),y1=minutes(b1),y2=minutes(b2);if([x1,x2,y1,y2].some(v=>v===null))return false;return (x1 as number)<(y2 as number)&&(y1 as number)<(x2 as number)}
function validTime(v:unknown){return /^([01]\d|2[0-3]):[0-5]\d$/.test(T(v).slice(0,5))}

async function scheduleRows(s:any,c:any){
  const q=await s.from('class_schedule_entries')
    .select('id,class_id,day_of_week,start_time,end_time,subject_id,subject_name_raw,teacher_id,teacher_name_raw,activity_type,slot_label,notes,classes(name,grade_level),subjects(name,grade_level),teachers(full_name)')
    .eq('academic_year_id',c.yearId).eq('semester_no',c.semesterNo).eq('is_active',true).eq('activity_type','teaching')
    .order('day_of_week').order('start_time',{ascending:true,nullsFirst:false}).limit(2000);
  if(q.error)throw q.error;
  return q.data||[];
}
function slot(x:any){return {id:x.id,class_id:x.class_id,class_name:x.classes?.name||'—',grade_level:x.classes?.grade_level??null,start_time:x.start_time,end_time:x.end_time,subject_id:x.subject_id,subject_name:x.subjects?.name||x.subject_name_raw||'—'} }
async function detectConflicts(s:any,c:any){
  const rows=await scheduleRows(s,c);
  const teacher_conflicts:any[]=[];
  const class_conflicts:any[]=[];
  for(let i=0;i<rows.length;i++){
    const a:any=rows[i];
    for(let j=i+1;j<rows.length;j++){
      const b:any=rows[j];
      if(Number(b.day_of_week)>Number(a.day_of_week))break;
      if(Number(a.day_of_week)!==Number(b.day_of_week))continue;
      if(!overlap(a.start_time,a.end_time,b.start_time,b.end_time))continue;
      if(a.teacher_id&&b.teacher_id&&String(a.teacher_id)===String(b.teacher_id)){
        teacher_conflicts.push({kind:'teacher',teacher_id:a.teacher_id,teacher_name:a.teachers?.full_name||a.teacher_name_raw||'—',day_of_week:a.day_of_week,a:slot(a),b:slot(b)});
      }
      if(a.class_id&&b.class_id&&String(a.class_id)===String(b.class_id)){
        class_conflicts.push({kind:'class',class_id:a.class_id,class_name:a.classes?.name||'—',day_of_week:a.day_of_week,a:slot(a),b:slot(b)});
      }
    }
  }
  const teachers_affected=new Set(teacher_conflicts.map(x=>x.teacher_id)).size;
  const classes_affected=new Set([...teacher_conflicts.flatMap(x=>[x.a.class_id,x.b.class_id]),...class_conflicts.map(x=>x.class_id)]).size;
  return {teacher_conflicts,class_conflicts,summary:{teacher_conflicts:teacher_conflicts.length,class_conflicts:class_conflicts.length,total_conflicts:teacher_conflicts.length+class_conflicts.length,teachers_affected,classes_affected}};
}
async function bootstrap(s:any,c:any){
  const [classesQ,teachersQ,subjectsQ,conflicts]=await Promise.all([
    s.from('classes').select('id,name,grade_level').eq('academic_year_id',c.yearId).eq('is_active',true).order('grade_level').order('name'),
    s.from('teachers').select('id,full_name,status').order('full_name'),
    s.from('subjects').select('id,name,grade_level').eq('school_unit_id',c.unitId).eq('is_active',true).order('grade_level').order('name'),
    detectConflicts(s,c)
  ]);
  if(classesQ.error)throw classesQ.error;if(teachersQ.error)throw teachersQ.error;if(subjectsQ.error)throw subjectsQ.error;
  return {academic_year_id:c.yearId,academic_year:c.yearName,semester_no:c.semesterNo,classes:classesQ.data||[],teachers:(teachersQ.data||[]).filter((x:any)=>active(x.status)).map((x:any)=>({id:x.id,name:x.full_name})),subjects:subjectsQ.data||[],conflict_summary:conflicts.summary};
}
async function listSchedule(s:any,c:any,b:any){
  let q=s.from('class_schedule_entries').select('id,class_id,day_of_week,start_time,end_time,subject_id,subject_name_raw,teacher_id,teacher_name_raw,activity_type,slot_label,notes,classes(name,grade_level),subjects(name,grade_level),teachers(full_name)').eq('academic_year_id',c.yearId).eq('semester_no',c.semesterNo).eq('is_active',true).eq('activity_type','teaching').order('day_of_week').order('start_time',{ascending:true,nullsFirst:false});
  if(T(b.class_id))q=q.eq('class_id',T(b.class_id));
  if(Number(b.day_of_week)>=1&&Number(b.day_of_week)<=7)q=q.eq('day_of_week',Number(b.day_of_week));
  const r=await q.limit(1500);if(r.error)throw r.error;return r.data||[];
}
async function saveSchedule(s:any,c:any,a:any,b:any){
  if(T(b.academic_year_id)!==String(c.yearId)||Number(b.semester_no)!==c.semesterNo)throw new Error('active_period_changed');
  const id=T(b.id),classId=T(b.class_id),subjectId=T(b.subject_id),teacherId=T(b.teacher_id),day=Number(b.day_of_week),start=T(b.start_time).slice(0,5),end=T(b.end_time).slice(0,5),reason=T(b.reason).slice(0,500);
  if(!id||!classId||!subjectId||!teacherId||!Number.isInteger(day)||day<1||day>7||!validTime(start)||!validTime(end))throw new Error('invalid_input');
  if((minutes(end) as number)<=(minutes(start) as number))throw new Error('invalid_time_range');
  const [oldQ,classQ,subjectQ,teacherQ]=await Promise.all([
    s.from('class_schedule_entries').select('*').eq('id',id).eq('academic_year_id',c.yearId).eq('semester_no',c.semesterNo).eq('is_active',true).eq('activity_type','teaching').maybeSingle(),
    s.from('classes').select('id,name,grade_level').eq('id',classId).eq('academic_year_id',c.yearId).eq('is_active',true).maybeSingle(),
    s.from('subjects').select('id,name,grade_level').eq('id',subjectId).eq('school_unit_id',c.unitId).eq('is_active',true).maybeSingle(),
    s.from('teachers').select('id,full_name,status').eq('id',teacherId).maybeSingle()
  ]);
  if(oldQ.error)throw oldQ.error;if(classQ.error)throw classQ.error;if(subjectQ.error)throw subjectQ.error;if(teacherQ.error)throw teacherQ.error;
  if(!oldQ.data)throw new Error('schedule_not_found');
  if(!classQ.data||!subjectQ.data||!teacherQ.data||!active(teacherQ.data.status))throw new Error('master_reference_invalid');
  if(subjectQ.data.grade_level!=null&&classQ.data.grade_level!=null&&Number(subjectQ.data.grade_level)!==Number(classQ.data.grade_level))throw new Error('subject_grade_mismatch');
  const [classSlotsQ,teacherSlotsQ]=await Promise.all([
    s.from('class_schedule_entries').select('id,start_time,end_time,subject_name_raw,teacher_name_raw').eq('academic_year_id',c.yearId).eq('semester_no',c.semesterNo).eq('class_id',classId).eq('day_of_week',day).eq('is_active',true).eq('activity_type','teaching').neq('id',id),
    s.from('class_schedule_entries').select('id,start_time,end_time,subject_name_raw,class_id,classes(name)').eq('academic_year_id',c.yearId).eq('semester_no',c.semesterNo).eq('teacher_id',teacherId).eq('day_of_week',day).eq('is_active',true).eq('activity_type','teaching').neq('id',id)
  ]);
  if(classSlotsQ.error)throw classSlotsQ.error;if(teacherSlotsQ.error)throw teacherSlotsQ.error;
  const classConflict=(classSlotsQ.data||[]).find((x:any)=>overlap(start,end,x.start_time,x.end_time));
  if(classConflict)return {ok:false,error:'class_conflict',conflict:classConflict};
  const teacherConflict=(teacherSlotsQ.data||[]).find((x:any)=>overlap(start,end,x.start_time,x.end_time));
  if(teacherConflict)return {ok:false,error:'teacher_conflict',conflict:teacherConflict};
  const patch={class_id:classId,day_of_week:day,start_time:start+':00',end_time:end+':00',subject_id:subjectId,subject_name_raw:subjectQ.data.name,teacher_id:teacherId,teacher_name_raw:teacherQ.data.full_name,slot_label:`${start}-${end}`,notes:reason?`Koreksi jadwal: ${reason}`:oldQ.data.notes,updated_at:now()};
  const upd=await s.from('class_schedule_entries').update(patch).eq('id',id).eq('academic_year_id',c.yearId).eq('semester_no',c.semesterNo).eq('is_active',true).eq('activity_type','teaching').select('*').single();
  if(upd.error){const m=T(upd.error.message);if(m.includes('teacher_schedule_conflict'))return {ok:false,error:'teacher_conflict',conflict:null};if(m.includes('class_schedule_conflict'))return {ok:false,error:'class_conflict',conflict:null};throw upd.error}
  const log=await s.from('class_schedule_change_log').insert({schedule_entry_id:id,changed_by_account_id:a.id,change_type:'update',before_data:oldQ.data,after_data:upd.data,reason:reason||null});
  if(log.error)console.warn('schedule_audit_failed',log.error.message);
  return {ok:true,row:upd.data};
}
async function history(s:any,b:any){const id=T(b.schedule_entry_id);if(!id)throw new Error('invalid_input');const q=await s.from('class_schedule_change_log').select('id,change_type,before_data,after_data,reason,changed_at,changed_by_account_id,user_accounts(username)').eq('schedule_entry_id',id).order('changed_at',{ascending:false}).limit(20);if(q.error)throw q.error;return q.data||[]}

Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:CORS});
  if(req.method!=='POST')return J({success:false,error:'method_not_allowed'},405);
  let body:any={};try{body=await req.json()}catch{return J({success:false,error:'invalid_json'},400)}
  try{
    const s=db(),admin=await authAdmin(s,req,body);if(!admin)return J({success:false,error:'schedule_access_denied'},403);
    const c=await context(s),action=T(body.action)||'bootstrap';
    if(action==='bootstrap')return J({success:true,...await bootstrap(s,c)});
    if(action==='list_conflicts')return J({success:true,...await detectConflicts(s,c)});
    if(action==='list_schedule')return J({success:true,items:await listSchedule(s,c,body)});
    if(action==='save_schedule'){const out=await saveSchedule(s,c,admin,body);if(!out.ok)return J({success:false,error:out.error,conflict:out.conflict},409);return J({success:true,row:out.row,conflict_summary:(await detectConflicts(s,c)).summary})}
    if(action==='history')return J({success:true,items:await history(s,body)});
    return J({success:false,error:'unknown_action'},400);
  }catch(e){const raw=e instanceof Error?e.message:String(e);const msg=raw.includes('teacher_schedule_conflict')?'teacher_conflict':raw.includes('class_schedule_conflict')?'class_conflict':raw;return J({success:false,error:msg},400)}
});
