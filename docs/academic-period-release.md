# Academic period release — 25 October 2026

This release changes period selection and period boundaries, not account roles or score formulas. No production year/semester activation, score migration, roster copy, or database schema change is part of this release.

## Scope

- The authenticated `current_period` API supplies the active year and semester to academic monitoring, teacher reports, RPP/LP, exam schedules, and partner point entry.
- Nilai and Rapor support explicit year selection; opening them defaults to the active period. Nilai archives are read-only in both normal and batch-save endpoints. Existing teacher ownership checks remain required.
- Rapor class assignments and signature selection use the requested year and semester. Historical report rosters can include inactive students/classes without changing their stored status.
- Partner and Tahfizh forms carry their loaded period. Stale period saves are rejected. Pending responses cannot replace the selected report/PTS period.
- Dashboard enrollment, assignments, objectives, academic scores, and Tahfizh/extracurricular scores are scoped to the active year/semester. Seven role routes are covered by mocked route tests.
- Report settings cannot save dates while a newly selected period is loading.
- Removed unreachable legacy loaders and the unreferenced `mt-report-source-v10.js`. Current attendance loading remains owned by `attendance-recap-mode.js`.

## Verification

Run with Node 22+ and jsdom 26.1.0 available through `NODE_PATH`:

```sh
for test in tests/*.test.cjs; do node "$test" || exit 1; done
```

Tests cover active defaults, explicit archive requests, missing configuration, wrong-period writes, out-of-order responses, report settings races, seven dashboard roles, and remaining loader callbacks. TypeScript was syntax-checked after stripping types. Report score calculations, Partner normalization/percentage formulas, and academic summary calculations were compared against deployed source.

Production read-only preflight: 272 mapel assignments, 22 report-class assignments, and 555 student enrollments all belong to the existing active period. No test account, student, score, or future period was inserted by this release. Authenticated browser walkthroughs were not performed; route/form tests use isolated mock data.

## Deployment and recovery

Deploy the nine changed Edge Functions with their existing `verify_jwt` setting; their existing CQlass session authentication remains in place. Publish the frontend with updated cache versions. Existing open tabs should be reloaded before entering data.

The preceding baseline commit records the live source of all nine affected functions. To recover, restore the frontend from before this release and redeploy the corresponding baseline function sources. There are no release-specific data changes to reverse.

This does not promote students, create next-year class rosters, copy teaching assignments, configure school calendar dates, or introduce a new Admin permission to edit archived scores. Those remain separate administrative operations. Legacy integrations outside the period-aware modules listed above are not represented as fully migrated by these checks.
