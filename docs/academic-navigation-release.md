# Academic navigation cleanup — 26 October 2026

Baseline: `1e0eef82f7a57853cbde32b7a253c6a30c37d869`.

## Problem and resulting behavior

The Academic organizer previously moved shared module objects, overwrote their role lists, globally deduplicated IDs, and repaired the model after every document click plus startup timers. This could change the model used by other roles. Academic navigation now uses an ordered, non-mutating projection. `app-core.js` uses that projection for sidebar rendering, module lookup and parent-group selection only while the active role is exactly `akademik`, `kabid_akademik`, or `academic`. Other roles use the original registry. Secondary role entries alone do not select the Academic shell.

The existing core router remains the owner of navigation. Dashboard and Master TP no longer wrap `setActiveModule`. Dashboard no longer wraps `enterApp` or infers navigation from sidebar label clicks; its existing dashboard-module renderer follows `activeModule`. Header repair does not invoke the dashboard. A late dashboard response is painted only while the Academic dashboard is still active and visible.

## Retained menu destinations

- Akademik: Nilai, Master TP, RPP & LP, Bilingual, PjBL, Badal Guru Mapel, Jadwal Mengajar.
- Monitoring: Monitoring Nilai, Ranking, Progres Guru.
- Laporan: Rekapan Badal, Laporan PjBL, Cetak Rapor, Promo Socmed, Download Data.

Renderer availability is checked when the view is read. Late-registered modules appear on the next sidebar render without cloning the registry permanently. Ranking uses its existing exported renderer. Progres Guru and dashboard links use the existing `laporan-akademik-guru` route.

## Removed or disconnected code

- Delete `academic-teacher-report-v3.js`: it only attempted to patch `akd-laporan-guru`; no tracked runtime module registers that ID. Its alternate links also targeted retired IDs. Keep the active `academic-teacher-report.js`, including its existing Admin/Pimpinan consumers.
- Do not load `academic-sidebar-order.js` for Academic. It still serves Guru, Walas, Partner, Pengabdian and Pimpinan.
- Remove the Academic organizer's global registry mutation, repeated startup normalization and document-wide click listener.
- Remove the redundant Dashboard navigation/entry wrappers and Master TP navigation/sidebar wrappers. Master TP still registers its actual renderer.
- Keep header V8: despite its old name it still loads theme, report styling and header dependencies. Keep header V9 as a header-only component. Keep data renderers, API calls, role authorization, period checks, forms, and database sources.

No database changes, Edge Function deployments, school records or authorization grants are changed. Updated query versions cover edited runtime files and their loaders.

## Validation and limits

Run `NODE_PATH=<jsdom dependency directory> node --test tests/*.test.cjs` with Node 24 and jsdom 26.1.0. The new navigation suite has 24 cases: three Academic aliases; 15 non-Academic role cases (including an active Admin with Academic in secondary roles and a non-exact custom role); header isolation; core dashboard navigation; loader ownership; real module registration in both orders; late dashboard response; and Master TP registration without router wrapping. Core-navigation tests assert one renderer call per selected destination, active sidebar indication, registry immutability and preserved unsaved input in a simulated form.

The complete suite reports 44 passing tests across 17 test files, including existing role-boundary, active-period, Timesheet, HRD, source-syntax and local-dependency checks. These tests use DOM simulation and mocked services. Chromium could not be installed because its downloaded archive was invalid, so no Chromium or authenticated production end-to-end result is claimed. Actual school data entry and database SQL tests were not run.

Rollback: revert this commit as a unit; the loader query versions and removal belong with the routing changes. No school-data rollback is needed.
