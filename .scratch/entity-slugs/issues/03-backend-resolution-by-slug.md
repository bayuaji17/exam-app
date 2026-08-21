# 03 — Backend resolution by slug

**What to build:** the server side of slug resolution. Each entity gains a `getBySlug` that
returns exactly what the existing id-based detail lookup returns (null when unknown). Create
actions compute the slug from the name; update/rename actions regenerate the slug with dedup;
both keep the id as the internal key. Unknown slugs surface as a friendly not-found, never a
crash. All covered by unit tests.

**Blocked by:** 02 — Schema & migration: unique slug columns

**Status:** done

- [x] `getQuestionBankBySlug`, `getParticipantGroupBySlug`, `getExamScheduleBySlug`,
      `getExamPackageBySlug` return the same shape as their `ById` counterparts, or null.
- [x] Create actions set the initial slug from the name (unique, deduped).
- [x] Update actions regenerate the slug when the name changes (unique, deduped), so the URL
      follows the title.
- [x] Slug collision on update is resolved by dedup, never by a raw constraint error.
- [x] Unit tests: resolution by slug, rename regeneration, dedup on collision, unknown slug → null.
