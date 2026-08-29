# 05 — Waiting Room, Token Form, Live Countdown & Locked Device UI

**What to build:**
1. Waiting Room interface on `/exam/[slug]`:
   - Rich-text exam rules and timing information.
   - Inline **Token Ujian** input form with live validation and cooldown countdown feedback.
   - Live countdown timer displaying remaining time until `startsAt`.
   - "Mulai Ujian" button disabled until `startsAt` is reached AND token is verified.
2. Locked Device UI & Status Badges:
   - `/exam` list: Exam card button disabled with locked badge (*"Sedang Dikerjakan di Perangkat Lain"* or *"Sesi Ujian Aktif Lain"*).
   - `/exam/[slug]`: Warning banner when locked to another active device or another exam is in-progress.
   - `/exam/[slug]/attempt`: Locked device error card replacing questions if opened from a foreign active session.
3. Schedule management UI: Token display and regenerate button in `/dashboard/exam-schedules`.

**Blocked by:** 02 — Token Verification, 03 — Session Pin Guard, 04 — Deadline Clamping

**Status:** done

- [x] Build Waiting Room token form & countdown component on `/exam/[slug]`.
- [x] Add locked device badges and banners across `/exam` and `/exam/[slug]`.
- [x] Add locked device error view on `/exam/[slug]/attempt`.
- [x] Add token display and regeneration button in `/dashboard/exam-schedules`.
- [x] Component & interaction unit tests.
