import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ============================================================================
// CQLASS ACADEMIC V7.2 — FINAL
// EDGE FUNCTION: academic-scores
//
// Verify JWT: OFF
//
// Action:
// - bootstrap
// - load
// - save_component
// - save_tp
//
// Catatan penting V7.2:
// - teacher_subject_assignments = sumber penugasan mapel guru
// - learning_objectives = MASTER TP (tidak difilter hanya "CP")
// - student_enrollments dibaca berdasarkan kelas/periode, tanpa syarat is_active
// - guru pengampu dapat edit; Akademik/Pimpinan/Admin monitor read-only
// ============================================================================

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-session-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SCHOOL_UNIT_CODE = "SD";
const DEFAULT_ACADEMIC_YEAR = "2026/2027";
const DEFAULT_SEMESTER = 1;

const NON_TP_COMPONENTS = [
  "TUGAS_1",
  "TUGAS_2",
  "TUGAS_3",
  "TUGAS_4",
  "TUGAS_5",
  "WWP",
  "ASAS",
] as const;

const READ_ALL_ROLES = ["admin", "pimpinan", "akademik"];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function txt(value: unknown): string {
  return String(value ?? "").trim();
}

function low(value: unknown): string {
  return txt(value).toLowerCase();
}

function upper(value: unknown): string {
  return txt(value).toUpperCase();
}

function normalizeRole(value: unknown): string {
  const s = low(value)
    .replace(/[-\s]+/g, "_")
    .replace(/[^a-z0-9_]/g, "");

  if (!s) return "";
  if (s === "admin" || s.includes("administrator")) return "admin";
  if (s.includes("pimpinan") || s.includes("kepala_sekolah") || s === "kepsek") return "pimpinan";
  if (s.includes("kabid_akademik") || s === "akademik" || s.includes("academic")) return "akademik";
  if (s.includes("walas") || s.includes("wali_kelas") || s.includes("homeroom")) return "walas";
  if (s === "guru" || s.includes("teacher") || s.includes("pengajar")) return "guru";
  return s;
}

function isAccountActive(status: unknown): boolean {
  const s = low(status);
  return !["nonaktif", "inactive", "disabled", "blokir", "blocked", "keluar", "lulus"].includes(s);
}

function isValidScore(value: unknown): boolean {
  if (value === null || value === undefined || txt(value) === "") return true;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 && n <= 100;
}

function parseScore(value: unknown): number | null {
  if (value === null || value === undefined || txt(value) === "") return null;
  return Number(value);
}

function getServiceKey(): string {
  const packed = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (packed) {
    try {
      const parsed = JSON.parse(packed);
      if (parsed?.default) return String(parsed.default);
    } catch (_) {}
  }

  const key =
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
    Deno.env.get("SUPABASE_SECRET_KEY");

  if (!key) throw new Error("service_key_missing");
  return key;
}

