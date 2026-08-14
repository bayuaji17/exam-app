# 03 — Question authoring with TipTap

**What to build:** An admin opens a bank and sees its question list with search (matching prompt and answer text), filtering by category, type, and archive state, and pagination. They create a question of one of the three types — single-choice, score-based, or manual — and the form adapts: single-choice gets options with a correct-flag (exactly one), score-based gets options with numeric scores (required), manual gets no options. Prompts are authored in the full TipTap editor (headings, lists, blockquote, code block, link, table, math); answers in the restricted editor (paragraph, inline formatting, image only) whose toolbar exposes exactly the allowed set. The category field is a combobox: pick an existing category or type a new name and create it inline, persisted to the database. The question type is chosen at creation and immutable in the edit form. Per-type invariants are enforced on save (single: ≥ 2 options with exactly one correct; scored: ≥ 2 options all with numeric scores; manual: no options), and content that violates the policy is rejected with a validation error. Editing an archived bank or question is rejected (frozen rule), while the archive lifecycle UI itself is ticket 05. Deleting a referenced category surfaces the 409-style domain error defined in ticket 02.

**Blocked by:** 01 — Bank list, create, and edit; 02 — Question and category schema, content policy, category CRUD.

**Status:** ready-for-agent

- [ ] An admin can create and edit questions of all three types with type-aware option editors
- [ ] Question type is immutable in the edit form
- [ ] Per-type invariants enforced on save with clear errors (correct flag, score, no-options rules)
- [ ] Prompt editor supports the curated full set including math; answer editor exposes only paragraph, inline formatting, and image — toolbar matches policy exactly
- [ ] Content-policy violations reject the save with a validation error
- [ ] Category combobox supports selecting existing and inline-creating custom categories, persisted to the database
- [ ] Deleting a referenced category surfaces a clear domain error
- [ ] Bank detail shows question list with search (prompt + answers), category/type/archive filters, and pagination
- [ ] Editing archived banks or questions is rejected (frozen rule)
- [ ] Unit tests: per-type invariant validation and inline category creation logic
- [ ] E2E: authoring flows for all three types, immutable type, policy rejection, combobox create, search/filters
