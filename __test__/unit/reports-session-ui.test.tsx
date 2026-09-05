import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { SessionAttendanceTable } from "@/components/reports/sessions/session-attendance-table"
import { SessionGroupTable } from "@/components/reports/sessions/session-group-table"
import { SessionKpiCards } from "@/components/reports/sessions/session-kpi-cards"
import { SessionPrintButton } from "@/components/reports/sessions/session-print-button"
import type {
  SessionAttendanceRow,
  SessionGroupBreakdown,
  SessionKPIStats,
} from "@/lib/reports/session-types"

const mockKpi: SessionKPIStats = {
  eligibleCount: 40,
  presentCount: 38,
  completedCount: 36,
  inProgressCount: 2,
  absentCount: 2,
  attendanceRate: 95.0,
  completionRate: 94.7,
  manualSubmitCount: 32,
  autoSubmitCount: 4,
}

const mockGroups: SessionGroupBreakdown[] = [
  {
    groupName: "XII MIPA 1",
    eligibleCount: 20,
    presentCount: 19,
    completedCount: 19,
    attendanceRate: 95.0,
    averageScore: 84.5,
    passRate: 90.0,
  },
  {
    groupName: "XII MIPA 2",
    eligibleCount: 20,
    presentCount: 19,
    completedCount: 17,
    attendanceRate: 95.0,
    averageScore: 79.2,
    passRate: 85.0,
  },
]

const mockRoster: SessionAttendanceRow[] = [
  {
    userId: "u-1",
    name: "Ahmad Dahlan",
    email: "ahmad@example.com",
    nisn: "0012345678",
    nis: "12345",
    nip: null,
    groupName: "XII MIPA 1",
    status: "completed",
    startedAt: new Date("2026-09-05T08:00:00Z"),
    submittedAt: new Date("2026-09-05T08:50:00Z"),
    durationMinutes: 50,
    submissionType: "participant",
    score: 88,
    passing: true,
  },
  {
    userId: "u-2",
    name: "Budi Santoso",
    email: "budi@example.com",
    nisn: "0087654321",
    nis: "12346",
    nip: null,
    groupName: "XII MIPA 2",
    status: "in_progress",
    startedAt: new Date("2026-09-05T08:05:00Z"),
    submittedAt: null,
    durationMinutes: null,
    submissionType: null,
    score: null,
    passing: null,
  },
  {
    userId: "u-3",
    name: "Citra Dewi",
    email: "citra@example.com",
    nisn: null,
    nis: null,
    nip: null,
    groupName: "XII MIPA 2",
    status: "absent",
    startedAt: null,
    submittedAt: null,
    durationMinutes: null,
    submissionType: null,
    score: null,
    passing: null,
  },
]

describe("SessionKpiCards", () => {
  it("renders key attendance metrics and percentage rates", () => {
    render(<SessionKpiCards kpi={mockKpi} />)

    expect(screen.getByText("95%")).toBeDefined()
    expect(screen.getByText("38")).toBeDefined() // Present
    expect(screen.getByText("36")).toBeDefined() // Completed
    expect(screen.getAllByText("2").length).toBeGreaterThanOrEqual(1) // Absent & InProgress
  })
})

describe("SessionGroupTable", () => {
  it("renders comparative rows for groups with attendance and average scores", () => {
    render(<SessionGroupTable groups={mockGroups} />)

    expect(screen.getByText("XII MIPA 1")).toBeDefined()
    expect(screen.getByText("84.5")).toBeDefined()
    expect(screen.getByText("XII MIPA 2")).toBeDefined()
    expect(screen.getByText("79.2")).toBeDefined()
  })
})

describe("SessionAttendanceTable", () => {
  it("renders full student roster with proper presence statuses", () => {
    render(<SessionAttendanceTable roster={mockRoster} />)

    expect(screen.getByText("Ahmad Dahlan")).toBeDefined()
    expect(screen.getAllByText(/selesai/i).length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText("Budi Santoso")).toBeDefined()
    expect(screen.getAllByText(/sedang mengerjakan/i).length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText("Citra Dewi")).toBeDefined()
    expect(screen.getAllByText(/belum hadir/i).length).toBeGreaterThanOrEqual(1)
  })
})

describe("SessionPrintButton", () => {
  it("triggers window.print when clicked", () => {
    const printSpy = vi.spyOn(window, "print").mockImplementation(() => {})
    render(<SessionPrintButton />)

    const btn = screen.getByRole("button", { name: /cetak berita acara/i })
    fireEvent.click(btn)

    expect(printSpy).toHaveBeenCalledTimes(1)
    printSpy.mockRestore()
  })
})
