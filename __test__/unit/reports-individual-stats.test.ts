import { describe, expect, it } from "vitest"

import {
  calculateAttemptDurationMinutes,
  calculateCompetencyBreakdown,
} from "@/lib/reports/individual-stats"
import type { ItemizedQuestionResult } from "@/lib/reports/individual-types"

describe("calculateCompetencyBreakdown", () => {
  it("returns empty array for empty question list", () => {
    const result = calculateCompetencyBreakdown([])
    expect(result).toEqual([])
  })

  it("calculates single category with 100% correct answers", () => {
    const questions: ItemizedQuestionResult[] = [
      {
        position: 1,
        questionId: "q1",
        categoryId: "cat-1",
        categoryName: "Matematika",
        type: "single",
        promptText: "1 + 1 = ?",
        studentAnswerText: "2",
        isCorrect: true,
        pointsAwarded: 10,
        maxPoints: 10,
      },
      {
        position: 2,
        questionId: "q2",
        categoryId: "cat-1",
        categoryName: "Matematika",
        type: "single",
        promptText: "2 * 3 = ?",
        studentAnswerText: "6",
        isCorrect: true,
        pointsAwarded: 10,
        maxPoints: 10,
      },
    ]

    const result = calculateCompetencyBreakdown(questions)
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      categoryId: "cat-1",
      categoryName: "Matematika",
      earnedPoints: 20,
      maxPoints: 20,
      percentage: 100,
      totalQuestions: 2,
      correctQuestions: 2,
    })
  })

  it("calculates partial mastery across multiple categories accurately", () => {
    const questions: ItemizedQuestionResult[] = [
      {
        position: 1,
        questionId: "q1",
        categoryId: "c-ipa",
        categoryName: "Ilmu Pengetahuan Alam",
        type: "single",
        promptText: "Fotosintesis",
        studentAnswerText: "Klorofil",
        isCorrect: true,
        pointsAwarded: 10,
        maxPoints: 10,
      },
      {
        position: 2,
        questionId: "q2",
        categoryId: "c-ipa",
        categoryName: "Ilmu Pengetahuan Alam",
        type: "single",
        promptText: "Mitokondria",
        studentAnswerText: "Salah",
        isCorrect: false,
        pointsAwarded: 0,
        maxPoints: 10,
      },
      {
        position: 3,
        questionId: "q3",
        categoryId: "c-mat",
        categoryName: "Matematika Dasar",
        type: "single",
        promptText: "5 + 5",
        studentAnswerText: "10",
        isCorrect: true,
        pointsAwarded: 5,
        maxPoints: 5,
      },
    ]

    const result = calculateCompetencyBreakdown(questions)
    expect(result).toHaveLength(2)

    const ipa = result.find((c) => c.categoryId === "c-ipa")
    expect(ipa).toBeDefined()
    expect(ipa?.earnedPoints).toBe(10)
    expect(ipa?.maxPoints).toBe(20)
    expect(ipa?.percentage).toBe(50)
    expect(ipa?.totalQuestions).toBe(2)
    expect(ipa?.correctQuestions).toBe(1)

    const mat = result.find((c) => c.categoryId === "c-mat")
    expect(mat).toBeDefined()
    expect(mat?.earnedPoints).toBe(5)
    expect(mat?.maxPoints).toBe(5)
    expect(mat?.percentage).toBe(100)
    expect(mat?.totalQuestions).toBe(1)
    expect(mat?.correctQuestions).toBe(1)
  })

  it("handles unassigned category gracefully as 'Umum / Tanpa Kategori'", () => {
    const questions: ItemizedQuestionResult[] = [
      {
        position: 1,
        questionId: "q-general",
        categoryId: null,
        categoryName: "",
        type: "manual",
        promptText: "Pertanyaan bebas",
        studentAnswerText: "Jawaban esai",
        isCorrect: null,
        pointsAwarded: 15,
        maxPoints: 20,
      },
    ]

    const result = calculateCompetencyBreakdown(questions)
    expect(result).toHaveLength(1)
    expect(result[0]?.categoryName).toBe("Umum / Tanpa Kategori")
    expect(result[0]?.percentage).toBe(75)
    expect(result[0]?.correctQuestions).toBe(0) // manual with partial points is not marked strictly fully correct
  })

  it("avoids division by zero when max points is 0", () => {
    const questions: ItemizedQuestionResult[] = [
      {
        position: 1,
        questionId: "q-zero",
        categoryId: "cat-bonus",
        categoryName: "Bonus Soal",
        type: "single",
        promptText: "Bonus",
        studentAnswerText: "A",
        isCorrect: true,
        pointsAwarded: 0,
        maxPoints: 0,
      },
    ]

    const result = calculateCompetencyBreakdown(questions)
    expect(result).toHaveLength(1)
    expect(result[0]?.percentage).toBe(0)
  })
})

describe("calculateAttemptDurationMinutes", () => {
  it("returns null if submittedAt is null", () => {
    const started = new Date("2026-09-05T08:00:00Z")
    expect(calculateAttemptDurationMinutes(started, null)).toBeNull()
  })

  it("calculates elapsed minutes rounded correctly", () => {
    const started = new Date("2026-09-05T08:00:00Z")
    const submitted = new Date("2026-09-05T08:45:30Z")
    expect(calculateAttemptDurationMinutes(started, submitted)).toBe(46)
  })
})
