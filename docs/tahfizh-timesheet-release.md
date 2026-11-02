# Tahfizh timesheet repair — 25 October 2026

The active year has no start/end dates. The work-schedule query previously compared these null fields against the requested month and returned no schedule. It now selects the configured active year and applies date bounds only when supplied. Missing active periods fail explicitly.

Core timesheet and Tahfizh substitution reads use the configured active semester, including semester 2. The core response supplies semester_no to its wrapper. This removes fixed 2026/2027 and semester-1 defaults; it does not add an archive-period selector.

Teachers with Tahfizh assignments retain their direct Mapel schedule too. Tahfizh KBM comes only from explicit Tahfizh/halaqah assignments, not unrelated Partner classes. KBM appears in the full recap and blocks overlapping manual activities on the server. Assignment/schedule read errors cannot silently permit overlapping input. Existing UKS and Friday policies are preserved.

Timesheet menu registration retains Tahfizh/Partner access even when the menu item already exists. Frontend cache versions are advanced.

Eleven regression suites pass, including a dedicated behavioral test for null period dates, semester 2, mixed jobs, Partner-only separation, visible KBM, overlap rejection, and query-error handling. Tests use mocked Edge dependencies; no real teacher reports are created or modified. The live HRD reader uses teacher_timesheet_activities, the same table written by manual timesheet saves. Preflight contains 1,330 records, including six records for currently assigned Tahfizh teachers.

No schema migration or report-data rewrite. Actual authenticated walkthrough and submission with a school account has not been performed. Restore the preceding baseline function sources and frontend together if rollback is required.

## Friday correction

User-confirmed rule: Guru Tahfizh fills Friday manually and may create a weekly pattern. Friday 07:00–16:00 therefore has no generated routine/KBM/Eduhub/class-work blocks for teachers with explicit Tahfizh/halaqah assignments. Existing recorded activities, recurring patterns and dated badal/special events remain separate recorded commitments. Other teachers retain their prior Friday rules. The work schedule, manual validation, bootstrap teaching rows, gap UI and recurring projection are aligned. Twelve regression suites now include Friday manual slots, weekly pattern projection and existing-record subtraction. No report or pattern data is rewritten.

## Friday and Saturday typed entry — 2 November 2026

The active Add Activity form uses a text field for teachers with explicit Tahfizh/halaqah assignments on Friday and Saturday. Save records a manual activity; Repeat Weekly uses the typed name. Other weekdays and teachers retain the activity-master selector. Friday is 07:00–16:00 and Saturday is 07:30–12:00. Server validation rejects overlapping saved activities/patterns, unauthorized teacher targets, and input outside working hours. Recorded badal stays reserved.

Saturday, like Friday, has no generated routine/KBM blocks for this profile. The HRD projection includes explicit Tahfizh/halaqah teachers, preserves manual records and weekly patterns, and omits Friday/Saturday automatic routines. Fallback HRD reports also receive these projections. Removed unreachable split-activity/fixed-slot form handlers and the corresponding unused autosave binder. No existing reports, patterns, assignments, or roles are rewritten or deleted.

Validation: mocked backend save/deny scenarios, Friday/Saturday pattern projection, typed form and weekly payloads, HRD manual/pattern projection, existing Friday UI, HRD fetch routes, repository dependency/syntax and role-loader regression suites. No real teacher input is submitted by these tests.

### Future-date validation correction

Reproduced the reported 6 November 2026 07:30–08:00 rejection with the client date fixed to 2 November. The gap calculator omitted future dates in the current month, so the form incorrectly reported an overlap before calling the server. Explicit Tahfizh profiles now calculate future slots too, retaining saved activity/pattern blockers and work-hour boundaries. Non-Tahfizh future-date policy is unchanged. Regression covers future Friday and Saturday plus pattern overlap and non-Tahfizh blockers.
