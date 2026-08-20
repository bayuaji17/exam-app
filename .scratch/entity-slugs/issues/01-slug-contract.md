# 01 — Slug contract

**What to build:** the shared contract for human-readable detail URLs across the four
slugged entities — question bank, participant group, exam schedule, exam package. Defines the
slugify rules, the unique-slug guarantee, the per-entity `getBySlug` resolution signature
(same return shape as the existing id-based detail lookups), and the URL pattern
`/{entity}/{slug}`. Slugs are derived from the entity name, are **unique**, and are
**regenerated when the name changes** (with a `-2`/`-3` … dedup suffix on collision). The
database id stays the internal primary key; URLs stop exposing ids.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] `slugify(name)` published as a pure shared utility: lowercase, trim, spaces → hyphens,
      strip non-alphanumeric (non-ASCII → transliterated or removed), safe max length.
- [ ] Unique-slug helper `ensureUniqueSlug(base, taken: (slug) => Promise<boolean>)` that
      appends `-2`, `-3`, … until unused; handles empty input (falls back to a neutral slug).
- [ ] Per-entity `getBySlug(slug)` signature defined — returns the same detail shape as the
      id-based lookup, or null when the slug is unknown.
- [ ] URL pattern documented for all four entities and their nested routes (detail, edit,
      nested question/schedule sub-pages, public exam URL). Id never appears in a user-facing URL.
- [ ] Rename-regeneration behaviour specified: rename recomputes the slug and re-dedups.
- [ ] Unit tests cover slugify edge cases (empty, collisions, non-ASCII, long names).
