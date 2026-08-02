# Project Rules

## Package Manager
- Always use pnpm for dependency and script commands.
- Do not use npm, yarn, or bun unless the user explicitly asks.

## Code Conventions
- Use TypeScript for application code.
- Prefer React Server Components by default. Add `"use client"` only when a component needs state, effects, event handlers, browser APIs, or client-only libraries.
- Keep components small, explicit, and focused on one responsibility.
- Prefer existing project utilities and components before creating new abstractions.
- Use shadcn/ui primitives from `components/ui` for shared UI building blocks.
- Keep `components/ui` limited to reusable UI primitives. Put app-specific composition in `components`.
- Use `cn()` from `@/lib/utils` for conditional class names.
- Use theme tokens from `app/globals.css` for colors, fonts, radius, and shared design values.
- Keep text and layout responsive. Avoid UI that overflows or overlaps on small screens.

## Naming Conventions
| Types | Conventions | Examples |
|---|---|---|
| Components | kebab-case | `exam-card.tsx` |
| Non-component files | kebab-case | `exam-utils.ts` |
| Folders | kebab-case | `bank-questions/` |
| Variables/functions | camelCase | `getExamById` |
| Global constants | SCREAMING_SNAKE | `MAX_EXAM_DURATION` |
| Types/Interfaces | PascalCase | `ExamResult` |

## Folder Structure
- `app/`: Next.js App Router routes, layouts, pages, route handlers, and global CSS.
- `app/(dashboard)/`: dashboard route group.
- `app/api/`: API route handlers.
- `app/login/`: login route.
- `components/`: app-specific reusable React components.
- `components/ui/`: shadcn/ui primitives only.
- `hooks/`: reusable client hooks.
- `lib/`: shared utilities, constants, helpers, and non-React code.
- `lib/db/`: Drizzle database client and schema.
- `lib/fonts/`: local font files.
- `lib/types/`: shared global TypeScript types and interfaces.
- `drizzle/`: generated Drizzle migrations and migration metadata.
- `scripts/`: project scripts such as seed/setup scripts.
- `__test__/`: test files and test artifacts.
- `__test__/unit/`: Vitest unit tests and Vitest reports.
- `__test__/e2e/`: Playwright E2E tests and Playwright reports/results.
- `public/`: static assets served directly by Next.js.
- `docs/`: project documentation and notes.

## Documentation Context
- If you do not yet have enough context about the whole application, read the relevant files in `docs/` first.
- If you already have sufficient application context from the current conversation or task, you may ignore `docs/` unless the user explicitly asks for documentation work.

## Commit Rules
- Use Conventional Commits for all commit messages.
- Format: `<type>(optional-scope): <short summary>`.
- Keep the summary imperative, lowercase when natural, and under 72 characters.
- Use a body when the reason, tradeoff, migration note, or test detail is not obvious.
- Use `!` after the type or scope for breaking changes, and include a `BREAKING CHANGE:` footer.
- Prefer these commit types:
  - `feat`: new user-facing feature or capability.
  - `fix`: bug fix.
  - `docs`: documentation-only change.
  - `style`: formatting or styling change with no behavior change.
  - `refactor`: code restructuring with no behavior change.
  - `perf`: performance improvement.
  - `test`: adding or updating tests.
  - `build`: dependency, bundler, or build-system change.
  - `ci`: CI/CD configuration change.
  - `chore`: maintenance task that does not fit another type.
  - `revert`: revert a previous commit.
- Examples:
  - `feat(auth): add login page`
  - `fix(theme): preserve selected font after refresh`
  - `test(auth): add role parsing coverage`
  - `build(test): configure playwright reports`

## Prohibited
- Do not edit generated or dependency folders such as `.next/`, `node_modules/`, or build output.
- Do not put business logic inside `components/ui`.
- Do not add new UI libraries, icon libraries, styling systems, or state managers without explicit approval.
- Do not use inline styles or raw color values in components when a theme token exists.
- Do not add global keyboard shortcuts, global listeners, or localStorage persistence without a clear product need.
- Do not commit secrets, tokens, passwords, private keys, or hardcoded credentials.
- Do not run destructive git commands unless the user explicitly requests them.

## Agent skills

### Issue tracker

Issues and specs live as markdown files under `.scratch/<feature-slug>/` in this repo. See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical roles, each label string equal to its name, recorded on a `Status:` line in the issue file. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout — project overview in `docs/AGENT_CONTEXT.md`, with the `CONTEXT.md` glossary and `docs/adr/` created lazily at the repo root. See `docs/agents/domain.md`.

@RTK.md
