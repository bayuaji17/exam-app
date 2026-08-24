# Cache Components Adoption & Optimization

This document outlines the technical specification, adoption strategy, domain caching taxonomy, and phased implementation plan for Next.js Cache Components and Partial Prerendering (PPR) across the `exam-app` platform.

---

## 1. Executive Summary & Goals

The goal of Cache Components adoption is to transform the application's page delivery architecture from blocking server-side dynamic rendering to instant static shells with streaming dynamic content slots:

1. **Instant Static Shell Delivery:** The App Shell (navigation bar, sidebar, headers, skeleton cards, and breadcrumbs) commits immediately on both hard navigation and client-side soft navigation.
2. **Fine-Grained Dynamic Caching (`"use cache"`):** High-read / low-mutation database queries (question categories, exam package metadata, system settings) are cached at the function level with explicit tag invalidation.
3. **PPR (Partial Prerendering):** Route shells are prerendered at build time and served from edge cache while dynamic data (user-specific sessions, exam schedules, question lists) streams into `<Suspense>` boundaries.
4. **Resilient Invalidation Architecture:** Every mutation (Server Action) issues deterministic `revalidateTag` calls against central `CACHE_TAGS` constants to ensure read-your-own-writes consistency without over-invalidating unrelated routes.

---

## 2. Domain Caching Taxonomy

| Cache Tier | Target Data | Strategy | Cache Profile / Invalidation Trigger | Cache Tag Constant |
| :--- | :--- | :--- | :--- | :--- |
| **Tier 1: Taxonomy & Metadata** | Question Categories, Subject Tags, Package Blueprint Metadata | Function-level `"use cache"` | `cacheLife("days")` / Tagged invalidation on category create/update/delete | `CACHE_TAGS.CATEGORIES`, `CACHE_TAGS.EXAM_PACKAGES` |
| **Tier 2: Exam Blueprints & Rules** | Exam Package Details, Question Bank Metadata, Introduction Policy | Function-level `"use cache"` | `cacheLife("hours")` / Invalidate on package edit or question bank publish | `CACHE_TAGS.QUESTION_BANKS`, `CACHE_TAGS.INTRODUCTIONS` |
| **Tier 3: App Shell & Navigation** | Dashboard Sidebar, Breadcrumbs, System Shell Frames | Prerendered Shell (PPR) | Build-time prerendered with dynamic `<Suspense fallback={<Skeleton />}>` slots | Static Route Prerender |
| **Tier 4: Dashboard Aggregations** | Admin Dashboard Counters, Summary Stats | Component-level `"use cache"` | `cacheLife("minutes")` / Invalidate on schedule creation or grading completion | `CACHE_TAGS.DASHBOARD_STATS` |
| **Tier 5: Dynamic List Views** | Bank Soal List, Exam Schedules, User Tables, Exam Results | Dynamic Streaming (PPR) | Real-time streaming into table skeletons; async search param resolution | `CACHE_TAGS.USERS`, `CACHE_TAGS.EXAM_SCHEDULES` |

> [!NOTE]
> Per product roadmap, the student exam taking portal (`/exam/**`) is currently in active feature specification and is excluded from initial cache components adoption. Cache adoption is focused exclusively on the completed **Dashboard & Admin domains** (`/dashboard/**`).

---

## 3. Phased Implementation Roadmap

### Phase 1: Infrastructure & Flag Enablement
- [x] **Task 1.1: Next Config Enablement**
  - Enable `cacheComponents: true` in `next.config.mjs`.
  - Enable `experimental.exposeTestingApiInProductionBuild: process.env.EXPOSE_TESTING_API === '1'`.
- [x] **Task 1.2: Central Cache Tag Constants Definition (`lib/cache-tags.ts`)**
  - Define typed `CACHE_TAGS` object for `CATEGORIES`, `EXAM_PACKAGES`, `QUESTION_BANKS`, `EXAM_SCHEDULES`, `INTRODUCTIONS`, `DASHBOARD_STATS`, and `USERS`.
