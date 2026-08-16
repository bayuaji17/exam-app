# 01 — Participant group CRUD


## Goal

Admin can create, edit, list (searchable/sortable/paginated), and delete participant groups.

## Details

- Schema: `participant_group` (id, name 1–100, description? ≤500, createdAt, updatedAt) + `participant_group_member` with UNIQUE(groupId, userId); generate + run migration.
- `lib/participants/validation.ts`: `participantGroupSchema` (trim, empty description → undefined), `participantGroupFormValues`.
- `lib/participants/table-params.ts`: `q`, sort `name|createdAt`, default createdAt desc, existing URL-state pattern.
- `lib/participants/queries.ts`: `listParticipantGroupsPage` (member-count subquery), `getParticipantGroupById`, `groupNameTaken`.
- `lib/participants/actions.ts`: `requireGroupManager` guard (`/dashboard/user-groups`, MANAGEMENT tier); `createQuestionGroupAction`-style `createParticipantGroupAction`, `updateParticipantGroupAction`, `deleteParticipantGroupAction` (FK 23503 from eligibility → friendly message).
- Pages: `/dashboard/user-groups` list, `/new`, `/[groupId]/edit` (notFound on missing; delete only from list via confirm).
- Components: `participant-group-form.tsx` (RHF + zod), `participant-group-row-actions.tsx` (delete confirm).
- Unit tests: `participants-validation.test.ts`, `participants-params.test.ts`, `participants-actions` pure helpers where extractable.

## Definition of done

- Gate passes (`lint`, `typecheck`, `test:unit`, `build`); group list/new/edit reachable by admin + super-admin, blocked for user role.

**Blocked by:** None — can start immediately.

**Status:** done
