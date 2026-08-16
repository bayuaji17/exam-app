# Participant & Eligibility — Slice Spec

**Status:** done

## Problem Statement

Admins need to control who may take a scheduled exam. Today any `user` account exists, but nothing ties participants to exams: schedules run, but there is no notion of an eligible participant, and no way to manage the participant population beyond raw accounts.

## Solution

Eligibility attaches to the exam schedule (the runnable unit with a window). Access is granted explicitly, per schedule, through two grant types — individual users and participant groups — with union semantics: a participant is eligible when directly granted **or** a member of a granted group. The default is deny: a schedule with no grants is open to nobody.

Participants are accounts with role `user`; banned accounts are never eligible, at picker and at query time. Participant groups are flat collections of participants, reusable across schedules.

## User Stories

1. As an admin, I want to create, rename, and delete participant groups, so that I can batch-manage participants.
2. As an admin, I want to add and remove `user`-role participants from a group, so that group membership stays accurate.
3. As an admin, I want to see group member counts and browse members, so that groups are auditable.
4. As an admin, I want to grant eligibility for a schedule to specific users, so that only chosen participants can take the exam.
5. As an admin, I want to grant eligibility for a schedule to a participant group, so that whole cohorts can be granted in one step.
6. As an admin, I want to revoke any grant, so that mistakes are correctable.
7. As an admin, I want a preview of the computed eligible participant list per schedule, so that I can verify grants before the exam opens.
8. As the future attempt slice, I want a single eligibility check (user × schedule), so that the attempt gate is not re-implemented.

## Implementation Decisions

- Schema 0006: `participant_group` (name, description?) and `participant_group_member` (groupId FK cascade, userId FK cascade, UNIQUE(groupId, userId)); membership is user↔group many-to-many. See ADR-0009.
- Schema 0007: `schedule_user_eligibility` (scheduleId FK cascade, userId FK cascade, UNIQUE(scheduleId, userId)) and `schedule_group_eligibility` (scheduleId FK cascade, groupId FK cascade, UNIQUE(scheduleId, groupId)). Two tables instead of a type column so both foreign keys are DB-enforced.
- Subjects are role `user` only; banned accounts excluded. Enforced in candidate queries, re-validated in every action, and baked into the SQL eligibility conditions.
- Eligibility invariant lives once as `eligibleParticipantConditions(scheduleId)` (pure SQL builder, unit-asserted like `eligibleQuestionConditions`) and is consumed by both `isUserEligibleForSchedule` and the admin preview list.
- Routes reuse the reserved entries already in permissions and menu: groups live at `/dashboard/user-groups`, per-schedule access at `/dashboard/exam-schedules/[scheduleId]/eligibility`, with `/dashboard/exam-access-rules` as the hub listing schedules and their eligibility summary.
- Deleting a schedule cascades its grants; deleting a group cascades membership but is blocked (FK RESTRICT, friendly message) while granted to any schedule.
- Group member and grant pickers list candidates from `role=user` non-banned accounts, searchable by name/email.

## Out of Scope

The participant-facing `/exam` list and the attempt gate (v0.8). Excel participant import. Nested groups. "Open to all" eligibility modes. Group-based reporting.

## Further Notes

Variant of the v0.7 plan approved on 2026-08-16: route names follow the pre-existing reserved `/dashboard/user-groups` and `/dashboard/exam-access-rules` entries instead of the plan's provisional `/dashboard/participant-groups`. Ticket files: `.scratch/participant-eligibility/issues/01-*.md` – `04-*.md`.
