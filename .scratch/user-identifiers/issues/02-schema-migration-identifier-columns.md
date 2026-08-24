# 02 — Schema & migration: identifier columns

**What to build:** the database layer. `user` gains `nisn` (int, unique), `nis` (text,
unique), `nip` (text, unique); `exam_package` gains `kodePaket` (text, unique, NOT NULL)
with a backfill for existing packages; `attempt` gains `nomorPeserta` (text) with
`UNIQUE(scheduleId, nomorPeserta)`. The schema is hand-applied to the existing file (never
`auth:generate`), and the migration is edited for backfill safety before constraints land.

**Blocked by:** 01 — Identifier contract

**Status:** done

- [ ] `user.nisn` int unique, `user.nis` text unique, `user.nip` text unique — nullable in DB.
- [ ] `exam_package.kodePaket` text unique NOT NULL; existing rows backfilled
      (`PKG-001`, `PKG-002`, …) before NOT NULL + unique index (slug-migration pattern).
- [ ] `attempt.nomorPeserta` text + `UNIQUE(scheduleId, nomorPeserta)`.
- [ ] Migration generated and edited; applied to the dev DB without error.
