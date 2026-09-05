# 06 — Integration, E2E & Fast Gate Verification

**What to build:**
1. Integration tests covering the entire multi-session exam security flow:
   - Token validation, brute force rate-limiting, and cooldown.
   - Starting an attempt and binding `startedSessionId`.
   - Foreign session blocked on list, intro, and attempt runner.
   - Same-session reload resuming smoothly.
   - Orphaned session auto-takeover upon session deletion.
   - Single active exam database constraint preventing concurrent tabs.
   - Pre-write deadline rejection and auto-finalization.
2. Fast gate validation:
   `pnpm run lint && pnpm run typecheck && pnpm run test:unit && pnpm run build`.

**Blocked by:** 01 through 05

**Status:** done

- [x] Write integration unit tests in `__test__/unit/attempt-session-pinning.test.ts`.
- [x] Run and pass Fast Gate (`lint`, `typecheck`, `test:unit`, `build`).
