// CQlass Bilingual Vocabulary — v7: follows the active semester, can read other
// periods, and lets Kabid Akademik/Admin manage categories per semester.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-session-token", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const READ_ALL = new Set(["admin", "pimpinan", "akademik"]), WRITE_ALL = new Set(["admin", "akademik"]), MANAGE = new Set(["admin", "akademik"]);
const MAX_CATEGORIES = 40, MAX_TARGET = 1000;
const txt = (v: any) => String(v ?? "").trim(), low = (v: any) => txt(v).toLowerCase();

class Fail extends Error { constructor(public code: string, public status = 400, public extra: any = {}) { super(code); } }
function json(b: any, s = 200) { return new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } }); }
function key() { const p = Deno.env.get("SUPABASE_SECRET_KEYS"); if (p) { try { const x = JSON.parse(p); if (x?.default) return String(x.default); } catch { /* ignore */ } } const k = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SECRET_KEY"); if (!k) throw Error("service_key_missing"); return k; }
function db() { const u = Deno.env.get("SUPABASE_URL"); if (!u) throw Error("supabase_url_missing"); return createClient(u, key(), { auth: { persistSession: false, autoRefreshToken: false } }); }
async function hash(v: string) { const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(v)); return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, "0")).join(""); }
function role(v: any) { const x = low(v).replace(/[-\s]+/g, "_"); if (x === "admin") return "admin"; if (x.includes("pimpinan") || x.includes("kepala_sekolah") || x === "kepsek") return "pimpinan"; if (x.includes("akademik")) return "akademik"; if (x.includes("wali") || x.includes("walas") || x.includes("homeroom")) return "walas"; if (x.includes("guru") || x.includes("teacher")) return "guru"; return x; }

async function auth(s: any, req: Request, b: any) {
  const token = txt(req.headers.get("x-session-token") || b.session_token);
  if (!token) throw new Fail("session_invalid", 401);
  const { data: ss } = await s.from("user_sessions").select("user_account_id,expires_at,revoked_at").eq("token_hash", await hash(token)).maybeSingle();
  if (!ss || ss.revoked_at) throw new Fail("session_invalid", 401);
  if (!ss.expires_at || new Date(ss.expires_at).getTime() <= Date.now()) throw new Fail("session_expired", 401);
  const { data: a } = await s.from("user_accounts").select("id,teacher_id,username,status").eq("id", ss.user_account_id).maybeSingle();
  if (!a) throw new Fail("account_not_found", 401);
  if (["inactive", "nonaktif", "disabled", "blocked"].includes(low(a.status))) throw new Fail("account_inactive", 403);
  return a;
}

// All SD periods (year × semester) plus the active one. A request may ask for
// another period by academic_year name + semester_no; default is the active one.
async function periods(s: any) {
  const { data: u } = await s.from("school_units").select("id").eq("code", "SD").maybeSingle();
  if (!u) throw Error("school_unit_not_found");
  const { data: ys, error } = await s.from("academic_years").select("id,name,is_active").eq("school_unit_id", u.id);
  if (error) throw error;
  const ids = (ys || []).map((y: any) => y.id);
  const { data: sm, error: se } = ids.length ? await s.from("semesters").select("academic_year_id,semester_no,is_active,start_date,end_date").in("academic_year_id", ids) : { data: [], error: null };
  if (se) throw se;
  const list = (sm || []).map((x: any) => { const y = (ys || []).find((v: any) => v.id === x.academic_year_id); return { year: { id: y.id, name: txt(y.name) }, semesterNo: Number(x.semester_no), active: !!(y.is_active && x.is_active), start_date: x.start_date, end_date: x.end_date }; })
    .sort((a: any, b: any) => b.year.name.localeCompare(a.year.name) || a.semesterNo - b.semesterNo);
  const active = list.find((x: any) => x.active);
  if (!active) throw new Fail("active_period_not_found", 409);
  return { list, active };
}
function pickPeriod(all: any, b: any) {
  const y = txt(b.academic_year), n = Number(b.semester_no);
  if (!y && !n) return all.active;
  const p = all.list.find((x: any) => x.year.name === (y || all.active.year.name) && x.semesterNo === (n || all.active.semesterNo));
  if (!p) throw new Fail("period_not_found", 404);
  return p;
}

