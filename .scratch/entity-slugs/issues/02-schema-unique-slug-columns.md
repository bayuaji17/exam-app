# 02 — Schema & migration: unique slug columns

**What to build:** a required, **unique** `slug` column on the four entity tables
(`question_bank`, `participant_group`, `exam_schedule`, `exam_package`). The migration
backfills every existing row with a name-derived slug so the unique constraint holds with
zero manual fixes, adds a unique index per table, and is safe to run against the dev
database. Renames update the slug transactionally alongside the name (regeneration + dedup).

**Blocked by:** 01 — Slug contract

**Status:** done

- [x] Four tables gain `slug text not null` with a unique index (and a foreign-key-free,
      deterministic constraint name).
- [x] Backfill assigns a unique slug to every pre-existing row (collisions get `-2`, `-3`, …)
      — migration never violates its own unique constraint.
- [x] Migration generated via `drizzle-kit generate` and reviewed; backfill SQL idempotent.
- [x] Dev database migrated (`pnpm run db:migrate`) without error.
