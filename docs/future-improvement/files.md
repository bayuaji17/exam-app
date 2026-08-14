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

## Known Gaps

- **Staging orphans never swept** — the reconciliation pass covers `media/*` only; an upload presigned but never confirmed leaks in `staging/*` forever.
- **E2E teardown wipes the whole dev bucket** — `deleteAllBucketObjects` + `deleteAllMediaLedgerRows` are safe only because `exam-app` is dev/test-dedicated; scope them if real dev data lands there.
