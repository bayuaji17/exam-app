# 02 — Excel and CSV Export Generator

**Status:** closed

**Blocked by:** 01-aggregation-queries-and-stats.md (resolved)

## What was built

- [lib/reports/export.ts](file:///home/bayuajin28/exam-app/lib/reports/export.ts):
  - `generateExamResultsWorkbook(report: ScheduleReportSummary): Promise<ExcelJS.Workbook>`:
    - Sheet 1: "Ringkasan" (Header banner, exam metadata, aggregate statistical metrics table, and score distribution breakdown).
    - Sheet 2: "Daftar Nilai Peserta" (Complete participant roster with NISN, NIS, NIP, submittedAt, scores, manual grading statuses, and pass/fail indicators).
  - `generateExamResultsCsv(report: ScheduleReportSummary): string`:
    - Generates RFC 4180 compliant CSV text with escaping for commas, newlines, and double quotes.
  - `exportReportBuffer(report: ScheduleReportSummary, format: "xlsx" | "csv")`:
    - Returns standardized buffer, MIME content type, and formatted filename (`laporan-hasil-<slug>-<timestamp>.<ext>`).
- [app/api/reports/exam-results/[scheduleId]/route.ts](file:///home/bayuajin28/exam-app/app/api/reports/exam-results/[scheduleId]/route.ts):
  - Next.js App Router GET Route Handler.
  - Authentication check via `auth.api.getSession({ headers: request.headers })`.
  - RBAC permission check via `userHasPermission(..., "/dashboard/reports/exam-results")` supporting both system roles and dynamic user permissions.
  - Generates and streams attachment download (`?format=xlsx` or `?format=csv`).
- Unit tests:
  - [__test__/unit/reports-export.test.ts](file:///home/bayuajin28/exam-app/__test__/unit/reports-export.test.ts): 6 tests covering multi-sheet workbook generation, metadata/metrics assertions, roster rendering, and RFC 4180 CSV escaping.
  - [__test__/unit/reports-export-route.test.ts](file:///home/bayuajin28/exam-app/__test__/unit/reports-export-route.test.ts): 4 tests verifying 401 unauthenticated, 403 unauthorized, 404 schedule not found, and 200 attachment download stream.

## Verification

- `pnpm test:unit __test__/unit/reports-*.test.ts`: 28 tests passing across 3 test files.
- Full unit test suite: 62 test files, 542 tests passing.
- `pnpm typecheck` (`tsc --noEmit`): 0 errors.
- `pnpm lint` (`eslint`): 0 errors.
