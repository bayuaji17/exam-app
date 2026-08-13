# 01 — Bank list, create, and edit

**What to build:** An admin opens the question-bank area and sees a searchable, sortable, paginated list of banks. They can create a new bank with a name and optional description, see validation errors for bad input (empty name, name over 255 chars, description over 2000), and edit an existing bank's name and description. Regular users (participants) are blocked from the entire question-bank area by the existing route guard. The bank's archive state is modeled from the start, though the archive lifecycle itself is ticket 05.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] An admin can see the question-bank list with search, sorting, and pagination
- [ ] An admin can create a bank (name required 1–255, description optional ≤ 2000) and sees field-level validation errors for invalid input
- [ ] An admin can edit a bank's name and description and sees validation errors for invalid input
- [ ] A participant visiting any question-bank route is redirected to the forbidden page
- [ ] The question-bank menu entry navigates to the new list page
- [ ] Unit tests cover the list table parameters (search/sort/pagination)
- [ ] E2E covers create, edit, validation errors, search, and the route guard