async function context(s: any, a: any, p: any) {
  const roles: string[] = [];
  if (low(a.username) === "admin") roles.push("admin");
  const walas = new Set<string>(), english = new Set<string>();
  if (a.teacher_id) {
    const { data: ur } = await s.from("user_roles").select("role_code,is_active").eq("teacher_id", a.teacher_id).eq("is_active", true);
    for (const r of ur || []) roles.push(role(r.role_code));
    const { data: rc } = await s.from("report_class_assignments").select("class_id,homeroom_teacher_id,partner_teacher_id").eq("academic_year_id", p.year.id).eq("semester_no", p.semesterNo);
    for (const r of rc || []) if (txt(r.homeroom_teacher_id) === txt(a.teacher_id) || txt(r.partner_teacher_id) === txt(a.teacher_id)) walas.add(txt(r.class_id));
    if (walas.size) roles.push("walas");
    const { data: subs } = await s.from("subjects").select("id,name,code").eq("is_active", true);
    const englishIds = (subs || []).filter((x: any) => /(english|bahasa inggris|bilingual)/i.test(`${x.name || ""} ${x.code || ""}`)).map((x: any) => x.id);
    if (englishIds.length) {
      const { data: ta } = await s.from("teacher_subject_assignments").select("class_id").eq("teacher_id", a.teacher_id).eq("academic_year_id", p.year.id).eq("semester_no", p.semesterNo).eq("is_active", true).in("subject_id", englishIds);
      for (const r of ta || []) english.add(txt(r.class_id));
      if (english.size) roles.push("guru");
    }
  }
  const unique = [...new Set(roles)], scoped = walas.size ? [...walas] : [...english];
  return { roles: unique, allRead: unique.some(r => READ_ALL.has(r)), allWrite: unique.some(r => WRITE_ALL.has(r)), manage: unique.some(r => MANAGE.has(r)), readIds: scoped, writeIds: scoped };
}
async function classesFor(s: any, p: any, c: any) {
  const { data, error } = await s.from("classes").select("id,name,grade_level,is_active").eq("academic_year_id", p.year.id).eq("is_active", true);
  if (error) throw error;
  let rows = (data || []).map((x: any) => ({ id: txt(x.id), name: txt(x.name), grade_level: Number(x.grade_level) || null }));
  if (!c.allRead) rows = rows.filter((x: any) => c.readIds.includes(x.id));
  return rows.sort((a: any, b: any) => a.name.localeCompare(b.name, "id", { numeric: true }));
}
// Progress may only be written in the active semester; categories may be prepared ahead.
function canWrite(c: any, p: any, id: string) { return p.active && (c.allWrite || c.writeIds.includes(id)); }
async function teacherName(s: any, a: any) { if (a.teacher_id) { const { data } = await s.from("teachers").select("full_name").eq("id", a.teacher_id).maybeSingle(); if (txt(data?.full_name)) return txt(data.full_name); } return txt(a.username) || "Pengguna CQlass"; }

