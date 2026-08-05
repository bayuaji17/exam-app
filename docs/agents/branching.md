# Branching Strategy

This project uses a **three-long-lived-branch** workflow with short-lived feature branches:

```
main ──▶ staging ──▶ dev ──▶ <type>/<slug>  (feature branches)
   ▲         ▲         ▲
   └─────────┴─────────┘  (back-merges / hotfixes)
```

All code is committed on short-lived `docs/`, `feat/`, `fix/`, `refactor/`, `perf/`, `test/`,
`build/`, `ci/`, `chore/`, `hotfix/`, or `research/` branches and promoted upward through the
three long-lived branches.

## 1. Long-lived branches

| Branch   | Role                                   | Written only by                          | Direct commits |
|----------|----------------------------------------|------------------------------------------|----------------|
| `main`   | **Production** — always stable         | promotion from `staging`, or a `hotfix/`  | never          |
| `staging`| **Release candidate** — production-build E2E + UAT, run locally (§11) | promotion from `dev`, or a hotfix merge | never |
| `dev`    | **Integration** — all work merges here | squash merges of short-lived branches     | never          |

Rules that keep the three branches from drifting apart:

- **`staging` is never committed to directly.** It only ever receives a promotion from `dev`
  (or a hotfix back-merge). If it needs changes that aren't on `dev`, fix them on `dev` first
  and re-promote.
- **`main` is never committed to directly.** It only receives a promotion from `staging`, or a
  `hotfix/` merge.
- **Every merge into a long-lived branch is a Pull Request.** No local merge, no direct push,
  no force-push.

## 2. Branch naming

Prefixes follow Conventional Commits (same vocabulary as `AGENTS.md` → Commit Rules) so a
branch name and its eventual commit type always agree:

| Prefix      | Use                                   | Implied commit type |
|-------------|---------------------------------------|---------------------|
| `feat/`     | new user-facing capability            | `feat`              |
| `fix/`      | bug fix                               | `fix`               |
| `hotfix/`   | urgent production fix, branches from `main` | `fix`          |
| `refactor/` | restructuring with no behaviour change | `refactor`          |
| `perf/`     | performance work                      | `perf`              |
| `test/`     | test-only changes                     | `test`              |
| `docs/`     | documentation only                    | `docs`              |
| `build/`    | dependency or bundler changes         | `build`             |
| `ci/`       | pipeline changes                      | `ci`                |
| `style/`    | formatting only                       | `style`             |
| `chore/`    | maintenance                           | `chore`             |
| `research/` | throwaway spike (used by `/wayfinder`) | n/a — never merged  |
| `release/`  | optional release stabilisation        | n/a                 |

Slugs are **kebab-case**, matching the project naming rules in `AGENTS.md`.

### The branch-name ↔ issue-link rule (important)

A branch for a feature **must** use the same slug as its `.scratch/` directory:

```
.scratch/question-banks/   ↔   feat/question-banks
.scratch/session-lock/     ↔   fix/session-lock
```

The `/code-review` skill resolves a branch's spec by matching the branch name against
`.scratch/`. When the two diverge, spec review silently degrades to standards-only review. The
same `.scratch/<slug>` name must be used consistently across `to-spec`, `to-tickets`, the
branch, and the merge commit.

## 3. Merge workflow (feature → production)

```
                    squash              merge commit        merge commit        tag
feat/question-banks ──────▶ dev ──────────────▶ staging ──────────────▶ main ──▶ v0.2.0
                                │                    │                     │
                                └── 1 commit per      └── SHAs preserved   └── semver
                                    ticket
```

| Hop                        | Merge method | Why |
|----------------------------|--------------|-----|
| feature branch → `dev`     | **squash**   | one commit per ticket; `dev` history reads as a changelog |
| `dev` → `staging`          | **merge commit** | SHAs preserved so `git branch --contains` stays truthful |
| `staging` → `main`         | **merge commit** | SHAs preserved across the release boundary |
| `hotfix/<slug>` → `main`   | squash        | then immediately back-merge `main` into `dev` and `staging` |