- [x] **Task 1.3: Baseline Opt-Out Codemod**
  - Run `@next/codemod cache-components-instant-false ./app` to establish baseline `export const instant = false` on dynamic routes.

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
- [ ] **Task 3.1: Dashboard Layout Shell Hoisting (`app/(dashboard)/layout.tsx`)**
  - Hoist the synchronous `<SidebarProvider>`, `<AppSidebar />` static frame, and `<DashboardBreadcrumb />` into the prerendered static shell.
  - Defer user-specific session avatar / profile menu (`<DashboardProfileMenu />`) inside a `<Suspense fallback={<ProfileMenuSkeleton />}>` boundary.
  - Replace top-level blocking `await headers()` in the root layout with deferred session resolution or non-blocking layout composition.
- [ ] **Task 3.2: Layout Skeleton Components & Unit Tests**
  - Create `<ProfileMenuSkeleton />` and header placeholder components.
  - Add unit tests in `__test__/unit/skeletons.test.tsx`.

---

### Phase 4: Dashboard & Admin List View Streaming (D1 / D2)
- [ ] **Task 4.1: Dashboard Overview Page (`app/(dashboard)/dashboard/page.tsx`)**
  - Render page heading and stat card shells synchronously.
  - Wrap `getDashboardStats()` with `"use cache"`, `cacheLife("minutes")`, and `cacheTag(CACHE_TAGS.DASHBOARD_STATS)`.
  - Wrap `<UpcomingSchedulesTable />` in `<Suspense fallback={<UpcomingSchedulesSkeleton />}>`.
- [ ] **Task 4.2: Bank Soal Listing & Detail Pages (`/dashboard/question-banks/**`)**
  - `/dashboard/question-banks/page.tsx`: Prerender search bar and action buttons; stream `<QuestionBanksTable />` inside `<Suspense fallback={<TableSkeleton />} />`. Forward search/pagination params promise into the table component.
  - `/dashboard/question-banks/[slug]/page.tsx`: Prerender bank header and metadata card; stream `<QuestionList />` inside `<Suspense>`.
- [ ] **Task 4.3: Exam Packages Listing & Question Selection (`/dashboard/exams/**`)**
  - `/dashboard/exams/page.tsx`: Prerender action toolbar; stream `<ExamPackagesTable />`.
  - `/dashboard/exams/[slug]/questions/page.tsx`: Prerender package rules overview; stream question item selection table.
- [ ] **Task 4.4: Exam Schedules & Eligibility (`/dashboard/exam-schedules/**`)**
  - `/dashboard/exam-schedules/page.tsx`: Prerender filter headers; stream schedules grid/table.
  - `/dashboard/exam-schedules/[slug]/eligibility/page.tsx`: Prerender eligibility rule cards; stream candidate participant list.
- [ ] **Task 4.5: Users & User Groups Management (`/dashboard/users/**`, `/dashboard/user-groups/**`)**
  - `/dashboard/users/page.tsx`: Stream users table with responsive `<TableSkeleton />`.
  - `/dashboard/user-groups/[slug]/page.tsx`: Stream member list.

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

### B. Skeleton Fallback Component Unit Tests (D1 / D2)
- **Objective:** Ensure loading skeleton fallbacks render semantic placeholder structures, match real component layout grids/tables, and do not trigger layout shifts or hydration mismatches.
- **Unit Test Files:**
  - `__test__/unit/skeletons.test.tsx`:
    - Renders `<TableSkeleton rows={N} />` with matching columns and aria attributes.
    - Renders `<ProfileMenuSkeleton />` with circular avatar placeholder.
    - Renders `<UpcomingSchedulesSkeleton />` matching the dashboard table layout.
    - Renders `<BankDetailSkeleton />`.

### C. Async Param Forwarding & Streaming Props
- **Objective:** Validate that async helper functions, search parameter decoders (`lib/table-params.ts`, `lib/question-banks/params.ts`), and promise-forwarded props unpack and sanitize values properly without throwing unhandled rejections.
- **Unit Test Files:**
  - `__test__/unit/table-params.test.ts` (Existing + extended for async resolution).

### D. Data Transformation & Fallback Parity
- **Objective:** Verify that cached queries return data with the exact same shapes, types, sort orders, and null fallbacks as before caching.
- **Unit Test Files:**
  - `__test__/unit/dashboard-stats.test.ts`
  - `__test__/unit/category-queries.test.ts`
