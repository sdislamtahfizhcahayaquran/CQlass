# Tahfizh timesheet repair — 25 October 2026

The active year has no start/end dates. The work-schedule query previously compared these null fields against the requested month and returned no schedule. It now selects the configured active year and applies date bounds only when supplied. Missing active periods fail explicitly.

Core timesheet and Tahfizh substitution reads use the configured active semester, including semester 2. The core response supplies semester_no to its wrapper. This removes fixed 2026/2027 and semester-1 defaults; it does not add an archive-period selector.

Teachers with Tahfizh assignments retain their direct Mapel schedule too. Tahfizh KBM comes only from explicit Tahfizh/halaqah assignments, not unrelated Partner classes. KBM appears in the full recap and blocks overlapping manual activities on the server. Assignment/schedule read errors cannot silently permit overlapping input. Existing UKS and Friday policies are preserved.

Timesheet menu registration retains Tahfizh/Partner access even when the menu item already exists. Frontend cache versions are advanced.

Eleven regression suites pass, including a dedicated behavioral test for null period dates, semester 2, mixed jobs, Partner-only separation, visible KBM, overlap rejection, and query-error handling. Tests use mocked Edge dependencies; no real teacher reports are created or modified. The live HRD reader uses teacher_timesheet_activities, the same table written by manual timesheet saves. Preflight contains 1,330 records, including six records for currently assigned Tahfizh teachers.

No schema migration or report-data rewrite. Actual authenticated walkthrough and submission with a school account has not been performed. Restore the preceding baseline function sources and frontend together if rollback is required.
