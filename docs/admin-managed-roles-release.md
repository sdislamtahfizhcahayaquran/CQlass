# Admin-managed roles and independent teacher assignments

Release: 25 October 2026 (Asia/Jakarta).

## Behavior

- Guru & Pengguna preserves multiple access roles. Guru and Walas selections are persisted rather than silently discarded.
- Account/profile/role changes are one database transaction. Invalid input cannot leave a partly changed profile. Role changes revoke associated sessions; unchanged grants do not.
- Disabling a catalog role deactivates explicit grants and revokes associated sessions. Re-enabling does not restore previous grants. Operational assignments are managed separately. Guru remains the existing baseline profile capability.
- Admin cannot remove its own Admin role. The Admin catalog entry stays active. The reserved admin username cannot be transferred while legacy endpoints still recognize it.
- Auth profiles derive Walas/Partner/Tahfizh jobs from the active period. Profile and dashboard permissions no longer come from display names or teacher positions. Dashboard role normalization uses exact codes.
- Penugasan Guru displays existing operational assignments, supports independent jobs, and chooses classes separately for each subject, including one subject across many classes.
- Assignment save/deactivation is transactional and rejects inactive periods. Repeated saves do not duplicate active administrative records. Inactive Partner rows can be reactivated.
- Walas replacement requires confirmation and retains history. An old legacy Walas row cannot deactivate its replacement. Signature fields are cleared when their teacher changes or is removed.
- Unchecking a job does not delete it; use Nonaktifkan. History is available through Tampilkan riwayat nonaktif.

## Validation

Ten JavaScript regression suites cover the new role behavior and the existing period workflows. The new suite covers multi-role edits, no name/position escalation, active-period job inference, two independent subject/class pairs, and one subject in eight classes. Modified script syntax is checked.

The actual database regression in tests/admin-roles-db.sql runs inside a rolled-back transaction: role/profile atomicity, catalog revocation, unchanged-session retention, self protection, service-only grants, four job types, repeated saves, eight classes, invalid-batch rollback, stale semester rejection, replacement history, stale Walas protection, legacy deactivation, and self-revocation feedback. No fixtures are committed.

Preflight: 272 subject assignments, 22 report-class rows, 22 Partner rows, 118 Tahfizh rows, zero administrative history rows. Migrations do not rewrite these rows or existing grants. Active period: 2026/2027 semester 1.

## Scope and recovery

Changes cover role management, assignments, auth profile, and role dashboard. This is not a claim that every legacy endpoint uses a central permission engine. Custom catalog entries do not create new feature permissions. Existing PIC-specific rules are outside this change. No authenticated browser walkthrough with real school accounts was performed; validation uses automated UI and actual database transaction tests.

The previous deployed admin-users source is preserved in a separate baseline commit. Restore baseline frontend/functions together if necessary, then apply supabase/rollback/admin-managed-roles.sql through the migration workflow. Rollback does not recreate grants intentionally revoked by an Admin after release.
