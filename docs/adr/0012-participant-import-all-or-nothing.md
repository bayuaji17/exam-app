# Bulk participant import is all-or-nothing with dedupe-by-email and generated credentials

Bulk participant import creates `user`-role accounts from an uploaded `.xlsx` in two phases: a dry-run that validates every row and lists all errors, then an explicit apply that runs in a single transaction — any invalid row disables the Import button and any runtime failure rolls the whole batch back. A batch is never partially applied, which keeps account creation atomic and the audit trail clean.

Deduplication is by email, lowercased: an email that already exists in the database — or appears twice in the file — marks the row invalid, and existing accounts are never overwritten. Passwords follow the template: rows may provide one (≥ 8 characters), otherwise the import generates a cryptographically random password that is shown once in the result report for distribution and never stored in plaintext (accounts are created the same way the seed script does: `hashPassword` into the credential account row).

Group assignment is by name; referenced groups must already exist, so typo'd group names are caught by the dry-run rather than silently creating new groups. Every import is recorded in `participant_import` (admin, file name, counts, timestamp) so bulk account creation is traceable, even though the history view itself is a later slice.

We rejected apply-valid-skip-invalid semantics (a silent partial batch hides data problems and makes the audit record ambiguous), upsert-by-email (silently changing existing accounts is dangerous), and implicit group creation (spelling mistakes should fail loudly, not invent groups).
