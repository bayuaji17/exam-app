# Manual grading is per-answer scores on the attempt, weight-bounded and editable

A manual grade is a score stored on the answer row (`attempt_answer.manualScore`, with `gradedBy` and `gradedAt`), bounded by the question's points weight — `exam_question.score` for the schedule's package, defaulting to 1 (the weight ADR-0001/0008 and `lib/scoring/scoring.ts` reserved for this slice). The attempt total is recomputed transactionally on every grade as the sum of all auto scores and all manual scores, so results are always current and a cleared grade restores the auto-only total.

Grading is editable — an admin may change or clear a grade at any time; there is no finalization lock. Pass/fail is derived from the recomputed total against the package `passScore`, and is only shown once every manual question of the attempt is graded; until then the participant result shows the partial total with "Menunggu penilaian manual".

We rejected a separate grading table (the answer row already carries the state, and per-answer grading keeps the review and the score in one place), unbounded grades (the weight gives graders a deterministic maximum and makes totals comparable), and a grading lock (nothing in the current product requires a frozen grade, and regrading is a simple correction path).
