# Exam Results Reports & Data Export — Slice Spec

**Status:** ready-for-agent

## Problem Statement

Currently, exam results in the dashboard (`/dashboard/exam-results`) only provide a paginated list of individual participant attempts and basic schedule averages. Educational institutions and administrators require aggregate analytical reports (mean, median, standard deviation, score distribution curves, pass/fail rates) and the ability to export complete exam recapitulations to Excel (.xlsx) and CSV formats.

## Solution

Build a dedicated reporting subsystem at `/dashboard/reports/exam-results`:
1. **Core Statistical & Aggregation Engine** (`lib/reports/stats.ts` & `lib/reports/queries.ts`): Computes mean, median, min/max, standard deviation, pass/fail rates, and score distribution buckets. Bounded and resilient to partially graded attempts (ungraded manual questions).
2. **Export Engine** (`lib/reports/export.ts`): Generates formatted Excel spreadsheets with multi-sheet breakdowns (Summary + Detailed Participant Roster) using `exceljs` and raw CSV exports.
3. **Reports UI** (`app/(dashboard)/dashboard/reports/exam-results/`): Overview schedule hub with metric cards, distribution chart visualizations, and one-click export actions.
4. **Access Control**: Protected under dynamic RBAC permission `reports:export` (`REPORTS_EXPORT`).

## User Stories

1. As an administrator, I want to see summary statistics (mean, median, pass rate, highest/lowest score) for any scheduled exam, so that I can evaluate cohort performance.
2. As an administrator, I want to see a distribution graph of scores grouped into standard grade bands, so that I understand score variance.
3. As an administrator, I want to export full exam result recapitulations to Excel (`.xlsx`) with participant identifiers (NISN, NIS, NIP) and individual question scores, so that I can process grades offline.
4. As an administrator, I want attempts with pending manual grading to be clearly differentiated from fully graded attempts so that statistical metrics remain valid.

## Implementation Decisions

- **Pure Functional Math**: Statistical logic (`mean`, `median`, `stdDev`, `buckets`) is isolated from database operations in `lib/reports/stats.ts` for 100% test coverage.
- **Partially Graded Attempts**: Attempts with ungraded manual questions are counted in participation figures (`totalAttemptsSubmitted`) but excluded from final score calculations until fully graded.
- **Excel Generation**: Leverages existing `exceljs` library already installed in `package.json`. Formats headers, applies column widths, and formats numbers cleanly.
- **Permission Guard**: Guarded by `reports:export` (already registered in `lib/auth/permissions-catalog.ts` and sidebar navigation).

## Out of Scope

- Real-time active attempt proctoring (part of `activity-tracking` / `anti-cheat`).
- Automated scheduled emailing of reports.
- PDF generation (reserved for separate ticket or individual report card printing).
