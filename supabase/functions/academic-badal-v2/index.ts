import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS={
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"authorization,apikey,content-type,x-session-token",
  "Access-Control-Allow-Methods":"POST,OPTIONS"
};
const AY='2026/2027', SEM=1, UNIT='SD';
const J=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...CORS,"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}});
const T=(v:unknown)=>String(v??'').trim();
const L=(v:unknown)=>T(v).toLowerCase();

function serviceKey(){
  const packed=Deno.env.get('SUPABASE_SECRET_KEYS');
  if(packed){try{const x=JSON.parse(packed);if(x?.default)return String(x.default)}catch{}}
  const key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||Deno.env.get('SUPABASE_SECRET_KEY');
  if(!key)throw new Error('service_key_missing');
  return key;
}
function db(){return createClient(Deno.env.get('SUPABASE_URL')!,serviceKey(),{auth:{persistSession:false,autoRefreshToken:false}})}
async function sha(value:string){const d=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));return [...new Uint8Array(d)].map(b=>b.toString(16).padStart(2,'0')).join('')}
function isActive(v:unknown){return !['nonaktif','inactive','disabled','blocked','blokir','keluar'].includes(L(v))}
function normalizeRole(v:unknown){return L(v).replace(/[-\s]+/g,'_')}

async function auth(s:any,req:Request,b:any){
  const token=T(req.headers.get('x-session-token')||b.session_token);
  if(!token)return null;
  const {data:ss}=await s.from('user_sessions').select('user_account_id,expires_at,revoked_at').eq('token_hash',await sha(token)).maybeSingle();
  if(!ss||ss.revoked_at||!ss.expires_at||new Date(ss.expires_at).getTime()<=Date.now())return null;
  const {data:account}=await s.from('user_accounts').select('id,teacher_id,username,status').eq('id',ss.user_account_id).maybeSingle();
  if(!account||!isActive(account.status))return null;
  const roles:string[]=[];
  if(L(account.username)==='admin')roles.push('admin');
  if(account.teacher_id){
    const {data:rr}=await s.from('user_roles').select('role_code,is_active').eq('teacher_id',account.teacher_id).eq('is_active',true);
    for(const r of rr||[])roles.push(normalizeRole(r.role_code));
  }
  return {account,roles:[...new Set(roles)]};
}
function canUse(a:any){return a?.roles?.some((r:string)=>['admin','akademik','kabid_akademik'].includes(r))}

