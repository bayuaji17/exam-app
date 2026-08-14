Status: ready-for-agent

# Bank Soal — Question Bank Slice

## Problem Statement

The application's sidebar advertises "Bank Soal", "Paket Ujian", and the rest of the exam roadmap, but none of these routes exist — the exam domain has no schema, no pages, and no authoring workflow. Admins cannot create questions, and the three scoring models that define the product (correct-answer, score-based, manual-graded) are not representable anywhere.

## Solution

An admin-facing question authoring domain: question banks that own questions of three immutable types (single, scored, manual), with TipTap rich-text prompts (full capability incl. math) and answers restricted to text and images, categories (global, select-or-create-inline), server-side image processing (WebP conversion) with object storage, and an archive-then-delete lifecycle where deletion is terminal and only available from the archived state.

## User Stories

1. As an admin, I want to create a question bank with a name and description, so that I can group related questions for later exam packages.
2. As an admin, I want to edit a bank's name and description, so that I can correct mistakes.
3. As an admin, I want to archive a bank, so that it becomes read-only and disappears from the active list.
4. As an admin, I want archiving a bank to archive all of its currently active questions, so that I cannot keep editing questions inside an archived bank.
5. As an admin, I want to restore an archived bank, so that I can resume working on it.
6. As an admin, I want restoring a bank to restore the questions that were archived as a consequence of the bank archive, while leaving questions that were independently archived in the archived state, so that independent archives are not accidentally undone.
7. As an admin, I want archived banks and questions to be read-only, so that archived content is a stable snapshot.
8. As an admin, I want to delete a bank only after it is archived, so that deletion is a deliberate two-step action.
9. As an admin, I want to archive and delete individual questions independently of their bank, so that I can clean up single bad questions.
10. As an admin, I want to see which questions are active and which are archived inside a bank, so that I know the state of the bank.
11. As an admin, I want to create a single-choice question with one correct answer option, so that it can be auto-scored.
12. As an admin, I want to create a score-based question whose options each carry a score, so that it supports psychometrics and surveys.
13. As an admin, I want to create a manual-graded question with no options, so that essays can be graded by hand later.
14. As an admin, I want the question type to be chosen at creation and immutable afterward, so that scoring semantics can never silently change.
15. As an admin, I want to edit a question's prompt, options, scores, correctness, and media without changing its type, so that content can be refined.
16. As an admin, I want to author question prompts with full rich text — headings, lists, blockquotes, code blocks, links, tables, and mathematics — so that complex question stems are representable.
17. As an admin, I want question prompts to have no length limit, so that long multi-part questions are supported.
18. As an admin, I want answer content restricted to paragraphs, inline formatting, and images, so that answers stay simple and readable.
19. As an admin, I want the answer editor to expose exactly the allowed formatting, so that I cannot accidentally produce unsupported content.
20. As an admin, I want to insert images into prompts and answers, so that image-based questions and options are possible.
21. As an admin, I want uploaded images converted to WebP automatically, so that storage and exam-page payloads stay small.
22. As an admin, I want uploads limited to png/jpeg/webp at 5 MB maximum, so that storage and conversion stay predictable.
23. As an admin, I want an unlimited number of images per question, so that content is never blocked by arbitrary caps.
24. As an admin, I want to remove an image from content and have its stored object cleaned up eventually, so that storage does not accumulate orphans.
25. As an admin, I want to search questions by text from the prompt and the answers, so that I can find questions by remembered terms.
26. As an admin, I want to filter questions by category, type, and archive state, so that large banks stay navigable.
27. As an admin, I want to assign a question to an existing category, so that questions are classifiable.
28. As an admin, I want to create a custom category inline while authoring a question, so that I am not forced to leave the form.
29. As an admin, I want to manage categories (create, rename, delete), so that the category vocabulary stays clean.
30. As an admin, I want to delete a category only when no question uses it, so that questions never lose their category silently.
31. As an admin, I want invalid content — disallowed nodes or marks — rejected with an error at save, so that stored content always matches the policy.
32. As an admin, I want the single-choice question to validate that it has a correct option, so that a question cannot be saved without an answerable scoring setup.
33. As an admin, I want the score-based question to validate that every option carries a numeric score, so that scoring never fails at exam time.
34. As an admin, I want the manual question to have no options, so that its grading is genuinely manual.
35. As a super-admin, I want the same question-bank capabilities as an admin, so that I can audit and fix content.
36. As a regular user (participant), I want question-bank routes inaccessible, so that authoring stays admin-only.
37. As a future exam-package builder, I want only eligible questions — active questions in active banks — returned by the selection queries, so that archived content can never leak into packages.

