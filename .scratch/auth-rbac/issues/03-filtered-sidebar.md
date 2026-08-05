# 03 — Role-filtered sidebar navigation

**What to build:** The sidebar shows only the links a user's role can actually open. A regular user sees a short menu — overview and account settings — instead of twenty-one links that would reject them. An admin sees every section except admin management. A super-admin sees everything.

Empty groups disappear entirely rather than rendering as bare headings.

**Blocked by:** 01 — needs the permission helper.

**Status:** ready-for-agent

- [ ] A regular user's sidebar shows only the sections containing routes they may access, and none of the administrative sections.
- [ ] An admin's sidebar shows the user-management, exam-management, grading, monitoring, and reporting sections, but not the admin-management link.
- [ ] A super-admin's sidebar shows every section including admin management.
- [ ] A group whose every item is filtered out is not rendered at all — no empty headings.
- [ ] The account-settings link in the sidebar footer and the profile menu remain visible to all roles.
- [ ] Active-route highlighting continues to work for the links that remain.
- [ ] The sidebar renders without flicker or layout shift while the session is still loading.
