import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization,apikey,content-type,x-session-token",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
};
const UNIT = "SD";
const J = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
const T = (v: unknown) => String(v ?? "").trim();
const L = (v: unknown) => T(v).toLowerCase();
const NUM = (v: unknown) => { const n = Number(v); return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : null; };

function serviceKey() {
  const packed = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (packed) { try { const x = JSON.parse(packed); if (x?.default) return String(x.default); } catch {} }
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SECRET_KEY");
  if (!key) throw new Error("service_key_missing");
  return key;
}
function db() {
  return createClient(Deno.env.get("SUPABASE_URL")!, serviceKey(), { auth: { persistSession: false, autoRefreshToken: false } });
}
async function sha(value: string) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function isActive(v: unknown) { return !["nonaktif", "inactive", "disabled", "blocked", "blokir", "keluar"].includes(L(v)); }
function normalizeRole(v: unknown) { return L(v).replace(/[-\s]+/g, "_"); }

async function auth(s: any, req: Request, b: any) {
  const token = T(req.headers.get("x-session-token") || b.session_token);
  if (!token) return null;
  const { data: ss } = await s.from("user_sessions").select("user_account_id,expires_at,revoked_at").eq("token_hash", await sha(token)).maybeSingle();
  if (!ss || ss.revoked_at || !ss.expires_at || new Date(ss.expires_at).getTime() <= Date.now()) return null;
  const { data: account } = await s.from("user_accounts").select("id,teacher_id,username,status").eq("id", ss.user_account_id).maybeSingle();
  if (!account || !isActive(account.status)) return null;
  const roles: string[] = [];
  if (L(account.username) === "admin") roles.push("admin");
  if (account.teacher_id) {
    const { data: rr } = await s.from("user_roles").select("role_code,is_active").eq("teacher_id", account.teacher_id).eq("is_active", true);
    for (const r of rr || []) roles.push(normalizeRole(r.role_code));
  }
  return { account, roles: [...new Set(roles)] };
}
function canUse(a: any) {
  return a?.roles?.includes("kabid_tahfizh");
}

async function context(s: any) {
  const { data: unit } = await s.from("school_units").select("id").eq("code", UNIT).maybeSingle();
  if (!unit) throw new Error("school_unit_not_found");
  const { data: year } = await s.from("academic_years").select("id,name").eq("school_unit_id", unit.id).eq("is_active", true).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!year) throw new Error("academic_year_not_found");
  const { data: sem } = await s.from("semesters").select("semester_no").eq("academic_year_id", year.id).eq("is_active", true).limit(1).maybeSingle();
  const semesterNo = Number(sem?.semester_no || 0);
  if (![1, 2].includes(semesterNo)) throw new Error("active_semester_not_found");
  return { unitId: unit.id, yearId: year.id, yearName: year.name, semesterNo };
}

async function classes(s: any) {
  const { data, error } = await s.from("classes").select("id,name,code,grade_level,rombel,gender_group").eq("is_active", true).order("grade_level").order("name");
  if (error) throw error;
  return data || [];
}

async function roster(s: any, ctx: any, classId: string) {
  const { data: e, error: ee } = await s.from("student_enrollments").select("student_id").eq("class_id", classId)
    .eq("academic_year_id", ctx.yearId).eq("semester_no", ctx.semesterNo).eq("is_active", true);
  if (ee) throw ee;
  const ids = [...new Set((e || []).map((x: any) => x.student_id).filter(Boolean))] as string[];
  if (!ids.length) return [];
  const { data: studs, error: se } = await s.from("students").select("id,full_name,status").in("id", ids);
  if (se) throw se;
  return (studs || []).filter((x: any) => isActive(x.status))
    .map((x: any) => ({ student_id: x.id, name: x.full_name }))
    .sort((a: any, b: any) => a.name.localeCompare(b.name, "id"));
}

async function save(s: any, accountId: string, body: any) {
  const studentId = T(body.student_id), classId = T(body.class_id), juz = T(body.juz);
  const tanggal = T(body.tanggal) || new Date().toISOString().slice(0, 10);
  const catatan = T(body.catatan);
  if (!studentId || !classId) return J({ success: false, error: "student_and_class_required" }, 400);
  if (!juz) return J({ success: false, error: "juz_required" }, 400);
  const kelancaran = NUM(body.nilai_kelancaran), makhraj = NUM(body.nilai_makhraj), mad = NUM(body.nilai_mad), ghunnah = NUM(body.nilai_ghunnah);
  if ([kelancaran, makhraj, mad, ghunnah].some((v) => v === null)) return J({ success: false, error: "nilai_harus_0_sampai_100" }, 400);
  if (catatan.length > 500) return J({ success: false, error: "catatan_terlalu_panjang" }, 400);

  const { data, error } = await s.from("tahfizh_ukj_scores").insert({
    student_id: studentId, class_id: classId, juz,
    nilai_kelancaran: kelancaran, nilai_makhraj: makhraj, nilai_mad: mad, nilai_ghunnah: ghunnah,
    catatan: catatan || null, tanggal, created_by_account_id: accountId,
  }).select("*").single();
  if (error) throw error;
  return J({ success: true, message: "Nilai UKJ tersimpan.", data });
}

async function recent(s: any, classId: string) {
  let q = s.from("tahfizh_ukj_scores").select("*").order("tanggal", { ascending: false }).order("created_at", { ascending: false }).limit(50);
  if (classId) q = q.eq("class_id", classId);
  const { data, error } = await q;
  if (error) throw error;
  const sids = [...new Set((data || []).map((x: any) => x.student_id))] as string[];
  if (!sids.length) return [];
  const { data: studs } = await s.from("students").select("id,full_name").in("id", sids);
  const sm = new Map((studs || []).map((x: any) => [x.id, x.full_name]));
  return (data || []).map((r: any) => ({ ...r, student_name: sm.get(r.student_id) || "-" }));
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return J({ success: false, error: "method_not_allowed" }, 405);
  try {
    const s = db();
    const body = await req.json().catch(() => ({}));
    const a = await auth(s, req, body);
    if (!a || !canUse(a)) return J({ success: false, error: "forbidden" }, 403);
    const ctx = await context(s);
    const action = L(body.action);

    if (action === "bootstrap") return J({ success: true, academic_year: ctx.yearName, semester_no: ctx.semesterNo, classes: await classes(s) });
    if (action === "roster") {
      const classId = T(body.class_id);
      if (!classId) return J({ success: false, error: "class_required" }, 400);
      return J({ success: true, students: await roster(s, ctx, classId) });
    }
    if (action === "save") return await save(s, a.account.id, body);
    if (action === "recent") return J({ success: true, rows: await recent(s, T(body.class_id)) });
    return J({ success: false, error: "unknown_action" }, 400);
  } catch (e) {
    console.error("tahfizh-ukj-score", e);
    return J({ success: false, error: T((e as any)?.message) || "internal_error" }, 500);
  }
});