**Why merge commits on `staging`/`main` and not squash or rebase:** if promotion PRs rewrite
SHAs, the three branches permanently diverge and every later promotion PR shows phantom
conflicts and duplicated commits. Preserving SHAs means `git branch --contains <sha>`
truthfully answers "is this in production yet?"

**Hotfix back-merge is mandatory.** A hotfix goes `main` directly, but the fix must also land
in `dev` and `staging` — otherwise the next promotion from `dev` silently reverts the
production fix. After a hotfix merges to `main`:

```bash
git checkout dev && git merge main
git checkout staging && git merge main
```

## 4. Release workflow

1. Tickets land in `dev` via squashed PRs until the slice is complete.
2. Open a **`dev → staging`** PR. Run the **release gate** (§11): build the app in production
   mode, run E2E against that build, and complete the manual UAT pass.
3. Open a **`staging → main`** PR. Merge when green.
4. Tag `main` with a semver tag. Tags, not branch commits, are the release markers:

   ```bash
   git checkout main && git pull
   git tag -a v0.2.0 -m "Release v0.2.0"
   git push origin v0.2.0
   ```

5. If anything was fixed on `main`, back-merge `main → dev` (and `staging`).

## 5. Pull Requests

**Required** into `dev`, `staging`, and `main` — always, no exceptions once protection is on.
A PR into `dev` for a solo developer is not about review: it is the only place validation can
gate a merge.

**Not required** for commits on your own short-lived branch — push freely there.

**`research/*` branches are never merged and never PR'd.** They are deleted after their
findings are harvested into the wayfinder map.

### PR guidelines

- One logical unit per PR. Prefer one ticket per PR.
- Title: `<type>(scope): <summary>` — same shape as commit messages.
- Body: link the ticket (`Closes #NN` or the `.scratch/<slug>` path), describe the change, and
  list anything reviewers should pay attention to.
- **Paste the local validation results into the PR body.** With no CI (§6), this is the only
  record that checks were run.
- Keep the diff small. If a PR grows unwieldy, split it into two tickets (see §9).

### PR body template

```markdown
## What
<one-paragraph summary>

## Ticket
.scratch/<slug>/issues/NN-<slug>.md

## Local validation
- [ ] pnpm run lint
- [ ] pnpm run typecheck
- [ ] pnpm run test:unit
- [ ] pnpm run build
- [ ] pnpm run test:e2e            (dev-mode E2E)
- [ ] release gate §11: production build + E2E + UAT   (required for dev → staging → main)

## Notes
<risks, follow-ups, anything reviewers should look at>
```

## 6. Branch protection

This repo is **public on the Free plan**, so branch protection rules and rulesets are
available. There is deliberately **no CI**, so the "required status checks" column cannot be
used — validation is local (§8) and enforced by discipline, not by GitHub.

### 6.1 Settings to apply now

| Setting                      | `main`  | `staging` | `dev`   |
|------------------------------|---------|-----------|---------|
| Require pull request         | yes     | yes       | yes     |
| Required approvals           | **0**   | **0**     | **0**   |
| Dismiss stale approvals      | yes     | yes       | no      |
| Required status checks       | — (no CI) | — (no CI) | — (no CI) |
| Require conversation resolution | yes  | yes       | no      |
| Require branches up to date  | yes     | yes       | yes     |
| Require linear history       | **no**  | **no**    | yes     |
| Block force push             | yes     | yes       | yes     |
| Block deletion               | yes     | yes       | yes     |
| Allow admin bypass           | no      | no        | yes (escape hatch) |
| Auto-delete head branches    | **repo-wide setting: on** |  |         |

Merge methods are a **repository-level** setting (Settings → General → Pull Requests). Enable
both "Allow merge commits" and "Allow squash merging"; disable "Allow rebase merging". Which
method to use per hop is a convention from §3, not something GitHub enforces per branch on
this plan.

