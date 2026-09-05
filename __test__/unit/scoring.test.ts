import { describe, expect, it } from "vitest"

import {
  computeAutoScore,
  computePackageScore,
  DEFAULT_MULTIPLIER,
  DEFAULT_PENALTY,
  DEFAULT_POINTS,
  isPassing,
  type ScoringConfig,
} from "@/lib/scoring/scoring"

const NO_PENALTY: ScoringConfig = { wrongPenalty: null }
const PENALTY_2: ScoringConfig = { wrongPenalty: 2 }

describe("computeAutoScore — single", () => {
  const question = {
    type: "single" as const,
    points: null,
    correctOptionId: "a",
  }

  it("scores a correct answer with default equal points", () => {
    expect(
      computeAutoScore("single", { chosenOptionId: "a" }, question, NO_PENALTY)
    ).toBe(DEFAULT_POINTS)
  })

  it("scores a wrong answer with the default zero penalty", () => {
    expect(
      computeAutoScore("single", { chosenOptionId: "b" }, question, NO_PENALTY)
    ).toBe(-DEFAULT_PENALTY)
  })

  it("applies the package penalty to wrong answers", () => {
    expect(
      computeAutoScore("single", { chosenOptionId: "b" }, question, PENALTY_2)
    ).toBe(-2)
  })

  it("scores an unanswered question as zero without penalty", () => {
    expect(
      computeAutoScore("single", { chosenOptionId: null }, question, PENALTY_2)
    ).toBe(0)
  })

  it("uses the per-question points override", () => {
    expect(
      computeAutoScore(
        "single",
        { chosenOptionId: "a" },
        { ...question, points: 4 },
        PENALTY_2
      )
    ).toBe(4)
  })
})

describe("computeAutoScore — scored", () => {
  const question = {
    type: "scored" as const,
    points: null,
    options: [
      { id: "x", score: 4 },
      { id: "y", score: 3 },
      { id: "z", score: null },
    ],
  }

  it("scores the chosen option's score", () => {
    expect(
      computeAutoScore("scored", { chosenOptionId: "x" }, question, PENALTY_2)
    ).toBe(4)
    expect(
      computeAutoScore("scored", { chosenOptionId: "y" }, question, PENALTY_2)
    ).toBe(3)
  })

  it("applies the per-question multiplier override", () => {
    expect(
      computeAutoScore(
        "scored",
        { chosenOptionId: "x" },
        { ...question, points: 2 },
        NO_PENALTY
      )
    ).toBe(8)
  })

  it("defaults the multiplier to one", () => {
    expect(DEFAULT_MULTIPLIER).toBe(1)
  })

  it("treats an option without a score as zero", () => {
    expect(
      computeAutoScore("scored", { chosenOptionId: "z" }, question, NO_PENALTY)
    ).toBe(0)
  })

  it("scores unanswered as zero", () => {
    expect(
      computeAutoScore("scored", { chosenOptionId: null }, question, NO_PENALTY)
    ).toBe(0)
  })

  it("scores an unknown option id as zero", () => {
    expect(
      computeAutoScore(
        "scored",
        { chosenOptionId: "missing" },
        question,
        NO_PENALTY
      )
    ).toBe(0)
  })
})

describe("computeAutoScore — manual", () => {
  it("has no auto score", () => {
    expect(
      computeAutoScore(
        "manual",
        { chosenOptionId: "a" },
        { type: "manual", points: 5 },
        NO_PENALTY
      )
    ).toBeNull()
  })
})

describe("computePackageScore", () => {
  it("sums auto scores and rounds to two decimals", () => {
    const score = computePackageScore(
      [
        {
          questionId: "q1",
          type: "single",
          answer: { chosenOptionId: "a" },
          question: { type: "single", points: null, correctOptionId: "a" },
        },
        {
          questionId: "q2",
          type: "single",
          answer: { chosenOptionId: "b" },
          question: { type: "single", points: null, correctOptionId: "a" },
        },
      ],
      PENALTY_2
    )

    expect(score).toBe(-1)
  })

  it("includes manual-graded scores for manual questions", () => {
    const score = computePackageScore(
      [
        {
          questionId: "m1",
          type: "manual",
          answer: null,
          question: { type: "manual", points: 5 },
        },
      ],
      NO_PENALTY,
      [{ questionId: "m1", score: 4.5 }]
    )

    expect(score).toBe(4.5)
  })

  it("scores an empty package as zero", () => {
    expect(computePackageScore([], NO_PENALTY)).toBe(0)
  })

  it("rounds the total to two decimals", () => {
    const score = computePackageScore(
      [
        {
          questionId: "q1",
          type: "scored",
          answer: { chosenOptionId: "x" },
          question: {
            type: "scored",
            points: 3,
            options: [{ id: "x", score: 0.1 }],
          },
        },
      ],
      NO_PENALTY
    )

    expect(score).toBe(0.3)
  })
})

describe("isPassing", () => {
  it("passes above the threshold", () => {
    expect(isPassing(70, 60)).toBe(true)
    expect(isPassing(60, 60)).toBe(true)
  })

  it("fails below the threshold", () => {
    expect(isPassing(59.5, 60)).toBe(false)
  })

  it("always passes without a threshold", () => {
    expect(isPassing(0, null)).toBe(true)
  })
})
