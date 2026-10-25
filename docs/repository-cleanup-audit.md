# Repository audit — 26 October 2026

Baseline: `b5b0d11885e6eec5b5f601677791c7696e522a56`. All 223 tracked files inventoried. Reference analysis treats every HTML page as a supported direct entry point. No exact duplicate files found. This is a repository/dependency/syntax audit, not proof that every business action has only one implementation.

## Changes

- Remove `tahfizh-kabid-shell-fix.js`: the old shell has a parse error and overlaps the native `quran-role-final-ui.js`. Login reveal and role entry now call the native owner. Seven Quran routes are preserved.
- Stop requesting `academic-pts-attendance-fix.js`: retired no-op exists only in the local checkout, not the tracked baseline. No server feature is removed.
- Eager scripts are owned by index.html: academic sidebar organizer, Quran dashboard/input, admin class partners, icons, UI refinement and PjBL. Remove their redundant secondary load calls.
- Partner/Tahfizh menu loading stays in final-integration; Badal Mapel loads on demand through academic-badal-sidebar-restore.
- Delete duplicate legacy score export calculations and fixed 2026/2027 semester-1 requests from academic-download-data. Its Nilai button opens existing Monitoring Nilai with its current-period export. RPP/LP and Bilingual exports remain.
- Repair two repository-only TypeScript syntax typos in academic readiness sources. Live sources already use the corrected syntax. No Edge Function deployment or database migration is performed in this cleanup.

## Retention decisions

Keep direct HTML tools, historical migrations, rollback scripts, tests, documentation, and live service sources. A file being absent from frontend references does not mean it is unused. Keep gedung.png: it has no tracked inbound references but is an institutional asset that may be used via a direct/external URL. No authenticated browser submissions or production school-data changes are performed. Remaining role-wrapper chains require separate behavioral review before consolidation.

## Single owners after cleanup

| Concern | Owner |
|---|---|
| Eager modules | index.html |
| Partner/Tahfizh menu load | final-integration.js |
| Badal Mapel lazy load | academic-badal-sidebar-restore.js |
| Quran navigation | quran-role-final-ui.js |
| Score workbook export from Download Data | Monitoring Nilai / academic-legger-live.js |

## Validation

15 regression suites, all tracked JavaScript/CommonJS/TypeScript syntax, inline HTML scripts, tracked local dependency references, 15-role loader simulation, native Quran navigation and reveal, score download route. Production sources are compared after publication. No guarantee of zero regressions; no logged-in end-to-end school workflow was run.

## File inventory

References below include comments and documentation and are a conservative signal, not proof of runtime use.

