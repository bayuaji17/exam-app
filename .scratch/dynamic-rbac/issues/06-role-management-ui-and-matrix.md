# 06: Role Management UI & Module Permission Matrix

**What to build:** The Super Administrator user interface for managing roles at `/dashboard/roles`, including the roles listing table, create/edit role dialog/pages with a permission checkbox matrix grouped by module, and multi-role selection inputs in the user management forms.

**Blocked by:**
- 03: Super Admin Role Management Server Actions & Invariant Validation
- 04: User-to-Roles Assignment Actions & Bulk Import Support

**Status:** ready-for-agent

- [ ] Build `/dashboard/roles` listing page with responsive table, role badges (System / Custom), user counts, and action buttons.
- [ ] Build Create / Edit Role views featuring the Permission Matrix organized by domain module cards with "Select All in Module" toggles.
- [ ] Implement confirmation modal for role deletion displaying assigned user count warning or blocking deletion when users are attached.
- [ ] Update `/dashboard/users/[userId]/edit` and `/dashboard/users/create` forms to support multi-role selection checkboxes/badges.
- [ ] Unit tests for UI components, form validation, and permission matrix interaction behavior.
