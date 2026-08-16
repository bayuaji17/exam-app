# 02 — Group membership


## Goal

Admin can view, add, and remove `user`-role participants in a group from the group detail page.

## Details

- `lib/participants/queries.ts`: `listGroupMembersPage(groupId, params)` (search name/email, paginated), `listGroupCandidates(groupId)` (role `user`, non-banned, not yet a member, newest first).
- `lib/participants/actions.ts`: `addGroupMemberAction(groupId, userId)` and `removeGroupMemberAction(groupId, userId)` under the same `requireGroupManager` guard; server re-validates: user exists, role `user`, not banned; duplicate membership → friendly message (unique violation 23505).
- Page: `/dashboard/user-groups/[groupId]` — header (name, description, member count), member table (server-rendered, searchable via toolbar), add-member combobox (client), per-row remove with confirm.
- Components: `participant-group-member-manager.tsx` (client: combobox + remove buttons), `participant-group-toolbar.tsx` if the group list needs one (mirror `question-banks-toolbar`), members toolbar.

## Definition of done

- Members can be added/removed; banned or admin accounts never appear in the candidate list; duplicates rejected server-side.

**Blocked by:** None — can start immediately.

**Status:** done
