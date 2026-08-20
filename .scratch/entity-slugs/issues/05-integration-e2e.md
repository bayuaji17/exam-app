# 05 — Integration & E2E

**What to build:** the fan-in gate. Merge backend + frontend, flip mock → real, and prove the
slug feature end-to-end on a production build: slug URLs load the right entity, renaming
changes the URL and old slugs redirect/404 gracefully, duplicate names produce `-2` slugs,
and legacy id URLs redirect. Fast gate + release-gate E2E green.

**Blocked by:** 03 — Backend resolution by slug, 04 — Frontend slug URLs

**Status:** ready-for-agent

- [ ] E2E: each entity's detail page is reachable via its slug and renders the correct entity.
- [ ] E2E: renaming an entity changes the URL; visiting the old slug redirects or 404s cleanly.
- [ ] E2E: two entities with the same name resolve to distinct `-2`/`-3` slugs.
- [ ] E2E: legacy id-URL redirect works.
- [ ] Fast gate and release gate (production build + E2E) pass.
