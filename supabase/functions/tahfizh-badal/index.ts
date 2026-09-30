import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS={
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"authorization,apikey,content-type,x-session-token",
  "Access-Control-Allow-Methods":"POST,OPTIONS"
};
const J=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...CORS,"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}});
const T=(v:unknown)=>String(v??'').trim();
const L=(v:unknown)=>T(v).toLowerCase();

function secretKey(){
  const packed=Deno.env.get('SUPABASE_SECRET_KEYS');
  if(packed){try{const x=JSON.parse(packed);if(x?.default)return String(x.default)}catch{}}
  const key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||Deno.env.get('SUPABASE_SECRET_KEY');
  if(!key)throw new Error('service_key_missing');
  return key;
}
function db(){return createClient(Deno.env.get('SUPABASE_URL')!,secretKey(),{auth:{persistSession:false,autoRefreshToken:false}})}
async function sha(value:string){const d=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));return [...new Uint8Array(d)].map(b=>b.toString(16).padStart(2,'0')).join('')}
function active(v:unknown){return !['nonaktif','inactive','disabled','blocked','blokir','keluar'].includes(L(v))}
function normRole(v:unknown){return L(v).replace(/[-\s]+/g,'_')}

async function auth(s:any,req:Request,b:any){
  const token=T(req.headers.get('x-session-token')||b.session_token);if(!token)return null;
  const {data:ss}=await s.from('user_sessions').select('user_account_id,expires_at,revoked_at').eq('token_hash',await sha(token)).maybeSingle();
  if(!ss||ss.revoked_at||!ss.expires_at||new Date(ss.expires_at).getTime()<=Date.now())return null;
  const {data:account}=await s.from('user_accounts').select('id,teacher_id,username,status').eq('id',ss.user_account_id).maybeSingle();
  if(!account||!active(account.status))return null;
  const roles:string[]=[];if(L(account.username)==='admin')roles.push('admin');
  if(account.teacher_id){const {data:rr}=await s.from('user_roles').select('role_code,is_active').eq('teacher_id',account.teacher_id).eq('is_active',true);for(const r of rr||[])roles.push(normRole(r.role_code))}
  return {account,roles:[...new Set(roles)]};
}
function allowed(a:any){return a?.roles?.some((r:string)=>['admin','kabid_quran','kabid_tahfizh','tahfizh'].includes(r))}

