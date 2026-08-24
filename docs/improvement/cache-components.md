# Next.js Cache Components & Instant Navigation Optimization

## 1. Overview & Objectives

Adopting **Next.js 16.3+ Cache Components** (`cacheComponents: true`), Partial Prerendering (PPR), and Instant Navigation across the **exam-app** platform.

The goal is to eliminate blocking prerender bottlenecks, hoist static App Shells across all layouts and pages, cache long-lived taxonomies and metadata with `"use cache"` and fine-grained tag invalidation, and isolate dynamic data inside `<Suspense>` streams.

---

## 2. Feature Caching Classification Matrix

| Tier | Strategy | Scope & Routes | Invalidation Triggers (`revalidateTag`) |
|---|---|---|---|
| **Tier 1: High-Value Static / Taxonomy Cache** | `"use cache"` + `cacheTag()` + `cacheLife('days')` | • Question Categories (`/dashboard/question-banks/categories`)<br>• Exam Introductions & Instructions (`/dashboard/exam-introductions`, `/exam/[slug]/intro`)<br>• Package Blueprint Metadata (`/dashboard/exams/[slug]`)<br>• Global / System Configurations | `revalidateTag("categories")`<br>`revalidateTag("introductions")`<br>`revalidateTag("exam-packages")` |
| **Tier 2: Instant Shell & Streamed Data (PPR)** | Static App Shell + `<Suspense>` Data Stream | • Admin Dashboard Overview (`/dashboard`)<br>• Bank Soal & Questions Table (`/dashboard/question-banks`)<br>• Exam Schedules & Eligibility (`/dashboard/exam-schedules`)<br>• User & Group Tables (`/dashboard/users`, `/dashboard/user-groups`)<br>• Student Exam Hub (`/exam`)<br>• Completed Exam Results Breakdown (`/dashboard/exam-results/[slug]`) | `revalidateTag("dashboard-stats")`<br>`revalidateTag("exam-schedules")`<br>`revalidateTag("users")`<br>`revalidateTag("exam-results")` |
| **Tier 3: Strictly Real-Time / Ephemeral** | Dynamic Request-Time (No Cache) | • Active Exam Attempt Runner (`/exam/[slug]/attempt/[attemptId]`) — live timer, autosave, anti-cheat<br>• Active Session Management (`/dashboard/settings/security/sessions`)<br>• Auth API endpoints & Excel import mutations | Request-time only (Dynamic by design) |

---

## 3. Step-by-Step Task Breakdown

### Phase 1: Config & Cache Infrastructure
- [ ] **Task 1.1: Enable Next.js Cache Components Flag**
  - Update `next.config.mjs` to export `{ cacheComponents: true }`.
  - Set `experimental.exposeTestingApiInProductionBuild: process.env.EXPOSE_TESTING_API === '1'` for instant navigation validation.
- [ ] **Task 1.2: Establish Centralized Cache Tags Definition**
  - Create `lib/cache-tags.ts` with typed tag constants:
    - `CACHE_TAGS.CATEGORIES = "categories"`
    - `CACHE_TAGS.EXAM_PACKAGES = "exam-packages"`
    - `CACHE_TAGS.QUESTION_BANKS = "question-banks"`
    - `CACHE_TAGS.EXAM_SCHEDULES = "exam-schedules"`
    - `CACHE_TAGS.INTRODUCTIONS = "introductions"`
    - `CACHE_TAGS.DASHBOARD_STATS = "dashboard-stats"`
    - `CACHE_TAGS.USERS = "users"`

---

### Phase 2: Layout & App Shell De-blocking (PPR Hoisting)
- [ ] **Task 2.1: Dashboard Layout Shell Hoisting (`app/(dashboard)/layout.tsx`)**
  - Hoist the synchronous `<SidebarProvider>`, `<AppSidebar />` static frame, and `<DashboardBreadcrumb />` into the prerendered static shell.
  - Defer user-specific session avatar / profile menu (`<DashboardProfileMenu />`) inside a `<Suspense fallback={<ProfileMenuSkeleton />}>` boundary.
  - Replace top-level blocking `await headers()` in the root layout with deferred session resolution or non-blocking layout composition.
- [ ] **Task 2.2: Participant Exam Portal Layout Shell (`app/(exam)/layout.tsx`)**
  - Prerender the top exam navbar shell and container layout.
  - Defer participant session badge and active timer metadata behind `<Suspense>`.

---

