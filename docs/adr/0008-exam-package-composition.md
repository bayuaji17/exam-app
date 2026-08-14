# Exam packages compose an explicit ordered question list

An exam package is a named configuration (duration, shuffling, pass score) holding an explicit, ordered list of questions. Questions are chosen at authoring time from the eligible set — active questions in active banks, enforced by the eligibility invariant at the query level — and may belong to many packages. Duplicates within one package are rejected by a database unique constraint in addition to UI validation.

We rejected dynamic composition (packages defined by bank/category filters resolved at exam time): it makes the actual exam content hard to audit, complicates versioning, and couples scheduling to filter semantics. Per-question score overrides are deferred to the future scoring-rules domain (ADR-0001), so `exam_question` carries only ordering.
