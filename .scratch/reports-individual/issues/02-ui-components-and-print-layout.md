# 02 — Individual Report UI Components & Print Layout

**Status:** closed

**Blocked by:** 01-domain-queries-and-competency-engine.md (resolved)

## What was built

1. `components/reports/individual/print-report-button.tsx`:
   - Interactive client component with `window.print()` trigger.
   - Styled with `print:hidden`.

2. `components/reports/individual/individual-report-header.tsx`:
   - Student info (name, email, NISN, NIS, NIP, nomorPeserta).
   - Exam & schedule details (package name, kodePaket, duration, formatted timestamps).
   - Score badges (Lulus / Tidak Lulus / Menunggu Penilaian) and passing threshold KKM.
   - Print-ready typography (`print:text-black`, `print:border-none`, `print:p-0`).

3. `components/reports/individual/competency-breakdown-card.tsx`:
   - Category competency mastery cards with proportional horizontal progress bars.
   - Percentage scores, earned vs max points, and question count ratios.

4. `components/reports/individual/itemized-answers-table.tsx`:
   - Numbered itemized questions list.
   - Question prompt snippet, type badges, student answer text, correctness badges, and score points awarded vs max weight.
   - Print media layout optimization (`print:break-inside-avoid`).

## Verification

- `__test__/unit/reports-individual-ui.test.tsx`: 6 unit tests passing.
- `pnpm typecheck` (`tsc --noEmit`): 0 errors.
- `pnpm lint` (`eslint`): 0 errors.
