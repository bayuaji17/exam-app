# 05: Domain Server Actions Authorization Migration

**What to build:** Comprehensive migration of authorization checks across all existing application Server Actions (Question Banks, Categories, Exam Packages, Exam Schedules, Eligibility, Participant Management, Manual Grading, and System Settings) from legacy static role checks (`actor.role === 'admin'`) to granular capability checks (`requirePermission("resource:action")`).

**Blocked by:** 02: Authorization Engine, Cached Permission Resolver & Privilege Guards

**Status:** ready-for-agent

- [ ] Update Question Bank and Category actions to check `question_banks:*` and `question_categories:*` permissions.
- [ ] Update Exam Package and Exam Question Composition actions to check `exams:*` and `exams:questions_manage` permissions.
- [ ] Update Exam Schedule and Eligibility actions to check `exam_schedules:*` and `eligibility:manage` permissions.
- [ ] Update Participant and User management actions to check `users:*` and `user_groups:*` permissions.
- [ ] Update Manual Grading and Scoring actions to check `grading:*` permissions.
- [ ] Update System Settings actions to check `system_settings:*` permissions.
- [ ] Unit test suites updated and passing for each modified domain Server Action module.
