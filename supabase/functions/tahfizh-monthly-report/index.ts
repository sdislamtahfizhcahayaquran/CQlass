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
  return a?.roles?.includes("kabid_quran");
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

async function roster(s: any, ctx: any, classId: string, periodStart: string, periodEnd: string) {
  const { data: e, error: ee } = await s.from("student_enrollments").select("student_id").eq("class_id", classId)
    .eq("academic_year_id", ctx.yearId).eq("semester_no", ctx.semesterNo).eq("is_active", true);
  if (ee) throw ee;
  const ids = [...new Set((e || []).map((x: any) => x.student_id).filter(Boolean))] as string[];
  if (!ids.length) return [];
  const { data: studs, error: se } = await s.from("students").select("id,full_name,status").in("id", ids);
  if (se) throw se;
  const { data: reports, error: re } = await s.from("tahfizh_monthly_reports").select("*")
    .in("student_id", ids).eq("period_start", periodStart).eq("period_end", periodEnd);
  if (re) throw re;
  const rm = new Map((reports || []).map((r: any) => [r.student_id, r]));
  return (studs || [])
    .filter((x: any) => isActive(x.status))
    .map((x: any) => {
      const r: any = rm.get(x.id) || {};
      return {
        student_id: x.id, name: x.full_name,
        lp: r.lp || "", target_bulan: r.target_bulan || "", pencapaian_akhir: r.pencapaian_akhir || "",
        juz: r.juz || "", tilawah_bbq: r.tilawah_bbq || "", report_id: r.id || null,
      };
    })
    .sort((a: any, b: any) => a.name.localeCompare(b.name, "id"));
}

async function save(s: any, classId: string, periodStart: string, periodEnd: string, accountId: string, rows: any[]) {
  if (!classId) return J({ success: false, error: "class_required" }, 400);
  if (!periodStart || !periodEnd) return J({ success: false, error: "period_required" }, 400);
  if (new Date(periodEnd) < new Date(periodStart)) return J({ success: false, error: "invalid_period_range" }, 400);
  if (!Array.isArray(rows) || !rows.length) return J({ success: false, error: "rows_required" }, 400);

  const now = new Date().toISOString();
  const payload = rows.map((r: any) => ({
    student_id: T(r.student_id), class_id: classId, period_start: periodStart, period_end: periodEnd,
    lp: T(r.lp) || null, target_bulan: T(r.target_bulan) || null, pencapaian_akhir: T(r.pencapaian_akhir) || null,
    juz: T(r.juz) || null, tilawah_bbq: T(r.tilawah_bbq) || null,
    created_by_account_id: accountId, updated_at: now,
  })).filter((r: any) => r.student_id);

  const { error } = await s.from("tahfizh_monthly_reports").upsert(payload, { onConflict: "student_id,period_start,period_end" });
  if (error) throw error;
  return J({ success: true, message: `Laporan tersimpan untuk ${payload.length} siswa.` });
}

async function history(s: any, classId: string) {
  const { data, error } = await s.from("tahfizh_monthly_reports").select("period_start,period_end")
    .eq("class_id", classId).order("period_start", { ascending: false });
  if (error) throw error;
  const seen = new Set<string>(), out: any[] = [];
  for (const r of data || []) {
    const k = `${r.period_start}|${r.period_end}`;
    if (seen.has(k)) continue;
    seen.add(k); out.push({ period_start: r.period_start, period_end: r.period_end });
  }
  return out.slice(0, 24);
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
      const classId = T(body.class_id), ps = T(body.period_start), pe = T(body.period_end);
      if (!classId || !ps || !pe) return J({ success: false, error: "class_and_period_required" }, 400);
      return J({ success: true, rows: await roster(s, ctx, classId, ps, pe) });
    }
    if (action === "save") return await save(s, T(body.class_id), T(body.period_start), T(body.period_end), a.account.id, body.rows);
    if (action === "history") {
      const classId = T(body.class_id);
      if (!classId) return J({ success: false, error: "class_required" }, 400);
      return J({ success: true, periods: await history(s, classId) });
    }
    return J({ success: false, error: "unknown_action" }, 400);
  } catch (e) {
    console.error("tahfizh-monthly-report", e);
    return J({ success: false, error: T((e as any)?.message) || "internal_error" }, 500);
  }
});
