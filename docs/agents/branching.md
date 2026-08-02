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
| `staging`| **Pre-Production** — E2E, UAT, release | promotion from `dev`, or a hotfix merge   | never          |
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
2. Open a **`dev → staging`** PR. Run the full local validation (see §8), then deploy staging
   and run UAT.
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
- [ ] pnpm run test:e2e   (required for dev → staging → main)

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
E2E needs a running server and a database and is too slow and brittle for every feature merge.

Rationale:

- **Required approvals start at 0.** GitHub will not let you approve your own PR, so a solo
  dev setting 1 just trains themselves to click "bypass". Raise to 1 the day a second
  developer joins.
- **No linear history on `staging`/`main`.** It forbids the merge commits that preserve SHAs
  (§3). Linear history is enabled on `dev`, where squash keeps things linear anyway.
- **E2E as a required check on `staging`/`main` only.** E2E needs a running server and a
  database — slow and brittle on every feature merge. `staging` is exactly the UAT gate where
  E2E belongs.
- **Auto-delete head branches: on.** Short-lived branches are deleted after merge; nobody
  should keep them around.

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
| `qa`               | Runs on the feature branch pre-PR, and on `staging` for UAT.               |
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

## 8. Local validation before every merge

All validation runs **locally** — there are deliberately no GitHub Actions in this repo.

```bash
pnpm run lint
pnpm run typecheck
pnpm run test:unit
pnpm run build
```

Run all four before opening a PR. For `staging`/`main` promotions, also run:

```bash
pnpm run test:e2e    # needs a running dev server and Postgres
```

If the change touches the database, run migrations and re-run `test:e2e`.

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
4. Push `feat/question-banks`, open a squash PR into `dev`. Run the four local checks first.
5. After the slice lands: `dev → staging` PR, run E2E + UAT against the staging deploy.
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
