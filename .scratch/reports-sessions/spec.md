# Session Reports & Attendance Recapitulation — Slice Spec

**Status:** ready-for-agent

## Problem Statement

While cohort score aggregation (`/dashboard/reports/exam-results`) and individual student transcripts (`/dashboard/reports/individual`) are now available, exam administrators and proctors need **Session Reports & Attendance Recapitulation** (*Laporan Per Sesi / Berita Acara Presensi Ujian*) at `/dashboard/reports/sessions`. Users need to:
1. View a high-level summary of all exam sessions/schedules with attendance and completion rates.
2. Drill down into specific session reports (`/dashboard/reports/sessions/[slug]`) to inspect:
   - Attendance KPIs (Eligible participants, Started/Present, Completed, In-Progress, Absent).
   - Submission mode audit (Manual submission by student vs Automatic system deadline finalization).
   - Class/Group comparative breakdown (Attendance rate, mean score, and pass rate per rombel/group).
   - Comprehensive attendance roster displaying every enrolled student (present and absent) with timestamps and final scores.
3. Print an official Exam Attendance Record (*Berita Acara & Daftar Hadir Ujian*) with academic signature lines and print media styling.

## Solution

Build the session reports subsystem:
1. **Types & Calculation Engine** (`lib/reports/session-types.ts`, `lib/reports/session-stats.ts`, `lib/reports/session-queries.ts`):
   - Pure statistical calculations for attendance rate, completion rate, submission breakdown, and per-group analytics.
   - Comprehensive query retrieving enrolled/eligible participants from `eligibleParticipantConditions`, joining attempts, and computing presence vs absence.
2. **UI & Print Components** (`components/reports/sessions/`):
   - `SessionKpiCards`: Metric cards for Eligible, Present, Completed, Absent, and Completion Rate.
   - `SessionGroupTable`: Group/class performance comparison table.
   - `SessionAttendanceTable`: Full roster of students with attendance status badge, timing, submission mode, and score.
   - `SessionPrintButton`: Print trigger for official session minutes.
3. **Hub & Detail Pages** (`app/(dashboard)/dashboard/reports/sessions/`):
   - `page.tsx`: Session overview hub with quick search and metrics.
   - `[slug]/page.tsx`: Complete session report and print view.
4. **Access Control**: Guarded by `reports:export` (`PERMISSIONS.REPORTS_EXPORT`).
