import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { ReportExportButtons } from "@/components/reports/report-export-buttons"
import { ReportParticipantsTable } from "@/components/reports/report-participants-table"
import { ReportStatCard } from "@/components/reports/report-stat-card"
import { ScoreDistributionChart } from "@/components/reports/score-distribution-chart"
import type {
  ScheduleReportParticipantItem,
  ScoreDistributionBucket,
} from "@/lib/reports/types"

afterEach(() => {
  cleanup()
})

describe("Reports UI Components", () => {
  describe("ReportStatCard", () => {
    it("renders title, primary metric value, and description", () => {
      render(
        <ReportStatCard
          title="Tingkat Kelulusan"
          value="85.5%"
          description="18 dari 21 peserta lulus KKM"
        />
      )

      expect(screen.getByText("Tingkat Kelulusan")).toBeDefined()
      expect(screen.getByText("85.5%")).toBeDefined()
      expect(screen.getByText("18 dari 21 peserta lulus KKM")).toBeDefined()
    })
  })

  describe("ScoreDistributionChart", () => {
    const mockDistribution: ScoreDistributionBucket[] = [
      { range: "0-20", min: 0, max: 20, count: 1, percentage: 5 },
      { range: "21-40", min: 20, max: 40, count: 2, percentage: 10 },
      { range: "41-60", min: 40, max: 60, count: 5, percentage: 25 },
      { range: "61-80", min: 60, max: 80, count: 8, percentage: 40 },
      { range: "81-100", min: 80, max: 100, count: 4, percentage: 20 },
    ]

    it("renders all 5 score buckets with count and percentage", () => {
      render(<ScoreDistributionChart distribution={mockDistribution} />)

      expect(screen.getByText("0-20")).toBeDefined()
      expect(screen.getByText("21-40")).toBeDefined()
      expect(screen.getByText("41-60")).toBeDefined()
      expect(screen.getByText("61-80")).toBeDefined()
      expect(screen.getByText("81-100")).toBeDefined()

      expect(screen.getByText("40% (8 peserta)")).toBeDefined()
    })
  })

  describe("ReportExportButtons", () => {
    it("renders download links with proper hrefs for xlsx and csv", () => {
      render(<ReportExportButtons scheduleId="sched-abc" />)

      const excelLink = screen.getByRole("link", { name: /unduh excel/i })
      const csvLink = screen.getByRole("link", { name: /unduh csv/i })

      expect(excelLink.getAttribute("href")).toBe(
        "/api/reports/exam-results/sched-abc?format=xlsx"
      )
      expect(csvLink.getAttribute("href")).toBe(
        "/api/reports/exam-results/sched-abc?format=csv"
      )
    })
  })

  describe("ReportParticipantsTable", () => {
    const mockParticipants: ScheduleReportParticipantItem[] = [
      {
        attemptId: "att-1",
        participantId: "usr-1",
        participantName: "Budi Santoso",
        participantEmail: "budi@example.com",
        identifierNisn: "1234567890",
        identifierNis: "2026-001",
        identifierNip: null,
        submittedAt: new Date("2026-09-01T10:00:00Z"),
        score: 88,
        fullyGraded: true,
        passing: true,
      },
      {
        attemptId: "att-2",
        participantId: "usr-2",
        participantName: "Citra Dewi",
        participantEmail: "citra@example.com",
        identifierNisn: null,
        identifierNis: "2026-002",
        identifierNip: null,
        submittedAt: new Date("2026-09-01T10:15:00Z"),
        score: 55,
        fullyGraded: true,
        passing: false,
      },
      {
        attemptId: "att-3",
        participantId: "usr-3",
        participantName: "Eko Prasetyo",
        participantEmail: "eko@example.com",
        identifierNisn: null,
        identifierNis: null,
        identifierNip: "199001012015011002",
        submittedAt: new Date("2026-09-01T10:30:00Z"),
        score: 40,
        fullyGraded: false,
        passing: null,
      },
    ]

    it("renders participant roster with names, identifiers, scores, and status badges", () => {
      render(<ReportParticipantsTable participants={mockParticipants} />)

      // Participant names
      expect(screen.getByText("Budi Santoso")).toBeDefined()
      expect(screen.getByText("Citra Dewi")).toBeDefined()
      expect(screen.getByText("Eko Prasetyo")).toBeDefined()

      // Identifiers
      expect(screen.getByText("1234567890")).toBeDefined()
      expect(screen.getByText("2026-002")).toBeDefined()
      expect(screen.getByText("199001012015011002")).toBeDefined()

      // Passing status badges
      expect(screen.getByText("Lulus")).toBeDefined()
      expect(screen.getByText("Tidak Lulus")).toBeDefined()
      expect(screen.getByText("Menunggu Penilaian")).toBeDefined()

      // Grading status badges
      expect(screen.getAllByText("Selesai Dinilai").length).toBe(2)
      expect(screen.getByText("Perlu Koreksi Manual")).toBeDefined()
    })
  })
})
