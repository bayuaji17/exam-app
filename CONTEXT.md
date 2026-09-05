# Exam Application

An online examination platform where administrators author question banks, compose exam packages, run exam sessions, and score participants under three distinct scoring models. This context covers the authoring domain (banks, questions, answers, media), its lifecycle rules, schedule eligibility (participant groups and grants), access control & dynamic roles (RBAC), and attempts (resumable participant runs with server-authoritative deadlines); the grading and reporting domain (manual grading, results, reports) is a future context.

## Language

### Question Authoring

**Question Bank**:
A container that owns a set of questions and is eligible for use in exam packages.
_Avoid_: Bank, question bank only, "soal" alone

**Question**:
A single testable item owned by exactly one question bank. Its type is fixed at creation.
_Avoid_: Item, quiz, "soal"

**Question Type**:
The scoring model of a question, chosen at creation and never changed afterward. One of: Single-Choice, Score-Based, Manual-Graded.
_Avoid_: Scoring model, tipe, "jenis soal"

**Single-Choice Question**:
A question with exactly one correct answer option; it is scored automatically.
_Avoid_: Multiple choice, benar/salah, right/wrong question

**Score-Based Question**:
A question whose answer options each carry a score and no correct answer; the result is the score of the option the participant chose.
_Avoid_: Scored question, psychometric item, "berbasis skor"

**Manual-Graded Question**:
A question with no answer options; an administrator grades the participant's response by hand.
_Avoid_: Open question, essay

**Prompt**:
The question's askable content. Prompts support the full rich-text capability: paragraphs, headings, inline formatting, lists, blockquotes, code blocks, links, images, tables, and mathematics.
_Avoid_: Text, stem, "pertanyaan"

**Answer**:
The content an author provides for responding to a question. Answers are restricted to text and images; rich-text nodes beyond paragraphs, inline formatting, and images are not allowed.
_Avoid_: Response, option text, "jawaban"

**Answer Option**:
One selectable answer belonging to a Single-Choice or Score-Based question. In Single-Choice questions an option carries correctness; in Score-Based questions it carries a score.
_Avoid_: Choice, answer, "opsi jawaban"

**Question Category**:
A shared label used to classify and search questions across banks. Categories are global and can be created inline while authoring.
_Avoid_: Tag, label, subject

**Content Policy**:
The rules defining what a prompt or an answer may contain. The prompt and answer policies are separate, and the editor, the save-time validator, and the render-time sanitizer all derive from the same policy definitions.
_Avoid_: Schema, allowlist, rich-text spec

### Media

**Media Object**:
A physical media file (image) owned by a question and stored in object storage.
_Avoid_: Attachment, asset, file

**Media Reference**:
The pointer to a media object embedded inside content (prompt or answer). References describe what content currently uses; they do not establish ownership.
_Avoid_: URL, embed, image tag

**Media Ownership**:
The record that determines which question owns a media object and drives its lifecycle — creation, deletion, auditing, and recovery. Ownership and references are separate concepts: content references media, ownership controls it.
_Avoid_: Media table, upload record

### Lifecycle

**Archive**:
A reversible, read-only state. Archived content cannot be edited or used in exam packages until restored. Archiving a question bank archives its active questions; restoring it restores the questions archived as a consequence, but not questions archived independently.
_Avoid_: Disable, hide, soft-delete

**Restore**:
The action of returning archived content to the active state.
_Avoid_: Unarchive, enable

**Delete**:
The terminal action, available only for content already in the archived state.
_Avoid_: Remove, destroy, hard-delete

**Eligibility**:
The rule that only questions whose bank is active and that are themselves active may be used in exam packages. Eligibility is enforced at the query level, not merely in the interface.
_Avoid_: Availability, usable questions

### Participation

**Participant**:
A person who takes exams, represented by an account with role `user`. Participants belong to the examination domain, not the authoring domain.
_Avoid_: User, test-taker, peserta

**Participant Group**:
A flat, reusable collection of participants used to grant exam eligibility. A participant may belong to many groups.
_Avoid_: Cohort, kelas, "grup user"

**Eligibility**:
The grant that allows a participant to take a scheduled exam. Eligibility is explicit, per schedule, and deny by default; a participant is eligible when directly granted or a member of a granted group.
_Avoid_: Access, permission, "hak ujian"

**Grant**:
One eligibility entry — an individual participant or a participant group — attached to a schedule.
_Avoid_: Rule, assignment

### Access Control & Roles (RBAC)

