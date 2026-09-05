# 01 — Core Aggregation Queries & Statistical Metrics

**Status:** closed

**Blocked by:** None.

## What was built

- [lib/reports/types.ts](file:///home/bayuajin28/exam-app/lib/reports/types.ts): Domain models for statistical metrics (`ScheduleStatistics`, `ScoreDistributionBucket`, `ScheduleReportSummary`, `ScheduleReportParticipantItem`, `ReportScheduleHubItem`).
- [lib/reports/stats.ts](file:///home/bayuajin28/exam-app/lib/reports/stats.ts): Pure statistical calculation engine:
  - `calculateMean(scores: number[]): number`
  - `calculateMedian(scores: number[]): number`
  - `calculateStandardDeviation(scores: number[]): number`
  - `calculatePassFail(scores: number[], passScore: number | null): { pass: number; fail: number; rate: number }`
  - `calculateDistributionBuckets(scores: number[]): ScoreDistributionBucket[]`
  - `computeScheduleStatistics(input: RawStatsInput): ScheduleStatistics`
- [lib/reports/queries.ts](file:///home/bayuajin28/exam-app/lib/reports/queries.ts):
  - `getScheduleReportData(scheduleSlugOrId: string)`: Aggregates schedule info, package details, eligible participants count, submitted attempts, manual grading status, and computes statistics.
  - `listReportSchedules(params?: { search?: string })`: Fetches schedules with completed attempt counts for the reports overview hub.
- Unit tests in [__test__/unit/reports-stats.test.ts](file:///home/bayuajin28/exam-app/__test__/unit/reports-stats.test.ts):
  - Tested empty datasets, single items, uniform scores, odd/even median, population standard deviation, score distribution bucketing, and pass/fail rate calculations.

## Verification

- Unit tests pass with 100% test suite green via `pnpm test:unit __test__/unit/reports-stats.test.ts` (18 tests passed).
- Entire project test suite green: 60 test files, 532 tests passing.
- `pnpm typecheck` (`tsc --noEmit`) passes with 0 errors.
