# 03 — Session Hub & Detailed Session Report Pages

**Status:** todo

**Blocked by:** 01-session-stats-and-queries.md, 02-session-ui-components.md

## What to build

1. `app/(dashboard)/dashboard/reports/sessions/page.tsx`:
   - Hub list page for all exam sessions with search filter.
   - Schedule cards or table with presence KPIs and direct link to session report.
   - Guarded by `reports:export`.

2. `app/(dashboard)/dashboard/reports/sessions/[slug]/page.tsx`:
   - Detailed session report page assembling KPI cards, group comparisons, attendance table, and print button.
   - Printable official Examination Record (Berita Acara) layout with proctor signature block.
   - Guarded by `reports:export`.

3. Documentation:
   - Update `docs/DASHBOARD_FEATURES_AND_STATUS.md` reflecting `Laporan Per Sesi` as 🟢 **Implemented**.

## Verification

- Fast Gate: `pnpm typecheck`, `pnpm lint`, `pnpm test:unit`, `pnpm build`.
