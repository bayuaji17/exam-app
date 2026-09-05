# 01 — Domain Types, Competency Engine & Transcript Queries

**Status:** closed

**Blocked by:** none

## What was built

1. `lib/reports/individual-types.ts`:
   - `StudentProfile`: id, name, email, nisn, nis, nip.
   - `CategoryCompetency`: categoryId, categoryName, earnedPoints, maxPoints, percentage, totalQuestions, correctQuestions.
   - `ItemizedQuestionResult`: position, questionId, categoryId, categoryName, type, promptText, studentAnswerText, isCorrect, pointsAwarded, maxPoints.
   - `StudentTranscriptReport`: complete student transcript model.
   - `IndividualReportParticipantRow`: roster row for the selection hub.

2. `lib/reports/individual-stats.ts`:
   - Pure function `calculateCompetencyBreakdown`: groups questions and earned scores by category, computes mastery percentages safely (avoiding NaN on 0 max points, sorting alphabetically).
   - Pure function `calculateAttemptDurationMinutes`: computes elapsed duration between start and submission in minutes.

3. `lib/reports/individual-queries.ts`:
   - `listReportSchedulesFilter()`: retrieves list of schedules for the filter dropdown.
   - `listIndividualReportParticipants(params)`: lists submitted attempts with participant identity (NISN, NIS, NIP), search by participant name/email/identifiers, pagination, and calculation of fullyGraded and pass/fail.
   - `getStudentIndividualReport(attemptId)`: fetches complete individual transcript report joining attempt, user, examSchedule, examPackage, question, questionCategory, and attemptAnswer with plain-text question prompts and option answers.

## Verification

- `__test__/unit/reports-individual-stats.test.ts`: 7 unit tests passed.
- `pnpm typecheck` (`tsc --noEmit`): 0 errors.
- `pnpm lint` (`eslint`): 0 errors.
