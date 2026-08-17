# Future Improvements

## UI/UX

1. **Toasts** — success/error feedback for actions; today actions succeed silently and only failures show inline messages.
2. **Page-aware breadcrumb** — the dashboard header breadcrumb is static; make it reflect the current bank/question.
3. **Pending states** — search and filter transitions have no indicator (`isPending` is unused in the toolbars); add spinner/opacity while navigating.
4. **Question form**:
   - Preview mode — render the stored content (the server renderer + KaTeX exist but are unused).
   - Ctrl+Enter / Ctrl+S to save.
   - Long-form ergonomics — prompt editor taller, collapsible option blocks.
5. **Richer empty states** — icon + call-to-action across the bank/question lists.
6. **Mobile pass** — tables scroll, but toolbar stacking and dialogs on small screens need verification.
7. **Category combobox keyboard nav** — arrow keys, Enter to select, Escape to close.
8. **Bank detail stats as cards** with icons instead of a single text line.

## TipTap Rich Text Editor

1. **Placeholder** — "Tulis pertanyaan…" / "Tulis opsi…".
2. **Link dialog** — replace `window.prompt` with a small popover form (add/edit/remove link).
3. **Table controls** — add/delete row/column and delete table (insert-only today).
4. **Undo/redo buttons** — history exists via keyboard only.
5. **Image UX** — click-to-select overlay with delete, alt editing, alignment (v3 resize extension).
6. **Math insertion dialog** — prompt for LaTeX instead of inserting an empty block; inline-math toggle.
7. **Toolbar tooltips** with keyboard shortcut hints (Ctrl+B, Ctrl+I…).
8. **Word/character count** on the prompt.
9. **Editor polish** — placeholder styling, min-height per use, typography pass on `rich-text-content`.
10. **Focus first editor** on page load; save shortcuts.

## Excel Import (Participants)

1. **Excel cell hyperlink / rich-text normalization**:
   - **Problem**: When users type an email or text in Microsoft Excel / Google Sheets, pressing Enter often turns it into an automatic hyperlink object (`{ text: "user@domain.com", hyperlink: "mailto:..." }`) or a rich-text object (`{ richText: [...] }`).
   - **Current Behavior**: `parseCell` in `lib/participants/import.ts` uses `String(value)`, which casts hyperlink/rich-text objects to `"[object Object]"`, causing false-positive `"Email tidak valid."` validation errors.
   - **Planned Solution**: Enhance `parseCell` in `lib/participants/import.ts` to unwrap objects: extract `value.text`, `value.result` (for formulas), `value.richText` joined text, or clean `value.hyperlink` before running string validations.

2. **Username deduplication check (in-file & database)**:
   - **Problem**: The database `user.username` column has a `unique` constraint, but `validateImportPlan` in `lib/participants/import.ts` currently only checks format regex and length (3–30 characters). It does not verify if a username is repeated in the same file or already exists in the database.
   - **Current Behavior**: Duplicate usernames pass the preview phase as "Valid", but cause an unhandled PostgreSQL unique constraint rollback during `applyParticipantImportAction` with a generic `"Import gagal. Tidak ada data yang dibuat."` message.
   - **Planned Solution**:
     - Query `existingUsernames` in `loadImportContext()` from `user.username`.
     - Track `seenUsernames` in `validateImportPlan()` during row iteration.
     - Emit specific row-level validation errors: `"Username sudah terdaftar."` and `"Username duplikat di dalam file."`.

## User Groups & Member Management

1. **Candidate List Limit & Server-side Search (`listGroupCandidates`)**:
   - **Problem**: Currently, `listGroupCandidates` in `lib/participants/queries.ts` fetches all candidate users (role `user`, non-banned, not in group) without a database limit and passes them to `ParticipantGroupMemberAdd` on the client.
   - **Current Behavior**: If the application has 1,000+ or 10,000+ users, all 1,000 records are fetched and rendered, leading to oversized SSR payloads and sluggish DOM performance in the combobox dropdown.
   - **Planned Solution**:
     - Sort candidates by `user.createdAt desc` (terbaru berdasarkan tanggal pendaftaran).
     - Apply a default limit of 10–15 users on initial view.
     - Transition the combobox to a server-side debounced search endpoint (e.g., `/api/participants/candidates?groupId=...&q=...&limit=15`) so users can search across thousands of accounts without loading all records upfront.

## Known Gaps

- **Staging orphans never swept** — the reconciliation pass covers `media/*` only; an upload presigned but never confirmed leaks in `staging/*` forever.
- **E2E teardown wipes the whole dev bucket** — `deleteAllBucketObjects` + `deleteAllMediaLedgerRows` are safe only because `exam-app` is dev/test-dedicated; scope them if real dev data lands there.