async function categoriesFor(s: any, p: any, classIds: string[]) {
  const out = new Map<string, any[]>(classIds.map(id => [id, []]));
  if (!classIds.length) return out;
  const { data, error } = await s.from("bilingual_vocabulary_categories").select("class_id,category_no,category_name,target_count").eq("academic_year_id", p.year.id).eq("semester_no", p.semesterNo).in("class_id", classIds).order("category_no");
  if (error) throw error;
  for (const x of data || []) out.get(txt(x.class_id))?.push({ category_no: Number(x.category_no), category_name: txt(x.category_name), target_count: Number(x.target_count) || 0 });
  return out;
}
async function roster(s: any, p: any, classIds: string[]) {
  if (!classIds.length) return [];
  const { data: e, error } = await s.from("student_enrollments").select("student_id,class_id").eq("academic_year_id", p.year.id).eq("semester_no", p.semesterNo).eq("is_active", true).in("class_id", classIds);
  if (error) throw error;
  const ids = [...new Set((e || []).map((x: any) => x.student_id))];
  if (!ids.length) return [];
  const sm = new Map<string, any>();
  for (let i = 0; i < ids.length; i += 500) { const { data: st, error: se } = await s.from("students").select("id,nis,full_name").in("id", ids.slice(i, i + 500)); if (se) throw se; for (const x of st || []) sm.set(x.id, x); }
  return (e || []).map((x: any) => ({ student_id: x.student_id, class_id: x.class_id, nis: sm.get(x.student_id)?.nis || "", name: sm.get(x.student_id)?.full_name || "" })).filter((x: any) => x.name);
}
async function progress(s: any, p: any, classIds: string[]) {
  if (!classIds.length) return [];
  const rows: any[] = [];
  for (let start = 0; ; start += 1000) {
    const { data, error } = await s.from("bilingual_vocabulary_progress").select("student_id,class_id,category_no,mastered_count,updated_at")
      .eq("academic_year_id", p.year.id).eq("semester_no", p.semesterNo).in("class_id", classIds).order("student_id").order("category_no").range(start, start + 999);
    if (error) throw error;
    rows.push(...(data || []));
    if ((data || []).length < 1000) return rows;
  }
}
function buildStudents(rs: any[], pr: any[], catsByClass: Map<string, any[]>, classNames: Map<string, string>) {
  const pm = new Map<string, Map<number, any>>();
  for (const x of pr) { if (!pm.has(x.student_id)) pm.set(x.student_id, new Map()); pm.get(x.student_id)!.set(Number(x.category_no), x); }
  return rs.map(r => {
    const cats = catsByClass.get(r.class_id) || [], m = pm.get(r.student_id) || new Map(), values: any = {};
    let total = 0, target = 0, filled = 0, completed = 0, last = "";
    for (const c of cats) {
      target += Number(c.target_count) || 0;
      const x = m.get(c.category_no);
      if (x !== undefined) { const v = Number(x.mastered_count); values[c.category_no] = v; total += v; filled++; if (v >= Number(c.target_count)) completed++; if (txt(x.updated_at) > last) last = txt(x.updated_at); }
      else values[c.category_no] = null;
    }
    return { student_id: r.student_id, nis: r.nis, name: r.name, class_id: r.class_id, class_name: classNames.get(r.class_id) || "", values, total_mastered: filled ? total : null, total_target: target, percentage: filled && target ? Math.round(total / target * 1000) / 10 : null, filled_categories: filled, total_categories: cats.length, completed_categories: completed, last_updated: last || null, has_data: filled > 0 };
  });
}
function rank(rows: any[]) {
  const list = rows.filter(x => x.has_data).sort((a, b) => (Number(b.percentage) - Number(a.percentage)) || (Number(b.total_mastered) - Number(a.total_mastered)) || (Number(b.filled_categories) - Number(a.filled_categories)) || a.name.localeCompare(b.name, "id"));
  let prevKey = "", prevRank = 0;
  return list.map((x, i) => { const k = `${x.percentage}|${x.total_mastered}|${x.filled_categories}`; const r = k === prevKey ? prevRank : i + 1; prevKey = k; prevRank = r; return { ...x, rank: r }; });
}
function classSummary(classes: any[], students: any[]) {
  return classes.map(cl => { const r = students.filter(x => x.class_id === cl.id), filled = r.filter(x => x.has_data), avg = filled.length ? Math.round(filled.reduce((a, x) => a + Number(x.percentage || 0), 0) / filled.length * 10) / 10 : null, total = filled.reduce((a, x) => a + Number(x.total_mastered || 0), 0); return { class_id: cl.id, class_name: cl.name, students: r.length, students_filled: filled.length, students_blank: r.length - filled.length, completeness_pct: r.length ? Math.round(filled.length / r.length * 1000) / 10 : 0, average_pct: avg, total_mastered: total }; });
}
const periodOut = (p: any) => ({ academic_year: p.year.name, semester_no: p.semesterNo, is_active_period: p.active });

// Validates one class's category list coming from the settings screen.
function cleanCategories(list: any) {
  if (!Array.isArray(list)) throw new Fail("categories_invalid");
  if (list.length > MAX_CATEGORIES) throw new Fail("categories_too_many", 400, { max: MAX_CATEGORIES });
  const seen = new Set<number>();
  return list.map((x: any) => {
    const no = Number(x.category_no), name = txt(x.category_name).replace(/\s+/g, " "), target = Number(x.target_count);
    if (!Number.isInteger(no) || no < 1 || no > 999 || seen.has(no)) throw new Fail("category_no_invalid", 400, { category_no: x.category_no });
    if (!name || name.length > 60) throw new Fail("category_name_invalid", 400, { category_no: no });
    if (!Number.isInteger(target) || target < 1 || target > MAX_TARGET) throw new Fail("target_invalid", 400, { category_no: no, max: MAX_TARGET });
    seen.add(no);
    return { category_no: no, category_name: name, target_count: target };
  }).sort((a: any, b: any) => a.category_no - b.category_no);
}

