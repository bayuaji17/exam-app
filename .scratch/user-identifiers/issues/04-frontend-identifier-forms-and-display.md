# 04 — Frontend: identifier forms, import mapping, and nomor peserta display

**What to build:** the user-facing side. The user create form is role-conditional
(participant → NISN required + NIS optional; admin → NIP required); the edit page renders
the applicable fields with debounced "already in use" feedback from the check action
(excluding self). The package form gains kodePaket (required). The participant import
template gains `NISN` / `NIS` columns. The attempt page and result page show the nomor
peserta.

**Blocked by:** 02 — Schema & migration: identifier columns
*(develops in parallel with 03 — Backend, against the contract + mock)*

**Status:** ready-for-review

- [x] Create-user form renders NISN+NIS for participants, NIP for admins, with the shared
      schemas from the contract.
- [x] Edit-user page renders the applicable fields; debounced unique check shows
      "sudah digunakan." messages, excluding the edited user.
- [x] Package form has kodePaket (required, 3–20, unique check).
- [x] Import template + preview show NISN (required) and NIS (optional) columns.
- [x] Attempt page and result page display the nomor peserta.
