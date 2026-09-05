import { describe, expect, it } from "vitest"

import {
  calculateGroupBreakdowns,
  calculateSessionKPIs,
} from "@/lib/reports/session-stats"
import type { SessionAttendanceRow } from "@/lib/reports/session-types"

describe("calculateSessionKPIs", () => {
  it("computes accurate attendance and completion rates", () => {
    const rows: SessionAttendanceRow[] = [
      {
        userId: "u-1",
        name: "Alice",
        email: "alice@test.com",
        nisn: "001",
        nis: null,
        nip: null,
        groupName: "XII IPA 1",
        status: "completed",
        startedAt: new Date("2026-09-05T08:00:00Z"),
        submittedAt: new Date("2026-09-05T08:45:00Z"),
        durationMinutes: 45,
        submissionType: "participant",
        score: 85,
        passing: true,
      },
      {
        userId: "u-2",
        name: "Bob",
        email: "bob@test.com",
        nisn: "002",
        nis: null,
        nip: null,
        groupName: "XII IPA 1",
        status: "completed",
        startedAt: new Date("2026-09-05T08:00:00Z"),
        submittedAt: new Date("2026-09-05T09:00:00Z"),
        durationMinutes: 60,
        submissionType: "system",
        score: 70,
        passing: false,
      },
      {
        userId: "u-3",
        name: "Charlie",
        email: "charlie@test.com",
        nisn: "003",
        nis: null,
        nip: null,
        groupName: "XII IPA 2",
        status: "in_progress",
        startedAt: new Date("2026-09-05T08:15:00Z"),
        submittedAt: null,
        durationMinutes: null,
        submissionType: null,
        score: null,
        passing: null,
      },
      {
        userId: "u-4",
        name: "David",
        email: "david@test.com",
        nisn: "004",
        nis: null,
        nip: null,
        groupName: "XII IPA 2",
        status: "absent",
        startedAt: null,
        submittedAt: null,
        durationMinutes: null,
        submissionType: null,
        score: null,
        passing: null,
      },
    ]

    const kpi = calculateSessionKPIs(rows)

    expect(kpi.eligibleCount).toBe(4)
    expect(kpi.presentCount).toBe(3) // 2 completed + 1 in_progress
    expect(kpi.completedCount).toBe(2)
    expect(kpi.inProgressCount).toBe(1)
    expect(kpi.absentCount).toBe(1)
    expect(kpi.attendanceRate).toBe(75) // 3/4 * 100
    expect(kpi.completionRate).toBe(66.7) // 2/3 * 100 rounded to 1 decimal
    expect(kpi.manualSubmitCount).toBe(1)
    expect(kpi.autoSubmitCount).toBe(1)
  })

  it("handles zero eligible participants safely without NaN", () => {
    const kpi = calculateSessionKPIs([])

    expect(kpi.eligibleCount).toBe(0)
    expect(kpi.presentCount).toBe(0)
    expect(kpi.completedCount).toBe(0)
    expect(kpi.inProgressCount).toBe(0)
    expect(kpi.absentCount).toBe(0)
    expect(kpi.attendanceRate).toBe(0)
    expect(kpi.completionRate).toBe(0)
    expect(kpi.manualSubmitCount).toBe(0)
    expect(kpi.autoSubmitCount).toBe(0)
  })
})

describe("calculateGroupBreakdowns", () => {
  it("groups metrics by group name accurately and sorts alphabetically", () => {
    const rows: SessionAttendanceRow[] = [
      {
        userId: "u-1",
        name: "Alice",
        email: "alice@test.com",
        nisn: "001",
        nis: null,
        nip: null,
        groupName: "XII IPA 2",
        status: "completed",
        startedAt: new Date("2026-09-05T08:00:00Z"),
        submittedAt: new Date("2026-09-05T08:45:00Z"),
        durationMinutes: 45,
        submissionType: "participant",
        score: 80,
        passing: true,
      },
      {
        userId: "u-2",
        name: "Bob",
        email: "bob@test.com",
        nisn: "002",
        nis: null,
        nip: null,
        groupName: "XII IPA 1",
        status: "completed",
        startedAt: new Date("2026-09-05T08:00:00Z"),
        submittedAt: new Date("2026-09-05T08:50:00Z"),
        durationMinutes: 50,
        submissionType: "participant",
        score: 90,
        passing: true,
      },
      {
        userId: "u-3",
        name: "Charlie",
        email: "charlie@test.com",
        nisn: "003",
        nis: null,
        nip: null,
        groupName: "XII IPA 1",
        status: "absent",
        startedAt: null,
        submittedAt: null,
        durationMinutes: null,
        submissionType: null,
        score: null,
        passing: null,
      },
    ]

    const groups = calculateGroupBreakdowns(rows)

    expect(groups).toHaveLength(2)
    // Sorted alphabetically: XII IPA 1 first, then XII IPA 2
    expect(groups[0].groupName).toBe("XII IPA 1")
    expect(groups[0].eligibleCount).toBe(2)
    expect(groups[0].presentCount).toBe(1)
    expect(groups[0].completedCount).toBe(1)
    expect(groups[0].attendanceRate).toBe(50)
    expect(groups[0].averageScore).toBe(90)
    expect(groups[0].passRate).toBe(100)

    expect(groups[1].groupName).toBe("XII IPA 2")
    expect(groups[1].eligibleCount).toBe(1)
    expect(groups[1].presentCount).toBe(1)
    expect(groups[1].completedCount).toBe(1)
    expect(groups[1].attendanceRate).toBe(100)
    expect(groups[1].averageScore).toBe(80)
    expect(groups[1].passRate).toBe(100)
  })

  it("handles unassigned group as Tanpa Grup", () => {
    const rows: SessionAttendanceRow[] = [
      {
        userId: "u-1",
        name: "Solo User",
        email: "solo@test.com",
        nisn: null,
        nis: null,
        nip: null,
        groupName: null,
        status: "completed",
        startedAt: new Date("2026-09-05T08:00:00Z"),
        submittedAt: new Date("2026-09-05T08:30:00Z"),
        durationMinutes: 30,
        submissionType: "participant",
        score: 75,
        passing: true,
      },
    ]

    const groups = calculateGroupBreakdowns(rows)
    expect(groups).toHaveLength(1)
    expect(groups[0].groupName).toBe("Tanpa Grup")
    expect(groups[0].averageScore).toBe(75)
  })
})