**The `staging` gate is procedural.** There is no staging server and no CI, so nothing GitHub
can verify about a `dev → staging` PR — it will merge just as happily whether or not the
release gate was run. The gate is exactly as real as the discipline behind it. Record the
§11 results in the PR body so there is at least an audit trail.

Rationale:

- **Required approvals stay at 0.** GitHub will not let you approve your own PR, so a solo dev
  setting 1 just trains themselves to click "bypass". Raise to 1 the day a second developer
  joins.
- **No linear history on `staging`/`main`.** It forbids the merge commits that preserve SHAs
  (§3). Linear history is enabled on `dev`, where squash keeps things linear anyway.
- **No required status checks.** Nothing to require — see §8. This is the deliberate trade for
  zero Actions quota: the PR gate is procedural, so **the local checks in §8 are mandatory**,
  not advisory.
- **Auto-delete head branches: on.** Short-lived branches are deleted after merge; nobody
  should keep them around.

### 6.2 What to add if CI is introduced later

Add these required status checks to `dev`, `staging`, and `main`:
`lint`, `typecheck`, `test:unit`, `build` — plus `test:e2e` on `staging` and `main` only, since
E2E needs a database and a running server, and is too slow and brittle for every feature merge.
Raise required approvals from 0 to 1 at the same time if a second developer has joined.

## 7. Integration with the AI Agent workflow

The skills write issues and code but **never create branches**. Branch creation happens at
implementation time, per the rules in `AGENTS.md`.

| Skill              | Branch behaviour                                                          |
|--------------------|---------------------------------------------------------------------------|
| `domain-modeling`  | Writes `CONTEXT.md` + `docs/adr/` on a `docs/domain-model` branch.        |
| `to-spec`          | Writes `.scratch/<slug>/spec.md`. Same branch as the feature, or a `docs/<slug>-spec` branch when speccing ahead. |
| `to-tickets`       | Writes `.scratch/<slug>/issues/NN-*.md`. **Creates no branches** — tickets are files. |
| `wayfinder`        | Uses `research/<name>` branches for throwaway spikes. Never merged; delete after harvesting findings into `map.md`. |
| `implement`        | **Must** create/checkout `<type>/<slug>` before committing. Never commit to a long-lived branch. |
| `qa`               | Runs on the feature branch pre-PR, and against the production build during the release gate (§11). |
| `triage`           | Sets `Status:` in `.scratch/` files. Tracker-side only; no branch impact. PR triage stays off (flag in `issue-tracker.md`). |
| `code-review`      | `git diff dev...HEAD`; matches branch slug to `.scratch/` for spec review. |

The **full ticket → branch → PR cycle**:

```
to-spec ──▶ to-tickets ──▶ git checkout -b feat/<slug> ──▶ implement
  │             │                │                             │
  └── spec.md ──┘                └── code, commits, tests      │
                                                               ▼
                                                     qa on branch
                                                               │
                                PR: feat/<slug> ──▶ dev ──▶ staging ──▶ main
```

```mermaid
sequenceDiagram
    actor Dev
    participant Scratch as .scratch/
    participant Branch as feat/&lt;slug&gt;
    participant DevB as dev
    participant Stg as staging
    participant Main as main

    Dev->>Scratch: /to-spec — write spec.md
    Dev->>Scratch: /to-tickets — write issues/NN-*.md
    Dev->>Scratch: /triage — set Status:
    Dev->>Branch: git checkout -b feat/&lt;slug&gt; (from dev)
    loop each ticket
        Dev->>Branch: /implement — code + commit
    end
    Dev->>Branch: /qa + local validation (§8)
    Dev->>DevB: PR (squash)
    Dev->>Stg: PR (merge commit) + E2E + UAT
    Dev->>Main: PR (merge commit)
    Main-->>Main: tag vX.Y.Z
```

## 8. Local validation gates

All validation runs **locally** — there are deliberately no GitHub Actions in this repo, to
keep Actions quota at zero. Two named gates:

### Fast gate — every PR into `dev`

