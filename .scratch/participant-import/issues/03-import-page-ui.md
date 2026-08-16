# 03 — Import page UI

**Status:** done

**Blocked by:** 02 — Import actions and template.

## What to build

- `/dashboard/users/import/page.tsx` + `components/participant-import-form.tsx` (client): template download link, file upload, dry-run report (all errors per row), Import button enabled only when every row is valid, result summary with generated passwords (shown once).
- Link to the import page from the users list and the create-user page.

## Definition of done

- Full import flow works against a production build; invalid files never enable Import.
