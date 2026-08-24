# User Identifiers — Slice Spec

**Status:** ready-for-agent

## Problem Statement

Participants and admins carry no institutional identifiers in the system. A participant's
official numbers (NISN, NIS) and an admin's staff number (NIP) cannot be recorded, so
identification and verification during exams relies on names alone. Exam attempts also have
no participant number (nomor peserta) to write on an answer sheet — the missing link between
a physical answer sheet and its digital attempt.

## Solution

Three identifier fields live on the account: **NISN** (national student number, required for
participants), **NIS** (school number, optional), and **NIP** (staff number, required for
admins). Exam packages gain a **kode paket ujian** (kodePaket), and each attempt
auto-generates a **nomor peserta** in the form `{kodePaket}-{random 4–8}` so an answer sheet
maps unambiguously to one attempt. All identifier fields are unique; conflicts surface
before saving through a shared uniqueness check.

## User Stories

1. As an admin, I want to enter a participant's NISN when creating their account, so that
   every participant is identified by their national student number.
2. As an admin, I want NISN to be required when creating a participant, so no participant
   account exists without it.
3. As an admin, I want NISN to be unique, so two participants can never share a national
   student number.
4. As an admin, I want to record an optional NIS for a participant, so school-level numbers
   are kept alongside the national one.
5. As an admin, I want to edit a participant's NISN and NIS later, so corrections are
   possible without recreating the account.
6. As an admin, I want to enter NIP when creating another admin, so staff accounts are
   identified by their official number.
7. As an admin, I want NIP to be unique, so two staff accounts never share a number.
8. As an admin, I want live "already in use" feedback on NISN/NIS/NIP in the create and
   edit forms, so conflicts are caught before saving.
9. As an admin, I want the participant Excel import to accept NISN (required) and NIS
   (optional) columns, so bulk onboarding records the identifiers.
10. As an admin, I want import rows with a duplicate NISN (repeated in the file or already
    in the database) rejected with row-level errors, so the all-or-nothing import never
    commits bad identifiers.
11. As an admin, I want every exam package to carry a unique kode paket ujian, so exam
    materials and numbering refer to a package unambiguously.
12. As a participant, I want my attempt to show a nomor peserta, so I can write it on my
    answer sheet.
13. As a participant, I want the nomor peserta to stay the same when I resume my attempt,
    so the number on my sheet never changes mid-exam.
14. As a proctor or admin, I want each attempt to carry a distinct nomor peserta derived
    from the package code, so answer sheets map to attempts without ambiguity.
15. As an admin, I want the user list to display NISN/NIS/NIP so accounts can be verified
    at a glance.

## Implementation Decisions

- **Schema (hand-applied to the existing schema file — never `auth:generate`, which rewrites
  the file destructively; migration generated with `drizzle-kit generate` and edited for
  backfill safety, per the `account.issuer` upgrade pattern):**
  - `user.nisn` — `integer`, unique, DB-nullable; **app-required for role `user`**
    (participants). Validation: integer, exactly 10 digits (1,000,000,000–9,999,999,999).
  - `user.nis` — `text`, unique, nullable. Validation: trimmed string, 3–20 chars.
  - `user.nip` — `text`, unique, DB-nullable; **app-required for role `admin` /
    `super-admin`**. Validation: trimmed string, 3–20 chars.
  - `exam_package.kodePaket` — `text`, unique, **NOT NULL**; migration backfills existing
    packages (e.g., `PKG-001`, `PKG-002`, …) before the constraint lands. Validation:
    trimmed string, 3–20 chars.
  - `attempt.nomorPeserta` — `text`, unique per schedule:
    `UNIQUE(scheduleId, nomorPeserta)`. Generated once at attempt start and stable across
    resumes (ADR-0010). Existing open attempts have it NULL; regeneration on resume is out
    of scope (they keep NULL until a schema-level backfill is decided).
- **nomorPeserta format:** `{kodePaket}-{random}` where random is 4–8 crypto-random
  uppercase alphanumeric characters, excluding ambiguous `0/O/1/I`; a collision with an
  existing number for the same schedule retries with a fresh random suffix.
- **Uniqueness check:** one reusable module exposing
  `identifierTaken(field: "nisn" | "nis" | "nip" | "kodePaket", value, excludeId?)`, backed
  by a server action for debounced client-side checks in the create/edit forms (pattern:
  `questionBankSlugTaken`). Messages: `"NISN sudah digunakan."` / `"NIS sudah digunakan."` /
  `"NIP sudah digunakan."` / `"Kode paket sudah digunakan."`.
- **Create/edit forms:** the user form is role-conditional — participant type renders NISN
  (required) + NIS (optional); admin type renders NIP (required). The edit page renders all
  applicable fields with unique-check-excluding-self. The package form gains kodePaket
  (required).
- **Excel import (ADR-0012 all-or-nothing):** template gains `NISN` (required, 10-digit,
  unique in-file and against the DB) and `NIS` (optional, unique); validation errors are
  row-level like today's email/username rules; the insert writes both fields.
- **Server actions:** create/edit user, import, and package create/edit actions validate the
  identifiers and reject with friendly messages; `startAttemptAction` generates
  `nomorPeserta` from the schedule's package code.
- **Layer split:** contract first, then backend and frontend branches in parallel against the
  contract + mock (`NEXT_PUBLIC_USE_MOCK`), then integration + E2E.

## Testing Decisions

- **Seam (primary):** the server actions plus E2E flows through the UI — create/edit user
  with identifiers, import with NISN errors, package create with kodePaket, and the attempt
  number on the attempt/result pages. This is the highest seam that exercises the whole
  path; prior art: `user-list`, `participant-import`, `exam-packages`, `attempts` specs.
- **Seam (unit):** the validation schemas and the `identifierTaken` helper as pure functions
  (vitest; prior art: `participants-validation.test.ts`, `slugs.test.ts`). No DB mocking —
  unit tests cover rules, E2E covers the DB.
- **E2E specifics:** a second participant cannot be created with an existing NISN (create
  form error); import rows with duplicate NISN rejected per-row; two attempts on the same
  schedule produce distinct nomor peserta with the `{kodePaket}-` prefix; resuming an
  attempt keeps the same nomor peserta.

## Out of Scope

- Admin-controlled per-exam participant numbers (chosen: auto-generated).
- Identifier backfill for existing accounts (fields apply to accounts created after this
  slice; existing rows stay NULL).
- Backfilling nomor peserta for attempts opened before this slice.
- Displaying identifiers in reports.
- Per-exam numbering on eligibility/pre-assignment (future work if admins want control).
- The separate future-improvement item: session-pinned attempts.

## Further Notes

- All schema edits are hand-applied to the existing schema file; the better-auth CLI
  regeneration is destructive and must not be used.
- NISN is an integer because national student numbers are numeric; leading-zero forms do
  not exist for the 10-digit standard.
- The kodePaket prefix makes nomor peserta human-readable and ties it to the package even
  when schedules are renamed.