| File | Decision | Inbound reference count |
|---|---|---:|
| `.github/workflows/optimize-login-assets.yml` | Retain: deployment workflow | 0 |
| `.github/workflows/pages.yml` | Retain: deployment workflow | 0 |
| `academic-badal-recap.html` | Retain: direct entry page | 1 |
| `academic-badal-sidebar-restore.js` | Retain: referenced asset / runtime dependency | 1 |
| `academic-badal-v2.js` | Retain: referenced asset / runtime dependency | 2 |
| `academic-dashboard-standalone-v7.js` | Retain: referenced asset / runtime dependency | 1 |
| `academic-download-data.js` | Retain; targeted cleanup / syntax correction | 1 |
| `academic-exam-reminder.js` | Retain: referenced asset / runtime dependency | 1 |
| `academic-fast-save.js` | Retain: referenced asset / runtime dependency | 1 |
| `academic-header-shell-v8.js` | Retain: referenced asset / runtime dependency | 1 |
| `academic-header-shell-v9.js` | Retain: referenced asset / runtime dependency | 1 |
| `academic-legger-live.js` | Retain: referenced asset / runtime dependency | 1 |
| `academic-master-tp.js` | Retain: referenced asset / runtime dependency | 1 |
| `academic-pjbl-report.js` | Retain: referenced asset / runtime dependency | 1 |
| `academic-pts-attendance-fix.js` | Retain: referenced asset / runtime dependency | 1 |
| `academic-ranking-report.js` | Retain: referenced asset / runtime dependency | 1 |
| `academic-sidebar-clean-v1.js` | Retain: referenced asset / runtime dependency | 3 |
| `academic-sidebar-order.js` | Retain; targeted cleanup / syntax correction | 1 |
| `academic-teacher-report-v3.js` | Retain: referenced asset / runtime dependency | 1 |
| `academic-teacher-report.js` | Retain: referenced asset / runtime dependency | 1 |
| `account-settings-fix.js` | Retain: referenced asset / runtime dependency | 1 |
| `admin-academic-period.js` | Retain: referenced asset / runtime dependency | 2 |
| `admin-assignments.js` | Retain: referenced asset / runtime dependency | 2 |
| `admin-class-partners.js` | Retain: referenced asset / runtime dependency | 2 |
| `admin-dashboard-v2.js` | Retain: referenced asset / runtime dependency | 2 |
| `admin-halaqah.js` | Retain: referenced asset / runtime dependency | 1 |
| `admin-master-data.js` | Retain: referenced asset / runtime dependency | 1 |
| `admin-rapor-readiness.js` | Retain: referenced asset / runtime dependency | 1 |
| `admin-role-options-fix.js` | Retain: referenced asset / runtime dependency | 1 |
| `admin-schedule-editor.js` | Retain: referenced asset / runtime dependency | 2 |
| `admin-sidebar-clean.js` | Retain; targeted cleanup / syntax correction | 3 |
| `admin-special-activity.js` | Retain: referenced asset / runtime dependency | 1 |
| `admin-table-sticky-actions.js` | Retain: referenced asset / runtime dependency | 1 |
| `admin-timesheet-master.js` | Retain: referenced asset / runtime dependency | 1 |
| `admin-uks-schedule.js` | Retain: referenced asset / runtime dependency | 1 |
| `app-core.js` | Retain: referenced asset / runtime dependency | 5 |
| `app.js` | Retain: referenced asset / runtime dependency | 1 |
| `attendance-recap-mode.js` | Retain; targeted cleanup / syntax correction | 3 |
| `background-api-fix.js` | Retain; targeted cleanup / syntax correction | 1 |
| `bilingual-supabase.js` | Retain: referenced asset / runtime dependency | 1 |
| `cq-global-role-theme.css` | Retain: referenced asset / runtime dependency | 2 |
| `cq-global-role-theme.js` | Retain: referenced asset / runtime dependency | 2 |
| `cq-icons.js` | Retain: referenced asset / runtime dependency | 2 |
| `cqlass-sw.js` | Retain: referenced asset / runtime dependency | 1 |
| `cqlass-wordmark.webp` | Retain: referenced asset / runtime dependency | 1 |
| `discipline-tabs.js` | Retain: referenced asset / runtime dependency | 1 |
| `docs/PROJECT_KESISWAAN_MASTER.md` | Retain: release documentation | 0 |
| `docs/academic-period-release.md` | Retain: release documentation | 0 |
| `docs/admin-managed-roles-release.md` | Retain: release documentation | 0 |
| `docs/admin-planning-release.md` | Retain: release documentation | 0 |
| `docs/role-boundaries-release.md` | Retain: release documentation | 0 |
| `docs/tahfizh-timesheet-release.md` | Retain: release documentation | 0 |
| `ekskul-eksternal-pts.html` | Retain: direct entry page | 1 |
| `excel-like-score-grid.js` | Retain: referenced asset / runtime dependency | 1 |
| `extracurricular-raw-ui.js` | Retain: referenced asset / runtime dependency | 1 |
| `final-integration.js` | Retain; targeted cleanup / syntax correction | 2 |
| `gedung.png` | Retain: external use unproven | 0 |
| `guru-partner-class-picker.js` | Retain: referenced asset / runtime dependency | 2 |
| `guru-partner-fix.css` | Retain: referenced asset / runtime dependency | 1 |
| `guru-partner-points.js` | Retain: referenced asset / runtime dependency | 2 |
| `guru-partner-pts-hardlock.js` | Retain: referenced asset / runtime dependency | 1 |
| `guru-partner-pts-kuadran.js` | Retain: referenced asset / runtime dependency | 1 |
| `guru-partner-sticky.css` | Retain: referenced asset / runtime dependency | 1 |
| `guru-partner-tahfizh-menu.js` | Retain: referenced asset / runtime dependency | 2 |
| `guru-partner.js` | Retain: referenced asset / runtime dependency | 1 |
| `hrd-role-cleanup.js` | Retain: referenced asset / runtime dependency | 1 |
| `index.html` | Retain; targeted cleanup / syntax correction | 4 |
| `input-access-control.js` | Retain: referenced asset / runtime dependency | 1 |
| `input-access-layout-fix.js` | Retain: referenced asset / runtime dependency | 1 |
| `internal-report-center.js` | Retain: referenced asset / runtime dependency | 1 |
| `kabid-role-scope-fix.js` | Retain: referenced asset / runtime dependency | 1 |
| `kegiatan-dashboard-live.js` | Retain: referenced asset / runtime dependency | 1 |
| `kegiatan-exkul-attendance-live.js` | Retain: referenced asset / runtime dependency | 1 |
| `kegiatan-exkul-capacity.js` | Retain: referenced asset / runtime dependency | 1 |
| `kegiatan-exkul-report-grades-fallback.js` | Retain: referenced asset / runtime dependency | 1 |
| `kegiatan-exkul-settings.js` | Retain: referenced asset / runtime dependency | 1 |
| `kegiatan-live-report-coaches-only.js` | Retain: referenced asset / runtime dependency | 1 |
| `kegiatan-live-report.js` | Retain: referenced asset / runtime dependency | 1 |
| `kegiatan-rapor-route.js` | Retain: referenced asset / runtime dependency | 1 |
| `kegiatan-report.js` | Retain: referenced asset / runtime dependency | 1 |
| `kegiatan-role-polish.js` | Retain: referenced asset / runtime dependency | 1 |
| `kegiatan-sidebar-clean.js` | Retain: referenced asset / runtime dependency | 1 |
| `kepsek-work-v2.js` | Retain: referenced asset / runtime dependency | 1 |
| `kesiswaan-class-issues.js` | Retain: referenced asset / runtime dependency | 1 |
| `kesiswaan-dashboard.js` | Retain: referenced asset / runtime dependency | 1 |
| `kesiswaan-navigation.js` | Retain: referenced asset / runtime dependency | 3 |
| `kesiswaan-point-input-audit.js` | Retain: referenced asset / runtime dependency | 2 |
| `kesiswaan-problem-recap.js` | Retain: referenced asset / runtime dependency | 1 |
| `kesiswaan-rekapan.js` | Retain: referenced asset / runtime dependency | 1 |
| `kesiswaan-super-report.js` | Retain: referenced asset / runtime dependency | 2 |
| `legger-google-sync.js` | Retain: referenced asset / runtime dependency | 2 |
| `login-bg.webp` | Retain: referenced asset / runtime dependency | 7 |
| `login-brand-fix.css` | Retain: referenced asset / runtime dependency | 1 |
| `login-brand-fix.js` | Retain: referenced asset / runtime dependency | 1 |
| `login-preview.html` | Retain: direct entry page | 0 |
| `login-redesign-assets.js` | Retain: referenced asset / runtime dependency | 1 |
| `login-redesign.css` | Retain: referenced asset / runtime dependency | 2 |
| `logo_sd.png` | Retain: referenced asset / runtime dependency | 12 |
| `manifest.webmanifest` | Retain: referenced asset / runtime dependency | 1 |
| `master-data.html` | Retain: direct entry page | 2 |
| `master-tp.html` | Retain: direct entry page | 1 |
| `mt-pjbl-image-compression.js` | Retain: referenced asset / runtime dependency | 1 |
| `mt-report.html` | Retain: direct entry page | 1 |
| `mt-v7.js` | Retain: referenced asset / runtime dependency | 1 |
| `neutral-ui.js` | Retain: referenced asset / runtime dependency | 1 |
| `pjbl-supabase.js` | Retain: referenced asset / runtime dependency | 2 |
| `profile-dropdown.js` | Retain: referenced asset / runtime dependency | 1 |
| `profile-photo.js` | Retain: referenced asset / runtime dependency | 1 |
| `promotion-report.js` | Retain: referenced asset / runtime dependency | 1 |
| `push-notifications.js` | Retain: referenced asset / runtime dependency | 1 |
| `quran-role-final-ui.js` | Retain: referenced asset / runtime dependency | 1 |
| `rapor-attendance-effective-guard.js` | Retain: referenced asset / runtime dependency | 1 |
| `rapor-pdf-preview-sync.js` | Retain: referenced asset / runtime dependency | 1 |
| `rapor-style-isolation.css` | Retain: referenced asset / runtime dependency | 2 |
| `reminder-center.js` | Retain: referenced asset / runtime dependency | 1 |
| `report-period-control.js` | Retain: referenced asset / runtime dependency | 2 |
| `reward-tabs.js` | Retain: referenced asset / runtime dependency | 1 |
| `role-transition-guard.js` | Retain; targeted cleanup / syntax correction | 1 |
| `rpp-lp-monitoring.js` | Retain: referenced asset / runtime dependency | 1 |
| `sapras-dashboard-hard-guard.css` | Retain: referenced asset / runtime dependency | 1 |
| `sapras-dashboard-hard-guard.js` | Retain: referenced asset / runtime dependency | 2 |
| `school-activity-report.js` | Retain: referenced asset / runtime dependency | 1 |
| `signature-preview-controls.js` | Retain: referenced asset / runtime dependency | 1 |
| `student-affairs-center.js` | Retain: referenced asset / runtime dependency | 2 |
| `style.css` | Retain: referenced asset / runtime dependency | 6 |
| `supabase/functions/academic-attendance-readiness/index.ts` | Retain; targeted cleanup / syntax correction | 9 |
| `supabase/functions/academic-badal-v2/index.ts` | Retain: service source | 9 |
| `supabase/functions/academic-fast-save/index.ts` | Retain: service source | 9 |
| `supabase/functions/academic-kabid-ops/index.ts` | Retain: service source | 9 |
| `supabase/functions/academic-pts-readiness/index.ts` | Retain; targeted cleanup / syntax correction | 9 |
| `supabase/functions/academic-scores/index.ts` | Retain: service source | 9 |
| `supabase/functions/activity-external-assessment-admin/index.ts` | Retain: service source | 9 |
| `supabase/functions/activity-extracurricular-report-grades/index.ts` | Retain: service source | 9 |
| `supabase/functions/activity-extracurricular/index.ts` | Retain: service source | 9 |
| `supabase/functions/admin-academic-period/index.ts` | Retain: service source | 9 |
| `supabase/functions/admin-schedule-editor/index.ts` | Retain: service source | 9 |
| `supabase/functions/admin-users/index.ts` | Retain: service source | 9 |
| `supabase/functions/attendance-final/index.ts` | Retain: service source | 9 |
| `supabase/functions/attendance/index.ts` | Retain: service source | 9 |
| `supabase/functions/auth-user/index.ts` | Retain: service source | 9 |
| `supabase/functions/extracurricular-external-pts/index.ts` | Retain: service source | 9 |
| `supabase/functions/hrd-category-detail/index.ts` | Retain: service source | 9 |
| `supabase/functions/hrd-live-report/index.ts` | Retain: service source | 9 |
| `supabase/functions/hrd-saturday-schedule/index.ts` | Retain: service source | 9 |
| `supabase/functions/master-data-admin/index.ts` | Retain: service source | 9 |
| `supabase/functions/partner-tasks/index.ts` | Retain: service source | 9 |
| `supabase/functions/report-preview-v2/index.ts` | Retain: service source | 9 |
| `supabase/functions/report-preview/index.ts` | Retain: service source | 9 |
| `supabase/functions/role-dashboard/index.ts` | Retain: service source | 9 |
| `supabase/functions/student-affairs-center/index.ts` | Retain: service source | 9 |
| `supabase/functions/student-point-input-audit/index.ts` | Retain: service source | 9 |
| `supabase/functions/tahfizh-badal/index.ts` | Retain: service source | 9 |
| `supabase/functions/tahfizh-monthly-report/index.ts` | Retain: service source | 9 |
| `supabase/functions/tahfizh-monthly-status/index.ts` | Retain: service source | 9 |
| `supabase/functions/tahfizh-pts-public/index.ts` | Retain: service source | 9 |
| `supabase/functions/tahfizh-ukj-score/index.ts` | Retain: service source | 9 |
| `supabase/functions/teacher-recurring-schedule/index.ts` | Retain: service source | 9 |
| `supabase/functions/teacher-timesheet-v2/index.ts` | Retain: service source | 9 |
| `supabase/functions/teacher-timesheet/index.ts` | Retain: service source | 9 |
| `supabase/functions/teacher-work-schedule/index.ts` | Retain: service source | 9 |
| `supabase/migrations/20260921103000_teacher_work_schedule_templates.sql` | Retain: schema history / rollback | 0 |
| `supabase/migrations/20260921110000_add_uks_timesheet_activity.sql` | Retain: schema history / rollback | 0 |
| `supabase/migrations/20260921113000_link_bu_anis_khoerunnisa.sql` | Retain: schema history / rollback | 0 |
| `supabase/migrations/20260922001000_saturday_workday_hrd.sql` | Retain: schema history / rollback | 0 |
| `supabase/migrations/20260922044659_add_promotion_report_metadata_edit_rpc.sql` | Retain: schema history / rollback | 0 |
| `supabase/migrations/20260922114500_teacher_recurring_timesheet.sql` | Retain: schema history / rollback | 0 |
| `supabase/migrations/20260922115000_teacher_recurring_timesheet_fk_indexes.sql` | Retain: schema history / rollback | 0 |
| `supabase/migrations/20260923153000_add_lp_to_tahfizh_monthly_reports.sql` | Retain: schema history / rollback | 0 |
| `supabase/migrations/20260923163000_add_report_period_range_to_report_config.sql` | Retain: schema history / rollback | 0 |
| `supabase/migrations/20260924000000_tahfizh_monthly_report_and_ukj_scores.sql` | Retain: schema history / rollback | 0 |
| `supabase/migrations/20261005124500_class_multi_partner_assignments.sql` | Retain: schema history / rollback | 0 |
| `supabase/migrations/20261006044500_admin_teacher_assignments_isolated.sql` | Retain: schema history / rollback | 0 |
| `supabase/migrations/20261006050000_admin_assignments_multi_operational.sql` | Retain: schema history / rollback | 0 |
| `supabase/migrations/20261013090000_teacher_recurring_saturday.sql` | Retain: schema history / rollback | 0 |
| `supabase/migrations/20261024213534_academic_period_atomic_management.sql` | Retain: schema history / rollback | 0 |
| `supabase/migrations/20261024231914_admin_managed_roles.sql` | Retain: schema history / rollback | 0 |
| `supabase/migrations/20261024232627_role_catalog_session_feedback.sql` | Retain: schema history / rollback | 0 |
| `supabase/migrations/20261025201055_role_catalog_partner_label.sql` | Retain: schema history / rollback | 0 |
| `supabase/rollback/admin-managed-roles.sql` | Retain: schema history / rollback | 1 |
| `system-health.html` | Retain: direct entry page | 0 |
| `tahfizh-badal-recap.html` | Retain: direct entry page | 1 |
| `tahfizh-badal.html` | Retain: direct entry page | 2 |
| `tahfizh-daily-report.html` | Retain: direct entry page | 2 |
| `tahfizh-kabid-dashboard-layout.js` | Retain: referenced asset / runtime dependency | 2 |
| `tahfizh-kabid-input-live.js` | Retain: referenced asset / runtime dependency | 2 |
| `tahfizh-kabid-shell-fix.js` | Remove obsolete shell | 2 |
| `tahfizh-kesiswaan-sidebar-clean.js` | Retain: referenced asset / runtime dependency | 1 |
| `tahfizh-monthly.html` | Retain: direct entry page | 4 |
| `tahfizh-pts.html` | Retain: direct entry page | 4 |
| `tahfizh-report-preview-polish.js` | Retain: referenced asset / runtime dependency | 1 |
| `tahfizh-ukj-score.html` | Retain: direct entry page | 2 |
| `teacher-autosave-safe.js` | Retain: referenced asset / runtime dependency | 1 |
| `teacher-timesheet-v2.js` | Retain: referenced asset / runtime dependency | 2 |
| `teacher-timesheet.js` | Retain: referenced asset / runtime dependency | 1 |
| `teacher-walas-sidebar-clean.js` | Retain; targeted cleanup / syntax correction | 2 |
| `tests/academic-active-period.test.cjs` | Retain: regression coverage | 0 |
| `tests/academic-period-edge.test.cjs` | Retain: regression coverage | 0 |
| `tests/academic-period-transaction.sql` | Retain: regression coverage | 0 |
| `tests/academic-period-ui.test.cjs` | Retain: regression coverage | 0 |
| `tests/admin-planning.test.cjs` | Retain: regression coverage | 0 |
| `tests/admin-roles-db.sql` | Retain: regression coverage | 1 |
| `tests/admin-roles.test.cjs` | Retain: regression coverage | 0 |
| `tests/legacy-loader-cleanup.test.cjs` | Retain: regression coverage | 0 |
| `tests/period-access-regression.test.cjs` | Retain: regression coverage | 0 |
| `tests/period-report-partner.test.cjs` | Retain: regression coverage | 0 |
| `tests/report-period-navigation.test.cjs` | Retain: regression coverage | 0 |
| `tests/report-settings-race.test.cjs` | Retain: regression coverage | 0 |
| `tests/role-boundaries.test.cjs` | Retain: regression coverage | 0 |
| `tests/tahfizh-friday-ui.test.cjs` | Retain: regression coverage | 0 |
| `tests/tahfizh-period-form.test.cjs` | Retain: regression coverage | 0 |
| `tests/tahfizh-timesheet.test.cjs` | Retain: regression coverage | 0 |
| `timesheet-access-fix.js` | Retain: referenced asset / runtime dependency | 1 |
| `timesheet-gap-assistant.js` | Retain: referenced asset / runtime dependency | 2 |
| `timesheet-recurring.js` | Retain: referenced asset / runtime dependency | 1 |
| `timesheet-ui-order-fix.js` | Retain: referenced asset / runtime dependency | 1 |
| `timesheet-ui-polish.js` | Retain: referenced asset / runtime dependency | 1 |
| `ui-refinement.js` | Retain: referenced asset / runtime dependency | 2 |
| `uks-camera-compat.js` | Retain: referenced asset / runtime dependency | 1 |
| `uks-duty-kesiswaan.js` | Retain: referenced asset / runtime dependency | 2 |
| `uks-duty-role-loader.js` | Retain: referenced asset / runtime dependency | 1 |
| `uks-duty.js` | Retain: referenced asset / runtime dependency | 3 |
| `walas-daily-monitoring.js` | Retain: referenced asset / runtime dependency | 1 |
| `walas-guru-role-restore.js` | Retain; targeted cleanup / syntax correction | 1 |
