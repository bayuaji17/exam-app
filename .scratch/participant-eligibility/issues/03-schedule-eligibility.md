# 03 — Schedule eligibility


## Goal

Admin can grant/revoke eligibility per schedule (individual users and groups), preview the computed eligible list, and the attempt slice gets its gate.

## Details

- Schema: `schedule_user_eligibility` + `schedule_group_eligibility` (FK cascade on schedule, UNIQUE per pair); generate + run migration.
- `lib/eligibility/queries.ts`:
  - `eligibleParticipantConditions(scheduleId)` → pure SQL conditions: user role `user`, not banned, and (direct grant **or** membership in a granted group). Unit-asserted on the generated SQL (mirror `lifecycle-rule.test.ts`).
  - `isUserEligibleForSchedule(userId, scheduleId)` (consumes the conditions; used by v0.8).
  - `listEligibleParticipantsPage(scheduleId, params)` (union preview, paginated), `listGrantedUsers(scheduleId)`, `listGrantedGroups(scheduleId)`, `listEligibleCandidateUsers(scheduleId)` / `listGrantableGroups(scheduleId)` for pickers.
- `lib/eligibility/actions.ts`: `requireScheduleManager` guard (`/dashboard/exam-schedules`, MANAGEMENT tier); `grantUserEligibilityAction`, `revokeUserEligibilityAction`, `grantGroupEligibilityAction`, `revokeGroupEligibilityAction` — server re-validates schedule/user/group existence, user role `user` + non-banned, duplicates → friendly message.
- Pages: `/dashboard/exam-schedules/[scheduleId]/eligibility` — granted users table, granted groups table, add pickers, revoke buttons, computed eligible list; `/dashboard/exam-access-rules` hub — schedules with eligibility summary (counts) + link per schedule (MANAGEMENT tier, already reserved).
- Add "Aturan Akses" link in the exam-schedules list rows.
- Components: `schedule-eligibility-manager.tsx` (client pickers + revoke), `user-picker-combobox.tsx` + `group-picker-combobox.tsx` (searchable, no inline create).
- Unit tests: eligibility conditions SQL assertion, validation/picker helpers.

## Definition of done

- Grants behave with union semantics; banned users excluded from eligibility; schedule delete cascades grants; v0.8's `isUserEligibleForSchedule` is ready and covered.

**Blocked by:** 02 — Group membership.

**Status:** done