## Implementation Decisions

### Domain types

```ts
type QuestionType = "single" | "scored" | "manual"   // immutable after creation

interface QuestionBank {
  id: string
  name: string            // required, trimmed, 1..255
  description: string | null  // ≤ 2000
  createdBy: string       // user id
  createdAt: Date
  updatedAt: Date
  archivedAt: Date | null
}

interface Question {
  id: string
  bankId: string
  type: QuestionType
  content: TipTapJson     // canonical content, jsonb (ADR-0002)
  searchText: string      // derived plain text, prompt + answers, same txn (Q9)
  categoryId: string | null
  archivedAt: Date | null
  archivedWithBankAt: Date | null   // set only by bank-archive cascade (see lifecycle)
  createdAt: Date
  updatedAt: Date
}

interface QuestionOption {
  id: string
  questionId: string
  content: TipTapJson     // answer content — restricted schema
  position: number        // display order
  isCorrect: boolean | null   // single only; exactly one true
  score: number | null        // scored only; numeric, may be 0 or negative
}

interface QuestionCategory {
  id: string
  name: string            // unique, case-insensitive, 1..100
  description: string | null
}

interface QuestionMedia {
  id: string
  questionId: string | null   // SET NULL on question delete; tombstone survives
  objectKey: string           // permanent WebP key, e.g. media/<uuid>.webp
  mime: string                // image/webp after conversion
  sizeBytes: number
  createdAt: Date
  deletedAt: Date | null      // tombstone; sweeper purges rows + objects
}
```

### Schema / migration contract

- Tables: `question_bank`, `question_category`, `question`, `question_option`, `question_media` (postgres, single migration).
- `question.content` and `question_option.content` are `jsonb` — the TipTap document is canonical; HTML is never stored (ADR-0002).
- FKs: question → bank (RESTRICT delete — banks delete through the lifecycle, not raw rows), option → question, media → question `ON DELETE SET NULL` (tombstone rows must survive question deletion so the sweeper still removes objects), question.categoryId → category RESTRICT (blocks category deletion when referenced → 409).
- Unique: category name `lower(name)`; media objectKey.
- Indexes: `question.bank_id`, `question(bank_id, archived_at)`, `question.search_text` (btree — ILIKE on a prefix works; Q9 explicitly chooses ILIKE over tsvector), `question.category_id`, `question_media.deleted_at` (sweeper scan), `question_bank.archived_at`.

### Content policy (single source — ADR-0004)

One definition drives the editor schema, the save-time validator, and the render-time sanitizer:

- **Prompt policy** (curated, not kitchen-sink): paragraph, heading (levels 1–6), bold, italic, underline, strikethrough, inline-code, ordered list, bullet list, list-item, blockquote, code block, link, image, table (table, table-row, table-header-cell, table-cell), math.
- **Answer policy**: paragraph, bold, italic, underline, strikethrough, inline-code, image. No headings, lists, links, blockquotes, code blocks, tables, or math.
- **Math node rule**: `{ type: "math", attrs: { tex: string } }` — validated explicitly, including the LaTeX value: `tex` must be a present string (may be empty at edit time? No — reject empty tex at save). KaTeX HTML is a render artifact, never validated as document content.
- **Image node rule**: `src` holds the object key (not a URL — content stays environment-portable); validator requires the src to be a known media object key shape (`media/<uuid>.webp` or `staging/<uuid>.<png|jpeg|webp>` before conversion), plus non-empty `alt`.
- **Reject-not-strip**: any disallowed node, mark, or attribute → save rejected with a validation error naming the offending location. Never silently stripped (Q7).
- Separately allowed lists for prompt vs answer; the toolbar renders exactly the allowed set.

### Storage (Q1, Q2, Q6 — ADR-0003)

