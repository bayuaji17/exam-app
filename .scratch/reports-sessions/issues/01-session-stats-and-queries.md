# 01 — Session Report Types, Attendance Engine & Database Queries

**Status:** closed

**Blocked by:** none

## What was built

1. `lib/reports/session-types.ts`:
   - `SessionAttendanceStatus`: 'completed' | 'in_progress' | 'absent'.
   - `SessionSubmissionType`: 'participant' | 'system' | null.
   - `SessionAttendanceRow`: userId, name, email, nisn, nis, nip, groupName, status, startedAt, submittedAt, durationMinutes, submissionType, score, passing.
   - `SessionKPIStats`: eligibleCount, presentCount, completedCount, inProgressCount, absentCount, attendanceRate, completionRate, manualSubmitCount, autoSubmitCount.
   - `SessionGroupBreakdown`: groupName, eligibleCount, presentCount, completedCount, attendanceRate, averageScore, passRate.
   - `SessionReportDetail`: full detailed session structure.
   - `SessionReportSummaryItem`: summary item for hub list.

2. `lib/reports/session-stats.ts`:
   - Pure function `calculateSessionKPIs`: computes counts and rounded percentage rates safely (no division by zero or NaN).
   - Pure function `calculateGroupBreakdowns`: groups roster by class/group, computes attendance rate, mean score, and pass rate.

3. `lib/reports/session-queries.ts`:
   - `listSessionReportSummaries(search)`: aggregates total eligible, present, completed, and attendance rate per exam schedule.
   - `getSessionReportDetail(slugOrId)`: retrieves all enrolled participants via `eligibleParticipantConditions`, maps attempt timestamps, submission types, scores, and presence statuses.

## Verification

- `__test__/unit/reports-session-stats.test.ts`: 4 unit tests passing.
- `pnpm typecheck` (`tsc --noEmit`): 0 errors.
- `pnpm lint` (`eslint`): 0 errors.
