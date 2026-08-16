# 03 — Admin UI and participant result

**Status:** done

**Blocked by:** 02 — Grading and results queries.

## What to build

- `/dashboard/manual-grading` — work list (schedule, participant, submitted, pending count) + pagination/search.
- `/dashboard/manual-grading/[attemptId]` — workbench: manual questions with plain-text answers and "Nilai 0–N" inputs (save + clear), auto-scored review alongside; per-grade save via `saveManualScoreAction` + refresh.
- `/dashboard/exam-results` — hub: schedules with submitted, average, pass rate, pending.
- `/dashboard/exam-results/[scheduleId]` — participant table → drill into the attempt workbench.
- Participant `(exam)` result page: manual questions show "Nilai: X dari Y" when graded; total + LULUS/TIDAK LULUS once fully graded.

## Definition of done

- Full grade → participant sees final score + pass/fail; partial keeps "Menunggu penilaian manual".