async function context(s:any){
  const {data:unit}=await s.from('school_units').select('id,code').eq('code','SD').maybeSingle();if(!unit)throw new Error('school_unit_not_found');
  const {data:year}=await s.from('academic_years').select('id,name').eq('school_unit_id',unit.id).eq('is_active',true).order('start_date',{ascending:false}).limit(1).maybeSingle();if(!year)throw new Error('academic_year_not_found');
  const {data:sem}=await s.from('semesters').select('semester_no').eq('academic_year_id',year.id).eq('is_active',true).maybeSingle();
  return {unitId:unit.id,yearId:year.id,year:year.name,semesterNo:Number(sem?.semester_no||1)};
}
function todayJakarta(){const f=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'});const p=Object.fromEntries(f.formatToParts(new Date()).map(x=>[x.type,x.value]));return `${p.year}-${p.month}-${p.day}`}
function isoDow(date:string){const x=new Date(date+'T12:00:00Z').getUTCDay();return x===0?7:x}
function mins(v:unknown){const s=T(v).slice(0,5);if(!/^\d{2}:\d{2}$/.test(s))return null;const [h,m]=s.split(':').map(Number);return h*60+m}
function overlap(a1:unknown,a2:unknown,b1:unknown,b2:unknown){const x1=mins(a1),x2=mins(a2),y1=mins(b1),y2=mins(b2);if([x1,x2,y1,y2].some(v=>v===null))return false;return (x1 as number)<(y2 as number)&&(y1 as number)<(x2 as number)}
function roleLabel(roles:string[]){if(roles.includes('kabid_quran')||roles.includes('kabid_tahfizh'))return "Kabid Qur'an";if(roles.includes('kabid_akademik'))return 'Kabid Akademik';if(roles.includes('kabid_kesiswaan'))return 'Kabid Kesiswaan';if(roles.includes('kabid_kegiatan'))return 'Kabid Kegiatan';return 'Guru'}

async function baseData(s:any,ctx:any,date:string){
  const dow=isoDow(date);
  const [teachersQ,rolesQ,classesQ,assignQ,schedQ,subsQ,extQ]=await Promise.all([
    s.from('teachers').select('id,full_name,status').order('full_name'),
    s.from('user_roles').select('teacher_id,role_code,is_active').eq('is_active',true),
    s.from('classes').select('id,name,grade_level').eq('academic_year_id',ctx.yearId).eq('is_active',true),
    s.from('tahfizh_teacher_assignments').select('teacher_id,class_id,team_name,is_active').eq('academic_year_id',ctx.yearId).eq('semester_no',ctx.semesterNo).eq('is_active',true),
    s.from('class_schedule_entries').select('id,class_id,start_time,end_time,slot_label').eq('academic_year_id',ctx.yearId).eq('semester_no',ctx.semesterNo).eq('day_of_week',dow).eq('activity_type','tahfizh').eq('is_active',true).order('start_time'),
    s.from('tahfizh_substitution_assignments').select('id,work_date,class_id,original_teacher_id,start_time,end_time,substitute_teacher_id,substitute_external_person_id,substitute_name,substitute_type,reason,status').eq('academic_year_id',ctx.yearId).eq('semester_no',ctx.semesterNo).eq('work_date',date).eq('status','active'),
    s.from('tahfizh_external_personnel').select('id,full_name,personnel_type,is_active').eq('is_active',true).order('full_name')
  ]);
  for(const q of [teachersQ,rolesQ,classesQ,assignQ,schedQ,subsQ,extQ])if(q.error)throw q.error;
  const teachers=teachersQ.data||[], roles=rolesQ.data||[], classes=classesQ.data||[], assignments=assignQ.data||[], schedules=schedQ.data||[], subs=subsQ.data||[], external=extQ.data||[];
  const tm=new Map(teachers.map((x:any)=>[String(x.id),x]));
  const cm=new Map(classes.map((x:any)=>[String(x.id),x]));
  const roleMap=new Map<string,string[]>();for(const r of roles){const k=String(r.teacher_id||'');if(!k)continue;if(!roleMap.has(k))roleMap.set(k,[]);roleMap.get(k)!.push(normRole(r.role_code))}
  const blocked=new Set(['admin','hrd','sapras','pimpinan','kepsek','kepala_sekolah']);
  const candidates=teachers.filter((x:any)=>{
    if(!active(x.status))return false;const rr=roleMap.get(String(x.id))||[];const isKabid=rr.some(r=>r.startsWith('kabid_'));const isBlocked=rr.some(r=>blocked.has(r));return isKabid||!isBlocked;
  }).map((x:any)=>{const rr=roleMap.get(String(x.id))||[];const label=roleLabel(rr);return{id:x.id,name:x.full_name,role_label:label,kind:label.startsWith('Kabid')?'kabid':'guru'}}).sort((a:any,b:any)=>a.name.localeCompare(b.name,'id'));

  const schedByClass=new Map<string,any[]>();for(const x of schedules){const k=String(x.class_id);if(!schedByClass.has(k))schedByClass.set(k,[]);schedByClass.get(k)!.push(x)}
  const seen=new Set<string>(),sessions:any[]=[];
  for(const a of assignments){
    const teacher=tm.get(String(a.teacher_id));const cls=cm.get(String(a.class_id));if(!teacher||!cls||!active(teacher.status))continue;
    const keyBase=`${a.teacher_id}|${a.class_id}`;if(seen.has(keyBase))continue;seen.add(keyBase);
    const slots=schedByClass.get(String(a.class_id))||[];
    for(const sl of slots){sessions.push({key:`${a.teacher_id}|${a.class_id}|${T(sl.start_time)}`,teacher_id:a.teacher_id,teacher_name:teacher.full_name,class_id:a.class_id,class_name:cls.name,team_name:a.team_name||'',start_time:sl.start_time,end_time:sl.end_time,slot_label:sl.slot_label||''})}
  }
  sessions.sort((a,b)=>T(a.start_time).localeCompare(T(b.start_time))||T(a.class_name).localeCompare(T(b.class_name),'id')||T(a.teacher_name).localeCompare(T(b.teacher_name),'id'));
  return {date,dow,candidates,external,sessions,substitutions:subs,teachers,classes};
}

async function bootstrap(s:any,ctx:any,dateRaw:unknown){const date=/^\d{4}-\d{2}-\d{2}$/.test(T(dateRaw))?T(dateRaw):todayJakarta();const d=await baseData(s,ctx,date);return{date:d.date,academic_year:ctx.year,semester_no:ctx.semesterNo,candidates:d.candidates,external:d.external,sessions:d.sessions,substitutions:d.substitutions}}

async function internalConflict(s:any,ctx:any,date:string,classId:string,teacherId:string,start:any,end:any){
  const dow=isoDow(date);
  const [ownQ,acadBadalQ,tahBadalQ,assignQ]=await Promise.all([
    s.from('class_schedule_entries').select('id,start_time,end_time').eq('academic_year_id',ctx.yearId).eq('semester_no',ctx.semesterNo).eq('day_of_week',dow).eq('teacher_id',teacherId).eq('is_active',true),
    s.from('teacher_substitution_assignments').select('id,start_time,end_time').eq('academic_year_id',ctx.yearId).eq('semester_no',ctx.semesterNo).eq('work_date',date).eq('substitute_teacher_id',teacherId).eq('status','active'),
    s.from('tahfizh_substitution_assignments').select('id,start_time,end_time').eq('academic_year_id',ctx.yearId).eq('semester_no',ctx.semesterNo).eq('work_date',date).eq('substitute_teacher_id',teacherId).eq('status','active'),
    s.from('tahfizh_teacher_assignments').select('class_id').eq('academic_year_id',ctx.yearId).eq('semester_no',ctx.semesterNo).eq('teacher_id',teacherId).eq('is_active',true)
  ]);
  for(const q of [ownQ,acadBadalQ,tahBadalQ,assignQ])if(q.error)throw q.error;
  if((ownQ.data||[]).some((x:any)=>overlap(start,end,x.start_time,x.end_time)))return 'teacher_conflict_schedule';
  if((acadBadalQ.data||[]).some((x:any)=>overlap(start,end,x.start_time,x.end_time)))return 'teacher_conflict_academic_badal';
  if((tahBadalQ.data||[]).some((x:any)=>overlap(start,end,x.start_time,x.end_time)))return 'teacher_conflict_tahfizh_badal';
  const otherClasses=[...new Set((assignQ.data||[]).map((x:any)=>String(x.class_id)).filter((id:string)=>id&&id!==classId))];
  if(otherClasses.length){const q=await s.from('class_schedule_entries').select('class_id,start_time,end_time').eq('academic_year_id',ctx.yearId).eq('semester_no',ctx.semesterNo).eq('day_of_week',dow).eq('activity_type','tahfizh').eq('is_active',true).in('class_id',otherClasses);if(q.error)throw q.error;if((q.data||[]).some((x:any)=>overlap(start,end,x.start_time,x.end_time)))return 'teacher_conflict_halaqah'}
  return null;
}

async function saveExternal(s:any,a:any,name:string){
  const n=T(name);if(!n)throw new Error('manual_name_required');
  const {data:all,error}=await s.from('tahfizh_external_personnel').select('id,full_name,is_active');if(error)throw error;
  const found=(all||[]).find((x:any)=>L(x.full_name)===L(n));
  if(found){if(!found.is_active){const q=await s.from('tahfizh_external_personnel').update({is_active:true,updated_at:new Date().toISOString()}).eq('id',found.id);if(q.error)throw q.error}return found.id}
  const q=await s.from('tahfizh_external_personnel').insert({full_name:n,personnel_type:'pengabdian',created_by_account_id:a.account.id}).select('id').single();if(q.error)throw q.error;return q.data.id;
}

async function assign(s:any,a:any,ctx:any,b:any){
  const date=T(b.work_date),classId=T(b.class_id),originalId=T(b.original_teacher_id),start=T(b.start_time),end=T(b.end_time),source=T(b.substitute_source),reason=T(b.reason);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!classId||!originalId||!start||!end||!source)throw new Error('invalid_input');
  const data=await baseData(s,ctx,date);
  const target=data.sessions.find((x:any)=>String(x.class_id)===classId&&String(x.teacher_id)===originalId&&T(x.start_time).slice(0,5)===start.slice(0,5));
  if(!target)throw new Error('halaqah_not_found');
  let subTeacherId:string|null=null,extId:string|null=null,subName='',subType='manual';
  if(source==='teacher'){
    subTeacherId=T(b.substitute_teacher_id);if(!subTeacherId)throw new Error('substitute_required');if(subTeacherId===originalId)throw new Error('same_teacher');
    const cand=data.candidates.find((x:any)=>String(x.id)===subTeacherId);if(!cand)throw new Error('substitute_not_allowed');
    const conflict=await internalConflict(s,ctx,date,classId,subTeacherId,start,end);if(conflict)throw new Error(conflict);
    subName=cand.name;subType='teacher';
  }else if(source==='external'){
    extId=T(b.substitute_external_person_id);const ext=data.external.find((x:any)=>String(x.id)===extId);if(!ext)throw new Error('external_not_found');subName=ext.full_name;subType='pengabdian';
  }else if(source==='manual'){
    subName=T(b.substitute_name_manual);if(!subName)throw new Error('manual_name_required');
    if(Boolean(b.save_as_pengabdian)){extId=await saveExternal(s,a,subName);subType='pengabdian'}else subType='manual';
  }else throw new Error('invalid_substitute_source');

  const existing=await s.from('tahfizh_substitution_assignments').select('id').eq('academic_year_id',ctx.yearId).eq('semester_no',ctx.semesterNo).eq('work_date',date).eq('class_id',classId).eq('original_teacher_id',originalId).eq('start_time',start).eq('status','active').maybeSingle();if(existing.error)throw existing.error;
  const row={school_unit_id:ctx.unitId,academic_year_id:ctx.yearId,semester_no:ctx.semesterNo,work_date:date,class_id:classId,original_teacher_id:originalId,start_time:start,end_time:end,substitute_teacher_id:subTeacherId||null,substitute_external_person_id:extId||null,substitute_name:subName,substitute_type:subType,reason:reason||null,status:'active',created_by_account_id:a.account.id,updated_at:new Date().toISOString()};
  const q=existing.data?await s.from('tahfizh_substitution_assignments').update(row).eq('id',existing.data.id).select('*').single():await s.from('tahfizh_substitution_assignments').insert(row).select('*').single();if(q.error)throw q.error;return q.data;
}

