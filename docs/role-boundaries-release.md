# Role boundaries cleanup — 26 October 2026

Scope: nine existing Edge Functions plus Admin navigation and explanatory labels. Production role assignments, accounts, teacher jobs, reports, grades and schedules are not migrated or deleted.

- HRD live report / Saturday schedule, student affairs, extracurricular, academic periods, academic scores, timesheet, attendance and PTS Tahfizh no longer grant management privileges by username. Attendance and PTS Tahfizh no longer infer privileges from teacher.position.
- Role aliases in affected normalizers use exact names. Custom names containing administrator/academic/etc. do not become management roles. Failed role lookups stop processing.
- Attendance uses active-year/semester assignments. Partner retains attendance duties for assigned classes without being relabelled Walas. Combined jobs union their current classes.
- PTS Tahfizh unions active Walas and Tahfizh classes for teachers. Only explicit Admin, Pimpinan and Kabid Quran grants have broad scope. Canonical kabid_quran and legacy exact kabid_tahfizh are recognized.
- Admin can open the existing Data Ekskul editor from Penugasan & Jadwal and edit via the same service as Kegiatan. Pimpinan remains read-only in that service.
- The guru_partner catalog label becomes Guru Partner, retaining its code and grants. Tahfizh remains a separate job. Pengabdian is retained as the existing badal role; no managerial permissions are added or removed.

Validation: 14 suites including executable service tests for revoked/disabled sessions, no username/position escalation, exact aliases, failed reads, stale assignments, combined jobs, Guru Tahfizh vs Kabid Quran, Admin/Kegiatan vs Pimpinan/Pengabdian. No school report submissions used for testing. Existing Friday manual/weekly-pattern tests pass.

This is not a replacement of every legacy authorization implementation. Other endpoints outside these nine still require separate review. Account-level role revocation and job-derived access remain distinct: removing a role does not deactivate a current teacher job; Admin must deactivate that job in Penugasan Guru when duties end.

Rollback: redeploy the preceding commit's sources for these nine functions, retaining verify_jwt=false (custom sessions), and restore frontend cache versions. Restore only the guru_partner display_name/description if reverting the label. No school-data rollback required.
