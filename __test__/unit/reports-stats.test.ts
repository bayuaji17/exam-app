import { describe, expect, it } from "vitest"

import {
  calculateDistributionBuckets,
  calculateMean,
  calculateMedian,
  calculatePassFail,
  calculateStandardDeviation,
  computeScheduleStatistics,
} from "@/lib/reports/stats"
import type { RawAttemptScoreInput } from "@/lib/reports/types"

describe("Statistical Calculations (Pure Math Core)", () => {
  describe("calculateMean", () => {
    it("returns 0 for empty score list", () => {
      expect(calculateMean([])).toBe(0)
    })

    it("returns the exact score for single value", () => {
      expect(calculateMean([85])).toBe(85)
    })

    it("calculates accurate arithmetic mean rounded to 2 decimal places", () => {
      expect(calculateMean([70, 80, 90])).toBe(80)
      expect(calculateMean([70, 75, 80])).toBe(75)
      // 10 + 20 + 25 = 55 / 3 = 18.3333... -> 18.33
      expect(calculateMean([10, 20, 25])).toBe(18.33)
    })
  })

  describe("calculateMedian", () => {
    it("returns 0 for empty score list", () => {
      expect(calculateMedian([])).toBe(0)
    })

    it("returns single element for length 1", () => {
      expect(calculateMedian([65])).toBe(65)
    })

    it("calculates median for odd number of elements", () => {
      expect(calculateMedian([50, 70, 90])).toBe(70)
      // unsorted
      expect(calculateMedian([90, 40, 70])).toBe(70)
    })

    it("calculates median for even number of elements (average of middle two)", () => {
      expect(calculateMedian([50, 60, 80, 90])).toBe(70)
      expect(calculateMedian([10, 20, 30, 40])).toBe(25)
      // unsorted
      expect(calculateMedian([80, 50, 90, 60])).toBe(70)
    })
  })

  describe("calculateStandardDeviation", () => {
    it("returns 0 for empty or single element list", () => {
      expect(calculateStandardDeviation([])).toBe(0)
      expect(calculateStandardDeviation([80])).toBe(0)
    })

    it("returns 0 when all scores are identical", () => {
      expect(calculateStandardDeviation([85, 85, 85, 85])).toBe(0)
    })

    it("calculates population standard deviation rounded to 2 decimal places", () => {
      // Data: [10, 20, 30], Mean = 20
      // Variance = ((10-20)^2 + (20-20)^2 + (30-20)^2) / 3 = (100 + 0 + 100) / 3 = 200 / 3 = 66.6667
      // StdDev = sqrt(66.6667) = 8.1649... -> 8.16
      expect(calculateStandardDeviation([10, 20, 30])).toBe(8.16)
    })
  })

  describe("calculatePassFail", () => {
    it("returns 0 counts and 0% rate when passScore is null", () => {
      const res = calculatePassFail([70, 80, 90], null)
      expect(res).toEqual({ pass: 0, fail: 0, rate: 0 })
    })

    it("returns 0 counts when scores are empty", () => {
      const res = calculatePassFail([], 75)
      expect(res).toEqual({ pass: 0, fail: 0, rate: 0 })
    })

    it("calculates pass and fail counts accurately with inclusive passScore", () => {
      // 75 is inclusive pass
      const res = calculatePassFail([50, 74.9, 75, 80, 95], 75)
      expect(res.pass).toBe(3) // 75, 80, 95
      expect(res.fail).toBe(2) // 50, 74.9
      expect(res.rate).toBe(60) // 3 out of 5 = 60%
    })

    it("handles 100% and 0% pass rates", () => {
      expect(calculatePassFail([80, 90], 70).rate).toBe(100)
      expect(calculatePassFail([50, 60], 70).rate).toBe(0)
    })
  })

  describe("calculateDistributionBuckets", () => {
    it("returns empty bucket structure when scores array is empty", () => {
      const buckets = calculateDistributionBuckets([])
      expect(buckets).toHaveLength(5)
      expect(buckets.every((b) => b.count === 0 && b.percentage === 0)).toBe(true)
      expect(buckets.map((b) => b.range)).toEqual([
        "0-20",
        "21-40",
        "41-60",
        "61-80",
        "81-100",
      ])
    })

    it("places boundary values in correct buckets and calculates percentages", () => {
      // 5 scores: 0, 20, 40, 75, 100
      // 0 -> 0-20
      // 20 -> 0-20
      // 40 -> 21-40
      // 75 -> 61-80
      // 100 -> 81-100
      const scores = [0, 20, 40, 75, 100]
      const buckets = calculateDistributionBuckets(scores)

      const b0_20 = buckets.find((b) => b.range === "0-20")!
      const b21_40 = buckets.find((b) => b.range === "21-40")!
      const b41_60 = buckets.find((b) => b.range === "41-60")!
      const b61_80 = buckets.find((b) => b.range === "61-80")!
      const b81_100 = buckets.find((b) => b.range === "81-100")!

      expect(b0_20.count).toBe(2)
      expect(b0_20.percentage).toBe(40)

      expect(b21_40.count).toBe(1)
      expect(b21_40.percentage).toBe(20)

      expect(b41_60.count).toBe(0)
      expect(b41_60.percentage).toBe(0)

      expect(b61_80.count).toBe(1)
      expect(b61_80.percentage).toBe(20)

      expect(b81_100.count).toBe(1)
      expect(b81_100.percentage).toBe(20)

      // Total percentage must sum to 100
      const totalPercent = buckets.reduce((acc, b) => acc + b.percentage, 0)
      expect(totalPercent).toBe(100)
    })
  })

  describe("computeScheduleStatistics", () => {
    it("handles zero participants or zero submitted attempts gracefully", () => {
      const stats = computeScheduleStatistics({
        totalEligible: 20,
        attempts: [],
        passScore: 70,
      })

      expect(stats.totalParticipantsEligible).toBe(20)
      expect(stats.totalAttemptsStarted).toBe(0)
      expect(stats.totalAttemptsSubmitted).toBe(0)
      expect(stats.totalFullyGraded).toBe(0)
      expect(stats.passingCount).toBe(0)
      expect(stats.failingCount).toBe(0)
      expect(stats.passingRate).toBe(0)
      expect(stats.averageScore).toBe(0)
      expect(stats.medianScore).toBe(0)
      expect(stats.highestScore).toBe(0)
      expect(stats.lowestScore).toBe(0)
      expect(stats.standardDeviation).toBe(0)
    })

    it("filters out ungraded attempts from score stats but counts them in submitted totals", () => {
      const attempts: RawAttemptScoreInput[] = [
        {
          attemptId: "att-1",
          score: 80,
          submittedAt: new Date(),
          fullyGraded: true,
        },
        {
          attemptId: "att-2",
          score: 90,
          submittedAt: new Date(),
          fullyGraded: true,
        },
        {
          attemptId: "att-3",
          score: 40, // Has auto-score 40, but manual questions not yet graded
          submittedAt: new Date(),
          fullyGraded: false,
        },
        {
          attemptId: "att-4",
          score: null, // In-progress attempt, not submitted
          submittedAt: null,
          fullyGraded: false,
        },
      ]

      const stats = computeScheduleStatistics({
        totalEligible: 5,
        attempts,
        passScore: 75,
      })

      expect(stats.totalParticipantsEligible).toBe(5)
      expect(stats.totalAttemptsStarted).toBe(4)
      expect(stats.totalAttemptsSubmitted).toBe(3) // att-1, att-2, att-3
      expect(stats.totalFullyGraded).toBe(2) // att-1, att-2 only

      // Stats computed strictly on att-1 (80) and att-2 (90)
      expect(stats.averageScore).toBe(85)
      expect(stats.medianScore).toBe(85)
      expect(stats.highestScore).toBe(90)
      expect(stats.lowestScore).toBe(80)
      expect(stats.passingCount).toBe(2)
      expect(stats.failingCount).toBe(0)
      expect(stats.passingRate).toBe(100)
    })
  })
})
