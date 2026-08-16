# 01 — Schedule-overlap validation

**What to build:** Creating or editing a schedule rejects a window that overlaps another schedule of the same package, so a participant can never be double-booked into the same exam content at the same time. The error surfaces as a clear message in the schedule form; schedules of different packages may still run concurrently.

**Blocked by:** None — can start immediately.

**Status:** done

- [ ] A pure `windowsOverlap` rule exists (half-open interval semantics: a window ending exactly when another starts does not overlap) and is unit-tested at the boundaries
- [ ] Creating a schedule whose window overlaps another schedule of the same package is rejected with a clear message
- [ ] Updating a schedule into an overlapping window is rejected; a schedule's own window (excluding itself) never counts as a conflict
- [ ] Non-overlapping windows and different-package overlaps still succeed
- [ ] The schedule form displays the server error
- [ ] E2E covers: same-package overlap rejected on create and edit, boundary (end = start) allowed, different-package overlap allowed
