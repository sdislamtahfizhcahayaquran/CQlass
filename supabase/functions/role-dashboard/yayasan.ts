import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-session-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const blocked = new Set(["inactive", "nonaktif", "disabled", "blocked", "blokir"]);
const formatDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit",
});
const uuid = /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;

function reply(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { ...cors, "Cache-Control": "no-store" } });
}

async function authorize(db: SupabaseClient, token: string) {
  const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token)));
  const tokenHash = Array.from(hash, n => n.toString(16).padStart(2, "0")).join("");
  const { data: session, error } = await db.from("user_sessions").select("user_account_id")
    .eq("token_hash", tokenHash).is("revoked_at", null).gt("expires_at", new Date().toISOString()).maybeSingle();
  if (error) throw error;
  if (!session) return 401;
  const { data: account, error: accountError } = await db.from("user_accounts").select("status,teacher_id")
    .eq("id", session.user_account_id).maybeSingle();
  if (accountError) throw accountError;
  if (!account || blocked.has(String(account.status).trim().toLowerCase())) return 401;
  if (!account.teacher_id) return 403;
  const { data: grant, error: grantError } = await db.from("user_roles").select("role_code")
    .eq("teacher_id", account.teacher_id).eq("role_code", "yayasan").eq("is_active", true).maybeSingle();
  if (grantError) throw grantError;
  if (!grant) return 403;
  const { data: role, error: roleError } = await db.from("role_catalog").select("role_code")
    .eq("role_code", "yayasan").eq("is_active", true).maybeSingle();
  if (roleError) throw roleError;
  return role ? 200 : 403;
}

async function rows<T>(query: { range: (from: number, to: number) => PromiseLike<{data: T[] | null; error: unknown}> }) {
  const output: T[] = [];
  const size = 500;
  for (let offset = 0;; offset += size) {
    const { data, error } = await query.range(offset, offset + size - 1);
    if (error) throw error;
    if (!data) throw new Error("Missing query results");
    output.push(...data);
    if (data.length < size) return output;
  }
}

async function activePeriod(db: SupabaseClient) {
  const { data: year, error: yearError } = await db.from("academic_years")
    .select("id,name").eq("is_active", true).single();
  if (yearError) throw yearError;
  const { data: semester, error: semesterError } = await db.from("semesters")
    .select("semester_no").eq("academic_year_id", year.id).eq("is_active", true).single();
  if (semesterError) throw semesterError;
  const classes = await rows(db.from("classes").select("id,name,grade_level")
    .eq("academic_year_id", year.id).eq("is_active", true).order("grade_level").order("name").order("id"));
  return { year, semester: semester.semester_no, classes };
}

