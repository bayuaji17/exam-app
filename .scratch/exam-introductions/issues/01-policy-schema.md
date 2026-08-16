# 01 — Content policy and schema

**Status:** done

**Blocked by:** None — can start immediately.

## What to build

- `INTRODUCTION_POLICY` in `lib/content-policy/policy.ts` (+ name union, nodes, marks); `sanitizeIntroductionHtml` tag set in `sanitize.ts`; index exports.
- `exam_schedule.introduction` jsonb nullable; migration 0012.
- Unit tests: policy accept/reject matrix (no image/math/table), sanitizer allowlist.

## Definition of done

- Migration applied; policy + sanitizer unit-tested.
