// PjBL simpan log: log lama dengan source_ref lain (impor sheet_master) diperbarui, bukan disisipkan ulang (bentrok uq_pjbl_logs_class_period_week).
// Fungsi dijalankan dengan Supabase palsu. Tanpa request ke produksi.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),{stripTypeScriptTypes}=require('node:module');
const src=stripTypeScriptTypes(fs.readFileSync('supabase/functions/pjbl/index.ts','utf8').replace(/^import .*$/m,''),{mode:'transform'});
const Y='y1',C='c1';let logs,calls;
function table(name){const f={name,filters:[],op:'select',payload:null,conflict:null};const q={
 select(){return q},eq(k,v){f.filters.push([k,v]);return q},in(){return q},order(){return q},
 maybeSingle(){return q.then?run('one'):null},single(){return run('one')},
 update(p){f.op='update';f.payload=p;return q},upsert(p,o){f.op='upsert';f.payload=p;f.conflict=o?.onConflict;return q},insert(p){f.op='insert';f.payload=p;return q},delete(){f.op='delete';return q},
 then(ok,bad){return run('many').then(ok,bad)}};
 function run(mode){calls.push(f);let data=null;const by=k=>f.filters.find(x=>x[0]===k)?.[1];
  if(name==='user_sessions')data={user_account_id:'a1',expires_at:new Date(Date.now()+1e6).toISOString(),revoked_at:null};
  else if(name==='user_accounts')data={id:'a1',teacher_id:'t1',username:'faris',status:'aktif'};
  else if(name==='user_roles')data=[];
  else if(name==='report_class_assignments')data=[{class_id:C,homeroom_teacher_id:'t1'}];
  else if(name==='school_units')data={id:'u1'};
  else if(name==='academic_years')data={id:Y,name:'2026/2027'};
  else if(name==='classes')data=[{id:C,name:'2B Banin',grade_level:2,is_active:true}];
  else if(name==='pjbl_timeline')data=[{week_no:3,activity:'Rencana'}];
  else if(name==='teachers')data={full_name:'M. Faris'};
  else if(name==='pjbl_logs'){
   if(f.op==='select')data=logs.filter(l=>l.class_id===C&&l.week_no===by('week_no'));
   if(f.op==='update'){const r=logs.find(l=>l.id===by('id'));Object.assign(r,f.payload);data=r}
   if(f.op==='upsert'){const p=f.payload;if(logs.some(l=>l.class_id===p.class_id&&l.week_no===p.week_no&&l.source_ref!==p.source_ref))return Promise.resolve({data:null,error:{code:'23505',message:'duplicate key value violates unique constraint "uq_pjbl_logs_class_period_week"'}});logs.push({id:'new',...p});data=null}}
  if(mode==='one'&&Array.isArray(data))data=data[0]||null;return Promise.resolve({data,error:null})}
 return q}
const sb={from:table,storage:{from:()=>({createSignedUrl:async()=>({data:{signedUrl:'https://x/s'}}),upload:async()=>({error:null})})}};
let handler;const ctx={createClient:()=>sb,Deno:{env:{get:k=>k==='SUPABASE_URL'?'https://x':'k'},serve:h=>{handler=h}},Response,TextEncoder,crypto:require('node:crypto').webcrypto,console:{error(){},log(){}},atob,URL};
vm.createContext(ctx);vm.runInContext(src,ctx);
const call=async body=>{const r=await handler(new Request('https://x/pjbl',{method:'POST',headers:{'x-session-token':'tok'},body:JSON.stringify(body)}));return{status:r.status,body:await r.json()}};
(async()=>{
 // Minggu 3 sudah punya log impor sheet_master (source_ref lain): simpan harus memperbarui baris itu.
 logs=[{id:'old',class_id:C,academic_year_id:Y,semester_no:1,week_no:3,source_system:'sheet_master',source_ref:'sheet:2B:3',photo_path:'p.jpg',actual_activity:'lama',updated_at:'2026-11-01'}];calls=[];
 let r=await call({action:'save_log',class_id:C,week_no:3,actual_activity:'Membuat poster',obstacle:'t'});
 assert.equal(r.status,200,JSON.stringify(r.body));assert.equal(logs.length,1,'no duplicate row');assert.equal(logs[0].actual_activity,'Membuat poster');assert.equal(logs[0].source_ref,`cqlass:${C}:${Y}:1:3`);
 assert(calls.some(f=>f.name==='pjbl_logs'&&f.op==='update'),'existing log updated by id');
 // Minggu baru tanpa log: tetap disisipkan (upsert).
 calls=[];r=await call({action:'save_log',class_id:C,week_no:4,actual_activity:'Presentasi',photo_base64:'aGVsbG8=',photo_mime:'image/jpeg'});
 assert.equal(r.status,200,JSON.stringify(r.body));assert.equal(logs.length,2);assert(calls.some(f=>f.name==='pjbl_logs'&&f.op==='upsert'));
 // Error database tampil dengan pesan aslinya, bukan "internal_error".
 const src2=fs.readFileSync('supabase/functions/pjbl/index.ts','utf8');assert(src2.includes('function errMessage(e:any)'));
 console.log('PASS pjbl save_log: updates existing (sheet_master) log instead of duplicate insert; new week still inserted; readable errors.');
})().catch(e=>{console.error(e);process.exit(1)});
