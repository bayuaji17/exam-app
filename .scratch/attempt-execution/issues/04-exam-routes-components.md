# 04 — (exam) routes and components

**Status:** done

**Blocked by:** 03 — Attempt queries and actions.

## What to build

- `app/(exam)/layout.tsx` — participant shell (minimal header); guard: session → `/login`, non-`user` role → `/dashboard`.
- `app/(exam)/exam/page.tsx` — attemptable schedules with state (Akan Datang/Berlangsung/Selesai), attempt state (Mulai / Lanjutkan / Nilai), attempts used vs limit.
- `app/(exam)/exam/[examId]/intro/page.tsx` — duration, question count, pass score, limit used; Mulai Ujian (or Lanjutkan) → `startAttemptAction` → redirect to attempt.
- `app/(exam)/exam/[examId]/attempt/[attemptId]/page.tsx` — client-heavy: countdown (`attempt-timer`), question navigator grid, one question at a time, `answer-controls` per type, save indicator, submit confirm, auto-submit at zero, resume with saved answers.
- `app/(exam)/exam/[examId]/attempt/[attemptId]/result/page.tsx` — score, pass/fail (hidden while manual questions are pending), full per-question review.
- `components/exam-components/`: `question-renderer.tsx` (server HTML via `renderContentHtml` + sanitizer + media URL resolution, client KaTeX typesetting), `attempt-timer.tsx`, `question-navigator.tsx`, `answer-controls.tsx`, `math-renderer.tsx` (KaTeX).

## Definition of done

- Full participant flow works against a production build; admin-side schedule limit field visible.
