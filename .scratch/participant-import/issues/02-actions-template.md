# 02 — Import actions and template

**Status:** done

**Blocked by:** 01 — Schema and pure import core.

## What to build

- `lib/participants/import-actions.ts` (`"use server"`, MANAGEMENT guard, `.xlsx`/2 MB/500-row caps):
  - `parseParticipantImportAction(file)` — exceljs read → pure validation → dry-run result (valid rows + all errors).
  - `applyParticipantImportAction(payload)` — single transaction: accounts (`hashPassword` + user/account rows), group memberships, `participant_import` history row; any failure rolls back.
- `app/api/participants/template/route.ts` — auth-gated exceljs template download (headers + example row).

## Definition of done

- Template downloads; parse returns full error list; apply is atomic and recorded.
