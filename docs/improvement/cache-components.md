# Next.js Cache Components Adoption & Optimization Roadmap

This document outlines the systematic implementation plan for adopting **Next.js 16.3 Cache Components** (Partial Prerendering / PPR, granular dynamic I/O caching, and streaming de-blocking) across the Exam App dashboard and management surfaces.

---

## 1. Executive Summary & Goals

### Objectives
1. **Instant Static App Shell:** Hoist application layouts, navigation bars, breadcrumbs, and table chrome into static prerendered HTML served directly from the CDN edge cache.
2. **Granular Cached Data Queries:** Apply `"use cache"`, typed cache tags (`CACHE_TAGS`), and explicit cache lifetimes (`cacheLife`) to stable taxonomy data (question categories, packages, policy templates) and aggregated metrics (dashboard statistics).
3. **Responsive Streaming (PPR):** Replace blocking top-level database queries and request header reads in pages and layouts with `<Suspense>` boundaries paired with skeleton fallbacks.
4. **Deterministic Invalidation:** Ensure every mutation server action revalidates the exact affected cache tags (`revalidateTag(tag, "default")`) without over-invalidating unrelated subtrees.
5. **Fast Gate Verification:** Guard all changes with comprehensive Vitest unit tests and fast build gates (`pnpm run lint && pnpm run typecheck && pnpm run test:unit && pnpm run build`).

---

## 2. Invalidation Taxonomy & Typed Tags

Cache tags are centralized in `lib/cache-tags.ts`:

| Cache Tag Constant | String Tag | Scope & Entity | Revalidated On |
| :--- | :--- | :--- | :--- |
| `CACHE_TAGS.CATEGORIES` | `"categories"` | Question bank categories list & items | Category create / update / delete |
| `CACHE_TAGS.EXAM_PACKAGES` | `"exam-packages"` | Exam package blueprints & metadata | Package create / update / delete |
| `CACHE_TAGS.INTRODUCTIONS` | `"introductions"` | Exam introduction policies | Intro policy save / update |
| `CACHE_TAGS.EXAM_SCHEDULES` | `"exam-schedules"` | Scheduled exams metadata | Schedule create / update / delete |
| `CACHE_TAGS.DASHBOARD_STATS` | `"dashboard-stats"`| Admin & teacher dashboard counters | Question, exam, session completions |

---

## 3. Phased Implementation Breakdown

### Phase 1: Config & Cache Infrastructure
- [x] **Task 1.1: Enable `cacheComponents` Flag**
  - Enable `cacheComponents: true` and `experimental.exposeTestingApiInProductionBuild: process.env.EXPOSE_TESTING_API === '1'` in `next.config.mjs`.
- [x] **Task 1.2: Establish Central Cache Tags**
  - Create `lib/cache-tags.ts` exporting typed `CACHE_TAGS` object.
- [x] **Task 1.3: Run Instant False Codemod**
  - Execute `@next/codemod cache-components-instant-false ./app` to temporarily opt-out existing dynamic routes with `export const instant = false;` while systematically adopting cache components.

---

### Phase 2: Tier 1 Taxonomy & Metadata Caching
- [x] **Task 2.1: Question Categories Caching (`lib/question-banks/category-queries.ts`)**
  - Add `"use cache"` to `listCategories()` and `getCategoryById()`.
  - Attach `cacheTag(CACHE_TAGS.CATEGORIES)` and `cacheLife("days")`.
  - In `lib/question-banks/category-actions.ts`, call `revalidateTag(CACHE_TAGS.CATEGORIES, "default")` on create/update/delete.
- [x] **Task 2.2: Exam Introductions Content Policy Caching (`lib/content-policy.ts`)**
  - Attach `cacheTag(CACHE_TAGS.INTRODUCTIONS)` and `cacheLife("days")`.
  - In `lib/exam-schedules/actions.ts`, call `revalidateTag(CACHE_TAGS.INTRODUCTIONS, "default")` and `revalidateTag(CACHE_TAGS.EXAM_SCHEDULES, "default")` on policy save.
- [x] **Task 2.3: Exam Package Definitions & Rule Blueprints**
  - Add `"use cache"` to `getExamPackageById()` and `getExamPackageBySlug()`.
  - Attach `cacheTag(CACHE_TAGS.EXAM_PACKAGES)` and `cacheLife("hours")`.
  - In `lib/exam-packages/actions.ts`, call `revalidateTag(CACHE_TAGS.EXAM_PACKAGES, "default")` on package mutations.

---

### Phase 3: Dashboard Layout App Shell Hoisting & De-blocking (PPR)
- [x] **Task 3.1: Dashboard Layout Shell Hoisting (`app/(dashboard)/layout.tsx`)**
  - Hoist the synchronous `<SidebarProvider>`, `<AppSidebar />` static frame, and `<DashboardBreadcrumb />` into the prerendered static shell.
  - Defer user-specific session avatar / profile menu (`<DashboardProfileMenu />`) inside a `<Suspense fallback={<ProfileMenuSkeleton />}>` boundary.
  - Replace top-level blocking `await headers()` in the root layout with deferred session resolution or non-blocking layout composition.
- [x] **Task 3.2: Layout Skeleton Components & Unit Tests**
  - Create `<ProfileMenuSkeleton />` and header placeholder components.
  - Add unit tests in `__test__/unit/skeletons.test.tsx`.

---