### Phase 3: Domain Data Caching (`"use cache"` + Tag Invalidation)
- [ ] **Task 3.1: Question Categories Caching**
  - Add `"use cache"` directive to `listQuestionCategories()` and `getQuestionCategoryById()` in `lib/question-banks/category-queries.ts`.
  - Attach `cacheTag(CACHE_TAGS.CATEGORIES)` and `cacheLife("days")`.
  - In `lib/question-banks/category-actions.ts`, call `revalidateTag(CACHE_TAGS.CATEGORIES)` on category create, update, and delete.
- [ ] **Task 3.2: Exam Introductions Policy Caching**
  - Add `"use cache"` to `getIntroductionPolicy()` and `listIntroductionSchedules()`.
  - Attach `cacheTag(CACHE_TAGS.INTRODUCTIONS)` and `cacheLife("days")`.
  - In `lib/introductions/actions.ts`, call `revalidateTag(CACHE_TAGS.INTRODUCTIONS)` on policy save.
- [ ] **Task 3.3: Exam Package Definitions & Rule Blueprints**
  - Add `"use cache"` to `getExamPackageById()` and `getExamPackageBySlug()`.
  - Attach `cacheTag(CACHE_TAGS.EXAM_PACKAGES)` and `cacheLife("hours")`.
  - In `lib/exam-packages/actions.ts`, call `revalidateTag(CACHE_TAGS.EXAM_PACKAGES)` on package mutations.
- [ ] **Task 3.4: Dashboard Overview Aggregates**
  - Add `"use cache"` to `getDashboardStats()` with `cacheLife("minutes")` and `cacheTag(CACHE_TAGS.DASHBOARD_STATS)`.
  - In schedule, exam package, and attempt finalization actions, revalidate `CACHE_TAGS.DASHBOARD_STATS`.

---

### Phase 4: Page-Level Suspense Streaming & Skeleton Alignment (D1 / D2)
- [ ] **Task 4.1: Dashboard Overview Page (`app/(dashboard)/dashboard/page.tsx`)**
  - Render page heading and stat card shells synchronously.
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
- [ ] **Task 4.6: Participant Student Exam Hub (`app/(exam)/exam/page.tsx`)**
  - Prerender student greeting and schedule cards skeleton.
  - Stream `<AvailableSchedulesList />` inside `<Suspense>`.
- [ ] **Task 4.7: Exam Introduction Page (`app/(exam)/exam/[slug]/intro/page.tsx`)**
  - Prerender exam title, timing badges, and rules container instantly.
  - Stream introduction body and start button state inside `<Suspense>`.

---

### Phase 5: Verification & Instant Navigation Guard
- [ ] **Task 5.1: Dev Loop Runtime Verification (`next-dev-loop`)**
  - Visit all adopted routes in `next dev` with MCP enabled to verify zero `blocking-prerender` overlay warnings.
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
  - `__test__/unit/category-actions.test.ts`: Verify `revalidateTag(CACHE_TAGS.CATEGORIES)` on category insert/update/delete.
  - `__test__/unit/exam-package-actions.test.ts`: Verify `revalidateTag(CACHE_TAGS.EXAM_PACKAGES)` on package mutations.
  - `__test__/unit/introduction-actions.test.ts`: Verify `revalidateTag(CACHE_TAGS.INTRODUCTIONS)`.
  - `__test__/unit/schedule-actions.test.ts`: Verify `revalidateTag(CACHE_TAGS.EXAM_SCHEDULES)` and `CACHE_TAGS.DASHBOARD_STATS`.

### B. Skeleton Fallback Component Unit Tests (D1 / D2)
- **Objective:** Ensure loading skeleton fallbacks render semantic placeholder structures, match real component layout grids/tables, and do not trigger layout shifts or hydration mismatches.
- **Unit Test Files:**
  - `__test__/unit/skeletons.test.tsx`:
    - Renders `<TableSkeleton rows={N} />` with matching columns and aria attributes.
    - Renders `<ProfileMenuSkeleton />` with circular avatar placeholder.
    - Renders `<UpcomingSchedulesSkeleton />` matching the dashboard table layout.
    - Renders `<BankDetailSkeleton />` and `<ExamIntroSkeleton />`.

### C. Async Param Forwarding & Streaming Props
- **Objective:** Validate that async helper functions, search parameter decoders (`lib/table-params.ts`, `lib/question-banks/params.ts`), and promise-forwarded props unpack and sanitize values properly without throwing unhandled rejections.
- **Unit Test Files:**
  - `__test__/unit/table-params.test.ts` (Existing + extended for async resolution).

### D. Data Transformation & Fallback Parity
- **Objective:** Verify that cached queries return data with the exact same shapes, types, sort orders, and null fallbacks as before caching.
- **Unit Test Files:**
  - `__test__/unit/dashboard-stats.test.ts`
  - `__test__/unit/category-queries.test.ts`