async function context(s:any){
  const {data:unit}=await s.from('school_units').select('id').eq('code',UNIT).maybeSingle();
  if(!unit)throw new Error('school_unit_not_found');
  const {data:year}=await s.from('academic_years').select('id,name').eq('school_unit_id',unit.id).eq('name',AY).maybeSingle();
  if(!year)throw new Error('academic_year_not_found');
  return {unitId:unit.id,yearId:year.id};
}
function todayJakarta(){const f=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'});const p=Object.fromEntries(f.formatToParts(new Date()).map(x=>[x.type,x.value]));return `${p.year}-${p.month}-${p.day}`}
function isoDow(date:string){const x=new Date(date+'T12:00:00Z').getUTCDay();return x===0?7:x}
function minutes(v:unknown){const s=T(v).slice(0,5);if(!/^\d{2}:\d{2}$/.test(s))return null;const [h,m]=s.split(':').map(Number);return h*60+m}
function overlap(a1:unknown,a2:unknown,b1:unknown,b2:unknown){const x1=minutes(a1),x2=minutes(a2),y1=minutes(b1),y2=minutes(b2);if([x1,x2,y1,y2].some(v=>v===null))return false;return (x1 as number)<(y2 as number)&&(y1 as number)<(x2 as number)}
function roleLabel(roles:string[]){
  if(roles.includes('pengabdian'))return 'Pengabdian';
  if(roles.includes('kabid_akademik'))return 'Kabid Akademik';
  if(roles.includes('kabid_tahfizh'))return 'Kabid Tahfizh';
  if(roles.includes('kabid_kesiswaan'))return 'Kabid Kesiswaan';
  if(roles.includes('kabid_kegiatan'))return 'Kabid Kegiatan';
  return 'Guru';
}

async function bootstrap(s:any,ctx:any,dateRaw:unknown){
  const date=/^\d{4}-\d{2}-\d{2}$/.test(T(dateRaw))?T(dateRaw):todayJakarta();
  const dow=isoDow(date);
  const [slotsQ,teachersQ,classesQ,subjectsQ,subsQ,rolesQ]=await Promise.all([
    s.from('class_schedule_entries').select('id,class_id,subject_id,subject_name_raw,teacher_id,teacher_name_raw,start_time,end_time,slot_label').eq('academic_year_id',ctx.yearId).eq('semester_no',SEM).eq('day_of_week',dow).eq('activity_type','teaching').eq('is_active',true).order('start_time'),
    s.from('teachers').select('id,full_name,status,position').order('full_name'),
    s.from('classes').select('id,name'),
    s.from('subjects').select('id,name'),
    s.from('teacher_substitution_assignments').select('id,work_date,schedule_entry_id,class_id,subject_id,original_teacher_id,substitute_teacher_id,start_time,end_time,reason,status').eq('academic_year_id',ctx.yearId).eq('semester_no',SEM).eq('work_date',date).eq('status','active'),
    s.from('user_roles').select('teacher_id,role_code,is_active').eq('is_active',true)
  ]);
  for(const q of [slotsQ,teachersQ,classesQ,subjectsQ,subsQ,rolesQ])if(q.error)throw q.error;
  const slots=slotsQ.data||[],teachers=teachersQ.data||[],classes=classesQ.data||[],subjects=subjectsQ.data||[],subs=subsQ.data||[],roles=rolesQ.data||[];
  const cm=new Map(classes.map((x:any)=>[x.id,x.name]));
  const sm=new Map(subjects.map((x:any)=>[x.id,x.name]));
  const tm=new Map(teachers.map((x:any)=>[x.id,x.full_name]));
  const roleMap=new Map<string,string[]>();
  for(const r of roles){const id=T(r.teacher_id);if(!id)continue;if(!roleMap.has(id))roleMap.set(id,[]);roleMap.get(id)!.push(normalizeRole(r.role_code))}
  const blocked=new Set(['admin','hrd','sapras','pimpinan','kepsek','kepala_sekolah']);
  const candidates=teachers.filter((x:any)=>{
    if(!isActive(x.status))return false;
    const rr=roleMap.get(String(x.id))||[];
    const isKabid=rr.some(r=>r.startsWith('kabid_'));
    const isBlocked=rr.some(r=>blocked.has(r));
    return isKabid||!isBlocked;
  }).map((x:any)=>{
    const rr=roleMap.get(String(x.id))||[];
    const label=roleLabel(rr);
    return {id:x.id,name:x.full_name,role_label:label,kind:label.startsWith('Kabid')?'kabid':'guru'};
  }).sort((a:any,b:any)=>a.name.localeCompare(b.name,'id'));
  return {
    date,
    teachers:candidates,
    slots:slots.map((x:any)=>({...x,class_name:cm.get(x.class_id)||'',subject_name:sm.get(x.subject_id)||x.subject_name_raw||'',teacher_name:tm.get(x.teacher_id)||x.teacher_name_raw||''})),
    substitutions:subs.map((x:any)=>({...x,class_name:cm.get(x.class_id)||'',subject_name:sm.get(x.subject_id)||'',original_teacher_name:tm.get(x.original_teacher_id)||'',substitute_teacher_name:tm.get(x.substitute_teacher_id)||''}))
  };
}

async function assign(s:any,a:any,ctx:any,b:any){
  const date=T(b.work_date)||todayJakarta(),slotId=T(b.schedule_entry_id),subId=T(b.substitute_teacher_id),reason=T(b.reason);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!slotId||!subId)throw new Error('invalid_input');
  const {data:slot,error:slotErr}=await s.from('class_schedule_entries').select('id,class_id,subject_id,teacher_id,start_time,end_time').eq('id',slotId).eq('academic_year_id',ctx.yearId).eq('semester_no',SEM).maybeSingle();
  if(slotErr)throw slotErr;
  if(!slot||!slot.teacher_id)throw new Error('schedule_not_found');
  if(slot.teacher_id===subId)throw new Error('same_teacher');
  const boot=await bootstrap(s,ctx,date);
  if(!(boot.teachers||[]).some((t:any)=>String(t.id)===subId))throw new Error('substitute_not_allowed');
  const dow=isoDow(date);
  const [ownQ,subsQ,tahSubsQ]=await Promise.all([
    s.from('class_schedule_entries').select('id,start_time,end_time').eq('academic_year_id',ctx.yearId).eq('semester_no',SEM).eq('day_of_week',dow).eq('teacher_id',subId).eq('activity_type','teaching').eq('is_active',true),
    s.from('teacher_substitution_assignments').select('id,start_time,end_time,schedule_entry_id').eq('academic_year_id',ctx.yearId).eq('semester_no',SEM).eq('work_date',date).eq('substitute_teacher_id',subId).eq('status','active'),
    s.from('tahfizh_substitution_assignments').select('id,start_time,end_time').eq('academic_year_id',ctx.yearId).eq('semester_no',SEM).eq('work_date',date).eq('substitute_teacher_id',subId).eq('status','active')
  ]);
  if(ownQ.error)throw ownQ.error;if(subsQ.error)throw subsQ.error;if(tahSubsQ.error)throw tahSubsQ.error;
  if((ownQ.data||[]).some((x:any)=>overlap(slot.start_time,slot.end_time,x.start_time,x.end_time)))throw new Error('teacher_conflict_schedule');
  if((subsQ.data||[]).some((x:any)=>overlap(slot.start_time,slot.end_time,x.start_time,x.end_time)&&x.schedule_entry_id!==slotId))throw new Error('teacher_conflict_badal');
  if((tahSubsQ.data||[]).some((x:any)=>overlap(slot.start_time,slot.end_time,x.start_time,x.end_time)))throw new Error('teacher_conflict_tahfizh_badal');
  const {data:existing,error:existingErr}=await s.from('teacher_substitution_assignments').select('id').eq('academic_year_id',ctx.yearId).eq('semester_no',SEM).eq('work_date',date).eq('schedule_entry_id',slotId).eq('status','active').maybeSingle();
  if(existingErr)throw existingErr;
  const row={school_unit_id:ctx.unitId,academic_year_id:ctx.yearId,semester_no:SEM,work_date:date,schedule_entry_id:slot.id,class_id:slot.class_id,subject_id:slot.subject_id,original_teacher_id:slot.teacher_id,substitute_teacher_id:subId,start_time:slot.start_time,end_time:slot.end_time,reason:reason||null,status:'active',created_by_account_id:a.account.id,updated_at:new Date().toISOString()};
  const q=existing?s.from('teacher_substitution_assignments').update(row).eq('id',existing.id):s.from('teacher_substitution_assignments').insert(row);
  const {data,error}=await q.select('*').single();if(error)throw error;return data;
}
async function cancel(s:any,b:any){const id=T(b.id);if(!id)throw new Error('invalid_input');const {error}=await s.from('teacher_substitution_assignments').update({status:'cancelled',updated_at:new Date().toISOString()}).eq('id',id);if(error)throw error}

Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:CORS});
  if(req.method!=='POST')return J({success:false,error:'method_not_allowed'},405);
  let body:any={};try{body=await req.json()}catch{return J({success:false,error:'invalid_json'},400)}
  try{
    const s=db(),a=await auth(s,req,body);if(!a||!canUse(a))return J({success:false,error:'forbidden'},403);
    const ctx=await context(s),action=T(body.action)||'bootstrap';
    if(action==='bootstrap')return J({success:true,...await bootstrap(s,ctx,body.work_date)});
    if(action==='assign')return J({success:true,row:await assign(s,a,ctx,body)});
    if(action==='cancel'){await cancel(s,body);return J({success:true})}
    return J({success:false,error:'action_invalid'},400);
  }catch(e){const msg=e instanceof Error?e.message:String(e);return J({success:false,error:msg},msg==='forbidden'?403:400)}
});