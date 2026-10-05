import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import bcrypt from "https://esm.sh/bcryptjs@2.4.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-session-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SESSION_HOURS = 12;
const MAX_FAILED_LOGIN = 5;
const LOCK_MINUTES = 15;
const BCRYPT_ROUNDS = 10;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}
function text(v: unknown): string { return String(v ?? "").trim(); }
function lower(v: unknown): string { return text(v).toLowerCase(); }
function cleanName(v: unknown): string { return text(v).replace(/\s+/g, " "); }

function getServiceKey(): string {
  const jsonKeys = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (jsonKeys) {
    try { const parsed = JSON.parse(jsonKeys); if (parsed?.default) return String(parsed.default); } catch (_) {}
  }
  const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SECRET_KEY");
  if (!legacy) throw new Error("service_key_missing");
  return legacy;
}
function getSupabase() {
  const url = Deno.env.get("SUPABASE_URL");
  if (!url) throw new Error("supabase_url_missing");
  return createClient(url, getServiceKey(), { auth: { persistSession: false, autoRefreshToken: false } });
}
async function sha256(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
function randomToken(bytes = 48): string {
  const arr = new Uint8Array(bytes); crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
}
function isoPlusHours(hours: number): string { return new Date(Date.now() + hours * 3600000).toISOString(); }
function isoPlusMinutes(minutes: number): string { return new Date(Date.now() + minutes * 60000).toISOString(); }
function extractSessionToken(req: Request, body: any): string {
  return text(req.headers.get("x-session-token") || body?.session_token || body?.sessionToken);
}
function isActiveStatus(status: unknown): boolean {
  return !["nonaktif", "inactive", "disabled", "blokir", "blocked"].includes(lower(status));
}

function roleFromText(value: unknown): string | null {
  const s = lower(value).replace(/[-\s]+/g, "_").replace(/[^a-z0-9_]/g, "");
  if (!s) return null;
  if (s === "admin" || s.includes("administrator")) return "admin";
  if (s.includes("pimpinan") || s.includes("kepala_sekolah") || s === "kepsek") return "pimpinan";
  if (s === "hrd" || s.includes("human_resource")) return "hrd";
  if (s.includes("kabid_kesiswaan") || s === "kesiswaan" || s.includes("student_affair")) return "kesiswaan";
  if (s.includes("kabid_akademik") || s === "akademik") return "akademik";
  // Kabid Tahfizh harus tetap menjadi role struktural tersendiri.
  // Jangan collapse ke role operasional `tahfizh`, karena frontend CQlass
  // membedakan dashboard/menu Kabid dengan Guru Tahfizh biasa.
  if (s.includes("kabid_tahfizh")) return "kabid_tahfizh";
  if (s === "tahfizh") return "tahfizh";
  if (s.includes("kabid_kegiatan") || s === "kegiatan") return "kegiatan";
  if (s.includes("walas") || s.includes("wali_kelas") || s.includes("homeroom")) return "walas";
  if (s === "guru" || s.includes("teacher") || s.includes("pengajar")) return "guru";
  return s;
}
function rolePriority(role: string): number {
  const known = ({ pimpinan:700, hrd:675, kesiswaan:650, akademik:620, kabid_tahfizh:615, kegiatan:600, admin:550, walas:300, guru_partner:260, tahfizh:220, guru:100 } as Record<string,number>)[role];
  return known ?? (role ? 500 : 0);
}
function choosePrimaryRole(roles: string[]): string {
  const unique = [...new Set(roles.filter(Boolean))];
  if (!unique.length) return "guru";
  return unique.sort((a,b)=>rolePriority(b)-rolePriority(a))[0];
}
function detectRoleFromRow(row: any): string | null {
  if (!row || typeof row !== "object") return null;
  for (const k of ["role","role_code","role_name","nama_role","kode_role","name","code","access_role"]) {
    if (k in row) { const r=roleFromText(row[k]); if (r) return r; }
  }
  for (const v of Object.values(row)) if (typeof v === "string") { const r=roleFromText(v); if (r) return r; }
  return null;
}
function teacherMatchesAssignment(row:any, teacherId:string):boolean {
  return ["homeroom_teacher_id","walas_teacher_id","wali_kelas_teacher_id","class_teacher_id","teacher_id"]
    .some(k=>text(row?.[k]) && text(row?.[k])===teacherId);
}
function assignmentClassId(row:any):string {
  for (const k of ["class_id","kelas_id","rombel_id"]) { const v=text(row?.[k]); if (v) return v; }
  return "";
}
function classDisplayName(row:any):string {
  for (const k of ["name","class_name","nama_kelas","display_name","code","class_code","kode_kelas"]) { const v=text(row?.[k]); if (v) return v; }
  return "";
}

async function buildUserProfile(supabase:any, account:any):Promise<any> {
  const teacherId=text(account?.teacher_id);
  const username=text(account?.username);
  const teacherPromise = teacherId
    ? supabase.from("teachers").select("*").eq("id", teacherId).maybeSingle()
    : Promise.resolve({data:null,error:null});
  const rolesPromise = supabase.from("user_account_roles").select("*").eq("user_account_id", account.id);
  const assignmentsPromise = teacherId
    ? supabase.from("report_class_assignments").select("*")
    : Promise.resolve({data:[],error:null});
  const partnerPromise = teacherId
    ? supabase.from("class_partner_assignments").select("class_id,teacher_id,is_active").eq("teacher_id",teacherId).eq("is_active",true)
    : Promise.resolve({data:[],error:null});
  const tahfizhPromise = teacherId
    ? supabase.from("tahfizh_teacher_assignments").select("class_id,teacher_id,is_active").eq("teacher_id",teacherId).eq("is_active",true)
    : Promise.resolve({data:[],error:null});
  const [teacherRes, roleRes, assignmentRes, partnerRes, tahfizhRes] = await Promise.all([teacherPromise, rolesPromise, assignmentsPromise, partnerPromise, tahfizhPromise]);
  const teacher=teacherRes?.data || null;
  const nama=text(teacher?.full_name || teacher?.name || teacher?.nama_guru || teacher?.nama) || username || "Pengguna";
  const roles:string[]=[];
  if (!roleRes?.error && Array.isArray(roleRes?.data)) {
    for (const row of roleRes.data) { const r=detectRoleFromRow(row); if (r) roles.push(r); }
  }
  if (lower(username)==="admin" || lower(nama)==="admin") roles.push("admin");
  let kelas="";
  let walasDetected=false;
  let partnerDetected=false;
  let tahfizhDetected=false;
  const classIds:string[]=[];
  if (teacherId && !assignmentRes?.error && Array.isArray(assignmentRes?.data)) {
    const mine=assignmentRes.data.filter((row:any)=>teacherMatchesAssignment(row,teacherId));
    if (mine.length) {
      walasDetected=true; roles.push("walas");
      for(const row of mine){const cid=assignmentClassId(row);if(cid)classIds.push(cid)}
    }
  }
  if (teacherId && !partnerRes?.error && Array.isArray(partnerRes?.data) && partnerRes.data.length) {
    partnerDetected=true; roles.push("guru_partner");
    for(const row of partnerRes.data){const cid=text(row?.class_id);if(cid)classIds.push(cid)}
  }
  if (teacherId && !tahfizhRes?.error && Array.isArray(tahfizhRes?.data) && tahfizhRes.data.length) {
    tahfizhDetected=true; roles.push("tahfizh");
  }
  const firstClassId=[...new Set(classIds.filter(Boolean))][0]||"";
  if(firstClassId){
    const {data:classRow}=await supabase.from("classes").select("*").eq("id",firstClassId).maybeSingle();
    kelas=classDisplayName(classRow||{});
  }
  roles.push("guru");
  const role=choosePrimaryRole(roles);
  return {
    id:account.id, teacher_id:teacherId||null, username, email:text(account.email)||null,
    nama, role, roles:[...new Set(roles)].sort((a,b)=>rolePriority(b)-rolePriority(a)),
    kelas, is_walas:walasDetected, is_partner:partnerDetected, is_tahfizh:tahfizhDetected, must_change_password:Boolean(account.must_change_password),
    username_change_allowed:account.username_change_allowed!==false,
  };
}

async function validateSession(supabase:any, token:string):Promise<any> {
  if (!token) return {ok:false,response:json({success:false,error:"session_invalid"},401)};
  const tokenHash=await sha256(token);
  const {data:session,error:sessionError}=await supabase.from("user_sessions").select("*").eq("token_hash",tokenHash).maybeSingle();
  if (sessionError || !session || session.revoked_at) return {ok:false,response:json({success:false,error:"session_invalid"},401)};
  if (!session.expires_at || new Date(session.expires_at).getTime()<=Date.now()) return {ok:false,response:json({success:false,error:"session_expired"},401)};
  const {data:account,error:accountError}=await supabase.from("user_accounts").select("*").eq("id",session.user_account_id).maybeSingle();
  if (accountError || !account || !isActiveStatus(account.status)) return {ok:false,response:json({success:false,error:"account_inactive"},403)};
  return {ok:true,session,account};
}

Deno.serve(async (req)=>{
  if (req.method==="OPTIONS") return new Response("ok",{headers:corsHeaders});
  if (req.method!=="POST") return json({success:false,error:"method_not_allowed"},405);
  let body:any={};
  try { body=await req.json(); } catch (_) { return json({success:false,error:"invalid_json"},400); }
  const action=lower(body?.action);
  try {
    const supabase=getSupabase();
    if (action==="login") {
      const username=lower(body?.username), password=text(body?.password);
      if (!username || !password) return json({success:false,error:"invalid_credentials"},400);
      const {data:account,error}=await supabase.from("user_accounts").select("*").ilike("username",username).maybeSingle();
      if (error || !account) return json({success:false,error:"invalid_credentials"},401);
      if (!isActiveStatus(account.status)) return json({success:false,error:"account_inactive"},403);
      if (account.locked_until && new Date(account.locked_until).getTime()>Date.now())
        return json({success:false,error:"account_locked",locked_until:account.locked_until},423);
      let passwordOk=false;
      const passwordHash=text(account.password_hash);
      if (passwordHash) { try { passwordOk=await bcrypt.compare(password,passwordHash); } catch (_) {} }
      if (!passwordOk) {
        const failed=Number(account.failed_login_attempts||0)+1;
        const patch:any={failed_login_attempts:failed,updated_at:new Date().toISOString()};
        if (failed>=MAX_FAILED_LOGIN) { patch.failed_login_attempts=0; patch.locked_until=isoPlusMinutes(LOCK_MINUTES); }
        await supabase.from("user_accounts").update(patch).eq("id",account.id);
        return json({success:false,error:failed>=MAX_FAILED_LOGIN?"account_locked":"invalid_credentials"},failed>=MAX_FAILED_LOGIN?423:401);
      }
      const now=new Date().toISOString();
      const rawToken=randomToken(48);
      const tokenHash=await sha256(rawToken);
      const expiresAt=isoPlusHours(SESSION_HOURS);
      const freshAccount={...account,failed_login_attempts:0,locked_until:null,last_login_at:now};
      const [accountUpdate, sessionInsert, user] = await Promise.all([
        supabase.from("user_accounts").update({failed_login_attempts:0,locked_until:null,last_login_at:now,updated_at:now}).eq("id",account.id),
        supabase.from("user_sessions").insert({user_account_id:account.id,token_hash:tokenHash,expires_at:expiresAt,created_at:now,last_used_at:now}),
        buildUserProfile(supabase,freshAccount),
      ]);
      if (accountUpdate?.error) throw accountUpdate.error;
      if (sessionInsert?.error) throw sessionInsert.error;
      return json({success:true,session_token:rawToken,expires_at:expiresAt,must_change_password:Boolean(freshAccount.must_change_password),user});
    }
    const token=extractSessionToken(req,body);
    const valid=await validateSession(supabase,token);
    if (!valid.ok) return valid.response;
    const {session,account}=valid;
    if (action==="session") {
      const [_,user]=await Promise.all([
        supabase.from("user_sessions").update({last_used_at:new Date().toISOString()}).eq("id",session.id),
        buildUserProfile(supabase,account),
      ]);
      return json({success:true,expires_at:session.expires_at,must_change_password:Boolean(account.must_change_password),user});
    }
    if (action==="change_password") {
      const oldPassword=text(body?.old_password||body?.oldPassword), newPassword=text(body?.new_password||body?.newPassword);
      if (!oldPassword || !newPassword) return json({success:false,error:"parameter_kurang"},400);
      if (newPassword.length<8) return json({success:false,error:"password_too_short"},400);
      if (oldPassword===newPassword) return json({success:false,error:"password_same"},400);
      const oldOk=await bcrypt.compare(oldPassword,text(account.password_hash));
      if (!oldOk) return json({success:false,error:"old_password_wrong"},401);
      const newHash=await bcrypt.hash(newPassword,BCRYPT_ROUNDS), now=new Date().toISOString();
      const {error:updateError}=await supabase.from("user_accounts").update({password_hash:newHash,must_change_password:false,password_changed_at:now,failed_login_attempts:0,locked_until:null,updated_at:now}).eq("id",account.id);
      if (updateError) throw updateError;
      return json({success:true,must_change_password:false});
    }
    if (action==="change_profile") {
      const currentPassword=text(body?.current_password||body?.currentPassword);
      const newUsername=lower(body?.new_username||body?.newUsername||account.username);
      const newFullName=cleanName(body?.new_full_name||body?.newFullName);
      if (!currentPassword) return json({success:false,error:"current_password_required"},400);
      if (!newUsername || newUsername.length<4 || !/^[a-z0-9._]+$/.test(newUsername)) return json({success:false,error:"invalid_username"},400);
      if (!newFullName) return json({success:false,error:"name_required"},400);
      if (newFullName.length>120) return json({success:false,error:"name_too_long"},400);
      if (!account.teacher_id) return json({success:false,error:"teacher_not_linked"},403);
      const passwordOk=await bcrypt.compare(currentPassword,text(account.password_hash));
      if (!passwordOk) return json({success:false,error:"current_password_wrong"},401);
      const usernameChanged=newUsername!==lower(account.username);
      if (usernameChanged) {
        const {data:duplicate}=await supabase.from("user_accounts").select("id").ilike("username",newUsername).neq("id",account.id).limit(1);
        if (Array.isArray(duplicate)&&duplicate.length) return json({success:false,error:"username_taken"},409);
      }
      const {data:teacher,error:teacherReadError}=await supabase.from("teachers").select("id,full_name").eq("id",account.teacher_id).maybeSingle();
      if (teacherReadError || !teacher) return json({success:false,error:"teacher_not_linked"},403);
      const oldFullName=cleanName(teacher.full_name);
      const nameChanged=newFullName!==oldFullName;
      const now=new Date().toISOString();
      if (nameChanged) {
        const {error:nameError}=await supabase.from("teachers").update({full_name:newFullName,updated_at:now}).eq("id",account.teacher_id);
        if (nameError) throw nameError;
      }
      if (usernameChanged) {
        const {error:userError}=await supabase.from("user_accounts").update({username:newUsername,updated_at:now}).eq("id",account.id);
        if (userError) {
          if (nameChanged) await supabase.from("teachers").update({full_name:oldFullName,updated_at:new Date().toISOString()}).eq("id",account.teacher_id);
          if (String(userError.message||"").toLowerCase().includes("duplicate")) return json({success:false,error:"username_taken"},409);
          throw userError;
        }
      }
      const freshAccount={...account,username:newUsername,updated_at:now};
      const user=await buildUserProfile(supabase,freshAccount);
      return json({success:true,username:newUsername,new_username:newUsername,full_name:newFullName,user});
    }
    if (action==="change_username") {
      if (account.username_change_allowed===false) return json({success:false,error:"username_not_allowed"},403);
      const newUsername=lower(body?.new_username||body?.newUsername);
      if (newUsername.length<4 || !/^[a-z0-9._]+$/.test(newUsername)) return json({success:false,error:"invalid_username"},400);
      if (newUsername===lower(account.username)) return json({success:false,error:"username_same"},400);
      const {data:duplicate}=await supabase.from("user_accounts").select("id").ilike("username",newUsername).neq("id",account.id).limit(1);
      if (Array.isArray(duplicate)&&duplicate.length) return json({success:false,error:"username_taken"},409);
      const {error:updateError}=await supabase.from("user_accounts").update({username:newUsername,updated_at:new Date().toISOString()}).eq("id",account.id);
      if (updateError) {
        if (String(updateError.message||"").toLowerCase().includes("duplicate")) return json({success:false,error:"username_taken"},409);
        throw updateError;
      }
      return json({success:true,username:newUsername,new_username:newUsername});
    }
    if (action==="logout") {
      await supabase.from("user_sessions").update({revoked_at:new Date().toISOString()}).eq("id",session.id);
      return json({success:true});
    }
    return json({success:false,error:"unknown_action"},400);
  } catch (error) {
    console.error("auth-user error:", error instanceof Error ? error.message : error);
    return json({success:false,error:"server_error"},500);
  }
});
