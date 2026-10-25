# Admin planning and shared teaching schedule — 25 October 2026

Admin has one Penugasan & Jadwal entry linking existing period, teacher assignment, teaching schedule, halaqah student grouping and class partner editors. Old route functions remain for existing shortcuts. No duplicate assignment or schedule tables.

Academic has Jadwal Mengajar using the same editor and endpoint as Admin. This release retains the existing edit-slot workflow; it does not introduce schedule creation/import or change Tahfizh/HRD editors. Roles and master data remain Admin-managed.

The schedule endpoint checks active explicit account roles (admin, akademik, kabid_akademik); usernames do not grant access. The active semester is scoped to the active academic year. Saves must carry the displayed year and semester and are rejected when those differ from the active context. Existing teacher/class collision checks remain. No schema migration or production data mutation.

Validation: all 13 regression suites pass, including the shared editor/hub route test, exact role allowlist, role-query failure denial, scoped semester and stale-period rejection. No real-account school schedule was edited during validation. Existing schedule audit logging remains best-effort, as before; this change does not claim transactionality across the schedule update and audit insert.

Rollback: restore the preceding frontend versions and deploy the saved pre-release admin-schedule-editor source (version 2); no data rollback is needed.
