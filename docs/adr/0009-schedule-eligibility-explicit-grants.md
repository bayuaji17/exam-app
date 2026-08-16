# Schedule eligibility is explicit grants

Eligibility for an exam attaches to the schedule — the runnable unit with a window — not to the package (the content source) or to a rule engine. Access is granted explicitly through two grant types, individual participants and participant groups, with union semantics: a participant is eligible when directly granted or a member of a granted group. The default is deny: a schedule with no grants is open to nobody, and this cannot be changed without an explicit decision.

Only accounts with role `user` are eligible subjects, and banned accounts are never eligible, at picker time and at query time. Grants are stored in two tables — `schedule_user_eligibility` and `schedule_group_eligibility` — rather than a single type-tagged table, so both foreign keys are enforced by the database and duplicates are impossible per pair.

We rejected package-level eligibility (the same package scheduled twice should be able to have different audiences), "open to all" modes (deny-by-default keeps access auditable), nested groups (transitive membership complicates the eligibility query and adds nothing for the current participant model), and a general rule engine (there is no rule vocabulary beyond users and groups yet; the explicit-grant model is the simplest thing that covers the documented requirements — participant lists, groups, and exam periods).

Eligibility enforcement itself is deferred to the attempt domain (v0.8), which will consume the single `isUserEligibleForSchedule` check; this slice provides the check, the admin management UI, and the computed-participant preview.
