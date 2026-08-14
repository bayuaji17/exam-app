# 02 — Question and category schema, content policy, category CRUD

**What to build:** The domain's data foundation plus its one pure-logic core. The question, answer-option, and category tables exist with their constraints (category names unique case-insensitively, options ordered by position, FKs in place). The content-policy module defines the prompt and answer allowlists and provides the save-time validator (reject-not-strip, math node with LaTeX attribute, image src shape), the plain-text extraction used for search, and the render-time sanitizer — all derived from one shared definition. An admin can manage categories (list, create, rename, delete) from a categories page; deleting a referenced category surfaces a clear error once questions exist (DB RESTRICT surfaces as a 409-style domain error — that path is verified in ticket 03).

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Schema: question, question_option, question_category tables with FKs, unique case-insensitive category name, option position, and the indexes from the spec
- [ ] Content-policy module exposes prompt and answer allowlists as a single source of truth
- [ ] Validator rejects disallowed nodes, marks, and attributes with an error naming the offending content — never strips silently
- [ ] Math node validated including its LaTeX attribute; image node src must be a valid media key shape
- [ ] Plain-text search extraction covers prompt and answers, excludes math content, and is deterministic
- [ ] Render-time sanitizer derives its allowlist from the same policy definitions
- [ ] Unit tests: validator accept/reject per policy, reject-not-strip, math/image rules, search extraction
- [ ] An admin can list, create, rename, and delete categories; duplicate names are rejected
- [ ] E2E covers category CRUD and the duplicate-name error
