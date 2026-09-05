import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { CompetencyBreakdownCard } from "@/components/reports/individual/competency-breakdown-card"
import { IndividualReportHeader } from "@/components/reports/individual/individual-report-header"
import { ItemizedAnswersTable } from "@/components/reports/individual/itemized-answers-table"
import { PrintReportButton } from "@/components/reports/individual/print-report-button"
import type { StudentTranscriptReport } from "@/lib/reports/individual-types"

const mockReport: StudentTranscriptReport = {
  attemptId: "att-123",
  scheduleId: "sch-456",
  scheduleTitle: "Ujian Akhir Semester Matematika",
  scheduleSlug: "uas-matematika",
  packageTitle: "Paket A Matematika",
  kodePaket: "MAT-A",
  nomorPeserta: "MAT-A-9921",
  student: {
    id: "usr-1",
    name: "Ahmad Dahlan",
    email: "ahmad@example.com",
    nisn: "0012345678",
    nis: "12345",
    nip: null,
  },
  startedAt: new Date("2026-09-05T08:00:00Z"),
  submittedAt: new Date("2026-09-05T08:50:00Z"),
  durationMinutes: 50,
  finalScore: 85,
  maxTotalPoints: 100,
  passScore: 75,
  passing: true,
  fullyGraded: true,
  competencies: [
    {
      categoryId: "cat-1",
      categoryName: "Aljabar Linear",
      earnedPoints: 40,
      maxPoints: 50,
      percentage: 80,
      totalQuestions: 5,
      correctQuestions: 4,
    },
    {
      categoryId: "cat-2",
      categoryName: "Geometri Ruang",
      earnedPoints: 45,
      maxPoints: 50,
      percentage: 90,
      totalQuestions: 5,
      correctQuestions: 5,
    },
  ],
  questions: [
    {
      position: 1,
      questionId: "q-1",
      categoryId: "cat-1",
      categoryName: "Aljabar Linear",
      type: "single",
      promptText: "Nilai x dari 2x + 4 = 10 adalah?",
      studentAnswerText: "x = 3",
      isCorrect: true,
      pointsAwarded: 10,
      maxPoints: 10,
    },
    {
      position: 2,
      questionId: "q-2",
      categoryId: "cat-2",
      categoryName: "Geometri Ruang",
      type: "manual",
      promptText: "Jelaskan rumus volume balok!",
      studentAnswerText: "V = p x l x t",
      isCorrect: true,
      pointsAwarded: 10,
      maxPoints: 10,
    },
  ],
}

describe("IndividualReportHeader", () => {
  it("renders student profile and exam information correctly", () => {
    render(<IndividualReportHeader report={mockReport} />)

    expect(screen.getByText("Ahmad Dahlan")).toBeDefined()
    expect(screen.getByText(/0012345678/)).toBeDefined()
    expect(screen.getByText(/MAT-A-9921/)).toBeDefined()
    expect(screen.getByText("Ujian Akhir Semester Matematika")).toBeDefined()
    expect(screen.getByText("85")).toBeDefined()
    expect(screen.getByText("Lulus")).toBeDefined()
  })

  it("renders not passing badge when score is below KKM", () => {
    const failingReport = {
      ...mockReport,
      finalScore: 60,
      passing: false,
    }
    render(<IndividualReportHeader report={failingReport} />)
    expect(screen.getByText("Tidak Lulus")).toBeDefined()
  })

  it("renders pending grading badge when manual grading is pending", () => {
    const pendingReport = {
      ...mockReport,
      fullyGraded: false,
      passing: null,
    }
    render(<IndividualReportHeader report={pendingReport} />)
    expect(screen.getByText("Menunggu Penilaian")).toBeDefined()
  })
})

describe("CompetencyBreakdownCard", () => {
  it("renders all categories and mastery percentages", () => {
    render(<CompetencyBreakdownCard competencies={mockReport.competencies} />)

    expect(screen.getByText("Aljabar Linear")).toBeDefined()
    expect(screen.getByText("80%")).toBeDefined()
    expect(screen.getByText("Geometri Ruang")).toBeDefined()
    expect(screen.getByText("90%")).toBeDefined()
  })
})

describe("ItemizedAnswersTable", () => {
  it("renders all questions, prompts, and score points", () => {
    render(<ItemizedAnswersTable questions={mockReport.questions} />)

    expect(screen.getByText(/Nilai x dari 2x \+ 4 = 10 adalah\?/)).toBeDefined()
    expect(screen.getByText("x = 3")).toBeDefined()
    expect(screen.getByText(/Jelaskan rumus volume balok!/)).toBeDefined()
    expect(screen.getByText("V = p x l x t")).toBeDefined()
  })
})

describe("PrintReportButton", () => {
  it("calls window.print when clicked", () => {
    const printSpy = vi.spyOn(window, "print").mockImplementation(() => {})
    render(<PrintReportButton />)

    const btn = screen.getByRole("button", { name: /cetak/i })
    fireEvent.click(btn)

    expect(printSpy).toHaveBeenCalledTimes(1)
    printSpy.mockRestore()
  })
})
