# 03 — Role-filtered sidebar navigation

**What to build:** The sidebar shows only the links a user's role can actually open. A regular user sees a short menu — overview and account settings — instead of twenty-one links that would reject them. An admin sees every section except admin management. A super-admin sees everything.

Empty groups disappear entirely rather than rendering as bare headings.

**Blocked by:** 01 — needs the permission helper.

**Status:** done

- [x] A regular user's sidebar shows only the sections containing routes they may access, and none of the administrative sections.
- [x] An admin's sidebar shows the user-management, exam-management, grading, monitoring, and reporting sections, but not the admin-management link.
- [x] A super-admin's sidebar shows every section including admin management.
- [x] A group whose every item is filtered out is not rendered at all — no empty headings.
- [x] The account-settings link in the sidebar footer and the profile menu remain visible to all roles.
- [x] Active-route highlighting continues to work for the links that remain.
- [x] The sidebar renders without flicker or layout shift while the session is still loading.

## Comments

The last criterion ruled out the approach the spec originally described. Reading
the session client-side with `authClient.useSession()` leaves an `isPending`
frame, so the sidebar would either flash every link before filtering or pop in
after a skeleton — both are the layout shift this criterion forbids.

The route guard from ticket 02 already resolves the role server-side, so the
sidebar now takes it as a prop and the first paint is already correct. The spec
has been updated to record the deviation.

Two smaller notes:

- An admin sees **7** groups, not the 6 the spec predicted. "Manajemen Pengguna"
  survives with three of its four links once `/dashboard/admins` is removed.
- The footer's account-settings link sits outside the menu loop, so it is now
  checked against the permission helper rather than hardcoded. It is reachable
  by every role today, but hardcoding it would leak if that ever changed.