- S3-compatible object storage (`@aws-sdk/client-s3`, `s3-request-presigner`) — works with MinIO (dev/test), R2, or AWS S3. Env: `S3_ENDPOINT`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET`, `S3_PUBLIC_BASE_URL`.
- Storage module exposes an interface: `presignUpload`, `verifyObject` (HEAD), `copyToPermanent`/`putObject`, `deleteObject`, `listObjects(prefix)` — unit-tested against a mocked client.
- **Upload flow**:
  1. Client requests presigned PUT for a staging key `staging/<uuid>.<ext>` (ext ∈ png|jpeg|webp) — MIME allowlist enforced here too.
  2. Client uploads directly to object storage (browser → storage; no server round-trip of bytes). Client validates ≤ 5 MB before uploading (Q6).
  3. Client calls confirm: server HEAD-checks the original object — **reject if > 5 MB** (this is the server-side enforcement; Q6) — then converts to WebP with sharp and writes the permanent object `media/<uuid>.webp`.
  4. Confirm returns the permanent object key. **No ledger row yet** — the ledger is synced at question save.
  5. The editor inserts an image node whose `src` is the object key; rendering resolves `S3_PUBLIC_BASE_URL + key` at display time.
- **Ledger sync** (runs inside the question save transaction): collect every image src from the question's content JSON (prompt + all option contents); for each key, ensure a ledger row exists for the question (insert missing); tombstone (`deleted_at = now()`) any ledger row of this question whose key no longer appears. Content JSON is the reference source of truth; `question_media` is the ownership/lifecycle authority (Q1, locked boundary).
- **Tombstone + sweeper** (Q2): a sweeper job (invocable on schedule; in this slice a `lib` function + script):
  - Selects tombstoned rows in batches (batch size 100).
  - Per row: `deleteObject(key)` → on success, hard-delete the row. **Purge only after successful object deletion**; on failure the row stays tombstoned and is retried next sweep.
  - Batch isolation: per-row try/catch; one failing row never blocks the rest of the batch; batches are processed one at a time.
  - Empty batch: no-op.
  - Reconciliation pass (safety net, Q1/Q2): list permanent `media/` objects and compare against ledger rows; objects with no ledger row older than a grace period (24h) are deleted. This is what reclaims uploads that were never saved into content.
- **Question deletion** tombstones all its ledger rows (`deleted_at`), even if previously untombstoned — never hard-deletes rows in the question transaction.

### Lifecycle state machine (Q5 — ADR-0005)

- States per entity: `active`, `archived`, `deleted` (terminal).
- **Archive bank**: transaction — set `question_bank.archived_at = now()`; for every question with `archived_at IS NULL` set both `archived_at` and `archived_with_bank_at` to the same timestamp.
- **Restore bank**: transaction — clear `archived_at` and `archived_with_bank_at` for questions whose `archived_with_bank_at` equals the bank's current `archived_at`; independently archived questions (`archived_with_bank_at IS NULL`) stay archived. Clear the bank's `archived_at`.
- **Archive question (independent)**: set `archived_at` only — `archived_with_bank_at` stays NULL.
- **Restore question (independent)**: clear `archived_at`.
- **Delete**: only when the entity's `archived_at IS NOT NULL`; bank delete hard-deletes the bank and (via the lifecycle) its questions; question delete hard-deletes options and tombstones media ledger rows. Deletion is terminal — no undo, no restore from delete.
- **Frozen rule**: edit/archive-state mutations rejected for archived entities (403-style domain error); read-only views only.

### Query eligibility (Q5, story 37)

- All question/bank listing queries filter by archive state; the question-selection projection for future packages enforces `question.archived_at IS NULL AND question_bank.archived_at IS NULL` **inside the query**, never in the UI layer.
- `searchText` ILIKE search covers prompt + answers (Q9); images and LaTeX are not searchable.

### Mutation contracts (server actions)

All mutations run with the acting admin's session; the `MANAGEMENT` permission tier already covers `/dashboard/question-banks` (admin + super-admin; participant gets 403/redirect via existing route guard — no permission changes needed).

- `createQuestionBank({ name, description? }) → { id }` — validation: name 1..255 trimmed, description ≤ 2000.
- `updateQuestionBank({ id, name, description? })` — rejected when archived (frozen).
- `archiveQuestionBank({ id })` / `restoreQuestionBank({ id })` — per lifecycle above.
- `deleteQuestionBank({ id })` — rejected unless archived.
- `createQuestion({ bankId, type, content, categoryId?, options? })`:
  - content + every option content validated against the respective policy (prompt vs answer); reject-not-strip.
  - Per-type invariants: `single` → ≥ 2 options, exactly one `isCorrect: true`; `scored` → ≥ 2 options, every option has numeric `score`; `manual` → no options.
  - Single transaction: insert question + options, sync media ledger, derive `searchText`.
  - Rejected when bank archived.
- `updateQuestion({ id, content, categoryId?, options? })` — `type` is never accepted here (immutable, Q8 — ADR-0006); same validation and ledger/search sync; rejected when question archived.
- `archiveQuestion({ id })` / `restoreQuestion({ id })` / `deleteQuestion({ id })` — per lifecycle.
- `createCategory({ name, description? })`, `updateCategory({ id, name, description? })`, `deleteCategory({ id })` — delete rejected with 409 when referenced by a question (FK RESTRICT).
- `presignMediaUpload({ ext }) → { uploadUrl, stagingKey }` — ext ∈ png|jpeg|webp only.
- `confirmMediaUpload({ stagingKey }) → { objectKey }` — HEAD size check ≤ 5 MB (reject oversized), WebP conversion, permanent object; no ledger row here.
- Error shape: `{ field?, message }` — validation errors from content policy include the node path.

### Editor (Q10)

- TipTap v3 (React 19 line) with `@tiptap/starter-kit` base + `@tiptap/extension-mathematics` added **only to the prompt editor**; KaTeX lazy-loaded with the editor chunk.
- One shared client-only editor component; prompt vs answer differences are schema/toolbar configuration from the content policy, not separate implementations. Client-only, dynamically imported (no SSR of the editor; never in the initial dashboard bundle).
- Image insertion wired to the presign → upload → confirm flow.
- **Not a render path**: stored JSON renders as sanitized HTML server-side (`isomorphic-dompurify`, allowlist derived from the same content policy) before `dangerouslySetInnerHTML` (Q7, ADR-0002).
- This Next 16 build has documented breaking changes — the implementer must read `node_modules/next/dist/docs/` before writing editor/rendering code.

### Dependencies

`@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-mathematics`, `katex`, `sharp`, `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`, `isomorphic-dompurify` (zod already in use).

## Testing Decisions

- **Good tests test external behavior** — what the admin can observe (save succeeds/fails, list shows correct rows, object disappears after sweep), not implementation details. Pure modules are the one place unit tests may assert exact behavior.
- **Unit tests** (mirror prior art: `users-create.test.ts`, `users-edit.test.ts`, `table-params.test.ts`, `session-format.test.ts` — pure functions, mocked DB/auth where needed):
  - Content-policy validator: accept/reject per prompt and answer policies; math node incl. LaTeX attr; reject-not-strip; image src shape; toolbar-set parity.
  - `searchText` extraction: prompt + options included, math excluded, link text included, whitespace joining.
  - Ledger diff: insert new keys, tombstone removed keys, no-op on unchanged, key matching across prompt + options.
  - Sweeper: success → object deleted + row purged; failure → row retained and retried; correct object key passed to delete; purge only after successful object deletion; batch isolation (one failure doesn't block the batch); empty batch no-op; reconciliation removes orphaned objects past grace period.
  - Table params: bank list and question list (search/sort/filter/pagination) — mirrors `table-params.test.ts`.
  - Storage module against a mocked S3 client: presign params, key scheme, size-check rejection, conversion invocation.
  - Eligibility: the query-builder conditions for the future-package projection assert both `archived_at IS NULL` clauses are present (drizzle SQL building, no DB).
- **E2E tests** (mirror `user-list.spec.ts`, `user-create.spec.ts` style — fixtures + global setup; MinIO container for object storage):
  - Bank CRUD + archive → frozen → restore (cascade + independent preservation) → delete (only when archived; button absent when active).
  - Question authoring per type; type immutable in the edit form; per-type invariant errors (no correct option / missing score / options on manual).
  - Answer editor exposes no heading/list/link controls; prompt editor does.
  - Category: select existing, inline-create custom → persisted; delete referenced category blocked.
  - Media: upload png/jpeg/webp OK; oversized rejected; image renders in prompt and answer; removing image from content → object eventually removed (sweep verification against MinIO).
  - Search finds prompt and answer text; filters work.
  - Route guard: participant blocked from `/dashboard/question-banks`.

## Out of Scope

- Participant-authored answers, participant image uploads, attempt media — the future attempt domain (ADR-0007).
- Paket ujian (exam packages), exam scheduling, sessions, the exam runner, results, scoring engine.
- tsvector / ranked full-text search; media count caps; GIF or audio/video support; image cropping/resizing (WebP conversion only).
- Question type mutation (immutable — ADR-0006); per-bank access control (all management-tier roles); activity tracking / anti-cheat.
- Category archiving (categories delete directly, blocked while referenced).

## Further Notes

- Version target: `v0.3.0`. Release path per `docs/agents/branching.md` §10: `feat/question-banks` → fast gate → squash PR into `dev` → release gate → `staging` → `main` → tag.
- Development/test object storage: local MinIO (docker compose), test bucket + env vars in the E2E setup; seeds follow the existing global-setup fixture pattern.
- All Q1–Q10 grilling decisions are recorded in `CONTEXT.md` and `docs/adr/0001–0007`; this spec is the agent-ready elaboration of them. The media reference-vs-ownership boundary (locked clarification) is honored exactly: content JSON references, `question_media` owns.
