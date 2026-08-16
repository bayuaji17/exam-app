import { describe, expect, it } from "vitest"

import { sumAttemptScores } from "@/lib/grading/math"
import { manualGradeWeight, parseManualGrade } from "@/lib/grading/validation"

describe("manualGradeWeight", () => {
  it("defaults to 1 when there is no points override", () => {
    expect(manualGradeWeight(null)).toBe(1)
    expect(manualGradeWeight(undefined)).toBe(1)
  })

  it("uses the points override when present", () => {
    expect(manualGradeWeight(10)).toBe(10)
  })
})

describe("parseManualGrade", () => {
  it("accepts null to clear a grade", () => {
    expect(parseManualGrade(null, 10)).toEqual({ ok: true, score: null })
    expect(parseManualGrade(undefined, 10)).toEqual({ ok: true, score: null })
  })

  it("accepts scores within the weight", () => {
    expect(parseManualGrade(0, 10)).toEqual({ ok: true, score: 0 })
    expect(parseManualGrade(7.5, 10)).toEqual({ ok: true, score: 7.5 })
    expect(parseManualGrade(10, 10)).toEqual({ ok: true, score: 10 })
  })

  it("rounds to 2 decimals", () => {
    expect(parseManualGrade(7.555, 10)).toEqual({ ok: true, score: 7.56 })
  })

  it("rejects scores above the weight", () => {
    const result = parseManualGrade(10.01, 10)

    expect(result.ok).toBe(false)
    expect(!result.ok && result.message).toContain("maksimal")
  })

  it("rejects negative and non-numeric scores", () => {
    expect(parseManualGrade(-1, 10).ok).toBe(false)
    expect(parseManualGrade("abc", 10).ok).toBe(false)
  })
})

describe("sumAttemptScores", () => {
  it("sums auto and manual scores", () => {
    expect(
      sumAttemptScores([
        { autoScore: "1", manualScore: null },
        { autoScore: "3", manualScore: null },
        { autoScore: null, manualScore: "8" },
      ])
    ).toBe(12)
  })

  it("ignores null scores and rounds the total", () => {
    expect(
      sumAttemptScores([
        { autoScore: null, manualScore: null },
        { autoScore: "0.1", manualScore: "0.2" },
      ])
    ).toBe(0.3)
  })

  it("returns 0 for an empty attempt", () => {
    expect(sumAttemptScores([])).toBe(0)
  })
})