### Phase 4: Dashboard & Admin List View Streaming (D1 / D2)
- [x] **Task 4.1: Dashboard Overview Page (`app/(dashboard)/dashboard/page.tsx`)**
  - Render page heading and stat card shells synchronously.
  - Wrap `getDashboardStats()` with `"use cache"`, `cacheLife("minutes")`, and `cacheTag(CACHE_TAGS.DASHBOARD_STATS)`.
  - Wrap `<UpcomingSchedulesTable />` in `<Suspense fallback={<UpcomingSchedulesSkeleton />}>`.
- [x] **Task 4.2: Bank Soal Listing & Detail Pages (`/dashboard/question-banks/**`)**
  - `/dashboard/question-banks/page.tsx`: Prerender search bar and action buttons; stream `<QuestionBanksTable />` inside `<Suspense fallback={<TableSkeleton />} />`. Forward search/pagination params promise into the table component.
  - `/dashboard/question-banks/categories/page.tsx`: Prerender category management heading and return button; stream category list inside `<Suspense fallback={<TableSkeleton rows={4} columns={3} />} />`.
- [x] **Task 4.3: Exam Packages Listing & Question Selection (`/dashboard/exams/**`)**
  - `/dashboard/exams/page.tsx`: Prerender action toolbar; stream `<ExamPackagesTable />` inside `<Suspense fallback={<TableSkeleton rows={5} columns={7} />} />`.
- [x] **Task 4.4: Exam Schedules & Eligibility (`/dashboard/exam-schedules/**`)**
  - `/dashboard/exam-schedules/page.tsx`: Prerender filter headers; stream schedules grid/table inside `<Suspense fallback={<TableSkeleton rows={5} columns={7} />} />`.
- [x] **Task 4.5: Users & User Groups Management (`/dashboard/users/**`, `/dashboard/user-groups/**`)**
  - `/dashboard/users/page.tsx`: Stream users table with responsive `<TableSkeleton rows={5} columns={6} />`.
  - `/dashboard/user-groups/page.tsx`: Stream member and group list inside `<Suspense fallback={<TableSkeleton rows={5} columns={5} />} />`.

---

### Phase 5: Verification & Fast Gate Validation
- [ ] **Task 5.1: Dev Loop Runtime Verification (`next-dev-loop`)**
  - Visit all adopted dashboard routes in `next dev` with MCP enabled to verify zero `blocking-prerender` overlay warnings.
  - Confirm that static shells commit immediately on initial load (hard navigation) and client soft navigation (`<Link>` clicks).
- [ ] **Task 5.2: Fast Gate & Production Build Verification**
  - Run `pnpm run lint && pnpm run typecheck && pnpm run test:unit && pnpm run build`.
  - Confirm route output displays `◐ (Partial Prerender)` glyphs on all dashboard & listing routes.

---

## 4. Unit Testing Strategy & Fast Gate Compliance

Unit tests in Vitest run as part of the primary Fast Gate (`pnpm run test:unit`) in `< 25s`. All caching additions and refactors are guarded with unit tests across 4 key vectors:

### A. Cache Invalidation Action Contracts
- **Objective:** Ensure Server Actions trigger the exact cache invalidation tags upon successful mutations and never trigger invalidations on validation failures.
- **Unit Test Files:**
  - `__test__/unit/category-actions-cache.test.ts`: Verify `revalidateTag(CACHE_TAGS.CATEGORIES)` on category insert/update/delete.
  - `__test__/unit/exam-package-actions-cache.test.ts`: Verify `revalidateTag(CACHE_TAGS.EXAM_PACKAGES)` on package mutations.
  - `__test__/unit/exam-schedule-actions-cache.test.ts`: Verify `revalidateTag(CACHE_TAGS.INTRODUCTIONS)` and `CACHE_TAGS.EXAM_SCHEDULES`.
  - `__test__/unit/dashboard-stats-cache.test.ts`: Verify `revalidateTag(CACHE_TAGS.DASHBOARD_STATS)` on entity creation/deletion.

### B. Skeleton Fallback Component Unit Tests (D1 / D2)
- **Objective:** Ensure loading skeleton fallbacks render semantic placeholder structures, match real component layout grids/tables, and do not trigger layout shifts or hydration mismatches.
- **Unit Test Files:**
  - `__test__/unit/skeletons.test.tsx`:
    - Renders `<TableSkeleton rows={N} />` with matching columns and aria attributes.
    - Renders `<ProfileMenuSkeleton />` with circular avatar placeholder.
    - Renders `<UpcomingSchedulesSkeleton />` matching the dashboard table layout.
    - Renders `<StatsCardsSkeleton />` with 6 cards and busy state.
    - Renders `<BankDetailSkeleton />`.

### C. Async Param Forwarding & Streaming Props
- **Objective:** Validate that async helper functions, search parameter decoders (`lib/table-params.ts`, `lib/question-banks/params.ts`), and promise-forwarded props unpack and sanitize values properly without throwing unhandled rejections.
- **Unit Test Files:**
  - `__test__/unit/table-params.test.ts` (Existing + extended for async resolution).

### D. Data Transformation & Fallback Parity
- **Objective:** Verify that cached queries return data with the exact same shapes, types, sort orders, and null fallbacks as before caching.
- **Unit Test Files:**
  - `__test__/unit/dashboard-stats-cache.test.ts`
  - `__test__/unit/category-actions-cache.test.ts`
