# System Improvements Backlog

This directory tracks the active backlog, architectural improvements, and planned features for the **exam-app** platform.

---

## Active & Upcoming Improvements

### 1. [Next.js Cache Components & Instant Navigation](./cache-components.md)
- **Objective:** Enable `cacheComponents: true` in Next.js 16.3+, adopt PPR, hoist static App Shells across dashboard & exam portals, cache long-lived taxonomies with `"use cache"` + `revalidateTag`, and push request-time dynamic data into `<Suspense>` streams.
- **Status:** **Planning / Ready for Review**
- **Detailed Spec:** [`docs/improvement/cache-components.md`](./cache-components.md)

---

### 2. [Session-Pinned Exam Attempts & Security](./files.md#exam-attempt--session-security)
- **Objective:** Prevent concurrent multi-device logins during an active exam attempt by binding `startedSessionToken` to the attempt record, with auto-takeover grace on session termination.
- **Status:** **Backlog / Documented**

---

### 3. [Excel Import Normalization & Validation](./files.md#excel-import-participants)
- **Objective:** Normalize Excel rich-text/hyperlink cell objects in `parseCell`, and enforce duplicate username pre-validation (in-file & database) with friendly row-level errors.
- **Status:** **Backlog / Documented**

---

### 4. [Candidate Search & Category Pagination](./files.md#user-groups--member-management)
- **Objective:** Debounce server-side search for group candidate selection, and implement database pagination (`listCategoriesPage`) with active table pagination controls for question categories.
- **Status:** **Backlog / Documented**

---

### 5. [TipTap Rich Text Editor & UX Enhancements](./files.md#tiptap-rich-text-editor)
- **Objective:** Custom link dialog popovers, interactive table dimension controls, math LaTeX insertion modal, continuous image drag-to-resize, and block reordering handles.
- **Status:** **Backlog / Documented**