async function saveCategories(s: any, p: any, classes: any[], b: any, who: string) {
  const byId = new Map(classes.map((c: any) => [c.id, c]));
  const items = Array.isArray(b.items) ? b.items : [];
  if (!items.length) throw new Fail("nothing_to_save");
  const plan = items.map((it: any) => { const id = txt(it.class_id), cl = byId.get(id); if (!cl) throw new Fail("class_forbidden", 403); return { cl, cats: cleanCategories(it.categories) }; });
  const ids = plan.map((x: any) => x.cl.id), existing = await categoriesFor(s, p, ids), pr = await progress(s, p, ids);
  // Never silently drop recorded scores: a category that already has data cannot be
  // removed, and its target cannot go below the highest value already recorded.
  for (const { cl, cats } of plan) {
    const keep = new Map(cats.map((c: any) => [c.category_no, c]));
    for (const old of existing.get(cl.id) || []) {
      const rows = pr.filter((x: any) => txt(x.class_id) === cl.id && Number(x.category_no) === old.category_no);
      if (!rows.length) continue;
      const next: any = keep.get(old.category_no);
      if (!next) throw new Fail("category_has_data", 409, { class_name: cl.name, category_no: old.category_no, category_name: old.category_name, rows: rows.length });
      const max = Math.max(...rows.map((x: any) => Number(x.mastered_count) || 0));
      if (next.target_count < max) throw new Fail("target_below_data", 409, { class_name: cl.name, category_no: old.category_no, category_name: next.category_name, max });
    }
  }
  const now = new Date().toISOString();
  let saved = 0, removed = 0;
  for (const { cl, cats } of plan) {
    const keepNos = cats.map((c: any) => c.category_no);
    const gone = (existing.get(cl.id) || []).filter((c: any) => !keepNos.includes(c.category_no)).map((c: any) => c.category_no);
    if (gone.length) { const { error } = await s.from("bilingual_vocabulary_categories").delete().eq("class_id", cl.id).eq("academic_year_id", p.year.id).eq("semester_no", p.semesterNo).in("category_no", gone); if (error) throw error; removed += gone.length; }
    if (cats.length) {
      const rows = cats.map((c: any) => ({ class_id: cl.id, academic_year_id: p.year.id, semester_no: p.semesterNo, ...c, source_system: "cqlass_bilingual_settings", source_ref: `settings:${who}`.slice(0, 200), updated_at: now }));
      const { error } = await s.from("bilingual_vocabulary_categories").upsert(rows, { onConflict: "class_id,academic_year_id,semester_no,category_no" });
      if (error) throw error;
      saved += rows.length;
    }
  }
  return { saved, removed, classes: plan.length };
}

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ success: false, error: "method_not_allowed" }, 405);
  let b: any = {};
  try { b = await req.json(); } catch { return json({ success: false, error: "invalid_json" }, 400); }
  try {
    const s = db(), account = await auth(s, req, b), all = await periods(s), p = pickPeriod(all, b);
    const c = await context(s, account, p), classes = await classesFor(s, p, c), action = low(b.action || "bootstrap");

    if (action === "bootstrap") {
      return json({ success: true, ...periodOut(p), active_period: periodOut(all.active), periods: all.list.map(periodOut), roles: c.roles, can_manage_categories: c.manage,
        classes: classes.map((x: any) => ({ ...x, can_write: canWrite(c, p, x.id) })), class_locked: !c.allRead, default_class_id: classes.length === 1 ? classes[0].id : "" });
    }
    if (action === "class_data") {
      const id = txt(b.class_id), cl = classes.find((x: any) => x.id === id);
      if (!cl) return json({ success: false, error: "class_forbidden" }, 403);
      const cats = (await categoriesFor(s, p, [id])).get(id) || [], rs = await roster(s, p, [id]), pr = await progress(s, p, [id]);
      const students = buildStudents(rs, pr, new Map([[id, cats]]), new Map([[id, cl.name]])).sort((a, b) => a.name.localeCompare(b.name, "id"));
      return json({ success: true, ...periodOut(p), class: cl, categories: cats, students, can_write: canWrite(c, p, id) });
    }
    if (action === "save_progress") {
      const id = txt(b.class_id), cl = classes.find((x: any) => x.id === id);
      if (!cl) return json({ success: false, error: "class_forbidden" }, 403);
      if (!p.active) return json({ success: false, error: "period_locked" }, 403);
      if (!canWrite(c, p, id)) return json({ success: false, error: "write_forbidden" }, 403);
      const cats = (await categoriesFor(s, p, [id])).get(id) || [], cm = new Map(cats.map(x => [x.category_no, x])), rs = await roster(s, p, [id]), allowed = new Set(rs.map(x => x.student_id));
      const items = Array.isArray(b.items) ? b.items : [], who = await teacherName(s, account), now = new Date().toISOString();
      let saved = 0, cleared = 0;
      for (const item of items) {
        const sid = txt(item.student_id), no = Number(item.category_no);
        if (!allowed.has(sid) || !cm.has(no)) continue;
        const raw = item.mastered_count;
        if (raw === null || raw === undefined || txt(raw) === "") { const { error } = await s.from("bilingual_vocabulary_progress").delete().eq("student_id", sid).eq("academic_year_id", p.year.id).eq("semester_no", p.semesterNo).eq("category_no", no); if (error) throw error; cleared++; continue; }
        const v = Number(raw), target = Number(cm.get(no).target_count);
        if (!Number.isInteger(v) || v < 0 || v > target) return json({ success: false, error: "value_out_of_range", category_no: no, target }, 400);
        const payload = { student_id: sid, class_id: id, academic_year_id: p.year.id, semester_no: p.semesterNo, category_no: no, mastered_count: v, recorded_by_account_id: account.id, recorded_by_name: who, source_system: "cqlass_bilingual_web", source_ref: `web:${sid}:${p.year.id}:${p.semesterNo}:${no}`, updated_at: now };
        const { error } = await s.from("bilingual_vocabulary_progress").upsert(payload, { onConflict: "student_id,academic_year_id,semester_no,category_no" });
        if (error) throw error;
        saved++;
      }
      return json({ success: true, saved, cleared });
    }
    if (action === "leaderboard" || action === "report") {
      let scope = classes;
      const id = txt(b.class_id);
      if (id) { const cl = classes.find((x: any) => x.id === id); if (!cl) return json({ success: false, error: "class_forbidden" }, 403); scope = [cl]; }
      const ids = scope.map((x: any) => x.id), catsByClass = await categoriesFor(s, p, ids), rs = await roster(s, p, ids), pr = await progress(s, p, ids);
      const students = buildStudents(rs, pr, catsByClass, new Map(scope.map((x: any) => [x.id, x.name]))), filled = students.filter(x => x.has_data);
      const school = { students: students.length, students_filled: filled.length, students_blank: students.length - filled.length, completeness_pct: students.length ? Math.round(filled.length / students.length * 1000) / 10 : 0, average_pct: filled.length ? Math.round(filled.reduce((a, x) => a + Number(x.percentage || 0), 0) / filled.length * 10) / 10 : null, total_mastered: filled.reduce((a, x) => a + Number(x.total_mastered || 0), 0) };
      return json({ success: true, ...periodOut(p), school, classes: classSummary(scope, students), categories_by_class: Object.fromEntries(catsByClass), leaderboard: rank(students), students });
    }
    if (action === "categories_get") {
      if (!c.manage) return json({ success: false, error: "manage_forbidden" }, 403);
      const ids = classes.map((x: any) => x.id), cats = await categoriesFor(s, p, ids), pr = await progress(s, p, ids);
      const used: Record<string, number[]> = {};
      for (const x of pr) { const k = txt(x.class_id); (used[k] ||= []); if (!used[k].includes(Number(x.category_no))) used[k].push(Number(x.category_no)); }
      return json({ success: true, ...periodOut(p), classes: classes.map((x: any) => ({ ...x, categories: cats.get(x.id) || [], categories_with_data: used[x.id] || [] })) });
    }
    if (action === "categories_save") {
      if (!c.manage) return json({ success: false, error: "manage_forbidden" }, 403);
      const r = await saveCategories(s, p, classes, b, await teacherName(s, account));
      return json({ success: true, ...periodOut(p), ...r });
    }
    return json({ success: false, error: "action_not_found" }, 404);
  } catch (e) {
    if (e instanceof Fail) return json({ success: false, error: e.code, ...e.extra }, e.status);
    const m = e instanceof Error ? e.message : "internal_error";
    console.error("bilingual-v7", m);
    return json({ success: false, error: m }, 500);
  }
});
