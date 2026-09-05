# Individual Student Assessment Reports — Slice Spec

**Status:** closed

## Problem Statement

While summary exam results and aggregate schedule exports (`/dashboard/reports/exam-results`) provide cohort-level insights, educators, proctors, and administrators require individual student assessment reports (*Rapor / Transkrip Hasil Ujian*) at `/dashboard/reports/individual`. Users need to:
1. Search and select participants across exam schedules by name, email, or identifiers (NISN, NIS, NIP).
2. Review comprehensive individual transcripts displaying final score, passing status relative to KKM, and time spent.
3. Analyze competency mastery per question category (e.g. 80% Algebra, 60% Geometry).
4. Inspect itemized answers with student responses, correct options, and points awarded.
5. Print official student report cards directly or save to PDF with dedicated print media styles (excluding dashboard navigation and extraneous chrome).

## Solution

Build the individual reporting subsystem:
1. **Competency Breakdown & Data Engine** (`lib/reports/individual-types.ts`, `lib/reports/individual-stats.ts`, `lib/reports/individual-queries.ts`):
   - Computes subject/category mastery rates, earned points vs max points, and status flags.
   - Robust queries joining `attempt`, `user`, `examSchedule`, `examPackage`, `question`, `questionCategory`, and `attemptAnswer`.
2. **Print-Ready UI Components** (`components/reports/individual/`):
   - Header with student profile & exam metadata.
   - Category competency mastery cards with proportional progress indicators.
   - Itemized question review table.
   - Print trigger with `@media print` styling tailored for standard A4 document output.
3. **Hub & Report Pages** (`app/(dashboard)/dashboard/reports/individual/`):
   - `page.tsx`: Participant finder table with schedule selector and search.
   - `[attemptId]/page.tsx`: Full transcript page with print view.
4. **Access Control**: Guarded by `reports:export` (`PERMISSIONS.REPORTS_EXPORT`).

## Non-Goals

- Bulk mass ZIP printing of all students at once (future enhancement).
- Editing grades from this view (handled in `/dashboard/manual-grading`).
