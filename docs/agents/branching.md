# Branching Strategy

This project uses a **three-long-lived-branch** workflow with short-lived feature branches:

```
main ──▶ staging ──▶ dev ──▶ <type>/<slug>  (feature branches)
   ▲         ▲         ▲
   └─────────┴─────────┘  (back-merges / hotfixes)
```

All code is committed on short-lived `docs/`, `feat/`, `fix/`, `refactor/`, `perf/`, `test/`,
`build/`, `ci/`, `chore/`, or `hotfix/` branches and promoted upward through the three long-lived branches.

## 1. Long-lived branches

| Branch   | Role                                   | Written only by                          | Direct commits |
|----------|----------------------------------------|------------------------------------------|----------------|
| `main`   | **Production** — always stable         | promotion from `staging`, or a `hotfix/`  | never          |
| `staging`| **Release candidate** — pre-production verification | promotion from `dev`, or a hotfix merge | never |
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

Slugs are **kebab-case**, matching the project naming rules in `AGENTS.md`.

### The branch-name ↔ issue-link rule

A branch for a feature **must** use the same slug as its `.scratch/` directory:

```
.scratch/question-banks/   ↔   feat/question-banks
.scratch/session-pinned/   ↔   feat/session-pinned
```

The `/code-review` skill resolves a branch's spec by matching the branch name against
`.scratch/`. The same `.scratch/<slug>` name must be used consistently across `to-spec`,
`to-tickets`, the branch, and the merge commit.

## 3. Merge workflow (feature → production)

```
                    squash              merge commit        merge commit        tag
feat/question-banks ──────▶ dev ──────────────▶ staging ──────────────▶ main ──▶ v0.2.0
                                │                    │                     │
                                └── 1 commit per     └── SHAs preserved    └── semver
                                    feature
```

| Hop                        | Merge method | Why |
|----------------------------|--------------|-----|
| feature branch → `dev`     | **squash**   | clean history; `dev` history reads as a changelog |
| `dev` → `staging`          | **merge commit** | SHAs preserved so `git branch --contains` stays truthful |
| `staging` → `main`         | **merge commit** | SHAs preserved across the release boundary |
| `hotfix/<slug>` → `main`   | squash        | then immediately back-merge `main` into `dev` and `staging` |

**Why merge commits on `staging`/`main` and not squash or rebase:** if promotion PRs rewrite
SHAs, the three branches permanently diverge and every later promotion PR shows phantom
conflicts and duplicated commits. Preserving SHAs means `git branch --contains <sha>`
truthfully answers "is this in production yet?"

**Hotfix back-merge is mandatory.** A hotfix goes to `main` directly, but the fix must also land
in `dev` and `staging` — otherwise the next promotion from `dev` silently reverts the
production fix. After a hotfix merges to `main`:

```bash
git checkout dev && git merge main
git checkout staging && git merge main
```

## 4. Single-Branch Feature Workflow (1 Feature = 1 Branch)

Each feature slice is developed completely on a single short-lived branch (`feat/<slug>`)
branched directly off the latest `dev`:

1. Create and checkout the branch:
   ```bash
   git checkout dev && git pull
   git checkout -b feat/<slug>
   ```
2. Implement all vertical layers on this single branch:
   - Types & validation schemas (Zod)
   - DB schema & Drizzle migrations (`drizzle-kit generate` / `pnpm run db:migrate`)
   - Backend queries & Server Actions
   - Frontend UI components, pages, forms
   - Vitest unit & component tests in `__test__/unit/`
3. Verify via the **Fast Gate**:
   ```bash
   pnpm run lint && pnpm run typecheck && pnpm run test:unit && pnpm run build
   ```
4. Push and open a Pull Request targeting `dev`. Squash merge upon review.
5. When ready for release:
   - Open a `dev → staging` PR (merge commit). Merge.
   - Open a `staging → main` PR (merge commit). Merge.
   - Tag `main` with a semver tag (`git tag -a vX.Y.Z -m "..." && git push origin vX.Y.Z`).

## 5. Pull Requests

**Required** into `dev`, `staging`, and `main` — always.

### PR body template

```markdown
## What
<one-paragraph summary>

## Ticket
.scratch/<slug>/spec.md or issues/NN-<slug>.md

## Local validation
- [x] pnpm run lint
- [x] pnpm run typecheck
- [x] pnpm run test:unit
- [x] pnpm run build

## Notes
<risks, follow-ups, anything reviewers should look at>
```

## 6. Local Validation Gates

All validation runs **locally** — there are deliberately no GitHub Actions in this repo to keep Actions quota at zero.

### Fast Gate — standard gate for all PRs and promotions

```bash
pnpm run lint && pnpm run typecheck && pnpm run test:unit && pnpm run build
```

This gate runs quickly (<30 seconds) and covers:
- **Linting:** ESLint rules and syntax checks
- **Types:** Full TypeScript compiler verification (`tsc --noEmit`)
- **Unit & Component tests:** Vitest unit test suite
- **Build:** Next.js production build verification

### E2E Tests (Optional & On-Demand)

End-to-End browser tests in `__test__/e2e/` (`pnpm run test:e2e`) are kept in the codebase for optional regressions or deep verification, but are **not** required to block regular feature PRs or release promotions.
