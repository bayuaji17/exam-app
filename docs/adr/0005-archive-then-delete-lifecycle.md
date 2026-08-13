# Archive-then-delete lifecycle

Banks and questions move through a two-step lifecycle: content is archived first, and deletion is terminal and available only in the archived state. Archiving a bank archives its active questions; restoring the bank restores the questions archived as a consequence, while questions archived independently stay archived. Archived content is frozen — read-only until restored.

Eligibility — only active questions in active banks — is enforced at the query level so future exam-package selection can never pick archived content through an interface bug.
