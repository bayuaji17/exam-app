# 05 — Integration & E2E

**What to build:** the fan-in gate. Merge backend + frontend, flip mock → real, and prove
the feature end-to-end on a production build: role-conditional required identifiers,
uniqueness errors (form + import), kodePaket on packages, and distinct stable nomor peserta
per attempt. Fast gate + release-gate E2E green.

**Blocked by:** 03 — Backend, 04 — Frontend

**Status:** closed

- [x] E2E: creating a participant without NISN fails; with a duplicate NISN fails; admin
      creation requires NIP.
- [x] E2E: editing a user to an existing NISN/NIS/NIP (another user) is rejected;
      keeping one's own value is allowed.
- [x] E2E: import rows with missing/duplicate NISN produce row-level errors and the import
      is rejected all-or-nothing.
- [x] E2E: package create requires a unique kodePaket; two attempts on the same schedule
      get distinct `{kodePaket}-{rand}` nomor peserta; resuming keeps the same number.
- [x] Fast gate and release gate (production build + E2E) pass.
