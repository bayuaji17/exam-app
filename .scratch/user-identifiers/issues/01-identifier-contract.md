# 01 — Identifier contract

**What to build:** the shared contract for the identifier feature — the four unique
identifier fields (NISN, NIS, NIP, kode paket ujian), their validation rules, the
`identifierTaken` check signature, and the nomor peserta generation rule. Both sides code
against this: the backend implements the checks and generation; the frontend validates
forms with the same schemas.

**Blocked by:** None — can start immediately.

**Status:** done

- [ ] `IdentifierField` type: `"nisn" | "nis" | "nip" | "kodePaket"`.
- [ ] Zod schemas published and shared: NISN integer exactly 10 digits; NIS trimmed string
      3–20 chars; NIP trimmed string 3–20 chars; kodePaket trimmed string 3–20 chars.
- [ ] `identifierTaken` signature declared (field, value, excludeId?) → Promise<boolean>,
      DB-backed implementation left to the backend ticket.
- [ ] `generateNomorPeserta(kodePaket)` → `{kodePaket}-{random}`: 4–8 crypto-random
      uppercase alphanumeric characters, excluding `0/O/1/I`; deterministic length range.
- [ ] Unit tests: schema rules (lengths, digits, trim), nomor peserta format + charset +
      length range, uniqueness of generated suffixes over a sample run.