async function edit(s:any,a:any,ctx:any,b:any){
  const id=T(b.id),subTeacherId=T(b.substitute_teacher_id),reason=T(b.reason);if(!id||!subTeacherId)throw new Error('invalid_input');
  const cur=await s.from('tahfizh_substitution_assignments').select('id,work_date,class_id,original_teacher_id,start_time,end_time,status').eq('id',id).eq('academic_year_id',ctx.yearId).eq('semester_no',ctx.semesterNo).maybeSingle();if(cur.error)throw cur.error;if(!cur.data)throw new Error('badal_not_found');if(cur.data.status!=='active')throw new Error('badal_not_active');
  if(String(cur.data.original_teacher_id)===subTeacherId)throw new Error('same_teacher');
  const data=await baseData(s,ctx,cur.data.work_date),cand=data.candidates.find((x:any)=>String(x.id)===subTeacherId);if(!cand)throw new Error('substitute_not_allowed');
  const conflict=await internalConflict(s,ctx,cur.data.work_date,String(cur.data.class_id),subTeacherId,cur.data.start_time,cur.data.end_time);
  if(conflict){const same=(data.substitutions||[]).find((x:any)=>String(x.id)===id&&String(x.substitute_teacher_id)===subTeacherId);if(!same)throw new Error(conflict)}
  const q=await s.from('tahfizh_substitution_assignments').update({substitute_teacher_id:subTeacherId,substitute_external_person_id:null,substitute_name:cand.name,substitute_type:'teacher',reason:reason||null,updated_at:new Date().toISOString()}).eq('id',id).select('*').single();if(q.error)throw q.error;return q.data;
}

