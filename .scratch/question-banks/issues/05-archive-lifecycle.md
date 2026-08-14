# 05 — Archive-then-delete lifecycle

**What to build:** An admin archives a bank: the bank and all its currently active questions become archived, frozen (read-only — edit rejected) and hidden from the active views. They can restore the bank: questions that were archived as a consequence of the bank archive (tracked via `archived_with_bank_at`) come back active, while questions archived independently stay archived. Questions can be archived and restored independently of their bank. Delete is terminal and available only from the archived state — no delete affordance on active banks or questions, and the action is rejected for active entities regardless. The list views offer archive-state filters/tabs. The question-selection query enforces the domain invariant — a question is selectable only when both the question and its bank are non-archived — at the query level, without introducing any future exam-package abstraction.

**Blocked by:** 03 — Question authoring with TipTap.

**Status:** done

- [ ] Archiving a bank archives it and all its currently active questions, in one transaction
- [ ] Restoring a bank restores consequence-archived questions (`archived_with_bank_at` matching) and leaves independently archived questions archived
- [ ] Independent question archive/restore works and never touches `archived_with_bank_at`
- [ ] Archived banks and questions are frozen: edit mutations are rejected
- [ ] Delete is offered only for archived entities; the mutation rejects active entities
- [ ] Bank deletion removes its questions and tombstones their media (object cleanup via ticket 04's sweeper)
- [ ] List views filter by archive state; archived items are identifiable
- [ ] Question-selection query enforces both question and bank non-archived, at the query level — no UI-layer-only filtering
- [ ] Unit tests: state-machine transitions, cascade/restore preservation, frozen rejections, selection eligibility query conditions
- [ ] E2E: archive → frozen → restore (cascade + independent preservation) → delete; eligibility verified through the selection query