async function morningTalk(db: SupabaseClient, classIds: string[], start: string, end: string, details: boolean) {
  if (!classIds.length) return [];
  const [history, live] = await Promise.all([
    rows(db.from("morning_talk_recap_history").select("class_id,recap_date,theme,photo_path,present_count,sick_count,excused_count,unexcused_count")
      .in("class_id", classIds).gte("recap_date", start).lte("recap_date", end).order("updated_at").order("id")),
    rows(db.from("morning_talk_sessions").select("id,class_id,attendance_date,theme,photo_path,additional_note")
      .in("class_id", classIds).gte("attendance_date", start).lte("attendance_date", end).order("updated_at").order("id")),
  ]);
  const byClassDate = new Map<string, {
    class_id: string; date: string; theme: string; note?: string; path?: string; session?: string;
    counts?: { present: number | null; sick: number | null; excused: number | null; unexcused: number | null };
  }>();
  for (const r of history) {
    byClassDate.set(r.class_id + "|" + r.recap_date, {
      class_id: r.class_id, date: r.recap_date, theme: r.theme, path: r.photo_path,
      counts: { present: r.present_count, sick: r.sick_count, excused: r.excused_count, unexcused: r.unexcused_count },
    });
  }
  for (const r of live) {
    const key = r.class_id + "|" + r.attendance_date;
    const previous = byClassDate.get(key);
    byClassDate.set(key, {
      class_id: r.class_id, date: r.attendance_date, theme: r.theme || previous?.theme,
      path: r.photo_path || previous?.path, note: r.additional_note, session: r.id, counts: previous?.counts,
    });
  }
  const entries = [...byClassDate.values()].sort((a, b) => b.date.localeCompare(a.date));
  if (!details) return entries.map(({ class_id, date, theme }) => ({ class_id, date, theme }));

  const attendance = new Map<string, { present: number; sick: number; excused: number; unexcused: number }>();
  const photos = new Map<string, string>();
  const ids = entries.flatMap(r => r.session ? [r.session] : []);
  const paths = [...new Set(entries.flatMap(r => r.path && !/^https?:\/\//i.test(r.path) ? [r.path] : []))];
  await Promise.all([
    (async () => {
      for (let i = 0; i < ids.length; i += 75) {
        const records = await rows(db.from("morning_talk_attendance").select("session_id,status")
          .in("session_id", ids.slice(i, i + 75)).order("id"));
        for (const r of records) {
          const counts = attendance.get(r.session_id) || { present: 0, sick: 0, excused: 0, unexcused: 0 };
          if (r.status === "Hadir" || r.status === "Terlambat") counts.present++;
          else if (r.status === "Sakit") counts.sick++;
          else if (r.status === "Izin") counts.excused++;
          else if (r.status === "Alfa") counts.unexcused++;
          attendance.set(r.session_id, counts);
        }
      }
    })(),
    (async () => {
      for (let i = 0; i < paths.length; i += 100) {
        const { data, error } = await db.storage.from("morning-talk").createSignedUrls(paths.slice(i, i + 100), 3600);
        if (error) console.warn("Morning Talk photos unavailable", error.message);
        for (const photo of data || []) {
          if (photo.path && photo.signedUrl) photos.set(photo.path, photo.signedUrl);
        }
      }
    })(),
  ]);
  return entries.map(({ class_id, date, theme, note, path, session, counts }) => ({
    class_id, date, theme, note,
    counts: (session && attendance.get(session)) || counts,
    photo_url: path && (/^https:\/\//i.test(path) ? path : photos.get(path)),
  }));
}

async function facilities(db: SupabaseClient, start: string, end: string) {
  const nextDay = new Date(Date.parse(end + "T00:00:00Z") + 86400000).toISOString().slice(0, 10);
  return rows(db.from("internal_reports")
    .select("ticket_no,location,description,status,resolution_note,created_at")
    .eq("report_type", "SAPRAS").gte("created_at", start + "T00:00:00+07:00").lt("created_at", nextDay + "T00:00:00+07:00")
    .order("created_at", { ascending: false }).order("id"));
}

async function academics(db: SupabaseClient, period: Awaited<ReturnType<typeof activePeriod>>, classId: string) {
  const cls = period.classes.find(c => c.id === classId);
  if (!cls) return null;
  const yearId = period.year.id;
  const semester = period.semester;
  const [assignments, objectives, scores] = await Promise.all([
    rows(db.from("teacher_subject_assignments").select("subject_id").eq("academic_year_id", yearId).eq("semester_no", semester).eq("class_id", classId).eq("is_active", true).order("id")),
    rows(db.from("learning_objectives").select("id,subject_id,code,description,topic,kktp").eq("academic_year_id", yearId).eq("semester_no", semester)
      .eq("grade_level", cls.grade_level).eq("is_active", true).order("sort_order").order("code").order("id")),
    rows(db.from("academic_scores").select("student_id,subject_id,learning_objective_id,assessment_type,score,students(full_name)").eq("academic_year_id", yearId).eq("semester_no", semester)
      .eq("class_id", classId).is("deleted_at", null).order("updated_at", { ascending: false }).order("id")),
  ]);
  const subjectIds = [...new Set([...assignments, ...scores].map(r => r.subject_id))];
  const subjects = subjectIds.length ? await rows(db.from("subjects").select("id,name").in("id", subjectIds).order("name").order("id")) : [];
  const latest = new Map<string, typeof scores[number]>();
  for (const score of scores) {
    const key = [score.student_id, score.subject_id, score.assessment_type, score.learning_objective_id].join("|");
    if (!latest.has(key)) latest.set(key, score);
  }
  const valid = [...latest.values()].filter(r => r.score !== null);
  const groups = new Map<string, number[]>();
  for (const r of valid) {
    if (r.assessment_type !== "TP" || !r.learning_objective_id) continue;
    const values = groups.get(r.learning_objective_id) || [];
    values.push(Number(r.score));
    groups.set(r.learning_objective_id, values);
  }
  const numbers = new Map<string, number>();
  const tp = objectives.filter(o => subjectIds.includes(o.subject_id)).map(o => {
    const index = (numbers.get(o.subject_id) || 0) + 1;
    numbers.set(o.subject_id, index);
    const values = groups.get(o.id) || [];
    const target = Number(o.kktp) > 0 && Number(o.kktp) <= 100 ? Number(o.kktp) : 75;
    const average = values.length ? values.reduce((sum, score) => sum + score, 0) / values.length : null;
    return {
      id: o.id, subject_id: o.subject_id, code: "TP" + index, description: o.description || o.topic,
      target, average, assessed: values.length, achieved: values.filter(value => value >= target).length,
      status: average === null ? "pending" : average >= target ? "achieved" : "below",
    };
  });
  const grades = valid.map(r => ({
    student: (r.students as unknown as { full_name: string } | null)?.full_name || "Siswa",
    subject_id: r.subject_id, objective_id: r.learning_objective_id, type: r.assessment_type, score: r.score,
  })).sort((a, b) => a.student.localeCompare(b.student, "id"));
  return { subjects, tp, grades };
}

function validDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value;
}

export async function serveYayasan(db: SupabaseClient, request: Request, body: Record<string, unknown>) {
  const token = request.headers.get("x-session-token")?.trim();
  if (!token || token.length > 256) return reply({ error: "session_invalid" }, 401);
  try {
    const status = await authorize(db, token);
    if (status !== 200) return reply({ error: status === 401 ? "session_invalid" : "forbidden" }, status);
    if (body.action === "yayasan_academics" && !uuid.test(String(body.class_id || ""))) {
      return reply({ error: "invalid_class" }, 400);
    }
    const period = await activePeriod(db);
    if (body.action === "yayasan_academics") {
      const result = await academics(db, period, String(body.class_id));
      return result ? reply(result) : reply({ error: "class_not_found" }, 404);
    }
    const today = formatDate.format(new Date());
    const start = String(body.start ?? today.slice(0, 7) + "-01");
    const end = String(body.end ?? today);
    if (!validDate(start) || !validDate(end) || start > end || end > today || Date.parse(end) - Date.parse(start) > 366 * 86400000) {
      return reply({ error: "invalid_dates" }, 400);
    }
    const [mt, sapras] = await Promise.all([morningTalk(db, period.classes.map(c => c.id), start, end, body.mt_details === true), facilities(db, start, end)]);
    return reply({ year: period.year.name, semester: period.semester, classes: period.classes, mt, sapras, start, end });
  } catch (error) {
    console.error("yayasan-dashboard", error);
    return reply({ error: "server_error" }, 500);
  }
}
