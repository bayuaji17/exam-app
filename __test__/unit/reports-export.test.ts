import { describe, expect, it } from "vitest"

import {
  exportReportBuffer,
  generateExamResultsCsv,
  generateExamResultsWorkbook,
} from "@/lib/reports/export"
import type { ScheduleReportSummary } from "@/lib/reports/types"

const mockReport: ScheduleReportSummary = {
  scheduleId: "sched-123",
  scheduleTitle: "Ujian Akhir Matematika",
  scheduleSlug: "ujian-akhir-matematika",
  packageTitle: "Paket MTK Wajib Kelas 12",
  passScore: 75,
  totalPoints: 100,
  stats: {
    totalParticipantsEligible: 30,
    totalAttemptsStarted: 25,
    totalAttemptsSubmitted: 24,
    totalFullyGraded: 22,
    passingCount: 18,
    failingCount: 4,
    passingRate: 81.82,
    averageScore: 82.5,
    medianScore: 85,
    highestScore: 98,
    lowestScore: 45,
    standardDeviation: 12.34,
    distribution: [
      { range: "0-20", min: 0, max: 20, count: 0, percentage: 0 },
      { range: "21-40", min: 20, max: 40, count: 0, percentage: 0 },
      { range: "41-60", min: 40, max: 60, count: 2, percentage: 9.09 },
      { range: "61-80", min: 60, max: 80, count: 8, percentage: 36.36 },
      { range: "81-100", min: 80, max: 100, count: 12, percentage: 54.55 },
    ],
  },
  participants: [
    {
      attemptId: "att-1",
      participantId: "usr-1",
      participantName: 'Budi, S.Kom "Juara"',
      participantEmail: "budi@example.com",
      identifierNisn: "1234567890",
      identifierNis: "2026-001",
      identifierNip: null,
      submittedAt: new Date("2026-09-01T10:30:00Z"),
      score: 98,
      fullyGraded: true,
      passing: true,
    },
    {
      attemptId: "att-2",
      participantId: "usr-2",
      participantName: "Siti Rahma",
      participantEmail: "siti@example.com",
      identifierNisn: null,
      identifierNis: "2026-002",
      identifierNip: null,
      submittedAt: new Date("2026-09-01T10:45:00Z"),
      score: 65,
      fullyGraded: true,
      passing: false,
    },
    {
      attemptId: "att-3",
      participantId: "usr-3",
      participantName: "Ahmad Dani",
      participantEmail: "ahmad@example.com",
      identifierNisn: null,
      identifierNis: null,
      identifierNip: "198001012005011001",
      submittedAt: new Date("2026-09-01T11:00:00Z"),
      score: 50,
      fullyGraded: false,
      passing: null,
    },
  ],
}

describe("Report Export Engine (lib/reports/export.ts)", () => {
  describe("generateExamResultsWorkbook", () => {
    it("creates a valid multi-sheet workbook with summary and participant roster", async () => {
      const workbook = await generateExamResultsWorkbook(mockReport)

      expect(workbook.worksheets).toHaveLength(2)

      const summarySheet = workbook.getWorksheet("Ringkasan")
      expect(summarySheet).toBeDefined()

      const rosterSheet = workbook.getWorksheet("Daftar Nilai Peserta")
      expect(rosterSheet).toBeDefined()
    })

    it("populates the summary sheet with correct metadata and statistical metrics", async () => {
      const workbook = await generateExamResultsWorkbook(mockReport)
      const summarySheet = workbook.getWorksheet("Ringkasan")!

      // Verify schedule and package title exist in the sheet
      let foundScheduleTitle = false
      let foundAverageScore = false
      let foundMedianScore = false

      summarySheet.eachRow((row) => {
        row.eachCell((cell) => {
          const val = String(cell.value)
          if (val.includes("Ujian Akhir Matematika")) foundScheduleTitle = true
          if (val.includes("82.5")) foundAverageScore = true
          if (val.includes("85")) foundMedianScore = true
        })
      })

      expect(foundScheduleTitle).toBe(true)
      expect(foundAverageScore).toBe(true)
      expect(foundMedianScore).toBe(true)
    })

    it("populates the participant roster sheet with all participants and correct statuses", async () => {
      const workbook = await generateExamResultsWorkbook(mockReport)
      const rosterSheet = workbook.getWorksheet("Daftar Nilai Peserta")!

      // Roster must have header row + 3 participant rows = at least 4 rows
      expect(rosterSheet.rowCount).toBeGreaterThanOrEqual(4)

      // Collect all row texts
      const rowsText: string[] = []
      rosterSheet.eachRow((row) => {
        const cells: string[] = []
        row.eachCell((cell) => {
          cells.push(String(cell.value ?? ""))
        })
        rowsText.push(cells.join(" | "))
      })

      const joinedText = rowsText.join("\n")

      // Participant 1: fully graded pass
      expect(joinedText).toContain("Budi")
      expect(joinedText).toContain("1234567890")
      expect(joinedText).toContain("Lulus")

      // Participant 2: fully graded fail
      expect(joinedText).toContain("Siti Rahma")
      expect(joinedText).toContain("2026-002")
      expect(joinedText).toContain("Tidak Lulus")

      // Participant 3: ungraded manual question
      expect(joinedText).toContain("Ahmad Dani")
      expect(joinedText).toContain("198001012005011001")
      expect(joinedText).toContain("Perlu Koreksi Manual")
    })
  })

  describe("generateExamResultsCsv", () => {
    it("generates valid RFC 4180 CSV with escaped characters", () => {
      const csv = generateExamResultsCsv(mockReport)
      const lines = csv.split("\r\n").filter(Boolean)

      // Header line
      expect(lines[0]).toBe(
        "No,Nama Peserta,Email,NISN,NIS,NIP,Waktu Submit,Nilai Akhir,Status Koreksi,Status Kelulusan"
      )

      // Should have 1 header line + 3 participant lines
      expect(lines).toHaveLength(4)

      // Line 1: Quotes and commas escaped
      expect(lines[1]).toContain('"Budi, S.Kom ""Juara"""')
      expect(lines[1]).toContain("budi@example.com")
      expect(lines[1]).toContain("1234567890")
      expect(lines[1]).toContain("Lulus")

      // Line 2: Siti
      expect(lines[2]).toContain("Siti Rahma")
      expect(lines[2]).toContain("Tidak Lulus")

      // Line 3: Ahmad (ungraded)
      expect(lines[3]).toContain("Ahmad Dani")
      expect(lines[3]).toContain("Perlu Koreksi Manual")
      expect(lines[3]).toContain("Menunggu Penilaian")
    })
  })

  describe("exportReportBuffer", () => {
    it("exports xlsx with correct buffer, mime type, and filename pattern", async () => {
      const res = await exportReportBuffer(mockReport, "xlsx")

      expect(res.contentType).toBe(
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      )
      expect(res.filename).toMatch(/^laporan-hasil-ujian-akhir-matematika-\d+\.xlsx$/)
      expect(res.buffer.byteLength).toBeGreaterThan(0)
    })

    it("exports csv with correct buffer, mime type, and filename pattern", async () => {
      const res = await exportReportBuffer(mockReport, "csv")

      expect(res.contentType).toBe("text/csv; charset=utf-8")
      expect(res.filename).toMatch(/^laporan-hasil-ujian-akhir-matematika-\d+\.csv$/)
      expect(res.buffer.byteLength).toBeGreaterThan(0)
    })
  })
})
