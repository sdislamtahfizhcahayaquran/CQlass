# Penilaian Market Day

Walas → Kesiswaan → Penilaian Market Day, after Masalah Siswa.
One report per class/year/semester, draft and submitted updates use optimistic version checks.
Server validates current session, active walas role, homeroom assignment, active period and roster. Other roles have no menu or API access. Documentation accepts http/https photo or folder links. Scoring uses seven indicators with 1–4 values; no category boundaries are assumed.

The project reached its Edge Function quota. Market Day therefore uses the isolated `/admin-academic-period/market-day` suffix and a separate module; the existing root handler stays intact.

Schema source: supabase/schema/market-day.sql (applied migration walas_market_day_reports).
Checks: node --test tests/market-day.test.cjs tests/academic-period-edge.test.cjs tests/role-boundaries.test.cjs; node --check market-day-walas.js. Browser smoke test could not run because Chromium was unavailable.
Removed only an unused `seenStudent` variable in the touched sidebar owner. No broad cleanup.
