// Called only after CQlass session validation in student-affairs-center.
const T = (value: unknown) => String(value ?? "").trim();

export async function lateLetters(sb: any, J: (body: unknown, status?: number) => Response, account: any, body: any) {
  if (!account.roles.includes("kesiswaan") || !["aktif", "active"].includes(T(account.status).toLowerCase())) {
    return J({ error: "Khusus Kabid Kesiswaan." }, 403);
  }
  try {
    if (body.operation === "print") {
      if (!Number.isSafeInteger(body.number) || body.number < 206) return J({ error: "Nomor surat tidak valid." }, 400);
      const { data: letter, error } = await sb.from("kesiswaan_late_letters")
        .select("number,kind,issued_on,payload").eq("number", body.number).maybeSingle();
      if (error) throw error;
      if (!letter) return J({ error: "Surat tidak ditemukan." }, 404);
      const { data: asset, error: assetError } = await sb.from("kesiswaan_letter_assets")
        .select("png_base64").eq("name", "signature").maybeSingle();
      if (assetError) throw assetError;
      return J({ letter, signature: asset?.png_base64 || null });
    }

    if (body.operation === "history") {
      const offset = body.offset ?? 0;
      if (!Number.isSafeInteger(offset) || offset < 0) return J({ error: "Halaman tidak valid." }, 400);
      const { data, error } = await sb.from("kesiswaan_late_letters")
        .select("number,kind,issued_on,student_id,semester_id,student_name:payload->>student_name,class_name:payload->>class_name")
        .order("number", { ascending: false }).range(offset, offset + 49);
      if (error) throw error;
      return J({ letters: data });
    }

    const { data: period, error: periodError } = await sb.rpc("kesiswaan_late_period").maybeSingle();
    if (periodError) throw periodError;
    if (!period) return J({ error: "Semester aktif dengan tanggal yang berlaku belum tersedia." }, 409);

    if (body.operation === "recap") {
      const { data: rows, error } = await sb.rpc("kesiswaan_late_recap", { p_semester: period.id });
      if (error) throw error;
      return J({ rows, period });
    }

    if (body.operation === "issue") {
      if (body.semester_id !== period.id) return J({ error: "Periode telah berubah. Muat ulang rekap." }, 409);
      if (!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(T(body.student_id)) ||
          !["sp1", "sp2", "sp3", "spo"].includes(body.kind)) {
        return J({ error: "Siswa atau jenis surat tidak valid." }, 400);
      }
      const { data, error } = await sb.rpc("kesiswaan_issue_late_letter", {
        p_semester: period.id, p_student: body.student_id, p_kind: body.kind, p_actor: account.id,
        p_meeting_date: body.kind === "spo" ? T(body.meeting_date) || null : null,
        p_meeting_time: body.kind === "spo" ? T(body.meeting_time) || null : null,
        p_meeting_place: body.kind === "spo" ? T(body.meeting_place) : null
      });
      if (error?.code === "P0001") return J({ error: error.message }, 409);
      if (error) throw error;
      const letter = Array.isArray(data) ? data[0] : data;
      if (!Number.isSafeInteger(letter?.number)) throw Error("missing_letter_number");
      return J({ number: letter.number });
    }

    return J({ error: "Permintaan tidak dikenal." }, 400);
  } catch (error) {
    console.error("kesiswaan-late-letters", error instanceof Error ? error.name : "database_error");
    return J({ error: "Surat keterlambatan belum dapat diproses." }, 500);
  }
}
