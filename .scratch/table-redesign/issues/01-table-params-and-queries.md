# 01 — Table parameters and paginated queries

**What to build:** The foundation the whole pattern stands on. A URL like `/dashboard/users?q=budi&role=admin&page=2&size=25` parses into a validated parameter set, and a paginated query turns that into rows plus a total count. Nothing visible changes yet — this ticket delivers the pieces the pages will use.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] A parameter module parses search, role, status, sort, order, page, and size from URL search params with safe defaults: unknown roles are ignored, a negative or non-numeric page becomes 1, a size outside 10/25/50 falls back to the default, an unknown sort column falls back to join date newest-first.
- [ ] The module can also serialize a parameter set back into a URL, so links are built from the same rules the parser enforces.
- [ ] A sortable header click flips ascending to descending on the same column.
- [ ] A paginated user query searches name and email case-insensitively, filters by role and ban status, sorts by name, email, or join date, and returns rows, the total count, the current page, the page size, and the page count.
- [ ] A paginated roster query does the same restricted to admin and super-admin roles.
- [ ] The join-date ordering keeps a secondary id tiebreaker so ties never reshuffle between reloads.
- [ ] Unit tests cover the parameter module's edge cases (garbage in, defaults out) and the sort cycle.
