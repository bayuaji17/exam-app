# 02 — Individual Report UI Components & Print Layout

**Status:** todo

**Blocked by:** 01-domain-queries-and-competency-engine.md

## What to build

1. `components/reports/individual/individual-report-header.tsx`:
   - Student info (name, NISN, NIS, NIP, email, attempt number).
   - Exam & schedule details (exam package, passing score KKM, submission date, duration).
   - Prominent badge for status (Lulus / Tidak Lulus / Menunggu Penilaian Manual).

2. `components/reports/individual/competency-breakdown-card.tsx`:
   - Visual progress bars showing percentage of mastery per category/subject.
   - Earned points vs max points.

3. `components/reports/individual/itemized-answers-table.tsx`:
   - Numbered itemized questions.
   - Question prompt snippet and question type.
   - Student answer vs correctness indicator.
   - Points earned vs max weight.

4. `components/reports/individual/print-report-button.tsx`:
   - Print button with browser `window.print()` trigger.
   - Print media CSS optimization (`print:hidden`, proper margins, clean page breaks).

## Verification

- Component unit tests in `__test__/unit/reports-individual-ui.test.tsx`.
- Fast Gate: `pnpm typecheck` & `pnpm lint`.