async function cancel(s:any,a:any,b:any){const id=T(b.id);if(!id)throw new Error('invalid_input');const q=await s.from('tahfizh_substitution_assignments').update({status:'cancelled',cancelled_by_account_id:a.account.id,cancelled_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',id);if(q.error)throw q.error}

async function recap(s:any,ctx:any,b:any){
  const to=/^\d{4}-\d{2}-\d{2}$/.test(T(b.to))?T(b.to):todayJakarta();
  const from=/^\d{4}-\d{2}-\d{2}$/.test(T(b.from))?T(b.from):new Date(new Date(to+'T12:00:00Z').getTime()-30*86400000).toISOString().slice(0,10);
  const [q,teachersQ,classesQ]=await Promise.all([
    s.from('tahfizh_substitution_assignments').select('id,work_date,class_id,original_teacher_id,start_time,end_time,substitute_name,substitute_type,reason,status,created_at,cancelled_at').eq('academic_year_id',ctx.yearId).eq('semester_no',ctx.semesterNo).gte('work_date',from).lte('work_date',to).order('work_date',{ascending:false}).order('start_time'),
    s.from('teachers').select('id,full_name'),s.from('classes').select('id,name').eq('academic_year_id',ctx.yearId)
  ]);for(const x of [q,teachersQ,classesQ])if(x.error)throw x.error;
  const tm=new Map((teachersQ.data||[]).map((x:any)=>[String(x.id),x.full_name])),cm=new Map((classesQ.data||[]).map((x:any)=>[String(x.id),x.name]));
  return{from,to,items:(q.data||[]).map((x:any)=>({...x,class_name:cm.get(String(x.class_id))||'',original_teacher_name:tm.get(String(x.original_teacher_id))||''}))};
}

Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:CORS});if(req.method!=='POST')return J({success:false,error:'method_not_allowed'},405);
  let body:any={};try{body=await req.json()}catch{return J({success:false,error:'invalid_json'},400)}
  try{
    const s=db(),a=await auth(s,req,body);if(!a||!allowed(a))return J({success:false,error:'forbidden'},403);const ctx=await context(s),action=T(body.action)||'bootstrap';
    if(action==='bootstrap')return J({success:true,...await bootstrap(s,ctx,body.work_date)});
    if(action==='assign')return J({success:true,row:await assign(s,a,ctx,body)});
    if(action==='edit')return J({success:true,row:await edit(s,a,ctx,body)});\n    if(action==='cancel'){await cancel(s,a,body);return J({success:true})}
    if(action==='recap')return J({success:true,...await recap(s,ctx,body)});
    return J({success:false,error:'action_invalid'},400);
  }catch(e){const msg=e instanceof Error?e.message:String(e);return J({success:false,error:msg},msg==='forbidden'?403:400)}
});