```bash
pnpm run lint
pnpm run typecheck
pnpm run test:unit
pnpm run build
```

All four must pass before opening a PR into `dev`.

### Release gate — `dev → staging` and `staging → main`

The fast gate, plus the production-build E2E and manual UAT pass described in §11.

If the change touches the database, run `pnpm run db:migrate` first and re-run E2E.

## 9. Branch per ticket vs. branch per feature

**Default: one branch per ticket.** Tickets are vertically sliced (see `to-tickets`) so each
lands green on its own; one branch per ticket keeps PRs small and gives each a real
validation gate.

**Two exceptions:**

- **Wide refactors** (expand–contract). A mechanical change with a wide blast radius can share
  a single integration branch across its batches, per `to-tickets`. Use `refactor/<slug>`.
- **Tickets that are meaningless alone** (e.g. a schema migration whose only consumer is the
  next ticket). Share `feat/<slug>`, one commit per ticket.

When sharing a branch across tickets, name it after the feature (`feat/<slug>`), and put one
commit per ticket. Split the PR if the branch spans tickets that should be reviewed
separately.

## 10. Worked example — Bank Soal

1. `docs/domain-model` branch: run `/domain-modeling` to write `CONTEXT.md` and
   `docs/adr/` for the exam domain (three scoring models). PR into `dev`.
2. `docs/question-banks-spec` branch: run `/to-spec` → `.scratch/question-banks/spec.md`.
   PR into `dev`.
3. `feat/question-banks` branch (from latest `dev`): run `/to-tickets` to create
   `.scratch/question-banks/issues/`, then `/implement` each ticket.
4. Push `feat/question-banks`, open a squash PR into `dev`. Run the fast gate (§8) first.
5. After the slice lands: `dev → staging` PR, run the release gate (§11).
6. `staging → main` PR. Merge. Tag `v0.2.0`.

```mermaid
gitGraph
  commit
  branch dev
  checkout dev
  branch feat/question-banks
  checkout feat/question-banks
  commit
  commit
  checkout dev
  merge feat/question-banks type: SQUASH
  branch staging
  checkout staging
  merge dev type: NORMAL
  checkout main
  merge staging type: NORMAL
  tag "v0.2.0"
```

## 11. Staging without a server

There is no staging server. `staging` is a **release-candidate branch**, and the release gate
runs locally against a **production build** — not the dev server.

### Procedure

Two terminals:

```bash
# terminal 1 — build and serve the production bundle
pnpm run build
pnpm start

# terminal 2 — E2E against that production server
pnpm run test:e2e
```

### Why this works

`playwright.config.ts` sets `reuseExistingServer: !process.env.CI`. Locally `CI` is unset, so
Playwright attaches to whatever is already serving `http://localhost:3000` instead of spawning
its own `pnpm run dev`. Starting `pnpm start` first is therefore enough to redirect the whole
E2E suite at the production build, with no config change.

### Why it matters

Every E2E run so far has tested the **dev server**. Production mode differs in React Server
Component behaviour, minification, caching and revalidation, and error handling. Those
differences are invisible to the dev-mode suite, so the release gate is the only place they
get caught.

### Manual UAT pass

After E2E is green, exercise the app by hand against the same production server:

- [ ] Log in as the seeded super-admin
- [ ] `/dashboard` loads without console errors
- [ ] Sidebar renders and collapses; profile menu opens
- [ ] Sign out returns to `/login`

Grow this list per feature — each spec should add its own UAT steps rather than leaving a
checklist full of routes that do not exist yet.

### What this does not cover

The release gate tests the **artifact**, not a **deployment**. It does not cover:

- a different PostgreSQL version or managed-Postgres behaviour (e.g. Neon)
- real TLS, domains, or reverse-proxy configuration
- production environment variables and secrets
- cold starts, serverless limits, or CDN and edge caching

Treat it as roughly 70% of a real staging environment's value. When a staging server exists,
point it at the `staging` branch, deploy on promotion, and delete this section.
