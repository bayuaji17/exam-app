# 03 — Backend: identifier validation, checks, and nomor peserta

**What to build:** the server side. `identifierTaken` (per-field unique check, excluding
self on edit) plus a server action for debounced form checks. User create/edit actions
enforce role-conditional requirements (NISN for participants, NIP for admins) and
uniqueness. Package create/edit actions enforce kodePaket. The Excel import validates NISN
(required, 10 digits, unique in-file and in DB) and NIS (optional, unique) with row-level
errors and writes both fields. `startAttemptAction` generates the nomor peserta from the
schedule's package code. All covered by unit tests.

**Blocked by:** 02 — Schema & migration: identifier columns

**Status:** ready-for-agent

- [ ] `identifierTaken(field, value, excludeId?)` queries the right table/column per field.
- [ ] User create: participant requires NISN (10-digit, unique), NIS optional (unique);
      admin requires NIP (unique). Edit re-validates excluding self.
- [ ] Package create/edit require kodePaket (3–20, unique, excluding self).
- [ ] Import: `NISN` + `NIS` columns; row-level errors for missing/duplicate NISN and
      duplicate NIS; inserts write both fields.
- [ ] `startAttemptAction` sets `nomorPeserta = {kodePaket}-{random4-8}` with collision
      retry; stable across resumes.
- [ ] Unit tests for the pure rules and identifier checks.
