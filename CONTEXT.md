# Exam Application

An online examination platform where administrators author question banks, compose exam packages, run exam sessions, and score participants under three distinct scoring models. This context covers the authoring domain (banks, questions, answers, media), its lifecycle rules, and schedule eligibility (participant groups and grants); the participant-facing examination domain (attempts, sessions, scoring) is a future context.

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

### Future domains

**Attempt**:
A participant's recorded run of an exam. Attempts will own their own media lifecycle (attempt media) with participant-specific upload policies; this is explicitly out of scope for the authoring domain.
_Avoid_: Session, submission, pengerjaan
