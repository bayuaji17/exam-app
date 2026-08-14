# 01 — Package list, create, and edit

**What to build:** An admin manages exam packages end to end: a searchable, sortable, paginated list showing name, description, duration, question count, pass score, and creation date; create and edit forms for the configuration fields (name required, description, durationMinutes positive int, shuffle default false, passScore non-negative) with validation errors.

**Blocked by:** None — can start immediately.

**Status:** done

- [x] Package list with search/sort/pagination and question counts
- [x] Create and edit with field-level validation
- [x] Unit tests: schema bounds, table params, swap helper
- [x] E2E: create, validation errors, edit
