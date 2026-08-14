# Three fixed scoring models

The platform supports exactly three question types — Single-Choice (one correct option, auto-scored), Score-Based (each option carries a score, no correct answer), and Manual-Graded (no options, graded by hand) — and each question's type is fixed at creation.

We rejected a fully configurable scoring engine (arbitrary per-question scoring rules) because the three models cover the stated product need — exams, assessments, psychometrics, surveys — while keeping scoring deterministic, auditable, and simple to implement. A future package-level scoring configuration must build on these three models, not replace them.
