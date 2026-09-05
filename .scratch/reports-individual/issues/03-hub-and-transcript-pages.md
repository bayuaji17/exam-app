# 03 — Hub Finder and Individual Transcript Pages

**Status:** todo

**Blocked by:** 01-domain-queries-and-competency-engine.md, 02-ui-components-and-print-layout.md

## What to build

1. `app/(dashboard)/dashboard/reports/individual/page.tsx`:
   - Hub finder page for individual reports.
   - Schedule selector filter and search box (by student name / NISN / NIS / email).
   - Roster table with link to open individual report (`/dashboard/reports/individual/[attemptId]`).
   - Guarded by `reports:export`.

2. `app/(dashboard)/dashboard/reports/individual/[attemptId]/page.tsx`:
   - Transcript report page composing `IndividualReportHeader`, `CompetencyBreakdownCard`, `ItemizedAnswersTable`, and `PrintReportButton`.
   - Dedicated print styling avoiding sidebar and top navbar clutter.
   - Guarded by `reports:export`.

3. Documentation update:
   - Update `docs/DASHBOARD_FEATURES_AND_STATUS.md` reflecting `Laporan Individu` as 🟢 **Implemented**.

## Verification

- Fast Gate: `pnpm typecheck`, `pnpm lint`, `pnpm test:unit`, `pnpm build`.
