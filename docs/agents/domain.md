# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

## Before exploring, read these

- **`docs/AGENT_CONTEXT.md`** — the project overview: domain summary, question types, scoring models. This repo's context lives here rather than at the root.
- **`CONTEXT.md`** at the repo root — the domain glossary, once `/domain-modeling` creates it.
- **`docs/adr/`** — read ADRs that touch the area you're about to work in.

If any of these files don't exist, **proceed silently**. Don't flag their absence; don't suggest creating them upfront. The `/domain-modeling` skill (reached via `/grill-with-docs` and `/improve-codebase-architecture`) creates them lazily when terms or decisions actually get resolved.

`docs/AGENT_CONTEXT.md` and `CONTEXT.md` are different artifacts and not interchangeable: the first is a narrative overview, the second is a term-by-term glossary. Read whichever exists.

## File structure

This is a single-context repo:

```
/
├── CONTEXT.md            # glossary (created lazily by /domain-modeling)
├── docs/
│   ├── AGENT_CONTEXT.md  # project overview
│   └── adr/              # architecture decision records
└── app/ components/ lib/
```

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in `CONTEXT.md`. Don't drift to synonyms the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, that's a signal — either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/domain-modeling`).

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding:

> _Contradicts ADR-0007 (event-sourced orders) — but worth reopening because…_