function getSupabase() {
  const url = Deno.env.get("SUPABASE_URL");
  if (!url) throw new Error("supabase_url_missing");

  return createClient(url, getServiceKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

async function sha256(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function extractSessionToken(req: Request, body: any): string {
  return txt(
    req.headers.get("x-session-token") ||
      body?.session_token ||
      body?.sessionToken,
  );
}

async function validateSession(supabase: any, req: Request, body: any) {
  const token = extractSessionToken(req, body);
  if (!token) {
    return {
      ok: false,
      response: json({ success: false, error: "session_invalid" }, 401),
    };
  }

  const tokenHash = await sha256(token);

  const { data: session, error: sessionError } = await supabase
    .from("user_sessions")
    .select("id,user_account_id,expires_at,revoked_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (sessionError || !session || session.revoked_at) {
    return {
      ok: false,
      response: json({ success: false, error: "session_invalid" }, 401),
    };
  }

  if (!session.expires_at || new Date(session.expires_at).getTime() <= Date.now()) {
    return {
      ok: false,
      response: json({ success: false, error: "session_expired" }, 401),
    };
  }

  const { data: account, error: accountError } = await supabase
    .from("user_accounts")
    .select("id,teacher_id,username,email,status,must_change_password")
    .eq("id", session.user_account_id)
    .maybeSingle();

  if (accountError || !account) {
    return {
      ok: false,
      response: json({ success: false, error: "account_not_found" }, 401),
    };
  }

  if (!isAccountActive(account.status)) {
    return {
      ok: false,
      response: json({ success: false, error: "account_inactive" }, 403),
    };
  }

  // Non-kritis: jangan gagalkan request bila kolom last_used_at bermasalah.
  try {
    await supabase
      .from("user_sessions")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", session.id);
  } catch (_) {}

  return { ok: true, account, session };
}

async function getRoles(supabase: any, account: any): Promise<string[]> {
  const roles: string[] = [];

  if (low(account.username) === "admin") roles.push("admin");

  const teacherId = txt(account.teacher_id);
  if (teacherId) {
    const { data, error } = await supabase
      .from("user_roles")
      .select("role_code,is_active")
      .eq("teacher_id", teacherId)
      .eq("is_active", true);

    if (error) throw error;

    for (const row of data || []) {
      const role = normalizeRole(row.role_code);
      if (role) roles.push(role);
    }

    // Semua akun yang terhubung guru minimal punya hak dasar guru.
    roles.push("guru");
  }

  return [...new Set(roles)];
}

function canBrowseAll(roles: string[]): boolean {
  return roles.some((r) => READ_ALL_ROLES.includes(r));
}

// Only initial bootstrap may resolve the school's active period.
// Explicit period payloads and all existing write paths retain their behavior.
async function resolveBootstrapPeriod(supabase: any) {
  const { data: unit, error: ue } = await supabase.from("school_units")
    .select("id").eq("code", SCHOOL_UNIT_CODE).single();
  if (ue || !unit) throw new Error("school_unit_not_found");
  const { data: year, error: ye } = await supabase.from("academic_years")
    .select("id,name").eq("school_unit_id", unit.id).eq("is_active", true).single();
  if (ye || !year) throw new Error("active_academic_year_not_found");
  const { data: semester, error: se } = await supabase.from("semesters")
    .select("semester_no").eq("academic_year_id", year.id).eq("is_active", true).single();
  if (se || !semester || ![1,2].includes(Number(semester.semester_no)))
    throw new Error("active_semester_not_found");
  return { unit, year, semesterNo: Number(semester.semester_no) };
}

async function resolvePeriod(
  supabase: any,
  academicYearName: string,
  semesterNo: number,
) {
  if (![1, 2].includes(semesterNo)) throw new Error("semester_invalid");

  const { data: unit, error: unitError } = await supabase
    .from("school_units")
    .select("id")
    .eq("code", SCHOOL_UNIT_CODE)
    .single();

  if (unitError || !unit) throw new Error("school_unit_not_found");

  const { data: year, error: yearError } = await supabase
    .from("academic_years")
    .select("id,name")
    .eq("school_unit_id", unit.id)
    .eq("name", academicYearName)
    .single();

  if (yearError || !year) throw new Error("academic_year_not_found");

  return { unit, year, semesterNo };
}

async function loadAssignments(
  supabase: any,
  account: any,
  roles: string[],
  academicYearId: string,
  semesterNo: number,
) {
  let query = supabase
    .from("teacher_subject_assignments")
    .select(`
      id,
      teacher_id,
      class_id,
      subject_id,
      academic_year_id,
      semester_no,
      is_active
    `)
    .eq("academic_year_id", academicYearId)
    .eq("semester_no", semesterNo)
    .eq("is_active", true);

  if (!canBrowseAll(roles)) {
    const teacherId = txt(account.teacher_id);
    if (!teacherId) return [];
    query = query.eq("teacher_id", teacherId);
  }

  const { data: rows, error } = await query;
  if (error) throw error;
  if (!rows?.length) return [];

  const classIds = [...new Set(rows.map((r: any) => txt(r.class_id)).filter(Boolean))];
  const subjectIds = [...new Set(rows.map((r: any) => txt(r.subject_id)).filter(Boolean))];
  const teacherIds = [...new Set(rows.map((r: any) => txt(r.teacher_id)).filter(Boolean))];

  const [classRes, subjectRes, teacherRes] = await Promise.all([
    supabase
      .from("classes")
      .select("id,code,name,grade_level")
      .in("id", classIds),
    supabase
      .from("subjects")
      .select("id,code,name,grade_level,sort_order")
      .in("id", subjectIds),
    supabase
      .from("teachers")
      .select("id,teacher_code,full_name")
      .in("id", teacherIds),
  ]);

  if (classRes.error) throw classRes.error;
  if (subjectRes.error) throw subjectRes.error;
  if (teacherRes.error) throw teacherRes.error;

  const classMap = new Map((classRes.data || []).map((x: any) => [txt(x.id), x]));
  const subjectMap = new Map((subjectRes.data || []).map((x: any) => [txt(x.id), x]));
  const teacherMap = new Map((teacherRes.data || []).map((x: any) => [txt(x.id), x]));
  const currentTeacherId = txt(account.teacher_id);

  return rows
    .map((row: any) => {
      const cls: any = classMap.get(txt(row.class_id)) || {};
      const subject: any = subjectMap.get(txt(row.subject_id)) || {};
      const teacher: any = teacherMap.get(txt(row.teacher_id)) || {};

      return {
        id: txt(row.id),
        teacher_id: txt(row.teacher_id),
        teacher_code: txt(teacher.teacher_code),
        teacher_name: txt(teacher.full_name),
        class_id: txt(row.class_id),
        class_code: txt(cls.code),
        class_name: txt(cls.name) || txt(cls.code),
        grade_level: Number(cls.grade_level) || null,
        subject_id: txt(row.subject_id),
        subject_code: txt(subject.code),
        subject_name: txt(subject.name),
        subject_sort_order: Number(subject.sort_order) || 9999,

        // Hanya guru pengampu persis yang boleh mengedit nilai.
        // Akademik/Pimpinan/Admin dapat melihat tetapi read-only.
        can_edit: Boolean(
          currentTeacherId &&
          currentTeacherId === txt(row.teacher_id),
        ),
      };
    })
    .filter((x: any) => x.class_id && x.subject_id)
    .sort((a: any, b: any) => {
      const classCompare = a.class_name.localeCompare(b.class_name, "id", { numeric: true });
      if (classCompare) return classCompare;
      if (a.subject_sort_order !== b.subject_sort_order) {
        return a.subject_sort_order - b.subject_sort_order;
      }
      return a.subject_name.localeCompare(b.subject_name, "id", { numeric: true });
    });
}

async function getAssignment(
  supabase: any,
  account: any,
  roles: string[],
  academicYearId: string,
  semesterNo: number,
  assignmentId: string,
) {
  const assignments = await loadAssignments(
    supabase,
    account,
    roles,
    academicYearId,
    semesterNo,
  );

  return assignments.find((x: any) => x.id === assignmentId) || null;
}

// ============================================================================
// SISWA
// ============================================================================

async function loadRoster(
  supabase: any,
  academicYearId: string,
  semesterNo: number,
  classId: string,
) {
  // V7.2:
  // student_enrollments tidak bergantung pada kolom is_active.
  // Gunakan kelas + periode, lalu dedupe student_id.
  let query = supabase
    .from("student_enrollments")
    .select("student_id")
    .eq("class_id", classId);

  // Kolom periode memang dipakai pada data CQlass saat ini.
  // Jika data lama punya duplikasi, Set di bawah tetap mencegah siswa ganda.
  query = query
    .eq("academic_year_id", academicYearId)
    .eq("semester_no", semesterNo);

  const { data: enrollments, error: enrollmentError } = await query;
  if (enrollmentError) throw enrollmentError;

  const studentIds = [
    ...new Set(
      (enrollments || [])
        .map((x: any) => txt(x.student_id))
        .filter(Boolean),
    ),
  ];

  if (!studentIds.length) return [];

  const { data: students, error: studentError } = await supabase
    .from("students")
    .select("id,nis,nisn,full_name,gender,status")
    .in("id", studentIds);

  if (studentError) throw studentError;

  return (students || [])
    .filter((student: any) => isAccountActive(student.status))
    .map((student: any) => ({
      id: txt(student.id),
      nis: txt(student.nis),
      nisn: txt(student.nisn) || null,
      name: txt(student.full_name),
      gender: txt(student.gender) || null,
    }))
    .sort((a: any, b: any) => a.name.localeCompare(b.name, "id"));
}

// ============================================================================
// TP / LEARNING OBJECTIVES
// ============================================================================

async function loadObjectives(
  supabase: any,
  academicYearId: string,
  semesterNo: number,
  assignment: any,
) {
  const { data, error } = await supabase
    .from("learning_objectives")
    .select(`
      id,
      code,
      objective_type,
      description,
      topic,
      sort_order,
      kktp,
      grade_level,
      subject_id,
      is_active
    `)
    .eq("academic_year_id", academicYearId)
    .eq("semester_no", semesterNo)
    .eq("subject_id", assignment.subject_id)
    .eq("grade_level", assignment.grade_level)
    .eq("is_active", true);

  if (error) throw error;

  // PENTING:
  // learning_objectives di CQlass adalah MASTER TP.
  // Versi sebelumnya salah karena hanya mengambil objective_type = "CP".
  // Akibatnya mapel seperti Bahasa Indonesia tampil "0 TP".
  //
  // Di V7.2 semua baris learning_objectives aktif untuk mapel/kelas/periode
  // diperlakukan sebagai TP. objective_type tetap dikirim sebagai metadata.
  const rows = (data || []).sort((a: any, b: any) =>
    (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0) ||
    txt(a.code).localeCompare(txt(b.code), "id", { numeric: true })
  );

  return rows.map((row: any, index: number) => ({
    id: txt(row.id),

    // Header leger selalu TP1, TP2, TP3, ...
    code: `TP${index + 1}`,

    // Kode asli tetap tersedia untuk tooltip/detail.
    source_code: txt(row.code),

    objective_type: txt(row.objective_type) || "TP",
    description: txt(row.description),
    topic: txt(row.topic) || null,
    sort_order: Number(row.sort_order) || index + 1,
    kktp:
      row.kktp === null || row.kktp === undefined || txt(row.kktp) === ""
        ? null
        : Number(row.kktp),
  }));
}

// ============================================================================
// NILAI
// ============================================================================

async function loadExistingScores(
  supabase: any,
  academicYearId: string,
  semesterNo: number,
  assignment: any,
  studentIds: string[],
) {
  if (!studentIds.length) return [];

  const { data, error } = await supabase
    .from("academic_scores")
    .select(`
      id,
      student_id,
      learning_objective_id,
      teacher_id,
      score,
      predicate,
      assessment_type,
      assessment_date,
      notes,
      updated_at
    `)
    .eq("academic_year_id", academicYearId)
    .eq("semester_no", semesterNo)
    .eq("class_id", assignment.class_id)
    .eq("subject_id", assignment.subject_id)
    .is("deleted_at", null)
    .in("student_id", studentIds);

  if (error) throw error;
  return data || [];
}

function buildStudentMatrix(
  students: any[],
  objectives: any[],
  scores: any[],
) {
  const scoreMap = new Map<string, any>();

  for (const score of scores) {
    const studentId = txt(score.student_id);
    const type = upper(score.assessment_type);
    const objectiveId = txt(score.learning_objective_id);

    if (type === "TP" && objectiveId) {
      scoreMap.set(`${studentId}|TP|${objectiveId}`, score);
    } else if (type) {
      scoreMap.set(`${studentId}|${type}`, score);
    }
  }

  return students.map((student: any) => {
    const components: Record<string, any> = {};

    for (const component of NON_TP_COMPONENTS) {
      const existing = scoreMap.get(`${student.id}|${component}`);
      components[component] = {
        score: existing?.score ?? null,
        notes: existing?.notes ?? null,
        assessment_date: existing?.assessment_date ?? null,
        updated_at: existing?.updated_at ?? null,
      };
    }

    const tp = objectives.map((objective: any) => {
      const existing = scoreMap.get(`${student.id}|TP|${objective.id}`);
      return {
        learning_objective_id: objective.id,
        code: objective.code,
        source_code: objective.source_code,
        description: objective.description,
        topic: objective.topic,
        kktp: objective.kktp,
        score: existing?.score ?? null,
        notes: existing?.notes ?? null,
        assessment_date: existing?.assessment_date ?? null,
        updated_at: existing?.updated_at ?? null,
      };
    });

    return {
      ...student,
      components,
      tp,
    };
  });
}

async function findExistingComponentScore(
  supabase: any,
  academicYearId: string,
  semesterNo: number,
  studentId: string,
  classId: string,
  subjectId: string,
  assessmentType: string,
) {
  const { data, error } = await supabase
    .from("academic_scores")
    .select("id")
    .eq("academic_year_id", academicYearId)
    .eq("semester_no", semesterNo)
    .eq("student_id", studentId)
    .eq("class_id", classId)
    .eq("subject_id", subjectId)
    .eq("assessment_type", assessmentType)
    .is("learning_objective_id", null)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

async function findExistingTpScore(
  supabase: any,
  academicYearId: string,
  semesterNo: number,
  studentId: string,
  classId: string,
  subjectId: string,
  objectiveId: string,
) {
  const { data, error } = await supabase
    .from("academic_scores")
    .select("id")
    .eq("academic_year_id", academicYearId)
    .eq("semester_no", semesterNo)
    .eq("student_id", studentId)
    .eq("class_id", classId)
    .eq("subject_id", subjectId)
    .eq("learning_objective_id", objectiveId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

async function saveComponentScores(
  supabase: any,
  params: {
    academicYearId: string;
    semesterNo: number;
    assignment: any;
    teacherId: string;
    allowedStudentIds: Set<string>;
    assessmentType: string;
    scores: any[];
    assessmentDate: string | null;
  },
) {
  const type = upper(params.assessmentType);

  if (!NON_TP_COMPONENTS.includes(type as any)) {
    throw new Error("assessment_type_invalid");
  }

  let saved = 0;

  for (const item of params.scores) {
    const studentId = txt(item.student_id);
    if (!studentId || !params.allowedStudentIds.has(studentId)) continue;

    if (!isValidScore(item.score)) {
      throw new Error(`invalid_score:${studentId}`);
    }

    const score = parseScore(item.score);
    const notes = txt(item.notes) || null;
    const assessmentDate =
      txt(item.assessment_date) ||
      params.assessmentDate ||
      null;

    const existing = await findExistingComponentScore(
      supabase,
      params.academicYearId,
      params.semesterNo,
      studentId,
      params.assignment.class_id,
      params.assignment.subject_id,
      type,
    );

    const payload = {
      student_id: studentId,
      class_id: params.assignment.class_id,
      subject_id: params.assignment.subject_id,
      learning_objective_id: null,
      teacher_id: params.teacherId,
      academic_year_id: params.academicYearId,
      semester_no: params.semesterNo,
      score,
      predicate: null,
      assessment_type: type,
      assessment_date: assessmentDate,
      notes,
      updated_at: new Date().toISOString(),
    };

    if (existing) {
      const { error } = await supabase
        .from("academic_scores")
        .update(payload)
        .eq("id", existing.id);

      if (error) throw error;
    } else {
      const { error } = await supabase
        .from("academic_scores")
        .insert(payload);

      if (error) throw error;
    }

    saved++;
  }

  return saved;
}

async function saveTpScores(
  supabase: any,
  params: {
    academicYearId: string;
    semesterNo: number;
    assignment: any;
    teacherId: string;
    allowedStudentIds: Set<string>;
    objectiveId: string;
    scores: any[];
    assessmentDate: string | null;
  },
) {
  let saved = 0;

  for (const item of params.scores) {
    const studentId = txt(item.student_id);
    if (!studentId || !params.allowedStudentIds.has(studentId)) continue;

    if (!isValidScore(item.score)) {
      throw new Error(`invalid_score:${studentId}`);
    }

    const score = parseScore(item.score);
    const notes = txt(item.notes) || null;
    const assessmentDate =
      txt(item.assessment_date) ||
      params.assessmentDate ||
      null;

    const existing = await findExistingTpScore(
      supabase,
      params.academicYearId,
      params.semesterNo,
      studentId,
      params.assignment.class_id,
      params.assignment.subject_id,
      params.objectiveId,
    );

    const payload = {
      student_id: studentId,
      class_id: params.assignment.class_id,
      subject_id: params.assignment.subject_id,
      learning_objective_id: params.objectiveId,
      teacher_id: params.teacherId,
      academic_year_id: params.academicYearId,
      semester_no: params.semesterNo,
      score,
      predicate: null,
      assessment_type: "TP",
      assessment_date: assessmentDate,
      notes,
      updated_at: new Date().toISOString(),
    };

    if (existing) {
      const { error } = await supabase
        .from("academic_scores")
        .update(payload)
        .eq("id", existing.id);

      if (error) throw error;
    } else {
      const { error } = await supabase
        .from("academic_scores")
        .insert(payload);

      if (error) throw error;
    }

    saved++;
  }

  return saved;
}

// ============================================================================
// MAIN
// ============================================================================

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ success: false, error: "method_not_allowed" }, 405);
  }

  try {
    const body = await req.json().catch(() => ({}));
    const action = low(body.action);
    const supabase = getSupabase();

    const auth = await validateSession(supabase, req, body);
    if (!auth.ok) return auth.response;

    const account = auth.account;

    const roles = await getRoles(supabase, account);

    if (
      !roles.some((role) =>
        ["guru", "walas", "akademik", "pimpinan", "admin"].includes(role)
      )
    ) {
      return json({ success: false, error: "forbidden" }, 403);
    }

    const useActivePeriod = action === "bootstrap" &&
      !txt(body.academic_year) && body.semester_no == null && body.semester == null;
    const period = useActivePeriod
      ? await resolveBootstrapPeriod(supabase)
      : await resolvePeriod(supabase,
          txt(body.academic_year) || DEFAULT_ACADEMIC_YEAR,
          Number(body.semester_no ?? body.semester ?? DEFAULT_SEMESTER));
    const semesterNo = period.semesterNo;

    // ------------------------------------------------------------------------
    // BOOTSTRAP
    // ------------------------------------------------------------------------
    if (action === "bootstrap") {
      const assignments = await loadAssignments(
        supabase,
        account,
        roles,
        period.year.id,
        semesterNo,
      );

      return json({
        success: true,
        academic_year: period.year.name,
        academic_year_id: period.year.id,
        semester_no: semesterNo,
        roles,
        can_browse_all: canBrowseAll(roles),
        assignments,
      });
    }

    const assignmentId = txt(body.assignment_id);
    if (!assignmentId) {
      return json({ success: false, error: "assignment_required" }, 400);
    }

    const assignment = await getAssignment(
      supabase,
      account,
      roles,
      period.year.id,
      semesterNo,
      assignmentId,
    );

    if (!assignment) {
      return json({ success: false, error: "assignment_forbidden" }, 403);
    }

    // ------------------------------------------------------------------------
    // LOAD
    // ------------------------------------------------------------------------
    if (action === "load") {
      const [roster, objectives] = await Promise.all([
        loadRoster(
          supabase,
          period.year.id,
          semesterNo,
          assignment.class_id,
        ),
        loadObjectives(
          supabase,
          period.year.id,
          semesterNo,
          assignment,
        ),
      ]);

      const studentIds = roster.map((x: any) => x.id);

      const existingScores = await loadExistingScores(
        supabase,
        period.year.id,
        semesterNo,
        assignment,
        studentIds,
      );

      const students = buildStudentMatrix(
        roster,
        objectives,
        existingScores,
      );

      return json({
        success: true,
        academic_year: period.year.name,
        semester_no: semesterNo,
        assignment,
        can_edit: assignment.can_edit,

        components: {
          tugas: [
            "TUGAS_1",
            "TUGAS_2",
            "TUGAS_3",
            "TUGAS_4",
            "TUGAS_5",
          ],
          tp: objectives,
          other: ["WWP", "ASAS"],
        },

        total_students: students.length,
        total_tp: objectives.length,
        students,
      });
    }

    // ------------------------------------------------------------------------
    // SAVE COMPONENT: Tugas 1-5 / WWP / ASAS
    // ------------------------------------------------------------------------
    if (action === "save_component") {
      if (!assignment.can_edit) {
        return json({ success: false, error: "read_only" }, 403);
      }

      const teacherId = txt(account.teacher_id);
      if (!teacherId) {
        return json({ success: false, error: "teacher_required" }, 403);
      }

      const assessmentType = upper(body.assessment_type);
      if (!NON_TP_COMPONENTS.includes(assessmentType as any)) {
        return json(
          { success: false, error: "assessment_type_invalid" },
          400,
        );
      }

      const scores = Array.isArray(body.scores) ? body.scores : [];
      if (!scores.length) {
        return json({ success: false, error: "scores_empty" }, 400);
      }

      const roster = await loadRoster(
        supabase,
        period.year.id,
        semesterNo,
        assignment.class_id,
      );

      const allowedStudentIds = new Set(
        roster.map((x: any) => x.id),
      );

      const saved = await saveComponentScores(supabase, {
        academicYearId: period.year.id,
        semesterNo,
        assignment,
        teacherId,
        allowedStudentIds,
        assessmentType,
        scores,
        assessmentDate: txt(body.assessment_date) || null,
      });

      return json({
        success: true,
        saved,
        assessment_type: assessmentType,
      });
    }

    // ------------------------------------------------------------------------
    // SAVE TP
    // ------------------------------------------------------------------------
    if (action === "save_tp") {
      if (!assignment.can_edit) {
        return json({ success: false, error: "read_only" }, 403);
      }

      const teacherId = txt(account.teacher_id);
      if (!teacherId) {
        return json({ success: false, error: "teacher_required" }, 403);
      }

      const objectiveId = txt(body.learning_objective_id);
      if (!objectiveId) {
        return json(
          { success: false, error: "learning_objective_required" },
          400,
        );
      }

      const objectives = await loadObjectives(
        supabase,
        period.year.id,
        semesterNo,
        assignment,
      );

      const objective = objectives.find(
        (x: any) => x.id === objectiveId,
      );

      if (!objective) {
        return json(
          { success: false, error: "learning_objective_forbidden" },
          403,
        );
      }

      const scores = Array.isArray(body.scores) ? body.scores : [];
      if (!scores.length) {
        return json({ success: false, error: "scores_empty" }, 400);
      }

      const roster = await loadRoster(
        supabase,
        period.year.id,
        semesterNo,
        assignment.class_id,
      );

      const allowedStudentIds = new Set(
        roster.map((x: any) => x.id),
      );

      const saved = await saveTpScores(supabase, {
        academicYearId: period.year.id,
        semesterNo,
        assignment,
        teacherId,
        allowedStudentIds,
        objectiveId,
        scores,
        assessmentDate: txt(body.assessment_date) || null,
      });

      return json({
        success: true,
        saved,
        assessment_type: "TP",
        learning_objective: objective,
      });
    }

    return json({ success: false, error: "unknown_action" }, 400);
  } catch (error) {
    console.error("academic-scores error:", error);

    return json(
      {
        success: false,
        error: "server_error",
        detail:
          error instanceof Error
            ? error.message
            : String(error),
      },
      500,
    );
  }
});
