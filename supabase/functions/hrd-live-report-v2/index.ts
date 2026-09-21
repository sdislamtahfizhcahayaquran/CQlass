import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

const CORS={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization,apikey,content-type,x-session-token","Access-Control-Allow-Methods":"POST,OPTIONS","Content-Type":"application/json; charset=utf-8"};
const J=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...CORS,"Cache-Control":"no-store"}});
const T=(v:unknown)=>String(v??"").trim();
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

    for(const t of data.teachers||[]){
      const slots=byTeacher.get(T(t.teacher_id))||[];
      const ctx=Array.isArray(t.context_categories)?t.context_categories:[];
      const uks=ctx.find((c:any)=>c?.key==="uks_duty");
      const workload=ctx.find((c:any)=>c?.key==="workload");
      if(!slots.length){
        t.context_categories=ctx.filter((c:any)=>c?.key!=="uks_duty");
        if(workload){
          workload.items=(workload.items||[]).filter((i:any)=>!/^Jaga UKS$/i.test(T(i?.title)));
          workload.note="Ringkasan beban kerja periode: mengajar, aktivitas/tugas, dan badal. Jaga UKS hanya ditampilkan untuk pegawai yang memang memiliki jadwal UKS aktif pada periode tersebut.";
          if(uks)workload.item_count=Math.max(0,Number(workload.item_count||0)-Number(uks.item_count||0));
        }
      }else if(uks){
        uks.applicable=true;
        uks.scheduled_slots=slots.length;
        uks.schedule=slots.map((r:any)=>({weekday:Number(r.weekday),day:dayName(Number(r.weekday)),shift_no:Number(r.shift_no),start_time:hhmm(r.start_time),end_time:hhmm(r.end_time)}));
        uks.note=`Jadwal aktif: ${uks.schedule.map((r:any)=>`${r.day} Shift ${r.shift_no} ${r.start_time}–${r.end_time}`).join("; ")}. Laporan UKS dibaca otomatis; HRD hanya melihat.`;
      }
      t.last_activity_at=[...(t.categories||[]).map((c:any)=>c?.last_created_at).filter(Boolean),...(t.context_categories||[]).map((c:any)=>c?.last_created_at).filter(Boolean)].sort().pop()||null;
    }
    data.summary={...(data.summary||{}),uks_scheduled_teachers:byTeacher.size,uks_active_slots:activeRows.length};
    return J(data,upstream.status);
  }catch(e){console.error(e);return J({success:false,error:"server_error",message:T((e as any)?.message)||"internal_error"},500)}
});
