# 03 — Hub Finder and Individual Transcript Pages

**Status:** closed

**Blocked by:** 01-domain-queries-and-competency-engine.md (resolved), 02-ui-components-and-print-layout.md (resolved)

## What was built

1. `components/reports/individual/individual-filter-bar.tsx`:
   - Interactive client filter bar supporting schedule filtering and participant search (name, email, NISN, NIS, NIP, nomorPeserta).
   - Dynamic reset action.

2. `app/(dashboard)/dashboard/reports/individual/page.tsx`:
   - Hub finder page for individual reports.
   - Schedule selector and search filter with URL searchParams synchronization.
   - Roster table with link to open individual report (`/dashboard/reports/individual/[attemptId]`).
   - Guarded by `reports:export` and RBAC checks.
   - Server-side pagination.

3. `app/(dashboard)/dashboard/reports/individual/[attemptId]/page.tsx`:
   - Transcript report page composing `IndividualReportHeader`, `CompetencyBreakdownCard`, `ItemizedAnswersTable`, and `PrintReportButton`.
   - Dedicated print styling avoiding sidebar and top navbar clutter, with official signature footer block.
   - Guarded by `reports:export`.

4. Documentation:
   - Updated `docs/DASHBOARD_FEATURES_AND_STATUS.md` reflecting `Laporan Individu` as 🟢 **Implemented** (17 of 23 menu features now implemented).

## Verification

- `pnpm typecheck` (`tsc --noEmit`): 0 errors.
- `pnpm lint` (`eslint`): 0 errors.
- `pnpm test:unit` (`vitest run`): 65 test files, 559 tests passed.
- `pnpm build` (`next build`): 57 static and dynamic/PPR routes generated successfully.
