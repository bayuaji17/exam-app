# 01 — Schema and pure import core

**Status:** done

**Blocked by:** None — can start immediately.

## What to build

- Schema 0011: `participant_import` (id, adminId FK user, fileName, total, created, createdAt); migration.
- `lib/participants/import.ts` (pure): row schema (name/email rules reused from `createUserSchema`, username pattern 3–30 `[a-zA-Z0-9_.]`, password ≥8, group names comma-split + trimmed), `generatePassword()`, `validateImportRows(rows, existingEmails, groupNames)` → per-row errors + valid plan.
- Unit tests: validation matrix, password generation, all-or-nothing aggregation, dedupe.

## Definition of done

- Migration applied; pure core fully unit-tested.
