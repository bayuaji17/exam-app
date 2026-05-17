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
| Components | PascalCase | `ExamCard.tsx` |
| Non-component files | kebab-case | `exam-utils.ts` |
| Folders | kebab-case | `bank-questions/` |
| Variables/functions | camelCase | `getExamById` |
| Global constants | SCREAMING_SNAKE | `MAX_EXAM_DURATION` |
| Types/Interfaces | PascalCase | `ExamResult` |

## Folder Structure
- `app/`: Next.js App Router routes, layouts, pages, and global CSS.
- `components/`: app-specific reusable React components.
- `components/ui/`: shadcn/ui primitives only.
- `hooks/`: reusable client hooks.
- `lib/`: shared utilities, constants, helpers, and non-React code.
- `lib/fonts/`: local font files.
- `lib/types/`: shared global TypeScript types and interfaces.
- `public/`: static assets served directly by Next.js.
- `docs/`: project documentation and notes.

## Prohibited
- Do not edit generated or dependency folders such as `.next/`, `node_modules/`, or build output.
- Do not put business logic inside `components/ui`.
- Do not add new UI libraries, icon libraries, styling systems, or state managers without explicit approval.
- Do not use inline styles or raw color values in components when a theme token exists.
- Do not add global keyboard shortcuts, global listeners, or localStorage persistence without a clear product need.
- Do not commit secrets, tokens, passwords, private keys, or hardcoded credentials.
- Do not run destructive git commands unless the user explicitly requests them.
