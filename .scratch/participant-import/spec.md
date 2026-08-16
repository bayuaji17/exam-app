# Excel Participant Import — Slice Spec

**Status:** done

## Problem Statement

Participants are created one account at a time through the create-user form. Bulk onboarding — cohorts, classes, exam rosters — has no path, and PROJECT_OVERVIEW lists "Import peserta dari Excel" as a core capability.

## Solution

Admins upload an `.xlsx` file to bulk-create participant accounts (`role=user`) with optional group assignment. The import is **all-or-nothing**: every row is validated first, all errors are listed in a dry-run report, and the Import button stays disabled until the whole file is valid. Applying runs in a single transaction — any failure rolls everything back. Each import is recorded in `participant_import` for audit.

## User Stories

1. As an admin, I want to download a template so that import files follow the expected format.
2. As an admin, I want to upload an `.xlsx` and see every validation error before anything is created, so that mistakes are caught up front.
3. As an admin, I want the import blocked entirely when any row is invalid, so that a batch is never partially applied.
4. As an admin, I want the batch applied atomically, so that a failure cannot leave half-created accounts.
5. As an admin, I want auto-generated passwords for rows without one, shown once in the result, so that credentials can be distributed.
6. As an admin, I want referenced group names to be validated, so that typo'd groups are caught before import.
7. As an auditor, I want each import recorded (admin, file, counts, timestamp), so that bulk account creation is traceable.

## Implementation Decisions

- Template columns: `Nama*` (required), `Email*` (required, lowercased), `Username` (optional, null otherwise), `Kata Sandi` (optional — else auto-generated, shown once in the result), `Grup` (optional, comma-separated group names that must exist).
- All-or-nothing row semantics (approved): any invalid row disables the Import button with all errors listed; nothing is created until the file is entirely valid. Duplicate email in-file or in-DB marks the row invalid — existing accounts are never overwritten.
- Limits: `.xlsx` only, ≤ 2 MB, ≤ 500 rows.
- Account creation mirrors the seed script: `hashPassword` from `better-auth/crypto`, user + account rows; passwords never persisted in plaintext.
- Import is one transaction: accounts, group memberships, and the `participant_import` history row commit together or not at all.
- New dependency: `exceljs` (approved) for reading workbooks and generating the template (auth-gated route handler).

## Out of Scope

`.csv`/`.xls` support, update-on-import (upsert), participant export, self-service credential distribution, import history UI (table only, recorded for future audit views).

## Further Notes

Released as v0.10.0. Ticket files: `.scratch/participant-import/issues/01-*.md` – `04-*.md`.
