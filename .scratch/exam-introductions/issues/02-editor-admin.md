# 02 — Editor and admin management

**Status:** done

**Blocked by:** 01 — Content policy and schema.

## What to build

- `EDITOR_CONFIGS["introduction"]` + `IntroToolbar` in the rich-text editor; `components/exam-introduction-editor.tsx` (dynamic import, ssr:false).
- Schedule validation/actions/queries persist the parsed doc (re-validated server-side); detail + hub query.
- `/dashboard/exam-introductions` hub (search/pagination, intro status) + `[scheduleId]` editor page; schedule form shows presence + "Atur Introduction" link.

## Definition of done

- Admin can write and save an introduction; validation rejects out-of-policy content.