**System Role**:
An immutable, built-in role essential for system operation (`super-admin` and default `user`). System roles cannot be renamed or deleted. `super-admin` bypasses all permission checks.
_Avoid_: Hardcoded role, admin type

**Custom Role**:
A dynamic, database-defined role created and managed by Super Admins. Each custom role is associated with a distinct set of permissions.
_Avoid_: Dynamic role, user level, jabatan

**Permission**:
An atomic, discrete authorization capability defined in code with the canonical format `resource:action` (e.g. `question_banks:create`, `exams:questions_manage`). Permissions are immutable in code; their assignment to roles is dynamic in the database.
_Avoid_: Hak akses, menu access, capability, privilege

**Role Assignment**:
The association granting one or more roles to a user account via a many-to-many relationship. A user's effective permissions are the union of permissions across all their assigned roles.
_Avoid_: User role column, role change

**Privilege Escalation Guard**:
The domain invariant preventing any actor (even with `roles:assign` or `roles:update`) from assigning or modifying the `super-admin` role, or granting permissions beyond their own authority.
_Avoid_: Superadmin check, role lock

### Attempt

**Attempt**:
A participant's recorded run of an exam: a server-side, resumable record with a stored deadline, a snapshotted question order, and per-question answers in the database. One open attempt per participant per schedule; every attempt is kept for the audit trail. Attempts will own their own media lifecycle (attempt media) with participant-specific upload policies.
_Avoid_: Session, submission, pengerjaan

**Open Attempt**:
An attempt that has been started but not submitted, still resumable until its deadline. Starting while an open attempt exists resumes it instead of creating a new one.
_Avoid_: Active attempt, draft

**Attempt Limit**:
The maximum number of attempts a participant may have on one schedule; `0` (or unset) means unlimited. Enforced by counting attempt rows, never by deleting them.
_Avoid_: Max attempts, retake limit, "batas ulang"

**Deadline**:
The server-authoritative end time of an attempt: started time plus the resolved duration (schedule minutes, else package minutes, else no deadline). The client countdown only displays it; an attempt whose deadline passes is finalized with whatever answers exist.
_Avoid_: Timer, countdown, "waktu habis"

**Manual Grade**:
The score an administrator gives to a manual-graded question's answer, bounded by the question's points weight and recorded on the answer row with the grader and time. The attempt total is the sum of all auto scores and all manual scores; grading is editable.
_Avoid_: Nilai, assessment, "nilai esai"

**Import**:
Bulk creation of participant accounts from an uploaded `.xlsx`, all-or-nothing: the dry-run validates every row, the apply runs in one transaction, emails are deduplicated (never overwritten), missing passwords are auto-generated and shown once, and each import is recorded for audit.
_Avoid_: Upload, batch, "impor massal"

**Introduction**:
The per-schedule rich-text document shown on the participant intro page (rules, timing notes, contact information), governed by its own content policy (no images, math, or tables) and falling back to default text when unset.
_Avoid_: Instruksi, briefing, "intro"

**Exam Session Token**:
An administrator-configured or auto-generated alphanumeric authorization code required for a participant to unlock an exam session. Tokens are validated server-side, rate-limited against enumeration attacks, and expire strictly at the schedule end time.
_Avoid_: Password ujian, PIN soal, schedule key, OTP

**Session Pinning**:
The domain security invariant binding an open attempt to a single active authenticated session (`startedSessionId`). It blocks concurrent multi-device logins and prevents mid-exam device hopping by disallowing sign-out during an open attempt, while allowing same-device reloads seamlessly.
_Avoid_: Device binding, hardware lock, MAC address lock

**Session Takeover**:
The controlled, audited protocol allowing a participant to recover an ongoing attempt on a new device after a legitimate crash or session loss, requiring token re-verification, explicit confirmation, atomic force-revocation of the old session, and an audit trail entry.
_Avoid_: Auto-reclaim, session steal, device swap

**Active Exam Invariant**:
The database-enforced constraint (via a partial unique index `WHERE "submittedAt" IS NULL`) guaranteeing that a participant holds at most one open attempt across all schedules in the system at any given moment.
_Avoid_: Single exam rule, concurrent attempt lock

**Waiting Room**:
The pre-exam staging interface presented to the participant displaying rules, token entry and validation, and a live countdown to the scheduled start time (`startsAt`).
_Avoid_: Ruang tunggu, lobby, pre-exam screen

**Submission Type**:
The immutable audit indicator recording whether an attempt was submitted manually by the participant (`participant`) or finalized automatically by server-authoritative deadline expiration (`system`).
_Avoid_: Tipe submit, status submit

### Future domains
